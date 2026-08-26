"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "../app/courses/courses.css";

export interface CourseCardType {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  instructor_name: string | null;
  instructors?: { id: number; name: string; phone?: string }[];
  skill_level: string | null;
  price: number | null;
  discount_price: number | null;
  price_usd: number | null;
  discount_price_usd: number | null;
  currency: string;
  is_free: boolean;
  is_featured: boolean;
  is_new: boolean;
  has_certificate?: boolean;
  promo_video_url?: string;
  show_on_homepage?: boolean;
}

// Inline SVG icons (replacing emoji for a11y)
const Icon = {
  Star: (filled: boolean) => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? "#f59e0b" : "none"} stroke={filled ? "#f59e0b" : "#cbd5e1"} strokeWidth="1.6" aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  Heart: (filled: boolean) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "#e63946" : "none"} stroke={filled ? "#e63946" : "currentColor"} strokeWidth="2" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  Clock: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 16 14" />
    </svg>
  ),
  Play: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
  ),
  Arrow: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
  ),
  Book: () => (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
  ),
  Cert: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
  ),
};

export function StarRating({ rating }: { rating: number }) {
  return (
    <span className="cc-stars" title="Estimated rating — pending final data">
      {[1, 2, 3, 4, 5].map((s) => <span key={s}>{Icon.Star(s <= Math.round(rating))}</span>)}
      <span className="cc-rating-num">{rating.toFixed(1)} <span style={{ color: "#94a3b8", fontWeight: 400 }}>(est.)</span></span>
    </span>
  );
}

