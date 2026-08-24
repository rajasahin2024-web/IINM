"use client";
import React, { useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import type { HomeHeroData, SlideData } from "./HeroSliderTypes";

interface HeroSliderAdminProps {
  heroData: HomeHeroData;
  setHeroData: React.Dispatch<React.SetStateAction<HomeHeroData>>;
  deviceBoxRef: React.RefObject<HTMLDivElement | null>;
  getThumbSrc: (data: HomeHeroData) => string;
  onResizeStart: (e: React.MouseEvent) => void;
}

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  return null;
}
function buildYouTubeUrl(id: string) { return `https://www.youtube.com/watch?v=${id}`; }

export default function HeroSliderAdmin({
  heroData,
  setHeroData,
  deviceBoxRef,
  getThumbSrc,
  onResizeStart,
}: HeroSliderAdminProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<HomeHeroData>(heroData);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [uploadingAvatarIdx, setUploadingAvatarIdx] = useState<number | null>(null);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const openEdit = () => {
    setDraft(JSON.parse(JSON.stringify(heroData)));
    setIsEditing(true);
    setSaveMsg("");
  };
  const closeEdit = () => setIsEditing(false);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await apiFetch("/api/settings/hero", {
        method: "PUT",
        body: JSON.stringify({ content_json: JSON.stringify(draft) }),
      });
      if (res.ok) {
        setHeroData(draft);
        setSaveMsg("Saved successfully!");
        setTimeout(() => setIsEditing(false), 800);
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveMsg(err.detail || "Save failed");
      }
    } catch {
      setSaveMsg("Network error while saving");
    } finally {
      setSaving(false);
    }
  };

  const savePlayerLayout = async () => {
    setSaving(true);
    try {
      const payload = { ...heroData };
      const res = await apiFetch("/api/settings/hero", {
        method: "PUT",
        body: JSON.stringify({ content_json: JSON.stringify(payload) }),
      });
      if (res.ok) {
        setToast({ msg: "Player layout saved!", type: "success" });
        setTimeout(() => setToast(null), 2500);
      } else {
        setToast({ msg: "Save failed", type: "error" });
        setTimeout(() => setToast(null), 2500);
      }
    } catch {
      setToast({ msg: "Network error", type: "error" });
      setTimeout(() => setToast(null), 2500);
    } finally {
      setSaving(false);
    }
  };

  const updateSlide = (idx: number, field: keyof SlideData, value: string) => {
    setDraft((prev) => {
      const slides = [...prev.slides];
      slides[idx] = { ...slides[idx], [field]: value };
      return { ...prev, slides };
    });
  };

  const addSlide = () => {
    setDraft((prev) => ({
      ...prev,
      slides: [
        ...prev.slides,
        {
          badge: "NEW SLIDE",
          title: "New Slide Title",
          highlightText: "",
          description: "Add description here...",
          primaryCtaText: "Get Started",
          primaryCtaLink: "/courses",
          secondaryCtaText: "Learn More",
          secondaryCtaLink: "/about-us",
          googleRating: "4.9/5",
          trustpilotRating: "5/5",
        },
      ],
    }));
  };

  const removeSlide = (idx: number) => {
    setDraft((prev) => ({
      ...prev,
      slides: prev.slides.filter((_: any, i: number) => i !== idx),
    }));
  };

  const updateAvatar = (idx: number, value: string) => {
    setDraft((prev) => {
      const imgs = [...prev.avatarImages];
      imgs[idx] = value;
      return { ...prev, avatarImages: imgs };
    });
  };

  const handleAvatarUpload = async (file: File, idx: number) => {
    setUploadingAvatarIdx(idx);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const key = `hero-avatars/avatar-${idx}-${Date.now()}.${ext}`;
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch(`/api/settings/r2/upload?key=${encodeURIComponent(key)}`, { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        updateAvatar(idx, data.url);
      }
    } finally {
      setUploadingAvatarIdx(null);
    }
  };

  const handleThumbnailUpload = async (file: File) => {
    setUploadingThumb(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const key = `hero-thumbnails/thumb-${Date.now()}.${ext}`;
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch(`/api/settings/r2/upload?key=${encodeURIComponent(key)}`, { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        setDraft((p) => ({ ...p, videoThumbnailUrl: data.url }));
      }
    } finally {
      setUploadingThumb(false);
    }
  };

  return (
    <>
      {/* Resize handle on the device player box */}
      <div
        onMouseDown={onResizeStart}
        title="Drag to resize"
        style={{
          position: "absolute",
          bottom: "-8px",
          right: "-8px",
          width: "20px",
          height: "20px",
          background: "#e63946",
          borderRadius: "4px",
          cursor: "se-resize",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 8 18 18 8 18" />
        </svg>
      </div>

      {/* Admin toolbar */}
      <div style={{ position: "absolute", top: "16px", right: "16px", zIndex: 10, display: "flex", gap: "8px" }}>
        <button
          onClick={savePlayerLayout}
          disabled={saving}
          title="Save player size & position"
          style={{
            background: "#0a1628",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "8px 14px",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            boxShadow: "0 4px 12px rgba(10, 22, 40, 0.35)",
            opacity: saving ? 0.7 : 1,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          {saving ? "Saving…" : "Save Layout"}
        </button>
        <button
          onClick={openEdit}
          title="Edit Hero Slider"
          style={{
            background: "#e63946",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "8px 14px",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            boxShadow: "0 4px 12px rgba(230, 57, 70, 0.35)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Edit
        </button>
      </div>

      {/* Edit modal */}
      {isEditing && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(10,22,40,0.75)", backdropFilter: "blur(6px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeEdit(); }}
        >
          <div style={{ background: "#ffffff", width: "100%", height: "100vh", maxHeight: "100vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "14px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0a1628", flexShrink: 0 }}>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#ffffff" }}>Edit Hero Slider</h2>
              <button onClick={closeEdit} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: "20px", padding: "4px" }}>✕</button>
            </div>
            <div style={{ flex: 1, overflow: "hidden", display: "grid", gridTemplateColumns: "340px 1fr" }}>
              <div style={{ padding: "20px", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "20px", overflow: "auto", background: "#f8fafc" }}>
                <div>
                  <label style={{ fontSize: "10px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>YouTube Video Link</label>
                  <input
                    value={buildYouTubeUrl(draft.videoYoutubeId)}
                    onChange={(e) => { const id = extractYouTubeId(e.target.value); if (id) setDraft((p) => ({ ...p, videoYoutubeId: id })); }}
                    style={{ width: "100%", marginTop: "6px", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", boxSizing: "border-box" }}
                  />
                  {draft.videoYoutubeId && (
                    <div style={{ marginTop: "8px", borderRadius: "6px", overflow: "hidden", border: "1px solid #e2e8f0", position: "relative", paddingBottom: "56.25%", height: 0, background: "#000" }}>
                      <img src={getThumbSrc(draft)} alt="Preview" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ width: "36px", height: "36px", background: "#e63946", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="#ffffff"><path d="M8 5v14l11-7z" /></svg>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ fontSize: "10px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>Custom Thumbnail (Optional)</label>
                  <div style={{ marginTop: "6px", display: "flex", gap: "8px", alignItems: "center" }}>
                    <label style={{ flexShrink: 0, background: "#0a1628", color: "#fff", borderRadius: "6px", padding: "7px 12px", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                      {uploadingThumb ? "Uploading…" : "Upload Image"}
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { if (e.target.files?.[0]) handleThumbnailUpload(e.target.files[0]); }} />
                    </label>
                    {draft.videoThumbnailUrl ? (
                      <button onClick={() => setDraft((p) => ({ ...p, videoThumbnailUrl: "" }))} style={{ background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: "6px", padding: "7px 12px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>Remove Custom</button>
                    ) : (
                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>Using YouTube auto thumbnail</span>
                    )}
                  </div>
                  {draft.videoThumbnailUrl && (
                    <div style={{ marginTop: "8px", borderRadius: "6px", overflow: "hidden", border: "1px solid #e2e8f0", position: "relative", paddingBottom: "56.25%", height: 0, background: "#000" }}>
                      <img src={draft.videoThumbnailUrl} alt="Custom Thumbnail" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  )}
                  <input value={draft.videoThumbnailUrl || ""} onChange={(e) => setDraft((p) => ({ ...p, videoThumbnailUrl: e.target.value }))} placeholder="Or paste direct image URL…" style={{ width: "100%", marginTop: "8px", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", boxSizing: "border-box" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div>
                    <label style={{ fontSize: "10px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>Google Rating</label>
                    <input value={draft.googleRatingText} onChange={(e) => setDraft((p) => ({ ...p, googleRatingText: e.target.value }))} style={{ width: "100%", marginTop: "6px", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "10px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>Stars (1-5)</label>
                    <input type="number" min={1} max={5} value={draft.googleRatingStars} onChange={(e) => setDraft((p) => ({ ...p, googleRatingStars: Math.min(5, Math.max(1, Number(e.target.value) || 1)) }))} style={{ width: "100%", marginTop: "6px", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", boxSizing: "border-box" }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "10px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>Rating Subtext</label>
                  <input value={draft.googleRatingSubtext} onChange={(e) => setDraft((p) => ({ ...p, googleRatingSubtext: e.target.value }))} style={{ width: "100%", marginTop: "6px", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: "10px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>Avatar Images (Upload)</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "8px" }}>
                    {draft.avatarImages.map((url, i) => (
                      <div key={i} style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid #e2e8f0", aspectRatio: "1", background: "#f1f5f9", position: "relative" }}>
                        {url ? <img src={url} alt={`avatar-${i}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: "11px", fontWeight: 600 }}>No Image</div>}
                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "5px", background: "rgba(10,22,40,0.55)", display: "flex", justifyContent: "center" }}>
                          <label style={{ color: "#fff", fontSize: "10px", fontWeight: 700, cursor: "pointer" }}>
                            {uploadingAvatarIdx === i ? "Uploading…" : "Upload"}
                            <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { if (e.target.files?.[0]) handleAvatarUpload(e.target.files[0], i); }} />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ padding: "20px", overflow: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>Slides ({draft.slides.length})</h3>
                  <button onClick={addSlide} style={{ background: "#0a1628", color: "#fff", border: "none", borderRadius: "6px", padding: "6px 14px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>+ Add Slide</button>
                </div>
                {draft.slides.map((s, idx) => (
                  <div key={idx} style={{ padding: "14px", borderRadius: "10px", border: "1px solid #e2e8f0", background: "#fff", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>Slide {idx + 1}</span>
                      {draft.slides.length > 1 && (
                        <button onClick={() => removeSlide(idx)} style={{ background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>Remove</button>
                      )}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <input placeholder="Badge" value={s.badge} onChange={(e) => updateSlide(idx, "badge", e.target.value)} style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }} />
                      <input placeholder="Highlight Text" value={s.highlightText} onChange={(e) => updateSlide(idx, "highlightText", e.target.value)} style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }} />
                    </div>
                    <input placeholder="Title" value={s.title} onChange={(e) => updateSlide(idx, "title", e.target.value)} style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }} />
                    <textarea placeholder="Description" value={s.description} onChange={(e) => updateSlide(idx, "description", e.target.value)} rows={2} style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", resize: "vertical" }} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px" }}>
                      <input placeholder="Primary CTA Text" value={s.primaryCtaText} onChange={(e) => updateSlide(idx, "primaryCtaText", e.target.value)} style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }} />
                      <input placeholder="Primary CTA Link" value={s.primaryCtaLink} onChange={(e) => updateSlide(idx, "primaryCtaLink", e.target.value)} style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }} />
                      <input placeholder="Secondary CTA Text" value={s.secondaryCtaText} onChange={(e) => updateSlide(idx, "secondaryCtaText", e.target.value)} style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }} />
                      <input placeholder="Secondary CTA Link" value={s.secondaryCtaLink} onChange={(e) => updateSlide(idx, "secondaryCtaLink", e.target.value)} style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }} />
                    </div>
                  </div>
                ))}
                {saveMsg && (
                  <div style={{ padding: "10px 14px", borderRadius: "8px", background: saveMsg.includes("success") ? "#f0fdf4" : "#fef2f2", color: saveMsg.includes("success") ? "#15803d" : "#b91c1c", fontSize: "13px", fontWeight: 600, border: `1px solid ${saveMsg.includes("success") ? "#bbf7d0" : "#fecaca"}` }}>{saveMsg}</div>
                )}
              </div>
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: "10px", position: "sticky", bottom: 0, background: "#fff" }}>
              <button onClick={closeEdit} style={{ background: "#f1f5f9", color: "#334155", border: "none", borderRadius: "8px", padding: "10px 18px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ background: "#0a1628", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 22px", fontSize: "13px", fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving…" : "Save Changes"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 200,
            background: toast.type === "success" ? "#0a1628" : "#e63946",
            color: "#ffffff",
            padding: "14px 22px",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: 700,
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            animation: "toastIn 0.3s ease",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {toast.type === "success" ? (
              <path d="M20 6L9 17l-5-5" />
            ) : (
              <>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </>
            )}
          </svg>
          {toast.msg}
        </div>
      )}
    </>
  );
}
