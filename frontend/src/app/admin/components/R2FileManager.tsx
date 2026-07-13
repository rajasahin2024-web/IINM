"use client";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL } from "@/lib/config";
import React, { useState, useEffect, useCallback, useRef, DragEvent, ChangeEvent } from "react";
import { useToast } from "./ToastProvider";
import DeleteModal from "./DeleteModal";

const API = `${API_BASE_URL}/settings/r2`;

// ─── Types ─────────────────────────────────────────────────────────────────────
interface R2File {
  key: string;
  size: number;
  last_modified: string;
  name: string;
}

interface FMState {
  prefix: string;
  folders: string[];
  files: R2File[];
  publicUrl: string;
  loading: boolean;
  error: string;
}

type SortKey = "name" | "size" | "date";
type ViewMode = "grid" | "list";

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmtBytes(b: number) {
  if (!b) return "0 B";
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1073741824) return `${(b / 1048576).toFixed(1)} MB`;
  return `${(b / 1073741824).toFixed(2)} GB`;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function extOf(name: string) {
  return (name.split(".").pop() || "").toLowerCase();
}

function getTypeInfo(name: string): { color: string; bg: string; label: string } {
  const ext = extOf(name);
  if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext))
    return { color: "#7c3aed", bg: "#ede9fe", label: "VIDEO" };
  if (ext === "pdf")
    return { color: "#d97706", bg: "#fef3c7", label: "PDF" };
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"].includes(ext))
    return { color: "#059669", bg: "#d1fae5", label: "IMAGE" };
  if (["mp3", "wav", "ogg", "aac", "flac"].includes(ext))
    return { color: "#0891b2", bg: "#cffafe", label: "AUDIO" };
  if (["doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt"].includes(ext))
    return { color: "#2563eb", bg: "#dbeafe", label: "DOC" };
  return { color: "#64748b", bg: "#f1f5f9", label: ext.toUpperCase() || "FILE" };
}

function FileIcon({ name, size = 36 }: { name: string; size?: number }) {
  const ext = extOf(name);
  const isVideo = ["mp4", "webm", "mov", "avi", "mkv"].includes(ext);
  const isPdf = ext === "pdf";
  const isImg = ["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"].includes(ext);
  const isAudio = ["mp3", "wav", "ogg", "aac", "flac"].includes(ext);

  if (isImg) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21,15 16,10 5,21"/>
    </svg>
  );
  if (isVideo) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16" fill="#7c3aed" stroke="none"/>
    </svg>
  );
  if (isPdf) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.5">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14,2 14,8 20,8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  );
  if (isAudio) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="1.5">
      <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
    </svg>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14,2 14,8 20,8"/>
    </svg>
  );
}

// ─── Upload Progress Bar ────────────────────────────────────────────────────────
function UploadProgress({ name, progress, done, error }: { name: string; progress: number; done: boolean; error: string }) {
  return (
    <div style={{ padding: "10px 14px", background: done ? "#f0fdf4" : error ? "#fef2f2" : "#f8fafc", borderRadius: 8, marginBottom: 8, border: `1px solid ${done ? "#bbf7d0" : error ? "#fecaca" : "#e2e8f0"}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>{name}</span>
        <span style={{ fontSize: 11, color: done ? "#16a34a" : error ? "#dc2626" : "#64748b", flexShrink: 0 }}>
          {done ? "✓ Done" : error ? "✗ Failed" : `${progress}%`}
        </span>
      </div>
      <div style={{ height: 4, borderRadius: 4, background: "#e2e8f0", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progress}%`, background: done ? "#22c55e" : error ? "#ef4444" : "#38bdf8", borderRadius: 4, transition: "width 0.2s" }} />
      </div>
      {error && <p style={{ margin: "4px 0 0", fontSize: 11, color: "#dc2626" }}>{error}</p>}
    </div>
  );
}

