"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PublicNavbar from "@/components/PublicNavbar";
import PublicFooter from "@/components/PublicFooter";
import JsonLd from "@/components/JsonLd";
import ApplyModal from "./ApplyModal";
import { BASE_URL as API } from "@/lib/config";
import "./career.css";

/* ── Hero Grid + Mouse Spotlight (replicated from course-details) ── */
function HeroGridSpotlight() {
  const spotlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hero = spotlightRef.current?.parentElement;
    const spot = spotlightRef.current;
    if (!hero || !spot) return;

    const handleMouse = (e: MouseEvent) => {
      const rect = hero.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      spot.style.setProperty("--mouse-x", `${x}px`);
      spot.style.setProperty("--mouse-y", `${y}px`);
      spot.style.opacity = "1";
    };
    const handleLeave = () => {
      spot.style.opacity = "0";
    };

    hero.addEventListener("mousemove", handleMouse);
    hero.addEventListener("mouseleave", handleLeave);
    return () => {
      hero.removeEventListener("mousemove", handleMouse);
      hero.removeEventListener("mouseleave", handleLeave);
    };
  }, []);

  return (
    <>
      <div className="cr-hero-grid-bg" />
      <div ref={spotlightRef} className="cr-hero-grid-spotlight" />
    </>
  );
}

