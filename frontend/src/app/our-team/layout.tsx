import type { Metadata } from "next";
import { serverFetch, isDbDown } from "@/lib/serverFetch";
import JsonLd from "@/components/JsonLd";

const REVALIDATE = 60; // 1 min revalidation

export async function generateMetadata(): Promise<Metadata> {
  const [site, teamData] = await Promise.all([
    serverFetch("/settings/site", REVALIDATE),
    serverFetch("/our-team/data", REVALIDATE),
  ]);

  const baseUrl = (site && !isDbDown(site) && (site as any).canonical_base_url)
    ? (site as any).canonical_base_url.replace(/\/$/, "")
    : "https://iinmedu.com";
  const siteName = (site && !isDbDown(site) && (site as any).site_name) || "IINM";

  const data = teamData && !isDbDown(teamData) ? (teamData as any) : null;

  const title = data?.seo_title || `Our Team & Academic Faculty | ${siteName}`;
  const description = data?.seo_description ||
    `Meet the distinguished academic faculty, AI researchers, and veteran industry mentors driving technical education and capstone excellence at IINM.`;
  const ogImage = data?.og_image_url || (site && !isDbDown(site) ? (site as any).og_image_url : undefined);

  return {
    title,
    description,
    keywords: data?.seo_keywords || undefined,
    alternates: { canonical: `${baseUrl}/our-team` },
    openGraph: {
      title,
      description,
      type: "website",
      siteName: siteName,
      url: `${baseUrl}/our-team`,
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function OurTeamLayout({ children }: { children: React.ReactNode }) {
  const [site, teamData] = await Promise.all([
    serverFetch("/settings/site", REVALIDATE),
    serverFetch("/our-team/data", REVALIDATE),
  ]);

  const baseUrl = (site && !isDbDown(site) && (site as any).canonical_base_url)
    ? (site as any).canonical_base_url.replace(/\/$/, "")
    : "https://iinmedu.com";
  const siteName = (site && !isDbDown(site) && (site as any).site_name) || "IINM";
  const logoUrl = (site && !isDbDown(site) && (site as any).logo_url)
    ? ((site as any).logo_url.startsWith("http") ? (site as any).logo_url : undefined)
    : undefined;

  const data = teamData && !isDbDown(teamData) ? (teamData as any) : null;

  // 1. Institutional Schema
  const institutionalSchema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "name": data?.seo_title || `Faculty & Leadership Directory — ${siteName}`,
    "url": `${baseUrl}/our-team`,
    "description": data?.seo_description || `Meet the distinguished faculty and industry mentors of ${siteName}.`,
    "mainEntity": {
      "@type": "EducationalOrganization",
      "name": siteName,
      "url": baseUrl,
      ...(logoUrl ? { "logo": { "@type": "ImageObject", "url": logoUrl } } : {}),
      "knowsAbout": [
        "Artificial Intelligence Education",
        "Machine Learning Faculty",
        "Cloud Architecture Mentorship",
        "Data Science Capstone Projects",
        "Industry Mentorship in India"
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
      // Fallback gracefully
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
