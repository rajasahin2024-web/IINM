"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import {
  ebookFileUrl,
  setEbookChapterCompletion,
  updateEbookProgress,
  type EbookMeta,
  type EbookProgress,
} from "@/lib/studentApi";
import { useCourse } from "../context";
import SIcon from "../../../icons";

/* ────────────────────────────────────────────────────────────
   EbookReader — in-platform PDF reader (no download path).

   - pdf.js renders the private /api/student/ebooks/{id}/file
     bytes onto a canvas (session cookie, no public URL).
   - Single-page book view, fit-width zoom, keyboard paging.
   - TOC sidebar/drawer: jump to chapter, per-chapter complete
     state; a chapter auto-completes when its last page is
     reached (undoable from the TOC).
   - Resume-where-left + chapter completion persist through the
     student ebooks API (debounced writes).
   ──────────────────────────────────────────────────────────── */

const MIN_ZOOM = 0.6;
const MAX_ZOOM = 2;
const SAVE_DEBOUNCE_MS = 1200;

interface ChapterRange {
  index: number;
  title: string;
  startPage: number;
  endPage: number;
}

function chapterRanges(toc: { title: string; page: number }[], numPages: number): ChapterRange[] {
  return toc.map((t, i) => ({
    index: i,
    title: t.title,
    startPage: Math.max(1, Math.min(numPages, t.page)),
    endPage: i + 1 < toc.length ? Math.max(t.page, Math.min(numPages, toc[i + 1].page - 1)) : numPages,
  }));
}

function chapterOfPage(ranges: ChapterRange[], page: number): number {
  let idx = -1;
  for (const r of ranges) {
    if (page >= r.startPage) idx = r.index;
  }
  return idx;
}

