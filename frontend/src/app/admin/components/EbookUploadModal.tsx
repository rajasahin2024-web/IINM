"use client";
import React, { useState, useRef } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { uploadDirect } from "@/lib/uploadDirect";
import { API_BASE_URL, resolveAssetUrl } from "@/lib/config";
import { useToast } from "./ToastProvider";
import { Icon } from "../icons";

interface TocEntry {
  title: string;
  page: number | "";
}

export interface EbookMaterial {
  id: number;
  title: string;
  description?: string | null;
  ebook_cover_url?: string | null;
  ebook_toc?: { title?: string; page?: number }[] | null;
  ebook_page_count?: number | null;
  has_ebook_file?: boolean;
  file_size?: number | null;
}

interface EbookUploadModalProps {
  onClose: () => void;
  onSuccess: (material?: EbookMaterial) => void;
  /** When provided the modal edits the existing eBook material (PUT). */
  material?: EbookMaterial | null;
}

function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MAX_EBOOK_MB = 200;

export default function EbookUploadModal({ onClose, onSuccess, material }: EbookUploadModalProps) {
  const { showToast } = useToast();
  const isEdit = !!material;

  const [title, setTitle] = useState(material?.title || "");
  const [description, setDescription] = useState(material?.description || "");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number | "">(material?.ebook_page_count ?? "");
  const [toc, setToc] = useState<TocEntry[]>(
    Array.isArray(material?.ebook_toc)
      ? material!.ebook_toc!.map(t => ({ title: String(t?.title ?? ""), page: t?.page ?? "" }))
      : []
  );
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const pickCover = (f: File | null) => {
    setCoverFile(f);
    setCoverPreview(f ? URL.createObjectURL(f) : null);
  };

  const addTocRow = () => setToc(t => [...t, { title: "", page: "" }]);
  const removeTocRow = (i: number) => setToc(t => t.filter((_, x) => x !== i));
  const setTocField = (i: number, key: keyof TocEntry, v: string) =>
    setToc(t => t.map((row, x) => x === i ? { ...row, [key]: key === "page" ? (v === "" ? "" : Math.max(0, parseInt(v, 10) || 0)) : v } : row));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "Title is required";
    if (!isEdit && !pdfFile) errs.file = "Select the eBook PDF file";
    if (pdfFile) {
      const ext = pdfFile.name.toLowerCase().split(".").pop();
      if (ext !== "pdf") errs.file = "eBook files must be PDF";
      else if (pdfFile.size > MAX_EBOOK_MB * 1024 * 1024) errs.file = `File exceeds the ${MAX_EBOOK_MB} MB limit`;
    }
    for (const row of toc) {
      if (row.title.trim() && row.page === "") { errs.toc = "Every TOC entry needs a page number"; break; }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    setProgress(0);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      if (description.trim()) fd.append("description", description.trim());
      fd.append("is_ebook", "true");

      const cleanToc = toc
        .filter(r => r.title.trim())
        .map((r, i) => ({ title: r.title.trim(), page: r.page === "" ? i + 1 : Number(r.page) }));
      if (cleanToc.length > 0) fd.append("ebook_toc", JSON.stringify(cleanToc));
      else if (isEdit) fd.append("ebook_toc", JSON.stringify([]));
      if (pageCount !== "") fd.append("ebook_page_count", String(pageCount));
      if (coverFile) fd.append("ebook_cover", coverFile);

      if (pdfFile) {
        // ── Preferred path: presigned direct-to-R2 private upload ──
        let key: string | null = null;
        try {
          const presignRes = await apiFetch(`${API_BASE_URL}/materials/ebook/presign`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: pdfFile.name,
              content_type: "application/pdf",
              size: pdfFile.size,
            }),
          });
          if (presignRes.ok) {
            const presign = await presignRes.json();
            const up = await uploadDirect(presign.upload_url, pdfFile, "application/pdf",
              pct => setProgress(Math.round(pct * 0.9)));
            if (up.ok) key = presign.file_key;
          }
        } catch { /* fall through to multipart */ }
        if (key) fd.append("ebook_file_key", key);
        else fd.append("file", pdfFile); // multipart fallback (local storage or R2 server-side)
      }

      setProgress(95);
      const res = await apiFetch(
        isEdit ? `${API_BASE_URL}/materials/${material!.id}` : `${API_BASE_URL}/materials`,
        { method: isEdit ? "PUT" : "POST", body: fd },
      );
      setProgress(100);
      if (res.ok) {
        const data = await res.json().catch(() => null);
        showToast(isEdit ? "eBook updated!" : "eBook uploaded — private storage only");
        onSuccess(data);
        onClose();
      } else {
        const data = await res.json().catch(() => null);
        setErrors({ submit: data?.detail || "Upload failed" });
        showToast(data?.detail || "Upload failed", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setSaving(false);
      setProgress(null);
    }
  };

  const inputSt: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: 10,
    border: "1.5px solid #e2e8f0", outline: "none", fontSize: 14,
    color: "#0f172a", background: "#fff", boxSizing: "border-box",
  };
  const lblSt: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 800, color: "#64748b",
    marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px",
  };

  return (
    <div onClick={e => { if (e.target === e.currentTarget && !saving) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 110000, background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 680, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 30px 80px rgba(0,0,0,0.25)", overflow: "hidden", animation: "slideUp 0.25s ease-out" }}>
        {/* Header */}
        <div style={{ padding: "18px 26px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fafbfc", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,#7c3aed,#6366f1)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="book" size={19} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0f172a" }}>{isEdit ? "Edit eBook" : "Upload eBook"}</h3>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>Private delivery — never exposed as a public URL</p>
            </div>
          </div>
          <button onClick={onClose} disabled={saving} style={{ background: "#fff", border: "1px solid #e2e8f0", width: 34, height: 34, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", cursor: "pointer" }}>
            <Icon name="x" size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="custom-scroll" style={{ flex: 1, overflowY: "auto", padding: "22px 26px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div style={{ gridColumn: "span 2" }}>
              <label style={lblSt}>eBook Title *</label>
              <input style={inputSt} value={title} autoFocus
                onChange={e => { setTitle(e.target.value); setErrors(p => ({ ...p, title: "" })); }}
                placeholder="e.g. Complete Biology Handbook" />
              {errors.title && <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "#ef4444" }}>{errors.title}</p>}
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label style={lblSt}>Description (optional)</label>
              <textarea style={{ ...inputSt, resize: "vertical", minHeight: 60, lineHeight: 1.5 }}
                value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Short description shown to students…" />
            </div>
          </div>

          {/* PDF dropzone */}
          <label style={lblSt}>eBook PDF {isEdit ? "(leave empty to keep current)" : "*"}</label>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) { setPdfFile(f); setErrors(p => ({ ...p, file: "" })); } }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? "#7c3aed" : errors.file ? "#ef4444" : "#c4b5fd"}`,
              borderRadius: 12, padding: "20px", textAlign: "center", cursor: "pointer",
              background: dragOver ? "#f5f3ff" : "#fafbff", transition: "all 0.18s", marginBottom: 16,
            }}>
            <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0] || null; setPdfFile(f); setErrors(p => ({ ...p, file: "" })); e.target.value = ""; }} />
            {pdfFile ? (
              <>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#166534" }}>✓ {pdfFile.name}</div>
                <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 3 }}>{formatBytes(pdfFile.size)} — click to change</div>
              </>
            ) : isEdit && material?.has_ebook_file ? (
              <>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>A private PDF is already attached</div>
                <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 3 }}>{formatBytes(material.file_size)} — click to replace</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#334155" }}>Drag & drop the PDF here, or click to browse</div>
                <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 3 }}>PDF only • up to {MAX_EBOOK_MB} MB • stored privately</div>
              </>
            )}
          </div>
          {errors.file && <p style={{ margin: "-10px 0 14px", fontSize: 11.5, color: "#ef4444" }}>{errors.file}</p>}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
            {/* Cover */}
            <div>
              <label style={lblSt}>Cover Image (optional)</label>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 64, height: 84, borderRadius: 8, overflow: "hidden", background: "#f1f5f9", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {coverPreview ? (
                    <img src={coverPreview} alt="cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : material?.ebook_cover_url ? (
                    <img src={resolveAssetUrl(material.ebook_cover_url)} alt="cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <Icon name="image" size={20} />
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <button type="button" onClick={() => coverInputRef.current?.click()}
                    style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#475569" }}>
                    {coverPreview || material?.ebook_cover_url ? "Change" : "Upload Cover"}
                  </button>
                  {coverPreview && (
                    <button type="button" onClick={() => pickCover(null)}
                      style={{ padding: "5px 14px", borderRadius: 8, border: "1px solid #fecaca", background: "#fff", cursor: "pointer", fontSize: 11.5, fontWeight: 700, color: "#ef4444" }}>
                      Remove
                    </button>
                  )}
                </div>
                <input ref={coverInputRef} type="file" accept="image/*" style={{ display: "none" }}
                  onChange={e => { pickCover(e.target.files?.[0] || null); e.target.value = ""; }} />
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 10.5, color: "#94a3b8" }}>JPG, PNG or WebP — shown in the student reader.</p>
            </div>
            {/* Page count */}
            <div>
              <label style={lblSt}>Page Count (optional)</label>
              <input type="number" min={1} style={inputSt} value={pageCount}
                onChange={e => setPageCount(e.target.value === "" ? "" : Math.max(1, parseInt(e.target.value, 10) || 1))}
                placeholder="e.g. 240" />
              <p style={{ margin: "6px 0 0", fontSize: 10.5, color: "#94a3b8" }}>Used for reading-progress display.</p>
            </div>
          </div>

          {/* TOC editor */}
          <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>Table of Contents</div>
                <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>Chapters students see in the reader sidebar; completion gates video unlocks.</div>
              </div>
              <button type="button" onClick={addTocRow}
                style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #c4b5fd", background: "#f5f3ff", color: "#7c3aed", cursor: "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                <Icon name="plus" size={12} /> Add Chapter
              </button>
            </div>
            {toc.length === 0 ? (
              <div style={{ border: "1.5px dashed #e2e8f0", borderRadius: 10, padding: "16px", textAlign: "center", fontSize: 12, color: "#94a3b8" }}>
                No TOC entries — the reader will treat the whole book as one chapter.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {toc.map((row, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ width: 22, height: 22, borderRadius: 6, background: "#f1f5f9", color: "#64748b", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                    <input style={{ ...inputSt, flex: 1, padding: "8px 12px" }} value={row.title}
                      onChange={e => setTocField(i, "title", e.target.value)} placeholder={`Chapter ${i + 1} title`} />
                    <input type="number" min={1} style={{ ...inputSt, width: 92, padding: "8px 10px" }} value={row.page}
                      onChange={e => setTocField(i, "page", e.target.value)} placeholder="Page" />
                    <button type="button" onClick={() => removeTocRow(i)}
                      style={{ width: 30, height: 30, borderRadius: 7, border: "1px solid #fecaca", background: "#fff", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon name="trash" size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {errors.toc && <p style={{ margin: "8px 0 0", fontSize: 11.5, color: "#ef4444" }}>{errors.toc}</p>}
          </div>

          {progress !== null && (
            <div style={{ marginTop: 16 }}>
              <div style={{ height: 6, borderRadius: 3, background: "#e2e8f0", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg,#7c3aed,#6366f1)", transition: "width 0.2s" }} />
              </div>
              <p style={{ margin: "5px 0 0", fontSize: 11, color: "#64748b", textAlign: "center" }}>
                {progress < 95 ? `Uploading… ${progress}%` : "Processing…"}
              </p>
            </div>
          )}
          {errors.submit && <p style={{ margin: "12px 0 0", fontSize: 12, color: "#ef4444", textAlign: "center" }}>{errors.submit}</p>}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 26px", borderTop: "1px solid #e2e8f0", background: "#fafbfc", display: "flex", justifyContent: "flex-end", gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} disabled={saving}
            style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            style={{ padding: "9px 24px", borderRadius: 8, border: "none", background: saving ? "#a78bfa" : "linear-gradient(135deg,#7c3aed,#6366f1)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", boxShadow: "0 4px 14px rgba(124,58,237,0.3)" }}>
            {saving ? "Saving…" : isEdit ? "Save eBook" : "Upload eBook"}
          </button>
        </div>
      </div>
    </div>
  );
}
