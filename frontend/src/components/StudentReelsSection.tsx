"use client";
import React, { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";

interface Reel {
  id: number;
  youtube_video_id: string;
  title: string | null;
  student_name: string | null;
  description: string | null;
  thumbnail_url: string;
  order_position: number;
  is_active: boolean;
}

interface SectionConfig {
  id: number;
  title: string;
  subtitle: string | null;
  is_active: boolean;
}

const DEFAULT_SECTION: SectionConfig = {
  id: 1,
  title: "Students POV",
  subtitle: "Real stories from real students",
  is_active: true,
};

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

export default function StudentReelsSection() {
  const [section, setSection] = useState<SectionConfig>(DEFAULT_SECTION);
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isEditingSection, setIsEditingSection] = useState(false);
  const [isEditingReel, setIsEditingReel] = useState(false);
  const [editReel, setEditReel] = useState<Partial<Reel>>({});
  const [editSection, setEditSection] = useState<Partial<SectionConfig>>({});
  const [isSaving, setIsSaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/settings/student-reels");
      if (res.ok) {
        const json = await res.json();
        if (json.section) setSection({ ...DEFAULT_SECTION, ...json.section });
        if (json.reels) setReels(json.reels);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    setIsAdmin(isAdminLoggedIn());
    const onStorage = () => setIsAdmin(isAdminLoggedIn());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const openReelEditor = (reel?: Reel) => {
    if (reel) setEditReel({ ...reel });
    else setEditReel({ youtube_video_id: "", title: "", student_name: "", description: "", order_position: reels.length + 1, is_active: true });
    setIsEditingReel(true);
  };

  const handleSaveReel = async () => {
    if (!editReel.youtube_video_id) return;
    setIsSaving(true);
    try {
      const isNew = !editReel.id;
      const endpoint = isNew ? "/api/settings/student-reels" : `/api/settings/student-reels/${editReel.id}`;
      const body = isNew ? {
        youtube_video_id: editReel.youtube_video_id,
        title: editReel.title,
        student_name: editReel.student_name,
        description: editReel.description,
        order_position: editReel.order_position,
        is_active: editReel.is_active,
      } : { ...editReel };
      const res = await apiFetch(endpoint, { method: isNew ? "POST" : "PUT", body: JSON.stringify(body) });
      if (res.ok) { setIsEditingReel(false); fetchData(); }
    } catch { /* ignore */ } finally { setIsSaving(false); }
  };

  const handleDeleteReel = async (id: number) => {
    if (!confirm("Delete this reel?")) return;
    try {
      const res = await apiFetch(`/api/settings/student-reels/${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch { /* ignore */ }
  };

  const handleSaveSection = async () => {
    setIsSaving(true);
    try {
      const res = await apiFetch("/api/settings/student-reels/section", {
        method: "PUT",
        body: JSON.stringify(editSection),
      });
      if (res.ok) { setIsEditingSection(false); fetchData(); }
    } catch { /* ignore */ } finally { setIsSaving(false); }
  };

  const scroll = (dir: number) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir * 280, behavior: "smooth" });
  };

  if (!section.is_active) return null;

  return (
    <section
      style={{
        position: "relative",
        background: "radial-gradient(ellipse at 50% 0%, #1a2744 0%, #0a1628 60%, #050a14 100%)",
        padding: "0 48px",
        overflow: "hidden",
      }}
    >
      <style>{`
        .sr-inner {
          max-width: 1400px;
          margin: 0 auto;
          padding: 64px 0;
        }
        .sr-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 40px;
          gap: 16px;
          flex-wrap: wrap;
        }
        .sr-title-wrap {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .sr-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 30px;
          padding: 5px 14px;
          width: fit-content;
        }
        .sr-badge-dot {
          width: 6px; height: 6px; border-radius: 50%; background: #e63946;
          animation: sr-pulse 1.5s infinite;
        }
        .sr-badge-text {
          font-size: 10px; font-weight: 800; color: rgba(255,255,255,0.7);
          letter-spacing: 1.2px; text-transform: uppercase;
        }
        .sr-h2 {
          font-size: 36px; font-weight: 850; color: #ffffff;
          letter-spacing: -1px; line-height: 1.15; margin: 0;
        }
        .sr-h2 span {
          background: linear-gradient(135deg, #e63946 0%, #ff6b7a 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .sr-subtitle {
          font-size: 16px; color: rgba(255,255,255,0.5); margin: 0;
        }
        .sr-scroll-wrap {
          position: relative;
        }
        .sr-scroll {
          display: flex;
          gap: 20px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scroll-behavior: smooth;
          padding: 8px 4px 24px;
          scrollbar-width: none;
        }
        .sr-scroll::-webkit-scrollbar { display: none; }
        .sr-card {
          flex: 0 0 240px;
          scroll-snap-align: start;
          border-radius: 24px;
          overflow: hidden;
          background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%);
          backdrop-filter: blur(14px);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255,255,255,0.08);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.45s ease, border-color 0.35s ease;
          cursor: pointer;
          position: relative;
        }
        .sr-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 24px;
          padding: 1.5px;
          background: linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.02) 50%, rgba(230,57,70,0.15) 100%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          opacity: 0.6;
          transition: opacity 0.4s ease;
        }
        .sr-card:hover {
          transform: translateY(-10px) scale(1.03);
          box-shadow: 0 28px 60px rgba(0, 0, 0, 0.55), 0 0 40px rgba(230, 57, 70, 0.18), inset 0 1px 0 rgba(255,255,255,0.12);
          border-color: rgba(230, 57, 70, 0.35);
        }
        .sr-card:hover::before {
          opacity: 1;
        }
        .sr-thumb-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 9/16;
          overflow: hidden;
          background: linear-gradient(180deg, #0f1d33 0%, #0a1628 100%);
          border-radius: 20px 20px 0 0;
        }
        .sr-thumb-wrap::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 60px;
          background: linear-gradient(to top, rgba(10,22,40,0.7) 0%, transparent 100%);
          pointer-events: none;
          z-index: 2;
        }
        .sr-thumb-wrap img {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          object-fit: cover;
          display: block;
        }
        .sr-play-overlay {
          position: absolute; inset: 0;
          background: rgba(10, 22, 40, 0.25);
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s;
        }
        .sr-card:hover .sr-play-overlay {
          background: rgba(10, 22, 40, 0.35);
        }
        .sr-play-btn {
          width: 60px; height: 60px;
          background: linear-gradient(135deg, #e63946 0%, #ff3355 100%);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          border: 3px solid rgba(255,255,255,0.95);
          box-shadow: 0 0 0 10px rgba(230, 57, 70, 0.22), 0 10px 35px rgba(230, 57, 70, 0.55), 0 0 60px rgba(230, 57, 70, 0.2);
          transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.35s ease;
          position: relative;
          z-index: 3;
        }
        .sr-play-btn::before {
          content: ''; position: absolute; inset: -4px;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.35);
          animation: sr-playRing 2.2s ease-out infinite;
        }
        .sr-play-btn::after {
          content: ''; position: absolute; inset: -8px;
          border-radius: 50%;
          border: 1px solid rgba(230, 57, 70, 0.25);
          animation: sr-playRing 2.2s ease-out 0.6s infinite;
        }
        @keyframes sr-playRing {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.7); opacity: 0; }
        }
        .sr-card:hover .sr-play-btn {
          transform: scale(1.18);
          box-shadow: 0 0 0 14px rgba(230, 57, 70, 0.18), 0 14px 45px rgba(230, 57, 70, 0.65), 0 0 80px rgba(230, 57, 70, 0.25);
        }
        .sr-card-info {
          padding: 14px 18px 16px;
          background: linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%);
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .sr-student-name {
          font-size: 14px; font-weight: 750; color: #ffffff;
          margin: 0 0 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          letter-spacing: 0.2px;
        }
        .sr-reel-title {
          font-size: 12px; color: rgba(255,255,255,0.5); margin: 0;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          line-height: 1.4;
        }
        .sr-nav-btn {
          width: 44px; height: 44px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.05);
          display: inline-flex; align-items: center; justify-content: center;
          cursor: pointer;
          color: rgba(255,255,255,0.8);
          transition: all 0.3s;
          backdrop-filter: blur(8px);
        }
        .sr-nav-btn:hover {
          background: rgba(230, 57, 70, 0.15); color: #e63946; border-color: rgba(230, 57, 70, 0.4);
        }
        .sr-admin-row {
          display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
        }
        .sr-admin-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 16px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.8); font-size: 12px; font-weight: 700;
          cursor: pointer; transition: all 0.3s;
        }
        .sr-admin-btn:hover { background: rgba(230, 57, 70, 0.15); color: #fff; border-color: rgba(230, 57, 70, 0.3); }
        .sr-card-admin {
          position: absolute; top: 8px; right: 8px;
          display: flex; gap: 6px; opacity: 0; transition: opacity 0.2s;
        }
        .sr-card:hover .sr-card-admin { opacity: 1; }
        .sr-card-admin-btn {
          width: 28px; height: 28px; border-radius: 50%;
          border: none; background: rgba(255,255,255,0.9);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #0a1628; font-size: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .sr-modal-backdrop {
          position: fixed; inset: 0; z-index: 2000;
          background: rgba(2, 6, 15, 0.92);
          backdrop-filter: blur(16px);
          display: flex; align-items: center; justify-content: center;
          padding: 32px;
        }
        .sr-modal {
          background: linear-gradient(180deg, #0f1d33 0%, #0a1628 100%);
          border-radius: 28px;
          width: 100%; max-width: 540px;
          max-height: 90vh;
          box-shadow: 0 40px 100px rgba(0,0,0,0.7), 0 0 80px rgba(230, 57, 70, 0.12);
          overflow: hidden;
          animation: sr-fadeUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid rgba(255,255,255,0.1);
          position: relative;
          display: flex; flex-direction: column;
        }
        .sr-modal::before {
          content: ''; position: absolute; top: 0; left: 20%; right: 20%; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(230,57,70,0.5), transparent);
        }
        @keyframes sr-fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .sr-modal-close {
          position: absolute; top: 16px; right: 16px;
          width: 36px; height: 36px; border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.08);
          color: #fff; cursor: pointer; display: flex;
          align-items: center; justify-content: center;
          z-index: 10;
        }
        .sr-modal-player {
          position: relative; width: 100%;
          flex: 1;
          min-height: 0;
          background: #000;
          overflow: hidden;
          border-radius: 28px 28px 0 0;
        }
        .sr-modal-player::before {
          content: '';
          display: block;
          padding-bottom: 177.78%;
        }
        .sr-modal-player iframe {
          position: absolute; inset: 0; width: 100%; height: 100%;
          border: none;
        }
        .sr-modal-glow {
          position: absolute; top: -80px; left: 50%; transform: translateX(-50%);
          width: 300px; height: 300px;
          background: radial-gradient(circle, rgba(230,57,70,0.15) 0%, transparent 70%);
          pointer-events: none; z-index: 0;
        }
        .sr-modal-info {
          padding: 20px 24px;
          background: #0a1628;
        }
        .sr-modal-name {
          font-size: 16px; font-weight: 700; color: #fff; margin: 0 0 4px;
        }
        .sr-modal-title {
          font-size: 14px; color: #94a3b8; margin: 0 0 8px;
        }
        .sr-modal-desc {
          font-size: 13px; color: #64748b; margin: 0; line-height: 1.5;
        }
        .sr-skeleton-card {
          flex: 0 0 240px; border-radius: 24px;
          aspect-ratio: 9/16;
          background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%);
          background-size: 200% 100%;
          animation: sr-shimmer 1.5s infinite;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }
        @keyframes sr-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes sr-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
        @media (max-width: 768px) {
          section { padding: 0 24px !important; }
          .sr-h2 { font-size: 28px; }
          .sr-header { margin-bottom: 28px; }
          .sr-card { flex: 0 0 200px; }
          .sr-modal-backdrop { padding: 16px; }
          .sr-modal { border-radius: 20px; max-width: 100%; max-height: 85vh; }
          .sr-modal-player { border-radius: 20px 20px 0 0; }
          .sr-modal-close { top: 12px; right: 12px; width: 32px; height: 32px; }
        }
        @media (max-width: 480px) {
          .sr-card { flex: 0 0 170px; }
          .sr-h2 { font-size: 24px; }
          .sr-modal-backdrop { padding: 8px; }
          .sr-modal { border-radius: 16px; }
          .sr-modal-player { border-radius: 16px 16px 0 0; }
        }
      `}</style>

      <div className="sr-inner">
        {/* Header */}
        <div className="sr-header">
          <div className="sr-title-wrap">
            <div className="sr-badge">
              <span className="sr-badge-dot" />
              <span className="sr-badge-text">Student Stories</span>
            </div>
            <h2 className="sr-h2">
              {section.title.split(" ").slice(0, -1).join(" ")}{" "}
              <span>{section.title.split(" ").pop()}</span>
            </h2>
            {section.subtitle && <p className="sr-subtitle">{section.subtitle}</p>}
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button className="sr-nav-btn" onClick={() => scroll(-1)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button className="sr-nav-btn" onClick={() => scroll(1)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
            {isAdmin && (
              <div className="sr-admin-row">
                <button
                  className="sr-admin-btn"
                  onClick={() => { setEditSection({ ...section }); setIsEditingSection(true); }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  Edit Section
                </button>
                <button className="sr-admin-btn" onClick={() => openReelEditor()}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add Reel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Reels Scroll */}
        <div className="sr-scroll-wrap">
          <div className="sr-scroll" ref={scrollRef}>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="sr-skeleton-card" />
                ))
              : reels.map((reel) => (
                  <div key={reel.id} className="sr-card" onClick={() => setPlayingId(reel.youtube_video_id)}>
                    <div className="sr-thumb-wrap">
                      <img
                        src={reel.thumbnail_url}
                        alt={reel.title || "Student reel"}
                        loading="lazy"
                      />
                      <div className="sr-play-overlay">
                        <div className="sr-play-btn">
                          <svg width="18" height="20" viewBox="0 0 24 24" fill="#ffffff" style={{ marginLeft: "3px" }}>
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="sr-card-admin" onClick={(e) => e.stopPropagation()}>
                          <button className="sr-card-admin-btn" onClick={() => openReelEditor(reel)} title="Edit">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                          </button>
                          <button className="sr-card-admin-btn" onClick={() => handleDeleteReel(reel.id)} title="Delete">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="sr-card-info">
                      <p className="sr-student-name">{reel.student_name || "Student"}</p>
                      <p className="sr-reel-title">{reel.title || "Student Story"}</p>
                    </div>
                  </div>
                ))}
          </div>
        </div>
      </div>

      {/* Video Play Modal */}
      {playingId && (
        <div className="sr-modal-backdrop" onClick={() => setPlayingId(null)}>
          <div className="sr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sr-modal-glow" />
            <button className="sr-modal-close" onClick={() => setPlayingId(null)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <div className="sr-modal-player">
              <iframe
                src={`https://www.youtube.com/embed/${playingId}?autoplay=1&mute=0&controls=1&modestbranding=1&rel=0&iv_load_policy=3&fs=0`}
                title="Student Reel"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
            <div className="sr-modal-info">
              {(() => {
                const r = reels.find((re) => re.youtube_video_id === playingId);
                return (
                  <>
                    <p className="sr-modal-name">{r?.student_name || "Student"}</p>
                    <p className="sr-modal-title">{r?.title || "Student Story"}</p>
                    {r?.description && <p className="sr-modal-desc">{r.description}</p>}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Section Edit Modal */}
      {isEditingSection && (
        <div className="rlc-modal-backdrop" onClick={() => setIsEditingSection(false)}>
          <div className="rlc-modal rlc-modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="rlc-modal-header">
              <h3>Edit Section</h3>
              <button className="rlc-modal-close" onClick={() => setIsEditingSection(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="rlc-modal-body">
              <div className="rlc-form-group"><label>Section Title</label>
                <input type="text" value={editSection.title || ""} onChange={(e) => setEditSection((d) => ({ ...d, title: e.target.value }))} className="rlc-form-input" />
              </div>
              <div className="rlc-form-group"><label>Subtitle</label>
                <input type="text" value={editSection.subtitle || ""} onChange={(e) => setEditSection((d) => ({ ...d, subtitle: e.target.value }))} className="rlc-form-input" />
              </div>
              <div className="rlc-form-group">
                <label><input type="checkbox" checked={editSection.is_active ?? true} onChange={(e) => setEditSection((d) => ({ ...d, is_active: e.target.checked }))} /> Active</label>
              </div>
            </div>
            <div className="rlc-modal-footer">
              <button className="rlc-btn-secondary" onClick={() => setIsEditingSection(false)}>Cancel</button>
              <button className="rlc-btn-primary" onClick={handleSaveSection} disabled={isSaving}>{isSaving ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Reel Edit Modal */}
      {isEditingReel && (
        <div className="rlc-modal-backdrop" onClick={() => setIsEditingReel(false)}>
          <div className="rlc-modal rlc-modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="rlc-modal-header">
              <h3>{editReel.id ? "Edit Reel" : "Add Reel"}</h3>
              <button className="rlc-modal-close" onClick={() => setIsEditingReel(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="rlc-modal-body">
              <div className="rlc-form-row">
                <div className="rlc-form-group" style={{ flex: 2 }}>
                  <label>YouTube Video ID *</label>
                  <input type="text" value={editReel.youtube_video_id || ""} onChange={(e) => setEditReel((d) => ({ ...d, youtube_video_id: e.target.value }))} className="rlc-form-input" placeholder="e.g. FwOTs4UxQS4" />
                </div>
                <div className="rlc-form-group" style={{ flex: 1 }}>
                  <label>Order</label>
                  <input type="number" value={editReel.order_position || 0} onChange={(e) => setEditReel((d) => ({ ...d, order_position: parseInt(e.target.value) || 0 }))} className="rlc-form-input" />
                </div>
              </div>
              <div className="rlc-form-row">
                <div className="rlc-form-group">
                  <label>Student Name</label>
                  <input type="text" value={editReel.student_name || ""} onChange={(e) => setEditReel((d) => ({ ...d, student_name: e.target.value }))} className="rlc-form-input" />
                </div>
                <div className="rlc-form-group">
                  <label>Title</label>
                  <input type="text" value={editReel.title || ""} onChange={(e) => setEditReel((d) => ({ ...d, title: e.target.value }))} className="rlc-form-input" />
                </div>
              </div>
              <div className="rlc-form-group">
                <label>Description</label>
                <textarea value={editReel.description || ""} onChange={(e) => setEditReel((d) => ({ ...d, description: e.target.value }))} className="rlc-form-textarea" rows={2} />
              </div>
              {editReel.youtube_video_id && (
                <div className="rlc-form-group">
                  <label>Preview Thumbnail</label>
                  <div style={{ borderRadius: 8, overflow: "hidden", width: 200, aspectRatio: "9/16", background: "#0a1628" }}>
                    <img src={`https://img.youtube.com/vi/${editReel.youtube_video_id}/hqdefault.jpg`} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </div>
                </div>
              )}
            </div>
            <div className="rlc-modal-footer">
              <button className="rlc-btn-secondary" onClick={() => setIsEditingReel(false)}>Cancel</button>
              <button className="rlc-btn-primary" onClick={handleSaveReel} disabled={isSaving || !editReel.youtube_video_id}>{isSaving ? "Saving..." : editReel.id ? "Update Reel" : "Add Reel"}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
