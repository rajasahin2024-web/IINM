"use client";
import React, { useState, useEffect } from "react";
import { AdminProvider } from "../../components/ProtectedAdmin";
import { useToast } from "../../components/ToastProvider";
import { Icon } from "../../icons";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL } from "@/lib/config";

function GoogleApiSettingsInner() {
  const { showToast } = useToast();
  const toast = { success: (m: string) => showToast(m, "success"), error: (m: string) => showToast(m, "error") };

  const [settings, setSettings] = useState({
    google_map_api_key: "",
    google_client_id: "",
    google_client_secret: "",
    google_redirect_uri: "",
    enable_google_login: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingMap, setTestingMap] = useState(false);
  const [testingOAuth, setTestingOAuth] = useState(false);
  const [mapTestResult, setMapTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [oauthTestResult, setOauthTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showMapKey, setShowMapKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await apiFetch(`${BASE_URL}/api/contact/google-api/admin`);
      if (res.ok) {
        const d = await res.json();
        setSettings({
          google_map_api_key: d.google_map_api_key || "",
          google_client_id: d.google_client_id || "",
          google_client_secret: d.google_client_secret || "",
          google_redirect_uri: d.google_redirect_uri || "",
          enable_google_login: !!d.enable_google_login,
        });
      }
    } catch {
      toast.error("Failed to load Google API settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {};
      Object.entries(settings).forEach(([k, v]) => {
        if (typeof v === "boolean") {
          payload[k] = v;
        } else {
          payload[k] = (v as string).trim() === "" ? null : v;
        }
      });
      const res = await apiFetch(`${BASE_URL}/api/contact/google-api`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Google API settings saved!");
    } catch {
      toast.error("Failed to save Google API settings.");
    } finally {
      setSaving(false);
    }
  };

  const testMapKey = async () => {
    setTestingMap(true);
    setMapTestResult(null);
    try {
      const res = await apiFetch(`${BASE_URL}/api/contact/google-api/test-map`, { method: "POST" });
      const d = await res.json();
      if (res.ok) {
        setMapTestResult({ success: d.success, message: d.message });
        showToast(d.message, d.success ? "success" : "error");
      } else {
        setMapTestResult({ success: false, message: d.detail || "Test failed." });
        showToast(d.detail || "Test failed.", "error");
      }
    } catch {
      setMapTestResult({ success: false, message: "Network error during test." });
      toast.error("Network error during test.");
    } finally {
      setTestingMap(false);
    }
  };

  const testOAuth = async () => {
    setTestingOAuth(true);
    setOauthTestResult(null);
    try {
      const res = await apiFetch(`${BASE_URL}/api/contact/google-api/test-oauth`, { method: "POST" });
      const d = await res.json();
      if (res.ok) {
        setOauthTestResult({ success: d.success, message: d.message });
        showToast(d.message, d.success ? "success" : "error");
      } else {
        setOauthTestResult({ success: false, message: d.detail || "Test failed." });
        showToast(d.detail || "Test failed.", "error");
      }
    } catch {
      setOauthTestResult({ success: false, message: "Network error during test." });
      toast.error("Network error during test.");
    } finally {
      setTestingOAuth(false);
    }
  };

  const set = (k: keyof typeof settings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setSettings((p) => ({ ...p, [k]: e.target.value }));

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    borderRadius: 14,
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
    border: "1px solid #f1f5f9",
    marginBottom: 24,
  };
  const padded: React.CSSProperties = { padding: "24px 32px" };
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#475569",
    marginBottom: 6,
  };
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    fontSize: 14,
    color: "#0f172a",
    outline: "none",
    transition: "border-color .2s",
  };
  const infoBoxStyle: React.CSSProperties = {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: 8,
    padding: "12px 16px",
    fontSize: 13,
    color: "#1e40af",
    lineHeight: 1.6,
    marginTop: 12,
  };
  const demoBoxStyle: React.CSSProperties = {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    color: "#166534",
    fontFamily: "monospace",
    marginTop: 8,
    display: "flex",
    alignItems: "center",
    gap: 8,
    justifyContent: "space-between",
  };
  const testBtnStyle: React.CSSProperties = {
    background: "#f1f5f9",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: "#475569",
  };
  const resultStyle = (success: boolean): React.CSSProperties => ({
    marginTop: 12,
    padding: "10px 14px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    background: success ? "#f0fdf4" : "#fef2f2",
    border: `1px solid ${success ? "#bbf7d0" : "#fecaca"}`,
    color: success ? "#166534" : "#dc2626",
  });

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
          <Icon name="globe" size={28} /> Google API Settings
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: "#64748b" }}>
          Manage Google Maps API key and Google Sign-In OAuth credentials. Test your keys before saving.
        </p>
      </header>

      <form onSubmit={handleSave}>
        {/* ── Google Maps API Key ── */}
        <div style={cardStyle}>
          <div style={padded}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
                <Icon name="globe" size={18} /> Google Maps API Key
              </h2>
              <button type="button" onClick={testMapKey} disabled={testingMap || !settings.google_map_api_key}
                style={{ ...testBtnStyle, opacity: testingMap || !settings.google_map_api_key ? 0.5 : 1, cursor: testingMap || !settings.google_map_api_key ? "not-allowed" : "pointer" }}>
                <Icon name="zap" size={14} /> {testingMap ? "Testing..." : "Test API Key"}
              </button>
            </div>

            <div style={infoBoxStyle}>
              <strong>How to get a Google Maps API Key:</strong>
              <br />
              1. Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener" style={{ color: "#2563eb", textDecoration: "underline" }}>Google Cloud Console</a>
              <br />
              2. Create or select a project
              <br />
              3. Enable <strong>Maps JavaScript API</strong> and <strong>Geocoding API</strong>
              <br />
              4. Go to <strong>Credentials</strong> → <strong>Create Credentials</strong> → <strong>API Key</strong>
              <br />
              5. Restrict the key to your domain for security
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={labelStyle}>Google Map API Key</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showMapKey ? "text" : "password"}
                  value={settings.google_map_api_key}
                  onChange={set("google_map_api_key")}
                  style={{ ...inputStyle, paddingRight: 44 }}
                  placeholder="AIzaSy..."
                />
                <button type="button" onClick={() => setShowMapKey(s => !s)}
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4 }}>
                  <Icon name="eye" size={16} />
                </button>
              </div>
            </div>

            {mapTestResult && (
              <div style={resultStyle(mapTestResult.success)}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{mapTestResult.success ? "✓" : "✕"}</span>
                {mapTestResult.message}
              </div>
            )}
          </div>
        </div>

        {/* ── Google Sign-In / OAuth Credentials ── */}
        <div style={cardStyle}>
          <div style={padded}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
                <Icon name="settings" size={18} /> Google Sign-In / OAuth Credentials
              </h2>
              <button type="button" onClick={testOAuth} disabled={testingOAuth || !settings.google_client_id || !settings.google_client_secret}
                style={{ ...testBtnStyle, opacity: testingOAuth || !settings.google_client_id || !settings.google_client_secret ? 0.5 : 1, cursor: testingOAuth || !settings.google_client_id || !settings.google_client_secret ? "not-allowed" : "pointer" }}>
                <Icon name="zap" size={14} /> {testingOAuth ? "Testing..." : "Test OAuth"}
              </button>
            </div>

            <div style={infoBoxStyle}>
              <strong>How to get Google OAuth Credentials:</strong>
              <br />
              1. Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener" style={{ color: "#2563eb", textDecoration: "underline" }}>Google Cloud Console → Credentials</a>
              <br />
              2. Create <strong>OAuth 2.0 Client ID</strong> (Web application type)
              <br />
              3. Add your domain to <strong>Authorized JavaScript origins</strong>
              <br />
              4. Add the callback URL (below) to <strong>Authorized redirect URIs</strong>
              <br />
              5. Copy the <strong>Client ID</strong> and <strong>Client Secret</strong> here
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginTop: 16 }}>
              <div>
                <label style={labelStyle}>Google Client ID</label>
                <input
                  type="text"
                  value={settings.google_client_id}
                  onChange={set("google_client_id")}
                  style={inputStyle}
                  placeholder="123456789-xxxxx.apps.googleusercontent.com"
                />
              </div>
              <div>
                <label style={labelStyle}>Google Client Secret</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showSecret ? "text" : "password"}
                    value={settings.google_client_secret}
                    onChange={set("google_client_secret")}
                    style={{ ...inputStyle, paddingRight: 44 }}
                    placeholder="GOCSPX-xxxxx"
                  />
                  <button type="button" onClick={() => setShowSecret(s => !s)}
                    style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4 }}>
                    <Icon name="eye" size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", borderRadius: 10, padding: "14px 16px", border: "1px solid #e2e8f0" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Enable Google Login for Slot Booking</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Show &quot;Sign in with Google&quot; button on the public slot booking form to pre-fill student details.</div>
              </div>
              <button
                type="button"
                onClick={() => setSettings(p => ({ ...p, enable_google_login: !p.enable_google_login }))}
                style={{
                  width: 48, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
                  background: settings.enable_google_login ? "#0a1628" : "#cbd5e1",
                  position: "relative", transition: "background-color 0.25s ease", flexShrink: 0,
                }}
              >
                <span style={{
                  position: "absolute", top: 3, left: settings.enable_google_login ? 25 : 3,
                  width: 20, height: 20, borderRadius: "50%", background: "#fff",
                  transition: "left 0.25s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }} />
              </button>
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={labelStyle}>Google Redirect URI (Callback URL)</label>
              <input
                type="text"
                value={settings.google_redirect_uri}
                onChange={set("google_redirect_uri")}
                style={inputStyle}
                placeholder="https://yourdomain.com/api/auth/google/callback"
              />
              <div style={demoBoxStyle}>
                <span>Demo: https://yourdomain.com/api/auth/google/callback</span>
                <button type="button" onClick={() => {
                  const demo = typeof window !== "undefined" ? `${window.location.origin}/api/auth/google/callback` : "https://yourdomain.com/api/auth/google/callback";
                  setSettings(p => ({ ...p, google_redirect_uri: demo }));
                  showToast("Demo callback URL filled", "success");
                }}
                  style={{ background: "#166534", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                  Use Auto-Detect
                </button>
              </div>
              <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 6, lineHeight: 1.5 }}>
                This URL must be added to <strong>Authorized redirect URIs</strong> in your Google Cloud Console OAuth 2.0 Client settings.
              </p>
            </div>

            {oauthTestResult && (
              <div style={resultStyle(oauthTestResult.success)}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{oauthTestResult.success ? "✓" : "✕"}</span>
                {oauthTestResult.message}
              </div>
            )}
          </div>

          <div style={{ padding: "16px 32px", background: "#f8fafc", borderRadius: "0 0 14px 14px", display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" disabled={saving}
              style={{
                background: "#38bdf8", color: "#fff", border: "none", padding: "12px 28px", borderRadius: 10,
                fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
                display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 6px -1px rgba(56,189,248,.3)",
              }}>
              {saving ? "Saving..." : (<><Icon name="save" size={16} /> Save Google API Settings</>)}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function GoogleApiSettingsPage() {
  return (
    <AdminProvider>
      <GoogleApiSettingsInner />
    </AdminProvider>
  );
}
