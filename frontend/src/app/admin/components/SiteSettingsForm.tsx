"use client";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL } from "@/lib/config";
import React, { useState, useEffect } from "react";
import { useToast } from "./ToastProvider";
import { useSiteSettings } from "./SiteSettingsContext";
import { Icon } from "../icons";

interface SiteSettingsData {
  site_name: string;
  logo_url: string;
  dark_logo_url: string;
  favicon_url: string;
  meta_description: string;
  promo_video_url: string;
  analytics_id: string;
  bing_webmaster_id: string;
  notification_bar_items: { text: string; icon_url?: string; link?: string }[];
}

function FloatingInput({ label, type = "text", value, onChange, required, isTextArea = false }: any) {
  const [focused, setFocused] = useState(false);
  const hasValue = value !== undefined && value !== null && value !== "";
  const containerStyle: React.CSSProperties = { position: "relative", width: "100%", marginBottom: "8px" };
  const labelStyle: React.CSSProperties = {
    position: "absolute", left: "14px",
    top: focused || hasValue ? "-9px" : (isTextArea ? "14px" : "50%"),
    transform: focused || hasValue ? "none" : (isTextArea ? "none" : "translateY(-50%)"),
    fontSize: focused || hasValue ? "11px" : "14px",
    fontWeight: focused || hasValue ? 600 : 400,
    color: focused ? "#38bdf8" : hasValue ? "#64748b" : "#94a3b8",
    background: focused || hasValue ? "#fff" : "transparent",
    padding: focused || hasValue ? "0 4px" : "0",
    transition: "all 0.2s cubic-bezier(.4,0,.2,1)",
    pointerEvents: "none", zIndex: 1,
    letterSpacing: focused || hasValue ? "0.3px" : "0",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "14px 16px", borderRadius: "10px",
    border: `1.5px solid ${focused ? "#38bdf8" : "#e2e8f0"}`,
    outline: "none", fontSize: "14px", color: "#0f172a", background: "#fff",
    transition: "border-color 0.2s, box-shadow 0.2s", boxSizing: "border-box",
    boxShadow: focused ? "0 0 0 3px rgba(56, 189, 248, 0.15)" : "none",
    resize: isTextArea ? "vertical" as const : "none" as const,
    fontFamily: "inherit", minHeight: isTextArea ? "100px" : "auto",
  };
  return (
    <div style={containerStyle}>
      {isTextArea ? (
        <textarea required={required} style={inputStyle} value={value} onChange={onChange}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
      ) : (
        <input type={type} required={required} style={inputStyle} value={value} onChange={onChange}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
      )}
      <label style={labelStyle}>{label}</label>
    </div>
  );
}

function ImageDropzone({ label, onUpload, previews, iconName }: { label: string; onUpload: (files: File[]) => void; previews: string[]; iconName: string; }) {
  const [dragActive, setDragActive] = useState(false);
  const inputId = "file-" + label.split(" ").join("-");
  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6, display: "block" }}>{label}</label>
      <div
        style={{ border: `2px dashed ${dragActive ? '#38bdf8' : '#e2e8f0'}`, borderRadius: 10, padding: "24px 16px", textAlign: 'center', cursor: 'pointer', background: dragActive ? '#f0f9ff' : '#f8fafc', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '160px' }}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => { e.preventDefault(); setDragActive(false); onUpload(Array.from(e.dataTransfer.files)); }}
        onClick={() => document.getElementById(inputId)?.click()}
      >
        <div style={{ color: dragActive ? '#38bdf8' : '#94a3b8', marginBottom: 12 }}><Icon name={iconName} size={32} /></div>
        <div style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>
          <span style={{ color: '#38bdf8', fontWeight: 600 }}>Click to upload</span> or drag and drop
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>PNG, JPG, JPEG, WEBP allowed</div>
        <input id={inputId} type="file" accept=".png,.jpg,.jpeg,.webp" style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files) onUpload(Array.from(e.target.files)); }} />
        {previews.length > 0 && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
            {previews.map((src, i) => <img key={i} src={src} style={{ height: 48, borderRadius: 6, objectFit: 'contain', border: '1px solid #e2e8f0', background: '#fff', padding: 2 }} alt="Preview" />)}
          </div>
        )}
      </div>
    </div>
  );
}


