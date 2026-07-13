"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL } from "@/lib/config";
import { AdminProvider } from "../../../components/ProtectedAdmin";
import AIBlogGeneratorModal, { AIBlogData } from "../../../components/AIBlogGeneratorModal";

/* ─── Types ─── */
interface BlogCategory { id: number; name: string; color: string; subcategories?: BlogSubCategory[] }
interface BlogSubCategory { id: number; category_id: number; name: string }
interface BlogAuthor { id: number; name: string; profile_image: string | null }
interface BlogRevision { id: number; title: string; excerpt: string; created_at: string }

/* ─── Rich Text Toolbar ─── */
const TOOLBAR_ITEMS = [
  { cmd: "bold",          label: "B",    title: "Bold",          style: { fontWeight: 800 } },
  { cmd: "italic",        label: "I",    title: "Italic",        style: { fontStyle: "italic" } },
  { cmd: "underline",     label: "U",    title: "Underline",     style: { textDecoration: "underline" } },
  { cmd: "strikeThrough", label: "S̶",   title: "Strikethrough", style: {} },
  { cmd: "|" },
  { cmd: "formatBlock_h2", label: "H2",  title: "Heading 2", style: { fontWeight: 700, fontSize: 12 } },
  { cmd: "formatBlock_h3", label: "H3",  title: "Heading 3", style: { fontWeight: 700, fontSize: 12 } },
  { cmd: "formatBlock_p",  label: "¶",   title: "Paragraph", style: {} },
  { cmd: "|" },
  { cmd: "insertUnorderedList", label: "• List",  title: "Bullet List", style: { fontSize: 12 } },
  { cmd: "insertOrderedList",   label: "1. List", title: "Numbered List", style: { fontSize: 12 } },
  { cmd: "|" },
  { cmd: "justifyLeft",   label: "⇤",  title: "Left",   style: {} },
  { cmd: "justifyCenter", label: "⇔",  title: "Center", style: {} },
  { cmd: "justifyRight",  label: "⇥",  title: "Right",  style: {} },
  { cmd: "|" },
  { cmd: "createLink",    label: "🔗",  title: "Insert Link",  style: {} },
  { cmd: "insertImage",   label: "🖼",  title: "Insert Image", style: {} },
  { cmd: "|" },
  { cmd: "formatBlock_pre", label: "</>", title: "Code Block", style: { fontFamily: "monospace", fontSize: 11 } },
  { cmd: "formatBlock_blockquote", label: "❝", title: "Blockquote", style: {} },
  { cmd: "|" },
  { cmd: "removeFormat",  label: "✕ fmt", title: "Clear Formatting", style: { fontSize: 11 } },
];

function execCmd(cmd: string, customAlert: (msg: string) => void) {
  if (cmd.startsWith("formatBlock_")) {
    const tag = cmd.replace("formatBlock_", "");
    document.execCommand("formatBlock", false, tag);
  } else if (cmd === "createLink") {
    const url = prompt("Enter URL:");
    if (url) document.execCommand("createLink", false, url);
  } else if (cmd === "insertImage") {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await apiFetch(`${API_BASE_URL}/settings/site/upload`, {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          document.execCommand("insertImage", false, data.url);
        } else {
          customAlert("Upload failed.");
        }
      } catch (err) {
        customAlert("Upload failed.");
      }
    };
    input.click();
  } else {
    document.execCommand(cmd, false, undefined);
  }
}

function RichToolbar({ editorRef, customAlert }: { editorRef: React.RefObject<HTMLDivElement | null>, customAlert: (msg: string) => void }) {
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

  useEffect(() => {
    const update = () => {
      const fmts = new Set<string>();
      if (document.queryCommandState("bold"))      fmts.add("bold");
      if (document.queryCommandState("italic"))    fmts.add("italic");
      if (document.queryCommandState("underline")) fmts.add("underline");
      setActiveFormats(fmts);
    };
    document.addEventListener("selectionchange", update);
    return () => document.removeEventListener("selectionchange", update);
  }, []);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 2,
      padding: "8px 12px", borderBottom: "1px solid #e2e8f0",
      flexWrap: "wrap", background: "#fafafa",
    }}>
      {TOOLBAR_ITEMS.map((item, i) => {
        if (item.cmd === "|") return <div key={i} style={{ width: 1, height: 18, background: "#e2e8f0", margin: "0 4px" }} />;
        const isActive = activeFormats.has(item.cmd);
        return (
          <button
            key={item.cmd}
            title={item.title}
            onMouseDown={e => { e.preventDefault(); execCmd(item.cmd, customAlert); editorRef.current?.focus(); }}
            style={{
              border: "none",
              background: isActive ? "#ede9fe" : "transparent",
              color: isActive ? "#6d28d9" : "#475569",
              borderRadius: 5,
              padding: "4px 8px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              transition: "all 0.12s",
              ...item.style,
            }}
          >{item.label}</button>
        );
      })}
    </div>
  );
}

