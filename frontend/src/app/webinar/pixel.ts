/**
 * Meta Pixel — scoped to the webinar funnel LP.
 * Requires NEXT_PUBLIC_META_PIXEL_ID; every call no-ops when unset so the
 * page works in dev/staging without a pixel.
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
    // Window.Razorpay is declared globally by src/app/invoice/[uuid]/page.tsx
  }
}

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";

let pixelReady = false;

export function initMetaPixel(): void {
  if (!META_PIXEL_ID || pixelReady || typeof window === "undefined") return;
  pixelReady = true;

  const w = window as Window & { fbq?: (...args: unknown[]) => void; _fbq?: unknown };
  if (!w.fbq) {
    const fbq = ((...args: unknown[]) => {
      // Standard fbevents queue shim — args buffer until the library loads.
      (fbq as unknown as { queue: unknown[] }).queue.push(args);
    }) as ((...args: unknown[]) => void) & { queue: unknown[]; loaded?: boolean; version?: string };
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = "2.0";
    w.fbq = fbq;
    w._fbq = fbq;

    const s = document.createElement("script");
    s.async = true;
    s.src = "https://connect.facebook.net/en_US/fbevents.js";
    const first = document.getElementsByTagName("script")[0];
    first?.parentNode?.insertBefore(s, first);
  }

  w.fbq!("init", META_PIXEL_ID);
  w.fbq!("track", "PageView");
}

/** Standard events: track("Purchase", {value, currency, ...}, {eventID}) */
export function fbTrack(event: string, data?: Record<string, unknown>, opts?: { eventID?: string }): void {
  if (!META_PIXEL_ID || typeof window === "undefined" || !window.fbq) return;
  if (opts?.eventID) window.fbq("track", event, data ?? {}, { eventID: opts.eventID });
  else window.fbq("track", event, data ?? {});
}

export function fbTrackCustom(event: string, data?: Record<string, unknown>): void {
  if (!META_PIXEL_ID || typeof window === "undefined" || !window.fbq) return;
  window.fbq("trackCustom", event, data ?? {});
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

/** _fbc value for server-side attribution: cookie first, else derive from fbclid. */
export function getFbc(): string | null {
  const fromCookie = getCookie("_fbc");
  if (fromCookie) return fromCookie;
  if (typeof window === "undefined") return null;
  const fbclid = new URLSearchParams(window.location.search).get("fbclid");
  return fbclid ? `fb.1.${Date.now()}.${fbclid}` : null;
}

export function getFbp(): string | null {
  return getCookie("_fbp");
}

/** UTM + referrer snapshot for the checkout request. */
export function captureAttribution(): Record<string, string | null> {
  if (typeof window === "undefined") return {};
  const q = new URLSearchParams(window.location.search);
  return {
    utm_source: q.get("utm_source"),
    utm_medium: q.get("utm_medium"),
    utm_campaign: q.get("utm_campaign"),
    utm_term: q.get("utm_term"),
    utm_content: q.get("utm_content"),
    fbc: getFbc(),
    fbp: getFbp(),
    referrer: document.referrer || null,
  };
}
