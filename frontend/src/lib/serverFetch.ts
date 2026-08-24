/**
 * serverFetch — Server Component-only fetch helper with DB-down detection.
 *
 * - Uses Next.js fetch caching (ISR) with configurable revalidation.
 * - Returns a sentinel `{ __dbDown: true }` when the API returns 503 or is
 *   unreachable, so callers can redirect to /maintenance.
 * - Returns `null` for non-503 failures (e.g. 404, parse error) so callers
 *   can fall back to empty state without triggering a maintenance redirect.
 *
 * IMPORTANT: Only call this from Server Components or `generateMetadata`.
 * It relies on the server-side `fetch` extension (next: { revalidate }).
 */

import { API_BASE_URL } from "./config";

export interface DbDownSentinel {
  __dbDown: true;
}

export function isDbDown(value: unknown): value is DbDownSentinel {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Record<string, unknown>).__dbDown === true
  );
}

/**
 * Fetch JSON from the backend API on the server side.
 *
 * @param path     API path starting with `/` (e.g. `/settings/site`)
 * @param revalidate  ISR cache duration in seconds (default 300 = 5 min)
 * @returns Parsed JSON, `null` on non-503 failure, or `{ __dbDown: true }` on 503/network error.
 */
export async function serverFetch(
  path: string,
  revalidateSeconds = 300
): Promise<any | null | DbDownSentinel> {
  try {
    const url = `${API_BASE_URL}${path}`;
    const res = await fetch(url, {
      next: { revalidate: revalidateSeconds },
    });

    if (res.status === 503) {
      return { __dbDown: true };
    }

    if (!res.ok) {
      return null;
    }

    return await res.json();
  } catch {
    // Network error — backend unreachable or timed out
    return { __dbDown: true };
  }
}

/**
 * Fetch multiple API endpoints in parallel.
 * Returns a map of path → result (same semantics as serverFetch per entry).
 * If ANY endpoint returns __dbDown, the entire result is marked as DB-down
 * for convenience — check with `isDbDown` on the returned object.
 */
export async function serverFetchAll(
  paths: string[],
  revalidateSeconds = 300
): Promise<Record<string, any | null> | DbDownSentinel> {
  const entries = await Promise.all(
    paths.map(async (path) => [path, await serverFetch(path, revalidateSeconds)] as const)
  );

  const result: Record<string, any | null> = {};
  for (const [path, value] of entries) {
    if (isDbDown(value)) {
      return { __dbDown: true };
    }
    result[path] = value;
  }
  return result;
}
