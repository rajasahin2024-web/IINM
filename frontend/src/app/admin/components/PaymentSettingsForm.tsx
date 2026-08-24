"use client";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL } from "@/lib/config";
import React, { useState, useEffect } from "react";
import { useToast } from "./ToastProvider";
import { Icon } from "./../icons";

interface PaymentSettingsData {
  razorpay_key_id: string;
  razorpay_key_secret: string;
  razorpay_test_key_id: string;
  razorpay_test_key_secret: string;
  razorpay_live_key_id: string;
  razorpay_live_key_secret: string;
  currency: string;
  is_test_mode: boolean;
  has_secret?: boolean;
  has_test_secret?: boolean;
  has_live_secret?: boolean;
  upi_enabled?: boolean;
  upi_qr_url?: string;
  upi_id?: string;
  upi_payee_name?: string;
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
    razorpay_test_key_id: "",
    razorpay_test_key_secret: "",
    razorpay_live_key_id: "",
    razorpay_live_key_secret: "",
    currency: "INR",
    is_test_mode: true,
    has_secret: false,
    has_test_secret: false,
    has_live_secret: false,
    upi_enabled: false,
    upi_qr_url: "",
    upi_id: "",
    upi_payee_name: "",
  });
  const [upiQrFile, setUpiQrFile] = useState<File | null>(null);

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
          razorpay_test_key_id: data.razorpay_test_key_id || "",
          razorpay_test_key_secret: "",
          razorpay_live_key_id: data.razorpay_live_key_id || "",
          razorpay_live_key_secret: "",
          currency: data.currency || "INR",
          is_test_mode: data.is_test_mode ?? true,
          has_secret: data.has_secret || false,
          has_test_secret: data.has_test_secret || false,
          has_live_secret: data.has_live_secret || false,
          upi_enabled: data.upi_enabled || false,
          upi_qr_url: data.upi_qr_url || "",
          upi_id: data.upi_id || "",
          upi_payee_name: data.upi_payee_name || "",
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
      let updatedSettings = { ...settings };

      if (upiQrFile) {
        const formData = new FormData();
        formData.append("file", upiQrFile);
        const uploadRes = await apiFetch(`${BASE_URL}/api/settings/payment/upload-upi-qr`, {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) throw new Error("UPI QR upload failed");
        const uploadData = await uploadRes.json();
        updatedSettings.upi_qr_url = uploadData.url;
      }

      const res = await apiFetch(`${BASE_URL}/api/settings/payment`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSettings),
      });

      if (!res.ok) throw new Error("Failed to save settings");

      toast.success("Payment settings updated successfully.");
      fetchSettings();
      setUpiQrFile(null);
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

            {/* Test Mode Keys */}
            <div style={{ marginBottom: 28, padding: "20px", background: settings.is_test_mode ? "#f0f9ff" : "#f8fafc", borderRadius: 12, border: `1.5px solid ${settings.is_test_mode ? "#38bdf8" : "#e2e8f0"}`, transition: "all 0.2s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: settings.is_test_mode ? "#38bdf8" : "#cbd5e1", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
                  T
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Test Mode Keys</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>Used when Test Mode is enabled · keys start with <code style={{ background: "#e0f2fe", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>rzp_test_</code></div>
                </div>
                {settings.is_test_mode && (
                  <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "#0284c7", background: "#e0f2fe", padding: "4px 10px", borderRadius: 20 }}>ACTIVE</span>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <FloatingInput
                  label="Test Key ID"
                  value={settings.razorpay_test_key_id}
                  placeholder="rzp_test_XXXXXXXX"
                  onChange={(e: any) => setSettings({ ...settings, razorpay_test_key_id: e.target.value })}
                />
                <FloatingInput
                  label="Test Key Secret"
                  type="password"
                  value={settings.razorpay_test_key_secret}
                  placeholder={settings.has_test_secret ? "•••••••• (Saved)" : ""}
                  onChange={(e: any) => setSettings({ ...settings, razorpay_test_key_secret: e.target.value })}
                />
              </div>
            </div>

            {/* Live Mode Keys */}
            <div style={{ marginBottom: 28, padding: "20px", background: !settings.is_test_mode ? "#fef2f2" : "#f8fafc", borderRadius: 12, border: `1.5px solid ${!settings.is_test_mode ? "#ef4444" : "#e2e8f0"}`, transition: "all 0.2s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: !settings.is_test_mode ? "#ef4444" : "#cbd5e1", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
                  L
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Live Mode Keys</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>Used when Test Mode is disabled · keys start with <code style={{ background: "#fee2e2", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>rzp_live_</code></div>
                </div>
                {!settings.is_test_mode && (
                  <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "#dc2626", background: "#fee2e2", padding: "4px 10px", borderRadius: 20 }}>ACTIVE</span>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <FloatingInput
                  label="Live Key ID"
                  value={settings.razorpay_live_key_id}
                  placeholder="rzp_live_XXXXXXXX"
                  onChange={(e: any) => setSettings({ ...settings, razorpay_live_key_id: e.target.value })}
                />
                <FloatingInput
                  label="Live Key Secret"
                  type="password"
                  value={settings.razorpay_live_key_secret}
                  placeholder={settings.has_live_secret ? "•••••••• (Saved)" : ""}
                  onChange={(e: any) => setSettings({ ...settings, razorpay_live_key_secret: e.target.value })}
                />
              </div>
            </div>

            {/* Legacy / Fallback Keys */}
            <div style={{ marginBottom: 24, padding: "16px 20px", background: "#f8fafc", borderRadius: 10, border: "1px dashed #cbd5e1" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Fallback Keys (Optional)
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 12 }}>
                Used if test/live keys are not set. Keep for backward compatibility.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <FloatingInput
                  label="Fallback Key ID"
                  value={settings.razorpay_key_id}
                  onChange={(e: any) => setSettings({ ...settings, razorpay_key_id: e.target.value })}
                />
                <FloatingInput
                  label="Fallback Key Secret"
                  type="password"
                  value={settings.razorpay_key_secret}
                  placeholder={settings.has_secret ? "•••••••• (Saved)" : ""}
                  onChange={(e: any) => setSettings({ ...settings, razorpay_key_secret: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
              <div>
                <FloatingInput
                  label="Default Currency (e.g. INR, USD)"
                  value={settings.currency}
                  required
                  onChange={(e: any) => setSettings({ ...settings, currency: e.target.value })}
                />
              </div>
            </div>

            <div style={{ padding: "16px 20px", background: settings.is_test_mode ? "#fcf8e3" : "#f0fdf4", borderRadius: 10, border: `1px solid ${settings.is_test_mode ? "#faebcc" : "#bbf7d0"}`, display: "flex", alignItems: "center", gap: 12, transition: "all 0.2s" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, color: settings.is_test_mode ? "#8a6d3b" : "#15803d" }}>
                <input
                  type="checkbox"
                  checked={settings.is_test_mode}
                  onChange={(e) => setSettings({ ...settings, is_test_mode: e.target.checked })}
                  style={{ width: 16, height: 16, cursor: "pointer", accentColor: settings.is_test_mode ? "#f0ad4e" : "#22c55e" }}
                />
                Enable Test Mode
              </label>
              <span style={{ fontSize: 12, color: settings.is_test_mode ? "#8a6d3b" : "#15803d" }}>
                {settings.is_test_mode
                  ? "Test mode is ON — no real charges will be made. Test keys will be used."
                  : "Live mode is ON — real payments will be processed. Live keys will be used."}
              </span>
            </div>

            {/* UPI / QR Direct Payment Section */}
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 24, paddingBottom: 12, borderBottom: "1px solid #e2e8f0", marginTop: 32 }}>
              2. UPI / QR Direct Payment
            </h3>

            <div style={{ marginBottom: 24, padding: "20px", background: settings.upi_enabled ? "#f0fdf4" : "#f8fafc", borderRadius: 12, border: `1.5px solid ${settings.upi_enabled ? "#22c55e" : "#e2e8f0"}`, transition: "all 0.2s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: settings.upi_enabled ? "#22c55e" : "#cbd5e1", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
                  QR
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>UPI QR Payment</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>Show QR code on invoice page for direct UPI payment with screenshot upload</div>
                </div>
                {settings.upi_enabled && (
                  <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "#15803d", background: "#dcfce7", padding: "4px 10px", borderRadius: 20 }}>ACTIVE</span>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, padding: "12px 16px", background: settings.upi_enabled ? "#f0fdf4" : "#f8fafc", borderRadius: 10, border: `1px solid ${settings.upi_enabled ? "#bbf7d0" : "#e2e8f0"}` }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, color: settings.upi_enabled ? "#15803d" : "#64748b" }}>
                  <input
                    type="checkbox"
                    checked={settings.upi_enabled || false}
                    onChange={(e) => setSettings({ ...settings, upi_enabled: e.target.checked })}
                    style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#22c55e" }}
                  />
                  Enable UPI QR Payment
                </label>
                <span style={{ fontSize: 12, color: settings.upi_enabled ? "#15803d" : "#64748b" }}>
                  {settings.upi_enabled ? "Students can scan QR and upload payment screenshot on invoice page." : "Enable to show UPI QR on invoice page."}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <FloatingInput
                  label="UPI ID (e.g. name@bank)"
                  value={settings.upi_id || ""}
                  placeholder="example@okhdfcbank"
                  onChange={(e: any) => setSettings({ ...settings, upi_id: e.target.value })}
                />
                <FloatingInput
                  label="Payee Name"
                  value={settings.upi_payee_name || ""}
                  placeholder="Institute Name"
                  onChange={(e: any) => setSettings({ ...settings, upi_payee_name: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8 }}>UPI QR Code Image</label>
                <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <div style={{ width: 120, height: 120, borderRadius: 10, border: "1.5px dashed #cbd5e1", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                    {upiQrFile ? (
                      <img src={URL.createObjectURL(upiQrFile)} alt="QR Preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    ) : settings.upi_qr_url ? (
                      <img src={settings.upi_qr_url} alt="UPI QR" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    ) : (
                      <span style={{ fontSize: 11, color: "#94a3b8", textAlign: "center" }}>No QR<br />uploaded</span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => { if (e.target.files?.[0]) setUpiQrFile(e.target.files[0]); }}
                      style={{ display: "none" }}
                      id="upi-qr-upload"
                    />
                    <label
                      htmlFor="upi-qr-upload"
                      style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                    >
                      <Icon name="upload" size={16} /> {settings.upi_qr_url || upiQrFile ? "Replace QR Image" : "Upload QR Image"}
                    </label>
                    {(settings.upi_qr_url || upiQrFile) && (
                      <button
                        type="button"
                        onClick={() => { setUpiQrFile(null); setSettings({ ...settings, upi_qr_url: "" }); }}
                        style={{ marginLeft: 8, padding: "10px 14px", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                      >
                        Remove
                      </button>
                    )}
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>
                      Upload a QR code image that students will scan to pay via UPI.
                    </div>
                  </div>
                </div>
              </div>
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
