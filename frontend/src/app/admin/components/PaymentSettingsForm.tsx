"use client";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL } from "@/lib/config";
import React, { useState, useEffect } from "react";
import { useToast } from "./ToastProvider";
import { Icon } from "./../icons";

interface PaymentSettingsData {
  razorpay_key_id: string;
  razorpay_key_secret: string;
  currency: string;
  is_test_mode: boolean;
  has_secret?: boolean;
}

function FloatingInput({ label, type = "text", value, onChange, required, isTextArea = false, placeholder = "" }: any) {
  const [focused, setFocused] = useState(false);
  const hasValue = value !== undefined && value !== null && value !== "";
  const shouldFloat = focused || hasValue || (placeholder && placeholder.length > 0);
  
  const containerStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    marginBottom: "8px"
  };
  
  const labelStyle: React.CSSProperties = {
    position: "absolute", 
    left: "14px", 
    top: shouldFloat ? "-9px" : (isTextArea ? "14px" : "50%"),
    transform: shouldFloat ? "none" : (isTextArea ? "none" : "translateY(-50%)"),
    fontSize: shouldFloat ? "11px" : "14px", 
    fontWeight: shouldFloat ? 600 : 400,
    color: focused ? "#38bdf8" : shouldFloat ? "#64748b" : "#94a3b8",
    background: shouldFloat ? "#fff" : "transparent", 
    padding: shouldFloat ? "0 4px" : "0", 
    transition: "all 0.2s cubic-bezier(.4,0,.2,1)",
    pointerEvents: "none", 
    zIndex: 1,
    letterSpacing: shouldFloat ? "0.3px" : "0",
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
          placeholder={placeholder}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      )}
      <label style={labelStyle}>{label}</label>
    </div>
  );
}

export default function PaymentSettingsForm() {
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

  const [settings, setSettings] = useState<PaymentSettingsData>({
    razorpay_key_id: "",
    razorpay_key_secret: "",
    currency: "INR",
    is_test_mode: true,
    has_secret: false,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await apiFetch(`${BASE_URL}/api/settings/payment`, {
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setSettings({
          razorpay_key_id: data.razorpay_key_id || "",
          razorpay_key_secret: "",
          currency: data.currency || "INR",
          is_test_mode: data.is_test_mode ?? true,
          has_secret: data.has_secret || false,
        });
      }
    } catch (err) {
      console.error("Failed to fetch payment settings", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch(`${BASE_URL}/api/settings/payment`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error("Failed to save settings");

      toast.success("Payment settings updated successfully.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
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
              {Array.from({ length: 3 }).map((_, i) => (
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
            <Icon name="credit-card" size={28} /> Payment Settings
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "#64748b" }}>Configure Razorpay credentials for processing payments.</p>
        </div>
      </header>

      <div style={cardStyle}>
        <form onSubmit={handleSave}>
          <div style={{ padding: "32px", borderBottom: "1px solid #f1f5f9" }}>

            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 24, paddingBottom: 12, borderBottom: "1px solid #e2e8f0" }}>
              1. Razorpay Configuration
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
              <div>
                <FloatingInput
                  label="Razorpay Key ID"
                  value={settings.razorpay_key_id}
                  required
                  onChange={(e: any) => setSettings({ ...settings, razorpay_key_id: e.target.value })}
                />
              </div>

              <div>
                <FloatingInput
                  label="Razorpay Key Secret"
                  type="password"
                  value={settings.razorpay_key_secret}
                  placeholder={settings.has_secret ? "•••••••• (Saved)" : ""}
                  required={!settings.has_secret}
                  onChange={(e: any) => setSettings({ ...settings, razorpay_key_secret: e.target.value })}
                />
              </div>

              <div>
                <FloatingInput
                  label="Default Currency (e.g. INR, USD)"
                  value={settings.currency}
                  required
                  onChange={(e: any) => setSettings({ ...settings, currency: e.target.value })}
                />
              </div>
            </div>

            <div style={{ padding: "16px 20px", background: "#fcf8e3", borderRadius: 10, border: "1px solid #faebcc", display: "flex", alignItems: "center", gap: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#8a6d3b" }}>
                <input
                  type="checkbox"
                  checked={settings.is_test_mode}
                  onChange={(e) => setSettings({ ...settings, is_test_mode: e.target.checked })}
                  style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#f0ad4e" }}
                />
                Enable Test Mode
              </label>
              <span style={{ fontSize: 12, color: "#8a6d3b" }}>When enabled, no real charges will be made. Perfect for testing integrations.</span>
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
    </div>
  );
}
