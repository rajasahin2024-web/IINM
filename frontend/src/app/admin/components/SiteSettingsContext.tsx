"use client";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL } from "@/lib/config";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

const CACHE_KEY = "iinm_site_settings";

interface SiteSettings {
  site_name: string;
  logo_url: string;
  dark_logo_url: string;
  favicon_url: string;
  notification_bar_text: string;
}

interface SiteSettingsContextType {
  siteSettings: SiteSettings;
  refreshSiteSettings: () => Promise<void>;
}

const defaultSettings: SiteSettings = {
  site_name: "IINM",
  logo_url: "",
  dark_logo_url: "",
  favicon_url: "",
  notification_bar_text: "",
};

/** Read from localStorage instantly (no flash on refresh) */
function readCache(): SiteSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultSettings;
}

const SiteSettingsContext = createContext<SiteSettingsContextType>({
  siteSettings: defaultSettings,
  refreshSiteSettings: async () => {},
});

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  // Always start with defaultSettings (matches SSR) — prevents hydration mismatch
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(defaultSettings);

  const refreshSiteSettings = useCallback(async () => {
    try {
      const res = await apiFetch(`${BASE_URL}/api/settings/site`, {
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        const updated: SiteSettings = {
          site_name: data.site_name || "IINM",
          logo_url: data.logo_url || "",
          dark_logo_url: data.dark_logo_url || "",
          favicon_url: data.favicon_url || "",
          notification_bar_text: data.notification_bar_text || "",
        };
        setSiteSettings(updated);
        // Save to localStorage so next mount loads faster
        localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
      }
    } catch (err) {
      console.error("Failed to fetch site settings", err);
    }
  }, []);

  useEffect(() => {
    // Load from localStorage first (instant, no flicker), then refresh from API
    const cached = readCache();
    if (cached.logo_url || cached.site_name !== "IINM") {
      setSiteSettings(cached);
    }
    refreshSiteSettings();
  }, [refreshSiteSettings]);

  // Apply Favicon and Title dynamically
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (siteSettings.favicon_url) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = siteSettings.favicon_url;
      }

      if (siteSettings.site_name) {
        document.title = `${siteSettings.site_name} Admin — LMS`;
      }
    }
  }, [siteSettings.favicon_url, siteSettings.site_name]);

  return (
    <SiteSettingsContext.Provider value={{ siteSettings, refreshSiteSettings }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
