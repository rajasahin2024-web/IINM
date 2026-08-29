import type { Metadata } from "next";
import { serverFetch, isDbDown } from "@/lib/serverFetch";
import JsonLd from "@/components/JsonLd";

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
  const ogImage = (site && !isDbDown(site) && (site as any).og_image_url)
    ? ((site as any).og_image_url.startsWith("http") ? (site as any).og_image_url : undefined)
    : undefined;

  const title = (pageMeta && !isDbDown(pageMeta) && (pageMeta as any).seo_title) || "Contact Us";
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
      url: `${baseUrl}/contact-us`,
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : undefined,
    },
  };
}

export default async function ContactUsLayout({ children }: { children: React.ReactNode }) {
  const site = await serverFetch("/settings/site", REVALIDATE);
  const baseUrl = (site && !isDbDown(site) && (site as any).canonical_base_url)
    ? (site as any).canonical_base_url.replace(/\/$/, "")
    : "https://iinmedu.com";
  const siteName = (site && !isDbDown(site) && (site as any).site_name) || "IINM";

  const contactSchema = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "name": `Contact Us — ${siteName}`,
    "url": `${baseUrl}/contact-us`,
    "mainEntity": {
      "@type": "Organization",
      "name": siteName,
      "url": baseUrl,
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer service",
        "url": `${baseUrl}/contact-us`,
      },
    },
  };

  return (
    <>
      <JsonLd data={contactSchema} />
      {children}
    </>
  );
}
