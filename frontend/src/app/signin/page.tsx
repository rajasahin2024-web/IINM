"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { API_BASE_URL, BASE_URL } from "@/lib/config";
import { toast } from "react-hot-toast";
import CourseCard, { CourseCardType } from "@/components/CourseCard";
import "../courses/courses.css";

interface SiteSettingsData {
  site_name: string;
  logo_url: string;
  dark_logo_url?: string;
}

interface ReviewItem {
  id: number;
  student_name: string;
  role_title: string | null;
  company_name: string | null;
  feedback_text: string;
  avatar_url: string | null;
  star_rating: number;
}

export default function StudentSignIn() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [siteSettings, setSiteSettings] = useState<SiteSettingsData>({
    site_name: "IINM",
    logo_url: "",
    dark_logo_url: "",
  });

  const [courses, setCourses] = useState<CourseCardType[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [activeCourseIndex, setActiveCourseIndex] = useState(0);
  const [activeReviewIndex, setActiveReviewIndex] = useState(0);

  // Fetch Site Settings, Courses, Reviews
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [siteRes, coursesRes, reviewsRes] = await Promise.allSettled([
          fetch(`${API_BASE_URL}/settings/site`),
          fetch(`${API_BASE_URL}/courses`),
          fetch(`${API_BASE_URL}/settings/learner-reviews`),
        ]);

        if (siteRes.status === "fulfilled" && siteRes.value.ok) {
          const siteData = await siteRes.value.json();
          setSiteSettings({
            site_name: siteData.site_name || "IINM",
            logo_url: siteData.logo_url || "",
            dark_logo_url: siteData.dark_logo_url || "",
          });
        }

        if (coursesRes.status === "fulfilled" && coursesRes.value.ok) {
          const courseData = await coursesRes.value.json();
          const items = Array.isArray(courseData) ? courseData : courseData.items || [];
          if (items.length > 0) setCourses(items);
        }

        if (reviewsRes.status === "fulfilled" && reviewsRes.value.ok) {
          const revData = await reviewsRes.value.json();
          const items = Array.isArray(revData) ? revData : revData.reviews || [];
          if (items.length > 0) setReviews(items);
        }
      } catch {
        /* fallback content will render */
      }
    };
    fetchData();
  }, []);

  // Auto-slide courses & reviews
  useEffect(() => {
    if (courses.length <= 1) return;
    const interval = setInterval(() => {
      setActiveCourseIndex((prev) => (prev + 1) % courses.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [courses.length]);

  useEffect(() => {
    if (reviews.length <= 1) return;
    const interval = setInterval(() => {
      setActiveReviewIndex((prev) => (prev + 1) % reviews.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [reviews.length]);

  // Fallback courses if DB empty
  const displayCourses: CourseCardType[] = courses.length > 0 ? courses : [
    {
      id: 1,
      slug: "ai-agents-automation",
      title: "Executive AI Agents & Workflow Automation",
      description: "Master autonomous AI systems, LangChain, and enterprise agent architecture.",
      thumbnail_url: null,
      price: 24999,
      discount_price: 14999,
      price_usd: 299,
      discount_price_usd: 179,
      currency: "INR",
      is_free: false,
      is_featured: true,
      is_new: false,
      skill_level: "Advanced",
      instructor_name: "IINM Research Faculty",
      has_certificate: true,
    },
    {
      id: 2,
      slug: "cloud-fullstack-ai",
      title: "Enterprise Full-Stack & Generative AI Systems",
      description: "End-to-end cloud engineering with Next.js, FastAPI, vector databases, and microservices.",
      thumbnail_url: null,
      price: 29999,
      discount_price: 19999,
      price_usd: 349,
      discount_price_usd: 239,
      currency: "INR",
      is_free: false,
      is_featured: true,
      is_new: true,
      skill_level: "Comprehensive",
      instructor_name: "Principal Engineers",
      has_certificate: true,
    },
    {
      id: 3,
      slug: "llmops-fine-tuning",
      title: "Advanced LLMOps, RAG & Model Fine-Tuning",
      description: "Deploy and optimize production-grade foundational models at scale.",
      thumbnail_url: null,
      price: 19999,
      discount_price: 12999,
      price_usd: 249,
      discount_price_usd: 159,
      currency: "INR",
      is_free: false,
      is_featured: false,
      is_new: true,
      skill_level: "Professional",
      instructor_name: "AI Scientists",
      has_certificate: true,
    },
  ];

  // Fallback reviews if DB empty
  const displayReviews: ReviewItem[] = reviews.length > 0 ? reviews : [
    {
      id: 1,
      student_name: "Sneha Mukherjee",
      role_title: "AI Engineer",
      company_name: "Global Tech Inc.",
      feedback_text: "The structured curriculum and 1-on-1 mentorship transformed my career trajectory. The live projects and real-time guidance are unparalleled.",
      avatar_url: null,
      star_rating: 5,
    },
    {
      id: 2,
      student_name: "Rohan Varma",
      role_title: "Product Architect",
      company_name: "FinTech Innovation",
      feedback_text: "Hands down the most rigorous, industry-relevant curriculum in India. Exceptional faculty office hours and seamless doubt resolution.",
      avatar_url: null,
      star_rating: 5,
    },
    {
      id: 3,
      student_name: "Pooja Hegde",
      role_title: "Data Analyst",
      company_name: "Analytics Global",
      feedback_text: "I transitioned into AI analytics within 2 months of batch completion. The peer community and career coaching exceeded all expectations.",
      avatar_url: null,
      star_rating: 5,
    },
  ];

  const currentCourse = displayCourses[activeCourseIndex % displayCourses.length];
  const currentReview = displayReviews[activeReviewIndex % displayReviews.length];

  const resolveImage = (url: string | null | undefined) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (url.startsWith("/")) return `${BASE_URL}${url}`;
    return url;
  };

  const darkLogo = siteSettings.dark_logo_url || siteSettings.logo_url;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/student/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Invalid credentials or account is inactive");
      }

      const data = await res.json();
      const student = data.student;
      toast.success(`Welcome back, ${student?.first_name || "Student"}! Login successful.`, {
        duration: 4000,
        style: {
          background: "#0a1628",
          color: "#f8fafc",
          border: "1px solid rgba(255,255,255,0.1)",
          fontSize: "14px",
          fontWeight: "500",
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(msg === "Failed to fetch" ? "Unable to connect to server. Please check your connection." : msg);
    } finally {
      setLoading(false);
    }
  };

  const nextCourse = () => {
    setActiveCourseIndex((prev) => (prev + 1) % displayCourses.length);
  };

  const prevCourse = () => {
    setActiveCourseIndex((prev) => (prev - 1 + displayCourses.length) % displayCourses.length);
  };

  return (
    <div className="spl-page">
      {/* ── Background Glows & Ambience ── */}
      <div className="spl-glow-red" />
      <div className="spl-glow-blue" />
      <div className="spl-fine-grid" />

      <div className="spl-container">
        {/* ════════════════════════════════════════════════════
            LEFT COLUMN: Live Courses & Student Reviews Showcase
           ════════════════════════════════════════════════════ */}
        <div className="spl-showcase-column">
          {/* Brand Logo (Dark Logo without text name) */}
          <div className="spl-brand-row">
            <Link href="/" className="spl-brand-link" aria-label="Home">
              {darkLogo ? (
                <img
                  src={resolveImage(darkLogo)}
                  alt="Logo"
                  className="spl-dark-logo"
                />
              ) : (
                <div className="spl-logo-badge">
                  <span>I</span>
                </div>
              )}
            </Link>
          </div>

          {/* Section 1: Live Courses Slider (/courses exact cards) */}
          <div className="spl-courses-section">
            <div className="spl-section-header">
              <div className="spl-header-left">
                <span className="spl-badge-tag">EXECUTIVE CURRICULUM</span>
                <h2 className="spl-section-title">Industry Masterclasses</h2>
              </div>
              <div className="spl-slider-controls">
                <button
                  type="button"
                  onClick={prevCourse}
                  className="spl-ctrl-btn"
                  aria-label="Previous Course"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <div className="spl-course-counter">
                  {(activeCourseIndex % displayCourses.length) + 1} / {displayCourses.length}
                </div>
                <button
                  type="button"
                  onClick={nextCourse}
                  className="spl-ctrl-btn"
                  aria-label="Next Course"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Exact CourseCard from /courses */}
            <div className="spl-card-frame">
              <CourseCard
                course={currentCourse}
                baseUrl={BASE_URL}
                listView={false}
                wishlisted={false}
                onWishlist={() => {}}
                onPlayVideo={() => {}}
              />
            </div>
          </div>

          {/* Section 2: Home Page Student Reviews / Wall of Love */}
          <div className="spl-reviews-section">
            <div className="spl-review-top-bar">
              <div className="spl-stars-row">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg
                    key={i}
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill={i < currentReview.star_rating ? "#f59e0b" : "#475569"}
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ))}
              </div>
              <span className="spl-verified-tag">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Verified Student Review
              </span>
            </div>

            <p className="spl-review-text">&ldquo;{currentReview.feedback_text}&rdquo;</p>

            <div className="spl-reviewer-footer">
              <div className="spl-reviewer-avatar">
                {currentReview.avatar_url ? (
                  <img src={resolveImage(currentReview.avatar_url)} alt={currentReview.student_name} />
                ) : (
                  <span>{currentReview.student_name?.[0] || "S"}</span>
                )}
              </div>
              <div className="spl-reviewer-info">
                <div className="spl-reviewer-name">{currentReview.student_name}</div>
                <div className="spl-reviewer-role">
                  {currentReview.role_title || "Batch Scholar"}{" "}
                  {currentReview.company_name && <span className="spl-co-name">• {currentReview.company_name}</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════
            RIGHT COLUMN: Enterprise Student Portal Login Card
           ════════════════════════════════════════════════════ */}
        <div className="spl-auth-column">
          <div className="spl-auth-card">
            {/* Mobile-Only Dark Logo */}
            <div className="spl-mobile-logo-bar">
              <Link href="/" aria-label="Home">
                {darkLogo ? (
                  <img src={resolveImage(darkLogo)} alt="Logo" className="spl-dark-logo" />
                ) : (
                  <div className="spl-logo-badge">
                    <span>I</span>
                  </div>
                )}
              </Link>
            </div>

            {/* Title with Site Title */}
            <div className="spl-auth-heading">
              <h1 className="spl-portal-title">
                Student Portal <span className="spl-divider-bar">|</span> <span className="spl-site-title">{siteSettings.site_name || "IINM"}</span>
              </h1>
              <p className="spl-portal-subtitle">
                Enter your registered student credentials to access your batches, syllabus &amp; live classes.
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="spl-error-banner">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="spl-form">
              <div className="spl-field">
                <label htmlFor="identifier" className="spl-label">
                  Registered Phone or Email
                </label>
                <div className="spl-input-wrap">
                  <span className="spl-input-icon">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <input
                    id="identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="name@example.com or +91..."
                    required
                    autoComplete="username"
                    className="spl-input"
                  />
                </div>
              </div>

              <div className="spl-field">
                <div className="spl-label-row">
                  <label htmlFor="password" className="spl-label">
                    Password
                  </label>
                  <a
                    href="https://wa.me/?text=Hello%20IINM%20Support%2C%20I%20need%20assistance%20recovering%20my%20student%20password."
                    target="_blank"
                    rel="noreferrer"
                    className="spl-help-link"
                  >
                    Need Help?
                  </a>
                </div>
                <div className="spl-input-wrap">
                  <span className="spl-input-icon">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter confidential password"
                    required
                    autoComplete="current-password"
                    className="spl-input spl-input-pwd"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="spl-pwd-toggle"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Obsidian Black / Red Transition Submit Button */}
              <button type="submit" disabled={loading} className="spl-btn-submit">
                <span>{loading ? "Authenticating..." : "Sign In to Portal"}</span>
                {!loading && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                )}
              </button>
            </form>

            <div className="spl-card-bottom">
              <div className="spl-security-badge">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>Encrypted Academic Session</span>
              </div>

              <div className="spl-admissions-link">
                <span>New to the institute?</span>{" "}
                <Link href="/courses" className="spl-enroll-link">
                  Explore Courses
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Scoped Layout Styles ── */}
      <style jsx global>{`
        /* Viewport Canvas */
        .spl-page {
          min-height: 100vh;
          width: 100%;
          background: #080c16;
          color: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow-x: hidden;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        .spl-glow-red {
          position: absolute;
          top: -120px;
          left: -80px;
          width: 550px;
          height: 550px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(230, 57, 70, 0.14) 0%, rgba(8, 12, 22, 0) 70%);
          filter: blur(80px);
          pointer-events: none;
        }

        .spl-glow-blue {
          position: absolute;
          bottom: -120px;
          right: -80px;
          width: 650px;
          height: 650px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(14, 116, 144, 0.12) 0%, rgba(8, 12, 22, 0) 70%);
          filter: blur(90px);
          pointer-events: none;
        }

        .spl-fine-grid {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
          background-size: 32px 32px;
          pointer-events: none;
        }

        .spl-container {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 1180px;
          min-height: 100vh;
          display: flex;
          align-items: center;
          padding: 36px 24px;
          gap: 50px;
        }

        /* ── Left Column: Showcase ── */
        .spl-showcase-column {
          flex: 1.15;
          display: flex;
          flex-direction: column;
          gap: 22px;
          min-width: 0;
        }

        .spl-brand-row {
          display: flex;
          align-items: center;
        }

        .spl-brand-link {
          display: inline-flex;
          align-items: center;
          text-decoration: none;
        }

        .spl-dark-logo {
          height: 42px;
          max-width: 160px;
          object-fit: contain;
        }

        .spl-logo-badge {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          background: linear-gradient(135deg, #e63946 0%, #0a1628 100%);
          color: #ffffff;
          font-weight: 700;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(230, 57, 70, 0.3);
        }

        /* Courses Card Section */
        .spl-courses-section {
          background: rgba(13, 22, 40, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(16px);
          border-radius: 18px;
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .spl-section-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
        }

        .spl-badge-tag {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          color: #e63946;
          text-transform: uppercase;
          display: block;
          margin-bottom: 4px;
        }

        .spl-section-title {
          font-size: 20px;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
          letter-spacing: -0.3px;
        }

        .spl-slider-controls {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .spl-ctrl-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #ffffff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .spl-ctrl-btn:hover {
          background: #e63946;
          border-color: #e63946;
        }

        .spl-course-counter {
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
        }

        .spl-card-frame {
          width: 100%;
          animation: splFade 0.4s ease-in-out;
        }

        @keyframes splFade {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Reviews Section */
        .spl-reviews-section {
          background: rgba(13, 22, 40, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .spl-review-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .spl-stars-row {
          display: flex;
          gap: 3px;
        }

        .spl-verified-tag {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: #94a3b8;
          font-weight: 500;
        }

        .spl-review-text {
          font-size: 13.5px;
          line-height: 1.55;
          color: #cbd5e1;
          font-style: italic;
          margin: 0;
        }

        .spl-reviewer-footer {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 2px;
        }

        .spl-reviewer-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #e63946;
          color: #ffffff;
          font-weight: 700;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }

        .spl-reviewer-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .spl-reviewer-name {
          font-size: 13px;
          font-weight: 600;
          color: #ffffff;
        }

        .spl-reviewer-role {
          font-size: 11px;
          color: #94a3b8;
        }

        .spl-co-name {
          color: #38bdf8;
        }

        /* ── Right Column: Auth Card ── */
        .spl-auth-column {
          flex: 0.95;
          display: flex;
          justify-content: center;
          width: 100%;
        }

        .spl-auth-card {
          width: 100%;
          max-width: 440px;
          background: #ffffff;
          color: #0f172a;
          border-radius: 20px;
          padding: 38px 34px;
          box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
        }

        .spl-mobile-logo-bar {
          display: none;
          margin-bottom: 20px;
        }

        .spl-auth-heading {
          margin-bottom: 24px;
        }

        .spl-portal-title {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.3px;
          color: #0f172a;
          margin: 0 0 6px 0;
          line-height: 1.3;
        }

        .spl-divider-bar {
          color: #cbd5e1;
          font-weight: 300;
          margin: 0 4px;
        }

        .spl-site-title {
          color: #e63946;
          font-weight: 700;
        }

        .spl-portal-subtitle {
          font-size: 13.5px;
          line-height: 1.5;
          color: #64748b;
          margin: 0;
        }

        .spl-error-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          padding: 12px 14px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 20px;
        }

        .spl-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .spl-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .spl-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .spl-label {
          font-size: 13px;
          font-weight: 600;
          color: #334155;
        }

        .spl-help-link {
          font-size: 12px;
          font-weight: 600;
          color: #e63946;
          text-decoration: none;
        }

        .spl-help-link:hover {
          text-decoration: underline;
        }

        .spl-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .spl-input-icon {
          position: absolute;
          left: 14px;
          color: #94a3b8;
          pointer-events: none;
          display: flex;
          align-items: center;
        }

        .spl-input {
          width: 100%;
          height: 48px;
          padding: 0 16px 0 42px;
          font-size: 14px;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          background: #f8fafc;
          color: #0f172a;
          outline: none;
          transition: border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
          box-sizing: border-box;
          font-family: inherit;
        }

        .spl-input:focus {
          background: #ffffff;
          border-color: #0a1628;
          box-shadow: 0 0 0 3px rgba(10, 22, 40, 0.08);
        }

        .spl-input-pwd {
          padding-right: 44px;
        }

        .spl-pwd-toggle {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
        }

        .spl-pwd-toggle:hover {
          color: #0f172a;
        }

        /* Submit Button */
        .spl-btn-submit {
          width: 100%;
          height: 48px;
          background: #0a1628;
          color: #ffffff;
          border: none;
          border-radius: 10px;
          font-size: 14.5px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          margin-top: 4px;
          box-shadow: 0 4px 14px rgba(10, 22, 40, 0.25);
        }

        .spl-btn-submit:hover:not(:disabled) {
          background: #e63946;
          box-shadow: 0 6px 20px rgba(230, 57, 70, 0.35);
          transform: translateY(-1px);
        }

        .spl-btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Card Bottom */
        .spl-card-bottom {
          margin-top: 24px;
          padding-top: 18px;
          border-top: 1px solid #f1f5f9;
          display: flex;
          flex-direction: column;
          gap: 10px;
          text-align: center;
        }

        .spl-security-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 11.5px;
          color: #64748b;
        }

        .spl-admissions-link {
          font-size: 12.5px;
          color: #64748b;
        }

        .spl-enroll-link {
          color: #0a1628;
          font-weight: 600;
          text-decoration: none;
          margin-left: 4px;
        }

        .spl-enroll-link:hover {
          color: #e63946;
          text-decoration: underline;
        }

        /* ── Mobile Responsive App UI (< 960px) ── */
        @media (max-width: 960px) {
          .spl-page {
            align-items: flex-start;
            padding: 0;
            background: #f8fafc;
          }

          .spl-container {
            flex-direction: column;
            padding: 20px 16px 40px 16px;
            gap: 20px;
            min-height: auto;
          }

          .spl-showcase-column {
            display: none;
          }

          .spl-auth-column {
            flex: 1;
            max-width: 100%;
          }

          .spl-auth-card {
            max-width: 100%;
            border-radius: 16px;
            padding: 28px 20px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
          }

          .spl-mobile-logo-bar {
            display: flex;
          }

          .spl-input {
            font-size: 16px;
            height: 50px;
          }

          .spl-btn-submit {
            height: 50px;
            font-size: 15px;
          }
        }
      `}</style>
    </div>
  );
}
