"use client";
import React, { useState, useEffect, useContext } from "react";
import { AdminProvider } from "../../../components/ProtectedAdmin";
import { useToast } from "../../../components/ToastProvider";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL } from "@/lib/config";

const API = BASE_URL;

function FInput({ label, value, onChange, type = "text", isTextArea = false, rows = 3 }: any) {
  const [f, setF] = useState(false);
  const has = value !== "" && value !== null && value !== undefined;
  
  const base: React.CSSProperties = {
    width: "100%", padding: "16px 14px", borderRadius: 12, fontSize: 14, outline: "none",
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
        ? <textarea style={base} value={value || ""} onChange={onChange} onFocus={() => setF(true)} onBlur={() => setF(false)} rows={rows} />
        : <input type={type} style={base} value={value || ""} onChange={onChange} onFocus={() => setF(true)} onBlur={() => setF(false)} />
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


function AboutUsSettingsInner() {
  const { showToast } = useToast();
  const [tab, setTab] = useState("settings");
  
  // Settings
  const [settings, setSettings] = useState<any>({
    mission_statement: "", vision_statement: "", story_title: "", story_text: "",
    stats_years: "", stats_students: "", stats_courses: "",
    director_name: "", director_title: "", director_message: "", director_image_url: ""
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Banners
  const [banners, setBanners] = useState<any[]>([]);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Core Values
  const [values, setValues] = useState<any[]>([]);
  const [newVal, setNewVal] = useState({ title: "", description: "", icon_name: "Star" });
  const [addingVal, setAddingVal] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const sUrl = `${API}/api/about/settings`;
    const bUrl = `${API}/api/about/banners/all`;
    const cUrl = `${API}/api/about/core-values`;
    try {
      const [sRes, bRes, cRes] = await Promise.all([
        apiFetch(sUrl), apiFetch(bUrl), apiFetch(cUrl)
      ]);
      if (sRes.ok) setSettings(await sRes.json() || {});
      if (bRes.ok) setBanners(await bRes.json() || []);
      if (cRes.ok) setValues(await cRes.json() || []);
    } catch (e) {
      console.error(e);
      showToast("Failed to load about data.", "error");
    }
  };

  const set = (k: string) => (e: any) => setSettings((p: any) => ({ ...p, [k]: e.target.value }));

  // Settings Handlers
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await apiFetch(`${API}/api/about/settings`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      if (res.ok) showToast("Settings saved.", "success");
      else showToast("Failed to save settings.", "error");
    } catch { showToast("Error saving.", "error"); }
    finally { setSavingSettings(false); }
  };

  const uploadDirectorImage = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await apiFetch(`${API}/api/about/upload-director-image`, {
        method: "POST", body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setSettings((p: any) => ({ ...p, director_image_url: data.url }));
        showToast("Image uploaded successfully.", "success");
      } else showToast("Upload failed.", "error");
    } catch { showToast("Upload error.", "error"); }
  };

  // Banner Handlers
  const handleUploadBanner = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await apiFetch(`${API}/api/about/banners/upload`, {
        method: "POST", body: formData
      });
      if (res.ok) {
        showToast("Banner uploaded", "success");
        loadData();
      } else showToast("Upload failed", "error");
    } catch { showToast("Upload error", "error"); }
    finally { setUploadingBanner(false); }
  };

  const toggleBanner = async (id: number) => {
    try {
      await apiFetch(`${API}/api/about/banners/${id}/toggle`, { method: "PATCH" });
      loadData();
    } catch { showToast("Toggle failed", "error"); }
  };

  const deleteBanner = async (id: number) => {
    if (!confirm("Delete this banner?")) return;
    try {
      await apiFetch(`${API}/api/about/banners/${id}`, { method: "DELETE" });
      loadData();
    } catch { showToast("Delete failed", "error"); }
  };

  // Core Value Handlers
  const addCoreValue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVal.title) return;
    setAddingVal(true);
    try {
      const res = await apiFetch(`${API}/api/about/core-values`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newVal)
      });
      if (res.ok) {
        showToast("Core value added", "success");
        setNewVal({ title: "", description: "", icon_name: "Star" });
        loadData();
      } else showToast("Failed to add", "error");
    } catch { showToast("Error adding value", "error"); }
    finally { setAddingVal(false); }
  };

  const deleteCoreValue = async (id: number) => {
    if (!confirm("Delete this core value?")) return;
    try {
      await apiFetch(`${API}/api/about/core-values/${id}`, { method: "DELETE" });
      loadData();
    } catch { showToast("Delete failed", "error"); }
  };

  const activeTabStyle: React.CSSProperties = { background: "#0f172a", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" };
  const inactiveTabStyle: React.CSSProperties = { background: "transparent", color: "#64748b", border: "none", padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" };
  const cardStyle: React.CSSProperties = { background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", marginBottom: 32, boxShadow: "0 4px 12px rgba(0,0,0,0.02)" };
  const padded: React.CSSProperties = { padding: 32 };
  const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 };

  return (
    <div style={{ padding: "40px 48px", width: "100%", fontFamily: "'Inter', sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: "0 0 8px" }}>About Us Configuration</h1>
      <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 32px" }}>Manage content, banners, and stats for the public About Us page.</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 24, background: "#f1f5f9", padding: 6, borderRadius: 12, width: "fit-content" }}>
        <button onClick={() => setTab("settings")} style={tab === "settings" ? activeTabStyle : inactiveTabStyle}>General Content</button>
        <button onClick={() => setTab("banners")} style={tab === "banners" ? activeTabStyle : inactiveTabStyle}>Hero Banners</button>
        <button onClick={() => setTab("values")} style={tab === "values" ? activeTabStyle : inactiveTabStyle}>Core Values</button>
      </div>

      {tab === "settings" && (
        <form onSubmit={handleSaveSettings}>
          <div style={cardStyle}>
            <div style={padded}>
              <SectionHeader num="1" title="Mission & Vision" />
              <div style={grid2}>
                <FInput label="Mission Statement" value={settings.mission_statement} onChange={set("mission_statement")} isTextArea rows={4} />
                <FInput label="Vision Statement" value={settings.vision_statement} onChange={set("vision_statement")} isTextArea rows={4} />
              </div>

              <SectionHeader num="2" title="Our Story" />
              <div style={{ marginBottom: 24 }}>
                <FInput label="Story Title (e.g. How We Started)" value={settings.story_title} onChange={set("story_title")} />
                <FInput label="Full Story Text" value={settings.story_text} onChange={set("story_text")} isTextArea rows={6} />
              </div>

              <SectionHeader num="3" title="Impact in Numbers" />
              <div style={grid2}>
                <FInput label="Years of Excellence (e.g. 10+)" value={settings.stats_years} onChange={set("stats_years")} />
                <FInput label="Students Taught (e.g. 5,000+)" value={settings.stats_students} onChange={set("stats_students")} />
                <FInput label="Courses Offered (e.g. 50+)" value={settings.stats_courses} onChange={set("stats_courses")} />
                <div />
              </div>

              <SectionHeader num="4" title="Director's Message" />
              <div style={grid2}>
                <FInput label="Director/Founder Name" value={settings.director_name} onChange={set("director_name")} />
                <FInput label="Title/Designation" value={settings.director_title} onChange={set("director_title")} />
              </div>
              <FInput label="Message / Quote" value={settings.director_message} onChange={set("director_message")} isTextArea rows={4} />
              
              <div style={{ marginTop: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>Director Image (Optional)</label>
                <div style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
                  {settings.director_image_url && (
                    <img src={settings.director_image_url.startsWith("/uploads") ? `${API}${settings.director_image_url}` : settings.director_image_url} alt="Director" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "2px solid #e2e8f0" }} />
                  )}
                  <input type="file" onChange={uploadDirectorImage} accept="image/*" style={{ fontSize: 13, padding: "8px 0" }} />
                </div>
              </div>

            </div>
            <div style={{ background: "#f8fafc", padding: "16px 32px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" disabled={savingSettings} style={{ background: "#0f172a", color: "#fff", border: "none", padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: savingSettings ? "not-allowed" : "pointer" }}>
                {savingSettings ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        </form>
      )}

      {tab === "banners" && (
        <div style={cardStyle}>
          <div style={padded}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>Hero Banners</h3>
                <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>These images auto-slide at the top of the About Us page.</p>
              </div>
              <div>
                <input type="file" id="banner-upload" accept="image/*" style={{ display: "none" }} onChange={handleUploadBanner} />
                <label htmlFor="banner-upload" style={{ background: "#38bdf8", color: "#fff", padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-block" }}>
                  {uploadingBanner ? "Uploading..." : "+ Upload Banner"}
                </label>
              </div>
            </div>

            {banners.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", background: "#f8fafc", borderRadius: 12, border: "1px dashed #cbd5e1" }}>
                <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>No banners uploaded. Add one to show the carousel.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: 20 }}>
                {banners.map(b => (
                  <div key={b.id} style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0", background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                    <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 6, zIndex: 10 }}>
                      <button onClick={() => toggleBanner(b.id)} style={{ background: b.is_active ? "#10b981" : "#94a3b8", color: "#fff", border: "none", padding: "4px 8px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                        {b.is_active ? "Active" : "Hidden"}
                      </button>
                      <button onClick={() => deleteBanner(b.id)} style={{ background: "#ef4444", color: "#fff", border: "none", padding: "4px 8px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Delete</button>
                    </div>
                    <img src={b.image_url.startsWith("/uploads") ? `${API}${b.image_url}` : b.image_url} alt="" style={{ width: "100%", height: 160, objectFit: "cover", display: "block", opacity: b.is_active ? 1 : 0.5 }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "values" && (
        <>
          <form onSubmit={addCoreValue} style={cardStyle}>
            <div style={padded}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>Add New Core Value</h3>
              <div style={grid2}>
                <FInput label="Title (e.g. Innovation)" value={newVal.title} onChange={(e: any) => setNewVal(p => ({ ...p, title: e.target.value }))} />
                <div style={{ position: "relative" }}>
                  <select value={newVal.icon_name} onChange={e => setNewVal(p => ({ ...p, icon_name: e.target.value }))} style={{ width: "100%", padding: "16px 14px", borderRadius: 12, border: "1.5px solid #e2e8f0", outline: "none", fontSize: 14, color: "#0f172a", background: "#fff", appearance: "none" }}>
                    <option value="Star">Star 🌟</option>
                    <option value="Lightbulb">Lightbulb 💡</option>
                    <option value="Target">Target 🎯</option>
                    <option value="Shield">Shield 🛡️</option>
                    <option value="Users">Users 👥</option>
                    <option value="Globe">Globe 🌍</option>
                  </select>
                  <label style={{ position: "absolute", left: 14, top: -9, fontSize: 11, fontWeight: 600, color: "#64748b", background: "#fff", padding: "0 4px" }}>Icon</label>
                </div>
              </div>
              <FInput label="Description" value={newVal.description} onChange={(e: any) => setNewVal(p => ({ ...p, description: e.target.value }))} isTextArea rows={2} />
            </div>
            <div style={{ background: "#f8fafc", padding: "16px 32px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" disabled={addingVal} style={{ background: "#38bdf8", color: "#fff", border: "none", padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: addingVal ? "not-allowed" : "pointer" }}>
                {addingVal ? "Adding..." : "+ Add Value"}
              </button>
            </div>
          </form>

          <div style={cardStyle}>
            <div style={padded}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 20px" }}>Current Core Values</h3>
              {values.length === 0 ? (
                <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>No core values added yet.</p>
              ) : (
                <div style={{ display: "grid", gap: 16 }}>
                  {values.map(v => (
                    <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", padding: "20px", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                      <div>
                        <h4 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                          {v.icon_name} — {v.title}
                        </h4>
                        <p style={{ margin: 0, fontSize: 14, color: "#475569" }}>{v.description}</p>
                      </div>
                      <button onClick={() => deleteCoreValue(v.id)} style={{ background: "#fee2e2", color: "#ef4444", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Delete</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function AboutUsSettingsPage() {
  return (
    <AdminProvider>
      <AboutUsSettingsInner />
    </AdminProvider>
  );
}