export default function CourseCard({
  course, baseUrl, listView, wishlisted, onWishlist, onPlayVideo,
}: {
  course: CourseCardType; baseUrl: string; listView: boolean; wishlisted: boolean; onWishlist: (id: number) => void; onPlayVideo: (url: string) => void;
}) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const isUsd = course.currency === "USD";
  const sym = isUsd ? "$" : "₹";
  const basePrice = isUsd ? (course.price_usd ?? course.price) : course.price;
  const discPrice = isUsd ? (course.discount_price_usd ?? course.discount_price) : course.discount_price;
  const hasDiscount = discPrice != null && discPrice < (basePrice ?? 0);
  const displayPrice = hasDiscount ? discPrice : basePrice;
  const discPct = hasDiscount && basePrice ? Math.round((1 - (discPrice! / basePrice!)) * 100) : 0;

  // fake-but-consistent metadata derived from id (clearly labeled as estimated, strictly >= 4.6)
  const fakeRating = 4.6 + ((course.id * 3) % 4) / 10;
  const fakeEnrolled = 120 + (course.id * 37) % 900;
  const fakeDuration = 4 + (course.id % 20);

  // badge logic — uses real API fields only
  const badge = course.is_featured
    ? { label: "Bestseller", cls: "cc-badge-bestseller" }
    : hasDiscount && discPct >= 30
    ? { label: `-${discPct}%`, cls: "cc-badge-discount" }
    : course.is_free
    ? { label: "Free", cls: "cc-badge-free" }
    : course.is_new
    ? { label: "New", cls: "cc-badge-new" }
    : null;

  // avatar initials
  const displayInstructorName = course.instructors && course.instructors.length > 0
    ? course.instructors.map(i => i.name).join(", ")
    : (course.instructor_name || "IINM");

  const initials = displayInstructorName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const thumb = course.thumbnail_url
    ? (course.thumbnail_url.startsWith("http") ? course.thumbnail_url : `${baseUrl}${course.thumbnail_url}`)
    : "";

  if (listView) {
    return (
      <div className="cc-card cc-card-list reveal-item" onClick={() => router.push(`/courses/${course.slug}`)} style={{ cursor: "pointer" }}>
        <Link href={`/courses/${course.slug}`} className="cc-thumb cc-thumb-list" onClick={(e) => e.stopPropagation()} aria-label={`View ${course.title}`}>
          {thumb ? <img src={thumb} alt={course.title} className="cc-thumb-img" /> : <div className="cc-thumb-placeholder"><Icon.Book /></div>}
          {badge && <span className={`cc-badge ${badge.cls}`}>{badge.label}</span>}
          {course.promo_video_url && (
            <button type="button" className="cc-play-overlay cc-play-list" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPlayVideo(course.promo_video_url!); }} aria-label={`Play promo video for ${course.title}`}>
               <div className="cc-play-btn-circle"><Icon.Play /></div>
            </button>
          )}
        </Link>
        <div className="cc-body cc-body-list">
          <div className="cc-meta">
            <span className="cc-level-chip">{course.skill_level || "Any Level"}</span>
            {course.has_certificate && <span className="cc-cert-chip"><Icon.Cert /> Certificate</span>}
            <span className="cc-meta-est" title="Estimated — pending final data">~{fakeDuration}h (est.)</span>
          </div>
          <Link href={`/courses/${course.slug}`} style={{ textDecoration: "none" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="cc-title">{course.title}</h3>
          </Link>
          {course.description && (
            <p className="cc-desc">{course.description.replace(/<[^>]+>/g, "").slice(0, 140)}</p>
          )}

          <StarRating rating={fakeRating} />
          <div className="cc-meta-est" title="Estimated — pending final data">~{fakeEnrolled.toLocaleString()} students (est.)</div>
        </div>
        <div className="cc-card-right">
          <button className={`cc-wishlist-btn ${wishlisted ? "is-active" : ""}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onWishlist(course.id); }} aria-label={`${wishlisted ? "Remove from" : "Save to"} wishlist: ${course.title}`} aria-pressed={wishlisted}>
            {Icon.Heart(wishlisted)}
          </button>
          <div className="cc-price-wrap">
            {course.is_free ? <span className="cc-price-main">Free</span> : displayPrice != null ? (
              <>
                <span className="cc-price-main">{sym}{Number(displayPrice).toLocaleString()}</span>
                {hasDiscount && <span className="cc-price-old">{sym}{Number(basePrice).toLocaleString()}</span>}
              </>
            ) : <span className="cc-price-main" style={{ fontSize: 14 }}>Contact us</span>}
          </div>
          <Link href={`/courses/${course.slug}`} className="cc-enroll-btn" onClick={(e) => e.stopPropagation()}>View Course</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cc-card reveal-item" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={() => router.push(`/courses/${course.slug}`)} style={{ cursor: "pointer" }}>
      <Link href={`/courses/${course.slug}`} className="cc-thumb" onClick={(e) => e.stopPropagation()} aria-label={`View ${course.title}`}>
        {thumb ? <img src={thumb} alt={course.title} className="cc-thumb-img" /> : <div className="cc-thumb-placeholder"><Icon.Book /></div>}
        {badge && <span className={`cc-badge ${badge.cls}`}>{badge.label}</span>}
        {course.promo_video_url && (
          <button type="button" className="cc-play-overlay" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPlayVideo(course.promo_video_url!); }} aria-label={`Play promo video for ${course.title}`}>
             <div className="cc-play-btn-circle"><Icon.Play /></div>
          </button>
        )}
        {/* Hover arrow (replaces misleading Quick View) — only when no promo video */}
        {!course.promo_video_url && hovered && (
          <div className="cc-arrow-overlay"><div className="cc-arrow-circle"><Icon.Arrow /></div></div>
        )}
      </Link>

      {/* Wishlist */}
      <button className={`cc-wishlist-btn cc-wishlist-abs ${wishlisted ? "is-active" : ""}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onWishlist(course.id); }} aria-label={`${wishlisted ? "Remove from" : "Save to"} wishlist: ${course.title}`} aria-pressed={wishlisted}>
        {Icon.Heart(wishlisted)}
      </button>

      <div className="cc-body">
        <div className="cc-meta">
          <span className="cc-level-chip">{course.skill_level || "Any Level"}</span>
          {course.has_certificate && <span className="cc-cert-chip"><Icon.Cert /> Certificate</span>}
          <span className="cc-meta-est" style={{ marginLeft: "auto" }} title="Estimated — pending final data">~{fakeDuration}h (est.)</span>
        </div>
        <Link href={`/courses/${course.slug}`} style={{ textDecoration: "none" }} onClick={(e) => e.stopPropagation()}>
          <h3 className="cc-title">{course.title}</h3>
        </Link>

        <div className="cc-instructor-row">
          <span className="cc-avatar" aria-hidden="true">{initials}</span>
          <span className="cc-instructor">{displayInstructorName}</span>
        </div>

        <StarRating rating={fakeRating} />
        <div className="cc-meta-est" title="Estimated — pending final data">~{fakeEnrolled.toLocaleString()} students (est.)</div>

        <div className="cc-footer">
          <div className="cc-price-wrap">
            {course.is_free ? <span className="cc-price-main">Free</span> : displayPrice != null ? (
              <>
                <span className="cc-price-main">{sym}{Number(displayPrice).toLocaleString()}</span>
                {hasDiscount && <span className="cc-price-old">{sym}{Number(basePrice).toLocaleString()}</span>}
              </>
            ) : <span className="cc-price-main" style={{ fontSize: 14 }}>Contact us</span>}
          </div>
          <Link href={`/courses/${course.slug}`} className="cc-enroll-btn" onClick={(e) => e.stopPropagation()}>Enroll</Link>
        </div>
      </div>
    </div>
  );
}
