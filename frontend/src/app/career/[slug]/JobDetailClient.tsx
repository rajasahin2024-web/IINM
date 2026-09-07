"use client";

import React, { useState } from "react";
import Link from "next/link";
import ApplyModal from "../ApplyModal";
import "./job-detail.css";

interface JobPost {
  id: number;
  category_id: number | null;
  category_name: string | null;
  category_slug: string | null;
  position_id: number | null;
  position_title: string | null;
  title: string;
  slug: string;
  featured_image_url: string | null;
  company_name: string | null;
  company_logo_url: string | null;
  summary: string | null;
  description: string | null;
  requirements: string | null;
  responsibilities: string | null;
  location: string | null;
  job_type: string;
  experience_min: number | null;
  experience_max: number | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  vacancies: number;
  application_deadline: string | null;
  is_featured: boolean;
  is_pinned?: boolean;
  published_at: string | null;
  tags?: string[];
  application_type?: string;
  external_apply_url?: string | null;
}

interface JobDetailClientProps {
  job: JobPost;
}

function formatSalaryLPA(min?: number | null, max?: number | null, currency = "INR"): string | null {
  if (!min && !max) return null;
  const currSymbol = currency === "INR" ? "₹" : currency;
  const toLakhs = (val: number) => {
    if (val >= 100000) return (val / 100000).toFixed(val % 100000 === 0 ? 0 : 1);
    return (val / 1000).toFixed(0) + "k";
  };
  if (min && max) return `${currSymbol}${toLakhs(min)} - ${toLakhs(max)} LPA`;
  if (min) return `${currSymbol}${toLakhs(min)}+ LPA`;
  if (max) return `Up to ${currSymbol}${toLakhs(max)} LPA`;
  return null;
}

