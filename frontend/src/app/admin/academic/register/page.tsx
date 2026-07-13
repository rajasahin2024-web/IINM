"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Icon } from "../../icons";
import { useToast } from "../../components/ToastProvider";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL } from "@/lib/config";
import { AdminProvider } from "../../components/ProtectedAdmin";
import DeleteModal from "../../components/DeleteModal";
import "../../admin.css";

/* ─────────────────────────────────────────
   Floating Input CSS
───────────────────────────────────────── */
const FLOAT_CSS = `
  .ti-wrap { margin-bottom: 16px; }
  .ti-field {
    position: relative;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    background: #f8fafc;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  }
  .ti-focused { border-color: #38bdf8; background: #fff; box-shadow: 0 0 0 3px rgba(56,189,248,0.15); }

  .ti-label {
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
    font-family: inherit;
  }
  .ti-label.ti-up {
    top: 0;
    transform: translateY(-50%);
    font-size: 11px;
    font-weight: 600;
    color: #38bdf8;
    background: #fff;
    padding: 0 3px;
  }

  .ti-inp {
    display: block;
    width: 100%;
    border: none;
    background: transparent;
    outline: none;
    padding: 20px 14px 8px;
    font-size: 14px;
    color: #0f172a;
    font-family: inherit;
    font-weight: 500;
    border-radius: 10px;
  }

  .ti-req { color: #ef4444; margin-left: 3px; }

  /* Smooth modal animations */
  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

function FloatingInput({
  label, value, onChange, required = false, type = "text", autoFocus = false
}: {
  label: string; value: string; onChange: (v: string) => void;
  required?: boolean; type?: string; autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0 || type === "date";
  return (
    <div className="ti-wrap">
      <div className={`ti-field${focused ? " ti-focused" : ""}`}>
        <label className={`ti-label${lifted ? " ti-up" : ""}`}>
          {label}{required && <span className="ti-req">*</span>}
        </label>
        <input
          type={type}
          className="ti-inp"
          value={value}
          required={required}
          autoFocus={autoFocus}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Helper Components
───────────────────────────────────────── */
function FloatSelect({ label, value, onChange, options, required = false }: { label: string; value: string; onChange: (v: string) => void; options: string[]; required?: boolean }) {
  return (
    <div className="ti-wrap">
      <div className="ti-field" style={{ background: "#f8fafc", position: "relative" }}>
        <label className="ti-label ti-up">
          {label}{required && <span className="ti-req">*</span>}
        </label>
        <select
          className="ti-inp"
          value={value}
          required={required}
          onChange={e => onChange(e.target.value)}
          style={{ appearance: "none", cursor: "pointer", paddingTop: "22px", paddingRight: "30px" }}
        >
          <option value="" disabled>Select…</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 10, color: "#94a3b8" }}>
          ▼
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ label, color, border }: { label: string; color: string; border: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${border}` }}>
      {label}
    </div>
  );
}

