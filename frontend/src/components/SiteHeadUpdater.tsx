"use client";
import { useEffect } from "react";
import { BASE_URL } from "@/lib/config";

function getOrigin() {
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export default function SiteHeadUpdater() {
  useEffect(() => {
    // Skip admin routes — admin pages have their own title logic via SiteSettingsProvider
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
      return;
    }

    const updateHead = () => {
      const cached = localStorage.getItem("iinm_site_settings");
      if (cached) {
        try {
          const d = JSON.parse(cached);
          applySettings(d);
        } catch {}
      }
    };

    updateHead();

    fetch(`${BASE_URL}/api/settings/site`)
      .then((r) => r.json())
      .then((d) => {
        localStorage.setItem("iinm_site_settings", JSON.stringify(d));
        applySettings(d);
      })
      .catch(() => {});
  }, []);

  return null;
}

function applySettings(d: any) {
  if (d?.site_name && (typeof window === "undefined" || window.location.pathname === "/")) {
    document.title = d.site_name;
  }

  if (d?.meta_description) {
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = d.meta_description;
  }

  if (d?.favicon_url) {
    let link = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    const url = d.favicon_url.startsWith("http")
      ? d.favicon_url
      : `${getOrigin()}${d.favicon_url}`;
    if (link.href !== url) {
      link.href = url;
    }
  }
}