export default function JobDetailClient({ job }: JobDetailClientProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const isExternal = job.application_type === "external" && Boolean(job.external_apply_url);
  const handleApplyAction = () => {
    if (isExternal && job.external_apply_url) {
      window.open(job.external_apply_url, "_blank", "noopener,noreferrer");
    } else {
      setModalOpen(true);
    }
  };

  const salaryText = formatSalaryLPA(job.salary_min, job.salary_max, job.salary_currency);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const jobTypeLabels: Record<string, string> = {
    full_time: "Full-time",
    part_time: "Part-time",
    contract: "Contract",
    internship: "Internship",
    remote: "Remote",
  };

  return (
    <div className="cr-detail-root">
      {/* Breadcrumb Bar */}
      <div className="cr-detail-breadcrumb-bar">
        <div className="cr-detail-container">
          <nav className="cr-detail-breadcrumb-wrap" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="cr-bc-sep">/</span>
            <Link href="/career">Careers</Link>
            {job.category_name && (
              <>
                <span className="cr-bc-sep">/</span>
                <span>{job.category_name}</span>
              </>
            )}
            <span className="cr-bc-sep">/</span>
            <span className="cr-bc-current">{job.title}</span>
          </nav>
        </div>
      </div>

      {/* Clean Editorial Detail Hero */}
      <section className="cr-detail-hero">
        <div className="cr-detail-container">
          <div className="cr-detail-hero-inner">
            <div className="cr-detail-hero-left">
              <div className="cr-detail-badges-row">
                {job.category_name && (
                  <span className="cr-detail-cat-badge">{job.category_name}</span>
                )}
                {job.company_name && job.company_name !== "IINM" && (
                  <span className="cr-detail-partner-badge">{job.company_name}</span>
                )}
                <span style={{ fontSize: 12, color: "#64748b", background: "#f1f5f9", padding: "4px 10px", borderRadius: 6, fontWeight: 500 }}>
                  {jobTypeLabels[job.job_type] || job.job_type}
                </span>
                {job.is_pinned && (
                  <span
                    style={{
                      fontSize: 12,
                      color: "#92400e",
                      background: "#fef3c7",
                      border: "1px solid #fde68a",
                      padding: "4px 10px",
                      borderRadius: 6,
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    📌 Pinned Opening
                  </span>
                )}
                {job.is_featured && (
                  <span className="cr-detail-featured-badge">★ Featured Role</span>
                )}
                {isExternal && (
                  <span style={{ fontSize: 12, color: "#7e22ce", background: "#faf5ff", border: "1px solid #f3e8ff", padding: "4px 10px", borderRadius: 6, fontWeight: 600 }}>
                    Official External Portal ↗
                  </span>
                )}
              </div>

              <h1 className="cr-detail-title">{job.title}</h1>

              <div className="cr-detail-meta-list">
                <div className="cr-detail-meta-item">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>{job.location || "On-campus / Multiple Locations"}</span>
                </div>

                <div className="cr-detail-meta-item">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>Experience: {job.experience_min ?? 0}{job.experience_max ? ` - ${job.experience_max}` : "+"} yrs</span>
                </div>

                {job.vacancies > 0 && (
                  <div className="cr-detail-meta-item">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span>{job.vacancies} {job.vacancies === 1 ? "Opening" : "Openings"}</span>
                  </div>
                )}

                {salaryText && (
                  <div className="cr-detail-meta-item" style={{ fontWeight: 600, color: "#0a1628" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="1" x2="12" y2="23" />
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                    <span>{salaryText}</span>
                  </div>
                )}
              </div>

              {/* Tag Chips */}
              {job.tags && job.tags.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
                  {job.tags.map((tag, idx) => (
                    <Link
                      key={idx}
                      href={`/career?tag=${encodeURIComponent(tag)}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        background: "#f1f5f9",
                        color: "#0369a1",
                        border: "1px solid #e2e8f0",
                        fontSize: 12,
                        fontWeight: 600,
                        padding: "4px 10px",
                        borderRadius: 14,
                        textDecoration: "none",
                        transition: "all 0.15s ease",
                      }}
                      title={`Filter careers for ${tag}`}
                    >
                      <span>#{tag}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="cr-detail-hero-actions">
              <button type="button" className="cr-btn-detail-apply" onClick={handleApplyAction}>
                <span>{isExternal ? "Apply on Official Portal" : "Apply for this Position"}</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {isExternal ? (
                    <>
                      <line x1="7" y1="17" x2="17" y2="7" />
                      <polyline points="7 7 17 7 17 17" />
                    </>
                  ) : (
                    <>
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </>
                  )}
                </svg>
              </button>
              <button type="button" className="cr-btn-detail-share" onClick={handleShare}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                <span>{copied ? "Link Copied!" : "Share"}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Workspace */}
      <section className="cr-detail-workspace">
        <div className="cr-detail-container">
          <div className="cr-detail-main-wrap">
            {/* Left Content Column */}
            <article className="cr-detail-content-card">
              {job.featured_image_url && (
                <div className="cr-detail-image-banner">
                  <img src={job.featured_image_url} alt={job.title} />
                </div>
              )}

              {job.summary && (
                <div className="cr-detail-block">
                  <h2 className="cr-detail-block-title">Position Overview</h2>
                  <p className="cr-detail-text" style={{ fontSize: "15px", color: "#1e293b", lineHeight: 1.7 }}>
                    {job.summary}
                  </p>
                </div>
              )}

              {job.responsibilities && (
                <div className="cr-detail-block">
                  <h2 className="cr-detail-block-title">Key Responsibilities</h2>
                  <div className="cr-detail-text">{job.responsibilities}</div>
                </div>
              )}

              {job.requirements && (
                <div className="cr-detail-block">
                  <h2 className="cr-detail-block-title">Qualifications & Requirements</h2>
                  <div className="cr-detail-text">{job.requirements}</div>
                </div>
              )}

              {job.description && (
                <div className="cr-detail-block">
                  <h2 className="cr-detail-block-title">Detailed Description</h2>
                  <div className="cr-detail-text">{job.description}</div>
                </div>
              )}

              <div style={{ marginTop: 36, paddingTop: 24, borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 4px", color: "#0f172a" }}>
                    Interested in joining our team?
                  </h3>
                  <p style={{ fontSize: 13.5, color: "#64748b", margin: 0 }}>
                    Submit your application online. Our HR team reviews applications on a rolling basis.
                  </p>
                </div>
                <button type="button" className="cr-btn-detail-apply" onClick={handleApplyAction}>
                  <span>{isExternal ? "Apply on Official Portal ↗" : "Apply Now"}</span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </div>
            </article>

            {/* Right Sticky Sidebar */}
            <aside className="cr-detail-sidebar">
              {/* Job Snapshot Card */}
              <div className="cr-detail-snapshot-card">
                <h3 className="cr-detail-snapshot-title">Job Summary</h3>
                <div className="cr-detail-snapshot-list">
                  <div className="cr-detail-snap-row">
                    <span className="cr-detail-snap-label">Job Role:</span>
                    <span className="cr-detail-snap-val">{job.title}</span>
                  </div>

                  {job.category_name && (
                    <div className="cr-detail-snap-row">
                      <span className="cr-detail-snap-label">Category:</span>
                      <span className="cr-detail-snap-val">{job.category_name}</span>
                    </div>
                  )}

                  {job.position_title && (
                    <div className="cr-detail-snap-row">
                      <span className="cr-detail-snap-label">Department:</span>
                      <span className="cr-detail-snap-val">{job.position_title}</span>
                    </div>
                  )}

                  <div className="cr-detail-snap-row">
                    <span className="cr-detail-snap-label">Employment:</span>
                    <span className="cr-detail-snap-val">{jobTypeLabels[job.job_type] || job.job_type}</span>
                  </div>

                  <div className="cr-detail-snap-row">
                    <span className="cr-detail-snap-label">Experience:</span>
                    <span className="cr-detail-snap-val">
                      {job.experience_min ?? 0}{job.experience_max ? ` - ${job.experience_max}` : "+"} yrs
                    </span>
                  </div>

                  <div className="cr-detail-snap-row">
                    <span className="cr-detail-snap-label">Location:</span>
                    <span className="cr-detail-snap-val">{job.location || "Multiple"}</span>
                  </div>

                  {salaryText && (
                    <div className="cr-detail-snap-row">
                      <span className="cr-detail-snap-label">Remuneration:</span>
                      <span className="cr-detail-snap-val salary">{salaryText}</span>
                    </div>
                  )}

                  {job.vacancies > 0 && (
                    <div className="cr-detail-snap-row">
                      <span className="cr-detail-snap-label">Vacancies:</span>
                      <span className="cr-detail-snap-val">{job.vacancies}</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="cr-btn-detail-apply"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={handleApplyAction}
                >
                  <span>{isExternal ? "Apply on Official Portal ↗" : "Apply with CV"}</span>
                </button>
              </div>

              {/* Organization Info Card */}
              <div className="cr-detail-company-card">
                <h4 className="cr-detail-company-name">
                  {job.company_name || "Indian Institute of Nursing & Paramedical"}
                </h4>
                <p className="cr-detail-company-desc">
                  An academic healthcare institution committed to educational excellence, clinical training, hands-on hospital mentorship, and career readiness.
                </p>
                <Link
                  href="/about-iinm"
                  style={{ fontSize: "13px", color: "#0a1628", fontWeight: 500, textDecoration: "underline" }}
                >
                  Learn more about our institution →
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Application Modal */}
      <ApplyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        selectedJob={job}
        allJobs={[job]}
      />
    </div>
  );
}
