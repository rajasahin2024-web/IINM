"use client";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL } from "@/lib/config";
import React, { useState, useEffect, useCallback } from "react";
import { Editor, EditorProvider, BtnBold, BtnItalic, BtnStrikeThrough, BtnUnderline, BtnLink, BtnNumberedList, BtnBulletList, BtnClearFormatting, Toolbar, Separator } from "react-simple-wysiwyg";
import { Icon } from "../icons";

interface Comprehension {
  id: number;
  code: string;
  title: string;
  body_html: string;
  is_active: boolean;
  created_at?: string;
}

// ─── FLOAT CSS (same as CategoryManager) ──────────────────────────────────────

const FLOAT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  .cm-field-wrap { margin-bottom: 0; width: 100%; }

  .cm-field {
    position: relative;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    background: #f8fafc;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  }
  .cm-field.focused {
    border-color: #38bdf8;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
  }

  .cm-label {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 14px;
    color: #94a3b8;
    pointer-events: none;
    transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
    background: transparent;
    padding: 0 3px;
    white-space: nowrap;
    line-height: 1;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .cm-label.up {
    top: 0;
    transform: translateY(-50%);
    font-size: 11px;
    font-weight: 600;
    color: #38bdf8;
    background: #fff;
  }

  .cm-inp {
    display: block;
    width: 100%;
    padding: 20px 14px 8px;
    border: none;
    outline: none;
    font-size: 14px;
    color: #0f172a;
    background: transparent;
    border-radius: 10px;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .cm-req { color: #ef4444; margin-left: 2px; }
`;

// ─── FloatingInput (same as CategoryManager) ──────────────────────────────────

function FloatingInput({ label, value, onChange, required = false }: {
  label: string; value: string; onChange: (e: any) => void; required?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || (value && value.length > 0);
  return (
    <div className="cm-field-wrap">
      <div className={`cm-field${focused ? " focused" : ""}`}>
        <label className={`cm-label${lifted ? " up" : ""}`}>
          {label}{required && <span className="cm-req">*</span>}
        </label>
        <input
          type="text"
          className="cm-inp"
          value={value}
          required={required}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripHtml(html: string) {
  if (typeof document === "undefined") return html;
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────

function DeleteModal({ title, onConfirm, onCancel, deleting }: {
  title: string; onConfirm: () => void; onCancel: () => void; deleting: boolean;
}) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.55)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#fff", borderRadius:16, padding:"32px 28px", maxWidth:400, width:"calc(100% - 32px)", boxShadow:"0 20px 60px rgba(0,0,0,0.2)", textAlign:"center" }}>
        <div style={{ width:56, height:56, borderRadius:"50%", background:"#fef2f2", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 18px", color:"#dc2626" }}>
          <Icon name="trash" size={24} />
        </div>
        <h3 style={{ margin:"0 0 8px", fontSize:"1.1rem", fontWeight:700, color:"#111827" }}>Delete Comprehension?</h3>
        <div style={{ display:"inline-block", padding:"4px 12px", borderRadius:5, background:"#eff6ff", color:"#38bdf8", fontSize:".82rem", fontWeight:700, margin:"0 0 16px", wordBreak:"break-all" }}>{title}</div>
        <p style={{ margin:"0 0 24px", color:"#6b7280", fontSize:".875rem", lineHeight:1.6 }}>This action is <strong>permanent</strong> and cannot be undone.</p>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onCancel} disabled={deleting} style={{ flex:1, padding:"10px 24px", borderRadius:8, border:"1.5px solid #e5e7eb", background:"#fff", color:"#374151", fontSize:".875rem", fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
          <button onClick={onConfirm} disabled={deleting} style={{ flex:1, padding:"10px 24px", borderRadius:8, border:"none", background:"#dc2626", color:"#fff", fontSize:".875rem", fontWeight:700, cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.6 : 1, fontFamily:"inherit" }}>
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ComprehensionManager() {
  const [items, setItems] = useState<Comprehension[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Comprehension | null>(null);
  const [form, setForm] = useState({ code: "", title: "", body_html: "", is_active: true });
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Comprehension | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`${API_BASE_URL}/comprehensions`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter]);

  const filtered = items.filter(c => {
    if (search && !c.code.toLowerCase().includes(search.toLowerCase()) && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter === "active" && !c.is_active) return false;
    if (statusFilter === "inactive" && c.is_active) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const displayed = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const openAdd = () => {
    setEditing(null);
    setForm({ code: "", title: "", body_html: "", is_active: true });
    setModalOpen(true);
  };

  const openEdit = (c: Comprehension) => {
    setEditing(c);
    setForm({ code: c.code, title: c.title, body_html: c.body_html, is_active: c.is_active });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.title.trim() || !form.body_html.trim()) return;
    setSaving(true);
    try {
      const url = editing ? `${API_BASE_URL}/comprehensions/${editing.id}` : `${API_BASE_URL}/comprehensions`;
      const method = editing ? "PUT" : "POST";
      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Failed to save");
      }
      setModalOpen(false);
      fetchItems();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`${API_BASE_URL}/comprehensions/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      fetchItems();
    } finally {
      setDeleting(false);
    }
  };

  const toggleStatus = async (c: Comprehension) => {
    const newStatus = !c.is_active;
    setItems(prev => prev.map(x => x.id === c.id ? { ...x, is_active: newStatus } : x));
    try {
      const res = await apiFetch(`${API_BASE_URL}/comprehensions/${c.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c.code, title: c.title, body_html: c.body_html, is_active: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      setItems(prev => prev.map(x => x.id === c.id ? { ...x, is_active: !newStatus } : x));
    }
  };

  return (
    <div className="manager-content">
      <style dangerouslySetInnerHTML={{ __html: FLOAT_CSS }} />

      {deleteTarget && (
        <DeleteModal
          title={deleteTarget.title}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}

      {/* Header */}
      <header style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:"#0f172a" }}>Comprehension Passages</h1>
          <p style={{ margin:"4px 0 0", fontSize:13, color:"#64748b" }}>Manage reading passages linked to comprehension questions.</p>
        </div>
        <button
          onClick={openAdd}
          style={{ background:"#0f172a", color:"#fff", border:"none", padding:"10px 18px", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:8, transition:"opacity 0.2s" }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        >
          <Icon name="plus" size={16} /> Add Comprehension
        </button>
      </header>

      {/* Toolbar */}
      <div style={{ marginBottom:20, display:"flex", gap:12 }}>
        <div style={{ position:"relative", flex:1 }}>
          <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"#94a3b8" }}>
            <Icon name="search" size={16} />
          </span>
          <input
            type="text"
            placeholder="Search by code or title…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width:"100%", padding:"10px 12px 10px 40px", borderRadius:10, border:"1px solid #e2e8f0", fontSize:13, outline:"none", transition:"border-color 0.2s", boxSizing:"border-box" }}
            onFocus={e => (e.currentTarget.style.borderColor = "#38bdf8")}
            onBlur={e => (e.currentTarget.style.borderColor = "#e2e8f0")}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as any)}
          style={{ padding:"10px 14px", borderRadius:10, border:"1px solid #e2e8f0", fontSize:13, outline:"none", background:"#fff", color:"#475569", cursor:"pointer" }}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 1px 3px rgba(0,0,0,0.06)", border:"1px solid #f1f5f9", overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead style={{ background:"#f8fafc", borderBottom:"1px solid #f1f5f9" }}>
            <tr>
              <th style={{ padding:"14px 20px", textAlign:"left", fontWeight:600, color:"#64748b", textTransform:"uppercase", fontSize:11, letterSpacing:"0.5px", width:100 }}>Code</th>
              <th style={{ padding:"14px 20px", textAlign:"left", fontWeight:600, color:"#64748b", textTransform:"uppercase", fontSize:11, letterSpacing:"0.5px" }}>Title</th>
              <th style={{ padding:"14px 20px", textAlign:"left", fontWeight:600, color:"#64748b", textTransform:"uppercase", fontSize:11, letterSpacing:"0.5px" }}>Preview</th>
              <th style={{ padding:"14px 20px", textAlign:"left", fontWeight:600, color:"#64748b", textTransform:"uppercase", fontSize:11, letterSpacing:"0.5px", width:90 }}>Status</th>
              <th style={{ padding:"14px 20px", textAlign:"right", fontWeight:600, color:"#64748b", textTransform:"uppercase", fontSize:11, letterSpacing:"0.5px", width:100 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding:40, textAlign:"center", color:"#94a3b8" }}>Loading…</td></tr>
            ) : displayed.length === 0 ? (
              <tr><td colSpan={5} style={{ padding:40, textAlign:"center", color:"#94a3b8" }}>No comprehensions found.</td></tr>
            ) : displayed.map(c => (
              <tr key={c.id}
                style={{ borderBottom:"1px solid #f8fafc", transition:"background 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#fcfdfe")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <td style={{ padding:"14px 20px" }}>
                  <span style={{ background:"#f0f9ff", border:"1px solid #bae6fd", color:"#0284c7", fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:6 }}>{c.code}</span>
                </td>
                <td style={{ padding:"14px 20px", fontWeight:600, color:"#0f172a" }}>{c.title}</td>
                <td style={{ padding:"14px 20px", color:"#64748b", fontSize:12, maxWidth:300, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {stripHtml(c.body_html).substring(0, 100)}…
                </td>
                <td style={{ padding:"14px 20px" }}>
                  <div
                    onClick={() => toggleStatus(c)}
                    style={{ width:44, height:24, borderRadius:12, background: c.is_active ? "#22c55e" : "#e2e8f0", position:"relative", cursor:"pointer", transition:"background 0.2s" }}
                  >
                    <div style={{ position:"absolute", top:2, left: c.is_active ? 22 : 2, width:20, height:20, borderRadius:10, background:"#fff", transition:"left 0.2s cubic-bezier(0.4,0,0.2,1)", boxShadow:"0 1px 2px rgba(0,0,0,0.1)" }} />
                  </div>
                </td>
                <td style={{ padding:"14px 20px", textAlign:"right" }}>
                  <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                    <button onClick={() => openEdit(c)} title="Edit" style={{ border:"none", background:"#f1f5f9", color:"#475569", width:30, height:30, borderRadius:6, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <Icon name="edit" size={14} />
                    </button>
                    <button onClick={() => setDeleteTarget(c)} title="Delete" style={{ border:"none", background:"#fef2f2", color:"#ef4444", width:30, height:30, borderRadius:6, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {!loading && filtered.length > 0 && (
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 20px", borderTop:"1px solid #f1f5f9", background:"#fff" }}>
            <span style={{ fontSize:13, color:"#64748b" }}>
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} entries
            </span>
            <div style={{ display:"flex", gap:6 }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{ padding:"6px 12px", borderRadius:6, border:"1px solid #e2e8f0", background: currentPage === 1 ? "#f8fafc" : "#fff", color: currentPage === 1 ? "#cbd5e1" : "#475569", fontSize:13, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
              >Previous</button>
              <div style={{ display:"flex", alignItems:"center", padding:"0 8px", fontSize:13, fontWeight:600, color:"#0f172a" }}>
                {currentPage} / {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                style={{ padding:"6px 12px", borderRadius:6, border:"1px solid #e2e8f0", background: currentPage >= totalPages ? "#f8fafc" : "#fff", color: currentPage >= totalPages ? "#cbd5e1" : "#475569", fontSize:13, cursor: currentPage >= totalPages ? "not-allowed" : "pointer" }}
              >Next</button>
            </div>
          </div>
        )}
      </div>

      {/* NEW / EDIT MODAL */}
      {modalOpen && (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(15,23,42,0.6)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:"#fff", borderRadius:16, width:"80%", maxWidth:1000, boxShadow:"0 20px 25px -5px rgba(0,0,0,0.1)", overflow:"hidden", display:"flex", flexDirection:"column", maxHeight:"90vh" }}>

            <div style={{ padding:"20px 24px", borderBottom:"1px solid #f1f5f9", display:"flex", justifyContent:"space-between", alignItems:"center", background:"#f8fafc" }}>
              <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:"#0f172a" }}>{editing ? "Edit Comprehension" : "Add New Comprehension"}</h2>
              <button onClick={() => !saving && setModalOpen(false)} style={{ border:"none", background:"none", cursor:"pointer", color:"#94a3b8" }}><Icon name="x" size={20} /></button>
            </div>

            <form id="comp-form" onSubmit={handleSave} style={{ padding:"24px", overflowY:"auto", flex:1 }}>
              {/* Code + Title */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:20, marginBottom:24 }}>
                <FloatingInput label="Code (e.g. COM_001)" value={form.code} required onChange={e => setForm({...form, code: e.target.value})} />
                <FloatingInput label="Title" value={form.title} required onChange={e => setForm({...form, title: e.target.value})} />
              </div>

              {/* Rich Text */}
              <div style={{ marginBottom:24 }}>
                <label style={{ fontSize:12, fontWeight:600, color:"#475569", textTransform:"uppercase", letterSpacing:"0.5px", display:"block", marginBottom:10 }}>
                  Passage Content <span style={{ color:"#ef4444" }}>*</span>
                </label>
                <div style={{ border:"1.5px solid #e2e8f0", borderRadius:10, overflow:"hidden", background:"#f8fafc" }}>
                  <EditorProvider>
                    <Editor
                      value={form.body_html}
                      onChange={(e: any) => setForm({...form, body_html: e.target.value})}
                      containerProps={{ style: { minHeight:"260px", background:"#fff" } }}
                    />
                    <Toolbar>
                      <BtnBold /><BtnItalic /><BtnUnderline /><BtnStrikeThrough />
                      <Separator />
                      <BtnNumberedList /><BtnBulletList />
                      <Separator />
                      <BtnLink /><BtnClearFormatting />
                    </Toolbar>
                  </EditorProvider>
                </div>
              </div>

              {/* Active toggle */}
              <div style={{ padding:"16px 20px", background:"#f0f9ff", borderRadius:10, border:"1px solid #bae6fd", display:"flex", alignItems:"center", gap:12 }}>
                <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", fontSize:14, fontWeight:600, color:"#0369a1" }}>
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={e => setForm({...form, is_active: e.target.checked})}
                    style={{ width:16, height:16, cursor:"pointer", accentColor:"#38bdf8" }}
                  />
                  Comprehension is Active
                </label>
                <span style={{ fontSize:12, color:"#64748b" }}>Inactive passages are hidden from question builders.</span>
              </div>
            </form>

            <div style={{ padding:"20px 24px", borderTop:"1px solid #f1f5f9", background:"#f8fafc", display:"flex", justifyContent:"flex-end", gap:12 }}>
              <button onClick={() => setModalOpen(false)} disabled={saving} style={{ background:"#fff", color:"#475569", border:"1px solid #cbd5e1", padding:"10px 20px", borderRadius:8, fontSize:14, fontWeight:600, cursor:"pointer" }}>Cancel</button>
              <button type="submit" form="comp-form" disabled={saving} style={{ background:"#38bdf8", color:"#fff", border:"none", padding:"10px 24px", borderRadius:8, fontSize:14, fontWeight:600, cursor: saving ? "not-allowed" : "pointer", display:"flex", alignItems:"center", gap:8, opacity: saving ? 0.7 : 1, boxShadow:"0 4px 6px -1px rgba(56,189,248,0.3)" }}>
                {saving ? "Saving…" : <><Icon name="save" size={16} /> Save Comprehension</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
