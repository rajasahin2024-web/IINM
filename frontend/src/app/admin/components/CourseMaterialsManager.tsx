"use client";
import { apiFetch } from "@/lib/apiFetch";
import React, { useEffect, useState, useCallback, useRef, Fragment } from "react";
import { API_BASE_URL } from "@/lib/config";
import { uploadDirect } from "@/lib/uploadDirect";
import HlsVideoPlayer from "../../courses/[slug]/HlsVideoPlayer";
import R2FileManager from "./R2FileManager";
import UploadModal from "./UploadModal";
import { useToast } from "./ToastProvider";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Material {
  id: number;
  title: string;
  description: string | null;
  tags: string | null;
  file_type: "video" | "pdf" | "image" | "document" | "youtube";
  file_url: string | null;
  hls_url: string | null;
  hls_status: string | null;
  hls_error: string | null;
  youtube_url: string | null;
  thumbnail_url: string | null;
  file_size: number | null;
  order_position: number;
  created_at: string;
}

type FilterType = "all" | "video" | "youtube" | "pdf" | "image" | "document";
type VideoMode = "upload" | "youtube";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getYouTubeId(url: string): string | null {
  const regExp =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

function getYouTubeThumbnail(url: string): string | null {
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    video:    { bg: "#ede9fe", color: "#7c3aed", label: "VIDEO" },
    youtube:  { bg: "#fee2e2", color: "#dc2626", label: "YOUTUBE" },
    pdf:      { bg: "#fef3c7", color: "#d97706", label: "PDF" },
    image:    { bg: "#d1fae5", color: "#059669", label: "IMAGE" },
    document: { bg: "#dbeafe", color: "#2563eb", label: "DOC" },
  };
  const c = cfg[type] || { bg: "#f1f5f9", color: "#64748b", label: type.toUpperCase() };
  return (
    <span style={{
      background: c.bg,
      color: c.color,
      fontSize: 10,
      fontWeight: 700,
      padding: "2px 7px",
      borderRadius: 5,
      letterSpacing: "0.6px",
    }}>{c.label}</span>
  );
}

function TagBadge({ tag, onClick }: { tag: string; onClick?: () => void }) {
  return (
    <span
      onClick={onClick}
      style={{
        background: "#f1f5f9",
        color: "#475569",
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 8px",
        borderRadius: 12,
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.15s",
        border: "1px solid #e2e8f0",
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.background = "#e2e8f0";
          e.currentTarget.style.borderColor = "#cbd5e1";
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.background = "#f1f5f9";
          e.currentTarget.style.borderColor = "#e2e8f0";
        }
      }}
    >
      #{tag}
    </span>
  );
}

function HlsStatusBadge({ status }: { status: string }) {
  if (status === "processing" || status === "pending") {
    return (
      <span style={{
        position: "absolute", top: 8, right: 8,
        background: "rgba(99,102,241,0.95)", color: "#fff",
        fontSize: 10, fontWeight: 700, padding: "3px 8px",
        borderRadius: 5, letterSpacing: "0.5px",
        display: "flex", alignItems: "center", gap: 5,
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%", border: "2px solid #fff",
          borderTopColor: "transparent", display: "inline-block",
          animation: "spin 0.8s linear infinite",
        }} />
        {status === "pending" ? "QUEUED" : "PROCESSING"}
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span style={{
        position: "absolute", top: 8, right: 8,
        background: "rgba(239,68,68,0.95)", color: "#fff",
        fontSize: 10, fontWeight: 700, padding: "3px 8px",
        borderRadius: 5, letterSpacing: "0.5px",
      }}>HLS FAILED</span>
    );
  }
  if (status === "ready") {
    return (
      <span style={{
        position: "absolute", top: 8, right: 8,
        background: "rgba(5,150,105,0.95)", color: "#fff",
        fontSize: 10, fontWeight: 700, padding: "3px 8px",
        borderRadius: 5, letterSpacing: "0.5px",
      }}>HLS</span>
    );
  }
  return null;
}

function CardThumbnail({ material }: { material: Material }) {
  const thumbBg: Record<string, string> = {
    video:    "linear-gradient(135deg, #312e81 0%, #1e1b4b 100%)",
    youtube:  "linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)",
    pdf:      "linear-gradient(135deg, #78350f 0%, #451a03 100%)",
    image:    "linear-gradient(135deg, #14532d 0%, #052e16 100%)",
    document: "linear-gradient(135deg, #1e3a5f 0%, #0c1a2e 100%)",
  };

  const bg = thumbBg[material.file_type] || thumbBg.document;

  if (material.file_type === "image" && material.file_url) {
    return (
      <div style={{ position: "relative", aspectRatio: "16/9", width: "100%", flexShrink: 0, overflow: "hidden" }}>
        <img src={material.file_url} alt={material.title} style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", bottom: 8, left: 8 }}><TypeBadge type={material.file_type} /></div>
      </div>
    );
  }

  if (material.file_type === "youtube" && material.youtube_url) {
    const thumb = material.thumbnail_url || getYouTubeThumbnail(material.youtube_url);
    if (thumb) {
      return (
        <div style={{ position: "relative", aspectRatio: "16/9", width: "100%", flexShrink: 0, overflow: "hidden", background: "#000" }}>
          <img src={thumb} alt={material.title} style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(220,38,38,0.92)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21" /></svg>
            </div>
          </div>
          <div style={{ position: "absolute", bottom: 8, left: 8 }}><TypeBadge type={material.file_type} /></div>
        </div>
      );
    }
  }

  if (material.file_type === "video" && material.thumbnail_url) {
    return (
      <div style={{ position: "relative", aspectRatio: "16/9", width: "100%", flexShrink: 0, overflow: "hidden", background: "#000" }}>
        <img src={material.thumbnail_url} alt={material.title} style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(99,102,241,0.92)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21" /></svg>
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 8, left: 8 }}><TypeBadge type={material.file_type} /></div>
        {material.hls_status && <HlsStatusBadge status={material.hls_status} />}
      </div>
    );
  }

  const icons: Record<string, React.ReactNode> = {
    video: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><polygon points="10,8 16,12 10,16" fill="#a5b4fc" stroke="none" /></svg>,
    youtube: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="1.5"><path d="M22.54 6.42A2.78 2.78 0 0 0 20.6 4.47C18.88 4 12 4 12 4s-6.88 0-8.6.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.4 19.53C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" fill="#fca5a5" stroke="none" /><polygon points="9.75,15.02 15.5,12 9.75,8.98" fill="#450a0a" /></svg>,
    pdf: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fcd34d" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10,9 9,9 8,9" /></svg>,
    image: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6ee7b7" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21,15 16,10 5,21" /></svg>,
    document: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /></svg>,
  };

  return (
    <div style={{ aspectRatio: "16/9", width: "100%", flexShrink: 0, background: bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.06) 0%, transparent 70%)" }} />
      {icons[material.file_type] || icons.document}
      <div style={{ position: "absolute", bottom: 8, left: 8 }}><TypeBadge type={material.file_type} /></div>
      {material.file_type === "video" && material.hls_status && <HlsStatusBadge status={material.hls_status} />}
    </div>
  );
}

