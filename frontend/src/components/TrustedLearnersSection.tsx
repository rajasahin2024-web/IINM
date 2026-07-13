"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL } from "@/lib/config";

interface Review {
  id: number;
  student_name: string;
  role_title: string | null;
  company_name: string | null;
  feedback_text: string;
  avatar_url: string | null;
  star_rating: number;
  order_position: number;
  is_active: boolean;
}

interface SectionConfig {
  id: number;
  title: string;
  subtitle: string | null;
  label: string;
  is_active: boolean;
}

const DEFAULT_SECTION: SectionConfig = {
  id: 1,
  title: "Trusted by Thousands of AI Skill Learners",
  subtitle: "Discover why learners choose IINM for their AI journey and career growth.",
  label: "Wall of Love",
  is_active: true,
};

function resolveImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${BASE_URL}${url}`;
  return url;
}

function isAdminLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  const loggedIn = localStorage.getItem("iinm_is_logged_in") === "true";
  const expiry = localStorage.getItem("iinm_login_expiry");
  if (!loggedIn) return false;
  if (expiry && new Date(expiry) < new Date()) {
    localStorage.removeItem("iinm_is_logged_in");
    localStorage.removeItem("iinm_login_expiry");
    return false;
  }
  return true;
}

function StarRow({ count }: { count: number }) {
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i < count ? "#f59e0b" : "#e2e8f0"}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

export default function TrustedLearnersSection() {
  const [section, setSection] = useState<SectionConfig>(DEFAULT_SECTION);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditingSection, setIsEditingSection] = useState(false);
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [editReview, setEditReview] = useState<Partial<Review>>({});
  const [editSection, setEditSection] = useState<Partial<SectionConfig>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [localAvatarPreview, setLocalAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/settings/learner-reviews");
      if (res.ok) {
        const json = await res.json();
        if (json.section) setSection({ ...DEFAULT_SECTION, ...json.section });
        if (json.reviews) setReviews(json.reviews);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    setIsAdmin(isAdminLoggedIn());
    const onStorage = () => setIsAdmin(isAdminLoggedIn());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [fetchData]);

  const openReviewEditor = (review?: Review) => {
    setLocalAvatarPreview(null);
    if (review) setEditReview({ ...review });
    else setEditReview({ student_name: "", role_title: "", company_name: "", feedback_text: "", avatar_url: "", star_rating: 5, order_position: reviews.length + 1, is_active: true });
    setIsEditingReview(true);
  };

  const handleSaveReview = async () => {
    if (!editReview.student_name || !editReview.feedback_text) return;
    setIsSaving(true);
    try {
      const isNew = !editReview.id;
      const endpoint = isNew ? "/api/settings/learner-reviews" : `/api/settings/learner-reviews/${editReview.id}`;
      const body = isNew ? { ...editReview } : { ...editReview };
      const res = await apiFetch(endpoint, { method: isNew ? "POST" : "PUT", body: JSON.stringify(body) });
      if (res.ok) { setIsEditingReview(false); fetchData(); }
    } catch { /* ignore */ } finally { setIsSaving(false); }
  };

  const handleDeleteReview = async (id: number) => {
    if (!confirm("Delete this review?")) return;
    try {
      const res = await apiFetch(`/api/settings/learner-reviews/${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch { /* ignore */ }
  };

  const handleSaveSection = async () => {
    setIsSaving(true);
    try {
      const res = await apiFetch("/api/settings/learner-reviews/section", { method: "PUT", body: JSON.stringify(editSection) });
      if (res.ok) { setIsEditingSection(false); fetchData(); }
    } catch { /* ignore */ } finally { setIsSaving(false); }
  };

  if (!section.is_active) return null;

  const titleWords = section.title.split(" ");
  const accentWord = titleWords.pop() || "Learners";
  const titlePrefix = titleWords.join(" ");

  const ReviewCard = ({ review }: { review: Review }) => (
    <div className="tl-card">
      <div className="tl-card-top">
        <div className="tl-avatar-row">
          {review.avatar_url ? (
            <img src={resolveImageUrl(review.avatar_url)} alt={review.student_name} className="tl-avatar" />
          ) : (
            <div className="tl-avatar-fallback">{review.student_name.charAt(0).toUpperCase()}</div>
          )}
          <div className="tl-name-col">
            <div className="tl-name-row">
              <span className="tl-name">{review.student_name}</span>
              <span className="tl-dot" />
            </div>
            <StarRow count={review.star_rating} />
          </div>
        </div>
        {review.role_title && <p className="tl-role">{review.role_title}</p>}
        <p className="tl-text">{review.feedback_text}</p>
      </div>
      <div className="tl-card-bottom">
        <span className="tl-company">{review.company_name || "IINM Learner"}</span>
        <button className="tl-arrow">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M7 17L17 7M17 7H7M17 7V17" />
          </svg>
        </button>
      </div>
      {isAdmin && (
        <div className="tl-card-admin" onClick={(e) => e.stopPropagation()}>
          <button className="tl-card-admin-btn" onClick={() => openReviewEditor(review)} title="Edit">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </button>
          <button className="tl-card-admin-btn" onClick={() => handleDeleteReview(review.id)} title="Delete">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );

  const renderCards = (suffix: string) =>
    loading
      ? Array.from({ length: 6 }).map((_, i) => <div key={`sk-${suffix}-${i}`} className="tl-skeleton" />)
      : reviews.map((r) => <ReviewCard key={`${r.id}-${suffix}`} review={r} />);

  const marqueeCards = [...renderCards('a'), ...renderCards('b')];

  return (
    <section className="tl-section">
      <style>{`
        .tl-section { position: relative; background: #ffffff; padding: 140px 48px 100px; overflow: hidden; }
        .tl-inner { max-width: 1400px; margin: 0 auto; padding: 0; position: relative; z-index: 5; }
        .tl-header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 48px; gap: 24px; flex-wrap: wrap; position: relative; z-index: 6; }
        .tl-label { font-size: 12px; font-weight: 800; color: #e63946; letter-spacing: 1.5px; text-transform: uppercase; margin: 0 0 10px; }
        .tl-h2 { font-size: 34px; font-weight: 800; color: #0f172a; letter-spacing: -0.8px; line-height: 1.2; margin: 0; }
        .tl-h2 span { color: #e63946; }
        .tl-sub { font-size: 15px; color: #64748b; margin: 0; max-width: 340px; line-height: 1.5; }
        
        /* Premium SVG Spotlight - Hanging from very top */
        .tl-spotlight-container {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 1;
        }
        .tl-spotlight-svg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 470px;
          object-fit: fill; /* Force stretch horizontally to be 100% full width of screen */
          pointer-events: none;
        }

        .tl-marquee-wrap {
          position: relative;
          z-index: 4;
          overflow: hidden;
          margin-top: 48px;
          /* Apply static mask on the stationary parent container to align perfectly with the spotlight */
          mask-image: linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0) 18%, rgba(0, 0, 0, 1) 34%, rgba(0, 0, 0, 1) 66%, rgba(0, 0, 0, 0) 82%, transparent 100%);
          -webkit-mask-image: linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0) 18%, rgba(0, 0, 0, 1) 34%, rgba(0, 0, 0, 1) 66%, rgba(0, 0, 0, 0) 82%, transparent 100%);
        }
        .tl-track {
          display: flex;
          gap: 20px;
          width: max-content;
          animation: tl-scroll 45s linear infinite;
        }
        .tl-track:hover { animation-play-state: paused; }
        @keyframes tl-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        
        /* White Premium Cards with Drop Shadows */
        .tl-card { flex: 0 0 320px; background: #ffffff; border-radius: 20px; border: 1px solid #f1f5f9; padding: 24px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); transition: transform 0.4s cubic-bezier(0.4,0,0.2,1), box-shadow 0.4s ease, border-color 0.3s ease; display: flex; flex-direction: column; justify-content: space-between; position: relative; }
        .tl-card:hover { transform: translateY(-6px); box-shadow: 0 16px 44px rgba(0,0,0,0.12); border-color: #e2e8f0; }
        .tl-card-top { flex: 1; }
        .tl-avatar-row { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
        .tl-avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid #f1f5f9; }
        .tl-avatar-fallback { width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #e63946 0%, #ff6b7a 100%); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; border: 2px solid #f1f5f9; }
        .tl-name-col { display: flex; flex-direction: column; gap: 4px; }
        .tl-name-row { display: flex; align-items: center; gap: 6px; }
        .tl-name { font-size: 14px; font-weight: 700; color: #0f172a; }
        .tl-dot { width: 6px; height: 6px; border-radius: 50%; background: #e63946; }
        .tl-role { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.8px; margin: 0 0 10px; }
        .tl-text { font-size: 13px; color: #475569; line-height: 1.65; margin: 0; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
        .tl-card-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: 18px; padding-top: 14px; border-top: 1px solid #f8fafc; }
        .tl-company { font-size: 10px; font-weight: 800; color: #cbd5e1; text-transform: uppercase; letter-spacing: 1px; }
        .tl-arrow { width: 28px; height: 28px; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff; display: flex; align-items: center; justify-content: center; color: #94a3b8; cursor: pointer; transition: all 0.3s; }
        .tl-arrow:hover { border-color: #e63946; color: #e63946; background: #fff1f2; }
        .tl-skeleton { flex: 0 0 320px; height: 220px; border-radius: 20px; background: linear-gradient(90deg, #f8fafc 25%, #f1f5f9 50%, #f8fafc 75%); background-size: 200% 100%; animation: tl-shimmer 1.5s infinite; }
        @keyframes tl-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .tl-admin-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 28px; }
        .tl-admin-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; border: 1px solid #e2e8f0; background: #f8fafc; color: #475569; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.3s; }
        .tl-admin-btn:hover { background: #fff1f2; color: #e63946; border-color: #fecdd3; }
        .tl-card-admin { position: absolute; top: 10px; right: 10px; display: flex; gap: 6px; opacity: 0; transition: opacity 0.2s; }
        .tl-card:hover .tl-card-admin { opacity: 1; }
        .tl-card-admin-btn { width: 28px; height: 28px; border-radius: 50%; border: none; background: rgba(255,255,255,0.95); display: flex; align-items: center; justify-content: center; cursor: pointer; color: #0f172a; font-size: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .tl-modal-backdrop { position: fixed; inset: 0; z-index: 2000; background: rgba(15,23,42,0.6); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; padding: 24px; }
        .tl-modal { background: #ffffff; border-radius: 24px; width: 100%; max-width: 520px; max-height: 90vh; box-shadow: 0 40px 100px rgba(0,0,0,0.15); overflow: hidden; animation: tl-fadeUp 0.35s cubic-bezier(0.4,0,0.2,1); border: 1px solid #f1f5f9; display: flex; flex-direction: column; }
        @keyframes tl-fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .tl-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #f1f5f9; }
        .tl-modal-header h3 { margin: 0; font-size: 17px; font-weight: 800; color: #0f172a; }
        .tl-modal-close { width: 32px; height: 32px; border-radius: 50%; border: 1px solid #e2e8f0; background: #f8fafc; color: #64748b; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .tl-modal-close:hover { background: #f1f5f9; color: #0f172a; }
        .tl-modal-body { padding: 20px 24px; overflow-y: auto; }
        .tl-form-group { margin-bottom: 16px; }
        .tl-form-group label { display: block; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 6px; }
        .tl-form-input, .tl-form-textarea { width: 100%; padding: 12px 14px; border-radius: 10px; border: 1.5px solid #e2e8f0; background: #fff; font-size: 14px; color: #0f172a; outline: none; transition: border-color 0.2s; box-sizing: border-box; font-family: inherit; }
        .tl-form-input:focus, .tl-form-textarea:focus { border-color: #e63946; }
        .tl-form-textarea { resize: vertical; min-height: 80px; }
        .tl-form-row { display: flex; gap: 12px; }
        .tl-form-row .tl-form-group { flex: 1; }
        .tl-modal-footer { display: flex; gap: 10px; justify-content: flex-end; padding: 16px 24px; border-top: 1px solid #f1f5f9; background: #fafafa; }
        .tl-btn-secondary { padding: 10px 20px; border-radius: 10px; border: 1.5px solid #e2e8f0; background: #fff; color: #64748b; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .tl-btn-secondary:hover { background: #f8fafc; }
        .tl-btn-primary { padding: 10px 20px; border-radius: 10px; border: none; background: linear-gradient(135deg, #e63946 0%, #ff6b7a 100%); color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .tl-btn-primary:hover { opacity: 0.92; }
        .tl-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        @media (max-width: 768px) {
          .tl-section { padding: 100px 24px 80px; }
          .tl-h2 { font-size: 26px; }
          .tl-header { margin-bottom: 32px; }
          .tl-card { flex: 0 0 280px; }
          .tl-skeleton { flex: 0 0 280px; }
          .tl-spotlight-svg { min-height: 380px; }
        }
        @media (max-width: 480px) {
          .tl-h2 { font-size: 22px; }
          .tl-card { flex: 0 0 260px; padding: 18px; }
          .tl-section { padding: 100px 16px 80px; }
          .tl-h2 { font-size: 26px; }
          .tl-header { margin-bottom: 32px; }
          .tl-card { flex: 0 0 280px; }
          .tl-skeleton { flex: 0 0 280px; }
          .tl-spotlight-svg { min-height: 320px; }
        }
        @media (max-width: 480px) {
          .tl-h2 { font-size: 22px; }
          .tl-card { flex: 0 0 260px; padding: 18px; }
        }
          .tl-h2 { font-size: 22px; }
          .tl-card { flex: 0 0 260px; padding: 18px; }
        }
      `}</style>

      {/* Global Section Spotlight - Hanging from absolute top */}
      <div className="tl-spotlight-container">
        <img
          src={resolveImageUrl("/uploads/spotlightBig.svg")}
          className="tl-spotlight-svg"
          alt="Spotlight"
        />
      </div>

      <div className="tl-inner">
        <div className="tl-header">
          <div>
            <p className="tl-label">{section.label}</p>
            <h2 className="tl-h2">
              {titlePrefix} <span>{accentWord}</span>
            </h2>
          </div>
          {section.subtitle && <p className="tl-sub">{section.subtitle}</p>}
        </div>

        {isAdmin && (
          <div className="tl-admin-row">
            <button className="tl-admin-btn" onClick={() => { setEditSection({ ...section }); setIsEditingSection(true); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              Edit Section
            </button>
            <button className="tl-admin-btn" onClick={() => openReviewEditor()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Review
            </button>
          </div>
        )}
      </div>

      <div className="tl-marquee-wrap" style={{ marginTop: isAdmin ? 16 : 0 }}>
        <div className="tl-track" ref={marqueeRef}>
          {marqueeCards}
        </div>
      </div>

      {/* Section Edit Modal */}
      {isEditingSection && (
        <div className="tl-modal-backdrop" onClick={() => setIsEditingSection(false)}>
          <div className="tl-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tl-modal-header">
              <h3>Edit Section</h3>
              <button className="tl-modal-close" onClick={() => setIsEditingSection(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="tl-modal-body">
              <div className="tl-form-group"><label>Section Title</label>
                <input type="text" value={editSection.title || ""} onChange={(e) => setEditSection(d => ({ ...d, title: e.target.value }))} className="tl-form-input" />
              </div>
              <div className="tl-form-group"><label>Label</label>
                <input type="text" value={editSection.label || ""} onChange={(e) => setEditSection(d => ({ ...d, label: e.target.value }))} className="tl-form-input" />
              </div>
              <div className="tl-form-group"><label>Subtitle</label>
                <input type="text" value={editSection.subtitle || ""} onChange={(e) => setEditSection(d => ({ ...d, subtitle: e.target.value }))} className="tl-form-input" />
              </div>
              <div className="tl-form-group">
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={editSection.is_active ?? true} onChange={(e) => setEditSection(d => ({ ...d, is_active: e.target.checked }))} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", textTransform: "none", letterSpacing: 0 }}>Active (visible on homepage)</span>
                </label>
              </div>
            </div>
            <div className="tl-modal-footer">
              <button className="tl-btn-secondary" onClick={() => setIsEditingSection(false)}>Cancel</button>
              <button className="tl-btn-primary" onClick={handleSaveSection} disabled={isSaving}>{isSaving ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Review Edit Modal */}
      {isEditingReview && (
        <div className="tl-modal-backdrop" onClick={() => setIsEditingReview(false)}>
          <div className="tl-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tl-modal-header">
              <h3>{editReview.id ? "Edit Review" : "Add Review"}</h3>
              <button className="tl-modal-close" onClick={() => setIsEditingReview(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="tl-modal-body">
              <div className="tl-form-row">
                <div className="tl-form-group"><label>Student Name *</label>
                  <input type="text" value={editReview.student_name || ""} onChange={(e) => setEditReview(d => ({ ...d, student_name: e.target.value }))} className="tl-form-input" />
                </div>
                <div className="tl-form-group" style={{ maxWidth: 90 }}><label>Order</label>
                  <input type="number" value={editReview.order_position || 0} onChange={(e) => setEditReview(d => ({ ...d, order_position: parseInt(e.target.value) || 0 }))} className="tl-form-input" />
                </div>
              </div>
              <div className="tl-form-row">
                <div className="tl-form-group"><label>Role / Title</label>
                  <input type="text" value={editReview.role_title || ""} onChange={(e) => setEditReview(d => ({ ...d, role_title: e.target.value }))} className="tl-form-input" placeholder="e.g. Product Manager" />
                </div>
                <div className="tl-form-group"><label>Company Name</label>
                  <input type="text" value={editReview.company_name || ""} onChange={(e) => setEditReview(d => ({ ...d, company_name: e.target.value }))} className="tl-form-input" />
                </div>
              </div>
              <div className="tl-form-group"><label>Star Rating</label>
                <input type="range" min={1} max={5} value={editReview.star_rating || 5} onChange={(e) => setEditReview(d => ({ ...d, star_rating: parseInt(e.target.value) }))} style={{ width: "100%" }} />
                <div style={{ marginTop: 4 }}><StarRow count={editReview.star_rating || 5} /></div>
              </div>
              <div className="tl-form-group"><label>Avatar</label>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    // Show local preview immediately
                    const localUrl = URL.createObjectURL(file);
                    setLocalAvatarPreview(localUrl);
                    setUploadingAvatar(true);
                    try {
                      const fd = new FormData();
                      fd.append("file", file);
                      const res = await apiFetch("/api/settings/site/upload", { method: "POST", body: fd });
                      if (res.ok) {
                        const data = await res.json();
                        setEditReview(d => ({ ...d, avatar_url: data.url }));
                        setLocalAvatarPreview(null);
                      } else {
                        const err = await res.text().catch(() => "");
                        alert("Upload failed: " + (err || res.statusText));
                      }
                    } catch (e) {
                      alert("Upload error: " + (e instanceof Error ? e.message : "Network error"));
                    } finally { setUploadingAvatar(false); }
                  }}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  {(localAvatarPreview || editReview.avatar_url) ? (
                    <img src={localAvatarPreview || resolveImageUrl(editReview.avatar_url) || ""} alt="Avatar" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: "2px solid #f1f5f9" }} />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, #e63946 0%, #ff6b7a 100%)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700 }}>
                      {(editReview.student_name || "A").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    style={{ padding: "8px 14px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#f8fafc", color: "#475569", fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}
                  >
                    {uploadingAvatar ? "Uploading..." : (editReview.avatar_url || localAvatarPreview ? "Change Avatar" : "Upload Avatar")}
                  </button>
                </div>
              </div>
              <div className="tl-form-group"><label>Feedback Text *</label>
                <textarea value={editReview.feedback_text || ""} onChange={(e) => setEditReview(d => ({ ...d, feedback_text: e.target.value }))} className="tl-form-textarea" rows={3} />
              </div>
              <div className="tl-form-group">
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={editReview.is_active ?? true} onChange={(e) => setEditReview(d => ({ ...d, is_active: e.target.checked }))} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", textTransform: "none", letterSpacing: 0 }}>Active</span>
                </label>
              </div>
            </div>
            <div className="tl-modal-footer">
              <button className="tl-btn-secondary" onClick={() => setIsEditingReview(false)}>Cancel</button>
              <button className="tl-btn-primary" onClick={handleSaveReview} disabled={isSaving || !editReview.student_name || !editReview.feedback_text}>{isSaving ? "Saving..." : editReview.id ? "Update Review" : "Add Review"}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
