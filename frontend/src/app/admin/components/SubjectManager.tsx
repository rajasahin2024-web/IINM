"use client";
import { apiFetch } from "@/lib/apiFetch";
import React, { useEffect, useState, useCallback, useRef } from "react";
import DeleteModal from "./DeleteModal";
import { Icon } from "../icons";
import { API_BASE_URL } from "@/lib/config";
import { useToast } from "./ToastProvider";

const API = `${API_BASE_URL}`;

// --- Floating Label Input -------------------------------------
function FloatingInput({ label, type = "text", value, onChange, required, isTextArea = false, min, step, inputRef }: {
  label: string; type?: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  required?: boolean; isTextArea?: boolean; min?: string; step?: string; inputRef?: React.Ref<HTMLInputElement>;
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
        <input ref={inputRef} type={type} min={min} step={step} required={required}
          style={inputCss} value={value} onChange={onChange}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
      )}
      <label style={labelStyle}>{label}</label>
    </div>
  );
}

// --- Floating Price Input (with ₹ prefix) ---------------------
function FloatingPriceInput({ label, value, onChange, required }: {
  label: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; required?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const hasValue = value !== undefined && value !== null && value !== "";

  const labelStyle: React.CSSProperties = {
    position: "absolute", left: "36px",
    top: focused || hasValue ? "-9px" : "50%",
    transform: focused || hasValue ? "none" : "translateY(-50%)",
    fontSize: focused || hasValue ? "11px" : "14px",
    fontWeight: focused || hasValue ? 600 : 400,
    color: focused ? "#6366f1" : hasValue ? "#64748b" : "#94a3b8",
    background: focused || hasValue ? "#fff" : "transparent",
    padding: focused || hasValue ? "0 4px" : "0",
    transition: "all 0.2s cubic-bezier(.4,0,.2,1)",
    pointerEvents: "none", zIndex: 1,
  };

  return (
    <div style={{ position: "relative", width: "100%", marginBottom: "4px" }}>
      <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: focused ? "#6366f1" : "#64748b", fontWeight: 700, fontSize: 14, zIndex: 2 }}>₹</span>
      <input
        type="number" min="0" step="0.01" required={required}
        style={{
          width: "100%", padding: "14px 16px 14px 32px", borderRadius: "10px",
          border: `1.5px solid ${focused ? "#6366f1" : "#e2e8f0"}`,
          outline: "none", fontSize: "14px", color: "#0f172a", background: "#fff",
          transition: "border-color 0.2s, box-shadow 0.2s", boxSizing: "border-box" as const,
          boxShadow: focused ? "0 0 0 3px rgba(99,102,241,0.12)" : "none",
          fontFamily: "inherit",
        }}
        value={value} onChange={onChange}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      />
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
  // For native selects, we always float the label so it doesn't overlap with the placeholder/selected option
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

// --- Types ----------------------------------------------------
interface Category {
  id: number;
  name: string;
}

interface SubCategory {
  id: number;
  name: string;
  category_id: number;
}

interface Subject {
  id: number;
  name: string;
  subcategory_id: number;
  description: string | null;
  thumbnail_url: string | null;
  price: number;
  discounted_price: number | null;
  price_usd: number | null;
  discounted_price_usd: number | null;
  validity_days: number;
  is_active: boolean;
  is_purchasable: boolean;
  display_order: number;
  created_at: string;
}

type ModalMode = "create" | "edit";

const defaultForm = {
  name: "",
  subcategory_id: "",
  description: "",
  price: "",
  discounted_price: "",
  price_usd: "",
  discounted_price_usd: "",
  validity_days: "365",
  is_active: true,
  is_purchasable: true,
  display_order: "0",
};

// --- Main Component -------------------------------------------
export default function SubjectManager() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
  const [filteredSubcats, setFilteredSubcats] = useState<SubCategory[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter bar
  const [search, setSearch] = useState("");
  const [filterCatId, setFilterCatId] = useState("all");
  const [filterSubcatId, setFilterSubcatId] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");       // all | active | inactive
  const [filterPurchasable, setFilterPurchasable] = useState("all"); // all | yes | no

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Inline quick-add
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [savingCat, setSavingCat] = useState(false);
  const [addingSubcat, setAddingSubcat] = useState(false);
  const [newSubcatName, setNewSubcatName] = useState("");
  const [savingSubcat, setSavingSubcat] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    let successCount = 0;
    try {
      await Promise.all(
        selectedIds.map(async id => {
          const res = await apiFetch(`${API}/subjects/${id}`, { method: "DELETE" });
          if (res.ok) successCount++;
        })
      );
      showToast(`Successfully deleted ${successCount} subject(s).`);
      setSelectedIds([]);
      fetchAll();
    } catch {
      showToast("Error during bulk delete", "error");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Toggle loading per row
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  // -- Fetch -------------------------------------------------
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [catRes, scRes, subjectRes] = await Promise.all([
        apiFetch(`${API}/categories`),
        apiFetch(`${API}/subcategories`),
        apiFetch(
          `${API}/subjects?search=${encodeURIComponent(search)}${
            filterSubcatId !== "all" ? `&subcategory_id=${filterSubcatId}` : ""
          }`
        ),
      ]);
      if (catRes.ok) setCategories(await catRes.json());
      if (scRes.ok) {
        const scs = await scRes.json();
        setSubcategories(scs);
      }
      if (subjectRes.ok) setSubjects(await subjectRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, filterSubcatId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Filter subcats when category filter changes
  useEffect(() => {
    if (filterCatId === "all") {
      setFilteredSubcats(subcategories);
    } else {
      setFilteredSubcats(subcategories.filter((sc) => String(sc.category_id) === filterCatId));
    }
    setFilterSubcatId("all");
  }, [filterCatId, subcategories]);

  // Modal subcats filtered by selected category in form
  const [formCatId, setFormCatId] = useState("all");
  const formSubcats = formCatId === "all"
    ? subcategories
    : subcategories.filter((sc) => String(sc.category_id) === formCatId);

  // -- Open Modal --------------------------------------------
  const openCreate = () => {
    setModalMode("create");
    setEditingId(null);
    setForm({ ...defaultForm });
    setFormError("");
    setFormCatId("all");
    setModalOpen(true);
    setTimeout(() => nameRef.current?.focus(), 100);
  };

  const openEdit = (sub: Subject) => {
    setModalMode("edit");
    setEditingId(sub.id);
    const sc = subcategories.find((s) => s.id === sub.subcategory_id);
    setFormCatId(sc ? String(sc.category_id) : "all");
    setForm({
      name: sub.name,
      subcategory_id: String(sub.subcategory_id),
      description: sub.description || "",
      price: String(sub.price),
      discounted_price: sub.discounted_price != null ? String(sub.discounted_price) : "",
      price_usd: sub.price_usd != null ? String(sub.price_usd) : "",
      discounted_price_usd: sub.discounted_price_usd != null ? String(sub.discounted_price_usd) : "",
      validity_days: String(sub.validity_days),
      is_active: sub.is_active,
      is_purchasable: sub.is_purchasable,
      display_order: String(sub.display_order),
    });
    setFormError("");
    setModalOpen(true);
    setTimeout(() => nameRef.current?.focus(), 100);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormError("");
    setAddingCat(false);
    setNewCatName("");
    setAddingSubcat(false);
    setNewSubcatName("");
  };

  // -- Quick-add Category ------------------------------------
  const handleAddCategory = async () => {
    const name = newCatName.trim();
    if (!name) return;
    setSavingCat(true);
    try {
      const res = await apiFetch(`${API}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const created: Category = await res.json();
        setCategories((prev) => [...prev, created]);
        setFormCatId(String(created.id));
        setForm((f) => ({ ...f, subcategory_id: "" }));
        setNewCatName("");
        setAddingCat(false);
        showToast(`Category "${name}" created!`);
      } else {
        const err = await res.json();
        showToast(err.detail || "Failed to create category.", "error");
      }
    } catch { showToast("Network error.", "error"); }
    finally { setSavingCat(false); }
  };

  // -- Quick-add Sub-Category --------------------------------
  const handleAddSubcategory = async () => {
    const name = newSubcatName.trim();
    if (!name) return;
    if (formCatId === "all") { showToast("Please select a category first.", "error"); return; }
    setSavingSubcat(true);
    try {
      const res = await apiFetch(`${API}/subcategories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category_id: parseInt(formCatId) }),
      });
      if (res.ok) {
        const created: SubCategory = await res.json();
        setSubcategories((prev) => [...prev, created]);
        setForm((f) => ({ ...f, subcategory_id: String(created.id) }));
        setNewSubcatName("");
        setAddingSubcat(false);
        showToast(`Sub-category "${name}" created!`);
      } else {
        const err = await res.json();
        showToast(err.detail || "Failed to create sub-category.", "error");
      }
    } catch { showToast("Network error.", "error"); }
    finally { setSavingSubcat(false); }
  };

  // -- Save --------------------------------------------------
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError("Subject name is required."); return; }
    if (!form.subcategory_id) { setFormError("Please select a sub-category."); return; }
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) { setFormError("Price must be a valid non-negative number."); return; }
    const discPrice = form.discounted_price !== "" ? parseFloat(form.discounted_price) : null;
    if (discPrice !== null && discPrice >= price) {
      setFormError("Discounted price must be less than the actual price.");
      return;
    }
    const priceUsd = form.price_usd !== "" ? parseFloat(form.price_usd) : null;
    const discPriceUsd = form.discounted_price_usd !== "" ? parseFloat(form.discounted_price_usd) : null;
    if (discPriceUsd !== null && priceUsd !== null && discPriceUsd >= priceUsd) {
      setFormError("USD Discounted price must be less than the actual USD price.");
      return;
    }

    setFormError("");
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      subcategory_id: parseInt(form.subcategory_id),
      description: form.description.trim() || null,
      price,
      discounted_price: discPrice,
      price_usd: priceUsd,
      discounted_price_usd: discPriceUsd,
      validity_days: parseInt(form.validity_days) || 365,
      is_active: form.is_active,
      is_purchasable: form.is_purchasable,
      display_order: parseInt(form.display_order) || 0,
    };

    try {
      let res: Response;
      if (modalMode === "create") {
        res = await apiFetch(`${API}/subcategories/${form.subcategory_id}/subjects`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await apiFetch(`${API}/subjects/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        if (modalMode === "create") showToast("Subject created!");
        else showToast("Subject updated!");
        closeModal();
        fetchAll();
      } else {
        const err = await res.json();
        setFormError(err.detail || "Failed to save subject.");
      }
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // -- Quick Toggle Active -----------------------------------
  const toggleActive = async (sub: Subject) => {
    setTogglingId(sub.id);
    try {
      const res = await apiFetch(`${API}/subjects/${sub.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !sub.is_active }),
      });
      if (res.ok) {
        setSubjects((prev) =>
          prev.map((s) => s.id === sub.id ? { ...s, is_active: !sub.is_active } : s)
        );
        showToast(`Subject ${!sub.is_active ? "activated" : "deactivated"}!`);
      }
    } catch { showToast("Network error.", "error"); }
    finally { setTogglingId(null); }
  };

  // -- Delete ------------------------------------------------
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await apiFetch(`${API}/subjects/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) { showToast("Subject deleted!"); fetchAll(); }
      else showToast("Failed to delete subject.", "error");
    } catch { showToast("Network error.", "error"); }
    finally { setDeleteTarget(null); }
  };

  // -- Helpers -----------------------------------------------
  const subcatName = (id: number) => subcategories.find((s) => s.id === id)?.name || "—";
  const catOfSubcat = (subcatId: number) => {
    const sc = subcategories.find((s) => s.id === subcatId);
    return sc ? categories.find((c) => c.id === sc.category_id)?.name || "—" : "—";
  };
  const fmt = (n: number | null | undefined) => `₹${(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

  // -- Render ------------------------------------------------
  return (
    <div className="manager-content">

      {/* -- Header ----------------------------------------- */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }}>
            Subject Management
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
            Create and manage subjects with specific prices. Students will purchase subjects to access courses.
          </p>
        </div>
        <button onClick={openCreate} style={btn("#0f172a", "#fff")}>
          <Icon name="plus" size={16} /> Add Subject
        </button>
      </header>

      {/* -- Stats Bar -------------------------------------- */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Subjects", value: subjects.length, color: "#6366f1" },
          { label: "Active", value: subjects.filter((s) => s.is_active).length, color: "#22c55e" },
          { label: "Purchasable", value: subjects.filter((s) => s.is_purchasable).length, color: "#0ea5e9" },
          {
            label: "Avg Price",
            value: subjects.length
              ? fmt(Math.round(subjects.reduce((a, s) => a + (s.price ?? 0), 0) / subjects.length))
              : "₹0",
            color: "#f59e0b",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              flex: 1, background: "#fff", border: "1px solid #f1f5f9",
              borderRadius: 12, padding: "14px 18px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 6 }}>
              {stat.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: stat.color }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* -- Filter Bar ------------------------------------- */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>
            <Icon name="search" size={15} />
          </span>
          <input
            type="text"
            placeholder="Search subjects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...filterInputStyle, paddingLeft: 38 }}
          />
        </div>
        <select
          value={filterCatId}
          onChange={(e) => setFilterCatId(e.target.value)}
          style={filterInputStyle}
        >
          <option value="all">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          value={filterSubcatId}
          onChange={(e) => setFilterSubcatId(e.target.value)}
          style={filterInputStyle}
        >
          <option value="all">All Sub-categories</option>
          {filteredSubcats.map((sc) => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
        </select>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={filterInputStyle}
        >
          <option value="all">All Status</option>
          <option value="active">🟢 Active</option>
          <option value="inactive">⚪ Inactive</option>
        </select>

        {/* Purchasable filter */}
        <select
          value={filterPurchasable}
          onChange={(e) => setFilterPurchasable(e.target.value)}
          style={filterInputStyle}
        >
          <option value="all">All Purchase</option>
          <option value="yes">✅ Purchasable</option>
          <option value="no">🚫 Not Purchasable</option>
        </select>
      </div>

      {/* -- Active filter strip (shows when filters applied) -- */}
      {(filterStatus !== "all" || filterPurchasable !== "all") && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>Filters:</span>
          {filterStatus !== "all" && (
            <span style={{ background: filterStatus === "active" ? "#dcfce7" : "#f1f5f9", color: filterStatus === "active" ? "#16a34a" : "#64748b", fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 6 }}>
              {filterStatus === "active" ? "🟢 Active" : "⚪ Inactive"}
              <button type="button" onClick={() => setFilterStatus("all")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "inherit", padding: 0, lineHeight: 1 }}>✕</button>
            </span>
          )}
          {filterPurchasable !== "all" && (
            <span style={{ background: filterPurchasable === "yes" ? "#eff6ff" : "#fef2f2", color: filterPurchasable === "yes" ? "#2563eb" : "#dc2626", fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 6 }}>
              {filterPurchasable === "yes" ? "✅ Purchasable" : "🚫 Not Purchasable"}
              <button type="button" onClick={() => setFilterPurchasable("all")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "inherit", padding: 0, lineHeight: 1 }}>✕</button>
            </span>
          )}
        </div>
      )}

      {/* -- Table ------------------------------------------- */}
      {(() => {
        // Client-side filter
        const displayedSubjects = subjects.filter((s) => {
          if (filterStatus === "active" && !s.is_active) return false;
          if (filterStatus === "inactive" && s.is_active) return false;
          if (filterPurchasable === "yes" && !s.is_purchasable) return false;
          if (filterPurchasable === "no" && s.is_purchasable) return false;
          return true;
        });
        return (
      <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9", overflow: "hidden" }}>
        {selectedIds.length > 0 && (
          <div style={{ 
            background: "#f0f9ff", 
            borderBottom: "1px solid #bae6fd", 
            padding: "12px 20px", 
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
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead style={{ background: "#f8fafc", borderBottom: "2px solid #f1f5f9" }}>
            <tr>
              <th style={thStyle}>
                <input 
                  type="checkbox" 
                  checked={displayedSubjects.length > 0 && selectedIds.length === displayedSubjects.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(displayedSubjects.map(s => s.id));
                    } else {
                      setSelectedIds([]);
                    }
                  }}
                  style={{ cursor: "pointer", accentColor: "#6366f1" }} 
                />
              </th>
              <th style={thStyle}>Subject</th>
              <th style={thStyle}>Sub-Category</th>
              <th style={thStyle}>Price</th>
              <th style={thStyle}>Validity</th>
              <th style={thStyle}>Status</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={emptyCellStyle}>Loading…</td></tr>
            ) : displayedSubjects.length === 0 ? (
              <tr>
                <td colSpan={7} style={emptyCellStyle}>
                  No subjects found.{" "}
                  <button onClick={openCreate} style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontWeight: 700 }}>
                    Create one →
                  </button>
                </td>
              </tr>
            ) : (
              displayedSubjects.map((sub, idx) => (
                <tr
                  key={sub.id}
                  onClick={() => {
                    if (selectedIds.includes(sub.id)) setSelectedIds(selectedIds.filter(id => id !== sub.id));
                    else setSelectedIds([...selectedIds, sub.id]);
                  }}
                  style={{ borderBottom: "1px solid #f8fafc", transition: "background 0.15s", cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#fafbff")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "14px 16px", color: "#cbd5e1", fontWeight: 600, width: 60, display: "flex", alignItems: "center", gap: 12 }}>
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
                    <span>{idx + 1}</span>
                  </td>

                  {/* Subject name + description */}
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{sub.name}</div>
                    {sub.description && (
                      <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 2, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {sub.description}
                      </div>
                    )}
                    <div style={{ marginTop: 4 }}>
                      {!sub.is_purchasable && (
                        <span style={badge("#fef3c7", "#b45309")}>Not for sale</span>
                      )}
                    </div>
                  </td>

                  {/* Sub-category + Category */}
                  <td style={{ padding: "14px 16px" }}>
                    <span style={badge("#f1f5f9", "#475569")}>{subcatName(sub.subcategory_id)}</span>
                    <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 4 }}>{catOfSubcat(sub.subcategory_id)}</div>
                  </td>

                  {/* Price display */}
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#6366f1" }}>{fmt(sub.price)}</div>
                    {sub.discounted_price != null && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                        <span style={{ fontSize: 11, color: "#94a3b8", textDecoration: "line-through" }}>{fmt(sub.price)}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#22c55e" }}>{fmt(sub.discounted_price)}</span>
                        {(sub.price ?? 0) > 0 && (
                          <span style={{ fontSize: 10, background: "#dcfce7", color: "#16a34a", padding: "1px 6px", borderRadius: 5, fontWeight: 700 }}>
                            {Math.round((((sub.price ?? 0) - (sub.discounted_price ?? 0)) / (sub.price ?? 1)) * 100)}% OFF
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Validity */}
                  <td style={{ padding: "14px 16px", color: "#64748b", fontWeight: 600 }}>
                    {(sub.validity_days ?? 365) >= 36500 ? "Lifetime" : `${sub.validity_days ?? 365}d`}
                  </td>

                  {/* Active toggle */}
                  <td style={{ padding: "14px 16px" }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleActive(sub); }}
                      disabled={togglingId === sub.id}
                      title={sub.is_active ? "Click to deactivate" : "Click to activate"}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "4px 12px", borderRadius: 20, border: "none",
                        fontSize: 12, fontWeight: 700, cursor: "pointer",
                        background: sub.is_active ? "#dcfce7" : "#f1f5f9",
                        color: sub.is_active ? "#16a34a" : "#94a3b8",
                        transition: "all 0.2s",
                      }}
                    >
                      <span style={{
                        width: 7, height: 7, borderRadius: "50%",
                        background: sub.is_active ? "#22c55e" : "#cbd5e1",
                        display: "inline-block",
                      }} />
                      {togglingId === sub.id ? "…" : sub.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: "14px 16px", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button onClick={(e) => { e.stopPropagation(); openEdit(sub); }} title="Edit" style={actionBtn("#f1f5f9", "#475569")}>
                        <Icon name="edit" size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: sub.id, name: sub.name }); }} title="Delete" style={actionBtn("#fef2f2", "#ef4444")}>
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!loading && displayedSubjects.length > 0 && (
          <div style={{ padding: "10px 20px", borderTop: "1px solid #f1f5f9", fontSize: 12, color: "#94a3b8" }}>
            {displayedSubjects.length}{displayedSubjects.length !== subjects.length ? ` of ${subjects.length}` : ""} subject{displayedSubjects.length !== 1 ? "s" : ""} found
          </div>
        )}
      </div>
        );
      })()}

      {/* -- Modal ------------------------------------------- */}
      {modalOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          style={{
            position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)",
            backdropFilter: "blur(4px)", zIndex: 1000,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}
        >
          <form
            onSubmit={handleSave}
            style={{
              background: "#fff", borderRadius: 20, width: "80vw", maxWidth: 1200,
              boxShadow: "0 24px 80px rgba(15,23,42,0.22)",
              maxHeight: "90vh", overflowY: "auto",
            }}
          >
            {/* Modal Header */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "22px 28px 18px", borderBottom: "1px solid #f1f5f9",
              position: "sticky", top: 0, background: "#fff", zIndex: 1, borderRadius: "20px 20px 0 0",
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                  {modalMode === "create" ? "✦ New Subject" : "✎ Edit Subject"}
                </h2>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: "#94a3b8" }}>
                  {modalMode === "create" ? "Fill in the details to create a new purchasable subject." : "Update the subject details and pricing."}
                </p>
              </div>
              <button type="button" onClick={closeModal} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, width: 34, height: 34, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
                <Icon name="x" size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Row 1: Category + SubCategory */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

                {/* -- Category -- */}
                <div>
                  <FloatingSelect
                    label="Category"
                    value={formCatId}
                    onChange={(e) => { setFormCatId(e.target.value); setForm((f) => ({ ...f, subcategory_id: "" })); setAddingSubcat(false); }}
                  >
                    <option value="all">All Categories</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </FloatingSelect>

                  {/* Quick-add category */}
                  {!addingCat ? (
                    <button
                      type="button"
                      onClick={() => { setAddingCat(true); setNewCatName(""); }}
                      style={quickAddLinkStyle}
                    >
                      + Add Category
                    </button>
                  ) : (
                    <div style={quickAddBoxStyle}>
                      <input
                        autoFocus
                        type="text"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCategory(); } if (e.key === "Escape") setAddingCat(false); }}
                        placeholder="Category name…"
                        style={quickAddInputStyle}
                      />
                      <button type="button" onClick={handleAddCategory} disabled={savingCat || !newCatName.trim()} style={quickAddSaveBtnStyle}>
                        {savingCat ? "…" : "Save"}
                      </button>
                      <button type="button" onClick={() => setAddingCat(false)} style={quickAddCancelBtnStyle}>✕</button>
                    </div>
                  )}
                </div>

                {/* -- Sub-Category -- */}
                <div>
                  <FloatingSelect
                    label="Sub-Category *"
                    value={form.subcategory_id}
                    onChange={(e) => setForm((f) => ({ ...f, subcategory_id: e.target.value }))}
                    required
                  >
                    <option value="">Select sub-category…</option>
                    {formSubcats.map((sc) => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
                  </FloatingSelect>

                  {/* Quick-add sub-category */}
                  {!addingSubcat ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (formCatId === "all") { showToast("Please select a category first.", "error"); return; }
                        setAddingSubcat(true); setNewSubcatName("");
                      }}
                      style={quickAddLinkStyle}
                    >
                      + Add Sub-Category
                    </button>
                  ) : (
                    <div style={quickAddBoxStyle}>
                      <input
                        autoFocus
                        type="text"
                        value={newSubcatName}
                        onChange={(e) => setNewSubcatName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSubcategory(); } if (e.key === "Escape") setAddingSubcat(false); }}
                        placeholder="Sub-category name…"
                        style={quickAddInputStyle}
                      />
                      <button type="button" onClick={handleAddSubcategory} disabled={savingSubcat || !newSubcatName.trim()} style={quickAddSaveBtnStyle}>
                        {savingSubcat ? "…" : "Save"}
                      </button>
                      <button type="button" onClick={() => setAddingSubcat(false)} style={quickAddCancelBtnStyle}>✕</button>
                    </div>
                  )}
                </div>

              </div>

              {/* Row 2: Subject Name */}
              <div>
                <FloatingInput
                  label="Subject Name *"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: (e.target as HTMLInputElement).value }))}
                  required
                  inputRef={nameRef}
                />
              </div>

              {/* Row 3: Description */}
              <div>
                <FloatingInput
                  label="Description"
                  isTextArea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>

              {/* Pricing Section */}
              <div style={{ background: "#f8fafc", borderRadius: 12, padding: "18px 20px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 14 }}>
                  💰 Pricing & Access
                </div>

                <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>INR (₹) Pricing</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 16 }}>
                  <div>
                    <FloatingPriceInput
                      label="Price (₹) *"
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <FloatingPriceInput
                      label="Offer Price (₹)"
                      value={form.discounted_price}
                      onChange={(e) => setForm((f) => ({ ...f, discounted_price: e.target.value }))}
                    />
                    {form.price && form.discounted_price && parseFloat(form.discounted_price) < parseFloat(form.price) && (
                      <div style={{ marginTop: 4, color: "#22c55e", fontSize: 11, fontWeight: 700 }}>
                        {Math.round(((parseFloat(form.price) - parseFloat(form.discounted_price)) / parseFloat(form.price)) * 100)}% discount
                      </div>
                    )}
                  </div>
                  <div>
                    <FloatingInput
                      label="Validity (days)"
                      type="number"
                      min="1"
                      value={form.validity_days}
                      onChange={(e) => setForm((f) => ({ ...f, validity_days: (e.target as HTMLInputElement).value }))}
                    />
                    <div style={{ marginTop: 4, fontSize: 11, color: "#94a3b8" }}>
                      {parseInt(form.validity_days) >= 36500 ? "Lifetime" : `${form.validity_days} days after purchase`}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>USD ($) Pricing</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                  <div>
                    <FloatingInput
                      label="Price (USD)"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price_usd}
                      onChange={(e) => setForm((f) => ({ ...f, price_usd: (e.target as HTMLInputElement).value }))}
                    />
                  </div>
                  <div>
                    <FloatingInput
                      label="Offer Price (USD)"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.discounted_price_usd}
                      onChange={(e) => setForm((f) => ({ ...f, discounted_price_usd: (e.target as HTMLInputElement).value }))}
                    />
                    {form.price_usd && form.discounted_price_usd && parseFloat(form.discounted_price_usd) < parseFloat(form.price_usd) && (
                      <div style={{ marginTop: 4, color: "#22c55e", fontSize: 11, fontWeight: 700 }}>
                        {Math.round(((parseFloat(form.price_usd) - parseFloat(form.discounted_price_usd)) / parseFloat(form.price_usd)) * 100)}% discount
                      </div>
                    )}
                  </div>
                </div>

                {/* Toggles */}
                <div style={{ display: "flex", gap: 20, marginTop: 18 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <div
                      onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                      style={{
                        width: 44, height: 24, borderRadius: 12,
                        background: form.is_active ? "#6366f1" : "#e2e8f0",
                        position: "relative", cursor: "pointer", transition: "background 0.2s",
                        flexShrink: 0,
                      }}
                    >
                      <span style={{
                        position: "absolute", top: 3, left: form.is_active ? 23 : 3,
                        width: 18, height: 18, borderRadius: "50%", background: "#fff",
                        transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                      }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Active</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>Show in student portal</div>
                    </div>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <div
                      onClick={() => setForm((f) => ({ ...f, is_purchasable: !f.is_purchasable }))}
                      style={{
                        width: 44, height: 24, borderRadius: 12,
                        background: form.is_purchasable ? "#0ea5e9" : "#e2e8f0",
                        position: "relative", cursor: "pointer", transition: "background 0.2s",
                        flexShrink: 0,
                      }}
                    >
                      <span style={{
                        position: "absolute", top: 3, left: form.is_purchasable ? 23 : 3,
                        width: 18, height: 18, borderRadius: "50%", background: "#fff",
                        transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                      }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Purchasable</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>Allow students to buy</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Display Order */}
              <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 16, alignItems: "start" }}>
                <div>
                  <FloatingInput
                    label="Display Order"
                    type="number"
                    min="0"
                    value={form.display_order}
                    onChange={(e) => setForm((f) => ({ ...f, display_order: (e.target as HTMLInputElement).value }))}
                  />
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Lower = appears first</div>
                </div>
              </div>

              {/* Error */}
              {formError && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", color: "#dc2626", fontSize: 13, fontWeight: 600 }}>
                  ⚠ {formError}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              display: "flex", gap: 10, justifyContent: "flex-end",
              padding: "18px 28px", borderTop: "1px solid #f1f5f9",
              position: "sticky", bottom: 0, background: "#fff",
              borderRadius: "0 0 20px 20px",
            }}>
              <button type="button" onClick={closeModal} style={btn("#f1f5f9", "#475569")}>
                Cancel
              </button>
              <button type="submit" disabled={saving} style={btn(saving ? "#94a3b8" : "#6366f1", "#fff")}>
                {saving ? "Saving…" : modalMode === "create" ? "Create Subject" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* -- Delete Confirm ---------------------------------- */}
      {deleteTarget && (
        <DeleteModal
          title={`Delete "${deleteTarget.name}"?`}
          description="All courses linked to this subject will also be permanently removed."
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

// -- Styles -----------------------------------------------------
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11.5, fontWeight: 700, color: "#64748b",
  marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.4px",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 8,
  border: "1px solid #e2e8f0", fontSize: 14, outline: "none",
  boxSizing: "border-box", background: "#fff", color: "#0f172a",
  fontFamily: "inherit",
};

const filterInputStyle: React.CSSProperties = {
  padding: "9px 14px", borderRadius: 10, border: "1px solid #e2e8f0",
  fontSize: 13, outline: "none", background: "#fff", color: "#0f172a",
  minWidth: 160,
};

const thStyle: React.CSSProperties = {
  padding: "13px 16px", textAlign: "left", fontWeight: 700, color: "#94a3b8",
  textTransform: "uppercase", fontSize: 10.5, letterSpacing: "0.6px",
};

const emptyCellStyle: React.CSSProperties = {
  padding: 48, textAlign: "center", color: "#94a3b8", fontSize: 14,
};

const badge = (bg: string, color: string): React.CSSProperties => ({
  display: "inline-block", background: bg, color, fontSize: 11.5,
  fontWeight: 600, padding: "3px 10px", borderRadius: 7,
});

const btn = (bg: string, color: string): React.CSSProperties => ({
  background: bg, color, border: "none", padding: "10px 20px",
  borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer",
  display: "inline-flex", alignItems: "center", gap: 7, transition: "opacity 0.2s",
});

const actionBtn = (bg: string, color: string): React.CSSProperties => ({
  border: "none", background: bg, color, width: 32, height: 32,
  borderRadius: 7, cursor: "pointer", display: "inline-flex",
  alignItems: "center", justifyContent: "center",
});

// -- Quick-add styles -------------------------------------------
const quickAddLinkStyle: React.CSSProperties = {
  background: "none", border: "none", padding: "4px 0",
  marginTop: 6, fontSize: 12, fontWeight: 700,
  color: "#6366f1", cursor: "pointer",
  display: "inline-flex", alignItems: "center", gap: 4,
  textDecoration: "none",
};

const quickAddBoxStyle: React.CSSProperties = {
  display: "flex", gap: 6, marginTop: 7, alignItems: "center",
};

const quickAddInputStyle: React.CSSProperties = {
  flex: 1, padding: "7px 10px", borderRadius: 7,
  border: "1.5px solid #6366f1", fontSize: 13, outline: "none",
  color: "#0f172a", background: "#fff",
};

const quickAddSaveBtnStyle: React.CSSProperties = {
  padding: "7px 13px", borderRadius: 7, border: "none",
  background: "#6366f1", color: "#fff", fontSize: 12,
  fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
};

const quickAddCancelBtnStyle: React.CSSProperties = {
  padding: "7px 10px", borderRadius: 7, border: "none",
  background: "#f1f5f9", color: "#64748b", fontSize: 12,
  fontWeight: 700, cursor: "pointer",
};