/* ── 3 Arches Geometric SVG Illustration ── */
function ArchesIllustration() {
  return (
    <div className="cr-arches-wrap">
      <svg
        className="cr-arches-svg"
        viewBox="0 0 340 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Arch 1 (Left) */}
        <path d="M20 220V90C20 45.8172 55.8172 10 100 10C144.183 10 180 45.8172 180 90V220" stroke="#0f172a" strokeWidth="2.5" />
        <path d="M38 220V90C38 55.7594 65.7594 28 100 28C134.241 28 162 55.7594 162 90V220" stroke="#0f172a" strokeWidth="1.5" />
        {/* Arch 1 Ribs */}
        <line x1="100" y1="10" x2="100" y2="28" stroke="#0f172a" strokeWidth="1.5" />
        <line x1="75" y1="14" x2="79" y2="31" stroke="#0f172a" strokeWidth="1.5" />
        <line x1="52" y1="24" x2="60" y2="40" stroke="#0f172a" strokeWidth="1.5" />
        <line x1="34" y1="42" x2="46" y2="54" stroke="#0f172a" strokeWidth="1.5" />
        <line x1="24" y1="65" x2="39" y2="72" stroke="#0f172a" strokeWidth="1.5" />
        <line x1="125" y1="14" x2="121" y2="31" stroke="#0f172a" strokeWidth="1.5" />
        <line x1="148" y1="24" x2="140" y2="40" stroke="#0f172a" strokeWidth="1.5" />
        <line x1="166" y1="42" x2="154" y2="54" stroke="#0f172a" strokeWidth="1.5" />
        <line x1="176" y1="65" x2="161" y2="72" stroke="#0f172a" strokeWidth="1.5" />
        {/* Vertical Hatching Arch 1 */}
        <line x1="20" y1="110" x2="38" y2="110" stroke="#0f172a" strokeWidth="1.2" />
        <line x1="20" y1="130" x2="38" y2="130" stroke="#0f172a" strokeWidth="1.2" />
        <line x1="20" y1="150" x2="38" y2="150" stroke="#0f172a" strokeWidth="1.2" />
        <line x1="20" y1="170" x2="38" y2="170" stroke="#0f172a" strokeWidth="1.2" />
        <line x1="20" y1="190" x2="38" y2="190" stroke="#0f172a" strokeWidth="1.2" />
        <line x1="20" y1="210" x2="38" y2="210" stroke="#0f172a" strokeWidth="1.2" />

        <line x1="162" y1="110" x2="180" y2="110" stroke="#0f172a" strokeWidth="1.2" />
        <line x1="162" y1="130" x2="180" y2="130" stroke="#0f172a" strokeWidth="1.2" />
        <line x1="162" y1="150" x2="180" y2="150" stroke="#0f172a" strokeWidth="1.2" />
        <line x1="162" y1="170" x2="180" y2="170" stroke="#0f172a" strokeWidth="1.2" />
        <line x1="162" y1="190" x2="180" y2="190" stroke="#0f172a" strokeWidth="1.2" />
        <line x1="162" y1="210" x2="180" y2="210" stroke="#0f172a" strokeWidth="1.2" />

        {/* Arch 2 (Middle) */}
        <path d="M100 220V90C100 45.8172 135.817 10 180 10C224.183 10 260 45.8172 260 90V220" stroke="#0f172a" strokeWidth="2.5" />
        <path d="M118 220V90C118 55.7594 145.759 28 180 28C214.241 28 242 55.7594 242 90V220" stroke="#0f172a" strokeWidth="1.5" />
        {/* Arch 2 Ribs */}
        <line x1="180" y1="10" x2="180" y2="28" stroke="#0f172a" strokeWidth="1.5" />
        <line x1="155" y1="14" x2="159" y2="31" stroke="#0f172a" strokeWidth="1.5" />
        <line x1="132" y1="24" x2="140" y2="40" stroke="#0f172a" strokeWidth="1.5" />
        <line x1="205" y1="14" x2="201" y2="31" stroke="#0f172a" strokeWidth="1.5" />
        <line x1="228" y1="24" x2="220" y2="40" stroke="#0f172a" strokeWidth="1.5" />
        <line x1="246" y1="42" x2="234" y2="54" stroke="#0f172a" strokeWidth="1.5" />
        <line x1="256" y1="65" x2="241" y2="72" stroke="#0f172a" strokeWidth="1.5" />
        {/* Vertical Hatching Arch 2 */}
        <line x1="242" y1="110" x2="260" y2="110" stroke="#0f172a" strokeWidth="1.2" />
        <line x1="242" y1="130" x2="260" y2="130" stroke="#0f172a" strokeWidth="1.2" />
        <line x1="242" y1="150" x2="260" y2="150" stroke="#0f172a" strokeWidth="1.2" />
        <line x1="242" y1="170" x2="260" y2="170" stroke="#0f172a" strokeWidth="1.2" />
        <line x1="242" y1="190" x2="260" y2="190" stroke="#0f172a" strokeWidth="1.2" />
        <line x1="242" y1="210" x2="260" y2="210" stroke="#0f172a" strokeWidth="1.2" />

        {/* Arch 3 (Right) */}
        <path d="M180 220V90C180 45.8172 215.817 10 260 10C304.183 10 340 45.8172 340 90V220" stroke="#0f172a" strokeWidth="2.5" />
        <path d="M198 220V90C198 55.7594 225.759 28 260 28C294.241 28 322 55.7594 322 90V220" stroke="#0f172a" strokeWidth="1.5" />
        {/* Arch 3 Ribs */}
        <line x1="260" y1="10" x2="260" y2="28" stroke="#0f172a" strokeWidth="1.5" />
        <line x1="285" y1="14" x2="281" y2="31" stroke="#0f172a" strokeWidth="1.5" />
        <line x1="308" y1="24" x2="300" y2="40" stroke="#0f172a" strokeWidth="1.5" />
        <line x1="326" y1="42" x2="314" y2="54" stroke="#0f172a" strokeWidth="1.5" />
        <line x1="336" y1="65" x2="321" y2="72" stroke="#0f172a" strokeWidth="1.5" />
        {/* Vertical Hatching Arch 3 */}
        <line x1="322" y1="110" x2="340" y2="110" stroke="#0f172a" strokeWidth="1.2" />
        <line x1="322" y1="130" x2="340" y2="130" stroke="#0f172a" strokeWidth="1.2" />
        <line x1="322" y1="150" x2="340" y2="150" stroke="#0f172a" strokeWidth="1.2" />
        <line x1="322" y1="170" x2="340" y2="170" stroke="#0f172a" strokeWidth="1.2" />
        <line x1="322" y1="190" x2="340" y2="190" stroke="#0f172a" strokeWidth="1.2" />
        <line x1="322" y1="210" x2="340" y2="210" stroke="#0f172a" strokeWidth="1.2" />
      </svg>
    </div>
  );
}