// ─── Main R2FileManager ─────────────────────────────────────────────────────────
export default function R2FileManager({ initialPrefix = "" }: { initialPrefix?: string }) {
  const { showToast } = useToast();
  const toast = {
    success: (msg: string) => showToast(msg, 'success'),
    error: (msg: string) => showToast(msg, 'error')
  };
  const [state, setState] = useState<FMState>({ prefix: initialPrefix, folders: [], files: [], publicUrl: "", loading: false, error: "" });
  const [history, setHistory] = useState<string[]>([initialPrefix]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sort, setSort] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [search, setSearch] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // Modals
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  const [renameTarget, setRenameTarget] = useState<R2File | null>(null);
  const [renameName, setRenameName] = useState("");
  const [renaming, setRenaming] = useState(false);

  const [previewFile, setPreviewFile] = useState<R2File | null>(null);

  // Deletion Modals
  const [confirmFilesDelete, setConfirmFilesDelete] = useState<string[] | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<string | null>(null);

  // Upload
  const [uploads, setUploads] = useState<{ id: string; name: string; progress: number; done: boolean; error: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load ──────────────────────────────────────────────────────────────────────
  const load = useCallback(async (prefix: string) => {
    setState(s => ({ ...s, loading: true, error: "" }));
    setSelected(new Set());
    try {
      const res = await apiFetch(`${API}/files?prefix=${encodeURIComponent(prefix)}`);
      if (!res.ok) {
        const d = await res.json();
        setState(s => ({ ...s, loading: false, error: d.detail || "Failed to load" }));
        return;
      }
      const data = await res.json();
      setState({ prefix, folders: data.folders, files: data.files, publicUrl: data.public_url, loading: false, error: "" });
    } catch {
      setState(s => ({ ...s, loading: false, error: "Network error. Make sure R2 credentials are saved." }));
    }
  }, []);

  useEffect(() => { load(initialPrefix); }, [load, initialPrefix]);

  // ── Navigate ─────────────────────────────────────────────────────────────────
  const navigateTo = (folder: string) => {
    setHistory(h => [...h, folder]);
    load(folder);
  };

  const goBack = () => {
    if (history.length <= 1) return;
    const nh = history.slice(0, -1);
    setHistory(nh);
    load(nh[nh.length - 1]);
  };

  // ── Sort & Filter ─────────────────────────────────────────────────────────────
  const toggleSort = (key: SortKey) => {
    if (sort === key) setSortAsc(a => !a);
    else { setSort(key); setSortAsc(true); }
  };

  const filteredFiles = state.files
    .filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let cmp = 0;
      if (sort === "name") cmp = a.name.localeCompare(b.name);
      else if (sort === "size") cmp = a.size - b.size;
      else cmp = a.last_modified.localeCompare(b.last_modified);
      return sortAsc ? cmp : -cmp;
    });

  const filteredFolders = state.folders.filter(f =>
    f.replace(state.prefix, "").toLowerCase().includes(search.toLowerCase())
  );

  // ── Selection ─────────────────────────────────────────────────────────────────
  const toggleSelect = (key: string) => {
    setSelected(s => {
      const n = new Set(s);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  const selectAll = () => {
    if (selected.size === filteredFiles.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredFiles.map(f => f.key)));
    }
  };

  // ── Upload ────────────────────────────────────────────────────────────────────
  const uploadFiles = async (fileList: FileList) => {
    const toUpload = Array.from(fileList);
    const ids = toUpload.map(() => Math.random().toString(36).slice(2));

    setUploads(u => [
      ...u,
      ...toUpload.map((f, i) => ({ id: ids[i], name: f.name, progress: 0, done: false, error: "" })),
    ]);

    await Promise.all(toUpload.map(async (file, i) => {
      const key = `${state.prefix}${file.name}`;
      const fd = new FormData();
      fd.append("file", file);
      const upUrl = `${API}/upload?key=${encodeURIComponent(key)}`;

      try {
        // Simulate progress using XHR for actual progress events
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", upUrl);
          xhr.upload.onprogress = evt => {
            if (evt.lengthComputable) {
              const pct = Math.round((evt.loaded / evt.total) * 100);
              setUploads(u => u.map(up => up.id === ids[i] ? { ...up, progress: pct } : up));
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setUploads(u => u.map(up => up.id === ids[i] ? { ...up, progress: 100, done: true } : up));
              resolve();
            } else {
              let msg = "Upload failed";
              try { msg = JSON.parse(xhr.responseText).detail || msg; } catch { /* ignore */ }
              setUploads(u => u.map(up => up.id === ids[i] ? { ...up, error: msg } : up));
              reject(new Error(msg));
            }
          };
          xhr.onerror = () => {
            setUploads(u => u.map(up => up.id === ids[i] ? { ...up, error: "Network error" } : up));
            reject(new Error("Network error"));
          };
          xhr.send(fd);
        });
      } catch { /* already handled */ }
    }));

    setTimeout(() => load(state.prefix), 800);
    setTimeout(() => setUploads(u => u.filter(up => !up.done)), 3000);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  };

  // ── Delete ────────────────────────────────────────────────────────────────────
  const deleteFiles = (keys: string[]) => {
    setConfirmFilesDelete(keys);
  };

  const executeDeleteFiles = async () => {
    if (!confirmFilesDelete) return;
    try {
      await Promise.all(confirmFilesDelete.map(async key => {
        await apiFetch(`${API}/files`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key }),
        });
      }));
      setSelected(new Set());
      toast.success(`Deleted ${confirmFilesDelete.length} item(s)`);
      load(state.prefix);
    } catch {
      toast.error("Error deleting files");
    } finally {
      setConfirmFilesDelete(null);
    }
  };

  const deleteFolder = (folder: string) => {
    setDeleteFolderTarget(folder);
  };

  const executeDeleteFolder = async () => {
    if (!deleteFolderTarget) return;
    try {
      const res = await apiFetch(`${API}/folder`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefix: deleteFolderTarget }),
      });
      if (res.ok) {
        toast.success("Folder deleted");
        load(state.prefix);
      } else {
        const d = await res.json();
        toast.error(d.detail);
      }
    } catch {
      toast.error("Network error");
    } finally {
      setDeleteFolderTarget(null);
    }
  };

  // ── Create Folder ─────────────────────────────────────────────────────────────
  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    const res = await apiFetch(`${API}/folder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: state.prefix, name: newFolderName.trim() }),
    });
    setCreatingFolder(false);
    if (res.ok) {
      setShowNewFolder(false);
      setNewFolderName("");
      load(state.prefix);
    } else {
      const d = await res.json();
      toast.error(d.detail);
    }
  };

  // ── Rename ────────────────────────────────────────────────────────────────────
  const doRename = async () => {
    if (!renameTarget || !renameName.trim()) return;
    setRenaming(true);
    const dir = renameTarget.key.substring(0, renameTarget.key.lastIndexOf("/") + 1);
    const newKey = `${dir}${renameName.trim()}`;
    const res = await apiFetch(`${API}/rename`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ old_key: renameTarget.key, new_key: newKey }),
    });
    setRenaming(false);
    if (res.ok) {
      setRenameTarget(null);
      setRenameName("");
      load(state.prefix);
    } else {
      const d = await res.json();
      toast.error(d.detail);
    }
  };

  // ── Copy URL ──────────────────────────────────────────────────────────────────
  const copyUrl = (file: R2File) => {
    const url = state.publicUrl ? `${state.publicUrl.replace(/\/$/, "")}/${file.key}` : file.key;
    navigator.clipboard.writeText(url);
    toast.success("URL Copied!");
  };

  // ── Breadcrumb ────────────────────────────────────────────────────────────────
  const breadcrumbs = state.prefix.split("/").filter(Boolean);

  // ── UI Pieces ──────────────────────────────────────────────────────────────────
  const iconBtn = (title: string, onClick: () => void, children: React.ReactNode, color = "#64748b", hoverColor = "#38bdf8") => (
    <button
      title={title}
      onClick={onClick}
      style={{ width: 30, height: 30, borderRadius: 7, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color, transition: "all 0.15s", flexShrink: 0 }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = hoverColor; e.currentTarget.style.color = hoverColor; e.currentTarget.style.background = "#f8fafc"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = color; e.currentTarget.style.background = "#fff"; }}
    >
      {children}
    </button>
  );

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button onClick={() => toggleSort(k)}
      style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, color: sort === k ? "#38bdf8" : "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px", padding: "4px 6px" }}>
      {label}
      {sort === k && <span style={{ fontSize: 10 }}>{sortAsc ? "▲" : "▼"}</span>}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "inherit" }}>
      <style>{`
        @keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fm-row:hover { background: #f8fafc !important; }
        .fm-row.selected { background: #f0f9ff !important; }
        .fm-grid-item:hover { border-color: #38bdf8 !important; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.08) !important; }
        .fm-grid-item.selected { border-color: #38bdf8 !important; background: #f0f9ff !important; }
        .fm-folder-row:hover { background: #fffbeb !important; }
      `}</style>

      {/* ── Toolbar ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "#fff", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap" }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1, minWidth: 0, flexWrap: "wrap" }}>
          <button onClick={() => { setHistory([initialPrefix]); load(initialPrefix); }}
            style={{ fontSize: 13, fontWeight: 700, color: "#38bdf8", background: "none", border: "none", cursor: "pointer", padding: "3px 8px", borderRadius: 6, display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
            root
          </button>
          {breadcrumbs.map((seg, i) => {
            const p = breadcrumbs.slice(0, i + 1).join("/") + "/";
            // if an initial prefix is provided, hide it from the breadcrumbs if it's identical
            if (initialPrefix && p === initialPrefix) return null;
            const isLast = i === breadcrumbs.length - 1;
            return (
              <React.Fragment key={p}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5"><polyline points="9,18 15,12 9,6"/></svg>
                <button
                  onClick={() => { setHistory(h => [...h.slice(0, 1), p]); load(p); }}
                  style={{ fontSize: 13, fontWeight: isLast ? 700 : 500, color: isLast ? "#0f172a" : "#38bdf8", background: "none", border: "none", cursor: "pointer", padding: "3px 8px", borderRadius: 6 }}>
                  {seg}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Search */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search files..."
            style={{ paddingLeft: 30, paddingRight: 12, height: 32, borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", width: 180 }}
          />
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {history.length > 1 && iconBtn("Go back", goBack, <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15,18 9,12 15,6"/></svg>)}

          {iconBtn("Refresh", () => load(state.prefix),
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: state.loading ? "spin 1s linear infinite" : "none" }}>
              <polyline points="23,4 23,10 17,10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
            </svg>)}

          {iconBtn("New Folder", () => setShowNewFolder(true),
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>,
            "#64748b", "#f59e0b")}

          <button onClick={() => fileInputRef.current?.click()}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 14px", height: 32, borderRadius: 8, border: "none", background: "linear-gradient(135deg, #38bdf8, #0ea5e9)", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(56,189,248,0.3)", transition: "all 0.15s" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Upload
          </button>
          <input ref={fileInputRef} type="file" multiple style={{ display: "none" }}
            onChange={(e: ChangeEvent<HTMLInputElement>) => { if (e.target.files) uploadFiles(e.target.files); e.target.value = ""; }} />

          {iconBtn(viewMode === "list" ? "Grid View" : "List View",
            () => setViewMode(m => m === "list" ? "grid" : "list"),
            viewMode === "list" ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            ))}

          {selected.size > 0 && (
            <button onClick={() => deleteFiles(Array.from(selected))}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 12px", height: 32, borderRadius: 8, border: "none", background: "#fef2f2", color: "#ef4444", fontSize: 12.5, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14a2 2 0 01-2 2H8a2 2 0 01-2-2L5,6"/></svg>
              Delete ({selected.size})
            </button>
          )}
        </div>
      </div>

      {/* ── Upload Progress ── */}
      {uploads.length > 0 && (
        <div style={{ padding: "10px 16px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ marginBottom: 4, fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Uploading</div>
          {uploads.map(u => <UploadProgress key={u.id} name={u.name} progress={u.progress} done={u.done} error={u.error} />)}
        </div>
      )}

      {/* ── Drop Zone + File Area ── */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        style={{ flex: 1, overflowY: "auto", background: dragOver ? "#f0f9ff" : "#fff", transition: "background 0.2s", position: "relative" }}>

        {dragOver && (
          <div style={{ position: "absolute", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(240,249,255,0.95)", border: "2px dashed #38bdf8", borderRadius: 8, margin: 12 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <p style={{ margin: "12px 0 0", fontSize: 15, fontWeight: 700, color: "#0ea5e9" }}>Drop files to upload</p>
            <p style={{ margin: 4, fontSize: 12, color: "#64748b" }}>to: /{state.prefix}</p>
          </div>
        )}

        {/* Error */}
        {state.error && !state.loading && (
          <div style={{ padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <p style={{ fontSize: 14, color: "#ef4444", fontWeight: 600, marginBottom: 8 }}>{state.error}</p>
            <p style={{ fontSize: 12, color: "#94a3b8" }}>Save R2 credentials with a Bucket Name first, then open File Manager.</p>
          </div>
        )}

        {/* Loading */}
        {state.loading && !state.error && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 240, gap: 10, color: "#94a3b8" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 11-18 0"/></svg>
            <span style={{ fontSize: 14 }}>Loading bucket contents…</span>
          </div>
        )}

        {!state.loading && !state.error && (
          <>
            {/* ── LIST VIEW ── */}
            {viewMode === "list" && (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                    <th style={{ width: 36, padding: "10px 14px" }}>
                      <input type="checkbox" checked={selected.size > 0 && selected.size === filteredFiles.length}
                        onChange={selectAll} style={{ cursor: "pointer", accentColor: "#38bdf8" }} />
                    </th>
                    <th style={{ textAlign: "left", padding: "10px 12px" }}><SortBtn k="name" label="Name" /></th>
                    <th style={{ textAlign: "left", padding: "10px 12px" }}><SortBtn k="size" label="Size" /></th>
                    <th style={{ textAlign: "left", padding: "10px 12px" }}><SortBtn k="date" label="Modified" /></th>
                    <th style={{ padding: "10px 12px", width: 120 }} />
                  </tr>
                </thead>
                <tbody>
                  {/* Back row */}
                  {history.length > 1 && (
                    <tr className="fm-folder-row" onClick={goBack} style={{ cursor: "pointer", borderBottom: "1px solid #f8fafc", transition: "background 0.15s" }}>
                      <td />
                      <td colSpan={4} style={{ padding: "10px 12px", fontSize: 13, color: "#64748b", display: "flex", alignItems: "center", gap: 8 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><polyline points="15,18 9,12 15,6"/></svg>
                        .. (back)
                      </td>
                    </tr>
                  )}

                  {/* Folders */}
                  {filteredFolders.map(f => {
                    const name = f.replace(state.prefix, "").replace(/\/$/, "");
                    return (
                      <tr key={f} className="fm-folder-row" style={{ borderBottom: "1px solid #f8fafc", transition: "background 0.15s" }}>
                        <td style={{ padding: "9px 14px" }} />
                        <td style={{ padding: "9px 12px", cursor: "pointer" }} onClick={() => navigateTo(f)}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{name}/</span>
                          </div>
                        </td>
                        <td style={{ padding: "9px 12px", fontSize: 12, color: "#94a3b8" }}>—</td>
                        <td style={{ padding: "9px 12px", fontSize: 12, color: "#94a3b8" }}>Folder</td>
                        <td style={{ padding: "9px 12px" }}>
                          <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                            {iconBtn("Delete folder", () => deleteFolder(f),
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14a2 2 0 01-2 2H8a2 2 0 01-2-2L5,6"/></svg>,
                              "#ef4444", "#ef4444")}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Files */}
                  {filteredFiles.map(f => {
                    const type = getTypeInfo(f.name);
                    const isSel = selected.has(f.key);
                    return (
                      <tr key={f.key} className={`fm-row${isSel ? " selected" : ""}`}
                        style={{ borderBottom: "1px solid #f8fafc", transition: "background 0.15s" }}>
                        <td style={{ padding: "9px 14px" }}>
                          <input type="checkbox" checked={isSel} onChange={() => toggleSelect(f.key)} style={{ cursor: "pointer", accentColor: "#38bdf8" }} />
                        </td>
                        <td style={{ padding: "9px 12px", cursor: "pointer" }} onClick={() => setPreviewFile(f)}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <FileIcon name={f.name} size={18} />
                            <div>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{f.name}</p>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: type.bg, color: type.color }}>{type.label}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "9px 12px", fontSize: 12, color: "#64748b" }}>{fmtBytes(f.size)}</td>
                        <td style={{ padding: "9px 12px", fontSize: 12, color: "#64748b" }}>{fmtDate(f.last_modified)}</td>
                        <td style={{ padding: "9px 12px" }}>
                          <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                            {iconBtn("Preview", () => setPreviewFile(f),
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>)}
                            {iconBtn("Copy URL", () => copyUrl(f),
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>)}
                            {iconBtn("Rename", () => { setRenameTarget(f); setRenameName(f.name); },
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
                              "#f59e0b", "#f59e0b")}
                            {iconBtn("Delete", () => deleteFiles([f.key]),
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14a2 2 0 01-2 2H8a2 2 0 01-2-2L5,6"/></svg>,
                              "#ef4444", "#ef4444")}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredFiles.length === 0 && filteredFolders.length === 0 && history.length <= 1 && (
                    <tr><td colSpan={5} style={{ padding: "60px 24px", textAlign: "center", color: "#94a3b8" }}>
                      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" style={{ marginBottom: 12 }}><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>This folder is empty</p>
                      <p style={{ margin: "6px 0 0", fontSize: 12 }}>Drag & drop files or click Upload</p>
                    </td></tr>
                  )}
                </tbody>
              </table>
            )}

            {/* ── GRID VIEW ── */}
            {viewMode === "grid" && (
              <div style={{ padding: 20 }}>
                {history.length > 1 && (
                  <div style={{ marginBottom: 8 }}>
                    <button onClick={goBack} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 13, color: "#64748b" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15,18 9,12 15,6"/></svg>
                      Back
                    </button>
                  </div>
                )}

                {filteredFolders.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Folders</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
                      {filteredFolders.map(f => {
                        const name = f.replace(state.prefix, "").replace(/\/$/, "");
                        return (
                          <div key={f} className="fm-grid-item" onDoubleClick={() => navigateTo(f)}
                            style={{ borderRadius: 12, border: "1.5px solid #fde68a", padding: 16, background: "#fffbeb", cursor: "pointer", transition: "all 0.18s", position: "relative" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                              <svg width="32" height="32" viewBox="0 0 24 24" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>
                              <button onClick={e => { e.stopPropagation(); deleteFolder(f); }}
                                style={{ width: 22, height: 22, borderRadius: 5, border: "none", background: "rgba(239,68,68,0.1)", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              </button>
                            </div>
                            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: "#92400e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</p>
                            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#b45309" }}>Double-click to open</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {filteredFiles.length > 0 && (
                  <div>
                    <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Files</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
                      {filteredFiles.map(f => {
                        const type = getTypeInfo(f.name);
                        const isSel = selected.has(f.key);
                        const isImg = ["jpg", "jpeg", "png", "gif", "webp", "avif"].includes(extOf(f.name));
                        const imgUrl = state.publicUrl ? `${state.publicUrl.replace(/\/$/, "")}/${f.key}` : "";
                        return (
                          <div key={f.key} className={`fm-grid-item${isSel ? " selected" : ""}`}
                            onClick={() => toggleSelect(f.key)}
                            onDoubleClick={() => setPreviewFile(f)}
                            style={{ borderRadius: 12, border: "1.5px solid #e2e8f0", overflow: "hidden", cursor: "pointer", transition: "all 0.18s", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", position: "relative" }}>

                            {isSel && (
                              <div style={{ position: "absolute", top: 6, right: 6, zIndex: 2, width: 18, height: 18, borderRadius: "50%", background: "#38bdf8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20,6 9,17 4,12"/></svg>
                              </div>
                            )}

                            <div style={{ height: 100, background: isImg && imgUrl ? `url(${imgUrl}) center/cover no-repeat` : type.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {(!isImg || !imgUrl) && <FileIcon name={f.name} size={36} />}
                            </div>
                            <div style={{ padding: "10px 10px 8px" }}>
                              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</p>
                              <p style={{ margin: "3px 0 0", fontSize: 11, color: "#94a3b8" }}>{fmtBytes(f.size)}</p>
                            </div>
                            <div style={{ display: "flex", borderTop: "1px solid #f1f5f9", padding: "6px 8px", gap: 4 }}>
                              {iconBtn("Copy URL", () => copyUrl(f), <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>)}
                              {iconBtn("Rename", () => { setRenameTarget(f); setRenameName(f.name); }, <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>, "#f59e0b", "#f59e0b")}
                              {iconBtn("Delete", () => deleteFiles([f.key]), <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14a2 2 0 01-2 2H8a2 2 0 01-2-2L5,6"/></svg>, "#ef4444", "#ef4444")}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {filteredFiles.length === 0 && filteredFolders.length === 0 && (
                  <div style={{ padding: "60px 24px", textAlign: "center", color: "#94a3b8" }}>
                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" style={{ marginBottom: 12 }}><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Empty folder</p>
                    <p style={{ margin: "6px 0 0", fontSize: 12 }}>Drag files here or click Upload</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Status Bar ── */}
      <div style={{ padding: "8px 16px", background: "#f8fafc", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>
          {filteredFolders.length} folder(s) · {filteredFiles.length} file(s)
          {selected.size > 0 && ` · ${selected.size} selected`}
        </span>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>
          /{state.prefix || ""}
        </span>
      </div>

      {/* ── New Folder Modal ── */}
      {showNewFolder && (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.15s" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: 380, boxShadow: "0 24px 60px rgba(0,0,0,0.2)", animation: "slideUp 0.2s" }}>
            <h3 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 700 }}>New Folder</h3>
            <input
              autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && createFolder()}
              placeholder="Folder name…"
              style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 16 }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowNewFolder(false); setNewFolderName(""); }}
                style={{ padding: "9px 20px", borderRadius: 9, border: "1px solid #e2e8f0", background: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
              <button onClick={createFolder} disabled={creatingFolder || !newFolderName.trim()}
                style={{ padding: "9px 20px", borderRadius: 9, border: "none", background: "#38bdf8", color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 700, opacity: creatingFolder || !newFolderName.trim() ? 0.6 : 1 }}>
                {creatingFolder ? "Creating…" : "Create Folder"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rename Modal ── */}
      {renameTarget && (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.15s" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: 400, boxShadow: "0 24px 60px rgba(0,0,0,0.2)", animation: "slideUp 0.2s" }}>
            <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700 }}>Rename File</h3>
            <p style={{ margin: "0 0 18px", fontSize: 12, color: "#64748b" }}>Original: <code>{renameTarget.name}</code></p>
            <input
              autoFocus value={renameName} onChange={e => setRenameName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && doRename()}
              style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 16 }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => { setRenameTarget(null); setRenameName(""); }}
                style={{ padding: "9px 20px", borderRadius: 9, border: "1px solid #e2e8f0", background: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
              <button onClick={doRename} disabled={renaming || !renameName.trim() || renameName === renameTarget.name}
                style={{ padding: "9px 20px", borderRadius: 9, border: "none", background: "#f59e0b", color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 700, opacity: renaming ? 0.7 : 1 }}>
                {renaming ? "Renaming…" : "Rename"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Preview Modal ── */}
      {previewFile && (() => {
        const pubUrl = state.publicUrl ? `${state.publicUrl.replace(/\/$/, "")}/${previewFile.key}` : "";
        const ext = extOf(previewFile.name);
        const isImg = ["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"].includes(ext);
        const isVideo = ["mp4", "webm", "mov"].includes(ext);
        const isAudio = ["mp3", "wav", "ogg", "aac"].includes(ext);
        const type = getTypeInfo(previewFile.name);

        return (
          <div onClick={() => setPreviewFile(null)} style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.15s" }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, overflow: "hidden", maxWidth: "90vw", width: isImg || isVideo ? 860 : 480, maxHeight: "90vh", display: "flex", flexDirection: "column", animation: "slideUp 0.2s", boxShadow: "0 32px 80px rgba(0,0,0,0.4)" }}>
              {/* Preview header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <FileIcon name={previewFile.name} size={20} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{previewFile.name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>{fmtBytes(previewFile.size)} · {fmtDate(previewFile.last_modified)}</p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {pubUrl && (
                    <button onClick={() => copyUrl(previewFile)}
                      style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 600, color: "#64748b" }}>
                      Copy URL
                    </button>
                  )}
                  {pubUrl && (
                    <a href={pubUrl} target="_blank" rel="noreferrer"
                      style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#38bdf8", fontSize: 12, cursor: "pointer", fontWeight: 700, color: "#fff", textDecoration: "none" }}>
                      Open ↗
                    </a>
                  )}
                  <button onClick={() => setPreviewFile(null)}
                    style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#64748b" }}>×</button>
                </div>
              </div>

              {/* Preview content */}
              <div style={{ overflowY: "auto", flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: isImg ? "#0f172a" : "#fff" }}>
                {isImg && pubUrl && <img src={pubUrl} alt={previewFile.name} style={{ maxWidth: "100%", maxHeight: "65vh", objectFit: "contain", borderRadius: 8 }} />}
                {isVideo && pubUrl && <video src={pubUrl} controls style={{ maxWidth: "100%", maxHeight: "65vh", outline: "none", borderRadius: 8 }} />}
                {isAudio && pubUrl && <audio src={pubUrl} controls style={{ width: "100%" }} />}
                {!isImg && !isVideo && !isAudio && (
                  <div style={{ textAlign: "center", padding: 20 }}>
                    <div style={{ width: 80, height: 80, borderRadius: 20, background: type.bg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                      <FileIcon name={previewFile.name} size={40} />
                    </div>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>No preview available</p>
                    <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>Open the file to view its contents</p>
                    {pubUrl && (
                      <a href={pubUrl} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 16, padding: "10px 24px", borderRadius: 10, background: "#38bdf8", color: "#fff", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
                        Download / Open
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {confirmFilesDelete && (
        <DeleteModal
          title={`Delete ${confirmFilesDelete.length} item(s)?`}
          description="This cannot be undone."
          confirmText="Yes, delete"
          onConfirm={executeDeleteFiles}
          onCancel={() => setConfirmFilesDelete(null)}
        />
      )}

      {deleteFolderTarget && (
        <DeleteModal
          title={`Delete folder "${deleteFolderTarget.replace(state.prefix, "").replace(/\/$/, "")}"?`}
          description="All contents inside will be permanently deleted."
          confirmText="Yes, delete all"
          onConfirm={executeDeleteFolder}
          onCancel={() => setDeleteFolderTarget(null)}
        />
      )}
    </div>
  );
}
