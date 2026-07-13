"use client";
import React, { useState, useEffect } from "react";
import { AdminProvider } from "../../components/ProtectedAdmin";
import { useToast } from "../../components/ToastProvider";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL } from "@/lib/config";
import { Icon } from "../../icons";

interface MaintenanceSettings {
  maintenance_mode: boolean;
  maintenance_title: string;
  maintenance_message: string;
  maintenance_video_url: string;
  maintenance_bg_image_url: string;
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

function MaintenanceForm() {
  const { showToast } = useToast();
  const toast = { success: (msg: string) => showToast(msg, "success"), error: (msg: string) => showToast(msg, "error") };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const baseUrl = BASE_URL;

  const [settings, setSettings] = useState<MaintenanceSettings>({
    maintenance_mode: false,
    maintenance_title: "We'll be right back",
    maintenance_message: "Our team is currently performing scheduled maintenance to improve your experience. Please check back soon.",
    maintenance_video_url: "",
    maintenance_bg_image_url: "",
  });
  const [uploadingBg, setUploadingBg] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const res = await apiFetch(`${baseUrl}/api/settings/site`, { headers: { "Content-Type": "application/json" } });
      if (res.ok) {
        const data = await res.json();
        setSettings({
          maintenance_mode: data.maintenance_mode || false,
          maintenance_title: data.maintenance_title || "We'll be right back",
          maintenance_message: data.maintenance_message || "Our team is currently performing scheduled maintenance to improve your experience. Please check back soon.",
          maintenance_video_url: data.maintenance_video_url || "",
          maintenance_bg_image_url: data.maintenance_bg_image_url || "",
        });
      }
    } catch (err) { console.error("Failed to fetch maintenance settings", err); }
    finally { setLoading(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        maintenance_mode: settings.maintenance_mode,
        maintenance_title: settings.maintenance_title.trim() || null,
        maintenance_message: settings.maintenance_message.trim() || null,
        maintenance_video_url: settings.maintenance_video_url.trim() || null,
        maintenance_bg_image_url: settings.maintenance_bg_image_url.trim() || null,
      };
      const res = await apiFetch(`${baseUrl}/api/settings/site`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      toast.success("Maintenance settings updated successfully.");
    } catch {
      toast.error("Failed to save maintenance settings.");
    } finally { setSaving(false); }
  };

  const cardStyle = { background: "#fff", borderRadius: 14, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9", marginBottom: 24, overflow: "hidden" };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a" }}>Maintenance Mode</h1>
        <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>Configure what visitors see when your site is under maintenance.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Loading…</div>
      ) : (
        <form onSubmit={handleSave}>
          {/* Toggle Card */}
          <div style={{ ...cardStyle, padding: "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Enable Maintenance Mode</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>When active, logged-out visitors will see the maintenance page.</div>
              </div>
              <button
                type="button"
                onClick={() => setSettings(s => ({ ...s, maintenance_mode: !s.maintenance_mode }))}
                style={{
                  width: 48, height: 26, borderRadius: 13, border: "none",
                  background: settings.maintenance_mode ? "#10b981" : "#cbd5e1",
                  position: "relative", cursor: "pointer", transition: "background 0.2s",
                  flexShrink: 0,
                }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: "50%", background: "#fff",
                  position: "absolute", top: 2,
                  left: settings.maintenance_mode ? 24 : 2,
                  transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                }} />
              </button>
            </div>
            {settings.maintenance_mode && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#92400e" }}>
                <Icon name="alert-triangle" size={14} />
                <span>Maintenance mode is currently <b>ACTIVE</b>. Logged-out visitors will be redirected.</span>
              </div>
            )}
          </div>

          {/* Content Card */}
          <div style={{ ...cardStyle, padding: "20px 22px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.4px" }}>Maintenance Page Content</div>
            <FloatingInput label="Title (e.g. We'll be right back)" value={settings.maintenance_title} onChange={(e: any) => setSettings(s => ({ ...s, maintenance_title: e.target.value }))} />
            <FloatingInput label="Message" isTextArea value={settings.maintenance_message} onChange={(e: any) => setSettings(s => ({ ...s, maintenance_message: e.target.value }))} />
            <FloatingInput label="YouTube Video URL (optional)" type="url" value={settings.maintenance_video_url} onChange={(e: any) => setSettings(s => ({ ...s, maintenance_video_url: e.target.value }))} />

            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>Abstract Background Image</div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingBg}
                  style={{
                    background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8,
                    padding: "8px 14px", fontSize: 13, fontWeight: 600, color: "#0f172a",
                    cursor: uploadingBg ? "not-allowed" : "pointer",
                  }}
                >
                  {uploadingBg ? "Uploading…" : "Upload Background"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingBg(true);
                    const fd = new FormData();
                    fd.append("file", file);
                    try {
                      const res = await apiFetch("/api/settings/site/upload", { method: "POST", body: fd });
                      if (res.ok) {
                        const r = await res.json();
                        setSettings(s => ({ ...s, maintenance_bg_image_url: r.url }));
                      }
                    } catch { /* ignore */ } finally { setUploadingBg(false); }
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                />
                {settings.maintenance_bg_image_url && (
                  <button
                    type="button"
                    onClick={() => setSettings(s => ({ ...s, maintenance_bg_image_url: "" }))}
                    style={{
                      background: "transparent", border: "1px solid #fecaca", borderRadius: 8,
                      padding: "8px 14px", fontSize: 13, fontWeight: 600, color: "#ef4444",
                      cursor: "pointer",
                    }}
                  >
                    Remove Background
                  </button>
                )}
              </div>
              {settings.maintenance_bg_image_url && (
                <div style={{ marginTop: 10, borderRadius: 10, overflow: "hidden", border: "1px solid #e2e8f0", maxWidth: 320 }}>
                  <img
                    src={settings.maintenance_bg_image_url.startsWith("http") ? settings.maintenance_bg_image_url : `${baseUrl}${settings.maintenance_bg_image_url}`}
                    alt="Background"
                    style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Save */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                background: saving ? "#94a3b8" : "#0f172a", color: "#fff", border: "none",
                borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer", transition: "0.2s",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function MaintenanceSettingsPage() {
  return (
    <AdminProvider>
      <MaintenanceForm />
    </AdminProvider>
  );
}
