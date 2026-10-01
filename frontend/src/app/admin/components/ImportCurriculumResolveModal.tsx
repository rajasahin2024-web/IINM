"use client";
import React, { useState } from "react";
import { Icon } from "../icons";

/* ── Shared curriculum-import model (also used by CourseManager) ── */

export const normNameKey = (v: unknown) =>
  String(v ?? "")
    .normalize("NFC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

export interface CurriculumChapterEntry {
  id?: number;
  title?: string;
  mapped?: boolean;
  [key: string]: unknown;
}

export interface CurriculumSubjectEntry {
  id?: number;
  name?: string;
  chapters?: CurriculumChapterEntry[];
  [key: string]: unknown;
}

export interface SubjectRef {
  id: number;
  name: string;
}

export interface ChapterRef {
  id: number;
  title: string;
}

export interface CategoryRef {
  id: number;
  name: string;
}

export interface SubCategoryRef {
  id: number;
  name: string;
  category_id: number;
}

export interface MatchedSubject {
  entry: CurriculumSubjectEntry;
  subject: SubjectRef;
  matchedChapters: ChapterRef[];
  unmatchedChapters: CurriculumChapterEntry[];
}

export interface MissingSubject {
  /** Original JSON entry (id/name preserved for display). */
  entry: CurriculumSubjectEntry;
  /** Importable chapters only — `mapped: false` entries are stripped in the parse phase. */
  chapters: CurriculumChapterEntry[];
}

export interface ImportMatchModel {
  matched: MatchedSubject[];
  missing: MissingSubject[];
}

/** Chapter indexes always refer to `MissingSubject.chapters` (the importable list). */
export type SubjectResolution =
  | { kind: "skip" }
  | { kind: "map"; subjectId: number; createChapterIdxs: number[] }
  | {
      kind: "create";
      name: string;
      catId: number | "new";
      newCategoryName: string;
      subcatId: number | "new";
      newSubcategoryName: string;
      createChapterIdxs: number[];
    };

/* ── Row state ── */

interface RowState {
  choice: "create" | "map" | "skip";
  name: string;
  catId: number | "new" | "";
  newCategoryName: string;
  subcatId: number | "new" | "";
  newSubcategoryName: string;
  /** create: chapter idxs to create under the new subject (default: all). */
  createChecked: Set<number>;
  mapSubjectId: number | "";
  /** map: idxs of unmatched chapters to also create (default: none — opt-in). */
  mapChecked: Set<number>;
  mapChapters: ChapterRef[] | null;
  mapLoading: boolean;
  error: string | null;
}

interface ImportCurriculumResolveModalProps {
  model: ImportMatchModel;
  subjects: SubjectRef[];
  categories: CategoryRef[];
  subcategories: SubCategoryRef[];
  loadSubjectChapters: (subjectId: number) => Promise<ChapterRef[]>;
  applying: boolean;
  onApply: (resolutions: SubjectResolution[]) => Promise<Record<number, string> | null>;
  onCancel: () => void;
}

const chapterLabel = (c: CurriculumChapterEntry, i: number) =>
  String(c.title ?? c.id ?? `Chapter ${i + 1}`);

const isChapterMatched = (entry: CurriculumChapterEntry, chapters: ChapterRef[]) =>
  chapters.some(c => c.id === entry.id) ||
  chapters.some(c => normNameKey(c.title) === normNameKey(entry.title));

export default function ImportCurriculumResolveModal({
  model,
  subjects,
  categories,
  subcategories,
  loadSubjectChapters,
  applying,
  onApply,
  onCancel,
}: ImportCurriculumResolveModalProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [rows, setRows] = useState<RowState[]>(() =>
    model.missing.map(m => ({
      choice: "create",
      name: String(m.entry.name ?? ""),
      catId: "",
      newCategoryName: "",
      subcatId: "",
      newSubcategoryName: "",
      createChecked: new Set(m.chapters.map((_, i) => i)),
      mapSubjectId: "",
      mapChecked: new Set<number>(),
      mapChapters: null,
      mapLoading: false,
      error: null,
    }))
  );

  const updateRow = (i: number, patch: Partial<RowState>) =>
    setRows(prev => prev.map((r, idx) => (idx === i ? { ...r, error: null, ...patch } : r)));

  const selectMapSubject = async (i: number, subjectId: number | "") => {
    updateRow(i, { mapSubjectId: subjectId, mapChapters: null });
    if (subjectId === "") return;
    updateRow(i, { mapLoading: true });
    try {
      const chapters = await loadSubjectChapters(subjectId);
      setRows(prev => prev.map((r, idx) =>
        idx === i && r.mapSubjectId === subjectId ? { ...r, mapChapters: chapters, mapLoading: false } : r
      ));
    } catch {
      setRows(prev => prev.map((r, idx) =>
        idx === i && r.mapSubjectId === subjectId ? { ...r, mapChapters: [], mapLoading: false } : r
      ));
    }
  };

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && !applying) onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [applying, onCancel]);

  const rowValid = (r: RowState) => {
    if (r.choice === "skip") return true;
    if (r.choice === "map") return r.mapSubjectId !== "";
    return (
      r.name.trim() !== "" &&
      r.catId !== "" &&
      (r.catId !== "new" || r.newCategoryName.trim() !== "") &&
      r.subcatId !== "" &&
      (r.subcatId !== "new" || r.newSubcategoryName.trim() !== "")
    );
  };

  const allValid = rows.every(rowValid);
  const counts = rows.reduce(
    (acc, r) => ({ ...acc, [r.choice]: acc[r.choice] + 1 }),
    { create: 0, map: 0, skip: 0 } as Record<"create" | "map" | "skip", number>
  );

  const handleApply = async () => {
    const resolutions: SubjectResolution[] = rows.map(r => {
      if (r.choice === "skip") return { kind: "skip" };
      if (r.choice === "map") {
        return { kind: "map", subjectId: Number(r.mapSubjectId), createChapterIdxs: [...r.mapChecked] };
      }
      return {
        kind: "create",
        name: r.name.trim(),
        catId: r.catId as number | "new",
        newCategoryName: r.newCategoryName.trim(),
        subcatId: r.subcatId as number | "new",
        newSubcategoryName: r.newSubcategoryName.trim(),
        createChapterIdxs: [...r.createChecked],
      };
    });
    setFormError(null);
    try {
      const errors = await onApply(resolutions);
      if (errors) {
        setRows(prev => prev.map((r, i) => ({ ...r, error: errors[i] ?? null })));
      }
    } catch {
      setFormError("Import failed — please try again");
    }
  };

  const sortedSubjects = [...subjects].sort((a, b) => a.name.localeCompare(b.name));

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid #cbd5e1",
    fontSize: 12,
    fontWeight: 600,
    color: "#334155",
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
  };

  const choiceBtn = (active: boolean, color: string): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding: "8px 12px",
    border: `1.5px solid ${active ? color : "#e2e8f0"}`,
    background: active ? "#f8fafc" : "#fff",
    color: active ? "#0f172a" : "#64748b",
    fontSize: 12,
    fontWeight: 700,
    cursor: applying ? "not-allowed" : "pointer",
    minHeight: 36,
  });

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget && !applying) onCancel(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 100000,
        background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 12,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Resolve missing subjects"
        style={{
          background: "#fff", width: "100%", maxWidth: 720, maxHeight: "90vh",
          display: "flex", flexDirection: "column", overflow: "hidden",
          border: "1px solid #e2e8f0", boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
          animation: "slideUp 0.3s ease-out",
        }}
      >
        {/* Header */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div style={{ width: 32, height: 32, background: "#fef3c7", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name="alert-triangle" size={16} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Resolve missing subjects</div>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>
                {model.missing.length} subject{model.missing.length !== 1 ? "s" : ""} in the file don&apos;t match Masters
                {model.matched.length > 0 && ` · ${model.matched.length} matched will import normally`}
              </div>
            </div>
          </div>
          <button type="button" onClick={onCancel} disabled={applying} aria-label="Cancel import" style={{ border: "none", background: "transparent", color: "#94a3b8", cursor: applying ? "not-allowed" : "pointer", padding: 6, display: "flex", alignItems: "center" }}>
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="custom-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          {model.missing.map((m, i) => {
            const r = rows[i];
            const displayName = String(m.entry.name ?? m.entry.id ?? "Untitled subject");
            return (
              <div key={i} style={{ border: `1px solid ${r.error ? "#fecaca" : "#e2e8f0"}`, background: "#fff", flexShrink: 0 }}>
                {/* Card head */}
                <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ width: 24, height: 24, background: "#e0f2fe", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon name="book" size={12} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</span>
                  <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", background: "#f1f5f9", padding: "3px 8px", flexShrink: 0 }}>
                    {m.chapters.length} chapter{m.chapters.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Choice radios */}
                <div style={{ display: "flex", gap: 8, padding: "10px 14px", flexWrap: "wrap" }} role="radiogroup" aria-label={`Resolution for ${displayName}`}>
                  <label style={choiceBtn(r.choice === "create", "#059669")}>
                    <input type="radio" name={`resolve-${i}`} checked={r.choice === "create"} disabled={applying} onChange={() => updateRow(i, { choice: "create" })} style={{ accentColor: "#059669", width: 14, height: 14, margin: 0 }} />
                    Create new subject
                  </label>
                  <label style={choiceBtn(r.choice === "map", "#0ea5e9")}>
                    <input type="radio" name={`resolve-${i}`} checked={r.choice === "map"} disabled={applying} onChange={() => updateRow(i, { choice: "map" })} style={{ accentColor: "#0ea5e9", width: 14, height: 14, margin: 0 }} />
                    Map to existing subject
                  </label>
                  <label style={choiceBtn(r.choice === "skip", "#94a3b8")}>
                    <input type="radio" name={`resolve-${i}`} checked={r.choice === "skip"} disabled={applying} onChange={() => updateRow(i, { choice: "skip" })} style={{ accentColor: "#94a3b8", width: 14, height: 14, margin: 0 }} />
                    Skip
                  </label>
                </div>

                {/* Create panel */}
                {r.choice === "create" && (
                  <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                      <input type="text" value={r.name} disabled={applying} onChange={e => updateRow(i, { name: e.target.value })} placeholder="Subject name *" style={fieldStyle} />
                      <select value={r.catId} disabled={applying} onChange={e => { const v = e.target.value; updateRow(i, { catId: v === "new" ? "new" : v ? Number(v) : "", subcatId: "" }); }} style={fieldStyle}>
                        <option value="">Select Category *</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        <option value="new">+ Create New Category</option>
                      </select>
                      {r.catId === "new" && (
                        <input type="text" value={r.newCategoryName} disabled={applying} onChange={e => updateRow(i, { newCategoryName: e.target.value })} placeholder="New category name *" style={fieldStyle} />
                      )}
                      <select value={r.subcatId} disabled={applying || r.catId === ""} onChange={e => { const v = e.target.value; updateRow(i, { subcatId: v === "new" ? "new" : v ? Number(v) : "" }); }} style={{ ...fieldStyle, color: r.catId === "" ? "#94a3b8" : "#334155", background: r.catId === "" ? "#f8fafc" : "#fff", cursor: r.catId === "" ? "not-allowed" : "pointer" }}>
                        <option value="">Select Subcategory *</option>
                        {typeof r.catId === "number" && subcategories.filter(sc => sc.category_id === r.catId).map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
                        {r.catId !== "" && <option value="new">+ Create New Subcategory</option>}
                      </select>
                      {r.subcatId === "new" && (
                        <input type="text" value={r.newSubcategoryName} disabled={applying} onChange={e => updateRow(i, { newSubcategoryName: e.target.value })} placeholder="New subcategory name *" style={fieldStyle} />
                      )}
                    </div>
                    {m.chapters.length > 0 && (
                      <div style={{ border: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>Create these chapters under the new subject</span>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button type="button" disabled={applying} onClick={() => updateRow(i, { createChecked: new Set(m.chapters.map((_, idx) => idx)) })} style={{ fontSize: 10, fontWeight: 700, border: "none", background: "#dcfce7", color: "#15803d", padding: "3px 8px", cursor: "pointer" }}>All</button>
                            <button type="button" disabled={applying} onClick={() => updateRow(i, { createChecked: new Set() })} style={{ fontSize: 10, fontWeight: 700, border: "none", background: "#f1f5f9", color: "#64748b", padding: "3px 8px", cursor: "pointer" }}>None</button>
                          </div>
                        </div>
                        <div className="custom-scroll" style={{ maxHeight: 140, overflowY: "auto" }}>
                          {m.chapters.map((c, idx) => (
                            <label key={idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", fontSize: 12, fontWeight: 600, color: "#334155", cursor: applying ? "not-allowed" : "pointer", borderBottom: idx < m.chapters.length - 1 ? "1px solid #f1f5f9" : "none", minHeight: 32 }}>
                              <input type="checkbox" disabled={applying} checked={r.createChecked.has(idx)} onChange={e => { const next = new Set(r.createChecked); if (e.target.checked) next.add(idx); else next.delete(idx); updateRow(i, { createChecked: next }); }} style={{ accentColor: "#059669", width: 14, height: 14, margin: 0, flexShrink: 0 }} />
                              {chapterLabel(c, idx)}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Map panel */}
                {r.choice === "map" && (
                  <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                    <select value={r.mapSubjectId} disabled={applying} onChange={e => selectMapSubject(i, e.target.value ? Number(e.target.value) : "")} style={fieldStyle}>
                      <option value="">Select existing subject *</option>
                      {sortedSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    {r.mapLoading && <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", padding: "4px 2px" }}>Loading chapters…</div>}
                    {r.mapChapters && m.chapters.length > 0 && (
                      <div style={{ border: "1px solid #e2e8f0" }}>
                        <div style={{ padding: "6px 10px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: 11, fontWeight: 700, color: "#475569" }}>
                          Chapter preview — matched chapters map automatically
                        </div>
                        <div className="custom-scroll" style={{ maxHeight: 140, overflowY: "auto" }}>
                          {m.chapters.map((c, idx) => {
                            const hit = isChapterMatched(c, r.mapChapters!);
                            return hit ? (
                              <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", fontSize: 12, fontWeight: 600, color: "#334155", borderBottom: idx < m.chapters.length - 1 ? "1px solid #f1f5f9" : "none", minHeight: 32 }}>
                                <span style={{ color: "#059669", display: "flex", flexShrink: 0 }}><Icon name="check" size={13} /></span>
                                {chapterLabel(c, idx)}
                                <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: "#059669", flexShrink: 0 }}>matched</span>
                              </div>
                            ) : (
                              <label key={idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: applying ? "not-allowed" : "pointer", borderBottom: idx < m.chapters.length - 1 ? "1px solid #f1f5f9" : "none", minHeight: 32 }}>
                                <input type="checkbox" disabled={applying} checked={r.mapChecked.has(idx)} onChange={e => { const next = new Set(r.mapChecked); if (e.target.checked) next.add(idx); else next.delete(idx); updateRow(i, { mapChecked: next }); }} style={{ accentColor: "#0ea5e9", width: 14, height: 14, margin: 0, flexShrink: 0 }} />
                                {chapterLabel(c, idx)}
                                <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: "#94a3b8", flexShrink: 0 }}>also create</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Skip note */}
                {r.choice === "skip" && (
                  <div style={{ padding: "0 14px 12px", fontSize: 11, fontWeight: 600, color: "#94a3b8" }}>
                    This subject and its {m.chapters.length} chapter{m.chapters.length !== 1 ? "s" : ""} won&apos;t be imported.
                  </div>
                )}

                {/* Inline row error */}
                {r.error && (
                  <div style={{ margin: "0 14px 12px", padding: "8px 10px", background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="alert-circle" size={13} /> {r.error}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", background: "#f8fafc", flexShrink: 0 }}>
          {formError ? (
            <span style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", display: "flex", alignItems: "center", gap: 5 }}>
              <Icon name="alert-circle" size={12} /> {formError}
            </span>
          ) : (
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>
              {counts.create} create · {counts.map} map · {counts.skip} skip
            </span>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={onCancel} disabled={applying} style={{ padding: "9px 18px", border: "1.5px solid #e2e8f0", background: "#fff", color: "#374151", fontSize: 12, fontWeight: 700, cursor: applying ? "not-allowed" : "pointer" }}>
              Cancel import
            </button>
            <button type="button" onClick={handleApply} disabled={applying || !allValid} style={{ padding: "9px 18px", border: "none", background: applying || !allValid ? "#94a3b8" : "#059669", color: "#fff", fontSize: 12, fontWeight: 700, cursor: applying || !allValid ? "not-allowed" : "pointer" }}>
              {applying ? "Applying…" : "Apply import"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
