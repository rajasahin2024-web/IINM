"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL } from "@/lib/config";

export interface TickerItem {
  text: string;
  icon_url?: string;
  link?: string;
}

export interface TickerSettings {
  items: TickerItem[];
  speed: number;
  animationType: string;
  bgColor: string;
  textColor: string;
  labelBgColor: string;
  labelTextColor: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (settings: TickerSettings) => void;
  initialSettings: TickerSettings;
}

const ANIMATION_TYPES = [
  { value: "scroll", label: "Continuous Scroll" },
  { value: "fade", label: "Fade In/Out" },
  { value: "slide", label: "Slide & Pause" },
];

const COLOR_PRESETS = [
  { name: "Midnight Navy", bg: "#01081b", text: "#ffffff", labelBg: "#e63946", labelText: "#ffffff" },
  { name: "Pure Black", bg: "#000000", text: "#ffffff", labelBg: "#e63946", labelText: "#ffffff" },
  { name: "Dark Charcoal", bg: "#1a1a2e", text: "#e0e0e0", labelBg: "#e94560", labelText: "#ffffff" },
  { name: "Deep Blue", bg: "#0a1628", text: "#ffffff", labelBg: "#38bdf8", labelText: "#ffffff" },
  { name: "Forest Green", bg: "#0d2818", text: "#ffffff", labelBg: "#22c55e", labelText: "#ffffff" },
  { name: "Royal Purple", bg: "#1a0a2e", text: "#ffffff", labelBg: "#a855f7", labelText: "#ffffff" },
];

