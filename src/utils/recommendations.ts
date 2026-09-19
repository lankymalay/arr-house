import type { ExternalReleaseItem, ForthcomingReleasesPayload, MediaItem, MediaType } from '../types.js';

export interface LibraryMatch {
  title: string;
  mediaType: MediaType;
  typeLabel: 'TV' | 'Movie' | 'Artist';
  item?: MediaItem;
  score: number;
}

export interface SpotlightRecommendation {
  item: ExternalReleaseItem;
  matches: LibraryMatch[];
  recommendationScore: number;
}

const GENRE_CANONICAL_MAP: Record<string, string> = {
  'science fiction': 'sci-fi',
  'sci-fi': 'sci-fi',
  'scifi': 'sci-fi',
  'sci fi': 'sci-fi',
  'action': 'action',
  'adventure': 'adventure',
  'animation': 'animation',
  'anime': 'animation',
  'comedy': 'comedy',
  'drama': 'drama',
  'crime': 'crime',
  'thriller': 'thriller',
  'suspense': 'thriller',
  'mystery': 'mystery',
  'fantasy': 'fantasy',
  'supernatural': 'fantasy',
  'horror': 'horror',
  'family': 'family',
  'children': 'family',
  'romance': 'romance',
  'romantic': 'romance',
  'documentary': 'documentary',
  'rock': 'rock',
  'alternative rock': 'rock',
  'hard rock': 'rock',
  'indie rock': 'rock',
  'grunge': 'rock',
  'metal': 'rock',
  'electronic': 'electronic',
  'dance': 'electronic',
  'house': 'electronic',
  'techno': 'electronic',
  'synth': 'electronic',
  'synth-pop': 'electronic',
  'electronica': 'electronic',
  'big beat': 'electronic',
  'breakbeat': 'electronic',
  'hip hop': 'hip-hop',
  'hip-hop': 'hip-hop',
  'rap': 'hip-hop',
  'pop': 'pop',
  'r&b': 'r&b',
  'jazz': 'jazz',
  'classical': 'classical',
  'soundtrack': 'soundtrack'
};

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'into', 'part', 'season', 'volume', 'edition',
  'series', 'movie', 'show', 'over', 'after', 'under', 'before', 'about', 'some'
]);

const THEMATIC_KEYWORDS = [
  'space', 'galaxy', 'superhero', 'detective', 'cyberpunk', 'alien', 'dystopian', 'multiverse',
  'heist', 'zombie', 'vampire', 'gangster', 'police', 'war', 'magic', 'empire', 'revolution',
  'android', 'synth', 'orchestral', 'murder', 'conspiracy', 'apocalypse', 'espionage',
  'monsters', 'comedy', 'satire', 'dark', 'epic', 'romance', 'underworld', 'tournament'
];

export function normalizeGenre(genre: string): string {
  const s = genre.toLowerCase().trim();
  for (const [k, v] of Object.entries(GENRE_CANONICAL_MAP)) {
    if (s.includes(k)) return v;
  }
  return s;
}

/**
 * Calculates a matching affinity score between an upcoming release candidate and a library item.
 */
