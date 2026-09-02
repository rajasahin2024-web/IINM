"use client";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { AdminProvider } from "../../components/ProtectedAdmin";
import { useToast } from "../../components/ToastProvider";
import { Icon } from "../../icons";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL, API_BASE_URL } from "@/lib/config";
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

const formatPrice = (val?: string) => {
  if (!val || val === "-1") return "—";
  if (val === "0") return "Free";
  const n = parseFloat(val);
  if (isNaN(n)) return "—";
  const per1m = n * 1_000_000;
  if (per1m < 0.001) return `$${n}`;
  return `$${per1m.toFixed(3)}/M`;
};

const SEO_MODAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  .seop-modal {
    position: fixed; inset: 0; z-index: 99999;
    display: flex; flex-direction: column;
    background: #f8fafc;
    font-family: 'Inter', system-ui, sans-serif;
    animation: seop-slide-in .22s cubic-bezier(.4,0,.2,1);
    overflow: hidden;
  }
  @keyframes seop-slide-in { from{opacity:0;transform:scale(.97)} to{opacity:1;transform:scale(1)} }
  @keyframes seop-spin { to { transform: rotate(360deg); } }

  .seop-header {
    background: #0f172a; padding: 14px 24px;
    display: flex; align-items: center; justify-content: space-between;
    box-shadow: 0 2px 12px rgba(0,0,0,.25); flex-shrink: 0;
  }
  .seop-header h2 { margin: 0; font-size: 1rem; font-weight: 700; color: #fff; letter-spacing: -.2px; }
  .seop-header p  { margin: 1px 0 0; font-size: .75rem; color: #94a3b8; }
  .seop-close-btn {
    width: 34px; height: 34px; border-radius: 8px; border: none;
    background: rgba(255,255,255,.08); color: #94a3b8; cursor: pointer;
    display: flex; align-items: center; justify-content: center; transition: background .15s;
    font-size: 16px;
  }
  .seop-close-btn:hover { background: rgba(255,255,255,.18); color: #fff; }

  .seop-body { display: flex; flex: 1; overflow: hidden; }
  .seop-left {
    flex: 4; display: flex; flex-direction: column;
    border-right: 1px solid #e2e8f0; background: #fff;
    padding: 24px; overflow-y: auto;
  }
  .seop-right {
    flex: 6; background: #f8fafc; padding: 24px;
    overflow-y: auto; border-left: 1px solid #e2e8f0;
  }

  .seop-section-title {
    font-size: .75rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: .05em; color: #64748b; margin: 0 0 10px;
  }

  .seop-prompt {
    width: 100%; border: 1.5px solid #e2e8f0; border-radius: 10px;
    padding: 14px; font-size: .9rem; color: #0f172a; background: #f8fafc;
    resize: vertical; min-height: 160px; outline: none; font-family: inherit; line-height: 1.6;
    transition: all .2s; box-sizing: border-box;
  }
  .seop-prompt:focus { border-color: #e63946; box-shadow: 0 0 0 3px rgba(230,57,70,.15); background: #fff; }

  .seop-select {
    width: 100%; padding: 11px 14px; border: 1.5px solid #e2e8f0; border-radius: 8px;
    font-size: .88rem; color: #0f172a; background: #fff; outline: none;
    transition: all .2s; box-sizing: border-box; font-family: inherit; cursor: pointer;
  }
  .seop-select:focus { border-color: #e63946; box-shadow: 0 0 0 3px rgba(230,57,70,.15); }

  .seop-generate-btn {
    width: 100%; padding: 13px; background: #e63946; color: #fff; border: none; border-radius: 10px;
    font-size: .95rem; font-weight: 700; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 10px;
    transition: all .2s; margin-top: 8px; box-shadow: 0 4px 14px rgba(230,57,70,.25);
  }
  .seop-generate-btn:hover:not(:disabled) { background: #d12d3a; box-shadow: 0 6px 20px rgba(230,57,70,.35); }
  .seop-generate-btn:disabled { opacity: .6; cursor: not-allowed; }
  .seop-spinner {
    width: 18px; height: 18px; border: 2.5px solid rgba(255,255,255,.3);
    border-top-color: #fff; border-radius: 50%; animation: seop-spin .7s linear infinite;
  }

  .seop-footer {
    display: flex; justify-content: flex-end; gap: 12px;
    padding-top: 16px; border-top: 1px solid #e2e8f0;
  }

  @media (max-width: 900px) {
    .seop-body { flex-direction: column; }
    .seop-left { border-right: none; border-bottom: 1px solid #e2e8f0; flex: none; }
    .seop-right { border-left: none; }
  }
`;

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

  // AI panel state
  interface ORModel { id: string; name: string; pricing?: { prompt?: string; completion?: string }; }
  const [models, setModels] = useState<ORModel[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [generating, setGenerating] = useState(false);

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
    const label = (page.page_key || "").replace(/_/g, " ");
    setCustomPrompt(`Generate SEO meta for the "${label}" page of IINM, an AI-powered connected learning platform. Highlight relevant courses, value propositions, and a clear call-to-action.`);
    setSelectedModel("");
    // Fetch OpenRouter models once per modal open (event-driven, not a top-level effect)
    apiFetch(`${API_BASE_URL}/settings/ai/openrouter/models`)
      .then(r => r.ok ? r.json() : Promise.resolve(null))
      .then(data => {
        const list = Array.isArray(data?.data) ? data.data : [];
        setModels(list);
      })
      .catch(() => setModels([]));
  };

  const handleGenerate = async () => {
    if (!editing) return;
    setGenerating(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/settings/ai/generate_seo_page`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_key: editing.page_key,
          page_name: editing.page_key.replace(/_/g, " "),
          canonical_path: form.canonical_path || null,
          custom_prompt: customPrompt,
          model: selectedModel || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Generation failed");
      const { seo_title, seo_description, seo_keywords, schema_json_ld } = data.data || {};
      setForm(prev => ({
        ...prev,
        seo_title: seo_title || prev.seo_title,
        seo_description: seo_description || prev.seo_description,
        seo_keywords: seo_keywords || prev.seo_keywords,
        schema_json_ld: schema_json_ld || prev.schema_json_ld,
      }));
      toast.success("SEO meta generated. Review and Save.");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate SEO meta.");
    } finally {
      setGenerating(false);
    }
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

      {editing && typeof window !== "undefined" && ReactDOM.createPortal(
        <>
          <style dangerouslySetInnerHTML={{ __html: SEO_MODAL_CSS }} />
          <div className="seop-modal">
            <div className="seop-header">
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 38, height: 38, background: "#e63946", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="file-text" size={20} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#fff", textTransform: "capitalize" }}>
                    Edit SEO — {editing.page_key.replace(/_/g, " ")}
                  </h2>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>
                    AI-assisted SEO metadata editor • powered by OpenRouter
                  </p>
                </div>
              </div>
              <button className="seop-close-btn" onClick={() => setEditing(null)} title="Close">✕</button>
            </div>

            <div className="seop-body">
              {/* ── LEFT: AI Assistant ── */}
              <div className="seop-left">
                <p className="seop-section-title">AI SEO Assistant</p>
                <p style={{ margin: "0 0 14px", fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
                  Describe what this page is about. AI will generate the <b>SEO Title</b>, <b>Description</b>, and <b>Keywords</b> for you.
                </p>

                <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6, display: "block" }}>Custom Prompt</label>
                <textarea
                  className="seop-prompt"
                  placeholder="e.g., Generate SEO meta for the About Us page — highlight IINM's mission, AI-powered learning, and student outcomes..."
                  value={customPrompt}
                  onChange={e => setCustomPrompt(e.target.value)}
                />

                <div style={{ marginTop: 16, marginBottom: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6, display: "block" }}>AI Model</label>
                  <select
                    value={selectedModel}
                    onChange={e => setSelectedModel(e.target.value)}
                    className="seop-select"
                  >
                    <option value="">Default (from AI Settings)</option>
                    {models.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} — {formatPrice(m.pricing?.prompt)} / {formatPrice(m.pricing?.completion)}
                      </option>
                    ))}
                  </select>
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8" }}>
                    {models.length > 0 ? `${models.length} models available • pricing per 1M tokens` : "Configure OpenRouter API key in AI Settings to enable model selection."}
                  </p>
                </div>

                <button className="seop-generate-btn" onClick={handleGenerate} disabled={generating || !customPrompt.trim()}>
                  {generating ? <span className="seop-spinner" /> : <><Icon name="zap" size={16} /> Generate SEO Meta</>}
                </button>
                <p style={{ textAlign: "center", fontSize: 12, color: "#94a3b8", marginTop: 12 }}>
                  Generates Title, Description, Keywords &amp; JSON-LD Schema. Review the SERP preview, then Save.
                </p>
              </div>

              {/* ── RIGHT: SEO Form ── */}
              <div className="seop-right">
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

                <div className="seop-footer">
                  <button onClick={() => setEditing(null)} style={S.btnGhost}>Cancel</button>
                  <button onClick={handleSave} disabled={saving} style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1, cursor: saving ? "not-allowed" : "pointer" }}>{saving ? "Saving..." : "Save"}</button>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

export default function SeoPagesPage() {
  return <AdminProvider><SeoPagesInner /></AdminProvider>;
}
