import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PublicNavbar from "../components/PublicNavbar";
import HeroSlider from "../components/HeroSlider";
import PartnerSection from "../components/PartnerSection";
import CourseCategoriesSection from "../components/CourseCategoriesSection";
import AIEcosystemSection from "../components/AIEcosystemSection";
import RecentlyLaunchedCourses from "../components/RecentlyLaunchedCourses";
import FounderDeskSection from "../components/FounderDeskSection";
import StudentReelsSection from "../components/StudentReelsSection";
import TrustedLearnersSection from "../components/TrustedLearnersSection";
import PublicFooter from "../components/PublicFooter";
import LazySection from "../components/LazySection";
import AnimatedCTASection from "../components/AnimatedCTASection";
import BlogSection from "../components/BlogSection";
import { serverFetch, isDbDown } from "@/lib/serverFetch";
import JsonLd from "@/components/JsonLd";
import "./home.css";

// ── Revalidation: 5 minutes for all homepage content ──
const REVALIDATE = 300;

// ── Parallel server-side fetch of ALL homepage section data ──
async function fetchHomeData() {
  const [
    site,
    hero,
    partners,
    categories,
    aiSection,
    aiCards,
    recentCourses,
    recentCourseCards,
    founderDesk,
    studentReels,
    learnerReviews,
    ctaSection,
    navbar,
    footerMenu,
    contactSettings,
    blogPosts,
  ] = await Promise.all([
    serverFetch("/settings/site", REVALIDATE),
    serverFetch("/settings/hero", REVALIDATE),
    serverFetch("/settings/partners", REVALIDATE),
    serverFetch("/settings/home-categories", REVALIDATE),
    serverFetch("/settings/ai-ecosystem-section", REVALIDATE),
    serverFetch("/settings/ai-ecosystem-cards", REVALIDATE),
    serverFetch("/settings/home-recent-courses", REVALIDATE),
    serverFetch("/settings/home-recent-course-cards", REVALIDATE),
    serverFetch("/settings/founder-desk", REVALIDATE),
    serverFetch("/settings/student-reels", REVALIDATE),
    serverFetch("/settings/learner-reviews", REVALIDATE),
    serverFetch("/settings/cta-section", REVALIDATE),
    serverFetch("/settings/navbar", REVALIDATE),
    serverFetch("/settings/footer-menu", REVALIDATE),
    serverFetch("/contact/settings", REVALIDATE),
    serverFetch("/blogs?status=published&limit=6", REVALIDATE),
  ]);

  // If ANY fetch indicates DB is down, redirect to maintenance
  if (
    isDbDown(site) ||
    isDbDown(hero) ||
    isDbDown(partners) ||
    isDbDown(categories) ||
    isDbDown(aiSection) ||
    isDbDown(aiCards) ||
    isDbDown(recentCourses) ||
    isDbDown(recentCourseCards) ||
    isDbDown(founderDesk) ||
    isDbDown(studentReels) ||
    isDbDown(learnerReviews) ||
    isDbDown(ctaSection) ||
    isDbDown(navbar) ||
    isDbDown(footerMenu) ||
    isDbDown(contactSettings) ||
    isDbDown(blogPosts)
  ) {
    redirect("/maintenance");
  }

  return {
    site,
    hero: hero?.content ?? null,
    partners: partners?.content ?? null,
    categories,
    aiSection,
    aiCards,
    recentCourses,
    recentCourseCards,
    founderDesk,
    studentReels,
    learnerReviews,
    ctaSection,
    navbar,
    footerMenu,
    contactSettings,
    blogPosts,
  };
}

