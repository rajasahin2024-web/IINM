"use client";
import React, { useEffect, useState } from "react";
import { AdminProvider } from "../../components/ProtectedAdmin";
import { useToast } from "../../components/ToastProvider";
import { Icon } from "../../icons";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL, API_BASE_URL } from "@/lib/config";
import SeoSerpPreview from "../../components/SeoSerpPreview";
import JsonEditor from "../../components/JsonEditor";

const formatPrice = (val?: string) => {
  if (!val || val === "-1") return "—";
  if (val === "0") return "Free";
  const n = parseFloat(val);
  if (isNaN(n)) return "—";
  const per1m = n * 1_000_000;
  if (per1m < 0.001) return `$${n}`;
  return `$${per1m.toFixed(3)}/M`;
};

// ── Minimalist shared styles — no rounded edges ──
const S = {
  card: { background: "#fff", border: "1px solid #e2e8f0", padding: 24, marginBottom: 16 } as React.CSSProperties,
  input: { width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" as const, outline: "none" } as React.CSSProperties,
  label: { display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: "0.5px" } as React.CSSProperties,
  sectionTitle: { fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid #f1f5f9" } as React.CSSProperties,
  btnPrimary: { padding: "10px 24px", border: "none", background: "#0a1628", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" } as React.CSSProperties,
  btnGhost: { padding: "8px 16px", border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 13, cursor: "pointer" } as React.CSSProperties,
  hint: { fontSize: 12, color: "#94a3b8", marginTop: 6 } as React.CSSProperties,
  checkbox: { display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#475569", cursor: "pointer" } as React.CSSProperties,
};

// ── Image upload dropzone (reuses /api/settings/site/upload) ──
function ImageUpload({ label, value, onUpload }: { label: string; value: string; onUpload: (url: string) => void }) {
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputId = "img-" + label.replace(/\s/g, "-").toLowerCase();

  const handleFile = async (file: File) => {
    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) { showToast("Only PNG, JPG, JPEG, WEBP allowed.", "error"); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch(`${BASE_URL}/api/settings/site/upload`, { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        onUpload(data.url);
        showToast("Image uploaded.", "success");
      } else { showToast("Upload failed.", "error"); }
    } catch { showToast("Upload failed.", "error"); }
    finally { setUploading(false); }
  };

  const previewSrc = value ? (value.startsWith("http") ? value : `${BASE_URL}${value}`) : "";

  return (
    <div>
      <label style={S.label}>{label}</label>
      <div
        style={{ border: `1px dashed ${dragActive ? "#0a1628" : "#e2e8f0"}`, padding: "20px 16px", textAlign: "center", cursor: "pointer", background: dragActive ? "#f8fafc" : "#fafafa", transition: "all 0.15s", minHeight: 120, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
        onClick={() => document.getElementById(inputId)?.click()}
      >
        {previewSrc ? (
          <img src={previewSrc} alt="Preview" style={{ maxHeight: 80, maxWidth: "100%", objectFit: "contain", marginBottom: 8 }} />
        ) : (
          <div style={{ color: "#94a3b8", marginBottom: 8 }}><Icon name="image" size={28} /></div>
        )}
        <div style={{ fontSize: 13, color: "#475569" }}>
          {uploading ? "Uploading..." : previewSrc ? <span style={{ color: "#0a1628", fontWeight: 600 }}>Click to replace</span> : <span style={{ color: "#0a1628", fontWeight: 600 }}>Click to upload</span>}
          {" or drag and drop"}
        </div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>PNG, JPG, JPEG, WEBP</div>
        <input id={inputId} type="file" accept=".png,.jpg,.jpeg,.webp" style={{ display: "none" }}
          onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
      </div>
      {value && (
        <button onClick={() => onUpload("")} style={{ marginTop: 6, padding: "4px 10px", border: "1px solid #fecaca", background: "#fef2f2", color: "#ef4444", fontSize: 12, cursor: "pointer" }}>
          Remove image
        </button>
      )}
    </div>
  );
}

function SeoSiteInner() {
  const { showToast } = useToast();
  const toast = { success: (m: string) => showToast(m, "success"), error: (m: string) => showToast(m, "error") };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    og_image_url: "",
    twitter_handle: "",
    canonical_base_url: "",
    google_site_verification: "",
    default_robots_index: true,
    organization_schema: "",
    llms_txt: "",
    llms_full_enabled: true,
    ai_bot_allow: "{}",
  });
  const [siteName, setSiteName] = useState("IINM");
  const [metaDesc, setMetaDesc] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");

  // AI Organization Schema state
  interface ORModel { id: string; name: string; pricing?: { prompt?: string; completion?: string }; }
  const [orgModels, setOrgModels] = useState<ORModel[]>([]);
  const [orgSelectedModel, setOrgSelectedModel] = useState("");
  const [orgGenerating, setOrgGenerating] = useState(false);

  useEffect(() => { load(); }, []);

  // Fetch OpenRouter models on mount
  useEffect(() => {
    apiFetch(`${API_BASE_URL}/settings/ai/openrouter/models`)
      .then(r => r.ok ? r.json() : Promise.resolve(null))
      .then(data => {
        const list = Array.isArray(data?.data) ? data.data : [];
        setOrgModels(list);
      })
      .catch(() => setOrgModels([]));
  }, []);

  const handleGenerateOrgSchema = async () => {
    setOrgGenerating(true);
    try {
      const res = await apiFetch(`${BASE_URL}/api/seo/ai/generate-org-schema`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: orgSelectedModel || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Generation failed");
      setForm(prev => ({ ...prev, organization_schema: data.data.organization_schema }));
      toast.success("Organization schema generated. Review and Save.");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate schema.");
    } finally {
      setOrgGenerating(false);
    }
  };

  const load = async () => {
    try {
      const [seoRes, siteRes] = await Promise.all([
        apiFetch(`${BASE_URL}/api/seo/site`),
        apiFetch(`${BASE_URL}/api/settings/site`),
      ]);
      if (seoRes.ok) {
        const data = await seoRes.json();
        setForm({
          og_image_url: data.og_image_url || "",
          twitter_handle: data.twitter_handle || "",
          canonical_base_url: data.canonical_base_url || "",
          google_site_verification: data.google_site_verification || "",
          default_robots_index: data.default_robots_index !== false,
          organization_schema: data.organization_schema || "",
          llms_txt: data.llms_txt || "",
          llms_full_enabled: data.llms_full_enabled !== false,
          ai_bot_allow: data.ai_bot_allow || "{}",
        });
      }
      if (siteRes.ok) {
        const s = await siteRes.json();
        setSiteName(s.site_name || "IINM");
        setMetaDesc(s.meta_description || "");
        setFaviconUrl(s.favicon_url || "");
      }
    } catch { toast.error("Failed to load settings."); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`${BASE_URL}/api/seo/site`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("SEO settings saved.");
    } catch { toast.error("Failed to save."); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="manager-content"><div className="skeleton sk-h1"></div></div>;

  return (
    <div className="manager-content" style={{ width: "100%" }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="globe" size={24} /> Global SEO Settings
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>Configure site-wide SEO and AEO parameters.</p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* ── Left column ── */}
        <div>
          <div style={S.card}>
            <h3 style={S.sectionTitle}>Basic SEO</h3>
            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>Canonical Base URL</label>
              <input style={S.input} value={form.canonical_base_url} onChange={(e) => setForm({ ...form, canonical_base_url: e.target.value })} placeholder="https://iinmedu.com" />
              <div style={S.hint}>Used for canonical URLs and sitemap generation.</div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>Twitter / X Handle</label>
              <input style={S.input} value={form.twitter_handle} onChange={(e) => setForm({ ...form, twitter_handle: e.target.value })} placeholder="@iinmedu" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>Google Site Verification</label>
              <input style={S.input} value={form.google_site_verification} onChange={(e) => setForm({ ...form, google_site_verification: e.target.value })} placeholder="google-site-verification=..." />
              <div style={S.hint}>Paste the full verification code here. It will be added to your site&apos;s &lt;head&gt; automatically.</div>
              {/* ── Step-by-step guide ── */}
              <details style={{ marginTop: 8, border: "1px solid #e2e8f0", padding: 0 }}>
                <summary style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#0a1628", cursor: "pointer", userSelect: "none" }}>
                  How to get this code from Google Search Console
                </summary>
                <div style={{ padding: "12px 16px", fontSize: 13, color: "#475569", lineHeight: 1.7, borderTop: "1px solid #f1f5f9" }}>
                  <ol style={{ margin: 0, paddingLeft: 20 }}>
                    <li>Open <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" style={{ color: "#0a1628", fontWeight: 600 }}>Google Search Console</a></li>
                    <li>Select your property (e.g. <code style={{ fontSize: 12 }}>iinmedu.com</code>) from the top-left dropdown</li>
                    <li>Click <strong>Settings</strong> (gear icon) in the left sidebar</li>
                    <li>Under <strong>Ownership verification</strong>, click <strong>&quot;Verify ownership&quot;</strong></li>
                    <li>Find the <strong>&quot;HTML tag&quot;</strong> method and expand it</li>
                    <li>Copy the <code style={{ fontSize: 12 }}>content</code> value from the meta tag. It looks like:<br />
                      <code style={{ fontSize: 11, display: "block", marginTop: 4, padding: "6px 10px", background: "#f8fafc" }}>
                        &lt;meta name=&quot;google-site-verification&quot; content=&quot;<strong>abc123XYZ...</strong>&quot; /&gt;
                      </code>
                    </li>
                    <li>Paste only the <strong>content value</strong> (e.g. <code style={{ fontSize: 12 }}>abc123XYZ...</code>) into the field above</li>
                    <li>Click <strong>Save Settings</strong> below, then go back to GSC and click <strong>&quot;Verify&quot;</strong></li>
                  </ol>
                  <div style={{ marginTop: 10, padding: "10px 12px", background: "#f0f9ff", border: "1px solid #bae6fd", fontSize: 12, color: "#0369a1" }}>
                    Since your site is already added in GSC, verification may already be active. This field ensures the meta tag stays in your site&apos;s &lt;head&gt; for re-verification.
                  </div>
                </div>
              </details>
            </div>
            <label style={S.checkbox}>
              <input type="checkbox" checked={form.default_robots_index} onChange={(e) => setForm({ ...form, default_robots_index: e.target.checked })} />
              Allow search engines to index site by default
            </label>
          </div>

          <div style={S.card}>
            <h3 style={S.sectionTitle}>Default OG Image</h3>
            <ImageUpload
              label="Open Graph Image (1200x630 recommended)"
              value={form.og_image_url}
              onUpload={(url) => setForm({ ...form, og_image_url: url })}
            />
            <div style={S.hint}>Used when individual pages don&apos;t have their own OG image.</div>
          </div>

          <div style={S.card}>
            <h3 style={S.sectionTitle}>Organization Schema (JSON-LD)</h3>
            <JsonEditor value={form.organization_schema} onChange={(v) => setForm({ ...form, organization_schema: v })} minHeight={180} />
            <div style={S.hint}>Override the default EducationalOrganization schema. Leave empty for auto-generated.</div>

            {/* AI Generate */}
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                {orgModels.length > 0 && (
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <label style={S.label}>AI Model</label>
                    <select
                      value={orgSelectedModel}
                      onChange={e => setOrgSelectedModel(e.target.value)}
                      style={{ ...S.input, cursor: "pointer" }}
                    >
                      <option value="">Default (from AI Settings)</option>
                      {orgModels.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} — {formatPrice(m.pricing?.prompt)} / {formatPrice(m.pricing?.completion)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <button
                  onClick={handleGenerateOrgSchema}
                  disabled={orgGenerating}
                  style={{
                    padding: "10px 20px", border: "none", background: "#e63946", color: "#fff",
                    fontSize: 13, fontWeight: 600, cursor: orgGenerating ? "not-allowed" : "pointer",
                    opacity: orgGenerating ? 0.6 : 1, display: "flex", alignItems: "center", gap: 6,
                    boxShadow: "0 2px 8px rgba(230,57,70,0.2)", whiteSpace: "nowrap",
                  }}
                >
                  {orgGenerating ? "Generating..." : "✨ Generate with AI"}
                </button>
              </div>
              <div style={S.hint}>AI generates an EducationalOrganization schema using your site settings. Review and Save.</div>
            </div>
          </div>
        </div>

        {/* ── Right column ── */}
        <div>
          <div style={S.card}>
            <h3 style={S.sectionTitle}>SERP Preview</h3>
            <SeoSerpPreview
              title={siteName}
              url={form.canonical_base_url || "https://iinmedu.com"}
              description={metaDesc}
              faviconUrl={faviconUrl}
              ogImageUrl={form.og_image_url}
              baseUrl={BASE_URL}
            />
          </div>

          <div style={S.card}>
            <h3 style={S.sectionTitle}>AEO / AI Crawler Settings</h3>
            <label style={{ ...S.checkbox, marginBottom: 14 }}>
              <input type="checkbox" checked={form.llms_full_enabled} onChange={(e) => setForm({ ...form, llms_full_enabled: e.target.checked })} />
              Enable llms-full.txt (full content dump for AI models)
            </label>
            <label style={S.label}>AI Bot Allow List (JSON)</label>
            <JsonEditor value={form.ai_bot_allow} onChange={(v) => setForm({ ...form, ai_bot_allow: v })} minHeight={120} />
            <div style={S.hint}>Example: {"{ \"GPTBot\": true, \"ClaudeBot\": true, \"CCBot\": false }"}</div>
          </div>

          <div style={S.card}>
            <h3 style={S.sectionTitle}>llms.txt Override</h3>
            <textarea
              value={form.llms_txt}
              onChange={(e) => setForm({ ...form, llms_txt: e.target.value })}
              placeholder="Leave empty for auto-generated llms.txt"
              style={{ width: "100%", minHeight: 180, padding: "12px 16px", fontSize: 13, fontFamily: "monospace", border: "1.5px solid #e2e8f0", boxSizing: "border-box", resize: "vertical", outline: "none", lineHeight: 1.6 }}
            />
            <div style={S.hint}>Manual override for llms.txt. Leave empty for auto-generated content from published courses and blogs.</div>
          </div>
        </div>
      </div>

      <div style={{ position: "sticky", bottom: 0, background: "#fff", padding: "16px 0", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 16 }}>
        <button onClick={handleSave} disabled={saving}
          style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1, cursor: saving ? "not-allowed" : "pointer" }}>
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

export default function SeoSitePage() {
  return <AdminProvider><SeoSiteInner /></AdminProvider>;
}
