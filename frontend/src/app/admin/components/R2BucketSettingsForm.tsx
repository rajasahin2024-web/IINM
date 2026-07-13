"use client";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL } from "@/lib/config";
import React, { useState, useEffect, useCallback } from "react";
import { showSuccess, showDelete, showWarning, showInfo } from "@/lib/toast";
import { Icon } from "../icons";
import R2FileManager from "./R2FileManager";

const API = `${API_BASE_URL}/settings/r2`;

// ─── Types ─────────────────────────────────────────────────────────────────────
interface R2SettingsData {
  account_id: string;
  access_key_id: string;
  secret_access_key: string;
  bucket_name: string;
  public_url: string;
  is_active: boolean;
}
interface StorageStats {
  totalBytes: number;
  totalObjects: number;
  loading: boolean;
  error: string;
}

// ─── Floating Input ─────────────────────────────────────────────────────────────
function FloatingInput({
  label, type = "text", value, onChange, required, hint, showToggle = false, autoComplete,
}: {
  label: string; type?: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean; hint?: string; showToggle?: boolean; autoComplete?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const hasValue = value !== "" && value !== undefined && value !== null;
  const inputType = showToggle ? (visible ? "text" : "password") : type;

  return (
    <div style={{ position: "relative", width: "100%", marginBottom: 8 }}>
      <div style={{ position: "relative" }}>
        <input
          type={inputType} required={required} value={value}
          onChange={onChange} autoComplete={autoComplete || "off"}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: "100%", padding: showToggle ? "14px 44px 14px 16px" : "14px 16px",
            borderRadius: 10,
            border: `1.5px solid ${focused ? "#38bdf8" : "#e2e8f0"}`,
            outline: "none", fontSize: 14, color: "#0f172a", background: "#fff",
            transition: "border-color 0.2s, box-shadow 0.2s", boxSizing: "border-box",
            boxShadow: focused ? "0 0 0 3px rgba(56,189,248,0.15)" : "none",
            fontFamily: "inherit",
          }}
        />
        <label style={{
          position: "absolute", left: 14,
          top: focused || hasValue ? -9 : "50%",
          transform: focused || hasValue ? "none" : "translateY(-50%)",
          fontSize: focused || hasValue ? 11 : 14,
          fontWeight: focused || hasValue ? 600 : 400,
          color: focused ? "#38bdf8" : hasValue ? "#64748b" : "#94a3b8",
          background: focused || hasValue ? "#fff" : "transparent",
          padding: focused || hasValue ? "0 4px" : "0",
          transition: "all 0.2s cubic-bezier(.4,0,.2,1)",
          pointerEvents: "none", zIndex: 1,
        }}>{label}</label>

        {showToggle && (
          <button type="button" onClick={() => setVisible(v => !v)}
            title={visible ? "Hide" : "Show"}
            style={{
              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer",
              color: "#94a3b8", padding: 4, display: "flex", alignItems: "center",
              transition: "color 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "#38bdf8")}
            onMouseLeave={e => (e.currentTarget.style.color = "#94a3b8")}
          >
            {visible ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        )}
      </div>
      {hint && <p style={{ margin: "4px 0 0 12px", fontSize: 12, color: "#94a3b8" }}>{hint}</p>}
    </div>
  );
}

// ─── Storage Summary Panel ─────────────────────────────────────────────────────
function StorageSummary({ hasBucket }: { hasBucket: boolean }) {
  const [stats, setStats] = useState<StorageStats>({ totalBytes: 0, totalObjects: 0, loading: false, error: "" });

  const fmtBytes = (bytes: number) => {
    if (!bytes) return "0 Bytes";
    const k = 1024, sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const fetchStats = useCallback(async () => {
    if (!hasBucket) return;
    setStats(s => ({ ...s, loading: true, error: "" }));
    try {
      const res = await apiFetch(`${API}/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats({ totalBytes: data.total_bytes, totalObjects: data.total_objects, loading: false, error: "" });
      } else {
        const d = await res.json();
        setStats(s => ({ ...s, loading: false, error: d.detail || "Failed to fetch" }));
      }
    } catch {
      setStats(s => ({ ...s, loading: false, error: "Network error" }));
    }
  }, [hasBucket]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const MAX_BYTES = 10 * 1024 * 1024 * 1024;
  const pct = Math.min(Math.round((stats.totalBytes / MAX_BYTES) * 100), 100);
  const conic = `conic-gradient(#38bdf8 0% ${pct}%, #e2e8f0 ${pct}% 100%)`;

  return (
    <div style={{ background: "linear-gradient(135deg,#f0f9ff 0%,#fafeff 100%)", borderRadius: 14, border: "1px solid #e0f2fe", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", overflow: "hidden" }}>
      <div style={{ padding: "28px 28px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="pie-chart" size={18} /> Storage Summary
          </h2>
          {hasBucket && (
            <button onClick={fetchStats} title="Refresh" disabled={stats.loading}
              style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #bae6fd", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#38bdf8" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                style={{ animation: stats.loading ? "spin 1s linear infinite" : "none" }}>
                <polyline points="23,4 23,10 17,10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
              </svg>
            </button>
          )}
        </div>

        {!hasBucket ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <Icon name="hard-drive" size={24} />
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>
              Save credentials with a Bucket Name to view live stats.
            </p>
          </div>
        ) : stats.error ? (
          <div style={{ textAlign: "center", padding: "16px 0", color: "#ef4444", fontSize: 13 }}>⚠ {stats.error}</div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
              <div style={{ width: 140, height: 140, borderRadius: "50%", background: conic, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 0 0 16px #fff, 0 8px 24px -4px rgba(56,189,248,0.15)" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  {stats.loading ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 11-18 0"/></svg>
                  ) : (
                    <>
                      <span style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>{pct}%</span>
                      <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600, letterSpacing: "0.8px" }}>IN USE</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "Total Storage", value: fmtBytes(stats.totalBytes), icon: "hard-drive", color: "#38bdf8", bg: "#f0f9ff" },
                { label: "Total Objects", value: `${stats.totalObjects.toLocaleString()} files`, icon: "copy", color: "#8b5cf6", bg: "#f5f3ff" },
              ].map(stat => (
                <div key={stat.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 10.5, color: "#64748b", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase" }}>{stat.label}</p>
                    <p style={{ margin: "3px 0 0", fontSize: 17, fontWeight: 800, color: "#0f172a" }}>{stat.value}</p>
                  </div>
                  <div style={{ color: stat.color, background: stat.bg, padding: 9, borderRadius: 9 }}>
                    <Icon name={stat.icon} size={22} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Form ─────────────────────────────────────────────────────────────────
export default function R2BucketSettingsForm() {
  const card = {
    background: "#fff", borderRadius: 14,
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)",
    border: "1px solid #f1f5f9", overflow: "hidden",
  };

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [testing,  setTesting]  = useState(false);
  const [hasSecret, setHasSecret] = useState(false);
  const [activeTab, setActiveTab] = useState<"settings" | "files">("settings");

  const [settings, setSettings] = useState<R2SettingsData>({
    account_id: "", access_key_id: "", secret_access_key: "",
    bucket_name: "", public_url: "", is_active: true,
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(API);
        if (res.ok) {
          const data = await res.json();
          setSettings({
            account_id: data.account_id || "",
            access_key_id: data.access_key_id || "",
            secret_access_key: "",
            bucket_name: data.bucket_name || "",
            public_url: data.public_url || "",
            is_active: data.is_active ?? true,
          });
          setHasSecret(data.has_secret || false);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch(API, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      setHasSecret(true);
      showSuccess("R2 Bucket settings saved successfully!");
    } catch (err: any) {
      showDelete(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await apiFetch(`${API}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: settings.account_id,
          access_key_id: settings.access_key_id,
          secret_access_key: settings.secret_access_key || undefined,
          bucket_name: settings.bucket_name || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess("Connected ✓ " + data.message);
      } else {
        showDelete("Connection Failed: " + data.detail);
      }
    } catch {
      showWarning("Connection Failed: Network error or server unreachable.");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="manager-content" style={{ width: "100%" }}>
        <div style={{ display: "grid", gridTemplateColumns: "8fr 4fr", gap: 24 }}>
          {[1, 2].map(i => (
            <div key={i} style={card}>
              <div style={{ padding: 32 }}>
                {[1, 2, 3].map(j => <div key={j} className="skeleton sk-input" style={{ height: 52, marginBottom: 16 }} />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const TABS = [
    { id: "settings", label: "⚙ API Credentials" },
    { id: "files",    label: "📁 File Manager" },
  ] as const;

  return (
    <div className="manager-content" style={{ width: "100%" }}>
      <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>

      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 12 }}>
          <Icon name="database" size={28} /> Cloudflare R2 Bucket Setup
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: "#64748b" }}>
          Configure your S3-compatible R2 storage for asset media delivery.
        </p>
      </header>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#f1f5f9", padding: 4, borderRadius: 10, width: "fit-content" }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "8px 20px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: activeTab === tab.id ? "#fff" : "transparent",
              color: activeTab === tab.id ? "#0f172a" : "#64748b",
              boxShadow: activeTab === tab.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.18s",
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Settings Tab ── */}
      {activeTab === "settings" && (
        <div style={{ display: "grid", gridTemplateColumns: "8fr 4fr", gap: 24, alignItems: "start" }}>

          {/* Credentials Form */}
          <div style={card}>
            <form onSubmit={handleSave}>
              <div style={{ padding: "32px 32px 28px", borderBottom: "1px solid #f1f5f9" }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 24, paddingBottom: 12, borderBottom: "1px solid #e2e8f0" }}>
                  API Credentials
                </h3>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 20 }}>
                  <div style={{ gridColumn: "span 2" }}>
                    <FloatingInput
                      label="S3 Endpoint URL or Account ID"
                      value={settings.account_id} required
                      onChange={e => setSettings(s => ({ ...s, account_id: e.target.value }))}
                      hint="e.g. https://f6cd...a2.r2.cloudflarestorage.com (jurisdiction-specific endpoint)"
                      autoComplete="off"
                    />
                  </div>

                  <FloatingInput
                    label="Access Key ID"
                    value={settings.access_key_id} required
                    onChange={e => setSettings(s => ({ ...s, access_key_id: e.target.value }))}
                    autoComplete="off"
                  />

                  <div>
                    <FloatingInput
                      label={hasSecret && !settings.secret_access_key
                        ? "Secret Access Key (saved — enter new to change)"
                        : "Secret Access Key"}
                      value={settings.secret_access_key}
                      onChange={e => setSettings(s => ({ ...s, secret_access_key: e.target.value }))}
                      showToggle
                      autoComplete="new-password"
                    />
                    {hasSecret && !settings.secret_access_key && (
                      <p style={{ margin: "-4px 0 0 12px", fontSize: 11, color: "#22c55e", fontWeight: 600 }}>
                        ✓ A secret key is already saved.
                      </p>
                    )}
                  </div>

                  <FloatingInput
                    label="Bucket Name"
                    value={settings.bucket_name}
                    onChange={e => setSettings(s => ({ ...s, bucket_name: e.target.value }))}
                    hint="Required to browse files and view live storage stats"
                  />

                  <FloatingInput
                    label="Public Domain / URL"
                    type="url"
                    value={settings.public_url}
                    onChange={e => setSettings(s => ({ ...s, public_url: e.target.value }))}
                    hint="Your R2 public URL (used to generate file links)"
                  />
                </div>

                <div style={{ padding: "14px 18px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0", display: "flex", alignItems: "center", gap: 12 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#166534" }}>
                    <input type="checkbox" checked={settings.is_active}
                      onChange={e => setSettings(s => ({ ...s, is_active: e.target.checked }))}
                      style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#22c55e" }} />
                    Set as Active Storage Provider
                  </label>
                  <span style={{ fontSize: 12, color: "#64748b" }}>All new media uploads will be directed to this R2 bucket.</span>
                </div>
              </div>

              <div style={{ padding: "18px 32px", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button type="button" onClick={handleTest} disabled={testing}
                  style={{ background: "#fff", color: "#475569", border: "1px solid #cbd5e1", padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: testing ? "not-allowed" : "pointer", opacity: testing ? 0.7 : 1, transition: "all 0.2s" }}
                  onMouseEnter={e => !testing && (e.currentTarget.style.background = "#f1f5f9")}
                  onMouseLeave={e => !testing && (e.currentTarget.style.background = "#fff")}>
                  {testing ? "Testing..." : "Test Connection"}
                </button>
                <button type="submit" disabled={saving}
                  style={{ background: "#38bdf8", color: "#fff", border: "none", padding: "11px 28px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, opacity: saving ? 0.7 : 1, transition: "all 0.2s", boxShadow: "0 4px 6px -1px rgba(56,189,248,0.3)" }}>
                  {saving ? "Saving..." : <><Icon name="save" size={16} /> Save Settings</>}
                </button>
              </div>
            </form>
          </div>

          {/* Storage Stats */}
          <StorageSummary hasBucket={!!settings.bucket_name} />
        </div>
      )}

      {/* ── File Manager Tab ── */}
      {activeTab === "files" && (
        <div style={{
          background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9",
          overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
          minHeight: 650, display: "flex", flexDirection: "column",
        }}>
          <R2FileManager />
        </div>
      )}
    </div>
  );
}
