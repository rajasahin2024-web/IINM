import type { MetadataRoute } from "next";
import { serverFetch } from "@/lib/serverFetch";

// ── Revalidation: 1 hour ──
const REVALIDATE = 3600;

// Static pages that should always be in the sitemap
const STATIC_PAGES: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" | "yearly" | "always" | "hourly" | "never" }[] = [
  { path: "", priority: 1.0, changeFrequency: "daily" },
  { path: "/courses", priority: 0.9, changeFrequency: "daily" },
  { path: "/blog", priority: 0.8, changeFrequency: "daily" },
  { path: "/about-us", priority: 0.6, changeFrequency: "monthly" },
  { path: "/about-iinm", priority: 0.6, changeFrequency: "monthly" },
  { path: "/contact-us", priority: 0.6, changeFrequency: "monthly" },
  { path: "/career", priority: 0.7, changeFrequency: "weekly" },
];

function getBaseUrl(site: any): string {
  if (site?.canonical_base_url) return site.canonical_base_url.replace(/\/$/, "");
  return "https://iinmedu.com";
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch site settings + courses + blogs + static pages in parallel
  const [site, coursesData, blogsData, pagesData] = await Promise.all([
    serverFetch("/settings/site", REVALIDATE),
    serverFetch("/public/courses?limit=1000", REVALIDATE),
    serverFetch("/blogs?status=published&limit=1000", REVALIDATE),
    serverFetch("/pages/published", REVALIDATE),
  ]);

  const baseUrl = getBaseUrl(site && !("__dbDown" in site) ? site : null);

  const entries: MetadataRoute.Sitemap = [];

  // ── Static pages ──
  for (const page of STATIC_PAGES) {
    entries.push({
      url: `${baseUrl}${page.path}`,
      lastModified: new Date(),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    });
  }

  // ── Courses ──
  if (coursesData && !("__dbDown" in coursesData) && Array.isArray(coursesData.items)) {
    for (const course of coursesData.items) {
      if (!course.slug) continue;
      entries.push({
        url: `${baseUrl}/courses/${course.slug}`,
        lastModified: course.updated_at ? new Date(course.updated_at) : new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  }

  // ── Blog posts ──
  if (blogsData && !("__dbDown" in blogsData) && Array.isArray(blogsData.items)) {
    for (const post of blogsData.items) {
      if (!post.slug) continue;
      entries.push({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: post.updated_at || post.published_at
          ? new Date(post.updated_at || post.published_at!)
          : new Date(),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }

  // ── Static pages ──
  if (pagesData && !("__dbDown" in pagesData) && Array.isArray(pagesData)) {
    for (const pg of pagesData) {
      if (!pg.slug) continue;
      entries.push({
        url: `${baseUrl}/page/${pg.slug}`,
        lastModified: pg.updated_at ? new Date(pg.updated_at) : new Date(),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  }

  return entries;
}
