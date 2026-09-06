import type { Metadata } from "next";
import { serverFetch, isDbDown } from "@/lib/serverFetch";
import JsonLd from "@/components/JsonLd";

const REVALIDATE = 60; // 1 min revalidation

export async function generateMetadata(): Promise<Metadata> {
  const [site, certData] = await Promise.all([
    serverFetch("/settings/site", REVALIDATE),
    serverFetch("/sample-certificate/data", REVALIDATE),
  ]);

  const baseUrl = (site && !isDbDown(site) && (site as any).canonical_base_url)
    ? (site as any).canonical_base_url.replace(/\/$/, "")
    : "https://iinmedu.com";
  const siteName = (site && !isDbDown(site) && (site as any).site_name) || "IINM";

  const data = certData && !isDbDown(certData) ? (certData as any) : null;

  const title = data?.seo_title || `Sample Certificates & Verified Credentials | ${siteName}`;
  const description = data?.seo_description ||
    `Inspect official sample certificates awarded by IINM for AI, Full Stack Cloud Engineering, Data Science, and Cyber Security. 100% verified online with tamper-proof QR codes.`;
  const ogImage = data?.og_image_url || (site && !isDbDown(site) ? (site as any).og_image_url : undefined);

  return {
    title,
    description,
    keywords: data?.seo_keywords || undefined,
    alternates: { canonical: `${baseUrl}/sample-certificate` },
    openGraph: {
      title,
      description,
      type: "website",
      siteName: siteName,
      url: `${baseUrl}/sample-certificate`,
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function SampleCertificateLayout({ children }: { children: React.ReactNode }) {
  const [site, certData] = await Promise.all([
    serverFetch("/settings/site", REVALIDATE),
    serverFetch("/sample-certificate/data", REVALIDATE),
  ]);

  const baseUrl = (site && !isDbDown(site) && (site as any).canonical_base_url)
    ? (site as any).canonical_base_url.replace(/\/$/, "")
    : "https://iinmedu.com";
  const siteName = (site && !isDbDown(site) && (site as any).site_name) || "IINM";
  const logoUrl = (site && !isDbDown(site) && (site as any).logo_url)
    ? ((site as any).logo_url.startsWith("http") ? (site as any).logo_url : undefined)
    : undefined;

  const data = certData && !isDbDown(certData) ? (certData as any) : null;

  // Educational Organization Schema
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: siteName,
    url: baseUrl,
    logo: logoUrl,
    description: data?.seo_description || undefined,
    sameAs: [
      "https://www.linkedin.com/company/iinmedu",
      "https://twitter.com/iinmedu",
      "https://www.facebook.com/iinmedu",
    ],
    knowsAbout: [
      "Artificial Intelligence Specialization",
      "Full Stack Cloud Engineering",
      "Data Science and MLOps",
      "Cyber Security and Network Defense",
      "Online Certificate Verification",
    ],
  };

  // AEO FAQPage Schema
  let faqSchema: Record<string, any> | null = null;
  if (data?.aeo_faqs_json) {
    try {
      const parsedFaqs = JSON.parse(data.aeo_faqs_json);
      if (Array.isArray(parsedFaqs) && parsedFaqs.length > 0) {
        faqSchema = {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: parsedFaqs.map((faq: { q: string; a: string }) => ({
            "@type": "Question",
            name: faq.q,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.a,
            },
          })),
        };
      }
    } catch {
      // ignore
    }
  }

  return (
    <>
      <JsonLd data={orgSchema} />
      {faqSchema && <JsonLd data={faqSchema} />}
      {children}
    </>
  );
}
