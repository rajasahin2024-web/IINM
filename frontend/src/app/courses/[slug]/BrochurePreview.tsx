"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { API_BASE_URL } from "@/lib/config";

/* ─────────────────────────────────────────
   BrochurePreview
   Full-screen PDF.js canvas viewer — Adobe-style.
   - Zoom in / out / reset / fit-width
   - Pinch-to-zoom on touch devices
   - Fully mobile-optimised toolbar
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

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const BASE_SCALE = 1.5;

export default function BrochurePreview({ pdfUrl, courseId, phone, onClose }: BrochurePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<any>(null);
  const renderTaskRef = useRef<any[]>([]);
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(1);          // multiplier on BASE_SCALE
  const [fitWidth, setFitWidth] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Resolve full URL — prefer backend proxy for CORS + inline disposition
  const resolvedUrl = pdfUrl.startsWith("http")
    ? pdfUrl
    : `${API_BASE_URL}/api/public/courses/${courseId}/brochure-pdf`;

  // ── Detect mobile ──
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Anti-download keyboard / context menu blocking ──
  useEffect(() => {
    const blockContext = (e: MouseEvent) => e.preventDefault();
    const blockKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S" || e.key === "p" || e.key === "P")) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (e.key === "F12") { e.preventDefault(); e.stopPropagation(); }
      if (e.key === "PrintScreen") {
        e.preventDefault();
        try { navigator.clipboard?.writeText(""); } catch {}
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "C" || e.key === "c")) {
        e.preventDefault(); e.stopPropagation();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "u" || e.key === "U")) {
        e.preventDefault(); e.stopPropagation();
      }
    };
    document.addEventListener("contextmenu", blockContext);
    document.addEventListener("keydown", blockKeys, true);
    return () => {
      document.removeEventListener("contextmenu", blockContext);
      document.removeEventListener("keydown", blockKeys, true);
    };
  }, []);

  // ── Render all pages at current zoom ──
  const renderPages = useCallback(async (scaleMultiplier: number) => {
    const pdfDoc = pdfDocRef.current;
    const container = containerRef.current;
    if (!pdfDoc || !container) return;

    // Cancel any in-flight renders
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
      canvas.style.boxShadow = "0 4px 20px rgba(0,0,0,0.5)";
      canvas.style.userSelect = "none";
      canvas.style.pointerEvents = "none";
      canvas.style.borderRadius = "2px";
      canvas.style.background = "#fff";
      container.appendChild(canvas);

      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      ctx.scale(ratio, ratio);

      const task = page.render({ canvasContext: ctx, viewport });
      renderTaskRef.current.push(task);
      try {
        await task.promise;
        setCurrentPage(i);
      } catch { /* cancelled */ }
    }
  }, []);

  // ── Fit-to-width calculation ──
  const computeFitZoom = useCallback(() => {
    const pdfDoc = pdfDocRef.current;
    const scroll = scrollRef.current;
    if (!pdfDoc || !scroll) return 1;
    // Use first page to determine width ratio
    return pdfDoc.getPage(1).then((page: any) => {
      const vp = page.getViewport({ scale: 1 });
      const avail = scroll.clientWidth - 32; // padding
      const fit = avail / vp.width;
      // Clamp
      return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, fit / BASE_SCALE));
    });
  }, []);

  // ── Load PDF ──
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const pdfjsLib: any = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const resp = await fetch(resolvedUrl, { credentials: "omit" });
        if (!resp.ok) throw new Error(`Failed to load PDF (HTTP ${resp.status})`);
        const arrayBuffer = await resp.arrayBuffer();

        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdfDoc = await loadingTask.promise;
        if (cancelled) return;

        pdfDocRef.current = pdfDoc;
        setPageCount(pdfDoc.numPages);

        // Initial render — 100% on all devices
        setZoom(1);
        setFitWidth(false);
        await renderPages(1);
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
      renderTaskRef.current.forEach(t => { try { t.cancel(); } catch {} });
      try { pdfDocRef.current?.destroy?.(); } catch {}
      pdfDocRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedUrl]);

  // ── Re-render when zoom changes (not on initial load) ──
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    if (!pdfDocRef.current || loading) return;
    renderPages(zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  // ── Zoom controls ──
  const zoomIn = () => { setFitWidth(false); setZoom(z => Math.min(MAX_ZOOM, +(z + 0.25).toFixed(2))); };
  const zoomOut = () => { setFitWidth(false); setZoom(z => Math.max(MIN_ZOOM, +(z - 0.25).toFixed(2))); };
  const zoomReset = async () => {
    setZoom(1);
    setFitWidth(false);
  };
  const zoomFit = async () => {
    const fz = await computeFitZoom();
    setZoom(fz);
    setFitWidth(true);
  };

  // ── Pinch-to-zoom (touch) ──
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const getDist = (touches: TouchList) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.hypot(dx, dy);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        pinchRef.current = { dist: getDist(e.touches), scale: zoom };
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        const dist = getDist(e.touches);
        const ratio = dist / pinchRef.current.dist;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, +(pinchRef.current.scale * ratio).toFixed(2)));
        setFitWidth(false);
        setZoom(newZoom);
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchRef.current = null;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [zoom]);

  // ── Wheel zoom (Ctrl+wheel on desktop) ──
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setFitWidth(false);
        setZoom(z => {
          const next = z + (e.deltaY < 0 ? 0.15 : -0.15);
          return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, +next.toFixed(2)));
        });
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ── Watermark text ──
  const watermarkText = `${phone}  •  ${new Date().toLocaleString("en-IN")}`;
  const zoomPct = Math.round(zoom * 100);

  // ── Icon components ──
  const IconPlus = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
  );
  const IconMinus = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/></svg>
  );
  const IconFit = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
  );
  const IconClose = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#1a1a1a",
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        userSelect: "none",
        touchAction: "none",
      }}
    >
      {/* ── Adobe-style Top Toolbar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isMobile ? "8px 10px" : "8px 16px",
          background: "#2b2b2b",
          borderBottom: "1px solid #404040",
          flexShrink: 0,
          gap: isMobile ? 6 : 12,
        }}
      >
        {/* Left: brand */}
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 10, minWidth: 0, flexShrink: 1 }}>
          <span style={{
            color: "#e63946",
            fontSize: isMobile ? 15 : 17,
            fontWeight: 900,
            letterSpacing: 0.5,
            flexShrink: 0,
          }}>IINM</span>
          {!isMobile && (
            <span style={{ color: "#a0a0a0", fontSize: 12, fontWeight: 500, whiteSpace: "nowrap" }}>
              Brochure
            </span>
          )}
          {pageCount > 0 && !loading && (
            <span style={{
              color: "#707070",
              fontSize: isMobile ? 10 : 11,
              whiteSpace: "nowrap",
            }}>
              {pageCount}p
            </span>
          )}
        </div>

        {/* Center: Zoom controls (Adobe style) */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 2 : 4,
          background: "#1a1a1a",
          borderRadius: 8,
          padding: isMobile ? "2px" : "3px 6px",
          border: "1px solid #404040",
        }}>
          <button
            onClick={zoomOut}
            disabled={zoom <= MIN_ZOOM}
            aria-label="Zoom out"
            style={{
              ...toolBtnStyle,
              opacity: zoom <= MIN_ZOOM ? 0.35 : 1,
              cursor: zoom <= MIN_ZOOM ? "default" : "pointer",
              padding: isMobile ? "5px" : "6px",
            }}
          >
            <IconMinus />
          </button>

          <button
            onClick={zoomReset}
            aria-label="Reset zoom"
            style={{
              background: "transparent",
              border: "none",
              color: "#d0d0d0",
              fontSize: isMobile ? 11 : 12,
              fontWeight: 600,
              cursor: "pointer",
              padding: isMobile ? "2px 6px" : "4px 10px",
              minWidth: isMobile ? 38 : 48,
              textAlign: "center",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {zoomPct}%
          </button>

          <button
            onClick={zoomIn}
            disabled={zoom >= MAX_ZOOM}
            aria-label="Zoom in"
            style={{
              ...toolBtnStyle,
              opacity: zoom >= MAX_ZOOM ? 0.35 : 1,
              cursor: zoom >= MAX_ZOOM ? "default" : "pointer",
              padding: isMobile ? "5px" : "6px",
            }}
          >
            <IconPlus />
          </button>

          {/* Divider */}
          <div style={{ width: 1, height: 18, background: "#404040", margin: "0 2px" }} />

          {/* Fit width */}
          <button
            onClick={zoomFit}
            aria-label="Fit to width"
            style={{
              ...toolBtnStyle,
              background: fitWidth ? "rgba(230,57,70,0.2)" : "transparent",
              color: fitWidth ? "#e63946" : "#d0d0d0",
              padding: isMobile ? "5px" : "6px",
            }}
          >
            <IconFit />
          </button>
        </div>

        {/* Right: close */}
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 10, flexShrink: 0 }}>
          {!isMobile && (
            <span style={{ color: "#606060", fontSize: 10, fontStyle: "italic", whiteSpace: "nowrap" }}>
              Preview only
            </span>
          )}
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "#e63946",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: isMobile ? "6px 10px" : "7px 14px",
              fontSize: isMobile ? 12 : 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <IconClose />
            {!isMobile && "Close"}
          </button>
        </div>
      </div>

      {/* ── PDF Canvas Scroll Area ── */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflow: "auto",
          padding: isMobile ? "12px 8px" : "24px 16px",
          position: "relative",
          WebkitOverflowScrolling: "touch",
          touchAction: "auto",
        }}
        className="cd-pdf-scroll"
      >
        <style>{`
          .cd-pdf-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
          .cd-pdf-scroll::-webkit-scrollbar-track { background: transparent; }
          .cd-pdf-scroll::-webkit-scrollbar-thumb { background: #555; border-radius: 10px; }
          .cd-pdf-scroll::-webkit-scrollbar-thumb:hover { background: #777; }
          .cd-pdf-scroll { scrollbar-width: thin; scrollbar-color: #555 transparent; }
        `}</style>
        {/* Watermark overlay */}
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
                color: "rgba(230, 57, 70, 0.07)",
                fontSize: isMobile ? 11 : 14,
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
          <div style={{ textAlign: "center", paddingTop: isMobile ? 60 : 80, color: "#a0a0a0" }}>
            <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 600, marginBottom: 12 }}>
              Loading brochure{currentPage > 0 ? ` (page ${currentPage}...)` : "..."}
            </div>
            <div style={{
              display: "inline-block",
              width: 36, height: 36,
              border: "3px solid #404040",
              borderTopColor: "#e63946",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {error && (
          <div style={{ textAlign: "center", paddingTop: isMobile ? 60 : 80, color: "#e63946" }}>
            <div style={{ fontSize: isMobile ? 15 : 16, fontWeight: 700, marginBottom: 8 }}>Failed to load brochure</div>
            <div style={{ fontSize: isMobile ? 12 : 13, color: "#a0a0a0" }}>{error}</div>
          </div>
        )}

        <div
          ref={containerRef}
          style={{
            maxWidth: 900,
            margin: "0 auto",
            position: "relative",
            zIndex: 2,
          }}
        />
      </div>

      {/* ── Mobile pinch hint ── */}
      {isMobile && !loading && !error && (
        <div style={{
          textAlign: "center",
          padding: "6px 12px",
          background: "#2b2b2b",
          borderTop: "1px solid #404040",
          color: "#606060",
          fontSize: 10,
          flexShrink: 0,
        }}>
          Pinch to zoom • Two fingers to zoom in/out
        </div>
      )}
    </div>
  );
}

// ── Shared button style ──
const toolBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#d0d0d0",
  borderRadius: 5,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "background 0.15s, color 0.15s",
};
