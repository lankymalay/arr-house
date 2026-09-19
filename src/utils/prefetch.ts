/**
 * Intelligent Image and Asset Prefetching Engine for Arr House
 * Handles idle-time network warming, concurrency-limited image preloading,
 * and smart memory deduplication to keep UI navigation fast and fluid.
 */

const prefetchedImages = new Set<string>();
const inflightImagePrefetches = new Set<string>();
const prefetchedApiEndpoints = new Set<string>();

/**
 * Run a callback when the browser main thread is idle
 */
export function scheduleOnIdle(callback: () => void, timeout = 2500): () => void {
  if (typeof window === 'undefined') return () => {};

  if ('requestIdleCallback' in window) {
    const handle = (window as any).requestIdleCallback(callback, { timeout });
    return () => (window as any).cancelIdleCallback(handle);
  } else {
    const timer = setTimeout(callback, 200);
    return () => clearTimeout(timer);
  }
}

/**
 * Prefetches a single image URL into browser cache
 */
export function prefetchImage(url: string | null | undefined): Promise<boolean> {
  if (!url || typeof window === 'undefined') return Promise.resolve(false);
  const cleanUrl = url.trim();
  if (!cleanUrl || prefetchedImages.has(cleanUrl) || inflightImagePrefetches.has(cleanUrl)) {
    return Promise.resolve(true);
  }

  inflightImagePrefetches.add(cleanUrl);

  return new Promise((resolve) => {
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.decoding = 'async';
    img.onload = () => {
      prefetchedImages.add(cleanUrl);
      inflightImagePrefetches.delete(cleanUrl);
      resolve(true);
    };
    img.onerror = () => {
      inflightImagePrefetches.delete(cleanUrl);
      resolve(false);
    };
    img.src = cleanUrl;
  });
}

/**
 * Concurrency-limited batch prefetch of image URLs
 */
export async function prefetchImages(urls: (string | null | undefined)[], maxParallel = 4): Promise<void> {
  if (typeof window === 'undefined' || !Array.isArray(urls)) return;

  const validUrls = Array.from(
    new Set(
      urls
        .filter((u): u is string => Boolean(u && typeof u === 'string' && u.trim().length > 0))
        .map((u) => u.trim())
        .filter((u) => !prefetchedImages.has(u) && !inflightImagePrefetches.has(u))
    )
  );

  if (validUrls.length === 0) return;

  // Process in small batches to preserve network bandwidth for user interactions
  let index = 0;
  async function worker() {
    while (index < validUrls.length) {
      const url = validUrls[index++];
      if (url) {
        await prefetchImage(url);
      }
    }
  }

  const workers = Array.from({ length: Math.min(maxParallel, validUrls.length) }, () => worker());
  await Promise.all(workers);
}

/**
 * Prefetch JSON endpoints into HTTP cache during idle intervals
 */
export function prefetchApi(endpoint: string): void {
  if (typeof window === 'undefined' || prefetchedApiEndpoints.has(endpoint)) return;
  prefetchedApiEndpoints.add(endpoint);

  scheduleOnIdle(() => {
    const token = localStorage.getItem('arr_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(endpoint, {
      headers,
      priority: 'low' as any,
    }).catch(() => {
      // Background prefetch errors are non-critical and swallowed silently
    });
  });
}
