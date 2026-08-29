import type { Metadata } from "next";
import { serverFetch, isDbDown } from "@/lib/serverFetch";
import JsonLd from "@/components/JsonLd";

const REVALIDATE = 300;

export async function generateMetadata(): Promise<Metadata> {
  const [site, pageMeta] = await Promise.all([
    serverFetch("/settings/site", REVALIDATE),
    serverFetch("/seo/pages/about_us", REVALIDATE),
  ]);

  const baseUrl = (site && !isDbDown(site) && (site as any).canonical_base_url)
    ? (site as any).canonical_base_url.replace(/\/$/, "")
    : "https://iinmedu.com";
  const siteName = (site && !isDbDown(site) && (site as any).site_name) || "IINM";
  const ogImage = (site && !isDbDown(site) && (site as any).og_image_url)
    ? ((site as any).og_image_url.startsWith("http") ? (site as any).og_image_url : undefined)
    : undefined;

  const title = (pageMeta && !isDbDown(pageMeta) && (pageMeta as any).seo_title) || "About Us";
  const description = (pageMeta && !isDbDown(pageMeta) && (pageMeta as any).seo_description) || "Learn about our mission, vision, and the team behind our AI-powered learning platform.";

  return {
    title,
    description,
    alternates: { canonical: `${baseUrl}/about-us` },
    openGraph: {
      title,
      description,
      type: "website",
      siteName: siteName,
      url: `${baseUrl}/about-us`,
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : undefined,
    },
  };
}

export default async function AboutUsLayout({ children }: { children: React.ReactNode }) {
  const site = await serverFetch("/settings/site", REVALIDATE);
  const baseUrl = (site && !isDbDown(site) && (site as any).canonical_base_url)
    ? (site as any).canonical_base_url.replace(/\/$/, "")
    : "https://iinmedu.com";
  const siteName = (site && !isDbDown(site) && (site as any).site_name) || "IINM";
  const logoUrl = (site && !isDbDown(site) && (site as any).logo_url)
    ? ((site as any).logo_url.startsWith("http") ? (site as any).logo_url : undefined)
    : undefined;

  const aboutSchema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "name": `About Us — ${siteName}`,
    "url": `${baseUrl}/about-us`,
    "mainEntity": {
      "@type": "EducationalOrganization",
      "name": siteName,
      "url": baseUrl,
      ...(logoUrl ? { "logo": { "@type": "ImageObject", "url": logoUrl } } : {}),
    },
  };

  return (
    <>
      <JsonLd data={aboutSchema} />
      {children}
    </>
  );
}
