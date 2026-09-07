"use client";
import React, { useState, useEffect, useCallback } from "react";
import { AdminProvider } from "../../../components/ProtectedAdmin";
import { useToast } from "../../../components/ToastProvider";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL } from "@/lib/config";
import { Icon } from "../../../icons";
import CareerNavTabs from "../CareerNavTabs";

const API = BASE_URL;

interface CareerCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  badge_color: string | null;
  is_active: boolean;
  display_order: number;
  job_count: number;
  created_at: string;
}

const EMPTY_FORM = {
  name: "",
  slug: "",
  description: "",
  icon: "briefcase",
  badge_color: "#1d4ed8",
  is_active: true,
  display_order: 0,
};

const COLOR_PRESETS = [
  { name: "Blue", hex: "#1d4ed8" },
  { name: "Sky", hex: "#0284c7" },
  { name: "Emerald", hex: "#059669" },
  { name: "Purple", hex: "#7c3aed" },
  { name: "Rose", hex: "#e11d48" },
  { name: "Amber", hex: "#d97706" },
  { name: "Slate", hex: "#475569" },
];

function CategoriesInner() {
  const { showToast } = useToast();
  const [items, setItems] = useState<CareerCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CareerCategory | null>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState<CareerCategory | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API}/api/career/categories/all`);
      if (res.ok) setItems(await res.json());
    } catch {
      showToast("Failed to load categories.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, display_order: items.length });
    setModalOpen(true);
  };

  const openEdit = (c: CareerCategory) => {
    setEditing(c);
    setForm({
      name: c.name,
      slug: c.slug,
      description: c.description || "",
      icon: c.icon || "briefcase",
      badge_color: c.badge_color || "#1d4ed8",
      is_active: c.is_active,
      display_order: c.display_order ?? 0,
    });
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast("Category name is required.", "error");
      return;
    }
    setSaving(true);
    try {
      const body = {
        ...form,
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        display_order: Number(form.display_order) || 0,
      };
      const res = await apiFetch(`${API}/api/career/categories${editing ? `/${editing.id}` : ""}`, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        showToast(editing ? "Category updated." : "Category created.", "success");
        setModalOpen(false);
        load();
      } else {
        const d = await res.json().catch(() => ({}));
        showToast(d.detail || "Failed to save category.", "error");
      }
    } catch {
      showToast("Error saving category.", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (c: CareerCategory) => {
    try {
      await apiFetch(`${API}/api/career/categories/${c.id}/toggle`, { method: "PATCH" });
      load();
    } catch {
      showToast("Toggle failed.", "error");
    }
  };

  const del = async () => {
    if (!confirmDel) return;
    try {
      await apiFetch(`${API}/api/career/categories/${confirmDel.id}`, { method: "DELETE" });
      showToast("Category deleted.", "success");
      setConfirmDel(null);
      load();
    } catch {
      showToast("Delete failed.", "error");
    }
  };

  const filtered = items.filter(
    c =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    fontSize: 14,
    border: "1.5px solid #e2e8f0",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
    color: "#0f172a",
    background: "#fff",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: "#64748b",
    display: "block",
    marginBottom: 6,
  };

  return (
    <div style={{ padding: "40px 48px", width: "100%", fontFamily: "'Inter', sans-serif", boxSizing: "border-box" }}>
      <CareerNavTabs onRefresh={load} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: "0 0 6px" }}>
            Job Categories
          </h1>
          <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>
            Manage dynamic job categories across internal IINM roles, partner companies, and specialized sectors.
          </p>
        </div>
        <button
          onClick={openNew}
          style={{
            background: "#0f172a",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 18px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Icon name="plus" size={16} color="#fff" /> New Category
        </button>
      </div>

      {/* Search Input */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search categories…"
        style={{ ...inputStyle, marginBottom: 20, maxWidth: 320 }}
      />

      {/* Table */}
      {loading ? (
        <div style={{ color: "#94a3b8", fontSize: 14 }}>Loading categories…</div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: 48,
            textAlign: "center",
            color: "#94a3b8",
            fontSize: 14,
            background: "#fff",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
          }}
        >
          No categories found. Click “New Category” to create one.
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Category Name
                </th>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Slug
                </th>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Theme Color
                </th>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Jobs
                </th>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Status
                </th>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "right" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "14px 16px", fontWeight: 600, color: "#0f172a" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        style={{
                          display: "inline-block",
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: c.badge_color || "#1d4ed8",
                        }}
                      />
                      <span>{c.name}</span>
                    </div>
                    {c.description && (
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b", fontWeight: 400 }}>
                        {c.description}
                      </p>
                    )}
                  </td>
                  <td style={{ padding: "14px 16px", color: "#64748b", fontFamily: "monospace", fontSize: 12 }}>
                    {c.slug}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background: "#f1f5f9",
                        padding: "2px 8px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontFamily: "monospace",
                      }}
                    >
                      <span style={{ width: 12, height: 12, borderRadius: 3, background: c.badge_color || "#1d4ed8" }} />
                      {c.badge_color || "#1d4ed8"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", color: "#0f172a", fontWeight: 600 }}>
                    <span
                      style={{
                        background: c.job_count > 0 ? "#eff6ff" : "#f1f5f9",
                        color: c.job_count > 0 ? "#1d4ed8" : "#64748b",
                        padding: "3px 10px",
                        borderRadius: 100,
                        fontSize: 12,
                      }}
                    >
                      {c.job_count} {c.job_count === 1 ? "job" : "jobs"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <button
                      onClick={() => toggle(c)}
                      style={{
                        border: "none",
                        cursor: "pointer",
                        borderRadius: 100,
                        padding: "3px 10px",
                        fontSize: 12,
                        fontWeight: 600,
                        background: c.is_active ? "#d1fae5" : "#fee2e2",
                        color: c.is_active ? "#065f46" : "#991b1b",
                      }}
                    >
                      {c.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <button
                      onClick={() => openEdit(c)}
                      style={{ border: "none", background: "transparent", cursor: "pointer", color: "#0f172a", marginRight: 8 }}
                      title="Edit"
                    >
                      <Icon name="edit" size={16} />
                    </button>
                    <button
                      onClick={() => setConfirmDel(c)}
                      style={{ border: "none", background: "transparent", cursor: "pointer", color: "#dc2626" }}
                      title="Delete"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div
          onClick={() => setModalOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 28,
              width: "100%",
              maxWidth: 520,
              maxHeight: "90vh",
              overflow: "auto",
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 20px" }}>
              {editing ? "Edit Career Category" : "New Career Category"}
            </h2>
            <form onSubmit={save}>
              <label style={labelStyle}>Category Name *</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                style={inputStyle}
                placeholder="e.g. Faculty & Teaching, AI Engineering, Partner Openings"
                autoFocus
              />
              <div style={{ height: 14 }} />

              <label style={labelStyle}>Slug (optional — auto-generated)</label>
              <input
                value={form.slug}
                onChange={e => setForm({ ...form, slug: e.target.value })}
                style={inputStyle}
                placeholder="e.g. faculty-teaching"
              />
              <div style={{ height: 14 }} />

              <label style={labelStyle}>Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
                placeholder="Short summary of this category / job segment"
              />
              <div style={{ height: 14 }} />

              <label style={labelStyle}>Badge / Theme Color</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
                {COLOR_PRESETS.map(p => (
                  <button
                    key={p.hex}
                    type="button"
                    onClick={() => setForm({ ...form, badge_color: p.hex })}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: p.hex,
                      border: form.badge_color === p.hex ? "2px solid #0f172a" : "2px solid transparent",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title={p.name}
                  >
                    {form.badge_color === p.hex && <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>✓</span>}
                  </button>
                ))}
              </div>
              <input
                value={form.badge_color}
                onChange={e => setForm({ ...form, badge_color: e.target.value })}
                style={{ ...inputStyle, maxWidth: 140 }}
                placeholder="#1d4ed8"
              />
              <div style={{ height: 14 }} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Display Order</label>
                  <input
                    type="number"
                    min={0}
                    value={form.display_order}
                    onChange={e => setForm({ ...form, display_order: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#0f172a", cursor: "pointer", marginBottom: 10 }}>
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={e => setForm({ ...form, is_active: e.target.checked })}
                    />
                    Active Category
                  </label>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    border: "1px solid #e2e8f0",
                    background: "#fff",
                    borderRadius: 8,
                    padding: "10px 18px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    color: "#64748b",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: "#0f172a",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 22px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: saving ? "wait" : "pointer",
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDel && (
        <div
          onClick={() => setConfirmDel(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 28,
              width: "100%",
              maxWidth: 400,
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>
              Delete category?
            </h3>
            <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 20px" }}>
              “{confirmDel.name}” will be deleted. Any jobs assigned to this category will keep their details with category set to unassigned.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirmDel(null)}
                style={{
                  border: "1px solid #e2e8f0",
                  background: "#fff",
                  borderRadius: 8,
                  padding: "10px 18px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  color: "#64748b",
                }}
              >
                Cancel
              </button>
              <button
                onClick={del}
                style={{
                  background: "#dc2626",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 18px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CareerCategoriesPage() {
  return (
    <AdminProvider>
      <CategoriesInner />
    </AdminProvider>
  );
}
