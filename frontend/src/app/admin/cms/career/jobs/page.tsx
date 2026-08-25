"use client";
import React, { useState, useEffect, useCallback } from "react";
import { AdminProvider } from "../../../components/ProtectedAdmin";
import { useToast } from "../../../components/ToastProvider";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL } from "@/lib/config";
import { Icon } from "../../../icons";

const API = BASE_URL;

interface JobPost {
  id: number;
  position_id: number | null;
  position_title: string | null;
  title: string;
  slug: string;
  summary: string | null;
  description: string | null;
  requirements: string | null;
  responsibilities: string | null;
  location: string | null;
  job_type: string;
  experience_min: number | null;
  experience_max: number | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  vacancies: number;
  application_deadline: string | null;
  status: string;
  is_featured: boolean;
  created_at: string;
  published_at: string | null;
}

interface Position { id: number; title: string; }

const JOB_TYPES = [
  { v: "full_time", l: "Full-time" },
  { v: "part_time", l: "Part-time" },
  { v: "contract", l: "Contract" },
  { v: "internship", l: "Internship" },
  { v: "remote", l: "Remote" },
];

const STATUS_TABS = ["all", "open", "closed", "draft"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

const EMPTY_FORM: any = {
  position_id: "", title: "", slug: "", summary: "", description: "", requirements: "",
  responsibilities: "", location: "", job_type: "full_time", experience_min: "", experience_max: "",
  salary_min: "", salary_max: "", salary_currency: "INR", vacancies: 1, application_deadline: "",
  status: "open", is_featured: false,
};

function JobsInner() {
  const { showToast } = useToast();
  const [items, setItems] = useState<JobPost[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<StatusTab>("all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<JobPost | null>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState<JobPost | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [jRes, pRes] = await Promise.all([
        apiFetch(`${API}/api/career/jobs/all?limit=200`),
        apiFetch(`${API}/api/career/positions/all`),
      ]);
      if (jRes.ok) { const d = await jRes.json(); setItems(d.items || []); }
      if (pRes.ok) setPositions(await pRes.json());
    } catch { showToast("Failed to load job posts.", "error"); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (j: JobPost) => {
    setEditing(j);
    setForm({
      position_id: j.position_id || "", title: j.title, slug: j.slug, summary: j.summary || "",
      description: j.description || "", requirements: j.requirements || "", responsibilities: j.responsibilities || "",
      location: j.location || "", job_type: j.job_type, experience_min: j.experience_min ?? "", experience_max: j.experience_max ?? "",
      salary_min: j.salary_min ?? "", salary_max: j.salary_max ?? "", salary_currency: j.salary_currency,
      vacancies: j.vacancies, application_deadline: j.application_deadline ? j.application_deadline.split("T")[0] : "",
      status: j.status, is_featured: j.is_featured,
    });
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { showToast("Title is required.", "error"); return; }
    setSaving(true);
    try {
      const body = {
        ...form,
        position_id: form.position_id ? Number(form.position_id) : null,
        experience_min: form.experience_min === "" ? null : Number(form.experience_min),
        experience_max: form.experience_max === "" ? null : Number(form.experience_max),
        salary_min: form.salary_min === "" ? null : Number(form.salary_min),
        salary_max: form.salary_max === "" ? null : Number(form.salary_max),
        vacancies: Number(form.vacancies) || 1,
        application_deadline: form.application_deadline || null,
        slug: form.slug.trim() || undefined,
      };
      const res = await apiFetch(`${API}/api/career/jobs${editing ? `/${editing.id}` : ""}`, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        showToast(editing ? "Job post updated." : "Job post created.", "success");
        setModalOpen(false);
        load();
      } else {
        const d = await res.json().catch(() => ({}));
        showToast(d.detail || "Failed to save.", "error");
      }
    } catch { showToast("Error saving.", "error"); }
    finally { setSaving(false); }
  };

  const setStatus = async (j: JobPost, status: string) => {
    try {
      await apiFetch(`${API}/api/career/jobs/${j.id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
      });
      load();
    } catch { showToast("Status change failed.", "error"); }
  };

  const toggleFeature = async (j: JobPost) => {
    try {
      await apiFetch(`${API}/api/career/jobs/${j.id}/feature`, { method: "PATCH" });
      load();
    } catch { showToast("Failed.", "error"); }
  };

  const del = async () => {
    if (!confirmDel) return;
    try {
      await apiFetch(`${API}/api/career/jobs/${confirmDel.id}`, { method: "DELETE" });
      showToast("Job post deleted.", "success");
      setConfirmDel(null);
      load();
    } catch { showToast("Delete failed.", "error"); }
  };

  const filtered = items.filter(j => {
    if (tab !== "all" && j.status !== tab) return false;
    if (search && !j.title.toLowerCase().includes(search.toLowerCase()) && !(j.position_title || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: items.length, open: items.filter(j => j.status === "open").length,
    closed: items.filter(j => j.status === "closed").length, draft: items.filter(j => j.status === "draft").length,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 14, border: "1.5px solid #e2e8f0",
    outline: "none", boxSizing: "border-box", fontFamily: "inherit", color: "#0f172a", background: "#fff",
  };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 };
  const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 };

  const statusBadge = (status: string) => {
    const m: Record<string, { bg: string; c: string }> = {
      open: { bg: "#d1fae5", c: "#065f46" }, closed: { bg: "#fee2e2", c: "#991b1b" }, draft: { bg: "#fef3c7", c: "#92400e" },
    };
    const s = m[status] || { bg: "#f1f5f9", c: "#64748b" };
    return <span style={{ background: s.bg, color: s.c, padding: "2px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600 }}>{status}</span>;
  };

  return (
    <div style={{ padding: "40px 48px", width: "100%", fontFamily: "'Inter', sans-serif", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: "0 0 6px" }}>Job Posts</h1>
          <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>Published openings shown on the public career page.</p>
        </div>
        <button onClick={openNew} style={{ background: "#0f172a", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="plus" size={16} color="#fff" /> New Job Post
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {STATUS_TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            border: "none", cursor: "pointer", padding: "7px 16px", borderRadius: 7, fontSize: 13, fontWeight: 600,
            background: tab === t ? "#0f172a" : "transparent", color: tab === t ? "#fff" : "#64748b",
          }}>{t.charAt(0).toUpperCase() + t.slice(1)} <span style={{ opacity: 0.6, marginLeft: 4 }}>{counts[t]}</span></button>
        ))}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search job posts…" style={{ ...inputStyle, marginBottom: 20, maxWidth: 320 }} />

      {loading ? (
        <div style={{ color: "#94a3b8", fontSize: 14 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", color: "#94a3b8", fontSize: 14, background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0" }}>
          No job posts found. Click “New Job Post” to create one.
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Title</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Position</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Location</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Type</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Status</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(j => (
                <tr key={j.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "14px 16px", fontWeight: 600, color: "#0f172a" }}>
                    {j.title}
                    {j.is_featured && <span style={{ marginLeft: 8, color: "#d97706", fontSize: 11 }}>★</span>}
                  </td>
                  <td style={{ padding: "14px 16px", color: "#64748b" }}>{j.position_title || "—"}</td>
                  <td style={{ padding: "14px 16px", color: "#64748b" }}>{j.location || "—"}</td>
                  <td style={{ padding: "14px 16px", color: "#64748b" }}>{JOB_TYPES.find(t => t.v === j.job_type)?.l || j.job_type}</td>
                  <td style={{ padding: "14px 16px" }}>{statusBadge(j.status)}</td>
                  <td style={{ padding: "14px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <button onClick={() => toggleFeature(j)} title="Toggle featured" style={{ border: "none", background: "transparent", cursor: "pointer", color: j.is_featured ? "#d97706" : "#cbd5e1", marginRight: 6 }}>★</button>
                    <button onClick={() => openEdit(j)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#0f172a", marginRight: 6 }} title="Edit"><Icon name="edit" size={16} /></button>
                    {j.status !== "open" && <button onClick={() => setStatus(j, "open")} style={{ border: "1px solid #d1fae5", background: "#d1fae5", color: "#065f46", borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 600, cursor: "pointer", marginRight: 6 }}>Open</button>}
                    {j.status !== "closed" && <button onClick={() => setStatus(j, "closed")} style={{ border: "1px solid #fee2e2", background: "#fee2e2", color: "#991b1b", borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 600, cursor: "pointer", marginRight: 6 }}>Close</button>}
                    <button onClick={() => setConfirmDel(j)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#dc2626" }} title="Delete"><Icon name="trash" size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div onClick={() => setModalOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 680, maxHeight: "92vh", overflow: "auto" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 20px" }}>{editing ? "Edit Job Post" : "New Job Post"}</h2>
            <form onSubmit={save}>
              <div style={grid2}>
                <div>
                  <label style={labelStyle}>Position</label>
                  <select value={form.position_id} onChange={e => setForm({ ...form, position_id: e.target.value })} style={inputStyle}>
                    <option value="">— None —</option>
                    {positions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={inputStyle}>
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>
              <div style={{ height: 14 }} />
              <label style={labelStyle}>Title *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={inputStyle} placeholder="e.g. Senior Faculty — AI/ML" autoFocus />
              <div style={{ height: 14 }} />
              <label style={labelStyle}>Slug (optional — auto-generated)</label>
              <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} style={inputStyle} placeholder="auto-generated" />
              <div style={{ height: 14 }} />
              <label style={labelStyle}>Summary</label>
              <input value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} style={inputStyle} placeholder="One-line summary" />
              <div style={{ height: 14 }} />
              <label style={labelStyle}>Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} />
              <div style={{ height: 14 }} />
              <div style={grid2}>
                <div>
                  <label style={labelStyle}>Requirements</label>
                  <textarea value={form.requirements} onChange={e => setForm({ ...form, requirements: e.target.value })} style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} />
                </div>
                <div>
                  <label style={labelStyle}>Responsibilities</label>
                  <textarea value={form.responsibilities} onChange={e => setForm({ ...form, responsibilities: e.target.value })} style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} />
                </div>
              </div>
              <div style={{ height: 14 }} />
              <div style={grid2}>
                <div>
                  <label style={labelStyle}>Location</label>
                  <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} style={inputStyle} placeholder="e.g. Kolkata" />
                </div>
                <div>
                  <label style={labelStyle}>Job Type</label>
                  <select value={form.job_type} onChange={e => setForm({ ...form, job_type: e.target.value })} style={inputStyle}>
                    {JOB_TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ height: 14 }} />
              <div style={grid2}>
                <div>
                  <label style={labelStyle}>Experience Min (years)</label>
                  <input type="number" min={0} value={form.experience_min} onChange={e => setForm({ ...form, experience_min: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Experience Max (years)</label>
                  <input type="number" min={0} value={form.experience_max} onChange={e => setForm({ ...form, experience_max: e.target.value })} style={inputStyle} />
                </div>
              </div>
              <div style={{ height: 14 }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Salary Min</label>
                  <input type="number" min={0} value={form.salary_min} onChange={e => setForm({ ...form, salary_min: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Salary Max</label>
                  <input type="number" min={0} value={form.salary_max} onChange={e => setForm({ ...form, salary_max: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Currency</label>
                  <input value={form.salary_currency} onChange={e => setForm({ ...form, salary_currency: e.target.value })} style={inputStyle} />
                </div>
              </div>
              <div style={{ height: 14 }} />
              <div style={grid2}>
                <div>
                  <label style={labelStyle}>Vacancies</label>
                  <input type="number" min={1} value={form.vacancies} onChange={e => setForm({ ...form, vacancies: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Application Deadline</label>
                  <input type="date" value={form.application_deadline} onChange={e => setForm({ ...form, application_deadline: e.target.value })} style={inputStyle} />
                </div>
              </div>
              <div style={{ height: 14 }} />
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#0f172a", cursor: "pointer" }}>
                <input type="checkbox" checked={form.is_featured} onChange={e => setForm({ ...form, is_featured: e.target.checked })} />
                Featured (shown first on career page)
              </label>
              <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setModalOpen(false)} style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#64748b" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ background: "#0f172a", color: "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 13, fontWeight: 600, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.6 : 1 }}>{saving ? "Saving…" : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDel && (
        <div onClick={() => setConfirmDel(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 400 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>Delete job post?</h3>
            <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 20px" }}>“{confirmDel.title}” will be permanently removed. Past applications will keep their data but lose the job reference.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmDel(null)} style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#64748b" }}>Cancel</button>
              <button onClick={del} style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CareerJobsPage() {
  return (
    <AdminProvider>
      <JobsInner />
    </AdminProvider>
  );
}
