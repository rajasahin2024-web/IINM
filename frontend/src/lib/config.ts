// Server-side (SSR/middleware/route handlers) talks to the backend over a
// fast, cert-free internal HTTP URL. The browser uses the same-origin public
// HTTPS URL (set via NEXT_PUBLIC_*). This avoids self-signed-cert TLS errors
// in server-side fetch AND mixed-content blocking in the browser.
const isServer = typeof window === "undefined";

export const API_BASE_URL =
  (isServer && (process.env.API_URL || process.env.INTERNAL_API_URL)) ||
  process.env.NEXT_PUBLIC_API_URL ||
  "";
export const BASE_URL =
  (isServer && (process.env.INTERNAL_BASE_URL)) ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  "";

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
  // /uploads/* is proxied to the backend by the Next rewrite (dev) and by
  // nginx (prod) — keep it same-origin so CSP img-src 'self' always applies
  // regardless of which scheme/host BACKEND_BASE_URL points at.
  if (url.startsWith("/uploads/")) return url;
  // The backend may still emit absolute http(s)://<host>/uploads/... URLs
  // (e.g. public serializers using BASE_URL). Rewrite backend-hosted upload
  // URLs to same-origin as well — CSP 'self' then applies and the asset works
  // even when the emitted scheme/host is unreachable from the browser
  // (http://localhost:2007).
  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const u = new URL(url);
      const backendHost = BACKEND_BASE_URL ? new URL(BACKEND_BASE_URL).hostname : "";
      if (
        u.pathname.startsWith("/uploads/") &&
        (u.hostname === backendHost ||
          u.hostname === "localhost" ||
          u.hostname === "127.0.0.1" ||
          (!isServer && u.hostname === window.location.hostname))
      ) {
        return u.pathname + u.search;
      }
    } catch {
      // BACKEND_BASE_URL unset/malformed — keep the absolute URL as-is.
    }
    return url;
  }
  return `${BACKEND_BASE_URL}${url}`;
}
