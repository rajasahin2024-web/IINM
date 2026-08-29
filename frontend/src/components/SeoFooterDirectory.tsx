"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { BASE_URL, API_BASE_URL } from "@/lib/config";
import { getDeviceToken, apiFetch } from "@/lib/apiFetch";

export interface DirectoryLinkItem {
  id?: string;
  label: string;
  url: string;
  is_external?: boolean;
  order_index?: number;
}

export interface DirectoryCategory {
  id?: string;
  title: string;
  order_index?: number;
  is_active?: boolean;
  links: DirectoryLinkItem[];
}

export interface DirectoryData {
  tagline?: string;
  show_tagline?: boolean;
  is_active?: boolean;
  categories: DirectoryCategory[];
}

interface SeoFooterDirectoryProps {
  initialData?: DirectoryData;
}

export default function SeoFooterDirectory({ initialData }: SeoFooterDirectoryProps) {
  const [data, setData] = useState<DirectoryData | null>(initialData || null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeSubModal, setActiveSubModal] = useState<"none" | "import" | "export">("none");
  const [jsonInput, setJsonInput] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null);

  // Editable form state inside modal
  const [formTagline, setFormTagline] = useState("#Create Impact");
  const [formShowTagline, setFormShowTagline] = useState(true);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formCategories, setFormCategories] = useState<DirectoryCategory[]>([]);

  // Check admin login status & load data if not provided via props
  useEffect(() => {
    const token = getDeviceToken();
    if (token) {
      setIsAdmin(true);
    }

    if (!initialData) {
      fetch(`${BASE_URL}/api/seo/directory-links`)
        .then((res) => (res.ok ? res.json() : null))
        .then((d) => {
          if (d) setData(d);
        })
        .catch(() => {});
    }
  }, [initialData]);

  // Sync data to modal form state when modal opens
  const openModal = () => {
    if (data) {
      setFormTagline(data.tagline || "#Create Impact");
      setFormShowTagline(data.show_tagline !== false);
      setFormIsActive(data.is_active !== false);
      setFormCategories(JSON.parse(JSON.stringify(data.categories || [])));
    }
    setIsModalOpen(true);
    setActiveSubModal("none");
  };

  const showToast = (text: string, type: "ok" | "err" = "ok") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // ── Category Actions ──
  const addCategory = () => {
    setFormCategories((prev) => [
      ...prev,
      {
        id: `cat-${Date.now()}`,
        title: "New Category",
        order_index: prev.length,
        is_active: true,
        links: [
          { id: `link-${Date.now()}-1`, label: "Sample Link", url: "/courses", order_index: 0 },
        ],
      },
    ]);
  };

  const updateCategoryTitle = (idx: number, title: string) => {
    setFormCategories((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], title };
      return copy;
    });
  };

  const removeCategory = (idx: number) => {
    if (!window.confirm("Delete this category and all its links?")) return;
    setFormCategories((prev) => prev.filter((_, i) => i !== idx));
  };

  const moveCategory = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= formCategories.length) return;
    setFormCategories((prev) => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[newIdx];
      copy[newIdx] = temp;
      return copy.map((cat, i) => ({ ...cat, order_index: i }));
    });
  };

  // ── Link Actions ──
  const addLink = (catIdx: number) => {
    setFormCategories((prev) => {
      const copy = [...prev];
      const cat = { ...copy[catIdx] };
      const links = [
        ...cat.links,
        {
          id: `link-${Date.now()}`,
          label: "New Link",
          url: "/courses",
          order_index: cat.links.length,
        },
      ];
      cat.links = links;
      copy[catIdx] = cat;
      return copy;
    });
  };

  const updateLink = (catIdx: number, linkIdx: number, field: "label" | "url", val: string) => {
    setFormCategories((prev) => {
      const copy = [...prev];
      const cat = { ...copy[catIdx] };
      const links = [...cat.links];
      links[linkIdx] = { ...links[linkIdx], [field]: val };
      cat.links = links;
      copy[catIdx] = cat;
      return copy;
    });
  };

  const removeLink = (catIdx: number, linkIdx: number) => {
    setFormCategories((prev) => {
      const copy = [...prev];
      const cat = { ...copy[catIdx] };
      cat.links = cat.links.filter((_, i) => i !== linkIdx).map((l, i) => ({ ...l, order_index: i }));
      copy[catIdx] = cat;
      return copy;
    });
  };

  const moveLink = (catIdx: number, linkIdx: number, dir: -1 | 1) => {
    const newIdx = linkIdx + dir;
    const cat = formCategories[catIdx];
    if (newIdx < 0 || newIdx >= cat.links.length) return;
    setFormCategories((prev) => {
      const copy = [...prev];
      const targetCat = { ...copy[catIdx] };
      const links = [...targetCat.links];
      const temp = links[linkIdx];
      links[linkIdx] = links[newIdx];
      links[newIdx] = temp;
      targetCat.links = links.map((l, i) => ({ ...l, order_index: i }));
      copy[catIdx] = targetCat;
      return copy;
    });
  };

  // ── Save to DB ──
  const handleSave = async () => {
    setSaving(true);
    const payload = {
      tagline: formTagline,
      show_tagline: formShowTagline,
      is_active: formIsActive,
      categories: formCategories,
    };
    try {
      const res = await apiFetch(`${API_BASE_URL}/seo/directory-links`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setData(payload);
        showToast("SEO Internal Links Directory saved successfully!", "ok");
        setIsModalOpen(false);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || "Failed to save directory links", "err");
      }
    } catch {
      showToast("Network error saving directory links", "err");
    } finally {
      setSaving(false);
    }
  };

  // ── Reset Default ──
  const handleResetDefault = async () => {
    if (!window.confirm("Reset all directory categories & links to standard SEO defaults?")) return;
    setSaving(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/seo/directory-links/reset-default`, {
        method: "POST",
      });
      if (res.ok) {
        const result = await res.json();
        const d = result.data;
        setData(d);
        setFormTagline(d.tagline || "#Create Impact");
        setFormShowTagline(d.show_tagline !== false);
        setFormIsActive(d.is_active !== false);
        setFormCategories(d.categories || []);
        showToast("Directory links reset to default!", "ok");
      } else {
        showToast("Failed to reset directory links", "err");
      }
    } catch {
      showToast("Error resetting directory links", "err");
    } finally {
      setSaving(false);
    }
  };

  // ── JSON Export / Import ──
  const openExport = () => {
    const payload = {
      tagline: formTagline,
      show_tagline: formShowTagline,
      is_active: formIsActive,
      categories: formCategories,
    };
    setJsonInput(JSON.stringify(payload, null, 2));
    setActiveSubModal("export");
  };

  const openImport = () => {
    setJsonInput("");
    setJsonError(null);
    setActiveSubModal("import");
  };

  const handleApplyJsonImport = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (Array.isArray(parsed)) {
        // Just categories array
        setFormCategories(parsed);
      } else if (parsed && typeof parsed === "object") {
        if (parsed.categories && Array.isArray(parsed.categories)) {
          setFormCategories(parsed.categories);
        }
        if (typeof parsed.tagline === "string") setFormTagline(parsed.tagline);
        if (typeof parsed.show_tagline === "boolean") setFormShowTagline(parsed.show_tagline);
        if (typeof parsed.is_active === "boolean") setFormIsActive(parsed.is_active);
      } else {
        throw new Error("Invalid JSON structure. Must contain 'categories' array.");
      }
      setActiveSubModal("none");
      showToast("JSON successfully imported into editor! Click Save to apply.", "ok");
    } catch (e: any) {
      setJsonError(e.message || "Invalid JSON syntax");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadJsonFile = () => {
    const payload = {
      tagline: formTagline,
      show_tagline: formShowTagline,
      is_active: formIsActive,
      categories: formCategories,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `iinm-seo-directory-links-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // If section is disabled and not admin, hide completely
  if (data && data.is_active === false && !isAdmin) {
    return null;
  }

  const categories = data?.categories || [];

  return (
    <div className="seo-directory-wrapper">
      <style>{`
        .seo-directory-wrapper {
          position: relative;
          background: #ffffff;
          border-top: 1px solid #f1f5f9;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
        .seo-directory-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 56px 48px 36px;
          box-sizing: border-box;
        }
        .seo-dir-admin-pill {
          position: absolute;
          top: 16px;
          right: 48px;
          z-index: 10;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: #0a1628;
          color: #ffffff;
          border: 1px solid #1e293b;
          border-radius: 4px;
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.3px;
          cursor: pointer;
          transition: all 0.15s;
          box-shadow: 0 2px 6px rgba(0,0,0,0.12);
        }
        .seo-dir-admin-pill:hover {
          background: #1e293b;
          transform: translateY(-1px);
        }
        .seo-dir-category-block {
          margin-bottom: 22px;
        }
        .seo-dir-category-title {
          font-size: 13.5px;
          font-weight: 600;
          color: #1e3a8a;
          margin: 0 0 6px 0;
          letter-spacing: -0.1px;
        }
        .seo-dir-links-flow {
          font-size: 12.5px;
          line-height: 1.85;
          color: #475569;
          word-break: break-word;
        }
        .seo-dir-link {
          color: #475569;
          text-decoration: none;
          font-weight: 400;
          transition: color 0.15s ease;
        }
        .seo-dir-link:hover {
          color: #0f172a;
          text-decoration: underline;
        }
        .seo-dir-separator {
          color: #cbd5e1;
          margin: 0 8px;
          font-weight: 300;
          user-select: none;
        }
        .seo-dir-watermark-wrap {
          text-align: center;
          margin-top: 48px;
          padding-top: 16px;
          user-select: none;
          overflow: hidden;
        }
        .seo-dir-watermark {
          display: inline-block;
          font-size: clamp(3.2rem, 8.5vw, 6.8rem);
          font-weight: 900;
          letter-spacing: -2px;
          line-height: 1;
          margin: 0 auto;
          text-transform: none;
          font-family: inherit;

          /* Pixel Dot Matrix / Halftone Texture Effect */
          background-image: 
            radial-gradient(circle, #64748b 33%, transparent 34%),
            radial-gradient(circle, #94a3b8 33%, transparent 34%);
          background-size: 4px 4px, 4px 4px;
          background-position: 0 0, 2px 2px;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
          opacity: 0.82;
          filter: contrast(125%);
        }
        @media (max-width: 900px) {
          .seo-directory-container {
            padding: 44px 24px 28px;
          }
          .seo-dir-admin-pill {
            right: 24px;
          }
        }
        @media (max-width: 640px) {
          .seo-directory-container {
            padding: 32px 16px 20px;
          }
          .seo-dir-admin-pill {
            right: 16px;
            top: 10px;
          }
          .seo-dir-category-title {
            font-size: 13px;
          }
          .seo-dir-links-flow {
            font-size: 11.5px;
            line-height: 1.75;
          }
        }

        /* ── Fullscreen Admin Modal Styles ── */
        .seo-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 999999;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #0f172a;
        }
        .seo-modal-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
          flex-shrink: 0;
        }
        .seo-modal-title {
          font-size: 18px;
          font-weight: 700;
          color: #0a1628;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .seo-modal-sub {
          font-size: 12px;
          color: #64748b;
          margin: 2px 0 0 0;
        }
        .seo-modal-top-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .seo-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
        }
        .seo-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
        .seo-btn-primary {
          background: #0a1628;
          color: #ffffff;
          border-color: #0a1628;
        }
        .seo-btn-primary:hover:not(:disabled) {
          background: #1e293b;
          color: #ffffff;
        }
        .seo-btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .seo-btn-danger {
          color: #ef4444;
          border-color: #fecaca;
          background: #fef2f2;
        }
        .seo-btn-danger:hover {
          background: #fee2e2;
          border-color: #fca5a5;
        }
        .seo-modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px 32px;
          background: #f8fafc;
        }
        .seo-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 18px 20px;
          margin-bottom: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        .seo-card-title {
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 14px 0;
          padding-bottom: 8px;
          border-bottom: 1px solid #f1f5f9;
        }
        .seo-input-row {
          display: flex;
          gap: 16px;
          align-items: center;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .seo-field {
          flex: 1;
          min-width: 200px;
        }
        .seo-label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #64748b;
          margin-bottom: 4px;
        }
        .seo-input {
          width: 100%;
          padding: 8px 12px;
          border: 1.5px solid #e2e8f0;
          border-radius: 4px;
          font-size: 13px;
          color: #0f172a;
          background: #ffffff;
          outline: none;
          box-sizing: border-box;
        }
        .seo-input:focus {
          border-color: #0a1628;
        }
        .seo-cat-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          margin-bottom: 16px;
          overflow: hidden;
        }
        .seo-cat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: #f1f5f9;
          border-bottom: 1px solid #e2e8f0;
        }
        .seo-cat-title-input {
          font-size: 14px;
          font-weight: 700;
          color: #1e3a8a;
          border: 1px solid transparent;
          background: transparent;
          padding: 4px 8px;
          border-radius: 4px;
          outline: none;
          width: 320px;
        }
        .seo-cat-title-input:focus {
          background: #ffffff;
          border-color: #cbd5e1;
        }
        .seo-cat-body {
          padding: 14px 16px;
        }
        .seo-link-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
          padding: 6px 10px;
          background: #fafafa;
          border: 1px solid #f1f5f9;
          border-radius: 4px;
        }
        .seo-toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 1000000;
          padding: 12px 20px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 600;
          color: #ffffff;
          background: #0f172a;
          box-shadow: 0 4px 14px rgba(0,0,0,0.2);
          animation: slideUp 0.2s ease-out;
        }
        .seo-toast.err {
          background: #ef4444;
        }
        @keyframes slideUp {
          from { transform: translateY(10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* ── Admin Edit Button (Floating Pill) ── */}
      {isAdmin && (
        <button
          onClick={openModal}
          className="seo-dir-admin-pill"
          title="Edit SEO Internal Links Directory"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Edit Directory Links
        </button>
      )}

      {/* ── Directory Links Public Section ── */}
      <section className="seo-directory-container" aria-label="SEO Internal Links Directory">
        {categories.map((category, catIdx) => {
          if (category.is_active === false) return null;
          const links = category.links || [];
          if (links.length === 0) return null;

          return (
            <div key={category.id || catIdx} className="seo-dir-category-block">
              <h3 className="seo-dir-category-title">{category.title}</h3>
              <div className="seo-dir-links-flow">
                {links.map((link, linkIdx) => (
                  <React.Fragment key={link.id || linkIdx}>
                    <Link
                      href={link.url || "/courses"}
                      className="seo-dir-link"
                      {...(link.is_external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    >
                      {link.label}
                    </Link>
                    {linkIdx < links.length - 1 && (
                      <span className="seo-dir-separator">|</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          );
        })}

        {/* ── Watermark Tagline (#Create Impact) ── */}
        {data?.show_tagline !== false && data?.tagline && (
          <div className="seo-dir-watermark-wrap" aria-hidden="true">
            <div className="seo-dir-watermark">
              {data.tagline}
            </div>
          </div>
        )}
      </section>

      {/* ── Fullscreen Admin Modal ── */}
      {isModalOpen && (
        <div className="seo-modal-overlay">
          {/* Top Bar */}
          <div className="seo-modal-topbar">
            <div>
              <h2 className="seo-modal-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                SEO Internal Links Directory Manager
              </h2>
              <p className="seo-modal-sub">
                Manage keyword-rich category links above the footer across all pages (Essential for Googlebot internal crawlability & PageRank flow)
              </p>
            </div>

            <div className="seo-modal-top-actions">
              <button className="seo-btn" onClick={openImport} title="Import structured JSON">
                📥 Import JSON
              </button>
              <button className="seo-btn" onClick={openExport} title="Export structured JSON">
                📤 Export JSON
              </button>
              <button className="seo-btn" onClick={handleResetDefault} title="Reset to default SEO links">
                🔄 Reset Default
              </button>
              <button
                className="seo-btn seo-btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "💾 Save Changes"}
              </button>
              <button
                className="seo-btn"
                onClick={() => setIsModalOpen(false)}
                style={{ padding: "8px 12px" }}
              >
                ✕ Close
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="seo-modal-body">
            <div style={{ maxWidth: 1120, margin: "0 auto" }}>

              {/* General Settings Card */}
              <div className="seo-card">
                <h3 className="seo-card-title">General Section Settings</h3>
                <div className="seo-input-row">
                  <div className="seo-field">
                    <label className="seo-label">Watermark Tagline (Large text at bottom)</label>
                    <input
                      className="seo-input"
                      value={formTagline}
                      onChange={(e) => setFormTagline(e.target.value)}
                      placeholder="#Create Impact"
                    />
                  </div>
                  <div style={{ display: "flex", gap: 20, alignItems: "center", marginTop: 16 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
                      <input
                        type="checkbox"
                        checked={formShowTagline}
                        onChange={(e) => setFormShowTagline(e.target.checked)}
                      />
                      Show Watermark Tagline
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
                      <input
                        type="checkbox"
                        checked={formIsActive}
                        onChange={(e) => setFormIsActive(e.target.checked)}
                      />
                      Enable Directory Section on All Pages
                    </label>
                  </div>
                </div>
              </div>

              {/* Categories & Links Builder */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#0f172a" }}>
                  Categories & Internal Links ({formCategories.length})
                </h3>
                <button className="seo-btn seo-btn-primary" onClick={addCategory}>
                  + Add New Category
                </button>
              </div>

              {formCategories.map((cat, catIdx) => (
                <div key={cat.id || catIdx} className="seo-cat-card">
                  {/* Category Header */}
                  <div className="seo-cat-header">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>
                        #{catIdx + 1}
                      </span>
                      <input
                        className="seo-cat-title-input"
                        value={cat.title}
                        onChange={(e) => updateCategoryTitle(catIdx, e.target.value)}
                        placeholder="Category Name (e.g. Top Programs)"
                      />
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>
                        ({cat.links.length} links)
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button
                        className="seo-btn"
                        style={{ padding: "4px 8px", fontSize: 12 }}
                        onClick={() => moveCategory(catIdx, -1)}
                        disabled={catIdx === 0}
                        title="Move Category Up"
                      >
                        ▲
                      </button>
                      <button
                        className="seo-btn"
                        style={{ padding: "4px 8px", fontSize: 12 }}
                        onClick={() => moveCategory(catIdx, 1)}
                        disabled={catIdx === formCategories.length - 1}
                        title="Move Category Down"
                      >
                        ▼
                      </button>
                      <button
                        className="seo-btn seo-btn-danger"
                        style={{ padding: "4px 8px", fontSize: 12 }}
                        onClick={() => removeCategory(catIdx)}
                        title="Delete Category"
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </div>

                  {/* Category Links Body */}
                  <div className="seo-cat-body">
                    {cat.links.map((link, linkIdx) => (
                      <div key={link.id || linkIdx} className="seo-link-row">
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", width: 22 }}>
                          {linkIdx + 1}.
                        </span>
                        <input
                          className="seo-input"
                          style={{ flex: 1.5 }}
                          value={link.label}
                          onChange={(e) => updateLink(catIdx, linkIdx, "label", e.target.value)}
                          placeholder="Link Text / Keyword (e.g. Machine Learning Course)"
                        />
                        <input
                          className="seo-input"
                          style={{ flex: 1, fontFamily: "monospace", fontSize: 12 }}
                          value={link.url}
                          onChange={(e) => updateLink(catIdx, linkIdx, "url", e.target.value)}
                          placeholder="URL (e.g. /courses or /courses/ml)"
                        />
                        <button
                          className="seo-btn"
                          style={{ padding: "4px 8px", fontSize: 11 }}
                          onClick={() => moveLink(catIdx, linkIdx, -1)}
                          disabled={linkIdx === 0}
                          title="Move Link Up"
                        >
                          ▲
                        </button>
                        <button
                          className="seo-btn"
                          style={{ padding: "4px 8px", fontSize: 11 }}
                          onClick={() => moveLink(catIdx, linkIdx, 1)}
                          disabled={linkIdx === cat.links.length - 1}
                          title="Move Link Down"
                        >
                          ▼
                        </button>
                        <button
                          className="seo-btn seo-btn-danger"
                          style={{ padding: "4px 8px", fontSize: 11 }}
                          onClick={() => removeLink(catIdx, linkIdx)}
                          title="Delete Link"
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    <button
                      className="seo-btn"
                      style={{ marginTop: 8, fontSize: 12 }}
                      onClick={() => addLink(catIdx)}
                    >
                      + Add Link to {cat.title || "Category"}
                    </button>
                  </div>
                </div>
              ))}

              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <button
                  className="seo-btn seo-btn-primary"
                  onClick={addCategory}
                  style={{ padding: "10px 24px", fontSize: 14 }}
                >
                  + Add Another Category
                </button>
              </div>

            </div>
          </div>

          {/* ── JSON Export Modal ── */}
          {activeSubModal === "export" && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000000,
                padding: 20,
              }}
              onClick={() => setActiveSubModal("none")}
            >
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: 8,
                  width: "100%",
                  maxWidth: 750,
                  maxHeight: "85vh",
                  display: "flex",
                  flexDirection: "column",
                  padding: 24,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0a1628" }}>Export JSON</h3>
                  <button className="seo-btn" onClick={() => setActiveSubModal("none")} style={{ padding: "4px 8px" }}>✕</button>
                </div>
                <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 12px" }}>
                  Copy this JSON to backup or transfer your SEO Directory links.
                </p>
                <textarea
                  readOnly
                  value={jsonInput}
                  style={{
                    width: "100%",
                    flex: 1,
                    minHeight: 340,
                    fontFamily: "monospace",
                    fontSize: 12,
                    padding: 12,
                    border: "1px solid #cbd5e1",
                    borderRadius: 4,
                    background: "#f8fafc",
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
                  <button className="seo-btn" onClick={downloadJsonFile}>
                    💾 Download .json File
                  </button>
                  <button className="seo-btn seo-btn-primary" onClick={() => copyToClipboard(jsonInput)}>
                    {copied ? "✓ Copied!" : "📋 Copy to Clipboard"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── JSON Import Modal ── */}
          {activeSubModal === "import" && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000000,
                padding: 20,
              }}
              onClick={() => setActiveSubModal("none")}
            >
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: 8,
                  width: "100%",
                  maxWidth: 750,
                  maxHeight: "85vh",
                  display: "flex",
                  flexDirection: "column",
                  padding: 24,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0a1628" }}>Import JSON</h3>
                  <button className="seo-btn" onClick={() => setActiveSubModal("none")} style={{ padding: "4px 8px" }}>✕</button>
                </div>
                <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 12px" }}>
                  Paste structured JSON below. It will replace current editor state.
                </p>
                <textarea
                  value={jsonInput}
                  onChange={(e) => { setJsonInput(e.target.value); setJsonError(null); }}
                  placeholder={`{\n  "tagline": "#Create Impact",\n  "categories": [\n    {\n      "title": "Top Programs",\n      "links": [\n        { "label": "Software and AI Engineering", "url": "/courses" }\n      ]\n    }\n  ]\n}`}
                  style={{
                    width: "100%",
                    flex: 1,
                    minHeight: 340,
                    fontFamily: "monospace",
                    fontSize: 12,
                    padding: 12,
                    border: `1.5px solid ${jsonError ? "#ef4444" : "#cbd5e1"}`,
                    borderRadius: 4,
                    background: "#ffffff",
                    boxSizing: "border-box",
                  }}
                />
                {jsonError && (
                  <div style={{ color: "#ef4444", fontSize: 12, marginTop: 6, fontWeight: 500 }}>
                    ⚠️ {jsonError}
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
                  <button className="seo-btn" onClick={() => setActiveSubModal("none")}>
                    Cancel
                  </button>
                  <button className="seo-btn seo-btn-primary" onClick={handleApplyJsonImport}>
                    Apply JSON to Editor
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── Toast Notification ── */}
      {toastMsg && (
        <div className={`seo-toast ${toastMsg.type === "err" ? "err" : ""}`}>
          {toastMsg.text}
        </div>
      )}
    </div>
  );
}
