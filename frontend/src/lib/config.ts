export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "";

/**
 * Backend root URL (no /api suffix) for resolving relative upload paths
 * like "/uploads/..." into absolute URLs.
 *
 * IMPORTANT: strip only a TRAILING "/api". A naive `.replace("/api", "")`
 * corrupts hosts such as "https://api.iinmedu.com/api" into
 * "https:/.iinmedu.com/api" because it matches the "/api" inside "//api".
 */
export const BACKEND_BASE_URL = API_BASE_URL.replace(/\/api$/, "");

/** Resolve a possibly-relative asset URL (e.g. "/uploads/x.pdf") to an absolute one. */
export function resolveAssetUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${BACKEND_BASE_URL}${url}`;
}
