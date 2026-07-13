"use client";
import { useEffect, useState, useRef } from "react";
import Script from "next/script";
import { BASE_URL } from "@/lib/config";

interface SiteSettings {
  analytics_id: string | null;
  bing_webmaster_id: string | null;
}

export default function AnalyticsScripts() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    fetch(`${BASE_URL}/api/settings/site`)
      .then((r) => r.json())
      .then((data) => {
        setSettings({
          analytics_id: data.analytics_id || null,
          bing_webmaster_id: data.bing_webmaster_id || null,
        });
      })
      .catch(() => {});
  }, []);

  // Track GA page_view on route changes (App Router compatible)
  const lastPath = useRef<string>("");
  useEffect(() => {
    if (!settings?.analytics_id || typeof window === "undefined") return;

    const sendPageView = () => {
      const path = window.location.pathname + window.location.search;
      if (path === lastPath.current) return;
      lastPath.current = path;
      if (typeof (window as any).gtag === "function") {
        (window as any).gtag("event", "page_view", {
          page_path: path,
          page_title: document.title,
        });
      }
    };

    sendPageView();

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    history.pushState = function (...args) {
      originalPushState.apply(this, args);
      setTimeout(sendPageView, 0);
    };
    history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      setTimeout(sendPageView, 0);
    };
    window.addEventListener("popstate", sendPageView);

    return () => {
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      window.removeEventListener("popstate", sendPageView);
    };
  }, [settings?.analytics_id]);

  // Inject Bing Webmaster verification meta tag
  useEffect(() => {
    if (!settings?.bing_webmaster_id) return;
    let meta = document.querySelector('meta[name="msvalidate.01"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "msvalidate.01";
      document.head.appendChild(meta);
    }
    meta.content = settings.bing_webmaster_id;
  }, [settings?.bing_webmaster_id]);

  if (!settings?.analytics_id) return null;

  const gaId = settings.analytics_id;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `}
      </Script>
    </>
  );
}
