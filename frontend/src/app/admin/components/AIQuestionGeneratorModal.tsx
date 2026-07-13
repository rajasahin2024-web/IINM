"use client";
import { apiFetch } from "@/lib/apiFetch";
import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import { useToast } from "./ToastProvider";
import { API_BASE_URL } from "@/lib/config";
import DOMPurify from 'dompurify';

/* ─── Types ─── */
interface QuestionType { id: number; code: string; name: string; is_active: boolean; }
interface Category { id: number; name: string; }
interface SubCategory { id: number; name: string; category_id: number; }
interface TopicItem { id: number; name: string; }
interface Attachment { name: string; mime_type: string; data_base64: string; preview?: string; }

interface AIGeneratedQuestion {
  question_html: string;
  options: { content_html: string; is_correct: boolean }[];
  answers: string[];
  solution_html?: string;
  hint_html?: string;
  topic?: string;
  difficulty_level?: string;
  default_marks?: number;
  default_time_to_solve?: number;
  negative_marks?: number;
  question_type_code: string;
  question_type_name: string;
  category_id?: number;
  subcategory_id?: number;
  tags?: string;
  /* UI state — prefixed with _ */
  _selected?: boolean;
  _saving?: boolean;
  _saved?: boolean;
  _id?: number;
  _regenerating?: boolean;
  _showRegenInput?: boolean;
  _regenFeedback?: string;
}

const DIFFICULTIES = ["very_easy", "easy", "medium", "hard", "very_hard"];
const DIFF_LABELS: Record<string, string> = {
  very_easy: "Very Easy", easy: "Easy", medium: "Medium", hard: "Hard", very_hard: "Very Hard",
};
const DIFF_COLORS: Record<string, string> = {
  very_easy: "#22c55e", easy: "#84cc16", medium: "#f59e0b", hard: "#ef4444", very_hard: "#8b5cf6",
};

/* ─── Floating Input Component (matches /admin/settings/email) ─── */
function FloatingInput({ label, type = "text", value, onChange, min, max, step, disabled }: {
  label: string; type?: string; value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  min?: number; max?: number; step?: number; disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const hasValue = value !== undefined && value !== null && value !== "";
  return (
    <div style={{ position: "relative", width: "100%", marginBottom: 4 }}>
      <input
        type={type} value={value} onChange={onChange}
        min={min} max={max} step={step} disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%", padding: "16px 14px 6px",
          border: `1.5px solid ${focused ? "#38bdf8" : "#e2e8f0"}`,
          borderRadius: 10, outline: "none", fontSize: 14,
          color: "#0f172a", background: disabled ? "#f8fafc" : "#fff",
          fontFamily: "inherit", boxSizing: "border-box" as const,
          boxShadow: focused ? "0 0 0 3px rgba(56,189,248,.15)" : "none",
          transition: "border-color .2s, box-shadow .2s",
          cursor: disabled ? "not-allowed" : "text",
        }}
      />
      <label style={{
        position: "absolute", left: 14,
        top: focused || hasValue ? 5 : "50%",
        transform: focused || hasValue ? "none" : "translateY(-50%)",
        fontSize: focused || hasValue ? 10 : 14,
        fontWeight: focused || hasValue ? 700 : 400,
        color: focused ? "#38bdf8" : hasValue ? "#64748b" : "#94a3b8",
        letterSpacing: focused || hasValue ? "0.4px" : 0,
        textTransform: focused || hasValue ? "uppercase" as const : "none" as const,
        transition: "all .2s cubic-bezier(.4,0,.2,1)",
        pointerEvents: "none", background: "transparent",
      }}>{label}</label>
    </div>
  );
}

