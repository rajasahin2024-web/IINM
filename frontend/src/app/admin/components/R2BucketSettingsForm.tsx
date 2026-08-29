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
  hls_enabled: boolean;
  hls_qualities: string;
}
interface StorageStats {
  totalBytes: number;
  totalObjects: number;
  loading: boolean;
  error: string;
}
interface FfmpegStatus {
  installed: boolean;
  version: string | null;
  install_hint: string | null;
  os: string | null;
  loading: boolean;
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
  const [activeTab, setActiveTab] = useState<"settings" | "files" | "hls">("settings");
  const [ffmpeg, setFfmpeg] = useState<FfmpegStatus>({
    installed: false, version: null, install_hint: null, os: null, loading: true,
  });

  const [settings, setSettings] = useState<R2SettingsData>({
    account_id: "", access_key_id: "", secret_access_key: "",
    bucket_name: "", public_url: "", is_active: true,
    hls_enabled: false, hls_qualities: "720p,480p,360p",
  });

  const fetchFfmpegStatus = useCallback(async () => {
    setFfmpeg(s => ({ ...s, loading: true }));
    try {
      const res = await apiFetch(`${API}/ffmpeg-status`);
      if (res.ok) {
        const data = await res.json();
        setFfmpeg({
          installed: data.installed || false,
          version: data.version || null,
          install_hint: data.install_hint || null,
          os: data.os || null,
          loading: false,
        });
      } else {
        setFfmpeg(s => ({ ...s, loading: false }));
      }
    } catch {
      setFfmpeg(s => ({ ...s, loading: false }));
    }
  }, []);

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
            hls_enabled: data.hls_enabled ?? false,
            hls_qualities: data.hls_qualities || "720p,480p,360p",
          });
          setHasSecret(data.has_secret || false);
        }
      } finally {
        setLoading(false);
      }
    })();
    fetchFfmpegStatus();
  }, [fetchFfmpegStatus]);

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
    { id: "hls",      label: "🎬 HLS Streaming" },
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

      {/* ── File Manager Tab (Fullscreen) ── */}
      {activeTab === "files" && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "#fff", display: "flex", flexDirection: "column",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="database" size={18} /> R2 File Manager
            </h2>
            <button onClick={() => setActiveTab("settings")}
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Close
            </button>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <R2FileManager />
          </div>
        </div>
      )}

      {/* ── HLS Streaming Tab ── */}
      {activeTab === "hls" && (
        <div style={{ display: "grid", gridTemplateColumns: "8fr 4fr", gap: 24, alignItems: "start" }}>
          {/* HLS Config Card */}
          <div style={card}>
            <div style={{ padding: "32px 32px 28px", borderBottom: "1px solid #f1f5f9" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 8, paddingBottom: 12, borderBottom: "1px solid #e2e8f0" }}>
                HLS Adaptive Streaming
              </h3>
              <p style={{ margin: "0 0 20px", fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                When enabled, uploaded videos are automatically transcoded to HLS (HTTP Live Streaming)
                with multiple quality renditions and stored in your R2 bucket. This provides adaptive
                bitrate playback — the video quality adjusts to the viewer&apos;s network speed,
                minimizing buffering on slow connections.
              </p>

              {/* FFmpeg Status Card */}
              <div style={{
                padding: "18px 20px", borderRadius: 12, marginBottom: 20,
                background: ffmpeg.installed ? "#f0fdf4" : "#fef2f2",
                border: `1px solid ${ffmpeg.installed ? "#bbf7d0" : "#fecaca"}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                      background: ffmpeg.installed ? "#22c55e" : "#ef4444", color: "#fff", flexShrink: 0,
                    }}>
                      {ffmpeg.loading ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 11-18 0"/></svg>
                      ) : ffmpeg.installed ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      )}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: ffmpeg.installed ? "#166534" : "#991b1b" }}>
                        {ffmpeg.loading ? "Checking FFmpeg..." : ffmpeg.installed ? "FFmpeg Detected" : "FFmpeg Not Found"}
                      </p>
                      {ffmpeg.version && (
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#15803d", fontFamily: "monospace" }}>{ffmpeg.version}</p>
                      )}
                      {ffmpeg.os && (
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#64748b" }}>OS: {ffmpeg.os}</p>
                      )}
                    </div>
                  </div>
                  <button onClick={fetchFfmpegStatus} disabled={ffmpeg.loading}
                    title="Re-check FFmpeg"
                    style={{
                      padding: "8px 14px", borderRadius: 8, border: `1px solid ${ffmpeg.installed ? "#86efac" : "#fca5a5"}`,
                      background: "#fff", fontSize: 12, fontWeight: 600, cursor: ffmpeg.loading ? "not-allowed" : "pointer",
                      color: "#475569", opacity: ffmpeg.loading ? 0.6 : 1, transition: "all 0.15s", whiteSpace: "nowrap",
                    }}>
                    ↻ Re-check
                  </button>
                </div>
                {!ffmpeg.installed && !ffmpeg.loading && ffmpeg.install_hint && (
                  <div style={{ marginTop: 14, padding: "12px 14px", background: "#fff", borderRadius: 8, border: "1px solid #fecaca" }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#991b1b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Install Instructions</p>
                    <code style={{ display: "block", fontSize: 12, color: "#0f172a", fontFamily: "monospace", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{ffmpeg.install_hint}</code>
                  </div>
                )}
              </div>

              {/* HLS Enable Toggle */}
              <div style={{
                padding: "16px 18px", borderRadius: 12, marginBottom: 20,
                background: settings.hls_enabled ? "#f0fdf4" : "#f8fafc",
                border: `1px solid ${settings.hls_enabled ? "#bbf7d0" : "#e2e8f0"}`,
                display: "flex", alignItems: "center", gap: 14,
              }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, color: settings.hls_enabled ? "#166534" : "#0f172a" }}>
                  <input type="checkbox" checked={settings.hls_enabled}
                    onChange={e => setSettings(s => ({ ...s, hls_enabled: e.target.checked }))}
                    disabled={!ffmpeg.installed}
                    style={{ width: 18, height: 18, cursor: ffmpeg.installed ? "pointer" : "not-allowed", accentColor: "#22c55e", flexShrink: 0 }} />
                  Enable HLS Transcoding
                </label>
                {!ffmpeg.installed && (
                  <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 600 }}>⚠ Install FFmpeg first</span>
                )}
              </div>

              {/* Quality Presets */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#0f172a", marginBottom: 8 }}>
                  Quality Renditions
                </label>
                <p style={{ margin: "0 0 10px", fontSize: 12, color: "#94a3b8" }}>
                  Select which quality levels to generate. More qualities = better adaptation but larger storage.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {["1080p", "720p", "480p", "360p", "240p"].map(q => {
                    const selected = settings.hls_qualities.split(",").map(s => s.trim()).includes(q);
                    return (
                      <button key={q} type="button"
                        onClick={() => {
                          const current = settings.hls_qualities.split(",").map(s => s.trim()).filter(Boolean);
                          const updated = selected ? current.filter(x => x !== q) : [...current, q];
                          // Sort by quality order
                          const order = ["1080p", "720p", "480p", "360p", "240p"];
                          updated.sort((a, b) => order.indexOf(a) - order.indexOf(b));
                          setSettings(s => ({ ...s, hls_qualities: updated.join(",") }));
                        }}
                        disabled={!settings.hls_enabled}
                        style={{
                          padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: settings.hls_enabled ? "pointer" : "not-allowed",
                          border: `1.5px solid ${selected ? "#22c55e" : "#e2e8f0"}`,
                          background: selected ? "#22c55e" : "#fff",
                          color: selected ? "#fff" : "#64748b",
                          opacity: settings.hls_enabled ? 1 : 0.5,
                          transition: "all 0.15s",
                        }}>
                        {q}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Save button */}
            <div style={{ padding: "18px 32px", background: "#f8fafc", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={handleSave} disabled={saving}
                style={{
                  background: "#38bdf8", color: "#fff", border: "none", padding: "11px 28px", borderRadius: 10,
                  fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", display: "flex",
                  alignItems: "center", gap: 8, opacity: saving ? 0.7 : 1, transition: "all 0.2s",
                  boxShadow: "0 4px 6px -1px rgba(56,189,248,0.3)",
                }}>
                {saving ? "Saving..." : <><Icon name="save" size={16} /> Save HLS Settings</>}
              </button>
            </div>
          </div>

          {/* Info Sidebar */}
          <div style={card}>
            <div style={{ padding: "24px" }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                How HLS Works
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { step: "1", text: "Upload a video via Course Media library" },
                  { step: "2", text: "Server transcodes to HLS in background (FFmpeg)" },
                  { step: "3", text: "HLS segments uploaded to R2, local temp deleted" },
                  { step: "4", text: "Player auto-adapts quality to viewer's network" },
                ].map(item => (
                  <div key={item.step} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%", background: "#e0f2fe", color: "#0284c7",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700, flexShrink: 0,
                    }}>{item.step}</div>
                    <p style={{ margin: 0, fontSize: 12.5, color: "#475569", lineHeight: 1.5 }}>{item.text}</p>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 20, padding: "12px 14px", background: "#fffbeb", borderRadius: 8, border: "1px solid #fde68a" }}>
                <p style={{ margin: 0, fontSize: 11, color: "#92400e", lineHeight: 1.5 }}>
                  <strong>Note:</strong> Transcoding runs in the background after upload.
                  The video is playable as MP4 immediately, and switches to HLS
                  once processing completes. Existing videos need a re-upload to
                  get HLS streams.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
