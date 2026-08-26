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

interface LocationInfo {
  location: string;
  lat: number | null;
  lng: number | null;
  ip_address: string;
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
  const [fadeKey, setFadeKey] = useState(0);

  // Live Location States
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [publicIp, setPublicIp] = useState<string>("");

  // Fetch Site Settings, Courses, Reviews, Google Maps API key
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

  // Seamless auto-slide courses with smooth fade key
  useEffect(() => {
    if (courses.length <= 1) return;
    const interval = setInterval(() => {
      setActiveCourseIndex((prev) => (prev + 1) % courses.length);
      setFadeKey((prev) => prev + 1);
    }, 4500);
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

  // ── LIVE LOCATION DETECTION VIA GMAP API / NOMINATIM ──
  useEffect(() => {
    let isMounted = true;

    // 1. Fetch real public IP
    fetch("https://api.ipify.org?format=json")
      .then((r) => r.json())
      .then((d) => {
        if (isMounted && d.ip) setPublicIp(d.ip);
      })
      .catch(() => {});

    // 2. Fetch Google Maps API key from admin settings (/api/contact/google-api)
    const detectLocation = async () => {
      let gmapKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
      try {
        const googleRes = await fetch(`${API_BASE_URL}/contact/google-api`);
        if (googleRes.ok) {
          const gData = await googleRes.json();
          if (gData.google_map_api_key) gmapKey = gData.google_map_api_key;
        }
      } catch { /* ignore */ }

      const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
        // Try Google Maps Geocoding first
        if (gmapKey) {
          try {
            const res = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${gmapKey}`
            );
            const data = await res.json();
            if (data.status === "OK" && data.results && data.results.length > 0) {
              return data.results[0].formatted_address;
            }
          } catch { /* fallback to Nominatim */ }
        }

        // Fallback: OpenStreetMap Nominatim
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          if (data && data.display_name) return data.display_name;
        } catch { /* ignore */ }

        return "Location detected";
      };

      if (!navigator.geolocation) {
        if (isMounted) setLocationLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const address = await reverseGeocode(lat, lng);
            if (isMounted) {
              setLocation({
                location: address,
                lat,
                lng,
                ip_address: "",
              });
            }
          } catch {
            /* ignore */
          } finally {
            if (isMounted) setLocationLoading(false);
          }
        },
        () => {
          if (isMounted) setLocationLoading(false);
        },
        { timeout: 8000, maximumAge: 0 }
      );
    };

    detectLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  // Fallback courses if DB empty (all ratings >= 4.6)
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

  // Fallback reviews (all 5-star ratings)
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
    <div className="spl-split-layout">
      {/* ════════════════════════════════════════════════════
          COLUMN 8 (66.66%): DARK SHOWCASE CANVAS
         ════════════════════════════════════════════════════ */}
      <div className="spl-col-8-dark">
        {/* Background Ambience */}
        <div className="spl-dark-glow-1" />
        <div className="spl-dark-glow-2" />
        <div className="spl-dark-grid" />

        <div className="spl-col-8-content">
          {/* Brand Logo (Dark Logo, No Text Name) */}
          <div className="spl-brand-header">
            <Link href="/" className="spl-brand-link" aria-label="Home">
              {darkLogo ? (
                <img
                  src={resolveImage(darkLogo)}
                  alt="Logo"
                  className="spl-dark-logo-img"
                />
              ) : (
                <div className="spl-logo-badge">
                  <span>I</span>
                </div>
              )}
            </Link>
          </div>

          {/* Section 1: Exact Course Card with Ultra-Smooth Fade Slide */}
          <div className="spl-course-direct-wrap">
            <div key={fadeKey} className="spl-course-fade-frame">
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
          <div className="spl-reviews-dark-card">
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
                <span className="spl-stars-num">4.9/5</span>
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
      </div>

      {/* ════════════════════════════════════════════════════
          COLUMN 4 (33.33%): CLEAN WHITE STUDENT AUTH PANEL
         ════════════════════════════════════════════════════ */}
      <div className="spl-col-4-auth">
        <div className="spl-auth-card-clean">
          {/* Mobile-Only Modal Logo Bar */}
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

          {/* ── LIVE CURRENT LOCATION CARD (Google Maps / Geocoding) ── */}
          <div className="spl-location-card">
            {locationLoading ? (
              <div className="spl-loc-loading">
                <span className="spl-loc-spinner" />
                <span>Detecting security location…</span>
              </div>
            ) : location && location.location ? (
              <div className="spl-loc-details">
                <div className="spl-loc-top">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2.5">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span className="spl-loc-address" title={location.location}>
                    {location.location}
                  </span>
                </div>
                <div className="spl-loc-bottom">
                  {location.lat !== null && location.lng !== null && (
                    <span className="spl-loc-coords">
                      📍 {location.lat.toFixed(4)}°, {location.lng.toFixed(4)}°
                    </span>
                  )}
                  {publicIp && <span className="spl-loc-ip">IP: {publicIp}</span>}
                </div>
              </div>
            ) : (
              <div className="spl-loc-fallback">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>Encrypted Academic Session {publicIp ? `• IP: ${publicIp}` : ""}</span>
              </div>
            )}
          </div>

          <div className="spl-card-bottom">
            <div className="spl-admissions-link">
              <span>New to the institute?</span>{" "}
              <Link href="/courses" className="spl-enroll-link">
                Explore Courses
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Scoped Layout Styles (Col-8 Dark & Col-4 Auth) ── */}
      <style jsx global>{`
        /* Full Viewport Split Layout */
        .spl-split-layout {
          min-height: 100vh;
          width: 100%;
          display: flex;
          background: #ffffff;
          overflow-x: hidden;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        /* ════════════════════════════════════════════════════
            COLUMN 8 (66.66%): DARK SHOWCASE
           ════════════════════════════════════════════════════ */
        .spl-col-8-dark {
          flex: 0 0 66.666667%;
          width: 66.666667%;
          background: #070b14;
          color: #f8fafc;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 56px;
          overflow: hidden;
        }

        .spl-dark-glow-1 {
          position: absolute;
          top: -120px;
          left: -80px;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(230, 57, 70, 0.14) 0%, rgba(7, 11, 20, 0) 70%);
          filter: blur(80px);
          pointer-events: none;
        }

        .spl-dark-glow-2 {
          position: absolute;
          bottom: -120px;
          right: -80px;
          width: 650px;
          height: 650px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(14, 116, 144, 0.12) 0%, rgba(7, 11, 20, 0) 70%);
          filter: blur(90px);
          pointer-events: none;
        }

        .spl-dark-grid {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
          background-size: 32px 32px;
          pointer-events: none;
        }

        .spl-col-8-content {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 620px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .spl-brand-header {
          display: flex;
          align-items: center;
        }

        .spl-brand-link {
          display: inline-flex;
          align-items: center;
          text-decoration: none;
        }

        .spl-dark-logo-img {
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
          box-shadow: 0 4px 16px rgba(230, 57, 70, 0.3);
        }

        /* Course Direct Frame with Ultra-Smooth Fade Slide */
        .spl-course-direct-wrap {
          width: 100%;
          min-height: 280px;
        }

        .spl-course-fade-frame {
          width: 100%;
          animation: splSmoothFade 0.65s cubic-bezier(0.22, 1, 0.36, 1);
        }

        @keyframes splSmoothFade {
          0% {
            opacity: 0.15;
            transform: translateY(8px) scale(0.99);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* Reviews Dark Card */
        .spl-reviews-dark-card {
          background: rgba(13, 22, 40, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(12px);
          border-radius: 8px; /* slight round edge */
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .spl-review-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .spl-stars-row {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .spl-stars-num {
          font-size: 12px;
          font-weight: 700;
          color: #f59e0b;
          margin-left: 4px;
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
          font-size: 13px;
          line-height: 1.5;
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
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: #e63946;
          color: #ffffff;
          font-weight: 700;
          font-size: 12px;
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

        .spl-reviewer-name {
          font-size: 12.5px;
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

        /* ════════════════════════════════════════════════════
            COLUMN 4 (33.33%): WHITE AUTH CARD
           ════════════════════════════════════════════════════ */
        .spl-col-4-auth {
          flex: 0 0 33.333333%;
          width: 33.333333%;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 44px 36px;
          border-left: 1px solid #e2e8f0;
        }

        .spl-auth-card-clean {
          width: 100%;
          max-width: 390px;
          display: flex;
          flex-direction: column;
        }

        .spl-mobile-logo-bar {
          display: none;
        }

        .spl-auth-heading {
          margin-bottom: 22px;
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
          margin-bottom: 18px;
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

        /* ── Location Card (GMap API / GPS) ── */
        .spl-location-card {
          margin-top: 18px;
          padding: 10px 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 12px;
        }

        .spl-loc-loading {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #94a3b8;
          font-size: 11.5px;
        }

        .spl-loc-spinner {
          width: 12px;
          height: 12px;
          border: 2px solid #e2e8f0;
          border-top-color: #0ea5e9;
          border-radius: 50%;
          animation: splSpin 0.8s linear infinite;
        }

        @keyframes splSpin {
          to { transform: rotate(360deg); }
        }

        .spl-loc-details {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .spl-loc-top {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          color: #0f172a;
          font-weight: 600;
          font-size: 11.5px;
          line-height: 1.4;
        }

        .spl-loc-address {
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .spl-loc-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 10.5px;
          color: #64748b;
          border-top: 1px solid #f1f5f9;
          padding-top: 4px;
          margin-top: 2px;
        }

        .spl-loc-coords {
          font-family: inherit;
        }

        .spl-loc-ip {
          font-family: monospace;
          background: #f1f5f9;
          padding: 1px 5px;
          border-radius: 3px;
          color: #334155;
        }

        .spl-loc-fallback {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #64748b;
          font-size: 11.5px;
        }

        /* Card Bottom */
        .spl-card-bottom {
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid #f1f5f9;
          display: flex;
          flex-direction: column;
          gap: 8px;
          text-align: center;
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
            MOBILE VIEW: MODAL STYLE ZOOM-IN ANIMATION (< 900px)
           ════════════════════════════════════════════════════ */
        @media (max-width: 900px) {
          .spl-split-layout {
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background: #070b14;
            min-height: 100vh;
            padding: 24px 16px;
          }

          .spl-col-8-dark {
            display: none;
          }

          .spl-col-4-auth {
            flex: none;
            width: 100%;
            max-width: 440px;
            border-left: none;
            padding: 0;
            background: transparent;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          /* Modal Zoom-In Animation */
          .spl-auth-card-clean {
            max-width: 100%;
            width: 100%;
            border-radius: 10px; /* slight round edge */
            padding: 32px 24px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
            background: #ffffff;
            animation: splModalZoom 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          }

          @keyframes splModalZoom {
            0% {
              opacity: 0;
              transform: scale(0.92);
            }
            100% {
              opacity: 1;
              transform: scale(1);
            }
          }

          .spl-mobile-logo-bar {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
          }

          /* White UI Main Logo in Mobile View */
          .spl-main-logo-mobile {
            height: 42px;
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
