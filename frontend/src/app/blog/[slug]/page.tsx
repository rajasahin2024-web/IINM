import type { Metadata } from "next";
import BlogDetailClient from "./BlogDetailClient";
import { API_BASE_URL as API } from "@/lib/config";
import { serverFetch } from "@/lib/serverFetch";
import JsonLd from "@/components/JsonLd";

async function fetchPost(slug: string) {
  try {
    const res = await fetch(`${API}/blogs/slug/${slug}`, {
      next: { revalidate: 300 }, // ISR: 5-min cache; comments/ratings stay fresh via client fetch
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchPost(slug);
  const post = data?.post;
  const site = await serverFetch("/settings/site", 300);
  const baseUrl = (site && !("__dbDown" in site) && (site as any).canonical_base_url)
    ? (site as any).canonical_base_url.replace(/\/$/, "")
    : "https://iinmedu.com";
  const seoTitle = post?.seo_title || post?.title;
  const seoDesc = post?.seo_description || post?.excerpt || "Read the latest articles on AI, programming, and learning.";
  return {
    title: seoTitle ? `${seoTitle} | ${(site as any)?.site_name || "IINM"} Blog` : "IINM Blog",
    description: seoDesc,
    keywords: post?.seo_keywords || undefined,
    alternates: {
      canonical: `${baseUrl}/blog/${slug}`,
    },
    openGraph: {
      title: seoTitle || post?.title || "IINM Blog",
      description: seoDesc,
      type: "article",
      url: `${baseUrl}/blog/${slug}`,
      publishedTime: post?.published_at || undefined,
      authors: post?.author_name ? [post.author_name] : undefined,
      images: post?.featured_image ? [{ url: post.featured_image, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitle || post?.title || "IINM Blog",
      description: seoDesc,
      images: post?.featured_image ? [post.featured_image] : undefined,
    },
  };
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Fetch once on the server and pass down — the client no longer re-fetches
  // the same post, eliminating a redundant request + loading flash.
  const initialData = await fetchPost(slug);
  const site = await serverFetch("/settings/site", 300);
  const baseUrl = (site && !("__dbDown" in site) && (site as any).canonical_base_url)
    ? (site as any).canonical_base_url.replace(/\/$/, "")
    : "https://iinmedu.com";
  const post = initialData?.post;

  // ── Article JSON-LD ──
  const articleSchema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post?.seo_title || post?.title || "Untitled",
    description: post?.seo_description || post?.excerpt || "",
    url: `${baseUrl}/blog/${slug}`,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${baseUrl}/blog/${slug}` },
  };
  // wordCount helps AEO/answer engines understand article depth.
  if (post?.reading_time) {
    articleSchema.wordCount = post.reading_time * 200; // approximate from reading time
  }
  if (post?.seo_keywords) {
    articleSchema.keywords = post.seo_keywords;
  }
  if (post?.featured_image) {
    articleSchema.image = post.featured_image;
  }
  if (post?.published_at) {
    articleSchema.datePublished = post.published_at;
  }
  if (post?.updated_at) {
    articleSchema.dateModified = post.updated_at;
  }
  if (post?.author_name) {
    articleSchema.author = { "@type": "Person", name: post.author_name };
  }
  articleSchema.publisher = {
    "@type": "Organization",
    name: (site as any)?.site_name || "IINM",
  };

  // ── Breadcrumb JSON-LD ──
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${baseUrl}/blog` },
      { "@type": "ListItem", position: 3, name: post?.title || "Article", item: `${baseUrl}/blog/${slug}` },
    ],
  };

  return (
    <>
      <JsonLd data={[articleSchema, breadcrumbSchema]} />
      <BlogDetailClient slug={slug} initialData={initialData} />
    </>
  );
}
