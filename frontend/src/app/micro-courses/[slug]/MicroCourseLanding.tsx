"use client";

import React, { useState } from "react";
import Link from "next/link";
import PublicNavbar from "@/components/PublicNavbar";
import PublicFooter from "@/components/PublicFooter";
import SlotBookingDrawer from "@/app/courses/[slug]/SlotBookingDrawer";
import { resolveAssetUrl } from "@/lib/config";
import "./micro-landing.css";

interface MicroChapter {
  id: number;
  title: string;
}

interface MicroCourse {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  instructor_name: string | null;
  instructors?: { id: number; name: string }[];
  skill_level: string | null;
  price: number | null;
  discount_price: number | null;
  price_usd: number | null;
  discount_price_usd: number | null;
  currency: string;
  is_free: boolean;
  has_certificate: boolean;
  validity_days: number | null;
  course_type: string;
  chapters?: MicroChapter[];
}

const Icon = {
  Bolt: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>
  ),
  CheckCircle: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
  ),
  Award: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
  ),
  Book: () => (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
  ),
};

export default function MicroCourseLanding({ course }: { course: MicroCourse }) {
  const [slotBookingOpen, setSlotBookingOpen] = useState(false);

  const isUsd = course.currency === "USD";
  const sym = isUsd ? "$" : "₹";
  const basePrice = isUsd ? (course.price_usd ?? course.price) : course.price;
  const discPrice = isUsd ? (course.discount_price_usd ?? course.discount_price) : course.discount_price;
  const hasDiscount = discPrice != null && discPrice < (basePrice ?? 0);
  const displayPrice = hasDiscount ? discPrice : basePrice;

  const instructorName = course.instructors && course.instructors.length > 0
    ? course.instructors.map((i) => i.name).join(", ")
    : (course.instructor_name || "IINM");
  const thumb = resolveAssetUrl(course.thumbnail_url);
  const chapters = Array.isArray(course.chapters) ? course.chapters : [];

  const buyLabel = course.is_free
    ? "Get Free Access"
    : displayPrice != null
      ? `Buy Now — ${sym}${Number(displayPrice).toLocaleString()}`
      : "Buy Now — Instant Access";

  return (
    <div className="mc-root">
      <PublicNavbar />

      <section className="mc-hero">
        <div className="mc-container mc-hero-layout">
          <div className="mc-hero-main">
            <div className="mc-breadcrumbs">
              <Link href="/">Home</Link><span>›</span>
              <Link href="/micro-courses">Micro Courses</Link><span>›</span>
              <span>{course.title}</span>
            </div>

            <span className="mc-type-pill"><Icon.Bolt /> Micro Course — Instant Access</span>

            <h1 className="mc-title">{course.title}</h1>

            {course.description && (
              <p className="mc-subtitle">{course.description.replace(/<[^>]+>/g, "")}</p>
            )}

            <div className="mc-meta-row">
              <span>{instructorName}</span>
              {course.skill_level && (<><span className="mc-dot" /><span>{course.skill_level}</span></>)}
              {chapters.length > 0 && (<><span className="mc-dot" /><span>{chapters.length} sections</span></>)}
            </div>

            <div className="mc-cta-group">
              <button type="button" className="mc-btn-primary" onClick={() => setSlotBookingOpen(true)}>
                {buyLabel}
              </button>
            </div>
            <p className="mc-cta-note">Pay once — instant access in your student dashboard.</p>
          </div>

          <div className="mc-card">
            <div className="mc-card-thumb">
              {thumb ? <img src={thumb} alt={course.title} /> : <div className="mc-card-thumb-ph"><Icon.Book /></div>}
            </div>
            <div className="mc-card-body">
              <div className="mc-card-price-row">
                {course.is_free ? (
                  <span className="mc-card-price">Free</span>
                ) : displayPrice != null ? (
                  <>
                    <span className="mc-card-price">{sym}{Number(displayPrice).toLocaleString()}</span>
                    {hasDiscount && <span className="mc-card-price-old">{sym}{Number(basePrice).toLocaleString()}</span>}
                  </>
                ) : (
                  <span className="mc-card-price">Contact us</span>
                )}
              </div>
              <ul className="mc-card-benefits">
                <li><Icon.CheckCircle /> Instant access after purchase</li>
                <li><Icon.CheckCircle /> Self-paced — learn on your schedule</li>
                <li><Icon.CheckCircle /> {course.validity_days ? `${course.validity_days} days access` : "Lifetime dashboard access"}</li>
                {course.has_certificate && <li><Icon.Award /> Certificate on completion</li>}
              </ul>
              <button type="button" className="mc-btn-primary mc-btn-block" onClick={() => setSlotBookingOpen(true)}>
                {buyLabel}
              </button>
            </div>
          </div>
        </div>
      </section>

      {chapters.length > 0 && (
        <section className="mc-section">
          <div className="mc-container">
            <h2 className="mc-sec-title">What&apos;s inside</h2>
            <ol className="mc-chapters">
              {chapters.map((ch, i) => (
                <li key={ch.id} className="mc-chapter">
                  <span className="mc-chapter-num">{String(i + 1).padStart(2, "0")}</span>
                  <span className="mc-chapter-title">{ch.title}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      <PublicFooter />

      <SlotBookingDrawer
        open={slotBookingOpen}
        onClose={() => setSlotBookingOpen(false)}
        course={{
          id: course.id,
          title: course.title,
          slug: course.slug,
          price: course.price,
          discount_price: course.discount_price,
          is_free: course.is_free,
          currency: course.currency,
          course_type: course.course_type,
        }}
      />
    </div>
  );
}
