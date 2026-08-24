"use client";
import React, { useEffect, useState } from "react";
import { AdminProvider } from "../../components/ProtectedAdmin";
import { useToast } from "../../components/ToastProvider";
import { Icon } from "../../icons";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL } from "@/lib/config";
import JsonEditor from "../../components/JsonEditor";

const S = {
  card: { background: "#fff", border: "1px solid #e2e8f0", padding: 24, marginBottom: 16 } as React.CSSProperties,
  sectionTitle: { fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid #f1f5f9" } as React.CSSProperties,
  btnPrimary: { padding: "10px 24px", border: "none", background: "#0a1628", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" } as React.CSSProperties,
  btnGhost: { padding: "6px 14px", border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 12, color: "#475569" } as React.CSSProperties,
  hint: { fontSize: 12, color: "#94a3b8" } as React.CSSProperties,
};

function SeoSchemaInner() {
  const { showToast } = useToast();
  const toast = { success: (m: string) => showToast(m, "success"), error: (m: string) => showToast(m, "error") };
  const [loading, setLoading] = useState(true);
  const [orgSchema, setOrgSchema] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"organization" | "course" | "article" | "faq" | "breadcrumb">("organization");

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await apiFetch(`${BASE_URL}/api/seo/site`);
      if (res.ok) {
        const data = await res.json();
        setOrgSchema(data.organization_schema || "");
      }
    } catch { toast.error("Failed to load schema."); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`${BASE_URL}/api/seo/site`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organization_schema: orgSchema }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Schema saved.");
    } catch { toast.error("Failed to save."); }
    finally { setSaving(false); }
  };

  const TEMPLATES: Record<string, string> = {
    organization: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "EducationalOrganization",
      "name": "IINM",
      "url": "https://iinmedu.com",
      "logo": "https://iinmedu.com/logo.png",
      "description": "AI-Powered Connected Learning Platform",
      "address": { "@type": "PostalAddress", "addressCountry": "IN" },
      "sameAs": ["https://twitter.com/iinmedu", "https://linkedin.com/company/iinmedu"]
    }, null, 2),
    course: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Course",
      "name": "Course Name",
      "description": "Course description",
      "provider": { "@type": "Organization", "name": "IINM" }
    }, null, 2),
    article: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": "Article Title",
      "author": { "@type": "Person", "name": "Author" },
      "datePublished": "2026-01-01",
      "publisher": { "@type": "Organization", "name": "IINM" }
    }, null, 2),
    faq: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [{
        "@type": "Question",
        "name": "Question?",
        "acceptedAnswer": { "@type": "Answer", "text": "Answer" }
      }]
    }, null, 2),
    breadcrumb: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [{
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://iinmedu.com"
      }]
    }, null, 2),
  };

  if (loading) return <div className="manager-content"><div className="skeleton sk-h1"></div></div>;

  const tabBtn = (active: boolean): React.CSSProperties => ({ padding: "8px 16px", border: "none", background: active ? "#fff" : "#f8fafc", color: active ? "#0f172a" : "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer", borderBottom: active ? "2px solid #0a1628" : "2px solid transparent" });

  return (
    <div className="manager-content" style={{ width: "100%" }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="code" size={24} /> Schema.org Manager
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>Manage JSON-LD structured data. Course, Article, FAQ, and Breadcrumb schemas are auto-generated from content.</p>
      </header>

      <div style={S.card}>
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #e2e8f0", marginBottom: 16 }}>
          <button style={tabBtn(activeTab === "organization")} onClick={() => setActiveTab("organization")}>Organization</button>
          <button style={tabBtn(activeTab === "course")} onClick={() => setActiveTab("course")}>Course (Auto)</button>
          <button style={tabBtn(activeTab === "article")} onClick={() => setActiveTab("article")}>Article (Auto)</button>
          <button style={tabBtn(activeTab === "faq")} onClick={() => setActiveTab("faq")}>FAQ (Auto)</button>
          <button style={tabBtn(activeTab === "breadcrumb")} onClick={() => setActiveTab("breadcrumb")}>Breadcrumb (Auto)</button>
        </div>

        {activeTab === "organization" ? (
          <div>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>Override the default Organization/EducationalOrganization schema. Leave empty for auto-generated.</p>
            <JsonEditor value={orgSchema} onChange={setOrgSchema} minHeight={280} />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={handleSave} disabled={saving} style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1, cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "Saving..." : "Save Schema"}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Template reference — auto-generated from content data.</p>
              <button onClick={() => navigator.clipboard.writeText(TEMPLATES[activeTab])} style={S.btnGhost}>Copy Template</button>
            </div>
            <pre style={{ background: "#f8fafc", padding: 16, fontSize: 13, fontFamily: "monospace", overflow: "auto", color: "#0f172a", margin: 0 }}>
              {TEMPLATES[activeTab]}
            </pre>
          </div>
        )}
      </div>

      <div style={S.card}>
        <h3 style={S.sectionTitle}>Auto-Generated Schemas</h3>
        <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>The following schemas are automatically injected on public pages:</p>
        <ul style={{ margin: "12px 0 0", padding: "0 0 0 20px", fontSize: 13, color: "#475569", lineHeight: 1.8 }}>
          <li><strong>Organization</strong> — Home page (overridable above)</li>
          <li><strong>WebSite</strong> — Home page (with SearchAction)</li>
          <li><strong>Course</strong> — Each course detail page (with offers, instructor)</li>
          <li><strong>BlogPosting</strong> — Each blog detail page (with author, dates)</li>
          <li><strong>FAQPage</strong> — Course pages with active FAQs</li>
          <li><strong>BreadcrumbList</strong> — Course and blog detail pages</li>
        </ul>
      </div>
    </div>
  );
}

export default function SeoSchemaPage() {
  return <AdminProvider><SeoSchemaInner /></AdminProvider>;
}
