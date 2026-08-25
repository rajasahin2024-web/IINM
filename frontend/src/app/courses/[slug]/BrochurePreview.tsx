"use client";

import React, { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "@/lib/config";

/* ─────────────────────────────────────────
   BrochurePreview
   Full-screen PDF.js canvas viewer.
   - No download button, no toolbar
   - Right-click blocked
   - Ctrl+S / Ctrl+P / PrintScreen / F12 blocked
   - Watermark overlay (phone + timestamp)
   - Scrollable, all pages rendered as canvas
───────────────────────────────────────── */

interface BrochurePreviewProps {
  pdfUrl: string;          // can be relative (/api/...) or absolute
  courseId: number;
  phone: string;           // for watermark
  onClose: () => void;
}

export default function BrochurePreview({ pdfUrl, courseId, phone, onClose }: BrochurePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);

  // Resolve full URL — prefer backend proxy for CORS + inline disposition
  const resolvedUrl = pdfUrl.startsWith("http")
    ? pdfUrl
    : `${API_BASE_URL}/api/public/courses/${courseId}/brochure-pdf`;

  // ── Anti-download keyboard / context menu blocking ──
  useEffect(() => {
    const blockContext = (e: MouseEvent) => e.preventDefault();
    const blockKeys = (e: KeyboardEvent) => {
      // Block Ctrl/Cmd + S (save), P (print), Shift+S
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S" || e.key === "p" || e.key === "P")) {
        e.preventDefault();
        e.stopPropagation();
      }
      // Block F12 (devtools)
      if (e.key === "F12") {
        e.preventDefault();
        e.stopPropagation();
      }
      // Block PrintScreen — clear clipboard
      if (e.key === "PrintScreen") {
        e.preventDefault();
        try {
          navigator.clipboard?.writeText("");
        } catch {}
      }
      // Block Ctrl+Shift+I / Ctrl+Shift+C / Ctrl+U
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "C" || e.key === "c")) {
        e.preventDefault();
        e.stopPropagation();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "u" || e.key === "U")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener("contextmenu", blockContext);
    document.addEventListener("keydown", blockKeys, true);
    return () => {
      document.removeEventListener("contextmenu", blockContext);
      document.removeEventListener("keydown", blockKeys, true);
    };
  }, []);

  // ── Render PDF with PDF.js ──
  useEffect(() => {
    let cancelled = false;
    let pdfDoc: any = null;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        // Dynamic import to keep pdfjs out of SSR
        const pdfjsLib: any = await import("pdfjs-dist");

        // Configure worker — use CDN matching installed version
        const workerVersion = pdfjsLib.version;
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${workerVersion}/pdf.worker.min.mjs`;

        // Fetch PDF as ArrayBuffer (avoids exposing direct URL + handles CORS via proxy)
        const resp = await fetch(resolvedUrl, { credentials: "omit" });
        if (!resp.ok) {
          throw new Error(`Failed to load PDF (HTTP ${resp.status})`);
        }
        const arrayBuffer = await resp.arrayBuffer();

        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        pdfDoc = await loadingTask.promise;
        if (cancelled) return;

        setPageCount(pdfDoc.numPages);
        const container = containerRef.current;
        if (!container) return;

        // Clear any previous content
        container.innerHTML = "";

        // Render each page to a canvas
        for (let i = 1; i <= pdfDoc.numPages; i++) {
          if (cancelled) return;
          const page = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.display = "block";
          canvas.style.margin = "0 auto 16px";
          canvas.style.maxWidth = "100%";
          canvas.style.height = "auto";
          canvas.style.boxShadow = "0 4px 24px rgba(0,0,0,0.4)";
          canvas.style.userSelect = "none";
          canvas.style.pointerEvents = "none"; // prevent text selection on canvas
          container.appendChild(canvas);

          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport }).promise;
          setCurrentPage(i);
        }

        if (!cancelled) setLoading(false);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Failed to load brochure PDF");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      try { pdfDoc?.destroy?.(); } catch {}
    };
  }, [resolvedUrl]);

  // ── Watermark text ──
  const watermarkText = `${phone}  •  ${new Date().toLocaleString("en-IN")}`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#0a1628",
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        userSelect: "none",
      }}
    >
      {/* ── Top Bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 24px",
          background: "#0a1628",
          borderBottom: "1px solid #1e293b",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#e63946", fontSize: 18, fontWeight: 900 }}>IINM</span>
          <span style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600 }}>Course Brochure Preview</span>
          {pageCount > 0 && !loading && (
            <span style={{ color: "#64748b", fontSize: 12 }}>
              {pageCount} page{pageCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: "#475569", fontSize: 11, fontStyle: "italic" }}>
            Preview only — download &amp; screenshot disabled
          </span>
          <button
            onClick={onClose}
            style={{
              background: "#e63946",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 20px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            Close
          </button>
        </div>
      </div>

      {/* ── PDF Canvas Container ── */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "24px 16px",
          position: "relative",
        }}
      >
        {/* Watermark overlay — repeated, semi-transparent, non-interactive */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 1,
            overflow: "hidden",
          }}
        >
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: `${(i % 10) * 10 + 5}%`,
                left: `${(Math.floor(i / 10) * 30) + 5}%`,
                transform: "rotate(-30deg)",
                color: "rgba(230, 57, 70, 0.08)",
                fontSize: 14,
                fontWeight: 700,
                whiteSpace: "nowrap",
                userSelect: "none",
              }}
            >
              {watermarkText}
            </div>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign: "center", paddingTop: 80, color: "#94a3b8" }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
              Loading brochure{currentPage > 0 ? ` (page ${currentPage}...)` : "..."}
            </div>
            <div style={{ display: "inline-block", width: 40, height: 40, border: "3px solid #1e293b", borderTopColor: "#e63946", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {error && (
          <div style={{ textAlign: "center", paddingTop: 80, color: "#e63946" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Failed to load brochure</div>
            <div style={{ fontSize: 13, color: "#94a3b8" }}>{error}</div>
          </div>
        )}

        <div
          ref={containerRef}
          style={{ maxWidth: 900, margin: "0 auto", position: "relative", zIndex: 2 }}
        />
      </div>
    </div>
  );
}
