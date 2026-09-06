"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import PublicNavbar from "@/components/PublicNavbar";
import PublicFooter from "@/components/PublicFooter";
import { BASE_URL } from "@/lib/config";
import "./notice.css";

export interface NoticeData {
  id: number;
  title: string;
  notice_no: string | null;
  notice_date: string | null;
  category: string;
  description: string | null;
  cover_image: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  is_active: boolean;
  is_pinned: boolean;
  created_at: string | null;
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html.replace(/<[^>]*>?/gm, "").trim();
}

function formatNoticeDate(dateStr: string | null): { day: string; monthYear: string; full: string } {
  if (!dateStr) return { day: "—", monthYear: "—", full: "—" };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { day: "—", monthYear: "—", full: dateStr };

  const day = d.getDate().toString().padStart(2, "0");
  const month = d.toLocaleDateString("en-IN", { month: "short" }).toUpperCase();
  const year = d.getFullYear();
  return {
    day,
    monthYear: `${month} ${year}`,
    full: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
  };
}

function getCategoryPill(cat: string) {
  switch (cat?.toLowerCase()) {
    case "academic":
      return { bg: "#f5f3ff", color: "#7c3aed", border: "#ddd6fe" };
    case "admission":
      return { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" };
    case "examinations":
    case "exam":
      return { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" };
    case "events":
    case "event":
      return { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" };
    case "holiday":
      return { bg: "#fffbeb", color: "#d97706", border: "#fde68a" };
    default:
      return { bg: "#f1f5f9", color: "#475569", border: "#e2e8f0" };
  }
}

export default function NoticeBoardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryId = searchParams.get("id");

  const [notices, setNotices] = useState<NoticeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal active notice
  const [modalNotice, setModalNotice] = useState<NoticeData | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Fetch all public notices and categories
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [noticesRes, catsRes] = await Promise.all([
        fetch(`${BASE_URL}/api/notices/public?limit=100`),
        fetch(`${BASE_URL}/api/notices/categories`),
      ]);

      if (noticesRes.ok) {
        const data = await noticesRes.json();
        setNotices(data.items || []);
      }
      if (catsRes.ok) {
        const cats = await catsRes.json();
        setCategories(["All", ...cats]);
      }
    } catch (err) {
      console.error("Failed to load notices:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle direct URL query string parameter (?id=123)
  useEffect(() => {
    if (!queryId) {
      setModalNotice(null);
      return;
    }

    const idNum = parseInt(queryId, 10);
    if (isNaN(idNum)) return;

    // Check if notice already loaded in memory
    const existing = notices.find((n) => n.id === idNum);
    if (existing) {
      setModalNotice(existing);
    } else {
      // Fetch directly from single public notice endpoint
      setModalLoading(true);
      fetch(`${BASE_URL}/api/notices/public/${idNum}`)
        .then((res) => {
          if (!res.ok) throw new Error("Notice not found");
          return res.json();
        })
        .then((data) => {
          setModalNotice(data);
        })
        .catch(() => {
          setModalNotice(null);
        })
        .finally(() => {
          setModalLoading(false);
        });
    }
  }, [queryId, notices]);

  // Open modal & update query string cleanly
  const handleOpenNotice = (notice: NoticeData) => {
    setModalNotice(notice);
    setCopiedLink(false);
    const newUrl = `/notice?id=${notice.id}`;
    if (typeof window !== "undefined") {
      window.history.pushState({ path: newUrl }, "", newUrl);
    }
  };

  // Close modal & reset query string cleanly
  const handleCloseModal = () => {
    setModalNotice(null);
    setCopiedLink(false);
    if (typeof window !== "undefined") {
      window.history.pushState({ path: "/notice" }, "", "/notice");
    }
  };

  // Copy shareable link
  const handleCopyShareLink = () => {
    if (!modalNotice || typeof window === "undefined") return;
    const url = `${window.location.origin}/notice?id=${modalNotice.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Print notice
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  // Keyboard escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && modalNotice) {
        handleCloseModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalNotice]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (modalNotice) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalNotice]);

  // Filtered notices
  const filteredNotices = useMemo(() => {
    return notices.filter((n) => {
      const matchesCategory =
        selectedCategory === "All" ||
        n.category?.toLowerCase() === selectedCategory.toLowerCase();

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        n.title?.toLowerCase().includes(q) ||
        n.notice_no?.toLowerCase().includes(q) ||
        n.description?.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [notices, selectedCategory, searchQuery]);

  return (
    <div className="nb-page-wrap">
      <PublicNavbar />

      {/* ── HERO & HEADER (Matches Navbar 1400px Container) ── */}
      <section className="nb-hero">
        <div className="nb-hero-glow" />
        <div className="nb-container">
          {/* Breadcrumbs */}
          <div className="nb-breadcrumbs">
            <Link href="/">Home</Link>
            <span>/</span>
            <span style={{ color: "#0f172a", fontWeight: 600 }}>Notices</span>
          </div>

          <div className="nb-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            OFFICIAL CIRCULARS
          </div>

          <h1 className="nb-title">Notice Board & Announcements</h1>
          <p className="nb-subtitle">
            Stay informed with the latest institutional circulars, exam schedules, academic notifications, and events from IINM.
          </p>

          {/* Search Bar & Category Filters */}
          <div className="nb-toolbar">
            {/* Search Input */}
            <div className="nb-search-wrap">
              <span className="nb-search-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="text"
                className="nb-search-input"
                placeholder="Search notices by keyword or reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Category Tabs */}
            <div className="nb-categories-tabs">
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`nb-cat-tab ${selectedCategory === cat ? "active" : ""}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── NOTICES GRID (Aligned with container) ── */}
      <main className="nb-content-section">
        <div className="nb-container">
          {loading ? (
            <div style={{ textAlign: "center", padding: "80px 20px", color: "#64748b" }}>
              <div style={{ display: "inline-block", width: 32, height: 32, border: "3px solid #cbd5e1", borderTopColor: "#e63946", borderRadius: "50%", animation: "pulse 0.8s linear infinite" }} />
              <p style={{ marginTop: 14, fontWeight: 600 }}>Loading official notices...</p>
            </div>
          ) : filteredNotices.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 20px", background: "#ffffff", borderRadius: 16, border: "1px solid #e2e8f0", color: "#64748b" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: "0 0 8px" }}>No Notices Found</h3>
              <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>
                {searchQuery || selectedCategory !== "All"
                  ? "No notices matched your current search or category filter."
                  : "There are currently no active announcements published on the notice board."}
              </p>
            </div>
          ) : (
            <div className="nb-grid">
              {filteredNotices.map((n) => {
                const dateMeta = formatNoticeDate(n.notice_date);
                const catPill = getCategoryPill(n.category);
                const excerpt = stripHtml(n.description);

                return (
                  <article
                    key={n.id}
                    className={`nb-card ${n.is_pinned ? "nb-card-pinned" : ""}`}
                    onClick={() => handleOpenNotice(n)}
                  >
                    {/* Optional Cover Image */}
                    {n.cover_image && (
                      <div className="nb-card-img-wrap">
                        <img src={n.cover_image} alt={n.title} className="nb-card-img" />
                      </div>
                    )}

                    <div className="nb-card-body">
                      {/* Top Metadata Row: Date & Category & Urgent */}
                      <div className="nb-card-top">
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          {/* Date block */}
                          <div className="nb-date-badge">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                              <line x1="16" y1="2" x2="16" y2="6" />
                              <line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            {dateMeta.full}
                          </div>

                          {/* Category pill */}
                          <span
                            style={{
                              background: catPill.bg,
                              color: catPill.color,
                              border: `1px solid ${catPill.border}`,
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 4,
                            }}
                          >
                            {n.category}
                          </span>
                        </div>

                        {/* Pinned / Urgent */}
                        {n.is_pinned && (
                          <span className="nb-pill-urgent">
                            <span className="nb-urgent-dot" />
                            URGENT
                          </span>
                        )}
                      </div>

                      {/* Reference Number */}
                      {n.notice_no && (
                        <div className="nb-card-ref">
                          Ref: {n.notice_no}
                        </div>
                      )}

                      {/* Notice Title */}
                      <h2 className="nb-card-title">{n.title}</h2>

                      {/* Excerpt */}
                      {excerpt && <p className="nb-card-desc">{excerpt}</p>}

                      {/* Footer Actions */}
                      <div className="nb-card-footer">
                        {n.attachment_url ? (
                          <span className="nb-attachment-tag">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                            PDF Attached
                          </span>
                        ) : (
                          <span />
                        )}

                        <span className="nb-btn-read">
                          Read Notice
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <PublicFooter />

      {/* ── NOTICE DETAIL MODAL (Driven by ?id=...) ── */}
      {(modalNotice || modalLoading) && (
        <div
          className="nb-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseModal();
          }}
        >
          <div className="nb-modal-dialog">
            {modalLoading ? (
              <div style={{ padding: 60, textAlign: "center", color: "#64748b" }}>
                <p>Loading notice details...</p>
              </div>
            ) : modalNotice ? (
              <>
                {/* Modal Header */}
                <div className="nb-modal-header">
                  <div className="nb-modal-header-top">
                    <div className="nb-modal-tags">
                      {modalNotice.is_pinned && (
                        <span className="nb-pill-urgent">
                          <span className="nb-urgent-dot" />
                          URGENT NOTICE
                        </span>
                      )}
                      <span
                        style={{
                          background: getCategoryPill(modalNotice.category).bg,
                          color: getCategoryPill(modalNotice.category).color,
                          border: `1px solid ${getCategoryPill(modalNotice.category).border}`,
                          fontSize: 11.5,
                          fontWeight: 700,
                          padding: "3px 10px",
                          borderRadius: 6,
                        }}
                      >
                        {modalNotice.category}
                      </span>
                      <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
                        📅 {formatNoticeDate(modalNotice.notice_date).full}
                      </span>
                      {modalNotice.notice_no && (
                        <span style={{ fontSize: 12, color: "#0f172a", fontWeight: 700, background: "#f1f5f9", padding: "2px 8px", borderRadius: 4 }}>
                          Ref: {modalNotice.notice_no}
                        </span>
                      )}
                    </div>

                    <div className="nb-modal-actions">
                      {/* Copy Share Link */}
                      <button
                        className="nb-btn-action"
                        onClick={handleCopyShareLink}
                        title="Copy direct share link"
                      >
                        {copiedLink ? (
                          <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span style={{ color: "#059669" }}>Link Copied!</span>
                          </>
                        ) : (
                          <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                            Share Link
                          </>
                        )}
                      </button>

                      {/* Print button */}
                      <button
                        className="nb-btn-action"
                        onClick={handlePrint}
                        title="Print Notice"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 6 2 18 2 18 9" />
                          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                          <rect x="6" y="14" width="12" height="8" />
                        </svg>
                        Print
                      </button>

                      {/* Close button */}
                      <button
                        className="nb-btn-close"
                        onClick={handleCloseModal}
                        title="Close (Esc)"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <h1 className="nb-modal-title">{modalNotice.title}</h1>
                </div>

                {/* Modal Body */}
                <div className="nb-modal-body">
                  {/* Optional Cover Banner */}
                  {modalNotice.cover_image && (
                    <div className="nb-modal-cover-wrap">
                      <img src={modalNotice.cover_image} alt={modalNotice.title} className="nb-modal-cover" />
                    </div>
                  )}

                  {/* Rich HTML Content from TinyMCE */}
                  {modalNotice.description ? (
                    <div
                      className="nb-modal-content"
                      dangerouslySetInnerHTML={{ __html: modalNotice.description }}
                    />
                  ) : (
                    <p style={{ color: "#64748b", fontStyle: "italic" }}>
                      No additional text description provided for this notice.
                    </p>
                  )}

                  {/* Attachment Card (if attached) */}
                  {modalNotice.attachment_url && (
                    <div className="nb-attachment-card">
                      <div className="nb-attachment-info">
                        <div className="nb-attachment-icon">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="12" y1="18" x2="12" y2="12" />
                            <line x1="9" y1="15" x2="15" y2="15" />
                          </svg>
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                            {modalNotice.attachment_name || "Official Notice Document (PDF)"}
                          </div>
                          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                            Download the full official signed circular.
                          </div>
                        </div>
                      </div>

                      <a
                        href={modalNotice.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="nb-btn-download"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Download Document
                      </a>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
