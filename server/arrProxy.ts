import type { Request, Response } from 'express';
import { getDb, saveDb } from './db.js';
import { resolveArtistArtwork } from './artistArtwork.js';
import type { 
  ServiceId, 
  ServiceConfig, 
  MediaItem, 
  QueueItem, 
  DownloadHistoryItem,
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

  // If disablePort is true, strip any port if present from base URL (e.g. from copy-paste)
  if (service.disablePort) {
    base = base.replace(/:[0-9]+($|\/)/, '$1');
  } else if (service.port && !hasPort) {
    // If port is NOT disabled, and port is provided, and not already in URL
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

// Generic helper to query an Arr service endpoint
export async function fetchArr(serviceId: ServiceId, endpoint: string): Promise<any> {
  const db = getDb();
  const service = db.settings?.services?.[serviceId];
  if (!service || !service.apiKey || !service.baseUrl || service.baseUrl.includes('[YOUR_URL]')) {
    return null;
  }

  const url = getServiceApiUrl(service, endpoint);
  if (!url) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url, {
      headers: {
        'X-Api-Key': service.apiKey.trim(),
        'Authorization': `Bearer ${service.apiKey.trim()}`,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    clearTimeout(timer);

    if (res.ok) {
      return await res.json();
    }
    return null;
  } catch {
    clearTimeout(timer);
    return null;
  }
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
        // Support /api/v1/artist, /api/v1/system/status, and /api/v3/artist as fallbacks
        endpointsToTry.push('/api/v1/artist', '/api/v1/system/status', '/api/v3/artist', '/api/system/status');
      }

      let lastErrorText = '';
      let lastStatusCode = 0;

      for (const endpoint of endpointsToTry) {
        const url = getServiceApiUrl(service, endpoint);
        if (!url) continue;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

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
              version: data.version || (Array.isArray(data) ? 'v1.x / v3.x' : 'v3.x'),
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
                errorMessage: `HTTP 401 Unauthorized: Invalid API Key. Check ${service.name} Settings -> General -> API Key.`,
                latencyMs
              };
            }
          }
        } catch (e: any) {
          if (e.name === 'AbortError') {
            lastErrorText = 'Connection timed out (10s)';
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
      const qEndpoint = service.id === 'lidarr' ? '/api/v1/qualityprofile' : '/api/v3/qualityprofile';
      const rEndpoint = service.id === 'lidarr' ? '/api/v1/rootfolder' : '/api/v3/rootfolder';
      let qUrl = getServiceApiUrl(service, qEndpoint);
      let rUrl = getServiceApiUrl(service, rEndpoint);
      
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);

      let [qRes, rRes] = await Promise.all([
        fetch(qUrl, { headers: { 'X-Api-Key': service.apiKey }, signal: controller.signal }),
        fetch(rUrl, { headers: { 'X-Api-Key': service.apiKey }, signal: controller.signal })
      ]);

      // If Lidarr fails on v1, fallback to v3
      if (service.id === 'lidarr' && (!qRes.ok || !rRes.ok)) {
        const v3qUrl = getServiceApiUrl(service, '/api/v3/qualityprofile');
        const v3rUrl = getServiceApiUrl(service, '/api/v3/rootfolder');
        const [v3q, v3r] = await Promise.all([
          fetch(v3qUrl, { headers: { 'X-Api-Key': service.apiKey }, signal: controller.signal }).catch(() => null),
          fetch(v3rUrl, { headers: { 'X-Api-Key': service.apiKey }, signal: controller.signal }).catch(() => null)
        ]);
        if (v3q && v3q.ok) qRes = v3q;
        if (v3r && v3r.ok) rRes = v3r;
      }
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
    const timeout = setTimeout(() => controller.abort(), 10000);
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
    const timeout = setTimeout(() => controller.abort(), 10000);
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
    const endpoints = ['/api/v1/artist', '/api/v3/artist'];
    let data: any = null;

    for (const ep of endpoints) {
      try {
        const url = getServiceApiUrl(service, ep);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(url, {
          headers: { 'X-Api-Key': service.apiKey, 'Accept': 'application/json' },
          signal: controller.signal
        });
        clearTimeout(timeout);
        if (res.ok) {
          const parsed = await res.json();
          if (Array.isArray(parsed)) {
            data = parsed;
            break;
          }
        }
      } catch (err: any) {
        // Try next endpoint if aborted or error
      }
    }

    if (!Array.isArray(data)) return [];

    const mapped = await Promise.all(data.map(async (item: any) => {
      const posterImg = item.images?.find((i: any) => i.coverType === 'poster' || i.coverType === 'cover' || i.coverType === 'fanart');
      
      // CRITICAL: Only accept real HTTP/HTTPS remote URLs.
      // Lidarr provides internal file paths like "/config/MediaCover/1/poster.jpg" as remoteUrl which 404 in the browser.
      let posterUrl = '';
      if (posterImg?.remoteUrl && (posterImg.remoteUrl.startsWith('http://') || posterImg.remoteUrl.startsWith('https://'))) {
        posterUrl = posterImg.remoteUrl;
      }

      // If no valid remote HTTP URL, resolve high-res artist portrait via Deezer / TheAudioDB / iTunes
      if (!posterUrl && item.artistName) {
        posterUrl = await resolveArtistArtwork(item.artistName);
      }

      // If still no posterUrl and we have a relative URL from Lidarr, proxy through /api/arr/media-cover with artist fallback
      if (!posterUrl && posterImg?.url) {
        posterUrl = `/api/arr/media-cover?service=lidarr&path=${encodeURIComponent(posterImg.url)}&artist=${encodeURIComponent(item.artistName || '')}`;
      }

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
    }));

    return mapped;
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

  // Guarantee every music item has valid artwork (covers customAdded or any unresolved artist)
  await Promise.all(combined.map(async (item) => {
    if (item.mediaType === 'music' || item.service === 'lidarr') {
      if (!item.posterUrl || (!item.posterUrl.startsWith('http') && !item.posterUrl.startsWith('/api/arr/media-cover'))) {
        const art = await resolveArtistArtwork(item.artist || item.title);
        if (art) {
          item.posterUrl = art;
        }
      }
    }
  }));

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
      const endpoints = svc.id === 'sonarr' ? ['/api/v3/queue?includeUnknownSeriesItems=true']
        : svc.id === 'radarr' ? ['/api/v3/queue?includeUnknownMovieItems=true']
        : ['/api/v1/queue?includeUnknownArtistItems=true', '/api/v3/queue?includeUnknownArtistItems=true'];

      let data: any = null;
      for (const ep of endpoints) {
        try {
          const url = getServiceApiUrl(svc, ep);
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);
          const res = await fetch(url, {
            headers: { 'X-Api-Key': svc.apiKey, 'Accept': 'application/json' },
            signal: controller.signal
          });
          clearTimeout(timeout);
          if (res.ok) {
            data = await res.json();
            break;
          }
        } catch {
          // Fallback to next endpoint
        }
      }
      if (!data) return [];
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

