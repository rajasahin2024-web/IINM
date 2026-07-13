"use client";
import React, { useState, useEffect, useRef } from "react";
import { AdminProvider } from "../../../components/ProtectedAdmin";
import { useToast } from "../../../components/ToastProvider";
import { Icon } from "../../../icons";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL } from "@/lib/config";

const BASE = BASE_URL;

/* ── Floating Label Input ── */
function FInput({ label, value, onChange, type = "text", isTextArea = false }: any) {
  const [f, setF] = useState(false);
  const has = value !== "" && value !== null && value !== undefined;
  const base: React.CSSProperties = {
    width: "100%", padding: "14px 16px", borderRadius: 10, outline: "none", fontSize: 14,
    color: "#0f172a", background: "#fff", boxSizing: "border-box", fontFamily: "inherit",
    border: `1.5px solid ${f ? "#38bdf8" : "#e2e8f0"}`,
    boxShadow: f ? "0 0 0 3px rgba(56,189,248,.15)" : "none",
    transition: "border-color .2s,box-shadow .2s",
    resize: isTextArea ? "vertical" as const : "none" as const,
    minHeight: isTextArea ? 90 : undefined,
  };
  const lbl: React.CSSProperties = {
    position: "absolute", left: 14,
    top: f || has ? -9 : (isTextArea ? 14 : "50%"),
    transform: f || has ? "none" : (isTextArea ? "none" : "translateY(-50%)"),
    fontSize: f || has ? 11 : 14, fontWeight: f || has ? 600 : 400,
    color: f ? "#38bdf8" : has ? "#64748b" : "#94a3b8",
    background: f || has ? "#fff" : "transparent",
    padding: f || has ? "0 4px" : "0",
    transition: "all .2s cubic-bezier(.4,0,.2,1)", pointerEvents: "none", zIndex: 1,
  };
  return (
    <div style={{ position: "relative", width: "100%", marginBottom: 8 }}>
      {isTextArea
        ? <textarea style={base} value={value} onChange={onChange} onFocus={() => setF(true)} onBlur={() => setF(false)} />
        : <input type={type} style={base} value={value} onChange={onChange} onFocus={() => setF(true)} onBlur={() => setF(false)} />
      }
      <label style={lbl}>{label}</label>
    </div>
  );
}

function SectionHeader({ num, title }: { num: string; title: string }) {
  return (
    <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 20px", paddingBottom: 12, borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ background: "#38bdf8", color: "#fff", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{num}</span>
      {title}
    </h3>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9",
  boxShadow: "0 4px 6px -1px rgba(0,0,0,.05)", marginBottom: 24, overflow: "hidden",
};
const padded: React.CSSProperties = { padding: "28px 32px" };
const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 };

type S = {
  phone1: string; phone2: string; whatsapp: string; email1: string; email2: string;
  address_line1: string; address_line2: string; city: string; state: string;
  pin_code: string; country: string; weekday_hours: string; weekend_hours: string;
  map_embed_url: string;
  facebook_url: string; instagram_url: string; linkedin_url: string; youtube_url: string; twitter_url: string;
};

const empty: S = {
  phone1: "", phone2: "", whatsapp: "", email1: "", email2: "",
  address_line1: "", address_line2: "", city: "", state: "", pin_code: "", country: "",
  weekday_hours: "", weekend_hours: "", map_embed_url: "",
  facebook_url: "", instagram_url: "", linkedin_url: "", youtube_url: "", twitter_url: "",
};

/* ── Page wrapper — AdminProvider must be outermost ── */
export default function ContactUsSettingsPage() {
  return (
    <AdminProvider>
      <ContactUsSettingsInner />
    </AdminProvider>
  );
}

