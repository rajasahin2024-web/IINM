"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Icon } from "../icons";

/* ─────────────────────────────────────────
   AdminPdfPreview
   Lightweight PDF.js canvas viewer for admin previews.
   - Renders all pages as canvas (no iframe → bypasses X-Frame-Options: DENY)
   - Zoom in / out / reset
   - Loading + error states
───────────────────────────────────────── */

interface AdminPdfPreviewProps {
  url: string;          // absolute URL to the PDF
  title?: string;
  onClose: () => void;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const BASE_SCALE = 1.3;

export default function AdminPdfPreview({ url, title = "PDF Preview", onClose }: AdminPdfPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<any>(null);
  const renderTaskRef = useRef<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [zoom, setZoom] = useState(1);

  const renderPages = useCallback(async (scaleMultiplier: number) => {
    const pdfDoc = pdfDocRef.current;
    const container = containerRef.current;
    if (!pdfDoc || !container) return;

    renderTaskRef.current.forEach(t => { try { t.cancel(); } catch {} });
    renderTaskRef.current = [];

    const scale = BASE_SCALE * scaleMultiplier;
    container.innerHTML = "";

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      canvas.style.display = "block";
      canvas.style.margin = "0 auto 12px";
      canvas.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)";
      canvas.style.background = "#fff";
      container.appendChild(canvas);

      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      ctx.scale(ratio, ratio);

      const task = page.render({ canvasContext: ctx, viewport });
      renderTaskRef.current.push(task);
      try {
        await task.promise;
      } catch { /* cancelled */ }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const pdfjsLib: any = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const resp = await fetch(url, { credentials: "omit" });
        if (!resp.ok) throw new Error(`Failed to load PDF (HTTP ${resp.status})`);
        const arrayBuffer = await resp.arrayBuffer();

        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdfDoc = await loadingTask.promise;
        if (cancelled) return;

        pdfDocRef.current = pdfDoc;
        setPageCount(pdfDoc.numPages);
        await renderPages(1);
        if (!cancelled) setLoading(false);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Failed to load PDF");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      renderTaskRef.current.forEach(t => { try { t.cancel(); } catch {} });
      try { pdfDocRef.current?.destroy?.(); } catch {}
      pdfDocRef.current = null;
    };
  }, [url, renderPages]);

  useEffect(() => {
    if (loading || !pdfDocRef.current) return;
    renderPages(zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  const zoomIn = () => setZoom(z => Math.min(MAX_ZOOM, +(z + 0.25).toFixed(2)));
  const zoomOut = () => setZoom(z => Math.max(MIN_ZOOM, +(z - 0.25).toFixed(2)));
  const zoomReset = () => setZoom(1);
  const zoomPct = Math.round(zoom * 100);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.85)",
        zIndex: 100000,
        display: "flex",
        flexDirection: "column",
        animation: "fadeIn 0.15s ease-out",
      }}
    >
      {/* Toolbar */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 24px",
          background: "#1e293b",
          color: "#fff",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="file-text" size={20} />
          <span style={{ fontSize: 14, fontWeight: 700 }}>{title}</span>
          {pageCount > 0 && !loading && (
            <span style={{ color: "#94a3b8", fontSize: 11 }}>{pageCount}p</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {/* Zoom controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#0f172a", borderRadius: 8, padding: "3px 6px", border: "1px solid #334155" }}>
            <button type="button" onClick={zoomOut} disabled={zoom <= MIN_ZOOM}
              style={{ background: "transparent", border: "none", color: zoom <= MIN_ZOOM ? "#475569" : "#d0d0d0", cursor: zoom <= MIN_ZOOM ? "default" : "pointer", fontSize: 16, fontWeight: 700, padding: "2px 8px" }}>−</button>
            <button type="button" onClick={zoomReset}
              style={{ background: "transparent", border: "none", color: "#d0d0d0", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "2px 8px", minWidth: 44, fontVariantNumeric: "tabular-nums" }}>{zoomPct}%</button>
            <button type="button" onClick={zoomIn} disabled={zoom >= MAX_ZOOM}
              style={{ background: "transparent", border: "none", color: zoom >= MAX_ZOOM ? "#475569" : "#d0d0d0", cursor: zoom >= MAX_ZOOM ? "default" : "pointer", fontSize: 16, fontWeight: 700, padding: "2px 8px" }}>+</button>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 12, fontWeight: 700, color: "#38bdf8",
              textDecoration: "none", display: "flex", alignItems: "center", gap: 6,
              background: "rgba(56,189,248,0.1)", padding: "6px 14px", borderRadius: 6,
              border: "1px solid rgba(56,189,248,0.3)",
            }}
          >
            <Icon name="external-link" size={14} /> Open in new tab
          </a>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
              color: "#fca5a5", cursor: "pointer", fontSize: 13, fontWeight: 700,
              padding: "6px 14px", borderRadius: 6, display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <Icon name="x" size={16} /> Close
          </button>
        </div>
      </div>

      {/* PDF canvas scroll area */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ flex: 1, overflow: "auto", padding: "24px 16px", background: "#1a1a1a" }}
      >
        {loading && (
          <div style={{ textAlign: "center", paddingTop: 80, color: "#a0a0a0" }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Loading PDF...</div>
            <div style={{
              display: "inline-block", width: 36, height: 36,
              border: "3px solid #334155", borderTopColor: "#38bdf8",
              borderRadius: "50%", animation: "spin 1s linear infinite",
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {error && (
          <div style={{ textAlign: "center", paddingTop: 80, color: "#fca5a5" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Failed to load PDF</div>
            <div style={{ fontSize: 13, color: "#a0a0a0" }}>{error}</div>
          </div>
        )}

        <div
          ref={containerRef}
          style={{ maxWidth: 900, margin: "0 auto" }}
        />
      </div>
    </div>
  );
}
