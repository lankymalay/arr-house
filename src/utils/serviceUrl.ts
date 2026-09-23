import type { ServiceConfig, ServiceId } from '../types.js';

export interface ServiceUrlOptions {
  baseUrl?: string;
  port?: number | null;
  disablePort?: boolean;
  useSsl?: boolean;
}

/**
 * Formats a service Web UI URL exactly mirroring the configuration set in Settings.
 * Supports direct host:port, Cloudflare Tunnels, subpaths, custom reverse proxies, and SSL/HTTPS.
 */
export function formatServiceWebUrl(service?: ServiceUrlOptions | null): string {
  if (!service || !service.baseUrl) return '';
  let base = service.baseUrl.trim();
  if (!base || base.includes('[YOUR_URL]')) return '';

  // Ensure protocol is present
  if (!base.startsWith('http://') && !base.startsWith('https://')) {
    base = (service.useSsl ? 'https://' : 'http://') + base;
  }

  // Check if port already exists in base URL
  const hasPort = /:[0-9]+($|\/)/.test(base);

  // If disablePort is explicitly true, remove any existing port
  if (service.disablePort) {
    base = base.replace(/:[0-9]+($|\/)/, '$1');
  } else if (service.port && !hasPort) {
    // Include port info if not already in URL
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

/**
 * Returns a direct deep link to the specific item in the target Arr service UI
 * (e.g. https://radarr.lan/movie/gladiator-ii-933260 or https://sonarr.lan/series/severance).
 * Returns null if the service is not configured or if the item lacks a real service identifier
 * (preventing navigation to the generic homepage/dashboard).
 */
export function getSpecificServiceContentUrl(
  service: ServiceUrlOptions | null | undefined,
  serviceId: string,
  item?: { 
    id?: string | number; 
    titleSlug?: string; 
    foreignArtistId?: string;
    foreignId?: string | number;
    mediaType?: string 
  } | null
): string | null {
  if (!item || !serviceId) return null;
  const baseUrl = formatServiceWebUrl(service);
  if (!baseUrl) return null;

  const idStr = item.id != null ? String(item.id).trim() : '';
  const isNumericId = /^\d+$/.test(idStr);
  const titleSlug = item.titleSlug?.trim();

  const svc = serviceId.toLowerCase();
  const mediaType = item.mediaType?.toLowerCase();

  if (svc === 'radarr' || mediaType === 'movie') {
    if (!titleSlug && !isNumericId) return null;
    const target = titleSlug || idStr;
    return `${baseUrl}/movie/${encodeURIComponent(target)}`;
  }

  if (svc === 'sonarr' || mediaType === 'tv') {
    if (!titleSlug && !isNumericId) return null;
    const target = titleSlug || idStr;
    return `${baseUrl}/series/${encodeURIComponent(target)}`;
  }

  if (svc === 'lidarr' || mediaType === 'music') {
    // CRITICAL: Lidarr's web UI routes exclusively using the artist's foreignArtistId (MusicBrainz UUID),
    // defined in Lidarr's frontend router as `/artist/:foreignArtistId`.
    // It looks up the artist by `foreignArtistId` in its client store.
    // Navigating with an internal numeric database ID (e.g. `/artist/1`) fails the lookup and renders:
    // "Sorry, that artist cannot be found."
    const foreignArtistId = item.foreignArtistId?.trim() ||
      (typeof item.foreignId === 'string' && /^[0-9a-f-]{36}$/i.test(item.foreignId.trim()) ? item.foreignId.trim() : '') ||
      (typeof item.id === 'string' && /^[0-9a-f-]{36}$/i.test(item.id.trim()) ? item.id.trim() : '');

    if (foreignArtistId) {
      return `${baseUrl}/artist/${encodeURIComponent(foreignArtistId)}`;
    }

    if (titleSlug) {
      return `${baseUrl}/artist/${encodeURIComponent(titleSlug)}`;
    }

    // Never output a broken numeric ID link for Lidarr
    return null;
  }

  if (svc === 'readarr' || mediaType === 'book') {
    if (!titleSlug && !isNumericId) return null;
    const target = titleSlug || idStr;
    return `${baseUrl}/author/${encodeURIComponent(target)}`;
  }

  return null;
}

