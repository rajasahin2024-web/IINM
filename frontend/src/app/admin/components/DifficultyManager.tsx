"use client";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL } from "@/lib/config";
import React, { useState, useEffect, useCallback } from "react";
import { Icon } from "../icons";

interface DifficultyLevel {
  id: number;
  label: string;
  code: string;
  color: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
}

const FLOAT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  .cm-field-wrap { margin-bottom: 0; width: 100%; }
  .cm-field { position: relative; border: 1.5px solid #e2e8f0; border-radius: 10px; background: #f8fafc; transition: border-color 0.2s, box-shadow 0.2s, background 0.2s; }
  .cm-field.focused { border-color: #38bdf8; background: #fff; box-shadow: 0 0 0 3px rgba(56,189,248,0.15); }
  .cm-label { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); font-size: 14px; color: #94a3b8; pointer-events: none; transition: all 0.18s cubic-bezier(0.4,0,0.2,1); background: transparent; padding: 0 3px; white-space: nowrap; line-height: 1; font-family: 'Inter', system-ui, sans-serif; }
  .cm-label.up { top: 0; transform: translateY(-50%); font-size: 11px; font-weight: 600; color: #38bdf8; background: #fff; }
  .cm-inp { display: block; width: 100%; padding: 20px 14px 8px; border: none; outline: none; font-size: 14px; color: #0f172a; background: transparent; border-radius: 10px; font-family: 'Inter', system-ui, sans-serif; }
  .cm-req { color: #ef4444; margin-left: 2px; }
`;

function FloatingInput({ label, value, onChange, required = false }: { label: string; value: string; onChange: (e: any) => void; required?: boolean }) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;
  return (
    <div className="cm-field-wrap">
      <div className={`cm-field${focused ? " focused" : ""}`}>
        <label className={`cm-label${lifted ? " up" : ""}`}>{label}{required && <span className="cm-req">*</span>}</label>
        <input type="text" className="cm-inp" value={value} required={required} onChange={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
      </div>
    </div>
  );
}

function DeleteModal({ label, onConfirm, onCancel, deleting }: { label: string; onConfirm: () => void; onCancel: () => void; deleting: boolean }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "32px 28px", maxWidth: 400, width: "calc(100% - 32px)", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", color: "#dc2626" }}>
          <Icon name="trash" size={24} />
        </div>
        <h3 style={{ margin: "0 0 8px", fontSize: "1.1rem", fontWeight: 700, color: "#111827" }}>Delete Difficulty Level?</h3>
        <div style={{ display: "inline-block", padding: "4px 12px", borderRadius: 5, background: "#eff6ff", color: "#38bdf8", fontSize: ".82rem", fontWeight: 700, margin: "0 0 16px" }}>{label}</div>
        <p style={{ margin: "0 0 24px", color: "#6b7280", fontSize: ".875rem", lineHeight: 1.6 }}>This action is <strong>permanent</strong> and cannot be undone.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} disabled={deleting} style={{ flex: 1, padding: "10px 24px", borderRadius: 8, border: "1.5px solid #e5e7eb", background: "#fff", color: "#374151", fontSize: ".875rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={onConfirm} disabled={deleting} style={{ flex: 1, padding: "10px 24px", borderRadius: 8, border: "none", background: "#dc2626", color: "#fff", fontSize: ".875rem", fontWeight: 700, cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.6 : 1, fontFamily: "inherit" }}>
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Predefined color swatches
const COLOR_SWATCHES = [
  "#86efac", "#22c55e", "#4ade80",
  "#34d399", "#06b6d4", "#38bdf8",
  "#818cf8", "#a78bfa", "#f472b6",
  "#fb923c", "#f59e0b", "#fbbf24",
  "#ef4444", "#dc2626", "#7f1d1d",
];

export default function DifficultyManager() {
  const [levels, setLevels] = useState<DifficultyLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DifficultyLevel | null>(null);
  const [form, setForm] = useState({ label: "", code: "", color: "#22c55e", order_index: 0, is_active: true });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DifficultyLevel | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/difficulty-levels`);
      const data = await res.json();
      setLevels(Array.isArray(data) ? data : []);
    } catch { setLevels([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openAdd = () => {
    setEditing(null);
    setForm({ label: "", code: "", color: "#22c55e", order_index: levels.length + 1, is_active: true });
    setModalOpen(true);
  };

  const openEdit = (l: DifficultyLevel) => {
    setEditing(l);
    setForm({ label: l.label, code: l.code, color: l.color, order_index: l.order_index, is_active: l.is_active });
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim() || !form.code.trim()) return;
    setSaving(true);
    try {
      const url = editing ? `${API_BASE_URL}/difficulty-levels/${editing.id}` : `${API_BASE_URL}/difficulty-levels`;
      const method = editing ? "PUT" : "POST";
      const res = await apiFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Failed"); }
      setModalOpen(false);
      fetchAll();
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`${API_BASE_URL}/difficulty-levels/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      fetchAll();
    } finally { setDeleting(false); }
  };

  const toggleStatus = async (l: DifficultyLevel) => {
    const newStatus = !l.is_active;
    setLevels(prev => prev.map(x => x.id === l.id ? { ...x, is_active: newStatus } : x));
    const res = await apiFetch(`${API_BASE_URL}/difficulty-levels/${l.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: newStatus }) });
    if (!res.ok) setLevels(prev => prev.map(x => x.id === l.id ? { ...x, is_active: !newStatus } : x));
  };

  // Auto-generate code from label
  const handleLabelChange = (e: any) => {
    const val = e.target.value;
    setForm(f => ({ ...f, label: val, code: val.toLowerCase().replace(/\s+/g, "_") }));
  };

  return (
    <div className="manager-content">
      <style dangerouslySetInnerHTML={{ __html: FLOAT_CSS }} />

      {deleteTarget && <DeleteModal label={deleteTarget.label} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} deleting={deleting} />}

      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }}>Difficulty Levels</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Configure tiers to balance assessment difficulty across learner levels.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={async () => { await apiFetch(`${API_BASE_URL}/difficulty-levels/seed`); fetchAll(); }}
            style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Seed Defaults
          </button>
          <button
            onClick={openAdd}
            style={{ background: "#0f172a", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "opacity 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            <Icon name="plus" size={16} /> Add Level
          </button>
        </div>
      </header>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
            <tr>
              <th style={{ padding: "14px 20px", textAlign: "left", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.5px", width: 60 }}>Order</th>
              <th style={{ padding: "14px 20px", textAlign: "left", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.5px", width: 80 }}>Color</th>
              <th style={{ padding: "14px 20px", textAlign: "left", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.5px" }}>Label</th>
              <th style={{ padding: "14px 20px", textAlign: "left", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.5px" }}>Code</th>
              <th style={{ padding: "14px 20px", textAlign: "left", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.5px", width: 90 }}>Status</th>
              <th style={{ padding: "14px 20px", textAlign: "right", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.5px", width: 100 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading…</td></tr>
            ) : levels.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 40, textAlign: "center" }}>
                  <p style={{ color: "#94a3b8", marginBottom: 12 }}>No difficulty levels yet.</p>
                  <button onClick={async () => { await apiFetch(`${API_BASE_URL}/difficulty-levels/seed`); fetchAll(); }}
                    style={{ background: "#38bdf8", color: "#fff", border: "none", padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    Seed Default Levels
                  </button>
                </td>
              </tr>
            ) : levels.map(l => (
              <tr key={l.id}
                style={{ borderBottom: "1px solid #f8fafc", transition: "background 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#fcfdfe")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <td style={{ padding: "14px 20px" }}>
                  <span style={{ display: "inline-flex", width: 28, height: 28, alignItems: "center", justifyContent: "center", background: "#f1f5f9", borderRadius: 6, fontWeight: 700, fontSize: 12, color: "#64748b" }}>{l.order_index}</span>
                </td>
                <td style={{ padding: "14px 20px" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: l.color, border: "2px solid rgba(0,0,0,0.08)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }} />
                </td>
                <td style={{ padding: "14px 20px" }}>
                  <span style={{ background: l.color + "22", border: `1px solid ${l.color}66`, color: l.color, fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 20 }}>{l.label}</span>
                </td>
                <td style={{ padding: "14px 20px" }}>
                  <code style={{ background: "#f1f5f9", padding: "3px 8px", borderRadius: 5, fontSize: 12, color: "#475569" }}>{l.code}</code>
                </td>
                <td style={{ padding: "14px 20px" }}>
                  <div onClick={() => toggleStatus(l)} style={{ width: 44, height: 24, borderRadius: 12, background: l.is_active ? "#22c55e" : "#e2e8f0", position: "relative", cursor: "pointer", transition: "background 0.2s" }}>
                    <div style={{ position: "absolute", top: 2, left: l.is_active ? 22 : 2, width: 20, height: 20, borderRadius: 10, background: "#fff", transition: "left 0.2s cubic-bezier(0.4,0,0.2,1)", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }} />
                  </div>
                </td>
                <td style={{ padding: "14px 20px", textAlign: "right" }}>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button onClick={() => openEdit(l)} title="Edit" style={{ border: "none", background: "#f1f5f9", color: "#475569", width: 30, height: 30, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name="edit" size={14} />
                    </button>
                    <button onClick={() => setDeleteTarget(l)} title="Delete" style={{ border: "none", background: "#fef2f2", color: "#ef4444", width: 30, height: 30, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.6)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 16, width: "80%", maxWidth: 600, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{editing ? "Edit Difficulty Level" : "Add Difficulty Level"}</h2>
              <button onClick={() => !saving && setModalOpen(false)} style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8" }}><Icon name="x" size={20} /></button>
            </div>
            <form id="diff-form" onSubmit={save} style={{ padding: 24, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Color preview */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: form.color, border: "2px solid rgba(0,0,0,0.08)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{form.label || "Level Name"}</div>
                  <code style={{ fontSize: 12, color: "#64748b" }}>{form.code || "level_code"}</code>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <FloatingInput label="Label (e.g. Easy)" value={form.label} required onChange={handleLabelChange} />
                <FloatingInput label="Code (e.g. easy)" value={form.code} required onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
              </div>

              <FloatingInput label="Order Index" value={String(form.order_index)} onChange={e => setForm(f => ({ ...f, order_index: parseInt(e.target.value) || 0 }))} />

              {/* Color */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 10 }}>Pick Color</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                  {COLOR_SWATCHES.map(c => (
                    <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                      style={{ width: 32, height: 32, borderRadius: 8, background: c, border: form.color === c ? "3px solid #0f172a" : "2px solid rgba(0,0,0,0.08)", cursor: "pointer", boxShadow: form.color === c ? "0 0 0 2px white inset" : "none", transition: "transform 0.1s" }}
                      onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.15)")}
                      onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <label style={{ fontSize: 12, color: "#64748b" }}>Custom:</label>
                  <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    style={{ width: 40, height: 32, borderRadius: 6, border: "1px solid #e2e8f0", cursor: "pointer", padding: 2 }} />
                  <code style={{ fontSize: 12, color: "#475569" }}>{form.color}</code>
                </div>
              </div>

              {/* Active */}
              <div style={{ padding: "16px 20px", background: "#f0f9ff", borderRadius: 10, border: "1px solid #bae6fd", display: "flex", alignItems: "center", gap: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#0369a1" }}>
                  <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#38bdf8" }} />
                  Level is Active
                </label>
                <span style={{ fontSize: 12, color: "#64748b" }}>Inactive levels won't appear in question settings.</span>
              </div>
            </form>
            <div style={{ padding: "20px 24px", borderTop: "1px solid #f1f5f9", background: "#f8fafc", display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => setModalOpen(false)} disabled={saving} style={{ background: "#fff", color: "#475569", border: "1px solid #cbd5e1", padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button type="submit" form="diff-form" disabled={saving} style={{ background: "#38bdf8", color: "#fff", border: "none", padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, opacity: saving ? 0.7 : 1, boxShadow: "0 4px 6px -1px rgba(56,189,248,0.3)" }}>
                {saving ? "Saving…" : <><Icon name="save" size={16} /> Save Level</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
