"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import "./courses.css";
import "../home.css";
import PublicFooter from "@/components/PublicFooter";
import PublicNavbar from "@/components/PublicNavbar";
import CourseCard from "@/components/CourseCard";
import { BASE_URL } from "@/lib/config";

// ─── Interfaces ───────────────────────────────────────────
interface Course {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  price: number | null;
  discount_price: number | null;
  price_usd: number | null;
  discount_price_usd: number | null;
  is_free: boolean;
  currency: string;
  skill_level: string | null;
  instructor_name: string | null;
  instructors?: {id: number, name: string}[];
  is_featured: boolean;
  is_new: boolean;
  has_certificate?: boolean;
  is_featured_course?: boolean;
  promo_video_url?: string;
}

// ─── Inline icons (a11y: aria-label via title) ────────────
const Icon = {
  Search: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>,
  Filter: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>,
  Close: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  ArrowRight: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>,
  EmptySearch: () => <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>,
};

// ─── Scroll Reveal Hook ───────────────────────────────────
function useScrollReveal(deps: React.DependencyList) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("revealed"); }),
      { threshold: 0.12 }
    );
    const items = document.querySelectorAll(".reveal-item");
    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// ─── Featured spotlight card ──────────────────────────────
function FeaturedSpotlight({ course, baseUrl }: { course: Course | null; baseUrl: string }) {
  if (!course) return null;
  const isUsd = course.currency === "USD";
  const sym = isUsd ? "$" : "₹";
  const basePrice = isUsd ? (course.price_usd ?? course.price) : course.price;
  const discPrice = isUsd ? (course.discount_price_usd ?? course.discount_price) : course.discount_price;
  const hasDiscount = discPrice != null && discPrice < (basePrice ?? 0);
  const displayPrice = hasDiscount ? discPrice : basePrice;
  const instructorName = course.instructors && course.instructors.length > 0
    ? course.instructors.map(i => i.name).join(", ")
    : (course.instructor_name || "IINM");
  const thumb = course.thumbnail_url
    ? (course.thumbnail_url.startsWith("http") ? course.thumbnail_url : `${baseUrl}${course.thumbnail_url}`)
    : "";

  return (
    <Link href={`/courses/${course.slug}`} className="cc-spotlight" aria-label={`Featured course: ${course.title}`}>
      <div className="cc-spotlight-rule" />
      <div className="cc-spotlight-thumb">
        {thumb ? <img src={thumb} alt={course.title} /> : <div className="cc-thumb-placeholder" />}
      </div>
      <div className="cc-spotlight-body">
        <span className="cc-spotlight-tag">Featured this week</span>
        <h2 className="cc-spotlight-title">{course.title}</h2>
        <div className="cc-spotlight-meta">
          <span>{instructorName}</span>
          {course.skill_level && (<><span className="cc-trust-dot" /><span>{course.skill_level}</span></>)}
        </div>
        <div className="cc-spotlight-foot">
          <span className={`cc-spotlight-price ${course.is_free ? "cc-spotlight-price-free" : ""}`}>
            {course.is_free ? "Free" : displayPrice != null ? `${sym}${Number(displayPrice).toLocaleString()}` : "Contact us"}
          </span>
          <span className="cc-spotlight-cta">View course →</span>
        </div>
      </div>
    </Link>
  );
}

// ─── Hero grid spotlight (mouse-follow reveal) ────────────
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

  return <div ref={spotlightRef} className="cc-hero-grid-spotlight" />;
}

// ─── Main Page ────────────────────────────────────────────
export default function CoursesPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#fff" }} />}>
      <CoursesPageInner />
    </Suspense>
  );
}

