import type { Metadata } from "next";
import { serverFetch, isDbDown } from "@/lib/serverFetch";

const REVALIDATE = 300;

export async function generateMetadata(): Promise<Metadata> {
  const [site, pageMeta] = await Promise.all([
    serverFetch("/settings/site", REVALIDATE),
    serverFetch("/seo/pages/courses_list", REVALIDATE),
  ]);

  const baseUrl = (site && !isDbDown(site) && (site as any).canonical_base_url)
    ? (site as any).canonical_base_url.replace(/\/$/, "")
    : "https://iinmedu.com";
  const siteName = (site && !isDbDown(site) && (site as any).site_name) || "IINM";

  const title = (pageMeta && !isDbDown(pageMeta) && (pageMeta as any).seo_title) || `Courses | ${siteName}`;
  const description = (pageMeta && !isDbDown(pageMeta) && (pageMeta as any).seo_description) || "Explore our AI-powered courses designed to help you master the skills of tomorrow.";

  return {
    title,
    description,
    alternates: { canonical: `${baseUrl}/courses` },
    openGraph: {
      title,
      description,
      type: "website",
      siteName: siteName,
    },
  };
}

export default function CoursesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
