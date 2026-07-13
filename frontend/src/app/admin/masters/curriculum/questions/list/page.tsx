"use client";
import { apiFetch } from "@/lib/apiFetch";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { AdminProvider } from "../../../../components/ProtectedAdmin";
import { API_BASE_URL } from "@/lib/config";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import AIQuestionGeneratorModal from "../../../../components/AIQuestionGeneratorModal";

/* ─── Types ─── */
interface QuestionType { id: number; code: string; name: string; is_active: boolean; }
interface Question {
  id: number; code: string;
  question_type_code: string; question_type_name: string | null;
  category_name: string | null; subcategory_name: string | null;
  tags: string | null; question_html: string;
  is_active: boolean; created_at: string;
  options: { id: number; content_html: string; is_correct: boolean; order_index: number }[];
}

const PAGE_SIZE = 10;

/* ─── CSS ─── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  .ql-root {
    font-family: 'Inter', system-ui, sans-serif;
    background: #f3f4f6;
    min-height: 100vh;
    padding: 32px;
    box-sizing: border-box;
    color: #111827;
  }
  .ql-root *, .ql-root *::before, .ql-root *::after { box-sizing: border-box; }

  /* ── Page header ── */
  .ql-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; flex-wrap: wrap; gap: 16px; }
  .ql-title-wrap h1 { font-size: 1.6rem; font-weight: 800; color: #111827; margin: 0 0 4px; letter-spacing: -0.4px; }
  .ql-title-wrap p  { font-size: .85rem; color: #6b7280; margin: 0; }

  .ql-actions { display: flex; align-items: center; gap: 10px; }

  /* ── Export button ── */
  .ql-btn-export {
    display: inline-flex; align-items: center; gap: 7px; padding: 10px 18px;
    border-radius: 8px; background: #0f766e; color: #fff; font-size: .875rem;
    font-weight: 600; border: none; cursor: pointer; transition: background .2s; font-family: inherit;
  }
  .ql-btn-export:hover { background: #0d6b64; }
  .ql-btn-export:disabled { opacity: .6; cursor: not-allowed; }

  .ql-btn-ai {
    display: inline-flex; align-items: center; gap: 7px; padding: 10px 18px;
    border-radius: 8px; background: linear-gradient(135deg,#7c3aed,#4f46e5); color: #fff; font-size: .875rem;
    font-weight: 600; border: none; cursor: pointer; transition: all .2s; font-family: inherit;
    box-shadow: 0 2px 10px rgba(124,58,237,.3);
  }
  .ql-btn-ai:hover { box-shadow: 0 4px 18px rgba(124,58,237,.5); transform: translateY(-1px); }

  .ql-btn-import {
    display: inline-flex; align-items: center; gap: 7px; padding: 10px 18px;
    border-radius: 8px; background: #6d28d9; color: #fff; font-size: .875rem;
    font-weight: 600; border: none; cursor: pointer; transition: background .2s; font-family: inherit;
  }
  .ql-btn-import:hover { background: #5b21b6; }

  .ql-new-wrap { position: relative; }
  .ql-btn-new {
    display: inline-flex; align-items: center; gap: 7px; padding: 10px 18px;
    border-radius: 8px; background: #059669; color: #fff; font-size: .875rem;
    font-weight: 600; border: none; cursor: pointer; transition: background .2s; font-family: inherit;
  }
  .ql-btn-new:hover { background: #047857; }

  /* ── Dropdown ── */
  .ql-dropdown {
    position: absolute; top: calc(100% + 8px); right: 0; min-width: 260px;
    background: #fff; border: 1.5px solid #e5e7eb; border-radius: 12px;
    box-shadow: 0 12px 40px rgba(0,0,0,.15); z-index: 1000; overflow: hidden;
    animation: ql-drop-in .16s ease;
  }
  @keyframes ql-drop-in { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
  .ql-dropdown-hd { padding: 12px 16px 8px; font-size: .7rem; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; color: #9ca3af; border-bottom: 1px solid #f3f4f6; }
  .ql-dropdown-list { padding: 6px; }
  .ql-dropdown-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 12px; border: none; background: transparent; border-radius: 8px; cursor: pointer; text-align: left; transition: background .14s; font-family: inherit; }
  .ql-dropdown-item:hover { background: #eff6ff; }
  .ql-dropdown-item-code { display: inline-flex; align-items: center; justify-content: center; min-width: 40px; padding: 3px 8px; border-radius: 5px; background: #2563eb; color: #fff; font-size: .68rem; font-weight: 700; letter-spacing: .05em; white-space: nowrap; }
  .ql-dropdown-item-name { font-size: .875rem; font-weight: 500; color: #111827; flex: 1; }
  .ql-dropdown-empty { padding: 16px; text-align: center; font-size: .83rem; color: #9ca3af; }
  .ql-dropdown-loading { padding: 16px; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: .83rem; color: #6b7280; }
  .ql-spinner { width: 16px; height: 16px; border: 2px solid #e5e7eb; border-top-color: #2563eb; border-radius: 50%; animation: ql-spin .7s linear infinite; }
  @keyframes ql-spin { to{ transform: rotate(360deg); } }

  /* ── Breadcrumb ── */
  .ql-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: .8rem; color: #9ca3af; margin-bottom: 20px; }
  .ql-breadcrumb a { color: #2563eb; text-decoration: none; font-weight: 500; cursor: pointer; }
  .ql-breadcrumb a:hover { text-decoration: underline; }
  .ql-breadcrumb span { font-weight: 600; color: #374151; }

  /* ── Toolbar ── */
  .ql-toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 18px; flex-wrap: wrap; }
  .ql-search-wrap { position: relative; flex: 1; min-width: 160px; }
  .ql-search-ico { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #9ca3af; pointer-events: none; display: flex; }
  .ql-search { width: 100%; padding: 9px 10px 9px 34px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: .82rem; background: #fff; color: #111827; outline: none; transition: border-color .2s; font-family: inherit; }
  .ql-search:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.08); }
  .ql-filter-select {
    padding: 9px 12px; border: 1.5px solid #e5e7eb; border-radius: 8px;
    font-size: .82rem; background: #fff; color: #374151; outline: none; cursor: pointer;
    font-family: inherit; transition: border-color .2s; min-width: 130px;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 10px center; padding-right: 30px;
  }
  .ql-filter-select:focus { border-color: #2563eb; }

  /* clear-filters pill */
  .ql-clear-btn {
    display: inline-flex; align-items: center; gap: 5px; padding: 8px 14px;
    border: 1.5px solid #fca5a5; border-radius: 8px; background: #fef2f2;
    color: #dc2626; font-size: .8rem; font-weight: 600; cursor: pointer;
    font-family: inherit; transition: all .15s; white-space: nowrap;
  }
  .ql-clear-btn:hover { background: #fee2e2; border-color: #f87171; }

  /* ── Table card ── */
  .ql-card { background: #fff; border-radius: 14px; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,.06); overflow: visible; }
  .ql-table { width: 100%; border-collapse: collapse; }
  .ql-table thead { background: #f8faff; border-bottom: 2px solid #e5e7eb; }
  .ql-table th { padding: 13px 16px; text-align: left; font-size: .68rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #6b7280; white-space: nowrap; }
  .ql-table tr + tr { border-top: 1px solid #f3f4f6; }
  .ql-table td { padding: 14px 16px; font-size: .865rem; color: #111827; vertical-align: middle; }
  .ql-table tbody tr { transition: background .12s; }
  .ql-table tbody tr:hover { background: #f8faff; }

  /* ── Code pill ── */
  .ql-code-pill { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 6px; background: #2563eb; color: #fff; font-size: .7rem; font-weight: 700; letter-spacing: .05em; white-space: nowrap; cursor: pointer; transition: background .15s; }
  .ql-code-pill:hover { background: #1d4ed8; }
  .ql-type-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: .72rem; font-weight: 600; background: #eff6ff; color: #2563eb; white-space: nowrap; }
  .ql-badge-active   { display: inline-block; padding: 3px 11px; border-radius: 20px; font-size: .72rem; font-weight: 600; background: #f0fdf4; color: #16a34a; }
  .ql-badge-inactive { display: inline-block; padding: 3px 11px; border-radius: 20px; font-size: .72rem; font-weight: 600; background: #f3f4f6; color: #9ca3af; }

  /* ── Actions ── */
  .ql-actions-wrap { position: relative; display: inline-block; }
  .ql-act-btn { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 7px; border: 1.5px solid #e5e7eb; background: #fff; font-size: .8rem; font-weight: 600; color: #374151; cursor: pointer; transition: all .15s; font-family: inherit; }
  .ql-act-btn:hover { background: #f9fafb; border-color: #d1d5db; }
  .ql-act-menu { position: absolute; right: 0; top: calc(100% + 6px); background: #fff; border: 1.5px solid #e5e7eb; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,.12); z-index: 9999; min-width: 140px; animation: ql-drop-in .14s ease; }
  .ql-act-item { display: block; width: 100%; padding: 9px 14px; border: none; background: transparent; font-size: .85rem; color: #374151; cursor: pointer; text-align: left; font-family: inherit; transition: background .12s; }
  .ql-act-item:hover { background: #f3f4f6; }
  .ql-act-item.danger { color: #dc2626; }
  .ql-act-item.danger:hover { background: #fef2f2; }

  /* ── Skeleton & empty ── */
  .ql-empty { text-align: center; padding: 60px 20px; color: #6b7280; }
  .ql-empty-ico { font-size: 2.5rem; margin-bottom: 12px; opacity: .4; }
  .ql-empty h3 { font-size: 1rem; font-weight: 600; color: #374151; margin-bottom: 6px; }
  .ql-empty p { font-size: .85rem; }
  .ql-skel { height: 16px; border-radius: 6px; background: linear-gradient(90deg,#efefef 25%,#e0e0e0 50%,#efefef 75%); background-size: 200% 100%; animation: ql-sh 1.4s infinite; }
  @keyframes ql-sh { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

  /* ── Footer / Pagination ── */
  .ql-footer { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-top: 1px solid #e5e7eb; font-size: .82rem; color: #6b7280; flex-wrap: wrap; gap: 10px; }
  .ql-pager { display: flex; align-items: center; gap: 4px; }
  .ql-page-btn {
    width: 32px; height: 32px; border-radius: 7px; border: 1.5px solid #e5e7eb;
    background: #fff; color: #374151; font-size: .82rem; font-weight: 600;
    cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
    transition: all .14s; font-family: inherit;
  }
  .ql-page-btn:hover:not(:disabled) { border-color: #2563eb; color: #2563eb; background: #eff6ff; }
  .ql-page-btn.active { background: #2563eb; border-color: #2563eb; color: #fff; }
  .ql-page-btn:disabled { opacity: .35; cursor: not-allowed; }
  .ql-page-ellipsis { padding: 0 4px; color: #9ca3af; font-size: .82rem; }

  /* ── Delete Confirm Modal ── */
  .ql-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 500;
    display: flex; align-items: center; justify-content: center;
    animation: ql-fade-in .18s ease;
    backdrop-filter: blur(2px);
  }
  @keyframes ql-fade-in { from{opacity:0} to{opacity:1} }
  .ql-modal {
    background: #fff; border-radius: 16px; padding: 32px 28px;
    max-width: 400px; width: calc(100% - 32px);
    box-shadow: 0 20px 60px rgba(0,0,0,.2);
    animation: ql-slide-up .2s ease;
    text-align: center;
  }
  @keyframes ql-slide-up { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  .ql-modal-icon {
    width: 56px; height: 56px; border-radius: 50%; background: #fef2f2;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 18px; color: #dc2626;
  }
  .ql-modal h3 { font-size: 1.1rem; font-weight: 700; color: #111827; margin: 0 0 8px; }
  .ql-modal p  { font-size: .875rem; color: #6b7280; margin: 0 0 24px; line-height: 1.6; }
  .ql-modal-code { display: inline-block; padding: 2px 10px; border-radius: 5px; background: #eff6ff; color: #2563eb; font-size: .78rem; font-weight: 700; font-family: monospace; margin: 0 0 20px; }
  .ql-modal-actions { display: flex; gap: 10px; justify-content: center; }
  .ql-modal-cancel {
    padding: 10px 24px; border-radius: 8px; border: 1.5px solid #e5e7eb;
    background: #fff; color: #374151; font-size: .875rem; font-weight: 600;
    cursor: pointer; transition: all .15s; font-family: inherit; flex: 1;
  }
  .ql-modal-cancel:hover { background: #f3f4f6; }
  .ql-modal-delete {
    padding: 10px 24px; border-radius: 8px; border: none;
    background: #dc2626; color: #fff; font-size: .875rem; font-weight: 700;
    cursor: pointer; transition: background .15s; font-family: inherit; flex: 1;
  }
  .ql-modal-delete:hover { background: #b91c1c; }
  .ql-modal-delete:disabled { opacity: .55; cursor: not-allowed; }

  @media(max-width: 640px) {
    .ql-root { padding: 16px; }
    .ql-header { flex-direction: column; align-items: flex-start; }
    .ql-table th:nth-child(5), .ql-table td:nth-child(5),
    .ql-table th:nth-child(6), .ql-table td:nth-child(6) { display: none; }
  }
`;

/* ─── Strip HTML ─── */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

/* ─── Pagination helper ─── */
function getPages(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3) return [1, "…", total-4, total-3, total-2, total-1, total];
  return [1, "…", current-1, current, current+1, "…", total];
}

/* ─── Delete Confirm Modal ─── */
function DeleteModal({
  title, description, onConfirm, onCancel,
}: { title: string; description: React.ReactNode; onConfirm: () => Promise<void>; onCancel: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const doDelete = async () => {
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
  };
  return (
    <div className="ql-overlay" onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="ql-modal">
        <div className="ql-modal-icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>
        </div>
        <h3>{title}</h3>
        {description}
        <div className="ql-modal-actions">
          <button className="ql-modal-cancel" onClick={onCancel}>Cancel</button>
          <button className="ql-modal-delete" onClick={doDelete} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── ActionsMenu ─── */
function ActionsMenu({
  onEdit, onToggle, onDelete, isActive,
}: { onEdit: () => void; onToggle: () => void; onDelete: () => void; isActive: boolean; }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div className="ql-actions-wrap" ref={ref}>
      <button className="ql-act-btn" onClick={() => setOpen(o => !o)}>
        Actions
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div className="ql-act-menu">
          <button className="ql-act-item" onClick={() => { setOpen(false); onEdit(); }}>Edit</button>
          <button className="ql-act-item" onClick={() => { setOpen(false); onToggle(); }}>
            {isActive ? "Deactivate" : "Activate"}
          </button>
          <button className="ql-act-item danger" onClick={() => { setOpen(false); onDelete(); }}>Delete</button>
        </div>
      )}
    </div>
  );
}

/* ─── SkelRow ─── */
function SkelRow() {
  return (
    <tr>{[80, 200, 120, 90, 90, 80, 70, 70].map((w, i) => (
      <td key={i}><div className="ql-skel" style={{ width: w }} /></td>
    ))}</tr>
  );
}

/* ─── NEW QUESTION button ─── */
function NewQuestionButton({ onSelect }: { onSelect: (qt: QuestionType) => void }) {
  const [open, setOpen] = useState(false);
  const [types, setTypes] = useState<QuestionType[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const handleOpen = async () => {
    setOpen(o => !o);
    if (types.length === 0) {
      setLoading(true);
      try {
        const r = await apiFetch(`${API_BASE_URL}/question-types?is_active=true`);
        setTypes(await r.json());
      } catch { /* silent */ } finally { setLoading(false); }
    }
  };
  return (
    <div className="ql-new-wrap" ref={ref}>
      <button className="ql-btn-new" onClick={handleOpen}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        NEW QUESTION
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 2 }}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div className="ql-dropdown">
          <div className="ql-dropdown-hd">Select Question Type</div>
          <div className="ql-dropdown-list">
            {loading
              ? <div className="ql-dropdown-loading"><div className="ql-spinner"/>Loading types…</div>
              : types.length === 0
                ? <div className="ql-dropdown-empty">No active question types found</div>
                : types.map(qt => (
                  <button key={qt.id} className="ql-dropdown-item" onClick={() => { setOpen(false); onSelect(qt); }}>
                    <span className="ql-dropdown-item-code">{qt.code}</span>
                    <span className="ql-dropdown-item-name">{qt.name}</span>
                  </button>
                ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════ */
function QuestionsListPage() {
  const router = useRouter();

  /* ── filters ── */
  const [search,      setSearch]      = useState("");
  const [typeFilter,  setTypeFilter]  = useState("");
  const [statusFilter,setStatusFilter]= useState("");   // "" | "active" | "inactive"
  const [tagFilter,   setTagFilter]   = useState("");

  /* ── data ── */
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>([]);
  const [questions,     setQuestions]     = useState<Question[]>([]);
  const [total,         setTotal]         = useState(0);
  const [loading,       setLoading]       = useState(true);

  /* ── pagination ── */
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /* ── delete modal ── */
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);
  
  /* ── bulk delete ── */
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  /* ── AI Modal ── */
  const [showAIModal, setShowAIModal] = useState(false);

  /* ── export ── */
  const [exporting, setExporting] = useState(false);

  /* fetch question types once */
  useEffect(() => {
    apiFetch(`${API_BASE_URL}/question-types?is_active=true`)
      .then(r => r.json()).then(setQuestionTypes).catch(() => {});
  }, []);

  /* reset to page 1 when any filter changes */
  useEffect(() => { setPage(1); }, [search, typeFilter, statusFilter, tagFilter]);

  /* fetch questions */
  const loadQuestions = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (search)       p.set("search",    search);
    if (typeFilter)   p.set("type_code", typeFilter);
    if (statusFilter === "active")   p.set("is_active", "true");
    if (statusFilter === "inactive") p.set("is_active", "false");
    if (tagFilter)    p.set("tag", tagFilter);   // dedicated tag filter
    p.set("skip",  String((page - 1) * PAGE_SIZE));
    p.set("limit", String(PAGE_SIZE));

    apiFetch(`${API_BASE_URL}/questions?${p}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        setQuestions(Array.isArray(data?.items) ? data.items : []);
        setTotal(typeof data?.total === "number" ? data.total : 0);
      })
      .catch(() => { setQuestions([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [search, typeFilter, statusFilter, tagFilter, page]);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  /* ── helpers ── */
  const hasFilters = search || typeFilter || statusFilter || tagFilter;

  const clearFilters = () => {
    setSearch(""); setTypeFilter(""); setStatusFilter(""); setTagFilter("");
  };

  const handleNewQuestion = (qt: QuestionType) => {
    router.push(`/admin/masters/curriculum/questions/create/${qt.code}?name=${encodeURIComponent(qt.name)}`);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await apiFetch(`${API_BASE_URL}/questions/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Question deleted successfully!");
        setSelectedIds(prev => prev.filter(id => id !== deleteTarget.id));
        if (questions.length === 1 && page > 1) setPage(p => p - 1);
        else loadQuestions();
      } else {
        toast.error("Failed to delete question");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setDeleteTarget(null);
    }
  };

  const executeBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    let successCount = 0;
    try {
      await Promise.all(
        selectedIds.map(async id => {
          const res = await apiFetch(`${API_BASE_URL}/questions/${id}`, { method: "DELETE" });
          if (res.ok) successCount++;
        })
      );
      toast.success(`Successfully deleted ${successCount} question(s).`);
      setSelectedIds([]);
      loadQuestions();
    } catch {
      toast.error("Error during bulk delete");
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDeleteModal(false);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/questions/${id}/toggle`, { method: "PATCH" });
      if (res.ok) {
        toast.success("Question status updated!");
        loadQuestions();
      } else {
        toast.error("Failed to update status");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(
      <span>
        Copied code <strong>{code}</strong>!
      </span>
    );
  };

  const handleExport = async () => {
    setExporting(true);
    const toastId = toast.loading("Exporting questions to CSV...");
    try {
      const res = await apiFetch(`${API_BASE_URL}/questions/export/csv`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `questions_export_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Questions exported successfully!", { id: toastId });
    } catch {
      toast.error("Failed to export questions.", { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  /* ── page range ── */
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end   = Math.min(page * PAGE_SIZE, total);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />

      {/* ── AI Generator Modal ── */}
      {showAIModal && (
        <AIQuestionGeneratorModal
          onClose={() => setShowAIModal(false)}
          onSaved={() => loadQuestions()}
        />
      )}

      {/* ── Delete modal ── */}
      {deleteTarget && (
        <DeleteModal
          title="Delete Question?"
          description={<><div className="ql-modal-code">{deleteTarget.code}</div><p>This action is <strong>permanent</strong> and cannot be undone.<br/>All options linked to this question will also be deleted.</p></>}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      
      {/* ── Bulk Delete modal ── */}
      {showBulkDeleteModal && (
        <DeleteModal
          title="Delete Selected Questions?"
          description={<p>You are about to delete <strong>{selectedIds.length}</strong> questions. This action is <strong>permanent</strong> and cannot be undone.<br/>All options linked to these questions will also be deleted.</p>}
          onConfirm={executeBulkDelete}
          onCancel={() => setShowBulkDeleteModal(false)}
        />
      )}

      <div className="ql-root">
        {/* ── Breadcrumb ── */}
        <div className="ql-breadcrumb">
          <a onClick={() => router.push("/admin/masters/curriculum/questions")}>Question Bank</a>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          <span>Questions</span>
        </div>

        {/* ── Header ── */}
        <div className="ql-header">
          <div className="ql-title-wrap">
            <h1>Questions</h1>
            <p>Manage all questions in the question bank</p>
          </div>
          <div className="ql-actions">
            <button className="ql-btn-ai" onClick={() => setShowAIModal(true)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
              NEW QUESTION WITH AI
            </button>
            <button className="ql-btn-export" onClick={handleExport} disabled={exporting}>
              {exporting ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "ql-spin .7s linear infinite" }}>
                  <path d="M21 12a9 9 0 11-18 0"/>
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              )}
              {exporting ? "EXPORTING…" : "EXPORT CSV"}
            </button>
            <button className="ql-btn-import">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              IMPORT QUESTIONS
            </button>
            <NewQuestionButton onSelect={handleNewQuestion} />
          </div>
        </div>

        {/* ── Filters toolbar ── */}
        <div className="ql-toolbar">
          {/* Search */}
          <div className="ql-search-wrap" style={{ maxWidth: 280 }}>
            <span className="ql-search-ico">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
            <input
              className="ql-search"
              placeholder="Search code or question…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Tag search */}
          <div className="ql-search-wrap" style={{ maxWidth: 180 }}>
            <span className="ql-search-ico">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
                <line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
            </span>
            <input
              className="ql-search"
              placeholder="Filter by tag…"
              value={tagFilter}
              onChange={e => setTagFilter(e.target.value)}
            />
          </div>

          {/* Type filter */}
          <select
            className="ql-filter-select"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            {questionTypes.map(qt => (
              <option key={qt.id} value={qt.code}>{qt.name}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            className="ql-filter-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Clear filters */}
          {hasFilters && (
            <button className="ql-clear-btn" onClick={clearFilters}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Clear Filters
            </button>
          )}
        </div>

        {/* ── Bulk Actions ── */}
        {selectedIds.length > 0 && (
          <div style={{ 
            background: "#f0f9ff", 
            border: "1px solid #bae6fd", 
            borderRadius: 12, 
            padding: "12px 20px", 
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            transition: "all 0.2s"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 13, color: "#0284c7", fontWeight: 600, background: "#e0f2fe", padding: "4px 10px", borderRadius: 20 }}>
                {selectedIds.length} item{selectedIds.length > 1 ? "s" : ""} selected
              </span>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button 
                onClick={() => setSelectedIds([])}
                style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Clear Selection
              </button>
              <button 
                onClick={() => setShowBulkDeleteModal(true)}
                disabled={isBulkDeleting}
                style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", fontSize: 13, fontWeight: 600, cursor: isBulkDeleting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, opacity: isBulkDeleting ? 0.7 : 1 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                {isBulkDeleting ? "Deleting..." : "Delete Selected"}
              </button>
            </div>
          </div>
        )}

        {/* ── Table ── */}
        <div className="ql-card">
          <table className="ql-table">
            <thead>
              <tr>
                <th style={{ width: 40, paddingLeft: 16 }}>
                  <input 
                    type="checkbox" 
                    checked={questions.length > 0 && selectedIds.length === questions.length}
                    onChange={(e) => {
                      const pageIds = questions.map(q => q.id);
                      if (e.target.checked) {
                        setSelectedIds([...new Set([...selectedIds, ...pageIds])]);
                      } else {
                        setSelectedIds(selectedIds.filter(id => !pageIds.includes(id)));
                      }
                    }}
                    style={{ cursor: "pointer", accentColor: "#6366f1" }} 
                  />
                </th>
                <th>Code</th>
                <th>Question</th>
                <th>Type</th>
                <th>Category</th>
                <th>Sub-Category</th>
                <th>Tags</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: PAGE_SIZE }).map((_, i) => <SkelRow key={i} />)
                : questions.length === 0
                  ? (
                    <tr>
                      <td colSpan={8}>
                        <div className="ql-empty">
                          <div className="ql-empty-ico">❓</div>
                          <h3>{hasFilters ? "No questions match your filters" : "No questions yet"}</h3>
                          <p>
                            {hasFilters
                              ? <><button style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontWeight: 600, padding: 0 }} onClick={clearFilters}>Clear filters</button> to see all questions.</>
                              : <>Click <strong>NEW QUESTION</strong> and choose a question type to get started.</>}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )
                  : questions.map(q => (
                    <tr 
                      key={q.id}
                      onClick={() => {
                        if (selectedIds.includes(q.id)) setSelectedIds(selectedIds.filter(id => id !== q.id));
                        else setSelectedIds([...selectedIds, q.id]);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <td style={{ paddingLeft: 16 }} onClick={e => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(q.id)}
                          onChange={(e) => {
                             if (e.target.checked) setSelectedIds([...selectedIds, q.id]);
                             else setSelectedIds(selectedIds.filter(id => id !== q.id));
                          }}
                          style={{ cursor: "pointer", accentColor: "#6366f1" }}
                        />
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <span 
                          className="ql-code-pill" 
                          onClick={() => handleCopyCode(q.code)}
                          title="Click to copy"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                          {q.code}
                        </span>
                      </td>
                      <td style={{ maxWidth: 260 }}>
                        <span title={stripHtml(q.question_html)} style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {stripHtml(q.question_html) || <em style={{ opacity: .4 }}>—</em>}
                        </span>
                      </td>
                      <td>
                        <span className="ql-type-badge">{q.question_type_name ?? q.question_type_code}</span>
                      </td>
                      <td style={{ color: "#6b7280", fontSize: ".83rem" }}>{q.category_name ?? "—"}</td>
                      <td style={{ color: "#6b7280", fontSize: ".83rem" }}>{q.subcategory_name ?? "—"}</td>
                      <td style={{ fontSize: ".8rem" }}>
                        {q.tags
                          ? q.tags.split(",").map(t => (
                            <span key={t} style={{ display: "inline-block", padding: "2px 8px", borderRadius: 20, background: "#ede9fe", color: "#7c3aed", fontSize: ".72rem", fontWeight: 600, marginRight: 4, marginBottom: 2 }}>
                              {t.trim()}
                            </span>
                          ))
                          : <span style={{ opacity: .4 }}>—</span>}
                      </td>
                      <td>
                        <span className={q.is_active ? "ql-badge-active" : "ql-badge-inactive"}>
                          {q.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <ActionsMenu
                          isActive={q.is_active}
                          onEdit={() => router.push(`/admin/masters/curriculum/questions/create/${q.question_type_code}?edit=${q.id}&name=${encodeURIComponent(q.question_type_name ?? q.question_type_code)}`)}
                          onToggle={() => handleToggle(q.id)}
                          onDelete={() => setDeleteTarget(q)}
                        />
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>

          {/* ── Footer with pagination ── */}
          <div className="ql-footer">
            <span>
              {total === 0
                ? "0 questions found"
                : `Showing ${start}–${end} of ${total} question${total !== 1 ? "s" : ""}`}
            </span>

            {totalPages > 1 && (
              <div className="ql-pager">
                {/* Prev */}
                <button
                  className="ql-page-btn"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  title="Previous page"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                </button>

                {getPages(page, totalPages).map((p, i) =>
                  p === "…"
                    ? <span key={`e${i}`} className="ql-page-ellipsis">…</span>
                    : (
                      <button
                        key={p}
                        className={`ql-page-btn${p === page ? " active" : ""}`}
                        onClick={() => setPage(p as number)}
                      >
                        {p}
                      </button>
                    )
                )}

                {/* Next */}
                <button
                  className="ql-page-btn"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  title="Next page"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function QuestionsListPageWrapper() {
  return (
    <AdminProvider>
      <QuestionsListPage />
    </AdminProvider>
  );
}