export function scoreCandidateWithLibraryItem(candidate: ExternalReleaseItem, item: MediaItem): number {
  let score = 0;

  const candNormGenres = (candidate.genres || []).map(normalizeGenre);
  const itemNormGenres = (item.genres || []).map(normalizeGenre);

  // 1. Direct genre overlaps
  for (const cg of candNormGenres) {
    for (const ig of itemNormGenres) {
      if (cg === ig) {
        score += 45;
      } else if (
        (cg === 'sci-fi' && ig === 'fantasy') ||
        (cg === 'fantasy' && ig === 'sci-fi') ||
        (cg === 'action' && ig === 'adventure') ||
        (cg === 'adventure' && ig === 'action') ||
        (cg === 'crime' && ig === 'thriller') ||
        (cg === 'thriller' && ig === 'mystery') ||
        (cg === 'animation' && ig === 'family')
      ) {
        score += 25;
      }
    }
  }

  // 2. Title word matches (franchise, shared keywords)
  const cTitleWords = candidate.title.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 4 && !STOP_WORDS.has(w));
  const iTitleWords = item.title.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 4 && !STOP_WORDS.has(w));
  for (const cw of cTitleWords) {
    if (iTitleWords.includes(cw)) {
      score += 70;
    }
  }

  // 3. Artist/Creator match (series, director, artist)
  const candArtist = (candidate.seriesOrArtistTitle || '').toLowerCase();
  const itemArtist = (item.artist || item.author || item.title || '').toLowerCase();
  if (candArtist && itemArtist) {
    if (candArtist.includes(itemArtist) || itemArtist.includes(candArtist)) {
      score += 85;
    }
  }

  // 4. Thematic keyword correlation across overviews
  const candOverview = (candidate.overview || '').toLowerCase();
  const itemOverview = (item.overview || '').toLowerCase();
  if (candOverview && itemOverview) {
    for (const kw of THEMATIC_KEYWORDS) {
      if (candOverview.includes(kw) && (itemOverview.includes(kw) || itemNormGenres.includes(kw))) {
        score += 15;
      }
    }
  }

  // 5. Monitored or highly rated library item bonus
  if (item.monitored) score += 10;
  if (item.rating && item.rating >= 8) score += 15;

  return score;
}

/**
 * Genre-matched fallback touchstones if the library is empty or missing a specific media category.
 */
function getFallbackMatchesForCandidate(candidate: ExternalReleaseItem): LibraryMatch[] {
  const genres = (candidate.genres || []).map(normalizeGenre);
  const isSciFi = genres.includes('sci-fi');
  const isAnimation = genres.includes('animation') || genres.includes('family');
  const isAction = genres.includes('action') || genres.includes('adventure');
  const isComedy = genres.includes('comedy');
  const isCrime = genres.includes('crime') || genres.includes('thriller') || genres.includes('mystery');
  const isFantasy = genres.includes('fantasy');
  const isHorror = genres.includes('horror');

  if (isSciFi) {
    return [
      { title: 'Severance', mediaType: 'tv', typeLabel: 'TV', score: 100 },
      { title: 'Interstellar', mediaType: 'movie', typeLabel: 'Movie', score: 100 },
      { title: 'Daft Punk', mediaType: 'music', typeLabel: 'Artist', score: 100 }
    ];
  }
  if (isAnimation) {
    return [
      { title: 'Gravity Falls', mediaType: 'tv', typeLabel: 'TV', score: 100 },
      { title: 'Spider-Man: Into the Spider-Verse', mediaType: 'movie', typeLabel: 'Movie', score: 100 },
      { title: 'Gorillaz', mediaType: 'music', typeLabel: 'Artist', score: 100 }
    ];
  }
  if (isCrime) {
    return [
      { title: 'Only Murders in the Building', mediaType: 'tv', typeLabel: 'TV', score: 100 },
      { title: 'Memories of Murder', mediaType: 'movie', typeLabel: 'Movie', score: 100 },
      { title: 'Massive Attack', mediaType: 'music', typeLabel: 'Artist', score: 100 }
    ];
  }
  if (isAction) {
    return [
      { title: 'Daredevil', mediaType: 'tv', typeLabel: 'TV', score: 100 },
      { title: 'Mad Max: Fury Road', mediaType: 'movie', typeLabel: 'Movie', score: 100 },
      { title: 'The Prodigy', mediaType: 'music', typeLabel: 'Artist', score: 100 }
    ];
  }
  if (isComedy) {
    return [
      { title: "It's Always Sunny in Philadelphia", mediaType: 'tv', typeLabel: 'TV', score: 100 },
      { title: 'Everything Everywhere All at Once', mediaType: 'movie', typeLabel: 'Movie', score: 100 },
      { title: 'Tenacious D', mediaType: 'music', typeLabel: 'Artist', score: 100 }
    ];
  }
  if (isFantasy) {
    return [
      { title: 'House of the Dragon', mediaType: 'tv', typeLabel: 'TV', score: 100 },
      { title: 'The Lord of the Rings', mediaType: 'movie', typeLabel: 'Movie', score: 100 },
      { title: 'Florence + the Machine', mediaType: 'music', typeLabel: 'Artist', score: 100 }
    ];
  }
  if (isHorror) {
    return [
      { title: 'The Haunting of Hill House', mediaType: 'tv', typeLabel: 'TV', score: 100 },
      { title: 'Hereditary', mediaType: 'movie', typeLabel: 'Movie', score: 100 },
      { title: 'Nine Inch Nails', mediaType: 'music', typeLabel: 'Artist', score: 100 }
    ];
  }

  // General Drama / Premiere
  return [
    { title: 'The White Lotus', mediaType: 'tv', typeLabel: 'TV', score: 100 },
    { title: 'Inception', mediaType: 'movie', typeLabel: 'Movie', score: 100 },
    { title: 'Radiohead', mediaType: 'music', typeLabel: 'Artist', score: 100 }
  ];
}