/* ── Inner component — runs inside ToastProvider ── */
function ContactUsSettingsInner() {
  const { showToast } = useToast();
  const toast = { success: (m: string) => showToast(m, "success"), error: (m: string) => showToast(m, "error") };

  const [settings, setSettings] = useState<S>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banners, setBanners] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [tab, setTab] = useState<"settings" | "banners" | "inquiries">("settings");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
    fetchBanners();
    fetchInquiries();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await apiFetch(`${BASE}/api/contact/settings`);
      if (res.ok) {
        const d = await res.json();
        setSettings({ ...empty, ...Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v ?? ""])) } as S);
      }
    } finally { setLoading(false); }
  };

  const fetchBanners = async () => {
    const res = await apiFetch(`${BASE}/api/contact/banners/all`);
    if (res.ok) setBanners(await res.json());
  };

  const fetchInquiries = async () => {
    const res = await apiFetch(`${BASE}/api/contact/inquiries?limit=50`);
    if (res.ok) { const d = await res.json(); setInquiries(d.items || []); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {};
      Object.entries(settings).forEach(([k, v]) => { payload[k] = (v as string).trim() === "" ? null : v; });
      const res = await apiFetch(`${BASE}/api/contact/settings`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Contact settings saved!");
    } catch { toast.error("Failed to save settings."); }
    finally { setSaving(false); }
  };

  const handleBannerUpload = async (file: File) => {
    setUploading(true);
    const fd = new FormData(); fd.append("file", file);
    try {
      const res = await apiFetch(`${BASE}/api/contact/banners/upload`, { method: "POST", body: fd });
      if (!res.ok) throw new Error();
      toast.success("Banner uploaded!");
      fetchBanners();
    } catch { toast.error("Upload failed."); }
    finally { setUploading(false); }
  };

  const deleteBanner = async (id: number) => {
    if (!confirm("Delete this banner?")) return;
    await apiFetch(`${BASE}/api/contact/banners/${id}`, { method: "DELETE" });
    fetchBanners();
  };

  const toggleBanner = async (id: number) => {
    await apiFetch(`${BASE}/api/contact/banners/${id}/toggle`, { method: "PATCH" });
    fetchBanners();
  };

  const set = (k: keyof S) => (e: any) => setSettings(p => ({ ...p, [k]: e.target.value }));

  if (loading) return (
    <div className="manager-content" style={{ width: "100%" }}>
      <div style={{ padding: 32 }}><div className="skeleton sk-h1" /><div className="skeleton sk-p" style={{ marginTop: 8 }} /></div>
    </div>
  );

  const TABS = [
    { id: "settings", label: "Contact Info", icon: "phone" },
    { id: "banners", label: "Carousel Banners", icon: "image" },
    { id: "inquiries", label: "Inquiries", icon: "mail" },
  ] as const;

  return (
    <div className="manager-content" style={{ width: "100%" }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 12 }}>
          <Icon name="phone" size={28} /> Contact Us Settings
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: "#64748b" }}>
          Manage all details shown on the public Contact Us page.
        </p>
      </header>

      {/* Tab Bar */}
      <div style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 12, padding: 4, marginBottom: 24, width: "fit-content" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: "8px 18px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
              background: tab === t.id ? "#fff" : "transparent",
              color: tab === t.id ? "#0f172a" : "#64748b",
              boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,.08)" : "none",
              transition: "all .2s", display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name={t.icon} size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Contact Info ── */}
      {tab === "settings" && (
        <form onSubmit={handleSave}>
          <div style={cardStyle}>
            <div style={padded}>
              <SectionHeader num="1" title="Phone & Email" />
              <div style={grid2}>
                <FInput label="Phone 1" value={settings.phone1} onChange={set("phone1")} />
                <FInput label="Phone 2" value={settings.phone2} onChange={set("phone2")} />
                <FInput label="WhatsApp Number" value={settings.whatsapp} onChange={set("whatsapp")} />
                <FInput label="Email 1" type="email" value={settings.email1} onChange={set("email1")} />
                <FInput label="Email 2" type="email" value={settings.email2} onChange={set("email2")} />
              </div>

              <SectionHeader num="2" title="Address" />
              <div style={{ marginBottom: 24 }}>
                <div style={{ marginBottom: 8 }}><FInput label="Address Line 1" value={settings.address_line1} onChange={set("address_line1")} /></div>
                <div style={{ marginBottom: 8 }}><FInput label="Address Line 2 (Optional)" value={settings.address_line2} onChange={set("address_line2")} /></div>
                <div style={grid2}>
                  <FInput label="City" value={settings.city} onChange={set("city")} />
                  <FInput label="State" value={settings.state} onChange={set("state")} />
                  <FInput label="PIN Code" value={settings.pin_code} onChange={set("pin_code")} />
                  <FInput label="Country" value={settings.country} onChange={set("country")} />
                </div>
              </div>

              <SectionHeader num="3" title="Office Hours" />
              <div style={grid2}>
                <FInput label="Weekday Hours (e.g. Mon–Fri: 9AM–6PM)" value={settings.weekday_hours} onChange={set("weekday_hours")} />
                <FInput label="Weekend Hours (e.g. Sat: 10AM–2PM)" value={settings.weekend_hours} onChange={set("weekend_hours")} />
              </div>

              <SectionHeader num="4" title="Google Maps Embed" />
              <div style={{ marginBottom: 24 }}>
                <FInput 
                  label="Google Maps iframe src URL (Paste full <iframe> code or src link)" 
                  value={settings.map_embed_url} 
                  onChange={(e: any) => {
                    let val = e.target.value;
                    const srcMatch = val.match(/src="([^"]+)"/);
                    if (srcMatch && srcMatch[1]) val = srcMatch[1];
                    setSettings((p: any) => ({ ...p, map_embed_url: val }));
                  }} 
                  isTextArea 
                />
                
                {settings.map_embed_url && !settings.map_embed_url.includes("embed") && settings.map_embed_url.includes("http") && (
                  <div style={{ marginTop: 12, padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#dc2626", fontSize: 13, display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 18, lineHeight: 1 }}>⚠️</span>
                    <div>
                      <strong style={{ display: "block", marginBottom: 4 }}>Invalid Map URL</strong>
                      This looks like a regular Google Maps link which blocks embedding. To embed the map:
                      <ol style={{ margin: "6px 0 0", paddingLeft: 16 }}>
                        <li>Open Google Maps and search your location</li>
                        <li>Click <b>Share</b> {'>'} <b>Embed a map</b></li>
                        <li>Click <b>Copy HTML</b> and paste it directly above.</li>
                      </ol>
                    </div>
                  </div>
                )}

                {settings.map_embed_url && settings.map_embed_url.includes("embed") && (
                  <div style={{ marginTop: 12, borderRadius: 10, overflow: "hidden", border: "1px solid #e2e8f0", height: 200 }}>
                    <iframe src={settings.map_embed_url} width="100%" height="200" style={{ border: 0, display: "block" }} allowFullScreen loading="lazy" />
                  </div>
                )}
              </div>

              <SectionHeader num="5" title="Social Media Links" />
              <div style={grid2}>
                {[
                  { k: "facebook_url", label: "Facebook URL" },
                  { k: "instagram_url", label: "Instagram URL" },
                  { k: "linkedin_url", label: "LinkedIn URL" },
                  { k: "youtube_url", label: "YouTube URL" },
                  { k: "twitter_url", label: "Twitter / X URL" },
                ].map(({ k, label }) => (
                  <FInput key={k} label={label} value={(settings as any)[k]} onChange={set(k as keyof S)} />
                ))}
              </div>
            </div>
            <div style={{ padding: "16px 32px", background: "#f8fafc", display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" disabled={saving}
                style={{ background: "#38bdf8", color: "#fff", border: "none", padding: "12px 28px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 6px -1px rgba(56,189,248,.3)" }}
                onMouseEnter={e => !saving && (e.currentTarget.style.transform = "translateY(-1px)")}
                onMouseLeave={e => !saving && (e.currentTarget.style.transform = "none")}>
                {saving ? "Saving..." : <><Icon name="save" size={16} /> Save Settings</>}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ── Tab: Banners ── */}
      {tab === "banners" && (
        <div>
          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <div style={padded}>
              <SectionHeader num="+" title="Upload New Banner" />
              <div
                onClick={() => fileRef.current?.click()}
                style={{ border: "2px dashed #e2e8f0", borderRadius: 10, padding: "32px 16px", textAlign: "center", cursor: "pointer", background: "#f8fafc", transition: "all .2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#38bdf8"; e.currentTarget.style.background = "#f0f9ff"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "#f8fafc"; }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleBannerUpload(f); }}
              >
                <Icon name="image" size={36} />
                <p style={{ margin: "12px 0 4px", fontSize: 14, color: "#475569", fontWeight: 500 }}>
                  <span style={{ color: "#38bdf8", fontWeight: 700 }}>Click to upload</span> or drag & drop
                </p>
                <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>PNG, JPG, WEBP — recommended 1920×600px</p>
                {uploading && <p style={{ margin: "12px 0 0", fontSize: 13, color: "#38bdf8", fontWeight: 600 }}>Uploading...</p>}
              </div>
              <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp" style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleBannerUpload(f); e.target.value = ""; }} />
            </div>
          </div>

          {banners.length === 0 ? (
            <div style={{ ...cardStyle, padding: "48px 32px", textAlign: "center", color: "#94a3b8" }}>
              <Icon name="image" size={40} />
              <p style={{ marginTop: 12, fontWeight: 600 }}>No banners uploaded yet</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: 16 }}>
              {banners.map((b, idx) => (
                <div key={b.id} style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0", background: "#fff", boxShadow: "0 2px 4px rgba(0,0,0,.05)" }}>
                  <div style={{ position: "relative", height: 160, background: "#f1f5f9" }}>
                    <img src={`${BASE}${b.image_url}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 6 }}>
                      <button onClick={() => toggleBanner(b.id)}
                        style={{ background: b.is_active ? "#10b981" : "#94a3b8", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        {b.is_active ? "Active" : "Hidden"}
                      </button>
                      <button onClick={() => deleteBanner(b.id)}
                        style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        Delete
                      </button>
                    </div>
                  </div>
                  <div style={{ padding: "10px 14px", fontSize: 12, color: "#64748b", fontWeight: 500 }}>
                    #{idx + 1} — {b.image_url.split("/").pop()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Inquiries ── */}
      {tab === "inquiries" && (
        <div style={cardStyle}>
          <div style={{ padding: "20px 28px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Submitted Inquiries</h2>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>{inquiries.length} total</p>
            </div>
            <button onClick={fetchInquiries} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="refresh-cw" size={14} /> Refresh
            </button>
          </div>
          {inquiries.length === 0 ? (
            <div style={{ padding: "48px 32px", textAlign: "center", color: "#94a3b8" }}>
              <Icon name="mail" size={40} />
              <p style={{ marginTop: 12, fontWeight: 600 }}>No inquiries yet</p>
            </div>
          ) : (
            <div>
              {inquiries.map(inq => (
                <div key={inq.id} style={{ padding: "16px 28px", borderBottom: "1px solid #f8fafc", display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: inq.is_read ? "#f1f5f9" : "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon name="user" size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{inq.name}</span>
                      {inq.interest && <span style={{ background: "#ede9fe", color: "#7c3aed", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{inq.interest}</span>}
                      {!inq.is_read && <span style={{ background: "#fef3c7", color: "#d97706", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>New</span>}
                    </div>
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{inq.email}{inq.phone && ` · ${inq.phone}`}</div>
                    {inq.message && <p style={{ margin: "6px 0 0", fontSize: 13, color: "#475569", lineHeight: 1.5 }}>{inq.message}</p>}
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{inq.created_at ? new Date(inq.created_at).toLocaleString() : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
