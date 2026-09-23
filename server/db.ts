import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { AppSettings, ServiceConfig, User, ServiceId } from '../src/types.js';

const DATA_DIR = process.env.ARR_DATA_DIR || path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'arr-hub.json');

export interface StoredUser {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  role: 'admin' | 'standard' | 'readonly';
  createdAt: string;
  lastLogin?: string;
}

export interface StoredSession {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface DatabaseSchema {
  version: number;
  initialized: boolean;
  settings: AppSettings;
  users: StoredUser[];
  sessions: StoredSession[];
  addedLibraryItems: any[]; // User-added items to persist across searches
  downloadHistory?: any[];
  queueItems?: any[];
  monitoredOverrides?: Record<string, boolean>;
  completedQueueTimestamps?: Record<string, number>;
  movedToHistoryQueueIds?: string[];
}

export function shouldDefaultDisablePort(url?: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed.includes('[YOUR_URL]')) return false;
  // If an explicit port is in the URL (e.g. :7878 or :8989), do not disable port
  if (/:[0-9]+($|\/)/.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `http://${trimmed}`);
    const host = parsed.hostname.toLowerCase();
    // Local IP addresses and localhost typically use standard Arr service ports
    if (host === 'localhost' || host === '127.0.0.1' || /^192\.168\./.test(host) || /^10\./.test(host) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) {
      return false;
    }
    // Reverse proxies, tunnels, or domain names with dots (e.g. radarr.soong.my) without port
    return host.includes('.') || trimmed.startsWith('https://');
  } catch {
    return false;
  }
}

const DEFAULT_SERVICES: Record<ServiceId, ServiceConfig> = {
  sonarr: {
    id: 'sonarr',
    name: 'Sonarr',
    enabled: true,
    baseUrl: process.env.SONARR_URL || 'http://[YOUR_URL]',
    port: 8989,
    disablePort: shouldDefaultDisablePort(process.env.SONARR_URL),
    apiKey: process.env.SONARR_API_KEY || '',
    useSsl: (process.env.SONARR_URL || '').startsWith('https://'),
    defaultRootFolder: '/data/media/tv',
    defaultQualityProfileId: 1,
    status: 'untested',
    appTitle: 'Sonarr (TV Shows)'
  },
  radarr: {
    id: 'radarr',
    name: 'Radarr',
    enabled: true,
    baseUrl: process.env.RADARR_URL || 'http://[YOUR_URL]',
    port: 7878,
    disablePort: shouldDefaultDisablePort(process.env.RADARR_URL),
    apiKey: process.env.RADARR_API_KEY || '',
    useSsl: (process.env.RADARR_URL || '').startsWith('https://'),
    defaultRootFolder: '/data/media/movies',
    defaultQualityProfileId: 1,
    status: 'untested',
    appTitle: 'Radarr (Movies)'
  },
  lidarr: {
    id: 'lidarr',
    name: 'Lidarr',
    enabled: true,
    baseUrl: process.env.LIDARR_URL || 'http://[YOUR_URL]',
    port: 8686,
    disablePort: shouldDefaultDisablePort(process.env.LIDARR_URL),
    apiKey: process.env.LIDARR_API_KEY || '',
    useSsl: (process.env.LIDARR_URL || '').startsWith('https://'),
    defaultRootFolder: '/data/media/music',
    defaultQualityProfileId: 1,
    status: 'untested',
    appTitle: 'Lidarr (Music)'
  },
  prowlarr: {
    id: 'prowlarr',
    name: 'Prowlarr',
    enabled: true,
    baseUrl: process.env.PROWLARR_URL || 'http://[YOUR_URL]',
    port: 9696,
    disablePort: shouldDefaultDisablePort(process.env.PROWLARR_URL),
    apiKey: process.env.PROWLARR_API_KEY || '',
    useSsl: (process.env.PROWLARR_URL || '').startsWith('https://'),
    status: 'untested',
    appTitle: 'Prowlarr (Indexers)'
  }
};

function ensureDir(dirPath: string) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (err: any) {
    console.error(`[Arr House DB] Cannot create data directory at "${dirPath}":`, err);
  }
}

let dbCache: DatabaseSchema | null = null;

export function getDb(): DatabaseSchema {
  if (dbCache) return dbCache;

  ensureDir(DATA_DIR);

  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      dbCache = JSON.parse(raw);

      // Auto-sanitize existing service configurations:
      // If service baseUrl starts with https:// or is a reverse proxy / tunnel domain without an explicit port, ensure disablePort is correctly set
      if (dbCache && dbCache.settings && dbCache.settings.services) {
        let changed = false;
        for (const key of Object.keys(dbCache.settings.services) as ServiceId[]) {
          const s = dbCache.settings.services[key];
          if (s && s.baseUrl) {
            const hasExplicitPort = /:[0-9]+($|\/)/.test(s.baseUrl);
            if (!hasExplicitPort && !s.disablePort && shouldDefaultDisablePort(s.baseUrl)) {
              s.disablePort = true;
              changed = true;
            }
          }
        }
        if (changed) {
          saveDb(dbCache);
        }
      }

      return dbCache!;
    } catch (err) {
      console.error('[Arr House DB] Error reading database file, recreating default:', err);
    }
  }

  const initial: DatabaseSchema = {
    version: 1,
    initialized: false,
    settings: {
      services: DEFAULT_SERVICES,
      demoMode: false,
      calendarToken: crypto.randomBytes(16).toString('hex'),
      systemName: 'Arr House'
    },
    users: [],
    sessions: [],
    addedLibraryItems: []
  };

  dbCache = initial;
  try {
    saveDb(initial);
  } catch (err) {
    console.warn('[Arr House DB] Warning: Could not write initial DB file to disk, running in-memory for now:', err);
  }
  return initial;
}

export function saveDb(data: DatabaseSchema): void {
  dbCache = data;
  try {
    ensureDir(DATA_DIR);
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err: any) {
    console.error(`[Arr House DB] Failed to write database to "${DB_FILE}":`, err);
    if (err.code === 'EACCES' || err.code === 'EPERM') {
      throw new Error(`Data directory write permission denied (${err.code}) at "${DATA_DIR}". Check dataset ownership or volume permissions on your Docker host.`);
    }
    throw new Error(`Database save failed: ${err.message || err}`);
  }
}

// Password hashing
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(verifyHash));
}

// Session management
export function createSession(userId: string): StoredSession {
  const db = getDb();
  const token = crypto.randomBytes(32).toString('hex');
  const session: StoredSession = {
    token,
    userId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
  };

  // Clean expired sessions
  const now = new Date().toISOString();
  db.sessions = db.sessions.filter(s => s.expiresAt > now);
  db.sessions.push(session);
  saveDb(db);

  return session;
}

export function getSessionUser(token: string): User | null {
  if (!token) return null;
  const db = getDb();
  const now = new Date().toISOString();
  const session = db.sessions.find(s => s.token === token && s.expiresAt > now);
  if (!session) return null;

  const user = db.users.find(u => u.id === session.userId);
  if (!user) return null;

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin
  };
}

export function deleteSession(token: string): void {
  const db = getDb();
  db.sessions = db.sessions.filter(s => s.token !== token);
  saveDb(db);
}
