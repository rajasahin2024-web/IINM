"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL } from "@/lib/config";
import { AdminProvider } from "../../components/ProtectedAdmin";

interface Cat { id: number; name: string; slug: string; description: string | null; color: string; is_active: boolean; subcategory_count: number; post_count: number }
interface Sub { id: number; category_id: number; category_name: string | null; name: string; slug: string; description: string | null; is_active: boolean; post_count: number }

const COLORS = ["#6366f1","#10b981","#f59e0b","#ef4444","#3b82f6","#8b5cf6","#ec4899","#14b8a6","#f97316","#64748b"];

// --- Floating Input -------------------------------------------
function FloatingInput({ label, type = "text", value, onChange, required, isTextArea = false }: {
  label: string; type?: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  required?: boolean; isTextArea?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const hasValue = value !== undefined && value !== null && value !== "";

  const labelStyle: React.CSSProperties = {
    position: "absolute", left: "14px",
    top: focused || hasValue ? "-9px" : (isTextArea ? "14px" : "50%"),
    transform: focused || hasValue ? "none" : (isTextArea ? "none" : "translateY(-50%)"),
    fontSize: focused || hasValue ? "11px" : "14px",
    fontWeight: focused || hasValue ? 600 : 400,
    color: focused ? "#6366f1" : hasValue ? "#64748b" : "#94a3b8",
    background: focused || hasValue ? "#fff" : "transparent",
    padding: focused || hasValue ? "0 4px" : "0",
    transition: "all 0.2s cubic-bezier(.4,0,.2,1)",
    pointerEvents: "none", zIndex: 1,
    letterSpacing: focused || hasValue ? "0.3px" : "0",
  };

  const inputCss: React.CSSProperties = {
    width: "100%", padding: "14px 16px", borderRadius: "10px",
    border: `1.5px solid ${focused ? "#6366f1" : "#e2e8f0"}`,
    outline: "none", fontSize: "14px", color: "#0f172a", background: "#fff",
    transition: "border-color 0.2s, box-shadow 0.2s", boxSizing: "border-box" as const,
    boxShadow: focused ? "0 0 0 3px rgba(99,102,241,0.12)" : "none",
    resize: isTextArea ? "vertical" as const : undefined,
    fontFamily: "inherit", minHeight: isTextArea ? "90px" : "auto",
  };

  return (
    <div style={{ position: "relative", width: "100%", marginBottom: "4px" }}>
      {isTextArea ? (
        <textarea required={required} style={inputCss} value={value} onChange={onChange}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
      ) : (
        <input type={type} required={required} style={inputCss} value={value} onChange={onChange}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
      )}
      <label style={labelStyle}>{label}</label>
    </div>
  );
}

// --- Floating Select ------------------------------------------
function FloatingSelect({ label, value, onChange, required, children }: {
  label: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  required?: boolean; children: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  // For select fields with a placeholder text option, always float the label so they don't overlap.
  const hasValue = true; 

  const labelStyle: React.CSSProperties = {
    position: "absolute", left: "14px",
    top: focused || hasValue ? "-9px" : "50%",
    transform: focused || hasValue ? "none" : "translateY(-50%)",
    fontSize: focused || hasValue ? "11px" : "14px",
    fontWeight: focused || hasValue ? 600 : 400,
    color: focused ? "#6366f1" : hasValue ? "#64748b" : "#94a3b8",
    background: focused || hasValue ? "#fff" : "transparent",
    padding: focused || hasValue ? "0 4px" : "0",
    transition: "all 0.2s cubic-bezier(.4,0,.2,1)",
    pointerEvents: "none", zIndex: 1,
    letterSpacing: focused || hasValue ? "0.3px" : "0",
  };

  const inputCss: React.CSSProperties = {
    width: "100%", padding: "14px 16px", borderRadius: "10px",
    border: `1.5px solid ${focused ? "#6366f1" : "#e2e8f0"}`,
    outline: "none", fontSize: "14px", color: "#0f172a", background: "#fff",
    transition: "border-color 0.2s, box-shadow 0.2s", boxSizing: "border-box" as const,
    boxShadow: focused ? "0 0 0 3px rgba(99,102,241,0.12)" : "none",
    fontFamily: "inherit", appearance: "none"
  };

  return (
    <div style={{ position: "relative", width: "100%", marginBottom: "4px" }}>
      <select required={required} style={inputCss} value={value} onChange={onChange}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
        {children}
      </select>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#94a3b8" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </div>
    </div>
  );
}

function CategoriesPage() {
  const router = useRouter();
  const [cats, setCats]           = useState<Cat[]>([]);
  const [subs, setSubs]           = useState<Sub[]>([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState<"categories" | "subcategories">("categories");

  /* Category form */
  const [catModal, setCatModal]   = useState(false);
  const [editCat, setEditCat]     = useState<Cat | null>(null);
  const [cName, setCName]         = useState("");
  const [cDesc, setCDesc]         = useState("");
  const [cColor, setCColor]       = useState(COLORS[0]);
  const [cActive, setCActive]     = useState(true);

  /* Sub-category form */
  const [subModal, setSubModal]   = useState(false);
  const [editSub, setEditSub]     = useState<Sub | null>(null);
  const [sName, setSName]         = useState("");
  const [sDesc, setSDesc]         = useState("");
  const [sCatId, setSCatId]       = useState<number | "">("");
  const [sActive, setSActive]     = useState(true);

  const [saving, setSaving]       = useState(false);
  const [delConfirm, setDelConfirm] = useState<{ type: "cat" | "sub"; item: Cat | Sub } | null>(null);

  /* Inline Category Add inside Sub-category Modal */
  const [addingInlineCat, setAddingInlineCat] = useState(false);
  const [inlineCatName, setInlineCatName] = useState("");

  const saveInlineCat = async () => {
    if (!inlineCatName.trim()) { setAddingInlineCat(false); return; }
    setSaving(true);
    const body = { name: inlineCatName.trim(), description: null, color: COLORS[0], is_active: true };
    const res = await apiFetch(`${API_BASE_URL}/blogs/categories`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      const created = await res.json();
      setSCatId(created.id);
    }
    setSaving(false);
    setAddingInlineCat(false);
    setInlineCatName("");
    load();
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [cr, sr] = await Promise.all([
      apiFetch(`${API_BASE_URL}/blogs/categories`),
      apiFetch(`${API_BASE_URL}/blogs/subcategories`),
    ]);
    if (cr.ok) setCats(await cr.json());
    if (sr.ok) setSubs(await sr.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* Category CRUD */
  const openCatCreate = () => { setEditCat(null); setCName(""); setCDesc(""); setCColor(COLORS[0]); setCActive(true); setCatModal(true); };
  const openCatEdit   = (c: Cat) => { setEditCat(c); setCName(c.name); setCDesc(c.description ?? ""); setCColor(c.color); setCActive(c.is_active); setCatModal(true); };
  const saveCat = async () => {
    if (!cName.trim()) return;
    setSaving(true);
    const body = { name: cName.trim(), description: cDesc || null, color: cColor, is_active: cActive };
    const url = editCat ? `${API_BASE_URL}/blogs/categories/${editCat.id}` : `${API_BASE_URL}/blogs/categories`;
    const method = editCat ? "PUT" : "POST";
    await apiFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSaving(false); setCatModal(false); load();
  };

  /* Sub-category CRUD */
  const openSubCreate = (catId?: number) => { setEditSub(null); setSName(""); setSDesc(""); setSCatId(catId ?? ""); setSActive(true); setSubModal(true); };
  const openSubEdit   = (s: Sub) => { setEditSub(s); setSName(s.name); setSDesc(s.description ?? ""); setSCatId(s.category_id); setSActive(s.is_active); setSubModal(true); };
  const saveSub = async () => {
    if (!sName.trim() || !sCatId) return;
    setSaving(true);
    const body = { name: sName.trim(), category_id: Number(sCatId), description: sDesc || null, is_active: sActive };
    const url = editSub ? `${API_BASE_URL}/blogs/subcategories/${editSub.id}` : `${API_BASE_URL}/blogs/subcategories`;
    const method = editSub ? "PUT" : "POST";
    await apiFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSaving(false); setSubModal(false); load();
  };

  /* Delete */
  const doDelete = async () => {
    if (!delConfirm) return;
    const { type, item } = delConfirm;
    const url = type === "cat"
      ? `${API_BASE_URL}/blogs/categories/${item.id}`
      : `${API_BASE_URL}/blogs/subcategories/${item.id}`;
    await apiFetch(url, { method: "DELETE" });
    setDelConfirm(null); load();
  };

  return (
    <div style={{ padding: "28px 36px" }}>
      <style>{`
        .cat-row { transition: background 0.1s; }
        .cat-row:hover { background: #f8fafc !important; }
        .cat-action { border: none; cursor: pointer; border-radius: 6px; padding: 5px 12px; font-size: 12px; font-weight: 500; transition: opacity 0.15s; }
        .cat-action:hover { opacity: 0.8; }
        input:focus, select:focus, textarea:focus { outline: none !important; border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.1) !important; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <button onClick={() => router.push("/admin/blogs")} style={{ background: "none", border: "none", cursor: "pointer", color: "#6366f1", fontSize: 13, fontWeight: 600, padding: 0, marginBottom: 6 }}>← Back to Blogs</button>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0 }}>Blog Categories</h1>
          <p style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>Organise your posts with categories and sub-categories</p>
        </div>
        <button
          onClick={() => tab === "categories" ? openCatCreate() : openSubCreate()}
          style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >
          + {tab === "categories" ? "New Category" : "New Sub-category"}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "#f1f5f9", padding: 4, borderRadius: 10, marginBottom: 20, width: "fit-content" }}>
        {(["categories", "subcategories"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            border: "none", borderRadius: 7, padding: "7px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer",
            background: tab === t ? "#fff" : "transparent",
            color: tab === t ? "#0f172a" : "#64748b",
            boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            transition: "all 0.15s",
          }}>
            {t === "categories" ? `📁 Categories (${cats.length})` : `📂 Sub-categories (${subs.length})`}
          </button>
        ))}
      </div>

      {/* Categories Table */}
      {tab === "categories" && (
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "28px 2fr 1fr 1fr 60px 60px 160px", gap: 12, padding: "10px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            {["", "Name", "Description", "Slug", "Subs", "Posts", "Actions"].map(h => (
              <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</span>
            ))}
          </div>
          {loading ? <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading…</div>
           : cats.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📁</div>
              <div style={{ color: "#64748b", fontWeight: 500 }}>No categories yet</div>
              <button onClick={openCatCreate} style={{ marginTop: 12, background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Create First Category</button>
            </div>
          ) : cats.map((c, i) => (
            <div key={c.id} className="cat-row" style={{ display: "grid", gridTemplateColumns: "28px 2fr 1fr 1fr 60px 60px 160px", gap: 12, padding: "12px 20px", borderBottom: i < cats.length - 1 ? "1px solid #f1f5f9" : "none", alignItems: "center", background: "#fff" }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 13.5 }}>{c.name}</div>
                {!c.is_active && <span style={{ fontSize: 10, color: "#94a3b8" }}>inactive</span>}
              </div>
              <div style={{ fontSize: 12.5, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.description ?? "—"}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", fontFamily: "monospace" }}>{c.slug}</div>
              <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 600 }}>{c.subcategory_count}</div>
              <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 600 }}>{c.post_count}</div>
              <div style={{ display: "flex", gap: 5 }}>
                <button className="cat-action" style={{ background: "#ede9fe", color: "#6d28d9" }} onClick={() => openCatEdit(c)}>Edit</button>
                <button className="cat-action" style={{ background: "#d1fae5", color: "#065f46" }} onClick={() => openSubCreate(c.id)}>+ Sub</button>
                <button className="cat-action" style={{ background: "#fee2e2", color: "#991b1b" }} onClick={() => setDelConfirm({ type: "cat", item: c })}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sub-categories Table */}
      {tab === "subcategories" && (
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 60px 110px", gap: 12, padding: "10px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            {["Name", "Category", "Slug", "Posts", "Actions"].map(h => (
              <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</span>
            ))}
          </div>
          {loading ? <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading…</div>
           : subs.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📂</div>
              <div style={{ color: "#64748b", fontWeight: 500 }}>No sub-categories yet</div>
              <button onClick={() => openSubCreate()} style={{ marginTop: 12, background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Create First Sub-category</button>
            </div>
          ) : subs.map((s, i) => (
            <div key={s.id} className="cat-row" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 60px 110px", gap: 12, padding: "12px 20px", borderBottom: i < subs.length - 1 ? "1px solid #f1f5f9" : "none", alignItems: "center", background: "#fff" }}>
              <div>
                <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 13.5 }}>{s.name}</div>
                {s.description && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 1 }}>{s.description}</div>}
              </div>
              <div>
                {s.category_name && <span style={{ fontSize: 12, background: "#ede9fe", color: "#6d28d9", padding: "2px 8px", borderRadius: 100, fontWeight: 600 }}>{s.category_name}</span>}
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", fontFamily: "monospace" }}>{s.slug}</div>
              <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 600 }}>{s.post_count}</div>
              <div style={{ display: "flex", gap: 5 }}>
                <button className="cat-action" style={{ background: "#ede9fe", color: "#6d28d9" }} onClick={() => openSubEdit(s)}>Edit</button>
                <button className="cat-action" style={{ background: "#fee2e2", color: "#991b1b" }} onClick={() => setDelConfirm({ type: "sub", item: s })}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Category Modal ── */}
      {catModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "28px 24px", width: 500, boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}>
            <h3 style={{ margin: "0 0 20px", fontSize: 17, fontWeight: 700 }}>{editCat ? "Edit Category" : "New Category"}</h3>
            <div style={{ marginBottom: 18 }}>
              <FloatingInput label="Name *" value={cName} onChange={e => setCName(e.target.value)} required />
            </div>
            <div style={{ marginBottom: 18 }}>
              <FloatingInput label="Description" value={cDesc} onChange={e => setCDesc(e.target.value)} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8, display: "block" }}>Color</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {COLORS.map(c => (
                  <div key={c} onClick={() => setCColor(c)} style={{ width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer", border: cColor === c ? "3px solid #0f172a" : "2px solid transparent", boxSizing: "border-box", transition: "all 0.15s" }} />
                ))}
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#475569", marginBottom: 20, cursor: "pointer" }}>
              <input type="checkbox" checked={cActive} onChange={e => setCActive(e.target.checked)} /> Active
            </label>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setCatModal(false)} style={{ border: "1.5px solid #e2e8f0", background: "#fff", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={saveCat} disabled={saving || !cName.trim()} style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: !cName.trim() ? 0.5 : 1 }}>
                {saving ? "Saving…" : "Save Category"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sub-category Modal ── */}
      {subModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "28px 24px", width: 500, boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}>
            <h3 style={{ margin: "0 0 20px", fontSize: 17, fontWeight: 700 }}>{editSub ? "Edit Sub-category" : "New Sub-category"}</h3>
            <div style={{ marginBottom: 18 }}>
              <FloatingSelect label="Parent Category *" value={sCatId.toString()} onChange={e => setSCatId(e.target.value === "" ? "" : Number(e.target.value))} required>
                <option value="">— Select category —</option>
                {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </FloatingSelect>
              
              {!addingInlineCat ? (
                <button
                  type="button"
                  onClick={() => { setAddingInlineCat(true); setInlineCatName(""); }}
                  style={{ background: "none", border: "none", padding: "4px 0", marginTop: 6, fontSize: 12, fontWeight: 700, color: "#6366f1", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  + Add New Category
                </button>
              ) : (
                <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center" }}>
                  <input
                    autoFocus
                    type="text"
                    value={inlineCatName}
                    onChange={(e) => setInlineCatName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveInlineCat(); } if (e.key === "Escape") setAddingInlineCat(false); }}
                    placeholder="Category name…"
                    style={{ flex: 1, padding: "7px 10px", borderRadius: 7, border: "1.5px solid #6366f1", fontSize: 13, outline: "none", color: "#0f172a" }}
                  />
                  <button type="button" onClick={saveInlineCat} disabled={saving || !inlineCatName.trim()} style={{ padding: "7px 13px", borderRadius: 7, border: "none", background: "#6366f1", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    {saving ? "…" : "Save"}
                  </button>
                  <button type="button" onClick={() => setAddingInlineCat(false)} style={{ padding: "7px 10px", borderRadius: 7, border: "none", background: "#f1f5f9", color: "#64748b", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    ✕
                  </button>
                </div>
              )}
            </div>
            <div style={{ marginBottom: 18 }}>
              <FloatingInput label="Name *" value={sName} onChange={e => setSName(e.target.value)} required />
            </div>
            <div style={{ marginBottom: 18 }}>
              <FloatingInput label="Description" value={sDesc} onChange={e => setSDesc(e.target.value)} />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#475569", marginBottom: 20, cursor: "pointer" }}>
              <input type="checkbox" checked={sActive} onChange={e => setSActive(e.target.checked)} /> Active
            </label>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setSubModal(false)} style={{ border: "1.5px solid #e2e8f0", background: "#fff", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={saveSub} disabled={saving || !sName.trim() || !sCatId} style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: (!sName.trim() || !sCatId) ? 0.5 : 1 }}>
                {saving ? "Saving…" : "Save Sub-category"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {delConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "28px 24px", maxWidth: 380, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
            <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700 }}>Delete {delConfirm.type === "cat" ? "Category" : "Sub-category"}?</h3>
            <p style={{ fontSize: 13.5, color: "#64748b", margin: "0 0 24px" }}>
              "<strong>{delConfirm.item.name}</strong>" will be deleted. {delConfirm.type === "cat" ? "All sub-categories will also be removed." : ""}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setDelConfirm(null)} style={{ border: "1.5px solid #e2e8f0", background: "#fff", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={doDelete} style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BlogCategoriesPageWrapper() {
  return <AdminProvider><CategoriesPage /></AdminProvider>;
}
