import type { ArtistDetails, StudioAlbumItem } from '../src/types.js';
import { getDb } from './db.js';
import { getServiceApiUrl } from './arrProxy.js';
import { resolveMusicArtistRating, resolveAlbumRating } from './musicRatings.js';

const artistCache = new Map<string, { timestamp: number; data: ArtistDetails }>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes cache

/**
 * Accurately determines if a release title indicates an EP or Extended Play.
 * Word boundary checks prevent false positives on words like "Steppers", "Pepper", "Creep", "Deep", "Sleep".
 */
export function isExplicitEp(title: string): boolean {
  if (!title) return false;
  return /(?:\bEP\b|\((?:[^\)]*\b)?EP\b[^\)]*\)|\[(?:[^\]]*\b)?EP\b[^\]]*\]|\s-\s*EP(?:\s|$|\b)|\bEP\s*-\s*|\b(?:extended\s+play|mini[\s-]album)\b)/i.test(title);
}

/**
 * Normalizes title for deduplication keys (lowercase, alphanumeric only).
 */
export function normalizeTitleKey(title: string): string {
  return (title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Normalizes an EP title by removing EP affixes before creating a lookup key.
 * This guarantees "Title - EP" and "Title" (from Lidarr) deduplicate together.
 */
export function normalizeEpKey(title: string): string {
  return (title || '')
    .replace(/(?:\s*-\s*EP|\s*[\(\[]EP[\)\]]|\bEP$)/gi, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Strips secondary edition strings (deluxe, remasters, bonus tracks, anniversaries)
 * to find the base canonical studio album title.
 */
export function cleanAlbumTitle(rawTitle: string): string {
  if (!rawTitle) return '';
  let cleaned = rawTitle
    .replace(/\s*\+.*$/, '')
    .replace(/\s*oknotok.*$/i, '')
    .replace(/\s*collectors?\s+edition.*$/i, '')
    .replace(/\s*-\s*live\s+from\s+.*$/i, '')
    .replace(/\s*[\(\[][^\)\]]*(?:edition|version|remaster|anniversary|deluxe|bonus|expanded|special|collectors?|international|explicit|standard|drumless|tour|sessions|acoustic|live\s+recordings|radio\s+release|vault)[^\)\]]*[\)\]]/gi, '')
    .replace(/\s*-\s*(?:deluxe|bonus|expanded|remaster(?:ed)?|anniversary|special|collectors?).*$/i, '')
    .trim();
  return cleaned || rawTitle;
}

/**
 * Strips deluxe/bonus tags from an EP title while preserving EP distinction.
 */
export function cleanEpTitle(rawTitle: string): string {
  if (!rawTitle) return '';
  return rawTitle
    .replace(/\s*[\(\[](?:deluxe|bonus|expanded)[\w\s]*[\)\]]/gi, '')
    .trim();
}

/**
 * Queries Apple Music / iTunes to fetch the comprehensive studio album and EP discography.
 */
