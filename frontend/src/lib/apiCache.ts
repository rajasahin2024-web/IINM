/**
 * apiCache – generic in-flight deduplication + short-term memory cache for
 * public GET endpoints.
 *
 * Many public components (Navbar, Footer, NotificationBar, SiteHeadUpdater,
 * CourseCategoriesSection, …) fire their own `fetch()` to the same endpoints
 * on every page mount. Without deduplication a single page load can produce
 * 8–10 simultaneous hits to `/api/settings/site`, `/api/settings/navbar`,
 * `/api/contact/settings`, etc., which exhausts the backend SQLAlchemy
 * QueuePool and causes 500 errors.
 *
 * This helper:
 *   1. Returns a cached result if one is fresh (within `ttl` ms).
 *   2. If a fetch is already in-flight for the same URL, awaits that promise
 *      instead of starting a second request.
 *   3. Otherwise starts a single fetch, caches the result, and resolves all
 *      waiting callers.
 *
 * Usage:
 *   import { cachedFetch } from "@/lib/apiCache";
 *   const data = await cachedFetch(`${BASE_URL}/api/settings/site`);
 *
 * After an admin save, call `invalidateCache(url)` so the next read fetches
 * fresh data:
 *   invalidateCache(`${BASE_URL}/api/settings/site`);
 */

import { apiFetch } from "./apiFetch";

// In-flight promises keyed by URL — ensures concurrent callers share one fetch.
const inflight = new Map<string, Promise<unknown>>();

// Short-term memory cache keyed by URL.
const memcache = new Map<string, { data: unknown; ts: number }>();

const DEFAULT_TTL = 60_000; // 60 seconds

/**
 * Fetch a URL with in-flight deduplication and a short memory cache.
 * Returns parsed JSON.
 *
 * @param url   Full URL (including BASE_URL) to fetch.
 * @param ttl   Cache TTL in milliseconds (default 60s).
 * @param init  Optional RequestInit passed through to apiFetch.
 */
export async function cachedFetch<T = unknown>(
  url: string,
  ttl: number = DEFAULT_TTL,
  init?: RequestInit
): Promise<T> {
  // 1. Return fresh memory cache if available.
  const cached = memcache.get(url);
  if (cached && Date.now() - cached.ts < ttl) {
    return cached.data as T;
  }

  // 2. Dedupe concurrent requests — if a fetch is already running, await it.
  const existing = inflight.get(url);
  if (existing) {
    return existing as Promise<T>;
  }

  // 3. Start a single fetch, share the promise, cache on success.
  const promise = (async () => {
    try {
      const res = await apiFetch(url, init);
      if (!res.ok) throw new Error(`cachedFetch ${res.status} for ${url}`);
      const data = await res.json();
      memcache.set(url, { data, ts: Date.now() });
      return data;
    } finally {
      // Clear the in-flight marker so a later call can retry after failure.
      inflight.delete(url);
    }
  })();

  inflight.set(url, promise);
  return promise as Promise<T>;
}

/**
 * Invalidate a specific URL's cached entry (e.g. after an admin save).
 * Pass no argument to clear the entire cache.
 */
export function invalidateCache(url?: string): void {
  if (url) {
    memcache.delete(url);
  } else {
    memcache.clear();
  }
}
