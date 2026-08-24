"use client";
import React, { useEffect, useState } from "react";
import { AdminProvider } from "../../components/ProtectedAdmin";
import { useToast } from "../../components/ToastProvider";
import { Icon } from "../../icons";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL } from "@/lib/config";
import SeoTable from "../../components/SeoTable";
import SeoSerpPreview from "../../components/SeoSerpPreview";

const STATIC_PAGES = [
  { key: "home", label: "Home" },
  { key: "courses_list", label: "Courses List" },
  { key: "blog_list", label: "Blog List" },
  { key: "about_us", label: "About Us" },
  { key: "about_iinm", label: "About IINM" },
  { key: "contact_us", label: "Contact Us" },
];

const S = {
  card: { background: "#fff", border: "1px solid #e2e8f0", padding: 24 } as React.CSSProperties,
  input: { width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" as const, outline: "none" } as React.CSSProperties,
  label: { display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: "0.5px" } as React.CSSProperties,
  hint: { fontSize: 11, color: "#94a3b8", marginTop: 4 } as React.CSSProperties,
  btnPrimary: { padding: "10px 20px", border: "none", background: "#0a1628", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" } as React.CSSProperties,
  btnGhost: { padding: "10px 20px", border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 14, cursor: "pointer" } as React.CSSProperties,
};

function SeoPagesInner() {
  const { showToast } = useToast();
  const toast = { success: (m: string) => showToast(m, "success"), error: (m: string) => showToast(m, "error") };
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ seo_title: "", seo_description: "", seo_keywords: "", canonical_path: "", og_image_url: "", schema_json_ld: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await apiFetch(`${BASE_URL}/api/seo/pages`);
      if (res.ok) {
        const data = await res.json();
        const merged = STATIC_PAGES.map(sp => {
          const existing = data.find((d: any) => d.page_key === sp.key);
          return existing || { page_key: sp.key, seo_title: null, seo_description: null, seo_keywords: null, canonical_path: null, og_image_url: null, schema_json: null, updated_at: null };
        });
        setPages(merged);
      }
    } catch { toast.error("Failed to load pages."); }
    finally { setLoading(false); }
  };

  const handleEdit = (page: any) => {
    setEditing(page);
    setForm({
      seo_title: page.seo_title || "",
      seo_description: page.seo_description || "",
      seo_keywords: page.seo_keywords || "",
      canonical_path: page.canonical_path || "",
      og_image_url: page.og_image_url || "",
      schema_json_ld: page.schema_json || "",
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`${BASE_URL}/api/seo/pages/${editing.page_key}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, page_key: editing.page_key }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Page SEO saved.");
      setEditing(null);
      load();
    } catch { toast.error("Failed to save."); }
    finally { setSaving(false); }
  };

  const handleImageUpload = async (file: File) => {
    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) { toast.error("Only PNG, JPG, JPEG, WEBP allowed."); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch(`${BASE_URL}/api/settings/site/upload`, { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setForm(prev => ({ ...prev, og_image_url: data.url }));
        toast.success("Image uploaded.");
      } else { toast.error("Upload failed."); }
    } catch { toast.error("Upload failed."); }
    finally { setUploading(false); }
  };

  if (loading) return <div className="manager-content"><div className="skeleton sk-h1"></div></div>;

  const ogPreview = form.og_image_url ? (form.og_image_url.startsWith("http") ? form.og_image_url : `${BASE_URL}${form.og_image_url}`) : "";

  return (
    <div className="manager-content" style={{ width: "100%" }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="file-text" size={24} /> Static Pages SEO
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>Manage SEO metadata for static pages.</p>
      </header>

      <SeoTable
        columns={[
          { key: "page_key", label: "Page", render: (r) => <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{r.page_key.replace(/_/g, " ")}</span> },
          { key: "seo_title", label: "Title", render: (r) => r.seo_title ? <span style={{ color: "#0f172a" }}>{r.seo_title.slice(0, 50)}{r.seo_title.length > 50 ? "..." : ""}</span> : <span style={{ color: "#cbd5e1" }}>Not set</span> },
          { key: "seo_description", label: "Description", render: (r) => r.seo_description ? <span style={{ color: "#475569" }}>{r.seo_description.slice(0, 60)}{r.seo_description.length > 60 ? "..." : ""}</span> : <span style={{ color: "#cbd5e1" }}>Not set</span> },
          { key: "updated_at", label: "Updated", render: (r) => r.updated_at ? new Date(r.updated_at).toLocaleDateString() : "—" },
          { key: "actions", label: "", render: (r) => <button onClick={(e) => { e.stopPropagation(); handleEdit(r); }} style={{ padding: "6px 14px", border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 12, color: "#475569" }}>Edit</button> },
        ]}
        data={pages}
        onRowClick={handleEdit}
      />

      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }} onClick={() => setEditing(null)}>
          <div style={{ background: "#fff", maxWidth: 700, width: "100%", maxHeight: "90vh", overflow: "auto", padding: 28 }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 800, color: "#0f172a", textTransform: "capitalize" }}>Edit SEO — {editing.page_key.replace(/_/g, " ")}</h2>

            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>SEO Title</label>
              <input style={S.input} value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} placeholder="Page title for search engines" />
              <div style={S.hint}>{form.seo_title.length}/60 chars</div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>SEO Description</label>
              <textarea style={{ ...S.input, minHeight: 70, resize: "vertical" }} value={form.seo_description} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} placeholder="Meta description (120-160 chars ideal)" />
              <div style={S.hint}>{form.seo_description.length}/160 chars</div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>Keywords (comma-separated)</label>
              <input style={S.input} value={form.seo_keywords} onChange={(e) => setForm({ ...form, seo_keywords: e.target.value })} placeholder="ai courses, programming, learning" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>Canonical Path</label>
              <input style={S.input} value={form.canonical_path} onChange={(e) => setForm({ ...form, canonical_path: e.target.value })} placeholder="/about-us" />
            </div>

            {/* OG Image upload */}
            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>OG Image</label>
              <div
                style={{ border: "1px dashed #e2e8f0", padding: "20px 16px", textAlign: "center", cursor: "pointer", background: "#fafafa", minHeight: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
                onClick={() => document.getElementById("og-img-pages")?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) handleImageUpload(e.dataTransfer.files[0]); }}
              >
                {ogPreview ? (
                  <img src={ogPreview} alt="OG preview" style={{ maxHeight: 60, maxWidth: "100%", objectFit: "contain", marginBottom: 8 }} />
                ) : (
                  <div style={{ color: "#94a3b8", marginBottom: 6 }}><Icon name="image" size={24} /></div>
                )}
                <div style={{ fontSize: 13, color: "#475569" }}>
                  {uploading ? "Uploading..." : ogPreview ? <span style={{ color: "#0a1628", fontWeight: 600 }}>Click to replace</span> : <span style={{ color: "#0a1628", fontWeight: 600 }}>Click to upload</span>}
                  {" or drag and drop"}
                </div>
                <input id="og-img-pages" type="file" accept=".png,.jpg,.jpeg,.webp" style={{ display: "none" }}
                  onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]); }} />
              </div>
              {form.og_image_url && (
                <button onClick={() => setForm({ ...form, og_image_url: "" })} style={{ marginTop: 6, padding: "4px 10px", border: "1px solid #fecaca", background: "#fef2f2", color: "#ef4444", fontSize: 12, cursor: "pointer" }}>
                  Remove image
                </button>
              )}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>Custom Schema (JSON-LD)</label>
              <textarea style={{ ...S.input, minHeight: 120, fontFamily: "monospace", fontSize: 13, resize: "vertical" }} value={form.schema_json_ld} onChange={(e) => setForm({ ...form, schema_json_ld: e.target.value })} placeholder='{"@context":"https://schema.org","@type":"WebPage",...}' />
            </div>

            <div style={{ marginBottom: 20 }}>
              <SeoSerpPreview title={form.seo_title || editing.page_key} url={`https://iinmedu.com${form.canonical_path || "/"}`} description={form.seo_description} ogImageUrl={form.og_image_url} baseUrl={BASE_URL} />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => setEditing(null)} style={S.btnGhost}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1, cursor: saving ? "not-allowed" : "pointer" }}>{saving ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SeoPagesPage() {
  return <AdminProvider><SeoPagesInner /></AdminProvider>;
}
