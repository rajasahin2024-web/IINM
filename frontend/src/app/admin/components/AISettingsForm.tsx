"use client";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL } from "@/lib/config";
import React, { useState, useEffect, useMemo } from "react";
import { useToast } from "./ToastProvider";
import { Icon } from "../icons";

const API = `${API_BASE_URL}/settings/ai`;
const MODELS_API = `${API_BASE_URL}/settings/ai/openrouter/models`;
const TEST_API = `${API_BASE_URL}/settings/ai/openrouter/test`;

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ORModel {
  id: string;
  name: string;
  context_length: number;
  architecture: {
    modality: string;
    input_modalities: string[];
    output_modalities: string[];
  };
  pricing: {
    prompt: string;
    completion: string;
    image?: string;
    audio?: string;
  };
  top_provider: {
    max_completion_tokens: number | null;
  };
  supported_parameters: string[];
}

interface AISettingsData {
  openrouter_api_key: string;
  model_exam_text: string;
  model_image_reply: string;
  model_video_reply: string;
  model_file_read: string;
  model_general_text: string;
  model_thinking: string;
  model_live_doubt: string;
  is_active: boolean;
}

interface Filters {
  text: boolean;
  image: boolean;
  video: boolean;
  file: boolean;
  audio: boolean;
  reasoning: boolean;
  freeOnly: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getCapabilities(m: ORModel) {
  const inputs = m.architecture?.input_modalities || [];
  const params = m.supported_parameters || [];
  return {
    text: inputs.includes("text"),
    image: inputs.includes("image"),
    video: inputs.includes("video"),
    file: inputs.includes("file"),
    audio: inputs.includes("audio"),
    reasoning: params.includes("include_reasoning") || params.includes("reasoning") || params.includes("reasoning_effort"),
  };
}

function formatPrice(p?: string) {
  if (!p || p === "-1") return "—";
  if (p === "0") return "Free";
  const n = parseFloat(p);
  if (isNaN(n)) return "—";
  const per1m = n * 1_000_000;
  if (per1m < 0.001) return `$${n}`;
  return `$${per1m.toFixed(3)}/1M`;
}

const USE_CASES = [
  { key: "model_exam_text" as const, label: "Online Exam Text", icon: "clipboard", filter: (c: ReturnType<typeof getCapabilities>) => c.text },
  { key: "model_image_reply" as const, label: "Image Read / Reply", icon: "image", filter: (c: ReturnType<typeof getCapabilities>) => c.image },
  { key: "model_video_reply" as const, label: "Video Read / Reply", icon: "video", filter: (c: ReturnType<typeof getCapabilities>) => c.video },
  { key: "model_file_read" as const, label: "File Read", icon: "file-text", filter: (c: ReturnType<typeof getCapabilities>) => c.file },
  { key: "model_general_text" as const, label: "General Text", icon: "message-square", filter: (c: ReturnType<typeof getCapabilities>) => c.text },
  { key: "model_thinking" as const, label: "Thinking / Reasoning", icon: "cpu", filter: (c: ReturnType<typeof getCapabilities>) => c.reasoning },
  { key: "model_live_doubt" as const, label: "Live Class Doubt Clearing", icon: "help-circle", filter: (c: ReturnType<typeof getCapabilities>) => c.text },
];

const CAPABILITY_META = [
  { key: "text" as const, label: "Text", color: "#0ea5e9" },
  { key: "image" as const, label: "Image", color: "#8b5cf6" },
  { key: "video" as const, label: "Video", color: "#f59e0b" },
  { key: "file" as const, label: "File", color: "#10b981" },
  { key: "audio" as const, label: "Audio", color: "#ef4444" },
  { key: "reasoning" as const, label: "Reasoning", color: "#ec4899" },
];

// ─── Floating Input ────────────────────────────────────────────────────────────
function FloatingInput({ label, type = "text", value, onChange, required, hint, showToggle = false }: {
  label: string; type?: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean; hint?: string; showToggle?: boolean;
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
          onChange={onChange}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: "100%", padding: showToggle ? "14px 44px 14px 16px" : "14px 16px",
            borderRadius: 10,
            border: `1.5px solid ${focused ? "#e63946" : "#e2e8f0"}`,
            outline: "none", fontSize: 14, color: "#0f172a", background: "#fff",
            transition: "border-color 0.2s, box-shadow 0.2s", boxSizing: "border-box",
            boxShadow: focused ? "0 0 0 3px rgba(230,57,70,0.12)" : "none",
            fontFamily: "inherit",
          }}
        />
        <label style={{
          position: "absolute", left: 14,
          top: focused || hasValue ? -9 : "50%",
          transform: focused || hasValue ? "none" : "translateY(-50%)",
          fontSize: focused || hasValue ? 11 : 14,
          fontWeight: focused || hasValue ? 600 : 400,
          color: focused ? "#e63946" : hasValue ? "#64748b" : "#94a3b8",
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
            onMouseEnter={e => (e.currentTarget.style.color = "#e63946")}
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

function CapabilityBadge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 999,
      fontSize: 11, fontWeight: 600,
      background: `${color}15`, color, border: `1px solid ${color}30`
    }}>
      {label}
    </span>
  );
}

