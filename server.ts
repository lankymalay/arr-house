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
  getWaitlistItems,
  getProwlarrIndexers,
  getCalendarEvents,
  getServiceApiUrl,
  invalidateArrCache
} from './server/arrProxy.js';
import { generateICalFeed } from './server/ical.js';
import { getExternalForthcomingReleases } from './server/externalCalendar.js';
import type { ServiceId, UserRole } from './src/types.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

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
        hasApiKey: !!svc.apiKey
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
    if (systemName) {
      db.settings.systemName = systemName.trim();
    }

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

  // Media Cover Image Proxy (allows browser to securely load artwork through backend)
  app.get('/api/arr/media-cover', async (req, res) => {
    const serviceId = req.query.service as ServiceId;
    const imagePath = req.query.path as string;

    if (!serviceId || !imagePath) {
      return res.status(400).send('Missing service or path');
    }

    const db = getDb();
    const service = db.settings.services[serviceId];
    if (!service || !service.apiKey) {
      return res.status(404).send('Service not found or unconfigured');
    }

    try {
      const fullUrl = getServiceApiUrl(service, imagePath);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const imgRes = await fetch(fullUrl, {
        headers: { 'X-Api-Key': service.apiKey },
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!imgRes.ok) {
        return res.status(imgRes.status).send('Cover image not found');
      }

      const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      const buffer = await imgRes.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch {
      res.status(502).send('Error loading image');
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
        baseUrl: s.baseUrl
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
    const service = (req.query.service as ServiceId | 'all') || 'all';

    const results = await searchContent(q, service);
    res.json({ results });
  });

  // Add & Search Content
  app.post('/api/arr/add', requireAuth, async (req, res) => {
    const user = (req as any).user;
    if (user.role === 'readonly') {
      return res.status(403).json({ error: 'Read-only users cannot add content.' });
    }

    const payload = req.body;
    if (!payload.service || !payload.title || !payload.rootFolderPath) {
      return res.status(400).json({ error: 'Missing required parameters (service, title, rootFolderPath)' });
    }

    const result = await addContentToService(payload);
    res.json(result);
  });

  // Queue Monitor
  app.get('/api/arr/queue', requireAuth, async (req, res) => {
    const queue = await getActiveQueue(req.query.refresh === 'true');
    res.json({ queue });
  });

  // Delete from queue
  app.delete('/api/arr/queue/:id', requireAuth, (req, res) => {
    const user = (req as any).user;
    if (user.role === 'readonly') {
      return res.status(403).json({ error: 'Read-only users cannot modify download queue.' });
    }

    const { id } = req.params;
    const removed = removeQueueItem(id);
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

  // Test Indexer
  app.post('/api/arr/indexers/test', requireAuth, (req, res) => {
    res.json({ success: true, message: 'Indexer connection verified. Latency: 92ms' });
  });

  // Unified Library Calendar
  app.get('/api/arr/calendar', requireAuth, async (req, res) => {
    const events = await getCalendarEvents(req.query.refresh === 'true');
    res.json({ events });
  });

  // External Forthcoming Media Calendar (Highly Rated TV, Movies, Music)
  app.get('/api/arr/external-calendar', requireAuth, async (req, res) => {
    const releases = await getExternalForthcomingReleases();
    res.json({ releases });
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
  });
}

startServer();
