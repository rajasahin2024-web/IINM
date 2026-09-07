"use client";

import React, { useEffect } from "react";
import Link from "next/link";

export interface JobPost {
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
  application_deadline?: string | null;
  is_featured: boolean;
  is_pinned?: boolean;
  tags?: string[];
  application_type?: string;
  external_apply_url?: string | null;
}

interface JobDetailModalProps {
  open: boolean;
  onClose: () => void;
  job: JobPost | null;
  onApply: (job: JobPost) => void;
  formatSalaryLPA: (min?: number | null, max?: number | null, currency?: string) => string | null;
  formatJobType: (val: string) => string;
}

export default function JobDetailModal({
  open,
  onClose,
  job,
  onApply,
  formatSalaryLPA,
  formatJobType,
}: JobDetailModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    if (open) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !job) return null;

  const isExternal = job.application_type === "external" && Boolean(job.external_apply_url);
  const salaryText = formatSalaryLPA(job.salary_min, job.salary_max, job.salary_currency);

  const formatBullets = (text: string | null | undefined) => {
    if (!text) return null;
    const lines = text
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return null;

    return (
      <ul style={{ margin: "8px 0 0", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
        {lines.map((line, idx) => {
          const cleanLine = line.replace(/^[•\-\*]\s*/, "");
          return (
            <li key={idx} style={{ color: "#334155", fontSize: 13.5, lineHeight: 1.6 }}>
              {cleanLine}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        background: "rgba(10, 22, 40, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        overflowY: "auto",
        animation: "crFadeIn 0.2s ease-out",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#ffffff",
          borderRadius: 16,
          maxWidth: 780,
          width: "100%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(10, 22, 40, 0.25)",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          position: "relative",
          animation: "crSlideUp 0.25s ease-out",
        }}
      >
        {/* Modal Top Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            background: "#fafbfd",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Badges Row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              {job.category_name && (
                <span
                  style={{
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    padding: "3px 8px",
                    borderRadius: 4,
                    fontSize: 11.5,
                    fontWeight: 600,
                  }}
                >
                  {job.category_name}
                </span>
              )}
              {job.company_name && job.company_name !== "IINM" && (
                <span
                  style={{
                    background: "#f0fdf4",
                    color: "#15803d",
                    border: "1px solid #dcfce7",
                    padding: "3px 8px",
                    borderRadius: 4,
                    fontSize: 11.5,
                    fontWeight: 500,
                  }}
                >
                  {job.company_name}
                </span>
              )}
              <span
                style={{
                  background: "#f1f5f9",
                  color: "#64748b",
                  padding: "3px 8px",
                  borderRadius: 4,
                  fontSize: 11.5,
                  fontWeight: 500,
                }}
              >
                {formatJobType(job.job_type)}
              </span>
              {isExternal ? (
                <span
                  style={{
                    background: "#faf5ff",
                    color: "#7e22ce",
                    border: "1px solid #f3e8ff",
                    padding: "3px 8px",
                    borderRadius: 4,
                    fontSize: 11.5,
                    fontWeight: 600,
                  }}
                >
                  Govt / Official Portal ↗
                </span>
              ) : (
                <span
                  style={{
                    background: "#f0fdf4",
                    color: "#166534",
                    border: "1px solid #bbf7d0",
                    padding: "3px 8px",
                    borderRadius: 4,
                    fontSize: 11.5,
                    fontWeight: 600,
                  }}
                >
                  Direct IINM Application
                </span>
              )}
              {job.is_pinned && (
                <span
                  style={{
                    background: "#fef3c7",
                    color: "#92400e",
                    border: "1px solid #fde68a",
                    padding: "3px 8px",
                    borderRadius: 4,
                    fontSize: 11.5,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  📌 Pinned Opening
                </span>
              )}
            </div>

            {/* Title */}
            <h2
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#0a1628",
                margin: 0,
                lineHeight: 1.35,
              }}
            >
              {job.title}
            </h2>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#f1f5f9",
              border: "none",
              width: 32,
              height: 32,
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#64748b",
              fontSize: 14,
              flexShrink: 0,
              transition: "all 0.15s",
            }}
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          {/* Key Metrics Snapshot Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 12,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              padding: "14px 16px",
              marginBottom: 20,
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Location</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", marginTop: 2 }}>
                {job.location || "Multiple Locations"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Experience</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", marginTop: 2 }}>
                {job.experience_min ?? 0}{job.experience_max ? ` - ${job.experience_max}` : "+"} yrs
              </div>
            </div>

            {salaryText && (
              <div>
                <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Remuneration</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0369a1", marginTop: 2 }}>
                  {salaryText}
                </div>
              </div>
            )}

            <div>
              <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Vacancies</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", marginTop: 2 }}>
                {job.vacancies} {job.vacancies === 1 ? "Opening" : "Openings"}
              </div>
            </div>
          </div>

          {/* Tags Chips */}
          {job.tags && job.tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
              {job.tags.map((t, idx) => (
                <span
                  key={idx}
                  style={{
                    background: "#f1f5f9",
                    color: "#475569",
                    border: "1px solid #e2e8f0",
                    fontSize: 11.5,
                    fontWeight: 600,
                    padding: "3px 9px",
                    borderRadius: 14,
                  }}
                >
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* Role Summary */}
          {job.summary && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", margin: "0 0 6px", fontWeight: 600 }}>
                Role Summary
              </h4>
              <p style={{ margin: 0, fontSize: 14, color: "#334155", lineHeight: 1.65 }}>
                {job.summary}
              </p>
            </div>
          )}

          {/* Key Responsibilities */}
          {job.responsibilities && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", margin: "0 0 6px", fontWeight: 600 }}>
                Key Responsibilities
              </h4>
              {formatBullets(job.responsibilities)}
            </div>
          )}

          {/* Requirements & Qualifications */}
          {job.requirements && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", margin: "0 0 6px", fontWeight: 600 }}>
                Qualifications & Eligibility
              </h4>
              {formatBullets(job.requirements)}
            </div>
          )}

          {/* Full Description */}
          {job.description && (
            <div style={{ marginBottom: 12 }}>
              <h4 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", margin: "0 0 6px", fontWeight: 600 }}>
                Institutional Background & Details
              </h4>
              <div style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.65, whiteSpace: "pre-line" }}>
                {job.description}
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Action Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #f1f5f9",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <Link
            href={`/career/${job.slug}`}
            style={{
              fontSize: 13,
              color: "#0a1628",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              textDecoration: "underline",
            }}
          >
            <span>Open Dedicated Job Page</span>
            <span>↗</span>
          </Link>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "9px 16px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#475569",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Close
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onApply(job);
              }}
              style={{
                padding: "9px 20px",
                borderRadius: 8,
                border: "none",
                background: isExternal ? "#7e22ce" : "#0a1628",
                color: "#ffffff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                boxShadow: isExternal ? "0 4px 12px rgba(126, 34, 206, 0.25)" : "0 4px 12px rgba(10, 22, 40, 0.2)",
              }}
            >
              <span>{isExternal ? "Apply on Official Site" : "Apply for Position"}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
          </div>
        </div>
      </div>
    </div>
  );
}
