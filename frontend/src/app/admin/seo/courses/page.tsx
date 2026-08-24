"use client";
import React, { useEffect, useState } from "react";
import { AdminProvider } from "../../components/ProtectedAdmin";
import { useToast } from "../../components/ToastProvider";
import { Icon } from "../../icons";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL } from "@/lib/config";
import SeoTable from "../../components/SeoTable";
import CourseFaqManager from "../../components/CourseFaqManager";

const S = {
  input: { width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" as const, outline: "none" } as React.CSSProperties,
  label: { display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: "0.5px" } as React.CSSProperties,
  hint: { fontSize: 11, color: "#94a3b8", marginTop: 4 } as React.CSSProperties,
  btnPrimary: { padding: "10px 20px", border: "none", background: "#0a1628", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" } as React.CSSProperties,
  btnGhost: { padding: "10px 20px", border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 14, cursor: "pointer" } as React.CSSProperties,
};

function SeoCoursesInner() {
  const { showToast } = useToast();
  const toast = { success: (m: string) => showToast(m, "success"), error: (m: string) => showToast(m, "error") };
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ seo_title: "", seo_description: "", seo_keywords: "" });
  const [saving, setSaving] = useState(false);
  const [showFaqs, setShowFaqs] = useState<number | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await apiFetch(`${BASE_URL}/api/courses?limit=500`);
      if (res.ok) {
        const data = await res.json();
        setCourses(data.items || data || []);
      }
    } catch { toast.error("Failed to load courses."); }
    finally { setLoading(false); }
  };

  const handleEdit = (course: any) => {
    setEditing(course);
    setForm({
      seo_title: course.seo_title || "",
      seo_description: course.seo_description || "",
      seo_keywords: course.seo_keywords || "",
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`${BASE_URL}/api/courses/${editing.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Course SEO saved.");
      setEditing(null);
      load();
    } catch { toast.error("Failed to save."); }
    finally { setSaving(false); }
  };

  const filtered = courses.filter((c: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (c.title || "").toLowerCase().includes(q) || (c.slug || "").toLowerCase().includes(q);
  });

  if (loading) return <div className="manager-content"><div className="skeleton sk-h1"></div></div>;

  return (
    <div className="manager-content" style={{ width: "100%" }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="book" size={24} /> Course SEO Manager
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>Manage SEO titles, descriptions, keywords, and FAQs for each course.</p>
      </header>

      <input style={{ ...S.input, marginBottom: 16 }} placeholder="Search courses..." value={search} onChange={(e) => setSearch(e.target.value)} />

      <SeoTable
        columns={[
          { key: "title", label: "Course", render: (r) => <span style={{ fontWeight: 600 }}>{r.title}</span> },
          { key: "slug", label: "Slug", render: (r) => <span style={{ color: "#64748b", fontSize: 12 }}>/{r.slug}</span> },
          { key: "seo_title", label: "SEO Title", render: (r) => r.seo_title ? <span style={{ color: "#0f172a" }}>{r.seo_title.slice(0, 40)}{r.seo_title.length > 40 ? "..." : ""}</span> : <span style={{ color: "#cbd5e1" }}>Default</span> },
          { key: "status", label: "Status", render: (r) => <span style={{ fontSize: 12, padding: "2px 8px", background: r.status === "PUBLISHED" ? "#ecfdf5" : "#fef2f2", color: r.status === "PUBLISHED" ? "#10b981" : "#ef4444" }}>{r.status}</span> },
          { key: "actions", label: "", width: "180px", render: (r) => (
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={(e) => { e.stopPropagation(); handleEdit(r); }} style={{ padding: "6px 12px", border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 12, color: "#475569" }}>SEO</button>
              <button onClick={(e) => { e.stopPropagation(); setShowFaqs(r.id); }} style={{ padding: "6px 12px", border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 12, color: "#475569" }}>FAQs</button>
            </div>
          )},
        ]}
        data={filtered}
      />

      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }} onClick={() => setEditing(null)}>
          <div style={{ background: "#fff", maxWidth: 600, width: "100%", maxHeight: "90vh", overflow: "auto", padding: 28 }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 800, color: "#0f172a" }}>{editing.title}</h2>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#94a3b8" }}>/{editing.slug}</p>
            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>SEO Title</label>
              <input style={S.input} value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} placeholder={editing.title} />
              <div style={S.hint}>{form.seo_title.length}/60 chars</div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>SEO Description</label>
              <textarea style={{ ...S.input, minHeight: 80, resize: "vertical" }} value={form.seo_description} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} placeholder="Meta description (120-160 chars)" />
              <div style={S.hint}>{form.seo_description.length}/160 chars</div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={S.label}>Keywords</label>
              <input style={S.input} value={form.seo_keywords} onChange={(e) => setForm({ ...form, seo_keywords: e.target.value })} placeholder="ai, machine learning, course" />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => setEditing(null)} style={S.btnGhost}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1, cursor: saving ? "not-allowed" : "pointer" }}>{saving ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      )}

      {showFaqs && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }} onClick={() => setShowFaqs(null)}>
          <div style={{ background: "#fff", maxWidth: 700, width: "100%", maxHeight: "90vh", overflow: "auto", padding: 28 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a" }}>Course FAQs (AEO)</h2>
              <button onClick={() => setShowFaqs(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#94a3b8" }}>×</button>
            </div>
            <CourseFaqManager courseId={showFaqs} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function SeoCoursesPage() {
  return <AdminProvider><SeoCoursesInner /></AdminProvider>;
}
