import type { Metadata } from "next";
import { serverFetch, isDbDown } from "@/lib/serverFetch";

const REVALIDATE = 300;

export async function generateMetadata(): Promise<Metadata> {
  const [site, pageMeta] = await Promise.all([
    serverFetch("/settings/site", REVALIDATE),
    serverFetch("/seo/pages/contact_us", REVALIDATE),
  ]);

  const baseUrl = (site && !isDbDown(site) && (site as any).canonical_base_url)
    ? (site as any).canonical_base_url.replace(/\/$/, "")
    : "https://iinmedu.com";
  const siteName = (site && !isDbDown(site) && (site as any).site_name) || "IINM";

  const title = (pageMeta && !isDbDown(pageMeta) && (pageMeta as any).seo_title) || `Contact Us | ${siteName}`;
  const description = (pageMeta && !isDbDown(pageMeta) && (pageMeta as any).seo_description) || "Get in touch with our team for any questions about courses, enrollment, or support.";

  return {
    title,
    description,
    alternates: { canonical: `${baseUrl}/contact-us` },
    openGraph: {
      title,
      description,
      type: "website",
      siteName: siteName,
    },
  };
}

export default function ContactUsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
