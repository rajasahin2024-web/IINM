"use client";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL } from "@/lib/config";
import React, { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  proposedChanges?: Record<string, any>;
  proposedCatalog?: Record<string, any>;
  questions?: string[];
  attachments?: { name: string; type: string }[];
  applied?: boolean;
}

interface ORModelPricing {
  prompt?: number;
  completion?: number;
  image?: number;
  request?: number;
}

interface ORModel {
  id: string;
  name: string;
  context_length: number;
  architecture: {
    modality: string;
    input_modalities: string[];
    output_modalities: string[];
  };
  supported_parameters: string[];
  pricing?: ORModelPricing;
  description?: string;
}

type PriceCategory = "Free" | "Budget" | "Standard" | "Premium" | "Ultra";
type UseCategory = "Chat" | "Coding" | "Reasoning" | "Vision" | "Multimodal" | "General";

interface Attachment {
  name: string;
  mime_type: string;
  data_base64: string;
  preview?: string;
}

interface AICourseAgentProps {
  courseContext: Record<string, any>;
  onApplyChanges: (changes: Record<string, any>) => void;
  onCatalogCreated?: () => void;
  contextKey: string;
}

const CHAT_API = `${API_BASE_URL}/settings/ai/course-agent/chat`;
const MODELS_API = `${API_BASE_URL}/settings/ai/openrouter/models`;
const WEB_SEARCH_API = `${API_BASE_URL}/settings/ai/web-search`;
const AI_SETTINGS_API = `${API_BASE_URL}/settings/ai`;

// ─── Helper: generate unique ID ────────────────────────────────────────────────
function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Helper: format time ───────────────────────────────────────────────────────
function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

// ─── Helpers: classify OpenRouter models by price and use case ────────────────
function getModelPricePer1m(m: ORModel): number {
  const p = m.pricing;
  const prompt = typeof p?.prompt === "number" ? p.prompt : 0;
  const completion = typeof p?.completion === "number" ? p.completion : 0;
  const image = typeof p?.image === "number" ? p.image : 0;
  const request = typeof p?.request === "number" ? p.request : 0;
  const avg = Math.max(prompt, completion, request) || 0;
  return avg + image; // per-token price scaled to per-1m (OpenRouter pricing is already per-token, values like 0.0005 mean $0.50/m)
}

function getPriceCategory(m: ORModel): PriceCategory {
  const price = getModelPricePer1m(m);
  if (price === 0) return "Free";
  // OpenRouter prices are per-token, so $0.001 = $1/m, $0.005 = $5/m, etc.
  if (price < 0.0015) return "Budget";
  if (price < 0.005) return "Standard";
  if (price < 0.02) return "Premium";
  return "Ultra";
}

function getUseCategory(m: ORModel): UseCategory {
  const id = m.id.toLowerCase();
  const name = (m.name || "").toLowerCase();
  const inputs = m.architecture?.input_modalities || [];
  const outputs = m.architecture?.output_modalities || [];
  const text = `${id} ${name} ${m.description || ""}`.toLowerCase();

  const hasVision = inputs.includes("image") || outputs.includes("image") || text.includes("vision");
  const isMultimodal = inputs.length > 1 || outputs.length > 1 || hasVision;

  if (text.includes("o3") || text.includes("o1") || text.includes("reason") || text.includes("thinking") || text.includes("r1")) return "Reasoning";
  if (text.includes("code") || text.includes("coder")) return "Coding";
  if (hasVision && isMultimodal) return "Multimodal";
  if (hasVision) return "Vision";
  return "Chat";
}

function formatPrice(m: ORModel): string {
  const price = getModelPricePer1m(m);
  if (price === 0) return "Free";
  const per1m = price * 1000000;
  if (per1m < 1) return `$${(per1m * 100).toFixed(1).replace(/\.0$/, "")}¢ / 1M`;
  return `$${per1m.toFixed(2).replace(/\.00$/, "")} / 1M`;
}

// ─── Helper: file to base64 ────────────────────────────────────────────────────
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Field label mapping ───────────────────────────────────────────────────────
const FIELD_LABELS: Record<string, string> = {
  title: "Course Title",
  description: "Description",
  status: "Status",
  skill_level: "Skill Level",
  target_audience: "Target Audience",
  prerequisites: "Prerequisites",
  what_you_will_learn: "What You Will Learn",
  seo_title: "SEO Title",
  seo_description: "SEO Description",
  seo_keywords: "SEO Keywords",
  thumbnail_url: "Thumbnail URL",
  promo_video_url: "Promo Video URL",
  upload_syllabus: "Syllabus URL",
  price: "Price (INR)",
  discount_price: "Discount Price (INR)",
  price_usd: "Price (USD)",
  discount_price_usd: "Discount Price (USD)",
  is_free: "Is Free",
  validity_days: "Validity (days)",
  has_certificate: "Has Certificate",
  is_featured: "Is Featured",
  show_on_homepage: "Show on Homepage",
  is_new: "Is New",
  subject_ids: "Subject IDs",
  chapter_ids: "Chapter IDs",
  instructor_ids: "Instructor IDs",
};

// ─── Windows-style title bar button ────────────────────────────────────────────
function WinBtn({ icon, onClick, variant = "min", title }: { icon: React.ReactNode; onClick: () => void; variant?: "min" | "max" | "close"; title: string }) {
  const bg = variant === "close" ? "#e81123" : "transparent";
  const bgHover = variant === "close" ? "#f1707a" : "rgba(255,255,255,0.12)";
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 36,
        height: 28,
        border: "none",
        background: bg,
        color: "#fff",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 700,
        transition: "background 0.1s",
        flexShrink: 0,
      }}
      onMouseEnter={e => (e.currentTarget.style.background = bgHover)}
      onMouseLeave={e => (e.currentTarget.style.background = bg)}
    >
      {icon}
    </button>
  );
}