function FloatingSelect({ label, value, onChange, children, disabled }: {
  label: string; value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode; disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  /* A <select> ALWAYS displays option text (e.g. "All Categories"),
     so the label must ALWAYS be lifted to avoid overlapping the text */
  const lifted = true;
  return (
    <div style={{ position: "relative", width: "100%", marginBottom: 4 }}>
      <select
        value={value} onChange={onChange} disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%",
          padding: "22px 36px 7px 14px",
          border: `1.5px solid ${focused ? "#38bdf8" : "#e2e8f0"}`,
          borderRadius: 10, outline: "none", fontSize: 14,
          color: "#0f172a",
          backgroundColor: disabled ? "#f8fafc" : "#fff",
          fontFamily: "inherit", boxSizing: "border-box" as const,
          boxShadow: focused ? "0 0 0 3px rgba(56,189,248,.15)" : "none",
          transition: "border-color .2s, box-shadow .2s",
          appearance: "none" as const,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 12px center",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >{children}</select>
      <label style={{
        position: "absolute", left: 14, top: 6,
        fontSize: 10, fontWeight: 700,
        color: focused ? "#38bdf8" : "#64748b",
        letterSpacing: "0.4px",
        textTransform: "uppercase" as const,
        pointerEvents: "none", zIndex: 1,
        transition: "color .2s",
      }}>{label}</label>
    </div>
  );
}

/* ─── CSS — Project Theme: #0f172a dark navy + #38bdf8 sky blue ─── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  .aig-modal {
    position: fixed; inset: 0; z-index: 99999;
    display: flex; flex-direction: column;
    background: #f8fafc;
    font-family: 'Inter', system-ui, sans-serif;
    animation: aig-slide-in .22s cubic-bezier(.4,0,.2,1);
    overflow: hidden;
  }
  @keyframes aig-slide-in { from{opacity:0;transform:scale(.97)} to{opacity:1;transform:scale(1)} }
  @keyframes aig-fade { from{opacity:0} to{opacity:1} }
  @keyframes aig-spin  { to { transform: rotate(360deg); } }

  /* ── Header ── */
  .aig-header {
    background: #0f172a;
    padding: 14px 24px;
    display: flex; align-items: center; justify-content: space-between;
    flex-shrink: 0;
    box-shadow: 0 2px 12px rgba(0,0,0,.25);
  }
  .aig-header-left { display: flex; align-items: center; gap: 12px; }
  .aig-header-icon {
    width: 38px; height: 38px; border-radius: 10px;
    background: #38bdf8;
    display: flex; align-items: center; justify-content: center;
  }
  .aig-header h2 { margin: 0; font-size: 1rem; font-weight: 700; color: #fff; letter-spacing: -.2px; }
  .aig-header p  { margin: 1px 0 0; font-size: .75rem; color: #94a3b8; }
  .aig-close-btn {
    width: 34px; height: 34px; border-radius: 8px; border: none;
    background: rgba(255,255,255,.08); color: #94a3b8;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: background .15s;
  }
  .aig-close-btn:hover { background: rgba(255,255,255,.18); color: #fff; }

  /* ── Body ── */
  .aig-body { display: flex; flex: 1; overflow: hidden; }

  /* ── Left panel ── */
  .aig-left {
    flex: 8; display: flex; flex-direction: column;
    border-right: 1px solid #e2e8f0; overflow-y: auto; background: #fff;
  }
  .aig-left-inner { padding: 24px; flex: 1; }

  /* ── Right panel ── */
  .aig-right { flex: 4; overflow-y: auto; background: #f8fafc; border-left: 1px solid #e2e8f0; }
  .aig-right-inner { padding: 20px; }

  .aig-section-title {
    font-size: .73rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: .06em; color: #64748b; margin: 0 0 10px;
  }

  /* ── Prompt ── */
  .aig-prompt-area {
    width: 100%; border: 1.5px solid #e2e8f0; border-radius: 10px;
    padding: 14px; font-size: .9rem; color: #0f172a; background: #f8fafc;
    resize: vertical; min-height: 120px; outline: none; font-family: inherit;
    line-height: 1.65; transition: border-color .18s, box-shadow .18s; box-sizing: border-box;
  }
  .aig-prompt-area:focus { border-color: #38bdf8; box-shadow: 0 0 0 3px rgba(56,189,248,.12); background: #fff; }

  /* ── Enhance ── */
  .aig-enhance-strip { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 10px; }
  .aig-enh-btn {
    display: inline-flex; align-items: center; gap: 5px; padding: 5px 12px;
    border-radius: 20px; border: 1.5px solid #e2e8f0; background: #fff; color: #475569;
    font-size: .75rem; font-weight: 600; cursor: pointer; transition: all .15s; font-family: inherit;
  }
  .aig-enh-btn:hover { border-color: #38bdf8; color: #0369a1; background: #f0f9ff; }

  /* ── Attachments ── */
  .aig-attach-section { margin-top: 20px; }
  .aig-attach-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
  .aig-attach-btn {
    display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px;
    border-radius: 9px; border: 1.5px dashed #cbd5e1; background: #f8fafc; color: #64748b;
    font-size: .82rem; font-weight: 600; cursor: pointer; transition: all .15s; font-family: inherit;
  }
  .aig-attach-btn:hover { border-color: #38bdf8; color: #0369a1; background: #f0f9ff; }
  .aig-attach-btn.active { border-color: #38bdf8; color: #0369a1; background: #e0f2fe; }
  .aig-attach-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  .aig-chip {
    display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px;
    border-radius: 8px; background: #e0f2fe; color: #0369a1;
    font-size: .78rem; font-weight: 600; max-width: 200px;
  }
  .aig-chip-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
  .aig-chip-del { cursor: pointer; opacity: .6; display: flex; align-items: center; }
  .aig-chip-del:hover { opacity: 1; }

  /* ── Audio ── */
  .aig-audio-wrap { margin-top: 14px; padding: 16px; border: 1.5px solid #e2e8f0; border-radius: 10px; background: #f8fafc; }
  .aig-audio-btns { display: flex; gap: 10px; margin-bottom: 12px; }
  .aig-rec-btn {
    display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px;
    border-radius: 9px; border: none; font-size: .85rem; font-weight: 600;
    cursor: pointer; font-family: inherit; transition: all .15s;
  }
  .aig-rec-btn.start { background: #dc2626; color: #fff; }
  .aig-rec-btn.start:hover { background: #b91c1c; }
  .aig-rec-btn.stop  { background: #374151; color: #fff; }
  .aig-rec-btn.stop:hover  { background: #111827; }
  .aig-rec-btn:disabled { opacity: .5; cursor: not-allowed; }
  .aig-rec-timer { font-size: .85rem; font-weight: 700; color: #dc2626; display: flex; align-items: center; gap: 5px; }

  /* ── Settings fields ── */
  .aig-field { margin-bottom: 16px; }

  /* Difficulty pills */
  .aig-diff-pills { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 2px; }
  .aig-diff-pill {
    padding: 5px 13px; border-radius: 20px; border: 1.5px solid transparent;
    font-size: .75rem; font-weight: 600; cursor: pointer; transition: all .14s;
    font-family: inherit; background: #f1f5f9; color: #64748b;
  }
  .aig-diff-pill.sel { border-color: currentColor; }

  .aig-negative-hint { font-size: .7rem; color: #94a3b8; margin: 2px 0 0 2px; }

  /* Tags floating wrap */
  .aig-tags-float-wrap {
    position: relative; width: 100%; margin-bottom: 4px;
  }
  .aig-tags-float-label {
    position: absolute; left: 14px;
    transition: all .2s cubic-bezier(.4,0,.2,1);
    pointer-events: none;
  }
  .aig-tags-wrap {
    width: 100%; padding: 16px 14px 6px;
    border: 1.5px solid #e2e8f0; border-radius: 10px;
    background: #fff; min-height: 50px; cursor: text;
    transition: border-color .18s, box-shadow .18s;
    display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
    font-family: inherit; box-sizing: border-box;
  }
  .aig-tags-wrap:focus-within { border-color: #38bdf8; box-shadow: 0 0 0 3px rgba(56,189,248,.15); }
  .aig-tag-chip {
    display: inline-flex; align-items: center; gap: 4px; padding: 2px 9px;
    border-radius: 20px; background: #e0f2fe; color: #0369a1; font-size: .73rem; font-weight: 600;
  }
  .aig-tag-rm { cursor: pointer; opacity: .6; background: none; border: none; padding: 0; color: inherit; display: flex; }
  .aig-tag-rm:hover { opacity: 1; }
  .aig-tag-input { border: none; outline: none; font-size: .85rem; color: #0f172a; flex: 1; min-width: 80px; background: transparent; font-family: inherit; }

  /* Generate button */
  .aig-generate-btn {
    width: 100%; padding: 13px; background: #0f172a;
    color: #fff; border: none; border-radius: 10px;
    font-size: .95rem; font-weight: 700; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 9px;
    transition: all .18s; font-family: inherit;
    box-shadow: 0 4px 14px rgba(15,23,42,.2);
    margin-top: 8px; letter-spacing: .02em;
  }
  .aig-generate-btn:hover:not(:disabled) { background: #1e293b; box-shadow: 0 6px 20px rgba(15,23,42,.3); }
  .aig-generate-btn:disabled { opacity: .6; cursor: not-allowed; }

  .aig-spinner { width: 17px; height: 17px; border: 2.5px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: aig-spin .7s linear infinite; }
  .aig-spinner-sm { width: 13px; height: 13px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: aig-spin .7s linear infinite; }
  .aig-spinner-dark { width: 14px; height: 14px; border: 2px solid #e2e8f0; border-top-color: #38bdf8; border-radius: 50%; animation: aig-spin .7s linear infinite; }

  /* ── Results ── */
  .aig-results { border-top: 1px solid #e2e8f0; padding: 20px 24px; background: #fff; }
  .aig-results-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .aig-results-title { font-size: .95rem; font-weight: 700; color: #0f172a; }
  .aig-results-meta { font-size: .8rem; color: #64748b; }

  /* Question cards */
  .aig-q-card {
    border: 1.5px solid #e2e8f0; border-radius: 12px; margin-bottom: 14px;
    overflow: visible; transition: box-shadow .18s, border-color .18s; background: #fff;
  }
  .aig-q-card.selected { border-color: #38bdf8; box-shadow: 0 0 0 3px rgba(56,189,248,.15); }
  .aig-q-card.saved    { border-color: #22c55e; background: #f0fdf4; }
  .aig-q-card.regenerating { opacity: .55; pointer-events: none; }

  .aig-q-header {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 14px 16px; cursor: pointer;
  }
  .aig-q-checkbox { width: 18px; height: 18px; accent-color: #38bdf8; cursor: pointer; flex-shrink: 0; margin-top: 2px; }
  .aig-q-num  { font-size: .72rem; font-weight: 700; color: #38bdf8; min-width: 24px; margin-top: 2px; }
  .aig-q-text { flex: 1; font-size: .88rem; color: #1e293b; line-height: 1.6; }
  .aig-q-text * { margin: 0; }
  .aig-q-badges { display: flex; gap: 6px; flex-shrink: 0; margin-top: 2px; }
  .aig-badge      { padding: 2px 8px; border-radius: 20px; font-size: .68rem; font-weight: 700; white-space: nowrap; }
  .aig-badge-diff { color: #fff; }
  .aig-badge-type { background: #e0f2fe; color: #0369a1; }

  .aig-q-body { padding: 0 16px 6px 50px; }
  .aig-q-options { list-style: none; margin: 8px 0; padding: 0; }
  .aig-q-options li {
    display: flex; align-items: flex-start; gap: 8px;
    padding: 6px 10px; border-radius: 7px; margin-bottom: 4px;
    font-size: .85rem; border: 1px solid #e2e8f0; color: #374151;
  }
  .aig-q-options li.correct { background: #f0fdf4; border-color: #86efac; color: #166534; font-weight: 600; }
  .aig-correct-ico { flex-shrink: 0; margin-top: 2px; }
  .aig-q-answers  { font-size: .85rem; color: #374151; }
  .aig-ans-pill   { display: inline-block; padding: 3px 10px; border-radius: 20px; background: #f0fdf4; color: #15803d; font-weight: 600; font-size: .8rem; margin: 2px; }

  .aig-q-solution { margin-top: 8px; }
  .aig-q-solution-label { font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #94a3b8; margin-bottom: 4px; }
  .aig-q-solution-text  { font-size: .83rem; color: #64748b; line-height: 1.55; }
  .aig-q-solution-text * { margin: 0; }

  /* ── Card bottom actions ── */
  .aig-q-actions {
    padding: 8px 16px 14px 50px;
    display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
  }
  .aig-q-save-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 16px; border-radius: 8px; border: none;
    background: #0f172a; color: #fff;
    font-size: .8rem; font-weight: 600; cursor: pointer;
    transition: all .15s; font-family: inherit;
  }
  .aig-q-save-btn:hover    { background: #1e293b; }
  .aig-q-save-btn:disabled { opacity: .5; cursor: not-allowed; }

  .aig-q-regen-btn {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 7px 14px; border-radius: 8px;
    border: 1.5px solid #e2e8f0; background: #fff;
    color: #475569; font-size: .8rem; font-weight: 600;
    cursor: pointer; transition: all .15s; font-family: inherit;
  }
  .aig-q-regen-btn:hover    { border-color: #38bdf8; color: #0369a1; background: #f0f9ff; }
  .aig-q-regen-btn:disabled { opacity: .5; cursor: not-allowed; }

  .aig-q-saved-badge {
    display: inline-flex; align-items: center; gap: 5px; padding: 6px 14px;
    border-radius: 8px; background: #dcfce7; color: #15803d; font-size: .8rem; font-weight: 600;
  }

  /* ── Regen feedback box ── */
  .aig-regen-feedback-wrap {
    margin: 0 16px 12px 50px;
    display: flex; gap: 8px; align-items: center;
    padding: 10px 14px;
    background: #f0f9ff; border: 1.5px solid #bae6fd; border-radius: 8px;
    animation: aig-fade .18s ease;
  }
  .aig-regen-label { font-size: .72rem; font-weight: 700; color: #0369a1; white-space: nowrap; }
  .aig-regen-feedback-input {
    flex: 1; border: none; outline: none; background: transparent;
    font-size: .83rem; color: #0f172a; font-family: inherit;
    padding: 2px 0;
  }
  .aig-regen-feedback-input::placeholder { color: #94a3b8; }
  .aig-regen-go-btn {
    padding: 5px 14px; border-radius: 6px; border: none;
    background: #0f172a; color: #fff;
    font-size: .78rem; font-weight: 700; cursor: pointer;
    font-family: inherit; transition: background .15s; white-space: nowrap;
    display: flex; align-items: center; gap: 5px;
  }
  .aig-regen-go-btn:hover { background: #1e293b; }
  .aig-regen-cancel {
    padding: 5px 10px; border-radius: 6px;
    border: 1px solid #cbd5e1; background: #fff; color: #64748b;
    font-size: .78rem; font-weight: 600; cursor: pointer;
    font-family: inherit; transition: background .15s;
  }
  .aig-regen-cancel:hover { background: #f8fafc; }

  /* ── Save bar ── */
  .aig-savebar {
    background: #0f172a; padding: 12px 24px;
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; flex-shrink: 0; box-shadow: 0 -2px 16px rgba(0,0,0,.15);
  }
  .aig-savebar-info { font-size: .85rem; color: #94a3b8; font-weight: 500; }
  .aig-savebar-actions { display: flex; gap: 10px; }
  .aig-savebar-btn {
    padding: 9px 22px; border-radius: 9px; border: none; font-size: .875rem; font-weight: 700;
    cursor: pointer; display: flex; align-items: center; gap: 7px; font-family: inherit; transition: all .15s;
  }
  .aig-savebar-btn.primary { background: #38bdf8; color: #0f172a; box-shadow: 0 2px 8px rgba(56,189,248,.3); }
  .aig-savebar-btn.primary:hover    { background: #0ea5e9; }
  .aig-savebar-btn.primary:disabled { opacity: .6; cursor: not-allowed; }
  .aig-savebar-btn.secondary { background: rgba(255,255,255,.08); color: #cbd5e1; border: 1px solid rgba(255,255,255,.12); }
  .aig-savebar-btn.secondary:hover { background: rgba(255,255,255,.15); }

  /* ── Empty ── */
  .aig-empty { text-align: center; padding: 48px 24px; color: #94a3b8; }
  .aig-empty-ico { font-size: 3rem; margin-bottom: 12px; opacity: .5; }
  .aig-empty h3 { font-size: .95rem; font-weight: 600; color: #64748b; margin: 0 0 6px; }
  .aig-empty p  { font-size: .83rem; margin: 0; line-height: 1.6; }

  /* ── Divider ── */
  .aig-divider { height: 1px; background: #e2e8f0; margin: 14px 0; }
`;

const ENHANCE_TEMPLATES = [
  { label: "📚 Add context",       text: "Include relevant real-world context and examples. " },
  { label: "🧠 Critical thinking", text: "Focus on higher-order thinking, analysis, and application. " },
  { label: "📖 Exam style",        text: "Make questions formal and suitable for competitive exams. " },
  { label: "🎯 Concept-based",     text: "Test deep understanding of core concepts and principles. " },
  { label: "⚡ Quick recall",      text: "Include factual recall and definition-based questions. " },
];

interface Props {
  onClose: () => void;
  onSaved?: () => void;
  defaultQuestionTypeCode?: string;
  defaultQuestionTypeName?: string;
}

export default function AIQuestionGeneratorModal({ onClose, onSaved, defaultQuestionTypeCode, defaultQuestionTypeName }: Props) {
  const { showToast } = useToast();
  const toast = {
    success: (msg: string) => showToast(msg, 'success'),
    error: (msg: string) => showToast(msg, 'error')
  };

  /* ── Metadata ── */
  const [questionTypes,  setQuestionTypes]  = useState<QuestionType[]>([]);
  const [categories,     setCategories]     = useState<Category[]>([]);
  const [subCategories,  setSubCategories]  = useState<SubCategory[]>([]);
  const [filteredSubs,   setFilteredSubs]   = useState<SubCategory[]>([]);
  const [topics,         setTopics]         = useState<TopicItem[]>([]);

  /* ── Settings ── */
  const [selectedQType,     setSelectedQType]     = useState(defaultQuestionTypeCode || "");
  const [selectedQTypeName, setSelectedQTypeName] = useState(defaultQuestionTypeName || "");
  const [categoryId,        setCategoryId]        = useState<number | "">("");
  const [subcategoryId,     setSubcategoryId]     = useState<number | "">("");
  const [topic,             setTopic]             = useState("");
  const [showAddTopic,      setShowAddTopic]      = useState(false);
  const [newTopicName,      setNewTopicName]      = useState("");
  const [savingTopic,       setSavingTopic]       = useState(false);
  const [difficulty,        setDifficulty]        = useState("medium");
  const [marks,             setMarks]             = useState(1);
  const [negativeMarks,     setNegativeMarks]     = useState(0);
  const [timeToSolve,       setTimeToSolve]       = useState(60);
  const [numQuestions,      setNumQuestions]      = useState(5);
  const [tags,              setTags]              = useState<string[]>([]);
  const [tagInput,          setTagInput]          = useState("");

  /* ── Prompt ── */
  const [prompt,          setPrompt]          = useState("");
  const [attachments,     setAttachments]     = useState<Attachment[]>([]);
  const [showAudio,       setShowAudio]       = useState(false);
  const [audioTranscript, setAudioTranscript] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Audio recording ── */
  const [recording,  setRecording]  = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recChunksRef     = useRef<Blob[]>([]);
  const recTimerRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Results ── */
  const [generating,          setGenerating]          = useState(false);
  const [generatedQuestions,  setGeneratedQuestions]  = useState<AIGeneratedQuestion[]>([]);
  const [savingAll,           setSavingAll]           = useState(false);

  /* ── OpenRouter Models ── */
  interface ORModel { id: string; name: string; pricing?: { prompt?: string; completion?: string }; }
  const [models,        setModels]        = useState<ORModel[]>([]);
  const [selectedModel, setSelectedModel] = useState("");

  /* ── Fetch metadata ── */
  useEffect(() => {
    Promise.all([
      apiFetch(`${API_BASE_URL}/question-types?is_active=true`).then(r => r.json()),
      apiFetch(`${API_BASE_URL}/categories`).then(r => r.json()),
      apiFetch(`${API_BASE_URL}/subcategories`).then(r => r.json()),
      apiFetch(`${API_BASE_URL}/topics`).then(r => r.json()),
      apiFetch(`${API_BASE_URL}/settings/ai/openrouter/models`).then(r => r.ok ? r.json() : Promise.resolve(null)),
    ]).then(([qts, cats, subs, tops, orData]) => {
      setQuestionTypes(Array.isArray(qts)  ? qts : []);
      setCategories(Array.isArray(cats)    ? cats : []);
      setSubCategories(Array.isArray(subs) ? subs : []);
      setTopics(Array.isArray(tops?.items || tops) ? (tops?.items || tops) : []);
      if (!defaultQuestionTypeCode && qts?.length > 0) {
        setSelectedQType(qts[0].code);
        setSelectedQTypeName(qts[0].name);
      }
      const orModels = Array.isArray(orData?.data) ? orData.data : [];
      setModels(orModels);
    }).catch(() => {});
  }, []);

  /* ── Filter subcategories ── */
  useEffect(() => {
    if (!categoryId) { setFilteredSubs(subCategories); return; }
    setFilteredSubs(subCategories.filter(s => s.category_id === Number(categoryId)));
    setSubcategoryId("");
  }, [categoryId, subCategories]);

  /* ── Create new topic inline ── */
  const createTopic = async () => {
    const name = newTopicName.trim();
    if (!name) return;
    setSavingTopic(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/topics`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: "", is_active: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to create topic");
      setTopics(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setTopic(data.name);
      setNewTopicName("");
      setShowAddTopic(false);
      toast.success(`Topic "${data.name}" created!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create topic");
    } finally { setSavingTopic(false); }
  };

  /* ── File attach ── */
  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files.slice(0, 3 - attachments.length)) {
      const reader = new FileReader();
      reader.onload = ev => {
        const base64   = (ev.target?.result as string).split(",")[1];
        const preview  = file.type.startsWith("image/") ? (ev.target?.result as string) : undefined;
        setAttachments(prev => [...prev, { name: file.name, mime_type: file.type, data_base64: base64, preview }]);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  /* ── Audio recording ── */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      recChunksRef.current = [];
      mr.ondataavailable = e => recChunksRef.current.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob   = new Blob(recChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onload = ev => {
          const base64 = (ev.target?.result as string).split(",")[1];
          setAttachments(prev => [...prev, { name: `audio_${Date.now()}.webm`, mime_type: "audio/webm", data_base64: base64 }]);
        };
        reader.readAsDataURL(blob);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecSeconds(0);
      recTimerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
    } catch { toast.error("Microphone access denied."); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    setRecording(false);
  };

  /* ── Tags ── */
  const addTag    = (val: string) => { const t = val.trim().replace(/,/g, ""); if (t && !tags.includes(t)) setTags(prev => [...prev, t]); setTagInput(""); };
  const removeTag = (tag: string) => setTags(t => t.filter(x => x !== tag));

  const formatPrice = (val?: string) => {
    if (!val || val === "0") return "Free";
    const n = parseFloat(val);
    if (isNaN(n)) return "—";
    if (n === 0) return "Free";
    return `$${(n * 1000000).toFixed(2)}/M`;
  };

  /* ── Build request body (shared by generate + regen) ── */
  const buildBody = useCallback((overridePrompt?: string, overrideNum?: number) => ({
    prompt:               (overridePrompt ?? prompt).trim(),
    question_type_code:   selectedQType,
    question_type_name:   selectedQTypeName,
    num_questions:        overrideNum ?? numQuestions,
    category_id:          categoryId   || null,
    subcategory_id:       subcategoryId || null,
    tags:                 tags.length ? tags.join(",") : null,
    topic:                topic        || null,
    difficulty_level:     difficulty,
    default_marks:        marks,
    negative_marks:       negativeMarks,
    default_time_to_solve: timeToSolve,
    attachments:          attachments.map(a => ({ name: a.name, mime_type: a.mime_type, data_base64: a.data_base64 })),
    audio_transcript:     audioTranscript || null,
    model:                selectedModel || null,
  }), [prompt, selectedQType, selectedQTypeName, numQuestions, categoryId, subcategoryId, tags, topic, difficulty, marks, negativeMarks, timeToSolve, attachments, audioTranscript, selectedModel]);

  /* ── Generate all ── */
  const handleGenerate = async () => {
    if (!prompt.trim())  { toast.error("Please enter a prompt first."); return; }
    if (!selectedQType)  { toast.error("Please select a question type."); return; }
    setGenerating(true);
    setGeneratedQuestions([]);
    try {
      const res  = await apiFetch(`${API_BASE_URL}/settings/ai/generate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Generation failed");
      const qs = (data.questions || []).map((q: AIGeneratedQuestion) => ({ ...q, _selected: true }));
      setGeneratedQuestions(qs);
      toast.success(`Generated ${qs.length} question${qs.length === 1 ? "" : "s"}!`);
    } catch (err: any) {
      toast.error(err.message || "AI generation failed. Check your API key in AI Settings.");
    } finally { setGenerating(false); }
  };

  /* ── Regenerate single question ── */
  const regenerateQuestion = useCallback(async (idx: number, feedback: string) => {
    const q = generatedQuestions[idx];
    if (!q) return;

    /* Build prompt: original + feedback hint */
    const combinedPrompt = feedback.trim()
      ? `${prompt.trim()}\n\n[Improvement needed for this question: ${feedback.trim()}]`
      : prompt.trim();

    setGeneratedQuestions(prev => prev.map((x, i) =>
      i === idx ? { ...x, _regenerating: true, _showRegenInput: false, _regenFeedback: "" } : x
    ));

    try {
      const res  = await apiFetch(`${API_BASE_URL}/settings/ai/generate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody(combinedPrompt, 1)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Regeneration failed");
      const newQ = data.questions?.[0];
      if (!newQ) throw new Error("No question returned");

      setGeneratedQuestions(prev => prev.map((x, i) =>
        i === idx
          ? { ...newQ, _selected: x._selected, _regenerating: false }
          : x
      ));
      toast.success(`Q${idx + 1} regenerated!`);
    } catch (err: any) {
      setGeneratedQuestions(prev => prev.map((x, i) =>
        i === idx ? { ...x, _regenerating: false } : x
      ));
      toast.error(err.message || "Regeneration failed");
    }
  }, [generatedQuestions, prompt, buildBody]);

  /* ── Toggle regen input visibility ── */
  const toggleRegenInput = (idx: number) => {
    setGeneratedQuestions(prev => prev.map((x, i) =>
      i === idx ? { ...x, _showRegenInput: !x._showRegenInput, _regenFeedback: "" } : x
    ));
  };

  /* ── Save single question ── */
  const saveQuestion = useCallback(async (idx: number) => {
    const q = generatedQuestions[idx];
    if (!q || q._saved) return;
    setGeneratedQuestions(prev => prev.map((x, i) => i === idx ? { ...x, _saving: true } : x));
    try {
      const qt = questionTypes.find(t => t.code === q.question_type_code);
      if (!qt) throw new Error("Question type not found");

      const res = await apiFetch(`${API_BASE_URL}/questions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_type_id:   qt.id,
          question_type_code: q.question_type_code,
          category_id:        q.category_id    || null,
          subcategory_id:     q.subcategory_id || null,
          tags:               q.tags           || null,
          question_html:      q.question_html,
          is_active:          true,
          options: (q.options || []).map((o, i) => ({ content_html: o.content_html, is_correct: o.is_correct, order_index: i })),
        }),
      });
      if (!res.ok) throw new Error("Failed to save question");
      const created = await res.json();

      await apiFetch(`${API_BASE_URL}/questions/${created.id}/settings`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic:                 q.topic           || null,
          difficulty_level:      q.difficulty_level || "medium",
          default_marks:         q.default_marks   ?? 1,
          negative_marks:        q.negative_marks  ?? 0,
          default_time_to_solve: q.default_time_to_solve ?? 60,
          tags:                  q.tags            || null,
        }),
      });

      if (q.solution_html || q.hint_html) {
        await apiFetch(`${API_BASE_URL}/questions/${created.id}/solution`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ solution_html: q.solution_html || null, hint_html: q.hint_html || null }),
        });
      }

      setGeneratedQuestions(prev => prev.map((x, i) =>
        i === idx ? { ...x, _saving: false, _saved: true, _id: created.id } : x
      ));
      toast.success("Question saved!");
      onSaved?.();
    } catch (err: any) {
      setGeneratedQuestions(prev => prev.map((x, i) => i === idx ? { ...x, _saving: false } : x));
      toast.error(err.message || "Failed to save question");
    }
  }, [generatedQuestions, questionTypes, onSaved]);

  /* ── Save all selected ── */
  const saveAllSelected = async () => {
    const toSave = generatedQuestions.map((q, i) => ({ q, i })).filter(({ q }) => q._selected && !q._saved);
    if (!toSave.length) { toast.error("No unsaved questions selected."); return; }
    setSavingAll(true);
    for (const { i } of toSave) await saveQuestion(i);
    setSavingAll(false);
    toast.success("All selected questions saved!");
  };

  const selectedCount = generatedQuestions.filter(q => q._selected && !q._saved).length;
  const savedCount    = generatedQuestions.filter(q => q._saved).length;
  const recFmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  if (typeof window === "undefined") return null;
  return ReactDOM.createPortal(
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="aig-modal">

        {/* ── Header ── */}
        <div className="aig-header">
          <div className="aig-header-left">
            <div className="aig-header-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2.5">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <div>
              <h2>Generate Questions with AI</h2>
              <p>Powered by OpenRouter · Create questions instantly from any topic or document</p>
            </div>
          </div>
          <button className="aig-close-btn" onClick={onClose} title="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="aig-body">

          {/* ════════ LEFT PANEL ════════ */}
          <div className="aig-left">
            <div className="aig-left-inner">

              {/* Prompt */}
              <p className="aig-section-title">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ display: "inline", marginRight: 5, verticalAlign: "middle" }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                Your Prompt
              </p>
              <textarea
                className="aig-prompt-area"
                placeholder="Describe what questions to generate… e.g. 'Generate questions about the French Revolution focusing on causes and key events'"
                value={prompt} onChange={e => setPrompt(e.target.value)} rows={5}
              />

              {/* Enhance */}
              <div className="aig-enhance-strip">
                <span style={{ fontSize: ".73rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".05em", display: "flex", alignItems: "center" }}>✨ Enhance:</span>
                {ENHANCE_TEMPLATES.map(t => (
                  <button key={t.label} className="aig-enh-btn" onClick={() => setPrompt(p => p + (p.endsWith(" ") || !p ? "" : " ") + t.text)}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Attachments */}
              <div className="aig-attach-section">
                <p className="aig-section-title" style={{ marginBottom: 8 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: "inline", marginRight: 5, verticalAlign: "middle" }}>
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                  </svg>
                  Attachments (PDF / Image / Audio)
                </p>
                <div className="aig-attach-row">
                  <button className={`aig-attach-btn${attachments.length > 0 ? " active" : ""}`}
                    onClick={() => fileInputRef.current?.click()} disabled={attachments.length >= 3}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                      <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
                    </svg>
                    Upload File {attachments.length > 0 ? `(${attachments.length}/3)` : ""}
                  </button>
                  <input ref={fileInputRef} type="file" accept=".pdf,image/*,audio/*" multiple style={{ display: "none" }} onChange={handleFileAttach} />

                  <button className={`aig-attach-btn${showAudio ? " active" : ""}`} onClick={() => setShowAudio(s => !s)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                    </svg>
                    {showAudio ? "Hide Audio Recorder" : "Record Audio"}
                  </button>
                </div>

                {attachments.length > 0 && (
                  <div className="aig-attach-chips">
                    {attachments.map((a, i) => (
                      <div key={i} className="aig-chip">
                        {a.preview
                          ? <img src={a.preview} alt="" style={{ width: 20, height: 20, borderRadius: 4, objectFit: "cover", flexShrink: 0 }} />
                          : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>}
                        <span className="aig-chip-name" title={a.name}>{a.name}</span>
                        <span className="aig-chip-del" onClick={() => setAttachments(atts => atts.filter((_, j) => j !== i))}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {showAudio && (
                  <div className="aig-audio-wrap">
                    <div className="aig-audio-btns">
                      {!recording ? (
                        <button className="aig-rec-btn start" onClick={startRecording}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
                          Start Recording
                        </button>
                      ) : (
                        <>
                          <button className="aig-rec-btn stop" onClick={stopRecording}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                            Stop
                          </button>
                          <div className="aig-rec-timer">
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#dc2626", display: "inline-block" }} />
                            {recFmt(recSeconds)}
                          </div>
                        </>
                      )}
                    </div>
                    <label style={{ fontSize: ".75rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: 6 }}>
                      Audio Transcript (optional)
                    </label>
                    <textarea
                      className="aig-prompt-area" rows={3}
                      placeholder="Paste or type transcript here…"
                      value={audioTranscript} onChange={e => setAudioTranscript(e.target.value)}
                      style={{ minHeight: 70 }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ── Generated Questions ── */}
            {generatedQuestions.length > 0 && (
              <div className="aig-results">
                <div className="aig-results-header">
                  <div className="aig-results-title">
                    Generated Questions
                    <span style={{ marginLeft: 8, padding: "2px 10px", borderRadius: 20, background: "#e0f2fe", color: "#0369a1", fontSize: ".75rem", fontWeight: 700 }}>
                      {generatedQuestions.length}
                    </span>
                  </div>
                  <div className="aig-results-meta">
                    {savedCount > 0 && <span style={{ color: "#15803d", marginRight: 8 }}>✓ {savedCount} saved</span>}
                    <button style={{ fontSize: ".78rem", fontWeight: 600, color: "#38bdf8", background: "none", border: "none", cursor: "pointer" }}
                      onClick={() => setGeneratedQuestions(q => q.map(x => ({ ...x, _selected: true })))}>Select All</button>
                    {" · "}
                    <button style={{ fontSize: ".78rem", fontWeight: 600, color: "#64748b", background: "none", border: "none", cursor: "pointer" }}
                      onClick={() => setGeneratedQuestions(q => q.map(x => ({ ...x, _selected: false })))}>Deselect All</button>
                  </div>
                </div>

                {generatedQuestions.map((q, idx) => (
                  <div key={idx} className={`aig-q-card${q._selected && !q._saved ? " selected" : ""}${q._saved ? " saved" : ""}${q._regenerating ? " regenerating" : ""}`}>

                    {/* Card header */}
                    <div className="aig-q-header" onClick={() => !q._saved && !q._regenerating && setGeneratedQuestions(qs => qs.map((x, i) => i === idx ? { ...x, _selected: !x._selected } : x))}>
                      {q._regenerating ? (
                        <div className="aig-spinner-dark" style={{ marginTop: 2, flexShrink: 0 }} />
                      ) : q._saved ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 2 }}>
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      ) : (
                        <input type="checkbox" className="aig-q-checkbox"
                          checked={!!q._selected}
                          onChange={() => setGeneratedQuestions(qs => qs.map((x, i) => i === idx ? { ...x, _selected: !x._selected } : x))}
                          onClick={e => e.stopPropagation()}
                        />
                      )}
                      <span className="aig-q-num">Q{idx + 1}</span>
                      <div className="aig-q-text" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(q.question_html) }} />
                      <div className="aig-q-badges">
                        {q.difficulty_level && (
                          <span className="aig-badge aig-badge-diff" style={{ background: DIFF_COLORS[q.difficulty_level] || "#64748b" }}>
                            {DIFF_LABELS[q.difficulty_level] || q.difficulty_level}
                          </span>
                        )}
                        <span className="aig-badge aig-badge-type">{q.question_type_code}</span>
                      </div>
                    </div>

                    {/* Options */}
                    {q.options && q.options.length > 0 && (
                      <div className="aig-q-body">
                        <ul className="aig-q-options">
                          {q.options.map((o, oi) => (
                            <li key={oi} className={o.is_correct ? "correct" : ""}>
                              {o.is_correct
                                ? <svg className="aig-correct-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                : <svg className="aig-correct-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5"><circle cx="12" cy="12" r="9"/></svg>}
                              <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(o.content_html) }} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Answers (SAQ/FB) */}
                    {q.answers && q.answers.length > 0 && (
                      <div className="aig-q-body">
                        <div className="aig-q-answers">
                          <span style={{ fontSize: ".72rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".05em", marginRight: 8 }}>Answers:</span>
                          {q.answers.map((a, ai) => <span key={ai} className="aig-ans-pill">{a}</span>)}
                        </div>
                      </div>
                    )}

                    {/* Solution */}
                    {q.solution_html && (
                      <div className="aig-q-body">
                        <div className="aig-q-solution">
                          <div className="aig-q-solution-label">Solution</div>
                          <div className="aig-q-solution-text" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(q.solution_html) }} />
                        </div>
                      </div>
                    )}

                    {/* ── Regenerate feedback input ── */}
                    {q._showRegenInput && !q._saved && (
                      <div className="aig-regen-feedback-wrap">
                        <span className="aig-regen-label">↻ Feedback:</span>
                        <input
                          className="aig-regen-feedback-input"
                          placeholder="What to improve? e.g. 'Make it harder' or 'Avoid this concept' (optional)"
                          value={q._regenFeedback || ""}
                          autoFocus
                          onChange={e => setGeneratedQuestions(prev => prev.map((x, i) => i === idx ? { ...x, _regenFeedback: e.target.value } : x))}
                          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); regenerateQuestion(idx, q._regenFeedback || ""); } if (e.key === "Escape") toggleRegenInput(idx); }}
                        />
                        <button className="aig-regen-go-btn" onClick={() => regenerateQuestion(idx, q._regenFeedback || "")}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                          </svg>
                          Regenerate
                        </button>
                        <button className="aig-regen-cancel" onClick={() => toggleRegenInput(idx)}>Cancel</button>
                      </div>
                    )}

                    {/* ── Bottom actions ── */}
                    <div className="aig-q-actions">
                      {q._saved ? (
                        <span className="aig-q-saved-badge">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                          Saved to Question Bank
                        </span>
                      ) : (
                        <>
                          <button className="aig-q-save-btn"
                            onClick={e => { e.stopPropagation(); saveQuestion(idx); }}
                            disabled={!!q._saving || !!q._regenerating}>
                            {q._saving
                              ? <><span className="aig-spinner-sm" /> Saving…</>
                              : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg> Save</>}
                          </button>

                          {/* Quick regen (no feedback) */}
                          <button className="aig-q-regen-btn"
                            title="Regenerate this question instantly"
                            onClick={e => { e.stopPropagation(); regenerateQuestion(idx, ""); }}
                            disabled={!!q._regenerating || generating}>
                            {q._regenerating
                              ? <><div className="aig-spinner-dark" /> Regenerating…</>
                              : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> ↻</>}
                          </button>

                          {/* Regen with feedback */}
                          {!q._showRegenInput && (
                            <button className="aig-q-regen-btn"
                              title="Regenerate with feedback"
                              onClick={e => { e.stopPropagation(); toggleRegenInput(idx); }}
                              disabled={!!q._regenerating || generating}>
                              ↻ with feedback
                            </button>
                          )}
                        </>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {generatedQuestions.length === 0 && !generating && (
              <div className="aig-empty" style={{ borderTop: "1px solid #f1f5f9" }}>
                <div className="aig-empty-ico">✨</div>
                <h3>Questions will appear here</h3>
                <p>Write a prompt, configure the settings on the right,<br/>then click <strong>Generate Questions</strong>.</p>
              </div>
            )}
          </div>

          {/* ════════ RIGHT PANEL ════════ */}
          <div className="aig-right">
            <div className="aig-right-inner">

              {/* Number of questions */}
              <div className="aig-field">
                <FloatingInput
                  label="Number of Questions"
                  type="text"
                  value={numQuestions}
                  min={1} max={20}
                  onChange={e => setNumQuestions(Math.max(1, Math.min(20, +e.target.value)))}
                />
                <p style={{ margin: "3px 0 0 4px", fontSize: ".72rem", color: "#94a3b8" }}>Max 20 per generation</p>
              </div>

              <div className="aig-divider" />

              {/* Question type */}
              <div className="aig-field">
                <FloatingSelect
                  label="Question Type"
                  value={selectedQType}
                  onChange={e => { setSelectedQType(e.target.value); const qt = questionTypes.find(t => t.code === e.target.value); setSelectedQTypeName(qt?.name || e.target.value); }}
                >
                  <option value="">Select type…</option>
                  {questionTypes.map(qt => <option key={qt.id} value={qt.code}>{qt.code} — {qt.name}</option>)}
                </FloatingSelect>
              </div>

              <div className="aig-divider" />
              <p className="aig-section-title">📋 Details</p>

              {/* Category */}
              <div className="aig-field">
                <FloatingSelect
                  label="Category"
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value ? +e.target.value : "")}
                >
                  <option value="">All Categories</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </FloatingSelect>
              </div>

              {/* Subcategory */}
              <div className="aig-field">
                <FloatingSelect
                  label="Sub-Category"
                  value={subcategoryId}
                  disabled={!categoryId}
                  onChange={e => setSubcategoryId(e.target.value ? +e.target.value : "")}
                >
                  <option value="">All Sub-Categories</option>
                  {filteredSubs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </FloatingSelect>
              </div>

              {/* Tags — floating label wrapper */}
              <div className="aig-field">
                <div className="aig-tags-float-wrap">
                  <label className="aig-tags-float-label" style={{
                    top: tags.length > 0 ? 5 : "50%",
                    transform: tags.length > 0 ? "none" : "translateY(-50%)",
                    fontSize: tags.length > 0 ? 10 : 14,
                    fontWeight: tags.length > 0 ? 700 : 400,
                    color: tags.length > 0 ? "#64748b" : "#94a3b8",
                    letterSpacing: tags.length > 0 ? "0.4px" : 0,
                    textTransform: tags.length > 0 ? "uppercase" : "none",
                  }}>Tags</label>
                  <div className="aig-tags-wrap" style={{ paddingTop: tags.length > 0 ? 22 : 14 }}>
                    {tags.map(tag => (
                      <span key={tag} className="aig-tag-chip">
                        {tag}
                        <button className="aig-tag-rm" onClick={() => removeTag(tag)}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </span>
                    ))}
                    <input className="aig-tag-input"
                      placeholder={tags.length ? "" : ""}
                      value={tagInput} onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); } }}
                      onBlur={() => tagInput.trim() && addTag(tagInput)} />
                  </div>
                </div>
              </div>

              <div className="aig-divider" />
              <p className="aig-section-title">⚙ Settings</p>

              {/* Topic — with inline Add New Topic */}
              <div className="aig-field">
                <FloatingSelect
                  label="Topic"
                  value={topic}
                  onChange={e => {
                    if (e.target.value === "__add_new__") {
                      setShowAddTopic(true);
                      setTopic("");
                    } else {
                      setTopic(e.target.value);
                      setShowAddTopic(false);
                    }
                  }}
                >
                  <option value="">No specific topic</option>
                  {topics.map((t: any) => <option key={t.id} value={t.name}>{t.name}</option>)}
                  <option value="__add_new__">＋ Add new topic…</option>
                </FloatingSelect>

                {/* Inline add-topic input */}
                {showAddTopic && (
                  <div style={{
                    display: "flex", gap: 7, alignItems: "center",
                    marginTop: 8, padding: "10px 12px",
                    background: "#f0f9ff", border: "1.5px solid #bae6fd",
                    borderRadius: 10, animation: "aig-fade .18s ease",
                  }}>
                    <input
                      autoFocus
                      placeholder="New topic name…"
                      value={newTopicName}
                      onChange={e => setNewTopicName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); createTopic(); } if (e.key === "Escape") { setShowAddTopic(false); setNewTopicName(""); } }}
                      style={{
                        flex: 1, border: "none", outline: "none",
                        fontSize: 13, color: "#0f172a", background: "transparent",
                        fontFamily: "inherit",
                      }}
                    />
                    <button
                      onClick={createTopic}
                      disabled={savingTopic || !newTopicName.trim()}
                      style={{
                        padding: "5px 12px", borderRadius: 7, border: "none",
                        background: "#0f172a", color: "#fff",
                        fontSize: 12, fontWeight: 700, cursor: "pointer",
                        fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5,
                        opacity: savingTopic || !newTopicName.trim() ? 0.5 : 1,
                      }}
                    >
                      {savingTopic
                        ? <div className="aig-spinner-dark" style={{ borderTopColor: "#38bdf8" }} />
                        : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                      Save
                    </button>
                    <button
                      onClick={() => { setShowAddTopic(false); setNewTopicName(""); }}
                      style={{
                        padding: "5px 10px", borderRadius: 7,
                        border: "1px solid #cbd5e1", background: "#fff",
                        color: "#64748b", fontSize: 12, fontWeight: 600,
                        cursor: "pointer", fontFamily: "inherit",
                      }}
                    >✕</button>
                  </div>
                )}
              </div>

              {/* Difficulty */}
              <div className="aig-field">
                <p className="aig-section-title" style={{ marginBottom: 8 }}>Difficulty Level</p>
                <div className="aig-diff-pills">
                  {DIFFICULTIES.map(d => (
                    <button key={d} className={`aig-diff-pill${difficulty === d ? " sel" : ""}`}
                      style={{ color: DIFF_COLORS[d], ...(difficulty === d ? { background: DIFF_COLORS[d] + "20" } : {}) }}
                      onClick={() => setDifficulty(d)}>
                      {DIFF_LABELS[d]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Marks + Negative Marks */}
              <div style={{ display: "flex", gap: 10 }}>
                <div className="aig-field" style={{ flex: 1 }}>
                  <FloatingInput
                    label="Default Marks"
                    type="text"
                    value={marks}
                    min={0} step={0.5}
                    onChange={e => setMarks(+e.target.value)}
                  />
                </div>
                <div className="aig-field" style={{ flex: 1 }}>
                  <FloatingInput
                    label="Negative Marks"
                    type="text"
                    value={negativeMarks}
                    max={0} step={0.25}
                    onChange={e => setNegativeMarks(Math.min(0, +e.target.value))}
                  />
                </div>
              </div>
              <p className="aig-negative-hint">e.g. −0.25 per wrong answer · 0 = no penalty</p>

              {/* Time */}
              <div className="aig-field" style={{ marginTop: 14 }}>
                <FloatingInput
                  label="Time to Solve (seconds)"
                  type="text"
                  value={timeToSolve}
                  min={10} step={10}
                  onChange={e => setTimeToSolve(+e.target.value)}
                />
              </div>

              <div className="aig-divider" />

              {/* Model selector */}
              {models.length > 0 && (
                <div className="aig-field">
                  <p className="aig-section-title" style={{ marginBottom: 8 }}>🤖 AI Model</p>
                  <select
                    value={selectedModel}
                    onChange={e => setSelectedModel(e.target.value)}
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: 8,
                      border: "1.5px solid #e2e8f0", outline: "none", fontSize: 13,
                      color: "#0f172a", background: "#fff", fontFamily: "inherit",
                      cursor: "pointer"
                    }}
                  >
                    <option value="">Default (from AI Settings)</option>
                    {models.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} — {formatPrice(m.pricing?.prompt)} / {formatPrice(m.pricing?.completion)}
                      </option>
                    ))}
                  </select>
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8" }}>
                    Pricing shown per 1M tokens. Free models marked as Free.
                  </p>
                </div>
              )}

              <div className="aig-divider" />

              {/* Generate button */}
              <button className="aig-generate-btn"
                onClick={handleGenerate}
                disabled={generating || !prompt.trim() || !selectedQType}>
                {generating
                  ? <><div className="aig-spinner" /> Generating…</>
                  : <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                      </svg>
                      Generate {numQuestions} Question{numQuestions > 1 ? "s" : ""}
                    </>}
              </button>

              {generatedQuestions.length > 0 && (
                <p style={{ marginTop: 10, fontSize: ".73rem", color: "#94a3b8", textAlign: "center", lineHeight: 1.5 }}>
                  {generating ? "Computing…" : `${generatedQuestions.length} generated · ${savedCount} saved`}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Save Bar ── */}
        {generatedQuestions.length > 0 && (
          <div className="aig-savebar">
            <div className="aig-savebar-info">
              {selectedCount > 0
                ? `${selectedCount} question${selectedCount > 1 ? "s" : ""} selected · ${savedCount} already saved`
                : savedCount > 0
                  ? `All done — ${savedCount} question${savedCount > 1 ? "s" : ""} saved!`
                  : "Select questions to save"}
            </div>
            <div className="aig-savebar-actions">
              <button className="aig-savebar-btn secondary" onClick={onClose}>Done</button>
              {selectedCount > 0 && (
                <button className="aig-savebar-btn primary" onClick={saveAllSelected} disabled={savingAll}>
                  {savingAll
                    ? <><div className="aig-spinner" style={{ borderTopColor: "#0f172a" }} /> Saving…</>
                    : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg> Save {selectedCount} Selected</>}
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </>,
    document.body
  );
}
