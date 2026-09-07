import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicNavbar from "@/components/PublicNavbar";
import PublicFooter from "@/components/PublicFooter";
import JsonLd from "@/components/JsonLd";
import JobDetailClient from "./JobDetailClient";
import { serverFetch, isDbDown } from "@/lib/serverFetch";

const REVALIDATE = 120; // 2 minutes

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [jobData, site] = await Promise.all([
    serverFetch(`/career/jobs/${slug}`, REVALIDATE),
    serverFetch("/settings/site", REVALIDATE),
  ]);

  if (!jobData || isDbDown(jobData)) {
    return {
      title: "Career Opportunity | IINM",
      description: "Explore career opportunities and job openings at IINM.",
    };
  }

  const siteName = (site && !isDbDown(site) && (site as any).site_name) || "IINM";
  const baseUrl = (site && !isDbDown(site) && (site as any).canonical_base_url)
    ? (site as any).canonical_base_url.replace(/\/$/, "")
    : "https://iinmedu.com";

  const title = `${jobData.title} | Careers at ${siteName}`;
  const description =
    jobData.summary ||
    (jobData.description ? jobData.description.slice(0, 160) : `Apply for ${jobData.title} at ${siteName}.`);
  const ogImage = jobData.featured_image_url || `${baseUrl}/og-career.jpg`;
  const pageUrl = `${baseUrl}/career/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: "article",
      siteName,
      images: [{ url: ogImage, width: 1200, height: 630, alt: jobData.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function JobDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [job, site] = await Promise.all([
    serverFetch(`/career/jobs/${slug}`, REVALIDATE),
    serverFetch("/settings/site", REVALIDATE),
  ]);

  if (!job || isDbDown(job) || job.detail === "Job post not found") {
    notFound();
  }

  const baseUrl = (site && !isDbDown(site) && (site as any).canonical_base_url)
    ? (site as any).canonical_base_url.replace(/\/$/, "")
    : "https://iinmedu.com";

  // Rich Schema.org JobPosting structured data for Google Jobs & AI Engines (AEO)
  const jobSchema: any = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description || job.summary || job.title,
    identifier: {
      "@type": "PropertyValue",
      name: job.company_name || "IINM",
      value: `IINM-JOB-${job.id}`,
    },
    datePosted: job.published_at || job.created_at || new Date().toISOString(),
    validThrough: job.application_deadline ? `${job.application_deadline}T23:59:59Z` : undefined,
    employmentType: (job.job_type || "FULL_TIME").toUpperCase(),
    hiringOrganization: {
      "@type": "Organization",
      name: job.company_name || "Indian Institute of Nursing & Management (IINM)",
      sameAs: baseUrl,
      logo: job.company_logo_url || `${baseUrl}/logo.png`,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location || "Kolkata",
        addressRegion: "WB",
        addressCountry: "IN",
      },
    },
    image: job.featured_image_url || undefined,
  };

  if (job.salary_min || job.salary_max) {
    jobSchema.baseSalary = {
      "@type": "MonetaryAmount",
      currency: job.salary_currency || "INR",
      value: {
        "@type": "QuantitativeValue",
        minValue: job.salary_min || undefined,
        maxValue: job.salary_max || undefined,
        unitText: "YEAR",
      },
    };
  }

  if (job.experience_min !== null || job.experience_max !== null) {
    jobSchema.experienceRequirements = {
      "@type": "OccupationalExperienceRequirements",
      monthsOfExperience: (job.experience_min ?? 0) * 12,
    };
  }

  // Breadcrumb schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Careers",
        item: `${baseUrl}/career`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: job.title,
        item: `${baseUrl}/career/${job.slug}`,
      },
    ],
  };

  return (
    <div className="cr-detail-root">
      <JsonLd data={[jobSchema, breadcrumbSchema]} />
      <PublicNavbar />
      <JobDetailClient job={job} />
      <PublicFooter />
    </div>
  );
}
