"use client";
import React, { useEffect, useState } from "react";
import { AdminProvider } from "../../components/ProtectedAdmin";
import { useToast } from "../../components/ToastProvider";
import { Icon } from "../../icons";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL } from "@/lib/config";
import SeoTable from "../../components/SeoTable";

const S = {
  card: { background: "#fff", border: "1px solid #e2e8f0", padding: 24, marginBottom: 16 } as React.CSSProperties,
  input: { width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" as const, outline: "none" } as React.CSSProperties,
  label: { display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: "0.5px" } as React.CSSProperties,
  sectionTitle: { fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid #f1f5f9" } as React.CSSProperties,
  btnPrimary: { padding: "10px 20px", border: "none", background: "#0a1628", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" } as React.CSSProperties,
  btnGhost: { padding: "10px 20px", border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 14, cursor: "pointer" } as React.CSSProperties,
  btnHeader: { padding: "10px 20px", border: "none", background: "#0a1628", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" } as React.CSSProperties,
  checkbox: { display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#475569", cursor: "pointer" } as React.CSSProperties,
};

function SeoRedirectsInner() {
  const { showToast } = useToast();
  const toast = { success: (m: string) => showToast(m, "success"), error: (m: string) => showToast(m, "error") };
  const [loading, setLoading] = useState(true);
  const [redirects, setRedirects] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ from_path: "", to_path: "", status_code: 301, is_active: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await apiFetch(`${BASE_URL}/api/seo/redirects/all`);
      if (res.ok) setRedirects(await res.json());
    } catch { toast.error("Failed to load redirects."); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!form.from_path.trim() || !form.to_path.trim()) { toast.error("From and To paths are required."); return; }
    setSaving(true);
    try {
      const url = editing ? `${BASE_URL}/api/seo/redirects/${editing.id}` : `${BASE_URL}/api/seo/redirects`;
      const method = editing ? "PUT" : "POST";
      const res = await apiFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed");
      }
      toast.success(editing ? "Redirect updated." : "Redirect created.");
      setShowForm(false);
      setEditing(null);
      setForm({ from_path: "", to_path: "", status_code: 301, is_active: true });
      load();
    } catch (e: any) { toast.error(e.message || "Failed to save."); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this redirect?")) return;
    try {
      const res = await apiFetch(`${BASE_URL}/api/seo/redirects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Redirect deleted.");
      load();
    } catch { toast.error("Failed to delete."); }
  };

  if (loading) return <div className="manager-content"><div className="skeleton sk-h1"></div></div>;

  return (
    <div className="manager-content" style={{ width: "100%" }}>
      <header style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="link" size={24} /> Redirect Manager
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>Manage 301/302 redirects. Useful when course/blog slugs change.</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({ from_path: "", to_path: "", status_code: 301, is_active: true }); setShowForm(true); }} style={S.btnHeader}>
          + Add Redirect
        </button>
      </header>

      {showForm && (
        <div style={S.card}>
          <h3 style={S.sectionTitle}>{editing ? "Edit Redirect" : "New Redirect"}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={S.label}>From Path</label>
              <input style={S.input} value={form.from_path} onChange={(e) => setForm({ ...form, from_path: e.target.value })} placeholder="/old-course-slug" />
            </div>
            <div>
              <label style={S.label}>To Path</label>
              <input style={S.input} value={form.to_path} onChange={(e) => setForm({ ...form, to_path: e.target.value })} placeholder="/new-course-slug" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 16 }}>
            <div>
              <label style={S.label}>Status Code</label>
              <select style={{ ...S.input, width: "auto" }} value={form.status_code} onChange={(e) => setForm({ ...form, status_code: Number(e.target.value) })}>
                <option value={301}>301 (Permanent)</option>
                <option value={302}>302 (Temporary)</option>
              </select>
            </div>
            <label style={{ ...S.checkbox, marginTop: 20 }}>
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active
            </label>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => { setShowForm(false); setEditing(null); }} style={S.btnGhost}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1, cursor: saving ? "not-allowed" : "pointer" }}>{saving ? "Saving..." : "Save"}</button>
          </div>
        </div>
      )}

      <SeoTable
        columns={[
          { key: "from_path", label: "From", render: (r) => <code style={{ fontSize: 13, color: "#ef4444" }}>{r.from_path}</code> },
          { key: "to_path", label: "To", render: (r) => <code style={{ fontSize: 13, color: "#10b981" }}>{r.to_path}</code> },
          { key: "status_code", label: "Type", render: (r) => <span style={{ fontSize: 12, padding: "2px 8px", background: r.status_code === 301 ? "#ecfdf5" : "#fffbeb", color: r.status_code === 301 ? "#10b981" : "#f59e0b" }}>{r.status_code}</span> },
          { key: "is_active", label: "Status", render: (r) => r.is_active ? <span style={{ fontSize: 12, color: "#10b981" }}>Active</span> : <span style={{ fontSize: 12, color: "#94a3b8" }}>Inactive</span> },
          { key: "actions", label: "", render: (r) => (
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={(e) => { e.stopPropagation(); setEditing(r); setForm({ from_path: r.from_path, to_path: r.to_path, status_code: r.status_code, is_active: r.is_active }); setShowForm(true); }} style={{ padding: "6px 10px", border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 12, color: "#475569" }}>Edit</button>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} style={{ padding: "6px 10px", border: "1px solid #fecaca", background: "#fef2f2", cursor: "pointer", fontSize: 12, color: "#ef4444" }}>Delete</button>
            </div>
          )},
        ]}
        data={redirects}
        emptyMessage="No redirects configured. Add one to redirect old URLs."
      />
    </div>
  );
}

export default function SeoRedirectsPage() {
  return <AdminProvider><SeoRedirectsInner /></AdminProvider>;
}
