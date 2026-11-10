import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import MicroCourseLanding from "./MicroCourseLanding";
import { serverFetch, isDbDown } from "@/lib/serverFetch";
import { API_BASE_URL as API } from "@/lib/config";
import JsonLd from "@/components/JsonLd";

const REVALIDATE = 300;

async function fetchCourse(slug: string) {
  try {
    const res = await fetch(`${API}/public/courses/${slug}`, {
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [course, site] = await Promise.all([
    fetchCourse(slug),
    serverFetch("/settings/site", REVALIDATE),
  ]);

  if (!course) {
    return { title: "Micro Course Not Found" };
  }

  const baseUrl = (site && !isDbDown(site) && site.canonical_base_url)
    ? site.canonical_base_url.replace(/\/$/, "")
    : "https://iinmedu.com";
  const siteName = (site && !isDbDown(site) && site.site_name) || "IINM";

  const seoTitle = course.seo_title || course.title;
  const seoDesc = course.seo_description || course.description || "";
  const ogImage = course.thumbnail_url || undefined;

  return {
    title: seoTitle,
    description: seoDesc,
    keywords: course.seo_keywords || undefined,
    alternates: {
      canonical: `${baseUrl}/micro-courses/${slug}`,
    },
    openGraph: {
      title: seoTitle,
      description: seoDesc,
      images: ogImage ? [{ url: ogImage }] : undefined,
      type: "website",
      siteName: siteName,
    },
    twitter: {
      card: "summary_large_image",
    },
  };
}

export default async function MicroCoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [course, site] = await Promise.all([
    fetchCourse(slug),
    serverFetch("/settings/site", REVALIDATE),
  ]);

  if (!course) {
    notFound();
  }

  // One canonical route family — non-micro slugs belong to /courses/[slug].
  if (course.course_type !== "micro") {
    permanentRedirect(`/courses/${slug}`);
  }

  const baseUrl = (site && !isDbDown(site) && site.canonical_base_url)
    ? site.canonical_base_url.replace(/\/$/, "")
    : "https://iinmedu.com";
  const siteName = (site && !isDbDown(site) && site.site_name) || "IINM";

  const courseSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.seo_title || course.title,
    description: course.seo_description || course.description || "",
    url: `${baseUrl}/micro-courses/${slug}`,
    provider: { "@type": "Organization", name: siteName, url: baseUrl },
    hasCourseInstance: { "@type": "CourseInstance", courseMode: "online" },
  };
  if (course.thumbnail_url) {
    courseSchema.image = course.thumbnail_url;
  }
  if (course.price != null) {
    courseSchema.offers = {
      "@type": "Offer",
      price: String(course.is_free ? 0 : course.discount_price ?? course.price),
      priceCurrency: course.currency || "INR",
    };
  }

  return (
    <>
      <JsonLd data={[courseSchema]} />
      <MicroCourseLanding course={course} />
    </>
  );
}
