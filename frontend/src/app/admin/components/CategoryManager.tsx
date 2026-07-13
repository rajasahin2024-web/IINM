"use client";
import { apiFetch } from "@/lib/apiFetch";
import React, { useEffect, useState, useCallback } from "react";
import DeleteModal from "./DeleteModal";
import PromptModal from "./PromptModal";
import { Icon } from "../icons";
import { API_BASE_URL, BASE_URL } from "@/lib/config";
import { useToast } from "./ToastProvider";

interface Category {
  id: number;
  name: string;
  icon_url?: string;
  banner_url?: string;
  is_active?: boolean;
  desktop_banner_ratio?: string;
  mobile_banner_ratio?: string;
  created_at: string;
}

interface SubCategory {
  id: number;
  name: string;
  category_id: number;
  created_at: string;
}

const resolveImageUrl = (url?: string): string => {
  if (!url) return "";
  return url.replace("/api/uploads/", "/uploads/");
};

// ─── REUSABLE COMPONENTS ──────────────────────────────────────────

const FLOAT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  .cm-field-wrap { margin-bottom: 0; width: 100%; }

  .cm-field {
    position: relative;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    background: #f8fafc;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  }
  .cm-field.focused {
    border-color: #38bdf8;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
  }

  .cm-label {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 14px;
    color: #94a3b8;
    pointer-events: none;
    transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
    background: transparent;
    padding: 0 3px;
    white-space: nowrap;
    line-height: 1;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .cm-label.up {
    top: 0;
    transform: translateY(-50%);
    font-size: 11px;
    font-weight: 600;
    color: #38bdf8;
    background: #fff;
  }
  .cm-label-ta {
    position: absolute;
    left: 14px;
    top: 14px;
    transform: none;
    font-size: 14px;
    color: #94a3b8;
    pointer-events: none;
    transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
    background: transparent;
    padding: 0 3px;
    line-height: 1;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .cm-label-ta.up {
    top: 0;
    transform: translateY(-50%);
    font-size: 11px;
    font-weight: 600;
    color: #38bdf8;
    background: #fff;
  }

  .cm-inp {
    display: block;
    width: 100%;
    padding: 20px 14px 8px;
    border: none;
    outline: none;
    font-size: 14px;
    color: #0f172a;
    background: transparent;
    border-radius: 10px;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .cm-ta {
    display: block;
    width: 100%;
    padding: 24px 14px 10px;
    border: none;
    outline: none;
    font-size: 14px;
    color: #0f172a;
    background: transparent;
    border-radius: 10px;
    resize: vertical;
    min-height: 100px;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .cm-req { color: #ef4444; margin-left: 2px; }

  /* Delete Confirm Modal */
  .cm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100000; display: flex; align-items: center; justify-content: center; }
  .cm-confirm { background: #fff; width: 90%; max-width: 440px; border-radius: 12px; padding: 32px 24px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.15); animation: cm-in .2s ease; }
  .cm-confirm-icon-wrap { width: 56px; height: 56px; border-radius: 50%; background: #fef2f2; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: #dc2626; }
  .cm-confirm-ht { font-size: 1.25rem; font-weight: 700; color: #0f172a; margin: 0 0 8px; }
  .cm-confirm-pill { display: inline-block; padding: 4px 10px; background: #eff6ff; color: #3b82f6; font-size: 0.75rem; font-weight: 600; border-radius: 4px; margin-bottom: 16px; }
  .cm-confirm-tx { font-size: 0.875rem; color: #475569; line-height: 1.6; margin-bottom: 24px; }
  .cm-confirm-tx strong { color: #0f172a; font-weight: 600; }
  .cm-confirm-row { display: flex; gap: 12px; justify-content: center; }
  .cm-confirm-btn-cancel { flex: 1; padding: 10px 0; border: 1px solid #cbd5e1; background: #fff; border-radius: 6px; font-weight: 600; font-size: 0.9rem; cursor: pointer; color: #475569; transition: background 0.2s; }
  .cm-confirm-btn-cancel:hover { background: #f8fafc; }
  .cm-confirm-btn-del { flex: 1; padding: 10px 0; border: none; background: #ef4444; border-radius: 6px; font-weight: 600; font-size: 0.9rem; cursor: pointer; color: #fff; transition: background 0.2s; }
  .cm-confirm-btn-del:hover { background: #dc2626; }
  @keyframes cm-in { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
`;

function FloatingInput({ label, type = "text", value, onChange, onKeyDown, isTextArea = false, required = false }: any) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || (value && value.toString().length > 0);

  return (
    <div className="cm-field-wrap">
      <div className={`cm-field${focused ? " focused" : ""}`}>
        <label className={isTextArea ? `cm-label-ta${lifted ? " up" : ""}` : `cm-label${lifted ? " up" : ""}`}>
          {label}{required && <span className="cm-req">*</span>}
        </label>
        {isTextArea ? (
          <textarea
            className="cm-ta"
            value={value}
            required={required}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        ) : (
          <input
            type={type}
            className="cm-inp"
            value={value}
            required={required}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        )}
      </div>
    </div>
  );
}


function ImageDropzone({ label, onUpload, preview, iconName }: { label: string; onUpload: (file: File) => void; preview: string; iconName: string; }) {
  const [dragActive, setDragActive] = useState(false);
  const inputId = "file-" + label.split(" ").join("-");

  return (
    <div>
       <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6, display: "block" }}>{label}</label>
       <div 
         style={{ border: `2px dashed ${dragActive ? '#38bdf8' : '#e2e8f0'}`, borderRadius: 10, padding: "16px", textAlign: 'center', cursor: 'pointer', background: dragActive ? '#f0f9ff' : '#f8fafc', transition: 'all 0.2s', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '130px' }}
         onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
         onDragLeave={() => setDragActive(false)}
         onDrop={(e) => { e.preventDefault(); setDragActive(false); if(e.dataTransfer.files[0]) onUpload(e.dataTransfer.files[0]); }}
         onClick={() => document.getElementById(inputId)?.click()}
       >
          <div style={{color: dragActive ? '#38bdf8' : '#94a3b8', marginBottom: 8}}><Icon name={iconName} size={24} /></div>
          <div style={{fontSize: 12, color: '#475569', fontWeight: 500}}>
             <span style={{color: '#38bdf8', fontWeight: 600}}>Click</span> or drag image
          </div>
          <input id={inputId} type="file" accept=".png,.jpg,.jpeg,.svg,.webp" style={{display: 'none'}} onChange={(e) => { if (e.target.files && e.target.files[0]) onUpload(e.target.files[0]); }} />
          {preview && (
             <div style={{marginTop: 12}}>
               <img src={preview} style={{maxHeight: 60, borderRadius: 6, objectFit: 'contain', border: '1px solid #e2e8f0', background: '#fff', padding: 2}} alt="Preview" />
             </div>
          )}
       </div>
    </div>
  );
}


export default function CategoryManager() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedCat, setExpandedCat] = useState<number | null>(null);

  // Category Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState({
    name: "",
    icon_url: "",
    banner_url: "",
    is_active: true,
    desktop_banner_ratio: "",
    mobile_banner_ratio: ""
  });
  const [tempSubcats, setTempSubcats] = useState<string[]>([]);
  const [subcatInput, setSubcatInput] = useState("");
  const [savingCat, setSavingCat] = useState(false);

  // Modals State
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'single' | 'bulk' | 'sub', id?: number, name?: string } | null>(null);
  const [promptType, setPromptType] = useState<"add_sub" | "edit_sub" | null>(null);
  const [promptCatId, setPromptCatId] = useState<number | null>(null);
  const [promptSubcatObj, setPromptSubcatObj] = useState<SubCategory | null>(null);

  // Pagination bounds
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const executeBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    let successCount = 0;
    try {
      await Promise.all(
        selectedIds.map(async id => {
          const res = await apiFetch(`${API_BASE_URL}/categories/${id}`, { method: "DELETE" });
          if (res.ok) successCount++;
        })
      );
      showToast(`Successfully deleted ${successCount} categorie(s).`);
      setSelectedIds([]);
      fetchAll();
    } catch {
      showToast("Error during bulk delete", "error");
    } finally {
      setIsBulkDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setDeleteConfirm({ type: 'bulk' });
  };

  const fetchAll = useCallback(async () => {
    try {
      const [catRes, subRes] = await Promise.all([
        apiFetch(`${API_BASE_URL}/categories?search=${search}`),
        apiFetch(`${API_BASE_URL}/subcategories`)
      ]);
      if (catRes.ok) setCategories(await catRes.json());
      if (subRes.ok) setSubCategories(await subRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const handleFileUpload = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await apiFetch(`${API_BASE_URL}/settings/site/upload`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        return `${BASE_URL}${data.url}`;
      }
      throw new Error("Upload failed");
    } catch(err) {
      console.error(err);
      showToast("Failed to upload image.", "error");
      return null;
    }
  };

  const toggleCategoryStatus = async (cat: Category) => {
    const newStatus = cat.is_active !== false ? false : true;
    
    // Optimistic UI update
    setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, is_active: newStatus } : c));
    
    try {
      const payload = {
         name: cat.name,
         icon_url: cat.icon_url || "",
         banner_url: cat.banner_url || "",
         is_active: newStatus,
         desktop_banner_ratio: cat.desktop_banner_ratio || "",
         mobile_banner_ratio: cat.mobile_banner_ratio || ""
      };
      const res = await apiFetch(`${API_BASE_URL}/categories/${cat.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to toggle status");
    } catch(e) {
       console.error(e);
       setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, is_active: !newStatus } : c));
       showToast("Could not toggle status", "error");
    }
  };

  // —— CATEGORY ACTIONS ——
  const openAddCategory = () => {
    setEditingCategory(null);
    setCatForm({ name: "", icon_url: "", banner_url: "", is_active: true, desktop_banner_ratio: "", mobile_banner_ratio: "" });
    setTempSubcats([]);
    setSubcatInput("");
    setModalOpen(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCatForm({
      name: cat.name,
      icon_url: resolveImageUrl(cat.icon_url) || "",
      banner_url: resolveImageUrl(cat.banner_url) || "",
      is_active: cat.is_active !== false,
      desktop_banner_ratio: cat.desktop_banner_ratio || "",
      mobile_banner_ratio: cat.mobile_banner_ratio || ""
    });
    setTempSubcats([]);
    setSubcatInput("");
    setModalOpen(true);
  };

  const saveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name) { showToast("Category name is required", "error"); return; }
    
    const ratioRegex = /^\d+:\d+$/;
    if (catForm.desktop_banner_ratio && !ratioRegex.test(catForm.desktop_banner_ratio)) {
       showToast("Desktop Banner Ratio must be in format like '16:9'", "error"); return;
    }
    if (catForm.mobile_banner_ratio && !ratioRegex.test(catForm.mobile_banner_ratio)) {
       showToast("Mobile Banner Ratio must be in format like '1:1'", "error"); return;
    }

    setSavingCat(true);
    try {
      const url = editingCategory ? `${API_BASE_URL}/categories/${editingCategory.id}` : `${API_BASE_URL}/categories`;
      const method = editingCategory ? "PUT" : "POST";
      
      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(catForm),
      });

      if (res.ok) {
        const savedCat = await res.json();
        
        // Save dynamically added subcategories
        const finalSubcats = [...tempSubcats];
        if (subcatInput.trim() && !finalSubcats.includes(subcatInput.trim())) {
           finalSubcats.push(subcatInput.trim());
        }

        if (finalSubcats.length > 0) {
           await Promise.all(finalSubcats.map(subName => 
               apiFetch(`${API_BASE_URL}/categories/${savedCat.id}/subcategories`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name: subName, category_id: savedCat.id })
               })
           ));
        }

        showToast(editingCategory ? "Category updated!" : "Category created!");
        setModalOpen(false);
        fetchAll();
      } else {
        const err = await res.json();
        throw new Error(err.detail || "Failed to save");
      }
    } catch (err: any) {
      showToast(err.message || "An error occurred", "error");
    } finally {
      setSavingCat(false);
    }
  };

  const triggerDeleteCategory = (cat: Category) => setDeleteConfirm({ type: 'single', id: cat.id, name: cat.name });
  const triggerDeleteSubCategory = (sub: SubCategory) => setDeleteConfirm({ type: 'sub', id: sub.id, name: sub.name });

  const confirmDeleteCategory = async (id: number) => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/categories/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Category deleted!");
        fetchAll();
        setSelectedIds(prev => prev.filter(sel => sel !== id));
      } else {
        throw new Error("Failed to delete category");
      }
    } catch {
      showToast("Failed to delete category", "error");
    } finally {
      setDeleteConfirm(null);
    }
  };

  const confirmDeleteSubCategory = async (id: number) => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/subcategories/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Sub-category deleted!");
        fetchAll();
      } else {
        throw new Error("Failed to delete sub-category");
      }
    } catch {
      showToast("Failed to delete sub-category", "error");
    } finally {
      setDeleteConfirm(null);
    }
  };

  const executeDeleteAction = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'bulk') executeBulkDelete();
    else if (deleteConfirm.type === 'single' && deleteConfirm.id) confirmDeleteCategory(deleteConfirm.id);
    else if (deleteConfirm.type === 'sub' && deleteConfirm.id) confirmDeleteSubCategory(deleteConfirm.id);
  };

  // —— SUBCATEGORY ACTIONS ——
  const handleAddSubCategoryPrompt = (catId: number) => {
    setPromptCatId(catId);
    setPromptType("add_sub");
  };

  const handleEditSubCategoryPrompt = (sub: SubCategory) => {
    setPromptSubcatObj(sub);
    setPromptType("edit_sub");
  };

  const submitPrompt = async (value: string) => {
    if (promptType === "add_sub" && promptCatId) {
      const res = await apiFetch(`${API_BASE_URL}/categories/${promptCatId}/subcategories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: value, category_id: promptCatId }),
      });
      if (res.ok) {
        showToast("Sub-category added!");
        fetchAll();
      } else {
        showToast("Failed to add sub-category", "error");
      }
    } else if (promptType === "edit_sub" && promptSubcatObj) {
      if (value !== promptSubcatObj.name) {
        const res = await apiFetch(`${API_BASE_URL}/subcategories/${promptSubcatObj.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: value }),
        });
        if (res.ok) {
          showToast("Sub-category updated!");
          fetchAll();
        } else {
          showToast("Failed to update sub-category", "error");
        }
      }
    }
    setPromptType(null);
    setPromptCatId(null);
    setPromptSubcatObj(null);
  };


  return (
    <div className="manager-content">
      <style dangerouslySetInnerHTML={{ __html: FLOAT_CSS }} />
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }}>Categories & Sub-categories</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Organize your courses into structured tiers.</p>
        </div>
        <button 
          onClick={openAddCategory}
          style={{ 
            background: "#0f172a", color: "#fff", border: "none", padding: "10px 18px", 
            borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", 
            display: "flex", alignItems: "center", gap: 8, transition: "opacity 0.2s" 
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          <Icon name="plus" size={16} /> Add Category
        </button>
      </header>

      {/* Tool Bar */}
      <div style={{ marginBottom: 20, display: "flex", gap: 12 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>
            <Icon name="search" size={16} />
          </span>
          <FloatingInput 
            label="Search categories..."
            value={search}
            onChange={(e:any) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {selectedIds.length > 0 && (
          <div style={{ 
            background: "#f0f9ff", 
            border: "1px solid #bae6fd", 
            borderRadius: 12, 
            padding: "12px 20px", 
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            transition: "all 0.2s"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 13, color: "#0284c7", fontWeight: 600, background: "#e0f2fe", padding: "4px 10px", borderRadius: 20 }}>
                {selectedIds.length} item{selectedIds.length > 1 ? "s" : ""} selected
              </span>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button 
                onClick={() => setSelectedIds([])}
                style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Clear Selection
              </button>
              <button 
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", fontSize: 13, fontWeight: 600, cursor: isBulkDeleting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, opacity: isBulkDeleting ? 0.7 : 1 }}
              >
                <Icon name="trash" size={14} />
                {isBulkDeleting ? "Deleting..." : "Delete Selected"}
              </button>
            </div>
          </div>
      )}

      <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
            <tr>
              <th style={{ padding: "14px 20px", textAlign: "left", width: 40 }}>
                <input 
                  type="checkbox" 
                  checked={categories.length > 0 && selectedIds.length === categories.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).length}
                  onChange={(e) => {
                    const pageIds = categories.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(c => c.id);
                    if (e.target.checked) {
                      setSelectedIds([...new Set([...selectedIds, ...pageIds])]);
                    } else {
                      setSelectedIds(selectedIds.filter(id => !pageIds.includes(id)));
                    }
                  }}
                  style={{ cursor: "pointer", accentColor: "#6366f1" }} 
                />
              </th>
              <th style={{ padding: "14px 20px", textAlign: "left", width: 60, fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.5px" }}>Icon</th>
              <th style={{ padding: "14px 20px", textAlign: "left", width: 80, fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.5px" }}>Banner</th>
              <th style={{ padding: "14px 20px", textAlign: "left", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.5px" }}>Category</th>
              <th style={{ padding: "14px 20px", textAlign: "left", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.5px" }}>Ratios (D / M)</th>
              <th style={{ padding: "14px 20px", textAlign: "left", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.5px" }}>Status</th>
              <th style={{ padding: "14px 20px", textAlign: "left", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.5px" }}>Sub-cats</th>
              <th style={{ padding: "14px 20px", textAlign: "right", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.5px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading...</td></tr>
            ) : categories.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>No categories found.</td></tr>
            ) : categories.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(cat => (
              <React.Fragment key={cat.id}>
                <tr 
                  onClick={() => {
                    if (selectedIds.includes(cat.id)) setSelectedIds(selectedIds.filter(id => id !== cat.id));
                    else setSelectedIds([...selectedIds, cat.id]);
                  }}
                  style={{ borderBottom: "1px solid #f8fafc", transition: "background 0.2s", cursor: "pointer" }} 
                  onMouseEnter={e => e.currentTarget.style.background = "#fcfdfe"} 
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                    <input 
                      type="checkbox" 
                      onClick={(e) => e.stopPropagation()}
                      checked={selectedIds.includes(cat.id)}
                      onChange={(e) => {
                         if (e.target.checked) setSelectedIds([...selectedIds, cat.id]);
                         else setSelectedIds(selectedIds.filter(id => id !== cat.id));
                      }}
                      style={{ cursor: "pointer", accentColor: "#6366f1" }}
                    />
                    <button 
                      onClick={(e) => { e.stopPropagation(); setExpandedCat(expandedCat === cat.id ? null : cat.id); }}
                      style={{ border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: 4, background: expandedCat === cat.id ? "#f1f5f9" : "transparent" }}
                    >
                      <Icon name={expandedCat === cat.id ? "chevron-up" : "chevron-down"} size={16} />
                    </button>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    {cat.icon_url ? <img src={resolveImageUrl(cat.icon_url)} alt="icon" style={{width: 32, height: 32, objectFit: "contain", borderRadius: 6, background: "#f8fafc", border: "1px solid #e2e8f0", padding: 2}} /> : <span style={{color: "#cbd5e1", display: "flex", width: 32, height: 32, alignItems: "center", justifyContent: "center", background: "#f8fafc", borderRadius: 6, border: "1px solid #e2e8f0"}}><Icon name="image" size={16} /></span>}
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    {cat.banner_url ? <img src={resolveImageUrl(cat.banner_url)} alt="banner" style={{width: 48, height: 32, objectFit: "cover", borderRadius: 6, background: "#f8fafc", border: "1px solid #e2e8f0"}} /> : <span style={{color: "#cbd5e1", display: "flex", width: 48, height: 32, alignItems: "center", justifyContent: "center", background: "#f8fafc", borderRadius: 6, border: "1px solid #e2e8f0"}}><Icon name="image" size={16} /></span>}
                  </td>
                  <td style={{ padding: "14px 20px", fontWeight: 600, color: "#0f172a" }}>
                    {cat.name}
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                     <span style={{ fontSize: 12, color: "#64748b", display: "flex", gap: 6 }}>
                       {cat.desktop_banner_ratio ? <span style={{background: "#f1f5f9", padding: "2px 6px", borderRadius: 4}}>{cat.desktop_banner_ratio}</span> : <span style={{color: "#cbd5e1"}}>—</span>}
                       / 
                       {cat.mobile_banner_ratio ? <span style={{background: "#f1f5f9", padding: "2px 6px", borderRadius: 4}}>{cat.mobile_banner_ratio}</span> : <span style={{color: "#cbd5e1"}}>—</span>}
                     </span>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                     <div 
                        onClick={(e) => { e.stopPropagation(); toggleCategoryStatus(cat); }}
                        style={{ 
                          width: 44, height: 24, borderRadius: 12, background: cat.is_active !== false ? "#22c55e" : "#e2e8f0",
                          position: "relative", cursor: "pointer", transition: "background 0.2s"
                        }}
                     >
                        <div style={{ 
                          position: "absolute", top: 2, left: cat.is_active !== false ? 22 : 2,
                          width: 20, height: 20, borderRadius: 10, background: "#fff", transition: "left 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.1)"
                        }} />
                     </div>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {subcategories.filter(s => s.category_id === cat.id).length > 0 ? (
                        subcategories.filter(s => s.category_id === cat.id).map(sub => (
                          <span key={sub.id} style={{ background: "#f0f9ff", border: "1px solid #bae6fd", color: "#0284c7", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6 }}>
                            {sub.name}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: 12, fontStyle: "italic" }}>None</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "14px 20px", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button onClick={(e) => { e.stopPropagation(); openEditCategory(cat); }} title="Edit" style={{ border: "none", background: "#f1f5f9", color: "#475569", width: 30, height: 30, borderRadius: 6, cursor: "pointer" }}>
                        <Icon name="edit" size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); triggerDeleteCategory(cat); }} title="Delete" style={{ border: "none", background: "#fef2f2", color: "#ef4444", width: 30, height: 30, borderRadius: 6, cursor: "pointer" }}>
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
                
                {/* Expanded Sub-categories list */}
                {expandedCat === cat.id && (
                  <tr style={{ background: "#f8fafc" }}>
                    <td colSpan={8} style={{ padding: "0 20px 20px 60px" }}>
                      <div style={{ borderLeft: "2px solid #e2e8f0", paddingLeft: 20, paddingTop: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                          <h4 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Sub-categories</h4>
                          <button 
                            onClick={() => handleAddSubCategoryPrompt(cat.id)}
                            style={{ fontSize: 11, fontWeight: 700, color: "#38bdf8", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                          >
                            <Icon name="plus" size={12} /> Add New
                          </button>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {subcategories.filter(s => s.category_id === cat.id).map(sub => (
                             <div 
                              key={sub.id} 
                              style={{ 
                                background: "#fff", border: "1px solid #e2e8f0", padding: "6px 12px", 
                                borderRadius: 8, display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, boxShadow: "0 1px 2px rgba(0,0,0,0.03)" 
                              }}
                            >
                              <span>{sub.name}</span>
                              <div style={{ display: "flex", gap: 4 }}>
                                <button onClick={() => handleEditSubCategoryPrompt(sub)} style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8", padding: 2 }}>
                                  <Icon name="edit" size={11} />
                                </button>
                                <button onClick={() => triggerDeleteSubCategory(sub)} style={{ border: "none", background: "none", cursor: "pointer", color: "#fda4af", padding: 2 }}>
                                  <Icon name="trash" size={11} />
                                </button>
                              </div>
                            </div>
                          ))}
                          {subcategories.filter(s => s.category_id === cat.id).length === 0 && (
                            <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>No sub-categories yet.</div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {/* Pagination Footer */}
        {!loading && categories.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderTop: "1px solid #f1f5f9", background: "#fff" }}>
             <span style={{ fontSize: 13, color: "#64748b" }}>
               Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, categories.length)} of {categories.length} entries
             </span>
             <div style={{ display: "flex", gap: 6 }}>
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                  disabled={currentPage === 1}
                  style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: currentPage === 1 ? "#f8fafc" : "#fff", color: currentPage === 1 ? "#cbd5e1" : "#475569", fontSize: 13, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
                >
                  Previous
                </button>
                <div style={{ display: "flex", alignItems: "center", padding: "0 8px", fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                  {currentPage} / {Math.ceil(categories.length / itemsPerPage)}
                </div>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(categories.length / itemsPerPage), p + 1))} 
                  disabled={currentPage >= Math.ceil(categories.length / itemsPerPage)}
                  style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: currentPage >= Math.ceil(categories.length / itemsPerPage) ? "#f8fafc" : "#fff", color: currentPage >= Math.ceil(categories.length / itemsPerPage) ? "#cbd5e1" : "#475569", fontSize: 13, cursor: currentPage >= Math.ceil(categories.length / itemsPerPage) ? "not-allowed" : "pointer" }}
                >
                  Next
                </button>
             </div>
          </div>
        )}
      </div>

      {/* CATEGORY MODAL */}
      {modalOpen && (
        <div className="cm-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !savingCat) setModalOpen(false); }}>
           <div style={{ background: "#fff", borderRadius: 16, width: "90%", maxWidth: 900, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
              
              <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
                 <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{editingCategory ? "Edit Category" : "Add New Category"}</h2>
                 <button onClick={() => !savingCat && setModalOpen(false)} style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8" }}><Icon name="x" size={20} /></button>
              </div>

              <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
                 <form id="category-form" onSubmit={saveCategory}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
                       <div style={{ gridColumn: "span 2" }}>
                          <FloatingInput label="Category Name" value={catForm.name} required onChange={(e:any) => setCatForm({...catForm, name: e.target.value})} />
                       </div>

                       <div>
                          <ImageDropzone 
                            label="Category Icon" 
                            iconName="image" 
                            preview={catForm.icon_url} 
                            onUpload={async (file) => {
                               const url = await handleFileUpload(file);
                               if(url) setCatForm({...catForm, icon_url: url});
                            }} 
                          />
                       </div>

                       <div>
                          <ImageDropzone 
                            label="Banner Image" 
                            iconName="image" 
                            preview={catForm.banner_url} 
                            onUpload={async (file) => {
                               const url = await handleFileUpload(file);
                               if(url) setCatForm({...catForm, banner_url: url});
                            }} 
                          />
                       </div>

                       <div>
                          <FloatingInput label="Desktop Banner Ratio" value={catForm.desktop_banner_ratio} onChange={(e:any) => setCatForm({...catForm, desktop_banner_ratio: e.target.value})} />
                       </div>

                       <div>
                          <FloatingInput label="Mobile Banner Ratio" value={catForm.mobile_banner_ratio} onChange={(e:any) => setCatForm({...catForm, mobile_banner_ratio: e.target.value})} />
                       </div>
                    </div>

                    <div style={{ marginBottom: 24, borderTop: "1px solid #f1f5f9", paddingTop: 20 }}>
                       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                         <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Quick Add Sub-Categories (Optional)</label>
                         <span style={{ fontSize: 11, color: "#94a3b8" }}>Press Enter to add</span>
                       </div>
                       <div style={{ marginBottom: 12 }}>
                         <FloatingInput 
                           label="Type sub-category name..." 
                           value={subcatInput}
                           onChange={(e:any) => setSubcatInput(e.target.value)}
                           onKeyDown={(e:any) => {
                              if (e.key === 'Enter') {
                                 e.preventDefault();
                                 if (subcatInput.trim() && !tempSubcats.includes(subcatInput.trim())) {
                                    setTempSubcats([...tempSubcats, subcatInput.trim()]);
                                    setSubcatInput("");
                                 }
                              }
                           }}
                         />
                       </div>
                       {tempSubcats.length > 0 && (
                         <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                           {tempSubcats.map((sub, i) => (
                              <div key={i} style={{ background: "#f0f9ff", border: "1px solid #bae6fd", color: "#0284c7", fontSize: 12, fontWeight: 500, padding: "4px 10px", borderRadius: 20, display: "flex", alignItems: "center", gap: 6 }}>
                                {sub}
                                <button type="button" onClick={() => setTempSubcats(tempSubcats.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: "#0ea5e9", cursor: "pointer", display: "flex", padding: 0 }}><Icon name="x" size={12} /></button>
                              </div>
                           ))}
                         </div>
                       )}
                    </div>

                    <div style={{ padding: "16px 20px", background: "#f0f9ff", borderRadius: 10, border: "1px solid #bae6fd", display: "flex", alignItems: "center", gap: 12 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#0369a1" }}>
                        <input
                          type="checkbox"
                          checked={catForm.is_active}
                          onChange={(e) => setCatForm({ ...catForm, is_active: e.target.checked })}
                          style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#38bdf8" }}
                        />
                        Category is Active
                      </label>
                      <span style={{ fontSize: 12, color: "#64748b" }}>Inactive categories are hidden from students.</span>
                    </div>

                 </form>
              </div>

              <div style={{ padding: "20px 24px", borderTop: "1px solid #f1f5f9", background: "#f8fafc", display: "flex", justifyContent: "flex-end", gap: 12 }}>
                 <button onClick={() => setModalOpen(false)} disabled={savingCat} style={{ background: "#fff", color: "#475569", border: "1px solid #cbd5e1", padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                 <button type="submit" form="category-form" disabled={savingCat} style={{ background: "#38bdf8", color: "#fff", border: "none", padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: savingCat ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, opacity: savingCat ? 0.7 : 1, boxShadow: "0 4px 6px -1px rgba(56, 189, 248, 0.3)" }}>
                   {savingCat ? "Saving..." : <><Icon name="save" size={16} /> Save Category</>}
                 </button>
              </div>

           </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="cm-overlay" onMouseDown={(e) => { if(e.target === e.currentTarget) setDeleteConfirm(null); }}>
          <div className="cm-confirm">
            <div className="cm-confirm-icon-wrap">
              <Icon name="trash" size={24} />
            </div>
            <h3 className="cm-confirm-ht">
              {deleteConfirm.type === 'bulk' ? 'Delete Selected Categories?' : 
               deleteConfirm.type === 'sub' ? 'Delete Sub-Category?' : 'Delete Category?'}
            </h3>
            {deleteConfirm.name && (
               <span className="cm-confirm-pill">{deleteConfirm.name}</span>
            )}
            <p className="cm-confirm-tx">
              This action is <strong>permanent</strong> and cannot be undone.<br/>
              Are you sure you want to delete {deleteConfirm.type === 'bulk' ? 'these resources' : 'this resource'}?
              {deleteConfirm.type !== 'sub' && <><br/>This will also delete all sub-categories and linked data!</>}
            </p>
            <div className="cm-confirm-row">
              <button className="cm-confirm-btn-cancel" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="cm-confirm-btn-del" onClick={executeDeleteAction}>
                {isBulkDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {promptType === "add_sub" && (
        <PromptModal
          title="New Sub-Category"
          inputLabel="Sub-category Name"
          confirmText="Add"
          onConfirm={submitPrompt}
          onCancel={() => setPromptType(null)}
        />
      )}

      {promptType === "edit_sub" && promptSubcatObj && (
        <PromptModal
          title="Edit Sub-Category"
          inputLabel="Sub-category Name"
          defaultValue={promptSubcatObj.name}
          confirmText="Update"
          onConfirm={submitPrompt}
          onCancel={() => { setPromptType(null); setPromptSubcatObj(null); }}
        />
      )}

    </div>
  );
}
