"use client";
import { apiFetch } from "@/lib/apiFetch";
import React, { useEffect, useState, useCallback } from "react";
import { useToast } from "./ToastProvider";
import DeleteModal from "./DeleteModal";
import { Icon } from "../icons";
import { API_BASE_URL, BASE_URL } from "@/lib/config";

const API = `${API_BASE_URL}`;

interface Category {
  id: number;
  name: string;
}

interface SubCategory {
  id: number;
  name: string;
  category_id: number;
  icon_url?: string;
  banner_url?: string;
  is_active?: boolean;
  created_at: string;
}

const resolveImageUrl = (url?: string): string => {
  if (!url) return "";
  return url.replace("/api/uploads/", "/uploads/");
};

// --- REUSABLE COMPONENTS ---

const FLOAT_CSS = `
  .sc-field-wrap { width: 100%; }
  .sc-field {
    position: relative;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    background: #f8fafc;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  }
  .sc-field.focused {
    border-color: #38bdf8;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
  }
  .sc-label {
    position: absolute;
    left: 14px; top: 50%;
    transform: translateY(-50%);
    font-size: 14px; color: #94a3b8;
    pointer-events: none;
    transition: all 0.18s ease;
    background: transparent; padding: 0 3px;
    white-space: nowrap; line-height: 1;
    font-family: Inter, system-ui, sans-serif;
  }
  .sc-label.up {
    top: 0; transform: translateY(-50%);
    font-size: 11px; font-weight: 600;
    color: #38bdf8; background: #fff;
  }
  .sc-label-ta {
    position: absolute;
    left: 14px; top: 14px; transform: none;
    font-size: 14px; color: #94a3b8;
    pointer-events: none;
    transition: all 0.18s ease;
    background: transparent; padding: 0 3px; line-height: 1;
    font-family: Inter, system-ui, sans-serif;
  }
  .sc-label-ta.up {
    top: 0; transform: translateY(-50%);
    font-size: 11px; font-weight: 600;
    color: #38bdf8; background: #fff;
  }
  .sc-inp {
    display: block; width: 100%;
    padding: 20px 14px 8px;
    border: none; outline: none;
    font-size: 14px; color: #0f172a;
    background: transparent; border-radius: 10px;
    font-family: Inter, system-ui, sans-serif;
  }
  .sc-ta {
    display: block; width: 100%;
    padding: 24px 14px 10px;
    border: none; outline: none;
    font-size: 14px; color: #0f172a;
    background: transparent; border-radius: 10px;
    resize: vertical; min-height: 100px;
    font-family: Inter, system-ui, sans-serif;
  }
  .sc-req { color: #ef4444; margin-left: 2px; }
  @keyframes sc-slide-up { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }

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
    <div className="sc-field-wrap">
      <div className={"sc-field" + (focused ? " focused" : "")}>
        <label className={isTextArea ? ("sc-label-ta" + (lifted ? " up" : "")) : ("sc-label" + (lifted ? " up" : ""))}>
          {label}{required && <span className="sc-req">*</span>}
        </label>
        {isTextArea ? (
          <textarea
            className="sc-ta"
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
            className="sc-inp"
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

function ImageDropzone({ label, onUpload, preview, iconName }: {
  label: string;
  onUpload: (file: File) => void;
  preview: string;
  iconName: string;
}) {
  const [dragActive, setDragActive] = useState(false);
  const inputId = "file-" + label.split(" ").join("-");

  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6, display: "block" }}>{label}</label>
      <div
        style={{
          border: "2px dashed " + (dragActive ? "#38bdf8" : "#e2e8f0"),
          borderRadius: 10, padding: "16px", textAlign: "center", cursor: "pointer",
          background: dragActive ? "#f0f9ff" : "#f8fafc", transition: "all 0.2s",
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", minHeight: "130px",
        }}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragActive(false);
          if (e.dataTransfer.files[0]) onUpload(e.dataTransfer.files[0]);
        }}
        onClick={() => document.getElementById(inputId)?.click()}
      >
        <div style={{ color: dragActive ? "#38bdf8" : "#94a3b8", marginBottom: 8 }}>
          <Icon name={iconName} size={24} />
        </div>
        <div style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>
          <span style={{ color: "#38bdf8", fontWeight: 600 }}>Click</span> or drag image
        </div>
        <input
          id={inputId}
          type="file"
          accept=".png,.jpg,.jpeg,.svg,.webp"
          style={{ display: "none" }}
          onChange={(e) => { if (e.target.files && e.target.files[0]) onUpload(e.target.files[0]); }}
        />
        {preview && (
          <div style={{ marginTop: 12 }}>
            <img
              src={preview}
              style={{ maxHeight: 60, borderRadius: 6, objectFit: "contain", border: "1px solid #e2e8f0", background: "#fff", padding: 2 }}
              alt="Preview"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function SubCategoryManager() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCatId, setSelectedCatId] = useState<string>("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<SubCategory | null>(null);
  const [subForm, setSubForm] = useState({
    name: "", category_id: "", icon_url: "", banner_url: "", is_active: true,
  });
  const [savingSub, setSavingSub] = useState(false);
  const [showInlineCat, setShowInlineCat] = useState(false);
  const [inlineCatName, setInlineCatName] = useState("");
  const [inlineCatLoading, setInlineCatLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'single' | 'bulk', id?: number, name?: string } | null>(null);
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
          const res = await apiFetch(`${API}/subcategories/${id}`, { method: "DELETE" });
          if (res.ok) successCount++;
          else {
             const data = await res.json();
             console.error("Delete failed:", data.detail || res.statusText);
          }
        })
      );
      showToast(`Successfully deleted ${successCount} sub-categorie(s).`);
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
      setLoading(true);
      const catParam = selectedCatId !== "all" ? ("&category_id=" + selectedCatId) : "";
      const [catRes, subRes] = await Promise.all([
        apiFetch(`${API}/categories`),
        apiFetch(`${API}/subcategories?search=` + encodeURIComponent(search) + catParam),
      ]);
      if (catRes.ok) setCategories(await catRes.json());
      if (subRes.ok) setSubCategories(await subRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, selectedCatId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { setCurrentPage(1); }, [search, selectedCatId]);

  const handleInlineCatSave = async () => {
    if (!inlineCatName.trim()) { showToast("Category name is required", "error"); return; }
    setInlineCatLoading(true);
    try {
      const res = await apiFetch(`${API}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: inlineCatName.trim() }),
      });
      if (res.ok) {
        const newCat: Category = await res.json();
        setCategories((prev) => [newCat, ...prev]);
        setSubForm((prev) => ({ ...prev, category_id: String(newCat.id) }));
        setInlineCatName("");
        setShowInlineCat(false);
        showToast("Category created!");
      } else {
        const err = await res.json();
        showToast(err.detail || "Failed to create category", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setInlineCatLoading(false);
    }
  };

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
    } catch (err) {
      console.error(err);
      showToast("Failed to upload image.", "error");
      return null;
    }
  };

  const toggleSubCategoryStatus = async (sub: SubCategory) => {
    const newStatus = sub.is_active !== false ? false : true;
    setSubCategories((prev) => prev.map((s) => s.id === sub.id ? { ...s, is_active: newStatus } : s));
    try {
      const res = await apiFetch(`${API}/subcategories/${sub.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to toggle status");
    } catch (e) {
      console.error(e);
      setSubCategories((prev) => prev.map((s) => s.id === sub.id ? { ...s, is_active: !newStatus } : s));
      showToast("Could not toggle status", "error");
    }
  };

  const openAddSub = () => {
    setEditingSub(null);
    setSubForm({
      name: "",
      category_id: categories.length > 0 ? String(categories[0].id) : "",
      icon_url: "", banner_url: "", is_active: true,
    });
    setModalOpen(true);
  };

  const openEditSub = (sub: SubCategory) => {
    setEditingSub(sub);
    setSubForm({
      name: sub.name,
      category_id: String(sub.category_id),
      icon_url: resolveImageUrl(sub.icon_url) || "",
      banner_url: resolveImageUrl(sub.banner_url) || "",
      is_active: sub.is_active !== false,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subForm.name.trim()) { showToast("Name is required", "error"); return; }
    if (!subForm.category_id) { showToast("Parent Category is required.", "error"); return; }
    setSavingSub(true);
    try {
      const url = editingSub
        ? `${API}/subcategories/${editingSub.id}`
        : `${API}/categories/${subForm.category_id}/subcategories`;
      const method = editingSub ? "PUT" : "POST";
      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subForm),
      });
      if (res.ok) {
        showToast(editingSub ? "Sub-category updated!" : "Sub-category created!");
        setModalOpen(false);
        fetchAll();
      } else {
        const err = await res.json();
        throw new Error(err.detail || "Failed to save");
      }
    } catch (err: any) {
      showToast(err.message || "An error occurred", "error");
    } finally {
      setSavingSub(false);
    }
  };

  const confirmDelete = async (id: number) => {
    try {
      const res = await apiFetch(`${API}/subcategories/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Sub-category deleted!");
        fetchAll();
        setSelectedIds(prev => prev.filter(sel => sel !== id));
      } else {
        const errorData = await res.json();
        showToast(errorData.detail?.includes("FOREIGN KEY") || errorData.detail?.includes("foreign key") 
          ? "Cannot delete! This sub-category is in use." 
          : "Failed to delete sub-category", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setDeleteConfirm(null);
    }
  };

  const executeDeleteAction = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'bulk') executeBulkDelete();
    else if (deleteConfirm.type === 'single' && deleteConfirm.id) confirmDelete(deleteConfirm.id);
  };

  const catName = (id: number) => categories.find((c) => c.id === id)?.name || "Unknown";
  const totalPages = Math.ceil(subcategories.length / itemsPerPage);
  const paged = subcategories.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleStyle = (active: boolean) => ({
    width: 44, height: 24, borderRadius: 12,
    background: active ? "#22c55e" : "#e2e8f0",
    position: "relative" as const, cursor: "pointer", transition: "background 0.2s",
  });
  const thumbStyle = (active: boolean) => ({
    position: "absolute" as const,
    top: 2, left: active ? 22 : 2,
    width: 20, height: 20, borderRadius: 10,
    background: "#fff", transition: "left 0.2s ease",
    boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
  });

  return (
    <div className="manager-content">
      <style dangerouslySetInnerHTML={{ __html: FLOAT_CSS }} />

      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }}>Sub-category Management</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Create, edit and delete sub-categories linked to main categories.</p>
        </div>
        <button
          onClick={openAddSub}
          style={{
            background: "#0f172a", color: "#fff", border: "none", padding: "10px 18px",
            borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          <Icon name="plus" size={16} /> Add Sub-category
        </button>
      </header>

      {/* Filter Bar */}
      <div style={{ marginBottom: 20, display: "flex", gap: 12 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>
            <Icon name="search" size={16} />
          </span>
          <input
            type="text"
            placeholder="Search sub-categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "10px 12px 10px 40px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <select
          value={selectedCatId}
          onChange={(e) => setSelectedCatId(e.target.value)}
          style={{ padding: "0 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, minWidth: 170, outline: "none", background: "#fff" }}
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
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

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
            <tr>
              <th style={{ padding: "14px 20px", textAlign: "left", width: 60 }}>
                <input 
                  type="checkbox" 
                  checked={paged.length > 0 && selectedIds.length === paged.length}
                  onChange={(e) => {
                    const pageIds = paged.map(c => c.id);
                    if (e.target.checked) {
                      setSelectedIds([...new Set([...selectedIds, ...pageIds])]);
                    } else {
                      setSelectedIds(selectedIds.filter(id => !pageIds.includes(id)));
                    }
                  }}
                  style={{ cursor: "pointer", accentColor: "#6366f1" }} 
                />
              </th>
              <th style={{ padding: "14px 20px", textAlign: "left", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.5px" }}>Icon</th>
              <th style={{ padding: "14px 20px", textAlign: "left", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.5px" }}>Banner</th>
              <th style={{ padding: "14px 20px", textAlign: "left", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.5px" }}>Sub-Category Name</th>
              <th style={{ padding: "14px 20px", textAlign: "left", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.5px" }}>Parent Category</th>
              <th style={{ padding: "14px 20px", textAlign: "left", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.5px" }}>Status</th>
              <th style={{ padding: "14px 20px", textAlign: "right", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.5px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading...</td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>No sub-categories found.</td></tr>
            ) : (
              paged.map((sub, idx) => (
                <tr
                  key={sub.id}
                  onClick={() => {
                    if (selectedIds.includes(sub.id)) setSelectedIds(selectedIds.filter(id => id !== sub.id));
                    else setSelectedIds([...selectedIds, sub.id]);
                  }}
                  style={{ borderBottom: "1px solid #f8fafc", cursor: "pointer" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#fcfdfe"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <td style={{ padding: "14px 20px", color: "#94a3b8", fontWeight: 500, display: "flex", alignItems: "center", gap: 12 }}>
                    <input 
                      type="checkbox" 
                      onClick={(e) => e.stopPropagation()}
                      checked={selectedIds.includes(sub.id)}
                      onChange={(e) => {
                         if (e.target.checked) setSelectedIds([...selectedIds, sub.id]);
                         else setSelectedIds(selectedIds.filter(id => id !== sub.id));
                      }}
                      style={{ cursor: "pointer", accentColor: "#6366f1" }}
                    />
                    <span>{(currentPage - 1) * itemsPerPage + idx + 1}</span>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    {sub.icon_url
                      ? <img src={resolveImageUrl(sub.icon_url)} alt="icon" style={{ width: 32, height: 32, objectFit: "contain", borderRadius: 6, border: "1px solid #e2e8f0", padding: 2 }} />
                      : <span style={{ display: "flex", width: 32, height: 32, alignItems: "center", justifyContent: "center", background: "#f8fafc", borderRadius: 6, border: "1px solid #e2e8f0", color: "#cbd5e1" }}><Icon name="image" size={16} /></span>
                    }
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    {sub.banner_url
                      ? <img src={resolveImageUrl(sub.banner_url)} alt="banner" style={{ width: 48, height: 32, objectFit: "cover", borderRadius: 6, border: "1px solid #e2e8f0" }} />
                      : <span style={{ display: "flex", width: 48, height: 32, alignItems: "center", justifyContent: "center", background: "#f8fafc", borderRadius: 6, border: "1px solid #e2e8f0", color: "#cbd5e1" }}><Icon name="image" size={16} /></span>
                    }
                  </td>
                  <td style={{ padding: "14px 20px", fontWeight: 600, color: "#0f172a" }}>{sub.name}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <span style={{ background: "#f1f5f9", color: "#475569", fontSize: 11.5, fontWeight: 600, padding: "3px 10px", borderRadius: 7 }}>
                      {catName(sub.category_id)}
                    </span>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <div onClick={(e) => { e.stopPropagation(); toggleSubCategoryStatus(sub); }} style={toggleStyle(sub.is_active !== false)}>
                      <div style={thumbStyle(sub.is_active !== false)} />
                    </div>
                  </td>
                  <td style={{ padding: "14px 20px", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button onClick={(e) => { e.stopPropagation(); openEditSub(sub); }} title="Edit" style={{ border: "none", background: "#f1f5f9", color: "#475569", width: 30, height: 30, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon name="edit" size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'single', id: sub.id, name: sub.name }); }} title="Delete" style={{ border: "none", background: "#fef2f2", color: "#ef4444", width: 30, height: 30, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!loading && subcategories.length > itemsPerPage && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderTop: "1px solid #f1f5f9" }}>
            <span style={{ fontSize: 13, color: "#64748b" }}>
              Showing {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, subcategories.length)} of {subcategories.length}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: currentPage === 1 ? "#f8fafc" : "#fff", color: currentPage === 1 ? "#cbd5e1" : "#475569", fontSize: 13, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
              >Previous</button>
              <div style={{ display: "flex", alignItems: "center", padding: "0 8px", fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                {currentPage} / {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: currentPage >= totalPages ? "#f8fafc" : "#fff", color: currentPage >= totalPages ? "#cbd5e1" : "#475569", fontSize: 13, cursor: currentPage >= totalPages ? "not-allowed" : "pointer" }}
              >Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.6)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 16, width: "80%", maxWidth: 1200, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>

            <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{editingSub ? "Edit Sub-category" : "Add New Sub-category"}</h2>
              <button onClick={() => !savingSub && setModalOpen(false)} style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8" }}>
                <Icon name="x" size={20} />
              </button>
            </div>

            <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
              <form id="sub-category-form" onSubmit={handleSave}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
                  <div style={{ gridColumn: "span 2" }}>
                    <FloatingInput label="Sub-Category Name" value={subForm.name} required onChange={(e: any) => setSubForm({ ...subForm, name: e.target.value })} />
                  </div>

                  <div style={{ gridColumn: "span 2" }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6, display: "block" }}>Parent Category</label>
                    {!showInlineCat ? (
                      <>
                        <select
                          value={subForm.category_id}
                          onChange={(e) => setSubForm({ ...subForm, category_id: e.target.value })}
                          required
                          style={{ width: "100%", padding: "14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, outline: "none", background: "#f8fafc", color: "#0f172a" }}
                        >
                          <option value="">Select a Category...</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowInlineCat(true)}
                          style={{ background: "none", border: "none", color: "#0ea5e9", fontSize: 11.5, fontWeight: 600, cursor: "pointer", marginTop: 8, padding: 0 }}
                        >+ Add new category</button>
                      </>
                    ) : (
                      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                        <div style={{ flex: 1 }}>
                          <FloatingInput
                            label="New category name"
                            value={inlineCatName}
                            onChange={(e: any) => setInlineCatName(e.target.value)}
                            onKeyDown={(e: any) => { if (e.key === "Enter") { e.preventDefault(); handleInlineCatSave(); } }}
                          />
                        </div>
                        <button type="button" onClick={handleInlineCatSave} disabled={inlineCatLoading}
                          style={{ background: "#38bdf8", color: "#fff", border: "none", padding: "0 20px", borderRadius: 10, fontWeight: 600, cursor: "pointer", alignSelf: "stretch" }}>
                          {inlineCatLoading ? "..." : "Save"}
                        </button>
                        <button type="button" onClick={() => setShowInlineCat(false)}
                          style={{ background: "#f1f5f9", color: "#475569", border: "none", padding: "0 20px", borderRadius: 10, fontWeight: 600, cursor: "pointer", alignSelf: "stretch" }}>
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <ImageDropzone
                      label="Sub-Category Icon"
                      iconName="image"
                      preview={subForm.icon_url}
                      onUpload={async (file) => {
                        const url = await handleFileUpload(file);
                        if (url) setSubForm({ ...subForm, icon_url: url });
                      }}
                    />
                  </div>
                  <div>
                    <ImageDropzone
                      label="Banner Image"
                      iconName="image"
                      preview={subForm.banner_url}
                      onUpload={async (file) => {
                        const url = await handleFileUpload(file);
                        if (url) setSubForm({ ...subForm, banner_url: url });
                      }}
                    />
                  </div>
                </div>

                <div style={{ padding: "16px 20px", background: "#f0f9ff", borderRadius: 10, border: "1px solid #bae6fd", display: "flex", alignItems: "center", gap: 12 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#0369a1" }}>
                    <input
                      type="checkbox"
                      checked={subForm.is_active}
                      onChange={(e) => setSubForm({ ...subForm, is_active: e.target.checked })}
                      style={{ width: 16, height: 16, cursor: "pointer" }}
                    />
                    Sub-category is Active
                  </label>
                  <span style={{ fontSize: 12, color: "#64748b" }}>Inactive sub-categories are hidden.</span>
                </div>
              </form>
            </div>

            <div style={{ padding: "20px 24px", borderTop: "1px solid #f1f5f9", background: "#f8fafc", display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button type="button" onClick={() => setModalOpen(false)} disabled={savingSub}
                style={{ background: "#fff", color: "#475569", border: "1px solid #cbd5e1", padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
              <button type="submit" form="sub-category-form" disabled={savingSub}
                style={{ background: "#38bdf8", color: "#fff", border: "none", padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: savingSub ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, opacity: savingSub ? 0.7 : 1 }}>
                {savingSub ? "Saving..." : <><Icon name="save" size={16} /> Save Sub-category</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="cm-overlay" onMouseDown={(e) => { if(e.target===e.currentTarget) setDeleteConfirm(null); }}>
          <div className="cm-confirm">
            <div className="cm-confirm-icon-wrap">
              <Icon name="trash" size={24} />
            </div>
            <h3 className="cm-confirm-ht">
              {deleteConfirm.type === 'bulk' ? 'Delete Selected Sub-categories?' : 'Delete Sub-category?'}
            </h3>
            {deleteConfirm.name && (
               <span className="cm-confirm-pill">{deleteConfirm.name}</span>
            )}
            <p className="cm-confirm-tx">
              This action is <strong>permanent</strong> and cannot be undone.<br/>
              Are you sure you want to delete {deleteConfirm.type === 'bulk' ? 'these resources' : 'this resource'}?
              <br/>This will also remove associated subjects and courses!
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
    </div>
  );
}