/* ── Default 6 Perks (matching the reference image) ── */
const DEFAULT_PERKS = [
  {
    title: "Own Your Work",
    description: "Enjoy full freedom to take charge and take risks in your role.",
    iconBg: "#f3e8ff",
    iconColor: "#9333ea",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    title: "Healthcare and Welfare",
    description: "Benefit from top-tier health insurance and a dedicated support facilitator.",
    iconBg: "#fef3c7",
    iconColor: "#d97706",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    title: "Goodies and Gadgets",
    description: "Get complimentary gadgets and goodies to make work enjoyable.",
    iconBg: "#e0f2fe",
    iconColor: "#0284c7",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    title: "Delicious Daily Meals",
    description: "Enjoy freshly prepared meals daily, crafted to bring the comfort of home.",
    iconBg: "#ffe4e6",
    iconColor: "#e11d48",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" />
        <line x1="10" y1="1" x2="10" y2="4" />
        <line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    ),
  },
  {
    title: "Free-flowing Resources",
    description: "Access premium resources, whether it's a laptop or specialized tools.",
    iconBg: "#d1fae5",
    iconColor: "#059669",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" />
      </svg>
    ),
  },
  {
    title: "Flexible Leave Policy",
    description: "Take time off whenever needed—no questions asked.",
    iconBg: "#ffedd5",
    iconColor: "#ea580c",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    ),
  },
];

interface JobPost {
  id: number;
  position_id: number | null;
  position_title: string | null;
  title: string;
  slug: string;
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
  is_featured: boolean;
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
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [expMin, setExpMin] = useState<string>("");
  const [expMax, setExpMax] = useState<string>("");
  const [activeExpMin, setActiveExpMin] = useState<number | null>(null);
  const [activeExpMax, setActiveExpMax] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");

