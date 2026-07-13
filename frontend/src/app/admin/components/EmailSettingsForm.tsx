"use client";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL } from "@/lib/config";
import React, { useState, useEffect } from "react";
import { useToast } from "./ToastProvider";
import { Icon } from "../icons";

interface EmailSettingsData {
  smtp_host: string;
  smtp_port: number | string;
  smtp_user: string;
  smtp_password?: string;
  from_email: string;
  from_name: string;
  use_tls: boolean;
}

function FloatingInput({ label, type = "text", value, onChange, required, isTextArea = false }: any) {
  const [focused, setFocused] = useState(false);
  const hasValue = value !== undefined && value !== null && value !== "";
  
  const containerStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    marginBottom: "8px"
  };
  
  const labelStyle: React.CSSProperties = {
    position: "absolute", 
    left: "14px", 
    top: focused || hasValue ? "-9px" : (isTextArea ? "14px" : "50%"),
    transform: focused || hasValue ? "none" : (isTextArea ? "none" : "translateY(-50%)"),
    fontSize: focused || hasValue ? "11px" : "14px", 
    fontWeight: focused || hasValue ? 600 : 400,
    color: focused ? "#38bdf8" : hasValue ? "#64748b" : "#94a3b8",
    background: focused || hasValue ? "#fff" : "transparent", 
    padding: focused || hasValue ? "0 4px" : "0", 
    transition: "all 0.2s cubic-bezier(.4,0,.2,1)",
    pointerEvents: "none", 
    zIndex: 1,
    letterSpacing: focused || hasValue ? "0.3px" : "0",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", 
    padding: "14px 16px", 
    borderRadius: "10px",
    border: `1.5px solid ${focused ? "#38bdf8" : "#e2e8f0"}`,
    outline: "none", 
    fontSize: "14px", 
    color: "#0f172a", 
    background: "#fff",
    transition: "border-color 0.2s, box-shadow 0.2s", 
    boxSizing: "border-box",
    boxShadow: focused ? "0 0 0 3px rgba(56, 189, 248, 0.15)" : "none",
    resize: isTextArea ? "vertical" as const : "none" as const,
    fontFamily: "inherit",
    minHeight: isTextArea ? "100px" : "auto",
  };

  return (
    <div style={containerStyle}>
      {isTextArea ? (
        <textarea
          required={required}
          style={inputStyle}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      ) : (
        <input
          type={type}
          required={required}
          style={inputStyle}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      )}
      <label style={labelStyle}>{label}</label>
    </div>
  );
}

