"use client";
import { apiFetch } from "@/lib/apiFetch";
import React, { useEffect, useState, useCallback, useRef, Fragment } from "react";
import { API_BASE_URL } from "@/lib/config";
import VideoPlayer from "./VideoPlayer";
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
  onTagClick: (tag: string) => void;
  onPreview: (material: Material) => void;
  isSelected: boolean;
  onToggleSelect: () => void;
}

function MaterialCard({ 
  material, index, onDelete, onTagClick, onPreview, isSelected, onToggleSelect 
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
  const [activeTab, setActiveTab] = useState<"library" | "bucket">("library");
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
        @media (max-width: 700px) { .cm-grid { grid-template-columns: 1fr; } }
        /* ── Delete Modal ── */
        .cm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 5000; display: flex; align-items: center; justify-content: center; animation: cm-fade-in .18s ease; backdrop-filter: blur(2px); }
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

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>
              </div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#0f172a" }}>Course Media</h1>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: 13.5, color: "#64748b", maxWidth: 600 }}>
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
        <div style={{ display: "flex", gap: 4, marginTop: 24, background: "#f1f5f9", padding: 4, borderRadius: 10, width: "fit-content" }}>
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
        </div>

        {/* Stats row */}
        {activeTab === "library" && (!loading || materials.length > 0) && (
          <div style={{ display: "flex", gap: 20, marginTop: 22, flexWrap: "wrap" }}>
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
      <div style={{ background: "#fff", borderRadius: 16, padding: "20px", border: "1px solid #f1f5f9", boxShadow: "0 2px 10px rgba(0,0,0,0.02)", marginBottom: 24 }}>
        
        {/* Search Bar Row */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: existingTags.length > 0 ? 20 : 0 }}>
          
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
          <div style={{ 
            background: selectedIds.length > 0 ? "#f0f9ff" : "#f8fafc", 
            border: `1px solid ${selectedIds.length > 0 ? "#bae6fd" : "#e2e8f0"}`, 
            borderRadius: 12, 
            padding: "12px 20px", 
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
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
                  onTagClick={(t) => setTagFilter(tagFilter === t ? "" : t)} 
                  onPreview={setActivePreview}
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
      return (
        <VideoPlayer
          options={{
            autoplay: true, controls: true, responsive: true, fluid: true,
            controlBar: { pictureInPictureToggle: false },
            sources: [{ src: material.file_url, type: "video/mp4" }],
          }}
        />
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
      `}</style>
      <div style={{
        background: "#0f172a", borderRadius: 18, width: "100%", maxWidth: 960,
        boxShadow: "0 40px 100px rgba(0,0,0,0.7)",
        animation: "cm-preview-up 0.22s cubic-bezier(.4,0,.2,1)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
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
        <div style={{ padding: material.file_type === "video" ? "0" : "20px", background: "#0f172a" }}>
          {renderPlayer()}
        </div>
      </div>
    </div>
  );
}
