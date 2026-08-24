/**
 * siteSettingsCache – deduplicates concurrent GET /api/settings/site requests
 * and caches the result briefly so that the many public components
 * (Navbar, Footer, NotificationBar, CourseSections, …) don't each fire their
 * own request on every page mount.
 *
 * Without this, a single page load can produce 8–10 simultaneous hits to
 * /api/settings/site, which exhausts the backend SQLAlchemy QueuePool
 * (size 5 + overflow 10 = 15) and causes 500 errors.
 */

import { apiFetch } from "./apiFetch";
import { BASE_URL } from "./config";

export interface SiteSettings {
  site_name?: string;
  logo_url?: string;
  dark_logo_url?: string;
  favicon_url?: string;
  meta_description?: string;
  promo_video_url?: string;
  analytics_id?: string;
  bing_webmaster_id?: string;
  notification_bar_text?: string;
  notification_bar_items?: string[] | string;
  ticker_speed?: number;
  ticker_animation_type?: string;
  ticker_bg_color?: string;
  ticker_text_color?: string;
  ticker_label_bg_color?: string;
  ticker_label_text_color?: string;
  maintenance_mode?: boolean;
  maintenance_title?: string | null;
  maintenance_message?: string | null;
  maintenance_video_url?: string | null;
  maintenance_bg_image_url?: string | null;
  founder_name?: string | null;
  founder_designation?: string | null;
  founder_signature_url?: string | null;
  og_image_url?: string | null;
  twitter_handle?: string | null;
  canonical_base_url?: string | null;
  google_site_verification?: string | null;
  default_robots_index?: boolean | null;
  [key: string]: unknown;
}

const CACHE_TTL_MS = 60_000; // 1 minute in-memory cache
let cached: { data: SiteSettings; ts: number } | null = null;
let inFlight: Promise<SiteSettings> | null = null;

/**
 * Fetch site settings once, sharing the in-flight promise across all callers
 * and returning a short-lived cached result on subsequent calls.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  // Return fresh cache if available
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }

  // Dedupe concurrent requests: if a fetch is already running, await it
  if (inFlight) {
    return inFlight;
  }

  inFlight = (async () => {
    try {
      const res = await apiFetch(`${BASE_URL}/api/settings/site`, {
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`site settings ${res.status}`);
      const data = (await res.json()) as SiteSettings;
      cached = { data, ts: Date.now() };
      return data;
    } finally {
      // Clear the in-flight marker so a later call can retry after failure
      inFlight = null;
    }
  })();

  return inFlight;
}

/** Force a fresh fetch on next call (e.g. after admin saves settings). */
export function invalidateSiteSettings(): void {
  cached = null;
}