/**
 * Returns three matching pieces of library content for a recommended release:
 * (TV show name, movie name, artist name)
 */
export function getThreeLibraryMatches(
  candidate: ExternalReleaseItem,
  libraryItems: MediaItem[],
  excludedTitles = new Set<string>()
): LibraryMatch[] {
  if (!libraryItems || libraryItems.length === 0) {
    return getFallbackMatchesForCandidate(candidate);
  }

  const tvItems = libraryItems.filter(i => i.mediaType === 'tv' || i.service === 'sonarr');
  const movieItems = libraryItems.filter(i => i.mediaType === 'movie' || i.service === 'radarr');
  const musicItems = libraryItems.filter(i => i.mediaType === 'music' || i.service === 'lidarr');

  const scoreList = (list: MediaItem[], typeLabel: 'TV' | 'Movie' | 'Artist') => {
    return list.map(item => {
      const displayTitle = (item.mediaType === 'music' && item.artist) ? item.artist : item.title;
      let score = scoreCandidateWithLibraryItem(candidate, item);
      // Meaningful penalty if this library item was already showcased in another spotlight tile
      if (excludedTitles.has(displayTitle.toLowerCase())) {
        score -= 60;
      }
      return {
        title: displayTitle,
        mediaType: item.mediaType,
        typeLabel,
        item,
        score
      };
    }).sort((a, b) => b.score - a.score);
  };

  const bestTv = scoreList(tvItems, 'TV')[0];
  const bestMovie = scoreList(movieItems, 'Movie')[0];
  const bestMusic = scoreList(musicItems, 'Artist')[0];

  const results: LibraryMatch[] = [];
  if (bestTv) results.push(bestTv);
  if (bestMovie) results.push(bestMovie);
  if (bestMusic) results.push(bestMusic);

  // If one of the categories has 0 items in library, supplement from the remaining highest-scoring library items
  if (results.length < 3 && libraryItems.length > results.length) {
    const usedTitles = new Set(results.map(r => r.title.toLowerCase()));
    const allScored = scoreList(
      libraryItems.filter(i => !usedTitles.has(((i.mediaType === 'music' && i.artist) ? i.artist : i.title).toLowerCase())),
      'Movie'
    );
    for (const candItem of allScored) {
      if (results.length >= 3) break;
      const typeLabel = candItem.mediaType === 'tv' ? 'TV' : candItem.mediaType === 'movie' ? 'Movie' : 'Artist';
      results.push({ ...candItem, typeLabel });
    }
  }

  // If still less than 3 (very small library), fill in missing slot from genre-appropriate touchstone
  if (results.length < 3) {
    const fallbacks = getFallbackMatchesForCandidate(candidate);
    for (const fb of fallbacks) {
      if (results.length >= 3) break;
      if (!results.some(r => r.typeLabel === fb.typeLabel || r.title.toLowerCase() === fb.title.toLowerCase())) {
        results.push(fb);
      }
    }
  }

  return results.slice(0, 3);
}

/**
 * Recommends spotlight releases based on the user's library taste.
 * Produces personalized spotlight tiles with the 3 matched library titles for each tile.
 */
