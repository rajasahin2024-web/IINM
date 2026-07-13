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
  promo_video_url?: string;
  show_on_homepage?: boolean;
}

export function StarRating({ rating }: { rating: number }) {
  return (
    <span className="cc-stars">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} style={{ color: s <= Math.round(rating) ? "#f59e0b" : "#cbd5e1", fontSize: 13 }}>★</span>
      ))}
      <span className="cc-rating-num">{rating.toFixed(1)}</span>
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

  // fake-but-consistent metadata derived from id
  const fakeRating = 3.5 + (course.id % 15) / 10;
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

  if (listView) {
    return (
      <div className="cc-card cc-card-list reveal-item" onClick={() => router.push(`/courses/${course.slug}`)} style={{ cursor: "pointer" }}>
        <Link href={`/courses/${course.slug}`} className="cc-thumb cc-thumb-list" onClick={(e) => e.stopPropagation()}>
          {course.thumbnail_url ? (
            <img src={course.thumbnail_url.startsWith("http") ? course.thumbnail_url : `${baseUrl}${course.thumbnail_url}`} alt={course.title} className="cc-thumb-img" />
          ) : (
            <div className="cc-thumb-placeholder">📚</div>
          )}
          {badge && <span className={`cc-badge ${badge.cls}`}>{badge.label}</span>}
          {course.promo_video_url && (
            <div className="cc-play-overlay cc-play-list" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPlayVideo(course.promo_video_url!); }}>
               <div className="cc-play-btn-circle">
                 <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M8 5v14l11-7z" /></svg>
               </div>
            </div>
          )}
        </Link>
        <div className="cc-body cc-body-list">
          <div className="cc-meta">
            <span className="cc-level-chip">{course.skill_level || "Any Level"}</span>
            <span style={{ color: "#cbd5e1", margin: "0 4px" }}>•</span>
            <span>{fakeDuration}h total</span>
          </div>
          <Link href={`/courses/${course.slug}`} style={{ textDecoration: "none" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="cc-title">{course.title}</h3>
          </Link>
          {course.description && (
            <p className="cc-desc">{course.description.replace(/<[^>]+>/g, "").slice(0, 120)}...</p>
          )}

          <StarRating rating={fakeRating} />
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{fakeEnrolled.toLocaleString()} students enrolled</div>
        </div>
        <div className="cc-card-right">
          <button className="cc-wishlist-btn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onWishlist(course.id); }} title="Save to wishlist">
            {wishlisted ? "❤️" : "🤍"}
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
      <Link href={`/courses/${course.slug}`} className="cc-thumb" onClick={(e) => e.stopPropagation()}>
        {course.thumbnail_url ? (
          <img src={course.thumbnail_url.startsWith("http") ? course.thumbnail_url : `${baseUrl}${course.thumbnail_url}`} alt={course.title} className="cc-thumb-img" />
        ) : (
          <div className="cc-thumb-placeholder">📚</div>
        )}
        {badge && <span className={`cc-badge ${badge.cls}`}>{badge.label}</span>}
        {course.promo_video_url && (
          <div className="cc-play-overlay" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPlayVideo(course.promo_video_url!); }}>
             <div className="cc-play-btn-circle">
               <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><path d="M8 5v14l11-7z" /></svg>
             </div>
          </div>
        )}
        {/* Quick View Overlay (only if no promo video so they don't overlap) */}
        {!course.promo_video_url && (
          <div className={`cc-quick-overlay ${hovered ? "cc-quick-visible" : ""}`}>
            <span className="cc-quick-btn">▶ Quick View</span>
          </div>
        )}
      </Link>

      {/* Wishlist */}
      <button className="cc-wishlist-btn cc-wishlist-abs" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onWishlist(course.id); }} title="Save to wishlist">
        {wishlisted ? "❤️" : "🤍"}
      </button>

      <div className="cc-body">
        <div className="cc-meta">
          <span className="cc-level-chip">{course.skill_level || "Any Level"}</span>
          <span style={{ marginLeft: "auto", color: "#94a3b8", fontSize: 11 }}>⏱ {fakeDuration}h</span>
        </div>
        <Link href={`/courses/${course.slug}`} style={{ textDecoration: "none" }} onClick={(e) => e.stopPropagation()}>
          <h3 className="cc-title">{course.title}</h3>
        </Link>

        <StarRating rating={fakeRating} />
        <div style={{ fontSize: 11, color: "#94a3b8", margin: "4px 0 12px" }}>{fakeEnrolled.toLocaleString()} students</div>

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
