import type { Metadata } from "next";
import { serverFetch, isDbDown } from "@/lib/serverFetch";

const REVALIDATE = 120;

export async function generateMetadata(): Promise<Metadata> {
  const [site, pageMeta] = await Promise.all([
    serverFetch("/settings/site", REVALIDATE),
    serverFetch("/seo/pages/notice", REVALIDATE),
  ]);

  const baseUrl = site && !isDbDown(site) && (site as any).canonical_base_url
    ? (site as any).canonical_base_url.replace(/\/$/, "")
    : "https://iinmedu.com";
  const siteName = (site && !isDbDown(site) && (site as any).site_name) || "IINM";

  const title = pageMeta && !isDbDown(pageMeta) && (pageMeta as any).seo_title
    ? (pageMeta as any).seo_title
    : `Official Notices & Circulars | ${siteName}`;

  const description = pageMeta && !isDbDown(pageMeta) && (pageMeta as any).seo_description
    ? (pageMeta as any).seo_description
    : "Stay updated with official institutional announcements, examination circulars, academic schedules, admission updates, and event notifications from IINM.";

  return {
    title,
    description,
    alternates: { canonical: `${baseUrl}/notice` },
    openGraph: {
      title,
      description,
      type: "website",
      siteName,
      url: `${baseUrl}/notice`,
    },
  };
}

export default function NoticeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
