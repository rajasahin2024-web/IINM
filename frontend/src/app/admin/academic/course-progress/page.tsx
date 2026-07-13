"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Icon } from "../../icons";
import { useToast } from "../../components/ToastProvider";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL } from "@/lib/config";
import { AdminProvider } from "../../components/ProtectedAdmin";
import "../../admin.css";

const FLOAT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  * { font-family: 'Inter', system-ui, sans-serif; box-sizing: border-box; }

  .cm-field-wrap { margin-bottom: 0; width: 100%; }
  .cm-field {
    position: relative; border: 1.5px solid #e2e8f0; border-radius: 10px;
    background: #f8fafc; transition: border-color 0.2s, box-shadow 0.2s;
  }
  .cm-field.focused { border-color: #38bdf8; background: #fff; box-shadow: 0 0 0 3px rgba(56,189,248,0.15); }
  .cm-label {
    position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
    font-size: 14px; color: #94a3b8; pointer-events: none;
    transition: all 0.18s cubic-bezier(0.4,0,0.2,1); background: transparent; padding: 0 3px;
  }
  .cm-label.up { top: 0; transform: translateY(-50%); font-size: 11px; font-weight: 600; color: #38bdf8; background: #fff; }
  .cm-inp {
    display: block; width: 100%; padding: 20px 14px 8px; border: none; outline: none;
    font-size: 14px; color: #0f172a; background: transparent; border-radius: 10px;
    -webkit-appearance: none; cursor: pointer;
  }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .fade-in { animation: fadeIn 0.25s ease-out; }

  .chapter-row:hover { background: #f0f9ff !important; border-color: #bae6fd !important; }

  .progress-bar-track { background: #e2e8f0; border-radius: 99px; overflow: hidden; }
  .progress-bar-fill { height: 100%; border-radius: 99px; transition: width 0.6s ease; }

  .tab-btn { padding: 10px 24px; border: none; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
  .tab-btn.active { background: #0ea5e9; color: #fff; box-shadow: 0 4px 12px rgba(14,165,233,0.25); }
  .tab-btn.inactive { background: #f1f5f9; color: #64748b; }
  .tab-btn.inactive:hover { background: #e2e8f0; }
`;

function FloatingSelect({ label, value, onChange, children, disabled = false }: any) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || (value && value.toString().length > 0);
  return (
    <div className="cm-field-wrap">
      <div className={`cm-field${focused ? " focused" : ""}`}>
        <label className={`cm-label${lifted ? " up" : ""}`}>{label}</label>
        <select className="cm-inp" value={value} disabled={disabled} onChange={onChange}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
          {children}
        </select>
        <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#94a3b8" }}>
          <Icon name="chevron-down" size={16} />
        </div>
      </div>
    </div>
  );
}

function ProgressRing({ pct, size = 64, color = "#0ea5e9" }: { pct: number; size?: number; color?: string }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
        style={{ transform: "rotate(90deg)", transformOrigin: "center", fontSize: size * 0.22, fontWeight: 700, fill: "#0f172a" }}>
        {pct}%
      </text>
    </svg>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────

function CourseProgressContent() {
  const { showToast } = useToast();
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [activeTab, setActiveTab] = useState<"syllabus" | "analytics">("syllabus");
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  // Syllabus tab data
  const [batchProgress, setBatchProgress] = useState<any>(null);
  // Analytics tab data
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  const [savingChapterId, setSavingChapterId] = useState<number | null>(null);
  const [noteInput, setNoteInput] = useState<{ [id: number]: string }>({});

  // Load batches
  useEffect(() => {
    apiFetch(`${API_BASE_URL}/batches`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setBatches(data))
      .catch(() => showToast("Failed to load batches", "error"))
      .finally(() => setLoading(false));
  }, []);

  const fetchSyllabusProgress = useCallback(async (batchId: string) => {
    setDataLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/progress/batch/${batchId}`);
      if (res.ok) setBatchProgress(await res.json());
      else throw new Error();
    } catch { showToast("Failed to load syllabus progress", "error"); }
    finally { setDataLoading(false); }
  }, []);

  const fetchAnalytics = useCallback(async (batchId: string) => {
    setDataLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/progress/batch/${batchId}/students`);
      if (res.ok) setAnalyticsData(await res.json());
      else throw new Error();
    } catch { showToast("Failed to load analytics", "error"); }
    finally { setDataLoading(false); }
  }, []);

  useEffect(() => {
    if (!selectedBatchId) { setBatchProgress(null); setAnalyticsData(null); return; }
    if (activeTab === "syllabus") fetchSyllabusProgress(selectedBatchId);
    else fetchAnalytics(selectedBatchId);
  }, [selectedBatchId, activeTab]);

  const handleToggleChapter = async (chapter: any) => {
    if (!selectedBatchId) return;
    setSavingChapterId(chapter.chapter_id);
    const newState = !chapter.is_completed;
    try {
      const res = await apiFetch(`${API_BASE_URL}/progress/batch/${selectedBatchId}/chapter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapter_id: chapter.chapter_id,
          is_completed: newState,
          notes: noteInput[chapter.chapter_id] ?? chapter.notes ?? "",
        }),
      });
      if (!res.ok) throw new Error();
      showToast(newState ? "Chapter marked as completed!" : "Chapter unmarked.", "success");
      fetchSyllabusProgress(selectedBatchId);
    } catch { showToast("Failed to update chapter", "error"); }
    finally { setSavingChapterId(null); }
  };

  const handleSaveNotes = async (chapter: any) => {
    if (!selectedBatchId) return;
    setSavingChapterId(chapter.chapter_id);
    try {
      await apiFetch(`${API_BASE_URL}/progress/batch/${selectedBatchId}/chapter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapter_id: chapter.chapter_id,
          is_completed: chapter.is_completed,
          notes: noteInput[chapter.chapter_id] ?? "",
        }),
      });
      showToast("Notes saved!", "success");
      fetchSyllabusProgress(selectedBatchId);
    } catch { showToast("Failed to save notes", "error"); }
    finally { setSavingChapterId(null); }
  };

  const selectedBatch = useMemo(() => batches.find(b => String(b.id) === selectedBatchId), [batches, selectedBatchId]);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading...</div>;

  const progressColor = (pct: number) => pct >= 75 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="manager-content" style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 120px)" }}>
      <style dangerouslySetInnerHTML={{ __html: FLOAT_CSS }} />

      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px" }}>Course Progress</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Track syllabus coverage and student learning analytics.</p>
        </div>
        {batchProgress && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Overall Batch Progress</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: progressColor(batchProgress.overall_progress_pct) }}>
              {batchProgress.overall_progress_pct}%
            </div>
          </div>
        )}
      </header>

      {/* Top Controls */}
      <div style={{ background: "#fff", padding: "20px 24px", borderRadius: 16, border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ maxWidth: 380, flex: 1 }}>
          <FloatingSelect label="Select a Batch" value={selectedBatchId} onChange={(e: any) => setSelectedBatchId(e.target.value)}>
            <option value="" disabled hidden></option>
            {batches.map(b => (
              <option key={b.id} value={String(b.id)}>{b.name}</option>
            ))}
          </FloatingSelect>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className={`tab-btn ${activeTab === "syllabus" ? "active" : "inactive"}`} onClick={() => setActiveTab("syllabus")}>
            📋 Syllabus Tracker
          </button>
          <button className={`tab-btn ${activeTab === "analytics" ? "active" : "inactive"}`} onClick={() => setActiveTab("analytics")}>
            📊 Student Analytics
          </button>
        </div>
      </div>

      {/* Empty State */}
      {!selectedBatchId && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#fff", borderRadius: 16, border: "1px dashed #cbd5e1", padding: 60 }}>
          <div style={{ color: "#cbd5e1", marginBottom: 16 }}><Icon name="layers" size={52} /></div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#475569", margin: "0 0 8px" }}>No Batch Selected</h3>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: 0, textAlign: "center", maxWidth: 280 }}>
            Select a batch from the dropdown above to view its course progress.
          </p>
        </div>
      )}

      {/* Loading */}
      {selectedBatchId && dataLoading && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ color: "#64748b", fontSize: 14 }}>Loading data...</div>
        </div>
      )}

      {/* ── SYLLABUS TAB ── */}
      {selectedBatchId && !dataLoading && activeTab === "syllabus" && batchProgress && (
        <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Stats Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
            {[
              { label: "Total Chapters", value: batchProgress.total_chapters, color: "#0ea5e9", icon: "📚" },
              { label: "Covered", value: batchProgress.completed_chapters, color: "#10b981", icon: "✅" },
              { label: "Remaining", value: batchProgress.total_chapters - batchProgress.completed_chapters, color: "#f59e0b", icon: "⏳" },
            ].map(stat => (
              <div key={stat.label} style={{ background: "#fff", borderRadius: 14, padding: "18px 22px", border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{stat.icon}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, marginTop: 2 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", border: "1px solid #f1f5f9" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Syllabus Coverage</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: progressColor(batchProgress.overall_progress_pct) }}>{batchProgress.overall_progress_pct}%</span>
            </div>
            <div className="progress-bar-track" style={{ height: 10 }}>
              <div className="progress-bar-fill" style={{ width: `${batchProgress.overall_progress_pct}%`, background: progressColor(batchProgress.overall_progress_pct) }} />
            </div>
          </div>

          {/* Chapter List */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #f1f5f9", background: "#fafbfc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Chapter Syllabus</h2>
              <span style={{ fontSize: 12, color: "#64748b" }}>{batchProgress.course_title}</span>
            </div>
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              {batchProgress.chapters.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontSize: 14 }}>
                  No chapters found for this course.
                </div>
              ) : batchProgress.chapters.map((ch: any, i: number) => (
                <div key={ch.chapter_id} className="chapter-row" style={{ border: `1px solid ${ch.is_completed ? "#a7f3d0" : "#f1f5f9"}`, borderRadius: 12, padding: "14px 16px", background: ch.is_completed ? "#f0fdf4" : "#fff", transition: "all 0.2s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggleChapter(ch)}
                      disabled={savingChapterId === ch.chapter_id}
                      style={{ width: 28, height: 28, borderRadius: 8, border: `2px solid ${ch.is_completed ? "#10b981" : "#cbd5e1"}`, background: ch.is_completed ? "#10b981" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "all 0.2s" }}
                    >
                      {ch.is_completed && <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>✓</span>}
                    </button>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", minWidth: 24 }}>#{i + 1}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: ch.is_completed ? "#065f46" : "#0f172a", textDecoration: ch.is_completed ? "line-through" : "none", opacity: ch.is_completed ? 0.75 : 1 }}>
                          {ch.chapter_title}
                        </span>
                        <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: "auto" }}>{ch.total_materials} material{ch.total_materials !== 1 ? "s" : ""}</span>
                      </div>

                      {ch.is_completed && ch.completed_date && (
                        <div style={{ fontSize: 11, color: "#10b981", marginTop: 2, marginLeft: 34 }}>
                          ✅ Covered on {new Date(ch.completed_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </div>
                      )}

                      {/* Notes */}
                      <div style={{ marginTop: 8, marginLeft: 34, display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          type="text"
                          placeholder="Add class notes (optional)..."
                          defaultValue={ch.notes || ""}
                          onChange={e => setNoteInput(prev => ({ ...prev, [ch.chapter_id]: e.target.value }))}
                          style={{ flex: 1, border: "1px solid #e2e8f0", borderRadius: 7, padding: "5px 10px", fontSize: 12, color: "#475569", outline: "none", background: "#f8fafc" }}
                        />
                        <button
                          onClick={() => handleSaveNotes(ch)}
                          disabled={savingChapterId === ch.chapter_id || noteInput[ch.chapter_id] === undefined}
                          style={{ background: "#0ea5e9", color: "#fff", border: "none", padding: "5px 12px", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", opacity: savingChapterId === ch.chapter_id ? 0.6 : 1 }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ANALYTICS TAB ── */}
      {selectedBatchId && !dataLoading && activeTab === "analytics" && analyticsData && (
        <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
            {[
              { label: "Total Students", value: analyticsData.total_students, color: "#0ea5e9", icon: "👥" },
              { label: "At-Risk Students", value: analyticsData.students.filter((s: any) => s.is_at_risk).length, color: "#ef4444", icon: "⚠️" },
              { label: "Batch Syllabus", value: `${analyticsData.batch_syllabus_pct}%`, color: "#6366f1", icon: "📋" },
              { label: "Total Materials", value: analyticsData.total_materials, color: "#f59e0b", icon: "📁" },
            ].map(stat => (
              <div key={stat.label} style={{ background: "#fff", borderRadius: 14, padding: "18px 22px", border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{stat.icon}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, marginTop: 2 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Student List */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #f1f5f9", background: "#fafbfc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Student Analytics</h2>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>Sorted by engagement level</span>
            </div>
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              {analyticsData.students.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>No students enrolled in this batch.</div>
              ) : analyticsData.students.map((student: any, i: number) => {
                const pct = student.progress_pct;
                const bar = progressColor(pct);
                return (
                  <div key={student.student_id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 16px", borderRadius: 12, border: `1px solid ${student.is_at_risk ? "#fecaca" : "#f1f5f9"}`, background: student.is_at_risk ? "#fff5f5" : "#fff", transition: "all 0.2s" }}>
                    {/* Avatar */}
                    <div style={{ width: 40, height: 40, borderRadius: 20, background: `linear-gradient(135deg, ${student.is_at_risk ? "#ef4444" : "#0ea5e9"}, ${student.is_at_risk ? "#f97316" : "#6366f1"})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                      {student.student_name[0]}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{student.student_name}</span>
                        {student.is_at_risk && (
                          <span style={{ fontSize: 10, background: "#ef4444", color: "#fff", padding: "2px 7px", borderRadius: 4, fontWeight: 700 }}>⚠ At Risk</span>
                        )}
                        {student.enrollment_status === "waitlisted" && (
                          <span style={{ fontSize: 10, background: "#ea580c", color: "#fff", padding: "2px 7px", borderRadius: 4 }}>Waitlisted</span>
                        )}
                        <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: bar }}>{pct}%</span>
                      </div>
                      <div className="progress-bar-track" style={{ height: 7 }}>
                        <div className="progress-bar-fill" style={{ width: `${pct}%`, background: bar }} />
                      </div>
                      <div style={{ marginTop: 4, fontSize: 11, color: "#94a3b8" }}>
                        {student.completed_materials}/{student.total_materials} materials completed · {student.email}
                      </div>
                    </div>

                    <ProgressRing pct={pct} size={52} color={bar} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CourseProgressPage() {
  return (
    <AdminProvider>
      <CourseProgressContent />
    </AdminProvider>
  );
}
