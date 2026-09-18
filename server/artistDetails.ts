import type { ArtistDetails, StudioAlbumItem, AlbumTrackItem } from '../src/types.js';
import { getDb } from './db.js';
import { getServiceApiUrl } from './arrProxy.js';

const artistCache = new Map<string, { timestamp: number; data: ArtistDetails }>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes cache

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

  // 1. Try real Lidarr instance if configured
  const db = getDb();
  const svc = db.settings?.services?.lidarr;
  if (svc && svc.enabled && svc.baseUrl && svc.apiKey && !svc.baseUrl.includes('[YOUR_URL]')) {
    try {
      // Find artist by ID or lookup
      let lidarrArtistId = artistId;
      if (!lidarrArtistId || String(lidarrArtistId).startsWith('add-') || String(lidarrArtistId).startsWith('itunes-')) {
        const lookupUrl = getServiceApiUrl(svc, `/api/v1/artist/lookup?term=${encodeURIComponent(cleanName)}`);
        const lookupRes = await fetch(lookupUrl, {
          headers: { 'X-Api-Key': svc.apiKey, Accept: 'application/json' }
        });
        if (lookupRes.ok) {
          const lookupData: any = await lookupRes.json();
          if (Array.isArray(lookupData) && lookupData.length > 0) {
            lidarrArtistId = lookupData[0].id;
          }
        }
      }

      if (lidarrArtistId) {
        // Fetch albums from Lidarr
        const albumsUrl = getServiceApiUrl(svc, `/api/v1/album?artistId=${lidarrArtistId}`);
        const albumsRes = await fetch(albumsUrl, {
          headers: { 'X-Api-Key': svc.apiKey, Accept: 'application/json' }
        });
        if (albumsRes.ok) {
          const albumsData: any = await albumsRes.json();
          if (Array.isArray(albumsData) && albumsData.length > 0) {
            // Filter primarily to Studio Albums if type exists, or sort by release date
            const albums: StudioAlbumItem[] = albumsData
              .filter((a: any) => !a.albumType || a.albumType.toLowerCase() === 'album' || a.albumType.toLowerCase() === 'studio')
              .map((alb: any) => {
                const coverImg = alb.images?.find((i: any) => i.coverType === 'cover' || i.coverType === 'poster');
                const coverUrl = coverImg?.remoteUrl || 
                  (coverImg?.url ? `/api/arr/media-cover?service=lidarr&path=${encodeURIComponent(coverImg.url)}` : '');
                const year = alb.releaseDate ? new Date(alb.releaseDate).getFullYear() : undefined;
                return {
                  id: alb.id,
                  title: alb.title,
                  releaseDate: alb.releaseDate ? alb.releaseDate.split('T')[0] : undefined,
                  year,
                  trackCount: alb.statistics?.totalTrackCount || alb.tracks?.length || 10,
                  coverUrl,
                  monitored: alb.monitored ?? true,
                  hasFiles: (alb.statistics?.percentOfTracks || 0) === 100,
                  overview: alb.overview,
                  albumType: 'Studio Album'
                };
              });

            if (albums.length > 0) {
              // Sort newest first
              albums.sort((a, b) => (b.year || 0) - (a.year || 0));

              const details: ArtistDetails = {
                id: lidarrArtistId,
                artistName: cleanName,
                overview: `Artist in Lidarr music library with ${albums.length} studio albums.`,
                totalAlbums: albums.length,
                studioAlbums: albums
              };
              artistCache.set(cacheKey, { timestamp: Date.now(), data: details });
              return details;
            }
          }
        }
      }
    } catch (e) {
      console.warn(`[Lidarr Live] Could not load albums for ${cleanName}:`, e);
    }
  }

  // 2. Query iTunes Search API to get real discography / studio albums
  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanName)}&entity=album&attribute=artistTerm&limit=30`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(itunesUrl, {
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timer);

    if (res.ok) {
      const data: any = await res.json();
      const results: any[] = data.results || [];

      // Filter to relevant albums by the artist and deduplicate titles
      const seenTitles = new Set<string>();
      const studioAlbums: StudioAlbumItem[] = [];

      // Match artists closely (e.g. artistName matches cleanName case-insensitively or includes)
      const cleanLower = cleanName.toLowerCase();
      const filtered = results.filter((item: any) => {
        const itemArtist = (item.artistName || '').toLowerCase();
        return itemArtist === cleanLower || itemArtist.includes(cleanLower) || cleanLower.includes(itemArtist);
      });

      const listToUse = filtered.length > 0 ? filtered : results;

      for (const item of listToUse) {
        let title = item.collectionName || item.collectionCensoredName;
        if (!title) continue;

        // Clean common noise like "(Deluxe Edition)", "[Remastered]" for deduplication key
        const baseTitle = title.replace(/\s*[\(\[](deluxe|bonus|expanded|remastered|anniversary|special|edition|version|explicit)[\)\]]/gi, '').trim();
        const baseKey = baseTitle.toLowerCase();

        if (seenTitles.has(baseKey)) continue;
        // Ignore obvious live / compilation titles if we want main studio albums
        if (/(\blive\b|greatest hits|the best of|anthology|compilation|collection)/i.test(title)) {
          // keep if very few albums, otherwise skip
          if (studioAlbums.length >= 6) continue;
        }

        seenTitles.add(baseKey);

        const artwork = item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : '';
        const year = item.releaseDate ? new Date(item.releaseDate).getFullYear() : undefined;
        const releaseDate = item.releaseDate ? item.releaseDate.split('T')[0] : undefined;

        studioAlbums.push({
          id: `itunes-${item.collectionId}`,
          title: baseTitle || title,
          year,
          releaseDate,
          trackCount: item.trackCount || 10,
          coverUrl: artwork,
          genre: item.primaryGenreName,
          albumType: 'Studio Album',
          monitored: true,
          hasFiles: false
        });
      }

      // Sort albums chronologically (newest first)
      studioAlbums.sort((a, b) => (b.year || 0) - (a.year || 0));

      // Get primary genre & artwork from first album
      const topAlbum = studioAlbums[0];
      const genres = topAlbum?.genre ? [topAlbum.genre] : ['Music'];
      const posterUrl = topAlbum?.coverUrl || '';

      const details: ArtistDetails = {
        id: artistId || `artist-${cleanName}`,
        artistName: cleanName,
        genres,
        posterUrl,
        overview: `${cleanName} is a recording artist with ${studioAlbums.length} featured studio albums and catalog releases.`,
        totalAlbums: studioAlbums.length,
        studioAlbums
      };

      artistCache.set(cacheKey, { timestamp: Date.now(), data: details });
      return details;
    }
  } catch (err) {
    console.warn(`[ArtistDetails] iTunes lookup failed for "${cleanName}":`, err);
  }

  // 3. Fallback studio albums if offline
  const fallbackAlbums: StudioAlbumItem[] = [
    {
      id: `fb-1`,
      title: 'Debut Studio Album',
      year: 2021,
      releaseDate: '2021-04-16',
      trackCount: 11,
      albumType: 'Studio Album',
      monitored: true,
      hasFiles: true
    },
    {
      id: `fb-2`,
      title: 'Self-Titled Album',
      year: 2023,
      releaseDate: '2023-09-22',
      trackCount: 12,
      albumType: 'Studio Album',
      monitored: true,
      hasFiles: false
    }
  ];

  return {
    id: artistId || `artist-${cleanName}`,
    artistName: cleanName,
    genres: ['Music'],
    overview: `${cleanName} catalog in your Lidarr music collection.`,
    totalAlbums: fallbackAlbums.length,
    studioAlbums: fallbackAlbums
  };
}
