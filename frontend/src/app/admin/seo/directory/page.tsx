"use client";
import React, { useEffect, useState } from "react";
import { AdminProvider } from "../../components/ProtectedAdmin";
import { useToast } from "../../components/ToastProvider";
import { Icon } from "../../icons";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL, BASE_URL } from "@/lib/config";
import Link from "next/link";

interface DirectoryLinkItem {
  id?: string;
  label: string;
  url: string;
  is_external?: boolean;
  order_index?: number;
}

interface DirectoryCategory {
  id?: string;
  title: string;
  order_index?: number;
  is_active?: boolean;
  links: DirectoryLinkItem[];
}

interface DirectoryData {
  tagline?: string;
  show_tagline?: boolean;
  is_active?: boolean;
  categories: DirectoryCategory[];
}

const S = {
  card: { background: "#fff", border: "1px solid #e2e8f0", padding: 24, marginBottom: 16 } as React.CSSProperties,
  input: { width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" as const, outline: "none" } as React.CSSProperties,
  label: { display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: "0.5px" } as React.CSSProperties,
  sectionTitle: { fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid #f1f5f9" } as React.CSSProperties,
  btnPrimary: { padding: "10px 22px", border: "none", background: "#0a1628", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" } as React.CSSProperties,
  btnGhost: { padding: "8px 16px", border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 13, cursor: "pointer" } as React.CSSProperties,
  btnDanger: { padding: "6px 12px", border: "1px solid #fecaca", background: "#fef2f2", color: "#ef4444", fontSize: 12, cursor: "pointer" } as React.CSSProperties,
  hint: { fontSize: 12, color: "#94a3b8", marginTop: 6 } as React.CSSProperties,
  checkbox: { display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#475569", cursor: "pointer" } as React.CSSProperties,
};

function SeoDirectoryInner() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tagline, setTagline] = useState("#Create Impact");
  const [showTagline, setShowTagline] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [categories, setCategories] = useState<DirectoryCategory[]>([]);
  const [activeSubModal, setActiveSubModal] = useState<"none" | "import" | "export">("none");
  const [jsonInput, setJsonInput] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadData = async () => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/seo/directory-links`);
      if (res.ok) {
        const d: DirectoryData = await res.json();
        setTagline(d.tagline || "#Create Impact");
        setShowTagline(d.show_tagline !== false);
        setIsActive(d.is_active !== false);
        setCategories(d.categories || []);
      }
    } catch {
      showToast("Failed to load SEO directory links", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addCategory = () => {
    setCategories((prev) => [
      ...prev,
      {
        id: `cat-${Date.now()}`,
        title: "New Category",
        order_index: prev.length,
        is_active: true,
        links: [
          { id: `link-${Date.now()}-1`, label: "New Link", url: "/courses", order_index: 0 },
        ],
      },
    ]);
  };

  const updateCategoryTitle = (idx: number, title: string) => {
    setCategories((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], title };
      return copy;
    });
  };

  const removeCategory = (idx: number) => {
    if (!window.confirm("Delete this category and all its links?")) return;
    setCategories((prev) => prev.filter((_, i) => i !== idx));
  };

  const moveCategory = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= categories.length) return;
    setCategories((prev) => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[newIdx];
      copy[newIdx] = temp;
      return copy.map((cat, i) => ({ ...cat, order_index: i }));
    });
  };

  const addLink = (catIdx: number) => {
    setCategories((prev) => {
      const copy = [...prev];
      const cat = { ...copy[catIdx] };
      cat.links = [
        ...cat.links,
        { id: `link-${Date.now()}`, label: "New Link", url: "/courses", order_index: cat.links.length },
      ];
      copy[catIdx] = cat;
      return copy;
    });
  };

  const updateLink = (catIdx: number, linkIdx: number, field: "label" | "url", val: string) => {
    setCategories((prev) => {
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
    setCategories((prev) => {
      const copy = [...prev];
      const cat = { ...copy[catIdx] };
      cat.links = cat.links.filter((_, i) => i !== linkIdx).map((l, i) => ({ ...l, order_index: i }));
      copy[catIdx] = cat;
      return copy;
    });
  };

  const moveLink = (catIdx: number, linkIdx: number, dir: -1 | 1) => {
    const newIdx = linkIdx + dir;
    const cat = categories[catIdx];
    if (newIdx < 0 || newIdx >= cat.links.length) return;
    setCategories((prev) => {
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

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      tagline,
      show_tagline: showTagline,
      is_active: isActive,
      categories,
    };
    try {
      const res = await apiFetch(`${API_BASE_URL}/seo/directory-links`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showToast("SEO Directory Links saved successfully!", "success");
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || "Failed to save directory links", "error");
      }
    } catch {
      showToast("Network error saving directory links", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefault = async () => {
    if (!window.confirm("Reset all directory categories & links to standard SEO defaults?")) return;
    setSaving(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/seo/directory-links/reset-default`, { method: "POST" });
      if (res.ok) {
        const result = await res.json();
        const d = result.data;
        setTagline(d.tagline || "#Create Impact");
        setShowTagline(d.show_tagline !== false);
        setIsActive(d.is_active !== false);
        setCategories(d.categories || []);
        showToast("Reset to standard SEO defaults successfully!", "success");
      } else {
        showToast("Failed to reset directory links", "error");
      }
    } catch {
      showToast("Error resetting directory links", "error");
    } finally {
      setSaving(false);
    }
  };

  const openExport = () => {
    const payload = { tagline, show_tagline: showTagline, is_active: isActive, categories };
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
        setCategories(parsed);
      } else if (parsed && typeof parsed === "object") {
        if (parsed.categories && Array.isArray(parsed.categories)) setCategories(parsed.categories);
        if (typeof parsed.tagline === "string") setTagline(parsed.tagline);
        if (typeof parsed.show_tagline === "boolean") setShowTagline(parsed.show_tagline);
        if (typeof parsed.is_active === "boolean") setIsActive(parsed.is_active);
      } else {
        throw new Error("Invalid structure. Must have 'categories' array.");
      }
      setActiveSubModal("none");
      showToast("JSON imported successfully! Remember to click Save.", "success");
    } catch (e: any) {
      setJsonError(e.message || "Invalid JSON syntax");
    }
  };

  if (loading) return <div className="manager-content"><div className="skeleton sk-h1"></div></div>;

  return (
    <div className="manager-content" style={{ width: "100%" }}>
      {/* Header */}
      <header style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="layout" size={24} /> Footer SEO Directory Links
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>
            Configure keyword-rich internal links and categories displayed directly above the footer across all pages.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button style={S.btnGhost} onClick={openImport}>📥 Import JSON</button>
          <button style={S.btnGhost} onClick={openExport}>📤 Export JSON</button>
          <button style={S.btnGhost} onClick={handleResetDefault}>🔄 Reset Default</button>
          <button
            style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1, cursor: saving ? "not-allowed" : "pointer" }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "💾 Save Changes"}
          </button>
        </div>
      </header>

      {/* General Settings */}
      <div style={S.card}>
        <h3 style={S.sectionTitle}>General Section Settings</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={S.label}>Watermark Tagline (Bottom Slogan)</label>
            <input
              style={S.input}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="#Create Impact"
            />
            <div style={S.hint}>Displayed as large stylish watermark text at the bottom of the section.</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, justifyContent: "center" }}>
            <label style={S.checkbox}>
              <input
                type="checkbox"
                checked={showTagline}
                onChange={(e) => setShowTagline(e.target.checked)}
              />
              Show Watermark Tagline
            </label>
            <label style={S.checkbox}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Enable SEO Directory Section on All Pages
            </label>
          </div>
        </div>
      </div>

      {/* Categories List */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "#0f172a" }}>
          Categories &amp; Links ({categories.length})
        </h3>
        <button style={S.btnPrimary} onClick={addCategory}>+ Add Category</button>
      </div>

      {categories.map((cat, catIdx) => (
        <div key={cat.id || catIdx} style={{ ...S.card, padding: 0, overflow: "hidden", marginBottom: 16 }}>
          {/* Category Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>#{catIdx + 1}</span>
              <input
                style={{ ...S.input, width: 340, padding: "6px 10px", fontSize: 13.5, fontWeight: 600, color: "#1e3a8a" }}
                value={cat.title}
                onChange={(e) => updateCategoryTitle(catIdx, e.target.value)}
                placeholder="Category Title"
              />
              <span style={{ fontSize: 11, color: "#94a3b8" }}>({cat.links.length} links)</span>
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              <button style={S.btnGhost} onClick={() => moveCategory(catIdx, -1)} disabled={catIdx === 0} title="Move Up">▲</button>
              <button style={S.btnGhost} onClick={() => moveCategory(catIdx, 1)} disabled={catIdx === categories.length - 1} title="Move Down">▼</button>
              <button style={S.btnDanger} onClick={() => removeCategory(catIdx)} title="Delete Category">🗑 Delete</button>
            </div>
          </div>

          {/* Links list */}
          <div style={{ padding: 18 }}>
            {cat.links.map((link, linkIdx) => (
              <div key={link.id || linkIdx} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8, padding: "6px 10px", background: "#fafafa", border: "1px solid #f1f5f9" }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", width: 20 }}>{linkIdx + 1}.</span>
                <input
                  style={{ ...S.input, flex: 1.6, padding: "6px 10px", fontSize: 13 }}
                  value={link.label}
                  onChange={(e) => updateLink(catIdx, linkIdx, "label", e.target.value)}
                  placeholder="Link Keyword (e.g. Machine Learning Course)"
                />
                <input
                  style={{ ...S.input, flex: 1, padding: "6px 10px", fontSize: 12, fontFamily: "monospace" }}
                  value={link.url}
                  onChange={(e) => updateLink(catIdx, linkIdx, "url", e.target.value)}
                  placeholder="URL (e.g. /courses or /courses/ml)"
                />
                <button style={{ ...S.btnGhost, padding: "4px 8px", fontSize: 11 }} onClick={() => moveLink(catIdx, linkIdx, -1)} disabled={linkIdx === 0}>▲</button>
                <button style={{ ...S.btnGhost, padding: "4px 8px", fontSize: 11 }} onClick={() => moveLink(catIdx, linkIdx, 1)} disabled={linkIdx === cat.links.length - 1}>▼</button>
                <button style={{ ...S.btnDanger, padding: "4px 8px", fontSize: 11 }} onClick={() => removeLink(catIdx, linkIdx)}>✕</button>
              </div>
            ))}

            <button
              style={{ ...S.btnGhost, marginTop: 8, fontSize: 12, borderColor: "#cbd5e1", borderStyle: "dashed" }}
              onClick={() => addLink(catIdx)}
            >
              + Add Link to {cat.title || "Category"}
            </button>
          </div>
        </div>
      ))}

      {/* JSON Modals */}
      {activeSubModal === "export" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }} onClick={() => setActiveSubModal("none")}>
          <div style={{ background: "#fff", width: "100%", maxWidth: 750, maxHeight: "85vh", display: "flex", flexDirection: "column", padding: 24 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Export JSON</h3>
              <button style={S.btnGhost} onClick={() => setActiveSubModal("none")}>✕</button>
            </div>
            <textarea
              readOnly
              value={jsonInput}
              style={{ width: "100%", minHeight: 320, fontFamily: "monospace", fontSize: 12, padding: 12, border: "1px solid #e2e8f0", background: "#f8fafc", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
              <button style={S.btnPrimary} onClick={() => { navigator.clipboard.writeText(jsonInput); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                {copied ? "✓ Copied!" : "📋 Copy to Clipboard"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSubModal === "import" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }} onClick={() => setActiveSubModal("none")}>
          <div style={{ background: "#fff", width: "100%", maxWidth: 750, maxHeight: "85vh", display: "flex", flexDirection: "column", padding: 24 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Import JSON</h3>
              <button style={S.btnGhost} onClick={() => setActiveSubModal("none")}>✕</button>
            </div>
            <textarea
              value={jsonInput}
              onChange={(e) => { setJsonInput(e.target.value); setJsonError(null); }}
              placeholder={`{\n  "tagline": "#Create Impact",\n  "categories": [\n    {\n      "title": "Top Programs",\n      "links": [{ "label": "Software and AI Engineering", "url": "/courses" }]\n    }\n  ]\n}`}
              style={{ width: "100%", minHeight: 320, fontFamily: "monospace", fontSize: 12, padding: 12, border: `1.5px solid ${jsonError ? "#ef4444" : "#e2e8f0"}`, boxSizing: "border-box" }}
            />
            {jsonError && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 6 }}>⚠️ {jsonError}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
              <button style={S.btnGhost} onClick={() => setActiveSubModal("none")}>Cancel</button>
              <button style={S.btnPrimary} onClick={handleApplyJsonImport}>Apply to Editor</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SeoDirectoryPage() {
  return (
    <AdminProvider>
      <SeoDirectoryInner />
    </AdminProvider>
  );
}
