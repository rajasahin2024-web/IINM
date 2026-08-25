"use client";
import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import PublicNavbar from "@/components/PublicNavbar";
import PublicFooter from "@/components/PublicFooter";
import { API_BASE_URL as API } from "@/lib/config";

interface PageClientProps {
  slug: string;
  initialData?: any;
}

const fmt = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};

const AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&h=80&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&h=80&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&h=80&q=80",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=80&h=80&q=80",
];

const DEFAULT_HERO_IMAGE =
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80";

const GoogleIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.9c2.28-2.1 3.645-5.2 3.645-9.15z"/>
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.1 0-5.73-2.09-6.67-4.9H1.27v3.13C3.25 21.36 7.35 24 12 24z"/>
    <path fill="#FBBC05" d="M5.33 14.3c-.24-.72-.38-1.49-.38-2.3s.14-1.58.38-2.3V6.57H1.27C.46 8.19 0 10.03 0 12s.46 3.81 1.27 5.43l4.06-3.13z"/>
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.25 2.64 1.27 6.57l4.06 3.13c.94-2.81 3.57-4.9 6.67-4.9z"/>
  </svg>
);

const ShareIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3"/>
    <circle cx="6" cy="12" r="3"/>
    <circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
);

const ChevronDown = ({ open }: { open: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      transform: open ? "rotate(180deg)" : "rotate(0deg)",
      transition: "transform 0.25s ease",
    }}
  >
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const Sk = ({ h, w = "100%", mb = 0, d = "0s" }: { h: number; w?: string; mb?: number; d?: string }) => (
  <div style={{
    height: h, width: w, background: "#e2e8f0", borderRadius: 4, marginBottom: mb,
    animation: `pg-skeleton-pulse 1.6s ease-in-out infinite`, animationDelay: d,
  }} />
);

