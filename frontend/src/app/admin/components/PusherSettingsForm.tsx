"use client";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL } from "@/lib/config";
import React, { useState, useEffect } from "react";
import { useToast } from "./ToastProvider";
import { Icon } from "../icons";

export default function PusherSettingsForm() {
  const { showToast } = useToast();
  const toast = { success: (m: string) => showToast(m, "success"), error: (m: string) => showToast(m, "error") };

  const [settings, setSettings] = useState({
    app_id: "",
    key: "",
    secret: "",
    cluster: "ap2",
    is_active: false,
    has_secret: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const res = await apiFetch(`${BASE_URL}/api/settings/pusher`);
      if (res.ok) {
        const d = await res.json();
        setSettings({
          app_id: d.app_id || "",
          key: d.key || "",
          secret: "",
          cluster: d.cluster || "ap2",
          is_active: !!d.is_active,
          has_secret: !!d.has_secret,
        });
      }
    } catch {
      toast.error("Failed to load Pusher settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        app_id: settings.app_id.trim() || null,
        key: settings.key.trim() || null,
        cluster: settings.cluster.trim() || null,
        is_active: settings.is_active,
      };
      if (settings.secret.trim()) {
        payload.secret = settings.secret.trim();
      }
      const res = await apiFetch(`${BASE_URL}/api/settings/pusher`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Pusher settings saved!");
      fetchSettings();
    } catch {
      toast.error("Failed to save Pusher settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await apiFetch(`${BASE_URL}/api/settings/pusher/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "slot-bookings", event: "test-event" }),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success(d.message || "Test event sent successfully");
      } else {
        toast.error(d.detail || "Test failed");
      }
    } catch {
      toast.error("Network error during test.");
    } finally {
      setTesting(false);
    }
  };

  const cardStyle: React.CSSProperties = {
    background: "#fff", borderRadius: 14, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
    border: "1px solid #f1f5f9", marginBottom: 24,
  };
  const padded: React.CSSProperties = { padding: "24px 32px" };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 };
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0",
    fontSize: 14, color: "#0f172a", outline: "none", transition: "border-color .2s",
  };

  if (loading) {
    return (
      <div className="manager-content" style={{ width: "100%" }}>
        <div style={{ padding: 32 }}>
          <div className="skeleton sk-h1" />
          <div className="skeleton sk-p" style={{ marginTop: 8 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="manager-content" style={{ width: "100%" }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 12 }}>
          <Icon name="bell" size={28} /> Push Notification Settings
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: "#64748b" }}>
          Configure Pusher for real-time push notifications. Used for slot booking alerts and class notifications.
        </p>
      </header>

      <form onSubmit={handleSave}>
        <div style={cardStyle}>
          <div style={padded}>
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "#1e40af", lineHeight: 1.6, marginBottom: 20 }}>
              <strong>How to get Pusher credentials:</strong><br />
              1. Sign up at <a href="https://pusher.com" target="_blank" rel="noopener" style={{ color: "#2563eb", textDecoration: "underline" }}>pusher.com</a> and create a Channels app<br />
              2. Go to App Settings and copy the App ID, Key, Secret, and Cluster<br />
              3. Paste them below and save
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              <div>
                <label style={labelStyle}>App ID</label>
                <input type="text" value={settings.app_id} onChange={e => setSettings({ ...settings, app_id: e.target.value })} style={inputStyle} placeholder="1234567" />
              </div>
              <div>
                <label style={labelStyle}>Key</label>
                <input type="text" value={settings.key} onChange={e => setSettings({ ...settings, key: e.target.value })} style={inputStyle} placeholder="a1b2c3d4e5f6g7h8" />
              </div>
              <div>
                <label style={labelStyle}>
                  Secret {settings.has_secret && <span style={{ fontSize: 11, color: "#10b981", fontWeight: 600 }}>(saved — enter new to replace)</span>}
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showSecret ? "text" : "password"}
                    value={settings.secret}
                    onChange={e => setSettings({ ...settings, secret: e.target.value })}
                    style={{ ...inputStyle, paddingRight: 44 }}
                    placeholder={settings.has_secret ? "••••••••" : "Enter secret key"}
                  />
                  <button type="button" onClick={() => setShowSecret(s => !s)}
                    style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4 }}>
                    <Icon name="eye" size={16} />
                  </button>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Cluster</label>
                <input type="text" value={settings.cluster} onChange={e => setSettings({ ...settings, cluster: e.target.value })} style={inputStyle} placeholder="ap2" />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", borderRadius: 10, padding: "14px 16px", border: "1px solid #e2e8f0", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Enable Push Notifications</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Activate Pusher to start sending real-time notifications.</div>
              </div>
              <button
                type="button"
                onClick={() => setSettings(p => ({ ...p, is_active: !p.is_active }))}
                style={{
                  width: 48, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
                  background: settings.is_active ? "#0a1628" : "#cbd5e1",
                  position: "relative", transition: "background-color 0.25s ease", flexShrink: 0,
                }}
              >
                <span style={{
                  position: "absolute", top: 3, left: settings.is_active ? 25 : 3,
                  width: 20, height: 20, borderRadius: "50%", background: "#fff",
                  transition: "left 0.25s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }} />
              </button>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button type="button" onClick={handleTest} disabled={testing || !settings.app_id || !settings.has_secret}
                style={{
                  background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 8, padding: "10px 20px",
                  fontSize: 13, fontWeight: 600, cursor: testing || !settings.app_id || !settings.has_secret ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: 6, color: "#475569",
                  opacity: testing || !settings.app_id || !settings.has_secret ? 0.5 : 1,
                }}>
                <Icon name="zap" size={14} /> {testing ? "Testing..." : "Test Connection"}
              </button>
            </div>
          </div>

          <div style={{ padding: "16px 32px", background: "#f8fafc", borderRadius: "0 0 14px 14px", display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" disabled={saving}
              style={{
                background: "#38bdf8", color: "#fff", border: "none", padding: "12px 28px", borderRadius: 10,
                fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
                display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 6px -1px rgba(56,189,248,.3)",
              }}>
              {saving ? "Saving..." : (<><Icon name="save" size={16} /> Save Pusher Settings</>)}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
