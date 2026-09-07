"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { AdminProvider } from "../../../components/ProtectedAdmin";
import { useToast } from "../../../components/ToastProvider";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL } from "@/lib/config";
import { Icon } from "../../../icons";
import CareerNavTabs from "../CareerNavTabs";

const API = BASE_URL;

interface JobPost {
  id: number;
  category_id: number | null;
  category_name: string | null;
  category_slug: string | null;
  position_id: number | null;
  position_title: string | null;
  title: string;
  slug: string;
  featured_image_url: string | null;
  company_name: string | null;
  company_logo_url: string | null;
  summary: string | null;
  description: string | null;
  requirements: string | null;
  responsibilities: string | null;
  location: string | null;
  job_type: string;
  experience_min: number | null;
  experience_max: number | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  vacancies: number;
  application_deadline: string | null;
  status: string;
  is_featured: boolean;
  is_pinned?: boolean;
  tags?: string[];
  application_type?: string;
  external_apply_url?: string | null;
  created_at: string;
  published_at: string | null;
}

interface Position {
  id: number;
  title: string;
}

interface CareerCategory {
  id: number;
  name: string;
  slug: string;
  badge_color: string | null;
}

const JOB_TYPES = [
  { v: "full_time", l: "Full-time" },
  { v: "part_time", l: "Part-time" },
  { v: "contract", l: "Contract" },
  { v: "internship", l: "Internship" },
  { v: "remote", l: "Remote" },
];

