"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "../icons";
import { useToast } from "./ToastProvider";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL } from "@/lib/config";
import CourseManager from "./CourseManager";

/* ─────────────────────────────────────────
   Floating Input CSS
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

function FloatingInput({ label, type = "text", value, onChange, required = false, autoFocus = false }: any) {
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

function FloatingSelect({ label, value, onChange, children }: any) {
  return (
    <div className="bi-sel-wrap">
      <span className="bi-sel-label">{label}</span>
      <select className="bi-sel" value={value} onChange={e => onChange(e.target.value)}>
        {children}
      </select>
    </div>
  );
}

export default function BatchCreateModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: (batchId?: number) => void }) {
  const { showToast } = useToast();
  
  const [courses, setCourses] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const defaultForm = {
    course_id: "", name: "", mode: "live_class", meeting_url: "", status: "Upcoming",
    start_date: "", end_date: "", max_capacity: 50,
    enable_waitlist: false, discount_amount: 0, enable_installments: false,
    instructor_ids: [] as number[], routines: [] as any[],
  };
  const [formData, setFormData] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  /* ── Curriculum Drip State ── */
  const [courseSubjects, setCourseSubjects] = useState<any[]>([]);
  const [chaptersBySubject, setChaptersBySubject] = useState<Record<number, any[]>>({});
  const [contentDrip, setContentDrip] = useState<Record<string, string>>({}); // "c_1" or "m_1" -> unlock_date

  useEffect(() => {
    if (formData.course_id) {
       apiFetch(`${API_BASE_URL}/courses/${formData.course_id}`).then(res => res.json()).then(async (data) => {
           const subs = data.subjects || [];
           setCourseSubjects(subs);
           const chMap: Record<number, any[]> = {};
           for (const sub of subs) {
               try {
                  const chRes = await apiFetch(`${API_BASE_URL}/subjects/${sub.id}/chapters`);
                  if (chRes.ok) {
                      chMap[sub.id] = await chRes.json();
                  }
               } catch (e) {}
           }
           setChaptersBySubject(chMap);
       });
    } else {
       setCourseSubjects([]);
       setChaptersBySubject({});
       setContentDrip({});
    }
  }, [formData.course_id]);

  /* ── Quick-Add Teacher (inline mini-modal) ── */
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [teacherForm, setTeacherForm] = useState({ name: "", email: "", phone: "" });
  const [savingTeacher, setSavingTeacher] = useState(false);

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
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [resC, resI] = await Promise.all([
          apiFetch(`${API_BASE_URL}/courses`).then(r => r.json()),
          apiFetch(`${API_BASE_URL}/instructors`).then(r => r.json()),
        ]);
        setCourses(Array.isArray(resC) ? resC : []);
        setInstructors(Array.isArray(resI) ? resI : []);
      } catch {
        showToast("Failed to load data", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [showToast]);

  const saveBatch = async () => {
    if (!formData.course_id) { showToast("Select a course", "error"); return; }
    if (!formData.name.trim()) { showToast("Enter a batch name", "error"); return; }
    setSaving(true);
    try {
      const drips = Object.entries(contentDrip)
         .filter(([_, date]) => !!date)
         .map(([key, date]) => {
            if (key.startsWith("c_")) return { chapter_id: parseInt(key.replace("c_", "")), unlock_date: date };
            if (key.startsWith("m_")) return { material_id: parseInt(key.replace("m_", "")), unlock_date: date };
            return null;
         }).filter(Boolean);

      const payload = {
        ...formData,
        course_id:       parseInt(formData.course_id),
        discount_amount: formData.discount_amount ? parseFloat(formData.discount_amount as any) : 0,
        max_capacity:    parseInt(formData.max_capacity as any),
        start_date:      formData.start_date || null,
        end_date:        formData.end_date   || null,
        content_drip:    drips,
      };
      const res = await apiFetch(`${API_BASE_URL}/batches`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      const newBatch = await res.json();
      showToast("Batch created!", "success");
      onSuccess(newBatch.id);
    } catch {
      showToast("Error saving batch", "error");
    } finally {
      setSaving(false);
    }
  };

  /* ── Routine helpers ── */
  const addRoutine = () => setFormData(f => ({ ...f, routines: [...f.routines, { day_of_week: "Monday", start_time: "", end_time: "" }] }));
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

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 0, fontFamily: "Inter, system-ui, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: FLOAT_CSS }} />
      <style>{`
        @keyframes batchPop {
          from { transform: translateY(10px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
      <div style={{ position: "relative", width: "100%", height: "100%", background: "#f1f5f9", display: "flex", flexDirection: "column", overflow: "hidden", animation: "batchPop 0.2s ease-out" }}>

        {/* Modal Header */}
        <div style={{ padding: "22px 28px 18px", background: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,#0ea5e9,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
              <Icon name="layers" size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Create New Batch</h2>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>Configure a new batch for a course</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", width: 34, height: 34, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", cursor: "pointer" }}>
            <Icon name="x" size={15} />
          </button>
        </div>

        {/* Modal Body */}
        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>Loading form data...</div>
        ) : (
          <div className="custom-scroll" style={{ padding: "32px 28px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: "100%", maxWidth: 860, display: "flex", flexDirection: "column", gap: 24 }}>
            {/* ── Section: Basic Info ── */}
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "20px 22px" }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                <Icon name="info" size={14} /> Basic Information
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <FloatingSelect label="Linked Course *" value={formData.course_id} onChange={(v:any) => setFormData(f => ({ ...f, course_id: v }))}>
                    <option value="">Select a course…</option>
                    {courses.map(c => <option key={c.id} value={String(c.id)}>{c.title}</option>)}
                  </FloatingSelect>
                  <button
                    type="button"
                    onClick={() => setShowAddCourse(true)}
                    style={{ marginTop: 6, background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#0ea5e9", display: "inline-flex", alignItems: "center", gap: 4 }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Add New Course
                  </button>
                </div>
                <FloatingInput
                  label="Batch Name" value={formData.name} required autoFocus
                  onChange={(v:any) => setFormData(f => ({ ...f, name: v }))}
                />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <FloatingSelect label="Batch Mode" value={formData.mode} onChange={(v:any) => setFormData(f => ({ ...f, mode: v }))}>
                    <option value="pre_recoded">Pre-recorded</option>
                    <option value="live_class">Live Class</option>
                    <option value="Hybrid">Hybrid</option>
                  </FloatingSelect>
                  <FloatingSelect label="Batch Status" value={formData.status} onChange={(v:any) => setFormData(f => ({ ...f, status: v }))}>
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
                    onChange={(v:any) => setFormData(f => ({ ...f, meeting_url: v }))}
                  />
                )}
              </div>
            </div>

            {/* ── Section: Timeline & Capacity ── */}
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "20px 22px" }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: "0 0 18px", display: "flex", alignItems: "center", gap: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                <Icon name="calendar" size={14} /> Timeline & Parameters
              </h3>
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  <Icon name="users" size={14} /> Instructors
                </h3>
                <button
                  onClick={() => setShowAddTeacher(true)}
                  style={{ fontSize: 11, fontWeight: 700, color: "#0ea5e9", background: "#f0f9ff", border: "1px solid #bae6fd", display: "flex", alignItems: "center", gap: 4, padding: "5px 11px", borderRadius: 6, cursor: "pointer" }}
                >
                  <Icon name="plus" size={10} /> Add Teacher
                </button>
              </div>
              {instructors.length === 0 ? (
                <p style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic" }}>
                  No teachers yet.{" "}
                  <button onClick={() => setShowAddTeacher(true)} style={{ background: "none", border: "none", color: "#0ea5e9", cursor: "pointer", fontWeight: 700, padding: 0 }}>Add the first one →</button>
                </p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {instructors.map(ins => {
                    const active = formData.instructor_ids.includes(ins.id);
                    return (
                      <div
                        key={ins.id} onClick={() => toggleInstructor(ins.id)}
                        style={{
                          cursor: "pointer", padding: "7px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600,
                          border: `2px solid ${active ? "#0ea5e9" : "#e2e8f0"}`,
                          background: active ? "#f0f9ff" : "#fff", color: active ? "#0369a1" : "#475569",
                          display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s",
                        }}
                      >
                        {active && <Icon name="check" size={12} />}
                        {ins.name}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

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
                      <select value={r.day_of_week} onChange={e => updateRoutine(i, "day_of_week", e.target.value)}
                        style={{ padding: "7px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13, fontWeight: 600, outline: "none", flex: 1 }}>
                        {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map(d => <option key={d}>{d}</option>)}
                      </select>
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

            {/* ── Section: Drip Content (Curriculum Schedule) ── */}
            {formData.course_id && courseSubjects.length > 0 && (
            <div style={{ background: "#f0fdfa", borderRadius: 14, border: "1px solid #ccfbf1", padding: "20px 22px" }}>
              <div style={{ marginBottom: 14 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "#115e59", margin: 0, display: "flex", alignItems: "center", gap: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  <Icon name="calendar" size={14} /> Curriculum Schedule (Drip Content)
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#0f766e" }}>Set unlock dates for chapters and their materials. Leave blank to unlock immediately.</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {courseSubjects.map(sub => (
                  <div key={sub.id} style={{ background: "#fff", border: "1px solid #99f6e4", borderRadius: 10, overflow: "hidden" }}>
                    <div style={{ padding: "10px 14px", background: "#f0fdfa", borderBottom: "1px solid #ccfbf1", fontSize: 12, fontWeight: 700, color: "#115e59" }}>
                      {sub.name}
                    </div>
                    {(chaptersBySubject[sub.id] || []).map((ch: any) => (
                      <div key={ch.id}>
                        {/* Chapter Row */}
                        <div style={{ padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", background: "#fafbfc" }}>
                          <div style={{ fontSize: 13, color: "#334155", fontWeight: 700 }}>Chapter: {ch.title}</div>
                          <input 
                            type="date"
                            value={contentDrip[`c_${ch.id}`] || ""}
                            onChange={e => setContentDrip(prev => ({ ...prev, [`c_${ch.id}`]: e.target.value }))}
                            style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", outline: "none", fontSize: 12, fontFamily: "inherit" }}
                          />
                        </div>
                        {/* Material Rows */}
                        {(ch.materials || []).map((mat: any) => (
                          <div key={mat.id} style={{ padding: "6px 14px 6px 34px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9" }}>
                            <div style={{ fontSize: 12, color: "#475569", display: "flex", alignItems: "center", gap: 6 }}>
                              <Icon name={mat.file_type === 'video' || mat.file_type === 'youtube' ? 'video' : 'file-text'} size={12} color="#94a3b8" />
                              {mat.title}
                            </div>
                            <input 
                              type="date"
                              value={contentDrip[`m_${mat.id}`] || ""}
                              onChange={e => setContentDrip(prev => ({ ...prev, [`m_${mat.id}`]: e.target.value }))}
                              style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0", outline: "none", fontSize: 11, fontFamily: "inherit" }}
                            />
                          </div>
                        ))}
                      </div>
                    ))}
                    {(chaptersBySubject[sub.id] || []).length === 0 && (
                      <div style={{ padding: "8px 14px", fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>No chapters found.</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            )}

            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div style={{ padding: "16px 28px 22px", background: "#fff", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ padding: "10px 22px", borderRadius: 9, border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={saveBatch} disabled={saving}
            style={{ padding: "10px 30px", borderRadius: 9, border: "none", background: saving ? "#7dd3fc" : "linear-gradient(135deg,#0ea5e9,#6366f1)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: saving ? "not-allowed" : "pointer", boxShadow: saving ? "none" : "0 4px 14px rgba(14,165,233,0.3)", transition: "all 0.2s" }}>
            {saving ? "Deploying…" : "Deploy Batch"}
          </button>
        </div>
      </div>

      {/* ══ Quick Add Teacher Mini-Modal ══ */}
      {showAddTeacher && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10001, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.4)", backdropFilter: "blur(4px)" }} onClick={() => setShowAddTeacher(false)} />
          <div style={{ position: "relative", width: "100%", maxWidth: 440, background: "#fff", borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.18)", overflow: "hidden", animation: "batchPop 0.2s ease-out" }}>
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
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ position: "relative", border: "1.5px solid #e2e8f0", borderRadius: 10, background: "#f8fafc", transition: "border-color 0.2s" }}
                onFocusCapture={e => (e.currentTarget.style.borderColor = "#38bdf8")}
                onBlurCapture={e  => (e.currentTarget.style.borderColor = "#e2e8f0")}>
                <label style={{ position: "absolute", left: 14, top: teacherForm.name ? 4 : "50%", transform: teacherForm.name ? "none" : "translateY(-50%)", fontSize: teacherForm.name ? 10 : 14, fontWeight: teacherForm.name ? 700 : 400, color: teacherForm.name ? "#38bdf8" : "#94a3b8", transition: "all 0.15s", pointerEvents: "none", background: "transparent" }}>
                  Full Name <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input autoFocus value={teacherForm.name} onChange={e => setTeacherForm(f => ({ ...f, name: e.target.value }))}
                  style={{ display: "block", width: "100%", padding: teacherForm.name ? "20px 14px 6px" : "14px 14px", border: "none", outline: "none", fontSize: 14, background: "transparent", color: "#0f172a", borderRadius: 10, boxSizing: "border-box", fontFamily: "Inter, sans-serif" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "Email", key: "email" as const, type: "email" },
                  { label: "Phone", key: "phone" as const, type: "tel"   },
                ].map(({ label, key, type }) => (
                  <div key={key} style={{ position: "relative", border: "1.5px solid #e2e8f0", borderRadius: 10, background: "#f8fafc" }}
                    onFocusCapture={e => (e.currentTarget.style.borderColor = "#38bdf8")}
                    onBlurCapture={e  => (e.currentTarget.style.borderColor = "#e2e8f0")}>
                    <label style={{ position: "absolute", left: 12, top: teacherForm[key] ? 4 : "50%", transform: teacherForm[key] ? "none" : "translateY(-50%)", fontSize: teacherForm[key] ? 10 : 13, fontWeight: teacherForm[key] ? 700 : 400, color: teacherForm[key] ? "#38bdf8" : "#94a3b8", transition: "all 0.15s", pointerEvents: "none" }}>{label}</label>
                    <input type={type} value={teacherForm[key]} onChange={e => setTeacherForm(f => ({ ...f, [key]: e.target.value }))}
                      style={{ display: "block", width: "100%", padding: teacherForm[key] ? "18px 12px 5px" : "12px 12px", border: "none", outline: "none", fontSize: 13, background: "transparent", color: "#0f172a", borderRadius: 10, boxSizing: "border-box", fontFamily: "Inter, sans-serif" }} />
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: "12px 24px 20px", display: "flex", justifyContent: "flex-end", gap: 10, borderTop: "1px solid #f1f5f9", background: "#fafbfc" }}>
              <button onClick={() => setShowAddTeacher(false)} style={{ padding: "9px 20px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cancel</button>
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
    </div>
  );
}
