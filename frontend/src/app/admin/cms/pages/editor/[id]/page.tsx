"use client";
import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL, BASE_URL } from "@/lib/config";
import { AdminProvider } from "../../../../components/ProtectedAdmin";

// TinyMCE is a heavy client-side library; load it lazily (client-only).
const RichEditor = dynamic(() => import("@/components/RichEditor"), {
  ssr: false,
  loading: () => (
    <div style={{ height: 450, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 14 }}>
      Loading editor…
    </div>
  ),
});

/* ─── Theme ─── */
const C = {
  navy: "#0a1628",
  red: "#e63946",
  gray50: "#f8fafc",
  gray100: "#f1f5f9",
  gray200: "#e2e8f0",
  gray400: "#94a3b8",
  gray500: "#64748b",
  gray600: "#475569",
  gray900: "#0f172a",
};

/* ─── Field label ─── */
const FL = ({ children }: { children: React.ReactNode }) => (
  <label style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, display: "block" }}>{children}</label>
);

/* ─── Input style ─── */
const inputSx: React.CSSProperties = {
  width: "100%", border: `1px solid ${C.gray200}`, borderRadius: 4,
  padding: "8px 11px", fontSize: 13, outline: "none",
  fontFamily: "inherit", boxSizing: "border-box",
};

/* ─── Copy URL ─── */
function CopyUrl({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : BASE_URL;
  const fullUrl = `${origin}/page/${slug}`;
  if (!slug) return null;
  return (
    <button
      onClick={async () => { try { await navigator.clipboard.writeText(fullUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} }}
      title={`Copy ${fullUrl}`}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        background: "transparent", border: `1px solid ${C.gray200}`,
        borderRadius: 4, padding: "4px 8px", fontSize: 11.5,
        color: copied ? "#166534" : C.gray600, cursor: "pointer",
        fontWeight: 600,
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="9" y="9" width="13" height="13" rx="1"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      {copied ? "Copied" : "Copy URL"}
    </button>
  );
}

/* ─── Featured Image Drag & Drop ─── */
function FeaturedImagePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const readFile = (file: File) => { const r = new FileReader(); r.onload = e => onChange(e.target?.result as string); r.readAsDataURL(file); };
  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f?.type.startsWith("image/")) readFile(f); };
  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !value && fileRef.current?.click()}
        style={{
          border: `1px dashed ${dragging ? C.navy : C.gray400}`,
          borderRadius: 4, padding: value ? 0 : "18px 10px",
          textAlign: "center", cursor: value ? "default" : "pointer",
          background: dragging ? "#f0f4ff" : C.gray50,
          transition: "all 0.15s", overflow: "hidden",
        }}
      >
        {value ? (
          <div style={{ position: "relative" }}>
            <img src={value} alt="" style={{ width: "100%", maxHeight: 140, objectFit: "cover", display: "block" }} />
            <button onClick={e => { e.stopPropagation(); onChange(""); }} style={{ position: "absolute", top: 5, right: 5, background: "rgba(0,0,0,0.65)", color: "#fff", border: "none", borderRadius: 3, width: 22, height: 22, cursor: "pointer", fontSize: 12 }}>✕</button>
            <button onClick={e => { e.stopPropagation(); fileRef.current?.click(); }} style={{ position: "absolute", bottom: 5, right: 5, background: "rgba(0,0,0,0.65)", color: "#fff", border: "none", borderRadius: 3, padding: "2px 6px", cursor: "pointer", fontSize: 10 }}>Change</button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 24, marginBottom: 4 }}>🖼️</div>
            <div style={{ fontSize: 12, color: C.gray500, fontWeight: 600 }}>Drop image here or click</div>
            <div style={{ fontSize: 11, color: C.gray400 }}>Optional featured image</div>
          </>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) readFile(f); }} />
      <input value={value.startsWith("data:") ? "" : value} onChange={e => onChange(e.target.value)} placeholder="…or paste image URL" style={{ ...inputSx, fontSize: 12, marginTop: 6, color: C.gray500 }} />
    </div>
  );
}

