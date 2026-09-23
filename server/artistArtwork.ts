/**
 * High-resolution Artist Artwork Resolver
 *
 * Resolves crisp, authentic artist portraits and album covers for music artists in Lidarr
 * across Deezer, TheAudioDB, and Apple iTunes APIs when local MediaCover paths or native
 * thumbnails are missing or unreadable.
 */

const artistArtCache = new Map<string, string>();
const pendingResolutions = new Map<string, Promise<string>>();

function normalizeArtistName(name: string): string {
  return (name || '')
    .trim()
    .replace(/\s*-\s*Topic$/i, '')
    .replace(/\s*\((US|UK|band|singer|musician|group)\)$/i, '')
    .trim();
}

/**
 * Resolves artist artwork from Deezer, TheAudioDB, and iTunes.
 */
export async function resolveArtistArtwork(artistName: string): Promise<string> {
  const clean = normalizeArtistName(artistName);
  if (!clean) return '';
  const key = clean.toLowerCase();
  
  if (artistArtCache.has(key)) {
    return artistArtCache.get(key)!;
  }

  // Deduplicate inflight requests for the same artist
  if (pendingResolutions.has(key)) {
    return pendingResolutions.get(key)!;
  }

  const resolutionPromise = (async () => {
    // Tier 1: Deezer Artist API (Direct high-resolution 500x500/1000x1000 portrait)
    try {
      const deezerUrl = `https://api.deezer.com/search/artist?q=${encodeURIComponent(clean)}&limit=5`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(deezerUrl, {
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data: any = await res.json();
        const results: any[] = data.data || [];
        if (results.length > 0) {
          // Find matching artist or take top match
          const match = results.find((r: any) => {
            const rName = (r.name || '').toLowerCase();
            return rName === key || rName.includes(key) || key.includes(rName);
          }) || results[0];

          const photo = match.picture_xl || match.picture_big || match.picture_medium;
          if (photo && typeof photo === 'string' && photo.startsWith('http')) {
            artistArtCache.set(key, photo);
            return photo;
          }
        }
      }
    } catch {
      // Continue to Tier 2
    }

    // Tier 2: TheAudioDB Free Music Catalog
    try {
      const audiodbUrl = `https://www.theaudiodb.com/api/v1/json/2/search.php?s=${encodeURIComponent(clean)}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(audiodbUrl, {
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data: any = await res.json();
        const artists: any[] = data.artists || [];
        if (artists.length > 0) {
          const artist = artists[0];
          const art = artist.strArtistThumb || artist.strArtistFanart;
          if (art && typeof art === 'string' && art.startsWith('http')) {
            artistArtCache.set(key, art);
            return art;
          }
        }
      }
    } catch {
      // Continue to Tier 3
    }

    // Tier 3: Apple iTunes Search API (High-res 600x600 album/artist artwork)
    try {
      const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(clean)}&entity=album,musicArtist&limit=6`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      
      const res = await fetch(itunesUrl, {
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data: any = await res.json();
        const results: any[] = data.results || [];
        
        // Find exact or closest artist album cover
        const match = results.find((r: any) => {
          const aName = (r.artistName || '').toLowerCase();
          return aName === key || aName.includes(key) || key.includes(aName);
        }) || results.find((r: any) => r.artworkUrl100) || results[0];

        if (match?.artworkUrl100) {
          const highRes = match.artworkUrl100.replace('100x100bb', '600x600bb');
          artistArtCache.set(key, highRes);
          return highRes;
        }
      }
    } catch {
      // Failed all tiers
    }

    return '';
  })();

  pendingResolutions.set(key, resolutionPromise);
  try {
    const result = await resolutionPromise;
    return result;
  } finally {
    pendingResolutions.delete(key);
  }
}

/**
 * Pre-warms artwork for an array of artists concurrently in batches
 */
export async function warmArtistArtwork(artistNames: string[], concurrency = 6): Promise<void> {
  const queue = [...new Set(artistNames.map(normalizeArtistName).filter(Boolean))];
  
  while (queue.length > 0) {
    const batch = queue.splice(0, concurrency);
    await Promise.all(batch.map(name => resolveArtistArtwork(name)));
  }
}

