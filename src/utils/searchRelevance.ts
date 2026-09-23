import type { SearchResultItem } from '../types.js';

/**
 * Normalizes strings for robust matching:
 * - Converts to lowercase
 * - Strips accents/diacritics
 * - Normalizes '&' to 'and'
 * - Removes quotes, brackets, and punctuation
 * - Trims and normalizes spacing
 */
export function normalizeSearchString(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/['"’“”]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates a search relevance and popularity score for a SearchResultItem.
 * 
 * Rules:
 * 1. TITLE MATCH IS KING: An exact title match always scores higher than any partial or non-title match.
 * 2. POPULARITY ORDERING: Among items in the same title matching tier, the most popular content wins
 *    (using TMDB popularity, vote counts, ratings, and media completeness).
 * 3. NOISE REJECTION: Items whose titles or artists do not contain the query words are penalized heavily.
 */
export function calculateSearchRelevance(
  item: Pick<SearchResultItem, 'title' | 'authorOrArtist' | 'overview' | 'year' | 'posterUrl' | 'popularity' | 'ratings' | 'mediaType'>,
  query: string
): number {
  const cleanQ = (query || '').trim();
  if (!cleanQ) return 0;

  const normQ = normalizeSearchString(cleanQ);
  if (!normQ) return 0;

  const normTitle = normalizeSearchString(item.title || '');
  const normArtist = normalizeSearchString(item.authorOrArtist || '');
  const normOverview = normalizeSearchString(item.overview || '');

  const qWords = normQ.split(' ').filter((w) => w.length > 0);
  const titleWords = normTitle.split(' ').filter((w) => w.length > 0);

  let titleScore = 0;

  // Tier 1: EXACT TITLE MATCH (Maximum Priority: 2,000,000 pts)
  if (normTitle === normQ) {
    titleScore = 2_000_000;
  }
  // Tier 2: TITLE STARTS WITH QUERY AS WHOLE PHRASE (1,200,000 pts)
  // e.g. "Cool Runnings: The Jamaican Bobsleigh Story"
  else if (normTitle.startsWith(normQ + ' ') || normTitle.startsWith(normQ + ':')) {
    titleScore = 1_200_000;
  }
  // Tier 3: TITLE STARTS WITH QUERY PREFIX (900,000 pts)
  else if (normTitle.startsWith(normQ)) {
    titleScore = 900_000;
  }
  // Tier 4: TITLE CONTAINS WHOLE QUERY PHRASE (600,000 pts)
  // e.g. "Disney's Cool Runnings"
  else if (normTitle.includes(' ' + normQ + ' ') || normTitle.endsWith(' ' + normQ) || normTitle.includes(normQ)) {
    titleScore = 600_000;
  }
  // Tier 5: TITLE CONTAINS ALL QUERY WORDS (300,000+ pts)
  else {
    const matchedCount = qWords.filter((qw) => 
      titleWords.some((tw) => tw === qw || (qw.length >= 3 && tw.startsWith(qw)))
    ).length;

    if (matchedCount === qWords.length && qWords.length > 0) {
      titleScore = 350_000 + (matchedCount * 15_000);
    } else if (matchedCount > 0) {
      // Partial match: percentage of words matched
      const matchRatio = matchedCount / qWords.length;
      titleScore = 50_000 * matchRatio;
    }
  }

  // Length difference penalty:
  // If the query is "cool runnings", titles of length 13 get 0 penalty.
  // Super long titles like "Cool Runnings: Behind the Scenes Special Extended..." get slightly penalized
  // so the pure, canonical title ranks higher.
  if (titleScore > 0) {
    const lenDiff = Math.abs(normTitle.length - normQ.length);
    titleScore -= Math.min(lenDiff * 250, 40_000);
  }

  // Artist / Author Matching:
  let artistScore = 0;
  if (normArtist) {
    if (normArtist === normQ) {
      artistScore = 500_000; // Exact artist name match
    } else if (normArtist.startsWith(normQ + ' ') || normArtist.startsWith(normQ)) {
      artistScore = 250_000;
    } else if (normArtist.includes(normQ)) {
      artistScore = 120_000;
    }
  }

  // Overview / Synopsis match (weak fallback)
  let overviewScore = 0;
  if (titleScore === 0 && artistScore === 0 && normOverview.includes(normQ)) {
    overviewScore = 1_000;
  }

  // Base Match Score: TITLE is strictly dominant
  const baseMatchScore = Math.max(titleScore, artistScore, overviewScore);

  // If there is ZERO match in title, artist, or overview, heavily penalize so it drops below
  if (baseMatchScore === 0) {
    return -1_000_000;
  }

  // POPULARITY AND CREDIBILITY BOOST (Up to 100,000 pts)
  // This ensures that among exact or strong title matches, the famous, widely-watched
  // and acclaimed blockbuster/classic content (like the hit 1993 film "Cool Runnings")
  // decisively beats obscure student films or 1-vote uploads.
  let popularityScore = 0;

  // TMDB / Arr popularity metric (typically 0 - 150+)
  if (typeof item.popularity === 'number' && !isNaN(item.popularity) && item.popularity > 0) {
    // 50 popularity -> +15,000
    popularityScore += Math.min(item.popularity * 300, 40_000);
  }

  // Ratings vote count: one of the best indicators of real-world popularity
  // 100 votes -> +4,000, 1,000 votes -> +12,000, 10,000+ votes -> +25,000, 100,000+ votes -> +35,000
  if (item.ratings?.votes && typeof item.ratings.votes === 'number' && item.ratings.votes > 0) {
    popularityScore += Math.min(Math.log10(item.ratings.votes + 1) * 7_000, 35_000);
  }

  // Rating value (e.g. 7.5 / 10 -> +3,750)
  if (item.ratings?.value && typeof item.ratings.value === 'number' && item.ratings.value > 0) {
    popularityScore += Math.min(item.ratings.value * 500, 5_000);
  }

  // Valid Artwork & Overview bonus (indicates official, complete metadata)
  if (item.posterUrl && item.posterUrl.startsWith('http')) {
    popularityScore += 2_500;
  }
  if (item.overview && item.overview.length > 30) {
    popularityScore += 1_500;
  }

  // Valid Year bonus (classic or modern release)
  if (item.year && item.year >= 1930 && item.year <= new Date().getFullYear() + 2) {
    popularityScore += 1_000;
  }

  return baseMatchScore + popularityScore;
}

/**
 * Sorts an array of SearchResultItems by Title Match first, then by Popularity.
 */
export function rankSearchResults(items: SearchResultItem[], query: string): SearchResultItem[] {
  const cleanQ = (query || '').trim();
  if (!cleanQ) return items;

  const normQ = normalizeSearchString(cleanQ);

  // Compute scores once
  const scored = items.map((item) => ({
    item,
    score: calculateSearchRelevance(item, cleanQ),
    isExactTitle: normalizeSearchString(item.title) === normQ
  }));

  // Sort descending
  scored.sort((a, b) => {
    // 1. Exact title match tie-breaker
    if (a.isExactTitle && !b.isExactTitle) return -1;
    if (!a.isExactTitle && b.isExactTitle) return 1;

    // 2. Score comparison
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    // 3. Popularity / Vote count tie-breaker
    const popB = (b.item.popularity || 0) + (b.item.ratings?.votes || 0);
    const popA = (a.item.popularity || 0) + (a.item.ratings?.votes || 0);
    if (popB !== popA) {
      return popB - popA;
    }

    // 4. Release year (newest first, or established)
    return (b.item.year || 0) - (a.item.year || 0);
  });

  return scored.map((s) => s.item);
}
