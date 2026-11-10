"use client";

import React, { useCallback, useEffect, useState } from "react";
import "../courses/courses.css";
import "../home.css";
import PublicFooter from "@/components/PublicFooter";
import PublicNavbar from "@/components/PublicNavbar";
import CourseCard, { CourseCardType } from "@/components/CourseCard";
import { BASE_URL } from "@/lib/config";
import { cachedFetch } from "@/lib/apiCache";

const Icon = {
  Bolt: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>
  ),
  EmptySearch: () => <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>,
};

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

export default function MicroCoursesPage() {
  const [courses, setCourses] = useState<CourseCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const baseUrl = BASE_URL;
  const [wishlist, setWishlist] = useState<Set<number>>(() => {
    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("iinm_wishlist");
        const ids = raw ? JSON.parse(raw) : null;
        if (Array.isArray(ids)) return new Set(ids as number[]);
      }
    } catch { /* ignore */ }
    return new Set<number>();
  });
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem("iinm_wishlist", JSON.stringify(Array.from(wishlist)));
    } catch { /* ignore */ }
  }, [wishlist]);

  useEffect(() => {
    let cancelled = false;
    cachedFetch<CourseCardType[]>(`${BASE_URL}/api/public/courses?course_type=micro`)
      .then((d) => { if (!cancelled) setCourses(Array.isArray(d) ? d : []); })
      .catch(() => { if (!cancelled) setCourses([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const toggleWishlist = useCallback((id: number) => {
    setWishlist((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  useScrollReveal([courses, loading]);

  if (loading) {
    return (
      <div className="cc-root">
        <PublicNavbar />
        <div className="cc-skeleton cc-sk-hero"></div>
        <div className="cc-layout" style={{ paddingTop: 40 }}>
          <div className="cc-grid">
            {[...Array(6)].map((_, i) => <div key={i} className="cc-skeleton cc-sk-card"></div>)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cc-root">
      <PublicNavbar />

      {/* HERO */}
      <section className="cc-hero">
        <div className="cc-hero-grid-bg" />
        <div className="cc-hero-inner">
          <div>
            <span className="cc-hero-eyebrow">Micro courses</span>
            <h1 className="cc-hero-title">
              Short, focused courses. <br /><span className="cc-hero-accent">Learn it today.</span>
            </h1>
            <p className="cc-hero-subtitle">
              Bite-sized micro courses built around one skill — buy once, get instant access, and finish on your own schedule.
            </p>
            <div className="cc-hero-trust">
              <span><Icon.Bolt /> <strong>{courses.length}</strong> micro courses</span>
              <span className="cc-trust-dot" />
              <span>Instant access after purchase</span>
            </div>
          </div>
        </div>
      </section>

      {/* GRID */}
      <div className="cc-layout">
        <div className="cc-main-content" style={{ width: "100%" }}>
          <div className="cc-main-header">
            <div className="cc-results-count">
              Showing <strong>{courses.length}</strong> micro courses
            </div>
          </div>

          <div className="cc-grid">
            {courses.length === 0 ? (
              <div className="cc-empty">
                <div className="cc-empty-icon"><Icon.EmptySearch /></div>
                <h3>No micro courses yet</h3>
                <p>New micro courses are on the way — check back soon.</p>
              </div>
            ) : (
              courses.map((c) => (
                <CourseCard
                  key={c.id}
                  course={c}
                  baseUrl={baseUrl}
                  listView={false}
                  wishlisted={wishlist.has(c.id)}
                  onWishlist={toggleWishlist}
                  onPlayVideo={setPlayingVideo}
                />
              ))
            )}
          </div>
        </div>
      </div>

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

      <PublicFooter />
    </div>
  );
}
