"use client";
import React, { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL } from "@/lib/config";
import { useToast } from "./ToastProvider";

interface Testimonial {
  id: number;
  student_name: string;
  course_name: string;
  designation: string | null;
  feedback_text: string | null;
  youtube_video_url: string;
  is_active: boolean;
  created_at: string | null;
}

const EMPTY: Partial<Testimonial> = {
  student_name: "",
  course_name: "",
  designation: "",
  feedback_text: "",
  youtube_video_url: "",
  is_active: true,
};

// ── Floating Label Input ──────────────────────────────
function FloatInput({ label, name, value, onChange, required, textarea }: {
  label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  required?: boolean; textarea?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const active = focused || !!value;
  const style: React.CSSProperties = {
    position: "relative", marginBottom: 20,
  };
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "22px 14px 8px", fontSize: 14, borderRadius: 8,
    border: `1.5px solid ${focused ? "#0ea5e9" : "#e2e8f0"}`,
    outline: "none", background: "#fff", boxSizing: "border-box",
    resize: textarea ? "vertical" : undefined,
    minHeight: textarea ? 90 : undefined, fontFamily: "inherit",
    transition: "border-color 0.2s",
  };
  const labelStyle: React.CSSProperties = {
    position: "absolute", left: 14, top: active ? 6 : 15,
    fontSize: active ? 10 : 14, fontWeight: active ? 700 : 400,
    color: focused ? "#0ea5e9" : "#94a3b8",
    transition: "all 0.2s", pointerEvents: "none", letterSpacing: active ? "0.4px" : 0,
    textTransform: active ? "uppercase" : "none",
  };
  return (
    <div style={style}>
      {textarea
        ? <textarea name={name} value={value} style={inputStyle} required={required}
            onChange={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} rows={3} />
        : <input name={name} value={value} style={inputStyle} required={required}
            onChange={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
      }
      <label style={labelStyle}>{label}{required ? " *" : ""}</label>
    </div>
  );
}

// ── Modal ────────────────────────────────────────────
function TestimonialModal({ initial, onSave, onClose }: {
  initial: Partial<Testimonial>;
  onSave: (data: Partial<Testimonial>) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Testimonial>>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const change = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true); setError("");
    try { await onSave(form); onClose(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to save"); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "32px 32px 24px", width: "100%", maxWidth: 540, boxShadow: "0 24px 64px rgba(0,0,0,0.18)", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
            {initial.id ? "Edit Testimonial" : "Add Student Testimonial"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>✕</button>
        </div>
        <form onSubmit={submit}>
          <FloatInput label="Student Name" name="student_name" value={form.student_name || ""} onChange={change} required />
          <FloatInput label="Course Name" name="course_name" value={form.course_name || ""} onChange={change} required />
          <FloatInput label="Designation / Role (optional)" name="designation" value={form.designation || ""} onChange={change} />
          <FloatInput label="Feedback Text (optional)" name="feedback_text" value={form.feedback_text || ""} onChange={change} textarea />
          <FloatInput label="YouTube Video URL" name="youtube_video_url" value={form.youtube_video_url || ""} onChange={change} required />

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, padding: "12px 14px", background: "#f8fafc", borderRadius: 8, border: "1.5px solid #e2e8f0" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none", fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
              <div
                onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                style={{
                  width: 40, height: 22, borderRadius: 11,
                  background: form.is_active ? "#10b981" : "#e2e8f0",
                  position: "relative", cursor: "pointer", transition: "background 0.2s",
                  flexShrink: 0,
                }}
              >
                <div style={{
                  position: "absolute", top: 3, left: form.is_active ? 21 : 3,
                  width: 16, height: 16, borderRadius: "50%", background: "#fff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.2s",
                }} />
              </div>
              Active (show on homepage)
            </label>
          </div>

          {error && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 14 }}>{error}</div>}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={{ padding: "10px 22px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#64748b" }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ padding: "10px 22px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving…" : "Save Testimonial"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────
export default function StudentFeedbackManager() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Partial<Testimonial> | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const { showToast } = useToast();

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/testimonials?page=${p}&page_size=10`);
      const data = await res.json();
      setItems(data.items);
      setTotalPages(data.pages);
      setTotal(data.total);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(page); }, [page]);

  const save = async (form: Partial<Testimonial>) => {
    const isEdit = !!form.id;
    const res = await apiFetch(
      `${API_BASE_URL}/testimonials${isEdit ? `/${form.id}` : ""}`,
      { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }
    );
    if (!res.ok) throw new Error((await res.json()).detail || "Error");
    showToast(isEdit ? "Testimonial updated!" : "Testimonial added!");
    load(page);
  };

  const deleteItem = async (id: number) => {
    if (!confirm("Delete this testimonial?")) return;
    setDeleting(id);
    await apiFetch(`${API_BASE_URL}/testimonials/${id}`, { method: "DELETE" });
    showToast("Deleted.");
    load(page);
    setDeleting(null);
  };

  const extractYTId = (url: string) => {
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^?&\s]{11})/);
    return m ? m[1] : null;
  };

  return (
    <div style={{ padding: "0 0 40px" }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .tf-row:hover { background: #f8fafc !important; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }}>Student Feedback</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>{total} testimonial{total !== 1 ? "s" : ""} total</p>
        </div>
        <button
          onClick={() => setModal(EMPTY)}
          style={{ display: "flex", alignItems: "center", gap: 8, background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 10, padding: "11px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(14,165,233,0.3)", transition: "0.2s" }}
          onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-1px)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "none")}
        >
          + Add Testimonial
        </button>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        {/* Table Header */}
        <div style={{ display: "grid", gridTemplateColumns: "56px 1fr 1fr 1fr 140px 90px 100px", gap: 0, background: "#f8fafc", borderBottom: "1px solid #e2e8f0", padding: "11px 16px" }}>
          {["#", "Student", "Course", "Designation", "YouTube URL", "Status", "Actions"].map(h => (
            <div key={h} style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ padding: "56px 0", textAlign: "center", color: "#94a3b8" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🎬</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>No testimonials yet</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Click "+ Add Testimonial" to get started</div>
          </div>
        ) : items.map((item, idx) => {
          const ytId = extractYTId(item.youtube_video_url);
          return (
            <div key={item.id} className="tf-row" style={{ display: "grid", gridTemplateColumns: "56px 1fr 1fr 1fr 140px 90px 100px", gap: 0, padding: "13px 16px", borderBottom: idx < items.length - 1 ? "1px solid #f1f5f9" : "none", alignItems: "center", transition: "background 0.15s" }}>
              {/* # */}
              <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>{(page - 1) * 10 + idx + 1}</div>

              {/* Student */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#e0f2fe", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                  {item.student_name.charAt(0).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.student_name}</div>
                </div>
              </div>

              {/* Course */}
              <div style={{ fontSize: 13, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.course_name}</div>

              {/* Designation */}
              <div style={{ fontSize: 12, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.designation || "—"}</div>

              {/* Thumbnail */}
              <div>
                {ytId ? (
                  <a href={item.youtube_video_url} target="_blank" rel="noreferrer">
                    <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt="thumb" style={{ width: 120, height: 68, objectFit: "cover", borderRadius: 6, border: "1px solid #e2e8f0", display: "block" }} />
                  </a>
                ) : (
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>Invalid URL</div>
                )}
              </div>

              {/* Status */}
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 100, background: item.is_active ? "#f0fdf4" : "#f8fafc", color: item.is_active ? "#16a34a" : "#94a3b8", border: `1px solid ${item.is_active ? "#bbf7d0" : "#e2e8f0"}` }}>
                  {item.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setModal(item)} style={{ background: "#f0f9ff", border: "1px solid #bae6fd", color: "#0284c7", borderRadius: 7, padding: "5px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Edit</button>
                <button onClick={() => deleteItem(item.id)} disabled={deleting === item.id} style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#e11d48", borderRadius: 7, padding: "5px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: deleting === item.id ? 0.5 : 1 }}>Del</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 24 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: "7px 14px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: page === 1 ? "#f8fafc" : "#fff", color: page === 1 ? "#94a3b8" : "#0f172a", fontWeight: 600, fontSize: 13, cursor: page === 1 ? "default" : "pointer" }}>← Prev</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} style={{ padding: "7px 13px", borderRadius: 8, border: `1.5px solid ${p === page ? "#0ea5e9" : "#e2e8f0"}`, background: p === page ? "#0ea5e9" : "#fff", color: p === page ? "#fff" : "#374151", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{p}</button>
          ))}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: "7px 14px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: page === totalPages ? "#f8fafc" : "#fff", color: page === totalPages ? "#94a3b8" : "#0f172a", fontWeight: 600, fontSize: 13, cursor: page === totalPages ? "default" : "pointer" }}>Next →</button>
        </div>
      )}

      {/* Modal */}
      {modal !== null && (
        <TestimonialModal initial={modal} onSave={save} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