/* ══════════════ Main Component ══════════════ */
function StudentManagerInner() {
  const { showToast } = useToast();

  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<any | null>(null);
  const [viewStudent, setViewStudent] = useState<any | null>(null);

  const EMPTY_FORM = {
    id: null as number | null,
    first_name: "", last_name: "", email: "", phone: "", alternative_phone: "", is_active: true,
    // Personal
    date_of_birth: "", gender: "", profile_photo_url: "", city: "", state: "", pin_code: "",
    // Education
    highest_qualification: "", tenth_board: "", tenth_year: "", tenth_percentage: "",
    twelfth_board: "", twelfth_year: "", twelfth_percentage: "", twelfth_stream: "",
    graduation_degree: "", graduation_university: "", graduation_year: "", graduation_cgpa: "",
    current_occupation: "",
    // Identity
    aadhaar_number: "", pan_number: "", student_id_url: "",
    // Professional
    job_title: "", company_name: "", work_experience: "", linkedin_url: "",
    // LMS
    source: "", referral_code: "", preferred_language: "",
    emergency_contact_name: "", emergency_contact_phone: "",
  };
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  /* ── Fetch ── */
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/students`);
      if (res.ok) {
        const data = await res.json();
        setStudents(Array.isArray(data) ? data : []);
      }
    } catch {
      showToast("Error loading students", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  /* ── Filter & Paginate ── */
  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const matchesSearch = (s.first_name || "").toLowerCase().includes(q)
                       || (s.last_name || "").toLowerCase().includes(q)
                       || (s.email || "").toLowerCase().includes(q)
                       || (s.phone || "").toLowerCase().includes(q);
    
    if (!matchesSearch) return false;
    if (statusFilter === "active" && !s.is_active) return false;
    if (statusFilter === "inactive" && s.is_active) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paged = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [search, statusFilter]);

  /* ── Handlers ── */
  const openNew = () => {
    setForm({ ...EMPTY_FORM, id: null, is_active: true });
    setIsModalOpen(true);
  };
  
  const openEdit = (s: any) => {
    const f: any = { ...EMPTY_FORM };
    Object.keys(f).forEach(k => { if (s[k] !== undefined && s[k] !== null) f[k] = String(s[k]); });
    f.id = s.id; f.is_active = s.is_active;
    setForm(f);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.email.trim()) {
      showToast("First name and email are required", "error");
      return;
    }

    setSaving(true);
    try {
      const s = (v: string) => v.trim() || null;
    const payload: any = {
      first_name: form.first_name.trim(), last_name: s(form.last_name), email: form.email.trim(),
      phone: s(form.phone), alternative_phone: s(form.alternative_phone), is_active: form.is_active,
      date_of_birth: form.date_of_birth || null, gender: s(form.gender),
      profile_photo_url: s(form.profile_photo_url), city: s(form.city), state: s(form.state), pin_code: s(form.pin_code),
      highest_qualification: s(form.highest_qualification),
      tenth_board: s(form.tenth_board), tenth_year: s(form.tenth_year), tenth_percentage: s(form.tenth_percentage),
      twelfth_board: s(form.twelfth_board), twelfth_year: s(form.twelfth_year), twelfth_percentage: s(form.twelfth_percentage), twelfth_stream: s(form.twelfth_stream),
      graduation_degree: s(form.graduation_degree), graduation_university: s(form.graduation_university), graduation_year: s(form.graduation_year), graduation_cgpa: s(form.graduation_cgpa),
      current_occupation: s(form.current_occupation),
      aadhaar_number: s(form.aadhaar_number), pan_number: s(form.pan_number), student_id_url: s(form.student_id_url),
      job_title: s(form.job_title), company_name: s(form.company_name), work_experience: s(form.work_experience), linkedin_url: s(form.linkedin_url),
      source: s(form.source), referral_code: s(form.referral_code), preferred_language: s(form.preferred_language),
      emergency_contact_name: s(form.emergency_contact_name), emergency_contact_phone: s(form.emergency_contact_phone),
    };

      const url = form.id ? `${API_BASE_URL}/students/${form.id}` : `${API_BASE_URL}/students`;
      const method = form.id ? "PUT" : "POST";

      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to save student");
      }

      showToast(`Student ${form.id ? "updated" : "registered"} successfully!`, "success");
      setIsModalOpen(false);
      fetchStudents();
    } catch (err: any) {
      showToast(err.message || "An error occurred", "error");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!studentToDelete) return;
    try {
      const res = await apiFetch(`${API_BASE_URL}/students/${studentToDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      showToast("Student deleted", "success");
      fetchStudents();
    } catch {
      showToast("Error deleting student", "error");
    } finally {
      setStudentToDelete(null);
    }
  };

  /* ══════════════ RENDER ══════════════ */
  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: FLOAT_CSS }} />

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", margin: "0 0 4px", letterSpacing: "-0.5px" }}>Registered Students</h1>
          <p style={{ color: "#64748b", margin: 0, fontSize: 13 }}>
            Manage {students.length} student{students.length !== 1 ? "s" : ""} in the directory
          </p>
        </div>
        <button
          onClick={openNew}
          style={{ background: "#0ea5e9", color: "#fff", padding: "10px 22px", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 12px rgba(14,165,233,0.25)" }}
        >
          <Icon name="user-plus" size={16} /> Register Student
        </button>
      </div>

      {/* ── Filters ── */}
      <div style={{ background: "#fff", borderRadius: 12, padding: "14px 18px", border: "1px solid #e2e8f0", marginBottom: 18, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
        
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 260px", minWidth: 220 }}>
          <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }}>
            <Icon name="search" size={15} />
          </span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone…"
            style={{ width: "100%", paddingLeft: 34, paddingRight: 12, paddingTop: 10, paddingBottom: 10, borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", background: "#f8fafc", color: "#0f172a", boxSizing: "border-box" }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 2 }}>
              <Icon name="x" size={13} />
            </button>
          )}
        </div>

        {/* Status filter */}
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, color: "#0f172a", background: "#f8fafc", outline: "none", cursor: "pointer", minWidth: 140 }}>
          <option value="all">All Status</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>

        <span style={{ fontSize: 13, color: "#64748b", marginLeft: "auto", whiteSpace: "nowrap" }}>
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Table ── */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflowX: "auto" }}>
        
        {/* Head */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 200px 140px 100px 120px", alignItems: "center", padding: "12px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", gap: 12, minWidth: 800 }}>
          {["Student Details", "Email", "Phone", "Status", "Actions"].map((h, i) => (
            <span key={i} style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px", textAlign: i === 4 ? "right" : "left" }}>{h}</span>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          <div style={{ padding: "52px 20px", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>Loading students…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "52px 20px", textAlign: "center" }}>
            <div style={{ width: 52, height: 52, background: "#f1f5f9", borderRadius: 26, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", color: "#64748b" }}>
              <Icon name="users" size={24} />
            </div>
            <p style={{ margin: "0 0 4px", fontWeight: 700, color: "#0f172a", fontSize: 15 }}>
              {search || statusFilter !== "all" ? "No students found" : "No registered students"}
            </p>
            <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
              {search || statusFilter !== "all" ? "Try adjusting your filters." : "Register your first student to see them here."}
            </p>
          </div>
        ) : (
          paged.map((student, idx) => {
            const isEven = idx % 2 === 0;
            const initial = (student.first_name?.[0] || "?").toUpperCase();

            return (
              <div
                key={student.id}
                style={{
                  display: "grid", gridTemplateColumns: "1fr 200px 140px 100px 120px",
                  alignItems: "center", padding: "12px 20px", borderBottom: "1px solid #f1f5f9",
                  gap: 12, background: isEven ? "#fff" : "#fafbfc", transition: "background 0.15s", minWidth: 800
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f0f9ff")}
                onMouseLeave={e => (e.currentTarget.style.background = isEven ? "#fff" : "#fafbfc")}
              >
                {/* Details */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
                    background: `hsl(${(student.id * 43) % 360}, 65%, 90%)`,
                    color: `hsl(${(student.id * 43) % 360}, 75%, 40%)`,
                    fontSize: 14, fontWeight: 800
                  }}>
                    {initial}
                  </div>
                  <div style={{ overflow: "hidden" }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {student.first_name} {student.last_name}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                       <Icon name="calendar" size={10} /> Joined {student.created_at ? new Date(student.created_at).toLocaleDateString() : "N/A"}
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div style={{ fontSize: 13, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {student.email}
                </div>

                {/* Phone */}
                <div style={{ fontSize: 13, color: "#475569" }}>
                  {student.phone || <span style={{color: "#cbd5e1", fontStyle: "italic"}}>No Phone</span>}
                </div>

                {/* Status */}
                <div>
                  {student.is_active ? (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: "#dcfce7", color: "#16a34a", display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
                      Active
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: "#f1f5f9", color: "#64748b", display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#94a3b8", display: "inline-block" }} />
                      Inactive
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
                  <button onClick={() => setViewStudent(student)} title="View Student" style={{ background: "#f0f9ff", border: "1px solid #bae6fd", width: 30, height: 30, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", color: "#0ea5e9", cursor: "pointer", transition: "all 0.15s" }}>
                    <Icon name="eye" size={13} />
                  </button>
                  <button onClick={() => openEdit(student)} title="Edit" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", width: 30, height: 30, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", cursor: "pointer", transition: "all 0.15s" }}>
                    <Icon name="edit" size={13} />
                  </button>
                  <button onClick={() => setStudentToDelete({ id: student.id, name: `${student.first_name} ${student.last_name || ""}` })} title="Delete" style={{ background: "#fef2f2", border: "1px solid #fecaca", width: 30, height: 30, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", cursor: "pointer", transition: "all 0.15s" }}>
                    <Icon name="trash" size={13} />
                  </button>
                </div>

              </div>
            );
          })
        )}

        {/* Pagination Details */}
        {!loading && filtered.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 20px", borderTop: "1px solid #f1f5f9", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 13, color: "#64748b" }}>
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} entries
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: currentPage === 1 ? "#f8fafc" : "#fff", color: currentPage === 1 ? "#94a3b8" : "#0f172a", fontSize: 13, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
              >
                Prev
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: currentPage === totalPages ? "#f8fafc" : "#fff", color: currentPage === totalPages ? "#94a3b8" : "#0f172a", fontSize: 13, cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═════════════════ Form Modal ═════════════════ */}
      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)", animation: "fadeIn 0.2s" }}>
          <div style={{ width: "80%", maxWidth: 1200, background: "#fff", borderRadius: 20, boxShadow: "0 20px 40px rgba(0,0,0,0.15)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "92vh", animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}>
            
            {/* Header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: form.id ? "#f0fdf4" : "#e0f2fe", color: form.id ? "#16a34a" : "#0284c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name={form.id ? "edit" : "user-plus"} size={20} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                    {form.id ? "Edit Student" : "Register Student"}
                  </h2>
                  <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                    {form.id ? "Update student information" : "Add a new student profile"}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 8 }}>
                <Icon name="x" size={20} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "24px", overflowY: "auto", background: "#fff" }}>
              <form id="student-form" onSubmit={handleSave}>

                {/* Basic Info */}
                <SectionTitle color="#0ea5e9" border="#e0f2fe" label="👤 Basic Information" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                  <FloatingInput label="First Name" value={form.first_name} onChange={v => setForm({ ...form, first_name: v })} required autoFocus />
                  <FloatingInput label="Last Name" value={form.last_name} onChange={v => setForm({ ...form, last_name: v })} />
                </div>
                <FloatingInput type="email" label="Email Address" value={form.email} onChange={v => setForm({ ...form, email: v })} required />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                  <FloatingInput label="Phone Number" value={form.phone} onChange={v => setForm({ ...form, phone: v })} />
                  <FloatingInput label="Alternative Phone" value={form.alternative_phone} onChange={v => setForm({ ...form, alternative_phone: v })} />
                </div>

                {/* Personal */}
                <SectionTitle color="#8b5cf6" border="#ede9fe" label="📋 Personal Information" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 16px" }}>
                  <FloatingInput type="date" label="Date of Birth" value={form.date_of_birth} onChange={v => setForm({ ...form, date_of_birth: v })} />
                  <FloatSelect label="Gender" value={form.gender} onChange={v => setForm({ ...form, gender: v })} options={["Male","Female","Other"]} />
                  <FloatingInput label="PIN Code" value={form.pin_code} onChange={v => setForm({ ...form, pin_code: v })} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                  <FloatingInput label="City" value={form.city} onChange={v => setForm({ ...form, city: v })} />
                  <FloatingInput label="State" value={form.state} onChange={v => setForm({ ...form, state: v })} />
                </div>

                {/* Education */}
                <SectionTitle color="#059669" border="#d1fae5" label="🎓 Educational Qualification" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                  <FloatSelect label="Highest Qualification" value={form.highest_qualification} onChange={v => setForm({ ...form, highest_qualification: v })} options={["10th","12th","Diploma","Graduation","Post-Graduation","PhD"]} />
                  <FloatSelect label="Current Occupation" value={form.current_occupation} onChange={v => setForm({ ...form, current_occupation: v })} options={["Student","Working Professional","Freelancer","Business","Other"]} />
                </div>
                <div style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px", marginBottom: 12, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>10th Details</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 12px" }}>
                    <FloatingInput label="Board" value={form.tenth_board} onChange={v => setForm({ ...form, tenth_board: v })} />
                    <FloatingInput label="Passing Year" value={form.tenth_year} onChange={v => setForm({ ...form, tenth_year: v })} />
                    <FloatingInput label="Percentage / Grade" value={form.tenth_percentage} onChange={v => setForm({ ...form, tenth_percentage: v })} />
                  </div>
                </div>
                <div style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px", marginBottom: 12, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>12th Details</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0 12px" }}>
                    <FloatingInput label="Board" value={form.twelfth_board} onChange={v => setForm({ ...form, twelfth_board: v })} />
                    <FloatingInput label="Passing Year" value={form.twelfth_year} onChange={v => setForm({ ...form, twelfth_year: v })} />
                    <FloatingInput label="Percentage / Grade" value={form.twelfth_percentage} onChange={v => setForm({ ...form, twelfth_percentage: v })} />
                    <FloatSelect label="Stream" value={form.twelfth_stream} onChange={v => setForm({ ...form, twelfth_stream: v })} options={["Science","Commerce","Arts","Other"]} />
                  </div>
                </div>
                <div style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px", marginBottom: 12, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>Graduation Details</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0 12px" }}>
                    <FloatingInput label="Degree" value={form.graduation_degree} onChange={v => setForm({ ...form, graduation_degree: v })} />
                    <FloatingInput label="University" value={form.graduation_university} onChange={v => setForm({ ...form, graduation_university: v })} />
                    <FloatingInput label="Year" value={form.graduation_year} onChange={v => setForm({ ...form, graduation_year: v })} />
                    <FloatingInput label="CGPA / %" value={form.graduation_cgpa} onChange={v => setForm({ ...form, graduation_cgpa: v })} />
                  </div>
                </div>

                {/* Identity */}
                <SectionTitle color="#dc2626" border="#fee2e2" label="🪪 Identity & Documents" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 16px" }}>
                  <FloatingInput label="Aadhaar Number" value={form.aadhaar_number} onChange={v => setForm({ ...form, aadhaar_number: v })} />
                  <FloatingInput label="PAN Number" value={form.pan_number} onChange={v => setForm({ ...form, pan_number: v })} />
                  <FloatingInput label="Student / College ID URL" value={form.student_id_url} onChange={v => setForm({ ...form, student_id_url: v })} />
                </div>

                {/* Professional */}
                <SectionTitle color="#d97706" border="#fef3c7" label="💼 Professional Info" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                  <FloatingInput label="Job Title / Designation" value={form.job_title} onChange={v => setForm({ ...form, job_title: v })} />
                  <FloatingInput label="Company / College Name" value={form.company_name} onChange={v => setForm({ ...form, company_name: v })} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                  <FloatSelect label="Work Experience" value={form.work_experience} onChange={v => setForm({ ...form, work_experience: v })} options={["Fresher","1-3 years","3-5 years","5+ years"]} />
                  <FloatingInput label="LinkedIn Profile URL" value={form.linkedin_url} onChange={v => setForm({ ...form, linkedin_url: v })} />
                </div>

                {/* LMS */}
                <SectionTitle color="#0284c7" border="#e0f2fe" label="💡 LMS Information" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 16px" }}>
                  <FloatSelect label="Source" value={form.source} onChange={v => setForm({ ...form, source: v })} options={["Google","Referral","Social Media","Advertisement","Word of Mouth","Other"]} />
                  <FloatSelect label="Preferred Language" value={form.preferred_language} onChange={v => setForm({ ...form, preferred_language: v })} options={["Bengali","Hindi","English"]} />
                  <FloatingInput label="Referral Code" value={form.referral_code} onChange={v => setForm({ ...form, referral_code: v })} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                  <FloatingInput label="Emergency Contact Name" value={form.emergency_contact_name} onChange={v => setForm({ ...form, emergency_contact_name: v })} />
                  <FloatingInput label="Emergency Contact Phone" value={form.emergency_contact_phone} onChange={v => setForm({ ...form, emergency_contact_phone: v })} />
                </div>

                {/* Active Toggle */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "#f0fdf4", borderRadius: 12, border: "1px solid #bbf7d0", marginTop: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>Active Account</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Can login and access enrolled batches.</div>
                  </div>
                  <label style={{ display: "inline-flex", cursor: "pointer", position: "relative" }}>
                    <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} style={{ opacity: 0, position: "absolute", width: 0, height: 0 }} />
                    <div style={{ width: 44, height: 24, background: form.is_active ? "#10b981" : "#cbd5e1", borderRadius: 12, position: "relative", transition: "0.2s" }}>
                      <div style={{ width: 20, height: 20, background: "#fff", borderRadius: "50%", position: "absolute", top: 2, left: form.is_active ? 22 : 2, transition: "0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }} />
                    </div>
                  </label>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div style={{ padding: "18px 24px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: 12, background: "#fafbfc" }}>
              <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: "10px 20px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                Cancel
              </button>
              <button type="submit" form="student-form" disabled={saving} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: saving ? "#bae6fd" : "#0ea5e9", color: "#fff", fontWeight: 700, fontSize: 13, cursor: saving ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 12px rgba(14,165,233,0.3)", transition: "0.2s" }}>
                {saving ? "Saving..." : form.id ? "Save Changes" : "Register Student"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════ View Details Modal ═════════════════ */}
      {viewStudent && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)", animation: "fadeIn 0.2s" }}>
          <div style={{ width: "100%", maxWidth: 540, background: "#fff", borderRadius: 20, boxShadow: "0 20px 40px rgba(0,0,0,0.15)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh", animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}>
            
            {/* Display Header */}
            <div style={{ padding: "32px 24px 24px", background: "linear-gradient(135deg, #f0f9ff, #e0f2fe)", display: "flex", flexDirection: "column", alignItems: "center", borderBottom: "1px solid #bae6fd", position: "relative" }}>
              <button type="button" onClick={() => setViewStudent(null)} style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.5)", border: "none", color: "#0284c7", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <Icon name="x" size={16} />
              </button>

              <div style={{
                    width: 72, height: 72, borderRadius: 24, display: "flex", alignItems: "center", justifyContent: "center",
                    background: "#0ea5e9", color: "#fff", fontSize: 28, fontWeight: 800, boxShadow: "0 8px 16px rgba(14,165,233,0.25)", marginBottom: 16
                  }}>
                    {(viewStudent.first_name?.[0] || "?").toUpperCase()}
              </div>
              <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: "#0f172a" }}>
                {viewStudent.first_name} {viewStudent.last_name}
              </h2>
              <p style={{ margin: 0, fontSize: 14, color: "#0284c7", fontWeight: 600 }}>{viewStudent.email}</p>
            </div>

            {/* Info Grid */}
            <div style={{ padding: "24px", overflowY: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                
                <div style={{ background: "#f8fafc", padding: "16px", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Phone</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{viewStudent.phone || "—"}</div>
                </div>

                <div style={{ background: "#f8fafc", padding: "16px", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Alternative Phone</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{viewStudent.alternative_phone || "—"}</div>
                </div>

                <div style={{ background: "#f8fafc", padding: "16px", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Registration Date</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{new Date(viewStudent.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric'})}</div>
                </div>

                <div style={{ background: "#f8fafc", padding: "16px", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Account Status</div>
                  {viewStudent.is_active ? (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: "#dcfce7", color: "#16a34a", display: "inline-block" }}>Active</span>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: "#f1f5f9", color: "#64748b", display: "inline-block" }}>Inactive</span>
                  )}
                </div>

              </div>
            </div>

            {/* View Footer */}
            <div style={{ padding: "16px 24px", borderTop: "1px solid #f1f5f9", background: "#fafbfc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
               <button onClick={() => { setStudentToDelete({ id: viewStudent.id, name: `${viewStudent.first_name} ${viewStudent.last_name || ""}` }); setViewStudent(null); }} style={{ background: "none", border: "none", color: "#ef4444", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="trash" size={14} /> Delete 
               </button>
               <button onClick={() => { openEdit(viewStudent); setViewStudent(null); }} style={{ padding: "8px 20px", borderRadius: 8, background: "#0ea5e9", color: "#fff", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="edit" size={14} /> Edit Details
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {studentToDelete && (
        <DeleteModal
          title={`Delete "${studentToDelete.name}"?`}
          description="This will permanently delete this student and their enrollments. This action cannot be undone."
          onConfirm={confirmDelete}
          onCancel={() => setStudentToDelete(null)}
        />
      )}
    </div>
  );
}

export default function StudentManagerPage() {
  return (
    <AdminProvider>
      <StudentManagerInner />
    </AdminProvider>
  );
}
