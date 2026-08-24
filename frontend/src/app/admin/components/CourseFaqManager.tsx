"use client";
import React, { useState, useEffect } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL } from "@/lib/config";
import { useToast } from "./ToastProvider";

interface CourseFaq {
  id: number;
  question: string;
  answer: string;
  is_active: boolean;
  order_index: number;
}

/**
 * CourseFaqManager — CRUD for course-specific FAQs (AEO + FAQPage schema).
 * Minimalist design — no rounded edges.
 */
export default function CourseFaqManager({ courseId }: { courseId: number }) {
  const { showToast } = useToast();
  const toast = { success: (m: string) => showToast(m, "success"), error: (m: string) => showToast(m, "error") };
  const [faqs, setFaqs] = useState<CourseFaq[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CourseFaq | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ question: "", answer: "", is_active: true });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Array<{ question: string; answer: string }>>([]);

  useEffect(() => { loadFaqs(); }, [courseId]);

  const loadFaqs = async () => {
    try {
      const res = await apiFetch(`${BASE_URL}/api/seo/courses/${courseId}/faqs`);
      if (res.ok) setFaqs(await res.json());
    } catch { toast.error("Failed to load FAQs"); }
    finally { setLoading(false); }
  };

  const handleAiSuggest = async () => {
    setAiLoading(true);
    setAiSuggestions([]);
    try {
      const res = await apiFetch(`${BASE_URL}/api/seo/ai/suggest-faqs`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_id: courseId, count: 5 }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else if (data.suggestions && data.suggestions.length > 0) {
        setAiSuggestions(data.suggestions);
        toast.success(`AI suggested ${data.suggestions.length} FAQs. Review and add the ones you like.`);
      } else {
        toast.error("AI returned no suggestions. Try again.");
      }
    } catch { toast.error("Failed to get AI suggestions."); }
    finally { setAiLoading(false); }
  };

  const handleAddSuggestion = async (suggestion: { question: string; answer: string }) => {
    try {
      const res = await apiFetch(`${BASE_URL}/api/seo/courses/${courseId}/faqs`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: suggestion.question, answer: suggestion.answer, is_active: true }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("FAQ added from AI suggestion.");
      setAiSuggestions(prev => prev.filter(s => s.question !== suggestion.question));
      loadFaqs();
    } catch { toast.error("Failed to add FAQ."); }
  };

  const handleSave = async () => {
    if (!form.question.trim() || !form.answer.trim()) {
      toast.error("Question and answer are required.");
      return;
    }
    try {
      if (editing) {
        const res = await apiFetch(`${BASE_URL}/api/seo/course-faqs/${editing.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error("Failed");
        toast.success("FAQ updated.");
      } else {
        const res = await apiFetch(`${BASE_URL}/api/seo/courses/${courseId}/faqs`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error("Failed");
        toast.success("FAQ created.");
      }
      setShowForm(false);
      setEditing(null);
      setForm({ question: "", answer: "", is_active: true });
      loadFaqs();
    } catch { toast.error("Failed to save FAQ."); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this FAQ?")) return;
    try {
      const res = await apiFetch(`${BASE_URL}/api/seo/course-faqs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("FAQ deleted.");
      loadFaqs();
    } catch { toast.error("Failed to delete."); }
  };

  if (loading) return <div style={{ padding: 20, color: "#94a3b8" }}>Loading FAQs...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Course FAQs ({faqs.length})</h4>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleAiSuggest} disabled={aiLoading}
            style={{ padding: "8px 16px", border: "1px solid #c7d2fe", background: aiLoading ? "#e0e7ff" : "#eef2ff", color: "#4338ca", fontSize: 13, fontWeight: 600, cursor: aiLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, opacity: aiLoading ? 0.7 : 1 }}>
            {aiLoading ? "Generating..." : "AI Suggest FAQs"}
          </button>
          <button onClick={() => { setEditing(null); setForm({ question: "", answer: "", is_active: true }); setShowForm(true); }}
            style={{ padding: "8px 16px", border: "none", background: "#0a1628", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            + Add FAQ
          </button>
        </div>
      </div>

      {aiSuggestions.length > 0 && (
        <div style={{ background: "#eef2ff", padding: 16, marginBottom: 16, border: "1px solid #c7d2fe" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h5 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#4338ca" }}>AI-Generated FAQ Suggestions</h5>
            <button onClick={() => setAiSuggestions([])} style={{ padding: "4px 10px", border: "none", background: "transparent", color: "#6366f1", fontSize: 12, cursor: "pointer" }}>Dismiss all</button>
          </div>
          {aiSuggestions.map((s, i) => (
            <div key={i} style={{ background: "#fff", padding: 12, marginBottom: 8, border: "1px solid #e0e7ff" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>{s.question}</div>
              <div style={{ fontSize: 13, color: "#475569", marginBottom: 8 }}>{s.answer}</div>
              <button onClick={() => handleAddSuggestion(s)}
                style={{ padding: "5px 12px", border: "none", background: "#4f46e5", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                + Add this FAQ
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div style={{ background: "#f8fafc", padding: 16, marginBottom: 16, border: "1px solid #e2e8f0" }}>
          <input type="text" placeholder="Question" value={form.question}
            onChange={(e) => setForm({ ...form, question: e.target.value })}
            style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", fontSize: 14, marginBottom: 10, boxSizing: "border-box", outline: "none" }} />
          <textarea placeholder="Answer" value={form.answer}
            onChange={(e) => setForm({ ...form, answer: e.target.value })}
            style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", fontSize: 14, minHeight: 80, marginBottom: 10, boxSizing: "border-box", resize: "vertical", outline: "none" }} />
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#475569", cursor: "pointer" }}>
              <input type="checkbox" checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Active
            </label>
            <div style={{ flex: 1 }} />
            <button onClick={() => { setShowForm(false); setEditing(null); }}
              style={{ padding: "8px 16px", border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 13, cursor: "pointer" }}>
              Cancel
            </button>
            <button onClick={handleSave}
              style={{ padding: "8px 16px", border: "none", background: "#0a1628", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Save
            </button>
          </div>
        </div>
      )}

      {faqs.length === 0 && !showForm && (
        <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13, border: "1px solid #e2e8f0" }}>
          No FAQs yet. Add one to improve AEO ranking.
        </div>
      )}

      {faqs.map((faq) => (
        <div key={faq.id} style={{ background: "#fff", padding: 14, marginBottom: 10, border: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>{faq.question}</div>
              <div style={{ fontSize: 13, color: "#64748b" }}>{faq.answer}</div>
              {!faq.is_active && <span style={{ fontSize: 11, color: "#f59e0b", marginTop: 4, display: "inline-block" }}>Inactive</span>}
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button onClick={() => { setEditing(faq); setForm({ question: faq.question, answer: faq.answer, is_active: faq.is_active }); setShowForm(true); }}
                style={{ padding: "6px 10px", border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 12, color: "#475569" }}>
                Edit
              </button>
              <button onClick={() => handleDelete(faq.id)}
                style={{ padding: "6px 10px", border: "1px solid #fecaca", background: "#fef2f2", cursor: "pointer", fontSize: 12, color: "#ef4444" }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
