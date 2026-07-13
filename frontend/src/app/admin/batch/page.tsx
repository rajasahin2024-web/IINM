"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Icon } from "../icons";
import { useToast } from "../components/ToastProvider";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL } from "@/lib/config";
import { AdminProvider } from "../components/ProtectedAdmin";
import { useRouter } from "next/navigation";
import CourseManager from "../components/CourseManager";
import DeleteModal from "../components/DeleteModal";
import "../admin.css";

/* ─────────────────────────────────────────
   Floating Input CSS  (same pattern as CategoryManager)
───────────────────────────────────────── */
const FLOAT_CSS = `
  .bi-wrap { position: relative; }
  .bi-field {
    position: relative;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    background: #f8fafc;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  }
  .bi-field.bi-focused {
    border-color: #38bdf8;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(56,189,248,0.15);
  }
  .bi-label {
    position: absolute; left: 14px; top: 50%;
    transform: translateY(-50%);
    font-size: 14px; color: #94a3b8;
    pointer-events: none;
    transition: all 0.18s cubic-bezier(0.4,0,0.2,1);
    background: transparent; padding: 0 3px;
    white-space: nowrap; line-height: 1;
    font-family: Inter, system-ui, sans-serif;
  }
  .bi-label.bi-up {
    top: 0; transform: translateY(-50%);
    font-size: 11px; font-weight: 600;
    color: #38bdf8; background: #fff;
  }
  .bi-inp {
    display: block; width: 100%;
    padding: 22px 14px 8px;
    border: none; outline: none;
    font-size: 14px; color: #0f172a;
    background: transparent; border-radius: 10px;
    font-family: Inter, system-ui, sans-serif;
    box-sizing: border-box;
  }
  .bi-req { color: #ef4444; margin-left: 2px; }

  /* Select field wrapper */
  .bi-sel-wrap { display: flex; flex-direction: column; gap: 6px; }
  .bi-sel-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
  .bi-sel {
    width: 100%; padding: 11px 14px;
    border-radius: 10px; border: 1.5px solid #e2e8f0;
    background: #f8fafc; font-size: 14px; font-weight: 600;
    color: #0f172a; outline: none; cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s;
    font-family: Inter, system-ui, sans-serif;
  }
  .bi-sel:focus { border-color: #38bdf8; box-shadow: 0 0 0 3px rgba(56,189,248,0.15); background: #fff; }
`;