function CoursesPageInner() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [publicInstructors, setPublicInstructors] = useState<{id: number, name: string}[]>([]);
  const [search, setSearch] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [baseUrl, setBaseUrl] = useState("");
  const [listView, setListView] = useState(false);
  const [wishlist, setWishlist] = useState<Set<number>>(new Set());
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  // Filters
  const [priceFilter, setPriceFilter] = useState("All");
  const [skillFilter, setSkillFilter] = useState("All");
  const [instructorFilter, setInstructorFilter] = useState("All");
  const [featureFilters, setFeatureFilters] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState("featured");

  // Mobile filter sheet
  const [sheetOpen, setSheetOpen] = useState(false);

  const searchParams = useSearchParams();

  // Auto-apply filter from URL param (e.g. ?price=discounted from homepage)
  useEffect(() => {
    const p = searchParams.get("price");
    if (p === "discounted") setPriceFilter("Discounted");
    else if (p === "free") setPriceFilter("Free");
  }, [searchParams]);

  // Load more (replaces pagination)
  const [visibleCount, setVisibleCount] = useState(9);
  const itemsPerPage = 9;

  // Site settings
  const [supportEmail, setSupportEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // Hydrate wishlist from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("iinm_wishlist");
      if (raw) {
        const ids = JSON.parse(raw) as number[];
        if (Array.isArray(ids)) setWishlist(new Set(ids));
      }
    } catch { /* ignore */ }
  }, []);

  // Persist wishlist
  useEffect(() => {
    try {
      localStorage.setItem("iinm_wishlist", JSON.stringify(Array.from(wishlist)));
    } catch { /* ignore */ }
  }, [wishlist]);

  useEffect(() => {
    const bUrl = BASE_URL;
    setBaseUrl(bUrl);
    fetch(`${bUrl}/api/settings/site`).then(r => r.json()).then(d => {
      setSupportEmail(d.support_email || "");
      setPhone(d.phone || "");
      setAddress(d.address || "");
    }).catch(() => {});
    fetch(`${bUrl}/api/public/courses`).then(r => r.json()).then(d => {
      setCourses(Array.isArray(d) ? d : []);
    }).catch(() => setCourses([])).finally(() => setLoading(false));

    fetch(`${bUrl}/api/public/instructors`).then(r => r.json()).then(d => {
      setPublicInstructors(Array.isArray(d) ? d : []);
    }).catch(() => {});
  }, []);

  const uniqueSkills = useMemo(
    () => Array.from(new Set(courses.map(c => c.skill_level).filter(Boolean) as string[])),
    [courses]
  );

  const toggleWishlist = useCallback((id: number) => {
    setWishlist(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleFeature = useCallback((key: string) => {
    setFeatureFilters(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const clearFilters = () => {
    setPriceFilter("All"); setSkillFilter("All"); setInstructorFilter("All");
    setFeatureFilters(new Set()); setSearch(""); setSortBy("featured");
  };

  const activeChips: { label: string; clear: () => void }[] = [];
  if (priceFilter !== "All") activeChips.push({ label: `Price: ${priceFilter}`, clear: () => setPriceFilter("All") });
  if (skillFilter !== "All") activeChips.push({ label: `Level: ${skillFilter}`, clear: () => setSkillFilter("All") });
  if (instructorFilter !== "All") activeChips.push({ label: `Instructor: ${instructorFilter}`, clear: () => setInstructorFilter("All") });
  if (search.trim()) activeChips.push({ label: `"${search}"`, clear: () => setSearch("") });
  featureFilters.forEach(f => activeChips.push({ label: f, clear: () => toggleFeature(f) }));

  const filtered = useMemo(() => {
    const result = courses.filter(c => {
      const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) || (c.description ?? "").toLowerCase().includes(search.toLowerCase());
      let matchPrice = true;
      if (priceFilter === "Free") matchPrice = c.is_free;
      if (priceFilter === "Paid") matchPrice = !c.is_free;
      if (priceFilter === "Discounted") matchPrice = !c.is_free && c.discount_price != null && c.discount_price < (c.price || 0);
      const matchSkill = skillFilter === "All" || c.skill_level === skillFilter;
      const matchInst = instructorFilter === "All" ||
        (c.instructors && c.instructors.length > 0
          ? c.instructors.some(i => i.name === instructorFilter)
          : (c.instructor_name || "IINM Team") === instructorFilter);
      let matchFeat = true;
      if (featureFilters.has("Certificate")) matchFeat = matchFeat && !!c.has_certificate;
      if (featureFilters.has("New")) matchFeat = matchFeat && !!c.is_new;
      if (featureFilters.has("Bestseller")) matchFeat = matchFeat && !!c.is_featured;
      return matchSearch && matchPrice && matchSkill && matchInst && matchFeat;
    });

    const isUsd = (c: Course) => c.currency === "USD";
    const priceOf = (c: Course) => {
      if (c.is_free) return 0;
      const base = isUsd(c) ? (c.price_usd ?? c.price) : c.price;
      const disc = isUsd(c) ? (c.discount_price_usd ?? c.discount_price) : c.discount_price;
      return (disc != null && disc < (base ?? 0) ? disc : base) ?? 0;
    };

    switch (sortBy) {
      case "newest": result.sort((a, b) => b.id - a.id); break;
      case "price-asc": result.sort((a, b) => priceOf(a) - priceOf(b)); break;
      case "price-desc": result.sort((a, b) => priceOf(b) - priceOf(a)); break;
      case "title": result.sort((a, b) => a.title.localeCompare(b.title)); break;
      default: result.sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || b.id - a.id);
    }
    return result;
  }, [courses, search, priceFilter, skillFilter, instructorFilter, featureFilters, sortBy]);

  // Reset visible count whenever filters/search/sort change
  useEffect(() => { setVisibleCount(itemsPerPage); }, [search, priceFilter, skillFilter, instructorFilter, featureFilters, sortBy]);

  useScrollReveal([filtered, listView, visibleCount]);

  const featuredCourse = useMemo(
    () => courses.find(c => c.is_featured) ?? courses[0] ?? null,
    [courses]
  );
  const popularNow = useMemo(
    () => courses.filter(c => c.is_featured).slice(0, 3),
    [courses]
  );

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  if (loading) {
    return (
      <div className="cc-root">
        <PublicNavbar />
        <div className="cc-skeleton cc-sk-hero"></div>
        <div className="cc-layout" style={{ paddingTop: 40 }}>
          <div className="cc-skeleton cc-sk-filter"></div>
          <div className="cc-grid">
            {[...Array(6)].map((_, i) => <div key={i} className="cc-skeleton cc-sk-card"></div>)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cc-root">

      {/* NAV */}
      <PublicNavbar />


      {/* HERO — editorial / clean (dark, grid + mouse spotlight) */}
      <section className="cc-hero">
        <div className="cc-hero-grid-bg" />
        <HeroGridSpotlight />
        <div className="cc-hero-inner">
          <div>
            <span className="cc-hero-eyebrow">Course catalog</span>
            <h1 className="cc-hero-title">
              Find the right course <br />for what&apos;s <span className="cc-hero-accent">next.</span>
            </h1>
            <p className="cc-hero-subtitle">
              Structured learning paths, real instructors, and a clear path from where you are to where you want to be.
            </p>

            <div className="cc-search-wrap">
              <span className="cc-search-icon"><Icon.Search /></span>
              <input
                type="text"
                className="cc-search"
                placeholder="Search by course, topic, or skill…"
                value={search}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                onChange={e => setSearch(e.target.value)}
                aria-label="Search courses"
              />
              {isSearchFocused && search.trim() && (
                <div className="cc-search-dropdown">
                  {filtered.length === 0 ? (
                    <div style={{ padding: "12px 16px", color: "#64748b", fontSize: 14 }}>No matching courses</div>
                  ) : (
                    filtered.slice(0, 5).map(c => (
                      <Link key={c.id} href={`/courses/${c.slug}`} className="cc-search-item">
                        <div style={{ width: 40, height: 32, borderRadius: 6, background: "#e2e8f4", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
                          {c.thumbnail_url ? <img src={c.thumbnail_url.startsWith("http") ? c.thumbnail_url : `${baseUrl}${c.thumbnail_url}`} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "📚"}
                        </div>
                        <div style={{ flex: 1, overflow: "hidden" }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#0a1628", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>
                            {c.instructors && c.instructors.length > 0 ? c.instructors.map(i => i.name).join(", ") : (c.instructor_name || "IINM")} • {c.skill_level || "Any Level"}
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="cc-hero-trust">
              <span><strong>{courses.length}</strong> courses</span>
              <span className="cc-trust-dot" />
              <span><strong>{publicInstructors.length}</strong> instructors</span>
            </div>
          </div>

          <FeaturedSpotlight course={featuredCourse} baseUrl={baseUrl} />
        </div>
      </section>

      {/* ACTIVE FILTER CHIPS */}
      {activeChips.length > 0 && (
        <div className="cc-chips-bar">
          <span className="cc-chips-label">{activeChips.length} active:</span>
          {activeChips.map((chip, i) => (
            <span key={i} className="cc-chip">
              {chip.label}
              <button className="cc-chip-remove" onClick={chip.clear} aria-label={`Remove filter ${chip.label}`}>✕</button>
            </span>
          ))}
          <button className="cc-clear-btn" onClick={clearFilters}>Clear all</button>
        </div>
      )}

      {/* MAIN LAYOUT */}
      <div className="cc-layout">

          {/* TOP FILTER BAR */}
          <div className="cc-filter-bar">
            <span className="cc-filter-label">Filters</span>

            <select className="cc-select" value={priceFilter} onChange={e => setPriceFilter(e.target.value)} aria-label="Filter by price">
              <option value="All">All Prices</option>
              <option value="Free">Free</option>
              <option value="Paid">Paid</option>
              <option value="Discounted">Discounted</option>
            </select>

            {uniqueSkills.length > 0 && (
              <select className="cc-select" value={skillFilter} onChange={e => setSkillFilter(e.target.value)} aria-label="Filter by skill level">
                <option value="All">All Levels</option>
                {uniqueSkills.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}

            <select className="cc-select" value={instructorFilter} onChange={e => setInstructorFilter(e.target.value)} aria-label="Filter by instructor">
              <option value="All">All Instructors</option>
              {publicInstructors.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
              <option value="IINM Team">IINM Team</option>
            </select>

            <div className="cc-feature-chips" role="group" aria-label="Filter by features">
              <button className="cc-feature-chip" aria-pressed={featureFilters.has("Certificate")} onClick={() => toggleFeature("Certificate")}>Certificate</button>
              <button className="cc-feature-chip" aria-pressed={featureFilters.has("New")} onClick={() => toggleFeature("New")}>New</button>
              <button className="cc-feature-chip" aria-pressed={featureFilters.has("Bestseller")} onClick={() => toggleFeature("Bestseller")}>Bestseller</button>
            </div>

            <div className="cc-filter-spacer" />

            <select className="cc-select" value={sortBy} onChange={e => setSortBy(e.target.value)} aria-label="Sort courses">
              <option value="featured">Featured first</option>
              <option value="newest">Newest</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="title">Title A→Z</option>
            </select>

            {/* Mobile filter toggle */}
            <button className="cc-filter-toggle" onClick={() => setSheetOpen(true)}>
              <Icon.Filter /> Filters
            </button>
          </div>

          {/* COURSES SECTION */}
          <div className="cc-main-content">
            {/* Top bar */}
            <div className="cc-main-header">
              <div className="cc-results-count">
                Showing <strong>{visible.length}</strong> of <strong>{filtered.length}</strong> courses
              </div>
              <div className="cc-view-toggle" role="group" aria-label="View mode">
                <button className={`cc-view-btn ${!listView ? "cc-view-active" : ""}`} onClick={() => setListView(false)} title="Grid view" aria-label="Grid view" aria-pressed={!listView}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                </button>
                <button className={`cc-view-btn ${listView ? "cc-view-active" : ""}`} onClick={() => setListView(true)} title="List view" aria-label="List view" aria-pressed={listView}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="4" width="18" height="2"/><rect x="3" y="11" width="18" height="2"/><rect x="3" y="18" width="18" height="2"/></svg>
                </button>
              </div>
            </div>

            {/* Grid / List */}
            <div className={listView ? "cc-list" : "cc-grid"}>
              {visible.length === 0 ? (
                <div className="cc-empty">
                  <div className="cc-empty-icon"><Icon.EmptySearch /></div>
                  <h3>No courses match your filters</h3>
                  <p>Try removing a filter or searching for something broader.</p>
                  <button className="cc-enroll-btn" style={{ marginTop: 16 }} onClick={clearFilters}>Clear all filters</button>

                  {popularNow.length > 0 && (
                    <div className="cc-popular-now">
                      <h4>Popular right now</h4>
                      <div className="cc-popular-grid">
                        {popularNow.map(c => {
                          const thumb = c.thumbnail_url
                            ? (c.thumbnail_url.startsWith("http") ? c.thumbnail_url : `${baseUrl}${c.thumbnail_url}`)
                            : "";
                          return (
                            <Link key={c.id} href={`/courses/${c.slug}`} className="cc-popular-card">
                              <div className="cc-popular-thumb">
                                {thumb ? <img src={thumb} alt="" loading="lazy" /> : null}
                              </div>
                              <div className="cc-popular-info">
                                <span className="cc-popular-title">{c.title}</span>
                                <span className="cc-popular-meta">{c.skill_level || "Any level"} • {c.is_free ? "Free" : "Paid"}</span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                visible.map(c => (
                  <CourseCard key={c.id} course={c} baseUrl={baseUrl} listView={listView} wishlisted={wishlist.has(c.id)} onWishlist={toggleWishlist} onPlayVideo={setPlayingVideo} />
                ))
              )}
            </div>

            {/* Load more */}
            {filtered.length > 0 && (
              <div className="cc-loadmore-wrap">
                <div className="cc-loadmore-count">
                  Showing <strong>{visible.length}</strong> of <strong>{filtered.length}</strong> courses
                </div>
                {hasMore && (
                  <button className="cc-loadmore-btn" onClick={() => setVisibleCount(c => c + itemsPerPage)}>
                    Load more courses
                  </button>
                )}
              </div>
            )}
          </div>
      </div>

      {/* MOBILE FILTER SHEET */}
      {sheetOpen && (
        <>
          <div className="cc-sheet-backdrop is-open" onClick={() => setSheetOpen(false)} />
          <div className="cc-sheet is-open" role="dialog" aria-modal="true" aria-label="Filters">
            <div className="cc-sheet-head">
              <h3 className="cc-sheet-title">Filters & sort</h3>
              <button className="cc-sheet-close" onClick={() => setSheetOpen(false)} aria-label="Close filters"><Icon.Close /></button>
            </div>

            <div className="cc-sheet-row">
              <p className="cc-sheet-row-label">Price</p>
              <select className="cc-select" value={priceFilter} onChange={e => setPriceFilter(e.target.value)} style={{ width: "100%" }}>
                <option value="All">All Prices</option>
                <option value="Free">Free</option>
                <option value="Paid">Paid</option>
                <option value="Discounted">Discounted</option>
              </select>
            </div>

            {uniqueSkills.length > 0 && (
              <div className="cc-sheet-row">
                <p className="cc-sheet-row-label">Level</p>
                <select className="cc-select" value={skillFilter} onChange={e => setSkillFilter(e.target.value)} style={{ width: "100%" }}>
                  <option value="All">All Levels</option>
                  {uniqueSkills.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}

            <div className="cc-sheet-row">
              <p className="cc-sheet-row-label">Instructor</p>
              <select className="cc-select" value={instructorFilter} onChange={e => setInstructorFilter(e.target.value)} style={{ width: "100%" }}>
                <option value="All">All Instructors</option>
                {publicInstructors.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
                <option value="IINM Team">IINM Team</option>
              </select>
            </div>

            <div className="cc-sheet-row">
              <p className="cc-sheet-row-label">Features</p>
              <div className="cc-feature-chips">
                <button className="cc-feature-chip" aria-pressed={featureFilters.has("Certificate")} onClick={() => toggleFeature("Certificate")}>Certificate</button>
                <button className="cc-feature-chip" aria-pressed={featureFilters.has("New")} onClick={() => toggleFeature("New")}>New</button>
                <button className="cc-feature-chip" aria-pressed={featureFilters.has("Bestseller")} onClick={() => toggleFeature("Bestseller")}>Bestseller</button>
              </div>
            </div>

            <div className="cc-sheet-row">
              <p className="cc-sheet-row-label">Sort by</p>
              <select className="cc-select" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: "100%" }}>
                <option value="featured">Featured first</option>
                <option value="newest">Newest</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="title">Title A→Z</option>
              </select>
            </div>

            <div className="cc-sheet-actions">
              <button className="cc-clear-btn" onClick={clearFilters}>Reset</button>
              <button className="cc-sheet-apply" onClick={() => setSheetOpen(false)}>Show {filtered.length} courses</button>
            </div>
          </div>
        </>
      )}

      {/* VIDEO MODAL */}
      {playingVideo && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ position: "absolute", inset: 0 }} onClick={() => setPlayingVideo(null)} />
          <div style={{ position: "relative", width: "100%", maxWidth: 960, aspectRatio: "16/9", background: "#000", borderRadius: 12, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}>
            <button onClick={() => setPlayingVideo(null)} aria-label="Close video" style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.5)", color: "#fff", border: "none", width: 36, height: 36, borderRadius: "50%", cursor: "pointer", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
            {(() => {
              const match = playingVideo.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
              if (match?.[1]) {
                return <iframe src={`https://www.youtube.com/embed/${match[1]}?autoplay=1&rel=0`} style={{ width: "100%", height: "100%", border: "none" }} allow="autoplay; fullscreen" title="Course promo video" />;
              }
              return <video src={playingVideo.startsWith("http") ? playingVideo : `${baseUrl}${playingVideo}`} controls autoPlay style={{ width: "100%", height: "100%" }} />;
            })()}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <PublicFooter />
    </div>
  );
}
