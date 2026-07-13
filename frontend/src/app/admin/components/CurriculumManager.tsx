"use client";
import { apiFetch } from "@/lib/apiFetch";
import React, { useEffect, useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { API_BASE_URL } from "@/lib/config";
import { useToast } from "./ToastProvider";
import { createPortal } from "react-dom";
import { Icon } from "../icons";
import UploadModal from "./UploadModal";
import DeleteModal from "./DeleteModal";
import AIChapterGeneratorModal from "./AIChapterGeneratorModal";

// ─── Client Portal helper to escape CSS Transform Stacking Contexts ─────────
function ClientPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface Subject {
  id: number;
  name: string;
}

interface Chapter {
  id: number;
  title: string;
  content: string | null;
  subject_id: number;
  is_active: boolean;
  order_position: number;
}

interface Material {
  id: number;
  title: string;
  file_type: string;
  file_url: string | null;
  youtube_url: string | null;
  thumbnail_url: string | null;
  file_size?: number | null;
  tags?: string;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function getYouTubeId(url: string): string | null {
  const regExp = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

function getYouTubeThumbnail(url: string): string | null {
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

const TYPE_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  video:    { bg: "#ede9fe", color: "#7c3aed", label: "VIDEO" },
  youtube:  { bg: "#fee2e2", color: "#dc2626", label: "YT" },
  pdf:      { bg: "#fef3c7", color: "#d97706", label: "PDF" },
  image:    { bg: "#d1fae5", color: "#059669", label: "IMG" },
  document: { bg: "#dbeafe", color: "#2563eb", label: "DOC" },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] || { bg: "#f1f5f9", color: "#64748b", label: type.toUpperCase() };
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function CurriculumManager() {
  const { showToast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | "">("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [savingChapters, setSavingChapters] = useState(false);
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [showAIGenerate, setShowAIGenerate] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [newChapterContent, setNewChapterContent] = useState("");
  const [newChapterIsActive, setNewChapterIsActive] = useState(true);

  const chapterSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/subjects`);
      if (res.ok) setSubjects(await res.json());
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchChapters = useCallback(async (subId: number) => {
    setLoadingChapters(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/subjects/${subId}/chapters`);
      if (res.ok) setChapters(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingChapters(false);
    }
  }, []);

  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);

  useEffect(() => {
    if (selectedSubjectId) fetchChapters(selectedSubjectId as number);
    else setChapters([]);
  }, [selectedSubjectId, fetchChapters]);

  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChapterTitle.trim() || !selectedSubjectId) return;
    try {
      const res = await apiFetch(`${API_BASE_URL}/subjects/${selectedSubjectId}/chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newChapterTitle.trim(),
          content: newChapterContent.trim(),
          subject_id: selectedSubjectId,
          is_active: newChapterIsActive,
        }),
      });
      if (res.ok) {
        showToast(`Chapter created (${newChapterIsActive ? "Active" : "Inactive"})!`);
        setNewChapterTitle(""); setNewChapterContent(""); setNewChapterIsActive(true); setShowAddChapter(false);
        fetchChapters(selectedSubjectId as number);
      } else showToast("Failed to create chapter", "error");
    } catch { showToast("Network error", "error"); }
  };

  const handleChapterDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = chapters.findIndex(c => c.id === active.id);
    const newIdx = chapters.findIndex(c => c.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(chapters, oldIdx, newIdx);
    setChapters(reordered);
    setSavingChapters(true);
    try {
      const items = reordered.map((c, i) => ({ id: c.id, order_position: i }));
      const res = await apiFetch(`${API_BASE_URL}/subjects/${selectedSubjectId}/chapters/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(items),
      });
      if (!res.ok) { showToast("Failed to save chapter order", "error"); fetchChapters(selectedSubjectId as number); }
    } catch {
      showToast("Network error saving chapter order", "error");
      fetchChapters(selectedSubjectId as number);
    } finally {
      setSavingChapters(false);
    }
  };

  return (
    <div className="manager-content">

      {/* ══════════════════════════════════════════════
          HERO HEADER BANNER
      ══════════════════════════════════════════════ */}
      <div style={{
        background: "#ffffff",
        borderRadius: 16,
        padding: "24px 32px",
        marginBottom: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 24,
        border: "1px solid #e2e8f0",
        boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {/* Icon badge */}
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid #e2e8f0" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={{ background: "#f1f5f9", color: "#64748b", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, letterSpacing: "0.5px", textTransform: "uppercase" }}>Admin System</span>
            </div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px" }}>Curriculum Builder</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Design structured learning paths with chapters and materials.</p>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
          {[
            { label: "Subjects", value: subjects.length, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg> },
            { label: "Selected", value: selectedSubjectId ? subjects.find(s => s.id === selectedSubjectId)?.name?.slice(0, 8) + ((subjects.find(s => s.id === selectedSubjectId)?.name?.length ?? 0) > 8 ? "…" : "") || "–" : "–", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> },
          ].map(stat => (
            <div key={stat.label} style={{ background: "#fff", borderRadius: 12, padding: "12px 18px", minWidth: 120, display: "flex", alignItems: "center", gap: 14, border: "1px solid #e2e8f0" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #f1f5f9" }}>
                {stat.icon}
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>{stat.label}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", lineHeight: 1.2, marginTop: 2 }}>{stat.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          SUBJECT SELECTOR CARD
      ══════════════════════════════════════════════ */}
      <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", border: "1px solid #e2e8f0", marginBottom: 28 }}>
        <p style={{ margin: "0 0 14px", fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Step 1 — Choose a Subject</p>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 280 }}>
            <svg style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
            <select
              value={selectedSubjectId}
              onChange={e => setSelectedSubjectId(e.target.value === "" ? "" : Number(e.target.value))}
              style={{
                width: "100%", padding: "12px 14px 12px 44px",
                borderRadius: 12, border: "1.5px solid #e2e8f0",
                fontSize: 14, fontWeight: 500, color: "#0f172a",
                outline: "none", background: "#f8fafc",
                appearance: "none", cursor: "pointer",
                boxSizing: "border-box",
                transition: "border-color 0.18s",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "#6366f1")}
              onBlur={e => (e.currentTarget.style.borderColor = "#e2e8f0")}
            >
              <option value="">— Select a subject to manage —</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {/* Custom chevron */}
            <svg style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          {selectedSubjectId && (
            <button
              onClick={() => setSelectedSubjectId("")}
              style={{ padding: "12px 18px", borderRadius: 12, border: "1px solid #fee2e2", background: "#fef2f2", color: "#ef4444", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              ✕ Clear
            </button>
          )}
        </div>

        {/* Subject pills */}
        {subjects.length > 0 && (
          <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {subjects.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedSubjectId(s.id)}
                style={{
                  padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                  cursor: "pointer", transition: "all 0.15s",
                  background: selectedSubjectId === s.id ? "#0f172a" : "#f1f5f9",
                  color: selectedSubjectId === s.id ? "#fff" : "#475569",
                  border: selectedSubjectId === s.id ? "1px solid #0f172a" : "1px solid #e2e8f0",
                }}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          EMPTY STATE (no subject selected)
      ══════════════════════════════════════════════ */}
      {!selectedSubjectId ? (
        <div>
          {/* Main empty state card */}
          <div style={{
            background: "#fff", borderRadius: 20, padding: "56px 40px",
            textAlign: "center", border: "1px solid #f1f5f9",
            boxShadow: "0 4px 24px rgba(0,0,0,0.03)",
          }}>
            {/* Illustration */}
            <div style={{ width: 80, height: 80, borderRadius: 24, background: "linear-gradient(135deg, #eef2ff, #dbeafe)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
              </svg>
            </div>
            <h2 style={{ margin: "0 0 10px", fontSize: 20, fontWeight: 800, color: "#0f172a" }}>Ready to Build Your Curriculum?</h2>
            <p style={{ margin: "0 auto 32px", fontSize: 14, color: "#64748b", maxWidth: 420, lineHeight: 1.7 }}>
              Select a subject from the dropdown above to view, create, and organize its chapters and learning materials.
            </p>

            {/* Arrow pointing up */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#6366f1", fontSize: 13, fontWeight: 600 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
              Pick a subject to get started
            </div>
          </div>

          {/* Info cards row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 20 }}>
            {[
              { icon: "📖", color: "#6366f1", bg: "#eef2ff", title: "Organize Chapters", desc: "Structure your content into logical chapters with titles and summaries." },
              { icon: "🎬", color: "#0ea5e9", bg: "#e0f2fe", title: "Attach Materials", desc: "Link videos, PDFs, images and YouTube content to each chapter." },
              { icon: "🔀", color: "#22c55e", bg: "#dcfce7", title: "Drag & Drop Order", desc: "Reorder both chapters and materials with intuitive drag-and-drop." },
            ].map(card => (
              <div key={card.title} style={{ background: "#fff", borderRadius: 16, padding: "24px", border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: card.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 14 }}>
                  {card.icon}
                </div>
                <h3 style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{card.title}</h3>
                <p style={{ margin: 0, fontSize: 12.5, color: "#64748b", lineHeight: 1.6 }}>{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h2 style={{ fontSize: 18, margin: 0, color: "#0f172a" }}>Chapters</h2>
              {savingChapters && <span style={{ fontSize: 11, color: "#6366f1", fontWeight: 600, background: "#eef2ff", padding: "2px 8px", borderRadius: 6 }}>Saving order...</span>}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setShowAIGenerate(true)}
                style={{ background: "#6366f1", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                AI Generate
              </button>
              <button
                onClick={() => setShowAddChapter(!showAddChapter)}
                style={{ background: "#0f172a", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
              >
                <Icon name={showAddChapter ? "x" : "plus"} size={14} />
                {showAddChapter ? "Cancel" : "+ Add Chapter"}
              </button>
            </div>
          </div>

          {showAddChapter && (
            <form onSubmit={handleCreateChapter} style={{ background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 20 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Title *</label>
                <input autoFocus value={newChapterTitle} onChange={e => setNewChapterTitle(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, background: "#f8fafc", outline: "none", boxSizing: "border-box" }} placeholder="e.g. Chapter 1: Introduction" />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Summary (optional)</label>
                <textarea value={newChapterContent} onChange={e => setNewChapterContent(e.target.value)} rows={3} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, background: "#f8fafc", outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} placeholder="Brief overview of the chapter..." />
              </div>

              {/* Active / Inactive toggle */}
              <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", background: newChapterIsActive ? "#f0fdf4" : "#fafafa", borderRadius: 10, border: `1px solid ${newChapterIsActive ? "#bbf7d0" : "#e2e8f0"}` }}>
                <button
                  type="button"
                  onClick={() => setNewChapterIsActive(v => !v)}
                  style={{
                    width: 42, height: 24, borderRadius: 12, border: "none", cursor: "pointer", padding: 0,
                    background: newChapterIsActive ? "#22c55e" : "#e2e8f0",
                    position: "relative", transition: "background 0.2s", flexShrink: 0,
                  }}
                >
                  <span style={{
                    position: "absolute", top: 3, left: newChapterIsActive ? 21 : 3,
                    width: 18, height: 18, borderRadius: "50%", background: "#fff",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.2s",
                  }} />
                </button>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: newChapterIsActive ? "#15803d" : "#64748b" }}>
                    {newChapterIsActive ? "Active — Visible to students" : "Inactive — Hidden from students"}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8" }}>You can change this anytime from the chapter card.</p>
                </div>
              </div>

              <button type="submit" style={{ background: "#0ea5e9", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Save Chapter</button>
            </form>
          )}

          {loadingChapters ? (
            <div style={{ textAlign: "center", padding: 40 }}><p style={{ color: "#94a3b8" }}>Loading chapters...</p></div>
          ) : chapters.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, border: "1px solid #f1f5f9", borderRadius: 12, background: "#fff" }}>
              <p style={{ color: "#94a3b8", fontSize: 14 }}>No chapters yet. Create one to get started.</p>
            </div>
          ) : (
            <DndContext sensors={chapterSensors} collisionDetection={closestCenter} onDragEnd={handleChapterDragEnd}>
              <SortableContext items={chapters.map(c => c.id)} strategy={verticalListSortingStrategy}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {chapters.map(c => (
                    <SortableChapterCard key={c.id} chapter={c} refreshChapters={() => fetchChapters(selectedSubjectId as number)} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}

      {/* AI Chapter Generator Modal */}
      {showAIGenerate && selectedSubjectId && (
        <ClientPortal>
          <AIChapterGeneratorModal
            subjectId={selectedSubjectId as number}
            subjectName={subjects.find(s => s.id === selectedSubjectId)?.name || "Unknown"}
            onClose={() => setShowAIGenerate(false)}
            onChaptersAdded={() => fetchChapters(selectedSubjectId as number)}
          />
        </ClientPortal>
      )}
    </div>
  );
}

// ─── Sortable Chapter Card Wrapper ───────────────────────────────────────────

function SortableChapterCard({ chapter, refreshChapters }: { chapter: Chapter; refreshChapters: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: chapter.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: "relative",
  };
  return (
    <div ref={setNodeRef} style={style}>
      {/* Drag grip strip — separate from the header click area */}
      <div
        {...attributes}
        {...listeners}
        title="Drag to reorder chapter"
        style={{
          position: "absolute",
          left: 0, top: 0, bottom: 0,
          width: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: isDragging ? "grabbing" : "grab",
          color: "#d1d5db",
          zIndex: 2,
          touchAction: "none",
          borderRadius: "16px 0 0 16px",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.color = "#6366f1"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.color = "#d1d5db"; }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
          <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
          <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
        </svg>
      </div>
      {/* Offset the ChapterCard content so it doesn't overlap the grip */}
      <div style={{ marginLeft: 28 }}>
        <ChapterCard chapter={chapter} refreshChapters={refreshChapters} />
      </div>
    </div>
  );
}

// ─── Sortable Material Row (Table Style) ────────────────────────────────────

function SortableMaterialCard({
  material,
  index,
  onUnlink,
  onPreview,
}: {
  material: Material;
  index: number;
  onUnlink: () => void;
  onPreview: () => void;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } = useSortable({ id: material.id });
  const tc = getTypeConfig(material.file_type);

  const rowStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.35 : 1,
    display: "grid",
    gridTemplateColumns: "36px 32px 32px 1fr 60px 36px 36px",
    alignItems: "center",
    height: 44,
    background: isSortableDragging ? "#eef2ff" : index % 2 === 0 ? "#fff" : "#fafafa",
    borderBottom: "1px solid #f1f5f9",
    boxShadow: isSortableDragging ? "0 6px 24px rgba(99,102,241,0.15)" : "none",
    borderRadius: isSortableDragging ? 8 : 0,
  };

  return (
    <div ref={setNodeRef} style={rowStyle}>

      {/* ① Drag grip */}
      <div
        {...attributes}
        {...listeners}
        title="Drag to reorder"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", cursor: "grab", color: "#d1d5db", touchAction: "none" }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.color = "#6366f1"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.color = "#d1d5db"; }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
          <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
          <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
        </svg>
      </div>

      {/* ② Row number */}
      <div style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#cbd5e1" }}>
        {index + 1}
      </div>

      {/* ③ Type dot */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: tc.color, flexShrink: 0 }} />
      </div>

      {/* ④ Title — takes all remaining width, click to preview */}
      <div
        onClick={onPreview}
        style={{ minWidth: 0, paddingRight: 12, cursor: "pointer" }}
        title={material.title}
      >
        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1 }}>
          {material.title}
        </p>
      </div>

      {/* ⑤ Type badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ background: tc.bg, color: tc.color, fontSize: 9, fontWeight: 800, padding: "3px 7px", borderRadius: 4, letterSpacing: "0.6px", whiteSpace: "nowrap" }}>
          {tc.label}
        </span>
      </div>

      {/* ⑥ Preview button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <button
          onClick={onPreview}
          title="Preview"
          style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", padding: 4, borderRadius: 4 }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#6366f1"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8"; }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </div>

      {/* ⑦ Remove button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <button
          onClick={e => { e.stopPropagation(); onUnlink(); }}
          title="Remove"
          style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", padding: 4, borderRadius: 4 }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8"; }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

    </div>
  );
}

// ─── Chapter Card ──────────────────────────────────────────────────────────

function ChapterCard({ chapter, refreshChapters }: { chapter: Chapter; refreshChapters: () => void }) {
  const { showToast } = useToast();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [isActive, setIsActive] = useState(chapter.is_active);
  const [togglingActive, setTogglingActive] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null);
  const [activeDragId, setActiveDragId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(chapter.title);
  const [editContent, setEditContent] = useState(chapter.content || "");
  const [savingEdit, setSavingEdit] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/chapters/${chapter.id}/materials`);
      if (res.ok) setMaterials(await res.json());
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [chapter.id]);

  useEffect(() => {
    // Lazy load: only fetch when chapter is opened for the first time
    if (isOpen && !hasFetched) {
      fetchMaterials();
      setHasFetched(true);
    }
  }, [isOpen, hasFetched, fetchMaterials]);

  const handleToggle = () => setIsOpen(v => !v);

  const handleToggleActive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setTogglingActive(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/chapters/${chapter.id}/toggle-active`, { method: "PATCH" });
      if (res.ok) {
        const updated = await res.json();
        setIsActive(updated.is_active);
        showToast(updated.is_active ? "Chapter is now Active ✓" : "Chapter set to Inactive");
      } else showToast("Failed to toggle status", "error");
    } catch { showToast("Network error", "error"); }
    finally { setTogglingActive(false); }
  };

  const handleDelete = async () => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/chapters/${chapter.id}`, { method: "DELETE" });
      if (res.ok) { showToast("Chapter deleted"); refreshChapters(); }
      else showToast("Failed to delete chapter", "error");
    } catch { showToast("Network error", "error"); }
  };

  const unlinkMaterial = async (materialId: number) => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/chapters/${chapter.id}/materials/${materialId}`, { method: "DELETE" });
      if (res.ok) { showToast("Material removed"); fetchMaterials(); }
      else showToast("Failed to remove", "error");
    } catch { showToast("Network error", "error"); }
  };

  const handleLibrarySelected = async (material: Material) => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/chapters/${chapter.id}/materials/${material.id}`, { method: "POST" });
      if (res.ok) { showToast("Material linked!"); fetchMaterials(); setShowLibrary(false); }
      else showToast("Failed to link material", "error");
    } catch { showToast("Network error", "error"); }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as number);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = materials.findIndex(m => m.id === active.id);
    const newIndex = materials.findIndex(m => m.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Optimistically reorder the UI immediately
    const reordered = arrayMove(materials, oldIndex, newIndex);
    setMaterials(reordered);

    // Persist to backend
    setSaving(true);
    try {
      const items = reordered.map((m, idx) => ({ id: m.id, order_position: idx }));
      const res = await apiFetch(`${API_BASE_URL}/chapters/${chapter.id}/materials/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(items),
      });
      if (!res.ok) {
        showToast("Failed to save order", "error");
        fetchMaterials(); // Roll back if it failed
      }
    } catch {
      showToast("Network error saving order", "error");
      fetchMaterials();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;
    setSavingEdit(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/chapters/${chapter.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          content: editContent.trim(),
        }),
      });
      if (res.ok) {
        showToast("Chapter updated!");
        setIsEditing(false);
        refreshChapters();
      } else {
        showToast("Failed to update chapter", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  const activeMaterial = activeDragId ? materials.find(m => m.id === activeDragId) : null;

  return (
    <div style={{ background: "#fff", border: `1px solid ${isActive ? "#e2e8f0" : "#fde8d0"}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.03)", opacity: isActive ? 1 : 0.85 }}>

      {/* ── Chapter header ── */}
      <div
        style={{ padding: "14px 20px", background: isOpen ? "#f8fafc" : "#fff", borderBottom: isOpen ? "1px solid #f1f5f9" : "none", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", userSelect: "none" }}
        onClick={handleToggle}
      >
        {/* Chevron */}
        <div style={{ color: "#94a3b8", flexShrink: 0, transition: "transform 0.2s", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", display: "flex" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </div>

        {/* Title + summary */}
        {isEditing ? (
          <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSaveEdit}>
              <input 
                autoFocus 
                value={editTitle} 
                onChange={e => setEditTitle(e.target.value)} 
                style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14, marginBottom: 8, outline: "none", boxSizing: "border-box" }} 
                placeholder="Chapter Title" 
              />
              <textarea 
                value={editContent} 
                onChange={e => setEditContent(e.target.value)} 
                rows={2} 
                style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12, resize: "vertical", outline: "none", marginBottom: 8, boxSizing: "border-box", fontFamily: "inherit" }} 
                placeholder="Summary (optional)" 
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" disabled={savingEdit} style={{ background: "#22c55e", color: "#fff", border: "none", padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  {savingEdit ? "Saving..." : "Save"}
                </button>
                <button type="button" onClick={() => { setIsEditing(false); setEditTitle(chapter.title); setEditContent(chapter.content || ""); }} style={{ background: "#f1f5f9", color: "#64748b", border: "none", padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{chapter.title}</h3>
            {chapter.content && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{chapter.content}</p>}
          </div>
        )}

        {/* ─ LIVE / DRAFT badge ─ */}
        <span
          style={{
            flexShrink: 0,
            display: "inline-flex", alignItems: "center", gap: 4,
            background: isActive ? "#dcfce7" : "#fef3c7",
            color: isActive ? "#15803d" : "#92400e",
            fontSize: 10, fontWeight: 800,
            padding: "3px 9px", borderRadius: 20,
            letterSpacing: "0.4px",
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: isActive ? "#22c55e" : "#f59e0b", display: "inline-block" }} />
          {isActive ? "LIVE" : "DRAFT"}
        </span>

        {/* ─ Active toggle switch ─ */}
        <button
          onClick={handleToggleActive}
          disabled={togglingActive}
          title={isActive ? "Click to deactivate (hide from students)" : "Click to activate (show to students)"}
          style={{
            width: 38, height: 22, borderRadius: 11, border: "none",
            background: isActive ? "#22c55e" : "#e2e8f0",
            position: "relative", cursor: togglingActive ? "wait" : "pointer",
            flexShrink: 0, transition: "background 0.2s", padding: 0,
          }}
        >
          <span style={{
            position: "absolute", top: 2,
            left: isActive ? 18 : 2,
            width: 18, height: 18, borderRadius: "50%", background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.2s",
          }} />
        </button>

        {/* Material count badge */}
        {hasFetched && (
          <span style={{ background: "#f1f5f9", color: "#64748b", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, flexShrink: 0 }}>
            {materials.length} item{materials.length !== 1 ? "s" : ""}
          </span>
        )}

        {/* Browse Library button */}
        <button
          onClick={e => { e.stopPropagation(); setShowLibrary(true); }}
          style={{ background: "#eef2ff", color: "#4f46e5", border: "none", padding: "5px 11px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, flexShrink: 0, whiteSpace: "nowrap" }}
        >
          <Icon name="search" size={12} /> Browse
        </button>

        {/* Upload button */}
        <button
          onClick={e => { e.stopPropagation(); setShowUpload(true); }}
          style={{ background: "#0ea5e9", color: "#fff", border: "none", padding: "5px 11px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, flexShrink: 0, whiteSpace: "nowrap" }}
        >
          <Icon name="upload" size={12} /> Upload
        </button>

        {/* Edit chapter */}
        <button
          onClick={e => { e.stopPropagation(); setIsEditing(true); }}
          title="Edit Chapter"
          style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 4, display: "flex", flexShrink: 0 }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#6366f1"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8"; }}
        >
          <Icon name="edit" size={15} />
        </button>

        {/* Delete chapter */}
        <button
          onClick={e => { e.stopPropagation(); setShowDeleteModal(true); }}
          title="Delete Chapter"
          style={{ background: "none", border: "none", color: "#fca5a5", cursor: "pointer", padding: 4, display: "flex", flexShrink: 0 }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#fca5a5"; }}
        >
          <Icon name="trash" size={15} />
        </button>
      </div>

      {/* ── Materials section (collapsible) ── */}
      {isOpen && (
      <div style={{ padding: "16px 20px" }}>
        {saving && <span style={{ fontSize: 11, color: "#6366f1", fontWeight: 600, background: "#eef2ff", padding: "2px 8px", borderRadius: 6, display: "inline-block", marginBottom: 10 }}>Saving order...</span>}

        {loading ? (
          <p style={{ fontSize: 13, color: "#94a3b8" }}>Loading materials...</p>
        ) : materials.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", background: "#f8fafc", borderRadius: 10, border: "1px dashed #cbd5e1" }}>
            <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>No materials added yet. Upload or browse the library.</p>
          </div>
        ) : (
          <>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              {/* Table container */}
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>

                {/* Table header */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "36px 32px 32px 1fr 60px 36px 36px",
                  alignItems: "center",
                  height: 34,
                  background: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                  paddingLeft: 0,
                }}>
                  <div /> {/* grip col */}
                  <div style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>#</div>
                  <div /> {/* dot col */}
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", paddingRight: 12 }}>Name</div>
                  <div style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Type</div>
                  <div /> {/* preview col */}
                  <div /> {/* remove col */}
                </div>

                {/* Sortable rows */}
                <SortableContext items={materials.map(m => m.id)} strategy={verticalListSortingStrategy}>
                  <div>
                    {materials.map((m, idx) => (
                      <SortableMaterialCard
                        key={m.id}
                        material={m}
                        index={idx}
                        onUnlink={() => unlinkMaterial(m.id)}
                        onPreview={() => setPreviewMaterial(m)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </div>

              {/* Drag Overlay — slim ghost row while dragging */}
              <DragOverlay>
                {activeMaterial ? (() => {
                  const tc = getTypeConfig(activeMaterial.file_type);
                  return (
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "36px 32px 32px 1fr 60px 36px 36px",
                      alignItems: "center",
                      height: 44,
                      background: "#fff",
                      border: "2px solid #6366f1",
                      borderRadius: 8,
                      boxShadow: "0 10px 32px rgba(99,102,241,0.25)",
                      opacity: 0.95,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#6366f1" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
                          <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                          <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
                        </svg>
                      </div>
                      <div />
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: tc.color }} />
                      </div>
                      <div style={{ minWidth: 0, paddingRight: 12 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{activeMaterial.title}</p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ background: tc.bg, color: tc.color, fontSize: 9, fontWeight: 800, padding: "3px 7px", borderRadius: 4 }}>{tc.label}</span>
                      </div>
                      <div /><div />
                    </div>
                  );
                })() : null}
              </DragOverlay>
            </DndContext>

            <p style={{ margin: "8px 0 0", fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", gap: 4 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="5" r="1.5" fill="currentColor"/><circle cx="9" cy="12" r="1.5" fill="currentColor"/></svg>
              Drag the ⠿ grip to reorder
            </p>
          </>
        )}

      </div>
      )} {/* end isOpen */}

      <ClientPortal>
        {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSuccess={m => handleLibrarySelected(m)} existingTags={[]} />}
        {showLibrary && <LibraryBrowserModal onClose={() => setShowLibrary(false)} onSelect={handleLibrarySelected} currentMaterialIds={materials.map(m => m.id)} />}
        {showDeleteModal && (
          <DeleteModal
            title="Delete Chapter?"
            itemName={chapter.title}
            description="This will also unlink all materials from this chapter. This action cannot be undone."
            confirmText="Delete"
            onConfirm={handleDelete}
            onCancel={() => setShowDeleteModal(false)}
          />
        )}
        {previewMaterial && <MediaPreviewModal material={previewMaterial} onClose={() => setPreviewMaterial(null)} />}
      </ClientPortal>
    </div>
  );
}

// ─── Library Browser Modal ──────────────────────────────────────────────────

function LibraryBrowserModal({ onClose, onSelect, currentMaterialIds }: { onClose: () => void; onSelect: (m: Material) => void; currentMaterialIds: number[] }) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [tagFilter, setTagFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`${API_BASE_URL}/materials`);
        if (res.ok) {
          const data = await res.json();
          data.sort((a: Material, b: Material) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setMaterials(data);
        }
      } catch { console.error("Failed to load library"); }
      finally { setLoading(false); }
    })();
  }, []);

  const existingTags = Array.from(new Set(materials.flatMap(m => m.tags ? m.tags.split(",").map(t => t.trim()).filter(Boolean) : []))).sort();

  const filtered = materials.filter(m => {
    if (currentMaterialIds.includes(m.id)) return false;
    if (search && !m.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType !== "all" && m.file_type !== filterType) return false;
    if (tagFilter) {
      const tgs = m.tags ? m.tags.split(",").map(t => t.trim()) : [];
      if (!tgs.includes(tagFilter)) return false;
    }
    return true;
  });

  const FILTERS = [
    { key: "all", label: "All Items" }, { key: "video", label: "Videos" },
    { key: "youtube", label: "YouTube" }, { key: "pdf", label: "PDFs" },
    { key: "document", label: "Documents" }, { key: "image", label: "Images" }
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,0.65)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)" }}>
      <div style={{ background: "#f8fafc", borderRadius: 20, width: "95%", maxWidth: 1000, height: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.3)" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", borderRadius: "20px 20px 0 0" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: "#0f172a" }}>Browse Library</h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Select a material to attach it to this chapter.</p>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 18, border: "none", background: "#f1f5f9", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}><Icon name="x" size={18} /></button>
        </div>

        {/* Filters */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", background: "#fff" }}>
          <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title..." style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 16, background: "#f8fafc" }} />
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12 }}>
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilterType(f.key)} style={{ padding: "6px 14px", borderRadius: 20, border: filterType === f.key ? "1px solid #6366f1" : "1px solid #e2e8f0", background: filterType === f.key ? "#eef2ff" : "#fff", color: filterType === f.key ? "#4f46e5" : "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                {f.label}
              </button>
            ))}
          </div>
          {existingTags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginRight: 8 }}>Tags:</span>
              <button onClick={() => setTagFilter("")} style={{ background: tagFilter === "" ? "#1e293b" : "#f1f5f9", color: tagFilter === "" ? "#fff" : "#64748b", border: "none", padding: "4px 12px", borderRadius: 14, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>All Tags</button>
              {existingTags.map(tag => (
                <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? "" : tag)} style={{ background: tagFilter === tag ? "#6366f1" : "#fff", color: tagFilter === tag ? "#fff" : "#4f46e5", border: `1px solid ${tagFilter === tag ? "#6366f1" : "#c7d2fe"}`, padding: "3px 12px", borderRadius: 14, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>#{tag}</button>
              ))}
            </div>
          )}
        </div>

        {/* Grid */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#94a3b8", background: "#fff", borderRadius: 16, border: "1px dashed #cbd5e1" }}>No available materials match your filters.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
              {filtered.map(m => {
                const tc = getTypeConfig(m.file_type);
                const tagsList = m.tags ? m.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
                
                let thumbUrl = m.thumbnail_url;
                if (!thumbUrl && m.file_type === "youtube" && m.youtube_url) {
                  thumbUrl = getYouTubeThumbnail(m.youtube_url);
                }

                return (
                  <div key={m.id} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                    <div style={{ height: 80, background: tc.bg, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                      {thumbUrl ? (
                         <img src={thumbUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                         <span style={{ fontSize: 11, fontWeight: 800, color: tc.color, letterSpacing: "1px" }}>{tc.label}</span>
                      )}
                      
                      {thumbUrl && (
                        <span style={{ position: "absolute", top: 6, right: 6, background: tc.bg, color: tc.color, fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4 }}>
                          {tc.label}
                        </span>
                      )}
                    </div>
                    <div style={{ padding: "12px", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                      <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#0f172a", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.4 }}>{m.title}</h3>
                      {tagsList.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: "auto", paddingTop: 8 }}>
                          {tagsList.slice(0, 3).map(t => (
                            <span key={t} style={{ background: "#f1f5f9", color: "#475569", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 12, border: "1px solid #e2e8f0" }}>#{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ padding: "10px" }}>
                      <button onClick={() => onSelect(m)} style={{ width: "100%", background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        Add to Chapter
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Media Preview Modal ────────────────────────────────────────────────────

function MediaPreviewModal({ material, onClose }: { material: Material; onClose: () => void }) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const ytId = material.youtube_url ? getYouTubeId(material.youtube_url) : null;
  const tc = getTypeConfig(material.file_type);

  const renderPlayer = () => {
    if (material.file_type === "youtube" && ytId) {
      return (
        <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, width: "100%" }}>
          <iframe src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none", borderRadius: 10 }} />
        </div>
      );
    }
    if (material.file_type === "video" && material.file_url) {
      return <video src={material.file_url} controls autoPlay controlsList="nodownload" style={{ width: "100%", maxHeight: "70vh", borderRadius: 10, background: "#000", display: "block" }} />;
    }
    if (material.file_type === "pdf" && material.file_url) {
      return <iframe src={material.file_url} style={{ width: "100%", height: "70vh", border: "none", borderRadius: 10 }} title={material.title} />;
    }
    if (material.file_type === "image" && material.file_url) {
      return <img src={material.file_url} alt={material.title} style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 10, display: "block", margin: "0 auto", objectFit: "contain" }} />;
    }
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
        <p style={{ margin: 0, fontSize: 14 }}>No preview available.</p>
        {material.file_url && (
          <a href={material.file_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 14, padding: "8px 20px", background: "#6366f1", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Open File ↗</a>
        )}
      </div>
    );
  };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(10,15,30,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: "#0f172a", borderRadius: 18, width: "100%", maxWidth: 900, boxShadow: "0 40px 100px rgba(0,0,0,0.6)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "#1e293b", borderBottom: "1px solid #334155" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ background: tc.bg, color: tc.color, fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 6 }}>{tc.label}</span>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#f1f5f9", maxWidth: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{material.title}</h3>
          </div>
          <button onClick={onClose} style={{ background: "#334155", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style={{ padding: "20px", background: "#0f172a" }}>{renderPlayer()}</div>
      </div>
    </div>
  );
}