/* ─── Tag input ─── */
function TagInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const tags = value ? value.split(",").map(t => t.trim()).filter(Boolean) : [];
  const [input, setInput] = useState("");

  const add = () => {
    const t = input.trim().toLowerCase();
    if (!t || tags.includes(t)) return;
    onChange([...tags, t].join(","));
    setInput("");
  };

  const remove = (tag: string) => onChange(tags.filter(t => t !== tag).join(","));

  return (
    <div style={{ border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "6px 10px", display: "flex", flexWrap: "wrap", gap: 6, minHeight: 40, cursor: "text" }}>
      {tags.map(t => (
        <span key={t} style={{ background: "#ede9fe", color: "#6d28d9", padding: "2px 10px", borderRadius: 100, fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
          {t}
          <button onClick={() => remove(t)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6d28d9", padding: 0, fontSize: 12, lineHeight: 1 }}>×</button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }}
        placeholder={tags.length === 0 ? "Type tag, press Enter…" : ""}
        style={{ border: "none", outline: "none", fontSize: 12.5, flex: 1, minWidth: 80 }}
      />
    </div>
  );
}

/* ─── Field label ─── */
const FL = ({ children }: { children: React.ReactNode }) => (
  <label style={{ fontSize: 11.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, display: "block" }}>{children}</label>
);

/* ─── Input style ─── */
const inputSx: React.CSSProperties = { width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "9px 12px", fontSize: 13.5, outline: "none", fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.15s" };

/* ─── Featured Image Drag & Drop ─── */
function FeaturedImagePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => onChange(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) readFile(file);
  };

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !value && fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? "#6366f1" : "#cbd5e1"}`,
          borderRadius: 10, padding: value ? 0 : "20px 12px",
          textAlign: "center", cursor: value ? "default" : "pointer",
          background: dragging ? "#ede9fe" : "#f8fafc",
          transition: "all 0.2s", overflow: "hidden",
        }}
      >
        {value ? (
          <div style={{ position: "relative" }}>
            <img src={value} alt="" style={{ width: "100%", maxHeight: 150, objectFit: "cover", display: "block" }} />
            <button
              onClick={e => { e.stopPropagation(); onChange(""); }}
              style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.55)", color: "#fff", border: "none", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", fontSize: 13, lineHeight: 1 }}
            >✕</button>
            <button
              onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
              style={{ position: "absolute", bottom: 6, right: 6, background: "rgba(0,0,0,0.55)", color: "#fff", border: "none", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 11 }}
            >Change</button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 28, marginBottom: 6 }}>🖼️</div>
            <div style={{ fontSize: 12.5, color: "#64748b", fontWeight: 500 }}>Drag & drop image here</div>
            <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 2 }}>or click to browse</div>
          </>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) readFile(f); }} />
      <input
        value={value.startsWith("data:") ? "" : value}
        onChange={e => onChange(e.target.value)}
        placeholder="…or paste image URL"
        style={{ ...inputSx, fontSize: 12, marginTop: 8, color: "#64748b" }}
      />
    </div>
  );
}

/* ─── Main Editor Component ─── */
function BlogEditor() {
  const router = useRouter();
  const params = useParams();
  const postId = params?.id as string;
  const isNew = postId === "new";

  const editorRef = useRef<HTMLDivElement>(null);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [subcategories, setSubcategories] = useState<BlogSubCategory[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);

  /* Form state */
  const [title, setTitle]           = useState("");
  const [excerpt, setExcerpt]       = useState("");
  const [featImg, setFeatImg]       = useState("");
  const [catId, setCatId]           = useState<number | "">("");
  const [subCatId, setSubCatId]     = useState<number | "">("");
  const [tags, setTags]             = useState("");
  const [authorId, setAuthorId]     = useState<number | "">("");
  const [status, setStatus]         = useState<"draft"|"published"|"archived">("draft");
  const [publishedAt, setPublishedAt]= useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [seoTitle, setSeoTitle]     = useState("");
  const [seoDesc, setSeoDesc]       = useState("");
  const [seoKw, setSeoKw]           = useState("");
  const [readingTime, setReadingTime]= useState(0);

  const [authors, setAuthors] = useState<BlogAuthor[]>([]);
  const [revisions, setRevisions] = useState<BlogRevision[]>([]);
  const [showRevisions, setShowRevisions] = useState(false);
  
  const [showSocialSnippets, setShowSocialSnippets] = useState(false);
  const [socialSnippets, setSocialSnippets] = useState<{platform: string, content: string}[] | null>(null);
  const [generatingSnippets, setGeneratingSnippets] = useState(false);

  /* Modal State */
  const [modalConfig, setModalConfig] = useState<{ title: string; message: string; type: "alert" | "confirm"; onConfirm?: () => void } | null>(null);
  const customAlert = useCallback((message: string, title = "Notice") => {
    setModalConfig({ title, message, type: "alert" });
  }, []);
  const customConfirm = useCallback((message: string, onConfirm: () => void, title = "Confirm") => {
    setModalConfig({ title, message, type: "confirm", onConfirm });
  }, []);

  /* Load blog categories & authors */
  const loadCategories = useCallback(() => {
    apiFetch(`${API_BASE_URL}/blogs/categories`)
      .then(r => r.ok ? r.json() : [])
      .then(setCategories);
    apiFetch(`${API_BASE_URL}/blogs/subcategories`)
      .then(r => r.ok ? r.json() : [])
      .then(setSubcategories);
    apiFetch(`${API_BASE_URL}/blogs/authors`)
      .then(r => r.ok ? r.json() : [])
      .then(setAuthors);
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  /* Quick Add State */
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [addingSub, setAddingSub] = useState(false);
  const [newSubName, setNewSubName] = useState("");

  const quickAddCategory = async () => {
    if (!newCatName.trim()) return setAddingCat(false);
    const res = await apiFetch(`${API_BASE_URL}/blogs/categories`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newCatName.trim(), color: "#6366f1", is_active: true }) });
    if (res.ok) { const data = await res.json(); setCatId(data.id); setSubCatId(""); loadCategories(); }
    setAddingCat(false); setNewCatName("");
  };

  const quickAddSubCategory = async () => {
    if (!catId) { customAlert("Please select a parent Category first."); return setAddingSub(false); }
    if (!newSubName.trim()) return setAddingSub(false);
    const res = await apiFetch(`${API_BASE_URL}/blogs/subcategories`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newSubName.trim(), category_id: Number(catId), is_active: true }) });
    if (res.ok) { const data = await res.json(); setSubCatId(data.id); loadCategories(); }
    setAddingSub(false); setNewSubName("");
  };

  /* Load post if editing */
  useEffect(() => {
    if (isNew) { setLoaded(true); return; }
    apiFetch(`${API_BASE_URL}/blogs/${postId}`)
      .then(r => r.ok ? r.json() : null)
      .then(p => {
        if (!p) return;
        setTitle(p.title);
        setExcerpt(p.excerpt ?? "");
        setFeatImg(p.featured_image ?? "");
        setCatId(p.category_id ?? "");
        setSubCatId(p.subcategory_id ?? "");
        setTags(p.tags ?? "");
        if (p.author_id) setAuthorId(p.author_id);
        setStatus(p.status);
        setIsFeatured(p.is_featured);
        setReadingTime(p.reading_time || 0);
        if (p.published_at) {
          // Format to YYYY-MM-DDTHH:mm
          const d = new Date(p.published_at);
          setPublishedAt(d.toISOString().slice(0,16));
        }
        setSeoTitle(p.seo_title ?? "");
        setSeoDesc(p.seo_description ?? "");
        setSeoKw(p.seo_keywords ?? "");
        if (editorRef.current && p.content) editorRef.current.innerHTML = p.content;
        setLoaded(true);
      });
      
    // Load revisions
    apiFetch(`${API_BASE_URL}/blogs/${postId}/revisions`)
      .then(r => r.ok ? r.json() : [])
      .then(setRevisions);
  }, [postId, isNew]);

  /* Filtered subcategories */
  const filteredSubs = subcategories.filter(s => !catId || s.category_id === Number(catId));

  /* AI Generator Handler */
  const handleAIGenerated = (data: AIBlogData) => {
    if (data.title) {
      setTitle(data.title);
      // Wait for React to render before setting innerText if element exists
      setTimeout(() => {
        const titleEl = document.getElementById("post-title-editable");
        if (titleEl) titleEl.innerText = data.title;
      }, 0);
    }
    if (data.excerpt) setExcerpt(data.excerpt);
    if (editorRef.current && data.content_html) {
      editorRef.current.innerHTML = data.content_html;
    }
    
    if (data.tags && data.tags.length > 0) {
      const existingTags = tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : [];
      const newTags = data.tags.filter(t => !existingTags.includes(t.toLowerCase()));
      setTags([...existingTags, ...newTags].join(","));
    }

    if (data.category_id) setCatId(data.category_id);
    if (data.subcategory_id) setSubCatId(data.subcategory_id);
  };

  /* Save / Publish */
  const save = useCallback(async (overrideStatus?: "draft" | "published" | "archived") => {
    if (!title.trim()) { setSaveMsg("⚠️ Title is required"); return; }
    setSaving(true);
    setSaveMsg("");
    const content = editorRef.current?.innerHTML ?? "";
    const body = {
      title: title.trim(),
      excerpt: excerpt || null,
      content,
      featured_image: featImg || null,
      category_id: catId !== "" ? Number(catId) : null,
      subcategory_id: subCatId !== "" ? Number(subCatId) : null,
      tags: tags || null,
      author_id: authorId !== "" ? Number(authorId) : null,
      status: overrideStatus ?? status,
      is_featured: isFeatured,
      published_at: publishedAt ? new Date(publishedAt).toISOString() : null,
      seo_title: seoTitle || null,
      seo_description: seoDesc || null,
      seo_keywords: seoKw || null,
    };
    try {
      const url = isNew ? `${API_BASE_URL}/blogs` : `${API_BASE_URL}/blogs/${postId}`;
      const method = isNew ? "POST" : "PUT";
      const res = await apiFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) {
        const data = await res.json();
        setSaveMsg("✅ Saved successfully");
        setReadingTime(data.reading_time || 0);
        if (isNew) router.replace(`/admin/blogs/editor/${data.id}`);
        if (overrideStatus) setStatus(overrideStatus);
        
        // Reload revisions if not new
        if (!isNew) {
          apiFetch(`${API_BASE_URL}/blogs/${postId}/revisions`)
            .then(r => r.ok ? r.json() : [])
            .then(setRevisions);
        }
      } else {
        setSaveMsg("❌ Save failed. Please try again.");
      }
    } catch { setSaveMsg("❌ Network error"); }
    finally { setSaving(false); }
  }, [title, excerpt, featImg, catId, subCatId, tags, authorId, status, isFeatured, publishedAt, seoTitle, seoDesc, seoKw, isNew, postId, router]);

  /* Restore Revision */
  const restoreRevision = async (revId: number) => {
    customConfirm("Are you sure you want to restore this version? Your current unsaved changes will be lost.", async () => {
      const res = await apiFetch(`${API_BASE_URL}/blogs/${postId}/revisions/${revId}/restore`, { method: "POST" });
      if (res.ok) {
        window.location.reload();
      } else {
        customAlert("Failed to restore revision");
      }
    });
  };

  /* Auto-TOC */
  const generateTOC = () => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    
    // Remove old TOC if exists
    const oldToc = editor.querySelector(".table-of-contents");
    if (oldToc) oldToc.remove();

    const headings = Array.from(editor.querySelectorAll("h2, h3"));
    if (headings.length === 0) {
      customAlert("No Headings (H2 or H3) found to generate a TOC.");
      return;
    }

    const tocList = document.createElement("ul");
    tocList.style.listStyleType = "none";
    tocList.style.paddingLeft = "0";

    headings.forEach((heading, i) => {
      const id = `toc-${i}`;
      heading.id = id;
      
      const li = document.createElement("li");
      li.style.marginBottom = "8px";
      if (heading.tagName === "H3") li.style.paddingLeft = "20px";
      
      const a = document.createElement("a");
      a.href = `#${id}`;
      a.innerText = (heading as HTMLElement).innerText;
      a.style.color = "#6366f1";
      a.style.textDecoration = "none";
      
      li.appendChild(a);
      tocList.appendChild(li);
    });

    const tocContainer = document.createElement("div");
    tocContainer.className = "table-of-contents";
    tocContainer.style.background = "#f8fafc";
    tocContainer.style.border = "1px solid #e2e8f0";
    tocContainer.style.borderRadius = "8px";
    tocContainer.style.padding = "20px";
    tocContainer.style.marginBottom = "24px";
    
    const title = document.createElement("h3");
    title.innerText = "Table of Contents";
    title.style.marginTop = "0";
    title.style.fontSize = "18px";
    
    tocContainer.appendChild(title);
    tocContainer.appendChild(tocList);

    editor.insertBefore(tocContainer, editor.firstChild);
    save();
  };

  /* Generate Social Snippets */
  const generateSocialSnippets = async () => {
    if (!title) { customAlert("Title is required first."); return; }
    setGeneratingSnippets(true);
    setShowSocialSnippets(true);
    try {
      const content = editorRef.current?.innerText || "";
      const res = await apiFetch(`${API_BASE_URL}/settings/ai/generate_social_snippet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content })
      });
      if (res.ok) {
        const data = await res.json();
        setSocialSnippets(data.data.snippets);
      } else {
        customAlert("Failed to generate snippets.");
        setShowSocialSnippets(false);
      }
    } catch {
      customAlert("Network error.");
      setShowSocialSnippets(false);
    }
    setGeneratingSnippets(false);
  };

  /* Auto-save every 60s */
  useEffect(() => {
    if (!loaded || isNew) return;
    const t = setInterval(() => save(), 60_000);
    return () => clearInterval(t);
  }, [loaded, isNew, save]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#f8fafc" }}>
      <style>{`
        .editor-content { font-family: 'Georgia', serif; font-size: 16px; line-height: 1.8; color: #0f172a; min-height: 500px; outline: none; padding: 0; }
        .editor-content h1 { font-size: 2em; font-weight: 800; margin: 1em 0 0.4em; }
        .editor-content h2 { font-size: 1.5em; font-weight: 700; margin: 1em 0 0.4em; }
        .editor-content h3 { font-size: 1.2em; font-weight: 600; margin: 0.8em 0 0.3em; }
        .editor-content p  { margin: 0.5em 0 1em; }
        .editor-content blockquote { border-left: 4px solid #6366f1; padding-left: 16px; color: #475569; font-style: italic; margin: 1em 0; }
        .editor-content pre { background: #0f172a; color: #e2e8f0; padding: 16px; border-radius: 8px; font-family: monospace; font-size: 14px; overflow-x: auto; margin: 1em 0; }
        .editor-content a  { color: #6366f1; text-decoration: underline; }
        .editor-content img { max-width: 100%; border-radius: 8px; margin: 0.5em 0; }
        .editor-content ul, .editor-content ol { margin: 0.5em 0 1em 1.5em; }
        .editor-content li { margin: 0.3em 0; }
        [contenteditable]:empty:before { content: attr(data-placeholder); color: #cbd5e1; }
        .sidebar-section { background: #fff; border-radius: 10px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); margin-bottom: 12px; }
        select:focus, textarea:focus, input:focus { outline: none !important; border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.1) !important; }
        .status-pill { display: flex; gap: 4px; padding: 3px; background: #f1f5f9; border-radius: 8px; }
        .status-pill button { border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; flex: 1; }
      `}</style>

      {/* ── Top Action Bar ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 24px", height: 54, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={() => router.push("/admin/blogs")} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 20, padding: "4px 8px", borderRadius: 6 }}>←</button>
          <div>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{isNew ? "New Post" : "Edit Post"}</span>
            {saveMsg && <span style={{ fontSize: 12, marginLeft: 12, color: saveMsg.startsWith("✅") ? "#065f46" : saveMsg.startsWith("⚠️") ? "#92400e" : "#991b1b" }}>{saveMsg}</span>}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 100, background: status === "published" ? "#d1fae5" : status === "archived" ? "#f1f5f9" : "#fef3c7", color: status === "published" ? "#065f46" : status === "archived" ? "#64748b" : "#92400e", fontWeight: 600 }}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
          <button onClick={generateTOC} style={{ background: "none", border: "1px solid #e2e8f0", color: "#64748b", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            📑 Auto-TOC
          </button>
          <button onClick={() => setShowRevisions(true)} style={{ background: "none", border: "1px solid #e2e8f0", color: "#64748b", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            🕒 History
          </button>
          <button onClick={generateSocialSnippets} style={{ background: "#fdf4ff", color: "#c026d3", border: "1px solid #f5d0fe", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            📱 Social
          </button>
          <button onClick={() => setShowAIModal(true)} style={{ background: "#ede9fe", color: "#6d28d9", border: "1px solid #c4b5fd", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            ✨ Write with AI
          </button>
          <button onClick={() => save()} disabled={saving} style={{ background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {saving ? "Saving…" : "Save Draft"}
          </button>
          <button onClick={() => save("published")} disabled={saving} style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: "7px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            🌐 Publish
          </button>
        </div>
      </div>

      {/* ── Editor + Sidebar ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Main Editor Panel ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "32px 48px 80px", maxWidth: "calc(100% - 320px)" }}>
          {/* Top Info */}
          <div style={{ display: "flex", gap: 16, marginBottom: 20, fontSize: 13, color: "#64748b", fontWeight: 500 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>⏱️ {readingTime} min read</span>
            {publishedAt && <span style={{ display: "flex", alignItems: "center", gap: 4 }}>📅 {new Date(publishedAt).toLocaleString()}</span>}
          </div>

          {/* Title */}
          <div
            id="post-title-editable"
            contentEditable
            suppressContentEditableWarning
            data-placeholder="Post Title…"
            onInput={e => setTitle((e.target as HTMLElement).innerText)}
            style={{ fontSize: 36, fontWeight: 800, color: "#0f172a", outline: "none", marginBottom: 12, lineHeight: 1.25, fontFamily: "inherit", minHeight: 48 }}
          >{/* title set via innerText on load */}</div>

          {/* Excerpt */}
          <textarea
            value={excerpt}
            onChange={e => setExcerpt(e.target.value)}
            placeholder="Write a short excerpt / subtitle…"
            rows={2}
            style={{ ...inputSx, resize: "vertical", fontStyle: "italic", color: "#64748b", fontSize: 16, marginBottom: 24, background: "#f8fafc" }}
          />

          {/* Rich Toolbar + Body */}
          <div style={{ border: "1.5px solid #e2e8f0", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
            <RichToolbar editorRef={editorRef} customAlert={customAlert} />
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="editor-content"
              data-placeholder="Start writing your article…"
              style={{ padding: "24px 28px" }}
            />
          </div>
        </div>

        {/* ── Right Sidebar ── */}
        <div style={{ width: 300, flexShrink: 0, borderLeft: "1px solid #e2e8f0", background: "#f8fafc", overflowY: "auto", padding: "16px 14px" }}>

          {/* Status */}
          <div className="sidebar-section">
            <FL>Status</FL>
            <div className="status-pill">
              {(["draft", "published", "archived"] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  style={{
                    background: status === s ? (s === "published" ? "#6366f1" : s === "draft" ? "#f59e0b" : "#94a3b8") : "transparent",
                    color: status === s ? "#fff" : "#64748b",
                  }}
                >{s.charAt(0).toUpperCase() + s.slice(1)}</button>
              ))}
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 13, color: "#475569", cursor: "pointer" }}>
              <input type="checkbox" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} />
              ⭐ Featured Post
            </label>
          </div>

          {/* Featured Image — drag & drop */}
          <div className="sidebar-section">
            <FL>Featured Image</FL>
            <FeaturedImagePicker value={featImg} onChange={setFeatImg} />
          </div>

          {/* Category */}
          <div className="sidebar-section">
            <FL>Category</FL>
            <select value={catId} onChange={e => { setCatId(e.target.value === "" ? "" : Number(e.target.value)); setSubCatId(""); }} style={{ ...inputSx, fontSize: 13 }}>
              <option value="">— Select category —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {addingCat ? (
              <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                <input autoFocus value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); quickAddCategory(); } else if (e.key === "Escape") setAddingCat(false); }} placeholder="Category name…" style={{ ...inputSx, fontSize: 12, padding: "6px 8px" }} />
                <button onClick={quickAddCategory} style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 6, padding: "0 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Add</button>
              </div>
            ) : (
              <button onClick={() => setAddingCat(true)} style={{ background: "none", border: "none", color: "#6366f1", fontSize: 12, fontWeight: 600, marginTop: 6, cursor: "pointer", padding: 0 }}>+ New Category</button>
            )}

            <div style={{ marginTop: 12 }}>
              <FL>Sub-category</FL>
              <select value={subCatId} onChange={e => setSubCatId(e.target.value === "" ? "" : Number(e.target.value))} style={{ ...inputSx, fontSize: 13 }}>
                <option value="">— Select sub-category —</option>
                {filteredSubs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {addingSub ? (
                <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                  <input autoFocus value={newSubName} onChange={e => setNewSubName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); quickAddSubCategory(); } else if (e.key === "Escape") setAddingSub(false); }} placeholder="Sub-category name…" style={{ ...inputSx, fontSize: 12, padding: "6px 8px" }} />
                  <button onClick={quickAddSubCategory} style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 6, padding: "0 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Add</button>
                </div>
              ) : (
                <button onClick={() => setAddingSub(true)} style={{ background: "none", border: "none", color: "#6366f1", fontSize: 12, fontWeight: 600, marginTop: 6, cursor: "pointer", padding: 0 }}>+ New Sub-category</button>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="sidebar-section">
            <FL>Tags</FL>
            <TagInput value={tags} onChange={setTags} />
          </div>

          {/* Author */}
          <div className="sidebar-section">
            <FL>Author</FL>
            <select value={authorId} onChange={e => setAuthorId(e.target.value === "" ? "" : Number(e.target.value))} style={{ ...inputSx, fontSize: 13 }}>
              <option value="">— Select Author —</option>
              {authors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          {/* Schedule */}
          <div className="sidebar-section">
            <FL>Publish Date</FL>
            <input type="datetime-local" value={publishedAt} onChange={e => setPublishedAt(e.target.value)} style={{ ...inputSx, fontSize: 12.5 }} />
            <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 6, lineHeight: 1.4 }}>
              If set in the future, the post will go live automatically.
            </p>
          </div>

          {/* SEO */}
          <div className="sidebar-section">
            <FL>SEO Settings</FL>
            <div style={{ marginBottom: 10 }}>
              <FL>Meta Title</FL>
              <input value={seoTitle} onChange={e => setSeoTitle(e.target.value)} placeholder="Defaults to post title" style={{ ...inputSx, fontSize: 12.5 }} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <FL>Meta Description</FL>
              <textarea value={seoDesc} onChange={e => setSeoDesc(e.target.value)} placeholder="Brief description for search engines…" rows={3} style={{ ...inputSx, fontSize: 12.5, resize: "none" }} />
              <div style={{ fontSize: 11, color: seoDesc.length > 160 ? "#ef4444" : "#94a3b8", textAlign: "right", marginTop: 2 }}>{seoDesc.length}/160</div>
            </div>
            <div>
              <FL>Keywords</FL>
              <input value={seoKw} onChange={e => setSeoKw(e.target.value)} placeholder="keyword1, keyword2…" style={{ ...inputSx, fontSize: 12.5 }} />
            </div>
          </div>

        </div>
      </div>
      
      {/* Revision History Sidebar */}
      {showRevisions && (
        <div style={{ position: "fixed", top: 0, right: 0, width: 320, height: "100vh", background: "#fff", boxShadow: "-4px 0 24px rgba(0,0,0,0.1)", zIndex: 100, display: "flex", flexDirection: "column", animation: "aib-slide-in 0.2s" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: 16, color: "#0f172a" }}>Revision History</h3>
            <button onClick={() => setShowRevisions(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#64748b" }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
            {revisions.length === 0 ? <p style={{ color: "#94a3b8", fontSize: 14 }}>No revisions found.</p> : null}
            {revisions.map((r, i) => (
              <div key={r.id} style={{ padding: 12, border: "1px solid #e2e8f0", borderRadius: 8, marginBottom: 12, background: i === 0 ? "#f8fafc" : "#fff" }}>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 4 }}>
                  {new Date(r.created_at).toLocaleString()} {i === 0 && "(Latest)"}
                </div>
                <div style={{ fontSize: 14, color: "#0f172a", fontWeight: 700, marginBottom: 8 }}>{r.title || "Untitled"}</div>
                <button onClick={() => restoreRevision(r.id)} style={{ background: "#ede9fe", color: "#6d28d9", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", width: "100%" }}>
                  Restore this version
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Social Snippets Sidebar */}
      {showSocialSnippets && (
        <div style={{ position: "fixed", top: 0, right: 0, width: 360, height: "100vh", background: "#fff", boxShadow: "-4px 0 24px rgba(0,0,0,0.1)", zIndex: 100, display: "flex", flexDirection: "column", animation: "aib-slide-in 0.2s" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fdf4ff" }}>
            <h3 style={{ margin: 0, fontSize: 16, color: "#a21caf", display: "flex", alignItems: "center", gap: 8 }}>📱 AI Social Snippets</h3>
            <button onClick={() => setShowSocialSnippets(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#a21caf" }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 20, background: "#fafafa" }}>
            {generatingSnippets ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#a21caf", fontWeight: 600, fontSize: 14 }}>
                <div className="aib-spinner" style={{ width: 24, height: 24, border: "3px solid #f5d0fe", borderTopColor: "#c026d3", borderRadius: "50%", animation: "aib-spin 0.8s linear infinite", margin: "0 auto 12px" }} />
                Generating engaging snippets...
              </div>
            ) : socialSnippets ? (
              socialSnippets.map((s, i) => (
                <div key={i} style={{ marginBottom: 20, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    {s.platform === "Twitter" ? "🐦" : s.platform === "LinkedIn" ? "💼" : "👥"} {s.platform}
                  </div>
                  <div style={{ fontSize: 14, color: "#0f172a", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                    {s.content}
                  </div>
                  <button onClick={() => navigator.clipboard.writeText(s.content)} style={{ background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", marginTop: 12, display: "flex", alignItems: "center", gap: 4 }}>
                    📋 Copy to clipboard
                  </button>
                </div>
              ))
            ) : null}
          </div>
        </div>
      )}

      {/* Global Alert/Confirm Modal */}
      {modalConfig && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(15,23,42,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)", animation: "aib-fade-in 0.15s" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 360, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)", animation: "aib-zoom-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)" }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 18, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
              {modalConfig.type === "alert" ? "ℹ️" : "❓"} {modalConfig.title}
            </h3>
            <p style={{ margin: "0 0 24px 0", fontSize: 14, color: "#475569", lineHeight: 1.5 }}>
              {modalConfig.message}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              {modalConfig.type === "confirm" && (
                <button
                  onClick={() => setModalConfig(null)}
                  style={{ background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "background 0.15s" }}
                  onMouseOver={e => e.currentTarget.style.background = "#e2e8f0"}
                  onMouseOut={e => e.currentTarget.style.background = "#f1f5f9"}
                >
                  Cancel
                </button>
              )}
              <button
                autoFocus
                onClick={() => {
                  if (modalConfig.onConfirm) modalConfig.onConfirm();
                  setModalConfig(null);
                }}
                style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "background 0.15s" }}
                onMouseOver={e => e.currentTarget.style.background = "#4f46e5"}
                onMouseOut={e => e.currentTarget.style.background = "#6366f1"}
              >
                {modalConfig.type === "confirm" ? "Confirm" : "OK"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAIModal && <AIBlogGeneratorModal onClose={() => setShowAIModal(false)} onGenerated={handleAIGenerated} />}
    </div>
  );
}

/* ── Mount title on load for editing ── */
function EditorLoader() {
  return <BlogEditor />;
}

export default function BlogEditorPage() {
  return <AdminProvider><EditorLoader /></AdminProvider>;
}