async function fetchAppleMusicDiscography(cleanName: string): Promise<{
  studioAlbums: StudioAlbumItem[];
  eps: StudioAlbumItem[];
  genres: string[];
  posterUrl: string;
} | null> {
  try {
    // 1. Search for artist entity to obtain exact artistId
    let itunesArtistId: number | null = null;
    let fallbackItems: any[] = [];

    const artistSearchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanName)}&entity=musicArtist&limit=5`;
    const searchRes = await fetch(artistSearchUrl, { headers: { Accept: 'application/json' } });
    if (searchRes.ok) {
      const sData: any = await searchRes.json();
      const results: any[] = sData.results || [];
      const cleanLower = cleanName.toLowerCase();
      const matched = results.find((r: any) => (r.artistName || '').toLowerCase() === cleanLower) ||
        results.find((r: any) => (r.artistName || '').toLowerCase().includes(cleanLower)) ||
        results[0];
      if (matched?.artistId) {
        itunesArtistId = matched.artistId;
      }
    }

    let rawAlbums: any[] = [];
    if (itunesArtistId) {
      // Lookup by exact artist ID provides complete discography (up to 200 items)
      const lookupUrl = `https://itunes.apple.com/lookup?id=${itunesArtistId}&entity=album&limit=200`;
      const lRes = await fetch(lookupUrl, { headers: { Accept: 'application/json' } });
      if (lRes.ok) {
        const lData: any = await lRes.json();
        // First item in lookup is the artist entity itself
        rawAlbums = (lData.results || []).slice(1);
      }
    }

    // If artist lookup didn't yield albums, fallback to search by artistTerm
    if (rawAlbums.length === 0) {
      const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanName)}&entity=album&attribute=artistTerm&limit=100`;
      const res = await fetch(itunesUrl, { headers: { Accept: 'application/json' } });
      if (res.ok) {
        const data: any = await res.json();
        rawAlbums = data.results || [];
      }
    }

    if (rawAlbums.length === 0) return null;

    const studioAlbumsMap = new Map<string, StudioAlbumItem>();
    const epsMap = new Map<string, StudioAlbumItem>();
    const genresSet = new Set<string>();
    let topPosterUrl = '';

    for (const item of rawAlbums) {
      const rawTitle = item.collectionName || item.collectionCensoredName;
      if (!rawTitle) continue;
      const lowerTitle = rawTitle.toLowerCase();
      const tracks = item.trackCount || 0;

      // Filter out noise: DJ mixes, podcasts, karaoke, tribute albums, audiobooks, secondary bonus disks
      if (/(\bdj mix\b|boiler room|karaoke|tribute to|podcast|audiobook|\bdisk\s+\d+|\bdisc\s+\d+)/i.test(lowerTitle)) {
        continue;
      }

      // Filter out standalone singles (1-2 tracks or ends with " - Single", unless explicit EP)
      if (lowerTitle.endsWith(' - single') || (tracks <= 2 && !isExplicitEp(rawTitle))) {
        continue;
      }

      const isEp = isExplicitEp(rawTitle) || (tracks >= 3 && tracks <= 6 && !/(\blive\b|\bremix(es)?\b)/i.test(lowerTitle));
      const isLiveOrComp = /(\blive\b|greatest hits|\bthe best of\b|\banthology\b|\bcomplete collection\b|\bessentials\b|\bb-sides\b|\blive from\b)/i.test(lowerTitle);
      
      // Keep studio albums focused: skip live recordings & compilation albums
      if (!isEp && isLiveOrComp && studioAlbumsMap.size >= 1) {
        continue;
      }

      const artwork = item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : '';
      if (!topPosterUrl && artwork) topPosterUrl = artwork;
      if (item.primaryGenreName) genresSet.add(item.primaryGenreName);

      const year = item.releaseDate ? new Date(item.releaseDate).getFullYear() : undefined;
      const releaseDate = item.releaseDate ? item.releaseDate.split('T')[0] : undefined;

      if (isEp) {
        const cleanTitle = cleanEpTitle(rawTitle);
        const epKey = normalizeEpKey(cleanTitle);
        if (!epKey) continue;
        if (!epsMap.has(epKey) || (epsMap.get(epKey)!.trackCount < tracks)) {
          epsMap.set(epKey, {
            id: `itunes-${item.collectionId}`,
            title: cleanTitle,
            year,
            releaseDate,
            trackCount: tracks || 5,
            coverUrl: artwork,
            genre: item.primaryGenreName,
            albumType: 'EP',
            monitored: false,
            hasFiles: false
          });
        }
      } else {
        // Skip remix-only compilations from core studio album list
        if (/(\bremix(es)?\b|\brmx\b)/i.test(lowerTitle)) continue;

        const cleanTitle = cleanAlbumTitle(rawTitle);
        const albumKey = normalizeTitleKey(cleanTitle);
        if (!albumKey) continue;

        if (!studioAlbumsMap.has(albumKey) || (studioAlbumsMap.get(albumKey)!.trackCount < tracks)) {
          studioAlbumsMap.set(albumKey, {
            id: `itunes-${item.collectionId}`,
            title: cleanTitle,
            year,
            releaseDate,
            trackCount: tracks || 10,
            coverUrl: artwork,
            genre: item.primaryGenreName,
            albumType: 'Studio Album',
            monitored: false,
            hasFiles: false
          });
        }
      }
    }

    const studioAlbums = Array.from(studioAlbumsMap.values()).sort((a, b) => (b.year || 0) - (a.year || 0));
    const eps = Array.from(epsMap.values()).sort((a, b) => (b.year || 0) - (a.year || 0));

    return {
      studioAlbums,
      eps,
      genres: Array.from(genresSet).slice(0, 3),
      posterUrl: topPosterUrl
    };
  } catch (err) {
    console.warn(`[AppleMusicDiscography] Lookup failed for "${cleanName}":`, err);
    return null;
  }
}

export async function getArtistDetails(
  artistName: string,
  artistId?: string | number
): Promise<ArtistDetails> {
  const cleanName = artistName.trim();
  const cacheKey = `${cleanName.toLowerCase()}_${artistId || ''}`;

  const cached = artistCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // 1. Check Lidarr instance for existing library albums and download statuses
  const db = getDb();
  const svc = db.settings?.services?.lidarr;
  let lidarrAlbumsData: any[] = [];
  let lidarrArtistId = artistId;
  let lidarrArtistObj: any = null;

  if (svc && svc.enabled && svc.baseUrl && svc.apiKey && !svc.baseUrl.includes('[YOUR_URL]')) {
    try {
      // If artistId is provided, verify it belongs to this artist
      if (lidarrArtistId && !String(lidarrArtistId).startsWith('add-') && !String(lidarrArtistId).startsWith('itunes-')) {
        for (const ep of [`/api/v1/artist/${lidarrArtistId}`, `/api/v3/artist/${lidarrArtistId}`]) {
          try {
            const verifyUrl = getServiceApiUrl(svc, ep);
            const vRes = await fetch(verifyUrl, {
              headers: { 'X-Api-Key': svc.apiKey, Accept: 'application/json' }
            });
            if (vRes.ok) {
              const data: any = await vRes.json();
              if ((data.artistName || '').toLowerCase() === cleanName.toLowerCase()) {
                lidarrArtistObj = data;
                break;
              } else {
                lidarrArtistId = undefined;
              }
            }
          } catch {
            // ignore verification error
          }
        }
      }

      // If still not resolved, query Lidarr artist library to match by name or foreignArtistId
      if (!lidarrArtistObj) {
        for (const ep of ['/api/v1/artist', '/api/v3/artist']) {
          try {
            const listUrl = getServiceApiUrl(svc, ep);
            const listRes = await fetch(listUrl, {
              headers: { 'X-Api-Key': svc.apiKey, Accept: 'application/json' }
            });
            if (listRes.ok) {
              const listData: any = await listRes.json();
              if (Array.isArray(listData)) {
                const matched = listData.find((a: any) => 
                  (lidarrArtistId && String(a.id) === String(lidarrArtistId)) ||
                  (a.artistName || '').toLowerCase() === cleanName.toLowerCase() ||
                  (a.cleanName && a.cleanName.toLowerCase() === cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')) ||
                  (typeof artistId === 'string' && a.foreignArtistId === artistId)
                );
                if (matched) {
                  lidarrArtistObj = matched;
                  lidarrArtistId = matched.id;
                  break;
                }
              }
            }
          } catch {
            // ignore
          }
        }
      }

      // Lookup in Lidarr if ID not resolved
      if (!lidarrArtistId || String(lidarrArtistId).startsWith('add-') || String(lidarrArtistId).startsWith('itunes-')) {
        for (const ep of [`/api/v1/artist/lookup?term=${encodeURIComponent(cleanName)}`, `/api/v3/artist/lookup?term=${encodeURIComponent(cleanName)}`]) {
          try {
            const lookupUrl = getServiceApiUrl(svc, ep);
            const lookupRes = await fetch(lookupUrl, {
              headers: { 'X-Api-Key': svc.apiKey, Accept: 'application/json' }
            });
            if (lookupRes.ok) {
              const lookupData: any = await lookupRes.json();
              if (Array.isArray(lookupData) && lookupData.length > 0) {
                const matched = lookupData.find((a: any) => (a.artistName || '').toLowerCase() === cleanName.toLowerCase()) || lookupData[0];
                if (matched) {
                  lidarrArtistObj = matched;
                  if (matched.id) {
                    lidarrArtistId = matched.id;
                  }
                  break;
                }
              }
            }
          } catch {
            // ignore
          }
        }
      }

      if (lidarrArtistId && !isNaN(Number(lidarrArtistId))) {
        const numericId = Number(lidarrArtistId);
        const albumsUrl = getServiceApiUrl(svc, `/api/v1/album?artistId=${numericId}`);
        const albumsRes = await fetch(albumsUrl, {
          headers: { 'X-Api-Key': svc.apiKey, Accept: 'application/json' }
        });
        if (albumsRes.ok) {
          const parsed: any = await albumsRes.json();
          if (Array.isArray(parsed)) {
            lidarrAlbumsData = parsed;
          }
        }
      }
    } catch (e) {
      console.warn(`[Lidarr Live] Could not load Lidarr albums for ${cleanName}:`, e);
    }
  }

  // 2. Fetch comprehensive discography (Studio Albums + EPs)
  const discography = await fetchAppleMusicDiscography(cleanName);

  // 3. Prepare Lidarr library albums map
  const lidarrStudioMap = new Map<string, StudioAlbumItem>();
  const lidarrEpsMap = new Map<string, StudioAlbumItem>();

  for (const alb of lidarrAlbumsData) {
    const coverImg = alb.images?.find((i: any) => i.coverType === 'cover' || i.coverType === 'poster');
    let coverUrl = '';
    if (coverImg?.remoteUrl && (coverImg.remoteUrl.startsWith('http://') || coverImg.remoteUrl.startsWith('https://'))) {
      coverUrl = coverImg.remoteUrl;
    } else if (coverImg?.url) {
      coverUrl = `/api/arr/media-cover?service=lidarr&path=${encodeURIComponent(coverImg.url)}&artist=${encodeURIComponent(cleanName)}`;
    }

    const year = alb.releaseDate ? new Date(alb.releaseDate).getFullYear() : undefined;
    const albType = (alb.albumType || '').toLowerCase();
    const isEp = albType === 'ep' ||
      Boolean(alb.secondaryTypes && alb.secondaryTypes.some((t: string) => t.toLowerCase() === 'ep')) ||
      isExplicitEp(alb.title);

    const cleanedTitle = isEp ? cleanEpTitle(alb.title) : cleanAlbumTitle(alb.title);
    const key = isEp ? normalizeEpKey(cleanedTitle) : normalizeTitleKey(cleanedTitle);
    if (!key) continue;

    const trackFileCount = alb.statistics?.trackFileCount || 0;
    const percentOfTracks = alb.statistics?.percentOfTracks || 0;
    const totalTrackCount = alb.statistics?.totalTrackCount || alb.tracks?.length || 10;
    const hasFiles = percentOfTracks === 100 || trackFileCount > 0;

    const albumObj: StudioAlbumItem = {
      id: alb.id,
      title: alb.title,
      releaseDate: alb.releaseDate ? alb.releaseDate.split('T')[0] : undefined,
      year,
      trackCount: totalTrackCount,
      coverUrl,
      monitored: alb.monitored ?? true,
      hasFiles,
      trackFileCount,
      percentDownloaded: percentOfTracks,
      overview: alb.overview,
      albumType: isEp ? 'EP' : 'Studio Album'
    };

    if (isEp) {
      lidarrEpsMap.set(key, albumObj);
    } else {
      lidarrStudioMap.set(key, albumObj);
    }
  }

  // 4. Merge Lidarr albums with discography
  const finalStudioAlbums: StudioAlbumItem[] = [];
  const finalEps: StudioAlbumItem[] = [];

  if (discography) {
    // Process Studio Albums
    for (const discoAlbum of discography.studioAlbums) {
      const key = normalizeTitleKey(discoAlbum.title);
      if (lidarrStudioMap.has(key)) {
        const lidarrAlb = lidarrStudioMap.get(key)!;
        finalStudioAlbums.push({
          ...discoAlbum,
          id: lidarrAlb.id,
          monitored: lidarrAlb.monitored,
          hasFiles: lidarrAlb.hasFiles,
          trackFileCount: lidarrAlb.trackFileCount,
          percentDownloaded: lidarrAlb.percentDownloaded,
          coverUrl: lidarrAlb.coverUrl || discoAlbum.coverUrl,
          releaseDate: lidarrAlb.releaseDate || discoAlbum.releaseDate,
          year: lidarrAlb.year || discoAlbum.year
        });
        lidarrStudioMap.delete(key);
      } else {
        finalStudioAlbums.push({
          ...discoAlbum,
          monitored: false,
          hasFiles: false,
          trackFileCount: 0,
          percentDownloaded: 0
        });
      }
    }

    // Add any remaining studio albums from Lidarr that were not matched in discography
    for (const remainingLidarr of lidarrStudioMap.values()) {
      finalStudioAlbums.push(remainingLidarr);
    }

    // Process EPs
    for (const discoEp of discography.eps) {
      const key = normalizeEpKey(discoEp.title);
      if (lidarrEpsMap.has(key)) {
        const lidarrEp = lidarrEpsMap.get(key)!;
        finalEps.push({
          ...discoEp,
          id: lidarrEp.id,
          monitored: lidarrEp.monitored,
          hasFiles: lidarrEp.hasFiles,
          trackFileCount: lidarrEp.trackFileCount,
          percentDownloaded: lidarrEp.percentDownloaded,
          coverUrl: lidarrEp.coverUrl || discoEp.coverUrl,
          releaseDate: lidarrEp.releaseDate || discoEp.releaseDate,
          year: lidarrEp.year || discoEp.year
        });
        lidarrEpsMap.delete(key);
      } else {
        finalEps.push({
          ...discoEp,
          monitored: false,
          hasFiles: false,
          trackFileCount: 0,
          percentDownloaded: 0
        });
      }
    }

    // Add any remaining EPs from Lidarr
    for (const remainingEp of lidarrEpsMap.values()) {
      finalEps.push(remainingEp);
    }
  } else {
    // Discography lookup was unavailable; use Lidarr library directly
    finalStudioAlbums.push(...Array.from(lidarrStudioMap.values()));
    finalEps.push(...Array.from(lidarrEpsMap.values()));
  }

  // Sort newest first
  finalStudioAlbums.sort((a, b) => (b.year || 0) - (a.year || 0));
  finalEps.sort((a, b) => (b.year || 0) - (a.year || 0));

  // Determine top artwork & genres
  const topCover = finalStudioAlbums[0]?.coverUrl || finalEps[0]?.coverUrl || discography?.posterUrl || '';
  const topGenres = discography?.genres?.length
    ? discography.genres
    : lidarrArtistObj?.genres?.length
      ? lidarrArtistObj.genres
      : ['Music'];

  const resolvedForeignArtistId = lidarrArtistObj?.foreignArtistId || 
    (typeof artistId === 'string' && /^[0-9a-f-]{36}$/i.test(artistId) ? artistId : undefined);

  const artistRatingInfo = await resolveMusicArtistRating(cleanName, resolvedForeignArtistId);

  // Attach ratings to studio albums and EPs
  for (const album of finalStudioAlbums) {
    const albRating = resolveAlbumRating(album.title, cleanName, album.year);
    album.rating = albRating.rating;
    album.ratingSource = albRating.ratingSource;
  }
  for (const ep of finalEps) {
    const epRating = resolveAlbumRating(ep.title, cleanName, ep.year);
    ep.rating = epRating.rating;
    ep.ratingSource = epRating.ratingSource;
  }

  const details: ArtistDetails = {
    id: lidarrArtistId || artistId || `artist-${cleanName}`,
    foreignArtistId: resolvedForeignArtistId,
    artistName: cleanName,
    genres: topGenres,
    posterUrl: topCover,
    overview: `${cleanName} has ${finalStudioAlbums.length} studio albums and ${finalEps.length} EPs cataloged.`,
    rating: artistRatingInfo.rating,
    ratingSource: artistRatingInfo.ratingSource,
    ratingVotes: artistRatingInfo.ratingVotes,
    totalAlbums: finalStudioAlbums.length + finalEps.length,
    studioAlbums: finalStudioAlbums,
    eps: finalEps
  };

  artistCache.set(cacheKey, { timestamp: Date.now(), data: details });
  return details;
}

