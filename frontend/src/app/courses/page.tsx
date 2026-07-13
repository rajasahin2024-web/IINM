"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import "./courses.css";
import "../home.css";
import PublicFooter from "@/components/PublicFooter";

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
  promo_video_url?: string;
}

// ─── Particle Canvas ──────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = canvas.offsetWidth;
    let H = canvas.offsetHeight;
    canvas.width = W;
    canvas.height = H;

    const particles = Array.from({ length: 55 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 2.5 + 0.5,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.5 + 0.15,
    }));

    let rafId: number;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(1,200,210,${p.alpha})`;
        ctx.fill();
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0 || p.x > W) p.dx *= -1;
        if (p.y < 0 || p.y > H) p.dy *= -1;
      });
      rafId = requestAnimationFrame(draw);
    };
    draw();

    const onResize = () => {
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width = W;
      canvas.height = H;
    };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(rafId); window.removeEventListener("resize", onResize); };
  }, []);
  return <canvas ref={canvasRef} className="cc-particle-canvas" />;
}

import CourseCard, { CourseCardType } from '../../components/CourseCard';
import PublicNavbar from '../../components/PublicNavbar';

// ─── Scroll Reveal Hook ───────────────────────────────────
function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("revealed"); }),
      { threshold: 0.12 }
    );
    const items = document.querySelectorAll(".reveal-item");
    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  });
}

// ─── Main Page ────────────────────────────────────────────
export default function CoursesPage() {
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

  const searchParams = useSearchParams();

  // Auto-apply filter from URL param (e.g. ?price=discounted from homepage)
  useEffect(() => {
    const p = searchParams.get("price");
    if (p === "discounted") setPriceFilter("Discounted");
    else if (p === "free") setPriceFilter("Free");
  }, [searchParams]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Site settings
  const [supportEmail, setSupportEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  useScrollReveal();

  useEffect(() => {
    const bUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://${window.location.hostname}:2007`;
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

  const uniqueSkills = Array.from(new Set(courses.map(c => c.skill_level).filter(Boolean) as string[]));
  const uniqueInstructors = Array.from(new Set(courses.map(c => c.instructor_name || "IINM Team")));

  const toggleWishlist = useCallback((id: number) => {
    setWishlist(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const clearFilters = () => { setPriceFilter("All"); setSkillFilter("All"); setInstructorFilter("All"); setSearch(""); };

  const activeChips: { label: string; clear: () => void }[] = [];
  if (priceFilter !== "All") activeChips.push({ label: `Price: ${priceFilter}`, clear: () => setPriceFilter("All") });
  if (skillFilter !== "All") activeChips.push({ label: `Level: ${skillFilter}`, clear: () => setSkillFilter("All") });
  if (instructorFilter !== "All") activeChips.push({ label: `Instructor: ${instructorFilter}`, clear: () => setInstructorFilter("All") });
  if (search.trim()) activeChips.push({ label: `"${search}"`, clear: () => setSearch("") });

  const filtered = courses.filter(c => {
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
    return matchSearch && matchPrice && matchSkill && matchInst;
  });

  useEffect(() => { setCurrentPage(1); }, [search, priceFilter, skillFilter, instructorFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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


      {/* HERO */}
      <section className="cc-hero">
        <ParticleCanvas />
        {/* Floating orbs */}
        <div className="cc-orb cc-orb-1" />
        <div className="cc-orb cc-orb-2" />
        <div className="cc-orb cc-orb-3" />

        <div className="cc-hero-inner">
          <div className="cc-trust-badge">⭐ Join 10,000+ Learners worldwide</div>
          <h1 className="cc-hero-title">Explore Our <span className="cc-hero-accent">Premium</span> Courses</h1>
          <p className="cc-hero-subtitle">Discover structured learning paths designed to accelerate your career and help you achieve your goals.</p>

          <div className="cc-search-wrap">
            <svg className="cc-search-icon" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input
              type="text"
              className="cc-search"
              placeholder="Search for a course, topic, or skill..."
              value={search}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              onChange={e => setSearch(e.target.value)}
            />
            {isSearchFocused && search.trim() && (
              <div className="cc-search-dropdown">
                {filtered.length === 0 ? (
                  <div style={{ padding: "12px 16px", color: "#64748b", fontSize: 14 }}>No matching courses</div>
                ) : (
                  filtered.slice(0, 5).map(c => (
                    <Link key={c.id} href={`/courses/${c.slug}`} className="cc-search-item">
                      <div style={{ width: 40, height: 32, borderRadius: 6, background: "#e2e8f0", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
                        {c.thumbnail_url ? <img src={c.thumbnail_url.startsWith("http") ? c.thumbnail_url : `${baseUrl}${c.thumbnail_url}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "📚"}
                      </div>
                      <div style={{ flex: 1, overflow: "hidden" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</div>
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
        </div>
      </section>

      {/* ACTIVE FILTER CHIPS */}
      {activeChips.length > 0 && (
        <div className="cc-chips-bar">
          <span className="cc-chips-label">Active filters:</span>
          {activeChips.map((chip, i) => (
            <span key={i} className="cc-chip">
              {chip.label}
              <button className="cc-chip-remove" onClick={chip.clear}>✕</button>
            </span>
          ))}
          <button className="cc-clear-btn" onClick={clearFilters}>Clear all</button>
        </div>
      )}

      {/* MAIN LAYOUT */}
      <div className="cc-layout">

          {/* TOP FILTER BAR */}
          <div className="cc-filter-bar">
            <span className="cc-filter-label">Filters:</span>

            <select className="cc-select" value={priceFilter} onChange={e => setPriceFilter(e.target.value)}>
              <option value="All">All Prices</option>
              <option value="Free">Free</option>
              <option value="Paid">Paid</option>
              <option value="Discounted">Discounted</option>
            </select>

            {uniqueSkills.length > 0 && (
              <select className="cc-select" value={skillFilter} onChange={e => setSkillFilter(e.target.value)}>
                <option value="All">All Skill Levels</option>
                {uniqueSkills.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}

            <select className="cc-select" value={instructorFilter} onChange={e => setInstructorFilter(e.target.value)}>
              <option value="All">All Instructors</option>
              {publicInstructors.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
              <option value="IINM Team">IINM Team</option>
            </select>

            {(priceFilter !== "All" || skillFilter !== "All" || instructorFilter !== "All") && (
              <button onClick={clearFilters} className="cc-clear-btn">Clear Filters</button>
            )}
          </div>

          {/* COURSES SECTION */}
          <div className="cc-main-content">
            {/* Top bar */}
            <div className="cc-main-header">
              <div className="cc-results-count">Showing <strong>{filtered.length}</strong> courses</div>
              <div className="cc-view-toggle">
                <button className={`cc-view-btn ${!listView ? "cc-view-active" : ""}`} onClick={() => setListView(false)} title="Grid View">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                </button>
                <button className={`cc-view-btn ${listView ? "cc-view-active" : ""}`} onClick={() => setListView(true)} title="List View">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="4" width="18" height="2"/><rect x="3" y="11" width="18" height="2"/><rect x="3" y="18" width="18" height="2"/></svg>
                </button>
              </div>
            </div>

            {/* Grid / List */}
            <div className={listView ? "cc-list" : "cc-grid"}>
              {paginated.length === 0 ? (
                <div className="cc-empty">
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                  <h3>No courses found</h3>
                  <p>Try adjusting your search or filters.</p>
                  <button className="cc-enroll-btn" style={{ marginTop: 20, border: "none", cursor: "pointer" }} onClick={clearFilters}>Clear Filters</button>
                </div>
              ) : (
                paginated.map(c => (
                  <CourseCard key={c.id} course={c} baseUrl={baseUrl} listView={listView} wishlisted={wishlist.has(c.id)} onWishlist={toggleWishlist} onPlayVideo={setPlayingVideo} />
                ))
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="cc-pagination">
                <button className="cc-page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>←</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button key={page} className={`cc-page-btn ${currentPage === page ? "cc-page-btn-active" : ""}`} onClick={() => setCurrentPage(page)}>{page}</button>
                ))}
                <button className="cc-page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>→</button>
              </div>
            )}
          </div>
      </div>

      {/* VIDEO MODAL */}
      {playingVideo && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ position: "absolute", inset: 0 }} onClick={() => setPlayingVideo(null)} />
          <div style={{ position: "relative", width: "100%", maxWidth: 960, aspectRatio: "16/9", background: "#000", borderRadius: 12, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}>
            <button onClick={() => setPlayingVideo(null)} style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.5)", color: "#fff", border: "none", width: 36, height: 36, borderRadius: "50%", cursor: "pointer", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
            {(() => {
              const match = playingVideo.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
              if (match?.[1]) {
                return <iframe src={`https://www.youtube.com/embed/${match[1]}?autoplay=1&rel=0`} style={{ width: "100%", height: "100%", border: "none" }} allow="autoplay; fullscreen" />;
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
