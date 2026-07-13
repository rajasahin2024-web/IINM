"use client";
import { apiFetch } from "@/lib/apiFetch";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { AdminProvider } from "../../../../../components/ProtectedAdmin";
import { API_BASE_URL } from "@/lib/config";
import { useRouter, useParams, useSearchParams } from "next/navigation";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
interface Category       { id: number; name: string; is_active: boolean; }
interface SubCategory    { id: number; name: string; category_id: number; is_active: boolean; }
interface TopicItem      { id: number; name: string; is_active: boolean; }
interface DifficultyItem { id: number; label: string; code: string; color: string; order_index: number; is_active: boolean; }

interface Option {
  id: string;
  content: string;
  isCorrect: boolean;
  leftContent?: string;
  rightContent?: string;
}

type Tab = "details" | "settings" | "solution" | "attachment";

/* ─────────────────────────────────────────────
   GLOBAL CSS
───────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  :root {
    --qc-accent:    #7c3aed;
    --qc-accent-dk: #6d28d9;
    --qc-green:     #059669;
    --qc-border:    #e5e7eb;
    --qc-bg:        #f3f4f6;
    --qc-white:     #fff;
    --qc-txt:       #111827;
    --qc-txt2:      #6b7280;
    --qc-danger:    #dc2626;
    --qc-opt-bg:    #f0fdf8;
    --qc-opt-border:#a7f3d0;
  }

  .qc-root {
    font-family: 'Inter', system-ui, sans-serif;
    background: var(--qc-bg);
    min-height: 100vh;
    color: var(--qc-txt);
    box-sizing: border-box;
  }
  .qc-root *, .qc-root *::before, .qc-root *::after { box-sizing: border-box; }

  /* ── Top bar ── */
  .qc-topbar {
    background: var(--qc-white);
    border-bottom: 1px solid var(--qc-border);
    padding: 14px 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    position: sticky;
    top: 0;
    z-index: 30;
    box-shadow: 0 1px 4px rgba(0,0,0,.06);
  }
  .qc-topbar-left h2 {
    font-size: 1rem;
    font-weight: 700;
    color: var(--qc-txt);
    margin: 0 0 2px;
  }
  .qc-topbar-left p {
    font-size: .78rem;
    color: var(--qc-txt2);
    margin: 0;
  }

  /* ── Tab pills ── */
  .qc-tabs {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .qc-tab {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 7px 18px;
    border-radius: 24px;
    border: 1.5px solid var(--qc-border);
    background: var(--qc-white);
    font-size: .8rem;
    font-weight: 600;
    color: var(--qc-txt2);
    cursor: pointer;
    transition: all .18s;
    font-family: inherit;
  }
  .qc-tab.active {
    background: var(--qc-accent);
    border-color: var(--qc-accent);
    color: #fff;
  }
  .qc-tab.unlocked:not(.active):hover {
    border-color: var(--qc-accent);
    color: var(--qc-accent);
    background: #f5f3ff;
  }
  .qc-tab-num {
    width: 20px; height: 20px;
    border-radius: 50%;
    display: inline-flex; align-items: center; justify-content: center;
    font-size: .7rem; font-weight: 700;
    background: rgba(255,255,255,.25);
  }
  .qc-tab:not(.active) .qc-tab-num {
    background: var(--qc-border);
    color: var(--qc-txt2);
  }
  .qc-tab.disabled {
    opacity: .45;
    cursor: not-allowed;
  }

  /* ── Body ── */
  .qc-body {
    width: 100%;
    margin: 0 auto;
    padding: 32px 24px 80px;
  }

  /* ── Section card ── */
  .qc-card {
    background: var(--qc-white);
    border-radius: 14px;
    border: 1px solid var(--qc-border);
    box-shadow: 0 1px 3px rgba(0,0,0,.05);
    margin-bottom: 20px;
    overflow: visible;
  }
  .qc-card-body { padding: 24px; }

  /* ── Card header ── */
  .qc-card-header {
    padding: 18px 24px 0;
  }
  .qc-card-title {
    font-size: .95rem;
    font-weight: 700;
    color: var(--qc-txt);
    margin: 0 0 4px;
  }
  .qc-card-subtitle {
    font-size: .78rem;
    color: var(--qc-txt2);
    margin: 0 0 18px;
  }

  /* ── Field label ── */
  .qc-label {
    display: block;
    font-size: .8rem;
    font-weight: 600;
    color: var(--qc-txt2);
    text-transform: uppercase;
    letter-spacing: .05em;
    margin-bottom: 8px;
  }
  .qc-req { color: var(--qc-danger); margin-left: 2px; }
  .qc-fw  { margin-bottom: 20px; }

  /* ── Select ── */
  .qc-select {
    width: 100%;
    padding: 11px 14px;
    border: 1.5px solid var(--qc-border);
    border-radius: 9px;
    font-size: .9rem;
    color: var(--qc-txt);
    background: var(--qc-white);
    outline: none;
    cursor: pointer;
    transition: border-color .18s;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    padding-right: 36px;
    font-family: inherit;
  }
  .qc-select:focus { border-color: var(--qc-accent); box-shadow: 0 0 0 3px rgba(124,58,237,.12); }
  .qc-select:disabled { background-color: #f9fafb; color: #9ca3af; cursor: not-allowed; }

  /* ── Input ── */
  .qc-input {
    width: 100%;
    padding: 11px 14px;
    border: 1.5px solid var(--qc-border);
    border-radius: 9px;
    font-size: .9rem;
    color: var(--qc-txt);
    background: var(--qc-white);
    outline: none;
    transition: border-color .18s;
    font-family: inherit;
  }
  .qc-input:focus { border-color: var(--qc-accent); box-shadow: 0 0 0 3px rgba(124,58,237,.12); }

  /* ── Tags input ── */
  .qc-tags-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    padding: 8px 12px;
    border: 1.5px solid var(--qc-border);
    border-radius: 9px;
    background: var(--qc-white);
    min-height: 46px;
    cursor: text;
    transition: border-color .18s;
  }
  .qc-tags-wrap:focus-within {
    border-color: var(--qc-accent);
    box-shadow: 0 0 0 3px rgba(124,58,237,.12);
  }
  .qc-tag-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: 20px;
    background: #ede9fe;
    color: var(--qc-accent);
    font-size: .78rem;
    font-weight: 600;
  }
  .qc-tag-remove {
    border: none;
    background: transparent;
    cursor: pointer;
    color: var(--qc-accent);
    padding: 0;
    display: flex;
    align-items: center;
    line-height: 1;
    opacity: .7;
  }
  .qc-tag-remove:hover { opacity: 1; }
  .qc-tag-input {
    border: none;
    outline: none;
    font-size: .875rem;
    color: var(--qc-txt);
    flex: 1;
    min-width: 120px;
    background: transparent;
    font-family: inherit;
  }

  /* ── Toggle ── */
  .qc-toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 0;
    border-top: 1px solid var(--qc-border);
  }
  .qc-toggle-info { flex: 1; }
  .qc-toggle-info strong { display: block; font-size: .9rem; font-weight: 600; color: var(--qc-txt); margin-bottom: 2px; }
  .qc-toggle-info span  { font-size: .78rem; color: var(--qc-txt2); }
  .qc-switch { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
  .qc-switch input { opacity: 0; width: 0; height: 0; }
  .qc-slider {
    position: absolute; inset: 0;
    background: #d1d5db;
    border-radius: 24px;
    cursor: pointer;
    transition: background .2s;
  }
  .qc-slider::before {
    content: ""; position: absolute;
    width: 18px; height: 18px;
    left: 3px; bottom: 3px;
    background: #fff;
    border-radius: 50%;
    transition: transform .2s;
    box-shadow: 0 1px 3px rgba(0,0,0,.2);
  }
  .qc-switch input:checked + .qc-slider { background: var(--qc-accent); }
  .qc-switch input:checked + .qc-slider::before { transform: translateX(20px); }

  /* ── Rich text editor (DIV-based) ── */
  .qc-editor-wrap {
    border: 1.5px solid var(--qc-border);
    border-radius: 9px;
    overflow: hidden;
    transition: border-color .18s;
  }
  .qc-editor-wrap:focus-within {
    border-color: var(--qc-accent);
    box-shadow: 0 0 0 3px rgba(124,58,237,.12);
  }
  .qc-editor-toolbar {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 7px 10px;
    background: #f8f9fa;
    border-bottom: 1px solid var(--qc-border);
    flex-wrap: wrap;
  }
  .qc-tb-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px; height: 28px;
    border-radius: 5px;
    border: none;
    background: transparent;
    cursor: pointer;
    color: #374151;
    font-size: .82rem;
    font-weight: 700;
    transition: all .14s;
    font-family: inherit;
  }
  .qc-tb-btn:hover { background: #e5e7eb; }
  .qc-tb-btn.on { background: #e0e7ff; color: var(--qc-accent); }
  .qc-tb-sep {
    width: 1px; height: 20px;
    background: var(--qc-border);
    margin: 0 4px;
  }
  .qc-editor-area {
    min-height: 160px;
    padding: 14px;
    outline: none;
    font-size: .9rem;
    color: var(--qc-txt);
    line-height: 1.7;
    font-family: inherit;
  }
  /* Option mini editor */
  .qc-mini-toolbar {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 5px 8px;
    background: #f8f9fa;
    border-bottom: 1px solid var(--qc-border);
  }
  .qc-mini-area {
    min-height: 90px;
    padding: 10px 12px;
    outline: none;
    font-size: .875rem;
    color: var(--qc-txt);
    line-height: 1.65;
    font-family: inherit;
  }

  /* ── Options section ── */
  .qc-options-section { padding: 24px; }
  .qc-option-card {
    background: var(--qc-opt-bg);
    border: 1.5px solid var(--qc-opt-border);
    border-radius: 10px;
    margin-bottom: 14px;
    overflow: hidden;
    transition: box-shadow .2s;
  }
  .qc-option-card:focus-within {
    box-shadow: 0 0 0 3px rgba(5,150,105,.15);
  }
  .qc-option-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px 8px;
  }
  .qc-option-label {
    font-size: .82rem;
    font-weight: 700;
    color: #065f46;
    letter-spacing: .04em;
  }
  .qc-option-del {
    border: none;
    background: transparent;
    cursor: pointer;
    color: #9ca3af;
    display: flex;
    align-items: center;
    padding: 3px;
    border-radius: 5px;
    transition: all .14s;
  }
  .qc-option-del:hover { background: #fef2f2; color: var(--qc-danger); }
  .qc-option-editor {
    border: none;
    border-top: 1px solid var(--qc-opt-border);
    border-radius: 0;
  }
  .qc-option-editor .qc-mini-toolbar {
    background: rgba(255,255,255,.6);
    border-bottom-color: var(--qc-opt-border);
  }
  .qc-correct-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border-top: 1px solid var(--qc-opt-border);
    background: rgba(255,255,255,.5);
  }
  .qc-correct-radio {
    width: 16px; height: 16px;
    accent-color: var(--qc-green);
    cursor: pointer;
  }
  .qc-correct-lbl {
    font-size: .82rem;
    color: #374151;
    cursor: pointer;
  }

  /* ── Add Option button ── */
  .qc-add-option {
    width: 100%;
    padding: 13px;
    border: 2px dashed #a7f3d0;
    border-radius: 10px;
    background: transparent;
    color: var(--qc-green);
    font-size: .875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all .18s;
    font-family: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
  }
  .qc-add-option:hover {
    background: #f0fdf8;
    border-color: var(--qc-green);
  }

  /* ── Bottom save bar ── */
  .qc-savebar {
    position: sticky;
    bottom: 0;
    background: var(--qc-white);
    border-top: 1px solid var(--qc-border);
    padding: 14px 28px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    z-index: 20;
    box-shadow: 0 -2px 12px rgba(0,0,0,.06);
  }
  .qc-btn-cancel {
    padding: 10px 22px;
    border-radius: 8px;
    border: 1.5px solid var(--qc-border);
    background: transparent;
    color: var(--qc-txt2);
    font-size: .875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all .16s;
    font-family: inherit;
  }
  .qc-btn-cancel:hover { background: var(--qc-bg); color: var(--qc-txt); }
  .qc-btn-save {
    padding: 10px 28px;
    border-radius: 8px;
    border: none;
    background: var(--qc-green);
    color: #fff;
    font-size: .875rem;
    font-weight: 700;
    cursor: pointer;
    transition: background .16s;
    letter-spacing: .04em;
    font-family: inherit;
  }
  .qc-btn-save:hover { background: #047857; }
  .qc-btn-save:disabled { opacity: .55; cursor: not-allowed; }
  .qc-btn-update {
    padding: 10px 28px;
    border-radius: 8px;
    border: none;
    background: var(--qc-accent);
    color: #fff;
    font-size: .875rem;
    font-weight: 700;
    cursor: pointer;
    transition: background .16s;
    letter-spacing: .04em;
    font-family: inherit;
  }
  .qc-btn-update:hover { background: var(--qc-accent-dk); }
  .qc-btn-update:disabled { opacity: .55; cursor: not-allowed; }

  /* ── Success toast ── */
  .qc-toast {
    position: fixed;
    top: 24px;
    right: 24px;
    background: #f0fdf4;
    border: 1.5px solid #86efac;
    color: #166534;
    padding: 14px 16px 14px 20px;
    border-radius: 10px;
    font-size: .88rem;
    font-weight: 600;
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 4px 16px rgba(0,0,0,.1);
    animation: qc-toast-in .3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    white-space: nowrap;
  }
  @keyframes qc-toast-in { 
    from { opacity: 0; transform: translateX(100px); } 
    to { opacity: 1; transform: translateX(0); } 
  }
  .qc-toast-close {
    cursor: pointer;
    background: transparent;
    border: none;
    padding: 2px;
    color: #15803d;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background 0.15s, color 0.15s;
    margin-left: 10px;
  }
  .qc-toast-close:hover {
    background: #dcfce7;
    color: #166534;
  }

  /* ── Breadcrumb ── */
  .qc-breadcrumb {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: .8rem;
    color: #9ca3af;
    margin-bottom: 20px;
  }
  .qc-breadcrumb a {
    color: var(--qc-accent);
    text-decoration: none;
    font-weight: 500;
    cursor: pointer;
  }
  .qc-breadcrumb a:hover { text-decoration: underline; }
  .qc-breadcrumb span { font-weight: 600; color: #374151; }

  /* ── Type badge in header ── */
  .qc-type-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border-radius: 20px;
    background: #ede9fe;
    color: var(--qc-accent);
    font-size: .72rem;
    font-weight: 700;
  }

  /* ── Spinner ── */
  .qc-spin {
    width: 16px; height: 16px;
    border: 2px solid #e5e7eb;
    border-top-color: var(--qc-accent);
    border-radius: 50%;
    animation: qc-sp .7s linear infinite;
    display: inline-block;
  }
  @keyframes qc-sp { to { transform: rotate(360deg); } }

  /* ── Settings page wrapper ── */
  .qc-settings-page {
    width: 100%;
    margin: 0 auto;
  }
  .qc-settings-card {
    background: var(--qc-white);
    border-radius: 16px;
    border: 1px solid var(--qc-border);
    box-shadow: 0 2px 8px rgba(0,0,0,.06);
    padding: 28px;
    margin-bottom: 20px;
  }
  .qc-settings-title {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--qc-txt);
    margin: 0 0 4px;
  }
  .qc-settings-subtitle {
    font-size: .8rem;
    color: var(--qc-txt2);
    margin: 0 0 24px;
  }
  .qc-divider { height: 1px; background: var(--qc-border); margin: 20px 0; }

  /* ── Segment Toggle Buttons ── */
  .qc-toggle-btn-group {
    display: inline-flex;
    border-radius: 6px;
    border: 1px solid var(--qc-border);
    overflow: hidden;
  }
  .qc-toggle-btn {
    padding: 8px 18px;
    border: none;
    background: #fff;
    color: #4b5563;
    font-size: .85rem;
    font-weight: 600;
    cursor: pointer;
    border-right: 1px solid var(--qc-border);
    transition: all .15s;
    font-family: inherit;
  }
  .qc-toggle-btn:last-child { border-right: none; }
  .qc-toggle-btn.active {
    background: #311e64;
    color: #fff;
  }

  @media(max-width: 640px) {
    .qc-topbar { padding: 12px 16px; }
    .qc-body   { padding: 20px 14px 90px; }
    .qc-savebar { padding: 12px 16px; }
  }
`;

/* ─────────────────────────────────────────────
   MATH MODAL
───────────────────────────────────────────── */
function MathModal({ onClose, onInsert }: { onClose: () => void; onInsert: (tex: string, inline: boolean) => void }) {
  const [tex, setTex] = useState("");
  const [isInline, setIsInline] = useState(true);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", width: 420, borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", overflow: "hidden", fontFamily: "inherit" }} onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #e5e7eb" }}>
          <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#111827" }}>Math</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "#6b7280" }}>&times;</button>
        </div>
        <div style={{ padding: "16px" }}>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "8px", color: "#374151" }}>Write TeX here</label>
          <textarea 
            autoFocus
            value={tex}
            onChange={e => setTex(e.target.value)}
            style={{ width: "100%", height: 80, padding: "10px", outline: "none", border: "1.5px solid #e5e7eb", borderRadius: 6, fontSize: "0.9rem", resize: "none", marginBottom: "12px", fontFamily: "monospace" }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
            <label style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
              <input type="radio" checked={isInline} onChange={() => setIsInline(true)} style={{ accentColor: "var(--qc-accent)" }} /> Inline
            </label>
            <label style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
              <input type="radio" checked={!isInline} onChange={() => setIsInline(false)} style={{ accentColor: "var(--qc-accent)" }} /> Display mode
            </label>
            <a href="https://katex.org/docs/supported.html" target="_blank" rel="noreferrer" style={{ marginLeft: "auto", fontSize: "0.8rem", color: "var(--qc-accent)", textDecoration: "underline" }}>TeX documentation</a>
          </div>
          
          {tex && (
            <div style={{ background: "#f9fafb", border: "1px dashed #d1d5db", padding: "16px", borderRadius: 6, textAlign: "center", marginBottom: "16px", minHeight: "60px", display: "flex", alignItems: "center", justifyContent: "center", overflowX: "auto" }}>
              <img src={`https://latex.codecogs.com/svg.latex?${encodeURIComponent(tex)}`} alt="Equation preview" onError={(e) => { e.currentTarget.style.display='none';}} />
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button onClick={onClose} style={{ padding: "8px 16px", background: "transparent", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, color: "#374151" }}>Cancel</button>
            <button onClick={() => onInsert(tex, isInline)} disabled={!tex.trim()} style={{ padding: "8px 16px", background: "var(--qc-green)", border: "none", borderRadius: 6, cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, color: "#fff", opacity: !tex.trim() ? 0.5 : 1 }}>OK</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   IMAGE MODAL
───────────────────────────────────────────── */
function ImageModal({ onClose, onInsert }: { onClose: () => void; onInsert: (html: string) => void }) {
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");

  const handleInsert = () => {
    if (!url.trim()) return;
    let imgTag = `<img src="${url}"`;
    if (alt.trim()) imgTag += ` alt="${alt}"`;
    if (width.trim()) imgTag += ` width="${width}"`;
    if (height.trim()) imgTag += ` height="${height}"`;
    imgTag += ` />`;
    onInsert(imgTag);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", width: 420, borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", overflow: "hidden", fontFamily: "inherit" }} onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #e5e7eb" }}>
          <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#111827" }}>Image Properties</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "#6b7280" }}>&times;</button>
        </div>
        <div style={{ padding: "16px" }}>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px", color: "#374151" }}>URL <span style={{color:"var(--qc-danger)"}}>*</span></label>
            <input 
              autoFocus
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://..."
              style={{ width: "100%", padding: "8px 10px", outline: "none", border: "1.5px solid #e5e7eb", borderRadius: 6, fontSize: "0.9rem" }}
            />
          </div>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px", color: "#374151" }}>Alternative Text</label>
            <input 
              value={alt}
              onChange={e => setAlt(e.target.value)}
              placeholder="Short description of image"
              style={{ width: "100%", padding: "8px 10px", outline: "none", border: "1.5px solid #e5e7eb", borderRadius: 6, fontSize: "0.9rem" }}
            />
          </div>
          <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px", color: "#374151" }}>Width</label>
              <input 
                value={width}
                onChange={e => setWidth(e.target.value)}
                placeholder="e.g. 300, 100%"
                style={{ width: "100%", padding: "8px 10px", outline: "none", border: "1.5px solid #e5e7eb", borderRadius: 6, fontSize: "0.9rem" }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px", color: "#374151" }}>Height</label>
              <input 
                value={height}
                onChange={e => setHeight(e.target.value)}
                placeholder="e.g. 200, auto"
                style={{ width: "100%", padding: "8px 10px", outline: "none", border: "1.5px solid #e5e7eb", borderRadius: 6, fontSize: "0.9rem" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button onClick={onClose} style={{ padding: "8px 16px", background: "transparent", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, color: "#374151" }}>Cancel</button>
            <button onClick={handleInsert} disabled={!url.trim()} style={{ padding: "8px 16px", background: "var(--qc-green)", border: "none", borderRadius: 6, cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, color: "#fff", opacity: !url.trim() ? 0.5 : 1 }}>OK</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   RICH TEXT TOOLBAR
───────────────────────────────────────────── */
function execCmd(cmd: string, value?: string) {
  document.execCommand(cmd, false, value);
}

function RichToolbar({ editorRef }: { editorRef: React.RefObject<HTMLDivElement | null> }) {
  const [mathOpen, setMathOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [savedRange, setSavedRange] = useState<Range | null>(null);

  const focus = () => editorRef.current?.focus();
  const cmd = (c: string, v?: string) => { focus(); execCmd(c, v); };

  const saveSelection = () => {
    focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) setSavedRange(sel.getRangeAt(0));
  };

  const restoreSelection = () => {
    focus();
    if (savedRange) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedRange);
      }
    }
  };

  const openMath = (e: React.MouseEvent) => {
    e.preventDefault();
    saveSelection();
    setMathOpen(true);
  };

  const openImageModal = (e: React.MouseEvent) => {
    e.preventDefault();
    saveSelection();
    setImageOpen(true);
  };

  const insertMath = (tex: string, isInline: boolean) => {
    restoreSelection();
    const wrapper = isInline ? `\\(${tex}\\)` : `$$${tex}$$`;
    execCmd("insertText", wrapper);
    setMathOpen(false);
  };

  const insertImageHtml = (html: string) => {
    restoreSelection();
    execCmd("insertHTML", html);
    setImageOpen(false);
  };

  return (
    <div className="qc-editor-toolbar">
      <button className="qc-tb-btn" title="Bold"      onMouseDown={e=>{e.preventDefault();cmd("bold")}}><b>B</b></button>
      <button className="qc-tb-btn" title="Italic"    onMouseDown={e=>{e.preventDefault();cmd("italic")}}><i>I</i></button>
      <button className="qc-tb-btn" title="Strike"    onMouseDown={e=>{e.preventDefault();cmd("strikeThrough")}}><s>S</s></button>
      <button className="qc-tb-btn" title="Underline" onMouseDown={e=>{e.preventDefault();cmd("underline")}}><u>U</u></button>
      <div className="qc-tb-sep"/>
      <button className="qc-tb-btn" title="Subscript"   onMouseDown={e=>{e.preventDefault();cmd("subscript")}}>x<sub>₂</sub></button>
      <button className="qc-tb-btn" title="Superscript" onMouseDown={e=>{e.preventDefault();cmd("superscript")}}>x<sup>²</sup></button>
      <div className="qc-tb-sep"/>
      <button className="qc-tb-btn" title="Ordered list"   onMouseDown={e=>{e.preventDefault();cmd("insertOrderedList")}}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/></svg>
      </button>
      <button className="qc-tb-btn" title="Unordered list" onMouseDown={e=>{e.preventDefault();cmd("insertUnorderedList")}}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>
      </button>
      <div className="qc-tb-sep"/>
      <button className="qc-tb-btn" title="Insert image" onMouseDown={openImageModal}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      </button>
      <button className="qc-tb-btn" title="Math" onMouseDown={openMath}>Σ</button>
      <div className="qc-tb-sep"/>
      <button className="qc-tb-btn" title="Clear format" onMouseDown={e=>{e.preventDefault();cmd("removeFormat")}}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 4L8 16M4 20l4-4"/><line x1="4" y1="4" x2="20" y2="20"/></svg>
      </button>
      {mathOpen && <MathModal onClose={() => setMathOpen(false)} onInsert={insertMath} />}
      {imageOpen && <ImageModal onClose={() => setImageOpen(false)} onInsert={insertImageHtml} />}
    </div>
  );
}

function MiniToolbar({ editorRef }: { editorRef: React.RefObject<HTMLDivElement | null> }) {
  const [mathOpen, setMathOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [savedRange, setSavedRange] = useState<Range | null>(null);

  const focus = () => editorRef.current?.focus();
  const cmd = (c: string, v?: string) => { focus(); execCmd(c, v); };

  const saveSelection = () => {
    focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) setSavedRange(sel.getRangeAt(0));
  };

  const restoreSelection = () => {
    focus();
    if (savedRange) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedRange);
      }
    }
  };

  const openMath = (e: React.MouseEvent) => {
    e.preventDefault();
    saveSelection();
    setMathOpen(true);
  };

  const openImageModal = (e: React.MouseEvent) => {
    e.preventDefault();
    saveSelection();
    setImageOpen(true);
  };

  const insertMath = (tex: string, isInline: boolean) => {
    restoreSelection();
    const wrapper = isInline ? `\\(${tex}\\)` : `$$${tex}$$`;
    execCmd("insertText", wrapper);
    setMathOpen(false);
  };

  const insertImageHtml = (html: string) => {
    restoreSelection();
    execCmd("insertHTML", html);
    setImageOpen(false);
  };

  return (
    <div className="qc-mini-toolbar">
      <button className="qc-tb-btn" title="Image" onMouseDown={openImageModal}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      </button>
      <button className="qc-tb-btn" title="Math" onMouseDown={openMath}>Σ</button>
      <div className="qc-tb-sep"/>
      <button className="qc-tb-btn" title="Subscript"   onMouseDown={e=>{e.preventDefault();cmd("subscript")}}>x<sub>₂</sub></button>
      <button className="qc-tb-btn" title="Superscript" onMouseDown={e=>{e.preventDefault();cmd("superscript")}}>x<sup>²</sup></button>
      {mathOpen && <MathModal onClose={() => setMathOpen(false)} onInsert={insertMath} />}
      {imageOpen && <ImageModal onClose={() => setImageOpen(false)} onInsert={insertImageHtml} />}
    </div>
  );
}