// ─── Per-question reply box ────────────────────────────────────────────────────
function QuestionReply({ question, onSend, isTyping }: { question: string; onSend: (answer: string) => void; isTyping: boolean }) {
  const [answer, setAnswer] = useState("");

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (answer.trim() && !isTyping) {
        onSend(answer.trim());
        setAnswer("");
      }
    }
  };

  return (
    <div style={{ marginTop: 6, display: "flex", gap: 6, alignItems: "flex-end" }}>
      <textarea
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        onKeyDown={handleKey}
        placeholder={`Reply to this question...`}
        rows={1}
        style={{
          flex: 1,
          padding: "7px 10px",
          borderRadius: 4,
          border: "1px solid #c7d2fe",
          fontSize: 12,
          fontWeight: 500,
          color: "#1e293b",
          resize: "none",
          outline: "none",
          minHeight: 32,
          maxHeight: 60,
          fontFamily: "inherit",
          background: "#fff",
        }}
      />
      <button
        onClick={() => {
          if (answer.trim() && !isTyping) {
            onSend(answer.trim());
            setAnswer("");
          }
        }}
        disabled={!answer.trim() || isTyping}
        style={{
          background: !answer.trim() || isTyping ? "#cbd5e1" : "#3730a3",
          border: "none",
          borderRadius: 4,
          width: 32,
          height: 32,
          cursor: !answer.trim() || isTyping ? "not-allowed" : "pointer",
          color: "#fff",
          fontSize: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        ➤
      </button>
    </div>
  );
}

// ─── Categorized AI Model Explorer dropdown ────────────────────────────────────
const PRICE_ORDER: PriceCategory[] = ["Free", "Budget", "Standard", "Premium", "Ultra"];
const USE_CASES: UseCategory[] = ["Chat", "Reasoning", "Coding", "Vision", "Multimodal"];

const PRICE_COLORS: Record<PriceCategory, string> = {
  Free: "#22c55e",
  Budget: "#0ea5e9",
  Standard: "#6366f1",
  Premium: "#f59e0b",
  Ultra: "#ef4444",
};

const USE_CASE_COLORS: Record<UseCategory, { bg: string; color: string }> = {
  Chat: { bg: "#f1f5f9", color: "#475569" },
  Reasoning: { bg: "#f5f3ff", color: "#6d28d9" },
  Coding: { bg: "#ecfeff", color: "#0891b2" },
  Vision: { bg: "#fff7ed", color: "#c2410c" },
  Multimodal: { bg: "#fdf2f8", color: "#be185d" },
  General: { bg: "#f1f5f9", color: "#475569" },
};

interface ModelExplorerProps {
  models: ORModel[];
  selectedModel: string;
  onSelect: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  onSync: () => void;
  isSyncing: boolean;
}

function ModelExplorer({ models, selectedModel, onSelect, isOpen, onToggle, onSync, isSyncing }: ModelExplorerProps) {
  const [filterUse, setFilterUse] = useState<UseCategory | "All">("All");
  const [search, setSearch] = useState("");

  const filtered = models.filter(m => {
    const use = getUseCategory(m);
    const term = search.toLowerCase();
    const matchUse = filterUse === "All" || use === filterUse;
    const matchSearch = (m.name || m.id).toLowerCase().includes(term) || getPriceCategory(m).toLowerCase().includes(term);
    return matchUse && matchSearch;
  });

  const grouped = filtered.reduce<Record<string, ORModel[]>>((acc, m) => {
    const cat = getPriceCategory(m);
    acc[cat] = acc[cat] || [];
    acc[cat].push(m);
    return acc;
  }, {});

  const selectedLabel = selectedModel
    ? (models.find(m => m.id === selectedModel)?.name || selectedModel.split("/").pop())
    : "Default model";

  // Close modal on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onToggle(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onToggle]);

  return (
    <div style={{ flex: 1, position: "relative" }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          padding: "5px 8px",
          borderRadius: 3,
          border: "1px solid #cbd5e1",
          background: "#fff",
          fontSize: 11,
          fontWeight: 600,
          color: "#475569",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          overflow: "hidden",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selectedLabel}
        </span>
        <span style={{ flexShrink: 0, marginLeft: 4, fontSize: 9 }}>{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <div
          onClick={onToggle}
          style={{
            position: "fixed", inset: 0, zIndex: 10005,
            background: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 760, maxHeight: "85vh",
              background: "#fff", borderRadius: 8,
              boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
              display: "flex", flexDirection: "column", overflow: "hidden",
            }}
          >
            {/* Modal header */}
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>🤖 AI Model Explorer</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Browse, compare and select a model for this chat</div>
              </div>
              <button
                onClick={onToggle}
                style={{ background: "none", border: "none", fontSize: 18, color: "#64748b", cursor: "pointer", padding: 4 }}
              >
                ✕
              </button>
            </div>

            {/* Controls: search + sync + use-case chips */}
            <div style={{ padding: "12px 18px", borderBottom: "1px solid #e2e8f0", background: "#fff" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, provider or price tier..."
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: 4,
                    border: "1px solid #e2e8f0",
                    fontSize: 12,
                    outline: "none",
                  }}
                />
                <button
                  onClick={onSync}
                  disabled={isSyncing}
                  title="Sync / Explore models"
                  style={{
                    background: "#1e293b",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    padding: "8px 14px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: isSyncing ? "wait" : "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isSyncing ? "⟳ Syncing..." : "🔄 Sync"}
                </button>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <UseChip label="All" active={filterUse === "All"} onClick={() => setFilterUse("All")} />
                {USE_CASES.map(u => (
                  <UseChip key={u} label={u} active={filterUse === u} onClick={() => setFilterUse(u)} />
                ))}
              </div>
            </div>

            {/* Model list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
              <div
                onClick={() => { onSelect(""); }}
                style={{
                  padding: "10px 18px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#475569",
                  cursor: "pointer",
                  borderBottom: "1px solid #f1f5f9",
                  background: selectedModel === "" ? "#e0f2fe" : "transparent",
                }}
                onMouseEnter={e => selectedModel !== "" && (e.currentTarget.style.background = "#f1f5f9")}
                onMouseLeave={e => selectedModel !== "" && (e.currentTarget.style.background = "transparent")}
              >
                ✨ Default (from AI Settings)
              </div>

              {PRICE_ORDER.map(cat => {
                const list = grouped[cat];
                if (!list || list.length === 0) return null;
                return (
                  <div key={cat}>
                    <div style={{
                      padding: "8px 18px",
                      fontSize: 11,
                      fontWeight: 800,
                      color: "#64748b",
                      background: "#f8fafc",
                      borderBottom: "1px solid #f1f5f9",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: PRICE_COLORS[cat] }} />
                      {cat} tier ({list.length})
                    </div>
                    {list.map(m => {
                      const use = getUseCategory(m);
                      const isSelected = selectedModel === m.id;
                      const colors = USE_CASE_COLORS[use];
                      const shortId = m.id.split("/").pop() || m.id;
                      return (
                        <div
                          key={m.id}
                          onClick={() => { onSelect(m.id); }}
                          style={{
                            padding: "10px 18px",
                            fontSize: 12,
                            fontWeight: 500,
                            color: isSelected ? "#fff" : "#334155",
                            cursor: "pointer",
                            borderBottom: "1px solid #f8fafc",
                            background: isSelected ? "#3730a3" : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                          }}
                          onMouseEnter={e => !isSelected && (e.currentTarget.style.background = "#f1f5f9")}
                          onMouseLeave={e => !isSelected && (e.currentTarget.style.background = "transparent")}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {m.name || m.id}
                            </div>
                            <div style={{ fontSize: 10, color: isSelected ? "#e2e8f0" : "#94a3b8", marginTop: 2 }}>
                              {shortId} · {formatPrice(m)} · ctx {m.context_length?.toLocaleString() || "—"}
                            </div>
                            {m.description && (
                              <div style={{ fontSize: 10, color: isSelected ? "#e2e8f0" : "#64748b", marginTop: 3, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {m.description}
                              </div>
                            )}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "3px 7px",
                              borderRadius: 4,
                              background: isSelected ? "rgba(255,255,255,0.2)" : colors.bg,
                              color: isSelected ? "#fff" : colors.color,
                            }}>
                              {use}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "#94a3b8" }}>
                  No models match. Try a different search or click 🔄 Sync.
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div style={{ padding: "10px 18px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 11, color: "#64748b" }}>
              💡 Prices are per 1M tokens. Select a model to use it for this chat. Press ESC to close.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Use-case chip helper for ModelExplorer ────────────────────────────────────
function UseChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "3px 7px",
        borderRadius: 3,
        border: "none",
        fontSize: 9,
        fontWeight: 700,
        cursor: "pointer",
        background: active ? "#1e293b" : "#e2e8f0",
        color: active ? "#fff" : "#64748b",
      }}
    >
      {label}
    </button>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AICourseAgent({ courseContext, onApplyChanges, onCatalogCreated, contextKey }: AICourseAgentProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"plan" | "act">("plan");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [availableModels, setAvailableModels] = useState<ORModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceHelp, setVoiceHelp] = useState<{ show: boolean; message: string } | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ─── Load context from localStorage on mount (with SSR safety) ──────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(contextKey);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.messages && Array.isArray(data.messages)) setMessages(data.messages);
        if (data.mode) setMode(data.mode);
      }
    } catch {}
    setLoaded(true);
  }, [contextKey]);

  // ─── Save context to localStorage on change (only after initial load) ───────
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(contextKey, JSON.stringify({ messages, mode }));
    } catch {}
  }, [messages, mode, contextKey, loaded]);

  // ─── Fetch available models (supports manual sync) ──────────────────────────
  const syncModels = useCallback(async () => {
    setModelsLoading(true);
    try {
      const res = await apiFetch(MODELS_API);
      const data = await res.json();
      const models = (data.data || []).filter((m: ORModel) =>
        (m.architecture?.input_modalities || []).includes("text")
      );
      setAvailableModels(models);
    } catch (e: any) {
      setError(`Failed to sync AI models: ${e.message || "Unknown error"}`);
    } finally {
      setModelsLoading(false);
    }
  }, []);

  useEffect(() => {
    syncModels();

    apiFetch(AI_SETTINGS_API)
      .then(res => res.json())
      .then(data => {
        setSelectedModel(data.model_general_text || data.model_thinking || "");
      })
      .catch(() => {});
  }, [syncModels]);

  // ─── Auto-scroll to bottom ──────────────────────────────────────────────────
  useEffect(() => {
    if (!minimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, minimized]);

  // ─── Clear context ──────────────────────────────────────────────────────────
  const clearContext = useCallback(() => {
    if (!window.confirm("Clear all chat history and context? This cannot be undone.")) return;
    localStorage.removeItem(contextKey);
    setMessages([]);
    setInput("");
    setAttachments([]);
    setError(null);
  }, [contextKey]);

  // ─── Handle file attachment ─────────────────────────────────────────────────
  const handleFileSelect = async (files: FileList | null, type: "file" | "image") => {
    if (!files || files.length === 0) return;
    const newAttachments: Attachment[] = [];
    for (const file of Array.from(files).slice(0, 3)) {
      if (file.size > 10 * 1024 * 1024) {
        setError(`File "${file.name}" exceeds 10MB limit.`);
        continue;
      }
      const base64 = await fileToBase64(file);
      newAttachments.push({
        name: file.name,
        mime_type: file.type || "application/octet-stream",
        data_base64: base64,
        preview: file.type.startsWith("image/") ? `data:${file.type};base64,${base64}` : undefined,
      });
    }
    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  // ─── Remove attachment ──────────────────────────────────────────────────────
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // ─── Audio recording (Web Speech API) ───────────────────────────────────────
  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      setVoiceHelp(null);
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceHelp({
        show: true,
        message: "Voice input isn't supported in this browser. Please use Chrome, Edge, or Safari with a microphone.",
      });
      return;
    }

    // Request microphone permission explicitly so the user sees the browser prompt
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err: any) {
      setVoiceHelp({
        show: true,
        message: "Microphone access is blocked. Click the lock/site icon in your browser's address bar and allow microphone access.",
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      setInput(prev => {
        const base = prev ? prev.replace(/\s*\.\.\.$/, "") : "";
        const next = finalTranscript
          ? `${base ? base + " " : ""}${finalTranscript}`
          : `${base ? base + " " : ""}${interimTranscript}`.trim() + "...";
        return next.replace(/\.\.\.\s*\.\.\.$/, "...");
      });
    };

    recognition.onerror = (event: any) => {
      if (event.error === "aborted" || event.error === "no-speech") return;
      setError(`Voice error: ${event.error}`);
      setIsRecording(false);
    };

    recognition.onend = () => {
      if (isRecording) {
        // Auto-restart if it stopped prematurely while still toggled (browser may end on silence)
        try { recognition.start(); } catch { setIsRecording(false); }
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
      setVoiceHelp(null);
      setError(null);
    } catch (e: any) {
      setVoiceHelp({
        show: true,
        message: `Could not start voice input: ${e.message || "Unknown error"}`,
      });
    }
  }, [isRecording]);

  // ─── Core send function (shared by main input and question replies) ─────────
  const sendToAI = useCallback(async (text: string, currentAttachments?: Attachment[], webSearchContext?: string) => {
    if (!text && (!currentAttachments || currentAttachments.length === 0)) return;
    if (isTyping) return;

    setError(null);

    const userMsg: ChatMessage = {
      id: genId(),
      role: "user",
      content: text || "(attachment only)",
      timestamp: Date.now(),
      attachments: (currentAttachments || []).map(a => ({ name: a.name, type: a.mime_type })),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const res = await apiFetch(CHAT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          mode,
          model: selectedModel || undefined,
          course_context: courseContext,
          chat_history: messages.map(m => ({ role: m.role, content: m.content })),
          attachments: (currentAttachments || []).map(a => ({
            name: a.name,
            mime_type: a.mime_type,
            data_base64: a.data_base64,
          })),
          web_search_context: webSearchContext || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();

      const aiMsg: ChatMessage = {
        id: genId(),
        role: "assistant",
        content: data.reply || "No response from AI.",
        timestamp: Date.now(),
        proposedChanges: data.proposed_changes || undefined,
        proposedCatalog: data.proposed_catalog || undefined,
        questions: data.questions || undefined,
        applied: data.applied || false,
      };

      setMessages(prev => [...prev, aiMsg]);

      // Auto-apply in act mode
      if (data.applied && data.proposed_changes) {
        onApplyChanges(data.proposed_changes);
      }
    } catch (e: any) {
      const errMsg: ChatMessage = {
        id: genId(),
        role: "assistant",
        content: `Error: ${e.message || "Failed to get AI response."}`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsTyping(false);
    }
  }, [isTyping, mode, selectedModel, courseContext, messages, onApplyChanges]);

  // ─── Send from main input ───────────────────────────────────────────────────
  const sendMessage = async () => {
    const text = input.trim();
    if (!text && attachments.length === 0) return;
    setInput("");
    const atts = [...attachments];
    setAttachments([]);

    let webContext = "";
    if (isResearching && text) {
      setIsResearching(false);
      try {
        const res = await apiFetch(WEB_SEARCH_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: text, num_results: 5 }),
        });
        if (!res.ok) throw new Error("Web search failed");
        const results = await res.json();
        webContext = `Web research results for "${text}":\n` + results
          .map((r: any, i: number) => `${i + 1}. ${r.title}\n${r.snippet}\nURL: ${r.url}`)
          .join("\n\n");
      } catch (e: any) {
        setError(`Research failed: ${e.message || "Could not fetch web results"}. Sent message without research.`);
      }
    }

    sendToAI(text, atts, webContext || undefined);
  };

  // ─── Send from question reply ───────────────────────────────────────────────
  const sendQuestionReply = (question: string, answer: string) => {
    sendToAI(`Re: "${question}"\n${answer}`);
  };

  // ─── Apply proposed changes (Plan mode) ─────────────────────────────────────
  const applyProposedChanges = (msgId: string, changes: Record<string, any>) => {
    onApplyChanges(changes);
    setMessages(prev =>
      prev.map(m => (m.id === msgId ? { ...m, applied: true } : m))
    );
  };

  // ─── Dismiss proposed changes ───────────────────────────────────────────────
  const dismissProposedChanges = (msgId: string) => {
    setMessages(prev =>
      prev.map(m => (m.id === msgId ? { ...m, proposedChanges: undefined } : m))
    );
  };

  // ─── Approve and create catalog entities (categories → subcategories → subjects → chapters → materials → live_classes) ─
  const handleApproveCatalog = useCallback(async (msgId: string, catalog: any) => {
    setIsTyping(true);
    setError(null);
    try {
      const categories: any[] = catalog?.categories || [];
      const subcategories: any[] = catalog?.subcategories || [];
      const subjects: any[] = catalog?.subjects || [];
      const chapters: any[] = catalog?.chapters || [];
      const materials: any[] = catalog?.materials || [];
      const liveClasses: any[] = catalog?.live_classes || [];

      // ── Fetch existing entities so AI can reference already-created ones ──
      const categoryMap: Record<string, number> = {};
      const subcategoryMap: Record<string, number> = {};
      const subjectMap: Record<string, number> = {};

      // Pre-load existing categories
      try {
        const catRes = await apiFetch(`${API_BASE_URL}/categories`);
        if (catRes.ok) {
          const existingCats = await catRes.json();
          for (const c of existingCats) categoryMap[c.name] = c.id;
        }
      } catch {}

      // Pre-load existing subcategories
      try {
        const scRes = await apiFetch(`${API_BASE_URL}/subcategories`);
        if (scRes.ok) {
          const existingScs = await scRes.json();
          for (const sc of existingScs) subcategoryMap[sc.name] = sc.id;
        }
      } catch {}

      // Pre-load existing subjects
      try {
        const subRes = await apiFetch(`${API_BASE_URL}/subjects`);
        if (subRes.ok) {
          const existingSubs = await subRes.json();
          for (const s of existingSubs) subjectMap[s.name] = s.id;
        }
      } catch {}

      // ── Create new categories ──
      for (const cat of categories) {
        if (categoryMap[cat.name]) continue;
        const res = await apiFetch(`${API_BASE_URL}/categories`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: cat.name }),
        });
        if (!res.ok) throw new Error(`Failed to create category "${cat.name}"`);
        const data = await res.json();
        categoryMap[cat.name] = data.id;
      }

      // ── Create new subcategories ──
      for (const sc of subcategories) {
        if (subcategoryMap[sc.name]) continue;
        const categoryId = categoryMap[sc.category_name];
        if (!categoryId) throw new Error(`Unknown parent category "${sc.category_name}" for subcategory "${sc.name}"`);
        const res = await apiFetch(`${API_BASE_URL}/subcategories`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: sc.name, category_id: categoryId }),
        });
        if (!res.ok) throw new Error(`Failed to create subcategory "${sc.name}"`);
        const data = await res.json();
        subcategoryMap[sc.name] = data.id;
      }

      // ── Create new subjects ──
      for (const sub of subjects) {
        if (subjectMap[sub.name]) continue;
        const subcategoryId = subcategoryMap[sub.subcategory_name];
        if (!subcategoryId) throw new Error(`Unknown parent subcategory "${sub.subcategory_name}" for subject "${sub.name}"`);
        const res = await apiFetch(`${API_BASE_URL}/subcategories/${subcategoryId}/subjects`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: sub.name, subcategory_id: subcategoryId }),
        });
        if (!res.ok) throw new Error(`Failed to create subject "${sub.name}"`);
        const data = await res.json();
        subjectMap[sub.name] = data.id;
      }

      // ── Create chapters and build chapter title→id map ──
      const chapterMap: Record<string, number> = {};
      for (const ch of chapters) {
        const subjectId = subjectMap[ch.subject_name];
        if (!subjectId) throw new Error(`Unknown parent subject "${ch.subject_name}" for chapter "${ch.title}"`);
        const res = await apiFetch(`${API_BASE_URL}/subjects/${subjectId}/chapters`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: ch.title, content: ch.content || "", subject_id: subjectId }),
        });
        if (!res.ok) throw new Error(`Failed to create chapter "${ch.title}"`);
        const data = await res.json();
        chapterMap[ch.title] = data.id;
      }

      // ── If no chapters were proposed but materials/live_classes reference chapters,
      //    fetch existing chapters for the subjects to build the map ──
      if (chapters.length === 0 && (materials.length > 0 || liveClasses.length > 0)) {
        for (const subName of Object.keys(subjectMap)) {
          const sid = subjectMap[subName];
          try {
            const chRes = await apiFetch(`${API_BASE_URL}/subjects/${sid}/chapters`);
            if (chRes.ok) {
              const chs = await chRes.json();
              for (const c of chs) chapterMap[c.title] = c.id;
            }
          } catch {}
        }
      }

      // ── Create materials and link to chapters ──
      for (const mat of materials) {
        const chapterId = chapterMap[mat.chapter_title];
        if (!chapterId) {
          console.warn(`Skipping material "${mat.title}": chapter "${mat.chapter_title}" not found`);
          continue;
        }
        const res = await apiFetch(`${API_BASE_URL}/chapters/${chapterId}/create-material`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: mat.title,
            description: mat.description || null,
            youtube_url: mat.youtube_url || null,
            file_type: mat.youtube_url ? "youtube" : "text",
          }),
        });
        if (!res.ok) throw new Error(`Failed to create material "${mat.title}"`);
      }

      // ── Create live classes for chapters ──
      for (const lc of liveClasses) {
        const chapterId = chapterMap[lc.chapter_title];
        if (!chapterId) {
          console.warn(`Skipping live class "${lc.title}": chapter "${lc.chapter_title}" not found`);
          continue;
        }
        const res = await apiFetch(`${API_BASE_URL}/chapters/${chapterId}/live-classes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: lc.title,
            meeting_url: lc.meeting_url || "https://meet.google.com/placeholder",
            scheduled_at: lc.scheduled_at || null,
          }),
        });
        if (!res.ok) throw new Error(`Failed to create live class "${lc.title}"`);
      }

      setMessages(prev =>
        prev.map(m => (m.id === msgId ? { ...m, applied: true } : m))
      );
      onCatalogCreated?.();
    } catch (e: any) {
      setError(`Catalog creation failed: ${e.message || "Unknown error"}`);
    } finally {
      setIsTyping(false);
    }
  }, [onCatalogCreated]);

  // ─── Dismiss proposed catalog ───────────────────────────────────────────────
  const dismissProposedCatalog = (msgId: string) => {
    setMessages(prev =>
      prev.map(m => (m.id === msgId ? { ...m, proposedCatalog: undefined } : m))
    );
  };

  // ─── Handle Enter key ───────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════════════════════════

  if (minimized) {
    return (
      <>
        <style>{`
          @keyframes ai-agent-slide-right {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        `}</style>
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            zIndex: 100100,
            height: "100vh",
            width: 44,
            background: "linear-gradient(180deg, #1e293b, #334155)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            paddingTop: 50,
            cursor: "pointer",
            boxShadow: "-4px 0 16px rgba(0,0,0,0.15)",
            animation: "ai-agent-slide-right 0.25s ease-out",
            userSelect: "none",
            pointerEvents: "none",
          }}
          onClick={() => setMinimized(false)}
        >
          <div style={{
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 1,
            marginBottom: 20,
            pointerEvents: "auto",
          }}>
            🤖 AI Course Agent
          </div>
          {messages.length > 0 && (
            <div style={{
              background: "#6366f1",
              borderRadius: 10,
              padding: "2px 8px",
              fontSize: 11,
              fontWeight: 700,
              color: "#fff",
              marginTop: 8,
            }}>
              {messages.length}
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      {/* Inline styles for animations */}
      <style>{`
        @keyframes ai-agent-slide-in {
          from { transform: translateX(100%); opacity: 0.3; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes ai-agent-typing-dot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        .ai-agent-msg-content p { margin: 0 0 8px; }
        .ai-agent-msg-content p:last-child { margin: 0; }
        .ai-agent-scroll::-webkit-scrollbar { width: 6px; }
        .ai-agent-scroll::-webkit-scrollbar-track { background: #f1f5f9; }
        .ai-agent-scroll::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 3px; }
        .ai-agent-scroll::-webkit-scrollbar-thumb:hover { background: #64748b; }
      `}</style>

      {/* ── Full-height Windows-style sidebar ── */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          zIndex: 100100,
          width: 440,
          height: "100vh",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.18)",
          borderLeft: "1px solid #cbd5e1",
          animation: "ai-agent-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* ── Windows-style title bar ── */}
        <div
          style={{
            height: 36,
            background: "#1e293b",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            paddingLeft: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>🤖</span>
            <span style={{ color: "#fff", fontSize: 12, fontWeight: 600, letterSpacing: 0.3 }}>
              AI Course Agent — {mode === "plan" ? "Plan Mode" : "Act Mode"}
            </span>
          </div>
          <div style={{ display: "flex", height: "100%" }}>
            <WinBtn icon="—" variant="min" onClick={() => setMinimized(true)} title="Minimize" />
            <WinBtn icon="▢" variant="max" onClick={() => setMinimized(true)} title="Minimize" />
            <WinBtn icon="✕" variant="close" onClick={() => setMinimized(true)} title="Close" />
          </div>
        </div>

        {/* ── Toolbar: Mode + Model + Clear ── */}
        <div
          style={{
            padding: "8px 12px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
            background: "#f8fafc",
          }}
        >
          {/* Mode toggle — Windows-style segmented control */}
          <div
            style={{
              display: "flex",
              background: "#e2e8f0",
              borderRadius: 4,
              padding: 2,
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => setMode("plan")}
              style={{
                padding: "5px 12px",
                borderRadius: 3,
                border: "none",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                background: mode === "plan" ? "#1e293b" : "transparent",
                color: mode === "plan" ? "#fff" : "#64748b",
                transition: "all 0.15s",
              }}
            >
              📋 Plan
            </button>
            <button
              onClick={() => setMode("act")}
              style={{
                padding: "5px 12px",
                borderRadius: 3,
                border: "none",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                background: mode === "act" ? "#059669" : "transparent",
                color: mode === "act" ? "#fff" : "#64748b",
                transition: "all 0.15s",
              }}
            >
              ⚡ Act
            </button>
          </div>

          {/* AI Model Explorer — categorized by price & use case with sync */}
          <ModelExplorer
            models={availableModels}
            selectedModel={selectedModel}
            onSelect={m => { setSelectedModel(m); setShowModelDropdown(false); }}
            isOpen={showModelDropdown}
            onToggle={() => setShowModelDropdown(!showModelDropdown)}
            onSync={syncModels}
            isSyncing={modelsLoading}
          />

          {/* Clear button */}
          <button
            onClick={clearContext}
            title="Clear all chat history"
            style={{
              background: "#fee2e2",
              border: "1px solid #fca5a5",
              borderRadius: 3,
              width: 28,
              height: 28,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            🗑
          </button>
        </div>

        {/* ── Messages Area (full height scrollable) ── */}
        <div
          className="ai-agent-scroll"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            background: "#fff",
          }}
        >
          {messages.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 16px", color: "#94a3b8" }}>
              <div style={{ fontSize: 40, marginBottom: 14 }}>🤖</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#475569", marginBottom: 8 }}>
                AI Course Agent
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 20 }}>
                Ask me to help create or edit your course.
                <br />
                Upload a PDF syllabus, describe your course, or just say "Help me create a course about..."
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  "Help me create a 6-month course on Data Science",
                  "Generate SEO keywords for a Python course",
                  "Set the price to ₹2999 with 20% discount",
                ].map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    style={{
                      padding: "9px 12px",
                      borderRadius: 4,
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#1e293b",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = "#f1f5f9";
                      e.currentTarget.style.borderColor = "#cbd5e1";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "#f8fafc";
                      e.currentTarget.style.borderColor = "#e2e8f0";
                    }}
                  >
                    💡 {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              {/* Message bubble — Windows-style flat */}
              <div
                style={{
                  maxWidth: "85%",
                  padding: "10px 14px",
                  borderRadius: 4,
                  background: msg.role === "user" ? "#1e293b" : "#f1f5f9",
                  color: msg.role === "user" ? "#fff" : "#1e293b",
                  fontSize: 13,
                  lineHeight: 1.5,
                  fontWeight: 500,
                  border: msg.role === "user" ? "none" : "1px solid #e2e8f0",
                }}
              >
                <div className="ai-agent-msg-content" style={{ whiteSpace: "pre-wrap" }}>
                  {msg.content}
                </div>

                {/* Attachment badges */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                    {msg.attachments.map((att, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 3,
                          background: msg.role === "user" ? "rgba(255,255,255,0.15)" : "#e2e8f0",
                          color: msg.role === "user" ? "#fff" : "#475569",
                        }}
                      >
                        📎 {att.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Timestamp */}
              <div
                style={{
                  fontSize: 10,
                  color: "#94a3b8",
                  marginTop: 4,
                  marginRight: msg.role === "user" ? 4 : 0,
                  marginLeft: msg.role === "assistant" ? 4 : 0,
                }}
              >
                {formatTime(msg.timestamp)}
              </div>

              {/* Proposed changes card (Plan mode) — Windows-style panel */}
              {msg.proposedChanges && !msg.applied && (
                <div
                  style={{
                    width: "85%",
                    marginTop: 6,
                    border: "1px solid #cbd5e1",
                    borderRadius: 4,
                    background: "#f8fafc",
                    overflow: "hidden",
                    fontSize: 12,
                  }}
                >
                  {/* Panel title bar */}
                  <div style={{
                    background: "#1e293b",
                    color: "#fff",
                    padding: "6px 12px",
                    fontSize: 11,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}>
                    📋 Proposed Changes
                  </div>
                  {/* Panel body */}
                  <div style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 10 }}>
                      {Object.entries(msg.proposedChanges).map(([field, value]) => (
                        <div
                          key={field}
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "flex-start",
                            padding: "4px 0",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          <span style={{ fontWeight: 700, color: "#1e293b", minWidth: 110, fontSize: 11 }}>
                            {FIELD_LABELS[field] || field}:
                          </span>
                          <span
                            style={{
                              color: "#475569",
                              fontSize: 11,
                              wordBreak: "break-word",
                              flex: 1,
                            }}
                          >
                            {typeof value === "boolean"
                              ? value ? "✅ Yes" : "❌ No"
                              : Array.isArray(value)
                              ? value.join(", ")
                              : String(value).slice(0, 150)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => applyProposedChanges(msg.id, msg.proposedChanges!)}
                        style={{
                          flex: 1,
                          padding: "7px 12px",
                          borderRadius: 3,
                          border: "none",
                          background: "#059669",
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        ✅ Apply Changes
                      </button>
                      <button
                        onClick={() => dismissProposedChanges(msg.id)}
                        style={{
                          padding: "7px 12px",
                          borderRadius: 3,
                          border: "1px solid #cbd5e1",
                          background: "#fff",
                          color: "#64748b",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Proposed catalog creation card */}
              {msg.proposedCatalog && !msg.applied && (
                <div
                  style={{
                    width: "85%",
                    marginTop: 6,
                    border: "1px solid #c7d2fe",
                    borderRadius: 4,
                    background: "#eef2ff",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ background: "#3730a3", color: "#fff", padding: "6px 12px", fontSize: 11, fontWeight: 700 }}>
                    📚 Proposed catalog to create
                  </div>
                  <div style={{ padding: "10px 12px", fontSize: 12, color: "#334155" }}>
                    <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 1.6 }}>
                      {Array.isArray(msg.proposedCatalog.categories) && msg.proposedCatalog.categories.length > 0 && (
                        <li><strong>{msg.proposedCatalog.categories.length}</strong> new categor{msg.proposedCatalog.categories.length === 1 ? "y" : "ies"}</li>
                      )}
                      {Array.isArray(msg.proposedCatalog.subcategories) && msg.proposedCatalog.subcategories.length > 0 && (
                        <li><strong>{msg.proposedCatalog.subcategories.length}</strong> new subcategor{msg.proposedCatalog.subcategories.length === 1 ? "y" : "ies"}</li>
                      )}
                      {Array.isArray(msg.proposedCatalog.subjects) && msg.proposedCatalog.subjects.length > 0 && (
                        <li><strong>{msg.proposedCatalog.subjects.length}</strong> new subject{msg.proposedCatalog.subjects.length === 1 ? "" : "s"}</li>
                      )}
                      {Array.isArray(msg.proposedCatalog.chapters) && msg.proposedCatalog.chapters.length > 0 && (
                        <li><strong>{msg.proposedCatalog.chapters.length}</strong> new chapter{msg.proposedCatalog.chapters.length === 1 ? "" : "s"}</li>
                      )}
                      {Array.isArray(msg.proposedCatalog.materials) && msg.proposedCatalog.materials.length > 0 && (
                        <li><strong>{msg.proposedCatalog.materials.length}</strong> new material{msg.proposedCatalog.materials.length === 1 ? "" : "s"} (topics)</li>
                      )}
                      {Array.isArray(msg.proposedCatalog.live_classes) && msg.proposedCatalog.live_classes.length > 0 && (
                        <li><strong>{msg.proposedCatalog.live_classes.length}</strong> new live class{msg.proposedCatalog.live_classes.length === 1 ? "" : "es"}</li>
                      )}
                    </ul>
                    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                      <button
                        onClick={() => handleApproveCatalog(msg.id, msg.proposedCatalog!)}
                        style={{
                          flex: 1,
                          padding: "7px 12px",
                          borderRadius: 3,
                          border: "none",
                          background: "#059669",
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        ✅ Approve & Create
                      </button>
                      <button
                        onClick={() => dismissProposedCatalog(msg.id)}
                        style={{
                          padding: "7px 12px",
                          borderRadius: 3,
                          border: "1px solid #cbd5e1",
                          background: "#fff",
                          color: "#64748b",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Applied catalog confirmation */}
              {msg.applied && msg.proposedCatalog && (
                <div
                  style={{
                    width: "85%",
                    marginTop: 6,
                    border: "1px solid #bbf7d0",
                    borderRadius: 4,
                    background: "#f0fdf4",
                    padding: "8px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#15803d",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  ✅ Catalog entities created successfully
                </div>
              )}

              {/* Applied confirmation */}
              {msg.applied && msg.proposedChanges && (
                <div
                  style={{
                    width: "85%",
                    marginTop: 6,
                    border: "1px solid #bbf7d0",
                    borderRadius: 4,
                    background: "#f0fdf4",
                    padding: "8px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#15803d",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  ✅ {Object.keys(msg.proposedChanges).length} change(s) applied to form
                </div>
              )}

              {/* Clarifying questions — each with its own reply box */}
              {msg.questions && msg.questions.length > 0 && (
                <div
                  style={{
                    width: "85%",
                    marginTop: 6,
                    border: "1px solid #c7d2fe",
                    borderRadius: 4,
                    background: "#eef2ff",
                    overflow: "hidden",
                  }}
                >
                  {/* Questions panel title bar */}
                  <div style={{
                    background: "#3730a3",
                    color: "#fff",
                    padding: "6px 12px",
                    fontSize: 11,
                    fontWeight: 700,
                  }}>
                    ❓ AI has questions — reply below each
                  </div>
                  {/* Questions body */}
                  <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
                    {msg.questions.map((q, i) => (
                      <div key={i}>
                        {/* Question text */}
                        <div style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#3730a3",
                          padding: "6px 10px",
                          background: "#fff",
                          borderRadius: 3,
                          border: "1px solid #c7d2fe",
                        }}>
                          Q{i + 1}: {q}
                        </div>
                        {/* Reply input directly under the question */}
                        <QuestionReply
                          question={q}
                          onSend={(answer) => sendQuestionReply(q, answer)}
                          isTyping={isTyping}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px" }}>
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    background: "#1e293b",
                    animation: `ai-agent-typing-dot 1.4s ${i * 0.2}s infinite ease-in-out`,
                  }}
                />
              ))}
              <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 4 }}>AI is thinking...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div
            style={{
              padding: "7px 12px",
              background: "#fef2f2",
              color: "#dc2626",
              fontSize: 12,
              fontWeight: 600,
              borderTop: "1px solid #fecaca",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <span>⚠ {error}</span>
            <button
              onClick={() => setError(null)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 14, padding: 0 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Attachment previews ── */}
        {attachments.length > 0 && (
          <div
            style={{
              padding: "6px 12px",
              borderTop: "1px solid #f1f5f9",
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              flexShrink: 0,
              background: "#fafbfc",
            }}
          >
            {attachments.map((att, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "3px 8px",
                  borderRadius: 3,
                  background: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#475569",
                }}
              >
                {att.preview ? (
                  <img src={att.preview} alt={att.name} style={{ width: 18, height: 18, borderRadius: 2, objectFit: "cover" }} />
                ) : (
                  <span>📎</span>
                )}
                <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {att.name}
                </span>
                <button
                  onClick={() => removeAttachment(i)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 11, padding: 0 }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Voice permission help ── */}
        {voiceHelp?.show && (
          <div
            style={{
              padding: "10px 12px",
              background: "#fffbeb",
              borderTop: "1px solid #fde68a",
              color: "#92400e",
              fontSize: 12,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
              gap: 10,
            }}
          >
            <span style={{ lineHeight: 1.5 }}>🎙 {voiceHelp.message}</span>
            <button
              onClick={() => setVoiceHelp(null)}
              style={{ background: "none", border: "none", color: "#92400e", fontSize: 16, cursor: "pointer", padding: 0 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Input bar — Windows-style status bar ── */}
        <div
          style={{
            padding: "8px 12px",
            borderTop: "1px solid #cbd5e1",
            display: "flex",
            alignItems: "flex-end",
            gap: 4,
            flexShrink: 0,
            background: "#f8fafc",
          }}
        >
          {/* File buttons — Windows-style flat buttons */}
          <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Attach PDF or file"
              style={{
                background: "#fff",
                border: "1px solid #cbd5e1",
                borderRadius: 3,
                width: 32,
                height: 32,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
              }}
            >
              📎
            </button>
            <button
              onClick={() => imageInputRef.current?.click()}
              title="Attach image"
              style={{
                background: "#fff",
                border: "1px solid #cbd5e1",
                borderRadius: 3,
                width: 32,
                height: 32,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
              }}
            >
              🖼️
            </button>
            <button
              onClick={toggleRecording}
              title={isRecording ? "Stop voice input" : "Voice input"}
              style={{
                background: isRecording ? "#fee2e2" : "#fff",
                border: `1px solid ${isRecording ? "#fca5a5" : "#cbd5e1"}`,
                borderRadius: 3,
                width: 32,
                height: 32,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
              }}
            >
              {isRecording ? (
                <span className="ai-agent-record-dot" style={{ width: 10, height: 10, borderRadius: 5, background: "#ef4444" }} />
              ) : (
                "🎤"
              )}
            </button>
            <button
              onClick={() => setIsResearching(v => !v)}
              title={isResearching ? "Web research ON — the next message will be researched" : "Research next message on the web"}
              style={{
                background: isResearching ? "#dbeafe" : "#fff",
                border: `1px solid ${isResearching ? "#60a5fa" : "#cbd5e1"}`,
                borderRadius: 3,
                width: 32,
                height: 32,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
              }}
            >
              {isResearching ? "🔍" : "🌐"}
            </button>
          </div>

          {/* Text input — Windows-style flat */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? "Listening..." : "Type your message... (Enter to send)"}
            rows={1}
            style={{
              flex: 1,
              padding: "7px 10px",
              borderRadius: 3,
              border: "1px solid #cbd5e1",
              fontSize: 13,
              fontWeight: 500,
              color: "#1e293b",
              resize: "none",
              outline: "none",
              minHeight: 32,
              maxHeight: 80,
              fontFamily: "inherit",
              background: "#fff",
            }}
          />

          {/* Send button */}
          <button
            onClick={sendMessage}
            disabled={isTyping || (!input.trim() && attachments.length === 0)}
            style={{
              background: isTyping || (!input.trim() && attachments.length === 0) ? "#cbd5e1" : "#1e293b",
              border: "none",
              borderRadius: 3,
              width: 32,
              height: 32,
              cursor: isTyping ? "not-allowed" : "pointer",
              color: "#fff",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            ➤
          </button>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,application/pdf,text/plain"
          multiple
          style={{ display: "none" }}
          onChange={e => handleFileSelect(e.target.files, "file")}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={e => handleFileSelect(e.target.files, "image")}
        />
      </div>

      <style>{`
        @keyframes ai-agent-record-pulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
          70% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .ai-agent-record-dot {
          animation: ai-agent-record-pulse 1.2s infinite;
        }
      `}</style>
    </>
  );
}
