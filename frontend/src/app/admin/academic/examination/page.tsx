"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Icon } from "../../icons";
import { useToast } from "../../components/ToastProvider";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL } from "@/lib/config";
import { AdminProvider } from "../../components/ProtectedAdmin";
import "../../admin.css";

const FLOAT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  * { font-family: 'Inter', system-ui, sans-serif; box-sizing: border-box; }

  .cm-field-wrap { width: 100%; }
  .cm-field {
    position: relative; border: 1.5px solid #e2e8f0; border-radius: 10px;
    background: #f8fafc; transition: border-color 0.2s;
  }
  .cm-field.focused { border-color: #38bdf8; background: #fff; box-shadow: 0 0 0 3px rgba(56,189,248,0.12); }
  .cm-label {
    position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
    font-size: 14px; color: #94a3b8; pointer-events: none;
    transition: all 0.18s; background: transparent; padding: 0 3px;
  }
  .cm-label.up { top: 0; transform: translateY(-50%); font-size: 11px; font-weight: 600; color: #38bdf8; background: #fff; }
  .cm-inp {
    display: block; width: 100%; padding: 20px 14px 8px; border: none; outline: none;
    font-size: 14px; color: #0f172a; background: transparent; border-radius: 10px;
    -webkit-appearance: none; cursor: pointer;
  }
  
  @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  .slide-up { animation: slideUp 0.2s ease-out; }
  
  @keyframes popIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  .pop-in { animation: popIn 0.18s ease-out; }

  .status-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
  .status-scheduled { background: #eff6ff; color: #2563eb; }
  .status-active { background: #f0fdf4; color: #16a34a; }
  .status-completed { background: #f3f4f6; color: #6b7280; }
  .status-cancelled { background: #fef2f2; color: #dc2626; }
`;

function FloatingSelect({ label, value, onChange, children }: any) {
  const [focused, setFocused] = useState(false);
  // <select> always displays a visible option, so the label must always stay at top
  return (
    <div className="cm-field-wrap">
      <div className={`cm-field${focused ? " focused" : ""}`}>
        <label className="cm-label up">{label}</label>
        <select className="cm-inp" value={value} onChange={onChange}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
          {children}
        </select>
        <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#94a3b8" }}>
          <Icon name="chevron-down" size={16} />
        </div>
      </div>
    </div>
  );
}

function FloatingInput({ label, type = "text", value, onChange, ...rest }: any) {
  const [focused, setFocused] = useState(false);
  // datetime/date/time/number inputs always show browser chrome, so lift label
  const alwaysUp = ["datetime-local", "date", "time", "number"].includes(type);
  const lifted = alwaysUp || focused || (value !== undefined && value !== "");
  return (
    <div className="cm-field-wrap">
      <div className={`cm-field${focused ? " focused" : ""}`}>
        <label className={`cm-label${lifted ? " up" : ""}`}>{label}</label>
        <input className="cm-inp" type={type} value={value} onChange={onChange}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} {...rest} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    scheduled: "status-scheduled",
    active: "status-active",
    completed: "status-completed",
    cancelled: "status-cancelled",
  };
  const icons: Record<string, string> = {
    scheduled: "🗓",
    active: "🟢",
    completed: "✅",
    cancelled: "❌",
  };
  return (
    <span className={`status-badge ${map[status] || "status-scheduled"}`}>
      {icons[status] || "🗓"} {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── ASSIGN MODAL ─────────────────────────────────────

function AssignModal({ batches, exams, chapters, materials, onClose, onSave, editing, selectedBatchId }: any) {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    batch_id: editing?.batch_id ? String(editing.batch_id) : selectedBatchId ? String(selectedBatchId) : "",
    exam_id: editing?.exam_id ? String(editing.exam_id) : "",
    scheduled_start: editing?.scheduled_start ? editing.scheduled_start.slice(0, 16) : "",
    scheduled_end: editing?.scheduled_end ? editing.scheduled_end.slice(0, 16) : "",
    pass_marks: editing?.pass_marks ? String(editing.pass_marks) : "",
    duration_mins: editing?.duration_mins ? String(editing.duration_mins) : "",
    notes: editing?.notes || "",
    status: editing?.status || "scheduled",
    unlock_condition_type: editing?.unlock_condition_type || "",
    unlock_condition_value: editing?.unlock_condition_value ? String(editing.unlock_condition_value) : "",
  });
  const [saving, setSaving] = useState(false);

  const selectedExam = useMemo(() => exams.find((e: any) => String(e.id) === form.exam_id), [exams, form.exam_id]);

  const handleSave = async () => {
    if (!form.batch_id || !form.exam_id) {
      showToast("Please select both Batch and Exam.", "error"); return;
    }
    setSaving(true);
    try {
      const payload = {
        batch_id: Number(form.batch_id),
        exam_id: Number(form.exam_id),
        scheduled_start: form.scheduled_start || null,
        scheduled_end: form.scheduled_end || null,
        pass_marks: form.pass_marks ? Number(form.pass_marks) : null,
        duration_mins: form.duration_mins ? Number(form.duration_mins) : null,
        notes: form.notes || null,
        status: form.status,
        unlock_condition_type: form.unlock_condition_type || null,
        unlock_condition_value: form.unlock_condition_value ? Number(form.unlock_condition_value) : null,
      };

      let res;
      if (editing) {
        res = await apiFetch(`${API_BASE_URL}/exams/assignments/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await apiFetch(`${API_BASE_URL}/exams/assignments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Failed to save");
      }
      showToast(editing ? "Assignment updated!" : "Exam assigned to batch!", "success");
      onSave();
      onClose();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div className="pop-in" style={{
        position: "relative",
        width: "70vw",
        maxWidth: 900,
        minWidth: 480,
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        background: "#fff",
        borderRadius: 20,
        boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 28px", borderBottom: "1px solid #f1f5f9", background: "#fafbfc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{editing ? "Edit Assignment" : "Assign Exam to Batch"}</h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>Schedule an exam for a specific batch</p>
          </div>
          <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", cursor: "pointer" }}>
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: 18, overflowY: "auto", flex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: selectedBatchId && !editing ? "1fr" : "1fr 1fr", gap: 16 }}>
            {(!selectedBatchId || editing) && (
              <FloatingSelect label="Select Batch *" value={form.batch_id} onChange={(e: any) => setForm({ ...form, batch_id: e.target.value })} disabled={!!selectedBatchId}>
                <option value="" disabled hidden></option>
                {batches.map((b: any) => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
              </FloatingSelect>
            )}
            <FloatingSelect label="Select Exam *" value={form.exam_id} onChange={(e: any) => setForm({ ...form, exam_id: e.target.value })}>
              <option value="" disabled hidden></option>
              {exams.map((e: any) => <option key={e.id} value={String(e.id)}>{e.title} ({e.question_count}Q)</option>)}
            </FloatingSelect>
          </div>

          {selectedExam && (
            <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "12px 14px", display: "flex", gap: 16, alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0c4a6e" }}>{selectedExam.title}</div>
                <div style={{ fontSize: 11, color: "#0369a1", marginTop: 2 }}>
                  {selectedExam.question_count} Questions · Pass: {selectedExam.pass_percentage}% · {selectedExam.exam_type || "General"}
                </div>
              </div>
              <span className={`status-badge status-${selectedExam.status.toLowerCase()}`}>{selectedExam.status}</span>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <FloatingInput label="Start Date & Time" type="datetime-local" value={form.scheduled_start} onChange={(e: any) => setForm({ ...form, scheduled_start: e.target.value })} />
            <FloatingInput label="End Date & Time" type="datetime-local" value={form.scheduled_end} onChange={(e: any) => setForm({ ...form, scheduled_end: e.target.value })} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <FloatingInput label="Pass Marks (override)" type="number" value={form.pass_marks} onChange={(e: any) => setForm({ ...form, pass_marks: e.target.value })} />
            <FloatingInput label="Duration (minutes)" type="number" value={form.duration_mins} onChange={(e: any) => setForm({ ...form, duration_mins: e.target.value })} />
          </div>

          <FloatingSelect label="Status" value={form.status} onChange={(e: any) => setForm({ ...form, status: e.target.value })}>
            <option value="scheduled">Scheduled</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </FloatingSelect>

          <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 700, color: "#475569" }}>Unlock Condition (Optional)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <FloatingSelect label="Condition Type" value={form.unlock_condition_type} onChange={(e: any) => setForm({ ...form, unlock_condition_type: e.target.value, unlock_condition_value: "" })}>
                <option value="">None (Always Unlocked)</option>
                <option value="chapter">Must Complete Chapter</option>
                <option value="material">Must Complete Material (Video/PDF)</option>
              </FloatingSelect>

              {form.unlock_condition_type === "chapter" && (
                <FloatingSelect label="Select Chapter" value={form.unlock_condition_value} onChange={(e: any) => setForm({ ...form, unlock_condition_value: e.target.value })}>
                  <option value="" disabled hidden>Choose Chapter...</option>
                  {chapters.map((c: any) => <option key={c.id} value={String(c.id)}>{c.title}</option>)}
                </FloatingSelect>
              )}
              
              {form.unlock_condition_type === "material" && (
                <FloatingSelect label="Select Material" value={form.unlock_condition_value} onChange={(e: any) => setForm({ ...form, unlock_condition_value: e.target.value })}>
                  <option value="" disabled hidden>Choose Material...</option>
                  {materials.map((m: any) => <option key={m.id} value={String(m.id)}>{m.title} ({m.file_type})</option>)}
                </FloatingSelect>
              )}
            </div>
          </div>

          <div className="cm-field-wrap">
            <div className="cm-field" style={{ padding: "20px 14px 10px" }}>
              <label className="cm-label up">Notes (optional)</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                style={{ border: "none", outline: "none", background: "transparent", width: "100%", fontSize: 14, color: "#0f172a", resize: "none", minHeight: 60, fontFamily: "inherit" }} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 28px", borderTop: "1px solid #f1f5f9", background: "#fafbfc", display: "flex", gap: 12 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", border: "1.5px solid #e2e8f0", background: "#fff", borderRadius: 10, fontWeight: 700, fontSize: 14, color: "#475569", cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: "12px", border: "none", background: "linear-gradient(135deg, #0ea5e9, #6366f1)", borderRadius: 10, fontWeight: 700, fontSize: 14, color: "#fff", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving..." : (editing ? "Update Assignment" : "Assign Exam")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────

function ExaminationContent() {
  const { showToast } = useToast();
  const [batches, setBatches] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [bRes, eRes, cRes, mRes] = await Promise.all([
        apiFetch(`${API_BASE_URL}/batches`),
        apiFetch(`${API_BASE_URL}/exams`),
        apiFetch(`${API_BASE_URL}/chapters`),
        apiFetch(`${API_BASE_URL}/materials`),
      ]);
      if (bRes.ok) setBatches(await bRes.json());
      if (eRes.ok) setExams(await eRes.json());
      if (cRes.ok) setChapters(await cRes.json());
      if (mRes.ok) setMaterials(await mRes.json());
    } catch { showToast("Failed to load data", "error"); }
    finally { setLoading(false); }
  }, []);

  const fetchAssignments = useCallback(async (batchId: string) => {
    if (!batchId) { setAssignments([]); return; }
    try {
      const res = await apiFetch(`${API_BASE_URL}/exams/assignments/batch/${batchId}`);
      if (res.ok) setAssignments(await res.json());
    } catch { showToast("Failed to load assignments", "error"); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchAssignments(selectedBatchId); }, [selectedBatchId, fetchAssignments]);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await apiFetch(`${API_BASE_URL}/exams/assignments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      showToast("Assignment removed.", "success");
      fetchAssignments(selectedBatchId);
      setConfirmDeleteId(null);
    } catch { showToast("Failed to remove assignment.", "error"); }
    finally { setDeletingId(null); }
  };

  const selectedBatch = batches.find(b => String(b.id) === selectedBatchId);

  const filteredAssignments = filterStatus
    ? assignments.filter(a => a.status === filterStatus)
    : assignments;

  // Summary stats
  const stats = {
    total: assignments.length,
    scheduled: assignments.filter(a => a.status === "scheduled").length,
    active: assignments.filter(a => a.status === "active").length,
    completed: assignments.filter(a => a.status === "completed").length,
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading...</div>;

  return (
    <div className="manager-content" style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 120px)" }}>
      <style dangerouslySetInnerHTML={{ __html: FLOAT_CSS }} />

      {/* Header */}
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px" }}>Examination</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Assign exams to batches and manage schedules.</p>
      </header>

      {/* Controls */}
      <div style={{ background: "#fff", padding: "16px 20px", borderRadius: 16, border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: 24, display: "flex", gap: 12, alignItems: "stretch", flexWrap: "wrap" }}>
        {/* Batch Dropdown */}
        <div style={{ flex: 1, minWidth: 260 }}>
          <FloatingSelect label="Select a Batch" value={selectedBatchId} onChange={(e: any) => { setSelectedBatchId(e.target.value); setFilterStatus(""); }}>
            <option value="" disabled hidden></option>
            {batches.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
          </FloatingSelect>
        </div>

        {/* Status Filter */}
        {selectedBatchId && (
          <div style={{ width: 180 }}>
            <FloatingSelect label="Filter by Status" value={filterStatus} onChange={(e: any) => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </FloatingSelect>
          </div>
        )}

        {/* Assign Button — same height as floating fields */}
        {selectedBatchId && (
          <button onClick={() => { setEditingAssignment(null); setShowModal(true); }}
            style={{
              background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
              color: "#fff", border: "none", padding: "0 24px", borderRadius: 10,
              fontWeight: 700, fontSize: 14, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8,
              flexShrink: 0, whiteSpace: "nowrap",
              boxShadow: "0 4px 12px rgba(99,102,241,0.25)",
              minHeight: 52,
            }}>
            <Icon name="plus" size={16} /> Assign Exam
          </button>
        )}

        {/* Reset Button */}
        {(selectedBatchId || filterStatus !== "") && (
          <button onClick={() => { setSelectedBatchId(""); setFilterStatus(""); }}
            style={{
              background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca", 
              padding: "0 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, 
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6, 
              minHeight: 52
            }}>
            <Icon name="x" size={14} /> Reset
          </button>
        )}
      </div>

      {/* No batch selected */}
      {!selectedBatchId && (
        <div style={{ 
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", 
          background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)", 
          borderRadius: 24, border: "1px solid #e2e8f0", padding: "80px 40px", 
          boxShadow: "0 10px 40px -10px rgba(0,0,0,0.05)" 
        }}>
          <div style={{ 
            width: 96, height: 96, background: "linear-gradient(135deg, #eff6ff, #dbeafe)", 
            borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", 
            color: "#3b82f6", marginBottom: 28, 
            boxShadow: "0 0 0 10px rgba(59,130,246,0.05), 0 4px 20px rgba(59,130,246,0.15)" 
          }}>
            <Icon name="file-text" size={44} />
          </div>
          <h3 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: "0 0 12px", letterSpacing: "-0.5px" }}>Ready to Schedule Exams?</h3>
          <p style={{ fontSize: 15, color: "#64748b", margin: 0, textAlign: "center", maxWidth: 400, lineHeight: 1.6 }}>
            Select a batch from the dropdown menu above to create assignments, manage schedules, and track student assessments.
          </p>
          <div style={{ 
            marginTop: 36, display: "flex", alignItems: "center", gap: 10, 
            padding: "12px 24px", background: "#fff", borderRadius: 100, 
            border: "1px solid #e2e8f0", color: "#475569", fontSize: 14, fontWeight: 700, 
            boxShadow: "0 4px 12px rgba(0,0,0,0.03)" 
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: 12, background: "#f1f5f9", color: "#64748b" }}>
              <Icon name="arrow-up" size={14} />
            </div>
            Choose a batch to get started
          </div>
        </div>
      )}

      {/* Batch selected */}
      {selectedBatch && (
        <div className="slide-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
            {[
              { label: "Total Exams", value: stats.total, color: "#6366f1", bg: "#f5f3ff", icon: "📋" },
              { label: "Scheduled", value: stats.scheduled, color: "#2563eb", bg: "#eff6ff", icon: "🗓" },
              { label: "Active", value: stats.active, color: "#16a34a", bg: "#f0fdf4", icon: "🟢" },
              { label: "Completed", value: stats.completed, color: "#6b7280", bg: "#f9fafb", icon: "✅" },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: "18px 20px", border: `1px solid ${s.color}22` }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Assignment List */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #f1f5f9", background: "#fafbfc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                Exam Assignments — {selectedBatch.name}
              </h2>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>{filteredAssignments.length} exam(s)</span>
            </div>

            <div style={{ padding: "16px" }}>
              {filteredAssignments.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>No exams assigned to this batch yet.</div>
                  <div style={{ fontSize: 12, marginTop: 6 }}>Click "Assign Exam" to get started.</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {filteredAssignments.map((a: any) => (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", background: "#fafbfc", borderRadius: 12, border: "1px solid #f1f5f9", transition: "all 0.2s" }}>
                      {/* Icon */}
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #6366f1, #0ea5e9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                        📋
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{a.exam_title}</span>
                          <StatusBadge status={a.status} />
                        </div>
                        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                            📝 {a.question_count} Questions
                          </span>
                          {a.scheduled_start && (
                            <span style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                              🗓 {new Date(a.scheduled_start).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                          {a.duration_mins && (
                            <span style={{ fontSize: 12, color: "#64748b" }}>⏱ {a.duration_mins} min</span>
                          )}
                          {a.pass_marks && (
                            <span style={{ fontSize: 12, color: "#64748b" }}>🎯 Pass: {a.pass_marks}%</span>
                          )}
                          {a.unlock_condition_type && (
                            <span style={{ fontSize: 12, color: "#d97706", display: "flex", alignItems: "center", gap: 4, background: "#fef3c7", padding: "2px 6px", borderRadius: 4 }}>
                              🔒 Requires {a.unlock_condition_type === "chapter" ? "Chapter" : "Material"} Completion
                            </span>
                          )}
                        </div>
                        {a.notes && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>📌 {a.notes}</div>}
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        <button onClick={() => { setEditingAssignment(a); setShowModal(true); }}
                          style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                          <Icon name="edit" size={13} /> Edit
                        </button>
                        <button onClick={() => setConfirmDeleteId(a.id)} disabled={deletingId === a.id}
                          style={{ background: "transparent", color: "#ef4444", border: "none", padding: "7px 10px", borderRadius: 8, cursor: deletingId === a.id ? "not-allowed" : "pointer", opacity: deletingId === a.id ? 0.5 : 1 }}>
                          <Icon name="trash" size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showModal && (
        <AssignModal
          batches={batches}
          exams={exams}
          chapters={chapters}
          materials={materials}
          editing={editingAssignment}
          selectedBatchId={selectedBatchId}
          onClose={() => { setShowModal(false); setEditingAssignment(null); }}
          onSave={() => fetchAssignments(selectedBatchId)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId !== null && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)" }} onClick={() => { if (deletingId === null) setConfirmDeleteId(null); }} />
          <div className="pop-in" style={{
            position: "relative", width: 400, maxWidth: "100%", background: "#fff", borderRadius: 20, 
            boxShadow: "0 24px 60px rgba(0,0,0,0.18)", padding: "32px 28px", textAlign: "center"
          }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", color: "#dc2626" }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Remove Assignment?</h3>
            <p style={{ margin: "0 0 24px", fontSize: 14, color: "#64748b", lineHeight: 1.6 }}>
              This action is permanent and cannot be undone.<br/>Are you sure you want to remove this exam from the batch?
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setConfirmDeleteId(null)} disabled={deletingId !== null} style={{ flex: 1, padding: "10px 24px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 14, fontWeight: 700, cursor: deletingId !== null ? "not-allowed" : "pointer" }}>Cancel</button>
              <button onClick={() => handleDelete(confirmDeleteId)} disabled={deletingId !== null} style={{ flex: 1, padding: "10px 24px", borderRadius: 10, border: "none", background: "#dc2626", color: "#fff", fontSize: 14, fontWeight: 700, cursor: deletingId !== null ? "not-allowed" : "pointer", opacity: deletingId !== null ? 0.7 : 1 }}>
                {deletingId !== null ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExaminationPage() {
  return (
    <AdminProvider>
      <ExaminationContent />
    </AdminProvider>
  );
}
