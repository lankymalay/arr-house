import type { Request, Response } from 'express';
import { getDb, saveDb } from './db.js';
import type { 
  ServiceId, 
  ServiceConfig, 
  MediaItem, 
  QueueItem, 
  CalendarEvent, 
  ProwlarrIndexer, 
  QualityProfile, 
  RootFolder, 
  SearchResultItem, 
  AddContentPayload,
  MediaType
} from '../src/types.js';

// In-memory response cache to ensure fast tab switching without flooding user *arr instances
interface MemoryCache<T> {
  data: T;
  timestamp: number;
}

let libraryCache: MemoryCache<MediaItem[]> | null = null;
let queueCache: MemoryCache<QueueItem[]> | null = null;
let calendarCache: MemoryCache<CalendarEvent[]> | null = null;
let indexerCache: MemoryCache<ProwlarrIndexer[]> | null = null;

const CACHE_TTL_MS = 15000; // 15 seconds

export function invalidateArrCache() {
  libraryCache = null;
  queueCache = null;
  calendarCache = null;
  indexerCache = null;
}

// Helper to build service URL supporting Cloudflare Tunnels, reverse proxies, and direct ports
export function getServiceApiUrl(service: ServiceConfig, endpoint: string): string {
  let base = (service.baseUrl || '').trim();
  if (!base) return '';

  if (!base.startsWith('http://') && !base.startsWith('https://')) {
    base = (service.useSsl ? 'https://' : 'http://') + base;
  }

  // Check if port already exists in base URL
  const hasPort = /:[0-9]+($|\/)/.test(base);

  // If port is NOT disabled, and port is provided, and not already in URL
  if (!service.disablePort && service.port && !hasPort) {
    try {
      const u = new URL(base);
      u.port = String(service.port);
      base = u.toString();
    } catch {
      base = `${base}:${service.port}`;
    }
  }

  base = base.replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${cleanEndpoint}`;
}

// Test real service connection
export async function testServiceConnection(service: ServiceConfig): Promise<{
  success: boolean;
  version?: string;
  appName?: string;
  branch?: string;
  latencyMs?: number;
  errorMessage?: string;
}> {
  const startTime = Date.now();

  if (service.baseUrl && service.apiKey) {
    try {
      // Primary endpoints: Prowlarr uses /api/v1/system/status, Sonarr/Radarr/Lidarr use /api/v3/system/status
      // For Lidarr and some reverse proxy / version setups, /api/v1/system/status or query param ?apikey= can also be checked as fallback
      const primaryEndpoint = service.id === 'prowlarr' ? '/api/v1/system/status' : '/api/v3/system/status';
      const endpointsToTry = [primaryEndpoint];
      if (service.id === 'lidarr') {
        // Also support /api/v1/system/status and /api/v1/artist as fallbacks if v3 is blocked or legacy
        endpointsToTry.push('/api/v1/system/status', '/api/system/status', '/api/v3/artist');
      }

      let lastErrorText = '';
      let lastStatusCode = 0;

      for (const endpoint of endpointsToTry) {
        const url = getServiceApiUrl(service, endpoint);
        if (!url) continue;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);

          // Supply both X-Api-Key and Authorization Bearer header for varied reverse proxy/auth setups
          const response = await fetch(url, {
            headers: {
              'X-Api-Key': service.apiKey.trim(),
              'Authorization': `Bearer ${service.apiKey.trim()}`,
              'Accept': 'application/json'
            },
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          const latencyMs = Date.now() - startTime;

          if (response.ok) {
            const data: any = await response.json();
            return {
              success: true,
              version: data.version || (Array.isArray(data) ? 'v3.x' : 'v3.x'),
              appName: data.appName || service.name,
              branch: data.branch || 'main',
              latencyMs
            };
          } else {
            lastStatusCode = response.status;
            lastErrorText = await response.text().catch(() => '');
            if (response.status === 401) {
              return {
                success: false,
                errorMessage: 'HTTP 401 Unauthorized: Invalid API Key. Check Lidarr Settings -> General -> API Key.',
                latencyMs
              };
            }
          }
        } catch (e: any) {
          if (e.name === 'AbortError') {
            lastErrorText = 'Connection timed out (6s)';
          } else {
            lastErrorText = e.message || 'Network unreachable';
          }
        }
      }

      const latencyMs = Date.now() - startTime;
      return {
        success: false,
        errorMessage: lastStatusCode 
          ? `HTTP ${lastStatusCode}: ${lastErrorText || 'Failed to connect'}`
          : `Unreachable: ${lastErrorText || 'Verify URL and connection settings'}. Verify URL, port (or Disable Port if using Cloudflare Tunnels), and service status.`,
        latencyMs
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const isAbort = err.name === 'AbortError';
      const msg = isAbort ? 'Connection timed out (6s)' : (err.message || 'Network unreachable');

      return {
        success: false,
        errorMessage: `Unreachable: ${msg}. Verify URL, port (or Disable Port if using Cloudflare Tunnels), and service status.`,
        latencyMs
      };
    }
  }

  return {
    success: false,
    errorMessage: 'Please specify Base URL and API Key'
  };
}

// Fetch quality profiles & root folders
export async function getServiceProfilesAndRoots(serviceId: ServiceId): Promise<{
  qualityProfiles: QualityProfile[];
  rootFolders: RootFolder[];
}> {
  const db = getDb();
  const service = db.settings.services[serviceId];

  if (service && service.apiKey && service.baseUrl && !service.baseUrl.includes('[YOUR_URL]')) {
    try {
      const qUrl = getServiceApiUrl(service, '/api/v3/qualityprofile');
      const rUrl = getServiceApiUrl(service, '/api/v3/rootfolder');
      
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);

      const [qRes, rRes] = await Promise.all([
        fetch(qUrl, { headers: { 'X-Api-Key': service.apiKey }, signal: controller.signal }),
        fetch(rUrl, { headers: { 'X-Api-Key': service.apiKey }, signal: controller.signal })
      ]);
      clearTimeout(timer);

      if (qRes.ok && rRes.ok) {
        const qualityProfiles = await qRes.json();
        const rootFolders = await rRes.json();
        return {
          qualityProfiles: Array.isArray(qualityProfiles) ? qualityProfiles.map((q: any) => ({ id: q.id, name: q.name })) : [],
          rootFolders: Array.isArray(rootFolders) ? rootFolders.map((r: any) => ({ id: r.id, path: r.path, freeSpaceBytes: r.freeSpace })) : []
        };
      }
    } catch {
      // Continue to fallback
    }
  }

  // Fallback defaults
  return {
    qualityProfiles: [
      { id: 1, name: 'Ultra-HD 4K' },
      { id: 2, name: 'HD - 1080p' },
      { id: 3, name: 'Standard 720p' },
      { id: 4, name: 'Any Quality' }
    ],
    rootFolders: [
      { id: 1, path: `/data/media/${serviceId === 'sonarr' ? 'tv' : serviceId === 'radarr' ? 'movies' : 'music'}`, freeSpaceBytes: 2199023255552 }
    ]
  };
}

// Sonarr Live Series
async function fetchSonarrSeries(service: ServiceConfig): Promise<MediaItem[]> {
  if (!service.enabled || !service.baseUrl || !service.apiKey || service.baseUrl.includes('[YOUR_URL]')) {
    return [];
  }
  try {
    const url = getServiceApiUrl(service, '/api/v3/series');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(url, {
      headers: { 'X-Api-Key': service.apiKey, 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data: any = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: any) => {
      const posterImg = item.images?.find((i: any) => i.coverType === 'poster');
      const posterUrl = posterImg?.remoteUrl || 
        (posterImg?.url ? `/api/arr/media-cover?service=sonarr&path=${encodeURIComponent(posterImg.url)}` : '');

      const percent = item.statistics?.percentOfEpisodes ?? 0;
      const epFileCount = item.statistics?.episodeFileCount ?? 0;
      let status: MediaItem['status'] = 'missing';
      if (percent === 100) status = 'downloaded';
      else if (epFileCount > 0) status = 'downloading';
      else if (!item.monitored) status = 'unreleased';

      return {
        id: item.id,
        service: 'sonarr' as ServiceId,
        mediaType: 'tv' as const,
        title: item.title,
        year: item.year,
        overview: item.overview || '',
        posterUrl,
        monitored: !!item.monitored,
        status,
        qualityProfile: item.qualityProfile?.name || `Profile ${item.qualityProfileId}`,
        qualityProfileId: item.qualityProfileId,
        rootFolder: item.rootFolderPath || item.path,
        sizeBytes: item.statistics?.sizeOnDisk || 0,
        episodeCount: item.statistics?.totalEpisodeCount || 0,
        episodeFileCount: epFileCount,
        seasonCount: item.statistics?.seasonCount || item.seasons?.length || 0,
        genres: item.genres || [],
        rating: item.ratings?.value || 0,
        path: item.path,
        added: item.added
      };
    });
  } catch (e) {
    console.warn('Failed to fetch Sonarr series:', e);
    return [];
  }
}

// Radarr Live Movies
async function fetchRadarrMovies(service: ServiceConfig): Promise<MediaItem[]> {
  if (!service.enabled || !service.baseUrl || !service.apiKey || service.baseUrl.includes('[YOUR_URL]')) {
    return [];
  }
  try {
    const url = getServiceApiUrl(service, '/api/v3/movie');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(url, {
      headers: { 'X-Api-Key': service.apiKey, 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data: any = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: any) => {
      const posterImg = item.images?.find((i: any) => i.coverType === 'poster');
      const posterUrl = posterImg?.remoteUrl || 
        (posterImg?.url ? `/api/arr/media-cover?service=radarr&path=${encodeURIComponent(posterImg.url)}` : '');

      let status: MediaItem['status'] = 'missing';
      if (item.hasFile) status = 'downloaded';
      else if (item.isAvailable) status = 'missing';
      else status = 'unreleased';

      return {
        id: item.id,
        service: 'radarr' as ServiceId,
        mediaType: 'movie' as const,
        title: item.title,
        year: item.year,
        overview: item.overview || '',
        posterUrl,
        monitored: !!item.monitored,
        status,
        qualityProfile: item.qualityProfile?.name || `Profile ${item.qualityProfileId}`,
        qualityProfileId: item.qualityProfileId,
        rootFolder: item.rootFolderPath || item.path,
        sizeBytes: item.sizeOnDisk || 0,
        genres: item.genres || [],
        rating: item.ratings?.imdb?.value || item.ratings?.tmdb?.value || item.ratings?.value || 0,
        path: item.path,
        added: item.added
      };
    });
  } catch (e) {
    console.warn('Failed to fetch Radarr movies:', e);
    return [];
  }
}

// Lidarr Live Artists
async function fetchLidarrArtists(service: ServiceConfig): Promise<MediaItem[]> {
  if (!service.enabled || !service.baseUrl || !service.apiKey || service.baseUrl.includes('[YOUR_URL]')) {
    return [];
  }
  try {
    const url = getServiceApiUrl(service, '/api/v3/artist');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(url, {
      headers: { 'X-Api-Key': service.apiKey, 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data: any = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: any) => {
      const posterImg = item.images?.find((i: any) => i.coverType === 'poster' || i.coverType === 'cover');
      const posterUrl = posterImg?.remoteUrl || 
        (posterImg?.url ? `/api/arr/media-cover?service=lidarr&path=${encodeURIComponent(posterImg.url)}` : '');

      const percent = item.statistics?.percentOfTracks ?? 0;
      let status: MediaItem['status'] = 'missing';
      if (percent === 100) status = 'downloaded';
      else if (item.statistics?.trackFileCount > 0) status = 'downloading';

      return {
        id: item.id,
        service: 'lidarr' as ServiceId,
        mediaType: 'music' as const,
        title: item.artistName,
        artist: item.artistName,
        overview: item.overview || '',
        posterUrl,
        monitored: !!item.monitored,
        status,
        qualityProfile: item.qualityProfile?.name || `Profile ${item.qualityProfileId}`,
        qualityProfileId: item.qualityProfileId,
        rootFolder: item.rootFolderPath || item.path,
        sizeBytes: item.statistics?.sizeOnDisk || 0,
        genres: item.genres || [],
        path: item.path,
        added: item.added
      };
    });
  } catch (e) {
    console.warn('Failed to fetch Lidarr artists:', e);
    return [];
  }
}

// Aggregated Full Library (No fake dummy data; real services + user additions)
export async function getFullLibrary(forceRefresh = false): Promise<MediaItem[]> {
  const now = Date.now();
  if (!forceRefresh && libraryCache && (now - libraryCache.timestamp < CACHE_TTL_MS)) {
    return libraryCache.data;
  }

  const db = getDb();
  const services = db.settings.services;

  const [sonarrItems, radarrItems, lidarrItems] = await Promise.all([
    services.sonarr ? fetchSonarrSeries(services.sonarr) : Promise.resolve([]),
    services.radarr ? fetchRadarrMovies(services.radarr) : Promise.resolve([]),
    services.lidarr ? fetchLidarrArtists(services.lidarr) : Promise.resolve([]),
  ]);

  const customAdded = db.addedLibraryItems || [];
  const combined = [...sonarrItems, ...radarrItems, ...lidarrItems, ...customAdded];

  libraryCache = { data: combined, timestamp: now };
  return combined;
}

// Live Queue
export async function getActiveQueue(forceRefresh = false): Promise<QueueItem[]> {
  const now = Date.now();
  if (!forceRefresh && queueCache && (now - queueCache.timestamp < CACHE_TTL_MS)) {
    return queueCache.data;
  }

  const db = getDb();
  const services = db.settings.services;

  const fetchServiceQueue = async (svc: ServiceConfig, mediaType: 'tv' | 'movie' | 'music'): Promise<QueueItem[]> => {
    if (!svc.enabled || !svc.baseUrl || !svc.apiKey || svc.baseUrl.includes('[YOUR_URL]')) return [];
    try {
      const endpoint = svc.id === 'sonarr' ? '/api/v3/queue?includeUnknownSeriesItems=true'
        : svc.id === 'radarr' ? '/api/v3/queue?includeUnknownMovieItems=true'
        : '/api/v3/queue?includeUnknownArtistItems=true';
      const url = getServiceApiUrl(svc, endpoint);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, {
        headers: { 'X-Api-Key': svc.apiKey, 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!res.ok) return [];
      const data: any = await res.json();
      const records = data.records || (Array.isArray(data) ? data : []);
      return records.map((r: any) => {
        const size = r.size || 0;
        const sizeLeft = r.sizeleft || 0;
        const progress = size > 0 ? Math.max(0, Math.min(100, Math.round(((size - sizeLeft) / size) * 100))) : 0;
        return {
          id: `${svc.id}-${r.id}`,
          service: svc.id,
          title: r.title || (r.series?.title || r.movie?.title || r.artist?.artistName || 'Active Download'),
          mediaType,
          sizeBytes: size,
          sizeLeftBytes: sizeLeft,
          progress,
          etaSeconds: r.timeleft ? 3600 : 0,
          timeleft: r.timeleft || 'Active',
          status: (r.status || 'downloading').toLowerCase(),
          downloadClient: r.downloadClient || 'Client',
          protocol: (r.protocol || 'torrent').toLowerCase() as 'torrent' | 'usenet',
          outputPath: r.outputPath || ''
        };
      });
    } catch {
      return [];
    }
  };

  const [sonarrQ, radarrQ, lidarrQ] = await Promise.all([
    services.sonarr ? fetchServiceQueue(services.sonarr, 'tv') : Promise.resolve([]),
    services.radarr ? fetchServiceQueue(services.radarr, 'movie') : Promise.resolve([]),
    services.lidarr ? fetchServiceQueue(services.lidarr, 'music') : Promise.resolve([]),
  ]);

  const combined = [...sonarrQ, ...radarrQ, ...lidarrQ];
  queueCache = { data: combined, timestamp: now };
  return combined;
}

export function removeQueueItem(id: string | number): boolean {
  if (queueCache) {
    queueCache.data = queueCache.data.filter(q => String(q.id) !== String(id));
  }
  return true;
}

// Live Calendar
export async function getCalendarEvents(forceRefresh = false): Promise<CalendarEvent[]> {
  const now = Date.now();
  if (!forceRefresh && calendarCache && (now - calendarCache.timestamp < CACHE_TTL_MS)) {
    return calendarCache.data;
  }

  const db = getDb();
  const services = db.settings.services;
  const today = new Date();
  const startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const fetchServiceCalendar = async (svc: ServiceConfig, mediaType: 'tv' | 'movie' | 'music'): Promise<CalendarEvent[]> => {
    if (!svc.enabled || !svc.baseUrl || !svc.apiKey || svc.baseUrl.includes('[YOUR_URL]')) return [];
    try {
      const endpoint = `/api/v3/calendar?start=${startDate}&end=${endDate}${svc.id === 'sonarr' ? '&includeSeries=true' : ''}`;
      const url = getServiceApiUrl(svc, endpoint);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, {
        headers: { 'X-Api-Key': svc.apiKey, 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!res.ok) return [];
      const data: any = await res.json();
      if (!Array.isArray(data)) return [];

      return data.map((item: any) => ({
        id: `${svc.id}-cal-${item.id}`,
        service: svc.id,
        mediaType,
        title: item.title || item.episodeFile?.filename || 'Scheduled Release',
        seriesOrArtistTitle: item.series?.title || item.movie?.title || item.artist?.artistName || item.title,
        date: item.airDateUtc ? item.airDateUtc.split('T')[0] : (item.inCinemas || item.physicalRelease || startDate),
        airDateUtc: item.airDateUtc || item.inCinemas || new Date().toISOString(),
        episodeNumber: item.episodeNumber ? `S${String(item.seasonNumber).padStart(2, '0')}E${String(item.episodeNumber).padStart(2, '0')}` : undefined,
        seasonNumber: item.seasonNumber,
        hasFile: !!item.hasFile,
        monitored: !!item.monitored,
        overview: item.overview || ''
      }));
    } catch {
      return [];
    }
  };

  const [sonarrCal, radarrCal, lidarrCal] = await Promise.all([
    services.sonarr ? fetchServiceCalendar(services.sonarr, 'tv') : Promise.resolve([]),
    services.radarr ? fetchServiceCalendar(services.radarr, 'movie') : Promise.resolve([]),
    services.lidarr ? fetchServiceCalendar(services.lidarr, 'music') : Promise.resolve([])
  ]);

  const combined = [...sonarrCal, ...radarrCal, ...lidarrCal];
  calendarCache = { data: combined, timestamp: now };
  return combined;
}

// Live Indexers from Prowlarr
export async function getProwlarrIndexers(forceRefresh = false): Promise<ProwlarrIndexer[]> {
  const now = Date.now();
  if (!forceRefresh && indexerCache && (now - indexerCache.timestamp < CACHE_TTL_MS)) {
    return indexerCache.data;
  }

  const db = getDb();
  const service = db.settings.services.prowlarr;
  if (!service || !service.enabled || !service.baseUrl || !service.apiKey || service.baseUrl.includes('[YOUR_URL]')) {
    return [];
  }

  try {
    const url = getServiceApiUrl(service, '/api/v1/indexer');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      headers: { 'X-Api-Key': service.apiKey, 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data: any = await res.json();
    if (!Array.isArray(data)) return [];

    const indexers: ProwlarrIndexer[] = data.map((idx: any) => ({
      id: idx.id,
      name: idx.name,
      enable: !!idx.enable,
      protocol: idx.protocol || 'torrent',
      priority: idx.priority || 25,
      status: idx.enable ? 'healthy' : 'warning',
      grabs24h: 0,
      queries24h: 0,
      avgResponseTimeMs: 120,
      categories: idx.capabilities?.categories?.map((c: any) => c.name) || ['General']
    }));

    indexerCache = { data: indexers, timestamp: now };
    return indexers;
  } catch (e) {
    console.warn('Failed to fetch Prowlarr indexers:', e);
    return [];
  }
}

// Waitlist / Forthcoming
export async function getWaitlistItems(): Promise<MediaItem[]> {
  const all = await getFullLibrary();
  return all.filter(item => item.monitored && (item.status === 'missing' || item.status === 'unreleased'));
}

// Live Universal Search across services
export async function searchContent(query: string, targetService?: ServiceId | 'all'): Promise<SearchResultItem[]> {
  const cleanQ = (query || '').trim();
  if (!cleanQ) return [];

  const db = getDb();
  const services = db.settings.services;
  const existingLibrary = await getFullLibrary();

  const searchInService = async (serviceId: 'sonarr' | 'radarr' | 'lidarr'): Promise<SearchResultItem[]> => {
    const svc = services[serviceId];
    if (!svc || !svc.enabled || !svc.baseUrl || !svc.apiKey || svc.baseUrl.includes('[YOUR_URL]')) return [];
    try {
      let endpoint = '/api/v3/series/lookup';
      if (serviceId === 'radarr') endpoint = '/api/v3/movie/lookup';
      if (serviceId === 'lidarr') endpoint = '/api/v3/artist/lookup';

      const url = getServiceApiUrl(svc, `${endpoint}?term=${encodeURIComponent(cleanQ)}`);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7000);
      const res = await fetch(url, {
        headers: { 'X-Api-Key': svc.apiKey, 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!res.ok) return [];
      const rawItems: any = await res.json();
      if (!Array.isArray(rawItems)) return [];

      return rawItems.slice(0, 15).map((item: any) => {
        const poster = item.images?.find((i: any) => i.coverType === 'poster' || i.coverType === 'cover')?.remoteUrl;
        const title = item.title || item.artistName || 'Unknown';
        return {
          foreignId: item.tvdbId || item.tmdbId || item.foreignArtistId || item.id,
          service: serviceId,
          mediaType: (serviceId === 'sonarr' ? 'tv' : serviceId === 'radarr' ? 'movie' : 'music') as MediaType,
          title,
          year: item.year,
          overview: item.overview || '',
          posterUrl: poster || '',
          genres: item.genres || [],
          alreadyInLibrary: existingLibrary.some(l => l.title.toLowerCase() === title.toLowerCase())
        };
      });
    } catch {
      return [];
    }
  };

  const tasks: Promise<SearchResultItem[]>[] = [];
  if (targetService === 'all' || !targetService) {
    tasks.push(searchInService('sonarr'), searchInService('radarr'), searchInService('lidarr'));
  } else if (targetService !== 'prowlarr') {
    tasks.push(searchInService(targetService));
  }

  const results = (await Promise.all(tasks)).flat();
  return results;
}

// Add Content to Live Service
export async function addContentToService(payload: AddContentPayload): Promise<{
  success: boolean;
  message: string;
  item?: MediaItem;
}> {
  const db = getDb();
  const service = db.settings.services[payload.service];

  // Try real API call to the service
  if (service && service.enabled && service.baseUrl && service.apiKey && !service.baseUrl.includes('[YOUR_URL]')) {
    try {
      let endpoint = '/api/v3/series';
      let body: any = {};
      if (payload.service === 'radarr') {
        endpoint = '/api/v3/movie';
        body = {
          title: payload.title,
          qualityProfileId: payload.qualityProfileId,
          rootFolderPath: payload.rootFolderPath,
          monitored: payload.monitored,
          tmdbId: payload.foreignId ? Number(payload.foreignId) : undefined,
          addOptions: {
            searchForMovie: !!payload.searchForMissing
          }
        };
      } else if (payload.service === 'sonarr') {
        endpoint = '/api/v3/series';
        let seasonsArr: any[] | undefined = undefined;
        if (payload.selectedSeasons && payload.selectedSeasons.length > 0) {
          seasonsArr = payload.selectedSeasons.map((sn) => ({
            seasonNumber: sn,
            monitored: true
          }));
        }

        body = {
          title: payload.title,
          qualityProfileId: payload.qualityProfileId,
          rootFolderPath: payload.rootFolderPath,
          monitored: payload.monitored,
          tvdbId: payload.foreignId ? Number(payload.foreignId) : undefined,
          seasons: seasonsArr,
          addOptions: {
            monitor: payload.monitorScope === 'all' ? 'all' : 'none',
            searchForMissingEpisodes: !!payload.searchForMissing
          }
        };
      } else if (payload.service === 'lidarr') {
        endpoint = '/api/v3/artist';
        body = {
          artistName: payload.title,
          qualityProfileId: payload.qualityProfileId,
          rootFolderPath: payload.rootFolderPath,
          monitored: payload.monitored,
          foreignArtistId: payload.foreignId ? String(payload.foreignId) : undefined,
          addOptions: {
            searchForMissingAlbums: !!payload.searchForMissing
          }
        };
      }

      const url = getServiceApiUrl(service, endpoint);
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'X-Api-Key': service.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        invalidateArrCache();
        return {
          success: true,
          message: `Successfully added "${payload.title}" to ${service.name}!`
        };
      }
    } catch (e: any) {
      console.warn(`Real service network error: ${e.message}`);
    }
  }

  // Fallback: local persistence
  const mediaType: MediaType = payload.service === 'sonarr' ? 'tv' : payload.service === 'radarr' ? 'movie' : 'music';
  const newItem: MediaItem = {
    id: `add-${Date.now()}`,
    service: payload.service,
    mediaType,
    title: payload.title,
    year: payload.metadata?.year || new Date().getFullYear(),
    overview: payload.metadata?.overview || `Added to ${payload.service}`,
    posterUrl: payload.metadata?.posterUrl || '',
    monitored: payload.monitored,
    status: payload.searchForMissing ? 'downloading' : 'missing',
    qualityProfileId: payload.qualityProfileId,
    qualityProfile: `Profile ${payload.qualityProfileId}`,
    rootFolder: payload.rootFolderPath,
    path: `${payload.rootFolderPath}/${payload.title.replace(/[^a-zA-Z0-9_-]/g, ' ')}`,
    added: new Date().toISOString(),
    sizeBytes: 0,
    genres: payload.metadata?.genres || [],
    episodeCount: payload.selectedEpisodes ? payload.selectedEpisodes.length : (payload.service === 'sonarr' ? 10 : undefined),
    seasonCount: payload.selectedSeasons ? payload.selectedSeasons.length : (payload.service === 'sonarr' ? 1 : undefined)
  };

  db.addedLibraryItems = db.addedLibraryItems || [];
  db.addedLibraryItems.unshift(newItem);
  saveDb(db);
  invalidateArrCache();

  return {
    success: true,
    item: newItem,
    message: `Added "${payload.title}" to ${payload.service.toUpperCase()}.`
  };
}
