"use client";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL } from "@/lib/config";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "./ToastProvider";

interface ORModel {
  id: string;
  name: string;
  pricing?: { prompt?: string; completion?: string };
}

interface GeneratedChapter {
  title: string;
  content: string;
  _selected: boolean;
  _saving: boolean;
  _saved: boolean;
}

interface Props {
  subjectId: number;
  subjectName: string;
  onClose: () => void;
  onChaptersAdded: () => void;
}

export default function AIChapterGeneratorModal({ subjectId, subjectName, onClose, onChaptersAdded }: Props) {
  const { showToast } = useToast();
  const toast = {
    success: (msg: string) => showToast(msg, "success"),
    error: (msg: string) => showToast(msg, "error"),
  };

  const [models, setModels] = useState<ORModel[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBase64, setPdfBase64] = useState("");
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [chapters, setChapters] = useState<GeneratedChapter[]>([]);
  const [addingAll, setAddingAll] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`${API_BASE_URL}/settings/ai/openrouter/models`);
        if (res.ok) {
          const data = await res.json();
          const orModels = Array.isArray(data?.data) ? data.data : [];
          setModels(orModels);
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const handleFileSelect = (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error("PDF file must be under 25MB.");
      return;
    }
    setPdfFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      const base64 = result.split(",")[1];
      setPdfBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const removePdf = () => {
    setPdfFile(null);
    setPdfBase64("");
  };

  const formatPrice = (val?: string) => {
    if (!val || val === "0") return "Free";
    const n = parseFloat(val);
    if (isNaN(n)) return "—";
    if (n === 0) return "Free";
    return `$${(n * 1000000).toFixed(2)}/M`;
  };

  const handleGenerate = async () => {
    if (!pdfBase64) {
      toast.error("Please upload a PDF syllabus file.");
      return;
    }
    setGenerating(true);
    setChapters([]);
    try {
      const res = await apiFetch(`${API_BASE_URL}/settings/ai/generate_chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdf_base64: pdfBase64,
          prompt: prompt.trim() || null,
          subject_name: subjectName,
          model: selectedModel || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Generation failed");
      const generated = (data.chapters || []).map((ch: { title: string; content: string }) => ({
        ...ch,
        _selected: true,
        _saving: false,
        _saved: false,
      }));
      setChapters(generated);
      toast.success(`Generated ${generated.length} chapter${generated.length === 1 ? "" : "s"}!`);
    } catch (err: any) {
      toast.error(err.message || "AI generation failed. Check AI Settings.");
    } finally {
      setGenerating(false);
    }
  };

  const toggleChapter = (idx: number) => {
    setChapters((prev) => prev.map((c, i) => (i === idx ? { ...c, _selected: !c._selected } : c)));
  };

  const toggleAll = (selected: boolean) => {
    setChapters((prev) => prev.map((c) => ({ ...c, _selected: selected })));
  };

  const updateChapterTitle = (idx: number, title: string) => {
    setChapters((prev) => prev.map((c, i) => (i === idx ? { ...c, title } : c)));
  };

  const updateChapterContent = (idx: number, content: string) => {
    setChapters((prev) => prev.map((c, i) => (i === idx ? { ...c, content } : c)));
  };

  const selectedCount = chapters.filter((c) => c._selected && !c._saved).length;

  const handleAddSelected = async () => {
    const toAdd = chapters.filter((c) => c._selected && !c._saved);
    if (toAdd.length === 0) {
      toast.error("No chapters selected to add.");
      return;
    }
    setAddingAll(true);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i];
      if (!ch._selected || ch._saved) continue;
      setChapters((prev) => prev.map((c, idx) => (idx === i ? { ...c, _saving: true } : c)));
      try {
        const res = await apiFetch(`${API_BASE_URL}/subjects/${subjectId}/chapters`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: ch.title.trim(),
            content: ch.content.trim(),
            subject_id: subjectId,
            is_active: true,
          }),
        });
        if (res.ok) {
          successCount++;
          setChapters((prev) => prev.map((c, idx) => (idx === i ? { ...c, _saving: false, _saved: true } : c)));
        } else {
          failCount++;
          setChapters((prev) => prev.map((c, idx) => (idx === i ? { ...c, _saving: false } : c)));
        }
      } catch {
        failCount++;
        setChapters((prev) => prev.map((c, idx) => (idx === i ? { ...c, _saving: false } : c)));
      }
    }

    setAddingAll(false);
    if (successCount > 0) {
      toast.success(`${successCount} chapter${successCount === 1 ? "" : "s"} added to ${subjectName}!`);
      onChaptersAdded();
    }
    if (failCount > 0) {
      toast.error(`${failCount} chapter${failCount === 1 ? "" : "s"} failed to add.`);
    }
    if (successCount > 0 && failCount === 0) {
      onClose();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        background: "#f8fafc",
        fontFamily: "Inter, system-ui, sans-serif",
        animation: "aigc-slide-in 0.22s cubic-bezier(.4,0,.2,1)",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes aigc-slide-in { from{opacity:0;transform:scale(.97)} to{opacity:1;transform:scale(1)} }
        @keyframes aigc-spin { to { transform: rotate(360deg); } }
        @keyframes aigc-fade { from{opacity:0} to{opacity:1} }
      `}</style>

      {/* Header */}
      <div
        style={{
          background: "#0f172a",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          boxShadow: "0 2px 12px rgba(0,0,0,.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "#6366f1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#fff" }}>AI Chapter Generator</h2>
            <p style={{ margin: "1px 0 0", fontSize: ".75rem", color: "#94a3b8" }}>
              Subject: <b style={{ color: "#c7d2fe" }}>{subjectName}</b> — Upload a PDF syllabus and let AI generate chapters
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            border: "none",
            background: "rgba(255,255,255,.08)",
            color: "#94a3b8",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background .15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.18)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.08)")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left panel — config */}
        <div style={{ flex: 5, overflowY: "auto", background: "#fff", borderRight: "1px solid #e2e8f0" }}>
          <div style={{ padding: 24 }}>
            {/* Model selector */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: ".73rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "#64748b", marginBottom: 8 }}>
                AI Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1.5px solid #e2e8f0",
                  outline: "none",
                  fontSize: 14,
                  color: "#0f172a",
                  background: "#fff",
                  fontFamily: "inherit",
                  cursor: "pointer",
                  boxSizing: "border-box",
                  appearance: "none",
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 12px center",
                }}
              >
                <option value="">Default (from AI Settings)</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {formatPrice(m.pricing?.prompt)} / {formatPrice(m.pricing?.completion)}
                  </option>
                ))}
              </select>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8" }}>
                {models.length} model{models.length !== 1 ? "s" : ""} available. Configure in AI Settings if empty.
              </p>
            </div>

            {/* PDF Upload */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: ".73rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "#64748b", marginBottom: 8 }}>
                PDF Syllabus File *
              </label>
              {!pdfFile ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragOver ? "#6366f1" : "#cbd5e1"}`,
                    borderRadius: 12,
                    padding: "36px 20px",
                    textAlign: "center",
                    cursor: "pointer",
                    background: dragOver ? "#eef2ff" : "#f8fafc",
                    transition: "all .18s",
                  }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#475569" }}>Click to upload or drag & drop</p>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>PDF files only, max 25MB</p>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 16px",
                    borderRadius: 10,
                    border: "1.5px solid #c7d2fe",
                    background: "#eef2ff",
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pdfFile.name}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "#64748b" }}>{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button
                    onClick={removePdf}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      border: "none",
                      background: "#fee2e2",
                      color: "#ef4444",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleFileInput} style={{ display: "none" }} />
            </div>

            {/* Optional prompt */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: ".73rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "#64748b", marginBottom: 8 }}>
                Additional Instructions (optional)
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="e.g. Focus on the first 5 chapters, make summaries concise, skip appendices..."
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1.5px solid #e2e8f0",
                  fontSize: 13,
                  color: "#0f172a",
                  background: "#f8fafc",
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                  lineHeight: 1.6,
                  transition: "border-color .18s, box-shadow .18s",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#6366f1";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99,102,241,.12)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={generating || !pdfBase64}
              style={{
                width: "100%",
                padding: "13px",
                background: generating || !pdfBase64 ? "#94a3b8" : "#0f172a",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                fontSize: ".95rem",
                fontWeight: 700,
                cursor: generating || !pdfBase64 ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 9,
                transition: "all .18s",
                fontFamily: "inherit",
                boxShadow: !pdfBase64 || generating ? "none" : "0 4px 14px rgba(15,23,42,.2)",
              }}
            >
              {generating ? (
                <>
                  <span style={{ width: 17, height: 17, border: "2.5px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "aigc-spin .7s linear infinite" }} />
                  Analyzing PDF & Generating Chapters...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  Generate Chapters with AI
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right panel — results */}
        <div style={{ flex: 7, overflowY: "auto", background: "#f8fafc", borderLeft: "1px solid #e2e8f0" }}>
          <div style={{ padding: 20 }}>
            {chapters.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 24px", color: "#94a3b8" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 12, opacity: 0.4 }}>📚</div>
                <h3 style={{ fontSize: ".95rem", fontWeight: 600, color: "#64748b", margin: "0 0 6px" }}>No chapters generated yet</h3>
                <p style={{ fontSize: ".83rem", margin: 0, lineHeight: 1.6 }}>
                  Upload a PDF syllabus and click "Generate Chapters with AI" to see suggested chapters here.
                </p>
              </div>
            ) : (
              <>
              {/* Results header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: ".95rem", fontWeight: 700, color: "#0f172a" }}>
                    Generated Chapters ({chapters.length})
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: ".8rem", color: "#64748b" }}>
                    {selectedCount} selected to add
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => toggleAll(true)}
                    style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #c7d2fe", background: "#eef2ff", color: "#4f46e5", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => toggleAll(false)}
                    style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Chapter cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {chapters.map((ch, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: `1.5px solid ${ch._saved ? "#86efac" : ch._selected ? "#c7d2fe" : "#e2e8f0"}`,
                      borderRadius: 12,
                      background: ch._saved ? "#f0fdf4" : "#fff",
                      overflow: "hidden",
                      transition: "border-color .18s, box-shadow .18s",
                      boxShadow: ch._selected && !ch._saved ? "0 0 0 3px rgba(99,102,241,.08)" : "none",
                      opacity: ch._saving ? 0.6 : 1,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px" }}>
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={ch._selected}
                        onChange={() => toggleChapter(idx)}
                        disabled={ch._saved}
                        style={{ width: 18, height: 18, accentColor: "#6366f1", cursor: ch._saved ? "not-allowed" : "pointer", flexShrink: 0, marginTop: 2 }}
                      />
                      {/* Number */}
                      <span style={{ fontSize: ".72rem", fontWeight: 700, color: "#6366f1", minWidth: 24, marginTop: 2 }}>{idx + 1}.</span>
                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <input
                          value={ch.title}
                          onChange={(e) => updateChapterTitle(idx, e.target.value)}
                          disabled={ch._saved}
                          style={{
                            width: "100%",
                            padding: "6px 10px",
                            borderRadius: 6,
                            border: "1px solid #e2e8f0",
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#0f172a",
                            background: ch._saved ? "#f0fdf4" : "#fff",
                            outline: "none",
                            boxSizing: "border-box",
                            fontFamily: "inherit",
                            marginBottom: 6,
                          }}
                        />
                        <textarea
                          value={ch.content}
                          onChange={(e) => updateChapterContent(idx, e.target.value)}
                          disabled={ch._saved}
                          rows={2}
                          style={{
                            width: "100%",
                            padding: "6px 10px",
                            borderRadius: 6,
                            border: "1px solid #e2e8f0",
                            fontSize: 12,
                            color: "#64748b",
                            background: ch._saved ? "#f0fdf4" : "#fff",
                            outline: "none",
                            resize: "vertical",
                            boxSizing: "border-box",
                            fontFamily: "inherit",
                            lineHeight: 1.5,
                          }}
                        />
                      </div>
                      {/* Status badge */}
                      {ch._saved && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 8, background: "#dcfce7", color: "#15803d", fontSize: ".78rem", fontWeight: 600, flexShrink: 0, marginTop: 2 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                          Added
                        </span>
                      )}
                      {ch._saving && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 8, background: "#eef2ff", color: "#4f46e5", fontSize: ".78rem", fontWeight: 600, flexShrink: 0, marginTop: 2 }}>
                          <span style={{ width: 12, height: 12, border: "2px solid rgba(79,70,229,.3)", borderTopColor: "#4f46e5", borderRadius: "50%", animation: "aigc-spin .7s linear infinite" }} />
                          Adding...
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer bar */}
      {chapters.length > 0 && (
        <div
          style={{
            background: "#0f172a",
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexShrink: 0,
            boxShadow: "0 -2px 16px rgba(0,0,0,.15)",
          }}
        >
          <span style={{ fontSize: ".85rem", color: "#94a3b8", fontWeight: 500 }}>
            {selectedCount} chapter{selectedCount !== 1 ? "s" : ""} selected to add to <b style={{ color: "#c7d2fe" }}>{subjectName}</b>
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                padding: "9px 22px",
                borderRadius: 9,
                border: "1px solid rgba(255,255,255,.12)",
                background: "rgba(255,255,255,.08)",
                color: "#cbd5e1",
                fontSize: ".875rem",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "background .15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.15)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.08)")}
            >
              Close
            </button>
            <button
              onClick={handleAddSelected}
              disabled={addingAll || selectedCount === 0}
              style={{
                padding: "9px 22px",
                borderRadius: 9,
                border: "none",
                background: addingAll || selectedCount === 0 ? "#475569" : "#6366f1",
                color: "#fff",
                fontSize: ".875rem",
                fontWeight: 700,
                cursor: addingAll || selectedCount === 0 ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 7,
                transition: "all .15s",
                boxShadow: selectedCount === 0 || addingAll ? "none" : "0 2px 8px rgba(99,102,241,.3)",
              }}
            >
              {addingAll ? (
                <>
                  <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "aigc-spin .7s linear infinite" }} />
                  Adding Chapters...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add {selectedCount} Chapter{selectedCount !== 1 ? "s" : ""}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
