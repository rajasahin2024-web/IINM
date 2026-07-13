import type { Metadata } from "next";
import BlogDetailClient from "./BlogDetailClient";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:2007/api";

async function fetchPost(slug: string) {
  try {
    const res = await fetch(`${API}/blogs/slug/${slug}`, { cache: "no-store" });
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
  return {
    title: post?.title ? `${post.title} | IINM Blog` : "IINM Blog",
    description: post?.excerpt || "Read the latest articles on AI, programming, and learning.",
    openGraph: post?.featured_image
      ? { images: [{ url: post.featured_image }] }
      : undefined,
  };
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <BlogDetailClient slug={slug} />;
}
