"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import PublicNavbar from "@/components/PublicNavbar";
import PublicFooter from "@/components/PublicFooter";
import JsonLd from "@/components/JsonLd";
import ApplyModal from "./ApplyModal";
import JobDetailModal from "./JobDetailModal";
import { BASE_URL as API } from "@/lib/config";
import "./career.css";

interface CareerCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  badge_color: string | null;
  job_count: number;
}

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
  application_deadline?: string | null;
  is_featured: boolean;
  is_pinned?: boolean;
  tags?: string[];
  application_type?: string;
  external_apply_url?: string | null;
}

function formatSalaryLPA(min?: number | null, max?: number | null, currency = "INR"): string | null {
  if (!min && !max) return null;
  const currSymbol = currency === "INR" ? "₹" : currency;
  const toLakhs = (val: number) => {
    if (val >= 100000) return (val / 100000).toFixed(val % 100000 === 0 ? 0 : 1);
    return (val / 1000).toFixed(0) + "k";
  };
  if (min && max) {
    return `${currSymbol}${toLakhs(min)} - ${toLakhs(max)} LPA`;
  }
  if (min) return `${currSymbol}${toLakhs(min)}+ LPA`;
  if (max) return `Up to ${currSymbol}${toLakhs(max)} LPA`;
  return null;
}