// ─── Main Form ─────────────────────────────────────────────────────────────────
export default function AISettingsForm() {
  const { showToast } = useToast();
  const toast = {
    success: (msg: string) => showToast(msg, "success"),
    error: (msg: string) => showToast(msg, "error")
  };
  const card = {
    background: "#fff", borderRadius: 14,
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)",
    border: "1px solid #f1f5f9", overflow: "hidden",
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [hasOpenRouterKey, setHasOpenRouterKey] = useState(false);
  const [models, setModels] = useState<ORModel[]>([]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>({ text: false, image: false, video: false, file: false, audio: false, reasoning: false, freeOnly: false });
  const [activeTab, setActiveTab] = useState<"setup" | "models" | "assign">("setup");

  const [settings, setSettings] = useState<AISettingsData>({
    openrouter_api_key: "",
    model_exam_text: "",
    model_image_reply: "",
    model_video_reply: "",
    model_file_read: "",
    model_general_text: "",
    model_thinking: "",
    model_live_doubt: "",
    is_active: true,
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(API);
        if (res.ok) {
          const data = await res.json();
          setSettings({
            openrouter_api_key: "",
            model_exam_text: data.model_exam_text || "",
            model_image_reply: data.model_image_reply || "",
            model_video_reply: data.model_video_reply || "",
            model_file_read: data.model_file_read || "",
            model_general_text: data.model_general_text || "",
            model_thinking: data.model_thinking || "",
            model_live_doubt: data.model_live_doubt || "",
            is_active: data.is_active ?? true,
          });
          setHasOpenRouterKey(data.has_openrouter_key || false);
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
      setHasOpenRouterKey(true);
      toast.success("AI settings saved successfully.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestAndSync = async () => {
    setTesting(true);
    try {
      const res = await apiFetch(TEST_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: settings.openrouter_api_key || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Connected to OpenRouter");
        if (data.models && Array.isArray(data.models)) {
          setModels(data.models);
        }
        setActiveTab("models");
      } else {
        toast.error(data.detail || "Connection failed");
      }
    } catch {
      toast.error("Connection failed: Network error");
    } finally {
      setTesting(false);
    }
  };

  const handleSyncModelsOnly = async () => {
    setSyncing(true);
    try {
      const res = await apiFetch(MODELS_API);
      if (res.ok) {
        const data = await res.json();
        setModels(data.data || []);
        toast.success("Models synced from OpenRouter");
      } else {
        toast.error("Failed to sync models");
      }
    } catch {
      toast.error("Network error while syncing models");
    } finally {
      setSyncing(false);
    }
  };

  const filteredModels = useMemo(() => {
    let list = [...models];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q));
    }
    if (filters.text) list = list.filter(m => getCapabilities(m).text);
    if (filters.image) list = list.filter(m => getCapabilities(m).image);
    if (filters.video) list = list.filter(m => getCapabilities(m).video);
    if (filters.file) list = list.filter(m => getCapabilities(m).file);
    if (filters.audio) list = list.filter(m => getCapabilities(m).audio);
    if (filters.reasoning) list = list.filter(m => getCapabilities(m).reasoning);
    if (filters.freeOnly) list = list.filter(m => {
      const p = m.pricing?.prompt;
      const c = m.pricing?.completion;
      return (p === "0" || p === "-1") && (c === "0" || c === "-1");
    });
    return list;
  }, [models, search, filters]);

  const compatibleModelsFor = (filterFn: (c: ReturnType<typeof getCapabilities>) => boolean) => {
    return models.filter(m => filterFn(getCapabilities(m)));
  };

  if (loading) {
    return (
      <div className="manager-content" style={{ width: "100%" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
          <div style={card}>
            <div style={{ padding: 32 }}>
              <div className="skeleton sk-title" style={{ width: 240, height: 28, marginBottom: 24 }} />
              {[1, 2, 3].map(j => <div key={j} className="skeleton sk-input" style={{ height: 52, marginBottom: 16 }} />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const TABS = [
    { id: "setup" as const, label: "⚙ Setup" },
    { id: "models" as const, label: "🌐 Model Browser" },
    { id: "assign" as const, label: "🎯 Assign Models" },
  ];

  return (
    <div className="manager-content" style={{ width: "100%" }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 12 }}>
          <Icon name="cpu" size={28} /> AI Settings (OpenRouter)
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: "#64748b" }}>
          Configure OpenRouter API integration. Sync models, view capabilities & pricing, and assign models to each AI use-case.
        </p>
      </header>

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

      {activeTab === "setup" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
          <div style={card}>
            <form onSubmit={handleSave}>
              <div style={{ padding: "32px 32px 28px", borderBottom: "1px solid #f1f5f9" }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 24, paddingBottom: 12, borderBottom: "1px solid #e2e8f0" }}>
                  OpenRouter API Credentials
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24, marginBottom: 20, maxWidth: "700px" }}>
                  <div>
                    <FloatingInput
                      label={hasOpenRouterKey && !settings.openrouter_api_key ? "OpenRouter API Key (saved — enter new to change)" : "OpenRouter API Key"}
                      value={settings.openrouter_api_key}
                      onChange={e => setSettings(s => ({ ...s, openrouter_api_key: e.target.value }))}
                      showToggle
                    />
                    {hasOpenRouterKey && !settings.openrouter_api_key && (
                      <p style={{ margin: "-4px 0 0 12px", fontSize: 11, color: "#22c55e", fontWeight: 600 }}>✓ An API key is already saved.</p>
                    )}
                    <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 8, marginLeft: 12, fontSize: 12, color: "#e63946", textDecoration: "none", fontWeight: 500 }}>
                      Get your API key from OpenRouter &rarr;
                    </a>
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <button type="button" onClick={handleTestAndSync} disabled={testing}
                      style={{ background: "#0a1628", color: "#fff", border: "none", padding: "10px 22px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: testing ? "not-allowed" : "pointer", opacity: testing ? 0.7 : 1, transition: "all 0.2s", display: "flex", alignItems: "center", gap: 8 }}>
                      {testing ? "Testing..." : <><Icon name="refresh-cw" size={16} /> Test & Sync Models</>}
                    </button>
                    <button type="button" onClick={handleSyncModelsOnly} disabled={syncing}
                      style={{ background: "#f8fafc", color: "#475569", border: "1.5px solid #cbd5e1", padding: "10px 22px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: syncing ? "not-allowed" : "pointer", opacity: syncing ? 0.7 : 1, transition: "all 0.2s", display: "flex", alignItems: "center", gap: 8 }}>
                      {syncing ? "Syncing..." : <><Icon name="download" size={16} /> Sync Models Only</>}
                    </button>
                  </div>
                </div>
                <div style={{ padding: "14px 18px", background: "#fff1f2", borderRadius: 10, border: "1px solid #fecdd3", display: "flex", alignItems: "center", gap: 12 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#be123c" }}>
                    <input type="checkbox" checked={settings.is_active}
                      onChange={e => setSettings(s => ({ ...s, is_active: e.target.checked }))}
                      style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#e63946" }} />
                    Enable AI Features across the app
                  </label>
                  <span style={{ fontSize: 12, color: "#64748b" }}>Required for all AI-powered workflows.</span>
                </div>
              </div>
              <div style={{ padding: "18px 32px", background: "#f8fafc", display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                <button type="submit" disabled={saving}
                  style={{ background: "#e63946", color: "#fff", border: "none", padding: "11px 28px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, opacity: saving ? 0.7 : 1, transition: "all 0.2s", boxShadow: "0 4px 6px -1px rgba(230,57,70,0.3)" }}>
                  {saving ? "Saving..." : <><Icon name="save" size={16} /> Save Settings</>}
                </button>
              </div>
            </form>
          </div>
          <div style={{ ...card, padding: 32 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="help-circle" size={18} /> How to configure
            </h3>
            <ul style={{ margin: 0, paddingLeft: 20, color: "#475569", lineHeight: 1.8, fontSize: 14 }}>
              <li>Get your API key from <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" style={{ color: "#e63946" }}>OpenRouter</a>.</li>
              <li>Enter the API Key and click <b>Test & Sync Models</b> to verify connection and fetch all models.</li>
              <li>Browse the <b>Model Browser</b> tab to see capabilities (Text, Image, Video, File, Audio, Reasoning) and pricing.</li>
              <li>Go to <b>Assign Models</b> to pick the best model for each use-case (exams, images, videos, files, reasoning, etc).</li>
              <li>Save the settings. The platform will route AI requests through OpenRouter.</li>
            </ul>
          </div>
        </div>
      )}

      {activeTab === "models" && (
        <div style={card}>
          <div style={{ padding: "24px 32px", borderBottom: "1px solid #f1f5f9", display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 240 }}>
              <Icon name="search" size={18} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search models by name or ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", outline: "none", fontSize: 14, color: "#0f172a", background: "#fff", fontFamily: "inherit" }}
              />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {CAPABILITY_META.map(cap => (
                <button key={cap.key} onClick={() => setFilters(f => ({ ...f, [cap.key]: !f[cap.key] }))}
                  style={{
                    padding: "6px 12px", borderRadius: 8, border: `1.5px solid ${filters[cap.key] ? cap.color : "#e2e8f0"}`,
                    background: filters[cap.key] ? `${cap.color}15` : "#fff", color: filters[cap.key] ? cap.color : "#64748b",
                    fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                  }}>
                  {cap.label}
                </button>
              ))}
              <button onClick={() => setFilters(f => ({ ...f, freeOnly: !f.freeOnly }))}
                style={{
                  padding: "6px 12px", borderRadius: 8, border: `1.5px solid ${filters.freeOnly ? "#10b981" : "#e2e8f0"}`,
                  background: filters.freeOnly ? "#10b98115" : "#fff", color: filters.freeOnly ? "#10b981" : "#64748b",
                  fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                }}>
                Free Only
              </button>
            </div>
          </div>
          <div style={{ padding: "0 0 16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.2fr 1fr 1fr", padding: "12px 32px", background: "#f8fafc", fontSize: 12, fontWeight: 700, color: "#475569", borderBottom: "1px solid #f1f5f9" }}>
              <span>Model</span>
              <span>Capabilities</span>
              <span>Pricing (per 1M tokens)</span>
              <span>Context / Max</span>
              <span>ID</span>
            </div>
            {filteredModels.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
                {models.length === 0 ? "Click 'Test & Sync Models' or 'Sync Models Only' to load models." : "No models match your filters."}
              </div>
            )}
            {filteredModels.map((m, idx) => {
              const caps = getCapabilities(m);
              return (
                <div key={m.id} style={{
                  display: "grid", gridTemplateColumns: "2fr 1fr 1.2fr 1fr 1fr",
                  padding: "14px 32px", fontSize: 13, color: "#0f172a",
                  borderBottom: "1px solid #f8fafc", background: idx % 2 === 0 ? "#fff" : "#fafbfc",
                  alignItems: "center", gap: 8,
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{m.architecture?.modality || "text->text"}</div>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {CAPABILITY_META.filter(c => caps[c.key]).map(c => (
                      <CapabilityBadge key={c.key} label={c.label} color={c.color} />
                    ))}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: 11, color: "#64748b" }}>In: {formatPrice(m.pricing?.prompt)}</span>
                    <span style={{ fontSize: 11, color: "#64748b" }}>Out: {formatPrice(m.pricing?.completion)}</span>
                    {m.pricing?.image && <span style={{ fontSize: 11, color: "#64748b" }}>Img: {formatPrice(m.pricing.image)}</span>}
                    {m.pricing?.audio && <span style={{ fontSize: 11, color: "#64748b" }}>Aud: {formatPrice(m.pricing.audio)}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#475569" }}>
                    {m.context_length?.toLocaleString() ?? "—"} / {m.top_provider?.max_completion_tokens?.toLocaleString() ?? "—"}
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={m.id}>
                    {m.id}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "assign" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
          <div style={card}>
            <div style={{ padding: "32px 32px 28px" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 8, paddingBottom: 12, borderBottom: "1px solid #e2e8f0" }}>
                Assign Models to Use-Cases
              </h3>
              <p style={{ margin: "0 0 20px", fontSize: 13, color: "#64748b" }}>
                Select the optimal OpenRouter model for each AI workflow. Dropdowns are automatically filtered to models that support the required capabilities.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
                {USE_CASES.map(uc => {
                  const compatible = compatibleModelsFor(uc.filter);
                  const currentVal = (settings as any)[uc.key] as string;
                  return (
                    <div key={uc.key} style={{ padding: 18, borderRadius: 12, border: "1.5px solid #e2e8f0", background: "#fff" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>
                        <Icon name={uc.icon as any} size={16} /> {uc.label}
                      </label>
                      <select
                        value={currentVal}
                        onChange={e => setSettings(s => ({ ...s, [uc.key]: e.target.value }))}
                        style={{
                          width: "100%", padding: "12px 14px", borderRadius: 10,
                          border: "1.5px solid #e2e8f0", outline: "none",
                          fontSize: 13, color: "#0f172a", background: "#fff",
                          fontFamily: "inherit", cursor: "pointer"
                        }}
                      >
                        <option value="">-- Select Model --</option>
                        {currentVal && !compatible.some(cm => cm.id === currentVal) && (
                          <option value={currentVal}>{currentVal} (Saved)</option>
                        )}
                        {compatible.map(cm => (
                          <option key={cm.id} value={cm.id}>
                            {cm.name} — {formatPrice(cm.pricing?.prompt)} / {formatPrice(cm.pricing?.completion)}
                          </option>
                        ))}
                      </select>
                      <p style={{ margin: "6px 0 0", fontSize: 11, color: "#94a3b8" }}>
                        {compatible.length} compatible model{compatible.length !== 1 ? "s" : ""} available
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ padding: "18px 32px", background: "#f8fafc", display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
              <button type="button" onClick={handleSave} disabled={saving}
                style={{ background: "#e63946", color: "#fff", border: "none", padding: "11px 28px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, opacity: saving ? 0.7 : 1, transition: "all 0.2s", boxShadow: "0 4px 6px -1px rgba(230,57,70,0.3)" }}>
                {saving ? "Saving..." : <><Icon name="save" size={16} /> Save Assignments</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
