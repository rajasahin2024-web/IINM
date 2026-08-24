"use client";
import React, { useEffect, useState } from "react";
import { AdminProvider } from "../../components/ProtectedAdmin";
import { useToast } from "../../components/ToastProvider";
import { Icon } from "../../icons";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL } from "@/lib/config";

const S = {
  card: { background: "#fff", border: "1px solid #e2e8f0", padding: 24, marginBottom: 16 } as React.CSSProperties,
  input: { width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" as const, outline: "none" } as React.CSSProperties,
  label: { display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: "0.5px" } as React.CSSProperties,
  sectionTitle: { fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid #f1f5f9" } as React.CSSProperties,
  btnPrimary: { padding: "10px 20px", border: "none", background: "#0a1628", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" } as React.CSSProperties,
  btnGhost: { padding: "10px 20px", border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 14, cursor: "pointer" } as React.CSSProperties,
  checkbox: { display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#475569", cursor: "pointer" } as React.CSSProperties,
};

function SeoFaqsInner() {
  const { showToast } = useToast();
  const toast = { success: (m: string) => showToast(m, "success"), error: (m: string) => showToast(m, "error") };
  const [loading, setLoading] = useState(true);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [tab, setTab] = useState<"global" | "course">("global");
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [courseFaqs, setCourseFaqs] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ question: "", answer: "", is_active: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [faqRes, courseRes] = await Promise.all([
        apiFetch(`${BASE_URL}/api/faq`),
        apiFetch(`${BASE_URL}/api/courses?limit=500`),
      ]);
      if (faqRes.ok) setFaqs(await faqRes.json());
      if (courseRes.ok) {
        const data = await courseRes.json();
        setCourses(data.items || data || []);
      }
    } catch { toast.error("Failed to load."); }
    finally { setLoading(false); }
  };

  const loadCourseFaqs = async (courseId: number) => {
    try {
      const res = await apiFetch(`${BASE_URL}/api/seo/courses/${courseId}/faqs`);
      if (res.ok) setCourseFaqs(await res.json());
    } catch { toast.error("Failed to load course FAQs."); }
  };

  const handleSaveGlobal = async () => {
    if (!form.question.trim() || !form.answer.trim()) { toast.error("Question and answer required."); return; }
    setSaving(true);
    try {
      const url = editing ? `${BASE_URL}/api/faq/${editing.id}` : `${BASE_URL}/api/faq`;
      const method = editing ? "PUT" : "POST";
      const res = await apiFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error("Failed");
      toast.success(editing ? "FAQ updated." : "FAQ created.");
      setEditing(null);
      setForm({ question: "", answer: "", is_active: true });
      const r = await apiFetch(`${BASE_URL}/api/faq`);
      if (r.ok) setFaqs(await r.json());
    } catch { toast.error("Failed to save."); }
    finally { setSaving(false); }
  };

  const handleDeleteGlobal = async (id: number) => {
    if (!confirm("Delete this FAQ?")) return;
    try {
      const res = await apiFetch(`${BASE_URL}/api/faq/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("FAQ deleted.");
      const r = await apiFetch(`${BASE_URL}/api/faq`);
      if (r.ok) setFaqs(await r.json());
    } catch { toast.error("Failed to delete."); }
  };

  if (loading) return <div className="manager-content"><div className="skeleton sk-h1"></div></div>;

  const tabBtn = (active: boolean): React.CSSProperties => ({ padding: "8px 16px", border: "none", background: active ? "#0a1628" : "#f1f5f9", color: active ? "#fff" : "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer" });

  return (
    <div className="manager-content" style={{ width: "100%" }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="help-circle" size={24} /> FAQ Manager (AEO)
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>Manage FAQs for Answer Engine Optimization. FAQs generate FAQPage schema on public pages.</p>
      </header>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button style={tabBtn(tab === "global")} onClick={() => setTab("global")}>Global FAQs</button>
        <button style={tabBtn(tab === "course")} onClick={() => setTab("course")}>Course FAQs</button>
      </div>

      {tab === "global" && (
        <>
          <div style={S.card}>
            <h3 style={S.sectionTitle}>{editing ? "Edit FAQ" : "Add New FAQ"}</h3>
            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>Question</label>
              <input style={S.input} value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="What is IINM?" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>Answer</label>
              <textarea style={{ ...S.input, minHeight: 80, resize: "vertical" }} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} placeholder="IINM is an AI-powered learning platform..." />
            </div>
            <label style={{ ...S.checkbox, marginBottom: 16 }}>
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active
            </label>
            <div style={{ display: "flex", gap: 12 }}>
              {editing && <button onClick={() => { setEditing(null); setForm({ question: "", answer: "", is_active: true }); }} style={S.btnGhost}>Cancel</button>}
              <button onClick={handleSaveGlobal} disabled={saving} style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1, cursor: saving ? "not-allowed" : "pointer" }}>{saving ? "Saving..." : "Save FAQ"}</button>
            </div>
          </div>

          <div style={S.card}>
            <h3 style={S.sectionTitle}>Existing FAQs ({faqs.length})</h3>
            {faqs.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No FAQs yet.</div>
            ) : (
              faqs.map((faq) => (
                <div key={faq.id} style={{ padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>{faq.question}</div>
                      <div style={{ fontSize: 13, color: "#64748b" }}>{faq.answer}</div>
                      {!faq.is_active && <span style={{ fontSize: 11, color: "#f59e0b" }}>Inactive</span>}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => { setEditing(faq); setForm({ question: faq.question, answer: faq.answer, is_active: faq.is_active }); }} style={{ padding: "6px 10px", border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 12, color: "#475569" }}>Edit</button>
                      <button onClick={() => handleDeleteGlobal(faq.id)} style={{ padding: "6px 10px", border: "1px solid #fecaca", background: "#fef2f2", cursor: "pointer", fontSize: 12, color: "#ef4444" }}>Delete</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {tab === "course" && (
        <div style={S.card}>
          <h3 style={S.sectionTitle}>Select a Course to Manage FAQs</h3>
          <select style={S.input} value={selectedCourse || ""} onChange={(e) => { const id = Number(e.target.value); setSelectedCourse(id); loadCourseFaqs(id); }}>
            <option value="">— Select Course —</option>
            {courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>

          {selectedCourse && (
            <div style={{ marginTop: 20 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>FAQs for selected course ({courseFaqs.length})</h4>
              {courseFaqs.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 13, border: "1px solid #e2e8f0" }}>No FAQs. Use the Course SEO page to add FAQs.</div>
              ) : (
                courseFaqs.map((faq: any) => (
                  <div key={faq.id} style={{ padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>{faq.question}</div>
                    <div style={{ fontSize: 13, color: "#64748b" }}>{faq.answer}</div>
                  </div>
                ))
              )}
              <a href="/admin/seo/courses" style={{ display: "inline-block", marginTop: 16, fontSize: 13, color: "#0a1628", textDecoration: "none", fontWeight: 600 }}>→ Go to Course SEO Manager to add/edit FAQs</a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SeoFaqsPage() {
  return <AdminProvider><SeoFaqsInner /></AdminProvider>;
}