export default function PageClient({ slug, initialData }: PageClientProps) {
  const [page, setPage] = useState<any>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [canCollapse, setCanCollapse] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialData) return;
    if (!slug) return;
    fetch(`${API}/pages/slug/${slug}`)
      .then(r => r.ok ? r.json() : null)
      .then(p => {
        if (!p) { window.location.href = "/"; return; }
        setPage(p);
        setLoading(false);
      })
      .catch(() => { setLoading(false); window.location.href = "/"; });
  }, [slug, initialData]);

  // Check if content exceeds the collapse threshold
  useEffect(() => {
    if (contentRef.current) {
      if (contentRef.current.scrollHeight > 520) {
        setCanCollapse(true);
      }
    }
  }, [page, loading]);

  const rawContent = page?.content || "";

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({ title: page?.title, url });
        return;
      } catch {}
    }
    if (url) {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
  };

  const toggleExpand = () => {
    if (expanded && contentRef.current) {
      // Scroll smoothly back to start of content on collapse
      contentRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setExpanded(prev => !prev);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#fff" }}>
        <PublicNavbar />
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "60px 48px", boxSizing: "border-box" }}>
          <Sk h={360} mb={32} />
          <Sk h={36} w="60%" mb={16} d="0.1s" />
          <Sk h={18} w="40%" mb={32} d="0.2s" />
          <Sk h={14} w="100%" mb={10} d="0.3s" />
          <Sk h={14} w="96%" mb={10} d="0.35s" />
          <Sk h={14} w="92%" mb={10} d="0.4s" />
        </div>
      </div>
    );
  }

  if (!page) return null;

  const heroImage = page.featured_image || DEFAULT_HERO_IMAGE;
  const lastUpdated = page.updated_at || page.published_at;
  const eyebrowLabel = (slug || "page").replace(/-/g, " ").toUpperCase();
  const isCollapsed = canCollapse && !expanded;

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      <PublicNavbar />

      {/* ── HEADER HERO SECTION (Warm Sand Background) ── */}
      <section className="pg-hero-section">
        <div className="pg-hero-inner">

          {/* Left Column: Eyebrow, Title, Tagline, Trust Bar, Excerpt, CTAs */}
          <div className="pg-hero-left">
            <div className="pg-hero-eyebrow">{eyebrowLabel}</div>

            <h1 className="pg-hero-title">{page.title}</h1>

            {page.excerpt && (
              <p className="pg-hero-tagline">{page.excerpt}</p>
            )}

            {/* Trust Bar: Overlapping Avatars + Enrollment Count + Google Rating */}
            <div className="pg-hero-trust">
              <div className="pg-avatar-group">
                {AVATARS.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt="Learner"
                    className="pg-avatar"
                    style={{ zIndex: AVATARS.length - i }}
                  />
                ))}
              </div>
              <span className="pg-trust-enrolled">144,000+ Enrolled</span>
              <span className="pg-trust-divider">·</span>
              <div className="pg-trust-rating">
                <GoogleIcon />
                <span className="pg-rating-num">4.8/5</span>
              </div>
            </div>

            {/* Descriptive Summary Paragraph */}
            <p className="pg-hero-desc">
              At IINM, we empower learners with high-quality education and future-proof skills. 
              Review the details below to understand how we maintain transparency, quality, and trust in every program.
            </p>

            {/* Action Buttons */}
            <div className="pg-hero-actions">
              <Link href="/courses" className="pg-btn-courses">
                Explore All Courses
              </Link>
              <Link href="/contact-us" className="pg-btn-advisor">
                Contact Advisor
              </Link>
            </div>
          </div>

          {/* Right Column: Featured Image Card (Reduced corner radius: 4px) */}
          <div className="pg-hero-right">
            <div className="pg-image-card">
              <img
                src={heroImage}
                alt={page.title}
                className="pg-card-img"
                loading="eager"
                fetchPriority="high"
              />
            </div>
          </div>

        </div>

        {/* Share & Last Updated Bar */}
        <div className="pg-hero-footer-bar">
          <button onClick={handleShare} className="pg-share-btn" title="Share this page">
            <ShareIcon />
            <span>{copied ? "Link Copied!" : "Share Page"}</span>
          </button>
          {lastUpdated && (
            <span className="pg-last-updated-text">
              Last updated: {fmt(lastUpdated)}
            </span>
          )}
        </div>
      </section>

      {/* ── MAIN ARTICLE CONTENT (Collapsible with Blur/Fade Effect) ── */}
      <main className="pg-content-wrap">
        <div
          ref={contentRef}
          className={`pg-content-container ${isCollapsed ? "pg-collapsed" : "pg-expanded"}`}
        >
          <article className="pg-content" dangerouslySetInnerHTML={{ __html: rawContent }} />

          {/* Gradient Fade / Blur Overlay (shown only when collapsed) */}
          {isCollapsed && (
            <div className="pg-fade-overlay" onClick={toggleExpand}>
              <button
                type="button"
                className="pg-expand-floating-btn"
                onClick={(e) => { e.stopPropagation(); toggleExpand(); }}
              >
                <span>Read Full Document</span>
                <ChevronDown open={false} />
              </button>
            </div>
          )}
        </div>

        {/* Toggle Button when expanded */}
        {canCollapse && expanded && (
          <div className="pg-toggle-bottom-wrap">
            <button
              type="button"
              className="pg-collapse-btn"
              onClick={toggleExpand}
            >
              <span>Show Less</span>
              <ChevronDown open={true} />
            </button>
          </div>
        )}
      </main>

      <PublicFooter />

      {/* ── STYLES ── */}
      <style>{`
        @keyframes pg-skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }

        /* Hero Section with Warm Cream Background */
        .pg-hero-section {
          background: #faf8f5;
          border-bottom: 1px solid #f0ece1;
          padding: 56px 48px 24px;
          position: relative;
        }

        .pg-hero-inner {
          max-width: 1400px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 56px;
          align-items: center;
          box-sizing: border-box;
        }

        .pg-hero-left {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .pg-hero-eyebrow {
          font-size: 11.5px;
          font-weight: 800;
          color: #64748b;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .pg-hero-title {
          font-size: clamp(30px, 3.8vw, 44px);
          font-weight: 800;
          color: #0a1628;
          line-height: 1.18;
          margin: 0 0 12px 0;
          letter-spacing: -0.6px;
        }

        .pg-hero-tagline {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          line-height: 1.45;
          margin: 0 0 16px 0;
        }

        /* Trust bar with overlapping avatars */
        .pg-hero-trust {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }

        .pg-avatar-group {
          display: flex;
          align-items: center;
        }

        .pg-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 2px solid #faf8f5;
          object-fit: cover;
          margin-left: -8px;
        }
        .pg-avatar:first-child {
          margin-left: 0;
        }

        .pg-trust-enrolled {
          font-size: 13px;
          font-weight: 700;
          color: #334155;
        }

        .pg-trust-divider {
          color: #cbd5e1;
          font-weight: 700;
        }

        .pg-trust-rating {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .pg-rating-num {
          font-size: 13px;
          font-weight: 800;
          color: #0f172a;
        }

        .pg-hero-desc {
          font-size: 14px;
          line-height: 1.65;
          color: #475569;
          margin: 0 0 24px 0;
          max-width: 600px;
        }

        /* Action buttons with slight rounded edges (6px) */
        .pg-hero-actions {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        .pg-btn-courses {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          border: 1.5px solid #0a1628;
          color: #0a1628;
          font-size: 13.5px;
          font-weight: 700;
          padding: 11px 22px;
          border-radius: 6px;
          text-decoration: none;
          transition: all 0.15s ease;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        }
        .pg-btn-courses:hover {
          background: #f1f5f9;
          transform: translateY(-1px);
        }

        .pg-btn-advisor {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #0a1628;
          border: 1.5px solid #0a1628;
          color: #ffffff;
          font-size: 13.5px;
          font-weight: 700;
          padding: 11px 22px;
          border-radius: 6px;
          text-decoration: none;
          transition: all 0.15s ease;
          box-shadow: 0 2px 6px rgba(10,22,40,0.15);
        }
        .pg-btn-advisor:hover {
          background: #1e293b;
          border-color: #1e293b;
          transform: translateY(-1px);
        }

        /* Right Column Image Card with Slight Rounded Edges (6px) */
        .pg-hero-right {
          display: flex;
          justify-content: center;
        }

        .pg-image-card {
          width: 100%;
          max-width: 520px;
          border-radius: 6px;
          overflow: hidden;
          box-shadow: 0 12px 28px rgba(10,22,40,0.1);
          border: 1px solid #e2e8f0;
          background: #0a1628;
          aspect-ratio: 16 / 10.5;
        }

        .pg-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        /* Hero Footer Bar (Share & Updated date) */
        .pg-hero-footer-bar {
          max-width: 1400px;
          margin: 32px auto 0;
          padding-top: 18px;
          border-top: 1px solid #eae5d8;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          font-size: 12.5px;
          color: #64748b;
          flex-wrap: wrap;
        }

        .pg-share-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 5px 14px;
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .pg-share-btn:hover {
          background: #ffffff;
          border-color: #0a1628;
          color: #0a1628;
        }

        .pg-last-updated-text {
          font-size: 12px;
          color: #94a3b8;
        }

        /* Main Article Content Container */
        .pg-content-wrap {
          max-width: 1400px;
          margin: 0 auto;
          padding: 48px 48px 80px;
          box-sizing: border-box;
        }

        /* Collapsed / Fade State */
        .pg-content-container {
          position: relative;
          transition: max-height 0.4s ease;
        }

        .pg-content-container.pg-collapsed {
          max-height: 480px;
          overflow: hidden;
          cursor: pointer;
        }

        .pg-content-container.pg-expanded {
          max-height: none;
        }

        /* Realistic Fade-out Gradient with Soft Blur */
        .pg-fade-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 260px;
          background: linear-gradient(
            to bottom,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.4) 30%,
            rgba(255, 255, 255, 0.85) 65%,
            #ffffff 100%
          );
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding-bottom: 16px;
          pointer-events: auto;
          backdrop-filter: blur(1.5px);
          -webkit-backdrop-filter: blur(1.5px);
        }

        .pg-expand-floating-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #0a1628;
          color: #ffffff;
          border: 1px solid #0a1628;
          border-radius: 6px;
          padding: 12px 28px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 10px 24px rgba(10,22,40,0.22);
          transition: all 0.15s ease;
        }
        .pg-expand-floating-btn:hover {
          background: #e63946;
          border-color: #e63946;
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(230,57,70,0.28);
        }

        .pg-toggle-bottom-wrap {
          margin-top: 36px;
          display: flex;
          justify-content: center;
        }

        .pg-collapse-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #ffffff;
          color: #0a1628;
          border: 1.5px solid #e2e8f0;
          border-radius: 6px;
          padding: 10px 24px;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .pg-collapse-btn:hover {
          background: #f8fafc;
          border-color: #0a1628;
        }

        /* Article Typography */
        .pg-content {
          font-size: 16.5px;
          line-height: 1.85;
          color: #334155;
          max-width: 960px;
        }
        .pg-content h1, .pg-content h2, .pg-content h3, .pg-content h4 {
          color: #0a1628;
          font-weight: 800;
          margin-top: 36px;
          margin-bottom: 16px;
          line-height: 1.3;
        }
        .pg-content h1 { font-size: 30px; }
        .pg-content h2 { font-size: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
        .pg-content h3 { font-size: 19px; }
        .pg-content p { margin-bottom: 20px; }
        .pg-content ul, .pg-content ol { margin-bottom: 20px; padding-left: 24px; }
        .pg-content li { margin-bottom: 8px; }
        .pg-content blockquote {
          border-left: 4px solid #e63946;
          padding: 16px 20px;
          margin: 24px 0;
          background: #faf8f5;
          border-radius: 0 6px 6px 0;
          font-style: italic;
          color: #475569;
        }
        .pg-content img {
          max-width: 100%;
          border-radius: 6px;
          margin: 20px 0;
          box-shadow: 0 4px 14px rgba(0,0,0,0.06);
        }
        .pg-content a {
          color: #e63946;
          text-decoration: none;
          font-weight: 600;
        }
        .pg-content a:hover {
          text-decoration: underline;
        }
        .pg-content pre {
          background: #0a1628;
          color: #e2e8f0;
          padding: 16px;
          border-radius: 6px;
          overflow-x: auto;
          font-size: 14px;
          margin: 20px 0;
        }
        .pg-content code {
          background: rgba(10,22,40,0.06);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 14px;
          color: #e63946;
        }
        .pg-content pre code {
          background: none;
          color: inherit;
          padding: 0;
        }
        .pg-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 24px 0;
        }
        .pg-content th, .pg-content td {
          border: 1px solid #e2e8f0;
          padding: 12px 16px;
          text-align: left;
        }
        .pg-content th {
          background: #faf8f5;
          font-weight: 700;
          color: #0a1628;
        }

        /* Responsive Breakpoints */
        @media (max-width: 1024px) {
          .pg-hero-inner {
            grid-template-columns: 1fr;
            gap: 36px;
          }
          .pg-image-card {
            max-width: 100%;
          }
        }

        @media (max-width: 768px) {
          .pg-hero-section {
            padding: 36px 24px 20px;
          }
          .pg-content-wrap {
            padding: 32px 24px 60px;
          }
          .pg-content h1 { font-size: 24px; }
          .pg-content h2 { font-size: 20px; }
          .pg-content h3 { font-size: 17px; }
          .pg-content { font-size: 15px; }
          .pg-hero-actions {
            width: 100%;
          }
          .pg-btn-courses, .pg-btn-advisor {
            flex: 1;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