// ── SEO metadata from DB site settings + SeoPageMeta override ──
export async function generateMetadata(): Promise<Metadata> {
  const [site, pageMeta] = await Promise.all([
    serverFetch("/settings/site", REVALIDATE),
    serverFetch("/seo/pages/home", REVALIDATE),
  ]);
  if (isDbDown(site) || !site) {
    return {
      title: "IINM",
      description: "AI-Powered Connected Learning Platform",
    };
  }
  const baseUrl = site.canonical_base_url
    ? site.canonical_base_url.replace(/\/$/, "")
    : "https://iinmedu.com";
  const ogImage = (pageMeta && !isDbDown(pageMeta) && pageMeta.og_image_url)
    ? pageMeta.og_image_url
    : (site.og_image_url || undefined);
  return {
    title: (pageMeta && !isDbDown(pageMeta) && pageMeta.seo_title) || site.site_name || "IINM",
    description: (pageMeta && !isDbDown(pageMeta) && pageMeta.seo_description) || site.meta_description || "AI-Powered Connected Learning Platform",
    alternates: {
      canonical: `${baseUrl}/`,
    },
    openGraph: {
      title: (pageMeta && !isDbDown(pageMeta) && pageMeta.seo_title) || site.site_name || "IINM",
      description: (pageMeta && !isDbDown(pageMeta) && pageMeta.seo_description) || site.meta_description || "",
      siteName: site.site_name || "IINM",
      images: ogImage ? [{ url: ogImage }] : undefined,
      type: "website",
    },
  };
}

export default async function Home() {
  const data = await fetchHomeData();

  // ── JSON-LD structured data for SEO ──
  const site = data.site;
  const baseUrl = site?.canonical_base_url
    ? site.canonical_base_url.replace(/\/$/, "")
    : "https://iinmedu.com";
  const siteName = site?.site_name || "IINM";
  const orgSchema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: siteName,
    url: baseUrl,
    description: site?.meta_description || "AI-Powered Connected Learning Platform",
  };
  if (site?.logo_url) {
    orgSchema.logo = { "@type": "ImageObject", url: site.logo_url.startsWith("http") ? site.logo_url : `${baseUrl}${site.logo_url}` };
  }
  // Parse organization_schema override if set
  const seoSite = await serverFetch("/seo/site", REVALIDATE);
  if (seoSite && !isDbDown(seoSite) && (seoSite as any).organization_schema) {
    try {
      const custom = JSON.parse((seoSite as any).organization_schema);
      Object.assign(orgSchema, custom);
    } catch {
      // keep default
    }
  }
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: baseUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${baseUrl}/courses?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <div className="hp-root" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ── SEO JSON-LD ── */}
      <JsonLd data={[orgSchema, websiteSchema]} />
      {/* ── IMMEDIATE (Above-the-fold) ── */}
      <PublicNavbar
        initialSiteSettings={data.site}
        initialNavbarItems={data.navbar}
        initialContactSettings={data.contactSettings}
      />
      <HeroSlider initialData={data.hero} />
      <PartnerSection initialData={data.partners} />

      {/* ── LAZY (Below-the-fold, load when scrolled near viewport) ── */}
      <LazySection fallbackHeight={500}>
        <CourseCategoriesSection initialData={data.categories} />
      </LazySection>

      <LazySection fallbackHeight={1200}>
        <AIEcosystemSection
          initialSection={data.aiSection}
          initialCards={data.aiCards}
        />
      </LazySection>

      <LazySection fallbackHeight={600}>
        <RecentlyLaunchedCourses
          initialSection={data.recentCourses?.section}
          initialCards={data.recentCourseCards}
        />
      </LazySection>

      <LazySection fallbackHeight={700}>
        <FounderDeskSection initialData={data.founderDesk?.section} />
      </LazySection>

      <LazySection fallbackHeight={700}>
        <StudentReelsSection
          initialSection={data.studentReels?.section}
          initialReels={data.studentReels?.reels}
        />
      </LazySection>

      <LazySection fallbackHeight={500}>
        <TrustedLearnersSection
          initialSection={data.learnerReviews?.section}
          initialReviews={data.learnerReviews?.reviews}
        />
      </LazySection>

      <LazySection fallbackHeight={500}>
        <AnimatedCTASection initialData={data.ctaSection} />
      </LazySection>

      <LazySection fallbackHeight={600}>
        <BlogSection initialData={data.blogPosts?.items} />
      </LazySection>

      <LazySection fallbackHeight={400}>
        <PublicFooter
          initialSiteSettings={data.site}
          initialFooterMenu={data.footerMenu}
          initialContactSettings={data.contactSettings}
        />
      </LazySection>
    </div>
  );
}
