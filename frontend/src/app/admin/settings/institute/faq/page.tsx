"use client";
import React, { useState, useEffect, useRef } from "react";
import { AdminProvider } from "../../../components/ProtectedAdmin";
import { useToast } from "../../../components/ToastProvider";
import DeleteModal from "../../../components/DeleteModal";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL } from "@/lib/config";

const API = BASE_URL;

// ── UI Components ──

function FInput({ label, value, onChange, type = "text", required = false, isTextArea = false }: any) {
  const [focused, setFocused] = useState(false);
  const active = focused || value?.toString().length > 0;
  return (
    <div style={{ position: "relative", marginBottom: 20 }}>
      {isTextArea ? (
        <textarea
          value={value} onChange={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          required={required}
          style={{ width: "100%", minHeight: 120, padding: "24px 16px 12px", fontSize: 15, background: "#f8fafc", border: `2px solid ${focused ? "#3b82f6" : "#e2e8f0"}`, borderRadius: 12, outline: "none", transition: "all 0.2s", color: "#0f172a", resize: "vertical", fontFamily: "inherit" }}
        />
      ) : (
        <input
          type={type} value={value} onChange={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          required={required}
          style={{ width: "100%", padding: "24px 16px 8px", fontSize: 15, background: "#f8fafc", border: `2px solid ${focused ? "#3b82f6" : "#e2e8f0"}`, borderRadius: 12, outline: "none", transition: "all 0.2s", color: "#0f172a" }}
        />
      )}
      <label style={{ position: "absolute", left: 16, top: active ? 8 : (isTextArea ? 20 : 16), fontSize: active ? 11 : 15, fontWeight: active ? 700 : 500, color: active ? "#3b82f6" : "#64748b", pointerEvents: "none", transition: "all 0.2s", textTransform: active ? "uppercase" : "none", letterSpacing: active ? 0.5 : 0 }}>
        {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
      </label>
    </div>
  );
}

function Switch({ checked, onChange }: { checked: boolean, onChange: () => void }) {
  return (
    <div onClick={onChange} style={{ width: 44, height: 24, borderRadius: 12, background: checked ? "#10b981" : "#cbd5e1", position: "relative", cursor: "pointer", transition: "background 0.3s" }}>
      <div style={{ position: "absolute", top: 2, left: checked ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.3s", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }} />
    </div>
  );
}

// ── Main Page Component ──

function FaqSettingsInner() {
  const { showToast } = useToast();
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`${API}/api/faqs`);
      if (res.ok) setFaqs(await res.json());
      else showToast("Failed to load FAQs", "error");
    } catch {
      showToast("Error loading data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.question || !formData.answer) return;
    setSaving(true);
    const method = formData.id ? "PUT" : "POST";
    const url = formData.id ? `${API}/api/faqs/${formData.id}` : `${API}/api/faqs`;
    
    try {
      const res = await apiFetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        showToast(formData.id ? "FAQ updated." : "FAQ created.", "success");
        setModalOpen(false);
        loadData();
      } else showToast("Failed to save FAQ.", "error");
    } catch {
      showToast("Error saving FAQ.", "error");
    } finally {
      setSaving(false);
    }
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await apiFetch(`${API}/api/faqs/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("FAQ deleted.", "success");
        loadData();
      } else showToast("Failed to delete.", "error");
    } catch { showToast("Error deleting FAQ.", "error"); }
    finally { setDeleteTarget(null); }
  };

  const toggleStatus = async (faq: any) => {
    try {
      setFaqs(faqs.map(f => f.id === faq.id ? { ...f, is_active: !faq.is_active } : f));
      await apiFetch(`${API}/api/faqs/${faq.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !faq.is_active })
      });
    } catch { showToast("Error updating status.", "error"); }
  };

  // Drag and Drop Logic
  const handleDragStart = (idx: number) => setDraggedIdx(idx);
  
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx) return;
    
    const newFaqs = [...faqs];
    const draggedItem = newFaqs[draggedIdx];
    newFaqs.splice(draggedIdx, 1);
    newFaqs.splice(idx, 0, draggedItem);
    
    setDraggedIdx(idx);
    setFaqs(newFaqs);
  };

  const handleDragEnd = async () => {
    setDraggedIdx(null);
    // Save new order to backend
    const updates = faqs.map((f, i) => ({ id: f.id, order_index: i }));
    try {
      await apiFetch(`${API}/api/faqs/reorder`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
    } catch { showToast("Failed to save new order.", "error"); }
  };

  return (
    <div style={{ padding: "40px 48px", width: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "#0f172a", margin: "0 0 8px", letterSpacing: "-0.5px" }}>FAQ Management</h1>
          <p style={{ color: "#64748b", margin: 0 }}>Create, order, and manage frequently asked questions.</p>
        </div>
        <button onClick={() => { setFormData({ question: "", answer: "", is_active: true }); setModalOpen(true); }} style={{ display: "flex", alignItems: "center", gap: 8, background: "#0f172a", color: "#fff", border: "none", padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "transform 0.2s", boxShadow: "0 4px 12px rgba(15,23,42,0.15)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add FAQ
        </button>
      </div>

      <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.03)", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        {/* Table Header */}
        <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 100px 100px", gap: 16, padding: "16px 24px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>
          <div>Drag</div>
          <div>Question & Answer</div>
          <div>Status</div>
          <div style={{ textAlign: "right" }}>Actions</div>
        </div>

        {/* List */}
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading FAQs...</div>
        ) : faqs.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "#94a3b8" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#334155", margin: "0 0 8px" }}>No FAQs Found</h3>
            <p style={{ color: "#64748b", margin: 0, fontSize: 14 }}>Click "Add FAQ" to create your first question.</p>
          </div>
        ) : (
          <div>
            {faqs.map((faq, idx) => (
              <div 
                key={faq.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                style={{ display: "grid", gridTemplateColumns: "40px 1fr 100px 100px", gap: 16, padding: "20px 24px", borderBottom: "1px solid #f1f5f9", alignItems: "center", background: draggedIdx === idx ? "#f8fafc" : "#fff", opacity: draggedIdx === idx ? 0.5 : 1, transition: "background 0.2s", cursor: draggedIdx !== null ? "grabbing" : "default" }}
              >
                <div style={{ cursor: "grab", color: "#cbd5e1" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{faq.question}</div>
                  <div style={{ fontSize: 13, color: "#64748b", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", textOverflow: "ellipsis" }}>{faq.answer}</div>
                </div>
                <div>
                  <Switch checked={faq.is_active} onChange={() => toggleStatus(faq)} />
                </div>
                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                  <button onClick={() => { setFormData(faq); setModalOpen(true); }} style={{ width: 32, height: 32, borderRadius: 8, background: "#f1f5f9", border: "none", color: "#3b82f6", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button onClick={() => setDeleteTarget(faq)} style={{ width: 32, height: 32, borderRadius: 8, background: "#fee2e2", border: "none", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && formData && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: 600, borderRadius: 24, padding: 32, boxShadow: "0 24px 48px rgba(0,0,0,0.2)" }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 24px", color: "#0f172a" }}>{formData.id ? "Edit FAQ" : "Add New FAQ"}</h2>
            <form onSubmit={handleSave}>
              <FInput label="Question" value={formData.question} onChange={(e: any) => setFormData({ ...formData, question: e.target.value })} required />
              <FInput label="Answer" value={formData.answer} onChange={(e: any) => setFormData({ ...formData, answer: e.target.value })} required isTextArea />
              
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32, background: "#f8fafc", padding: "16px 20px", borderRadius: 12 }}>
                <Switch checked={formData.is_active} onChange={() => setFormData({ ...formData, is_active: !formData.is_active })} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#334155" }}>Active on Website</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>Show this FAQ to the public</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setModalOpen(false)} style={{ padding: "12px 24px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: "12px 24px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving..." : "Save FAQ"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <DeleteModal 
          title="Delete FAQ?"
          description="Are you sure you want to delete this FAQ? This action is permanent and cannot be undone."
          itemName={deleteTarget.question}
          onConfirm={executeDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

export default function FaqSettingsPage() {
  return (
    <AdminProvider>
      <FaqSettingsInner />
    </AdminProvider>
  );
}
