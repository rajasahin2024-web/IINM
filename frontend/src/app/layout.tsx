import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import AnalyticsScripts from "@/components/AnalyticsScripts";
import MaintenanceGuard from "@/components/MaintenanceGuard";
import FomoNotification from "@/components/FomoNotification";
import { serverFetch, isDbDown } from "@/lib/serverFetch";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-playfair" });

// ── SEO metadata from DB site settings (server-side, no client flash) ──
export async function generateMetadata(): Promise<Metadata> {
  const site = await serverFetch("/settings/site", 300);
  if (isDbDown(site) || !site) {
    return {
      title: "IINM",
      description: "AI-Powered Connected Learning Platform",
    };
  }
  const faviconUrl = site.favicon_url
    ? site.favicon_url.startsWith("http")
      ? site.favicon_url
      : undefined
    : undefined;
  const baseUrl = site.canonical_base_url
    ? site.canonical_base_url.replace(/\/$/, "")
    : "https://iinmedu.com";
  const ogImage = site.og_image_url
    ? site.og_image_url.startsWith("http")
      ? site.og_image_url
      : undefined
    : undefined;
  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: site.site_name || "IINM",
      template: `%s | ${site.site_name || "IINM"}`,
    },
    description: site.meta_description || "AI-Powered Connected Learning Platform",
    keywords: site.meta_description ? undefined : undefined,
    icons: faviconUrl ? { icon: faviconUrl } : undefined,
    alternates: {
      canonical: baseUrl,
      languages: {
        "en-IN": baseUrl,
      },
    },
    verification: {
      google: site.google_site_verification || undefined,
      other: site.bing_webmaster_id
        ? { "msvalidate.01": site.bing_webmaster_id }
        : undefined,
    },
    openGraph: {
      title: site.site_name || "IINM",
      description: site.meta_description || "",
      siteName: site.site_name || "IINM",
      url: baseUrl,
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : undefined,
      type: "website",
      locale: "en_IN",
    },
    twitter: {
      card: "summary_large_image",
      site: site.twitter_handle || undefined,
      title: site.site_name || "IINM",
      description: site.meta_description || "",
      images: ogImage ? [ogImage] : undefined,
    },
    robots: {
      index: site.default_robots_index !== false,
      follow: site.default_robots_index !== false,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

// ── Fetch analytics IDs server-side so AnalyticsScripts doesn't need a client fetch ──
async function fetchAnalyticsSettings() {
  const site = await serverFetch("/settings/site", 300);
  if (isDbDown(site) || !site) {
    return { analyticsId: null, bingWebmasterId: null };
  }
  return {
    analyticsId: site.analytics_id || null,
    bingWebmasterId: site.bing_webmaster_id || null,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { analyticsId, bingWebmasterId } = await fetchAnalyticsSettings();

  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable}`}>
        <AnalyticsScripts analyticsId={analyticsId} bingWebmasterId={bingWebmasterId} />
        <MaintenanceGuard>{children}</MaintenanceGuard>
        <FomoNotification />
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
