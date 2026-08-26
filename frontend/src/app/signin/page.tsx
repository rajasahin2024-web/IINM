"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { API_BASE_URL, BASE_URL } from "@/lib/config";
import { toast } from "react-hot-toast";
import CourseCard, { CourseCardType } from "@/components/CourseCard";
import "../courses/courses.css";

interface SiteSettingsData {
  site_name: string;
  meta_description?: string;
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
    meta_description: "AI Courses, Automation Training & Future Skills Institute in India",
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
          fetch(`${API_BASE_URL}/public/courses`),
          fetch(`${API_BASE_URL}/settings/learner-reviews`),
        ]);

        if (siteRes.status === "fulfilled" && siteRes.value.ok) {
          const siteData = await siteRes.value.json();
          setSiteSettings({
            site_name: siteData.site_name || "IINM",
            meta_description: siteData.meta_description || "AI Courses, Automation Training & Future Skills Institute in India",
            logo_url: siteData.logo_url || "",
            dark_logo_url: siteData.dark_logo_url || "",
          });
        }

        if (coursesRes.status === "fulfilled" && coursesRes.value.ok) {
          const courseData = await coursesRes.value.json();
          const items = Array.isArray(courseData) ? courseData : courseData.items || [];
          if (items.length > 0) setCourses(items);
        } else {
          // Fallback to /courses
          const fallbackRes = await fetch(`${API_BASE_URL}/courses`).catch(() => null);
          if (fallbackRes && fallbackRes.ok) {
            const fbData = await fallbackRes.json();
            const items = Array.isArray(fbData) ? fbData : fbData.items || [];
            if (items.length > 0) setCourses(items);
          }
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

  // Update browser Document Title
  useEffect(() => {
    const siteName = siteSettings.site_name || "IINM";
    const tagline = siteSettings.meta_description || "AI Courses, Automation Training & Future Skills Institute in India";
    document.title = `Student Portal | ${siteName} | ${tagline}`;
  }, [siteSettings]);

  // Seamless auto-slide courses (no manual icons)
  useEffect(() => {
    if (courses.length <= 1) return;
    const interval = setInterval(() => {
      setActiveCourseIndex((prev) => (prev + 1) % courses.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [courses.length]);

  // Seamless auto-slide reviews
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

  // On light background, use main logo
  const mainLogo = siteSettings.logo_url || siteSettings.dark_logo_url;

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
      toast.success(`Welcome back, ${student?.first_name || "Student"}! Access granted.`, {
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

  return (
    <div className="spl-page-light">
      {/* ── Background Subtle Light Grid & Gradients ── */}
      <div className="spl-light-glow-1" />
      <div className="spl-light-glow-2" />
      <div className="spl-light-grid" />

      <div className="spl-container">
        {/* ════════════════════════════════════════════════════
            LEFT COLUMN: Live Courses & Student Reviews Showcase (Light Mode)
           ════════════════════════════════════════════════════ */}
        <div className="spl-showcase-column">
          {/* Main Logo (No text name) */}
          <div className="spl-brand-row">
            <Link href="/" className="spl-brand-link" aria-label="Home">
              {mainLogo ? (
                <img
                  src={resolveImage(mainLogo)}
                  alt="Logo"
                  className="spl-main-logo"
                />
              ) : (
                <div className="spl-logo-badge">
                  <span>I</span>
                </div>
              )}
            </Link>
          </div>

          {/* Section 1: Live Courses Slider (/courses exact cards) */}
          <div className="spl-courses-section-light">
            <div className="spl-section-header">
              <span className="spl-badge-tag">EXECUTIVE CURRICULUM</span>
              <h2 className="spl-section-title-light">Featured Masterclasses</h2>
            </div>

            {/* Exact CourseCard from /courses (Auto-sliding, No Arrow Icons) */}
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
          <div className="spl-reviews-section-light">
            <div className="spl-review-top-bar">
              <div className="spl-stars-row">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg
                    key={i}
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill={i < currentReview.star_rating ? "#f59e0b" : "#cbd5e1"}
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ))}
              </div>
              <span className="spl-verified-tag-light">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Verified Student Review
              </span>
            </div>

            <p className="spl-review-text-light">&ldquo;{currentReview.feedback_text}&rdquo;</p>

            <div className="spl-reviewer-footer">
              <div className="spl-reviewer-avatar">
                {currentReview.avatar_url ? (
                  <img src={resolveImage(currentReview.avatar_url)} alt={currentReview.student_name} />
                ) : (
                  <span>{currentReview.student_name?.[0] || "S"}</span>
                )}
              </div>
              <div className="spl-reviewer-info">
                <div className="spl-reviewer-name-light">{currentReview.student_name}</div>
                <div className="spl-reviewer-role-light">
                  {currentReview.role_title || "Batch Scholar"}{" "}
                  {currentReview.company_name && <span className="spl-co-name-light">• {currentReview.company_name}</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════
            RIGHT COLUMN: Enterprise Student Portal Login Card
           ════════════════════════════════════════════════════ */}
        <div className="spl-auth-column">
          <div className="spl-auth-card-light">
            {/* Mobile Drawer Top Drag Bar & White UI Main Logo */}
            <div className="spl-mobile-drawer-top">
              <div className="spl-drawer-handle" />
              <div className="spl-mobile-logo-bar">
                <Link href="/" aria-label="Home">
                  {mainLogo ? (
                    <img src={resolveImage(mainLogo)} alt="Main Logo" className="spl-main-logo-mobile" />
                  ) : (
                    <div className="spl-logo-badge">
                      <span>I</span>
                    </div>
                  )}
                </Link>
              </div>
            </div>

            {/* Login Card Heading */}
            <div className="spl-auth-heading">
              <h1 className="spl-portal-title">Student Portal</h1>
              <p className="spl-portal-subtitle">
                Enter your student credentials to access your batches, syllabus &amp; live classes.
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

            {/* Form with Floating Inputs */}
            <form onSubmit={handleSubmit} className="spl-form">
              {/* Floating Input: Phone or Email */}
              <div className="spl-float-group">
                <input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder=" "
                  required
                  autoComplete="username"
                  className="spl-float-input"
                />
                <label htmlFor="identifier" className="spl-float-label">
                  Registered Phone or Email
                </label>
              </div>

              {/* Floating Input: Password */}
              <div className="spl-float-group">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=" "
                  required
                  autoComplete="current-password"
                  className="spl-float-input spl-float-input-pwd"
                />
                <label htmlFor="password" className="spl-float-label">
                  Confidential Password
                </label>

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

              {/* Need Help Link */}
              <div className="spl-forgot-row">
                <a
                  href="https://wa.me/?text=Hello%20IINM%20Support%2C%20I%20need%20assistance%20recovering%20my%20student%20password."
                  target="_blank"
                  rel="noreferrer"
                  className="spl-help-link"
                >
                  Need password assistance?
                </a>
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

      {/* ── Scoped Layout Styles (Clean Light Enterprise Mode) ── */}
      <style jsx global>{`
        /* Viewport Canvas (Light Theme) */
        .spl-page-light {
          min-height: 100vh;
          width: 100%;
          background: #f8fafc;
          color: #0f172a;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow-x: hidden;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        .spl-light-glow-1 {
          position: absolute;
          top: -120px;
          left: -80px;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(230, 57, 70, 0.05) 0%, rgba(248, 250, 252, 0) 70%);
          filter: blur(80px);
          pointer-events: none;
        }

        .spl-light-glow-2 {
          position: absolute;
          bottom: -120px;
          right: -80px;
          width: 650px;
          height: 650px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(14, 165, 233, 0.05) 0%, rgba(248, 250, 252, 0) 70%);
          filter: blur(90px);
          pointer-events: none;
        }

        .spl-light-grid {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(15, 23, 42, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(15, 23, 42, 0.02) 1px, transparent 1px);
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

        .spl-main-logo {
          height: 46px;
          max-width: 180px;
          object-fit: contain;
        }

        .spl-logo-badge {
          width: 42px;
          height: 42px;
          border-radius: 6px;
          background: linear-gradient(135deg, #e63946 0%, #0a1628 100%);
          color: #ffffff;
          font-weight: 700;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(230, 57, 70, 0.25);
        }

        /* Courses Card Section (Light) */
        .spl-courses-section-light {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px; /* slight round edge */
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
        }

        .spl-section-header {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .spl-badge-tag {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          color: #e63946;
          text-transform: uppercase;
        }

        .spl-section-title-light {
          font-size: 20px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
          letter-spacing: -0.3px;
        }

        .spl-card-frame {
          width: 100%;
          animation: splFade 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes splFade {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Reviews Section (Light) */
        .spl-reviews-section-light {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px; /* slight round edge */
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.03);
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

        .spl-verified-tag-light {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: #64748b;
          font-weight: 500;
        }

        .spl-review-text-light {
          font-size: 13.5px;
          line-height: 1.55;
          color: #334155;
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

        .spl-reviewer-info {
          display: flex;
          flex-direction: column;
        }

        .spl-reviewer-name-light {
          font-size: 13px;
          font-weight: 600;
          color: #0f172a;
        }

        .spl-reviewer-role-light {
          font-size: 11px;
          color: #64748b;
        }

        .spl-co-name-light {
          color: #0284c7;
        }

        /* ── Right Column: Auth Card (Light Theme) ── */
        .spl-auth-column {
          flex: 0.95;
          display: flex;
          justify-content: center;
          width: 100%;
        }

        .spl-auth-card-light {
          width: 100%;
          max-width: 440px;
          background: #ffffff;
          color: #0f172a;
          border-radius: 8px; /* slight round edge, no heavy rounded pill corners */
          padding: 38px 34px;
          box-shadow: 0 10px 40px -10px rgba(15, 23, 42, 0.08), 0 0 0 1px #e2e8f0;
          display: flex;
          flex-direction: column;
        }

        .spl-mobile-drawer-top {
          display: none;
        }

        .spl-auth-heading {
          margin-bottom: 24px;
        }

        .spl-portal-title {
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.4px;
          color: #0f172a;
          margin: 0 0 6px 0;
          line-height: 1.2;
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
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 20px;
        }

        .spl-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        /* ── Floating Label Inputs ── */
        .spl-float-group {
          position: relative;
          width: 100%;
        }

        .spl-float-input {
          width: 100%;
          height: 48px;
          padding: 14px 16px;
          border-radius: 6px; /* slight round edge */
          border: 1.5px solid #e2e8f0;
          background-color: #ffffff;
          font-size: 14px;
          color: #0f172a;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          box-sizing: border-box;
          font-family: inherit;
        }

        .spl-float-input::placeholder {
          color: transparent;
        }

        .spl-float-label {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 13.5px;
          color: #94a3b8;
          font-weight: 400;
          pointer-events: none;
          transition: all 0.2s cubic-bezier(.4, 0, .2, 1);
          background: transparent;
          z-index: 1;
        }

        /* Float Up */
        .spl-float-input:focus ~ .spl-float-label,
        .spl-float-input:not(:placeholder-shown) ~ .spl-float-label {
          top: -9px;
          transform: none;
          font-size: 11px;
          font-weight: 600;
          color: #0f172a;
          background: #ffffff;
          padding: 0 4px;
          letter-spacing: 0.3px;
        }

        .spl-float-input:not(:placeholder-shown):not(:focus) ~ .spl-float-label {
          color: #64748b;
        }

        .spl-float-input:focus {
          border-color: #0f172a;
          box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
        }

        .spl-float-input-pwd {
          padding-right: 44px;
        }

        .spl-pwd-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          z-index: 2;
        }

        .spl-pwd-toggle:hover {
          color: #0f172a;
        }

        .spl-forgot-row {
          display: flex;
          justify-content: flex-end;
          margin-top: -6px;
        }

        .spl-help-link {
          font-size: 12px;
          font-weight: 500;
          color: #64748b;
          text-decoration: none;
        }

        .spl-help-link:hover {
          color: #e63946;
          text-decoration: underline;
        }

        /* Submit Button (Slight Round Edge) */
        .spl-btn-submit {
          width: 100%;
          height: 48px;
          background: #0a1628;
          color: #ffffff;
          border: none;
          border-radius: 6px; /* slight round edge */
          font-size: 14.5px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          margin-top: 4px;
          box-shadow: 0 4px 14px rgba(10, 22, 40, 0.15);
        }

        .spl-btn-submit:hover:not(:disabled) {
          background: #e63946;
          box-shadow: 0 6px 20px rgba(230, 57, 70, 0.25);
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

        /* ════════════════════════════════════════════════════
            MOBILE VIEW: DRAWER STYLE + WHITE UI MAIN LOGO (< 768px)
           ════════════════════════════════════════════════════ */
        @media (max-width: 768px) {
          .spl-page-light {
            align-items: flex-end; /* Drawer anchored at bottom */
            padding: 0;
            background: #e2e8f0;
            min-height: 100vh;
          }

          .spl-container {
            flex-direction: column;
            padding: 0;
            gap: 0;
            min-height: 100vh;
            justify-content: flex-end;
          }

          .spl-showcase-column {
            display: none;
          }

          .spl-auth-column {
            flex: 1;
            width: 100%;
            display: flex;
            align-items: flex-end;
          }

          /* Bottom Drawer Sheet */
          .spl-auth-card-light {
            max-width: 100%;
            width: 100%;
            border-radius: 18px 18px 0 0; /* Drawer top rounded corners */
            padding: 24px 20px 36px 20px;
            box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.12);
            border: none;
            background: #ffffff;
            animation: splDrawerSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          }

          @keyframes splDrawerSlideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }

          .spl-mobile-drawer-top {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
            margin-bottom: 20px;
          }

          /* Drawer Drag Handle Pill */
          .spl-drawer-handle {
            width: 44px;
            height: 4px;
            border-radius: 2px;
            background: #cbd5e1;
          }

          .spl-mobile-logo-bar {
            display: flex;
            align-items: center;
            justify-content: center;
          }

          /* White UI Main Logo in Mobile View */
          .spl-main-logo-mobile {
            height: 40px;
            max-width: 160px;
            object-fit: contain;
          }

          .spl-float-input {
            font-size: 16px; /* Prevents iOS auto-zoom */
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