export default function EmailSettingsForm() {
  const { showToast } = useToast();
  const toast = {
    success: (msg: string) => showToast(msg, 'success'),
    error: (msg: string) => showToast(msg, 'error')
  };
  const cardStyle = {
    background: "#fff",
    borderRadius: 14,
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)",
    border: "1px solid #f1f5f9",
    marginBottom: 24,
    overflow: "hidden",
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [settings, setSettings] = useState<EmailSettingsData>({
    smtp_host: "",
    smtp_port: 587,
    smtp_user: "",
    smtp_password: "",
    from_email: "",
    from_name: "",
    use_tls: true,
  });

  const [testEmail, setTestEmail] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await apiFetch(`${BASE_URL}/api/settings/email`, {
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setSettings({
          smtp_host: data.smtp_host || "",
          smtp_port: data.smtp_port || 587,
          smtp_user: data.smtp_user || "",
          smtp_password: data.smtp_password || "",
          from_email: data.from_email || "",
          from_name: data.from_name || "",
          use_tls: data.use_tls ?? true,
        });
      }
    } catch (err) {
      console.error("Failed to fetch email settings", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch(`${BASE_URL}/api/settings/email`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error("Failed to save settings");

      toast.success("Email settings updated successfully.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast.error("Please enter an email address to send the test message to.");
      return;
    }
    setTesting(true);
    try {
      const res = await apiFetch(`${BASE_URL}/api/settings/email/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test_email: testEmail }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to send test email");

      toast.success("Test email sent successfully!");
      setTestEmail("");
    } catch (err: any) {
      toast.error(err.message || "Failed to send");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="manager-content" style={{ width: "100%" }}>
        <header style={{ marginBottom: 24 }}>
          <div className="skeleton sk-h1"></div>
          <div className="skeleton sk-p"></div>
        </header>

        <div style={cardStyle}>
          <div style={{ padding: "32px", borderBottom: "1px solid #f1f5f9" }}>
            <div className="skeleton sk-title"></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i}>
                  <div className="skeleton sk-input" style={{ height: 56 }}></div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24 }}>
              <div className="skeleton" style={{ width: 200, height: 20, borderRadius: 6 }}></div>
            </div>
          </div>
          <div style={{ padding: "20px 32px", background: "#f8fafc", display: "flex", justifyContent: "flex-end" }}>
            <div className="skeleton sk-btn"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="manager-content" style={{ width: "100%" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 12 }}>
            <Icon name="mail" size={28} /> Email Settings
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "#64748b" }}>Configure SMTP credentials for outgoing system emails.</p>
        </div>
      </header>

      <div style={cardStyle}>
        <form onSubmit={handleSave}>
          <div style={{ padding: "32px", borderBottom: "1px solid #f1f5f9" }}>

            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 24, paddingBottom: 12, borderBottom: "1px solid #e2e8f0" }}>
              1. SMTP Server Configuration
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>

              <div>
                <FloatingInput
                  label="SMTP Host"
                  value={settings.smtp_host}
                  required
                  onChange={(e: any) => setSettings({ ...settings, smtp_host: e.target.value })}
                />
              </div>

              <div>
                <FloatingInput
                  label="SMTP Port"
                  type="number"
                  value={settings.smtp_port}
                  required
                  onChange={(e: any) => setSettings({ ...settings, smtp_port: parseInt(e.target.value) || 587 })}
                />
              </div>

              <div>
                <FloatingInput
                  label="SMTP Username / Email"
                  type="email"
                  value={settings.smtp_user}
                  required
                  onChange={(e: any) => setSettings({ ...settings, smtp_user: e.target.value })}
                />
              </div>

              <div>
                <FloatingInput
                  label="SMTP Password"
                  type="password"
                  value={settings.smtp_password}
                  onChange={(e: any) => setSettings({ ...settings, smtp_password: e.target.value })}
                />
              </div>

            </div>

            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 24, paddingBottom: 12, borderBottom: "1px solid #e2e8f0" }}>
              2. Sender Identity
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>

              <div>
                <FloatingInput
                  label="Default From Email"
                  type="email"
                  value={settings.from_email}
                  required
                  onChange={(e: any) => setSettings({ ...settings, from_email: e.target.value })}
                />
              </div>

              <div>
                <FloatingInput
                  label="Default From Name"
                  value={settings.from_name}
                  onChange={(e: any) => setSettings({ ...settings, from_name: e.target.value })}
                />
              </div>

            </div>

            <div style={{ padding: "16px 20px", background: "#f0f9ff", borderRadius: 10, border: "1px solid #bae6fd", display: "flex", alignItems: "center", gap: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#0369a1" }}>
                <input
                  type="checkbox"
                  checked={settings.use_tls}
                  onChange={(e) => setSettings({ ...settings, use_tls: e.target.checked })}
                  style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#38bdf8" }}
                />
                Use TLS Encryption
              </label>
              <span style={{ fontSize: 12, color: "#64748b" }}>Recommended for most providers (Gmail, Outlook, etc.)</span>
            </div>

          </div>

          <div style={{ padding: "20px 32px", background: "#f8fafc", display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              disabled={saving}
              style={{ background: "#38bdf8", color: "#fff", border: "none", padding: "12px 28px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 10, opacity: saving ? 0.7 : 1, transition: "all 0.2s", boxShadow: "0 4px 6px -1px rgba(56, 189, 248, 0.3)" }}
              onMouseEnter={(e) => !saving && (e.currentTarget.style.transform = "translateY(-1px)")}
              onMouseLeave={(e) => !saving && (e.currentTarget.style.transform = "none")}
            >
              {saving ? "Saving..." : <><Icon name="save" size={18} /> Save Settings</>}
            </button>
          </div>
        </form>
      </div>

      {/* Send Test Email Card */}
      <div style={cardStyle}>
        <div style={{ padding: "20px 32px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Send Test Email</h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Verify your current saved configuration</p>
          </div>
          <div style={{ color: "#94a3b8" }}><Icon name="send" size={24} /></div>
        </div>
        <div style={{ padding: "32px", display: "flex", gap: 16, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <FloatingInput
              label="Recipient Email Address"
              type="email"
              value={testEmail}
              onChange={(e: any) => setTestEmail(e.target.value)}
            />
          </div>
          <button
            onClick={handleTestEmail}
            disabled={testing || !testEmail}
            style={{ background: "#10b981", color: "#fff", border: "none", padding: "12px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: (testing || !testEmail) ? "not-allowed" : "pointer", opacity: (testing || !testEmail) ? 0.7 : 1, transition: "all 0.2s", whiteSpace: "nowrap", boxShadow: "0 4px 6px -1px rgba(16, 185, 129, 0.3)" }}
            onMouseEnter={(e) => !(testing || !testEmail) && (e.currentTarget.style.transform = "translateY(-1px)")}
            onMouseLeave={(e) => !(testing || !testEmail) && (e.currentTarget.style.transform = "none")}
          >
            {testing ? "Sending..." : "Send Test"}
          </button>
        </div>
      </div>
    </div>
  );
}