/* ── FloatingInput ── */
function FloatingInput({
  label, type = "text", value, onChange, required = false, autoFocus = false,
}: {
  label: string; type?: string; value: string | number;
  onChange: (v: string) => void; required?: boolean; autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || String(value).length > 0 || type === "date" || type === "number" || type === "url";
  return (
    <div className="bi-wrap">
      <div className={`bi-field${focused ? " bi-focused" : ""}`}>
        <label className={`bi-label${lifted ? " bi-up" : ""}`}>
          {label}{required && <span className="bi-req">*</span>}
        </label>
        <input
          type={type}
          className="bi-inp"
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

/* ── FloatingSelect (styled dropdown) ── */
function FloatingSelect({
  label, value, onChange, children,
}: {
  label: string; value: string;
  onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <div className="bi-sel-wrap">
      <span className="bi-sel-label">{label}</span>
      <select className="bi-sel" value={value} onChange={e => onChange(e.target.value)}>
        {children}
      </select>
    </div>
  );
}

/* ─── Status badge colours ─── */
const STATUS_COLORS: Record<string, [string, string]> = {
  Upcoming:  ["#dbeafe", "#1d4ed8"],
  Ongoing:   ["#dcfce7", "#15803d"],
  Completed: ["#f1f5f9", "#475569"],
  Cancelled: ["#fee2e2", "#dc2626"],
};

const MODE_COLORS: Record<string, [string, string]> = {
  pre_recoded: ["#fef3c7", "#92400e"],
  live_class:  ["#ede9fe", "#6d28d9"],
  Hybrid:      ["#f0fdf4", "#166534"],
};

const MODE_LABELS: Record<string, string> = {
  pre_recoded: "Pre-recorded",
  live_class:  "Live Class",
  Hybrid:      "Hybrid",
};

const ITEMS_PER_PAGE = 10;

/* ═══════════════ Main Component ═══════════════ */
function BatchManagerInner() {
  const { showToast } = useToast();
  const router = useRouter();

  const [batches,     setBatches]     = useState<any[]>([]);
  const [courses,     setCourses]     = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);

  /* ── Filters ── */
  const [search,       setSearch]       = useState("");
  const [modeFilter,   setModeFilter]   = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  /* ── Pagination ── */
  const [currentPage, setCurrentPage] = useState(1);

  /* ── Modal ── */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId,   setEditingId]   = useState<number | null>(null);

  const defaultForm = {
    course_id: "", name: "", mode: "live_class", meeting_url: "", status: "Upcoming",
    start_date: "", end_date: "", max_capacity: 50,
    enable_waitlist: false, discount_amount: 0, enable_installments: false,
    instructor_ids: [] as number[], routines: [] as any[],
  };
  const [formData, setFormData] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  /* ── Drip Content (Curriculum unlock scheduling) ── */
  const [courseChapters, setCourseChapters] = useState<{ subjectName: string; chapters: any[] }[]>([]);
  const [dripDates, setDripDates] = useState<Record<number, string>>({});
  const [loadingChapters, setLoadingChapters] = useState(false);

  /* ── Quick-Add Teacher (inline mini-modal) ── */
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [teacherForm, setTeacherForm]       = useState({ name: "", email: "", phone: "" });
  const [savingTeacher, setSavingTeacher]   = useState(false);

  const saveTeacher = async () => {
    if (!teacherForm.name.trim()) { showToast("Teacher name is required", "error"); return; }
    setSavingTeacher(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/instructors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: teacherForm.name.trim(),
          email: teacherForm.email.trim() || null,
          phone: teacherForm.phone.trim() || null,
          is_active: true,
        }),
      });
      if (!res.ok) throw new Error();
      const newIns = await res.json();
      setInstructors(prev => [...prev, newIns]);
      setFormData(f => ({ ...f, instructor_ids: [...f.instructor_ids, newIns.id] }));
      showToast(`${teacherForm.name} added and selected!`, "success");
      setTeacherForm({ name: "", email: "", phone: "" });
      setShowAddTeacher(false);
    } catch {
      showToast("Failed to add teacher", "error");
    } finally {
      setSavingTeacher(false);
    }
  };

  /* ── Quick-Add Course (inline mini-modal) ── */
  const [showAddCourse, setShowAddCourse] = useState(false);


  /* ── Fetch ── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [resB, resC, resI] = await Promise.all([
        apiFetch(`${API_BASE_URL}/batches`).then(r => r.json()),
        apiFetch(`${API_BASE_URL}/courses`).then(r => r.json()),
        apiFetch(`${API_BASE_URL}/instructors`).then(r => r.json()),
      ]);
      setBatches(Array.isArray(resB) ? resB : []);
      setCourses(Array.isArray(resC) ? resC : []);
      setInstructors(Array.isArray(resI) ? resI : []);
    } catch {
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { setCurrentPage(1); }, [search, modeFilter, statusFilter]);

  /* ── Fetch chapters when course changes in modal ── */
  useEffect(() => {
    if (!formData.course_id) { setCourseChapters([]); return; }
    setLoadingChapters(true);
    (async () => {
      try {
        const res = await apiFetch(`${API_BASE_URL}/courses/${formData.course_id}`);
        if (!res.ok) return;
        const data = await res.json();
        const subjects: any[] = data.subjects || [];
        const groups: { subjectName: string; chapters: any[] }[] = [];
        for (const sub of subjects) {
          const chapRes = await apiFetch(`${API_BASE_URL}/subjects/${sub.id}/chapters`);
          if (chapRes.ok) {
            const chaps = await chapRes.json();
            if (chaps.length > 0) groups.push({ subjectName: sub.name, chapters: chaps });
          }
        }
        setCourseChapters(groups);
      } catch { /* silent */ }
      finally { setLoadingChapters(false); }
    })();
  }, [formData.course_id]);

  /* ── Filter ── */
  const filtered = batches.filter(b => {
    const courseName = courses.find(c => c.id === b.course_id)?.title ?? "";
    const instructorNames = (b.instructors ?? []).map((i: any) => i.name).join(" ");
    const q = search.toLowerCase();
    const matchSearch = !q ||
      b.name.toLowerCase().includes(q) ||
      courseName.toLowerCase().includes(q) ||
      instructorNames.toLowerCase().includes(q);
    const matchMode   = modeFilter   === "all" || b.mode   === modeFilter;
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    return matchSearch && matchMode && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paged = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  /* ── Modal helpers ── */
  const openNew = () => {
    setEditingId(null);
    setFormData(defaultForm);
    setDripDates({});
    setCourseChapters([]);
    setIsModalOpen(true);
  };

  const openEdit = (batch: any) => {
    setEditingId(batch.id);
    setFormData({
      course_id:          batch.course_id?.toString() ?? "",
      name:               batch.name ?? "",
      mode:               batch.mode ?? "live_class",
      meeting_url:        batch.meeting_url ?? "",
      status:             batch.status ?? "Upcoming",
      start_date:         batch.start_date ?? "",
      end_date:           batch.end_date ?? "",
      max_capacity:       batch.max_capacity ?? 50,
      enable_waitlist:    batch.enable_waitlist ?? false,
      discount_amount:    batch.discount_amount ?? 0,
      enable_installments: batch.enable_installments ?? false,
      instructor_ids:     batch.instructors?.map((i: any) => i.id) ?? [],
      routines:           batch.routines ?? [],
    });
    /* Populate existing drip dates */
    const dripMap: Record<number, string> = {};
    (batch.content_drip || []).forEach((d: any) => { dripMap[d.chapter_id] = d.unlock_date; });
    setDripDates(dripMap);
    setIsModalOpen(true);
  };

  const saveBatch = async () => {
    if (!formData.course_id) { showToast("Select a course", "error"); return; }
    if (!formData.name.trim()) { showToast("Enter a batch name", "error"); return; }
    setSaving(true);
    try {
      const payload = {
        ...formData,
        course_id:       parseInt(formData.course_id),
        discount_amount: formData.discount_amount ? parseFloat(formData.discount_amount as any) : 0,
        max_capacity:    parseInt(formData.max_capacity as any),
        start_date:      formData.start_date || null,
        end_date:        formData.end_date   || null,
      };
      const url    = editingId ? `${API_BASE_URL}/batches/${editingId}` : `${API_BASE_URL}/batches`;
      const method = editingId ? "PUT" : "POST";
      const res    = await apiFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      const savedBatch = await res.json();
      const batchId = editingId ?? savedBatch.id;

      /* Save drip schedule */
      const drips = Object.entries(dripDates)
        .map(([chId, date]) => ({ chapter_id: parseInt(chId), unlock_date: date || null }))
        .filter(d => d.unlock_date);
      await apiFetch(`${API_BASE_URL}/batches/${batchId}/content-drip`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drips }),
      });

      showToast(editingId ? "Batch updated!" : "Batch created!", "success");
      setIsModalOpen(false);
      fetchAll();
    } catch {
      showToast("Error saving batch", "error");
    } finally {
      setSaving(false);
    }
  };

  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await apiFetch(`${API_BASE_URL}/batches/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      showToast("Batch deleted", "success");
      fetchAll();
    } catch {
      showToast("Error deleting batch", "error");
    } finally {
      setDeleteTarget(null);
    }
  };

  /* ── Routine helpers ── */
  const addRoutine = () => setFormData(f => ({ ...f, routines: [...f.routines, { day_of_week: "", start_time: "", end_time: "" }] }));
  const updateRoutine = (idx: number, field: string, value: string) =>
    setFormData(f => { const r = [...f.routines]; r[idx] = { ...r[idx], [field]: value }; return { ...f, routines: r }; });
  const removeRoutine = (idx: number) =>
    setFormData(f => { const r = [...f.routines]; r.splice(idx, 1); return { ...f, routines: r }; });

  const toggleInstructor = (id: number) =>
    setFormData(f => ({
      ...f,
      instructor_ids: f.instructor_ids.includes(id)
        ? f.instructor_ids.filter(x => x !== id)
        : [...f.instructor_ids, id],
    }));

  /* ══════════════ RENDER ══════════════ */
  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: FLOAT_CSS }} />

      {/* ─── Header ─── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", margin: "0 0 4px", letterSpacing: "-0.5px" }}>Batch Management</h1>
          <p style={{ color: "#64748b", margin: 0, fontSize: 13 }}>
            {batches.length} batch{batches.length !== 1 ? "es" : ""} configured
          </p>
        </div>
        <button
          onClick={openNew}
          style={{ background: "#0ea5e9", color: "#fff", padding: "10px 22px", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 12px rgba(14,165,233,0.25)" }}
        >
          <Icon name="plus" size={16} /> Create Batch
        </button>
      </div>

      {/* ─── Filter bar ─── */}
      <div style={{ background: "#fff", borderRadius: 12, padding: "14px 18px", border: "1px solid #e2e8f0", marginBottom: 18, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 260px", minWidth: 220 }}>
          <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }}>
            <Icon name="search" size={15} />
          </span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by batch name, course or instructor…"
            style={{ width: "100%", paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9, borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", background: "#f8fafc", color: "#0f172a", boxSizing: "border-box" }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 2, display: "flex" }}>
              <Icon name="x" size={13} />
            </button>
          )}
        </div>

        {/* Mode filter */}
        <select value={modeFilter} onChange={e => setModeFilter(e.target.value)}
          style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, color: "#0f172a", background: "#f8fafc", outline: "none", cursor: "pointer", minWidth: 150 }}>
          <option value="all">All Modes</option>
          <option value="pre_recoded">Pre-recorded</option>
          <option value="live_class">Live Class</option>
          <option value="Hybrid">Hybrid</option>
        </select>

        {/* Status filter */}
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, color: "#0f172a", background: "#f8fafc", outline: "none", cursor: "pointer", minWidth: 140 }}>
          <option value="all">All Status</option>
          <option value="Upcoming">Upcoming</option>
          <option value="Ongoing">Ongoing</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <span style={{ fontSize: 13, color: "#64748b", marginLeft: "auto", whiteSpace: "nowrap" }}>
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ─── Table ─── */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflowX: "auto" }}>

        {/* Head */}
        <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 200px 130px 120px 160px 130px 110px", alignItems: "center", padding: "11px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", gap: 8, minWidth: 900 }}>
          {["#", "Batch Name", "Linked Course", "Mode", "Status", "Instructors", "Dates", "Actions"].map((h, i) => (
            <span key={i} style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px", textAlign: i === 7 ? "right" : "left" }}>{h}</span>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          <div style={{ padding: "52px 20px", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>Loading batches…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "52px 20px", textAlign: "center" }}>
            <div style={{ width: 52, height: 52, background: "#f0f9ff", borderRadius: 26, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", color: "#0ea5e9" }}>
              <Icon name="layers" size={24} />
            </div>
            <p style={{ margin: "0 0 4px", fontWeight: 700, color: "#0f172a", fontSize: 15 }}>
              {search || modeFilter !== "all" || statusFilter !== "all" ? "No batches match your filters" : "No batches yet"}
            </p>
            <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
              {search || modeFilter !== "all" || statusFilter !== "all" ? "Try clearing your filters." : "Create your first batch to get started."}
            </p>
          </div>
        ) : (
          paged.map((batch, idx) => {
            const courseName   = courses.find(c => c.id === batch.course_id)?.title || "Unknown Course";
            const isEven       = idx % 2 === 0;
            const [sBg, sFg]   = STATUS_COLORS[batch.status]   ?? ["#f1f5f9", "#475569"];
            const [mBg, mFg]   = MODE_COLORS[batch.mode]       ?? ["#f1f5f9", "#475569"];
            const modeLabel    = MODE_LABELS[batch.mode]        ?? batch.mode;
            const rowNum       = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;

            return (
              <div
                key={batch.id}
                style={{
                  display: "grid", gridTemplateColumns: "32px 1fr 200px 130px 120px 160px 130px 110px",
                  alignItems: "center", padding: "12px 20px", borderBottom: "1px solid #f1f5f9",
                  gap: 8, background: isEven ? "#fff" : "#fafbfc", transition: "background 0.15s",
                  minWidth: 900,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f0f9ff")}
                onMouseLeave={e => (e.currentTarget.style.background = isEven ? "#fff" : "#fafbfc")}
              >
                {/* # */}
                <span style={{ fontSize: 12, color: "#cbd5e1", fontWeight: 600 }}>{rowNum}</span>

                {/* Batch Name */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{batch.name}</div>
                  {batch.meeting_url && (
                    <a href={batch.meeting_url} target="_blank" rel="noreferrer"
                      style={{ fontSize: 11, color: "#0ea5e9", textDecoration: "none", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                      <Icon name="link" size={10} /> Meeting Link
                    </a>
                  )}
                </div>

                {/* Course */}
                <div style={{ fontSize: 13, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {courseName}
                </div>

                {/* Mode */}
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: mBg, color: mFg }}>
                    {modeLabel}
                  </span>
                </div>

                {/* Status */}
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: sBg, color: sFg, display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: sFg, display: "inline-block" }} />
                    {batch.status}
                  </span>
                </div>

                {/* Instructors */}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {(batch.instructors ?? []).length > 0 ? (
                    <>
                      {(batch.instructors as any[]).slice(0, 3).map((ins: any, i: number) => (
                        <div key={ins.id} title={ins.name} style={{
                          width: 26, height: 26, borderRadius: 13,
                          background: `hsl(${(ins.id * 47) % 360},60%,55%)`,
                          color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 800,
                          marginLeft: i > 0 ? -8 : 0, border: "2px solid #fff",
                          position: "relative", zIndex: 10 - i,
                        }}>
                          {ins.name.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {(batch.instructors as any[]).length > 3 && (
                        <span style={{ fontSize: 11, color: "#64748b", marginLeft: 4 }}>+{(batch.instructors as any[]).length - 3}</span>
                      )}
                    </>
                  ) : (
                    <span style={{ fontSize: 12, color: "#cbd5e1", fontStyle: "italic" }}>None</span>
                  )}
                </div>

                {/* Dates */}
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  <div>{batch.start_date ? new Date(batch.start_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "TBD"}</div>
                  {batch.end_date && <div style={{ color: "#94a3b8" }}>→ {new Date(batch.end_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
                  <button
                    onClick={() => router.push(`/admin/batch/${batch.id}`)} title="View"
                    style={{ background: "#f0f9ff", border: "1px solid #bae6fd", width: 30, height: 30, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", color: "#0ea5e9", cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#e0f2fe"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "#f0f9ff"; }}
                  >
                    <Icon name="eye" size={13} />
                  </button>
                  <button
                    onClick={() => openEdit(batch)} title="Edit"
                    style={{ background: "#f8fafc", border: "1px solid #e2e8f0", width: 30, height: 30, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.color = "#3b82f6"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.color = "#475569"; }}
                  >
                    <Icon name="edit" size={13} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget({ id: batch.id, name: batch.name })} title="Delete"
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 20px", borderTop: "1px solid #f1f5f9", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 13, color: "#64748b" }}>
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} entries
            </span>
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                style={{ padding: "6px 13px", borderRadius: 6, border: "1px solid #e2e8f0", background: currentPage === 1 ? "#f8fafc" : "#fff", color: currentPage === 1 ? "#cbd5e1" : "#475569", fontSize: 13, cursor: currentPage === 1 ? "not-allowed" : "pointer", fontWeight: 500 }}
              >Previous</button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce<(number | "…")[]>((acc, p, i, arr) => {
                  if (i > 0 && typeof arr[i - 1] === "number" && (p as number) - (arr[i - 1] as number) > 1) acc.push("…");
                  acc.push(p); return acc;
                }, [])
                .map((p, i) =>
                  p === "…" ? (
                    <span key={`e-${i}`} style={{ fontSize: 13, color: "#94a3b8", padding: "0 4px" }}>…</span>
                  ) : (
                    <button key={p} onClick={() => setCurrentPage(p as number)}
                      style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid", borderColor: currentPage === p ? "#0ea5e9" : "#e2e8f0", background: currentPage === p ? "#0ea5e9" : "#fff", color: currentPage === p ? "#fff" : "#475569", fontSize: 13, fontWeight: currentPage === p ? 700 : 500, cursor: "pointer" }}>
                      {p}
                    </button>
                  )
                )}

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
                style={{ padding: "6px 13px", borderRadius: 6, border: "1px solid #e2e8f0", background: currentPage >= totalPages ? "#f8fafc" : "#fff", color: currentPage >= totalPages ? "#cbd5e1" : "#475569", fontSize: 13, cursor: currentPage >= totalPages ? "not-allowed" : "pointer", fontWeight: 500 }}
              >Next</button>
            </div>
          </div>
        )}
      </div>

      {/* ══════════ Add / Edit Modal ══════════ */}
      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
          <div style={{ position: "relative", width: "100%", height: "100%", background: "#f1f5f9", display: "flex", flexDirection: "column", overflow: "hidden", animation: "batchPop 0.2s ease-out" }}>

            {/* Modal Header */}
            <div style={{ padding: "22px 28px 18px", background: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,#0ea5e9,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
                  <Icon name="layers" size={18} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                    {editingId ? "Edit Batch" : "Create New Batch"}
                  </h2>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
                    {editingId ? "Update schedule, mode, and personnel" : "Configure a new batch for a course"}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", width: 34, height: 34, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", cursor: "pointer" }}>
                <Icon name="x" size={15} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="custom-scroll" style={{ padding: "32px 36px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 24 }}>

              {/* ── Section: Basic Info ── */}
              <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "20px 22px" }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  <Icon name="info" size={14} /> Basic Information
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                  {/* Linked Course */}
                  <div>
                    <FloatingSelect label="Linked Course *" value={formData.course_id} onChange={v => setFormData(f => ({ ...f, course_id: v }))}>
                      <option value="">Select a course…</option>
                      {courses.map(c => <option key={c.id} value={String(c.id)}>{c.title}</option>)}
                    </FloatingSelect>
                    {/* Quick-add link */}
                    <button
                      type="button"
                      onClick={() => setShowAddCourse(true)}
                      style={{ marginTop: 6, background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#0ea5e9", display: "inline-flex", alignItems: "center", gap: 4 }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Add New Course
                    </button>
                  </div>

                  {/* Batch Name */}
                  <FloatingInput
                    label="Batch Name" value={formData.name} required autoFocus
                    onChange={v => setFormData(f => ({ ...f, name: v }))}
                  />

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <FloatingSelect label="Batch Mode" value={formData.mode} onChange={v => setFormData(f => ({ ...f, mode: v }))}>
                      <option value="pre_recoded">Pre-recorded</option>
                      <option value="live_class">Live Class</option>
                      <option value="Hybrid">Hybrid</option>
                    </FloatingSelect>
                    <FloatingSelect label="Batch Status" value={formData.status} onChange={v => setFormData(f => ({ ...f, status: v }))}>
                      <option value="Upcoming">Upcoming</option>
                      <option value="Ongoing">Ongoing</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </FloatingSelect>
                  </div>

                  {formData.mode !== "pre_recoded" && (
                    <FloatingInput
                      label="Meeting URL (Zoom / Google Meet)" type="url"
                      value={formData.meeting_url}
                      onChange={v => setFormData(f => ({ ...f, meeting_url: v }))}
                    />
                  )}
                </div>
              </div>

              {/* ── Section: Timeline & Capacity ── */}
              <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "20px 22px" }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: "0 0 18px", display: "flex", alignItems: "center", gap: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  <Icon name="calendar" size={14} /> Timeline & Parameters
                </h3>

                {/* Dates row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  {([
                    { label: "Start Date", key: "start_date" as const },
                    { label: "End Date",   key: "end_date"   as const },
                  ] as { label: string; key: "start_date" | "end_date" }[]).map(({ label, key }) => (
                    <div key={key} className="bi-sel-wrap">
                      <span className="bi-sel-label">{label}</span>
                      <input
                        type="date"
                        value={formData[key]}
                        onChange={e => setFormData(f => ({ ...f, [key]: e.target.value }))}
                        style={{
                          width: "100%", padding: "10px 12px", borderRadius: 10,
                          border: "1.5px solid #e2e8f0", background: "#f8fafc",
                          fontSize: 14, fontWeight: 500, color: "#0f172a",
                          outline: "none", boxSizing: "border-box",
                          fontFamily: "Inter, system-ui, sans-serif",
                          transition: "border-color 0.2s, box-shadow 0.2s",
                        }}
                        onFocus={e => { e.currentTarget.style.borderColor = "#38bdf8"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(56,189,248,0.15)"; e.currentTarget.style.background = "#fff"; }}
                        onBlur={e  => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = "#f8fafc"; }}
                      />
                    </div>
                  ))}
                </div>

                {/* Capacity & Discount row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  {([
                    { label: "Max Capacity",       key: "max_capacity"    as const },
                    { label: "Batch Discount (\u20b9)", key: "discount_amount" as const },
                  ] as { label: string; key: "max_capacity" | "discount_amount" }[]).map(({ label, key }) => (
                    <div key={key} className="bi-sel-wrap">
                      <span className="bi-sel-label">{label}</span>
                      <input
                        type="number"
                        value={formData[key] as number}
                        onChange={e => setFormData(f => ({ ...f, [key]: Number(e.target.value) }))}
                        style={{
                          width: "100%", padding: "10px 12px", borderRadius: 10,
                          border: "1.5px solid #e2e8f0", background: "#f8fafc",
                          fontSize: 14, fontWeight: 600, color: "#0f172a",
                          outline: "none", boxSizing: "border-box",
                          fontFamily: "Inter, system-ui, sans-serif",
                          transition: "border-color 0.2s, box-shadow 0.2s",
                        }}
                        onFocus={e => { e.currentTarget.style.borderColor = "#38bdf8"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(56,189,248,0.15)"; e.currentTarget.style.background = "#fff"; }}
                        onBlur={e  => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = "#f8fafc"; }}
                      />
                    </div>
                  ))}
                </div>

                {/* Toggles */}
                <div style={{ display: "flex", gap: 24 }}>
                  {([
                    { label: "Enable Waitlist",    key: "enable_waitlist"    as const },
                    { label: "Allow Installments", key: "enable_installments" as const },
                  ] as { label: string; key: "enable_waitlist" | "enable_installments" }[]).map(({ label, key }) => (
                    <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#334155" }}>
                      <input type="checkbox" checked={formData[key] as boolean}
                        onChange={e => setFormData(f => ({ ...f, [key]: e.target.checked }))}
                        style={{ width: 16, height: 16, accentColor: "#0ea5e9" }} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {/* ── Section: Instructors ── */}
              <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "20px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                  <div>
                    <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: 0 }}>Assign Teachers</h3>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Select the instructors for this batch.</p>
                  </div>
                  <button type="button" onClick={() => setShowAddTeacher(true)} style={{ background: "#f0f9ff", color: "#0ea5e9", border: "1.5px solid #bae6fd", padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="plus" size={14} /> Add New Teacher
                  </button>
                </div>

                {instructors.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", background: "#f8fafc", border: "2px dashed #e2e8f0", borderRadius: 16 }}>
                    <div style={{ color: "#94a3b8", marginBottom: 12 }}><Icon name="users" size={48} /></div>
                    <h4 style={{ margin: "0 0 8px 0", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>No Teachers Found</h4>
                    <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>Click the button above to create your first instructor profile.</p>
                  </div>
                ) : (
                  <div style={{
                    display: "flex",
                    gap: 14,
                    overflowX: "auto",
                    overflowY: "hidden",
                    paddingBottom: 8,
                    scrollbarWidth: "thin",
                    scrollbarColor: "#cbd5e1 transparent",
                  }}>
                    {instructors.map(inst => {
                      const isSelected = formData.instructor_ids.includes(inst.id);
                      return (
                        <div
                          key={inst.id}
                          onClick={() => toggleInstructor(inst.id)}
                          style={{
                            flexShrink: 0,
                            width: 200,
                            padding: "16px 14px",
                            borderRadius: 14,
                            border: `2px solid ${isSelected ? "#0ea5e9" : "#e2e8f0"}`,
                            background: isSelected ? "#f0f9ff" : "#fff",
                            cursor: "pointer",
                            position: "relative",
                            transition: "all 0.2s",
                            boxShadow: isSelected ? "0 6px 18px rgba(14,165,233,0.15)" : "0 2px 8px rgba(0,0,0,0.04)",
                            transform: isSelected ? "translateY(-3px)" : "none",
                          }}
                        >
                          {/* Check badge */}
                          {isSelected && (
                            <div style={{
                              position: "absolute", top: 10, right: 10,
                              width: 20, height: 20, borderRadius: "50%",
                              background: "#0ea5e9", color: "#fff",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              <Icon name="check" size={11} />
                            </div>
                          )}

                          {/* Avatar */}
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                            {inst.avatar_url ? (
                              <img
                                src={inst.avatar_url.startsWith("http") ? inst.avatar_url : `${API_BASE_URL.replace("/api", "")}${inst.avatar_url}`}
                                alt={inst.name}
                                style={{
                                  width: 52, height: 52, borderRadius: "50%",
                                  objectFit: "cover",
                                  border: `3px solid ${isSelected ? "#0ea5e9" : "#e2e8f0"}`,
                                }}
                              />
                            ) : (
                              <div style={{
                                width: 52, height: 52, borderRadius: "50%",
                                background: isSelected ? "#0ea5e9" : "#f1f5f9",
                                color: isSelected ? "#fff" : "#94a3b8",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 20, fontWeight: 800,
                                transition: "all 0.2s",
                              }}>
                                {inst.name.charAt(0).toUpperCase()}
                              </div>
                            )}

                            {/* Name + email */}
                            <div style={{ textAlign: "center", width: "100%" }}>
                              <div style={{
                                fontSize: 13, fontWeight: 800, color: "#0f172a",
                                marginBottom: 3, overflow: "hidden",
                                textOverflow: "ellipsis", whiteSpace: "nowrap",
                              }}>{inst.name}</div>
                              {inst.email && (
                                <div style={{
                                  fontSize: 11, color: "#64748b",
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                }}>{inst.email}</div>
                              )}
                              {inst.role && (
                                <div style={{
                                  marginTop: 6, display: "inline-block",
                                  fontSize: 10, fontWeight: 700, color: "#0ea5e9",
                                  background: "rgba(14,165,233,0.1)",
                                  padding: "2px 8px", borderRadius: 10,
                                  textTransform: "uppercase", letterSpacing: "0.4px",
                                }}>{inst.role}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                )}
              </div>

              {/* ── Section: Curriculum Drip Content ── */}
              {(courseChapters.length > 0 || loadingChapters) && (
                <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "20px 22px" }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: "0 0 4px", display: "flex", alignItems: "center", gap: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    <Icon name="calendar" size={14} /> Curriculum — Scheduled Unlock (Drip Content)
                  </h3>
                  <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 18px" }}>Set a date when each chapter becomes visible to students. Leave blank to unlock immediately.</p>

                  {loadingChapters ? (
                    <div style={{ padding: "24px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Loading curriculum…</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                      {courseChapters.map(group => (
                        <div key={group.subjectName}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
                            {group.subjectName}
                            <span style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {group.chapters.map((ch: any) => {
                              const date = dripDates[ch.id] || "";
                              const isLocked = !!date;
                              return (
                                <div key={ch.id} style={{
                                  display: "flex", alignItems: "center", gap: 14,
                                  background: isLocked ? "#f0fdfa" : "#f8fafc",
                                  border: `1px solid ${isLocked ? "#99f6e4" : "#e2e8f0"}`,
                                  borderRadius: 10, padding: "10px 14px",
                                  transition: "all 0.2s",
                                }}>
                                  <div style={{ width: 32, height: 32, borderRadius: 8, background: isLocked ? "#ccfbf1" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: isLocked ? "#0d9488" : "#94a3b8", transition: "all 0.2s" }}>
                                    <Icon name={isLocked ? "lock" : "unlock"} size={14} />
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ch.title}</div>
                                    {isLocked && (
                                      <div style={{ fontSize: 11, color: "#0f766e", marginTop: 2, fontWeight: 600 }}>
                                        Unlocks: {new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                      </div>
                                    )}
                                  </div>
                                  <input
                                    type="date"
                                    value={date}
                                    onChange={e => setDripDates(prev => {
                                      const next = { ...prev };
                                      if (e.target.value) next[ch.id] = e.target.value;
                                      else delete next[ch.id];
                                      return next;
                                    })}
                                    style={{
                                      padding: "7px 11px", borderRadius: 8,
                                      border: `1px solid ${isLocked ? "#5eead4" : "#e2e8f0"}`,
                                      outline: "none", fontFamily: "inherit",
                                      background: "#fff", color: isLocked ? "#0f766e" : "#475569",
                                      fontWeight: 600, fontSize: 13, cursor: "pointer",
                                      flexShrink: 0,
                                    }}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Section: Class Routine ── */}
              <div style={{ background: "#f0fdf4", borderRadius: 14, border: "1px solid #bbf7d0", padding: "20px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: "#166534", margin: 0, display: "flex", alignItems: "center", gap: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    <Icon name="clock" size={14} /> Class Routine
                  </h3>
                  <button onClick={addRoutine} type="button"
                    style={{ background: "#22c55e", color: "#fff", border: "none", padding: "5px 12px", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                    <Icon name="plus" size={12} /> Add Slot
                  </button>
                </div>
                {formData.routines.length === 0 ? (
                  <p style={{ fontSize: 13, color: "#166534", fontStyle: "italic", opacity: 0.8, margin: 0 }}>No schedule yet — students will assume self-paced.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {formData.routines.map((r, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", background: "#fff", padding: "10px 14px", borderRadius: 10, border: "1px solid #bbf7d0" }}>
                        <input 
                          type="date" 
                          value={r.day_of_week} 
                          onChange={e => updateRoutine(i, "day_of_week", e.target.value)}
                          onClick={(e) => { try { e.currentTarget.showPicker(); } catch {} }}
                          min={new Date().toISOString().split("T")[0]}
                          style={{ padding: "7px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13, fontWeight: 600, outline: "none", flex: 1, fontFamily: "Inter, system-ui, sans-serif", color: "#0f172a", cursor: "pointer" }} 
                        />
                        <input type="time" value={r.start_time} onChange={e => updateRoutine(i, "start_time", e.target.value)}
                          style={{ padding: "7px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }} />
                        <span style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>to</span>
                        <input type="time" value={r.end_time} onChange={e => updateRoutine(i, "end_time", e.target.value)}
                          style={{ padding: "7px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }} />
                        <button onClick={() => removeRoutine(i)} type="button"
                          style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 4 }}>
                          <Icon name="x" size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
             </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: "16px 28px 22px", background: "#fff", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setIsModalOpen(false)} style={{ padding: "10px 22px", borderRadius: 9, border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={saveBatch} disabled={saving}
                style={{ padding: "10px 30px", borderRadius: 9, border: "none", background: saving ? "#7dd3fc" : "linear-gradient(135deg,#0ea5e9,#6366f1)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: saving ? "not-allowed" : "pointer", boxShadow: saving ? "none" : "0 4px 14px rgba(14,165,233,0.3)", transition: "all 0.2s" }}>
                {saving ? "Saving…" : editingId ? "Update Batch" : "Deploy Batch"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Quick Add Teacher Mini-Modal ══ */}
      {showAddTeacher && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10001, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.4)", backdropFilter: "blur(4px)" }} onClick={() => setShowAddTeacher(false)} />
          <div style={{ position: "relative", width: "100%", maxWidth: 440, background: "#fff", borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.18)", overflow: "hidden", animation: "batchPop 0.2s ease-out" }}>

            {/* Header */}
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fafbfc" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg,#8b5cf6,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                  <Icon name="user-plus" size={17} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Add Teacher</h3>
                  <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Will be auto-selected for this batch</p>
                </div>
              </div>
              <button onClick={() => setShowAddTeacher(false)} style={{ background: "#f1f5f9", border: "none", width: 30, height: 30, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", cursor: "pointer" }}>
                <Icon name="x" size={14} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Name */}
              <div style={{ position: "relative" }}>
                <div style={{ position: "relative", border: "1.5px solid #e2e8f0", borderRadius: 10, background: "#f8fafc", transition: "border-color 0.2s" }}
                  onFocusCapture={e => (e.currentTarget.style.borderColor = "#38bdf8")}
                  onBlurCapture={e  => (e.currentTarget.style.borderColor = "#e2e8f0")}>
                  <label style={{ position: "absolute", left: 14, top: teacherForm.name ? 4 : "50%", transform: teacherForm.name ? "none" : "translateY(-50%)", fontSize: teacherForm.name ? 10 : 14, fontWeight: teacherForm.name ? 700 : 400, color: teacherForm.name ? "#38bdf8" : "#94a3b8", transition: "all 0.15s", pointerEvents: "none", background: teacherForm.name ? "transparent" : "transparent" }}>
                    Full Name <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    autoFocus
                    value={teacherForm.name}
                    onChange={e => setTeacherForm(f => ({ ...f, name: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && saveTeacher()}
                    style={{ display: "block", width: "100%", padding: teacherForm.name ? "20px 14px 6px" : "14px 14px", border: "none", outline: "none", fontSize: 14, background: "transparent", color: "#0f172a", borderRadius: 10, boxSizing: "border-box", fontFamily: "Inter, sans-serif", transition: "padding 0.15s" }}
                  />
                </div>
              </div>

              {/* Email + Phone row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "Email", key: "email" as const, type: "email" },
                  { label: "Phone", key: "phone" as const, type: "tel"   },
                ].map(({ label, key, type }) => (
                  <div key={key} style={{ position: "relative", border: "1.5px solid #e2e8f0", borderRadius: 10, background: "#f8fafc" }}
                    onFocusCapture={e => (e.currentTarget.style.borderColor = "#38bdf8")}
                    onBlurCapture={e  => (e.currentTarget.style.borderColor = "#e2e8f0")}>
                    <label style={{ position: "absolute", left: 12, top: teacherForm[key] ? 4 : "50%", transform: teacherForm[key] ? "none" : "translateY(-50%)", fontSize: teacherForm[key] ? 10 : 13, fontWeight: teacherForm[key] ? 700 : 400, color: teacherForm[key] ? "#38bdf8" : "#94a3b8", transition: "all 0.15s", pointerEvents: "none" }}>
                      {label}
                    </label>
                    <input
                      type={type}
                      value={teacherForm[key]}
                      onChange={e => setTeacherForm(f => ({ ...f, [key]: e.target.value }))}
                      style={{ display: "block", width: "100%", padding: teacherForm[key] ? "18px 12px 5px" : "12px 12px", border: "none", outline: "none", fontSize: 13, background: "transparent", color: "#0f172a", borderRadius: 10, boxSizing: "border-box", fontFamily: "Inter, sans-serif", transition: "padding 0.15s" }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "12px 24px 20px", display: "flex", justifyContent: "flex-end", gap: 10, borderTop: "1px solid #f1f5f9", background: "#fafbfc" }}>
              <button onClick={() => setShowAddTeacher(false)} style={{ padding: "9px 20px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={saveTeacher} disabled={savingTeacher}
                style={{ padding: "9px 24px", borderRadius: 8, border: "none", background: savingTeacher ? "#c4b5fd" : "linear-gradient(135deg,#8b5cf6,#6366f1)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: savingTeacher ? "not-allowed" : "pointer", boxShadow: "0 4px 12px rgba(99,102,241,0.3)", transition: "all 0.2s" }}>
                {savingTeacher ? "Adding…" : "Add & Select"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Quick Add Course via CourseManager ══ */}
      {showAddCourse && (
        <CourseManager
          isInlineModal={true}
          onCloseInline={() => setShowAddCourse(false)}
          onCourseSaved={(newCourse: any) => {
            setCourses(prev => [...prev, newCourse]);
            setFormData(f => ({ ...f, course_id: String(newCourse.id) }));
            showToast(`"${newCourse.title}" created and selected!`, "success");
            setShowAddCourse(false);
          }}
        />
      )}

      {deleteTarget && (
        <DeleteModal 
          title={`Delete "${deleteTarget.name}"?`} 
          description="This will permanently delete this batch." 
          onConfirm={confirmDelete} 
          onCancel={() => setDeleteTarget(null)} 
        />
      )}

      <style>{`
        @keyframes batchPop {
          from { transform: scale(0.96); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default function BatchManager() {
  return (
    <AdminProvider>
      <BatchManagerInner />
    </AdminProvider>
  );
}
