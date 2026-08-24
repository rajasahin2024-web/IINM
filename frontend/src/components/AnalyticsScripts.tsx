"use client";
import { useEffect, useRef } from "react";
import Script from "next/script";

interface AnalyticsScriptsProps {
  analyticsId: string | null;
  bingWebmasterId: string | null;
}

export default function AnalyticsScripts({ analyticsId, bingWebmasterId }: AnalyticsScriptsProps) {
  // Track GA page_view on route changes (App Router compatible)
  const lastPath = useRef<string>("");
  useEffect(() => {
    if (!analyticsId || typeof window === "undefined") return;

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
  }, [analyticsId]);

  // Inject Bing Webmaster verification meta tag
  useEffect(() => {
    if (!bingWebmasterId) return;
    let meta = document.querySelector('meta[name="msvalidate.01"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "msvalidate.01";
      document.head.appendChild(meta);
    }
    meta.content = bingWebmasterId;
  }, [bingWebmasterId]);

  if (!analyticsId) return null;

  const gaId = analyticsId;

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
