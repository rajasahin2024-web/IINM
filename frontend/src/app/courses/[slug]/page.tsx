import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CourseDetailClient from "./CourseDetailClient";
import { serverFetch, isDbDown } from "@/lib/serverFetch";
import { API_BASE_URL as API } from "@/lib/config";
import JsonLd from "@/components/JsonLd";

// ── Revalidation: 5 minutes (same as before) ──
const REVALIDATE = 300;

async function fetchCourse(slug: string) {
  try {
    const res = await fetch(`${API}/courses/public/courses/${slug}/extended`, {
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchCourseFaqs(slug: string) {
  try {
    const res = await fetch(`${API}/courses/public/courses/${slug}/faqs`, {
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [course, site] = await Promise.all([
    fetchCourse(slug),
    serverFetch("/settings/site", REVALIDATE),
  ]);

  if (!course) {
    return { title: "Course Not Found" };
  }

  const baseUrl = (site && !isDbDown(site) && (site as any).canonical_base_url)
    ? (site as any).canonical_base_url.replace(/\/$/, "")
    : "https://iinmedu.com";
  const siteName = (site && !isDbDown(site) && (site as any).site_name) || "IINM";

  const seoTitle = course.seo_title || course.title;
  const seoDesc = course.seo_description || course.description || "";
  const ogImage = course.thumbnail_url || undefined;

  return {
    title: seoTitle,
    description: seoDesc,
    keywords: course.seo_keywords || undefined,
    alternates: {
      canonical: `${baseUrl}/courses/${slug}`,
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

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [course, faqs, site] = await Promise.all([
    fetchCourse(slug),
    fetchCourseFaqs(slug),
    serverFetch("/settings/site", REVALIDATE),
  ]);

  if (!course) {
    notFound();
  }

  const baseUrl = (site && !isDbDown(site) && (site as any).canonical_base_url)
    ? (site as any).canonical_base_url.replace(/\/$/, "")
    : "https://iinmedu.com";
  const siteName = (site && !isDbDown(site) && (site as any).site_name) || "IINM";

  // ── Course JSON-LD schema ──
  const courseSchema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.seo_title || course.title,
    description: course.seo_description || course.description || "",
    url: `${baseUrl}/courses/${slug}`,
  };
  if (course.thumbnail_url) {
    courseSchema.image = course.thumbnail_url;
  }
  // Provider
  courseSchema.provider = {
    "@type": "Organization",
    name: siteName,
    url: baseUrl,
  };
  // Offers (pricing)
  if (course.price != null) {
    const price = course.discount_price != null ? course.discount_price : course.price;
    courseSchema.offers = {
      "@type": "Offer",
      price: String(price),
      priceCurrency: course.currency || "INR",
    };
    if (course.is_free) {
      courseSchema.offers = { "@type": "Offer", price: "0", priceCurrency: course.currency || "INR" };
    }
  }
  // Has Course Instance
  courseSchema.hasCourseInstance = {
    "@type": "CourseInstance",
    courseMode: "online",
  };
  // Instructors
  if (course.instructors && course.instructors.length > 0) {
    courseSchema.hasCourseInstance.instructor = course.instructors.slice(0, 3).map((inst: any) => ({
      "@type": "Person",
      name: inst.name,
      ...(inst.social_linkedin ? { sameAs: inst.social_linkedin } : {}),
    }));
  }

  // ── FAQPage JSON-LD schema (AEO) ──
  // Merge structured CourseFaq (from /faqs endpoint) with extended.faqs
  let allFaqs: any[] = [];
  if (Array.isArray(faqs) && faqs.length > 0) {
    allFaqs = faqs;
  } else if (course.extended?.faqs && Array.isArray(course.extended.faqs)) {
    allFaqs = course.extended.faqs;
  }
  const faqSchema = allFaqs.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: allFaqs.map((f: any) => ({
          "@type": "Question",
          name: f.question || f.q || "",
          acceptedAnswer: { "@type": "Answer", text: f.answer || f.a || "" },
        })),
      }
    : null;

  // ── Breadcrumb JSON-LD ──
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
      { "@type": "ListItem", position: 2, name: "Courses", item: `${baseUrl}/courses` },
      { "@type": "ListItem", position: 3, name: course.title, item: `${baseUrl}/courses/${slug}` },
    ],
  };

  return (
    <>
      <JsonLd data={faqSchema ? [courseSchema, faqSchema, breadcrumbSchema] : [courseSchema, breadcrumbSchema]} />
      <CourseDetailClient slug={slug} initialData={course} />
    </>
  );
}
