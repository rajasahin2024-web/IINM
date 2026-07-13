"use client";
import { apiFetch } from "@/lib/apiFetch";
import React, { useState, useEffect, useRef, CSSProperties } from "react";
import { API_BASE_URL } from "@/lib/config";
import { useToast } from "./ToastProvider";

/* ─────────────────────────────────────────────────────────────────────────────
   DESIGN TOKENS  (declared on :root so every element — including portals —
   inherits them)
───────────────────────────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  :root {
    --qt-accent:       #2563eb;
    --qt-accent-dk:    #1d4ed8;
    --qt-success:      #16a34a;
    --qt-success-bg:   #f0fdf4;
    --qt-danger:       #dc2626;
    --qt-danger-bg:    #fef2f2;
    --qt-txt:          #111827;
    --qt-txt2:         #6b7280;
    --qt-border:       #e5e7eb;
    --qt-bg:           #f3f4f6;
    --qt-white:        #ffffff;
    --qt-sh:           0 1px 3px rgba(0,0,0,.08),0 1px 2px rgba(0,0,0,.06);
    --qt-sh-lg:        0 20px 60px rgba(0,0,0,.22);
  }

  /* ── Page shell ── */
  .qtp-root {
    font-family: 'Inter', system-ui, sans-serif;
    background: var(--qt-bg);
    color: var(--qt-txt);
    min-height: 100vh;
    padding: 32px;
    box-sizing: border-box;
  }
  .qtp-root *, .qtp-root *::before, .qtp-root *::after { box-sizing: border-box; }

  /* ── Header ── */
  .qtp-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:28px; flex-wrap:wrap; gap:16px; }
  .qtp-title  { font-size:1.6rem; font-weight:700; letter-spacing:-.4px; color:var(--qt-txt); margin:0; }
  .qtp-sub    { font-size:.85rem; color:var(--qt-txt2); margin-top:4px; }

  /* ── Toolbar ── */
  .qtp-toolbar { display:flex; align-items:center; gap:12px; margin-bottom:20px; flex-wrap:wrap; }
  .qtp-search-wrap { position:relative; flex:1; min-width:220px; }
  .qtp-search-ico  { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--qt-txt2); pointer-events:none; display:flex; }
  .qtp-search      { width:100%; padding:10px 12px 10px 38px; border:1.5px solid var(--qt-border); border-radius:8px; font-size:.875rem; background:var(--qt-white); color:var(--qt-txt); outline:none; transition:border-color .2s; }
  .qtp-search:focus { border-color:var(--qt-accent); }
  .qtp-tabs  { display:flex; gap:4px; background:var(--qt-border); border-radius:8px; padding:3px; }
  .qtp-tab   { padding:6px 14px; border-radius:6px; font-size:.8rem; font-weight:500; border:none; cursor:pointer; background:transparent; color:var(--qt-txt2); transition:all .18s; }
  .qtp-tab.on { background:var(--qt-white); color:var(--qt-txt); box-shadow:0 1px 4px rgba(0,0,0,.1); }
  .qtp-count { font-size:.78rem; color:var(--qt-txt2); background:var(--qt-white); border:1px solid var(--qt-border); padding:4px 12px; border-radius:20px; }

  /* ── Primary button ── */
  .qtp-btn-primary {
    display:inline-flex; align-items:center; gap:7px;
    padding:10px 20px; border-radius:8px;
    background:var(--qt-accent); color:#fff;
    font-size:.875rem; font-weight:600; border:none; cursor:pointer;
    transition:background .2s;
  }
  .qtp-btn-primary:hover { background:var(--qt-accent-dk); }

  /* ── Card / Table ── */
  .qtp-card  { background:var(--qt-white); border-radius:14px; box-shadow:var(--qt-sh); overflow:hidden; border:1px solid var(--qt-border); }
  .qtp-table { width:100%; border-collapse:collapse; }
  .qtp-table thead { background:#f8faff; border-bottom:2px solid var(--qt-border); }
  .qtp-table th { padding:13px 18px; text-align:left; font-size:.7rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--qt-txt2); }
  .qtp-table tr + tr { border-top:1px solid var(--qt-border); }
  .qtp-table td { padding:15px 18px; font-size:.875rem; color:var(--qt-txt); vertical-align:middle; }
  .qtp-table tbody tr { transition:background .12s; }
  .qtp-table tbody tr:hover { background:#f8faff; }

  /* ── Code badge ── */
  .qtp-code {
    display:inline-flex; align-items:center; gap:5px;
    padding:5px 13px; border-radius:6px;
    background:var(--qt-accent); color:#fff;
    font-size:.75rem; font-weight:700; letter-spacing:.06em; white-space:nowrap;
  }

  /* ── Status badge ── */
  .qtp-badge-on  { display:inline-block; padding:3px 11px; border-radius:20px; font-size:.75rem; font-weight:600; background:var(--qt-success-bg); color:var(--qt-success); }
  .qtp-badge-off { display:inline-block; padding:3px 11px; border-radius:20px; font-size:.75rem; font-weight:600; background:#f3f4f6; color:#9ca3af; }

  /* ── Row actions ── */
  .qtp-actions { display:flex; align-items:center; gap:8px; }
  .qtp-icon-btn { display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:7px; border:none; cursor:pointer; transition:all .18s; }
  .qtp-icon-edit   { background:#eff6ff; color:var(--qt-accent); }
  .qtp-icon-edit:hover   { background:var(--qt-accent); color:#fff; }
  .qtp-icon-delete { background:var(--qt-danger-bg); color:var(--qt-danger); }
  .qtp-icon-delete:hover { background:var(--qt-danger); color:#fff; }

  /* ── Toggle switch ── */
  .qtp-toggle { position:relative; display:inline-flex; align-items:center; cursor:pointer; }
  .qtp-toggle input { position:absolute; opacity:0; width:0; height:0; }
  .qtp-track { width:40px; height:22px; border-radius:11px; background:#d1d5db; transition:background .22s; display:flex; align-items:center; padding:2px; }
  .qtp-track.on { background:var(--qt-success); }
  .qtp-thumb { width:18px; height:18px; border-radius:50%; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,.25); transition:transform .22s; }
  .qtp-thumb.on { transform:translateX(18px); }

  /* ── Skeleton ── */
  .qtp-skel-row td { padding:16px 18px; }
  .qtp-skel { height:18px; border-radius:6px; background:linear-gradient(90deg,#efefef 25%,#e0e0e0 50%,#efefef 75%); background-size:200% 100%; animation:qtp-sh 1.4s infinite; }
  @keyframes qtp-sh { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

  /* ── Empty ── */
  .qtp-empty { text-align:center; padding:60px 20px; color:var(--qt-txt2); }
  .qtp-empty-ico { font-size:2.8rem; margin-bottom:12px; opacity:.4; }
  .qtp-empty h3 { font-size:1rem; font-weight:600; color:var(--qt-txt); margin-bottom:6px; }
  .qtp-empty p  { font-size:.85rem; }

  /* ── Overlay ── */
  .qtp-overlay {
    position:fixed; inset:0;
    background:rgba(17,24,39,.55);
    backdrop-filter:blur(4px);
    z-index:9999;
    display:flex; align-items:center; justify-content:center;
    padding:20px;
  }

  /* ── Modal card ── */
  .qtp-modal {
    background:var(--qt-white);
    border-radius:16px;
    width:80%; max-width:1200px;
    box-shadow:var(--qt-sh-lg);
    animation:qtp-in .22s ease;
    overflow:hidden;
  }
  @keyframes qtp-in { from{transform:translateY(-20px);opacity:0} to{transform:translateY(0);opacity:1} }
  .qtp-modal-hd { display:flex; align-items:center; justify-content:space-between; padding:22px 26px 18px; border-bottom:1px solid var(--qt-border); }
  .qtp-modal-ht { font-size:1.1rem; font-weight:700; color:var(--qt-txt); margin:0; }
  .qtp-modal-x  { border:none; background:transparent; cursor:pointer; color:var(--qt-txt2); padding:4px 6px; border-radius:6px; transition:all .18s; display:flex; }
  .qtp-modal-x:hover { background:var(--qt-bg); color:var(--qt-txt); }
  .qtp-modal-bd { padding:24px 26px; }
  .qtp-modal-ft { display:flex; gap:10px; justify-content:flex-end; padding-top:16px; border-top:1px solid var(--qt-border); margin-top:24px; }

  /* ── Floating field ── */
  .qtp-fw { margin-bottom:20px; }
  .qtp-field {
    position:relative;
    border:1.5px solid var(--qt-border);
    border-radius:10px;
    background:var(--qt-white);
    transition:border-color .2s, box-shadow .2s;
  }
  .qtp-field.focus {
    border-color:var(--qt-accent);
    box-shadow:0 0 0 3px rgba(37,99,235,.13);
  }
  .qtp-lbl {
    position:absolute;
    left:14px; top:50%; transform:translateY(-50%);
    font-size:.875rem; color:var(--qt-txt2);
    pointer-events:none;
    transition:all .16s ease;
    background:transparent; padding:0 3px;
    white-space:nowrap;
    line-height:1;
  }
  .qtp-lbl.up {
    top:0; transform:translateY(-50%);
    font-size:.7rem; font-weight:600;
    color:var(--qt-accent);
    background:var(--qt-white);
  }
  .qtp-lbl-ta {
    left:14px; top:16px; transform:none;
    font-size:.875rem; color:var(--qt-txt2);
    position:absolute; pointer-events:none;
    transition:all .16s ease;
    background:transparent; padding:0 3px;
    line-height:1;
  }
  .qtp-lbl-ta.up {
    top:0; transform:translateY(-50%);
    font-size:.7rem; font-weight:600;
    color:var(--qt-accent);
    background:var(--qt-white);
  }
  .qtp-req { color:var(--qt-danger); margin-left:2px; }
  .qtp-inp {
    display:block; width:100%;
    padding:20px 14px 8px;
    border:none; outline:none;
    font-size:.9rem; color:var(--qt-txt);
    background:transparent;
    border-radius:10px;
    font-family:inherit;
  }
  .qtp-ta {
    display:block; width:100%;
    padding:24px 14px 10px;
    border:none; outline:none;
    font-size:.9rem; color:var(--qt-txt);
    background:transparent;
    border-radius:10px;
    resize:vertical; min-height:110px;
    font-family:inherit;
  }
  .qtp-hint { font-size:.7rem; color:var(--qt-txt2); margin-top:5px; padding-left:2px; }

  /* ── Status row (toggle in form) ── */
  .qtp-status-row {
    display:flex; align-items:center; justify-content:space-between;
    padding:13px 16px;
    border:1.5px solid var(--qt-border); border-radius:10px;
    margin-bottom:20px;
  }
  .qtp-status-lbl  { font-size:.875rem; font-weight:600; color:var(--qt-txt); }
  .qtp-status-sub  { font-size:.75rem; color:var(--qt-txt2); margin-top:3px; }

  /* ── Shared buttons ── */
  .qtp-btn, .qtp-btn-ghost, .qtp-btn-danger {
    display:inline-flex; align-items:center; gap:7px;
    padding:9px 20px; border-radius:8px;
    font-size:.875rem; font-weight:600;
    border:none; cursor:pointer;
    transition:all .18s; white-space:nowrap;
    font-family:inherit;
  }
  .qtp-btn       { background:var(--qt-accent);  color:#fff; }
  .qtp-btn:hover { background:var(--qt-accent-dk); }
  .qtp-btn-ghost       { background:transparent; color:var(--qt-txt2); border:1.5px solid var(--qt-border); }
  .qtp-btn-ghost:hover { background:var(--qt-bg); color:var(--qt-txt); }
  .qtp-btn-danger       { background:var(--qt-danger);  color:#fff; }
  .qtp-btn-danger:hover { background:#b91c1c; }
  .qtp-btn:disabled, .qtp-btn-ghost:disabled { opacity:.5; cursor:not-allowed; }

  /* ── Confirm card ── */
  .qtp-confirm {
    background:var(--qt-white); border-radius:16px;
    width:100%; max-width:400px;
    padding:36px 28px; text-align:center;
    box-shadow:var(--qt-sh-lg);
    animation:qtp-in .22s ease;
  }
  .qtp-confirm-ico { margin-bottom:16px; }
  .qtp-confirm-ht  { font-size:1.1rem; font-weight:700; color:var(--qt-txt); margin:0 0 10px; }
  .qtp-confirm-tx  { font-size:.875rem; color:var(--qt-txt2); line-height:1.65; margin-bottom:28px; }
  .qtp-confirm-row { display:flex; gap:10px; justify-content:center; }

  /* ── Toast ── */
  .qtp-toast {
    position:fixed; bottom:28px; right:28px; z-index:99999;
    padding:13px 20px; border-radius:10px;
    font-size:.875rem; font-weight:600;
    box-shadow:0 4px 24px rgba(0,0,0,.18);
    animation:qtp-in .22s ease;
    display:flex; align-items:center; gap:10px;
    font-family:'Inter',system-ui,sans-serif;
  }
  .qtp-toast-ok  { background:var(--qt-success); color:#fff; }
  .qtp-toast-err { background:var(--qt-danger);  color:#fff; }

  @media(max-width:640px){
    .qtp-root { padding:16px; }
    .qtp-header { flex-direction:column; align-items:flex-start; }
    .qtp-table th:nth-child(3), .qtp-table td:nth-child(3) { display:none; }
  }
`;

/* ─────────────────────────────────────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────────────────────────────────────── */

function FloatingInput({
  id, label, value, onChange, required = false, maxLength, hint,
}: {
  id: string; label: string; value: string;
  onChange: (v: string) => void;
  required?: boolean; maxLength?: number; hint?: string;
}) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;
  return (
    <div className="qtp-fw">
      <div className={`qtp-field${focused ? " focus" : ""}`}>
        <label htmlFor={id} className={`qtp-lbl${lifted ? " up" : ""}`}>
          {label}{required && <span className="qtp-req">*</span>}
        </label>
        <input
          id={id}
          className="qtp-inp"
          type="text"
          value={value}
          maxLength={maxLength}
          autoComplete="off"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      {hint && <p className="qtp-hint">{hint}</p>}
    </div>
  );
}

function FloatingTextarea({
  id, label, value, onChange,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;
  return (
    <div className="qtp-fw">
      <div className={`qtp-field${focused ? " focus" : ""}`} style={{ position: "relative" }}>
        <label htmlFor={id} className={`qtp-lbl-ta${lifted ? " up" : ""}`}>
          {label}
        </label>
        <textarea
          id={id}
          className="qtp-ta"
          value={value}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <label className="qtp-toggle">
      <input type="checkbox" checked={on} onChange={onChange} />
      <span className={`qtp-track${on ? " on" : ""}`}>
        <span className={`qtp-thumb${on ? " on" : ""}`} />
      </span>
    </label>
  );
}

function IconBtn({
  variant, onClick, title, children,
}: {
  variant: "edit" | "delete"; onClick: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <button
      className={`qtp-icon-btn qtp-icon-${variant}`}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}

/* ─── Modal (portal-like, appended at end of <body> via React portal pattern) ─ */
function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <div
      className="qtp-overlay"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="qtp-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="qtp-modal-hd">
          <h2 className="qtp-modal-ht">{title}</h2>
          <button className="qtp-modal-x" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="qtp-modal-bd">{children}</div>
      </div>
    </div>
  );
}

function ConfirmDelete({ open, onClose, onConfirm, name }: {
  open: boolean; onClose: () => void; onConfirm: () => void; name: string;
}) {
  if (!open) return null;
  return (
    <div className="qtp-overlay">
      <div className="qtp-confirm">
        <div className="qtp-confirm-ico">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.8">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <circle cx="12" cy="16" r=".5" fill="#dc2626" />
          </svg>
        </div>
        <h3 className="qtp-confirm-ht">Delete Question Type?</h3>
        <p className="qtp-confirm-tx">
          You are about to permanently delete <strong>{name}</strong>.<br />This action cannot be undone.
        </p>
        <div className="qtp-confirm-row">
          <button className="qtp-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="qtp-btn-danger" onClick={onConfirm}>Yes, Delete</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */

interface QType {
  id: number;
  code: string;
  name: string;
  short_description: string | null;
  is_active: boolean;
  created_at: string;
}

const empty = { code: "", name: "", short_description: "", is_active: true };
const API = `${API_BASE_URL}`;

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────────────── */

export default function QuestionTypesManager() {
  const [items, setItems] = useState<QType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "active" | "inactive">("all");
  const { showToast } = useToast();
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [del, setDel] = useState<QType | null>(null);


  /* helpers */
  const toast$ = (msg: string, ok = true) => {
    showToast(msg, ok ? 'success' : 'error');
    
    
  };

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiFetch(`${API}/question-types`);
      setItems(await r.json());
    } catch { toast$("Failed to load", false); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    apiFetch(`${API}/question-types/seed`).catch(() => {}).finally(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* filter */
  const rows = items.filter((q) => {
    const s = search.toLowerCase();
    if (s && !q.name.toLowerCase().includes(s) && !q.code.toLowerCase().includes(s)) return false;
    if (tab === "active" && !q.is_active) return false;
    if (tab === "inactive" && q.is_active) return false;
    return true;
  });

  /* modal open */
  const openAdd = () => { setEditId(null); setForm(empty); setModal(true); };
  const openEdit = (q: QType) => {
    setEditId(q.id);
    setForm({ code: q.code, name: q.name, short_description: q.short_description || "", is_active: q.is_active });
    setModal(true);
  };
  const closeModal = () => { setModal(false); setEditId(null); setForm(empty); };

  /* save */
  const save = async () => {
    if (!form.code.trim() || !form.name.trim()) { toast$("Code and Name are required", false); return; }
    setSaving(true);
    try {
      const body = { code: form.code.trim().toUpperCase(), name: form.name.trim(), short_description: form.short_description.trim() || null, is_active: form.is_active };
      const r = await apiFetch(editId ? `${API}/question-types/${editId}` : `${API}/question-types`, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error((await r.json()).detail || "Error");
      toast$(editId ? "Updated!" : "Created!");
      closeModal(); load();
    } catch (e: unknown) { toast$(e instanceof Error ? e.message : "Failed", false); }
    finally { setSaving(false); }
  };

  /* toggle */
  const toggle = async (q: QType) => {
    try {
      await apiFetch(`${API}/question-types/${q.id}/toggle`, { method: "PATCH" });
      toast$(`${q.code} marked ${q.is_active ? "Inactive" : "Active"}`);
      load();
    } catch { toast$("Failed to toggle", false); }
  };

  /* delete */
  const doDelete = async () => {
    if (!del) return;
    try {
      await apiFetch(`${API}/question-types/${del.id}`, { method: "DELETE" });
      toast$("Deleted");
      setDel(null); load();
    } catch { toast$("Failed to delete", false); }
  };

  /* skeleton */
  const Skel = () => (
    <tr className="qtp-skel-row">
      {[1,2,3,4,5].map(k => <td key={k}><div className="qtp-skel" /></td>)}
    </tr>
  );

  return (
    <>
      {/* inject global CSS once */}
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />

      <div className="qtp-root">
        {/* ─ Header ─ */}
        <div className="qtp-header">
          <div>
            <h1 className="qtp-title">Question Types</h1>
            <p className="qtp-sub">Manage question types available in the question bank</p>
          </div>
          <button className="qtp-btn-primary" onClick={openAdd} id="add-qt-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Question Type
          </button>
        </div>

        {/* ─ Toolbar ─ */}
        <div className="qtp-toolbar">
          <div className="qtp-search-wrap">
            <span className="qtp-search-ico">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
            <input className="qtp-search" placeholder="Search by code or name…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="qtp-tabs">
            {(["all","active","inactive"] as const).map(t => (
              <button key={t} className={`qtp-tab${tab === t ? " on" : ""}`} onClick={() => setTab(t)}>
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <span className="qtp-count">{rows.length} types</span>
        </div>

        {/* ─ Table ─ */}
        <div className="qtp-card">
          <table className="qtp-table">
            <thead>
              <tr>
                <th>Code</th><th>Name</th><th>Short Description</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({length:5}).map((_,i) => <Skel key={i}/>)
                : rows.length === 0
                  ? (
                    <tr><td colSpan={5}>
                      <div className="qtp-empty">
                        <div className="qtp-empty-ico">📋</div>
                        <h3>No question types found</h3>
                        <p>{search ? "Try a different search term" : 'Click "Add Question Type" to get started'}</p>
                      </div>
                    </td></tr>
                  )
                  : rows.map(q => (
                    <tr key={q.id}>
                      <td>
                        <span className="qtp-code">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                          </svg>
                          {q.code}
                        </span>
                      </td>
                      <td style={{fontWeight:600, minWidth:180}}>{q.name}</td>
                      <td style={{color:"var(--qt-txt2)", fontSize:".82rem", maxWidth:340}}>
                        {q.short_description
                          ? q.short_description.length > 120
                            ? q.short_description.slice(0,120) + "…"
                            : q.short_description
                          : <em style={{opacity:.4}}>—</em>}
                      </td>
                      <td>
                        <span className={q.is_active ? "qtp-badge-on" : "qtp-badge-off"}>
                          {q.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div className="qtp-actions">
                          <Toggle on={q.is_active} onChange={() => toggle(q)} />
                          <IconBtn variant="edit" onClick={() => openEdit(q)} title="Edit">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </IconBtn>
                          <IconBtn variant="delete" onClick={() => setDel(q)} title="Delete">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                              <path d="M10 11v6M14 11v6"/>
                              <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                            </svg>
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* ─ Add / Edit Modal ─ */}
      <Modal open={modal} onClose={closeModal} title={editId ? "Edit Question Type" : "Add Question Type"}>
        <FloatingInput
          id="qt-code" label="Code" value={form.code} required maxLength={10}
          onChange={v => setForm(f => ({...f, code: v.toUpperCase().slice(0,10)}))}
          hint="Short unique identifier — e.g. MSA, TOF, FIB (max 10 chars)"
        />
        <FloatingInput
          id="qt-name" label="Name" value={form.name} required
          onChange={v => setForm(f => ({...f, name: v}))}
        />
        <FloatingTextarea
          id="qt-desc" label="Short Description"
          value={form.short_description}
          onChange={v => setForm(f => ({...f, short_description: v}))}
        />
        <div className="qtp-status-row">
          <div>
            <div className="qtp-status-lbl">Status</div>
            <div className="qtp-status-sub">
              {form.is_active ? "Active — visible in question bank" : "Inactive — hidden from question bank"}
            </div>
          </div>
          <Toggle on={form.is_active} onChange={() => setForm(f => ({...f, is_active: !f.is_active}))} />
        </div>
        <div className="qtp-modal-ft">
          <button className="qtp-btn-ghost" onClick={closeModal} disabled={saving}>Cancel</button>
          <button className="qtp-btn" onClick={save} disabled={saving} id="qt-save-btn">
            {saving ? "Saving…" : editId ? "Save Changes" : "Create"}
          </button>
        </div>
      </Modal>

      {/* ─ Delete Confirm ─ */}
      <ConfirmDelete open={!!del} onClose={() => setDel(null)} onConfirm={doDelete} name={del?.name ?? ""} />

    </>
  );
}
