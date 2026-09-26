import type { Request, Response } from 'express';
import { getDb, saveDb } from './db.js';
import { resolveArtistArtwork } from './artistArtwork.js';
import { resolveMusicArtistRating } from './musicRatings.js';
import { rankSearchResults } from '../src/utils/searchRelevance.js';
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

  // Check if base is a reverse proxy / tunnel domain without port
  let isReverseProxyDomain = false;
  if (!hasPort) {
    try {
      const parsed = new URL(base);
      const host = parsed.hostname.toLowerCase();
      const isLocal = host === 'localhost' || host === '127.0.0.1' || /^192\.168\./.test(host) || /^10\./.test(host) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host);
      if (!isLocal && (base.startsWith('https://') || host.includes('.'))) {
        isReverseProxyDomain = true;
      }
    } catch {}
  }

  // If disablePort is true or detected as reverse proxy domain without port, do not append port
  if (service.disablePort || isReverseProxyDomain) {
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

// Helper to format service Web UI base URL mirroring settings (for external links)
export function formatServiceWebUiUrl(service?: {
  baseUrl?: string;
  port?: number | null;
  disablePort?: boolean;
  useSsl?: boolean;
}): string {
  if (!service || !service.baseUrl) return '';
  let base = service.baseUrl.trim();
  if (!base || base.includes('[YOUR_URL]')) return '';

  if (!base.startsWith('http://') && !base.startsWith('https://')) {
    base = (service.useSsl ? 'https://' : 'http://') + base;
  }

  const hasPort = /:[0-9]+($|\/)/.test(base);

  if (service.disablePort) {
    base = base.replace(/:[0-9]+($|\/)/, '$1');
  } else if (service.port && !hasPort) {
    try {
      const u = new URL(base);
      u.port = String(service.port);
      base = u.toString();
    } catch {
      base = `${base}:${service.port}`;
    }
  }

  return base.replace(/\/+$/, '');
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
    const timeout = setTimeout(() => controller.abort(), 15000);
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
        titleSlug: item.titleSlug,
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
        imdbId: item.imdbId ? (String(item.imdbId).startsWith('tt') ? item.imdbId : `tt${item.imdbId}`) : undefined,
        tvdbId: item.tvdbId || undefined,
        rating: item.ratings?.value 
          ? (item.ratings.value > 10 ? Math.round((item.ratings.value / 10) * 10) / 10 : Math.round(item.ratings.value * 10) / 10)
          : 8.5,
        ratingSource: item.ratings?.imdb ? 'IMDb' : item.ratings?.tmdb ? 'TMDb' : 'TheTVDB',
        ratingVotes: item.ratings?.votes,
        path: item.path,
        added: item.added
      };
    });
  } catch (e: any) {
    if (e.name === 'AbortError') {
      console.warn(`[Sonarr] Live series fetch timed out for ${service.baseUrl}`);
    } else {
      console.warn('[Sonarr] Could not fetch series:', e.message || e);
    }
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
    const timeout = setTimeout(() => controller.abort(), 15000);
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

      let movieRating = 8.2;
      let movieRatingSource = 'TMDb';
      let movieVotes = item.ratings?.votes;
      if (item.ratings?.imdb?.value && item.ratings.imdb.value > 0) {
        movieRating = Math.round(item.ratings.imdb.value * 10) / 10;
        movieRatingSource = 'IMDb';
        movieVotes = item.ratings.imdb.votes || movieVotes;
      } else if (item.ratings?.tmdb?.value && item.ratings.tmdb.value > 0) {
        movieRating = Math.round(item.ratings.tmdb.value * 10) / 10;
        movieRatingSource = 'TMDb';
        movieVotes = item.ratings.tmdb.votes || movieVotes;
      } else if (item.ratings?.rottenTomatoes?.value && item.ratings.rottenTomatoes.value > 0) {
        movieRating = Math.round((item.ratings.rottenTomatoes.value / 10) * 10) / 10;
        movieRatingSource = 'Rotten Tomatoes';
      } else if (item.ratings?.value && item.ratings.value > 0) {
        const val = item.ratings.value;
        movieRating = val > 10 ? Math.round((val / 10) * 10) / 10 : Math.round(val * 10) / 10;
        movieRatingSource = 'TMDb';
      }

      return {
        id: item.id,
        service: 'radarr' as ServiceId,
        mediaType: 'movie' as const,
        title: item.title,
        titleSlug: item.titleSlug,
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
        imdbId: item.imdbId ? (String(item.imdbId).startsWith('tt') ? item.imdbId : `tt${item.imdbId}`) : undefined,
        tmdbId: item.tmdbId || undefined,
        rating: movieRating,
        ratingSource: movieRatingSource,
        ratingVotes: movieVotes,
        path: item.path,
        added: item.added
      };
    });
  } catch (e: any) {
    if (e.name === 'AbortError') {
      console.warn(`[Radarr] Live movies fetch timed out for ${service.baseUrl}`);
    } else {
      console.warn('[Radarr] Could not fetch movies:', e.message || e);
    }
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
        const timeout = setTimeout(() => controller.abort(), 15000);
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
      const trackFileCount = item.statistics?.trackFileCount ?? 0;
      const totalTrackCount = item.statistics?.totalTrackCount ?? 0;
      const albumCount = item.statistics?.albumCount ?? 0;
      let status: MediaItem['status'] = 'missing';
      if (percent === 100 || (trackFileCount > 0 && trackFileCount >= totalTrackCount && totalTrackCount > 0)) status = 'downloaded';
      else if (trackFileCount > 0) status = 'downloading';
      else if (!item.monitored) status = 'unreleased';

      const ratingInfo = await resolveMusicArtistRating(item.artistName, item.foreignArtistId);

      return {
        id: item.id,
        service: 'lidarr' as ServiceId,
        mediaType: 'music' as const,
        title: item.artistName,
        artist: item.artistName,
        foreignArtistId: item.foreignArtistId,
        overview: item.overview || '',
        posterUrl,
        monitored: !!item.monitored,
        status,
        qualityProfile: item.qualityProfile?.name || `Profile ${item.qualityProfileId}`,
        qualityProfileId: item.qualityProfileId,
        rootFolder: item.rootFolderPath || item.path,
        sizeBytes: item.statistics?.sizeOnDisk || 0,
        trackCount: totalTrackCount,
        trackFileCount,
        albumCount,
        percentDownloaded: percent,
        genres: item.genres || [],
        rating: ratingInfo.rating,
        ratingSource: ratingInfo.ratingSource,
        ratingVotes: ratingInfo.ratingVotes,
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
          outputPath: r.outputPath || '',
          trackedDownloadStatus: r.trackedDownloadStatus,
          trackedDownloadState: r.trackedDownloadState,
          estimatedCompletionTime: (r as any).estimatedCompletionTime,
          quality: r.quality?.quality?.name || r.quality?.name || '1080p'
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

  const rawCombined: QueueItem[] = [...sonarrQ, ...radarrQ, ...lidarrQ];

  // Merge any local db.queueItems
  if (Array.isArray(db.queueItems) && db.queueItems.length > 0) {
    for (const qi of db.queueItems) {
      if (!rawCombined.some(q => String(q.id) === String(qi.id))) {
        rawCombined.push(qi);
      }
    }
  }

  db.completedQueueTimestamps = db.completedQueueTimestamps || {};
  db.movedToHistoryQueueIds = db.movedToHistoryQueueIds || [];
  const movedToHistorySet = new Set(db.movedToHistoryQueueIds.map(String));
  let dbChanged = false;

  const activeQueue: QueueItem[] = [];
  const ONE_MINUTE_MS = 60 * 1000;

  for (const item of rawCombined) {
    const idStr = String(item.id);

    // If item was already moved to history, suppress from active transfers
    if (movedToHistorySet.has(idStr)) {
      continue;
    }

    const statusLower = (item.status || '').toLowerCase();
    const stateLower = (item.trackedDownloadState || '').toLowerCase();

    // Check if complete (100% progress, 0 size left, or completed/imported state)
    const isComplete =
      item.progress >= 100 ||
      (item.sizeBytes > 0 && item.sizeLeftBytes === 0) ||
      statusLower === 'completed' ||
      statusLower === 'complete' ||
      stateLower === 'imported' ||
      stateLower === 'importpending';

    if (!isComplete) {
      if (db.completedQueueTimestamps[idStr]) {
        delete db.completedQueueTimestamps[idStr];
        dbChanged = true;
      }
      activeQueue.push(item);
      continue;
    }

    // Item is complete (at 100%)
    let completedAt = db.completedQueueTimestamps[idStr];
    if (!completedAt) {
      const estTime = (item as any).estimatedCompletionTime ? new Date((item as any).estimatedCompletionTime).getTime() : NaN;
      if (!isNaN(estTime) && estTime < now) {
        completedAt = estTime;
      } else if (stateLower === 'imported' || (statusLower === 'completed' && (item.timeleft === '00:00:00' || item.timeleft === '0s' || !item.timeleft))) {
        // Was already marked completed/imported before Arr House tracking: mark as completed > 1 min ago so it moves to history immediately
        completedAt = now - 65000;
      } else {
        completedAt = now;
      }
      db.completedQueueTimestamps[idStr] = completedAt;
      dbChanged = true;
    }

    const elapsedMs = now - completedAt;
    if (elapsedMs >= ONE_MINUTE_MS) {
      // 1 minute has elapsed: Move to history!
      await moveItemRecordToHistory(item, completedAt, db);
      movedToHistorySet.add(idStr);
      dbChanged = true;
    } else {
      const secondsLeft = Math.max(0, Math.ceil((ONE_MINUTE_MS - elapsedMs) / 1000));
      activeQueue.push({
        ...item,
        progress: 100,
        status: 'completed',
        completedAt,
        secondsUntilHistory: secondsLeft
      });
    }
  }

  if (dbChanged) {
    saveDb(db);
  }

  // Return real queue items directly from connected arr services
  queueCache = { data: activeQueue, timestamp: now };
  return activeQueue;
}

export async function moveItemRecordToHistory(
  item: QueueItem, 
  completedAt: number, 
  db: any
): Promise<void> {
  const idStr = String(item.id);
  db.downloadHistory = db.downloadHistory || [];

  const alreadyInHistory = db.downloadHistory.some((h: any) =>
    h.id === `hist-comp-${idStr}` ||
    (h.sourceQueueId && String(h.sourceQueueId) === idStr) ||
    (h.title && h.title.toLowerCase() === item.title.toLowerCase() && h.service === item.service)
  );

  if (!alreadyInHistory) {
    const historyItem: DownloadHistoryItem = {
      id: `hist-comp-${idStr}`,
      service: item.service,
      mediaType: item.mediaType,
      title: item.title,
      seriesOrArtistTitle: item.title,
      eventType: 'Completed',
      date: new Date(completedAt).toISOString(),
      quality: item.quality || '1080p',
      sizeBytes: item.sizeBytes,
      downloadClient: item.downloadClient || 'Torrent Client',
      protocol: item.protocol || 'torrent',
      status: 'completed',
      outputPath: item.outputPath || ''
    };
    db.downloadHistory.unshift(historyItem);
    if (db.downloadHistory.length > 50) db.downloadHistory.pop();
  }

  db.movedToHistoryQueueIds = db.movedToHistoryQueueIds || [];
  if (!db.movedToHistoryQueueIds.includes(idStr)) {
    db.movedToHistoryQueueIds.push(idStr);
  }

  if (db.completedQueueTimestamps) {
    delete db.completedQueueTimestamps[idStr];
  }

  if (db.queueItems) {
    db.queueItems = db.queueItems.filter((q: any) => String(q.id) !== idStr);
  }

  if (db.addedLibraryItems) {
    const libMatch = db.addedLibraryItems.find((l: any) =>
      l.title.toLowerCase() === item.title.toLowerCase() && l.service === item.service
    );
    if (libMatch) {
      libMatch.status = 'downloaded';
    }
  }

  // Attempt non-destructive removal from Arr queue so Arr doesn't keep tracking finished download
  const svc = db.settings.services[item.service];
  if (svc && svc.enabled && svc.baseUrl && svc.apiKey && !svc.baseUrl.includes('[YOUR_URL]')) {
    const dashIdx = idStr.indexOf('-');
    if (dashIdx > 0) {
      const realId = idStr.substring(dashIdx + 1);
      const ep = item.service === 'lidarr'
        ? `/api/v1/queue/${realId}?removeFromClient=false&blocklist=false`
        : `/api/v3/queue/${realId}?removeFromClient=false&blocklist=false`;
      const url = getServiceApiUrl(svc, ep);
      fetch(url, {
        method: 'DELETE',
        headers: { 'X-Api-Key': svc.apiKey, Accept: 'application/json' }
      }).catch((e) => {
        console.warn(`[Queue] Could not remove completed item ${realId} from ${svc.name} queue:`, e.message);
      });
    }
  }
}

export async function moveQueueItemToHistory(id?: string | number): Promise<{ movedCount: number }> {
  const db = getDb();
  const queue = await getActiveQueue(true);
  let movedCount = 0;

  for (const item of queue) {
    if (id && String(item.id) !== String(id)) continue;
    // If id specified, or if item is completed (progress >= 100)
    if (id || item.progress >= 100 || item.status === 'completed') {
      await moveItemRecordToHistory(item, item.completedAt || Date.now() - 60000, db);
      movedCount++;
    }
  }

  saveDb(db);
  invalidateArrCache();
  return { movedCount };
}

export async function removeQueueItem(id: string | number): Promise<boolean> {
  const db = getDb();
  const idStr = String(id);

  // 1. Remove from local db.queueItems
  if (db.queueItems) {
    db.queueItems = db.queueItems.filter(q => String(q.id) !== idStr);
    saveDb(db);
  }

  // 2. Clear from memory cache
  if (queueCache) {
    queueCache.data = queueCache.data.filter(q => String(q.id) !== idStr);
  }

  // 3. If it's a live Arr queue item (e.g. "radarr-123", "sonarr-456", "lidarr-789")
  const dashIdx = idStr.indexOf('-');
  if (dashIdx > 0) {
    const svcId = idStr.substring(0, dashIdx) as ServiceId;
    const realId = idStr.substring(dashIdx + 1);
    const svc = db.settings.services[svcId];
    if (svc && svc.enabled && svc.baseUrl && svc.apiKey && !svc.baseUrl.includes('[YOUR_URL]')) {
      try {
        const ep = svcId === 'lidarr' 
          ? `/api/v1/queue/${realId}?removeFromClient=true&blocklist=false` 
          : `/api/v3/queue/${realId}?removeFromClient=true&blocklist=false`;
        const url = getServiceApiUrl(svc, ep);
        await fetch(url, {
          method: 'DELETE',
          headers: { 'X-Api-Key': svc.apiKey, Accept: 'application/json' }
        });
      } catch (err: any) {
        console.warn(`[Queue] Failed to delete from live ${svcId}:`, err.message);
      }
    }
  }

  invalidateArrCache();
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

  // Merge entries from db.downloadHistory (e.g. grabbed releases and completed downloads)
  const localHistory: DownloadHistoryItem[] = (db.downloadHistory || []).map((h: any) => ({
    id: h.id || `hist-${Math.random().toString(36).substring(2, 9)}`,
    service: h.service || 'radarr',
    mediaType: h.mediaType || 'movie',
    title: h.title,
    seriesOrArtistTitle: h.seriesOrArtistTitle || '',
    eventType: h.eventType === 'grabbed_interactive' ? 'Grabbed (Interactive)' : h.eventType === 'grabbed_automatic' ? 'Auto-Grabbed' : (h.eventType || 'Imported'),
    date: h.date || new Date().toISOString(),
    quality: h.quality || '1080p BluRay',
    sizeBytes: h.sizeBytes || 0,
    downloadClient: h.downloadClient || 'qBittorrent',
    protocol: h.protocol || 'torrent',
    status: (h.status || 'completed') as any,
    posterUrl: h.posterUrl
  }));

  for (const h of localHistory) {
    if (!historyItems.some(item => String(item.id) === String(h.id) || item.title.toLowerCase() === h.title.toLowerCase())) {
      historyItems.push(h);
    }
  }

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

  // Dedicated Music Search: returns Artists
  const searchMusic = async (): Promise<SearchResultItem[]> => {
    const svc = services['lidarr'];
    const results: SearchResultItem[] = [];
    const seenArtists = new Set<string>();

    const addArtistItem = (item: SearchResultItem) => {
      const key = item.title.toLowerCase().trim();
      if (seenArtists.has(key)) return;
      seenArtists.add(key);
      results.push(item);
    };

    // 1. Try configured Lidarr service first (artist lookup)
    if (svc && svc.enabled && svc.baseUrl && svc.apiKey && !svc.baseUrl.includes('[YOUR_URL]')) {
      try {
        const lookupUrl = getServiceApiUrl(svc, `/api/v1/artist/lookup?term=${encodeURIComponent(cleanQ)}`);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        const lookupRes = await fetch(lookupUrl, {
          headers: { 'X-Api-Key': svc.apiKey, 'Accept': 'application/json' },
          signal: controller.signal
        });
        clearTimeout(timer);

        if (lookupRes.ok) {
          const parsed: any = await lookupRes.json();
          if (Array.isArray(parsed) && parsed.length > 0) {
            for (const art of parsed.slice(0, 20)) {
              const artistName = art.artistName || art.title || cleanQ;
              const posterImg = art.images?.find((i: any) => i.coverType === 'poster' || i.coverType === 'artist' || i.coverType === 'fanart');
              const posterUrl = posterImg?.remoteUrl || 
                (posterImg?.url ? `/api/arr/media-cover?service=lidarr&path=${encodeURIComponent(posterImg.url)}` : '');
              const albumCount = art.statistics?.albumCount || art.albumCount;
              const artistRating = await resolveMusicArtistRating(artistName, art.foreignArtistId);

              addArtistItem({
                foreignId: art.foreignArtistId || art.id || `lidarr-artist-${encodeURIComponent(artistName)}`,
                existingId: art.id,
                service: 'lidarr',
                mediaType: 'music',
                title: artistName,
                authorOrArtist: 'Artist',
                overview: art.overview || art.disambiguation || `${artistName} • Studio albums & EPs available in Lidarr`,
                posterUrl,
                genres: art.genres || [],
                alreadyInLibrary: existingTitles.has(artistName.toLowerCase()) || Boolean(art.id && art.added),
                albumCount,
                rating: artistRating.rating,
                ratingSource: artistRating.ratingSource
              });
            }
          }
        }
      } catch (err: any) {
        console.warn(`Lidarr artist lookup error: ${err.message}`);
      }
    }

    // 2. Query iTunes Music API (artists & album-based artist catalog)
    if (results.length < 15) {
      try {
        const itunesController = new AbortController();
        const itunesTimer = setTimeout(() => itunesController.abort(), 4000);

        // Fetch music artists and albums simultaneously
        const [artistRes, albumRes] = await Promise.all([
          fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanQ)}&entity=musicArtist&limit=25`, {
            headers: { 'Accept': 'application/json' },
            signal: itunesController.signal
          }).catch(() => null),
          fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanQ)}&entity=album&limit=25`, {
            headers: { 'Accept': 'application/json' },
            signal: itunesController.signal
          }).catch(() => null)
        ]);
        clearTimeout(itunesTimer);

        // Map artist artwork and genres from albums
        const artistArtMap = new Map<string, { name: string; artwork: string; genre?: string; albumCount: number }>();
        if (albumRes && albumRes.ok) {
          const albumData: any = await albumRes.json();
          if (Array.isArray(albumData.results)) {
            for (const alb of albumData.results) {
              const name = (alb.artistName || '').trim();
              if (!name) continue;
              const key = name.toLowerCase();
              const existing = artistArtMap.get(key);
              const artwork = alb.artworkUrl100 ? alb.artworkUrl100.replace('100x100bb', '600x600bb') : '';
              if (!existing) {
                artistArtMap.set(key, { name, artwork, genre: alb.primaryGenreName, albumCount: 1 });
              } else {
                existing.albumCount += 1;
                if (!existing.artwork && artwork) existing.artwork = artwork;
              }
            }
          }
        }

        // Add artists from musicArtist search
        if (artistRes && artistRes.ok) {
          const artistData: any = await artistRes.json();
          if (Array.isArray(artistData.results)) {
            for (const art of artistData.results) {
              const artistName = (art.artistName || '').trim();
              if (!artistName) continue;
              const key = artistName.toLowerCase();
              const artInfo = artistArtMap.get(key);
              const genre = art.primaryGenreName || artInfo?.genre;
              const artwork = artInfo?.artwork || '';
              const ratingInfo = await resolveMusicArtistRating(artistName);

              addArtistItem({
                foreignId: `itunes-artist-${art.artistId || encodeURIComponent(artistName)}`,
                service: 'lidarr',
                mediaType: 'music',
                title: artistName,
                authorOrArtist: 'Artist',
                overview: `${genre ? `${genre} recording artist` : 'Recording artist'} • Click to view studio albums and EPs`,
                posterUrl: artwork,
                genres: genre ? [genre] : ['Music'],
                alreadyInLibrary: existingTitles.has(key),
                albumCount: artInfo?.albumCount,
                rating: ratingInfo.rating,
                ratingSource: ratingInfo.ratingSource
              });
            }
          }
        }

        // Also add any prominent artists discovered from the album search that were missed
        for (const [key, artInfo] of artistArtMap.entries()) {
          if (!seenArtists.has(key)) {
            const ratingInfo = await resolveMusicArtistRating(artInfo.name);
            addArtistItem({
              foreignId: `itunes-artist-${encodeURIComponent(key)}`,
              service: 'lidarr',
              mediaType: 'music',
              title: artInfo.name,
              authorOrArtist: 'Artist',
              overview: `${artInfo.genre || 'Music'} artist • Click to view studio albums and EPs`,
              posterUrl: artInfo.artwork,
              genres: artInfo.genre ? [artInfo.genre] : ['Music'],
              alreadyInLibrary: existingTitles.has(key),
              albumCount: artInfo.albumCount,
              rating: ratingInfo.rating,
              ratingSource: ratingInfo.ratingSource
            });
          }
        }
      } catch (e: any) {
        console.warn(`iTunes Artist search error: ${e.message}`);
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
            return rawItems.slice(0, 25).map((item: any) => {
              const poster = item.images?.find((i: any) => i.coverType === 'poster' || i.coverType === 'cover')?.remoteUrl;
              const title = item.title || 'Unknown';
              let ratingVal = 8.4;
              let ratingSrc = serviceId === 'radarr' ? 'TMDb' : 'TheTVDB';
              if (item.ratings?.imdb?.value && item.ratings.imdb.value > 0) {
                ratingVal = Math.round(item.ratings.imdb.value * 10) / 10;
                ratingSrc = 'IMDb';
              } else if (item.ratings?.tmdb?.value && item.ratings.tmdb.value > 0) {
                ratingVal = Math.round(item.ratings.tmdb.value * 10) / 10;
                ratingSrc = 'TMDb';
              } else if (item.ratings?.value && item.ratings.value > 0) {
                const v = item.ratings.value;
                ratingVal = v > 10 ? Math.round((v / 10) * 10) / 10 : Math.round(v * 10) / 10;
                ratingSrc = serviceId === 'radarr' ? 'TMDb' : 'TheTVDB';
              }

              return {
                foreignId: item.tvdbId || item.tmdbId || item.id,
                service: serviceId,
                mediaType: (serviceId === 'sonarr' ? 'tv' : 'movie') as MediaType,
                title,
                year: item.year,
                overview: item.overview || '',
                posterUrl: poster || '',
                genres: item.genres || [],
                imdbId: item.imdbId ? (String(item.imdbId).startsWith('tt') ? item.imdbId : `tt${item.imdbId}`) : undefined,
                tvdbId: item.tvdbId || undefined,
                tmdbId: item.tmdbId || undefined,
                alreadyInLibrary: existingTitles.has(title.toLowerCase()),
                popularity: typeof item.popularity === 'number' ? item.popularity : (item.ratings?.votes ? item.ratings.votes / 50 : undefined),
                ratings: item.ratings ? { votes: item.ratings.votes, value: item.ratings.value } : undefined,
                rating: ratingVal,
                ratingSource: ratingSrc
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
            for (const item of shows.slice(0, 15)) {
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
                  imdbId: show.externals?.imdb ? (String(show.externals.imdb).startsWith('tt') ? show.externals.imdb : `tt${show.externals.imdb}`) : undefined,
                  tvdbId: show.externals?.thetvdb || undefined,
                  alreadyInLibrary: existingTitles.has(show.name.toLowerCase()),
                  popularity: show.weight || undefined,
                  ratings: show.rating?.average ? { value: show.rating.average } : undefined,
                  rating: show.rating?.average ? Math.round(show.rating.average * 10) / 10 : 8.3,
                  ratingSource: 'TVMaze'
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
  if (targetService === 'lidarr') {
    tasks.push(searchMusic());
  } else if (targetService === 'sonarr') {
    tasks.push(searchTvOrMovie('sonarr'));
  } else {
    // Default to Movies (radarr)
    tasks.push(searchTvOrMovie('radarr'));
  }

  const rawResults = (await Promise.all(tasks)).flat();
  return rankSearchResults(rawResults, cleanQ);
}

// Add Content to Live Service
export async function addContentToService(payload: AddContentPayload): Promise<{
  success: boolean;
  message: string;
  item?: MediaItem;
}> {
  const db = getDb();
  const service = db.settings.services[payload.service];

  if (!service || !service.enabled || !service.baseUrl || !service.apiKey || service.baseUrl.includes('[YOUR_URL]')) {
    return {
      success: false,
      message: `${payload.service.toUpperCase()} is not enabled or configured with a valid URL and API key.`
    };
  }

  try {
    // 1. Resolve Root Folder
    let rootFolder = payload.rootFolderPath || service.defaultRootFolder;
    if (!rootFolder) {
      try {
        const rfEp = payload.service === 'lidarr' ? '/api/v1/rootfolder' : '/api/v3/rootfolder';
        const rfRes = await fetch(getServiceApiUrl(service, rfEp), {
          headers: { 'X-Api-Key': service.apiKey, Accept: 'application/json' }
        });
        if (rfRes.ok) {
          const folders = await rfRes.json();
          if (Array.isArray(folders) && folders.length > 0) {
            rootFolder = folders[0].path;
          }
        }
      } catch (rfErr: any) {
        console.warn(`[Add] Could not fetch root folders: ${rfErr.message}`);
      }
    }

    if (!rootFolder) {
      rootFolder = payload.service === 'radarr' ? '/Data/Media/Movies' : payload.service === 'sonarr' ? '/Data/Media/TV' : '/Data/Media/Music';
    }

    // 2. Resolve Quality Profile ID
    let qualityProfileId = payload.qualityProfileId || service.defaultQualityProfileId;
    if (!qualityProfileId) {
      try {
        const qpEp = payload.service === 'lidarr' ? '/api/v1/qualityprofile' : '/api/v3/qualityprofile';
        const qpRes = await fetch(getServiceApiUrl(service, qpEp), {
          headers: { 'X-Api-Key': service.apiKey, Accept: 'application/json' }
        });
        if (qpRes.ok) {
          const profiles = await qpRes.json();
          if (Array.isArray(profiles) && profiles.length > 0) {
            qualityProfileId = profiles[0].id;
          }
        }
      } catch (qpErr: any) {
        console.warn(`[Add] Could not fetch quality profiles: ${qpErr.message}`);
      }
    }
    if (!qualityProfileId) {
      qualityProfileId = payload.service === 'lidarr' ? 2 : 1;
    }

    // 3. Process Per-Service Addition
    if (payload.service === 'radarr') {
      // Lookup movie in Radarr
      let movieObj: any = null;
      const isNumericForeignId = payload.foreignId && !isNaN(Number(payload.foreignId)) && /^\d+$/.test(String(payload.foreignId).trim());
      
      try {
        // Try lookup by reputable source IDs first (imdb / tmdb) to ensure correct release
        let lookupTerm = '';
        if (payload.imdbId) {
          lookupTerm = `imdb:${payload.imdbId}`;
        } else if (payload.tmdbId) {
          lookupTerm = `tmdb:${payload.tmdbId}`;
        } else if (isNumericForeignId) {
          lookupTerm = `tmdb:${payload.foreignId}`;
        } else {
          lookupTerm = payload.title;
        }

        let lookupRes = await fetch(getServiceApiUrl(service, `/api/v3/movie/lookup?term=${encodeURIComponent(lookupTerm)}`), {
          headers: { 'X-Api-Key': service.apiKey, Accept: 'application/json' }
        });
        
        let list: any[] = [];
        if (lookupRes.ok) {
          list = await lookupRes.json();
        }

        // If lookup with ID yielded no results, fall back to title lookup
        if ((!Array.isArray(list) || list.length === 0) && payload.title) {
          lookupRes = await fetch(getServiceApiUrl(service, `/api/v3/movie/lookup?term=${encodeURIComponent(payload.title)}`), {
            headers: { 'X-Api-Key': service.apiKey, Accept: 'application/json' }
          });
          if (lookupRes.ok) {
            list = await lookupRes.json();
          }
        }

        if (Array.isArray(list) && list.length > 0) {
          if (payload.imdbId) {
            movieObj = list.find((m: any) => String(m.imdbId).toLowerCase() === String(payload.imdbId).toLowerCase()) || list[0];
          } else if (payload.tmdbId) {
            movieObj = list.find((m: any) => String(m.tmdbId) === String(payload.tmdbId)) || list[0];
          } else if (isNumericForeignId) {
            movieObj = list.find((m: any) => String(m.tmdbId) === String(payload.foreignId)) || list[0];
          } else {
            // Find by matching year if provided, or best title match
            const matchYear = payload.metadata?.year;
            if (matchYear) {
              movieObj = list.find((m: any) => m.year === matchYear) || list[0];
            } else {
              movieObj = list[0];
            }
          }
        }
      } catch (e: any) {
        console.warn(`[Radarr Lookup] Failed: ${e.message}`);
      }

      // If already in library
      if (movieObj && movieObj.id) {
        invalidateArrCache();
        return {
          success: true,
          message: `"${movieObj.title}" is already in your Radarr library.`
        };
      }

      const tmdbId = movieObj?.tmdbId || (isNumericForeignId ? Number(payload.foreignId) : undefined);

      const postBody: any = {
        ...(movieObj || {}),
        title: movieObj?.title || payload.title,
        qualityProfileId,
        rootFolderPath: rootFolder,
        monitored: payload.monitored !== false,
        year: movieObj?.year || payload.metadata?.year,
        addOptions: {
          searchForMovie: payload.searchForMissing !== false
        }
      };

      if (tmdbId) {
        postBody.tmdbId = tmdbId;
      }

      const res = await fetch(getServiceApiUrl(service, '/api/v3/movie'), {
        method: 'POST',
        headers: {
          'X-Api-Key': service.apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(postBody)
      });

      const resData = await res.json().catch(() => ({}));
      if (res.ok) {
        invalidateArrCache();
        return {
          success: true,
          message: `Successfully added "${postBody.title}" to Radarr!`
        };
      }

      // Handle duplicate check
      const errMsg = Array.isArray(resData) ? resData[0]?.errorMessage : (resData?.message || resData?.errors ? JSON.stringify(resData.errors) : undefined);
      if (errMsg && (errMsg.includes('already been added') || errMsg.includes('already exists'))) {
        invalidateArrCache();
        return {
          success: true,
          message: `"${postBody.title}" is already in your Radarr library.`
        };
      }

      return {
        success: false,
        message: errMsg || `Failed to add "${payload.title}" to Radarr (status ${res.status}).`
      };
    } else if (payload.service === 'sonarr') {
      // Lookup series in Sonarr
      let seriesObj: any = null;
      const isNumericForeignId = payload.foreignId && !isNaN(Number(payload.foreignId)) && /^\d+$/.test(String(payload.foreignId).trim());

      try {
        let lookupTerm = '';
        if (payload.tvdbId) {
          lookupTerm = `tvdb:${payload.tvdbId}`;
        } else if (payload.imdbId) {
          lookupTerm = `imdb:${payload.imdbId}`;
        } else if (isNumericForeignId) {
          lookupTerm = `tvdb:${payload.foreignId}`;
        } else {
          lookupTerm = payload.title;
        }

        let lookupRes = await fetch(getServiceApiUrl(service, `/api/v3/series/lookup?term=${encodeURIComponent(lookupTerm)}`), {
          headers: { 'X-Api-Key': service.apiKey, Accept: 'application/json' }
        });
        
        let list: any[] = [];
        if (lookupRes.ok) {
          list = await lookupRes.json();
        }

        if ((!Array.isArray(list) || list.length === 0) && payload.title) {
          lookupRes = await fetch(getServiceApiUrl(service, `/api/v3/series/lookup?term=${encodeURIComponent(payload.title)}`), {
            headers: { 'X-Api-Key': service.apiKey, Accept: 'application/json' }
          });
          if (lookupRes.ok) {
            list = await lookupRes.json();
          }
        }

        if (Array.isArray(list) && list.length > 0) {
          if (payload.tvdbId) {
            seriesObj = list.find((s: any) => String(s.tvdbId) === String(payload.tvdbId)) || list[0];
          } else if (payload.imdbId) {
            seriesObj = list.find((s: any) => String(s.imdbId).toLowerCase() === String(payload.imdbId).toLowerCase()) || list[0];
          } else if (isNumericForeignId) {
            seriesObj = list.find((s: any) => String(s.tvdbId) === String(payload.foreignId)) || list[0];
          } else {
            seriesObj = list[0];
          }
        }
      } catch (e: any) {
        console.warn(`[Sonarr Lookup] Failed: ${e.message}`);
      }

      if (seriesObj && seriesObj.id) {
        invalidateArrCache();
        return {
          success: true,
          message: `"${seriesObj.title}" is already in your Sonarr library.`
        };
      }

      let seasonsArr: any[] | undefined = undefined;
      if (payload.selectedSeasons && payload.selectedSeasons.length > 0) {
        seasonsArr = payload.selectedSeasons.map((sn) => ({
          seasonNumber: sn,
          monitored: true
        }));
      }

      const tvdbId = seriesObj?.tvdbId || (isNumericForeignId ? Number(payload.foreignId) : undefined);

      const postBody: any = {
        ...(seriesObj || {}),
        title: seriesObj?.title || payload.title,
        qualityProfileId,
        rootFolderPath: rootFolder,
        monitored: payload.monitored !== false,
        seasons: seasonsArr || seriesObj?.seasons,
        addOptions: {
          monitor: (payload.monitorScope as string) === 'none' ? 'none' : 'all',
          searchForMissingEpisodes: payload.searchForMissing !== false
        }
      };

      if (tvdbId) {
        postBody.tvdbId = tvdbId;
      }

      const res = await fetch(getServiceApiUrl(service, '/api/v3/series'), {
        method: 'POST',
        headers: {
          'X-Api-Key': service.apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(postBody)
      });

      const resData = await res.json().catch(() => ({}));
      if (res.ok) {
        invalidateArrCache();
        return {
          success: true,
          message: `Successfully added "${postBody.title}" to Sonarr!`
        };
      }

      const errMsg = Array.isArray(resData) ? resData[0]?.errorMessage : (resData?.message || resData?.errors ? JSON.stringify(resData.errors) : undefined);
      if (errMsg && (errMsg.includes('already been added') || errMsg.includes('already exists'))) {
        invalidateArrCache();
        return {
          success: true,
          message: `"${postBody.title}" is already in your Sonarr library.`
        };
      }

      return {
        success: false,
        message: errMsg || `Failed to add "${payload.title}" to Sonarr (status ${res.status}).`
      };
    } else if (payload.service === 'lidarr') {
      // Lookup artist in Lidarr
      let artistObj: any = null;
      let epLookup = '/api/v1/artist/lookup';
      const isLidarrForeignId = payload.foreignId && !String(payload.foreignId).startsWith('wiki-') && !String(payload.foreignId).startsWith('tentpole-');

      try {
        const lookupTerm = isLidarrForeignId ? `lidarr:${payload.foreignId}` : payload.title;
        let lookupRes = await fetch(getServiceApiUrl(service, `${epLookup}?term=${encodeURIComponent(lookupTerm)}`), {
          headers: { 'X-Api-Key': service.apiKey, Accept: 'application/json' }
        });
        if (!lookupRes.ok && lookupRes.status === 404) {
          epLookup = '/api/v3/artist/lookup';
          lookupRes = await fetch(getServiceApiUrl(service, `${epLookup}?term=${encodeURIComponent(lookupTerm)}`), {
            headers: { 'X-Api-Key': service.apiKey, Accept: 'application/json' }
          });
        }

        let list: any[] = [];
        if (lookupRes.ok) {
          list = await lookupRes.json();
        }

        if ((!Array.isArray(list) || list.length === 0) && isLidarrForeignId && payload.title) {
          lookupRes = await fetch(getServiceApiUrl(service, `${epLookup}?term=${encodeURIComponent(payload.title)}`), {
            headers: { 'X-Api-Key': service.apiKey, Accept: 'application/json' }
          });
          if (lookupRes.ok) {
            list = await lookupRes.json();
          }
        }

        if (Array.isArray(list) && list.length > 0) {
          if (isLidarrForeignId) {
            artistObj = list.find((a: any) => String(a.foreignArtistId) === String(payload.foreignId)) || list[0];
          } else {
            artistObj = list[0];
          }
        }
      } catch (e: any) {
        console.warn(`[Lidarr Lookup] Failed: ${e.message}`);
      }

      if (artistObj && artistObj.id) {
        invalidateArrCache();
        return {
          success: true,
          message: `"${artistObj.artistName}" is already in your Lidarr library.`
        };
      }

      const foreignArtistId = artistObj?.foreignArtistId || (isLidarrForeignId ? String(payload.foreignId) : undefined);

      const postBody: any = {
        ...(artistObj || {}),
        artistName: artistObj?.artistName || payload.title,
        metadataProfileId: artistObj?.metadataProfileId || 1,
        qualityProfileId,
        rootFolderPath: rootFolder,
        monitored: payload.monitored !== false,
        addOptions: {
          monitor: 'all',
          searchForMissingAlbums: payload.searchForMissing !== false
        }
      };

      if (foreignArtistId) {
        postBody.foreignArtistId = foreignArtistId;
      }

      let epAdd = '/api/v1/artist';
      let res = await fetch(getServiceApiUrl(service, epAdd), {
        method: 'POST',
        headers: {
          'X-Api-Key': service.apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(postBody)
      });

      if (!res.ok && res.status === 404) {
        epAdd = '/api/v3/artist';
        res = await fetch(getServiceApiUrl(service, epAdd), {
          method: 'POST',
          headers: {
            'X-Api-Key': service.apiKey,
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify(postBody)
        });
      }

      const resData = await res.json().catch(() => ({}));
      if (res.ok) {
        invalidateArrCache();
        return {
          success: true,
          message: `Successfully added "${postBody.artistName}" to Lidarr!`
        };
      }

      const errMsg = Array.isArray(resData) ? resData[0]?.errorMessage : resData?.message;
      if (errMsg && (errMsg.includes('already been added') || errMsg.includes('already exists'))) {
        invalidateArrCache();
        return {
          success: true,
          message: `"${postBody.artistName}" is already in your Lidarr library.`
        };
      }

      return {
        success: false,
        message: errMsg || `Failed to add "${payload.title}" to Lidarr (status ${res.status}).`
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to add to ${payload.service}: ${err.message}`
    };
  }

  return {
    success: false,
    message: `Unsupported service: ${payload.service}`
  };
}

export async function toggleItemMonitoring(params: {
  service: ServiceId;
  id?: string | number;
  albumId?: string | number;
  monitored: boolean;
}): Promise<{ success: boolean; monitored: boolean; message?: string }> {
  const db = getDb();
  const svc = db.settings.services[params.service];

  // 1. Handle Album monitoring (Lidarr)
  if (params.albumId) {
    if (svc && svc.enabled && svc.apiKey && !String(params.albumId).startsWith('itunes-') && !String(params.albumId).startsWith('apple-')) {
      try {
        const albumUrl = getServiceApiUrl(svc, `/api/v1/album/${params.albumId}`);
        const getRes = await fetch(albumUrl, {
          headers: { 'X-Api-Key': svc.apiKey, Accept: 'application/json' }
        });
        if (getRes.ok) {
          const albumData: any = await getRes.json();
          albumData.monitored = params.monitored;
          await fetch(albumUrl, {
            method: 'PUT',
            headers: { 'X-Api-Key': svc.apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify(albumData)
          });
        }
      } catch (e: any) {
        console.warn(`[Lidarr Monitor Album] Failed to update album on Lidarr: ${e.message}`);
      }
    }
    db.monitoredOverrides = db.monitoredOverrides || {};
    db.monitoredOverrides[`album-${params.albumId}`] = params.monitored;
    saveDb(db);
    invalidateArrCache();
    return { success: true, monitored: params.monitored, message: `Album is now ${params.monitored ? 'Monitored' : 'Unmonitored'}` };
  }

  // 2. Handle Artist / Series / Movie item monitoring
  if (params.id) {
    if (svc && svc.enabled && svc.apiKey && !String(params.id).startsWith('add-')) {
      try {
        let endpoint = '';
        if (params.service === 'lidarr') endpoint = `/api/v1/artist/${params.id}`;
        else if (params.service === 'sonarr') endpoint = `/api/v3/series/${params.id}`;
        else if (params.service === 'radarr') endpoint = `/api/v3/movie/${params.id}`;

        if (endpoint) {
          const itemUrl = getServiceApiUrl(svc, endpoint);
          const getRes = await fetch(itemUrl, {
            headers: { 'X-Api-Key': svc.apiKey, Accept: 'application/json' }
          });
          if (getRes.ok) {
            const itemData: any = await getRes.json();
            itemData.monitored = params.monitored;
            await fetch(itemUrl, {
              method: 'PUT',
              headers: { 'X-Api-Key': svc.apiKey, 'Content-Type': 'application/json' },
              body: JSON.stringify(itemData)
            });
          }
        }
      } catch (e: any) {
        console.warn(`[Arr Monitor Item] Failed to update ${params.service} item ${params.id}: ${e.message}`);
      }
    }

    if (db.addedLibraryItems) {
      const target = db.addedLibraryItems.find(i => String(i.id) === String(params.id));
      if (target) {
        target.monitored = params.monitored;
        if (!params.monitored && target.status === 'missing') {
          target.status = 'unreleased';
        } else if (params.monitored && target.status === 'unreleased') {
          target.status = 'missing';
        }
      }
    }
    db.monitoredOverrides = db.monitoredOverrides || {};
    db.monitoredOverrides[`item-${params.service}-${params.id}`] = params.monitored;
    saveDb(db);
    invalidateArrCache();
    return { success: true, monitored: params.monitored, message: `Item is now ${params.monitored ? 'Monitored' : 'Unmonitored'}` };
  }

  return { success: false, monitored: params.monitored, message: 'No target identifier specified' };
}

