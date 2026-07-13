"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminProvider } from "../components/ProtectedAdmin";
import { useToast } from "../components/ToastProvider";
import { Icon } from "../icons";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL, BASE_URL } from "@/lib/config";
import DeleteModal from "../components/DeleteModal";
import "../admin.css";

const API = API_BASE_URL;
const ITEMS_PER_PAGE = 10;

interface Teacher {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  gender?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  qualification?: string | null;
  experience_years?: string | null;
  designation?: string | null;
  specialization?: string | null;
  social_linkedin?: string | null;
  social_twitter?: string | null;
  social_website?: string | null;
  intro_video_url?: string | null;
  achievements?: string | null;
  created_at: string;
}

const defaultForm = { name: "", email: "", phone: "", gender: "", bio: "", avatar_url: "", is_active: true, qualification: "", experience_years: "", designation: "", specialization: "", social_linkedin: "", social_twitter: "", social_website: "", intro_video_url: "", achievements: "" };

// Resolve avatar URL: handle relative /uploads/... paths
function resolveAvatar(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${BASE_URL}${url}`;
}

const avatarColors = [
  ["#0ea5e9", "#3b82f6"],
  ["#8b5cf6", "#a78bfa"],
  ["#10b981", "#34d399"],
  ["#f59e0b", "#fbbf24"],
  ["#ef4444", "#f87171"],
];

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

/* ── Floating CSS ── */
const FLOAT_CSS = `
  .ti-wrap { position: relative; }
  .ti-field {
    position: relative;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    background: #f8fafc;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  }
  .ti-field.ti-focused {
    border-color: #38bdf8;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(56,189,248,0.15);
  }
  .ti-label {
    position: absolute; left: 14px; top: 50%;
    transform: translateY(-50%);
    font-size: 14px; color: #94a3b8;
    pointer-events: none;
    transition: all 0.18s cubic-bezier(0.4,0,0.2,1);
    background: transparent; padding: 0 3px;
    white-space: nowrap; line-height: 1;
    font-family: Inter, system-ui, sans-serif;
  }
  .ti-label.ti-up {
    top: 0; transform: translateY(-50%);
    font-size: 11px; font-weight: 600;
    color: #38bdf8; background: #fff;
  }
  .ti-label-ta { position: absolute; left: 14px; top: 16px; font-size: 14px; color: #94a3b8; pointer-events: none; transition: all 0.18s cubic-bezier(0.4,0,0.2,1); background: transparent; padding: 0 3px; line-height: 1; font-family: Inter, system-ui, sans-serif; }
  .ti-label-ta.ti-up { top: 0; transform: translateY(-50%); font-size: 11px; font-weight: 600; color: #38bdf8; background: #fff; }
  .ti-inp {
    display: block; width: 100%;
    padding: 22px 14px 8px;
    border: none; outline: none;
    font-size: 14px; color: #0f172a;
    background: transparent; border-radius: 10px;
    font-family: Inter, system-ui, sans-serif;
    box-sizing: border-box;
  }
  .ti-ta {
    display: block; width: 100%;
    padding: 26px 14px 10px;
    border: none; outline: none;
    font-size: 14px; color: #0f172a;
    background: transparent; border-radius: 10px;
    resize: vertical; min-height: 90px;
    font-family: Inter, system-ui, sans-serif;
    box-sizing: border-box;
  }
  .ti-req { color: #ef4444; margin-left: 2px; }
`;

function FloatingInput({
  label, type = "text", value, onChange, required = false, isTextArea = false, autoFocus = false, placeholder
}: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void;
  required?: boolean; isTextArea?: boolean; autoFocus?: boolean; placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;
  return (
    <div className="ti-wrap">
      <div className={`ti-field${focused ? " ti-focused" : ""}`}>
        <label className={isTextArea ? `ti-label-ta${lifted ? " ti-up" : ""}` : `ti-label${lifted ? " ti-up" : ""}`}>
          {label}{required && <span className="ti-req">*</span>}
        </label>
        {isTextArea ? (
          <textarea
            className="ti-ta"
            value={value}
            required={required}
            placeholder={focused ? placeholder : ""}
            onChange={e => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        ) : (
          <input
            type={type}
            className="ti-inp"
            value={value}
            required={required}
            autoFocus={autoFocus}
            placeholder={focused ? placeholder : ""}
            onChange={e => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        )}
      </div>
    </div>
  );
}

function ImageDropzoneField({
  label, value, onChange, placeholder
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await apiFetch(`${API.replace('/api', '')}/api/settings/site/upload`, {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        onChange(data.url);
        showToast("Image uploaded!", "success");
      } else {
        showToast("Upload failed", "error");
      }
    } catch {
      showToast("Network error. Could not upload image.", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="ti-wrap" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div 
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
           e.preventDefault(); setDragOver(false); 
           if(e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
        }}
        style={{
          border: dragOver ? "2px dashed #0ea5e9" : "1.5px solid #e2e8f0",
          background: dragOver ? "#f0f9ff" : "#f8fafc",
          borderRadius: 10,
          padding: "16px 14px",
          transition: "all 0.2s",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center"
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", marginBottom: 12 }}>{label}</div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
           {value && (value.startsWith("http") || value.startsWith("/")) && (
             <img src={value.startsWith("http") ? value : `${API.replace('/api', '')}${value}`} alt="Preview" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover" }} />
           )}
           <div style={{ flex: 1 }}>
             <input 
               type="text" 
               value={value} 
               onChange={e => onChange(e.target.value)} 
               placeholder={placeholder} 
               style={{ width: "100%", padding: "4px 0", border: "none", background: "transparent", outline: "none", fontSize: 14, color: "#0f172a" }} 
             />
           </div>
           
           <div style={{ position: "relative", overflow: "hidden" }}>
             <button type="button" disabled={uploading} style={{ background: "#e0f2fe", color: "#0284c7", border: "1px solid #bae6fd", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
               {uploading ? "Uploading..." : "Upload File"}
             </button>
             <input type="file" accept="image/*" onChange={e => {
                if (e.target.files) handleFile(e.target.files[0]);
                e.target.value = ""; // reset
             }} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }} />
           </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════ Main Component ══════════════ */
function TeachersManagerInner() {
  const { showToast } = useToast();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewTeacher, setViewTeacher] = useState<Teacher | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(defaultForm);
  const [formLoading, setFormLoading] = useState(false);

  /* ── Fetch ── */
  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API}/instructors`);
      if (res.ok) setTeachers(await res.json());
      else showToast("Failed to load teachers", "error");
    } catch {
      showToast("Network error — could not reach server", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  /* Reset page when filters change */
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter]);

  /* ── Filter + Paginate ── */
  const filtered = teachers.filter(t => {
    const q = search.toLowerCase();
    const matchSearch =
      t.name.toLowerCase().includes(q) ||
      (t.email ?? "").toLowerCase().includes(q) ||
      (t.phone ?? "").toLowerCase().includes(q);
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && t.is_active) ||
      (statusFilter === "inactive" && !t.is_active);
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paged = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  /* ── Form helpers ── */
  const resetForm = () => { setEditingId(null); setFormData(defaultForm); setIsModalOpen(false); };

  const openAdd = () => { setEditingId(null); setFormData(defaultForm); setIsModalOpen(true); };

  const openEdit = (t: Teacher) => {
    setEditingId(t.id);
    setFormData({ 
      name: t.name ?? "", email: t.email ?? "", phone: t.phone ?? "", gender: t.gender ?? "", bio: t.bio ?? "", avatar_url: t.avatar_url ?? "", is_active: t.is_active !== false,
      qualification: t.qualification ?? "", experience_years: t.experience_years ?? "", designation: t.designation ?? "", specialization: t.specialization ?? "",
      social_linkedin: t.social_linkedin ?? "", social_twitter: t.social_twitter ?? "", social_website: t.social_website ?? "", intro_video_url: t.intro_video_url ?? "", achievements: t.achievements ?? ""
    });
    setIsModalOpen(true);
  };

  /* ── Submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return showToast("Name is required", "error");
    setFormLoading(true);
    try {
      const isEdit = !!editingId;
      const res = await apiFetch(
        isEdit ? `${API}/instructors/${editingId}` : `${API}/instructors`,
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            email: formData.email.trim() || null,
            phone: formData.phone.trim() || null,
            gender: formData.gender.trim() || null,
            bio: formData.bio.trim() || null,
            avatar_url: formData.avatar_url.trim() || null,
            qualification: formData.qualification.trim() || null,
            experience_years: formData.experience_years.trim() || null,
            designation: formData.designation.trim() || null,
            specialization: formData.specialization.trim() || null,
            social_linkedin: formData.social_linkedin.trim() || null,
            social_twitter: formData.social_twitter.trim() || null,
            social_website: formData.social_website.trim() || null,
            intro_video_url: formData.intro_video_url.trim() || null,
            achievements: formData.achievements.trim() || null,
          }),
        }
      );
      if (res.ok) {
        showToast(isEdit ? "Teacher updated!" : "Teacher added!", "success");
        fetchTeachers();
        resetForm();
      } else {
        const err = await res.json();
        showToast(err.detail || "Failed to save teacher", "error");
      }
    } catch {
      showToast("An error occurred", "error");
    } finally {
      setFormLoading(false);
    }
  };

  /* ── Delete ── */
  const handleDeleteConfirm = async () => {
    if (!teacherToDelete) return;
    try {
      const res = await apiFetch(`${API}/instructors/${teacherToDelete.id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Teacher deleted successfully", "success");
        fetchTeachers();
      } else {
        const err = await res.json();
        showToast(err.detail || "Failed to delete teacher", "error");
      }
    } catch {
      showToast("An error occurred while deleting", "error");
    } finally {
      setTeacherToDelete(null);
    }
  };

  /* ══════════ Render ══════════ */
  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", margin: "0 0 4px", letterSpacing: "-0.5px" }}>Teacher Directory</h1>
          <p style={{ color: "#64748b", margin: 0, fontSize: 13 }}>
            {teachers.length} instructor{teachers.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <button
          onClick={openAdd}
          style={{ background: "#0ea5e9", color: "#fff", padding: "10px 22px", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 12px rgba(14,165,233,0.25)", whiteSpace: "nowrap" }}
        >
          <Icon name="plus" size={16} /> Add Teacher
        </button>
      </div>

      {/* ── Filter Bar ── */}
      <div style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", border: "1px solid #e2e8f0", marginBottom: 20, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 260px", minWidth: 220 }}>
          <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }}>
            <Icon name="search" size={15} />
          </span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email or phone…"
            style={{ width: "100%", paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9, borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", background: "#f8fafc", color: "#0f172a", boxSizing: "border-box" }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 2, display: "flex" }}
            >
              <Icon name="x" size={13} />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
          style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, color: "#0f172a", background: "#f8fafc", outline: "none", cursor: "pointer", minWidth: 140 }}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        {/* Results count */}
        <span style={{ fontSize: 13, color: "#64748b", marginLeft: "auto", whiteSpace: "nowrap" }}>
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Table ── */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflowX: "auto" }}>
        {/* Table Head */}
        <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 220px 160px 120px 90px", alignItems: "center", padding: "12px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", gap: 8, minWidth: 760 }}>
          <div />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px" }}>Name</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px" }}>Email</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px" }}>Phone</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px" }}>Status</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px", textAlign: "right" }}>Actions</span>
        </div>

        {/* Rows */}
        {loading ? (
          <div style={{ padding: "52px 20px", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>Loading teachers…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "52px 20px", textAlign: "center" }}>
            <div style={{ width: 52, height: 52, background: "#f0f9ff", borderRadius: 26, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", color: "#0ea5e9" }}>
              <Icon name="users" size={24} />
            </div>
            <p style={{ margin: "0 0 4px", fontWeight: 700, color: "#0f172a", fontSize: 15 }}>
              {search || statusFilter !== "all" ? "No teachers match your filters" : "No teachers yet"}
            </p>
            <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
              {search || statusFilter !== "all" ? "Try clearing your search or filter." : "Add your first instructor to get started."}
            </p>
          </div>
        ) : (
          paged.map((t, idx) => {
            const [c1, c2] = avatarColors[(teachers.indexOf(t)) % avatarColors.length];
            const isEven = idx % 2 === 0;
            return (
              <div
                key={t.id}
                style={{
                  display: "grid", gridTemplateColumns: "48px 1fr 220px 160px 120px 90px",
                  alignItems: "center", padding: "13px 20px",
                  borderBottom: "1px solid #f1f5f9", gap: 8,
                  background: isEven ? "#fff" : "#fafbfc",
                  transition: "background 0.15s",
                  minWidth: 760,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f0f9ff")}
                onMouseLeave={e => (e.currentTarget.style.background = isEven ? "#fff" : "#fafbfc")}
              >
                {/* Avatar */}
                {(() => {
                  const resolved = resolveAvatar(t.avatar_url);
                  if (resolved) return (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={resolved} alt={t.name} style={{ width: 36, height: 36, borderRadius: 18, objectFit: "cover", flexShrink: 0 }} onError={e => { e.currentTarget.style.display = "none"; }} />
                  );
                  if (t.gender === "Male") return (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src="/male-teacher.jpg" alt="Male" style={{ width: 36, height: 36, borderRadius: 18, objectFit: "cover", flexShrink: 0 }} />
                  );
                  if (t.gender === "Female") return (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src="/female-teacher.png" alt="Female" style={{ width: 36, height: 36, borderRadius: 18, objectFit: "cover", flexShrink: 0 }} />
                  );
                  return (
                    <div style={{ width: 36, height: 36, borderRadius: 18, background: `linear-gradient(135deg, ${c1}, ${c2})`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                      {getInitials(t.name)}
                    </div>
                  );
                })()}

                {/* Name */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{t.name}</div>
                  {t.bio && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>{t.bio}</div>}
                </div>

                {/* Email */}
                <div style={{ fontSize: 13, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.email ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Icon name="mail" size={13} />
                      {t.email}
                    </span>
                  ) : (
                    <span style={{ color: "#cbd5e1", fontStyle: "italic" }}>—</span>
                  )}
                </div>

                {/* Phone */}
                <div style={{ fontSize: 13, color: "#475569" }}>
                  {t.phone ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Icon name="phone" size={13} />
                      {t.phone}
                    </span>
                  ) : (
                    <span style={{ color: "#cbd5e1", fontStyle: "italic" }}>—</span>
                  )}
                </div>

                {/* Status */}
                <div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                    background: t.is_active ? "#dcfce7" : "#fee2e2",
                    color: t.is_active ? "#16a34a" : "#dc2626",
                  }}>
                    {t.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setViewTeacher(t)} title="View Profile"
                    style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", width: 30, height: 30, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", color: "#16a34a", cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#dcfce7"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "#f0fdf4"; }}
                  >
                    <Icon name="eye" size={13} />
                  </button>
                  <button
                    onClick={() => openEdit(t)} title="Edit"
                    style={{ background: "#f8fafc", border: "1px solid #e2e8f0", width: 30, height: 30, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.color = "#3b82f6"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.color = "#475569"; }}
                  >
                    <Icon name="edit" size={13} />
                  </button>
                  <button
                    onClick={() => setTeacherToDelete(t)} title="Delete"
                    style={{ background: "#fef2f2", border: "1px solid #fecaca", width: 30, height: 30, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#fee2e2")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#fef2f2")}
                  >
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* ── Pagination ── */}
        {!loading && filtered.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderTop: "1px solid #f1f5f9", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 13, color: "#64748b" }}>
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} entries
            </span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #e2e8f0", background: currentPage === 1 ? "#f8fafc" : "#fff", color: currentPage === 1 ? "#cbd5e1" : "#475569", fontSize: 13, cursor: currentPage === 1 ? "not-allowed" : "pointer", fontWeight: 500 }}
              >
                Previous
              </button>
              {/* Page number pills */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce<(number | "…")[]>((acc, p, i, arr) => {
                  if (i > 0 && typeof arr[i - 1] === "number" && (p as number) - (arr[i - 1] as number) > 1) acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "…" ? (
                    <span key={`ellipsis-${i}`} style={{ fontSize: 13, color: "#94a3b8", padding: "0 4px" }}>…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p as number)}
                      style={{
                        width: 32, height: 32, borderRadius: 6, border: "1px solid",
                        borderColor: currentPage === p ? "#0ea5e9" : "#e2e8f0",
                        background: currentPage === p ? "#0ea5e9" : "#fff",
                        color: currentPage === p ? "#fff" : "#475569",
                        fontSize: 13, fontWeight: currentPage === p ? 700 : 500, cursor: "pointer",
                      }}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #e2e8f0", background: currentPage >= totalPages ? "#f8fafc" : "#fff", color: currentPage >= totalPages ? "#cbd5e1" : "#475569", fontSize: 13, cursor: currentPage >= totalPages ? "not-allowed" : "pointer", fontWeight: 500 }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <style dangerouslySetInnerHTML={{ __html: FLOAT_CSS }} />
          <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(6px)" }} onClick={resetForm} />
          <div style={{ position: "relative", width: "100%", maxWidth: 680, background: "#fff", borderRadius: 24, boxShadow: "0 24px 80px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", maxHeight: "92vh", overflow: "hidden" }}>

            {/* ── Modal Header ── */}
            <div style={{ padding: "26px 32px 22px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fafbfc" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#0ea5e9,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
                  <Icon name="users" size={20} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a" }}>
                    {editingId ? "Edit Teacher" : "Add Teacher"}
                  </h2>
                  <p style={{ margin: "3px 0 0", fontSize: 13, color: "#64748b" }}>
                    {editingId ? "Update instructor details below" : "Fill in the details to register a new instructor"}
                  </p>
                </div>
              </div>
              <button onClick={resetForm} style={{ background: "#fff", border: "1px solid #e2e8f0", width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", cursor: "pointer", flexShrink: 0 }}>
                <Icon name="x" size={16} />
              </button>
            </div>

            {/* ── Modal Body ── */}
            <div style={{ padding: "28px 32px", overflowY: "auto", flex: 1 }}>
              <form id="teacherForm" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: 0.5, paddingBottom: 8, borderBottom: "1px solid #e2e8f0" }}>Basic Information</h4>
                <FloatingInput label="Full Name *" value={formData.name} onChange={v => setFormData({ ...formData, name: v })} required autoFocus />
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                  <FloatingInput label="Email Address" type="email" value={formData.email} onChange={v => setFormData({ ...formData, email: v })} />
                  <FloatingInput label="Phone Number" value={formData.phone} onChange={v => setFormData({ ...formData, phone: v })} />
                </div>

                {/* Gender selector */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Gender (for default avatar)</div>
                  <div style={{ display: "flex", gap: 10 }}>
                    {["Male", "Female", "Other"].map(g => (
                      <button
                        key={g} type="button"
                        onClick={() => setFormData({ ...formData, gender: formData.gender === g ? "" : g })}
                        style={{
                          padding: "9px 22px", borderRadius: 20, border: "1.5px solid",
                          borderColor: formData.gender === g ? "#0ea5e9" : "#e2e8f0",
                          background: formData.gender === g ? "#f0f9ff" : "#f8fafc",
                          color: formData.gender === g ? "#0ea5e9" : "#64748b",
                          fontWeight: formData.gender === g ? 700 : 500,
                          fontSize: 13, cursor: "pointer", transition: "all 0.15s",
                          display: "flex", alignItems: "center", gap: 6
                        }}
                      >
                        {g === "Male" && <span>👨</span>}
                        {g === "Female" && <span>👩</span>}
                        {g === "Other" && <span>🧑</span>}
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                  <FloatingInput label="Designation / Title (e.g. Senior Instructor)" value={formData.designation} onChange={v => setFormData({ ...formData, designation: v })} placeholder="e.g. Professor" />
                  <FloatingInput label="Years of Experience (e.g. 5+ Years)" value={formData.experience_years} onChange={v => setFormData({ ...formData, experience_years: v })} placeholder="e.g. 10+ Years" />
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                  <FloatingInput label="Qualifications (e.g. Ph.D.)" value={formData.qualification} onChange={v => setFormData({ ...formData, qualification: v })} placeholder="e.g. M.Sc. in Physics" />
                  <FloatingInput label="Specializations (e.g. Math, Python)" value={formData.specialization} onChange={v => setFormData({ ...formData, specialization: v })} placeholder="e.g. Algebra, Calculus" />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <ImageDropzoneField label="Avatar Image (optional)" value={formData.avatar_url} onChange={v => setFormData({ ...formData, avatar_url: v })} placeholder="Upload image..." />
                  </div>
                  <FloatingInput label="Short Bio (optional)" value={formData.bio} onChange={v => setFormData({ ...formData, bio: v })} isTextArea placeholder="Brief description of the instructor..." />
                </div>

                <FloatingInput label="Achievements / Awards (optional)" value={formData.achievements} onChange={v => setFormData({ ...formData, achievements: v })} isTextArea placeholder="List major awards or recognitions..." />

                <h4 style={{ margin: "10px 0 0", fontSize: 14, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: 0.5, paddingBottom: 8, borderBottom: "1px solid #e2e8f0" }}>Social & Links</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                  <FloatingInput label="LinkedIn Profile URL" value={formData.social_linkedin} onChange={v => setFormData({ ...formData, social_linkedin: v })} placeholder="https://linkedin.com/in/..." />
                  <FloatingInput label="Twitter Profile URL" value={formData.social_twitter} onChange={v => setFormData({ ...formData, social_twitter: v })} placeholder="https://twitter.com/..." />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                  <FloatingInput label="Personal Website / Portfolio URL" value={formData.social_website} onChange={v => setFormData({ ...formData, social_website: v })} placeholder="https://..." />
                  <FloatingInput label="Introductory Video URL (YouTube/Vimeo)" value={formData.intro_video_url} onChange={v => setFormData({ ...formData, intro_video_url: v })} placeholder="https://youtube.com/watch?v=..." />
                </div>

                {/* Active Status toggle */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderRadius: 12, border: "1.5px solid #e2e8f0", background: "#f8fafc", marginTop: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Active Status</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Inactive teachers won't appear in batch assignment</div>
                  </div>
                  <label style={{ position: "relative", display: "inline-block", width: 46, height: 26, cursor: "pointer", flexShrink: 0 }}>
                    <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} style={{ opacity: 0, width: 0, height: 0, position: "absolute" }} />
                    <span style={{ position: "absolute", inset: 0, background: formData.is_active ? "#0ea5e9" : "#cbd5e1", borderRadius: 13, transition: "background 0.25s" }} />
                    <span style={{ position: "absolute", top: 3, left: formData.is_active ? 23 : 3, width: 20, height: 20, background: "#fff", borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.25)", transition: "left 0.25s" }} />
                  </label>
                </div>

              </form>
            </div>

            {/* ── Modal Footer ── */}
            <div style={{ padding: "18px 32px 26px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: 12, background: "#fafbfc" }}>
              <button type="button" onClick={resetForm} style={{ padding: "11px 24px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                Cancel
              </button>
              <button
                type="submit" form="teacherForm" disabled={formLoading}
                style={{ padding: "11px 32px", borderRadius: 10, border: "none", background: formLoading ? "#7dd3fc" : "linear-gradient(135deg,#0ea5e9,#3b82f6)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: formLoading ? "not-allowed" : "pointer", boxShadow: formLoading ? "none" : "0 4px 14px rgba(14,165,233,0.35)", transition: "all 0.2s" }}
              >
                {formLoading ? "Saving…" : editingId ? "Save Changes" : "Add Teacher"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ── */}
      {teacherToDelete && (
        <DeleteModal
          title="Delete Teacher"
          description={`Are you sure you want to remove "${teacherToDelete.name}"? They will be unlinked from any assigned batches.`}
          confirmText="Yes, delete teacher"
          confirmColor="#ef4444"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setTeacherToDelete(null)}
        />
      )}

      {/* ── View Profile Modal ── */}
      {viewTeacher && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.55)", backdropFilter: "blur(6px)" }} onClick={() => setViewTeacher(null)} />
          <div style={{ position: "relative", width: "100%", maxWidth: 560, background: "#fff", borderRadius: 24, boxShadow: "0 24px 80px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", maxHeight: "90vh", overflow: "hidden" }}>

            {/* Header */}
            <div style={{ padding: "24px 28px 20px", background: "linear-gradient(135deg,#0f172a,#1e3a5f)", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  {resolveAvatar(viewTeacher.avatar_url) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={resolveAvatar(viewTeacher.avatar_url)!} alt={viewTeacher.name} style={{ width: 60, height: 60, borderRadius: 30, objectFit: "cover", border: "3px solid rgba(255,255,255,0.2)", flexShrink: 0 }} />
                  ) : viewTeacher.gender === "Male" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src="/male-teacher.jpg" alt="Male" style={{ width: 60, height: 60, borderRadius: 30, objectFit: "cover", border: "3px solid rgba(255,255,255,0.2)", flexShrink: 0 }} />
                  ) : viewTeacher.gender === "Female" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src="/female-teacher.png" alt="Female" style={{ width: 60, height: 60, borderRadius: 30, objectFit: "cover", border: "3px solid rgba(255,255,255,0.2)", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 60, height: 60, borderRadius: 30, background: "linear-gradient(135deg,#0ea5e9,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#fff", border: "3px solid rgba(255,255,255,0.2)", flexShrink: 0 }}>
                      {getInitials(viewTeacher.name)}
                    </div>
                  )}
                  <div>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#fff" }}>{viewTeacher.name}</h2>
                    {viewTeacher.designation && <p style={{ margin: "3px 0 0", fontSize: 13, color: "#93c5fd" }}>{viewTeacher.designation}</p>}
                    <div style={{ marginTop: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: viewTeacher.is_active ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)", color: viewTeacher.is_active ? "#6ee7b7" : "#fca5a5" }}>
                        {viewTeacher.is_active ? "● Active" : "● Inactive"}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                  <button onClick={() => { setViewTeacher(null); openEdit(viewTeacher); }} style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", padding: "7px 14px", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="edit" size={12} /> Edit
                  </button>
                  <button onClick={() => setViewTeacher(null)} style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer" }}>
                    <Icon name="x" size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: "24px 28px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 18 }}>

              {/* Contact grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {viewTeacher.email && (
                  <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px", border: "1px solid #f1f5f9" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Email</div>
                    <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 500, wordBreak: "break-all" }}>{viewTeacher.email}</div>
                  </div>
                )}
                {viewTeacher.phone && (
                  <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px", border: "1px solid #f1f5f9" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Phone</div>
                    <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 500 }}>{viewTeacher.phone}</div>
                  </div>
                )}
                {viewTeacher.experience_years && (
                  <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px", border: "1px solid #f1f5f9" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Experience</div>
                    <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 500 }}>{viewTeacher.experience_years}</div>
                  </div>
                )}
                {viewTeacher.qualification && (
                  <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px", border: "1px solid #f1f5f9" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Qualification</div>
                    <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 500 }}>{viewTeacher.qualification}</div>
                  </div>
                )}
              </div>

              {/* Specializations */}
              {viewTeacher.specialization && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 8 }}>Specializations</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {viewTeacher.specialization.split(",").map((s, i) => (
                      <span key={i} style={{ fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 20, background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }}>{s.trim()}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Bio */}
              {viewTeacher.bio && (
                <div style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px", border: "1px solid #f1f5f9" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 6 }}>Bio</div>
                  <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.7 }}>{viewTeacher.bio}</div>
                </div>
              )}

              {/* Achievements */}
              {viewTeacher.achievements && (
                <div style={{ background: "#fffbeb", borderRadius: 10, padding: "14px 16px", border: "1px solid #fde68a" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#92400e", textTransform: "uppercase", marginBottom: 6 }}>🏆 Achievements</div>
                  <div style={{ fontSize: 13, color: "#78350f", lineHeight: 1.7 }}>{viewTeacher.achievements}</div>
                </div>
              )}

              {/* Social Links */}
              {(viewTeacher.social_linkedin || viewTeacher.social_twitter || viewTeacher.social_website || viewTeacher.intro_video_url) && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 8 }}>Links</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {viewTeacher.social_linkedin && <a href={viewTeacher.social_linkedin} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 8, background: "#eff6ff", color: "#2563eb", textDecoration: "none", border: "1px solid #bfdbfe", display: "flex", alignItems: "center", gap: 5 }}><Icon name="external-link" size={12} /> LinkedIn</a>}
                    {viewTeacher.social_twitter && <a href={viewTeacher.social_twitter} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 8, background: "#f0f9ff", color: "#0284c7", textDecoration: "none", border: "1px solid #bae6fd", display: "flex", alignItems: "center", gap: 5 }}><Icon name="external-link" size={12} /> Twitter</a>}
                    {viewTeacher.social_website && <a href={viewTeacher.social_website} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 8, background: "#f8fafc", color: "#475569", textDecoration: "none", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 5 }}><Icon name="external-link" size={12} /> Website</a>}
                    {viewTeacher.intro_video_url && <a href={viewTeacher.intro_video_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 8, background: "#fef2f2", color: "#dc2626", textDecoration: "none", border: "1px solid #fecaca", display: "flex", alignItems: "center", gap: 5 }}><Icon name="play" size={12} /> Intro Video</a>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TeachersPage() {
  return (
    <AdminProvider>
      <TeachersManagerInner />
    </AdminProvider>
  );
}
