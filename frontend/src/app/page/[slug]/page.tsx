import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageClient from "./PageClient";
import { API_BASE_URL as API } from "@/lib/config";
import { serverFetch } from "@/lib/serverFetch";
import JsonLd from "@/components/JsonLd";

async function fetchPage(slug: string) {
  try {
    const res = await fetch(`${API}/pages/slug/${slug}`, {
      cache: "no-store", // always fetch fresh; content changes often in CMS
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await fetchPage(slug);
  const site = await serverFetch("/settings/site", 300);
  const baseUrl = (site && !("__dbDown" in site) && (site as any).canonical_base_url)
    ? (site as any).canonical_base_url.replace(/\/$/, "")
    : "https://iinmedu.com";
  const siteName = (site && !("__dbDown" in site) && (site as any).site_name) || "IINM";

  const seoTitle = page?.seo_title || page?.title;
  const seoDesc = page?.seo_description || page?.excerpt || "Read more from IINM.";

  return {
    title: seoTitle ? `${seoTitle} | ${siteName}` : siteName,
    description: seoDesc,
    keywords: page?.seo_keywords || undefined,
    alternates: {
      canonical: `${baseUrl}/page/${slug}`,
    },
    openGraph: {
      title: seoTitle || page?.title || siteName,
      description: seoDesc,
      type: "article",
      publishedTime: page?.published_at || undefined,
      images: page?.featured_image ? [{ url: page.featured_image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
    },
  };
}

export default async function StaticPageRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await fetchPage(slug);
  if (!page) notFound();

  const site = await serverFetch("/settings/site", 300);
  const baseUrl = (site && !("__dbDown" in site) && (site as any).canonical_base_url)
    ? (site as any).canonical_base_url.replace(/\/$/, "")
    : "https://iinmedu.com";

  // ── WebPage JSON-LD ──
  const pageSchema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page?.seo_title || page?.title || "Untitled",
    description: page?.seo_description || page?.excerpt || "",
    url: `${baseUrl}/page/${slug}`,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${baseUrl}/page/${slug}` },
  };
  if (page?.featured_image) {
    pageSchema.image = page.featured_image;
  }
  if (page?.published_at) {
    pageSchema.datePublished = page.published_at;
  }
  if (page?.updated_at) {
    pageSchema.dateModified = page.updated_at;
  }
  pageSchema.publisher = {
    "@type": "Organization",
    name: (site as any)?.site_name || "IINM",
  };

  // ── Breadcrumb JSON-LD ──
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
      { "@type": "ListItem", position: 2, name: page?.title || "Page", item: `${baseUrl}/page/${slug}` },
    ],
  };

  return (
    <>
      <JsonLd data={[pageSchema, breadcrumbSchema]} />
      <PageClient slug={slug} initialData={page} />
    </>
  );
}