/* ─────────────────────────────────────────────
   OPTION CARD
───────────────────────────────────────────── */
function OptionCard({
  opt, index, isLast, onCorrect, onDelete, onContentChange, isMMA, isTOF, isSA, isORD
}: {
  opt: Option;
  index: number;
  isLast: boolean;
  onCorrect: () => void;
  onDelete: () => void;
  onContentChange: (html: string) => void;
  isMMA?: boolean;
  isTOF?: boolean;
  isSA?: boolean;
  isORD?: boolean;
}) {
  const edRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!isSA && edRef.current && opt.content && !initialized.current) {
      edRef.current.innerHTML = opt.content;
      initialized.current = true;
    }
  }, [opt.content, isSA]);

  return (
    <div className="qc-option-card">
      <div className="qc-option-header" style={{ display: isSA ? "none" : "flex" }}>
        <span className="qc-option-label">{isSA ? `Acceptable Answer ${index + 1}` : isORD ? `Sequence Item ${index + 1}` : `Option ${index + 1}`}</span>
        {!isLast && !isTOF && (
          <button className="qc-option-del" onClick={onDelete} title="Remove option">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
            </svg>
          </button>
        )}
      </div>

      <div className="qc-option-editor qc-editor-wrap" style={{border:"none",borderTop: isSA ? "none" : "1px solid var(--qc-opt-border)",borderRadius:0}}>
        {isSA && (
          <div style={{padding: "10px 14px 4px"}}>
            <span className="qc-option-label" style={{display: "block", marginBottom: "6px"}}>Acceptable Answer {index + 1}</span>
          </div>
        )}
        {!isSA ? (
          <>
            <MiniToolbar editorRef={edRef} />
            <div
              ref={edRef}
              className="qc-mini-area"
              contentEditable
              suppressContentEditableWarning
              onInput={() => onContentChange(edRef.current?.innerHTML ?? "")}
              data-placeholder="Type option text here…"
              style={{position:"relative"}}
            />
          </>
        ) : (
          <div style={{padding: "0 14px 10px"}}>
            <input
              className="qc-input"
              value={opt.content}
              onChange={(e) => onContentChange(e.target.value)}
              placeholder="Type acceptable answer here…"
            />
          </div>
        )}
      </div>

      {!isORD && (
        <div className="qc-correct-row" style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
          <div style={{display: "flex", gap: "8px", alignItems: "center"}}>
            <input
              type={isMMA || isSA ? "checkbox" : "radio"}
              className="qc-correct-radio"
              id={`correct-${opt.id}`}
              name={isMMA || isSA ? `correct-answer-${opt.id}` : "correct-answer"}
              checked={opt.isCorrect}
              onChange={onCorrect}
            />
            <label className="qc-correct-lbl" htmlFor={`correct-${opt.id}`}>{isSA ? "Exact Answer" : isMMA ? "Correct Answer(s)" : "Correct Answer"}</label>
          </div>
          {isSA && !isLast && (
             <button 
               className="qc-btn-cancel" 
               style={{background: "#ef4444", color: "#fff", borderColor: "#ef4444", padding: "5px 12px", fontSize: "0.75rem", borderRadius: "6px"}} 
               onClick={onDelete}
               title="Remove answer"
             >
               Remove
             </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   MTF PAIR COMPONENT
───────────────────────────────────────────── */
function MTFPair({
  opt, index, canDelete, onDelete, onLeftChange, onRightChange
}: {
  opt: Option; index: number; canDelete: boolean; onDelete: () => void;
  onLeftChange: (v: string) => void; onRightChange: (v: string) => void;
}) {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const initLeft = useRef(false);
  const initRight = useRef(false);

  useEffect(() => {
    if (leftRef.current && opt.leftContent && !initLeft.current) { leftRef.current.innerHTML = opt.leftContent; initLeft.current = true; }
    if (rightRef.current && opt.rightContent && !initRight.current) { rightRef.current.innerHTML = opt.rightContent; initRight.current = true; }
  }, [opt.leftContent, opt.rightContent]);

  return (
    <div style={{marginBottom: "20px"}}>
      <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px"}}>
        <span style={{fontSize: "0.9rem", fontWeight: 700, color: "#111827"}}>Pair {index + 1}</span>
        {canDelete && (
          <button className="qc-option-del" onClick={onDelete} title="Remove pair">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          </button>
        )}
      </div>
      <div style={{display: "flex", border: "1.5px solid var(--qc-opt-border)", borderRadius: "8px", overflow: "hidden", background: "#fff"}}>
        <div style={{flex: 1, borderRight: "1px solid var(--qc-opt-border)"}}>
          <MiniToolbar editorRef={leftRef} />
          <div ref={leftRef} className="qc-mini-area" contentEditable suppressContentEditableWarning onInput={() => onLeftChange(leftRef.current?.innerHTML ?? "")} style={{minHeight: "100px", padding: "10px"}}/>
        </div>
        <div style={{flex: 1}}>
          <MiniToolbar editorRef={rightRef} />
          <div ref={rightRef} className="qc-mini-area" contentEditable suppressContentEditableWarning onInput={() => onRightChange(rightRef.current?.innerHTML ?? "")} style={{minHeight: "100px", padding: "10px"}}/>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   TAGS INPUT
───────────────────────────────────────────── */
function TagsInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const add = () => {
    const v = input.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setInput("");
  };

  return (
    <div className="qc-tags-wrap" onClick={() => inputRef.current?.focus()}>
      {tags.map(t => (
        <span key={t} className="qc-tag-chip">
          {t}
          <button className="qc-tag-remove" onClick={() => onChange(tags.filter(x => x !== t))}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        className="qc-tag-input"
        placeholder={tags.length === 0 ? "Add tags… (press Enter)" : ""}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }
          if (e.key === "Backspace" && !input && tags.length > 0) onChange(tags.slice(0, -1));
        }}
        onBlur={add}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN FORM
───────────────────────────────────────────── */
function CreateQuestionForm() {
  const router       = useRouter();
  const params       = useParams();
  const searchParams = useSearchParams();

  const typeCode = (params?.typeCode as string ?? "MSA").toUpperCase();
  const typeName = searchParams?.get("name") ?? typeCode;
  const isMMA = typeCode === "MMA" || typeCode === "MCM";
  const isTOF = typeCode === "TF" || typeCode === "TOF" || typeCode === "TRUE_FALSE" || typeName.toLowerCase().includes("true") || typeCode === "T/F";
  const isSA = typeCode === "SA" || typeCode === "SHORT_ANSWER" || typeName.toLowerCase().includes("short");
  const isMTF = typeCode === "MTF" || typeName.toLowerCase().includes("match");
  const isORD = typeCode === "ORD" || typeName.toLowerCase().includes("ord") || typeName.toLowerCase().includes("seq");
  const isFIB = typeCode === "FIB" || typeName.toLowerCase().includes("fill");
  const isEditMode = !!searchParams?.get("edit");
  const editId = searchParams?.get("edit");

  // Tab state — only unlock settings after details saved
  const [activeTab,    setActiveTab]    = useState<Tab>("details");
  const [detailsSaved, setDetailsSaved] = useState(false);
  const [savedId,      setSavedId]      = useState<number | null>(null);

  // Toast
  const [toast, setToast] = useState("");
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  /* ── Details: Categories ── */
  const [categories,    setCategories]    = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
  const [loadingCats,   setLoadingCats]   = useState(true);
  const [loadingSubs,   setLoadingSubs]   = useState(false);
  const [categoryId,    setCategoryId]    = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");

  /* ── Details: Question & Options ── */
  const questionRef = useRef<HTMLDivElement>(null);
  const mkOpt = (content = ""): Option => ({ id: Math.random().toString(36).slice(2), content, leftContent: "", rightContent: "", isCorrect: false });
  const [options, setOptions] = useState<Option[]>([]);

  useEffect(() => {
    if (!editId) {
      if (isTOF) {
        setOptions([mkOpt("True"), mkOpt("False")]);
      } else {
        setOptions([mkOpt(), mkOpt()]);
      }
    }
  }, [isTOF, editId]);

  const [saving,  setSaving]  = useState(false);

  /* ── Settings fields ── */
  const [tags,        setTags]        = useState<string[]>([]);
  const [topic,       setTopic]       = useState("");
  const [difficulty,  setDifficulty]  = useState("medium");
  const [marks,       setMarks]       = useState("1");
  const [timeToSolve, setTimeToSolve] = useState("60");
  const [isActive,    setIsActive]    = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  /* ── Topics & Difficulty from API ── */
  const [topicsList,         setTopicsList]         = useState<TopicItem[]>([]);
  const [difficultyLevels,   setDifficultyLevels]   = useState<DifficultyItem[]>([]);
  const [addingTopic,        setAddingTopic]        = useState(false);
  const [newTopicName,       setNewTopicName]       = useState("");

  /* ── Solution fields ── */
  const solutionRef = useRef<HTMLDivElement>(null);
  const hintRef     = useRef<HTMLDivElement>(null);
  const [enableVideo, setEnableVideo] = useState(false);
  const [videoType, setVideoType]     = useState("mp4");
  const [videoLink, setVideoLink]     = useState("");
  const [savingSolution, setSavingSolution] = useState(false);

  /* ── Attachment fields ── */
  const [enableAttachment, setEnableAttachment] = useState(false);
  const [attachmentType, setAttachmentType] = useState("comprehension");
  const [attComprehensionId, setAttComprehensionId] = useState("");
  const [attAudioType, setAttAudioType] = useState("mp3");
  const [attAudioLink, setAttAudioLink] = useState("");
  const [attVideoType, setAttVideoType] = useState("mp4");
  const [attVideoLink, setAttVideoLink] = useState("");
  const [savingAttachment, setSavingAttachment] = useState(false);

  const [comprehensionsList, setComprehensionsList] = useState<{id: number, title: string, code: string}[]>([]);

  useEffect(() => {
    if (editId && !detailsSaved) {
      apiFetch(`${API_BASE_URL}/questions/${editId}`)
        .then(r => r.json())
        .then(q => {
          setSavedId(q.id);
          setDetailsSaved(true);
          
          setCategoryId(q.category_id ? String(q.category_id) : "");
          // Subcategory loads dynamically
          setTimeout(() => setSubcategoryId(q.subcategory_id ? String(q.subcategory_id) : ""), 500);

          if (questionRef.current) questionRef.current.innerHTML = q.question_html || "";
          setIsActive(q.is_active);

          if (q.options && q.options.length > 0) {
            setOptions(q.options.map((o: any) => {
              let parsedLeft = "";
              let parsedRight = "";
              if (isMTF) {
                try {
                  const p = JSON.parse(o.content_html);
                  parsedLeft = p.left || "";
                  parsedRight = p.right || "";
                } catch(e) {
                  parsedLeft = o.content_html;
                }
              }
              return {
                id: Math.random().toString(36).slice(2),
                content: o.content_html || "",
                leftContent: parsedLeft,
                rightContent: parsedRight,
                isCorrect: o.is_correct
              };
            }));
          }

          // Settings
          setTags(q.tags ? q.tags.split(',') : []);
          setTopic(q.topic || "");
          setDifficulty(q.difficulty_level || "medium");
          setMarks(q.default_marks != null ? String(q.default_marks) : "1");
          setTimeToSolve(q.default_time_to_solve != null ? String(q.default_time_to_solve) : "60");

          // Solution
          if (solutionRef.current) solutionRef.current.innerHTML = q.solution_html || "";
          if (hintRef.current) hintRef.current.innerHTML = q.hint_html || "";
          setEnableVideo(!!q.enable_solution_video);
          setVideoType(q.video_type || "mp4");
          setVideoLink(q.video_link || "");

          // Attachment
          setEnableAttachment(!!q.enable_attachment);
          setAttachmentType(q.attachment_type || "comprehension");
          setAttComprehensionId(q.attachment_comprehension_id ? String(q.attachment_comprehension_id) : "");
          setAttAudioType(q.attachment_audio_type || "mp3");
          setAttAudioLink(q.attachment_audio_link || "");
          setAttVideoType(q.attachment_video_type || "mp4");
          setAttVideoLink(q.attachment_video_link || "");
        })
        .catch(e => console.error("Error loading question:", e));
    }
  }, [editId, detailsSaved]);

  /* load categories, topics & difficulty levels */
  useEffect(() => {
    setLoadingCats(true);
    apiFetch(`${API_BASE_URL}/categories`)
      .then(r => r.json())
      .then((data: Category[]) => setCategories(data.filter(c => c.is_active)))
      .catch(() => {})
      .finally(() => setLoadingCats(false));

    apiFetch(`${API_BASE_URL}/comprehensions?is_active=true`)
      .then(r => r.json())
      .then(data => setComprehensionsList(data))
      .catch(() => {});

    apiFetch(`${API_BASE_URL}/topics?is_active=true`)
      .then(r => r.json())
      .then((data: TopicItem[]) => setTopicsList(data))
      .catch(() => {});

    apiFetch(`${API_BASE_URL}/difficulty-levels?is_active=true`)
      .then(r => r.json())
      .then((data: DifficultyItem[]) => setDifficultyLevels(data))
      .catch(() => {});
  }, []);

  // When loading an existing question, the topic may come in as a string name. Convert to ID for the dropdown.
  useEffect(() => {
    if (topic && isNaN(Number(topic)) && topicsList.length > 0) {
      const match = topicsList.find(t => t.name.toLowerCase() === topic.toLowerCase());
      if (match) {
        setTopic(String(match.id));
      }
    }
  }, [topic, topicsList]);

  /* ── Add new topic inline ── */
  const handleAddTopic = async () => {
    if (!newTopicName.trim()) return;
    try {
      const res = await apiFetch(`${API_BASE_URL}/topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTopicName.trim(), is_active: true }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Failed"); }
      const created: TopicItem = await res.json();
      setTopicsList(prev => [...prev, created]);
      setTopic(String(created.id));
      setNewTopicName("");
      setAddingTopic(false);
    } catch (e: any) { alert(e.message); }
  };

  /* load subcategories when category changes */
  useEffect(() => {
    if (!categoryId) { setSubcategories([]); setSubcategoryId(""); return; }
    setLoadingSubs(true);
    setSubcategoryId("");
    apiFetch(`${API_BASE_URL}/categories/${categoryId}/subcategories`)
      .then(r => r.json())
      .then((data: SubCategory[]) => setSubcategories(data.filter(s => s.is_active)))
      .catch(() => {})
      .finally(() => setLoadingSubs(false));
  }, [categoryId]);

  /* ── Option helpers ── */
  const setCorrect = useCallback((id: string) => {
    if (isMMA || isSA) {
      setOptions(prev => prev.map(o => o.id === id ? { ...o, isCorrect: !o.isCorrect } : o));
    } else {
      setOptions(prev => prev.map(o => ({ ...o, isCorrect: o.id === id })));
    }
  }, [isMMA, isSA]);

  const deleteOption = useCallback((id: string) => {
    setOptions(prev => {
      const next = prev.filter(o => o.id !== id);
      if (!isMMA && !isSA && !next.some(o => o.isCorrect) && next.length > 0) next[0].isCorrect = true;
      return next;
    });
  }, [isMMA, isSA]);

  const addOption = () => setOptions(prev => [...prev, mkOpt()]);

  const updateContent = useCallback((id: string, html: string) => {
    setOptions(prev => prev.map(o => o.id === id ? { ...o, content: html } : o));
  }, []);

  /* ── Save Details (Step 1) ── */
  const handleSaveDetails = async () => {
    const questionHtml = questionRef.current?.innerHTML ?? "";
    if (!questionHtml.trim() || questionHtml === "<br>") {
      alert("Please enter the question text.");
      return;
    }
    if (!isFIB && !isMTF && !isORD && !options.some(o => o.isCorrect)) {
      alert("Please mark at least one option as the correct answer.");
      return;
    }
    if (!categoryId) {
      alert("Please select a Category.");
      return;
    }

    setSaving(true);
    try {
      const qtRes = await apiFetch(`${API_BASE_URL}/question-types?is_active=true`);
      const qtList = await qtRes.json();
      const qt = qtList.find((q: { code: string; id: number }) => q.code === typeCode);
      if (!qt) throw new Error("Question type not found");

      const payload = {
        question_type_id:   qt.id,
        question_type_code: typeCode,
        category_id:        categoryId ? Number(categoryId) : null,
        subcategory_id:     subcategoryId ? Number(subcategoryId) : null,
        tags:               tags.length > 0 ? tags.join(",") : null,
        question_html:      questionHtml,
        is_active:          isActive,
        options: options.map((o, i) => ({
          content_html: isMTF ? JSON.stringify({ left: o.leftContent, right: o.rightContent }) : o.content,
          is_correct:   isMTF || isORD ? true : o.isCorrect,
          order_index:  i,
        })),
      };

      const url = savedId ? `${API_BASE_URL}/questions/${savedId}` : `${API_BASE_URL}/questions`;
      const method = savedId ? "PUT" : "POST";

      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to save");
      }

      const created = await res.json();
      setSavedId(created.id);
      setDetailsSaved(true);
      showToast("Details saved successfully!");
      // Auto-advance to Settings
      setActiveTab("settings");
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to save question");
    } finally {
      setSaving(false);
    }
  };

  /* ── Save Settings (Step 2) ── */
  const handleSaveSettings = async () => {
    if (!savedId) return;
    setSavingSettings(true);
    try {
      const payload = {
        category_id:    categoryId ? Number(categoryId) : null,
        subcategory_id: subcategoryId ? Number(subcategoryId) : null,
        tags:           tags.length > 0 ? tags.join(",") : null,
        topic: topic ? (topicsList.find(t => String(t.id) === topic)?.name || topic) : null,
        difficulty_level: difficulty,
        default_marks:    parseFloat(marks) || 1,
        default_time_to_solve: parseInt(timeToSolve) || 60,
        is_active: isActive,
      };

      const res = await apiFetch(`${API_BASE_URL}/questions/${savedId}/settings`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to update settings");
      }

      showToast("Settings updated successfully!");
      // After settings saved, auto-advance to Solution
      setActiveTab("solution");
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  /* ── Save Solution (Step 3) ── */
  const handleSaveSolution = async () => {
    if (!savedId) return;
    setSavingSolution(true);
    try {
      const payload = {
        solution_html: solutionRef.current?.innerHTML || null,
        enable_solution_video: enableVideo,
        video_type: videoType,
        video_link: videoLink,
        hint_html: hintRef.current?.innerHTML || null,
      };

      const res = await apiFetch(`${API_BASE_URL}/questions/${savedId}/solution`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to update solution");
      }

      showToast("Solution updated successfully!");
      // After solution, auto-advance to Attachment
      setActiveTab("attachment");
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to save solution");
    } finally {
      setSavingSolution(false);
    }
  };

  /* ── Save Attachment (Step 4) ── */
  const handleSaveAttachment = async () => {
    if (!savedId) return;
    setSavingAttachment(true);
    try {
      const payload = {
        enable_attachment: enableAttachment,
        attachment_type: attachmentType,
        attachment_comprehension_id: attComprehensionId ? Number(attComprehensionId) : null,
        attachment_audio_type: attAudioType,
        attachment_audio_link: attAudioLink,
        attachment_video_type: attVideoType,
        attachment_video_link: attVideoLink,
      };

      const res = await apiFetch(`${API_BASE_URL}/questions/${savedId}/attachment`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to update attachment");
      }

      showToast("Attachment updated successfully!");
      // Finished wizard completely, redirect to list
      setTimeout(() => router.push("/admin/masters/curriculum/questions/list"), 1000);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to save attachment");
    } finally {
      setSavingAttachment(false);
    }
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: "details",    label: "Details"    },
    { key: "settings",   label: "Settings"   },
    { key: "solution",   label: "Solution"   },
    { key: "attachment", label: "Attachment" },
  ];

  const isTabUnlocked = (key: Tab) => {
    if (key === "details") return true;
    if (key === "settings" || key === "solution" || key === "attachment") return detailsSaved;
    return false;
  };

  const topbarTitle = activeTab === "settings" ? "Question Settings" : activeTab === "solution" ? "Question Solution" : activeTab === "attachment" ? "Question Attachment" : "Question Details";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* Toast */}
      {toast && (
        <div className="qc-toast">
          <div style={{display: "flex", alignItems: "center", gap: "8px"}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>{toast}</span>
          </div>
          <button className="qc-toast-close" onClick={() => setToast("")} title="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      <div className="qc-root">

        {/* ── TOP BAR ── */}
        <div className="qc-topbar">
          <div className="qc-topbar-left">
            <h2>{topbarTitle}</h2>
            <p>
              <span className="qc-type-badge">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                </svg>
                {typeCode}
              </span>
              &nbsp;&nbsp;{typeName}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div className="qc-tabs">
              {TABS.map((t, i) => {
                const unlocked = isTabUnlocked(t.key);
                return (
                  <button
                    key={t.key}
                    className={`qc-tab${activeTab === t.key ? " active" : ""}${unlocked ? " unlocked" : " disabled"}`}
                    onClick={() => { if (unlocked) setActiveTab(t.key); }}
                  >
                    <span className="qc-tab-num">{i + 1}</span>
                    {t.label}
                  </button>
                );
              })}
            </div>
            
            <button 
              title="Close and return to list"
              onClick={() => router.push("/admin/masters/curriculum/questions/list")}
              style={{
                width: 36, height: 36, borderRadius: '50%', background: '#f1f5f9', 
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#64748b', cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="qc-body">

          {/* Breadcrumb */}
          <div className="qc-breadcrumb">
            <a onClick={() => router.push("/admin/masters/curriculum/questions")}>Question Bank</a>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            <a onClick={() => router.push("/admin/masters/curriculum/questions/list")}>Questions</a>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            <span>New Question</span>
          </div>

          {/* ═══════════════ DETAILS TAB ═══════════════ */}
          <div style={{ display: activeTab === "details" ? "block" : "none" }}>
            <>
              {/* Category + Sub-Category */}
              <div className="qc-card">
                <div className="qc-card-body">
                  {/* Category */}
                  <div className="qc-fw">
                    <label className="qc-label">Category<span className="qc-req">*</span></label>
                    {loadingCats ? (
                      <div style={{display:"flex",alignItems:"center",gap:8,padding:"11px 0",color:"#9ca3af",fontSize:".85rem"}}>
                        <span className="qc-spin"/> Loading categories…
                      </div>
                    ) : (
                      <select
                        className="qc-select"
                        value={categoryId}
                        onChange={e => setCategoryId(e.target.value)}
                      >
                        <option value="">— Select Category —</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Sub-Category */}
                  <div className="qc-fw" style={{marginBottom:0}}>
                    <label className="qc-label">Sub-Category</label>
                    {loadingSubs ? (
                      <div style={{display:"flex",alignItems:"center",gap:8,padding:"11px 0",color:"#9ca3af",fontSize:".85rem"}}>
                        <span className="qc-spin"/> Loading sub-categories…
                      </div>
                    ) : (
                      <select
                        className="qc-select"
                        value={subcategoryId}
                        onChange={e => setSubcategoryId(e.target.value)}
                        disabled={!categoryId || subcategories.length === 0}
                      >
                        <option value="">
                          {!categoryId
                            ? "— Select a Category first —"
                            : subcategories.length === 0
                              ? "No sub-categories available"
                              : "— Select Sub-Category —"}
                        </option>
                        {subcategories.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {/* Question rich text */}
              <div className="qc-card">
                <div className="qc-card-body">
                  <label className="qc-label" style={{marginBottom:10}}>Question<span className="qc-req">*</span></label>
                  <div className="qc-editor-wrap">
                    <RichToolbar editorRef={questionRef} />
                    <div
                      ref={questionRef}
                      className="qc-editor-area"
                      contentEditable
                      suppressContentEditableWarning
                      data-placeholder="Type your question here…"
                    />
                  </div>
                </div>
              </div>

              {/* Options */}
              {isFIB ? (
                 <div style={{background: "#f0fdf4", margin: "24px 0 0", padding: "16px 20px", borderRadius: "8px", border: "1px solid #d1fae5"}}>
                   <div style={{background: "#fff", border: "1px solid #fecaca", color: "#dc2626", padding: "12px 16px", borderRadius: "8px", fontSize: "0.85rem", display: "flex", gap: "10px", alignItems: "flex-start"}}>
                     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginTop: "2px", flexShrink: 0}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                     <span style={{lineHeight: 1.5}}><span style={{fontWeight: 600}}>Note</span> &middot; Wrap the word or words you wish to make a blank with ##(DOUBLE HASH). E.g. ##BLANK_ITEM##. The system will automatically convert them to empty blanks, and users will be provided with text boxes to enter their responses.</span>
                   </div>
                 </div>
              ) : (
                <div className={isMTF || isORD ? "" : "qc-card"} style={isMTF || isORD ? {background: "#f0fdf4", margin: "0", padding: "20px", borderRadius: "14px", border: "1px solid #d1fae5"} : {}}>
                  {(isMTF || isORD) && (
                    <div style={{background: "#fff", border: "1px solid #fecaca", color: "#dc2626", padding: "10px 14px", borderRadius: "8px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px"}}>
                       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                       Note: Enter {isMTF ? "pairs" : "items"} in correct order. {isMTF ? "Pairs" : "Items"} will automatically shuffle while showing to users.
                    </div>
                  )}
                  <div className={isMTF || isORD ? "" : "qc-options-section"}>
                    {options.map((opt, i) => (
                      isMTF ? (
                        <MTFPair
                          key={opt.id}
                          opt={opt}
                          index={i}
                          canDelete={options.length > 2}
                          onDelete={() => deleteOption(opt.id)}
                          onLeftChange={(v) => setOptions(prev => prev.map(o => o.id === opt.id ? {...o, leftContent: v} : o))}
                          onRightChange={(v) => setOptions(prev => prev.map(o => o.id === opt.id ? {...o, rightContent: v} : o))}
                        />
                      ) : (
                        <OptionCard
                          key={opt.id}
                          opt={opt}
                          index={i}
                          isLast={options.length <= 2}
                          onCorrect={() => setCorrect(opt.id)}
                          onDelete={() => deleteOption(opt.id)}
                          onContentChange={(html) => updateContent(opt.id, html)}
                          isMMA={isMMA}
                          isTOF={isTOF}
                          isSA={isSA}
                          isORD={isORD}
                        />
                      )
                    ))}
                    {!isTOF && (
                      <button className="qc-add-option" onClick={addOption}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        {isMTF ? "Add Pair" : isORD ? "Add Sequence Item" : "Add Option"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          </div>

          {/* ═══════════════ SETTINGS TAB ═══════════════ */}
          <div className="qc-settings-page" style={{ display: activeTab === "settings" ? "block" : "none" }}>
            <div className="qc-settings-card">
                <p className="qc-settings-title">Question Settings</p>
                <p className="qc-settings-subtitle">Configure metadata, difficulty and scoring for this question.</p>

                {/* Category (read-only display) */}
                <div className="qc-fw">
                  <label className="qc-label">Category</label>
                  <select
                    className="qc-select"
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                  >
                    <option value="">— Select Category —</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Sub-Category */}
                <div className="qc-fw">
                  <label className="qc-label">Sub-Category</label>
                  <select
                    className="qc-select"
                    value={subcategoryId}
                    onChange={e => setSubcategoryId(e.target.value)}
                    disabled={!categoryId || subcategories.length === 0}
                  >
                    <option value="">
                      {!categoryId ? "— Select a Category first —" : subcategories.length === 0 ? "No sub-categories" : "— Select Sub-Category —"}
                    </option>
                    {subcategories.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Tags */}
                <div className="qc-fw">
                  <label className="qc-label">Tags</label>
                  <TagsInput tags={tags} onChange={setTags} />
                </div>

                {/* Topic */}
                <div className="qc-fw">
                  <label className="qc-label">Topic</label>
                  {addingTopic ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        className="qc-input"
                        style={{ flex: 1 }}
                        placeholder="New topic name…"
                        value={newTopicName}
                        onChange={e => setNewTopicName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddTopic(); } if (e.key === "Escape") setAddingTopic(false); }}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddTopic}
                        style={{ padding: "0 16px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}
                      >Save</button>
                      <button
                        type="button"
                        onClick={() => setAddingTopic(false)}
                        style={{ padding: "0 12px", background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                      >Cancel</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 8 }}>
                      <select
                        className="qc-select"
                        style={{ flex: 1 }}
                        value={topic}
                        onChange={e => setTopic(e.target.value)}
                      >
                        <option value="">— Select Topic —</option>
                        {topicsList.map(t => (
                          <option key={t.id} value={String(t.id)}>{t.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setAddingTopic(true)}
                        title="Add new topic"
                        style={{ padding: "0 14px", background: "#f0f9ff", color: "#0284c7", border: "1px solid #bae6fd", borderRadius: 8, fontWeight: 700, fontSize: 18, cursor: "pointer", lineHeight: 1 }}
                      >+</button>
                    </div>
                  )}
                </div>

                <div className="qc-divider"/>

                {/* Difficulty Level */}
                <div className="qc-fw">
                  <label className="qc-label">Difficulty Level</label>
                  <select className="qc-select" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                    {difficultyLevels.length > 0 ? (
                      difficultyLevels.map(d => (
                        <option key={d.id} value={d.code}>
                          {d.label}
                        </option>
                      ))
                    ) : (
                      /* Fallback to defaults if API has none */
                      <>
                        <option value="very_easy">Very Easy</option>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                        <option value="very_hard">Very Hard</option>
                      </>
                    )}
                  </select>
                  {difficultyLevels.length > 0 && (
                    <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {difficultyLevels.map(d => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setDifficulty(d.code)}
                          style={{
                            padding: "3px 12px", borderRadius: 20, border: `1.5px solid ${d.color}66`,
                            background: difficulty === d.code ? d.color : d.color + "22",
                            color: difficulty === d.code ? "#fff" : d.color,
                            fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s"
                          }}
                        >{d.label}</button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Default Marks */}
                <div className="qc-fw">
                  <label className="qc-label">Default Marks / Grade Points</label>
                  <input
                    className="qc-input"
                    type="number"
                    min="0"
                    step="0.5"
                    value={marks}
                    onChange={e => setMarks(e.target.value)}
                  />
                </div>

                {/* Default Time */}
                <div className="qc-fw">
                  <label className="qc-label">Default Time to Solve (Seconds)</label>
                  <input
                    className="qc-input"
                    type="number"
                    min="0"
                    step="10"
                    value={timeToSolve}
                    onChange={e => setTimeToSolve(e.target.value)}
                  />
                </div>

                {/* Active toggle */}
                <div className="qc-toggle-row">
                  <div className="qc-toggle-info">
                    <strong>Active</strong>
                    <span>Active (Shown Everywhere). In-active (Hidden Everywhere).</span>
                  </div>
                  <label className="qc-switch">
                    <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                    <span className="qc-slider"/>
                  </label>
                </div>
              </div>
            </div>

          {/* ═══════════════ SOLUTION TAB ═══════════════ */}
          <div className="qc-settings-page" style={{ display: activeTab === "solution" ? "block" : "none" }}>
            <div className="qc-card">
                <div className="qc-card-body">
                  {/* Solution Text */}
                  <div className="qc-fw">
                    <label className="qc-label" style={{marginBottom:10}}>Solution</label>
                    <div className="qc-editor-wrap">
                      <RichToolbar editorRef={solutionRef} />
                      <div
                        ref={solutionRef}
                        className="qc-editor-area"
                        contentEditable
                        suppressContentEditableWarning
                        data-placeholder="Type solution explanation here…"
                      />
                    </div>
                  </div>

                  {/* Enable Solution Video */}
                  <div className="qc-fw">
                    <label className="qc-label">Enable Solution Video</label>
                    <div className="qc-toggle-btn-group">
                      <button className={`qc-toggle-btn ${enableVideo ? "active" : ""}`} onClick={() => setEnableVideo(true)}>Yes</button>
                      <button className={`qc-toggle-btn ${!enableVideo ? "active" : ""}`} onClick={() => setEnableVideo(false)}>No</button>
                    </div>
                  </div>

                  {enableVideo && (
                    <>
                      <div className="qc-fw">
                        <label className="qc-label">Video Type (Supported YouTube, Vimeo & .mp4 files)</label>
                        <div className="qc-toggle-btn-group">
                          <button className={`qc-toggle-btn ${videoType === "mp4" ? "active" : ""}`} onClick={() => setVideoType("mp4")}>MP4 Video</button>
                          <button className={`qc-toggle-btn ${videoType === "youtube" ? "active" : ""}`} onClick={() => setVideoType("youtube")}>YouTube Video</button>
                          <button className={`qc-toggle-btn ${videoType === "vimeo" ? "active" : ""}`} onClick={() => setVideoType("vimeo")}>Vimeo Video</button>
                        </div>
                      </div>
                      
                      <div className="qc-fw">
                        <label className="qc-label">Video Link</label>
                        <div style={{display:"flex", alignItems:"center"}}>
                          <input
                            className="qc-input"
                            style={{borderTopRightRadius:0, borderBottomRightRadius:0, borderRight:"none"}}
                            placeholder="Video Link"
                            value={videoLink}
                            onChange={e => setVideoLink(e.target.value)}
                          />
                          <button className="qc-btn-update" style={{borderTopLeftRadius:0, borderBottomLeftRadius:0, padding:"11px 18px", background:"#311e64"}}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{marginRight:6, verticalAlign:"middle"}}>
                              <polygon points="5 3 19 12 5 21 5 3"/>
                            </svg>
                            Preview
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Hint Text */}
                  <div className="qc-fw" style={{marginBottom:0}}>
                    <label className="qc-label" style={{marginBottom:10}}>Hint</label>
                    <div className="qc-editor-wrap">
                      <RichToolbar editorRef={hintRef} />
                      <div
                        ref={hintRef}
                        className="qc-editor-area"
                        contentEditable
                        suppressContentEditableWarning
                        data-placeholder="Type a hint here…"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

          {/* ═══════════════ ATTACHMENT TAB ═══════════════ */}
          <div className="qc-settings-page" style={{ display: activeTab === "attachment" ? "block" : "none" }}>
            <div className="qc-card">
                <div className="qc-card-body">
                  {/* Enable Attachment */}
                  <div className="qc-fw">
                    <label className="qc-label">Enable Question Attachment</label>
                    <div className="qc-toggle-btn-group">
                      <button className={`qc-toggle-btn ${enableAttachment ? "active" : ""}`} onClick={() => setEnableAttachment(true)}>Yes</button>
                      <button className={`qc-toggle-btn ${!enableAttachment ? "active" : ""}`} onClick={() => setEnableAttachment(false)}>No</button>
                    </div>
                  </div>

                  {enableAttachment && (
                    <>
                      {/* Attachment Type Radio Buttons */}
                      <div className="qc-fw">
                        <label className="qc-label">Attachment Type</label>
                        <div style={{display:"flex", gap:"18px", alignItems:"center", marginTop:"8px"}}>
                          <label style={{display:"flex", alignItems:"center", gap:"6px", fontSize:".85rem", cursor:"pointer"}}>
                            <input type="radio" name="attType" value="comprehension" checked={attachmentType === "comprehension"} onChange={e => setAttachmentType(e.target.value)} style={{accentColor: "#311e64", width: "16px", height: "16px"}} />
                            Comprehension Passage
                          </label>
                          <label style={{display:"flex", alignItems:"center", gap:"6px", fontSize:".85rem", cursor:"pointer"}}>
                            <input type="radio" name="attType" value="audio" checked={attachmentType === "audio"} onChange={e => setAttachmentType(e.target.value)} style={{accentColor: "#311e64", width: "16px", height: "16px"}} />
                            Audio
                          </label>
                          <label style={{display:"flex", alignItems:"center", gap:"6px", fontSize:".85rem", cursor:"pointer"}}>
                            <input type="radio" name="attType" value="video" checked={attachmentType === "video"} onChange={e => setAttachmentType(e.target.value)} style={{accentColor: "#311e64", width: "16px", height: "16px"}} />
                            Video
                          </label>
                        </div>
                      </div>

                      {/* Comprehension Options */}
                      {attachmentType === "comprehension" && (
                        <div className="qc-fw">
                          <label className="qc-label">Comprehension Passage</label>
                          <select className="qc-select" value={attComprehensionId} onChange={e => setAttComprehensionId(e.target.value)}>
                            <option value="">Select Comprehension</option>
                            {comprehensionsList.map(c => (
                              <option key={c.id} value={String(c.id)}>{c.code} - {c.title}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Audio Options */}
                      {attachmentType === "audio" && (
                        <>
                          <div className="qc-fw">
                            <label className="qc-label">Audio Type (Supported .mp3 & .ogg files)</label>
                            <div className="qc-toggle-btn-group">
                              <button className={`qc-toggle-btn ${attAudioType === "mp3" ? "active" : ""}`} onClick={() => setAttAudioType("mp3")}>MP3 Format</button>
                              <button className={`qc-toggle-btn ${attAudioType === "ogg" ? "active" : ""}`} onClick={() => setAttAudioType("ogg")}>OGG Format</button>
                            </div>
                          </div>
                          <div className="qc-fw">
                            <label className="qc-label">Audio Link</label>
                            <input
                              className="qc-input"
                              placeholder="Audio Link"
                              value={attAudioLink}
                              onChange={e => setAttAudioLink(e.target.value)}
                            />
                            <div style={{marginTop: "16px"}}>
                              <button className="qc-btn-update" style={{background:"#311e64"}}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{marginRight:6, verticalAlign:"middle"}}>
                                  <polygon points="5 3 19 12 5 21 5 3"/>
                                </svg>
                                Preview
                              </button>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Video Options */}
                      {attachmentType === "video" && (
                        <>
                          <div className="qc-fw">
                            <label className="qc-label">Video Type (Supported YouTube, Vimeo & .mp4 files)</label>
                            <div className="qc-toggle-btn-group">
                              <button className={`qc-toggle-btn ${attVideoType === "mp4" ? "active" : ""}`} onClick={() => setAttVideoType("mp4")}>MP4 Video</button>
                              <button className={`qc-toggle-btn ${attVideoType === "youtube" ? "active" : ""}`} onClick={() => setAttVideoType("youtube")}>YouTube Video</button>
                              <button className={`qc-toggle-btn ${attVideoType === "vimeo" ? "active" : ""}`} onClick={() => setAttVideoType("vimeo")}>Vimeo Video</button>
                            </div>
                          </div>
                          
                          <div className="qc-fw">
                            <label className="qc-label">Video Link</label>
                            <div style={{display:"flex", alignItems:"center"}}>
                              <input
                                className="qc-input"
                                style={{borderTopRightRadius:0, borderBottomRightRadius:0, borderRight:"none"}}
                                placeholder="Video Link"
                                value={attVideoLink}
                                onChange={e => setAttVideoLink(e.target.value)}
                              />
                              <button className="qc-btn-update" style={{borderTopLeftRadius:0, borderBottomLeftRadius:0, padding:"11px 18px", background:"#311e64"}}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{marginRight:6, verticalAlign:"middle"}}>
                                  <polygon points="5 3 19 12 5 21 5 3"/>
                                </svg>
                                Preview
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  )}

                </div>
              </div>
            </div>
          </div>
        
        {/* ── SAVE BAR ── */}
        <div className="qc-savebar">
          <button className="qc-btn-cancel" onClick={() => router.push("/admin/masters/curriculum/questions/list")}>
            Cancel
          </button>
          {activeTab === "details" && (
            <button className="qc-btn-save" onClick={handleSaveDetails} disabled={saving}>
              {saving ? "Saving…" : isEditMode ? "UPDATE DETAILS" : "SAVE DETAILS"}
            </button>
          )}
          {activeTab === "settings" && (
            <button className="qc-btn-update" onClick={handleSaveSettings} disabled={savingSettings}>
              {savingSettings ? "Updating…" : "UPDATE SETTINGS"}
            </button>
          )}
          {activeTab === "solution" && (
            <button className="qc-btn-update" style={{background: "#311e64"}} onClick={handleSaveSolution} disabled={savingSolution}>
              {savingSolution ? "Updating…" : "SAVE SOLUTION"}
            </button>
          )}
          {activeTab === "attachment" && (
            <button className="qc-btn-update" style={{background: "#311e64"}} onClick={handleSaveAttachment} disabled={savingAttachment}>
              {savingAttachment ? "Updating…" : "UPDATE"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export default function CreateQuestionPage() {
  return (
    <AdminProvider>
      <CreateQuestionForm />
    </AdminProvider>
  );
}