export default function SiteSettingsForm() {
  const { showToast } = useToast();
  const { refreshSiteSettings } = useSiteSettings();
  const toast = { success: (msg: string) => showToast(msg, 'success'), error: (msg: string) => showToast(msg, 'error') };
  const cardStyle = { background: "#fff", borderRadius: 14, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9", marginBottom: 24, overflow: "hidden" };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const baseUrl = BASE_URL;

  const [settings, setSettings] = useState<SiteSettingsData>({
    site_name: "", logo_url: "", dark_logo_url: "", favicon_url: "", meta_description: "",
    promo_video_url: "", analytics_id: "", bing_webmaster_id: "", notification_bar_items: [],
  });

  const handleFileUpload = async (file: File): Promise<string | null> => {
    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp", "image/x-icon"];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.ico')) { toast.error("Only PNG, JPG, JPEG, WEBP or ICO images are allowed."); return null; }
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await apiFetch(`${baseUrl}/api/settings/site/upload`, { method: "POST", body: formData });
      if (res.ok) { const data = await res.json(); return data.url; } // return relative path like /uploads/...
      throw new Error("Upload failed");
    } catch { toast.error("Failed to upload image."); return null; }
  };

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const res = await apiFetch(`${baseUrl}/api/settings/site`, { headers: { "Content-Type": "application/json" } });
      if (res.ok) {
        const data = await res.json();
        setSettings({
          site_name: data.site_name || "", logo_url: data.logo_url || "",
          dark_logo_url: data.dark_logo_url || "", favicon_url: data.favicon_url || "",
          meta_description: data.meta_description || "",
          promo_video_url: data.promo_video_url || "",
          analytics_id: data.analytics_id || "", bing_webmaster_id: data.bing_webmaster_id || "",
          notification_bar_items: (() => {
            try {
              const parsed = JSON.parse(data.notification_bar_items || "[]");
              if (!Array.isArray(parsed)) return [];
              return parsed.map((it: any) => typeof it === "string" ? { text: it } : { text: it.text || "", icon_url: it.icon_url, link: it.link }).filter((it: any) => it.text.trim());
            } catch { return []; }
          })(),
        });
      } else {
        toast.error("Failed to load site settings. Please refresh.");
      }
    } catch (err) { console.error("Failed to fetch site settings", err); toast.error("Network error: could not load site settings."); }
    finally { setLoading(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {};
      Object.entries(settings).forEach(([key, value]) => {
        if (key === 'banner_images') payload[key] = value;
        else if (key === 'notification_bar_items') payload[key] = JSON.stringify((value as any[]).filter(it => it.text.trim()));
        else payload[key] = (value as string).trim() === "" ? null : value;
      });
      const res = await apiFetch(`${baseUrl}/api/settings/site`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      await refreshSiteSettings();
      toast.success("Site settings updated successfully.");
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="manager-content" style={{ width: "100%" }}>
      <header style={{ marginBottom: 24 }}><div className="skeleton sk-h1"></div><div className="skeleton sk-p"></div></header>
      <div style={cardStyle}><div style={{ padding: "32px" }}><div className="skeleton sk-title"></div></div></div>
    </div>
  );

  return (
    <div className="manager-content" style={{ width: "100%" }}>
      <header style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 12 }}>
            <Icon name="globe" size={28} /> Site Settings
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "#64748b" }}>Configure global site identity, banners, SEO, and contact information.</p>
        </div>
      </header>

      <div style={cardStyle}>
        <form onSubmit={handleSave}>
          <div style={{ padding: "32px", borderBottom: "1px solid #f1f5f9" }}>

            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 24, paddingBottom: 12, borderBottom: '1px solid #e2e8f0' }}>1. General Site Identity</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
              <div style={{ gridColumn: "span 2" }}>
                <FloatingInput label="Site Name" value={settings.site_name}
                  onChange={(e: any) => setSettings({ ...settings, site_name: e.target.value })} />
              </div>
              <div>
                <ImageDropzone label="Logo Image (Light Background)" iconName="image" previews={settings.logo_url ? [settings.logo_url.startsWith('/') ? `${BASE_URL}${settings.logo_url}` : settings.logo_url] : []}
                  onUpload={async (files) => { const url = await handleFileUpload(files[0]); if (url) setSettings({ ...settings, logo_url: url }); }} />
              </div>
              <div>
                <ImageDropzone label="Dark Logo (Dark Background / Footer)" iconName="image" previews={settings.dark_logo_url ? [settings.dark_logo_url.startsWith('/') ? `${BASE_URL}${settings.dark_logo_url}` : settings.dark_logo_url] : []}
                  onUpload={async (files) => { const url = await handleFileUpload(files[0]); if (url) setSettings({ ...settings, dark_logo_url: url }); }} />
              </div>
              <div>
                <ImageDropzone label="Favicon (URL) - Tab Icon" iconName="image" previews={settings.favicon_url ? [settings.favicon_url.startsWith('/') ? `${BASE_URL}${settings.favicon_url}` : settings.favicon_url] : []}
                  onUpload={async (files) => { const url = await handleFileUpload(files[0]); if (url) setSettings({ ...settings, favicon_url: url }); }} />
              </div>
            </div>

            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #e2e8f0' }}>2. Promo Video</h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Paste a YouTube video URL to display a promo video section on the homepage. Leave blank to hide the section.
            </p>
            <div style={{ marginBottom: 32 }}>
              <FloatingInput label="YouTube Video URL (e.g. https://www.youtube.com/watch?v=...)" value={settings.promo_video_url}
                onChange={(e: any) => setSettings({ ...settings, promo_video_url: e.target.value })} />
              {settings.promo_video_url && (() => {
                const match = settings.promo_video_url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
                const vid = match?.[1];
                return vid ? (
                  <div style={{ marginTop: 12, borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0', aspectRatio: '16/9', maxWidth: 480 }}>
                    <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${vid}`}
                      title="Promo preview" frameBorder="0" allowFullScreen style={{ display: 'block' }} />
                  </div>
                ) : <p style={{ fontSize: 12, color: '#ef4444', marginTop: 8 }}>⚠️ Could not detect a valid YouTube URL.</p>;
              })()}
            </div>

            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 24, paddingBottom: 12, borderBottom: '1px solid #e2e8f0' }}>3. SEO Configuration</h3>
            <div style={{ marginBottom: 32 }}>
              <FloatingInput label="SEO Meta Description (Fallback)" isTextArea={true} value={settings.meta_description}
                onChange={(e: any) => setSettings({ ...settings, meta_description: e.target.value })} />
            </div>

            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 24, paddingBottom: 12, borderBottom: '1px solid #e2e8f0' }}>4. Analytics & Webmaster</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
              <FloatingInput label="Google Analytics ID (e.g. G-XXXXXXXXXX)" value={settings.analytics_id}
                onChange={(e: any) => setSettings({ ...settings, analytics_id: e.target.value })} />
              <FloatingInput label="Bing Webmaster Verification ID" value={settings.bing_webmaster_id}
                onChange={(e: any) => setSettings({ ...settings, bing_webmaster_id: e.target.value })} />
            </div>
            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 24 }}>
              Google Analytics ID দিলে সাইটে tracking script auto-load হবে। Bing Webmaster ID দিলে verification meta tag add হবে।
            </p>

            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #e2e8f0' }}>5. Breaking News Ticker</h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Add multiple news headlines that will scroll as a breaking news ticker on the website topbar. The ticker shows "IINM Updates:" followed by these items. For full control (icons, animation speed, colors), use the Edit button on the topbar itself.
            </p>
            <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {settings.notification_bar_items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => {
                        const items = [...settings.notification_bar_items];
                        items[idx] = { ...items[idx], text: e.target.value };
                        setSettings({ ...settings, notification_bar_items: items });
                      }}
                      placeholder={`News item ${idx + 1}...`}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1.5px solid #e2e8f0', outline: 'none', fontSize: 14, color: '#0f172a', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color 0.2s' }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#38bdf8'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(56,189,248,0.15)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const items = settings.notification_bar_items.filter((_, i) => i !== idx);
                      setSettings({ ...settings, notification_bar_items: items });
                    }}
                    style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 10, border: '1.5px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, transition: 'all 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.borderColor = '#fca5a5'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fecaca'; }}
                    title="Remove this news item"
                  >
                    ×
                  </button>
                </div>
              ))}
              {settings.notification_bar_items.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', borderRadius: 10, border: '2px dashed #e2e8f0', background: '#f8fafc', color: '#94a3b8', fontSize: 13 }}>
                  No news items added yet. Click below to add one.
                </div>
              )}
              <button
                type="button"
                onClick={() => setSettings({ ...settings, notification_bar_items: [...settings.notification_bar_items, { text: "" }] })}
                style={{ alignSelf: 'flex-start', padding: '10px 20px', borderRadius: 10, border: 'none', background: '#38bdf8', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(56,189,248,0.3)' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 8px rgba(56,189,248,0.4)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(56,189,248,0.3)'; }}
              >
                + Add News Item
              </button>
            </div>

          </div>

          <div style={{ padding: "20px 32px", background: "#f8fafc", display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" disabled={saving}
              style={{ background: "#38bdf8", color: "#fff", border: "none", padding: "12px 28px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 10, opacity: saving ? 0.7 : 1, transition: "all 0.2s", boxShadow: "0 4px 6px -1px rgba(56, 189, 248, 0.3)" }}
              onMouseEnter={e => !saving && (e.currentTarget.style.transform = "translateY(-1px)")}
              onMouseLeave={e => !saving && (e.currentTarget.style.transform = "none")}
            >
              {saving ? "Saving..." : <><Icon name="save" size={18} /> Save Settings</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
