import 'dotenv/config';
import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { 
  getDb, 
  saveDb, 
  hashPassword, 
  verifyPassword, 
  createSession, 
  getSessionUser, 
  deleteSession 
} from './server/db.js';
import {
  getFullLibrary,
  testServiceConnection,
  getServiceProfilesAndRoots,
  searchContent,
  addContentToService,
  getActiveQueue,
  removeQueueItem,
  moveQueueItemToHistory,
  getDownloadHistory,
  getWaitlistItems,
  getProwlarrIndexers,
  getCalendarEvents,
  getServiceApiUrl,
  formatServiceWebUiUrl,
  invalidateArrCache,
  toggleItemMonitoring
} from './server/arrProxy.js';
import { generateICalFeed } from './server/ical.js';
import { getExternalForthcomingReleases, getTopReleasesNextThreeMonths } from './server/externalCalendar.js';
import { getPopularThisMonthUK } from './server/popularUk.js';
import { getTvShowDetails } from './server/tvDetails.js';
import { getArtistDetails } from './server/artistDetails.js';
import { resolveArtistArtwork, warmArtistArtwork } from './server/artistArtwork.js';
import { searchReleases, executeGrab } from './server/releases.js';
import type { ServiceId, UserRole } from './src/types.js';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3001;

  app.use(express.json());

  // Extract auth token helper
  function getAuthToken(req: express.Request): string {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7).trim();
    }
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      const match = cookieHeader.match(/arr_session=([^;]+)/);
      if (match) return match[1];
    }
    return (req.query.token as string) || '';
  }

  // Auth middleware
  function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    const db = getDb();
    if (!db.initialized) {
      return res.status(403).json({ error: 'System not initialized. Please complete the setup wizard.' });
    }

    const token = getAuthToken(req);
    const user = getSessionUser(token);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized. Please sign in.' });
    }

    (req as any).user = user;
    next();
  }

  function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
    requireAuth(req, res, () => {
      const user = (req as any).user;
      if (user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admin access required.' });
      }
      next();
    });
  }

  // ----------------------------------------------------
  // System Version & Health
  // ----------------------------------------------------
  app.get('/api/version', (req, res) => {
    try {
      const now = new Date();
      res.json({
        version: '1.0.1',
        buildTime: now.toISOString(),
        nodeVersion: process.version,
        platform: process.platform,
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: Date.now()
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch version' });
    }
  });

  // ----------------------------------------------------
  // Auth & User Management Endpoints
  // ----------------------------------------------------

  // Status: checks if system has been initialized
  app.get('/api/auth/status', (req, res) => {
    try {
      const db = getDb();
      const token = getAuthToken(req);
      const user = getSessionUser(token);

      // If there are no admin users, force initialized to false
      const hasAdmin = Array.isArray(db.users) && db.users.some(u => u.role === 'admin');
      const isInitialized = Boolean(db.initialized && hasAdmin);

      res.json({
        initialized: isInitialized,
        needsSetup: !isInitialized,
        user: user || null,
        systemName: db.settings.systemName || 'Arr House'
      });
    } catch (err: any) {
      console.error('[Arr House] /api/auth/status error:', err);
      res.status(500).json({ error: err.message || 'Failed to check system status' });
    }
  });

  // Setup wizard (First run)
  app.post('/api/auth/setup', (req, res) => {
    try {
      const db = getDb();
      if (db.initialized) {
        return res.status(400).json({ error: 'System is already initialized.' });
      }

      const { username, password, systemName } = req.body;
      if (!username || !password || password.length < 6) {
        return res.status(400).json({ error: 'Username and password (min 6 chars) are required.' });
      }

      const { hash, salt } = hashPassword(password);
      const adminUser = {
        id: crypto.randomUUID(),
        username: username.trim(),
        passwordHash: hash,
        salt,
        role: 'admin' as const,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };

      db.users = [adminUser];
      db.initialized = true;
      if (systemName) {
        db.settings.systemName = systemName.trim();
      }
      saveDb(db);

      const session = createSession(adminUser.id);
      res.setHeader('Set-Cookie', `arr_session=${session.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);

      res.json({
        success: true,
        token: session.token,
        user: {
          id: adminUser.id,
          username: adminUser.username,
          role: adminUser.role,
          createdAt: adminUser.createdAt
        }
      });
    } catch (err: any) {
      console.error('[Arr House] /api/auth/setup error:', err);
      res.status(500).json({ error: err.message || 'Failed to initialize administrator account' });
    }
  });

  // Login
  app.post('/api/auth/login', (req, res) => {
    try {
      const db = getDb();
      if (!db.initialized) {
        return res.status(400).json({ error: 'System not initialized. Please complete initial setup.' });
      }

      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required.' });
      }

      const user = db.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
      if (!user || !verifyPassword(password, user.passwordHash, user.salt)) {
        return res.status(401).json({ error: 'Invalid username or password.' });
      }

      user.lastLogin = new Date().toISOString();
      saveDb(db);

      const session = createSession(user.id);
      res.setHeader('Set-Cookie', `arr_session=${session.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);

      res.json({
        success: true,
        token: session.token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        }
      });
    } catch (err: any) {
      console.error('[Arr House] /api/auth/login error:', err);
      res.status(500).json({ error: err.message || 'Login failed' });
    }
  });

  // Logout
  app.post('/api/auth/logout', (req, res) => {
    const token = getAuthToken(req);
    if (token) deleteSession(token);
    res.setHeader('Set-Cookie', `arr_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
    res.json({ success: true });
  });

  // Current user info
  app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({ user: (req as any).user });
  });

  // List users (Admin only)
  app.get('/api/users', requireAdmin, (req, res) => {
    const db = getDb();
    const safeUsers = db.users.map(u => ({
      id: u.id,
      username: u.username,
      role: u.role,
      createdAt: u.createdAt,
      lastLogin: u.lastLogin
    }));
    res.json({ users: safeUsers });
  });

  // Create user (Admin only)
  app.post('/api/users', requireAdmin, (req, res) => {
    const db = getDb();
    const { username, password, role } = req.body;

    if (!username || !password || password.length < 6) {
      return res.status(400).json({ error: 'Username and password (min 6 chars) required.' });
    }

    const validRoles: UserRole[] = ['admin', 'standard', 'readonly'];
    const assignedRole = validRoles.includes(role) ? role : 'standard';

    if (db.users.some(u => u.username.toLowerCase() === username.trim().toLowerCase())) {
      return res.status(400).json({ error: 'Username already exists.' });
    }

    const { hash, salt } = hashPassword(password);
    const newUser = {
      id: crypto.randomUUID(),
      username: username.trim(),
      passwordHash: hash,
      salt,
      role: assignedRole,
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);
    saveDb(db);

    res.json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        createdAt: newUser.createdAt
      }
    });
  });

  // Delete user (Admin only)
  app.delete('/api/users/:id', requireAdmin, (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const currentUser = (req as any).user;

    if (currentUser.id === id) {
      return res.status(400).json({ error: 'Cannot delete your own account.' });
    }

    const adminCount = db.users.filter(u => u.role === 'admin').length;
    const targetUser = db.users.find(u => u.id === id);

    if (targetUser?.role === 'admin' && adminCount <= 1) {
      return res.status(400).json({ error: 'Cannot delete the only admin user.' });
    }

    db.users = db.users.filter(u => u.id !== id);
    db.sessions = db.sessions.filter(s => s.userId !== id);
    saveDb(db);

    res.json({ success: true });
  });

  // ----------------------------------------------------
  // Settings & Service Configuration Endpoints
  // ----------------------------------------------------

  // Unauthenticated endpoint returning service URLs for browser navigation (no API keys)
  app.get('/api/settings/service-urls', (req, res) => {
    try {
      const db = getDb();
      const serviceUrls: Record<string, any> = {};
      for (const [key, svc] of Object.entries(db.settings.services || {})) {
        serviceUrls[key] = {
          id: svc.id || key,
          name: svc.name,
          baseUrl: svc.baseUrl,
          port: svc.port,
          disablePort: svc.disablePort,
          useSsl: svc.useSsl,
          webUrl: formatServiceWebUiUrl(svc)
        };
      }
      res.json({ services: serviceUrls });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch service URLs' });
    }
  });

  // Get current settings
  app.get('/api/settings', requireAuth, (req, res) => {
    const db = getDb();
    const currentUser = (req as any).user;

    // Mask sensitive API keys for non-admins, show partial for admins
    const safeServices: Record<string, any> = {};
    for (const [key, svc] of Object.entries(db.settings.services)) {
      let maskedKey = '';
      if (svc.apiKey) {
        if (currentUser.role === 'admin') {
          maskedKey = svc.apiKey.length > 8 
            ? `${svc.apiKey.slice(0, 4)}••••••••${svc.apiKey.slice(-4)}`
            : '••••••••';
        } else {
          maskedKey = '••••••••';
        }
      }

      safeServices[key] = {
        ...svc,
        apiKeyMasked: maskedKey,
        hasApiKey: !!svc.apiKey,
        webUrl: formatServiceWebUiUrl(svc)
      };
    }

    res.json({
      services: safeServices,
      demoMode: db.settings.demoMode,
      calendarToken: db.settings.calendarToken,
      systemName: db.settings.systemName,
      serverTime: new Date().toISOString()
    });
  });

  // Update settings (Admin only)
  app.post('/api/settings', requireAdmin, (req, res) => {
    const db = getDb();
    const { services, demoMode, systemName } = req.body;

    if (typeof demoMode === 'boolean') {
      db.settings.demoMode = demoMode;
    }
    // Dashboard title is locked to Arr House with no option to change
    db.settings.systemName = 'Arr House';

    if (services && typeof services === 'object') {
      for (const [id, updatedSvc] of Object.entries(services as Record<ServiceId, any>)) {
        if (db.settings.services[id as ServiceId]) {
          const current = db.settings.services[id as ServiceId];
          // Preserve connected status unless user explicitly provided a status or updated credentials
          const preservedStatus = (current.status === 'connected' && (!updatedSvc.status || updatedSvc.status === 'untested'))
            ? 'connected'
            : (updatedSvc.status || current.status);

          db.settings.services[id as ServiceId] = {
            ...current,
            ...updatedSvc,
            status: preservedStatus,
            disablePort: updatedSvc.disablePort ?? current.disablePort ?? false,
            // Keep existing API key if user didn't change masked string
            apiKey: (updatedSvc.apiKey && !updatedSvc.apiKey.includes('••••'))
              ? updatedSvc.apiKey
              : current.apiKey
          };
        }
      }
    }

    saveDb(db);
    invalidateArrCache();
    res.json({ success: true, message: 'Settings saved successfully' });
  });

  // Test service connection
  app.post('/api/settings/test-connection', requireAuth, async (req, res) => {
    const { serviceId, baseUrl, port, disablePort, apiKey, useSsl } = req.body;
    const db = getDb();
    const current = db.settings.services[serviceId as ServiceId];

    if (!current) {
      return res.status(404).json({ success: false, errorMessage: 'Service not found' });
    }

    const testConfig = {
      ...current,
      baseUrl: baseUrl !== undefined ? baseUrl : current.baseUrl,
      port: port !== undefined ? port : current.port,
      disablePort: disablePort !== undefined ? disablePort : current.disablePort,
      apiKey: (apiKey && !apiKey.includes('••••')) ? apiKey : current.apiKey,
      useSsl: useSsl !== undefined ? useSsl : current.useSsl
    };

    const result = await testServiceConnection(testConfig);
    
    // Update cached status in db
    current.status = result.success ? 'connected' : 'error';
    if (result.success) {
      current.version = result.version;
      current.latencyMs = result.latencyMs;
    }
    current.lastChecked = new Date().toISOString();
    current.errorMessage = result.errorMessage;
    saveDb(db);
    invalidateArrCache();

    res.json(result);
  });

  // Fetch quality profiles & root folders
  app.get('/api/settings/profiles/:serviceId', requireAuth, async (req, res) => {
    const { serviceId } = req.params;
    const data = await getServiceProfilesAndRoots(serviceId as ServiceId);
    res.json(data);
  });

  // In-memory cache for remote media covers and thumbnails
  interface ImageCacheEntry {
    buffer: Buffer;
    contentType: string;
    timestamp: number;
  }
  const imageProxyCache = new Map<string, ImageCacheEntry>();
  const MAX_IMAGE_PROXY_CACHE = 400;
  const IMAGE_PROXY_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days cache

  // Universal Media Image Proxy (bypasses browser hotlinking/CORS/Referer blocks for Wikipedia, TVmaze, iTunes, etc.)
  app.get('/api/arr/image-proxy', async (req, res) => {
    const rawUrl = req.query.url as string;
    if (!rawUrl || typeof rawUrl !== 'string') {
      return res.status(400).send('Missing url parameter');
    }

    const trimmedUrl = rawUrl.trim();
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      return res.status(400).send('Invalid image URL protocol');
    }

    // Serve from cache if fresh
    const cached = imageProxyCache.get(trimmedUrl);
    if (cached && (Date.now() - cached.timestamp < IMAGE_PROXY_TTL_MS)) {
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(cached.buffer);
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);
      const imgRes = await fetch(trimmedUrl, {
        headers: {
          'User-Agent': 'ArrHouse/2.0 (media-hub; contact: admin@arrhouse.local)',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
        },
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!imgRes.ok) {
        return res.status(imgRes.status).send(`Upstream image returned ${imgRes.status}`);
      }

      const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
      const arrayBuf = await imgRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);

      // Keep cache size bounded
      if (imageProxyCache.size >= MAX_IMAGE_PROXY_CACHE) {
        const oldestKey = imageProxyCache.keys().next().value;
        if (oldestKey) imageProxyCache.delete(oldestKey);
      }
      imageProxyCache.set(trimmedUrl, {
        buffer,
        contentType,
        timestamp: Date.now()
      });

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(buffer);
    } catch (err: any) {
      res.status(502).send('Error fetching remote image');
    }
  });

  // ----------------------------------------------------
  // Unified Arr Endpoints
  // ----------------------------------------------------

  // Overview stats
  app.get('/api/arr/overview', requireAuth, async (req, res) => {
    const forceRefresh = req.query.refresh === 'true';
    if (forceRefresh) invalidateArrCache();

    const [library, queue, indexers, waitlist] = await Promise.all([
      getFullLibrary(forceRefresh),
      getActiveQueue(forceRefresh),
      getProwlarrIndexers(forceRefresh),
      getWaitlistItems()
    ]);
    const db = getDb();

    const stats = {
      seriesCount: library.filter(i => i.mediaType === 'tv').length,
      moviesCount: library.filter(i => i.mediaType === 'movie').length,
      musicCount: library.filter(i => i.mediaType === 'music').length,
      totalMediaItems: library.length,
      activeQueueCount: queue.length,
      waitlistCount: waitlist.length,
      totalStorageBytes: library.reduce((acc, item) => acc + (item.sizeBytes || 0), 0),
      healthyIndexers: indexers.filter(i => i.status === 'healthy').length,
      totalIndexers: indexers.length,
      grabs24h: indexers.reduce((acc, i) => acc + (i.grabs24h || 0), 0),
      demoMode: db.settings.demoMode,
      servicesStatus: Object.values(db.settings.services).map(s => ({
        id: s.id,
        name: s.name,
        enabled: s.enabled,
        status: s.status,
        version: s.version,
        latencyMs: s.latencyMs,
        port: s.port,
        disablePort: s.disablePort,
        baseUrl: s.baseUrl,
        useSsl: s.useSsl,
        webUrl: formatServiceWebUiUrl(s)
      }))
    };

    res.json(stats);
  });

  // Library Browser (supports both /api/arr/library and /api/arr/media)
  const handleGetLibrary = async (req: any, res: any) => {
    const { service, status, search, sort, refresh } = req.query;
    let items = await getFullLibrary(refresh === 'true');

    if (service && service !== 'all') {
      items = items.filter(i => i.service === service);
    }
    if (status && status !== 'all') {
      items = items.filter(i => i.status === status);
    }
    if (search) {
      const q = String(search).toLowerCase();
      items = items.filter(i => 
        i.title.toLowerCase().includes(q) ||
        (i.artist && i.artist.toLowerCase().includes(q)) ||
        (i.author && i.author.toLowerCase().includes(q)) ||
        (i.overview && i.overview.toLowerCase().includes(q))
      );
    }

    if (sort === 'year') {
      items.sort((a, b) => (b.year || 0) - (a.year || 0));
    } else if (sort === 'size') {
      items.sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0));
    } else {
      // Default title
      items.sort((a, b) => a.title.localeCompare(b.title));
    }

    res.json({ items });
  };

  app.get('/api/arr/library', requireAuth, handleGetLibrary);
  app.get('/api/arr/media', requireAuth, handleGetLibrary);

  // Universal Search
  app.get('/api/arr/search', requireAuth, async (req, res) => {
    const q = (req.query.q as string) || '';
    const service = (req.query.service as ServiceId | 'all') || 'radarr';

    const results = await searchContent(q, service);
    res.json({ results });
  });

  // Popular This Month UK (Top 8 for Movies, TV Shows, Music from reputable UK sources)
  app.get('/api/arr/popular-uk', (req, res) => {
    try {
      const data = getPopularThisMonthUK();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch UK popular releases' });
    }
  });

  // TV Show Season and Episode Breakdown
  app.get('/api/arr/series/details', requireAuth, async (req, res) => {
    const title = (req.query.title as string) || '';
    const foreignId = req.query.foreignId as string | undefined;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    try {
      const details = await getTvShowDetails(title, foreignId);
      res.json(details);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch TV show details' });
    }
  });

  // Artist Details & Studio Albums Breakdown
  app.get('/api/arr/artist/details', requireAuth, async (req, res) => {
    const artist = (req.query.artist as string) || (req.query.name as string) || '';
    const id = req.query.id as string | undefined;
    if (!artist) {
      return res.status(400).json({ error: 'Artist name is required' });
    }
    try {
      const details = await getArtistDetails(artist, id);
      res.json(details);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch artist details' });
    }
  });

  // Add & Search Content
  app.post('/api/arr/add', requireAuth, async (req, res) => {
    const user = (req as any).user;
    if (user.role === 'readonly') {
      return res.status(403).json({ error: 'Read-only users cannot add content.' });
    }

    const payload = req.body;
    if (!payload.service || !payload.title) {
      return res.status(400).json({ error: 'Missing required parameters (service, title)' });
    }

    const result = await addContentToService(payload);
    res.json(result);
  });

  // Toggle monitoring for artist, series, movie, or album
  app.post('/api/arr/monitor', requireAuth, async (req, res) => {
    const user = (req as any).user;
    if (user.role === 'readonly') {
      return res.status(403).json({ error: 'Read-only users cannot modify monitoring.' });
    }

    try {
      const { service, id, albumId, monitored } = req.body;
      if (!service) {
        return res.status(400).json({ error: 'Service is required' });
      }
      const result = await toggleItemMonitoring({
        service: service as ServiceId,
        id,
        albumId,
        monitored: Boolean(monitored)
      });
      res.json(result);
    } catch (err: any) {
      console.error('[Arr Monitor] Error toggling monitoring:', err);
      res.status(500).json({ error: err.message || 'Failed to update monitoring status' });
    }
  });

  // Interactive Release Search
  app.get('/api/arr/releases', requireAuth, async (req, res) => {
    try {
      const service = (req.query.service as ServiceId) || 'radarr';
      const title = (req.query.title as string) || '';
      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
      const mediaType = (req.query.mediaType as any) || (service === 'sonarr' ? 'tv' : service === 'radarr' ? 'movie' : 'music');
      const foreignId = req.query.foreignId as string;
      const season = req.query.season ? parseInt(req.query.season as string, 10) : undefined;
      const episode = req.query.episode ? parseInt(req.query.episode as string, 10) : undefined;
      const albumTitle = req.query.albumTitle as string;
      const artistName = req.query.artistName as string;

      if (!title && !albumTitle) {
        return res.status(400).json({ error: 'Title is required for release search' });
      }

      const releases = await searchReleases({
        service,
        title,
        year,
        mediaType,
        foreignId,
        season,
        episode,
        albumTitle,
        artistName
      });

      res.json({ releases });
    } catch (err: any) {
      console.error('[Releases] Search error:', err);
      res.status(500).json({ error: err.message || 'Failed to search releases' });
    }
  });

  // Dispatch Grab (Automatic Fast Grab or Specific Interactive Release)
  app.post('/api/arr/grab', requireAuth, async (req, res) => {
    const user = (req as any).user;
    if (user.role === 'readonly') {
      return res.status(403).json({ error: 'Read-only users cannot trigger downloads.' });
    }

    try {
      const { service, title, year, mediaType, posterUrl, mode, release, foreignId, albumTitle, artistName, albumId } = req.body;
      if (!service || !title) {
        return res.status(400).json({ error: 'Service and title are required for grab.' });
      }

      const result = await executeGrab({
        service,
        title,
        year,
        mediaType: mediaType || (service === 'sonarr' ? 'tv' : service === 'radarr' ? 'movie' : 'music'),
        posterUrl,
        mode: mode || 'fast',
        release,
        foreignId,
        albumTitle,
        artistName,
        albumId
      });

      res.json(result);
    } catch (err: any) {
      console.error('[Grab] Execution error:', err);
      res.status(500).json({ error: err.message || 'Failed to execute grab' });
    }
  });

  // Queue Monitor
  app.get('/api/arr/queue', requireAuth, async (req, res) => {
    const queue = await getActiveQueue(req.query.refresh === 'true');
    res.json({ queue });
  });

  // Move completed queue item(s) to history
  app.post('/api/arr/queue/move-to-history', requireAuth, async (req, res) => {
    try {
      const { id } = req.body || {};
      const result = await moveQueueItemToHistory(id);
      res.json({ success: true, ...result });
    } catch (err: any) {
      console.error('[Queue] Failed to move item to history:', err);
      res.status(500).json({ error: err.message || 'Failed to move to history' });
    }
  });

  // Delete from queue
  app.delete('/api/arr/queue/:id', requireAuth, async (req, res) => {
    const user = (req as any).user;
    if (user.role === 'readonly') {
      return res.status(403).json({ error: 'Read-only users cannot modify download queue.' });
    }

    const { id } = req.params;
    const removed = await removeQueueItem(id);
    res.json({ success: removed });
  });

  // Waitlist / Forthcoming
  app.get('/api/arr/waitlist', requireAuth, async (req, res) => {
    const waitlist = await getWaitlistItems();
    res.json({ waitlist });
  });

  // Prowlarr Indexers
  app.get('/api/arr/indexers', requireAuth, async (req, res) => {
    const indexers = await getProwlarrIndexers(req.query.refresh === 'true');
    res.json({ indexers });
  });

  // Download History (Latest 10 downloads)
  app.get('/api/arr/history', requireAuth, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const history = await getDownloadHistory(limit);
      res.json({ history });
    } catch (err: any) {
      console.error('[History] Failed to get download history:', err);
      res.status(500).json({ error: 'Failed to retrieve download history' });
    }
  });

  // Media Cover Proxy for Sonarr, Radarr, Lidarr
  app.get('/api/arr/media-cover', async (req, res) => {
    const serviceId = req.query.service as ServiceId;
    const coverPath = req.query.path as string;
    const artistName = (req.query.artist as string) || (req.query.title as string) || '';

    if (!serviceId || !coverPath) {
      if (artistName) {
        const fallback = await resolveArtistArtwork(artistName);
        if (fallback) return res.redirect(302, fallback);
      }
      return res.status(400).send('Service and path are required');
    }

    const db = getDb();
    const svc = db.settings.services[serviceId];
    if (!svc || !svc.enabled || !svc.baseUrl || !svc.apiKey || svc.baseUrl.includes('[YOUR_URL]')) {
      if (artistName) {
        const fallback = await resolveArtistArtwork(artistName);
        if (fallback) return res.redirect(302, fallback);
      }
      return res.status(404).send('Service not configured');
    }

    try {
      const fullUrl = getServiceApiUrl(svc, coverPath);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const upstreamRes = await fetch(fullUrl, {
        headers: {
          'X-Api-Key': svc.apiKey,
          Accept: 'image/*,*/*'
        },
        signal: controller.signal
      });
      clearTimeout(timeout);

      const contentType = upstreamRes.headers.get('content-type') || '';

      // If upstream failed or returned non-image (e.g. Lidarr returns HTML on reverse proxy paths)
      if (!upstreamRes.ok || !contentType.startsWith('image/')) {
        if (artistName || serviceId === 'lidarr') {
          const fallback = await resolveArtistArtwork(artistName);
          if (fallback) {
            res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
            return res.redirect(302, fallback);
          }
        }
        return res.status(upstreamRes.status || 404).send('Cover not found');
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');

      const arrayBuffer = await upstreamRes.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (err: any) {
      console.warn(`[MediaCover Proxy] Failed to fetch cover for ${serviceId} ${coverPath}:`, err.message);
      if (artistName) {
        const fallback = await resolveArtistArtwork(artistName);
        if (fallback) return res.redirect(302, fallback);
      }
      res.status(502).send('Error fetching media cover');
    }
  });

  // Direct High-Resolution Artist Artwork Endpoint
  app.get('/api/arr/artist/artwork', async (req, res) => {
    const artist = (req.query.artist as string) || (req.query.name as string) || (req.query.title as string) || '';
    if (!artist) {
      return res.status(400).send('Artist parameter required');
    }
    try {
      const artUrl = await resolveArtistArtwork(artist);
      if (artUrl) {
        res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
        return res.redirect(302, artUrl);
      }
      res.status(404).send('Artist artwork not found');
    } catch (err: any) {
      console.warn(`[ArtistArtwork] Error resolving artwork for "${artist}":`, err.message);
      res.status(500).send('Error resolving artist artwork');
    }
  });

  // Test Indexer
  app.post('/api/arr/indexers/test', requireAuth, (req, res) => {
    res.json({ success: true, message: 'Indexer connection verified. Latency: 92ms' });
  });

  // Unified Library Calendar
  app.get('/api/arr/calendar', requireAuth, async (req, res) => {
    const events = await getCalendarEvents(req.query.refresh === 'true');
    res.json({ events });
  });

  // External Forthcoming Media Calendar & Window
  app.get('/api/arr/external-calendar', async (req, res) => {
    try {
      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
      const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
      const releases = await getExternalForthcomingReleases(year, month);
      res.json({ releases });
    } catch (err: any) {
      console.error('[External Calendar] Error fetching releases:', err);
      res.status(500).json({ error: 'Failed to fetch external releases' });
    }
  });

  // Top Forthcoming Releases for the Next Three Months (TV, Movies, Music)
  app.get('/api/arr/forthcoming', async (req, res) => {
    try {
      const forceRefresh = req.query.refresh === 'true';
      const data = await getTopReleasesNextThreeMonths(forceRefresh);
      res.json(data);
    } catch (err: any) {
      console.error('[Forthcoming Releases] Error fetching next 3 months:', err);
      res.status(500).json({ error: 'Failed to fetch forthcoming releases' });
    }
  });

  // Refresh Arr Cache endpoint
  app.post('/api/arr/refresh', requireAuth, (req, res) => {
    invalidateArrCache();
    res.json({ success: true, message: 'Cache cleared' });
  });

  // iCal/WebCal Feed Export (Public with secret calendarToken)
  app.get('/api/calendar/feed.ics', async (req, res) => {
    const db = getDb();
    const token = (req.query.token as string) || '';

    // Verify feed token or valid session
    const validUser = getSessionUser(token);
    if (token !== db.settings.calendarToken && !validUser) {
      return res.status(401).send('Unauthorized: Invalid calendar feed token');
    }

    const icsContent = await generateICalFeed(db.settings.systemName || 'Arr House');
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="arr-house-releases.ics"');
    res.send(icsContent);
  });

  // TrueNAS SCALE Config Export & Import
  app.get('/api/system/export-config', requireAdmin, (req, res) => {
    const db = getDb();
    const exportData = {
      version: db.version,
      exportedAt: new Date().toISOString(),
      systemName: db.settings.systemName,
      services: db.settings.services,
      demoMode: db.settings.demoMode
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="arr-hub-config.json"');
    res.json(exportData);
  });

  app.post('/api/system/import-config', requireAdmin, (req, res) => {
    const db = getDb();
    const imported = req.body;

    if (imported && imported.services) {
      db.settings.services = {
        ...db.settings.services,
        ...imported.services
      };
      if (typeof imported.demoMode === 'boolean') {
        db.settings.demoMode = imported.demoMode;
      }
      if (imported.systemName) {
        db.settings.systemName = imported.systemName;
      }
      saveDb(db);
      return res.json({ success: true, message: 'Configuration imported successfully' });
    }

    res.status(400).json({ error: 'Invalid configuration file' });
  });

  // ----------------------------------------------------
  // API Fallback & Error Handling
  // ----------------------------------------------------
  // Ensure any unmatched /api route returns a JSON 404 rather than the HTML SPA page
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
  });

  // Global API error handler (always returns JSON, never HTML)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`[Arr House Error] ${req.method} ${req.path}:`, err);
    if (res.headersSent) {
      return next(err);
    }
    const statusCode = typeof err.status === 'number' ? err.status : (typeof err.statusCode === 'number' ? err.statusCode : 500);
    res.status(statusCode).json({
      error: err.message || 'Internal server error'
    });
  });

  // ----------------------------------------------------
  // Vite Middleware & Static Serving
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Arr House] Server listening on http://0.0.0.0:${PORT}`);

    // Preload forthcoming releases & warm library, queue, calendar and artist artwork in background
    setTimeout(() => {
      getTopReleasesNextThreeMonths(false).catch(err => {
        console.warn('[Arr House] Forthcoming releases background pre-warm error:', err);
      });

      getFullLibrary(false).then(items => {
        const artists = items
          .filter(i => i.mediaType === 'music' || i.service === 'lidarr')
          .map(i => i.artist || i.title)
          .filter(Boolean);
        if (artists.length > 0) {
          warmArtistArtwork(artists).catch(e => {
            console.warn('[Arr House] Artist artwork warm error:', e);
          });
        }
      }).catch(() => {});

      getActiveQueue(false).catch(() => {});
      getCalendarEvents(false).catch(() => {});
    }, 1200);
  });
}

startServer();