  // Accordion toggle states
  const [openExpAccordion, setOpenExpAccordion] = useState(true);
  const [openLocAccordion, setOpenLocAccordion] = useState(true);
  const [openDeptAccordion, setOpenDeptAccordion] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalJob, setModalJob] = useState<JobPost | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/career/settings`).then(r => (r.ok ? r.json() : {})).catch(() => ({})),
      fetch(`${API}/api/career/jobs`).then(r => (r.ok ? r.json() : [])).catch(() => []),
    ]).then(([s, j]) => {
      setSettings(s || {});
      const list = Array.isArray(j) ? j : [];
      setJobs(list);

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

  // Open apply modal for a specific job
  const handleApplyJob = (job: JobPost) => {
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
    setSelectedLocation("all");
    setSelectedDepartment("all");
  };

  // Filtered Jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = j.title.toLowerCase().includes(q);
        const matchLoc = (j.location || "").toLowerCase().includes(q);
        const matchPos = (j.position_title || "").toLowerCase().includes(q);
        const matchSummary = (j.summary || "").toLowerCase().includes(q);
        if (!matchTitle && !matchLoc && !matchPos && !matchSummary) return false;
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
    });
  }, [jobs, searchQuery, selectedLocation, selectedDepartment, activeExpMin, activeExpMax]);

  // Render Job Tags
  const renderJobTags = (j: JobPost) => {
    const tags: string[] = [];
    if (j.job_type === "full_time") tags.push("Full-time");
    else if (j.job_type === "part_time") tags.push("Part-time");
    else if (j.job_type === "remote") tags.push("Remote");
    else if (j.job_type === "internship") tags.push("Internship");
    else if (j.job_type === "contract") tags.push("Contract");

    if (j.title.toLowerCase().includes("ai") || j.title.toLowerCase().includes("llm") || j.title.toLowerCase().includes("genai")) tags.push("GenAI / LLMs");
    if (j.title.toLowerCase().includes("professor") || j.title.toLowerCase().includes("faculty")) tags.push("Teaching");
    if (j.title.toLowerCase().includes("sales") || j.title.toLowerCase().includes("bda") || j.title.toLowerCase().includes("counsellor")) tags.push("EdTech Sales");
    if (j.title.toLowerCase().includes("data") || j.title.toLowerCase().includes("engineer")) tags.push("Data Engineering");
    if (j.title.toLowerCase().includes("compiler") || j.title.toLowerCase().includes("automata")) tags.push("Systems / LLVM");

    return tags.slice(0, 3);
  };

  interface PerkItem {
    title: string;
    description: string;
    iconBg: string;
    iconColor: string;
    icon: React.ReactNode;
  }

  // Perks list (from settings or default)
  const displayPerks: PerkItem[] = useMemo(() => {
    if (settings.perks && Array.isArray(settings.perks) && settings.perks.length > 0) {
      return settings.perks.map((p: any, idx: number) => {
        const defaultMatch = DEFAULT_PERKS[idx % DEFAULT_PERKS.length];
        return {
          title: p.title || defaultMatch.title,
          description: p.description || defaultMatch.description,
          iconBg: defaultMatch.iconBg,
          iconColor: defaultMatch.iconColor,
          icon: defaultMatch.icon,
        };
      });
    }
    return DEFAULT_PERKS;
  }, [settings.perks]);

  // JSON-LD structured data
  const jobLd = jobs.map(j => ({
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: j.title,
    description: j.summary || j.description || "",
    employmentType: j.job_type.toUpperCase(),
    jobLocationType: j.job_type === "remote" ? "TELECOMMUTE" : undefined,
    hiringOrganization: { "@type": "Organization", name: "IINM" },
  })).filter(j => j.title);

  return (
    <div className="cr-page-root">
      {jobLd.length > 0 && <JsonLd data={jobLd} />}
      <PublicNavbar />

      {/* ────────────────────────────────────────────────────────
          1. HERO SECTION (Aligned with Navbar width)
          ──────────────────────────────────────────────────────── */}
      <section className="cr-hero-section">
        <HeroGridSpotlight />
        <div className="cr-hero-container">
          {/* Left Hero Column */}
          <div className="cr-hero-left">
            <div className="cr-hero-eyebrow">
              {settings.hero_eyebrow || "COME BE PART OF THE"}
            </div>
            <h1 className="cr-hero-title">
              {settings.hero_title ? (
                settings.hero_title
              ) : (
                <>revolution<span className="cr-title-accent">.</span></>
              )}
            </h1>

            {/* Arches Graphic */}
            <ArchesIllustration />
          </div>

          {/* Right Perks Grid (6 Benefit Cards) */}
          <div className="cr-perks-grid">
            {displayPerks.map((perk, index) => (
              <div key={index} className="cr-perk-card">
                <div className="cr-perk-icon-box" style={{ background: perk.iconBg, color: perk.iconColor }}>
                  {perk.icon}
                </div>
                <div className="cr-perk-body">
                  <h4 className="cr-perk-title">{perk.title}</h4>
                  <p className="cr-perk-desc">{perk.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────
          2. CURRENT OPENINGS SECTION (Navbar aligned width)
          ──────────────────────────────────────────────────────── */}
      <section className="cr-openings-section" id="openings">
        <div className="cr-openings-container">
          {/* Header */}
          <div className="cr-section-header-center">
            <span className="cr-section-badge">OPPORTUNITIES AT IINM</span>
            <h2 className="cr-section-title-large">Current Openings</h2>
            <p className="cr-section-subtitle-center">
              Explore open roles across faculty, admissions, tech labs, and student operations. Join our growing mission.
            </p>
          </div>

          {/* Search & Reset Bar */}
          <div className="cr-search-bar-wrap">
            <div className="cr-search-input-box">
              <span className="cr-search-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="text"
                className="cr-search-input"
                placeholder="Search by job role, keywords, skills, or location..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="cr-btn-reset" onClick={handleResetAll}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              <span>Reset</span>
            </button>
          </div>

          {/* Results count bar */}
          <div className="cr-results-count-bar">
            <div className="cr-results-count">
              <span>{filteredJobs.length}</span> {filteredJobs.length === 1 ? "opening" : "openings"} found
            </div>
          </div>

          {/* Main 2-Col Layout: Left Filters + Right Jobs Grid */}
          <div className="cr-main-layout">
            {/* Left Sidebar Filters */}
            <aside className="cr-sidebar-filters">
              {/* Experience Filter */}
              <div className="cr-filter-block">
                <div className="cr-filter-title" onClick={() => setOpenExpAccordion(!openExpAccordion)}>
                  <span>By Experience (in Years)</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: openExpAccordion ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>

                {openExpAccordion && (
                  <div>
                    <div className="cr-exp-inputs-row">
                      <input
                        type="number"
                        min="0"
                        className="cr-exp-input"
                        placeholder="Min Exp"
                        value={expMin}
                        onChange={e => setExpMin(e.target.value)}
                      />
                      <span className="cr-exp-to-text">to</span>
                      <input
                        type="number"
                        min="0"
                        className="cr-exp-input"
                        placeholder="Max Exp"
                        value={expMax}
                        onChange={e => setExpMax(e.target.value)}
                      />
                    </div>

                    <div className="cr-exp-btn-row">
                      <button type="button" className="cr-btn-filter-reset" onClick={resetExpFilter}>
                        RESET
                      </button>
                      <button type="button" className="cr-btn-filter-apply" onClick={applyExpFilter}>
                        APPLY
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Location Filter */}
              {locationCounts.length > 0 && (
                <div className="cr-filter-block">
                  <div className="cr-filter-title" onClick={() => setOpenLocAccordion(!openLocAccordion)}>
                    <span>Location</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: openLocAccordion ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>

                  {openLocAccordion && (
                    <div className="cr-filter-list">
                      <label className={`cr-filter-item ${selectedLocation === "all" ? "is-selected" : ""}`}>
                        <div className="cr-filter-radio-left">
                          <input
                            type="radio"
                            name="locFilter"
                            className="cr-filter-checkbox"
                            checked={selectedLocation === "all"}
                            onChange={() => setSelectedLocation("all")}
                          />
                          <span>All Locations</span>
                        </div>
                        <span className="cr-filter-count-badge">{jobs.length}</span>
                      </label>
                      {locationCounts.map(({ loc, count }) => (
                        <label key={loc} className={`cr-filter-item ${selectedLocation === loc ? "is-selected" : ""}`}>
                          <div className="cr-filter-radio-left">
                            <input
                              type="radio"
                              name="locFilter"
                              className="cr-filter-checkbox"
                              checked={selectedLocation === loc}
                              onChange={() => setSelectedLocation(loc)}
                            />
                            <span>{loc}</span>
                          </div>
                          <span className="cr-filter-count-badge">{count}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Department / Position Filter */}
              {departmentCounts.length > 0 && (
                <div className="cr-filter-block">
                  <div className="cr-filter-title" onClick={() => setOpenDeptAccordion(!openDeptAccordion)}>
                    <span>Department / Role</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: openDeptAccordion ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>

                  {openDeptAccordion && (
                    <div className="cr-filter-list">
                      <label className={`cr-filter-item ${selectedDepartment === "all" ? "is-selected" : ""}`}>
                        <div className="cr-filter-radio-left">
                          <input
                            type="radio"
                            name="deptFilter"
                            className="cr-filter-checkbox"
                            checked={selectedDepartment === "all"}
                            onChange={() => setSelectedDepartment("all")}
                          />
                          <span>All Departments</span>
                        </div>
                        <span className="cr-filter-count-badge">{jobs.length}</span>
                      </label>
                      {departmentCounts.map(({ dept, count }) => (
                        <label key={dept} className={`cr-filter-item ${selectedDepartment === dept ? "is-selected" : ""}`}>
                          <div className="cr-filter-radio-left">
                            <input
                              type="radio"
                              name="deptFilter"
                              className="cr-filter-checkbox"
                              checked={selectedDepartment === dept}
                              onChange={() => setSelectedDepartment(dept)}
                            />
                            <span>{dept}</span>
                          </div>
                          <span className="cr-filter-count-badge">{count}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Clear Filters */}
              <button className="cr-clear-all-link" onClick={handleResetAll}>
                Clear all filters
              </button>
            </aside>

            {/* Right Jobs Grid */}
            <div className="cr-jobs-grid">
              {loading ? (
                <div className="cr-empty-state-box">
                  <div className="cr-empty-icon">
                    <div className="cr-spinner" style={{ borderColor: "rgba(29,78,216,0.3)", borderTopColor: "#1d4ed8" }} />
                  </div>
                  <h4 className="cr-empty-title">Loading Openings...</h4>
                  <p className="cr-empty-desc">Fetching the latest career positions from IINM.</p>
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="cr-empty-state-box">
                  <div className="cr-empty-icon">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </div>
                  <h4 className="cr-empty-title">No matching openings found</h4>
                  <p className="cr-empty-desc">
                    Try adjusting your search criteria, clearing filters, or submit an Open Application with your CV.
                  </p>
                  <button className="cr-btn-primary" onClick={handleOpenGeneralApply} style={{ padding: "10px 24px" }}>
                    Submit Open Application
                  </button>
                </div>
              ) : (
                filteredJobs.map(job => {
                  const salaryText = formatSalaryLPA(job.salary_min, job.salary_max, job.salary_currency);
                  return (
                    <div key={job.id} className="cr-job-card">
                      <div className="cr-job-card-top">
                        {job.position_title ? (
                          <span className="cr-job-dept-badge">{job.position_title}</span>
                        ) : (
                          <span />
                        )}
                        {job.is_featured && <span className="cr-job-badge-featured">Featured</span>}
                      </div>

                      <h3 className="cr-job-title" title={job.title}>
                        {job.title}
                      </h3>

                      <div className="cr-job-meta-row">
                        <div className="cr-job-meta-item">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          <span>
                            Experience : {job.experience_min ?? 0}{job.experience_max ? ` - ${job.experience_max}` : "+"} years
                          </span>
                        </div>

                        <div className="cr-job-meta-item">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          <span>
                            Location : {job.location || "Multiple Locations"}
                          </span>
                        </div>

                        {salaryText && (
                          <div className="cr-job-salary-badge">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="12" y1="1" x2="12" y2="23" />
                              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                            </svg>
                            <span>{salaryText}</span>
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      <div className="cr-job-tags-wrap">
                        {renderJobTags(job).map((tag, i) => (
                          <span key={i} className="cr-tag-pill">
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Apply Button */}
                      <div className="cr-job-card-footer">
                        <button className="cr-btn-apply-card" onClick={() => handleApplyJob(job)}>
                          <span>Apply Now</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────
          3. BOTTOM OPEN APPLICATION BANNER (Navbar aligned width)
          ──────────────────────────────────────────────────────── */}
      <section className="cr-open-banner-section">
        <div className="cr-open-banner-card">
          <div className="cr-open-banner-left">
            <div className="cr-open-banner-eyebrow">
              {settings.open_form_title || "DON'T SEE THE RIGHT ROLE?"}
            </div>
            <h2 className="cr-open-banner-title">
              {settings.open_form_subtitle || "Submit an Open Application with your CV"}
            </h2>
            <p className="cr-open-banner-desc">
              We are constantly scouting exceptional talent across faculty, AI engineering, academic administration, and growth. Share your profile and we will get in touch when a matching vacancy opens up.
            </p>
          </div>
          <div className="cr-open-banner-right">
            <button className="cr-btn-banner-apply" onClick={handleOpenGeneralApply}>
              Apply with CV
            </button>
          </div>
        </div>
      </section>

      <PublicFooter />

      {/* ────────────────────────────────────────────────────────
          4. APPLY NOW MODAL (POPUP with SLIM SCROLLER)
          ──────────────────────────────────────────────────────── */}
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
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#f8fafc", padding: 40, textAlign: "center", color: "#64748b" }}>Loading careers...</div>}>
      <CareerPageContent />
    </Suspense>
  );
}