const STATUS_TABS = ["all", "open", "closed", "draft"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

const SUGGESTED_TAGS = [
  "Govt Job", "Central Govt", "State Health", "AIIMS", "ESIC",
  "Corporate Hospital", "Multi-Specialty", "Staff Nurse", "Critical Care",
  "ICU", "Nursing Tutor", "Faculty", "MLT", "OT Tech", "Radiology",
  "Full-time", "Kolkata", "West Bengal"
];

const EMPTY_FORM: any = {
  category_id: "",
  position_id: "",
  title: "",
  slug: "",
  featured_image_url: "",
  company_name: "IINM",
  company_logo_url: "",
  summary: "",
  description: "",
  requirements: "",
  responsibilities: "",
  location: "",
  job_type: "full_time",
  experience_min: "",
  experience_max: "",
  salary_min: "",
  salary_max: "",
  salary_currency: "INR",
  vacancies: 1,
  application_deadline: "",
  status: "open",
  is_featured: false,
  is_pinned: false,
  tags: [],
  application_type: "internal",
  external_apply_url: "",
};

function JobsInner() {
  const { showToast } = useToast();
  const [items, setItems] = useState<JobPost[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [categories, setCategories] = useState<CareerCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<StatusTab>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<JobPost | null>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [confirmDel, setConfirmDel] = useState<JobPost | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [jRes, pRes, cRes] = await Promise.all([
        apiFetch(`${API}/api/career/jobs/all?limit=200`),
        apiFetch(`${API}/api/career/positions/all`),
        apiFetch(`${API}/api/career/categories/all`),
      ]);
      if (jRes.ok) {
        const d = await jRes.json();
        setItems(d.items || []);
      }
      if (pRes.ok) setPositions(await pRes.json());
      if (cRes.ok) setCategories(await cRes.json());
    } catch {
      showToast("Failed to load job posts.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setTagInput("");
    setModalOpen(true);
  };

  const openEdit = (j: JobPost) => {
    setEditing(j);
    setForm({
      category_id: j.category_id || "",
      position_id: j.position_id || "",
      title: j.title,
      slug: j.slug,
      featured_image_url: j.featured_image_url || "",
      company_name: j.company_name || "IINM",
      company_logo_url: j.company_logo_url || "",
      summary: j.summary || "",
      description: j.description || "",
      requirements: j.requirements || "",
      responsibilities: j.responsibilities || "",
      location: j.location || "",
      job_type: j.job_type,
      experience_min: j.experience_min ?? "",
      experience_max: j.experience_max ?? "",
      salary_min: j.salary_min ?? "",
      salary_max: j.salary_max ?? "",
      salary_currency: j.salary_currency || "INR",
      vacancies: j.vacancies ?? 1,
      application_deadline: j.application_deadline ? j.application_deadline.slice(0, 10) : "",
      status: j.status,
      is_featured: j.is_featured,
      is_pinned: Boolean(j.is_pinned),
      tags: Array.isArray(j.tags) ? j.tags : [],
      application_type: j.application_type || "internal",
      external_apply_url: j.external_apply_url || "",
    });
    setTagInput("");
    setModalOpen(true);
  };

  const addTag = (tag: string) => {
    const cleaned = tag.trim().replace(/^,+|,+$/g, "");
    if (!cleaned) return;
    const currentTags = Array.isArray(form.tags) ? form.tags : [];
    if (!currentTags.includes(cleaned)) {
      setForm({ ...form, tags: [...currentTags, cleaned] });
    }
    setTagInput("");
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = Array.isArray(form.tags) ? form.tags : [];
    setForm({ ...form, tags: currentTags.filter((t: string) => t !== tagToRemove) });
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch(`${API}/api/career/upload-image`, {
        method: "POST",
        body: fd,
      });
      if (res.ok) {
        const d = await res.json();
        setForm((prev: any) => ({ ...prev, featured_image_url: d.url }));
        showToast("Featured image uploaded successfully.", "success");
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || "Image upload failed.", "error");
      }
    } catch {
      showToast("Network error during image upload.", "error");
    } finally {
      setUploadingImg(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const save = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!form.title.trim()) {
      showToast("Title is required.", "error");
      return;
    }
    setSaving(true);
    try {
      const body = {
        ...form,
        category_id: form.category_id ? Number(form.category_id) : null,
        position_id: form.position_id ? Number(form.position_id) : null,
        featured_image_url: form.featured_image_url?.trim() || null,
        company_name: form.company_name?.trim() || "IINM",
        company_logo_url: form.company_logo_url?.trim() || null,
        experience_min: form.experience_min === "" ? null : Number(form.experience_min),
        experience_max: form.experience_max === "" ? null : Number(form.experience_max),
        salary_min: form.salary_min === "" ? null : Number(form.salary_min),
        salary_max: form.salary_max === "" ? null : Number(form.salary_max),
        vacancies: Number(form.vacancies) || 1,
        application_deadline: form.application_deadline || null,
        slug: form.slug.trim() || undefined,
        tags: Array.isArray(form.tags) ? form.tags : [],
        is_pinned: Boolean(form.is_pinned),
        application_type: form.application_type || "internal",
        external_apply_url: form.application_type === "external" ? (form.external_apply_url?.trim() || null) : null,
      };
      const res = await apiFetch(`${API}/api/career/jobs${editing ? `/${editing.id}` : ""}`, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        showToast(editing ? "Job post updated successfully." : "Job post published successfully.", "success");
        setModalOpen(false);
        load();
      } else {
        const d = await res.json().catch(() => ({}));
        showToast(d.detail || "Failed to save job post.", "error");
      }
    } catch {
      showToast("Error saving job post.", "error");
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (j: JobPost, status: string) => {
    try {
      await apiFetch(`${API}/api/career/jobs/${j.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      load();
    } catch {
      showToast("Status change failed.", "error");
    }
  };

  const toggleFeature = async (j: JobPost) => {
    try {
      await apiFetch(`${API}/api/career/jobs/${j.id}/feature`, { method: "PATCH" });
      load();
    } catch {
      showToast("Feature toggle failed.", "error");
    }
  };

  const togglePin = async (j: JobPost) => {
    try {
      const res = await apiFetch(`${API}/api/career/jobs/${j.id}/pin`, { method: "PATCH" });
      if (res.ok) {
        const d = await res.json().catch(() => ({}));
        showToast(d.is_pinned ? "Job pinned to top of career page." : "Job unpinned.", "success");
        load();
      } else {
        showToast("Pin toggle failed.", "error");
      }
    } catch {
      showToast("Pin toggle failed.", "error");
    }
  };

  const doDelete = async () => {
    if (!confirmDel) return;
    try {
      await apiFetch(`${API}/api/career/jobs/${confirmDel.id}`, { method: "DELETE" });
      showToast("Job post deleted.", "success");
      setConfirmDel(null);
      load();
    } catch {
      showToast("Delete failed.", "error");
    }
  };

  const filtered = items
    .filter(j => {
      if (tab !== "all" && j.status !== tab) return false;
      if (filterCategory !== "all" && String(j.category_id) !== filterCategory) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = j.title.toLowerCase().includes(q);
        const matchDept = (j.position_title || "").toLowerCase().includes(q);
        const matchCat = (j.category_name || "").toLowerCase().includes(q);
        const matchComp = (j.company_name || "").toLowerCase().includes(q);
        const matchLoc = (j.location || "").toLowerCase().includes(q);
        const matchTags = Array.isArray(j.tags) && j.tags.some(t => t.toLowerCase().includes(q));
        if (!matchTitle && !matchDept && !matchCat && !matchComp && !matchLoc && !matchTags) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (Boolean(a.is_pinned) !== Boolean(b.is_pinned)) {
        return a.is_pinned ? -1 : 1;
      }
      return 0;
    });

  const cardStyle: React.CSSProperties = {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "20px 22px",
    marginBottom: 20,
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
  };

  const cardTitleStyle: React.CSSProperties = {
    fontSize: 14.5,
    fontWeight: 600,
    color: "#0f172a",
    margin: "0 0 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12.5,
    fontWeight: 500,
    color: "#475569",
    display: "block",
    marginBottom: 6,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    fontSize: 13.5,
    borderRadius: 6,
    border: "1px solid #cbd5e1",
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
    background: "#ffffff",
    color: "#0f172a",
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: 110,
    resize: "vertical",
    lineHeight: 1.6,
  };

  return (
    <div style={{ padding: "36px 44px", width: "100%", fontFamily: "'Inter', sans-serif", boxSizing: "border-box" }}>
      {/* ── Top Career Navigation Tabs ── */}
      <CareerNavTabs onCreateJob={openNew} onRefresh={load} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>
            Job Openings
          </h1>
          <p style={{ color: "#64748b", fontSize: 13.5, margin: 0 }}>
            Manage job vacancies with featured images, dynamic categories, full descriptions, and search tags.
          </p>
        </div>
      </div>

      {/* Filter Toolbar: Status Tabs + Category Filter + Search */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Status Tabs */}
          <div style={{ display: "flex", background: "#f1f5f9", padding: 3, borderRadius: 8 }}>
            {STATUS_TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: "6px 14px",
                  fontSize: 13,
                  fontWeight: 500,
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  background: tab === t ? "#ffffff" : "transparent",
                  color: tab === t ? "#0f172a" : "#64748b",
                  boxShadow: tab === t ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                  textTransform: "capitalize",
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Category Filter Dropdown */}
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            style={{
              padding: "7px 12px",
              borderRadius: 6,
              border: "1px solid #cbd5e1",
              fontSize: 13,
              background: "#ffffff",
              color: "#334155",
              cursor: "pointer",
            }}
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by title, department, company, tags..."
          style={{ ...inputStyle, width: 280 }}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ color: "#94a3b8", fontSize: 14, padding: "40px 0" }}>Loading job postings…</div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: 48,
            textAlign: "center",
            color: "#64748b",
            fontSize: 14,
            background: "#ffffff",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
          }}
        >
          No job openings found matching your criteria. Click &quot;New Job Post&quot; or seed sample categories.
        </div>
      ) : (
        <div style={{ background: "#ffffff", borderRadius: 10, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#475569", fontSize: 12, textTransform: "uppercase" }}>
                  Role & Organization
                </th>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#475569", fontSize: 12, textTransform: "uppercase" }}>
                  Category
                </th>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#475569", fontSize: 12, textTransform: "uppercase" }}>
                  Tags
                </th>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#475569", fontSize: 12, textTransform: "uppercase" }}>
                  Location & Type
                </th>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#475569", fontSize: 12, textTransform: "uppercase" }}>
                  Status
                </th>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#475569", fontSize: 12, textTransform: "uppercase", textAlign: "right" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(j => (
                <tr key={j.id} style={{ borderTop: "1px solid #f1f5f9", background: j.is_pinned ? "#fffdf2" : undefined }}>
                  {/* Title & Featured Image */}
                  <td style={{ padding: "12px 16px", color: "#0f172a" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {j.featured_image_url ? (
                        <img
                          src={j.featured_image_url}
                          alt={j.title}
                          style={{ width: 42, height: 42, borderRadius: 6, objectFit: "cover", border: "1px solid #e2e8f0", flexShrink: 0 }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 6,
                            background: "#f1f5f9",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#94a3b8",
                            flexShrink: 0,
                          }}
                        >
                          <Icon name="briefcase" size={18} />
                        </div>
                      )}
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontWeight: 600 }}>{j.title}</span>
                          {j.is_pinned && (
                            <span
                              style={{
                                background: "#fef3c7",
                                color: "#92400e",
                                border: "1px solid #fde68a",
                                fontSize: 10.5,
                                fontWeight: 700,
                                padding: "1px 6px",
                                borderRadius: 4,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 2,
                              }}
                              title="Pinned to top of career page"
                            >
                              📌 PINNED
                            </span>
                          )}
                          {j.is_featured && <span style={{ color: "#d97706", fontSize: 12 }} title="Featured">★</span>}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                          {j.company_name && j.company_name !== "IINM" ? (
                            <span style={{ color: "#0284c7", fontWeight: 500 }}>{j.company_name} • </span>
                          ) : null}
                          {j.position_title || "General"}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                          {j.application_type === "external" ? (
                            <span
                              style={{
                                background: "#faf5ff",
                                color: "#7e22ce",
                                border: "1px solid #f3e8ff",
                                padding: "1px 6px",
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 500,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 3,
                              }}
                              title={j.external_apply_url || "External Application Link"}
                            >
                              <span>External Portal</span>
                              <span>↗</span>
                            </span>
                          ) : (
                            <span
                              style={{
                                background: "#f0fdf4",
                                color: "#166534",
                                border: "1px solid #dcfce7",
                                padding: "1px 6px",
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 500,
                              }}
                            >
                              Internal Form Modal
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td style={{ padding: "12px 16px" }}>
                    {j.category_name ? (
                      <span
                        style={{
                          background: "#eff6ff",
                          color: "#1d4ed8",
                          padding: "3px 8px",
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                      >
                        {j.category_name}
                      </span>
                    ) : (
                      <span style={{ color: "#cbd5e1" }}>—</span>
                    )}
                  </td>

                  {/* Tags */}
                  <td style={{ padding: "12px 16px" }}>
                    {Array.isArray(j.tags) && j.tags.length > 0 ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxWidth: 200 }}>
                        {j.tags.slice(0, 3).map((t, idx) => (
                          <span
                            key={idx}
                            style={{
                              background: "#f1f5f9",
                              color: "#475569",
                              padding: "2px 6px",
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 500,
                            }}
                          >
                            {t}
                          </span>
                        ))}
                        {j.tags.length > 3 && (
                          <span style={{ fontSize: 11, color: "#94a3b8" }}>+{j.tags.length - 3}</span>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: "#cbd5e1" }}>—</span>
                    )}
                  </td>

                  {/* Location & Type */}
                  <td style={{ padding: "12px 16px", color: "#64748b" }}>
                    <div>{j.location || "Multiple"}</div>
                    <div style={{ fontSize: 11.5, color: "#94a3b8", textTransform: "capitalize" }}>
                      {j.job_type.replace(/_/g, " ")}
                    </div>
                  </td>

                  {/* Status */}
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: 12,
                        fontSize: 11.5,
                        fontWeight: 600,
                        background: j.status === "open" ? "#ecfdf5" : j.status === "closed" ? "#f1f5f9" : "#fef3c7",
                        color: j.status === "open" ? "#047857" : j.status === "closed" ? "#64748b" : "#b45309",
                        textTransform: "capitalize",
                      }}
                    >
                      {j.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <button
                      onClick={() => togglePin(j)}
                      style={{
                        marginRight: 8,
                        background: j.is_pinned ? "#fef3c7" : "#f8fafc",
                        border: j.is_pinned ? "1px solid #fde68a" : "1px solid #e2e8f0",
                        borderRadius: 4,
                        padding: "3px 7px",
                        cursor: "pointer",
                        color: j.is_pinned ? "#b45309" : "#64748b",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                      title={j.is_pinned ? "Pinned to Top — Click to unpin" : "Pin to top of career page"}
                    >
                      {j.is_pinned ? "📌 Pinned" : "📌 Pin"}
                    </button>
                    <Link
                      href={`/career/${j.slug}`}
                      target="_blank"
                      style={{
                        marginRight: 8,
                        padding: "4px 8px",
                        borderRadius: 4,
                        border: "1px solid #e2e8f0",
                        fontSize: 12,
                        color: "#475569",
                        textDecoration: "none",
                      }}
                    >
                      View
                    </Link>
                    <button
                      onClick={() => openEdit(j)}
                      style={{
                        marginRight: 8,
                        padding: "4px 10px",
                        borderRadius: 4,
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        fontSize: 12,
                        fontWeight: 500,
                        color: "#0f172a",
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleFeature(j)}
                      style={{
                        marginRight: 8,
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: j.is_featured ? "#d97706" : "#cbd5e1",
                        fontSize: 14,
                      }}
                      title={j.is_featured ? "Featured" : "Mark as featured"}
                    >
                      ★
                    </button>
                    <button
                      onClick={() => setConfirmDel(j)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}
                      title="Delete opening"
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          FULL-SCREEN CMS EDITOR WINDOW (WordPress / Gutenberg style)
          ══════════════════════════════════════════════════════════════ */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "#f8fafc",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {/* Top Bar Header */}
          <header
            style={{
              height: 64,
              background: "#ffffff",
              borderBottom: "1px solid #e2e8f0",
              padding: "0 28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
              gap: 16,
            }}
          >
            {/* Left: Back button + Title indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "transparent",
                  border: "1px solid #e2e8f0",
                  borderRadius: 6,
                  padding: "7px 12px",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#475569",
                  cursor: "pointer",
                }}
              >
                <Icon name="arrow-left" size={14} /> Back to Openings
              </button>
              <div style={{ height: 20, width: 1, background: "#e2e8f0" }} />
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  {editing ? `Edit: ${editing.title}` : "Create New Job Opening"}
                </h2>
              </div>
            </div>

            {/* Right: Quick Status selector + Cancel + Save button */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Status:</span>
                <select
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    fontWeight: 600,
                    background: form.status === "open" ? "#ecfdf5" : form.status === "draft" ? "#fef3c7" : "#f1f5f9",
                    color: form.status === "open" ? "#047857" : form.status === "draft" ? "#b45309" : "#475569",
                    cursor: "pointer",
                  }}
                >
                  <option value="open">Open (Published)</option>
                  <option value="draft">Draft (Unpublished)</option>
                  <option value="closed">Closed (Archived)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 6,
                  border: "1px solid #e2e8f0",
                  background: "#ffffff",
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: "#64748b",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={save}
                disabled={saving}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 22px",
                  borderRadius: 6,
                  border: "none",
                  background: "#e63946",
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "#ffffff",
                  cursor: saving ? "wait" : "pointer",
                  boxShadow: "0 1px 2px rgba(230,57,70,0.2)",
                }}
              >
                <Icon name="check" size={15} color="#fff" />
                <span>{saving ? "Saving..." : (editing ? "Update Job" : "Publish Job")}</span>
              </button>
            </div>
          </header>

          {/* Scrollable 2-Column Canvas */}
          <div style={{ flex: 1, overflowY: "auto", padding: "32px 36px" }}>
            <div
              style={{
                maxWidth: 1560,
                margin: "0 auto",
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) 380px",
                gap: 32,
                alignItems: "start",
              }}
            >
              {/* ══════════════════════════════════════════════════════
                  LEFT COLUMN: Main Job Content (Column 8 / ~68%)
                  ══════════════════════════════════════════════════════ */}
              <div>
                {/* 1. Job Title & Slug */}
                <div style={cardStyle}>
                  <label style={{ ...labelStyle, fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                    Job Title <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Senior Staff Nurse (ICU & Critical Care)"
                    style={{
                      ...inputStyle,
                      fontSize: 18,
                      fontWeight: 600,
                      padding: "12px 16px",
                      marginBottom: 12,
                    }}
                    required
                  />

                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#64748b" }}>
                    <span style={{ fontWeight: 500 }}>Public URL Slug:</span>
                    <span style={{ color: "#94a3b8" }}>/career/</span>
                    <input
                      value={form.slug}
                      onChange={e => setForm({ ...form, slug: e.target.value })}
                      placeholder="auto-generated-from-title"
                      style={{
                        ...inputStyle,
                        fontSize: 12.5,
                        padding: "5px 10px",
                        maxWidth: 320,
                        background: "#f8fafc",
                      }}
                    />
                  </div>
                </div>

                {/* 2. Role Summary */}
                <div style={cardStyle}>
                  <div style={cardTitleStyle}>
                    <span>Role Summary / Excerpt</span>
                    <span style={{ fontSize: 11.5, color: "#94a3b8", fontWeight: 400 }}>Brief hook shown on job cards & search engines</span>
                  </div>
                  <textarea
                    value={form.summary}
                    onChange={e => setForm({ ...form, summary: e.target.value })}
                    placeholder="Provide a concise 2-3 sentence overview of this opening, target qualifications, and primary mission..."
                    style={{ ...textareaStyle, minHeight: 85 }}
                  />
                </div>

                {/* 3. Key Responsibilities */}
                <div style={cardStyle}>
                  <div style={cardTitleStyle}>
                    <span>Key Responsibilities</span>
                    <span style={{ fontSize: 11.5, color: "#94a3b8", fontWeight: 400 }}>Day-to-day duties & clinical/teaching deliverables</span>
                  </div>
                  <textarea
                    value={form.responsibilities}
                    onChange={e => setForm({ ...form, responsibilities: e.target.value })}
                    placeholder="• Lead ICU patient monitoring and medication administration&#10;• Coordinate with senior consultants during emergency resuscitation&#10;• Maintain NABH hospital documentation and protocol adherence"
                    style={{ ...textareaStyle, minHeight: 140 }}
                  />
                </div>

                {/* 4. Requirements & Qualifications */}
                <div style={cardStyle}>
                  <div style={cardTitleStyle}>
                    <span>Qualifications & Eligibility</span>
                    <span style={{ fontSize: 11.5, color: "#94a3b8", fontWeight: 400 }}>Degrees, council registrations, and skills required</span>
                  </div>
                  <textarea
                    value={form.requirements}
                    onChange={e => setForm({ ...form, requirements: e.target.value })}
                    placeholder="• GNM or B.Sc Nursing from an INC recognized institution&#10;• Valid State Nursing Council Registration&#10;• 1+ years experience in ICU / Emergency Care preferred"
                    style={{ ...textareaStyle, minHeight: 130 }}
                  />
                </div>

                {/* 5. Detailed Description */}
                <div style={cardStyle}>
                  <div style={cardTitleStyle}>
                    <span>Full Job Description & Institutional Overview</span>
                  </div>
                  <textarea
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Full background on the department, career progression, working environment, allowances, and recruitment process..."
                    style={{ ...textareaStyle, minHeight: 150 }}
                  />
                </div>

                {/* 6. Tag Management System */}
                <div style={cardStyle}>
                  <div style={cardTitleStyle}>
                    <span>Tags & Keywords</span>
                    <span style={{ fontSize: 11.5, color: "#94a3b8", fontWeight: 400 }}>Tags display on cards and allow candidate filtering</span>
                  </div>

                  {/* Active tag chips */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                    {Array.isArray(form.tags) && form.tags.map((t: string, idx: number) => (
                      <span
                        key={idx}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: "#eff6ff",
                          border: "1px solid #dbeafe",
                          color: "#1d4ed8",
                          padding: "4px 10px",
                          borderRadius: 6,
                          fontSize: 12.5,
                          fontWeight: 500,
                        }}
                      >
                        <span>{t}</span>
                        <button
                          type="button"
                          onClick={() => removeTag(t)}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "#1d4ed8",
                            cursor: "pointer",
                            padding: 0,
                            fontSize: 12,
                          }}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Tag Input Field */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                    <input
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      placeholder="Type a tag and press Enter or comma (e.g. Staff Nurse, Govt Job, ICU)..."
                      style={inputStyle}
                    />
                    <button
                      type="button"
                      onClick={() => addTag(tagInput)}
                      style={{
                        padding: "0 18px",
                        background: "#0a1628",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Add Tag
                    </button>
                  </div>

                  {/* Suggested quick tags */}
                  <div>
                    <span style={{ fontSize: 12, color: "#64748b", marginRight: 8, fontWeight: 500 }}>Popular Tags:</span>
                    <div style={{ display: "inline-flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                      {SUGGESTED_TAGS.map(st => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => addTag(st)}
                          style={{
                            border: "1px solid #e2e8f0",
                            background: "#f8fafc",
                            color: "#475569",
                            borderRadius: 4,
                            padding: "2px 8px",
                            fontSize: 11.5,
                            cursor: "pointer",
                          }}
                        >
                          + {st}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ══════════════════════════════════════════════════════
                  RIGHT SIDEBAR: Parameters & Media (Column 4 / ~32%)
                  ══════════════════════════════════════════════════════ */}
              <div>
                {/* 1. Featured Image Card */}
                <div style={cardStyle}>
                  <div style={cardTitleStyle}>
                    <span>Featured Image</span>
                    {form.featured_image_url && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, featured_image_url: "" })}
                        style={{ border: "none", background: "none", color: "#ef4444", fontSize: 12, cursor: "pointer" }}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {/* Thumbnail Preview */}
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "16/9",
                      background: "#f1f5f9",
                      borderRadius: 8,
                      overflow: "hidden",
                      border: "1px solid #e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 12,
                    }}
                  >
                    {form.featured_image_url ? (
                      <img
                        src={form.featured_image_url}
                        alt="Featured preview"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{ textAlign: "center", color: "#94a3b8", padding: 16 }}>
                        <Icon name="image" size={28} />
                        <div style={{ fontSize: 12, marginTop: 4 }}>No image set</div>
                      </div>
                    )}
                  </div>

                  {/* Upload from PC */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: "none" }}
                  />
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImg}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        background: "#0a1628",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: 6,
                        fontSize: 12.5,
                        fontWeight: 500,
                        cursor: uploadingImg ? "wait" : "pointer",
                      }}
                    >
                      {uploadingImg ? "Uploading..." : "Upload Image"}
                    </button>
                  </div>

                  {/* Direct URL paste */}
                  <div>
                    <label style={{ ...labelStyle, fontSize: 11.5, color: "#94a3b8" }}>Or direct image URL:</label>
                    <input
                      value={form.featured_image_url}
                      onChange={e => setForm({ ...form, featured_image_url: e.target.value })}
                      placeholder="https://..."
                      style={{ ...inputStyle, fontSize: 12 }}
                    />
                  </div>
                </div>

                {/* 2. Taxonomy & Sector Card */}
                <div style={cardStyle}>
                  <div style={cardTitleStyle}>
                    <span>Sector & Position</span>
                    <Link
                      href="/admin/cms/career/categories"
                      target="_blank"
                      style={{ fontSize: 12, color: "#1d4ed8", textDecoration: "none", fontWeight: 500 }}
                    >
                      + Add Category
                    </Link>
                  </div>

                  {/* Category Dropdown */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Career Category</label>
                    <select
                      value={form.category_id}
                      onChange={e => setForm({ ...form, category_id: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="">— Select Category —</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Position Role Template */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Career Position Template</label>
                    <select
                      value={form.position_id}
                      onChange={e => setForm({ ...form, position_id: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="">— General Role —</option>
                      {positions.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Hiring Company */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Hiring Organization / Employer</label>
                    <input
                      value={form.company_name}
                      onChange={e => setForm({ ...form, company_name: e.target.value })}
                      placeholder="e.g. IINM or Apollo Hospitals"
                      style={inputStyle}
                    />
                  </div>

                  {/* Company Logo URL */}
                  <div>
                    <label style={labelStyle}>Employer Logo URL (Optional)</label>
                    <input
                      value={form.company_logo_url}
                      onChange={e => setForm({ ...form, company_logo_url: e.target.value })}
                      placeholder="https://..."
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* 3. Application Method Card (Internal vs External) */}
                <div style={cardStyle}>
                  <div style={cardTitleStyle}>
                    <span>Application Method</span>
                    <span style={{ fontSize: 11.5, color: "#94a3b8", fontWeight: 400 }}>How candidates apply</span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: form.application_type !== "external" ? "1.5px solid #0284c7" : "1px solid #e2e8f0",
                        background: form.application_type !== "external" ? "#f0f9ff" : "#ffffff",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      <input
                        type="radio"
                        name="application_type"
                        value="internal"
                        checked={form.application_type !== "external"}
                        onChange={() => setForm({ ...form, application_type: "internal" })}
                        style={{ marginTop: 3, accentColor: "#0284c7" }}
                      />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                          Internal Job (On-Site Modal)
                        </div>
                        <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                          Candidates apply via built-in application modal. Submissions appear in Job Requests.
                        </div>
                      </div>
                    </label>

                    <label
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: form.application_type === "external" ? "1.5px solid #7e22ce" : "1px solid #e2e8f0",
                        background: form.application_type === "external" ? "#faf5ff" : "#ffffff",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      <input
                        type="radio"
                        name="application_type"
                        value="external"
                        checked={form.application_type === "external"}
                        onChange={() => setForm({ ...form, application_type: "external" })}
                        style={{ marginTop: 3, accentColor: "#7e22ce" }}
                      />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                          External Job (Redirect URL)
                        </div>
                        <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                          Clicking &quot;Apply Now&quot; redirects candidate to official external portal (e.g. AIIMS, ESIC, Railway).
                        </div>
                      </div>
                    </label>
                  </div>

                  {form.application_type === "external" && (
                    <div style={{ background: "#faf5ff", border: "1px solid #f3e8ff", borderRadius: 8, padding: 12 }}>
                      <label style={{ ...labelStyle, color: "#6b21a8" }}>
                        External Application URL <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input
                        value={form.external_apply_url || ""}
                        onChange={e => setForm({ ...form, external_apply_url: e.target.value })}
                        placeholder="https://aiims.edu/recruitment/apply"
                        style={{ ...inputStyle, background: "#ffffff", borderColor: "#d8b4fe" }}
                        required
                      />
                      <span style={{ fontSize: 11, color: "#7e22ce", marginTop: 4, display: "block" }}>
                        Candidates clicking &quot;Apply Now&quot; will be redirected directly to this link.
                      </span>
                    </div>
                  )}
                </div>

                {/* 4. Job Parameters Card */}
                <div style={cardStyle}>
                  <div style={cardTitleStyle}>
                    <span>Parameters & Logistics</span>
                  </div>

                  {/* Employment Type */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Employment Type</label>
                    <select
                      value={form.job_type}
                      onChange={e => setForm({ ...form, job_type: e.target.value })}
                      style={inputStyle}
                    >
                      {JOB_TYPES.map(t => (
                        <option key={t.v} value={t.v}>
                          {t.l}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Location */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Location / Work Base</label>
                    <input
                      value={form.location}
                      onChange={e => setForm({ ...form, location: e.target.value })}
                      placeholder="e.g. Kolkata, West Bengal"
                      style={inputStyle}
                    />
                  </div>

                  {/* Vacancies */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Number of Vacancies</label>
                    <input
                      type="number"
                      min={1}
                      value={form.vacancies}
                      onChange={e => setForm({ ...form, vacancies: e.target.value })}
                      style={inputStyle}
                    />
                  </div>

                  {/* Experience Range */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Experience Range (Years)</label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <input
                        type="number"
                        min={0}
                        placeholder="Min (e.g. 1)"
                        value={form.experience_min}
                        onChange={e => setForm({ ...form, experience_min: e.target.value })}
                        style={inputStyle}
                      />
                      <input
                        type="number"
                        min={0}
                        placeholder="Max (e.g. 5)"
                        value={form.experience_max}
                        onChange={e => setForm({ ...form, experience_max: e.target.value })}
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  {/* Salary Range */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Salary / Annual CTC (INR)</label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <input
                        type="number"
                        min={0}
                        placeholder="Min (e.g. 400000)"
                        value={form.salary_min}
                        onChange={e => setForm({ ...form, salary_min: e.target.value })}
                        style={inputStyle}
                      />
                      <input
                        type="number"
                        min={0}
                        placeholder="Max (e.g. 700000)"
                        value={form.salary_max}
                        onChange={e => setForm({ ...form, salary_max: e.target.value })}
                        style={inputStyle}
                      />
                    </div>
                    <span style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, display: "block" }}>
                      Values in rupees (e.g. 400000 = ₹4 LPA)
                    </span>
                  </div>

                  {/* Application Deadline */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Application Deadline</label>
                    <input
                      type="date"
                      value={form.application_deadline}
                      onChange={e => setForm({ ...form, application_deadline: e.target.value })}
                      style={inputStyle}
                    />
                  </div>

                  {/* Pin to Top Toggle (Primary Ranking) */}
                  <div style={{ padding: "12px 14px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, marginBottom: 12 }}>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontSize: 13, color: "#92400e" }}>
                      <input
                        type="checkbox"
                        checked={form.is_pinned}
                        onChange={e => setForm({ ...form, is_pinned: e.target.checked })}
                        style={{ accentColor: "#d97706", width: 17, height: 17, marginTop: 2, flexShrink: 0 }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, color: "#78350f", display: "flex", alignItems: "center", gap: 4 }}>
                          <span>📌 Pin to Top</span>
                        </div>
                        <div style={{ fontSize: 11.5, color: "#b45309", marginTop: 2, lineHeight: 1.4 }}>
                          Always positions this opening at the very top of the career page before all sequential and regular jobs.
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Featured Toggle */}
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#0f172a" }}>
                    <input
                      type="checkbox"
                      checked={form.is_featured}
                      onChange={e => setForm({ ...form, is_featured: e.target.checked })}
                      style={{ accentColor: "#0284c7", width: 16, height: 16 }}
                    />
                    <span style={{ fontWeight: 500 }}>★ Mark as Featured Opening</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDel && (
        <div
          onClick={() => setConfirmDel(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10001,
            padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 10,
              padding: 24,
              maxWidth: 400,
              width: "100%",
            }}
          >
            <h3 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Delete Job Opening?</h3>
            <p style={{ color: "#64748b", fontSize: 13.5, margin: "0 0 20px" }}>
              Are you sure you want to delete &quot;{confirmDel.title}&quot;? This action cannot be undone.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setConfirmDel(null)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 6,
                  border: "1px solid #e2e8f0",
                  background: "#fff",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={doDelete}
                style={{
                  padding: "8px 16px",
                  borderRadius: 6,
                  border: "none",
                  background: "#dc2626",
                  color: "#fff",
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

export default function JobsPage() {
  return (
    <AdminProvider>
      <JobsInner />
    </AdminProvider>
  );
}
