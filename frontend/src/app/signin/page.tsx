"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { API_BASE_URL, BASE_URL } from "@/lib/config";
import { toast } from "react-hot-toast";

interface SiteSettingsData {
  site_name: string;
  logo_url: string;
}

interface CourseItem {
  id: number;
  title: string;
  slug: string;
  thumbnail_url: string | null;
  price: number | null;
  discount_price: number | null;
  currency: string;
  skill_level: string | null;
  instructor_name: string | null;
  instructors?: { id: number; name: string }[];
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
  });

  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [activeCourseIdx, setActiveCourseIdx] = useState(0);
  const [activeReviewIdx, setActiveReviewIdx] = useState(0);

  // Auto-slide courses & reviews
  useEffect(() => {
    if (courses.length <= 1) return;
    const interval = setInterval(() => {
      setActiveCourseIdx((prev) => (prev + 1) % courses.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [courses.length]);

  useEffect(() => {
    if (reviews.length <= 1) return;
    const interval = setInterval(() => {
      setActiveReviewIdx((prev) => (prev + 1) % reviews.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [reviews.length]);

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
          });
        }

        if (coursesRes.status === "fulfilled" && coursesRes.value.ok) {
          const courseData = await coursesRes.value.json();
          const items = Array.isArray(courseData) ? courseData : courseData.items || [];
          if (items.length > 0) setCourses(items.slice(0, 8));
        }

        if (reviewsRes.status === "fulfilled" && reviewsRes.value.ok) {
          const revData = await reviewsRes.value.json();
          const items = Array.isArray(revData) ? revData : revData.reviews || [];
          if (items.length > 0) setReviews(items.slice(0, 6));
        }
      } catch {
        /* fallback content will render */
      }
    };
    fetchData();
  }, []);

  // Fallback courses if DB empty
  const displayCourses = courses.length > 0 ? courses : [
    {
      id: 1,
      title: "Mastering AI Agents & Autonomous Workflows",
      slug: "ai-agents",
      thumbnail_url: null,
      price: 24999,
      discount_price: 14999,
      currency: "INR",
      skill_level: "Advanced",
      instructor_name: "Industry Faculty",
    },
    {
      id: 2,
      title: "Enterprise Full-Stack & Cloud Architecture",
      slug: "full-stack-cloud",
      thumbnail_url: null,
      price: 29999,
      discount_price: 19999,
      currency: "INR",
      skill_level: "Comprehensive",
      instructor_name: "Lead Architects",
    },
    {
      id: 3,
      title: "Executive Prompt Engineering & LLMOps",
      slug: "llmops-mastery",
      thumbnail_url: null,
      price: 18999,
      discount_price: 11999,
      currency: "INR",
      skill_level: "Professional",
      instructor_name: "AI Researchers",
    },
  ];

  // Fallback reviews if DB empty
  const displayReviews = reviews.length > 0 ? reviews : [
    {
      id: 1,
      student_name: "Sneha Mukherjee",
      role_title: "AI Engineer",
      company_name: "Global Tech",
      feedback_text: "The structured curriculum and 1-on-1 mentor guidance transformed my engineering career. The live projects are unmatched.",
      avatar_url: null,
      star_rating: 5,
    },
    {
      id: 2,
      student_name: "Rohan Varma",
      role_title: "Product Architect",
      company_name: "Fintech Leader",
      feedback_text: "Hands down the most rigorous, industry-relevant curriculum in India. Exceptional faculty and real-time support.",
      avatar_url: null,
      star_rating: 5,
    },
    {
      id: 3,
      student_name: "Pooja Hegde",
      role_title: "Data Analyst",
      company_name: "Consulting Co.",
      feedback_text: "I landed my dream role within 2 months of batch completion. The doubt-solving and peer community are incredible.",
      avatar_url: null,
      star_rating: 5,
    },
  ];

  const currentCourse = displayCourses[activeCourseIdx % displayCourses.length];
  const currentReview = displayReviews[activeReviewIdx % displayReviews.length];

  const resolveImage = (url: string | null | undefined) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (url.startsWith("/")) return `${BASE_URL}${url}`;
    return url;
  };

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
          background: "#0a0f1d",
          color: "#f8fafc",
          border: "1px solid rgba(255,255,255,0.1)",
          fontSize: "14px",
          fontWeight: "500",
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(msg === "Failed to fetch" ? "Unable to reach server. Please check your connection." : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ep-viewport">
      {/* ── Background Ambience ── */}
      <div className="ep-bg-glow-1" />
      <div className="ep-bg-glow-2" />
      <div className="ep-bg-grid" />

      <div className="ep-canvas">
        {/* ════════════════════════════════════════════════════
            LEFT: Enterprise University Showcase (Desktop/Tablet)
           ════════════════════════════════════════════════════ */}
        <div className="ep-showcase">
          {/* Top Brand & Institutional Crest */}
          <div className="ep-showcase-header">
            <Link href="/" className="ep-brand">
              {siteSettings.logo_url ? (
                <img
                  src={siteSettings.logo_url}
                  alt={siteSettings.site_name}
                  className="ep-brand-logo"
                />
              ) : (
                <div className="ep-brand-crest">
                  <span>{siteSettings.site_name?.[0] || "I"}</span>
                </div>
              )}
              <div className="ep-brand-text">
                <span className="ep-brand-name">{siteSettings.site_name || "IINM"}</span>
                <span className="ep-brand-tagline">Institute of Innovation &amp; Management</span>
              </div>
            </Link>

            <div className="ep-portal-badge">
              <span className="ep-pulse-dot" />
              <span>LIVE ADMISSIONS &amp; ACADEMICS</span>
            </div>
          </div>

          {/* Centerpiece: Hero Message */}
          <div className="ep-showcase-center">
            <div className="ep-hero-tag">
              <span>Next-Gen Career Excellence</span>
            </div>
            <h1 className="ep-hero-title">
              Empowering Future <span className="ep-crimson-text">Leaders</span> with Industry Mastery.
            </h1>
            <p className="ep-hero-sub">
              Access real-time lecture streams, curriculum tracking, interactive assignments, and direct faculty office hours.
            </p>
          </div>

          {/* ── Dynamic Live Course Spotlight Slider ── */}
          <div className="ep-course-spotlight">
            <div className="ep-spotlight-top">
              <div className="ep-spotlight-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span>FEATURED CURRICULUM</span>
              </div>
              <div className="ep-slider-dots">
                {displayCourses.slice(0, 5).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveCourseIdx(i)}
                    className={`ep-dot ${activeCourseIdx % Math.min(displayCourses.length, 5) === i ? "ep-dot-active" : ""}`}
                    aria-label={`Slide ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            <div className="ep-course-card">
              <div className="ep-course-thumb-box">
                {currentCourse.thumbnail_url ? (
                  <img
                    src={resolveImage(currentCourse.thumbnail_url)}
                    alt={currentCourse.title}
                    className="ep-course-img"
                  />
                ) : (
                  <div className="ep-course-placeholder">
                    <span>AI</span>
                  </div>
                )}
                {currentCourse.skill_level && (
                  <span className="ep-level-pill">{currentCourse.skill_level}</span>
                )}
              </div>

              <div className="ep-course-info">
                <h3 className="ep-course-title">{currentCourse.title}</h3>
                <div className="ep-course-meta">
                  <span className="ep-instructor-name">
                    Faculty: {currentCourse.instructor_name || "IINM Lead Faculty"}
                  </span>
                  {currentCourse.discount_price && (
                    <span className="ep-price-tag">
                      ₹{currentCourse.discount_price.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Student Testimonial / Review Ticker ── */}
          <div className="ep-review-ticker">
            <div className="ep-review-header">
              <div className="ep-stars">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill="#e63946">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ))}
              </div>
              <span className="ep-review-badge">Verified Learner Review</span>
            </div>

            <p className="ep-review-quote">&ldquo;{currentReview.feedback_text}&rdquo;</p>

            <div className="ep-review-author">
              <div className="ep-author-avatar">
                {currentReview.avatar_url ? (
                  <img src={resolveImage(currentReview.avatar_url)} alt={currentReview.student_name} />
                ) : (
                  <span>{currentReview.student_name?.[0] || "S"}</span>
                )}
              </div>
              <div className="ep-author-details">
                <div className="ep-author-name">{currentReview.student_name}</div>
                <div className="ep-author-role">
                  {currentReview.role_title || "Batch Scholar"} {currentReview.company_name ? `• ${currentReview.company_name}` : ""}
                </div>
              </div>
            </div>
          </div>

          {/* Institutional Stats Strip */}
          <div className="ep-stats-strip">
            <div className="ep-stat-item">
              <span className="ep-stat-val">100%</span>
              <span className="ep-stat-lbl">Live Mentorship</span>
            </div>
            <div className="ep-stat-item">
              <span className="ep-stat-val">4.9/5</span>
              <span className="ep-stat-lbl">Student Rating</span>
            </div>
            <div className="ep-stat-item">
              <span className="ep-stat-val">50+</span>
              <span className="ep-stat-lbl">Hiring Partners</span>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════
            RIGHT: High-Precision Student Portal Card
           ════════════════════════════════════════════════════ */}
        <div className="ep-auth-panel">
          <div className="ep-auth-card">
            {/* Mobile Header Brand Bar */}
            <div className="ep-mobile-brand">
              <Link href="/" className="ep-brand">
                {siteSettings.logo_url ? (
                  <img src={siteSettings.logo_url} alt={siteSettings.site_name} className="ep-brand-logo" />
                ) : (
                  <div className="ep-brand-crest">
                    <span>{siteSettings.site_name?.[0] || "I"}</span>
                  </div>
                )}
                <span className="ep-brand-name">{siteSettings.site_name || "IINM"}</span>
              </Link>
              <div className="ep-mobile-badge">Portal</div>
            </div>

            {/* Title & Hierarchy */}
            <div className="ep-auth-header">
              <div className="ep-auth-pill">STUDENT ACCESS</div>
              <h2 className="ep-auth-title">Sign in to your Portal</h2>
              <p className="ep-auth-desc">
                Enter your registered credentials to access your academic dashboard, lectures &amp; materials.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="ep-error-banner">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="ep-form">
              <div className="ep-field">
                <label htmlFor="identifier" className="ep-label">
                  Registered Phone or Email
                </label>
                <div className="ep-input-wrap">
                  <span className="ep-input-icon">
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
                    placeholder="e.g. +91 98765 43210 or name@domain.com"
                    required
                    autoComplete="username"
                    className="ep-input"
                  />
                </div>
              </div>

              <div className="ep-field">
                <div className="ep-label-row">
                  <label htmlFor="password" className="ep-label">
                    Password
                  </label>
                  <a
                    href="https://wa.me/?text=Hello%20IINM%20Support%2C%20I%20need%20assistance%20recovering%20my%20student%20account%20password."
                    target="_blank"
                    rel="noreferrer"
                    className="ep-forgot-link"
                  >
                    Need Help?
                  </a>
                </div>
                <div className="ep-input-wrap">
                  <span className="ep-input-icon">
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
                    placeholder="Enter your confidential password"
                    required
                    autoComplete="current-password"
                    className="ep-input ep-input-pwd"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="ep-pwd-btn"
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

              {/* Primary Action Button */}
              <button type="submit" disabled={loading} className="ep-submit-btn">
                <span>{loading ? "Authenticating Session..." : "Sign In to Portal"}</span>
                {!loading && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                )}
              </button>
            </form>

            {/* Bottom Support & Security Assurance */}
            <div className="ep-auth-footer">
              <div className="ep-security-note">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>256-Bit TLS Encrypted Academic Session</span>
              </div>

              <div className="ep-enrollment-help">
                <span>Not registered in a batch yet?</span>{" "}
                <Link href="/courses" className="ep-explore-link">
                  Explore Masterclasses
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── World-Class Scoped Styles ── */}
      <style jsx global>{`
        /* Viewport Reset & Background */
        .ep-viewport {
          min-height: 100vh;
          width: 100%;
          background: #060913;
          color: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow-x: hidden;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Segoe UI", Roboto, sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        .ep-bg-glow-1 {
          position: absolute;
          top: -150px;
          left: -100px;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(230, 57, 70, 0.12) 0%, rgba(10, 15, 29, 0) 70%);
          filter: blur(80px);
          pointer-events: none;
        }

        .ep-bg-glow-2 {
          position: absolute;
          bottom: -150px;
          right: -100px;
          width: 700px;
          height: 700px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(30, 58, 138, 0.18) 0%, rgba(10, 15, 29, 0) 70%);
          filter: blur(90px);
          pointer-events: none;
        }

        .ep-bg-grid {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }

        .ep-canvas {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 1240px;
          min-height: 100vh;
          display: flex;
          align-items: center;
          padding: 40px 24px;
          gap: 60px;
        }

        /* ── Left Showcase Column ── */
        .ep-showcase {
          flex: 1.15;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .ep-showcase-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .ep-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
        }

        .ep-brand-logo {
          height: 38px;
          max-width: 130px;
          object-fit: contain;
        }

        .ep-brand-crest {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #e63946 0%, #991b1b 100%);
          color: #ffffff;
          font-weight: 700;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(230, 57, 70, 0.35);
        }

        .ep-brand-text {
          display: flex;
          flex-direction: column;
        }

        .ep-brand-name {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.3px;
          color: #ffffff;
        }

        .ep-brand-tagline {
          font-size: 11px;
          color: #94a3b8;
          letter-spacing: 0.2px;
        }

        .ep-portal-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(230, 57, 70, 0.1);
          border: 1px solid rgba(230, 57, 70, 0.25);
          color: #ff8b94;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.6px;
          padding: 6px 14px;
          border-radius: 100px;
        }

        .ep-pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #e63946;
          box-shadow: 0 0 8px #e63946;
          animation: epPulse 2s infinite ease-in-out;
        }

        @keyframes epPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }

        .ep-hero-tag {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #38bdf8;
          margin-bottom: 12px;
        }

        .ep-hero-title {
          font-size: 38px;
          font-weight: 700;
          line-height: 1.18;
          letter-spacing: -0.8px;
          color: #ffffff;
          margin: 0 0 14px 0;
        }

        .ep-crimson-text {
          color: #e63946;
          font-weight: 700;
        }

        .ep-hero-sub {
          font-size: 15px;
          line-height: 1.6;
          color: #94a3b8;
          margin: 0;
          max-width: 520px;
        }

        /* Course Spotlight Card */
        .ep-course-spotlight {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(16px);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          transition: border-color 0.3s ease;
        }

        .ep-course-spotlight:hover {
          border-color: rgba(230, 57, 70, 0.3);
        }

        .ep-spotlight-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .ep-spotlight-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.6px;
          color: #f59e0b;
        }

        .ep-slider-dots {
          display: flex;
          gap: 6px;
        }

        .ep-dot {
          width: 20px;
          height: 3px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.15);
          border: none;
          cursor: pointer;
          transition: background 0.3s ease;
        }

        .ep-dot-active {
          background: #e63946;
        }

        .ep-course-card {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .ep-course-thumb-box {
          width: 90px;
          height: 64px;
          border-radius: 10px;
          overflow: hidden;
          background: #1e293b;
          position: relative;
          flex-shrink: 0;
        }

        .ep-course-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .ep-course-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          font-weight: 800;
          color: #e63946;
          font-size: 20px;
        }

        .ep-level-pill {
          position: absolute;
          bottom: 4px;
          left: 4px;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          font-size: 9px;
          font-weight: 600;
          color: #f1f5f9;
          padding: 1px 6px;
          border-radius: 4px;
        }

        .ep-course-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .ep-course-title {
          font-size: 15px;
          font-weight: 600;
          color: #f1f5f9;
          margin: 0;
          line-height: 1.35;
        }

        .ep-course-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
          color: #94a3b8;
        }

        .ep-price-tag {
          font-weight: 700;
          color: #10b981;
        }

        /* Review Ticker */
        .ep-review-ticker {
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 14px;
          padding: 16px 18px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .ep-review-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .ep-stars {
          display: flex;
          gap: 3px;
        }

        .ep-review-badge {
          font-size: 11px;
          color: #64748b;
          font-weight: 500;
        }

        .ep-review-quote {
          font-size: 13.5px;
          line-height: 1.5;
          color: #cbd5e1;
          font-style: italic;
          margin: 0;
        }

        .ep-review-author {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .ep-author-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #e63946;
          color: #ffffff;
          font-weight: 600;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }

        .ep-author-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .ep-author-details {
          display: flex;
          flex-direction: column;
        }

        .ep-author-name {
          font-size: 12.5px;
          font-weight: 600;
          color: #f1f5f9;
        }

        .ep-author-role {
          font-size: 11px;
          color: #94a3b8;
        }

        /* Stats Strip */
        .ep-stats-strip {
          display: flex;
          justify-content: space-between;
          padding-top: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .ep-stat-item {
          display: flex;
          flex-direction: column;
        }

        .ep-stat-val {
          font-size: 18px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.3px;
        }

        .ep-stat-lbl {
          font-size: 11.5px;
          color: #64748b;
        }

        /* ════════════════════════════════════════════════════
            RIGHT: High Precision Auth Panel
           ════════════════════════════════════════════════════ */
        .ep-auth-panel {
          flex: 0.95;
          display: flex;
          justify-content: center;
          width: 100%;
        }

        .ep-auth-card {
          width: 100%;
          max-width: 440px;
          background: #ffffff;
          color: #0f172a;
          border-radius: 20px;
          padding: 40px 36px;
          box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
          position: relative;
        }

        .ep-mobile-brand {
          display: none;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }

        .ep-mobile-brand .ep-brand-name {
          color: #0f172a;
        }

        .ep-mobile-badge {
          background: #f1f5f9;
          color: #475569;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 6px;
          text-transform: uppercase;
        }

        .ep-auth-header {
          margin-bottom: 24px;
        }

        .ep-auth-pill {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.8px;
          color: #e63946;
          background: rgba(230, 57, 70, 0.08);
          padding: 4px 10px;
          border-radius: 6px;
          margin-bottom: 12px;
        }

        .ep-auth-title {
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.4px;
          color: #0f172a;
          margin: 0 0 8px 0;
        }

        .ep-auth-desc {
          font-size: 13.5px;
          line-height: 1.5;
          color: #64748b;
          margin: 0;
        }

        .ep-error-banner {
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

        .ep-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .ep-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .ep-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .ep-label {
          font-size: 13px;
          font-weight: 600;
          color: #334155;
        }

        .ep-forgot-link {
          font-size: 12px;
          font-weight: 600;
          color: #e63946;
          text-decoration: none;
          transition: opacity 0.2s;
        }

        .ep-forgot-link:hover {
          opacity: 0.8;
          text-decoration: underline;
        }

        .ep-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .ep-input-icon {
          position: absolute;
          left: 14px;
          color: #94a3b8;
          pointer-events: none;
          display: flex;
          align-items: center;
        }

        .ep-input {
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

        .ep-input:focus {
          background: #ffffff;
          border-color: #0f172a;
          box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
        }

        .ep-input-pwd {
          padding-right: 44px;
        }

        .ep-pwd-btn {
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
          transition: color 0.2s;
        }

        .ep-pwd-btn:hover {
          color: #0f172a;
        }

        /* Submit Button: Sleek Black / Crimson Transition */
        .ep-submit-btn {
          width: 100%;
          height: 48px;
          background: #0f172a;
          color: #ffffff;
          border: none;
          border-radius: 10px;
          font-size: 14.5px;
          font-weight: 600;
          letter-spacing: -0.1px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          margin-top: 4px;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.25);
        }

        .ep-submit-btn:hover:not(:disabled) {
          background: #e63946;
          box-shadow: 0 6px 20px rgba(230, 57, 70, 0.35);
          transform: translateY(-1px);
        }

        .ep-submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .ep-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Card Footer */
        .ep-auth-footer {
          margin-top: 28px;
          padding-top: 20px;
          border-top: 1px solid #f1f5f9;
          display: flex;
          flex-direction: column;
          gap: 10px;
          text-align: center;
        }

        .ep-security-note {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 11.5px;
          color: #64748b;
        }

        .ep-enrollment-help {
          font-size: 12.5px;
          color: #64748b;
        }

        .ep-explore-link {
          color: #0f172a;
          font-weight: 600;
          text-decoration: none;
          margin-left: 4px;
        }

        .ep-explore-link:hover {
          color: #e63946;
          text-decoration: underline;
        }

        /* ════════════════════════════════════════════════════
            MOBILE APP EXPERIENCE (< 960px)
           ════════════════════════════════════════════════════ */
        @media (max-width: 960px) {
          .ep-viewport {
            align-items: flex-start;
            padding: 0;
            background: #f8fafc;
          }

          .ep-canvas {
            flex-direction: column;
            padding: 20px 16px 40px 16px;
            gap: 20px;
            min-height: auto;
          }

          .ep-showcase {
            display: none; /* Clean mobile app focus */
          }

          .ep-auth-panel {
            flex: 1;
            max-width: 100%;
          }

          .ep-auth-card {
            max-width: 100%;
            border-radius: 16px;
            padding: 28px 20px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
          }

          .ep-mobile-brand {
            display: flex;
          }

          .ep-input {
            font-size: 16px; /* Prevents iOS auto-zoom */
            height: 50px;
          }

          .ep-submit-btn {
            height: 50px;
            font-size: 15px;
          }
        }
      `}</style>
    </div>
  );
}
