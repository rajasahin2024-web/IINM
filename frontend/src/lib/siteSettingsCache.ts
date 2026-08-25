/**
 * siteSettingsCache – typed wrapper around the generic apiCache helper for
 * /api/settings/site. Keeps the SiteSettings interface and a convenience
 * function so callers don't need to know the URL.
 */

import { BASE_URL } from "./config";
import { cachedFetch, invalidateCache } from "./apiCache";

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

const SITE_SETTINGS_URL = `${BASE_URL}/api/settings/site`;

/**
 * Fetch site settings once, sharing the in-flight promise across all callers
 * and returning a short-lived cached result on subsequent calls.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  return cachedFetch<SiteSettings>(SITE_SETTINGS_URL, 60_000, {
    headers: { "Content-Type": "application/json" },
  });
}

/** Force a fresh fetch on next call (e.g. after admin saves settings). */
export function invalidateSiteSettings(): void {
  invalidateCache(SITE_SETTINGS_URL);
}
