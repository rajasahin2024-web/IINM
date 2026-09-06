import type { Metadata } from "next";
import { serverFetch, isDbDown } from "@/lib/serverFetch";
import JsonLd from "@/components/JsonLd";

const REVALIDATE = 60; // 1 min revalidation

export async function generateMetadata(): Promise<Metadata> {
  const [site, certData] = await Promise.all([
    serverFetch("/settings/site", REVALIDATE),
    serverFetch("/certification/data", REVALIDATE),
  ]);

  const baseUrl = (site && !isDbDown(site) && (site as any).canonical_base_url)
    ? (site as any).canonical_base_url.replace(/\/$/, "")
    : "https://iinmedu.com";
  const siteName = (site && !isDbDown(site) && (site as any).site_name) || "IINM";

  const data = certData && !isDbDown(certData) ? (certData as any) : null;

  const title = data?.seo_title || `Our Certifications & Accreditations | ${siteName}`;
  const description = data?.seo_description ||
    `Inspect IINM's official certifications, ISO 9001:2015 quality standards, MSME Udyam registration, Indian Trusts Act charter, and scanned credential archive.`;
  const ogImage = data?.og_image_url || (site && !isDbDown(site) ? (site as any).og_image_url : undefined);

  return {
    title,
    description,
    keywords: data?.seo_keywords || undefined,
    alternates: { canonical: `${baseUrl}/certification` },
    openGraph: {
      title,
      description,
      type: "website",
      siteName: siteName,
      url: `${baseUrl}/certification`,
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function CertificationLayout({ children }: { children: React.ReactNode }) {
  const [site, certData] = await Promise.all([
    serverFetch("/settings/site", REVALIDATE),
    serverFetch("/certification/data", REVALIDATE),
  ]);

  const baseUrl = (site && !isDbDown(site) && (site as any).canonical_base_url)
    ? (site as any).canonical_base_url.replace(/\/$/, "")
    : "https://iinmedu.com";
  const siteName = (site && !isDbDown(site) && (site as any).site_name) || "IINM";
  const logoUrl = (site && !isDbDown(site) && (site as any).logo_url)
    ? ((site as any).logo_url.startsWith("http") ? (site as any).logo_url : undefined)
    : undefined;

  const data = certData && !isDbDown(certData) ? (certData as any) : null;

  // 1. Institutional Schema
  const institutionalSchema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "name": data?.seo_title || `Certifications & Accreditations — ${siteName}`,
    "url": `${baseUrl}/certification`,
    "description": data?.seo_description || `Official certifications, accreditation standards, and legal trust documents of ${siteName}.`,
    "mainEntity": {
      "@type": "EducationalOrganization",
      "name": siteName,
      "url": baseUrl,
      ...(logoUrl ? { "logo": { "@type": "ImageObject", "url": logoUrl } } : {}),
      "knowsAbout": [
        "ISO 9001:2015 Certification",
        "MSME Udyam Registration",
        "Indian Trusts Act 1882",
        "Vocational Skill Standards",
        "Online Certificate Verification",
        "NITI Aayog NGO Darpan"
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
