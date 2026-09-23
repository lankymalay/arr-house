export interface WordTruncationResult {
  text: string;
  hasMore: boolean;
  totalWords: number;
}

/**
 * Truncates a string to a given number of words.
 * Returns the truncated string, whether there is more text, and total word count.
 */
export function truncateToWordLimit(
  text: string | undefined | null,
  limit: number = 50
): WordTruncationResult {
  if (!text) {
    return { text: '', hasMore: false, totalWords: 0 };
  }
  const trimmed = text.trim();
  if (!trimmed) {
    return { text: '', hasMore: false, totalWords: 0 };
  }
  const words = trimmed.split(/\s+/);
  if (words.length <= limit) {
    return { text: trimmed, hasMore: false, totalWords: words.length };
  }
  return {
    text: words.slice(0, limit).join(' '),
    hasMore: true,
    totalWords: words.length
  };
}