export function getRecommendedSpotlight(
  data: ForthcomingReleasesPayload | null,
  libraryItems: MediaItem[],
  limit = 4
): SpotlightRecommendation[] {
  if (!data) return [];

  // Pool of candidate items: combine spotlight and all forthcoming releases, deduplicated by id/title
  const poolMap = new Map<string, ExternalReleaseItem>();
  for (const item of [...(data.spotlight || []), ...(data.all || [])]) {
    const key = (item.seriesOrArtistTitle || item.title).toLowerCase().trim();
    if (!poolMap.has(key)) {
      poolMap.set(key, item);
    }
  }
  const pool = Array.from(poolMap.values());

  if (pool.length === 0) return [];

  // If library has items, score candidates based on library taste
  if (libraryItems && libraryItems.length > 0) {
    const scoredCandidates = pool.map(candidate => {
      // Calculate affinity against all library items
      let totalAffinity = 0;
      for (const libItem of libraryItems) {
        totalAffinity += scoreCandidateWithLibraryItem(candidate, libItem);
      }
      const avgAffinity = totalAffinity / libraryItems.length;
      const recommendationScore = avgAffinity * 12 + (candidate.popularityScore || 0) * 0.25 + (candidate.rating || 0) * 3;
      return { candidate, recommendationScore };
    });

    // Sort descending by recommendation score
    scoredCandidates.sort((a, b) => b.recommendationScore - a.recommendationScore);

    // Select diverse top candidates (ensure TV, Movie, and top premieres are represented)
    const selected: ExternalReleaseItem[] = [];
    const seenShowKeys = new Set<string>();

    // 1. Top recommended movie
    const topMovie = scoredCandidates.find(sc => sc.candidate.mediaType === 'movie');
    if (topMovie) {
      const key = (topMovie.candidate.seriesOrArtistTitle || topMovie.candidate.title).toLowerCase().trim();
      seenShowKeys.add(key);
      selected.push(topMovie.candidate);
    }

    // 2. Top recommended TV show
    const topTv = scoredCandidates.find(sc => sc.candidate.mediaType === 'tv' && !seenShowKeys.has((sc.candidate.seriesOrArtistTitle || sc.candidate.title).toLowerCase().trim()));
    if (topTv) {
      const key = (topTv.candidate.seriesOrArtistTitle || topTv.candidate.title).toLowerCase().trim();
      seenShowKeys.add(key);
      selected.push(topTv.candidate);
    }

    // 3. Top recommended music or blockbuster premiere
    const topMusic = scoredCandidates.find(sc => sc.candidate.mediaType === 'music' && !seenShowKeys.has((sc.candidate.seriesOrArtistTitle || sc.candidate.title).toLowerCase().trim()));
    if (topMusic) {
      const key = (topMusic.candidate.seriesOrArtistTitle || topMusic.candidate.title).toLowerCase().trim();
      seenShowKeys.add(key);
      selected.push(topMusic.candidate);
    }

    // 4. Fill remaining slots from overall highest scoring candidates
    for (const sc of scoredCandidates) {
      if (selected.length >= limit) break;
      const key = (sc.candidate.seriesOrArtistTitle || sc.candidate.title).toLowerCase().trim();
      if (!seenShowKeys.has(key)) {
        seenShowKeys.add(key);
        selected.push(sc.candidate);
      }
    }

    // Now generate matching library items for each selected recommendation
    const usedLibraryTitles = new Set<string>();
    const recommendations: SpotlightRecommendation[] = [];

    for (const item of selected) {
      const matches = getThreeLibraryMatches(item, libraryItems, usedLibraryTitles);
      for (const m of matches) {
        usedLibraryTitles.add(m.title.toLowerCase());
      }
      recommendations.push({
        item,
        matches,
        recommendationScore: 100
      });
    }

    return recommendations;
  }

  // Default / Empty library fallback: use data.spotlight with genre-matched touchstones
  const defaultItems = (data.spotlight && data.spotlight.length > 0)
    ? data.spotlight.slice(0, limit)
    : pool.slice(0, limit);

  return defaultItems.map(item => ({
    item,
    matches: getThreeLibraryMatches(item, []),
    recommendationScore: 100
  }));
}
