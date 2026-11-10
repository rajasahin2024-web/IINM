import type { Metadata } from "next";
import { serverFetch, isDbDown } from "@/lib/serverFetch";

const REVALIDATE = 300;

export async function generateMetadata(): Promise<Metadata> {
  const [site, pageMeta] = await Promise.all([
    serverFetch("/settings/site", REVALIDATE),
    serverFetch("/seo/pages/micro_courses", REVALIDATE),
  ]);

  const baseUrl = (site && !isDbDown(site) && site.canonical_base_url)
    ? site.canonical_base_url.replace(/\/$/, "")
    : "https://iinmedu.com";
  const siteName = (site && !isDbDown(site) && site.site_name) || "IINM";

  const title = (pageMeta && !isDbDown(pageMeta) && pageMeta.seo_title) || "Micro Courses";
  const description = (pageMeta && !isDbDown(pageMeta) && pageMeta.seo_description)
    || "Short, focused micro courses — learn one skill fast with instant access after purchase.";

  return {
    title,
    description,
    alternates: { canonical: `${baseUrl}/micro-courses` },
    openGraph: {
      title,
      description,
      type: "website",
      siteName: siteName,
    },
  };
}

export default function MicroCoursesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
