"use client";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL } from "@/lib/config";
import React, { useState, useEffect, useCallback } from "react";
import { Icon } from "../icons";

interface Tag {
  id: number;
  name: string;
  topic_id: number;
  created_at: string;
}

interface Topic {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  tags: Tag[];
}

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
  .cm-field.focused { border-color: #38bdf8; background: #fff; box-shadow: 0 0 0 3px rgba(56,189,248,0.15); }
  .cm-label {
    position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
    font-size: 14px; color: #94a3b8; pointer-events: none;
    transition: all 0.18s cubic-bezier(0.4,0,0.2,1); background: transparent;
    padding: 0 3px; white-space: nowrap; line-height: 1;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .cm-label.up { top: 0; transform: translateY(-50%); font-size: 11px; font-weight: 600; color: #38bdf8; background: #fff; }
  .cm-label-ta { position: absolute; left: 14px; top: 14px; font-size: 14px; color: #94a3b8; pointer-events: none; transition: all 0.18s cubic-bezier(0.4,0,0.2,1); background: transparent; padding: 0 3px; line-height: 1; font-family: 'Inter', system-ui, sans-serif; }
  .cm-label-ta.up { top: 0; transform: translateY(-50%); font-size: 11px; font-weight: 600; color: #38bdf8; background: #fff; }
  .cm-inp { display: block; width: 100%; padding: 20px 14px 8px; border: none; outline: none; font-size: 14px; color: #0f172a; background: transparent; border-radius: 10px; font-family: 'Inter', system-ui, sans-serif; }
  .cm-ta { display: block; width: 100%; padding: 24px 14px 10px; border: none; outline: none; font-size: 14px; color: #0f172a; background: transparent; border-radius: 10px; resize: vertical; min-height: 90px; font-family: 'Inter', system-ui, sans-serif; }
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

function FloatingTextarea({ label, value, onChange }: { label: string; value: string; onChange: (e: any) => void }) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;
  return (
    <div className="cm-field-wrap">
      <div className={`cm-field${focused ? " focused" : ""}`}>
        <label className={`cm-label-ta${lifted ? " up" : ""}`}>{label}</label>
        <textarea className="cm-ta" value={value} onChange={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
      </div>
    </div>
  );
}

function DeleteModal({ name, onConfirm, onCancel, deleting }: { name: string; onConfirm: () => void; onCancel: () => void; deleting: boolean }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "32px 28px", maxWidth: 400, width: "calc(100% - 32px)", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", color: "#dc2626" }}>
          <Icon name="trash" size={24} />
        </div>
        <h3 style={{ margin: "0 0 8px", fontSize: "1.1rem", fontWeight: 700, color: "#111827" }}>Delete Topic?</h3>
        <div style={{ display: "inline-block", padding: "4px 12px", borderRadius: 5, background: "#eff6ff", color: "#38bdf8", fontSize: ".82rem", fontWeight: 700, margin: "0 0 16px" }}>{name}</div>
        <p style={{ margin: "0 0 24px", color: "#6b7280", fontSize: ".875rem", lineHeight: 1.6 }}>All tags under this topic will also be <strong>permanently deleted</strong>.</p>
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

export default function TopicsTagsManager() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedTopic, setExpandedTopic] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Topic modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [topicForm, setTopicForm] = useState({ name: "", description: "", is_active: true });
  const [tempTags, setTempTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Topic | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/topics`);
      const data = await res.json();
      setTopics(Array.isArray(data) ? data : []);
    } catch { setTopics([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { setCurrentPage(1); }, [search]);

  const filtered = topics.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const displayed = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const openAdd = () => {
    setEditingTopic(null);
    setTopicForm({ name: "", description: "", is_active: true });
    setTempTags([]);
    setTagInput("");
    setModalOpen(true);
  };

  const openEdit = (t: Topic) => {
    setEditingTopic(t);
    setTopicForm({ name: t.name, description: t.description || "", is_active: t.is_active });
    setTempTags([]);
    setTagInput("");
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicForm.name.trim()) return;
    setSaving(true);
    try {
      const url = editingTopic ? `${API_BASE_URL}/topics/${editingTopic.id}` : `${API_BASE_URL}/topics`;
      const method = editingTopic ? "PUT" : "POST";
      const res = await apiFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(topicForm) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Failed"); }
      const saved = await res.json();

      // Add any temp tags
      const finalTags = [...tempTags];
      if (tagInput.trim() && !finalTags.includes(tagInput.trim())) finalTags.push(tagInput.trim());
      if (finalTags.length > 0) {
        await Promise.all(finalTags.map(name =>
          apiFetch(`${API_BASE_URL}/tags`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, topic_id: saved.id }) })
        ));
      }
      setModalOpen(false);
      fetchAll();
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`${API_BASE_URL}/topics/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      fetchAll();
    } finally { setDeleting(false); }
  };

  const toggleStatus = async (t: Topic) => {
    const newStatus = !t.is_active;
    setTopics(prev => prev.map(x => x.id === t.id ? { ...x, is_active: newStatus } : x));
    const res = await apiFetch(`${API_BASE_URL}/topics/${t.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: newStatus }) });
    if (!res.ok) setTopics(prev => prev.map(x => x.id === t.id ? { ...x, is_active: !newStatus } : x));
  };

  const addTag = async (topicId: number) => {
    const name = prompt("Enter tag name:");
    if (!name?.trim()) return;
    const res = await apiFetch(`${API_BASE_URL}/tags`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), topic_id: topicId }) });
    if (res.ok) fetchAll();
    else { const d = await res.json(); alert(d.detail || "Failed"); }
  };

  const deleteTag = async (tagId: number) => {
    if (!confirm("Delete this tag?")) return;
    await apiFetch(`${API_BASE_URL}/tags/${tagId}`, { method: "DELETE" });
    fetchAll();
  };

  return (
    <div className="manager-content">
      <style dangerouslySetInnerHTML={{ __html: FLOAT_CSS }} />

      {deleteTarget && <DeleteModal name={deleteTarget.name} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} deleting={deleting} />}

      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }}>Topics &amp; Tags</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Create a taxonomy to categorize and filter questions.</p>
        </div>
        <button
          onClick={openAdd}
          style={{ background: "#0f172a", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "opacity 0.2s" }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        >
          <Icon name="plus" size={16} /> Add Topic
        </button>
      </header>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}><Icon name="search" size={16} /></span>
          <input type="text" placeholder="Search topics…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", padding: "10px 12px 10px 40px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
            onFocus={e => (e.currentTarget.style.borderColor = "#38bdf8")}
            onBlur={e => (e.currentTarget.style.borderColor = "#e2e8f0")}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
            <tr>
              <th style={{ padding: "14px 20px", textAlign: "left", width: 40 }}>-</th>
              <th style={{ padding: "14px 20px", textAlign: "left", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.5px" }}>Topic</th>
              <th style={{ padding: "14px 20px", textAlign: "left", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.5px" }}>Description</th>
              <th style={{ padding: "14px 20px", textAlign: "left", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.5px" }}>Tags</th>
              <th style={{ padding: "14px 20px", textAlign: "left", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.5px", width: 90 }}>Status</th>
              <th style={{ padding: "14px 20px", textAlign: "right", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.5px", width: 100 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading…</td></tr>
            ) : displayed.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>No topics found.</td></tr>
            ) : displayed.map(t => (
              <React.Fragment key={t.id}>
                <tr
                  style={{ borderBottom: "1px solid #f8fafc", transition: "background 0.2s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#fcfdfe")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "14px 20px" }}>
                    <button onClick={() => setExpandedTopic(expandedTopic === t.id ? null : t.id)}
                      style={{ border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: 4, background: expandedTopic === t.id ? "#f1f5f9" : "transparent" }}>
                      <Icon name={expandedTopic === t.id ? "chevron-up" : "chevron-down"} size={16} />
                    </button>
                  </td>
                  <td style={{ padding: "14px 20px", fontWeight: 600, color: "#0f172a" }}>{t.name}</td>
                  <td style={{ padding: "14px 20px", color: "#64748b", maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.description || <span style={{ color: "#cbd5e1", fontStyle: "italic" }}>—</span>}
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {t.tags.length > 0 ? t.tags.map(tag => (
                        <span key={tag.id} style={{ background: "#f0f9ff", border: "1px solid #bae6fd", color: "#0284c7", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6 }}>{tag.name}</span>
                      )) : <span style={{ color: "#94a3b8", fontSize: 12, fontStyle: "italic" }}>None</span>}
                    </div>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <div onClick={() => toggleStatus(t)} style={{ width: 44, height: 24, borderRadius: 12, background: t.is_active ? "#22c55e" : "#e2e8f0", position: "relative", cursor: "pointer", transition: "background 0.2s" }}>
                      <div style={{ position: "absolute", top: 2, left: t.is_active ? 22 : 2, width: 20, height: 20, borderRadius: 10, background: "#fff", transition: "left 0.2s cubic-bezier(0.4,0,0.2,1)", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }} />
                    </div>
                  </td>
                  <td style={{ padding: "14px 20px", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button onClick={() => openEdit(t)} title="Edit" style={{ border: "none", background: "#f1f5f9", color: "#475569", width: 30, height: 30, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon name="edit" size={14} />
                      </button>
                      <button onClick={() => setDeleteTarget(t)} title="Delete" style={{ border: "none", background: "#fef2f2", color: "#ef4444", width: 30, height: 30, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedTopic === t.id && (
                  <tr style={{ background: "#f8fafc" }}>
                    <td colSpan={6} style={{ padding: "0 20px 20px 60px" }}>
                      <div style={{ borderLeft: "2px solid #e2e8f0", paddingLeft: 20, paddingTop: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <h4 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Tags under "{t.name}"</h4>
                          <button onClick={() => addTag(t.id)} style={{ fontSize: 11, fontWeight: 700, color: "#38bdf8", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                            <Icon name="plus" size={12} /> Add Tag
                          </button>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {t.tags.length > 0 ? t.tags.map(tag => (
                            <div key={tag.id} style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "5px 12px", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
                              <span>{tag.name}</span>
                              <button onClick={() => deleteTag(tag.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#fda4af", padding: 2, display: "flex" }}><Icon name="trash" size={11} /></button>
                            </div>
                          )) : <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>No tags yet.</div>}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {!loading && filtered.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderTop: "1px solid #f1f5f9" }}>
            <span style={{ fontSize: 13, color: "#64748b" }}>Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} entries</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: currentPage === 1 ? "#f8fafc" : "#fff", color: currentPage === 1 ? "#cbd5e1" : "#475569", fontSize: 13, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}>Previous</button>
              <div style={{ display: "flex", alignItems: "center", padding: "0 8px", fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{currentPage} / {totalPages}</div>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
                style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: currentPage >= totalPages ? "#f8fafc" : "#fff", color: currentPage >= totalPages ? "#cbd5e1" : "#475569", fontSize: 13, cursor: currentPage >= totalPages ? "not-allowed" : "pointer" }}>Next</button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.6)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 16, width: "80%", maxWidth: 700, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{editingTopic ? "Edit Topic" : "Add New Topic"}</h2>
              <button onClick={() => !saving && setModalOpen(false)} style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8" }}><Icon name="x" size={20} /></button>
            </div>
            <form id="topic-form" onSubmit={save} style={{ padding: 24, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
              <FloatingInput label="Topic Name" value={topicForm.name} required onChange={e => setTopicForm({ ...topicForm, name: e.target.value })} />
              <FloatingTextarea label="Description (Optional)" value={topicForm.description} onChange={e => setTopicForm({ ...topicForm, description: e.target.value })} />

              {/* Quick-add tags */}
              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Quick Add Tags (Optional)</label>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>Press Enter to add</span>
                </div>
                <div style={{ position: "relative", marginBottom: 12 }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}><Icon name="plus" size={14} /></span>
                  <input type="text" placeholder="Type tag name…" value={tagInput} onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (tagInput.trim() && !tempTags.includes(tagInput.trim())) { setTempTags([...tempTags, tagInput.trim()]); setTagInput(""); } } }}
                    style={{ width: "100%", padding: "10px 12px 10px 36px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", background: "#f8fafc", boxSizing: "border-box" }}
                  />
                </div>
                {tempTags.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {tempTags.map((tag, i) => (
                      <div key={i} style={{ background: "#f0f9ff", border: "1px solid #bae6fd", color: "#0284c7", fontSize: 12, fontWeight: 500, padding: "4px 10px", borderRadius: 20, display: "flex", alignItems: "center", gap: 6 }}>
                        {tag}
                        <button type="button" onClick={() => setTempTags(tempTags.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: "#0ea5e9", cursor: "pointer", display: "flex", padding: 0 }}><Icon name="x" size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Active toggle */}
              <div style={{ padding: "16px 20px", background: "#f0f9ff", borderRadius: 10, border: "1px solid #bae6fd", display: "flex", alignItems: "center", gap: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#0369a1" }}>
                  <input type="checkbox" checked={topicForm.is_active} onChange={e => setTopicForm({ ...topicForm, is_active: e.target.checked })} style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#38bdf8" }} />
                  Topic is Active
                </label>
                <span style={{ fontSize: 12, color: "#64748b" }}>Inactive topics won't appear in question filters.</span>
              </div>
            </form>
            <div style={{ padding: "20px 24px", borderTop: "1px solid #f1f5f9", background: "#f8fafc", display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => setModalOpen(false)} disabled={saving} style={{ background: "#fff", color: "#475569", border: "1px solid #cbd5e1", padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button type="submit" form="topic-form" disabled={saving} style={{ background: "#38bdf8", color: "#fff", border: "none", padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, opacity: saving ? 0.7 : 1, boxShadow: "0 4px 6px -1px rgba(56,189,248,0.3)" }}>
                {saving ? "Saving…" : <><Icon name="save" size={16} /> Save Topic</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