export default function TickerEditModal({ open, onClose, onSave, initialSettings }: Props) {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [speed, setSpeed] = useState(30);
  const [animationType, setAnimationType] = useState("scroll");
  const [bgColor, setBgColor] = useState("#01081b");
  const [textColor, setTextColor] = useState("#ffffff");
  const [labelBgColor, setLabelBgColor] = useState("#e63946");
  const [labelTextColor, setLabelTextColor] = useState("#ffffff");
  const [saving, setSaving] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const scrollListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setItems(initialSettings.items.length > 0 ? [...initialSettings.items] : [{ text: "" }]);
      setSpeed(initialSettings.speed || 30);
      setAnimationType(initialSettings.animationType || "scroll");
      setBgColor(initialSettings.bgColor || "#01081b");
      setTextColor(initialSettings.textColor || "#ffffff");
      setLabelBgColor(initialSettings.labelBgColor || "#e63946");
      setLabelTextColor(initialSettings.labelTextColor || "#ffffff");
      setActivePreset(null);
    }
  }, [open, initialSettings]);

  const handleIconUpload = useCallback(async (idx: number, file: File) => {
    setUploadingIdx(idx);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch(`${BASE_URL}/api/settings/site/ticker-icon-upload`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        const updated = [...items];
        updated[idx] = { ...updated[idx], icon_url: data.url };
        setItems(updated);
      }
    } catch (err) {
      console.error("Icon upload failed", err);
    } finally {
      setUploadingIdx(null);
    }
  }, [items]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleaned = items.filter((it) => it.text.trim());
      const payload = {
        notification_bar_items: JSON.stringify(cleaned),
        ticker_speed: speed,
        ticker_animation_type: animationType,
        ticker_bg_color: bgColor,
        ticker_text_color: textColor,
        ticker_label_bg_color: labelBgColor,
        ticker_label_text_color: labelTextColor,
      };
      const res = await apiFetch(`${BASE_URL}/api/settings/site/notification`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        onSave({
          items: cleaned,
          speed,
          animationType,
          bgColor,
          textColor,
          labelBgColor,
          labelTextColor,
        });
        onClose();
      }
    } catch (err) {
      console.error("Failed to save ticker settings", err);
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setBgColor(preset.bg);
    setTextColor(preset.text);
    setLabelBgColor(preset.labelBg);
    setLabelTextColor(preset.labelText);
    setActivePreset(preset.name);
  };

  if (!open) return null;

  return (
    <>
      <style>{`
        @keyframes tickerModalFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes tickerModalScale {
          from { opacity: 0; transform: scale(0.96) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes tickerPreviewScroll {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        @keyframes tickerPreviewFade {
          0%, 100% { opacity: 0; transform: translateX(20px); }
          25%, 75% { opacity: 1; transform: translateX(0); }
        }
        @keyframes tickerPreviewSlide {
          0% { transform: translateX(100%); }
          15%, 85% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
      {/* Full-screen overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10000,
          background: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: "tickerModalFade 0.2s ease-out",
        }}
        onClick={onClose}
      >
        {/* Modal container */}
        <div
          style={{
            width: "92%",
            maxWidth: "1100px",
            height: "88%",
            maxHeight: "780px",
            background: "#fff",
            borderRadius: "16px",
            boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            animation: "tickerModalScale 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "20px 28px",
              borderBottom: "1px solid #f1f5f9",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: "linear-gradient(135deg, #e63946 0%, #c1202f 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 11l18-5v12L3 14v-3z" />
                  <path d="M11.6 16.8a3 3 0 11-5.8-1.6" />
                </svg>
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Breaking News Ticker</h2>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>Manage news items, icons, animation & colors</p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 36, height: 36, borderRadius: 8, border: "1px solid #e2e8f0",
                background: "#f8fafc", cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", color: "#64748b",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#fee2e2"; e.currentTarget.style.borderColor = "#fca5a5"; e.currentTarget.style.color = "#ef4444"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#64748b"; }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Body — two columns */}
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            {/* Left: Items list */}
            <div
              ref={scrollListRef}
              style={{
                width: "42%",
                borderRight: "1px solid #f1f5f9",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <div style={{
                padding: "16px 20px 8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>News Items</span>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>{items.filter((i) => i.text.trim()).length} items</span>
              </div>

              {/* Scrollable list */}
              <div style={{ flex: 1, overflowY: "auto", padding: "4px 16px 8px" }}>
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "10px",
                      marginBottom: "8px",
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      transition: "border-color 0.2s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    {/* Icon upload */}
                    <div style={{ flexShrink: 0, position: "relative" }}>
                      <button
                        onClick={() => fileInputRefs.current[idx]?.click()}
                        style={{
                          width: 40, height: 40, borderRadius: 8,
                          border: "2px dashed #cbd5e1", background: "#fff",
                          cursor: "pointer", display: "flex", alignItems: "center",
                          justifyContent: "center", overflow: "hidden", position: "relative",
                          transition: "border-color 0.2s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#38bdf8"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#cbd5e1"; }}
                        title="Upload icon"
                      >
                        {item.icon_url ? (
                          <img src={item.icon_url.startsWith("/") ? `${BASE_URL}${item.icon_url}` : item.icon_url} alt="icon" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                        ) : uploadingIdx === idx ? (
                          <span style={{ fontSize: 10, color: "#94a3b8" }}>...</span>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                        )}
                      </button>
                      <input
                        ref={(el) => { fileInputRefs.current[idx] = el; }}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,image/gif,image/x-icon"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleIconUpload(idx, e.target.files[0]);
                            e.target.value = "";
                          }
                        }}
                      />
                    </div>

                    {/* Text + Link inputs */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px", minWidth: 0 }}>
                      <input
                        type="text"
                        value={item.text}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx] = { ...updated[idx], text: e.target.value };
                          setItems(updated);
                        }}
                        placeholder="News headline..."
                        style={{
                          padding: "9px 12px", borderRadius: 8,
                          border: "1px solid #e2e8f0", outline: "none",
                          fontSize: 13, color: "#0f172a", background: "#fff",
                          fontFamily: "inherit", transition: "border-color 0.2s",
                          width: "100%", boxSizing: "border-box",
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "#38bdf8"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(56,189,248,0.12)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; }}
                      />
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                        <input
                          type="text"
                          value={item.link || ""}
                          onChange={(e) => {
                            const updated = [...items];
                            updated[idx] = { ...updated[idx], link: e.target.value };
                            setItems(updated);
                          }}
                          placeholder="Link (optional, e.g. /contact-us or https://...)"
                          style={{
                            flex: 1, padding: "7px 10px", borderRadius: 6,
                            border: "1px solid #e2e8f0", outline: "none",
                            fontSize: 11, color: "#475569", background: "#fff",
                            fontFamily: "inherit", transition: "border-color 0.2s",
                            minWidth: 0,
                          }}
                          onFocus={(e) => { e.currentTarget.style.borderColor = "#38bdf8"; }}
                          onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
                        />
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => {
                        if (items.length === 1) {
                          setItems([{ text: "" }]);
                        } else {
                          setItems(items.filter((_, i) => i !== idx));
                        }
                      }}
                      style={{
                        flexShrink: 0, width: 32, height: 32, borderRadius: 8,
                        border: "1px solid #fecaca", background: "#fef2f2",
                        color: "#ef4444", cursor: "pointer", display: "flex",
                        alignItems: "center", justifyContent: "center",
                        fontSize: 16, fontWeight: 700, transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#fee2e2"; e.currentTarget.style.borderColor = "#fca5a5"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "#fef2f2"; e.currentTarget.style.borderColor = "#fecaca"; }}
                      title="Delete item"
                    >
                      ×
                    </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add button */}
              <div style={{ padding: "8px 20px 16px", flexShrink: 0, borderTop: "1px solid #f1f5f9" }}>
                <button
                  onClick={() => setItems([...items, { text: "" }])}
                  style={{
                    width: "100%", padding: "10px", borderRadius: 10,
                    border: "2px dashed #cbd5e1", background: "transparent",
                    color: "#64748b", fontSize: 13, fontWeight: 600,
                    cursor: "pointer", transition: "all 0.2s",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#38bdf8"; e.currentTarget.style.color = "#38bdf8"; e.currentTarget.style.background = "#f0f9ff"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.color = "#64748b"; e.currentTarget.style.background = "transparent"; }}
                >
                  + Add News Item
                </button>
              </div>
            </div>

            {/* Right: Animation + Color settings */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>
              {/* Animation Settings */}
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" />
                </svg>
                Animation Settings
              </h3>

              {/* Animation type */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 8 }}>Animation Type</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {ANIMATION_TYPES.map((anim) => (
                    <button
                      key={anim.value}
                      onClick={() => setAnimationType(anim.value)}
                      style={{
                        padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                        cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit",
                        border: animationType === anim.value ? "1.5px solid #38bdf8" : "1.5px solid #e2e8f0",
                        background: animationType === anim.value ? "#f0f9ff" : "#fff",
                        color: animationType === anim.value ? "#38bdf8" : "#64748b",
                      }}
                    >
                      {anim.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Speed slider */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span>Marquee Speed</span>
                  <span style={{ color: "#38bdf8", fontWeight: 700 }}>{speed}s</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="80"
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#38bdf8", cursor: "pointer" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94a3b8", marginTop: 4 }}>
                  <span>Fast (10s)</span><span>Slow (80s)</span>
                </div>
              </div>

              {/* Color Settings */}
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /><circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                  <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" /><circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                  <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
                </svg>
                Color Settings
              </h3>

              {/* Presets */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 8 }}>Quick Presets</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => applyPreset(preset)}
                      style={{
                        padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                        cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit",
                        border: activePreset === preset.name ? "2px solid #0f172a" : "1.5px solid #e2e8f0",
                        background: preset.bg, color: preset.text,
                        display: "flex", alignItems: "center", gap: 6,
                      }}
                    >
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: preset.labelBg, display: "inline-block" }} />
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Individual color pickers */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
                {[
                  { label: "Background", value: bgColor, setter: setBgColor },
                  { label: "Text Color", value: textColor, setter: setTextColor },
                  { label: "Label BG", value: labelBgColor, setter: setLabelBgColor },
                  { label: "Label Text", value: labelTextColor, setter: setLabelTextColor },
                ].map((colorField) => (
                  <div key={colorField.label}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>{colorField.label}</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: 8, border: "1px solid #e2e8f0", padding: "4px 8px", background: "#fff" }}>
                      <input
                        type="color"
                        value={colorField.value}
                        onChange={(e) => { colorField.setter(e.target.value); setActivePreset(null); }}
                        style={{ width: 28, height: 28, border: "none", borderRadius: 4, cursor: "pointer", background: "transparent", padding: 0 }}
                      />
                      <input
                        type="text"
                        value={colorField.value}
                        onChange={(e) => { colorField.setter(e.target.value); setActivePreset(null); }}
                        style={{ flex: 1, border: "none", outline: "none", fontSize: 12, color: "#0f172a", fontFamily: "monospace", background: "transparent" }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Live Preview */}
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: "0 0 12px" }}>Live Preview</h3>
              <div
                style={{
                  height: 40,
                  borderRadius: 8,
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  background: bgColor,
                  border: "1px solid rgba(0,0,0,0.08)",
                }}
              >
                <div
                  style={{
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "0 14px",
                    height: "100%",
                    background: labelBgColor,
                    color: labelTextColor,
                    fontSize: "12px",
                    fontWeight: 800,
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: labelTextColor, display: "inline-block" }} />
                  IINM Updates:
                </div>
                <div style={{ flex: 1, overflow: "hidden", height: "100%", display: "flex", alignItems: "center" }}>
                  <div
                    style={{
                      display: "inline-block",
                      whiteSpace: "nowrap",
                      color: textColor,
                      fontSize: "13px",
                      fontWeight: 500,
                      animation: `${speed}s linear infinite`,
                      animationName: animationType === "fade" ? "tickerPreviewFade" : animationType === "slide" ? "tickerPreviewSlide" : "tickerPreviewScroll",
                    }}
                  >
                    {items.filter((i) => i.text.trim()).length > 0
                      ? items.filter((i) => i.text.trim()).map((i) => i.text).join("  •  ")
                      : "Your news headlines will appear here..."}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 28px",
              borderTop: "1px solid #f1f5f9",
              background: "#f8fafc",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 12, color: "#94a3b8" }}>
              {items.filter((i) => i.text.trim()).length} news items • {animationType} • {speed}s
            </span>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={onClose}
                style={{
                  padding: "10px 20px", borderRadius: 10, border: "1px solid #e2e8f0",
                  background: "#fff", color: "#64748b", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: "10px 24px", borderRadius: 10, border: "none",
                  background: "linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)",
                  color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.7 : 1, transition: "all 0.2s", fontFamily: "inherit",
                  boxShadow: "0 4px 12px rgba(56,189,248,0.3)",
                  display: "flex", alignItems: "center", gap: 8,
                }}
              >
                {saving ? (
                  "Saving..."
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