// ─── Upload Modal (Now Global) ────────────────────────────────────────────────

// UploadModal Extracted

// ─── Material Card ────────────────────────────────────────────────────────────

interface MaterialCardProps {
  material: Material;
  index: number;
  onDelete: (material: Material) => void;
  onEdit: (material: Material) => void;
  onTagClick: (tag: string) => void;
  onPreview: (material: Material) => void;
  onRetranscode: (material: Material) => void;
  isSelected: boolean;
  onToggleSelect: () => void;
}

function MaterialCard({ 
  material, index, onDelete, onEdit, onTagClick, onPreview, onRetranscode, isSelected, onToggleSelect 
}: MaterialCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleView = () => {
    onPreview(material);
    setMenuOpen(false);
  };

  const meta = [
    material.file_type.toUpperCase(),
    material.file_size ? formatBytes(material.file_size) : null,
  ].filter(Boolean).join(" • ");
  
  const tagsList = material.tags ? material.tags.split(",").map(t => t.trim()).filter(Boolean) : [];

  return (
    <div 
      className="cm-card" 
      style={{
        background: isSelected ? "#f8fafc" : "#fff", 
        borderRadius: 16, 
        border: `1.5px solid ${isSelected ? "#6366f1" : "#e2e8f0"}`, 
        overflow: "hidden", display: "flex", flexDirection: "column",
        transition: "all 0.15s ease",
        transform: isSelected ? "translateY(-2px)" : "none",
        boxShadow: isSelected ? "0 8px 20px rgba(99,102,241,0.12)" : "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ position: "relative" }}>
        {/* Checkbox overlay */}
        <div 
          onClick={e => { e.stopPropagation(); onToggleSelect(); }}
          style={{ position: "absolute", top: 12, left: 12, zIndex: 10, cursor: "pointer", background: isSelected ? "#6366f1" : "rgba(255,255,255,0.9)", width: 22, height: 22, borderRadius: 6, border: `2px solid ${isSelected ? "#6366f1" : "#cbd5e1"}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
        >
          {isSelected && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>}
        </div>
        <div onClick={handleView} style={{ cursor: "pointer", pointerEvents: "auto" }}>
          <CardThumbnail material={material} />
        </div>
      </div>

      <div style={{ padding: "14px 16px 12px", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.4 }}>
          {material.title}
        </h3>
        {meta && <p style={{ margin: 0, fontSize: 11.5, color: "#94a3b8", fontWeight: 500 }}>{meta}</p>}
        {material.description && (
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {material.description}
          </p>
        )}
        {tagsList.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: "auto", paddingTop: 8 }}>
            {tagsList.map(t => (
              <TagBadge key={t} tag={t} onClick={() => onTagClick(t)} />
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: "10px 16px", borderTop: "1px solid #f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, background: "#f8fafc", padding: "3px 8px", borderRadius: 6 }}>
            {formatDate(material.created_at)}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button onClick={handleView} title="View / Open" style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6366f1" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
          </button>
          <button onClick={() => onEdit(material)} title="Edit" style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.color = "#6366f1"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#64748b"; }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
          </button>
          <div style={{ position: "relative" }} ref={menuRef}>
            <button onClick={() => setMenuOpen(v => !v)} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
            </button>
            {menuOpen && (
              <div style={{ position: "absolute", right: 0, bottom: "calc(100% + 6px)", background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 140, overflow: "hidden", zIndex: 100 }}>
                <button onClick={handleView} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 14px", border: "none", background: "#fff", cursor: "pointer", fontSize: 13, color: "#0f172a", textAlign: "left" }} onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")} onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg> View / Open
                </button>
                <div style={{ height: 1, background: "#f1f5f9" }} />
                <button onClick={() => { onEdit(material); setMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 14px", border: "none", background: "#fff", cursor: "pointer", fontSize: 13, color: "#0f172a", textAlign: "left" }} onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")} onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg> Edit
                </button>
                {material.file_type === "video" && material.hls_status === "failed" && (
                  <>
                    <div style={{ height: 1, background: "#f1f5f9" }} />
                    <button onClick={() => { onRetranscode(material); setMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 14px", border: "none", background: "#fff", cursor: "pointer", fontSize: 13, color: "#d97706", textAlign: "left" }} onMouseEnter={e => (e.currentTarget.style.background = "#fffbeb")} onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg> Retry HLS
                    </button>
                  </>
                )}
                <div style={{ height: 1, background: "#f1f5f9" }} />
                <button onClick={() => { onDelete(material); setMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 14px", border: "none", background: "#fff", cursor: "pointer", fontSize: 13, color: "#ef4444", textAlign: "left" }} onMouseEnter={e => (e.currentTarget.style.background = "#fef2f2")} onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><polyline points="3,6 5,6 21,6" /><path d="M19,6l-1,14H6L5,6" /><path d="M10,11v6" /><path d="M14,11v6" /></svg> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
      <style>{`@keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }`}</style>
      {[160, 14, 80, 20, 10].map((h, i) => (
        <div key={i} style={{ height: h === 160 ? "auto" : h, aspectRatio: h === 160 ? "16/9" : undefined, margin: i === 0 ? 0 : i === 1 ? "14px 16px 0" : i === 2 ? "8px 16px 0" : i === 3 ? "12px 16px 0" : "10px 16px 16px", borderRadius: i === 0 ? 0 : 6, background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)", backgroundSize: "800px 100%", animation: "shimmer 1.5s infinite" }} />
      ))}
    </div>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────

function DeleteModal({ material, onConfirm, onCancel, deleting }: { material: Material; onConfirm: () => void; onCancel: () => void; deleting: boolean }) {
  return (
    <div className="cm-overlay" onClick={e => { if (e.target === e.currentTarget && !deleting) onCancel(); }}>
      <div className="cm-modal">
        <div className="cm-modal-icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>
        </div>
        <h3>Delete Material?</h3>
        <div className="cm-modal-code">{material.title}</div>
        <p>This action is <strong>permanent</strong> and cannot be undone.<br/>Are you sure you want to delete this resource?</p>
        <div className="cm-modal-actions">
          <button className="cm-modal-cancel" onClick={onCancel} disabled={deleting}>Cancel</button>
          <button className="cm-modal-delete" onClick={onConfirm} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditMaterialModal({ material, onClose, onSuccess }: { material: Material; onClose: () => void; onSuccess: () => void }) {
  const { showToast } = useToast();
  const [title, setTitle] = useState(material.title);
  const [description, setDescription] = useState(material.description || "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(
    material.tags ? material.tags.split(",").map(t => t.trim()).filter(Boolean) : []
  );
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newThumb, setNewThumb] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [regeneratingThumb, setRegeneratingThumb] = useState(false);
  const [aiGeneratingThumb, setAiGeneratingThumb] = useState(false);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addTag = (text: string) => {
    const t = text.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const pickThumb = (f: File | null) => {
    setNewThumb(f);
    setThumbPreview(f ? URL.createObjectURL(f) : null);
  };

  const pickFile = (f: File | null) => setNewFile(f);

  const regenerateThumbnail = async () => {
    setRegeneratingThumb(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/materials/${material.id}/regenerate-thumbnail`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        showToast("Thumbnail regenerated from video frame");
        onSuccess();
        // Update local preview to the new thumbnail
        setThumbPreview(data.thumbnail_url);
        setNewThumb(null);
      } else {
        const data = await res.json().catch(() => null);
        showToast(data?.detail || "Thumbnail regeneration failed", "error");
      }
    } catch {
      showToast("Network error during thumbnail regeneration", "error");
    } finally {
      setRegeneratingThumb(false);
    }
  };

  const generateAiThumbnail = async () => {
    setAiGeneratingThumb(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/materials/${material.id}/ai-thumbnail`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        showToast("AI thumbnail generated");
        onSuccess();
        setThumbPreview(data.thumbnail_url);
        setNewThumb(null);
      } else {
        const data = await res.json().catch(() => null);
        showToast(data?.detail || "AI thumbnail generation failed", "error");
      }
    } catch {
      showToast("Network error during AI thumbnail generation", "error");
    } finally {
      setAiGeneratingThumb(false);
    }
  };

  const handleSubmit = async () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "Title is required";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      if (description.trim()) fd.append("description", description.trim());
      fd.append("tags", tags.join(","));

      // ── Replacement file: direct-to-R2 presigned upload (with fallback) ──
      if (newFile) {
        let directUrl: string | null = null;
        let directKey: string | null = null;
        try {
          const presignRes = await apiFetch(`${API_BASE_URL}/materials/presign`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: newFile.name,
              content_type: newFile.type || "application/octet-stream",
              size: newFile.size,
            }),
          });
          if (presignRes.ok) {
            const presign = await presignRes.json();
            const up = await uploadDirect(
              presign.upload_url, newFile,
              newFile.type || "application/octet-stream",
              (pct) => setProgress(Math.round(pct * 0.9))
            );
            if (up.ok) {
              directUrl = presign.file_url;
              directKey = presign.file_key;
            }
          }
        } catch { /* fall through to multipart */ }
        if (directUrl && directKey) {
          fd.append("file_url", directUrl);
          fd.append("file_key", directKey);
        } else {
          fd.append("file", newFile);
        }
      }

      if (newThumb) fd.append("thumbnail", newThumb);

      setProgress(95);
      const res = await apiFetch(`${API_BASE_URL}/materials/${material.id}`, { method: "PUT", body: fd });
      setProgress(100);
      if (res.ok) {
        showToast(newFile ? "Material updated — re-transcoding in background" : "Material updated!");
        onSuccess();
        onClose();
      } else {
        const data = await res.json().catch(() => null);
        showToast(data?.detail || "Update failed", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setSaving(false);
      setProgress(null);
    }
  };

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    width: "100%", padding: "12px 14px", borderRadius: 10,
    border: `1.5px solid ${hasError ? "#ef4444" : "#e2e8f0"}`,
    outline: "none", fontSize: 14, color: "#0f172a", background: "#fff",
    boxSizing: "border-box", transition: "border-color 0.15s",
  });

  return (
    <div className="cm-overlay" onClick={e => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div className="cm-edit-modal">
        {/* ── Sticky header ── */}
        <div style={{
          position: "sticky", top: 0, zIndex: 10, background: "#fff",
          borderBottom: "1px solid #e2e8f0", padding: "16px 24px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          maxWidth: 720, margin: "0 auto", width: "100%", boxSizing: "border-box",
        }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Edit Material</h3>
          <button onClick={onClose} disabled={saving} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 6, display: "flex", borderRadius: 8 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="cm-edit-modal-inner">

        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.4px" }}>Title</label>
        <input value={title} onChange={e => { setTitle(e.target.value); setErrors(p => ({ ...p, title: "" })); }} style={inputStyle(!!errors.title)} />
        {errors.title && <p style={{ margin: "5px 0 0", fontSize: 11.5, color: "#ef4444" }}>{errors.title}</p>}

        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#64748b", margin: "16px 0 6px", textTransform: "uppercase", letterSpacing: "0.4px" }}>Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
          style={{ ...inputStyle(false), resize: "vertical", minHeight: 70, lineHeight: 1.5 }} />

        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#64748b", margin: "16px 0 6px", textTransform: "uppercase", letterSpacing: "0.4px" }}>Tags</label>
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 6, padding: 8, minHeight: 44,
          border: "1.5px solid #e2e8f0", borderRadius: 10, alignItems: "center", boxSizing: "border-box",
        }}>
          {tags.map((t, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 4, background: "#eef2ff", color: "#4f46e5", padding: "3px 8px", borderRadius: 6, fontSize: 12.5, fontWeight: 600, border: "1px solid #c7d2fe" }}>
              #{t}
              <button type="button" onClick={() => setTags(tags.filter((_, x) => x !== i))} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#818cf8", display: "flex" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </span>
          ))}
          <input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={e => {
              if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); }
              else if (e.key === "Backspace" && !tagInput && tags.length) setTags(tags.slice(0, -1));
            }}
            placeholder={tags.length ? "" : "Type and press Enter"}
            style={{ flex: 1, minWidth: 100, border: "none", outline: "none", fontSize: 13, color: "#0f172a", background: "transparent" }}
          />
        </div>

        {/* ── Thumbnail update ── */}
        {material.file_type !== "document" && (
          <>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#64748b", margin: "20px 0 6px", textTransform: "uppercase", letterSpacing: "0.4px" }}>
              Thumbnail
            </label>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <div style={{
                width: 128, height: 72, borderRadius: 8, overflow: "hidden", flexShrink: 0,
                background: "#f1f5f9", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {thumbPreview ? (
                  <img src={thumbPreview} alt="new thumbnail" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : material.thumbnail_url ? (
                  <img src={material.thumbnail_url} alt="current thumbnail" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: 10.5, color: "#94a3b8" }}>No thumbnail</span>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <button type="button" onClick={() => thumbInputRef.current?.click()}
                  style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "#475569" }}>
                  {thumbPreview ? "Change Image" : "Upload Image"}
                </button>
                {material.file_type === "video" && (
                  <button type="button" onClick={regenerateThumbnail} disabled={regeneratingThumb}
                    style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #c7d2fe", background: "#fff", cursor: regeneratingThumb ? "wait" : "pointer", fontSize: 12.5, fontWeight: 600, color: "#4f46e5", opacity: regeneratingThumb ? 0.6 : 1 }}>
                    {regeneratingThumb ? "Generating…" : "Regenerate from Video"}
                  </button>
                )}
                {material.file_type === "video" && (
                  <button type="button" onClick={generateAiThumbnail} disabled={aiGeneratingThumb}
                    style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #ddd6fe", background: "#faf5ff", cursor: aiGeneratingThumb ? "wait" : "pointer", fontSize: 12.5, fontWeight: 600, color: "#7c3aed", opacity: aiGeneratingThumb ? 0.6 : 1 }}>
                    {aiGeneratingThumb ? "AI Generating…" : "Generate with AI ✨"}
                  </button>
                )}
                {thumbPreview && (
                  <button type="button" onClick={() => pickThumb(null)}
                    style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #fecaca", background: "#fff", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "#ef4444" }}>
                    Remove
                  </button>
                )}
              </div>
              <input ref={thumbInputRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => pickThumb(e.target.files?.[0] || null)} />
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 11, color: "#94a3b8" }}>
              JPG, PNG or WebP. {material.file_type === "video" && "Leave empty to auto-generate from the video."}
            </p>
          </>
        )}

        {/* ── R2 / HLS links display ── */}
        {material.file_type === "video" && (
          <div style={{ marginTop: 16, padding: 14, borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.4px" }}>
              Storage Links
            </label>
            {material.hls_url && (
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#16a34a" }}>HLS ▸ </span>
                <a href={material.hls_url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 11, color: "#2563eb", wordBreak: "break-all", textDecoration: "none" }}>
                  {material.hls_url}
                </a>
              </div>
            )}
            {material.file_url && (
              <div>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>Source ▸ </span>
                <a href={material.file_url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 11, color: "#2563eb", wordBreak: "break-all", textDecoration: "none" }}>
                  {material.file_url}
                </a>
              </div>
            )}
            {material.hls_status && (
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 5,
                  background: material.hls_status === "ready" ? "#dcfce7" : material.hls_status === "failed" ? "#fee2e2" : "#fef3c7",
                  color: material.hls_status === "ready" ? "#166534" : material.hls_status === "failed" ? "#991b1b" : "#92400e",
                }}>
                  HLS: {material.hls_status.toUpperCase()}
                </span>
                {material.hls_status === "failed" && material.hls_error && (
                  <span style={{ fontSize: 10.5, color: "#991b1b", fontStyle: "italic" }}>
                    {material.hls_error.slice(0, 120)}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Replace file (video/pdf/image/document — not YouTube) ── */}
        {material.file_type !== "youtube" && (
          <>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#64748b", margin: "20px 0 6px", textTransform: "uppercase", letterSpacing: "0.4px" }}>
              Replace File
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${newFile ? "#22c55e" : "#c7d2fe"}`, borderRadius: 10,
                padding: "16px", textAlign: "center", cursor: "pointer", background: newFile ? "#f0fdf4" : "#fafbff",
                transition: "all 0.2s",
              }}
            >
              <input ref={fileInputRef} type="file" style={{ display: "none" }}
                accept="video/*,.pdf,image/*,.doc,.docx"
                onChange={e => pickFile(e.target.files?.[0] || null)} />
              {newFile ? (
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#166534" }}>✓ {newFile.name}</p>
                  <p style={{ margin: "3px 0 0", fontSize: 11.5, color: "#64748b" }}>
                    {formatBytes(newFile.size)} — click to change
                  </p>
                </div>
              ) : (
                <div>
                  <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: "#475569" }}>
                    Click to select a replacement file
                  </p>
                  <p style={{ margin: "3px 0 0", fontSize: 11, color: "#94a3b8" }}>
                    Current: {material.file_type.toUpperCase()} • Optional — leave empty to keep existing
                  </p>
                </div>
              )}
            </div>
            {material.file_type === "video" && newFile && (
              <p style={{ margin: "6px 0 0", fontSize: 11, color: "#d97706" }}>
                ⚠ Replacing the video deletes the old HLS streams and re-transcodes the new file in the background.
              </p>
            )}
          </>
        )}

        {progress !== null && (
          <div style={{ marginTop: 16 }}>
            <div style={{ height: 6, borderRadius: 3, background: "#e2e8f0", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #6366f1, #4f46e5)", transition: "width 0.2s" }} />
            </div>
            <p style={{ margin: "5px 0 0", fontSize: 11, color: "#64748b", textAlign: "center" }}>
              {progress < 100 ? `Uploading… ${progress}%` : "Processing…"}
            </p>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 24, paddingBottom: 8 }}>
          <button onClick={onClose} disabled={saving} className="cm-modal-cancel" style={{ flex: 1 }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="cm-modal-save" style={{ flex: 1 }}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all",      label: "All" },
  { key: "video",    label: "Videos" },
  { key: "youtube",  label: "YouTube" },
  { key: "pdf",      label: "PDFs" },
  { key: "image",    label: "Images" },
  { key: "document", label: "Documents" },
];

export default function CourseMaterialsManager() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"library" | "bucket" | "orphans">("library");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Material | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editTarget, setEditTarget] = useState<Material | null>(null);
  const [activePreview, setActivePreview] = useState<Material | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchTags = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/materials/tags`);
      if (res.ok) setExistingTags(await res.json());
    } catch { /* silent */ }
  }, []);

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.append("file_type", filter);
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (tagFilter) params.append("tag", tagFilter);
      
      const res = await apiFetch(`${API_BASE_URL}/materials?${params}`);
      if (res.ok) {
        const data = await res.json();
        data.sort((a: Material, b: Material) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setMaterials(data);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [filter, debouncedSearch, tagFilter]);

  useEffect(() => {
    fetchTags();
    fetchMaterials();
  }, [fetchTags, fetchMaterials]);

  const handleRetranscode = useCallback(async (material: Material) => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/materials/${material.id}/retranscode`, { method: "POST" });
      if (res.ok) {
        setMaterials(prev => prev.map(m => (m.id === material.id ? { ...m, hls_status: "pending", hls_error: null } : m)));
      }
    } catch { /* silent */ }
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      const res = await apiFetch(`${API_BASE_URL}/materials/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setMaterials(prev => prev.filter(m => m.id !== deleteTarget.id));
        fetchTags(); // Update tags in case we deleted the last instance of a tag
        showToast("Material deleted successfully.");
      } else {
        showToast("Failed to delete material.", "error");
      }
    } catch {
      showToast("Network error while deleting.", "error");
    } finally { 
      setDeletingId(null); 
      setDeleteTarget(null);
    }
  }, [deleteTarget, fetchTags]);

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    let successCount = 0;
    try {
      await Promise.all(
        selectedIds.map(async id => {
          const res = await apiFetch(`${API_BASE_URL}/materials/${id}`, { method: "DELETE" });
          if (res.ok) successCount++;
        })
      );
      showToast(`Successfully deleted ${successCount} material(s).`);
      setSelectedIds([]);
      fetchMaterials();
      fetchTags();
    } catch {
      showToast("An error occurred during bulk deletion.", "error");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const stats = [
    { label: "Total Library Items", value: materials.length },
    { label: "Active Tags", value: existingTags.length },
    { label: "Active Filter", value: filter.charAt(0).toUpperCase() + filter.slice(1) },
  ];

  return (
    <div className="manager-content">
      <style>{`
        @keyframes spin { 0%{ transform:rotate(0deg) } 100%{ transform:rotate(360deg) } }
        .cm-card:hover { transform: translateY(-2px); border-color: #cbd5e1; box-shadow: 0 8px 24px rgba(0,0,0,0.06); }
        .cm-filter-btn { padding: 7px 16px; border-radius: 20px; font-size: 12.5px; font-weight: 600; border: 1.5px solid transparent; cursor: pointer; transition: all 0.18s; }
        .cm-filter-btn.active { background: #6366f1; color: #fff; border-color: #6366f1; box-shadow: 0 2px 8px rgba(99,102,241,0.3); }
        .cm-filter-btn.inactive { background: #fff; color: #64748b; border-color: #e2e8f0; }
        .cm-filter-btn.inactive:hover { border-color: #6366f1; color: #6366f1; }
        .cm-upload-btn:hover { opacity: 0.92; transform: translateY(-1px); }
        .cm-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        @media (max-width: 1100px) { .cm-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 700px) { .cm-grid { grid-template-columns: 1fr; gap: 14px; } }
        /* ── Edit Modal (fullscreen on all devices) ── */
        .cm-edit-modal {
          background: #fff; border-radius: 0; padding: 0;
          width: 100%; max-width: 100%; height: 100%; max-height: 100%;
          overflow-y: auto; box-shadow: none;
          animation: cm-slide-up .2s ease;
          display: flex; flex-direction: column;
        }
        .cm-edit-modal-inner { flex: 1; overflow-y: auto; padding: 24px; max-width: 720px; margin: 0 auto; width: 100%; box-sizing: border-box; }
        @media (max-width: 700px) {
          .cm-edit-modal-inner { padding: 16px; }
        }
        .cm-modal-save { padding: 10px 24px; border-radius: 8px; border: none; background: linear-gradient(135deg, #6366f1, #4f46e5); color: #fff; font-size: .875rem; font-weight: 700; cursor: pointer; transition: opacity .15s; font-family: inherit; }
        .cm-modal-save:hover { opacity: .92; }
        .cm-modal-save:disabled { opacity: .55; cursor: not-allowed; }
        /* ── Mobile ── */
        @media (max-width: 700px) {
          .cm-header-row { flex-direction: column !important; align-items: stretch !important; }
          .cm-header-title h1 { font-size: 20px !important; }
          .cm-header-desc { font-size: 12.5px !important; }
          .cm-upload-btn { width: 100%; justify-content: center; padding: 12px 22px !important; }
          .cm-tabs { width: 100% !important; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
          .cm-tabs::-webkit-scrollbar { display: none; }
          .cm-tabs button { flex: 1 0 auto; padding: 8px 12px !important; font-size: 12px !important; white-space: nowrap; }
          .cm-stats { gap: 10px !important; margin-top: 16px !important; }
          .cm-stats > div { flex: 1 1 calc(50% - 10px); min-width: 0 !important; padding: 10px 12px !important; }
          .cm-stats p:first-child { font-size: 9.5px !important; }
          .cm-stats p:last-child { font-size: 15px !important; }
          .cm-toolbar { padding: 14px !important; }
          .cm-search-row { flex-direction: column !important; align-items: stretch !important; gap: 10px !important; }
          .cm-bulk-banner { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
        }
        @media (max-width: 700px) {
          .cm-preview-shell { padding: 0 !important; border-radius: 0 !important; max-width: 100% !important; width: 100% !important; height: 100% !important; max-height: 100% !important; }
          .cm-preview-head { padding: 12px 14px !important; }
          .cm-preview-body { height: calc(100% - 56px) !important; }
          .cm-preview-body iframe, .cm-preview-body img { height: 100% !important; border-radius: 0 !important; }
        }
        /* ── Delete Modal ── */
        .cm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 5000; display: flex; align-items: stretch; justify-content: stretch; animation: cm-fade-in .18s ease; backdrop-filter: blur(2px); }
        @keyframes cm-fade-in { from{opacity:0} to{opacity:1} }
        .cm-modal { background: #fff; border-radius: 16px; padding: 32px 28px; max-width: 400px; width: calc(100% - 32px); box-shadow: 0 20px 60px rgba(0,0,0,.2); animation: cm-slide-up .2s ease; text-align: center; }
        @keyframes cm-slide-up { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .cm-modal-icon { width: 56px; height: 56px; border-radius: 50%; background: #fef2f2; display: flex; align-items: center; justify-content: center; margin: 0 auto 18px; color: #dc2626; }
        .cm-modal h3 { font-size: 1.1rem; font-weight: 700; color: #111827; margin: 0 0 8px; }
        .cm-modal p  { font-size: .875rem; color: #6b7280; margin: 0 0 24px; line-height: 1.6; }
        .cm-modal-code { display: inline-block; padding: 4px 12px; border-radius: 5px; background: #eff6ff; color: #6366f1; font-size: .82rem; font-weight: 700; margin: 0 0 20px; word-break: break-all; }
        .cm-modal-actions { display: flex; gap: 10px; justify-content: center; }
        .cm-modal-cancel { padding: 10px 24px; border-radius: 8px; border: 1.5px solid #e5e7eb; background: #fff; color: #374151; font-size: .875rem; font-weight: 600; cursor: pointer; transition: all .15s; font-family: inherit; flex: 1; }
        .cm-modal-cancel:hover { background: #f3f4f6; }
        .cm-modal-delete { padding: 10px 24px; border-radius: 8px; border: none; background: #dc2626; color: #fff; font-size: .875rem; font-weight: 700; cursor: pointer; transition: background .15s; font-family: inherit; flex: 1; }
        .cm-modal-delete:hover { background: #b91c1c; }
        .cm-modal-delete:disabled { opacity: .55; cursor: not-allowed; }
      `}</style>
      
      {deleteTarget && (
        <DeleteModal
          material={deleteTarget}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deletingId === deleteTarget.id}
        />
      )}

      {showUpload && (
        <UploadModal
          existingTags={existingTags}
          onClose={() => setShowUpload(false)}
          onSuccess={() => {
            fetchMaterials();
            fetchTags();
          }}
        />
      )}

      {editTarget && (
        <EditMaterialModal
          material={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={fetchMaterials}
        />
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div className="cm-header-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div className="cm-header-title" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>
              </div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#0f172a" }}>Course Media</h1>
            </div>
            <p className="cm-header-desc" style={{ margin: "4px 0 0", fontSize: 13.5, color: "#64748b", maxWidth: 600 }}>
              Your global repository for videos, PDFs, images, and links. Use powerful tags to organize and retrieve materials across all your courses. Drag cards to reorder items.
            </p>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            {activeTab === "library" && (
              <>
                <button
                  className="cm-upload-btn"
                  onClick={() => setShowUpload(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "11px 22px", borderRadius: 12, border: "none",
                    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                    color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(99,102,241,0.4)", transition: "all 0.18s",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  Add to Library
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="cm-tabs" style={{ display: "flex", gap: 4, marginTop: 24, background: "#f1f5f9", padding: 4, borderRadius: 10, width: "fit-content" }}>
          <button onClick={() => setActiveTab("library")}
            style={{
              padding: "8px 20px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: activeTab === "library" ? "#fff" : "transparent",
              color: activeTab === "library" ? "#0f172a" : "#64748b",
              boxShadow: activeTab === "library" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.18s",
            }}>
            📚 Content Library
          </button>
          <button onClick={() => setActiveTab("bucket")}
            style={{
              padding: "8px 20px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: activeTab === "bucket" ? "#fff" : "transparent",
              color: activeTab === "bucket" ? "#0f172a" : "#64748b",
              boxShadow: activeTab === "bucket" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.18s",
            }}>
            ☁️ Cloud Storage (R2)
          </button>
          <button onClick={() => setActiveTab("orphans")}
            style={{
              padding: "8px 20px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: activeTab === "orphans" ? "#fff" : "transparent",
              color: activeTab === "orphans" ? "#0f172a" : "#64748b",
              boxShadow: activeTab === "orphans" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.18s",
            }}>
            🗑️ Orphaned Files
          </button>
        </div>

        {/* Stats row */}
        {activeTab === "library" && (!loading || materials.length > 0) && (
          <div className="cm-stats" style={{ display: "flex", gap: 20, marginTop: 22, flexWrap: "wrap" }}>
            {stats.map(s => (
              <div key={s.label} style={{ background: "#fff", borderRadius: 12, padding: "12px 18px", border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.02)", minWidth: 120 }}>
                <p style={{ margin: 0, fontSize: 10.5, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</p>
                <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{s.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {activeTab === "library" && (
        <>
          {/* Global Search & Tag Filters */}
      <div className="cm-toolbar" style={{ background: "#fff", borderRadius: 16, padding: "20px", border: "1px solid #f1f5f9", boxShadow: "0 2px 10px rgba(0,0,0,0.02)", marginBottom: 24 }}>

        {/* Search Bar Row */}
        <div className="cm-search-row" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: existingTags.length > 0 ? 20 : 0 }}>
          
          <div style={{ position: "relative", flex: 1, minWidth: 260 }}>
            <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
              placeholder="Search library titles and descriptions..."
              style={{
                width: "100%", padding: "12px 14px 12px 40px", borderRadius: 12, fontSize: 14, color: "#0f172a",
                border: `1.5px solid ${searchFocused ? "#6366f1" : "#e2e8f0"}`, outline: "none", background: "#f8fafc",
                boxSizing: "border-box", boxShadow: searchFocused ? "0 0 0 3px #eef2ff" : "none", transition: "all 0.18s",
              }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", cursor: "pointer", color: "#94a3b8", fontSize: 18, lineHeight: 1, padding: 4 }}>×</button>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
            {FILTERS.map(f => (
              <button key={f.key} className={`cm-filter-btn ${filter === f.key ? "active" : "inactive"}`} onClick={() => setFilter(f.key)}>
                {f.label}
              </button>
            ))}
          </div>

        </div>

        {/* Global Tags Row */}
        {existingTags.length > 0 && (
          <div>
            <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Filter by Tags</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button 
                onClick={() => setTagFilter("")} 
                style={{
                  background: tagFilter === "" ? "#1e293b" : "#f1f5f9",
                  color: tagFilter === "" ? "#fff" : "#64748b",
                  border: "none", padding: "4px 12px", borderRadius: 14, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s"
                }}
              >
                All Tags
              </button>
              {existingTags.map(tag => (
                <button 
                  key={tag}
                  onClick={() => setTagFilter(tagFilter === tag ? "" : tag)} 
                  style={{
                    background: tagFilter === tag ? "#6366f1" : "#fff",
                    color: tagFilter === tag ? "#fff" : "#4f46e5",
                    border: `1px solid ${tagFilter === tag ? "#6366f1" : "#c7d2fe"}`,
                    padding: "3px 12px", borderRadius: 14, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s"
                  }}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="cm-grid">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Empty states */}
      {!loading && materials.length === 0 && (
        <div style={{ textAlign: "center", padding: "70px 40px", background: "#fff", borderRadius: 20, border: "1px solid #f1f5f9" }}>
          <div style={{ width: 68, height: 68, borderRadius: 18, background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" /></svg>
          </div>
          <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "#1e293b" }}>
            {search || filter !== "all" || tagFilter ? "No matches found" : "Your Library is Empty"}
          </h3>
          <p style={{ margin: "0 0 20px", fontSize: 13, color: "#94a3b8", maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
            {search || filter !== "all" || tagFilter
              ? "Try tweaking your search terms, clearing filters, or selecting a different tag."
              : "Start building your centralized knowledge base by uploading your first video, PDF, or document."}
          </p>
          {(!search && filter === "all" && !tagFilter) && (
            <button onClick={() => setShowUpload(true)} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: "0 4px 14px rgba(99,102,241,0.35)" }}>
              Upload First Material
            </button>
          )}
          {(search || filter !== "all" || tagFilter) && (
            <button onClick={() => { setSearch(""); setFilter("all"); setTagFilter(""); }} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}>
              Clear All Filters
            </button>
          )}
        </div>
      )}

      {/* Materials Grid */}
      {!loading && materials.length > 0 && (
        <>
          {/* Bulk Actions Banner */}
          <div className="cm-bulk-banner" style={{
            background: selectedIds.length > 0 ? "#f0f9ff" : "#f8fafc",
            border: `1px solid ${selectedIds.length > 0 ? "#bae6fd" : "#e2e8f0"}`,
            borderRadius: 12,
            padding: "12px 20px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
            transition: "all 0.2s"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input 
                  type="checkbox" 
                  checked={materials.length > 0 && selectedIds.length === materials.length}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedIds(materials.map(m => m.id));
                    else setSelectedIds([]);
                  }}
                  style={{ width: 18, height: 18, accentColor: "#6366f1", cursor: "pointer" }}
                />
                <span style={{ fontSize: 14, fontWeight: 600, color: "#334155" }}>Select All</span>
              </label>
              {selectedIds.length > 0 && (
                <span style={{ fontSize: 13, color: "#0284c7", fontWeight: 600, background: "#e0f2fe", padding: "4px 10px", borderRadius: 20 }}>
                  {selectedIds.length} item{selectedIds.length > 1 ? "s" : ""} selected
                </span>
              )}
            </div>
            
            {selectedIds.length > 0 && (
              <div style={{ display: "flex", gap: 10 }}>
                <button 
                  onClick={() => setSelectedIds([])}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  Clear Selection
                </button>
                <button 
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", fontSize: 13, fontWeight: 600, cursor: isBulkDeleting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, opacity: isBulkDeleting ? 0.7 : 1 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                  {isBulkDeleting ? "Deleting..." : "Delete Selected"}
                </button>
              </div>
            )}
          </div>

          <div className="cm-grid">
            {materials.map((m, index) => (
              <div key={m.id} style={{ opacity: deletingId === m.id ? 0.5 : 1, transition: "opacity 0.2s" }}>
                <MaterialCard
                  material={m}
                  index={index}
                  onDelete={setDeleteTarget}
                  onEdit={setEditTarget}
                  onTagClick={(t) => setTagFilter(tagFilter === t ? "" : t)}
                  onPreview={setActivePreview}
                  onRetranscode={handleRetranscode}
                  isSelected={selectedIds.includes(m.id)}
                  onToggleSelect={() => toggleSelect(m.id)}
                />
              </div>
            ))}
          </div>
        </>
      )}
      </>
      )}

      {/* ── Bucket File Manager ── */}
      {activeTab === "bucket" && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", overflow: "hidden", minHeight: 650, boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
          <R2FileManager initialPrefix="course-materials/" />
        </div>
      )}

      {/* ── Orphaned Files ── */}
      {activeTab === "orphans" && <OrphanedFilesPanel />}


      {activePreview && (
        <MediaPreviewModal material={activePreview} onClose={() => setActivePreview(null)} />
      )}
    </div>
  );
}

// ─── Media Preview Modal ────────────────────────────────────────────────────

function MediaPreviewModal({ material, onClose }: { material: Material; onClose: () => void }) {
  // Close on Escape key
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const ytId = material.youtube_url ? getYouTubeId(material.youtube_url) : null;

  const typeColors: Record<string, { bg: string; color: string }> = {
    video:    { bg: "#ede9fe", color: "#7c3aed" },
    youtube:  { bg: "#fee2e2", color: "#dc2626" },
    pdf:      { bg: "#fef3c7", color: "#d97706" },
    image:    { bg: "#d1fae5", color: "#059669" },
    document: { bg: "#dbeafe", color: "#2563eb" },
  };
  const tc = typeColors[material.file_type] || { bg: "#f1f5f9", color: "#64748b" };

  const renderPlayer = () => {
    if (material.file_type === "youtube" && ytId) {
      return (
        <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, width: "100%" }}>
          <iframe
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none", borderRadius: 10 }}
          />
        </div>
      );
    }
    if (material.file_type === "video" && material.file_url) {
      // Prefer HLS adaptive streaming when an hls_url is available (set by the
      // backend's background FFmpeg transcode). Falls back to the raw file_url
      // (mp4/mov/webm/...) via the native <video> element inside HlsVideoPlayer.
      // The 16:9 wrapper keeps the player at the true video box ratio; the
      // video element letterboxes (object-fit: contain) inside it.
      return (
        <div style={{
          width: "100%", aspectRatio: "16 / 9", maxHeight: "72vh",
          margin: "0 auto", background: "#000", position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden",
        }}>
          <HlsVideoPlayer
            src={material.file_url}
            hlsUrl={material.hls_url || undefined}
            poster={material.thumbnail_url || undefined}
            autoPlay
            className="cm-preview-video"
          />
        </div>
      );
    }
    if (material.file_type === "pdf" && material.file_url) {
      return (
        <iframe
          src={`${material.file_url}#toolbar=0`}
          style={{ width: "100%", height: "72vh", border: "none", borderRadius: 10 }}
          title={material.title}
          onContextMenu={e => e.preventDefault()}
        />
      );
    }
    if (material.file_type === "image" && material.file_url) {
      return (
        <img
          src={material.file_url}
          alt={material.title}
          style={{ maxWidth: "100%", maxHeight: "72vh", borderRadius: 10, display: "block", margin: "0 auto", objectFit: "contain" }}
          onContextMenu={e => e.preventDefault()}
        />
      );
    }
    if (material.file_type === "document" && material.file_url) {
      return (
        <div style={{ position: "relative", width: "100%", height: "72vh" }}>
          <div style={{ position: "absolute", top: 12, left: 12, zIndex: 10 }}>
            <a href={material.file_url} target="_blank" rel="noreferrer"
              style={{ padding: "7px 14px", background: "#4f46e5", color: "#fff", textDecoration: "none", borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
              Open / Download ↗
            </a>
          </div>
          <iframe
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(material.file_url)}`}
            style={{ width: "100%", height: "100%", border: "none", borderRadius: 10 }}
            title={material.title}
          />
        </div>
      );
    }
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
        <p style={{ margin: 0, fontSize: 14 }}>No preview available for this file type.</p>
        {material.file_url && (
          <a href={material.file_url} target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-block", marginTop: 14, padding: "8px 20px", background: "#6366f1", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            Open File ↗
          </a>
        )}
      </div>
    );
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 6000,
        background: "rgba(10,15,30,0.88)",
        backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px", animation: "cm-fade-in 0.18s ease",
      }}
    >
      <style>{`
        @keyframes cm-preview-up { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        .cm-preview-video { height: 100% !important; }
      `}</style>
      <div className="cm-preview-shell" style={{
        background: "#0f172a", borderRadius: 18, width: "100%", maxWidth: 960,
        boxShadow: "0 40px 100px rgba(0,0,0,0.7)",
        animation: "cm-preview-up 0.22s cubic-bezier(.4,0,.2,1)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div className="cm-preview-head" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px", background: "#1e293b", borderBottom: "1px solid #334155",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <span style={{ background: tc.bg, color: tc.color, fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 6, letterSpacing: "0.5px", flexShrink: 0 }}>
              {material.file_type.toUpperCase()}
            </span>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {material.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            title="Close (Esc)"
            style={{
              background: "#334155", border: "none", borderRadius: 8,
              width: 32, height: 32, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#94a3b8", transition: "all 0.15s", flexShrink: 0, marginLeft: 12,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#ef4444"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#334155"; e.currentTarget.style.color = "#94a3b8"; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        {/* Player */}
        <div className="cm-preview-body" style={{ padding: material.file_type === "video" ? "0" : "20px", background: "#0f172a" }}>
          {renderPlayer()}
        </div>
      </div>
    </div>
  );
}

// ─── Orphaned Files Panel ───────────────────────────────────────────────────

interface OrphanItem {
  key?: string;
  prefix?: string;
  size?: number;
  object_count?: number;
  last_modified: string;
  material?: { material_id: number; title: string };
}

interface OrphanGroups {
  redundant_sources: OrphanItem[];
  orphan_hls_folders: OrphanItem[];
  unreferenced_files: OrphanItem[];
}

function OrphanedFilesPanel() {
  const { showToast } = useToast();
  const [groups, setGroups] = useState<OrphanGroups | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/materials/orphaned`);
      if (res.ok) {
        const data = await res.json();
        setGroups({
          redundant_sources: data.redundant_sources || [],
          orphan_hls_folders: data.orphan_hls_folders || [],
          unreferenced_files: data.unreferenced_files || [],
        });
        setSelected(new Set());
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const allItems: { id: string; item: OrphanItem; kind: string }[] = groups ? [
    ...groups.redundant_sources.map(i => ({ id: i.key!, item: i, kind: "Redundant source" })),
    ...groups.orphan_hls_folders.map(i => ({ id: i.prefix!, item: i, kind: "Orphan HLS folder" })),
    ...groups.unreferenced_files.map(i => ({ id: i.key!, item: i, kind: "Unreferenced file" })),
  ] : [];

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleDelete = async () => {
    if (selected.size === 0) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/materials/orphaned/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: Array.from(selected) }),
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`Deleted ${data.deleted} object(s)`, "success");
        load();
      } else {
        showToast("Delete failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setDeleting(false);
    }
  };

  const totalSize = allItems.reduce((sum, x) => sum + (x.item.size || 0), 0);

  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", padding: 24, boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
      <style>{`@keyframes of-spin { 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} }`}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0f172a" }}>Orphaned & Redundant Storage Files</h2>
          <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "#64748b" }}>
            Files left in R2 that no longer serve any purpose — leftover source videos after HLS conversion, HLS folders of deleted materials, and unreferenced uploads.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={load} style={{ padding: "9px 16px", borderRadius: 9, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "#475569" }}>
            ↻ Refresh
          </button>
          <button
            onClick={handleDelete}
            disabled={selected.size === 0 || deleting}
            style={{
              padding: "9px 18px", borderRadius: 9, border: "none", cursor: selected.size === 0 ? "not-allowed" : "pointer",
              background: selected.size === 0 ? "#e2e8f0" : "#ef4444", color: selected.size === 0 ? "#94a3b8" : "#fff",
              fontSize: 12.5, fontWeight: 700, opacity: deleting ? 0.6 : 1,
            }}
          >
            {deleting ? "Deleting..." : `Delete Selected (${selected.size})`}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8", fontSize: 13 }}>
          <span style={{ display: "inline-block", width: 22, height: 22, border: "3px solid #e2e8f0", borderTopColor: "#6366f1", borderRadius: "50%", animation: "of-spin 0.8s linear infinite" }} />
        </div>
      ) : allItems.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#059669" }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>✓ Storage is clean</p>
          <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "#94a3b8" }}>No orphaned or redundant files found.</p>
        </div>
      ) : (
        <>
          <p style={{ margin: "0 0 12px", fontSize: 12, color: "#94a3b8" }}>
            {allItems.length} item(s) • {formatBytes(totalSize)} reclaimable
          </p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "2px solid #f1f5f9" }}>
                  <th style={{ padding: "8px 10px", width: 36 }}></th>
                  <th style={{ padding: "8px 10px", color: "#64748b", fontWeight: 700 }}>Type</th>
                  <th style={{ padding: "8px 10px", color: "#64748b", fontWeight: 700 }}>Path / Folder</th>
                  <th style={{ padding: "8px 10px", color: "#64748b", fontWeight: 700 }}>Size</th>
                  <th style={{ padding: "8px 10px", color: "#64748b", fontWeight: 700 }}>Details</th>
                  <th style={{ padding: "8px 10px", color: "#64748b", fontWeight: 700 }}>Last Modified</th>
                </tr>
              </thead>
              <tbody>
                {allItems.map(({ id, item, kind }) => (
                  <tr key={id} style={{ borderBottom: "1px solid #f8fafc" }}>
                    <td style={{ padding: "8px 10px" }}>
                      <input type="checkbox" checked={selected.has(id)} onChange={() => toggle(id)} style={{ cursor: "pointer" }} />
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <span style={{
                        background: kind === "Redundant source" ? "#fef3c7" : kind === "Orphan HLS folder" ? "#fee2e2" : "#dbeafe",
                        color: kind === "Redundant source" ? "#d97706" : kind === "Orphan HLS folder" ? "#dc2626" : "#2563eb",
                        fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5,
                      }}>{kind}</span>
                    </td>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace", fontSize: 11, color: "#0f172a", maxWidth: 380, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={id}>
                      {id}
                    </td>
                    <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                      {item.object_count != null ? `${item.object_count} objects` : formatBytes(item.size ?? 0)}
                    </td>
                    <td style={{ padding: "8px 10px", color: "#64748b" }}>
                      {item.material ? `Material #${item.material.material_id}: ${item.material.title}` : "—"}
                    </td>
                    <td style={{ padding: "8px 10px", whiteSpace: "nowrap", color: "#94a3b8" }}>
                      {new Date(item.last_modified).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
