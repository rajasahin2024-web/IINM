import type { Metadata } from "next";
import { serverFetch, isDbDown } from "@/lib/serverFetch";
import JsonLd from "@/components/JsonLd";

const REVALIDATE = 60; // 1 min revalidation for instant reflection

export async function generateMetadata(): Promise<Metadata> {
  const [site, mvData] = await Promise.all([
    serverFetch("/settings/site", REVALIDATE),
    serverFetch("/mission-vision/data", REVALIDATE),
  ]);

  const baseUrl = (site && !isDbDown(site) && (site as any).canonical_base_url)
    ? (site as any).canonical_base_url.replace(/\/$/, "")
    : "https://iinmedu.com";
  const siteName = (site && !isDbDown(site) && (site as any).site_name) || "IINM";

  const data = mvData && !isDbDown(mvData) ? (mvData as any) : null;

  const title = data?.seo_title || `Our Mission & Vision | ${siteName}`;
  const description = data?.seo_description ||
    `Discover IINM's strategic institutional mission, future vision, statutory accreditations (ISO 9001:2015, MSME), and our 6-pillar objective to empower students with job-ready vocational and technology education.`;
  const ogImage = data?.og_image_url || (site && !isDbDown(site) ? (site as any).og_image_url : undefined);

  return {
    title,
    description,
    keywords: data?.seo_keywords || undefined,
    alternates: { canonical: `${baseUrl}/mission-vision` },
    openGraph: {
      title,
      description,
      type: "website",
      siteName: siteName,
      url: `${baseUrl}/mission-vision`,
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function MissionVisionLayout({ children }: { children: React.ReactNode }) {
  const [site, mvData] = await Promise.all([
    serverFetch("/settings/site", REVALIDATE),
    serverFetch("/mission-vision/data", REVALIDATE),
  ]);

  const baseUrl = (site && !isDbDown(site) && (site as any).canonical_base_url)
    ? (site as any).canonical_base_url.replace(/\/$/, "")
    : "https://iinmedu.com";
  const siteName = (site && !isDbDown(site) && (site as any).site_name) || "IINM";
  const logoUrl = (site && !isDbDown(site) && (site as any).logo_url)
    ? ((site as any).logo_url.startsWith("http") ? (site as any).logo_url : undefined)
    : undefined;

  const data = mvData && !isDbDown(mvData) ? (mvData as any) : null;

  // 1. Institutional Schema
  const institutionalSchema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "name": data?.seo_title || `Our Mission & Vision — ${siteName}`,
    "url": `${baseUrl}/mission-vision`,
    "description": data?.seo_description || `Institutional Mission, Vision, and Objectives of ${siteName}.`,
    "mainEntity": {
      "@type": "EducationalOrganization",
      "name": siteName,
      "url": baseUrl,
      ...(logoUrl ? { "logo": { "@type": "ImageObject", "url": logoUrl } } : {}),
      "slogan": data?.hero_title || "Empowering Potential. Engineering the Future of Skill.",
      "knowsAbout": [
        "Vocational Education",
        "Skill Development",
        "Self-Employment",
        "ISO 9001:2015 Quality Training",
        "MSME Technical Education",
        "Industry Certification"
      ]
    },
  };

  // 2. AEO (Answer Engine Optimization) FAQPage Schema
  let aeoFaqSchema: any = null;
  if (data?.aeo_faqs_json) {
    try {
      const parsedFaqs = JSON.parse(data.aeo_faqs_json);
      if (Array.isArray(parsedFaqs) && parsedFaqs.length > 0) {
        aeoFaqSchema = {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": parsedFaqs.map((faq: { q?: string; a?: string }) => ({
            "@type": "Question",
            "name": faq.q || "",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": faq.a || ""
            }
          }))
        };
      }
    } catch {
      // Fallback gracefully if json parsing fails
    }
  }

  return (
    <>
      <JsonLd data={institutionalSchema} />
      {aeoFaqSchema && <JsonLd data={aeoFaqSchema} />}
      {children}
    </>
  );
}
