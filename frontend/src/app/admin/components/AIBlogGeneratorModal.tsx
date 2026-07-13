"use client";
import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL } from "@/lib/config";
import { useToast } from "./ToastProvider";

interface Category { id: number; name: string; }
interface SubCategory { id: number; name: string; category_id: number; }

export interface AIBlogData {
  title: string;
  excerpt: string;
  content_html: string;
  tags: string[];
  category_id?: number;
  subcategory_id?: number;
}

interface Props {
  onClose: () => void;
  onGenerated: (data: AIBlogData) => void;
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  
  .aib-modal {
    position: fixed; inset: 0; z-index: 99999;
    display: flex; flex-direction: column;
    background: #f8fafc;
    font-family: 'Inter', system-ui, sans-serif;
    animation: aib-slide-in .22s cubic-bezier(.4,0,.2,1);
    overflow: hidden;
  }
  @keyframes aib-slide-in { from{opacity:0;transform:scale(.97)} to{opacity:1;transform:scale(1)} }
  @keyframes aib-spin { to { transform: rotate(360deg); } }

  .aib-header {
    background: #0f172a; padding: 14px 24px;
    display: flex; align-items: center; justify-content: space-between;
    box-shadow: 0 2px 12px rgba(0,0,0,.25); flex-shrink: 0;
  }
  .aib-header h2 { margin: 0; font-size: 1rem; font-weight: 700; color: #fff; letter-spacing: -.2px; }
  .aib-header p  { margin: 1px 0 0; font-size: .75rem; color: #94a3b8; }
  .aib-close-btn {
    width: 34px; height: 34px; border-radius: 8px; border: none;
    background: rgba(255,255,255,.08); color: #94a3b8; cursor: pointer;
    display: flex; align-items: center; justify-content: center; transition: background .15s;
  }
  .aib-close-btn:hover { background: rgba(255,255,255,.18); color: #fff; }

  .aib-body { display: flex; flex: 1; overflow: hidden; }
  .aib-left { flex: 7; display: flex; flex-direction: column; border-right: 1px solid #e2e8f0; background: #fff; padding: 24px; overflow-y: auto; }
  .aib-right { flex: 4; background: #f8fafc; padding: 24px; overflow-y: auto; border-left: 1px solid #e2e8f0; }

  .aib-section-title { font-size: .75rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #64748b; margin: 0 0 10px; }

  .aib-prompt {
    width: 100%; border: 1.5px solid #e2e8f0; border-radius: 10px;
    padding: 16px; font-size: .95rem; color: #0f172a; background: #f8fafc;
    resize: vertical; min-height: 200px; outline: none; font-family: inherit; line-height: 1.6;
    transition: all .2s; box-sizing: border-box;
  }
  .aib-prompt:focus { border-color: #38bdf8; box-shadow: 0 0 0 3px rgba(56,189,248,.15); background: #fff; }

  .aib-chip {
    display: inline-flex; align-items: center; padding: 6px 14px;
    border-radius: 20px; border: 1.5px solid #e2e8f0; background: #fff; color: #475569;
    font-size: .78rem; font-weight: 600; cursor: pointer; transition: all .15s; margin: 0 8px 8px 0;
  }
  .aib-chip:hover { border-color: #38bdf8; color: #0369a1; background: #f0f9ff; }

  .aib-field { margin-bottom: 18px; }
  .aib-select {
    width: 100%; padding: 12px 14px; border: 1.5px solid #e2e8f0; border-radius: 8px;
    font-size: .9rem; color: #0f172a; background: #fff; outline: none; transition: all .2s;
  }
  .aib-select:focus { border-color: #38bdf8; box-shadow: 0 0 0 3px rgba(56,189,248,.15); }

  .aib-pills { display: flex; flex-wrap: wrap; gap: 8px; }
  .aib-pill {
    padding: 6px 14px; border-radius: 8px; border: 1.5px solid transparent; background: #e2e8f0; color: #64748b;
    font-size: .8rem; font-weight: 600; cursor: pointer; transition: all .15s;
  }
  .aib-pill.sel { background: #38bdf8; color: #0f172a; border-color: #0284c7; }

  .aib-generate-btn {
    width: 100%; padding: 14px; background: #0f172a; color: #fff; border: none; border-radius: 10px;
    font-size: 1rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;
    transition: all .2s; margin-top: 20px; box-shadow: 0 4px 14px rgba(15,23,42,.2);
  }
  .aib-generate-btn:hover:not(:disabled) { background: #1e293b; box-shadow: 0 6px 20px rgba(15,23,42,.3); }
  .aib-generate-btn:disabled { opacity: .6; cursor: not-allowed; }
  .aib-spinner { width: 18px; height: 18px; border: 2.5px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: aib-spin .7s linear infinite; }
`;

const ENHANCE_PROMPTS = [
  "SEO Optimized", "Professional Tone", "Add real-world examples", "Include Statistics", "Listicle format"
];

export default function AIBlogGeneratorModal({ onClose, onGenerated }: Props) {
  const { showToast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [filteredSubs, setFilteredSubs] = useState<SubCategory[]>([]);
  
  const [catId, setCatId] = useState<number | "">("");
  const [subId, setSubId] = useState<number | "">("");
  const [length, setLength] = useState("Medium");
  const [tone, setTone] = useState("Professional");
  const [generating, setGenerating] = useState(false);

  /* OpenRouter Models */
  interface ORModel { id: string; name: string; pricing?: { prompt?: string; completion?: string }; }
  const [models, setModels] = useState<ORModel[]>([]);
  const [selectedModel, setSelectedModel] = useState("");

  const formatPrice = (val?: string) => {
    if (!val || val === "0") return "Free";
    const n = parseFloat(val);
    if (isNaN(n)) return "—";
    if (n === 0) return "Free";
    return `$${(n * 1000000).toFixed(2)}/M`;
  };

  /* Quick Add States */
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [addingSub, setAddingSub] = useState(false);
  const [newSubName, setNewSubName] = useState("");

  const loadData = useCallback(() => {
    Promise.all([
      apiFetch(`${API_BASE_URL}/blogs/categories`).then(r => r.json()),
      apiFetch(`${API_BASE_URL}/blogs/subcategories`).then(r => r.json()),
      apiFetch(`${API_BASE_URL}/settings/ai/openrouter/models`).then(r => r.ok ? r.json() : Promise.resolve(null)),
    ]).then(([cats, subs, orData]) => {
      setCategories(Array.isArray(cats) ? cats : []);
      setSubCategories(Array.isArray(subs) ? subs : []);
      const orModels = Array.isArray(orData?.data) ? orData.data : [];
      setModels(orModels);
    }).catch(() => {});
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!catId) { setFilteredSubs(subCategories); return; }
    setFilteredSubs(subCategories.filter(s => s.category_id === Number(catId)));
    // Don't auto-clear subId if we just added it, but if it doesn't match the new catId, clear it.
  }, [catId, subCategories]);

  const quickAddCategory = async () => {
    if (!newCatName.trim()) return setAddingCat(false);
    const res = await apiFetch(`${API_BASE_URL}/blogs/categories`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newCatName.trim(), color: "#6366f1", is_active: true }) });
    if (res.ok) { const data = await res.json(); setCatId(data.id); setSubId(""); loadData(); }
    setAddingCat(false); setNewCatName("");
  };

  const quickAddSubCategory = async () => {
    if (!catId) { showToast("Please select a parent Category first.", "error"); return setAddingSub(false); }
    if (!newSubName.trim()) return setAddingSub(false);
    const res = await apiFetch(`${API_BASE_URL}/blogs/subcategories`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newSubName.trim(), category_id: Number(catId), is_active: true }) });
    if (res.ok) { const data = await res.json(); setSubId(data.id); loadData(); }
    setAddingSub(false); setNewSubName("");
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) { showToast("Please enter a prompt.", "error"); return; }
    setGenerating(true);
    
    const catName = categories.find(c => c.id === catId)?.name || null;
    const subName = subCategories.find(s => s.id === subId)?.name || null;

    try {
      const res = await apiFetch(`${API_BASE_URL}/settings/ai/generate_blog`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, category_name: catName, subcategory_name: subName, length, tone, model: selectedModel || null })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.detail || "Generation failed");
      
      const { title, excerpt, content_html, tags } = resData.data;
      
      onGenerated({ title, excerpt, content_html, tags, category_id: catId ? Number(catId) : undefined, subcategory_id: subId ? Number(subId) : undefined });
      showToast("Blog generated successfully!", "success");
      onClose();
    } catch (err: any) {
      console.error("AI Blog Generation Error:", err);
      showToast(err.message || "Failed to generate blog. Check browser console for details.", "error");
    } finally {
      setGenerating(false);
    }
  };

  if (typeof window === "undefined") return null;
  return ReactDOM.createPortal(
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="aib-modal">
        <div className="aib-header">
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 38, height: 38, background: "#38bdf8", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>✨</div>
            <div>
              <h2>AI Blog Assistant</h2>
              <p>Powered by OpenRouter • Generate high-quality SEO-optimized blogs instantly</p>
            </div>
          </div>
          <button className="aib-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="aib-body">
          <div className="aib-left">
            <p className="aib-section-title">What do you want to write about?</p>
            <textarea 
              className="aib-prompt" 
              placeholder="e.g., Write a comprehensive guide on the future of AI in Education, focusing on personalized learning and administrative automation..."
              value={prompt} onChange={e => setPrompt(e.target.value)}
            />
            <div style={{ marginTop: 14 }}>
              <p className="aib-section-title">Enhance Prompt</p>
              {ENHANCE_PROMPTS.map(p => (
                <button key={p} className="aib-chip" onClick={() => setPrompt(prev => prev + (prev.endsWith(" ") ? "" : " ") + p + ". ")}>
                  + {p}
                </button>
              ))}
            </div>
          </div>

          <div className="aib-right">
            <p className="aib-section-title">Blog Context</p>
            
            <div className="aib-field">
              <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6, display: "block" }}>Category</label>
              <select className="aib-select" value={catId} onChange={e => { setCatId(e.target.value ? Number(e.target.value) : ""); setSubId(""); }}>
                <option value="">— Select Category —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {addingCat ? (
                <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                  <input autoFocus value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); quickAddCategory(); } else if (e.key === "Escape") setAddingCat(false); }} placeholder="Category name…" style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1.5px solid #e2e8f0", fontSize: 12, outline: "none" }} />
                  <button onClick={quickAddCategory} style={{ background: "#0f172a", color: "#fff", border: "none", borderRadius: 6, padding: "0 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Add</button>
                </div>
              ) : (
                <button onClick={() => setAddingCat(true)} style={{ background: "none", border: "none", color: "#6366f1", fontSize: 12, fontWeight: 600, marginTop: 6, cursor: "pointer", padding: 0 }}>+ New Category</button>
              )}
            </div>

            <div className="aib-field">
              <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6, display: "block" }}>Sub-category</label>
              <select className="aib-select" value={subId} onChange={e => setSubId(e.target.value ? Number(e.target.value) : "")}>
                <option value="">— Select Sub-category —</option>
                {filteredSubs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {addingSub ? (
                <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                  <input autoFocus value={newSubName} onChange={e => setNewSubName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); quickAddSubCategory(); } else if (e.key === "Escape") setAddingSub(false); }} placeholder="Sub-category name…" style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1.5px solid #e2e8f0", fontSize: 12, outline: "none" }} />
                  <button onClick={quickAddSubCategory} style={{ background: "#0f172a", color: "#fff", border: "none", borderRadius: 6, padding: "0 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Add</button>
                </div>
              ) : (
                <button onClick={() => setAddingSub(true)} style={{ background: "none", border: "none", color: "#6366f1", fontSize: 12, fontWeight: 600, marginTop: 6, cursor: "pointer", padding: 0 }}>+ New Sub-category</button>
              )}
            </div>

            <p className="aib-section-title" style={{ marginTop: 24 }}>Generation Settings</p>
            
            <div className="aib-field">
              <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6, display: "block" }}>Approximate Length</label>
              <div className="aib-pills">
                {["Short", "Medium", "Long"].map(l => (
                  <button key={l} className={`aib-pill ${length === l ? "sel" : ""}`} onClick={() => setLength(l)}>{l}</button>
                ))}
              </div>
            </div>

            <div className="aib-field">
              <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6, display: "block" }}>Tone of Voice</label>
              <div className="aib-pills">
                {["Professional", "Casual", "Informative", "Academic", "Humorous"].map(t => (
                  <button key={t} className={`aib-pill ${tone === t ? "sel" : ""}`} onClick={() => setTone(t)}>{t}</button>
                ))}
              </div>
            </div>

            {/* Model selector */}
            {models.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p className="aib-section-title">AI Model</p>
                <select
                  value={selectedModel}
                  onChange={e => setSelectedModel(e.target.value)}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 8,
                    border: "1.5px solid #e2e8f0", outline: "none", fontSize: 13,
                    color: "#0f172a", background: "#fff", fontFamily: "inherit",
                    cursor: "pointer"
                  }}
                >
                  <option value="">Default (from AI Settings)</option>
                  {models.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} — {formatPrice(m.pricing?.prompt)} / {formatPrice(m.pricing?.completion)}
                    </option>
                  ))}
                </select>
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8" }}>
                  Pricing shown per 1M tokens.
                </p>
              </div>
            )}

            <button className="aib-generate-btn" onClick={handleGenerate} disabled={generating || !prompt.trim()}>
              {generating ? <div className="aib-spinner" /> : "✨ Generate Article"}
            </button>
            <p style={{ textAlign: "center", fontSize: 12, color: "#94a3b8", marginTop: 12 }}>
              The AI will automatically generate the Title, Excerpt, Content, and Tags based on your selections.
            </p>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