function CareerPageContent() {
  const params = useSearchParams();
  const [settings, setSettings] = useState<any>({});
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [categories, setCategories] = useState<CareerCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expMin, setExpMin] = useState<string>("");
  const [expMax, setExpMax] = useState<string>("");
  const [activeExpMin, setActiveExpMin] = useState<number | null>(null);
  const [activeExpMax, setActiveExpMax] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedJobType, setSelectedJobType] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Accordion toggle states
  const [openTagAccordion, setOpenTagAccordion] = useState(true);
  const [openExpAccordion, setOpenExpAccordion] = useState(true);
  const [openLocAccordion, setOpenLocAccordion] = useState(true);
  const [openDeptAccordion, setOpenDeptAccordion] = useState(true);
  const [openTypeAccordion, setOpenTypeAccordion] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalJob, setModalJob] = useState<JobPost | null>(null);
  const [detailModalJob, setDetailModalJob] = useState<JobPost | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/career/settings`).then(r => (r.ok ? r.json() : {})).catch(() => ({})),
      fetch(`${API}/api/career/jobs`).then(r => (r.ok ? r.json() : [])).catch(() => []),
      fetch(`${API}/api/career/categories`).then(r => (r.ok ? r.json() : [])).catch(() => []),
    ]).then(([s, j, c]) => {
      setSettings(s || {});
      const list = Array.isArray(j) ? j : [];
      setJobs(list);
      setCategories(Array.isArray(c) ? c : []);

      // Check URL for ?category=<slug>
      const catParam = params.get("category");
      if (catParam) {
        setSelectedCategory(catParam);
      }

      // Check URL for ?tag=<tag>
      const tagParam = params.get("tag");
      if (tagParam) {
        setSelectedTag(tagParam);
      }

      // Check URL for ?job=<slug> or #apply
      const jobSlug = params.get("job");
      if (jobSlug && list.length > 0) {
        const found = list.find((x: JobPost) => x.slug === jobSlug);
        if (found) {
          setModalJob(found);
          setModalOpen(true);
        }
      } else if (typeof window !== "undefined" && window.location.hash === "#apply") {
        setModalJob(null);
        setModalOpen(true);
      }
      setLoading(false);
    });
  }, [params]);

  // Open apply modal for a specific job (or redirect if external)
  const handleApplyJob = (job: JobPost) => {
    if (job.application_type === "external" && job.external_apply_url) {
      window.open(job.external_apply_url, "_blank", "noopener,noreferrer");
      return;
    }
    setModalJob(job);
    setModalOpen(true);
  };

  // Open general application modal
  const handleOpenGeneralApply = () => {
    setModalJob(null);
    setModalOpen(true);
  };

  // Extract unique filter lists with item counts
  const locationCounts = useMemo(() => {
    const map = new Map<string, number>();
    jobs.forEach(j => {
      if (j.location && j.location.trim()) {
        const loc = j.location.trim();
        map.set(loc, (map.get(loc) || 0) + 1);
      }
    });
    return Array.from(map.entries()).map(([loc, count]) => ({ loc, count }));
  }, [jobs]);

  const departmentCounts = useMemo(() => {
    const map = new Map<string, number>();
    jobs.forEach(j => {
      if (j.position_title && j.position_title.trim()) {
        const dept = j.position_title.trim();
        map.set(dept, (map.get(dept) || 0) + 1);
      }
    });
    return Array.from(map.entries()).map(([dept, count]) => ({ dept, count }));
  }, [jobs]);

  const jobTypeCounts = useMemo(() => {
    const map = new Map<string, number>();
    jobs.forEach(j => {
      if (j.job_type && j.job_type.trim()) {
        const t = j.job_type.trim();
        map.set(t, (map.get(t) || 0) + 1);
      }
    });
    return Array.from(map.entries()).map(([t, count]) => ({ type: t, count }));
  }, [jobs]);

  const tagCounts = useMemo(() => {
    const map = new Map<string, number>();
    jobs.forEach(j => {
      (j.tags || []).forEach(t => {
        const clean = t.trim();
        if (clean) {
          map.set(clean, (map.get(clean) || 0) + 1);
        }
      });
    });
    return Array.from(map.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [jobs]);

  // Handle Experience Apply
  const applyExpFilter = () => {
    const minVal = expMin !== "" ? Number(expMin) : null;
    const maxVal = expMax !== "" ? Number(expMax) : null;
    setActiveExpMin(minVal);
    setActiveExpMax(maxVal);
  };

  const resetExpFilter = () => {
    setExpMin("");
    setExpMax("");
    setActiveExpMin(null);
    setActiveExpMax(null);
  };

  const handleResetAll = () => {
    setSearchQuery("");
    resetExpFilter();
    setSelectedCategory("all");
    setSelectedTag("all");
    setSelectedLocation("all");
    setSelectedDepartment("all");
    setSelectedJobType("all");
  };

  const hasActiveFilters = useMemo(() => {
    return (
      selectedCategory !== "all" ||
      selectedTag !== "all" ||
      searchQuery.trim() !== "" ||
      selectedLocation !== "all" ||
      selectedDepartment !== "all" ||
      selectedJobType !== "all" ||
      activeExpMin !== null ||
      activeExpMax !== null
    );
  }, [selectedCategory, selectedTag, searchQuery, selectedLocation, selectedDepartment, selectedJobType, activeExpMin, activeExpMax]);

  // Filtered Jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      // Dynamic Category Filter
      if (selectedCategory !== "all") {
        if (j.category_slug !== selectedCategory && String(j.category_id) !== selectedCategory) {
          return false;
        }
      }

      // Tag Filter
      if (selectedTag !== "all") {
        if (!j.tags || !j.tags.some(t => t.toLowerCase() === selectedTag.toLowerCase())) {
          return false;
        }
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = j.title.toLowerCase().includes(q);
        const matchLoc = (j.location || "").toLowerCase().includes(q);
        const matchPos = (j.position_title || "").toLowerCase().includes(q);
        const matchCat = (j.category_name || "").toLowerCase().includes(q);
        const matchComp = (j.company_name || "").toLowerCase().includes(q);
        const matchSummary = (j.summary || "").toLowerCase().includes(q);
        const matchTags = (j.tags || []).some(t => t.toLowerCase().includes(q));
        if (!matchTitle && !matchLoc && !matchPos && !matchCat && !matchComp && !matchSummary && !matchTags) return false;
      }

      // Location
      if (selectedLocation !== "all") {
        if (!j.location || j.location.toLowerCase() !== selectedLocation.toLowerCase()) {
          return false;
        }
      }

      // Department
      if (selectedDepartment !== "all") {
        if (!j.position_title || j.position_title.toLowerCase() !== selectedDepartment.toLowerCase()) {
          return false;
        }
      }

      // Job Type
      if (selectedJobType !== "all") {
        if (j.job_type !== selectedJobType) {
          return false;
        }
      }

      // Experience Filter
      if (activeExpMin !== null) {
        const jMax = j.experience_max ?? 99;
        if (jMax < activeExpMin) return false;
      }
      if (activeExpMax !== null) {
        const jMin = j.experience_min ?? 0;
        if (jMin > activeExpMax) return false;
      }

      return true;
    }).sort((a, b) => {
        // 1. Pinned jobs always stay at the top
        if (Boolean(a.is_pinned) !== Boolean(b.is_pinned)) {
          return a.is_pinned ? -1 : 1;
        }
        return 0;
      });
  }, [jobs, selectedCategory, selectedTag, searchQuery, selectedLocation, selectedDepartment, selectedJobType, activeExpMin, activeExpMax]);

  const formatJobType = (val: string) => {
    switch (val) {
      case "full_time": return "Full-time";
      case "part_time": return "Part-time";
      case "contract": return "Contract";
      case "remote": return "Remote";
      case "internship": return "Internship";
      default: return val.replace(/_/g, " ");
    }
  };

  // JSON-LD structured data for Google Jobs & AI Search Engines
  const jobLd = jobs.map(j => ({
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: j.title,
    description: j.summary || j.description || j.title,
    employmentType: j.job_type.toUpperCase(),
    jobLocationType: j.job_type === "remote" ? "TELECOMMUTE" : undefined,
    hiringOrganization: {
      "@type": "Organization",
      name: j.company_name || "IINM",
    },
    image: j.featured_image_url || undefined,
  })).filter(j => j.title);

  return (
    <div className="cr-page-root">
      {jobLd.length > 0 && <JsonLd data={jobLd} />}
      <PublicNavbar />

      {/* ────────────────────────────────────────────────────────
          1. CLEAN INSTITUTIONAL HERO (Aligned with 1400px Container)
          ──────────────────────────────────────────────────────── */}
      <section className="cr-hero-section">
        <div className="cr-container">
          <div className="cr-hero-inner">
            <div className="cr-hero-content">
              {/* Breadcrumbs */}
              <nav className="cr-breadcrumbs" aria-label="Breadcrumb">
                <Link href="/">Home</Link>
                <span className="cr-breadcrumbs-sep">/</span>
                <span className="cr-breadcrumbs-current">Careers</span>
              </nav>

              <h1 className="cr-hero-title">
                {settings.hero_title || "Career Opportunities"}
              </h1>
              <p className="cr-hero-subtitle">
                {settings.hero_subtitle ||
                  "Join our teaching faculty, clinical labs, administrative operations, and healthcare partner teams. Discover open positions and advance your professional journey."}
              </p>
            </div>

            <div className="cr-hero-meta-aside">
              <div className="cr-hero-stat-pill">
                <span className="num">{jobs.length}</span>
                <span className="lbl">Active Openings</span>
              </div>
              {categories.length > 0 && (
                <div className="cr-hero-stat-pill">
                  <span className="num">{categories.length}</span>
                  <span className="lbl">Disciplines</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────
          2. CATEGORY FILTER TABS BAR (Horizontal quick tabs)
          ──────────────────────────────────────────────────────── */}
      <div className="cr-cat-bar-wrap">
        <div className="cr-container">
          <div className="cr-cat-bar-scroll">
            <button
              type="button"
              className={`cr-cat-pill-btn ${selectedCategory === "all" ? "is-active" : ""}`}
              onClick={() => setSelectedCategory("all")}
            >
              <span>All Openings</span>
              <span className="cr-cat-count-badge">{jobs.length}</span>
            </button>

            {categories.map(cat => (
              <button
                key={cat.id}
                type="button"
                className={`cr-cat-pill-btn ${selectedCategory === cat.slug ? "is-active" : ""}`}
                onClick={() => setSelectedCategory(cat.slug)}
              >
                <span>{cat.name}</span>
                <span className="cr-cat-count-badge">{cat.job_count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────
          3. MAIN WORKSPACE: LEFT CONTENT + RIGHT FILTERS
          ──────────────────────────────────────────────────────── */}
      <section className="cr-workspace-section">
        <div className="cr-container">
          <div className="cr-main-layout">
            
            {/* ═══════════════════════════════════════════════════════
                LEFT COLUMN: Content (Jobs, Search, Grid/List Switcher)
                ═══════════════════════════════════════════════════════ */}
            <main className="cr-jobs-column">
              {/* Search & View Mode Header */}
              <div className="cr-content-topbar">
                <div className="cr-search-box">
                  <span className="cr-search-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    className="cr-search-input-field"
                    placeholder="Search by role title, keywords, skills, or location..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8", padding: 4 }}
                      title="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="cr-topbar-actions">
                  <div className="cr-results-summary">
                    Showing <strong>{filteredJobs.length}</strong> {filteredJobs.length === 1 ? "opening" : "openings"}
                  </div>

                  {/* Grid / List switcher */}
                  <div className="cr-view-switcher">
                    <button
                      type="button"
                      className={`cr-view-btn ${viewMode === "grid" ? "is-active" : ""}`}
                      onClick={() => setViewMode("grid")}
                      title="Grid view"
                      aria-label="Grid view"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className={`cr-view-btn ${viewMode === "list" ? "is-active" : ""}`}
                      onClick={() => setViewMode("list")}
                      title="List view"
                      aria-label="List view"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="8" y1="6" x2="21" y2="6" />
                        <line x1="8" y1="12" x2="21" y2="12" />
                        <line x1="8" y1="18" x2="21" y2="18" />
                        <line x1="3" y1="6" x2="3.01" y2="6" />
                        <line x1="3" y1="12" x2="3.01" y2="12" />
                        <line x1="3" y1="18" x2="3.01" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Filter Chips */}
              {hasActiveFilters && (
                <div className="cr-active-chips-bar">
                  <span className="cr-active-chips-label">Filters applied:</span>
                  {selectedCategory !== "all" && (
                    <span className="cr-active-filter-chip">
                      <span>Category: {categories.find(c => c.slug === selectedCategory)?.name || selectedCategory}</span>
                      <button type="button" className="cr-chip-remove-btn" onClick={() => setSelectedCategory("all")}>✕</button>
                    </span>
                  )}
                  {selectedTag !== "all" && (
                    <span className="cr-active-filter-chip">
                      <span>Tag: #{selectedTag}</span>
                      <button type="button" className="cr-chip-remove-btn" onClick={() => setSelectedTag("all")}>✕</button>
                    </span>
                  )}
                  {searchQuery && (
                    <span className="cr-active-filter-chip">
                      <span>&quot;{searchQuery}&quot;</span>
                      <button type="button" className="cr-chip-remove-btn" onClick={() => setSearchQuery("")}>✕</button>
                    </span>
                  )}
                  {selectedDepartment !== "all" && (
                    <span className="cr-active-filter-chip">
                      <span>Dept: {selectedDepartment}</span>
                      <button type="button" className="cr-chip-remove-btn" onClick={() => setSelectedDepartment("all")}>✕</button>
                    </span>
                  )}
                  {selectedLocation !== "all" && (
                    <span className="cr-active-filter-chip">
                      <span>Loc: {selectedLocation}</span>
                      <button type="button" className="cr-chip-remove-btn" onClick={() => setSelectedLocation("all")}>✕</button>
                    </span>
                  )}
                  {selectedJobType !== "all" && (
                    <span className="cr-active-filter-chip">
                      <span>Type: {formatJobType(selectedJobType)}</span>
                      <button type="button" className="cr-chip-remove-btn" onClick={() => setSelectedJobType("all")}>✕</button>
                    </span>
                  )}
                  {(activeExpMin !== null || activeExpMax !== null) && (
                    <span className="cr-active-filter-chip">
                      <span>Exp: {activeExpMin ?? 0} - {activeExpMax ?? "Any"} yrs</span>
                      <button type="button" className="cr-chip-remove-btn" onClick={resetExpFilter}>✕</button>
                    </span>
                  )}
                  <button type="button" className="cr-chip-clear-all" onClick={handleResetAll}>
                    Clear all
                  </button>
                </div>
              )}

              {/* Job Listings Grid / List */}
              <div className={`cr-jobs-grid ${viewMode === "list" ? "is-list-view" : ""}`}>
                {loading ? (
                  <div className="cr-empty-state-card" style={{ gridColumn: "1 / -1" }}>
                    <div className="cr-empty-icon">
                      <div style={{ width: 24, height: 24, border: "2px solid #e2e8f0", borderTopColor: "#0a1628", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    </div>
                    <h3 className="cr-empty-title">Loading positions...</h3>
                    <p className="cr-empty-desc">Fetching the latest career openings.</p>
                  </div>
                ) : filteredJobs.length === 0 ? (
                  <div className="cr-empty-state-card" style={{ gridColumn: "1 / -1" }}>
                    <div className="cr-empty-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </div>
                    <h3 className="cr-empty-title">No matching openings found</h3>
                    <p className="cr-empty-desc">
                      Try resetting your search query or filters. You can also submit an Open Application and we will reach out when a suitable position opens.
                    </p>
                    <button type="button" className="cr-empty-btn" onClick={handleOpenGeneralApply}>
                      Submit Open Application
                    </button>
                  </div>
                ) : (
                  filteredJobs.map(job => {
                    const salaryText = formatSalaryLPA(job.salary_min, job.salary_max, job.salary_currency);
                    return (
                      <article
                        key={job.id}
                        className={`cr-job-card ${job.application_type === "external" ? "cr-job-card-external" : "cr-job-card-internal"} ${job.is_pinned ? "is-pinned" : ""}`}
                      >
                        {/* Featured Image Thumbnail */}
                        <div className="cr-card-thumb-wrap">
                          {job.is_pinned && (
                            <div className="cr-pin-ribbon">
                              <span className="cr-pin-ribbon-icon">📌</span>
                              <span>Pinned Opening</span>
                            </div>
                          )}
                          {job.featured_image_url ? (
                            <img
                              src={job.featured_image_url}
                              alt={job.title}
                              className="cr-card-thumb-img"
                              loading="lazy"
                            />
                          ) : (
                            <div className="cr-card-thumb-fallback">
                              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                              </svg>
                            </div>
                          )}
                        </div>

                        <div className="cr-card-body">
                          {/* Distinct Application Type Banner Pill */}
                          <div style={{ marginBottom: 12 }}>
                            {job.application_type === "external" ? (
                              <span className="cr-type-indicator cr-type-external" title="Direct link to external official recruitment portal">
                                <span className="cr-type-dot" />
                                <span>External Portal Application</span>
                                <span style={{ fontSize: 12, marginLeft: 2 }}>↗</span>
                              </span>
                            ) : (
                              <span className="cr-type-indicator cr-type-internal" title="Direct on-campus application with IINM recruitment team">
                                <span className="cr-type-dot" />
                                <span>Direct Institute Application</span>
                                <span style={{ fontSize: 11, marginLeft: 2 }}>⚡</span>
                              </span>
                            )}
                          </div>

                          {/* Badges */}
                          <div className="cr-card-badge-row">
                            <div className="cr-card-badges-left">
                              {job.category_name && (
                                <span className="cr-badge-cat">{job.category_name}</span>
                              )}
                              {job.company_name && job.company_name !== "IINM" && (
                                <span className="cr-badge-partner">{job.company_name}</span>
                              )}
                              <span style={{ fontSize: 11.5, color: "#64748b", background: "#f1f5f9", padding: "3px 8px", borderRadius: 4, fontWeight: 500 }}>
                                {formatJobType(job.job_type)}
                              </span>
                            </div>
                            {job.is_featured && <span className="cr-badge-featured">★ Featured</span>}
                          </div>

                          {/* Title */}
                          <h2 className="cr-card-title">
                            <button
                              type="button"
                              onClick={() => setDetailModalJob(job)}
                              style={{ background: "none", border: "none", padding: 0, font: "inherit", color: "inherit", textAlign: "left", cursor: "pointer" }}
                            >
                              {job.title}
                            </button>
                          </h2>

                          {/* Excerpt / Summary */}
                          {job.summary && (
                            <p className="cr-card-desc">{job.summary}</p>
                          )}

                          {/* Role Tag Chips */}
                          {job.tags && job.tags.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "8px 0 12px 0" }}>
                              {job.tags.slice(0, 5).map((tag, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setSelectedTag(selectedTag === tag ? "all" : tag);
                                  }}
                                  style={{
                                    border: selectedTag === tag ? "1px solid #0284c7" : "1px solid #e2e8f0",
                                    background: selectedTag === tag ? "#0ea5e9" : "#f8fafc",
                                    color: selectedTag === tag ? "#ffffff" : "#475569",
                                    fontSize: 11,
                                    fontWeight: 600,
                                    padding: "2px 8px",
                                    borderRadius: 12,
                                    cursor: "pointer",
                                    transition: "all 0.15s ease",
                                  }}
                                  title={`Filter by tag: ${tag}`}
                                >
                                  #{tag}
                                </button>
                              ))}
                              {job.tags.length > 5 && (
                                <span style={{ fontSize: 11, color: "#94a3b8", alignSelf: "center" }}>
                                  +{job.tags.length - 5}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Meta Information */}
                          <div className="cr-card-meta-list">
                            <div className="cr-card-meta-item">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                              </svg>
                              <span>{job.location || "On-campus / Multiple Locations"}</span>
                            </div>

                            <div className="cr-card-meta-item">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                              <span>
                                {job.experience_min ?? 0}{job.experience_max ? ` - ${job.experience_max}` : "+"} yrs experience
                              </span>
                            </div>

                            {salaryText && (
                              <div className="cr-card-meta-item cr-card-salary">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <line x1="12" y1="1" x2="12" y2="23" />
                                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                </svg>
                                <span>{salaryText}</span>
                              </div>
                            )}
                          </div>

                          {/* Card Footer Actions */}
                          <div className="cr-card-footer">
                            <button
                              type="button"
                              className="cr-card-link-details"
                              onClick={() => setDetailModalJob(job)}
                              style={{ background: "none", border: "none", cursor: "pointer", font: "inherit", padding: 0 }}
                            >
                              <span>View details</span>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="9 18 15 12 9 6" />
                              </svg>
                            </button>

                            <button
                              type="button"
                              className="cr-card-btn-apply"
                              onClick={() => handleApplyJob(job)}
                              style={job.application_type === "external" ? { background: "#7e22ce" } : undefined}
                            >
                              <span>{job.application_type === "external" ? "Apply on Official Site" : "Apply Now"}</span>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                {job.application_type === "external" ? (
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
                      </article>
                    );
                  })
                )}
              </div>
            </main>

            {/* ═══════════════════════════════════════════════════════
                RIGHT COLUMN: Filters Sidebar (Sticky, Clean, Human)
                ═══════════════════════════════════════════════════════ */}
            <aside className="cr-sidebar-filters">
              <div className="cr-sidebar-card">
                <div className="cr-sidebar-header">
                  <h3 className="cr-sidebar-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                    </svg>
                    <span>Filter Positions</span>
                  </h3>
                  {hasActiveFilters && (
                    <button type="button" className="cr-sidebar-reset-btn" onClick={handleResetAll}>
                      Reset all
                    </button>
                  )}
                </div>

                {/* Filter Block 1: Categories */}
                {categories.length > 0 && (
                  <div className="cr-filter-group">
                    <div className="cr-filter-heading">
                      <span>Category</span>
                    </div>
                    <div className="cr-filter-list">
                      <label className={`cr-filter-radio-item ${selectedCategory === "all" ? "is-selected" : ""}`}>
                        <div className="cr-filter-label-left">
                          <input
                            type="radio"
                            name="category_filter"
                            className="cr-filter-radio"
                            checked={selectedCategory === "all"}
                            onChange={() => setSelectedCategory("all")}
                          />
                          <span className="cr-filter-text">All Categories</span>
                        </div>
                        <span className="cr-filter-count">{jobs.length}</span>
                      </label>
                      {categories.map(cat => (
                        <label key={cat.id} className={`cr-filter-radio-item ${selectedCategory === cat.slug ? "is-selected" : ""}`}>
                          <div className="cr-filter-label-left">
                            <input
                              type="radio"
                              name="category_filter"
                              className="cr-filter-radio"
                              checked={selectedCategory === cat.slug}
                              onChange={() => setSelectedCategory(cat.slug)}
                            />
                            <span className="cr-filter-text">{cat.name}</span>
                          </div>
                          <span className="cr-filter-count">{cat.job_count}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Filter Block: Specialization & Tags */}
                {tagCounts.length > 0 && (
                  <div className="cr-filter-group">
                    <div className="cr-filter-heading" onClick={() => setOpenTagAccordion(!openTagAccordion)}>
                      <span>Specialization Tags</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: openTagAccordion ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                    {openTagAccordion && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingTop: 4 }}>
                        <button
                          type="button"
                          onClick={() => setSelectedTag("all")}
                          style={{
                            border: selectedTag === "all" ? "1px solid #0284c7" : "1px solid #e2e8f0",
                            background: selectedTag === "all" ? "#f0f9ff" : "#ffffff",
                            color: selectedTag === "all" ? "#0284c7" : "#475569",
                            fontSize: 11.5,
                            fontWeight: selectedTag === "all" ? 600 : 500,
                            padding: "4px 10px",
                            borderRadius: 14,
                            cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                        >
                          All Tags
                        </button>
                        {tagCounts.map(({ tag, count }) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setSelectedTag(selectedTag === tag ? "all" : tag)}
                            style={{
                              border: selectedTag === tag ? "1px solid #0ea5e9" : "1px solid #e2e8f0",
                              background: selectedTag === tag ? "#0ea5e9" : "#ffffff",
                              color: selectedTag === tag ? "#ffffff" : "#334155",
                              fontSize: 11.5,
                              fontWeight: 500,
                              padding: "4px 10px",
                              borderRadius: 14,
                              cursor: "pointer",
                              transition: "all 0.15s",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <span>#{tag}</span>
                            <span style={{ fontSize: 10, opacity: selectedTag === tag ? 0.9 : 0.6 }}>{count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Filter Block 2: Department / Position Title */}
                {departmentCounts.length > 0 && (
                  <div className="cr-filter-group">
                    <div className="cr-filter-heading" onClick={() => setOpenDeptAccordion(!openDeptAccordion)}>
                      <span>Department</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: openDeptAccordion ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                    {openDeptAccordion && (
                      <div className="cr-filter-list">
                        <label className={`cr-filter-radio-item ${selectedDepartment === "all" ? "is-selected" : ""}`}>
                          <div className="cr-filter-label-left">
                            <input
                              type="radio"
                              name="dept_filter"
                              className="cr-filter-radio"
                              checked={selectedDepartment === "all"}
                              onChange={() => setSelectedDepartment("all")}
                            />
                            <span className="cr-filter-text">All Departments</span>
                          </div>
                          <span className="cr-filter-count">{jobs.length}</span>
                        </label>
                        {departmentCounts.map(({ dept, count }) => (
                          <label key={dept} className={`cr-filter-radio-item ${selectedDepartment === dept ? "is-selected" : ""}`}>
                            <div className="cr-filter-label-left">
                              <input
                                type="radio"
                                name="dept_filter"
                                className="cr-filter-radio"
                                checked={selectedDepartment === dept}
                                onChange={() => setSelectedDepartment(dept)}
                              />
                              <span className="cr-filter-text">{dept}</span>
                            </div>
                            <span className="cr-filter-count">{count}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Filter Block 3: Job Type */}
                {jobTypeCounts.length > 0 && (
                  <div className="cr-filter-group">
                    <div className="cr-filter-heading" onClick={() => setOpenTypeAccordion(!openTypeAccordion)}>
                      <span>Employment Type</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: openTypeAccordion ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                    {openTypeAccordion && (
                      <div className="cr-filter-list">
                        <label className={`cr-filter-radio-item ${selectedJobType === "all" ? "is-selected" : ""}`}>
                          <div className="cr-filter-label-left">
                            <input
                              type="radio"
                              name="type_filter"
                              className="cr-filter-radio"
                              checked={selectedJobType === "all"}
                              onChange={() => setSelectedJobType("all")}
                            />
                            <span className="cr-filter-text">All Types</span>
                          </div>
                          <span className="cr-filter-count">{jobs.length}</span>
                        </label>
                        {jobTypeCounts.map(({ type, count }) => (
                          <label key={type} className={`cr-filter-radio-item ${selectedJobType === type ? "is-selected" : ""}`}>
                            <div className="cr-filter-label-left">
                              <input
                                type="radio"
                                name="type_filter"
                                className="cr-filter-radio"
                                checked={selectedJobType === type}
                                onChange={() => setSelectedJobType(type)}
                              />
                              <span className="cr-filter-text">{formatJobType(type)}</span>
                            </div>
                            <span className="cr-filter-count">{count}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Filter Block 4: Location */}
                {locationCounts.length > 0 && (
                  <div className="cr-filter-group">
                    <div className="cr-filter-heading" onClick={() => setOpenLocAccordion(!openLocAccordion)}>
                      <span>Location</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: openLocAccordion ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                    {openLocAccordion && (
                      <div className="cr-filter-list">
                        <label className={`cr-filter-radio-item ${selectedLocation === "all" ? "is-selected" : ""}`}>
                          <div className="cr-filter-label-left">
                            <input
                              type="radio"
                              name="loc_filter"
                              className="cr-filter-radio"
                              checked={selectedLocation === "all"}
                              onChange={() => setSelectedLocation("all")}
                            />
                            <span className="cr-filter-text">All Locations</span>
                          </div>
                          <span className="cr-filter-count">{jobs.length}</span>
                        </label>
                        {locationCounts.map(({ loc, count }) => (
                          <label key={loc} className={`cr-filter-radio-item ${selectedLocation === loc ? "is-selected" : ""}`}>
                            <div className="cr-filter-label-left">
                              <input
                                type="radio"
                                name="loc_filter"
                                className="cr-filter-radio"
                                checked={selectedLocation === loc}
                                onChange={() => setSelectedLocation(loc)}
                              />
                              <span className="cr-filter-text">{loc}</span>
                            </div>
                            <span className="cr-filter-count">{count}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Filter Block 5: Experience */}
                <div className="cr-filter-group">
                  <div className="cr-filter-heading" onClick={() => setOpenExpAccordion(!openExpAccordion)}>
                    <span>Experience (Years)</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: openExpAccordion ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                  {openExpAccordion && (
                    <div className="cr-exp-filter-wrap">
                      <div className="cr-exp-inputs">
                        <input
                          type="number"
                          min="0"
                          max="50"
                          className="cr-exp-input"
                          placeholder="Min"
                          value={expMin}
                          onChange={e => setExpMin(e.target.value)}
                        />
                        <span className="cr-exp-sep">to</span>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          className="cr-exp-input"
                          placeholder="Max"
                          value={expMax}
                          onChange={e => setExpMax(e.target.value)}
                        />
                      </div>
                      <button type="button" className="cr-exp-btn-apply" onClick={applyExpFilter}>
                        Apply Experience Filter
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────
          4. BOTTOM OPEN APPLICATION BANNER (Clean Institutional Card)
          ──────────────────────────────────────────────────────── */}
      <section className="cr-bottom-banner-section">
        <div className="cr-container">
          <div className="cr-bottom-banner-card">
            <div className="cr-banner-left">
              <div className="cr-banner-eyebrow">
                {settings.open_form_title || "Can't find the right role?"}
              </div>
              <h2 className="cr-banner-title">
                {settings.open_form_subtitle || "Submit an Open Application with your CV"}
              </h2>
              <p className="cr-banner-desc">
                We are always seeking passionate educators, healthcare specialists, academic coordinators, and laboratory mentors. Submit your resume, and our recruitment team will reach out as matching vacancies arise.
              </p>
            </div>
            <div className="cr-banner-right">
              <button type="button" className="cr-banner-btn" onClick={handleOpenGeneralApply}>
                <span>Submit Your CV</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />

      {/* Full Job Details Modal */}
      <JobDetailModal
        open={Boolean(detailModalJob)}
        onClose={() => setDetailModalJob(null)}
        job={detailModalJob}
        onApply={handleApplyJob}
        formatSalaryLPA={formatSalaryLPA}
        formatJobType={formatJobType}
      />

      {/* Application Modal */}
      <ApplyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        selectedJob={modalJob}
        allJobs={jobs}
      />
    </div>
  );
}

export default function CareerPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#f8fafc" }} />}>
      <CareerPageContent />
    </Suspense>
  );
}
