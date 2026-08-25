"use client";
import React, { useState, useEffect, useCallback } from "react";
import { AdminProvider } from "../../../components/ProtectedAdmin";
import { useToast } from "../../../components/ToastProvider";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL } from "@/lib/config";
import { Icon } from "../../../icons";

const API = BASE_URL;

interface Position {
  id: number;
  title: string;
  slug: string;
  department: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

const EMPTY_FORM = { title: "", slug: "", department: "", description: "", is_active: true };

function PositionsInner() {
  const { showToast } = useToast();
  const [items, setItems] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Position | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API}/api/career/positions/all`);
      if (res.ok) setItems(await res.json());
    } catch { showToast("Failed to load positions.", "error"); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (p: Position) => {
    setEditing(p);
    setForm({ title: p.title, slug: p.slug, department: p.department || "", description: p.description || "", is_active: p.is_active });
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { showToast("Title is required.", "error"); return; }
    setSaving(true);
    try {
      const body = { ...form, slug: form.slug.trim() || undefined };
      const res = await apiFetch(`${API}/api/career/positions${editing ? `/${editing.id}` : ""}`, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        showToast(editing ? "Position updated." : "Position created.", "success");
        setModalOpen(false);
        load();
      } else {
        const d = await res.json().catch(() => ({}));
        showToast(d.detail || "Failed to save.", "error");
      }
    } catch { showToast("Error saving.", "error"); }
    finally { setSaving(false); }
  };

  const toggle = async (p: Position) => {
    try {
      await apiFetch(`${API}/api/career/positions/${p.id}/toggle`, { method: "PATCH" });
      load();
    } catch { showToast("Toggle failed.", "error"); }
  };

  const del = async () => {
    if (!confirmDel) return;
    try {
      await apiFetch(`${API}/api/career/positions/${confirmDel.id}`, { method: "DELETE" });
      showToast("Position deleted.", "success");
      setConfirmDel(null);
      load();
    } catch { showToast("Delete failed.", "error"); }
  };

  const filtered = items.filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) || (p.department || "").toLowerCase().includes(search.toLowerCase())
  );

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 14, border: "1.5px solid #e2e8f0",
    outline: "none", boxSizing: "border-box", fontFamily: "inherit", color: "#0f172a", background: "#fff",
  };

  return (
    <div style={{ padding: "40px 48px", width: "100%", fontFamily: "'Inter', sans-serif", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: "0 0 6px" }}>Career Positions</h1>
          <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>Reusable role templates that job posts are filed under.</p>
        </div>
        <button onClick={openNew} style={{ background: "#0f172a", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="plus" size={16} color="#fff" /> New Position
        </button>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search positions…" style={{ ...inputStyle, marginBottom: 20, maxWidth: 320 }} />

      {loading ? (
        <div style={{ color: "#94a3b8", fontSize: 14 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", color: "#94a3b8", fontSize: 14, background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0" }}>
          No positions yet. Click “New Position” to create one.
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Title</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Department</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Slug</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Status</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "14px 16px", fontWeight: 600, color: "#0f172a" }}>{p.title}</td>
                  <td style={{ padding: "14px 16px", color: "#64748b" }}>{p.department || "—"}</td>
                  <td style={{ padding: "14px 16px", color: "#94a3b8", fontSize: 12, fontFamily: "monospace" }}>{p.slug}</td>
                  <td style={{ padding: "14px 16px" }}>
                    <button onClick={() => toggle(p)} style={{
                      border: "1px solid", borderRadius: 100, padding: "3px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                      background: p.is_active ? "#d1fae5" : "#f1f5f9", color: p.is_active ? "#065f46" : "#64748b", borderColor: "transparent",
                    }}>{p.is_active ? "Active" : "Inactive"}</button>
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "right" }}>
                    <button onClick={() => openEdit(p)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#0f172a", marginRight: 8 }} title="Edit"><Icon name="edit" size={16} /></button>
                    <button onClick={() => setConfirmDel(p)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#dc2626" }} title="Delete"><Icon name="trash" size={16} /></button>
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
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 20px" }}>{editing ? "Edit Position" : "New Position"}</h2>
            <form onSubmit={save}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>Title *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={inputStyle} placeholder="e.g. Faculty" autoFocus />
              <div style={{ height: 14 }} />
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>Department</label>
              <input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} style={inputStyle} placeholder="e.g. Academic" />
              <div style={{ height: 14 }} />
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>Slug (optional — auto-generated from title)</label>
              <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} style={inputStyle} placeholder="auto-generated" />
              <div style={{ height: 14 }} />
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} />
              <div style={{ height: 14 }} />
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#0f172a", cursor: "pointer" }}>
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
                Active
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
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>Delete position?</h3>
            <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 20px" }}>“{confirmDel.title}” will be removed. Job posts linked to it will keep their data but lose the position reference.</p>
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

export default function CareerPositionsPage() {
  return (
    <AdminProvider>
      <PositionsInner />
    </AdminProvider>
  );
}