/* ─── Main Editor ─── */
function PageEditor() {
  const router = useRouter();
  const params = useParams();
  const pageId = params?.id as string;
  const isNew = pageId === "new";

  const titleRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [pageData, setPageData] = useState<any>(null);

  /* Form state */
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [featImg, setFeatImg] = useState("");
  const [status, setStatus] = useState<"draft"|"published"|"archived">("draft");
  const [publishedAt, setPublishedAt] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");
  const [seoKw, setSeoKw] = useState("");
  const [showInSitemap, setShowInSitemap] = useState(true);
  const [content, setContent] = useState("");

  const [modalConfig, setModalConfig] = useState<{ title: string; message: string; type: "alert" | "confirm"; onConfirm?: () => void } | null>(null);
  const customAlert = useCallback((message: string, title = "Notice") => { setModalConfig({ title, message, type: "alert" }); }, []);

  useEffect(() => {
    if (slugEdited) return;
    const auto = (title || "").toLowerCase().trim()
      .replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
    setSlug(auto);
  }, [title, slugEdited]);

  useEffect(() => {
    if (isNew) { setLoaded(true); return; }
    apiFetch(`${API_BASE_URL}/pages/${pageId}`)
      .then(r => r.ok ? r.json() : null)
      .then(p => {
        if (!p) return;
        setPageData(p);
        setTitle(p.title);
        setSlug(p.slug);
        setSlugEdited(true);
        setExcerpt(p.excerpt ?? "");
        setFeatImg(p.featured_image ?? "");
        setStatus(p.status);
        setShowInSitemap(p.show_in_sitemap ?? true);
        if (p.published_at) { const d = new Date(p.published_at); setPublishedAt(d.toISOString().slice(0, 16)); }
        setSeoTitle(p.seo_title ?? "");
        setSeoDesc(p.seo_description ?? "");
        setSeoKw(p.seo_keywords ?? "");
        setContent(p.content ?? "");
        setLoaded(true);
      });
  }, [pageId, isNew]);

  /* Populate title DOM once it exists (TinyMCE manages its own content) */
  useLayoutEffect(() => {
    if (!pageData) return;
    if (titleRef.current) titleRef.current.innerText = pageData.title || "";
  }, [pageData, loaded]);

  const save = useCallback(async (overrideStatus?: "draft" | "published" | "archived") => {
    const currentTitle = (titleRef.current?.innerText || title).trim();
    if (!currentTitle) { setSaveMsg("⚠️ Title is required"); return; }
    setSaving(true); setSaveMsg("");
    const htmlContent = content;
    const body = {
      title: currentTitle,
      slug: slug.trim() || undefined,
      excerpt: excerpt || null,
      content: htmlContent,
      featured_image: featImg || null,
      status: overrideStatus ?? status,
      seo_title: seoTitle || null,
      seo_description: seoDesc || null,
      seo_keywords: seoKw || null,
      show_in_sitemap: showInSitemap,
      published_at: publishedAt ? new Date(publishedAt).toISOString() : null,
    };
    try {
      const url = isNew ? `${API_BASE_URL}/pages` : `${API_BASE_URL}/pages/${pageId}`;
      const method = isNew ? "POST" : "PUT";
      const res = await apiFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) {
        const data = await res.json();
        setSaveMsg("✅ Saved");
        if (data.slug) setSlug(data.slug);
        if (isNew) router.replace(`/admin/cms/pages/editor/${data.id}`);
        if (overrideStatus) setStatus(overrideStatus);
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveMsg(`❌ ${err.detail || "Save failed"}`);
      }
    } catch { setSaveMsg("❌ Network error"); }
    finally { setSaving(false); }
  }, [title, slug, excerpt, featImg, status, publishedAt, seoTitle, seoDesc, seoKw, showInSitemap, content, isNew, pageId, router]);

  useEffect(() => {
    if (!loaded || isNew) return;
    const t = setInterval(() => save(), 60_000);
    return () => clearInterval(t);
  }, [loaded, isNew, save]);

  if (!loaded) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: C.gray50, color: C.gray400, fontSize: 14 }}>Loading editor…</div>;

  const publicUrl = slug ? `${BASE_URL}/page/${slug}` : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: C.gray50 }}>
      <style>{`
        .sidebar-section { background: #fff; border: 1px solid ${C.gray200}; border-radius: 4px; padding: 14px; margin-bottom: 10px; }
        select, textarea, input { border-radius: 4px; }
        select:focus, textarea:focus, input:focus { outline: none; border-color: ${C.navy} !important; box-shadow: 0 0 0 2px rgba(10,22,40,0.08) !important; }
        .status-pill { display: flex; gap: 2px; padding: 2px; background: ${C.gray100}; border-radius: 4px; }
        .status-pill button { border: none; border-radius: 3px; padding: 7px 10px; font-size: 12px; font-weight: 700; cursor: pointer; flex: 1; }
        .editor-topbar { background: #fff; border-bottom: 1px solid ${C.gray200}; padding: 0 20px; height: 54px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; z-index: 10; }
        @media (max-width: 900px) {
          .editor-topbar { height: auto; padding: 10px 14px; flex-direction: column; align-items: flex-start !important; gap: 10px; }
          .editor-layout { flex-direction: column !important; overflow: visible !important; height: auto !important; }
          .editor-main { max-width: 100% !important; padding: 16px !important; }
          .editor-sidebar { width: 100% !important; border-left: none !important; border-top: 1px solid ${C.gray200} !important; padding: 14px !important; }
          .editor-title { font-size: 28px !important; }
          .editor-toolbar { flex-wrap: wrap; }
        }
      `}</style>

      {/* ── Top Action Bar ── */}
      <div className="editor-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.push("/admin/cms/pages")} style={{ background: "none", border: "none", cursor: "pointer", color: C.gray500, fontSize: 18, padding: "4px 8px", borderRadius: 4 }}>←</button>
          <div>
            <span style={{ fontSize: 14, fontWeight: 800, color: C.gray900 }}>{isNew ? "New Page" : "Edit Page"}</span>
            {saveMsg && <span style={{ fontSize: 12, marginLeft: 10, color: saveMsg.startsWith("✅") ? "#166534" : saveMsg.startsWith("⚠️") ? "#854d0e" : "#991b1b" }}>{saveMsg}</span>}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 4, background: status === "published" ? "#dcfce7" : status === "archived" ? C.gray100 : "#fef9c3", color: status === "published" ? "#166534" : status === "archived" ? C.gray500 : "#854d0e", fontWeight: 700 }}>
            {status}
          </span>
          <button onClick={() => save()} disabled={saving} style={{ background: C.gray100, color: C.gray600, border: "none", borderRadius: 4, padding: "7px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {saving ? "Saving…" : "Save Draft"}
          </button>
          <button onClick={() => save("published")} disabled={saving} style={{ background: C.navy, color: "#fff", border: "none", borderRadius: 4, padding: "7px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Publish
          </button>
        </div>
      </div>

      {/* ── Editor + Sidebar ── */}
      <div className="editor-layout" style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Main */}
        <div className="editor-main" style={{ flex: 1, overflowY: "auto", padding: "28px 36px 60px", maxWidth: "calc(100% - 300px)" }}>
          {/* Public URL */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, fontSize: 12, color: C.gray500, flexWrap: "wrap" }}>
            {slug ? (
              <>
                <span style={{ fontFamily: "monospace" }}>{publicUrl}</span>
                <CopyUrl slug={slug} />
              </>
            ) : <span style={{ color: C.gray400 }}>Public URL will appear after you add a title</span>}
            {publishedAt && <span style={{ color: C.gray400 }}>· � {new Date(publishedAt).toLocaleString()}</span>}
          </div>

          {/* Title */}
          <div
            ref={titleRef}
            contentEditable
            suppressContentEditableWarning
            data-placeholder="Page Title…"
            onInput={e => setTitle((e.target as HTMLElement).innerText)}
            className="editor-title"
            style={{ fontSize: 34, fontWeight: 800, color: C.gray900, outline: "none", marginBottom: 12, lineHeight: 1.2, minHeight: 44 }}
          />

          {/* Excerpt */}
          <textarea
            value={excerpt}
            onChange={e => setExcerpt(e.target.value)}
            placeholder="Short excerpt / subtitle (optional)…"
            rows={2}
            style={{ ...inputSx, resize: "vertical", color: C.gray500, fontSize: 15, marginBottom: 20, background: "#fff" }}
          />

          {/* Rich Editor (TinyMCE, self-hosted) */}
          <RichEditor
            value={content}
            onChange={setContent}
            placeholder="Start writing your page content…"
            minHeight={500}
          />
        </div>

        {/* Sidebar */}
        <div className="editor-sidebar" style={{ width: 300, flexShrink: 0, borderLeft: `1px solid ${C.gray200}`, background: C.gray50, overflowY: "auto", padding: "14px 12px" }}>

          {/* Status */}
          <div className="sidebar-section">
            <FL>Status</FL>
            <div className="status-pill">
              {(["draft", "published", "archived"] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  style={{
                    background: status === s ? (s === "published" ? C.navy : s === "draft" ? "#ca8a04" : C.gray400) : "transparent",
                    color: status === s ? "#fff" : C.gray500,
                  }}
                >{s}</button>
              ))}
            </div>
          </div>

          {/* Slug */}
          <div className="sidebar-section">
            <FL>URL Slug</FL>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 12, color: C.gray400, fontFamily: "monospace", whiteSpace: "nowrap" }}>/page/</span>
              <input
                value={slug}
                onChange={e => { setSlug(e.target.value); setSlugEdited(true); }}
                placeholder="auto-from-title"
                style={{ ...inputSx, fontSize: 12, fontFamily: "monospace", padding: "6px 8px", flex: 1 }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
              <p style={{ fontSize: 11, color: C.gray400, margin: 0 }}>Public address. Auto-generated from title.</p>
              <CopyUrl slug={slug} />
            </div>
            {slugEdited && (
              <button onClick={() => setSlugEdited(false)} style={{ background: "none", border: "none", color: C.navy, fontSize: 11, fontWeight: 700, marginTop: 6, cursor: "pointer", padding: 0 }}>
                ↻ Auto-generate from title
              </button>
            )}
          </div>

          {/* Featured Image */}
          <div className="sidebar-section">
            <FL>Featured Image <span style={{ fontWeight: 400, textTransform: "none", color: C.gray400 }}>(optional)</span></FL>
            <FeaturedImagePicker value={featImg} onChange={setFeatImg} />
          </div>

          {/* Schedule */}
          <div className="sidebar-section">
            <FL>Publish Date</FL>
            <input type="datetime-local" value={publishedAt} onChange={e => setPublishedAt(e.target.value)} style={{ ...inputSx, fontSize: 12 }} />
            <p style={{ fontSize: 11, color: C.gray400, margin: "6px 0 0" }}>Future dates go live automatically.</p>
          </div>

          {/* Sitemap */}
          <div className="sidebar-section">
            <FL>Visibility</FL>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.gray600, cursor: "pointer" }}>
              <input type="checkbox" checked={showInSitemap} onChange={e => setShowInSitemap(e.target.checked)} />
              Include in sitemap.xml
            </label>
          </div>

          {/* SEO */}
          <div className="sidebar-section">
            <FL>SEO Settings</FL>
            <div style={{ marginBottom: 10 }}>
              <FL>Meta Title</FL>
              <input value={seoTitle} onChange={e => setSeoTitle(e.target.value)} placeholder="Defaults to page title" style={{ ...inputSx, fontSize: 12 }} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <FL>Meta Description</FL>
              <textarea value={seoDesc} onChange={e => setSeoDesc(e.target.value)} placeholder="Brief description…" rows={3} style={{ ...inputSx, fontSize: 12, resize: "none" }} />
              <div style={{ fontSize: 11, color: seoDesc.length > 160 ? C.red : C.gray400, textAlign: "right", marginTop: 2 }}>{seoDesc.length}/160</div>
            </div>
            <div>
              <FL>Keywords</FL>
              <input value={seoKw} onChange={e => setSeoKw(e.target.value)} placeholder="keyword1, keyword2…" style={{ ...inputSx, fontSize: 12 }} />
            </div>
          </div>

        </div>
      </div>

      {/* Modal */}
      {modalConfig && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 4, padding: 24, width: "100%", maxWidth: 360, boxShadow: "0 16px 40px rgba(0,0,0,0.2)" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 800, color: C.gray900 }}>
              {modalConfig.type === "alert" ? "ℹ️" : "❓"} {modalConfig.title}
            </h3>
            <p style={{ margin: "0 0 20px", fontSize: 13.5, color: C.gray500, lineHeight: 1.5 }}>{modalConfig.message}</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              {modalConfig.type === "confirm" && (
                <button onClick={() => setModalConfig(null)} style={{ background: C.gray100, color: C.gray600, border: "none", borderRadius: 4, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              )}
              <button autoFocus onClick={() => { if (modalConfig.onConfirm) modalConfig.onConfirm(); setModalConfig(null); }} style={{ background: C.navy, color: "#fff", border: "none", borderRadius: 4, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {modalConfig.type === "confirm" ? "Confirm" : "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PageEditorPage() {
  return <AdminProvider><PageEditor /></AdminProvider>;
}