// Download History (Latest 10 downloads across Arr services)
export async function getDownloadHistory(limit = 10): Promise<DownloadHistoryItem[]> {
  const db = getDb();
  const services = db.settings.services;
  const historyItems: DownloadHistoryItem[] = [];

  const fetchServiceHistory = async (svc: ServiceConfig, mediaType: MediaType): Promise<DownloadHistoryItem[]> => {
    if (!svc.enabled || !svc.baseUrl || !svc.apiKey || svc.baseUrl.includes('[YOUR_URL]')) {
      return [];
    }

    try {
      const endpoint = svc.id === 'lidarr' 
        ? `/api/v1/history?page=1&pageSize=${limit}&sortKey=date&sortDirection=descending`
        : `/api/v3/history?page=1&pageSize=${limit}&sortKey=date&sortDirection=descending`;

      const url = getServiceApiUrl(svc, endpoint);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(url, {
        headers: {
          'X-Api-Key': svc.apiKey,
          Accept: 'application/json'
        },
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!res.ok) return [];
      const json: any = await res.json();
      const records = Array.isArray(json) ? json : Array.isArray(json.records) ? json.records : [];

      return records.map((rec: any) => {
        let displayTitle = rec.sourceTitle;
        let subTitle = '';

        if (mediaType === 'tv' && rec.series) {
          subTitle = rec.series.title;
          if (!displayTitle) displayTitle = rec.series.title;
        } else if (mediaType === 'movie' && rec.movie) {
          subTitle = rec.movie.title;
          if (!displayTitle) displayTitle = rec.movie.title;
        } else if (mediaType === 'music' && (rec.artist || rec.album)) {
          subTitle = rec.artist?.artistName || rec.album?.title || '';
          if (!displayTitle) displayTitle = rec.artist?.artistName || 'Music Release';
        }

        return {
          id: `${svc.id}-hist-${rec.id || Math.random().toString(36).substr(2, 9)}`,
          service: svc.id,
          mediaType,
          title: displayTitle || 'Downloaded Release',
          seriesOrArtistTitle: subTitle,
          eventType: rec.eventType === 'downloadFolderImported' ? 'Imported' : (rec.eventType || 'Completed'),
          date: rec.date || new Date().toISOString(),
          quality: rec.quality?.quality?.name || '1080p',
          downloadClient: rec.data?.downloadClient || 'Torrent Client',
          protocol: rec.data?.protocol === 'usenet' ? 'usenet' : 'torrent',
          status: 'completed' as const
        };
      });
    } catch {
      return [];
    }
  };

  // Run in parallel
  const [sonarrHist, radarrHist, lidarrHist] = await Promise.all([
    services.sonarr ? fetchServiceHistory(services.sonarr, 'tv') : Promise.resolve([]),
    services.radarr ? fetchServiceHistory(services.radarr, 'movie') : Promise.resolve([]),
    services.lidarr ? fetchServiceHistory(services.lidarr, 'music') : Promise.resolve([])
  ]);

  historyItems.push(...sonarrHist, ...radarrHist, ...lidarrHist);

  // If connected services returned fewer than limit history items, supplement from downloaded library items
  if (historyItems.length < limit) {
    try {
      const library = await getFullLibrary(false);
      const downloaded = library.filter(item => item.status === 'downloaded');
      
      // Sort recently added or downloaded
      downloaded.sort((a, b) => {
        const dateA = a.added || '2026-09-01';
        const dateB = b.added || '2026-09-01';
        return dateB.localeCompare(dateA);
      });

      for (let i = 0; i < downloaded.length && historyItems.length < limit; i++) {
        const item = downloaded[i];
        // Don't duplicate if already present
        if (historyItems.some(h => h.title === item.title)) continue;

        // Calculate staggered recent date if none
        const fallbackDate = item.added || new Date(Date.now() - (i + 1) * 3600000 * 5).toISOString();

        historyItems.push({
          id: `lib-hist-${item.id}`,
          service: item.service,
          mediaType: item.mediaType,
          title: item.title,
          seriesOrArtistTitle: item.artist || item.title,
          eventType: 'Imported',
          date: fallbackDate,
          quality: item.qualityProfile || 'HD / Lossless',
          sizeBytes: item.sizeBytes,
          downloadClient: 'Arr Auto-Downloader',
          protocol: 'torrent',
          status: 'completed',
          posterUrl: item.posterUrl
        });
      }
    } catch (e) {
      console.warn('Error supplementing history from library:', e);
    }
  }

  // Sort by date descending
  historyItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return historyItems.slice(0, limit);
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
      const endpoints = svc.id === 'sonarr'
        ? [`/api/v3/calendar?start=${startDate}&end=${endDate}&includeSeries=true`]
        : svc.id === 'radarr'
        ? [`/api/v3/calendar?start=${startDate}&end=${endDate}`]
        : [`/api/v1/calendar?start=${startDate}&end=${endDate}`, `/api/v3/calendar?start=${startDate}&end=${endDate}`];

      let data: any = null;
      for (const endpoint of endpoints) {
        try {
          const url = getServiceApiUrl(svc, endpoint);
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);
          const res = await fetch(url, {
            headers: { 'X-Api-Key': svc.apiKey, 'Accept': 'application/json' },
            signal: controller.signal
          });
          clearTimeout(timeout);
          if (res.ok) {
            const parsed = await res.json();
            if (Array.isArray(parsed)) {
              data = parsed;
              break;
            }
          }
        } catch {
          // Fallback to next endpoint
        }
      }
      if (!Array.isArray(data)) return [];

      return data.map((item: any) => {
        // Collect candidate date fields from service
        let rawDateStr: string | null = null;
        if (svc.id === 'sonarr') {
          rawDateStr = item.airDate || item.airDateUtc;
        } else if (svc.id === 'radarr') {
          // Prefer digital or cinema or physical release
          const candidates = [item.digitalRelease, item.inCinemas, item.physicalRelease, item.airDateUtc];
          for (const cand of candidates) {
            if (cand && typeof cand === 'string' && !cand.startsWith('0001') && !cand.startsWith('1970')) {
              rawDateStr = cand;
              break;
            }
          }
        } else if (svc.id === 'lidarr') {
          const candidates = [item.releaseDate, item.airDateUtc, item.artist?.releaseDate];
          for (const cand of candidates) {
            if (cand && typeof cand === 'string' && !cand.startsWith('0001') && !cand.startsWith('1970')) {
              rawDateStr = cand;
              break;
            }
          }
        } else {
          rawDateStr = item.airDateUtc || item.releaseDate || item.inCinemas;
        }

        // Clean to strict YYYY-MM-DD
        let cleanDate = startDate;
        if (rawDateStr && typeof rawDateStr === 'string' && !rawDateStr.startsWith('0001')) {
          const match = rawDateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
          if (match) {
            const yr = parseInt(match[1], 10);
            if (yr >= 1970 && yr <= 2100) {
              cleanDate = `${match[1]}-${match[2]}-${match[3]}`;
            }
          } else {
            const parsed = new Date(rawDateStr);
            if (!isNaN(parsed.getTime()) && parsed.getUTCFullYear() >= 1970 && parsed.getUTCFullYear() <= 2100) {
              cleanDate = parsed.toISOString().split('T')[0];
            }
          }
        }

        const airDateUtc = (rawDateStr && typeof rawDateStr === 'string' && !rawDateStr.startsWith('0001'))
          ? (rawDateStr.includes('T') ? rawDateStr : `${cleanDate}T00:00:00Z`)
          : `${cleanDate}T00:00:00Z`;

        return {
          id: `${svc.id}-cal-${item.id}`,
          service: svc.id,
          mediaType,
          title: item.title || item.episodeFile?.filename || 'Scheduled Release',
          seriesOrArtistTitle: item.series?.title || item.movie?.title || item.artist?.artistName || item.title,
          date: cleanDate,
          airDateUtc,
          episodeNumber: item.episodeNumber ? `S${String(item.seasonNumber).padStart(2, '0')}E${String(item.episodeNumber).padStart(2, '0')}` : undefined,
          seasonNumber: item.seasonNumber,
          hasFile: !!item.hasFile,
          monitored: !!item.monitored,
          overview: item.overview || ''
        };
      });
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
    const timeout = setTimeout(() => controller.abort(), 10000);
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
  // Non-blocking in-memory library check for alreadyInLibrary flag
  const existingTitles = new Set((db.addedLibraryItems || []).map(i => (i.title || '').toLowerCase()));

  // Dedicated Music Search (Lidarr + iTunes Fallback/Augmentation)
  const searchMusic = async (): Promise<SearchResultItem[]> => {
    const svc = services['lidarr'];
    const results: SearchResultItem[] = [];

    // 1. Try configured Lidarr service first
    if (svc && svc.enabled && svc.baseUrl && svc.apiKey && !svc.baseUrl.includes('[YOUR_URL]')) {
      try {
        const endpoints = [
          `/api/v1/artist/lookup?term=${encodeURIComponent(cleanQ)}`,
          `/api/v3/artist/lookup?term=${encodeURIComponent(cleanQ)}`
        ];

        let rawArtists: any = null;
        for (const ep of endpoints) {
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 8000);
            const artistUrl = getServiceApiUrl(svc, ep);
            const artistRes = await fetch(artistUrl, {
              headers: { 'X-Api-Key': svc.apiKey, 'Accept': 'application/json' },
              signal: controller.signal
            });
            clearTimeout(timer);
            if (artistRes.ok) {
              const parsed = await artistRes.json();
              if (Array.isArray(parsed) && parsed.length > 0) {
                rawArtists = parsed;
                break;
              }
            }
          } catch {
            // Try next
          }
        }

        if (Array.isArray(rawArtists) && rawArtists.length > 0) {
          for (const item of rawArtists.slice(0, 10)) {
            const posterImg = item.images?.find((i: any) => i.coverType === 'poster' || i.coverType === 'cover')?.remoteUrl;
            const title = item.artistName || item.title || 'Unknown Artist';
            let posterUrl = (posterImg && posterImg.startsWith('http')) ? posterImg : '';
            if (!posterUrl) {
              posterUrl = await resolveArtistArtwork(title);
            }
            results.push({
              foreignId: item.foreignArtistId || item.id || `lidarr-art-${item.artistName}`,
              service: 'lidarr',
              mediaType: 'music',
              title,
              authorOrArtist: item.artistName || title,
              year: item.year,
              overview: item.overview || `Artist • ${item.genres?.join(', ') || 'Music'}`,
              posterUrl,
              genres: item.genres || [],
              alreadyInLibrary: existingTitles.has(title.toLowerCase())
            });
          }
        }
      } catch (err: any) {
        console.warn(`Lidarr lookup error: ${err.message}`);
      }
    }

    // 2. If Lidarr returned no results or is unconfigured/offline, query public iTunes Music API
    if (results.length === 0) {
      try {
        const itunesController = new AbortController();
        const itunesTimer = setTimeout(() => itunesController.abort(), 3500);
        const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQ)}&entity=album,musicArtist&limit=18`;
        
        const itunesRes = await fetch(itunesUrl, {
          headers: { 'Accept': 'application/json' },
          signal: itunesController.signal
        });
        clearTimeout(itunesTimer);

        if (itunesRes.ok) {
          const data: any = await itunesRes.json();
          const itunesItems = data.results || [];
          
          for (const item of itunesItems) {
            if (item.wrapperType === 'artist') {
              const title = item.artistName;
              const posterUrl = await resolveArtistArtwork(title);
              results.push({
                foreignId: `itunes-artist-${item.artistId}`,
                service: 'lidarr',
                mediaType: 'music',
                title,
                authorOrArtist: item.artistName,
                overview: `Artist • ${item.primaryGenreName || 'Music'}`,
                posterUrl,
                genres: [item.primaryGenreName].filter(Boolean),
                alreadyInLibrary: existingTitles.has(title.toLowerCase())
              });
            } else if (item.wrapperType === 'collection') {
              const title = item.collectionName || item.collectionCensoredName;
              const artwork = item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : '';
              const year = item.releaseDate ? new Date(item.releaseDate).getFullYear() : undefined;
              
              results.push({
                foreignId: `itunes-album-${item.collectionId}`,
                service: 'lidarr',
                mediaType: 'music',
                title,
                authorOrArtist: item.artistName,
                year,
                overview: `Album by ${item.artistName} • ${item.trackCount || 0} tracks`,
                posterUrl: artwork,
                genres: [item.primaryGenreName].filter(Boolean),
                alreadyInLibrary: existingTitles.has(title.toLowerCase())
              });
            }
          }
        }
      } catch (e: any) {
        console.warn(`iTunes Music fallback search error: ${e.message}`);
      }
    }

    return results;
  };

  // Dedicated TV & Movie Search
  const searchTvOrMovie = async (serviceId: 'sonarr' | 'radarr'): Promise<SearchResultItem[]> => {
    const svc = services[serviceId];
    const results: SearchResultItem[] = [];

    if (svc && svc.enabled && svc.baseUrl && svc.apiKey && !svc.baseUrl.includes('[YOUR_URL]')) {
      try {
        const endpoint = serviceId === 'radarr' ? '/api/v3/movie/lookup' : '/api/v3/series/lookup';
        const url = getServiceApiUrl(svc, `${endpoint}?term=${encodeURIComponent(cleanQ)}`);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3500);
        
        const res = await fetch(url, {
          headers: { 'X-Api-Key': svc.apiKey, 'Accept': 'application/json' },
          signal: controller.signal
        });
        clearTimeout(timer);

        if (res.ok) {
          const rawItems: any = await res.json();
          if (Array.isArray(rawItems)) {
            return rawItems.slice(0, 15).map((item: any) => {
              const poster = item.images?.find((i: any) => i.coverType === 'poster' || i.coverType === 'cover')?.remoteUrl;
              const title = item.title || 'Unknown';
              return {
                foreignId: item.tvdbId || item.tmdbId || item.id,
                service: serviceId,
                mediaType: (serviceId === 'sonarr' ? 'tv' : 'movie') as MediaType,
                title,
                year: item.year,
                overview: item.overview || '',
                posterUrl: poster || '',
                genres: item.genres || [],
                alreadyInLibrary: existingTitles.has(title.toLowerCase())
              };
            });
          }
        }
      } catch {}
    }

    // Fallback for TV Shows if Sonarr is offline/unconfigured
    if (serviceId === 'sonarr' && results.length === 0) {
      try {
        const tvmazeRes = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(cleanQ)}`);
        if (tvmazeRes.ok) {
          const shows: any = await tvmazeRes.json();
          if (Array.isArray(shows)) {
            for (const item of shows.slice(0, 10)) {
              const show = item.show;
              if (show && show.name) {
                results.push({
                  foreignId: `tvmaze-${show.id}`,
                  service: 'sonarr',
                  mediaType: 'tv',
                  title: show.name,
                  year: show.premiered ? new Date(show.premiered).getFullYear() : undefined,
                  overview: show.summary ? show.summary.replace(/<[^>]+>/g, '') : '',
                  posterUrl: show.image?.medium || show.image?.original || '',
                  genres: show.genres || [],
                  alreadyInLibrary: existingTitles.has(show.name.toLowerCase())
                });
              }
            }
          }
        }
      } catch {}
    }

    return results;
  };

  const tasks: Promise<SearchResultItem[]>[] = [];
  if (targetService === 'all' || !targetService) {
    tasks.push(searchTvOrMovie('sonarr'), searchTvOrMovie('radarr'), searchMusic());
  } else if (targetService === 'lidarr') {
    tasks.push(searchMusic());
  } else if (targetService === 'sonarr' || targetService === 'radarr') {
    tasks.push(searchTvOrMovie(targetService));
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
        endpoint = '/api/v1/artist';
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

      let url = getServiceApiUrl(service, endpoint);
      let res = await fetch(url, {
        method: 'POST',
        headers: {
          'X-Api-Key': service.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(body)
      });

      // If Lidarr v1 failed with 404, fallback to v3
      if (payload.service === 'lidarr' && !res.ok && res.status === 404) {
        endpoint = '/api/v3/artist';
        url = getServiceApiUrl(service, endpoint);
        res = await fetch(url, {
          method: 'POST',
          headers: {
            'X-Api-Key': service.apiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(body)
        });
      }

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