export default function EbookReader({ meta }: { meta: EbookMeta }) {
  const { courseId, course, reload } = useCourse();
  const base = `/student/courses/${courseId}`;

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = useRef<Set<number>>(new Set(meta.progress.completedChapters));
  const markingRef = useRef<Set<number>>(new Set());
  const autoMarkedRef = useRef<Set<number>>(new Set());
  const didCompleteReloadRef = useRef(false);

  const [docState, setDocState] = useState<"loading" | "ready" | "error">("loading");
  const [docError, setDocError] = useState("");
  const [numPages, setNumPages] = useState(meta.pageCount ?? 0);
  const [page, setPage] = useState(0); // 1-based once known
  const [pageInput, setPageInput] = useState("");
  const [zoom, setZoom] = useState(1);
  const [stageW, setStageW] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState<EbookProgress>(meta.progress);
  const [tocOpen, setTocOpen] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true
  );
  const [toast, setToast] = useState("");
  const [resumed, setResumed] = useState(false);

  const ranges = useMemo(
    () => chapterRanges(meta.toc, numPages || meta.pageCount || 1),
    [meta.toc, meta.pageCount, numPages]
  );
  const currentChapter = page > 0 ? chapterOfPage(ranges, page) : -1;
  const completedSet = useMemo(() => new Set(progress.completedChapters), [progress]);
  const pagePct = numPages ? Math.round((page / numPages) * 100) : 0;

  /* ── Load pdf.js + document ────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const doc = await pdfjsLib.getDocument({
          url: ebookFileUrl(meta.id),
          withCredentials: true,
        }).promise;
        if (cancelled) {
          try { doc.destroy(); } catch {}
          return;
        }
        pdfRef.current = doc;
        setNumPages(doc.numPages);
        const resume = Math.max(1, Math.min(doc.numPages, meta.progress.lastPage || 1));
        setPage(resume);
        if (resume > 1) setResumed(true);
        setDocState("ready");
      } catch (err: unknown) {
        if (!cancelled) {
          const status = (err as { status?: number; statusCode?: number } | null);
          setDocError(status?.status === 403 || status?.statusCode === 403
            ? "You do not have access to this eBook."
            : "The eBook could not be loaded. Please retry.");
          setDocState("error");
        }
      }
    })();
    return () => {
      cancelled = true;
      try { renderTaskRef.current?.cancel(); } catch {}
      try { pdfRef.current?.destroy?.(); } catch {}
      pdfRef.current = null;
    };
  }, [meta.id, meta.progress.lastPage]);

  /* ── Track the reading stage width for fit-width rendering ── */
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && Math.abs(w - stageW) > 2) setStageW(Math.floor(w));
    });
    ro.observe(el);
    setStageW(Math.floor(el.clientWidth));
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docState]);

  /* ── Render the current page ───────────────────────────── */
  useEffect(() => {
    const pdf = pdfRef.current;
    const canvas = canvasRef.current;
    if (docState !== "ready" || !pdf || !canvas || page < 1) return;
    let cancelled = false;
    (async () => {
      setRendering(true);
      try {
        const p = await pdf.getPage(page);
        if (cancelled) return;
        const avail = Math.max(280, (stageW || stageRef.current?.clientWidth || 800) - 8);
        const baseViewport = p.getViewport({ scale: 1 });
        const scale = (avail / baseViewport.width) * zoom;
        const viewport = p.getViewport({ scale });
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        try { renderTaskRef.current?.cancel(); } catch {}
        const task = p.render({
          canvas,
          viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
        });
        renderTaskRef.current = task;
        await task.promise;
      } catch {
        /* render cancelled */
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [docState, page, zoom, stageW]);

  /* ── Persist resume marker (debounced) ─────────────────── */
  useEffect(() => {
    if (docState !== "ready" || page < 1) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const lastChapter = currentChapter >= 0 ? currentChapter : undefined;
    saveTimerRef.current = setTimeout(() => {
      updateEbookProgress(meta.id, { lastPage: page, lastChapterIndex: lastChapter }).catch(() => {});
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [docState, page, currentChapter, meta.id]);

  /* ── Auto-complete a chapter when its last page is reached ── */
  useEffect(() => {
    if (docState !== "ready" || page < 1 || currentChapter < 0) return;
    const r = ranges[currentChapter];
    if (!r || page < r.endPage) return;
    if (completedRef.current.has(currentChapter) || markingRef.current.has(currentChapter) ||
        autoMarkedRef.current.has(currentChapter)) return;
    autoMarkedRef.current.add(currentChapter);
    markingRef.current.add(currentChapter);
    setEbookChapterCompletion(meta.id, currentChapter, true)
      .then((next) => {
        completedRef.current = new Set(next.completedChapters);
        setProgress(next);
        setToast(`“${r.title}” marked as read`);
        if (next.isComplete && !didCompleteReloadRef.current) {
          didCompleteReloadRef.current = true;
          reload(); // refresh dashboard → locked videos unlock
        }
      })
      .catch(() => autoMarkedRef.current.delete(currentChapter))
      .finally(() => markingRef.current.delete(currentChapter));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docState, page, currentChapter, ranges, meta.id]);

  /* ── Toast auto-dismiss ────────────────────────────────── */
  useEffect(() => {
    if (!toast && !resumed) return;
    const t = setTimeout(() => {
      setToast("");
      setResumed(false);
    }, 2600);
    return () => clearTimeout(t);
  }, [toast, resumed]);

  /* ── Keyboard paging ───────────────────────────────────── */
  const goTo = useCallback(
    (p: number) => {
      if (!numPages) return;
      const next = Math.max(1, Math.min(numPages, p));
      setPage(next);
      setPageInput(String(next));
    },
    [numPages]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        goTo(page + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goTo(page - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        goTo(1);
      } else if (e.key === "End") {
        e.preventDefault();
        goTo(numPages);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, page, numPages]);

  // Keep the page input in sync when navigating by other means.
  useEffect(() => {
    setPageInput(page > 0 ? String(page) : "");
  }, [page]);

  const commitPageInput = () => {
    const n = Number(pageInput);
    if (Number.isFinite(n)) goTo(n);
    else setPageInput(String(page));
  };

  const toggleChapter = (idx: number, done: boolean) => {
    if (markingRef.current.has(idx)) return;
    markingRef.current.add(idx);
    setEbookChapterCompletion(meta.id, idx, done)
      .then((next) => {
        completedRef.current = new Set(next.completedChapters);
        setProgress(next);
        if (next.isComplete && !didCompleteReloadRef.current) {
          didCompleteReloadRef.current = true;
          reload();
        }
      })
      .catch(() => setToast("Could not update the chapter"))
      .finally(() => markingRef.current.delete(idx));
  };

  const zoomIn = () => setZoom((z) => Math.min(MAX_ZOOM, +(z + 0.15).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(MIN_ZOOM, +(z - 0.15).toFixed(2)));

  const chapterDoneCount = progress.completedChapters.length;
  const chapterTotal = progress.totalChapters || ranges.length;
  const currentRange = currentChapter >= 0 ? ranges[currentChapter] : null;
  const atChapterEnd = !!currentRange && page >= currentRange.endPage;
  const nextRange = currentChapter >= 0 && currentChapter + 1 < ranges.length ? ranges[currentChapter + 1] : null;

  return (
    <div className="stu-reader">
      {/* ── Sticky toolbar head ── */}
      <div className="stu-reader-head">
        <div className="stu-reader-bar">
        <button
          type="button"
          className={`stu-reader-tool ${tocOpen ? "on" : ""}`}
          onClick={() => setTocOpen((o) => !o)}
          aria-expanded={tocOpen}
          aria-label="Toggle table of contents"
          title="Contents"
        >
          <SIcon name="list" size={18} />
        </button>
        <div className="stu-reader-titlewrap">
          <span className="stu-reader-kicker">eBook</span>
          <span className="stu-reader-title">{meta.title}</span>
        </div>
        <div className="stu-reader-pager" role="navigation" aria-label="Page navigation">
          <button
            type="button"
            className="stu-reader-tool"
            onClick={() => goTo(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <SIcon name="chevron-left" size={17} />
          </button>
          <span className="stu-reader-pageind">
            <input
              className="stu-reader-pageinput"
              value={pageInput}
              inputMode="numeric"
              aria-label="Page number"
              onChange={(e) => setPageInput(e.target.value.replace(/[^0-9]/g, ""))}
              onBlur={commitPageInput}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitPageInput();
              }}
            />
            <span className="stu-reader-pagetotal">/ {numPages || "—"}</span>
          </span>
          <button
            type="button"
            className="stu-reader-tool"
            onClick={() => goTo(page + 1)}
            disabled={!numPages || page >= numPages}
            aria-label="Next page"
          >
            <SIcon name="chevron-right" size={17} />
          </button>
        </div>
        <div className="stu-reader-zoom">
          <button
            type="button"
            className="stu-reader-tool"
            onClick={zoomOut}
            disabled={zoom <= MIN_ZOOM}
            aria-label="Zoom out"
          >
            <SIcon name="minus" size={16} />
          </button>
          <button
            type="button"
            className="stu-reader-zoompct"
            onClick={() => setZoom(1)}
            title="Reset zoom"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            className="stu-reader-tool"
            onClick={zoomIn}
            disabled={zoom >= MAX_ZOOM}
            aria-label="Zoom in"
          >
            <SIcon name="plus" size={16} />
          </button>
        </div>
      </div>

        {/* ── Reading progress hairline ── */}
        <div
          className="stu-reader-track"
          role="progressbar"
          aria-valuenow={pagePct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Reading progress"
        >
          <div className="stu-reader-trackfill" style={{ width: `${pagePct}%` }} />
        </div>
      </div>

      <div className="stu-reader-body">
        {/* ── TOC sidebar / drawer ── */}
        {tocOpen && <button type="button" className="stu-reader-scrim" aria-label="Close contents" onClick={() => setTocOpen(false)} />}
        <aside className={`stu-reader-toc ${tocOpen ? "open" : ""}`} aria-label="Table of contents">
          <div className="stu-reader-tochead">
            <span className="stu-reader-tochead-title">Contents</span>
            <button
              type="button"
              className="stu-reader-tool stu-reader-tocclose"
              onClick={() => setTocOpen(false)}
              aria-label="Close contents"
            >
              <SIcon name="close" size={16} />
            </button>
          </div>

          {ranges.length === 0 ? (
            <p className="stu-reader-tocempty">No chapter list for this eBook.</p>
          ) : (
            <ul className="stu-reader-toclist">
              {ranges.map((r) => {
                const done = completedSet.has(r.index);
                const active = r.index === currentChapter;
                return (
                  <li key={r.index}>
                    <div className={`stu-reader-tocrow ${active ? "active" : ""} ${done ? "done" : ""}`}>
                      <button
                        type="button"
                        className="stu-reader-tocjump"
                        onClick={() => {
                          goTo(r.startPage);
                          if (window.innerWidth < 1024) setTocOpen(false);
                        }}
                        aria-current={active ? "true" : undefined}
                      >
                        <span className="stu-reader-tocdot" aria-hidden="true">
                          {done ? <SIcon name="check" size={12} /> : null}
                        </span>
                        <span className="stu-reader-toctitle">{r.title}</span>
                        <span className="stu-reader-tocpage">p. {r.startPage}</span>
                      </button>
                      <button
                        type="button"
                        className={`stu-reader-tocmark ${done ? "done" : ""}`}
                        onClick={() => toggleChapter(r.index, !done)}
                        aria-label={done ? `Mark "${r.title}" as unread` : `Mark "${r.title}" as read`}
                        title={done ? "Mark as unread" : "Mark as read"}
                      >
                        <SIcon name={done ? "check-circle" : "check"} size={15} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="stu-reader-tocfoot">
            <div className="stu-reader-tocprog">
              <span>
                {chapterTotal > 0 ? `${chapterDoneCount}/${chapterTotal} chapters` : `${pagePct}% read`}
              </span>
              {chapterTotal > 0 && <span>{Math.round((chapterDoneCount / chapterTotal) * 100)}%</span>}
            </div>
            <div className="stu-progress-track" aria-hidden="true">
              <div
                className="stu-progress-fill"
                style={{ width: `${chapterTotal ? (chapterDoneCount / chapterTotal) * 100 : pagePct}%` }}
              />
            </div>
            {progress.isComplete && (
              <span className="stu-reader-tocdone">
                <SIcon name="check-circle" size={14} /> eBook complete
              </span>
            )}
          </div>
        </aside>

        {/* ── Page stage ── */}
        <div className="stu-reader-stage" ref={stageRef}>
          {docState === "loading" && (
            <div className="stu-reader-status" aria-busy="true">
              <div className="stu-spinner" />
              <p>Opening your eBook…</p>
            </div>
          )}
          {docState === "error" && (
            <div className="stu-reader-status" role="alert">
              <SIcon name="cloud-off" size={38} />
              <p className="stu-reader-errtitle">Couldn&apos;t open the eBook</p>
              <p className="stu-reader-errsub">{docError}</p>
              <button type="button" className="stu-btn-primary" onClick={() => window.location.reload()}>
                Retry
              </button>
            </div>
          )}
          <canvas
            ref={canvasRef}
            className={`stu-reader-canvas ${docState === "ready" ? "" : "hidden"}`}
            aria-label={`Page ${page} of ${meta.title}`}
          />
          {docState === "ready" && rendering && (
            <div className="stu-reader-rendering" aria-hidden="true">
              <div className="stu-spinner" />
            </div>
          )}

          {/* Chapter-end / completion affordance */}
          {docState === "ready" && !rendering && (
            <div className="stu-reader-footbar">
              {progress.isComplete && page === numPages ? (
                <div className="stu-reader-finish">
                  <SIcon name="award" size={22} />
                  <div className="stu-reader-finish-meta">
                    <span className="stu-reader-finish-title">You finished {meta.title}</span>
                    <span className="stu-reader-finish-sub">
                      {course.courseType === "ebook_video"
                        ? "Recorded videos are now unlocked."
                        : "Well done — check your exams for the course mock test."}
                    </span>
                  </div>
                  {course.courseType === "ebook_video" ? (
                    <Link href={`${base}/content`} className="stu-reader-finishcta">
                      Watch videos
                      <SIcon name="arrow-right" size={15} />
                    </Link>
                  ) : (
                    <Link href={`${base}/exams`} className="stu-reader-finishcta">
                      Go to exams
                      <SIcon name="arrow-right" size={15} />
                    </Link>
                  )}
                </div>
              ) : atChapterEnd && completedSet.has(currentChapter) && nextRange ? (
                <button type="button" className="stu-reader-nextch" onClick={() => goTo(nextRange.startPage)}>
                  <span className="stu-reader-nextch-meta">
                    <span className="stu-reader-nextch-kicker">
                      <SIcon name="check-circle" size={14} /> Chapter complete — up next
                    </span>
                    <span className="stu-reader-nextch-title">{nextRange.title}</span>
                  </span>
                  <SIcon name="arrow-right" size={17} />
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* ── Toast / resume notice ── */}
      {(toast || resumed) && (
        <div className="stu-reader-toast" role="status">
          <SIcon name={toast ? "check-circle" : "bookmark"} size={15} />
          {toast || `Resumed where you left off — page ${page}`}
        </div>
      )}
    </div>
  );
}
