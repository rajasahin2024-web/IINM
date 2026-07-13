"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Icon } from "../../icons";
import { useToast } from "../../components/ToastProvider";
import BatchCreateModal from "../../components/BatchCreateModal";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL } from "@/lib/config";
import { AdminProvider } from "../../components/ProtectedAdmin";
import "../../admin.css";

// ─── FLOAT CSS ────────────────────────────────────────────────────────
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
    -webkit-appearance: none;
  }
  
  .cm-inp:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

// ─── REUSABLE COMPONENTS ──────────────────────────────────────────
function FloatingInput({ label, type = "text", value, onChange, placeholder = "", disabled = false, icon = null }: any) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || (value && value.toString().length > 0) || !!placeholder;

  return (
    <div className="cm-field-wrap">
      <div className={`cm-field${focused ? " focused" : ""}`} style={{ opacity: disabled ? 0.6 : 1 }}>
        {icon && (
          <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>
            {icon}
          </div>
        )}
        <label className={`cm-label${lifted ? " up" : ""}`} style={{ left: icon ? 40 : 14 }}>
          {label}
        </label>
        <input
          type={type}
          className="cm-inp"
          style={{ paddingLeft: icon ? 40 : 14 }}
          value={value}
          disabled={disabled}
          placeholder={focused ? placeholder : ""}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </div>
    </div>
  );
}

function FloatingSelect({ label, value, onChange, children, disabled = false }: any) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || (value && value.toString().length > 0);

  return (
    <div className="cm-field-wrap">
      <div className={`cm-field${focused ? " focused" : ""}`} style={{ opacity: disabled ? 0.6 : 1 }}>
        <label className={`cm-label${lifted ? " up" : ""}`}>
          {label}
        </label>
        <select
          className="cm-inp"
          value={value}
          disabled={disabled}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ cursor: disabled ? "not-allowed" : "pointer" }}
        >
          {children}
        </select>
        <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#94a3b8" }}>
          <Icon name="chevron-down" size={16} />
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────
function BatchAssignContent() {
  const { showToast } = useToast();
  
  const [batches, setBatches] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateBatch, setShowCreateBatch] = useState(false);
  
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [processingBulk, setProcessingBulk] = useState(false);

  // New States for Advanced Features
  const [coursePurchases, setCoursePurchases] = useState<any[]>([]);
  const [selectedAvailable, setSelectedAvailable] = useState<Set<number>>(new Set());
  const [selectedEnrolled, setSelectedEnrolled] = useState<Set<number>>(new Set());
  const [quickViewStudent, setQuickViewStudent] = useState<any | null>(null);

  // Download Attendance Sheet
  const handleDownloadList = () => {
    if (!selectedBatch || enrolledStudentsData.length === 0) return;
    
    const headers = ["SL", "First Name", "Last Name", "Email", "Phone", "Status"];
    const rows = enrolledStudentsData.map((s: any, i: number) => [
      i + 1,
      s.first_name,
      s.last_name || "",
      s.email,
      s.phone || "N/A",
      s.enrollment_status || "Enrolled"
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map((r: any[]) => r.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${selectedBatch.name}_Attendance_Sheet.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      const [batchesRes, studentsRes] = await Promise.all([
        apiFetch(`${API_BASE_URL}/batches`),
        apiFetch(`${API_BASE_URL}/students/`)
      ]);
      
      if (batchesRes.ok) setBatches(await batchesRes.json());
      if (studentsRes.ok) setStudents(await studentsRes.json());
    } catch (err) {
      console.error(err);
      showToast("Failed to fetch data", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedBatch = useMemo(() => {
    return batches.find(b => String(b.id) === selectedBatchId) || null;
  }, [batches, selectedBatchId]);

  // Fetch purchases when batch changes (Course Validation)
  useEffect(() => {
    if (selectedBatch) {
      apiFetch(`${API_BASE_URL}/academic/purchases?course_id=${selectedBatch.course_id}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setCoursePurchases(data))
        .catch(() => setCoursePurchases([]));
    } else {
      setCoursePurchases([]);
    }
    // Reset selections on batch change
    setSelectedAvailable(new Set());
    setSelectedEnrolled(new Set());
  }, [selectedBatch]);

  // Determine Enrolled vs Available Students
  const enrolledStudentIds = useMemo(() => {
    if (!selectedBatch) return new Set<number>();
    return new Set(selectedBatch.enrollments.map((e: any) => e.student.id));
  }, [selectedBatch]);

  const enrolledStudentsData = useMemo(() => {
    if (!selectedBatch) return [];
    return selectedBatch.enrollments.map((e: any) => {
       const fullStudent = students.find(s => s.id === e.student.id) || e.student;
       return { ...fullStudent, enrollment_status: e.status }; // Inject waitlist status
    });
  }, [selectedBatch, students]);

  const availableStudentsData = useMemo(() => {
    if (!selectedBatch) return [];
    // Only students who purchased the course and are not enrolled
    const purchasedStudentIds = new Set(coursePurchases.map(p => p.student_id));
    return students.filter(s => purchasedStudentIds.has(s.id) && !enrolledStudentIds.has(s.id)).map(s => {
      const purchaseInfo = coursePurchases.find(p => p.student_id === s.id);
      return { ...s, purchase_status: purchaseInfo?.status, due_amount: purchaseInfo?.due_amount };
    });
  }, [students, enrolledStudentIds, selectedBatch, coursePurchases]);

  // Search Filter
  const filteredAvailableStudents = useMemo(() => {
    if (!searchQuery.trim()) return availableStudentsData;
    const q = searchQuery.toLowerCase();
    return availableStudentsData.filter(s => 
      `${s.first_name} ${s.last_name || ""}`.toLowerCase().includes(q) ||
      (s.email || "").toLowerCase().includes(q) ||
      (s.phone || "").includes(q)
    );
  }, [availableStudentsData, searchQuery]);

  // Checkbox Handlers
  const toggleSelectAvailable = (id: number) => {
    const next = new Set(selectedAvailable);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedAvailable(next);
  };

  const toggleSelectEnrolled = (id: number) => {
    const next = new Set(selectedEnrolled);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedEnrolled(next);
  };

  // Actions
  const handleAssign = async (student: any) => {
    if (!selectedBatch) return;
    setProcessingId(student.id);
    try {
      const res = await apiFetch(`${API_BASE_URL}/batches/${selectedBatch.id}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: student.email }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Failed to enroll student");
      }
      const data = await res.json();
      showToast(data.message, data.message.includes("waitlist") ? "warning" : "success");
      await fetchData(); 
      setSelectedAvailable(prev => { const n = new Set(prev); n.delete(student.id); return n; });
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleBulkAssign = async () => {
    if (!selectedBatch || selectedAvailable.size === 0) return;
    setProcessingBulk(true);
    let successCount = 0;
    try {
      const studentsToAssign = availableStudentsData.filter(s => selectedAvailable.has(s.id));
      for (const st of studentsToAssign) {
        const res = await apiFetch(`${API_BASE_URL}/batches/${selectedBatch.id}/enroll`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: st.email }),
        });
        if (res.ok) successCount++;
      }
      if (successCount > 0) {
        showToast(`Successfully processed ${successCount} students.`, "success");
        await fetchData();
        setSelectedAvailable(new Set());
      }
    } catch (err: any) {
      showToast("Error processing some students.", "error");
    } finally {
      setProcessingBulk(false);
    }
  };

  const handleRemove = async (student: any) => {
    if (!selectedBatch) return;
    setProcessingId(student.id);
    try {
      const res = await apiFetch(`${API_BASE_URL}/batches/${selectedBatch.id}/unenroll/${student.id}`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Failed to remove student");
      }
      showToast(`${student.first_name} has been removed from the batch.`, "success");
      await fetchData(); 
      setSelectedEnrolled(prev => { const n = new Set(prev); n.delete(student.id); return n; });
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleBulkRemove = async () => {
    if (!selectedBatch || selectedEnrolled.size === 0) return;
    setProcessingBulk(true);
    let successCount = 0;
    try {
      for (const stId of selectedEnrolled) {
        const res = await apiFetch(`${API_BASE_URL}/batches/${selectedBatch.id}/unenroll/${stId}`, { method: "POST" });
        if (res.ok) successCount++;
      }
      if (successCount > 0) {
        showToast(`Successfully removed ${successCount} students.`, "success");
        await fetchData();
        setSelectedEnrolled(new Set());
      }
    } catch (err: any) {
      showToast("Error removing some students.", "error");
    } finally {
      setProcessingBulk(false);
    }
  };

  // Drag and Drop Handlers
  const onDragStart = (e: React.DragEvent, studentId: number, source: 'available' | 'enrolled') => {
    e.dataTransfer.setData("studentId", String(studentId));
    e.dataTransfer.setData("source", source);
  };

  const onDrop = (e: React.DragEvent, target: 'available' | 'enrolled') => {
    e.preventDefault();
    const studentId = parseInt(e.dataTransfer.getData("studentId"));
    const source = e.dataTransfer.getData("source");
    
    if (source === target || !studentId) return;
    
    if (target === 'enrolled') {
      const student = availableStudentsData.find((s: any) => s.id === studentId);
      if (student) handleAssign(student);
    } else {
      const student = enrolledStudentsData.find((s: any) => s.id === studentId);
      if (student) handleRemove(student);
    }
  };

  const activeCount = enrolledStudentsData.filter((s: any) => s.enrollment_status !== "waitlisted").length;
  const isFull = activeCount >= (selectedBatch?.max_capacity || 0);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)" }}>
        {/* Header Skeleton */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexShrink: 0 }}>
          <div>
            <div className="skeleton" style={{ width: 180, height: 28, borderRadius: 6, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: 280, height: 14, borderRadius: 4 }} />
          </div>
        </div>
        {/* Filter Bar Skeleton */}
        <div className="skeleton" style={{ height: 76, borderRadius: 16, marginBottom: 24, flexShrink: 0 }} />
        {/* Two Columns Skeleton */}
        <div style={{ display: "flex", gap: 24, flex: 1 }}>
          <div className="skeleton" style={{ flex: 1, borderRadius: 16 }} />
          <div className="skeleton" style={{ flex: 1, borderRadius: 16 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="manager-content" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)" }}>
      <style dangerouslySetInnerHTML={{ __html: FLOAT_CSS }} />
      
      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexShrink: 0 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px" }}>Batch Assign</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Allocate students to active batches easily.</p>
        </div>
      </header>

      {/* Top Filter Bar */}
      <div style={{ background: "#fff", padding: "20px 24px", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9", marginBottom: 24, flexShrink: 0, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ maxWidth: 400, flex: 1 }}>
          <FloatingSelect 
            label="Select a Batch to Manage" 
            value={selectedBatchId} 
            onChange={(e: any) => { setSelectedBatchId(e.target.value); setSearchQuery(""); }}
          >
            <option value="" disabled hidden></option>
            {batches.map(b => (
              <option key={b.id} value={String(b.id)}>
                {b.name} ({b.enrollments?.filter((e:any) => e.status !== "waitlisted").length || 0}/{b.max_capacity} Enrolled)
              </option>
            ))}
          </FloatingSelect>
        </div>
        {selectedBatchId && (
          <button
            onClick={() => { setSelectedBatchId(""); setSearchQuery(""); setSelectedAvailable(new Set()); setSelectedEnrolled(new Set()); }}
            style={{ background: "#f1f5f9", color: "#64748b", padding: "12px 18px", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "background 0.2s", flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.background = "#e2e8f0"}
            onMouseLeave={e => e.currentTarget.style.background = "#f1f5f9"}
          >
            <Icon name="x" size={14} /> Clear Selection
          </button>
        )}
        <button
          onClick={() => setShowCreateBatch(true)}
          style={{ background: "#0ea5e9", color: "#fff", padding: "12px 24px", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 12px rgba(14,165,233,0.25)", flexShrink: 0 }}
        >
          <Icon name="plus" size={16} /> Create New Batch
        </button>
      </div>

      {/* Two Column Layout */}
      {selectedBatch ? (
        <div style={{ display: "flex", gap: 24, flex: 1, minHeight: 0 }}>
          
          {/* LEFT COLUMN: Available Students */}
          <div 
            style={{ flex: 1, background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, 'available')}
          >
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Available Students</h2>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#38bdf8", background: "#f0f9ff", padding: "2px 8px", borderRadius: 12 }}>
                  {filteredAvailableStudents.length} course buyers
                </span>
              </div>
              <FloatingInput 
                label="Search by Name, Email or Phone" 
                value={searchQuery}
                onChange={(e: any) => setSearchQuery(e.target.value)}
                icon={<Icon name="search" size={16} />}
              />
              
              {selectedAvailable.size > 0 && (
                <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", background: "#eff6ff", padding: "8px 12px", borderRadius: 8, border: "1px solid #bfdbfe" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#1d4ed8" }}>{selectedAvailable.size} selected</span>
                  <button onClick={handleBulkAssign} disabled={processingBulk} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: processingBulk ? "not-allowed" : "pointer" }}>
                    {processingBulk ? "Processing..." : `Assign Selected`}
                  </button>
                </div>
              )}
            </div>
            
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px", background: "#fafbfc" }}>
              {filteredAvailableStudents.length === 0 ? (
                <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 0", fontSize: 14 }}>
                  <Icon name="users" size={32} />
                  <div style={{ marginTop: 12 }}>{coursePurchases.length === 0 ? "No students have purchased this course yet." : "All course buyers are already enrolled."}</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {filteredAvailableStudents.map(student => (
                    <div 
                      key={student.id} 
                      draggable 
                      onDragStart={(e) => onDragStart(e, student.id, 'available')}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px", background: selectedAvailable.has(student.id) ? "#f0f9ff" : "#fff", border: `1px solid ${selectedAvailable.has(student.id) ? "#93c5fd" : "#f1f5f9"}`, borderRadius: 12, boxShadow: "0 1px 2px rgba(0,0,0,0.02)", transition: "all 0.2s", cursor: "grab" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <input type="checkbox" checked={selectedAvailable.has(student.id)} onChange={() => toggleSelectAvailable(student.id)} style={{ width: 16, height: 16, accentColor: "#0ea5e9", cursor: "pointer" }} />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
                            {student.first_name} {student.last_name || ""}
                            <button onClick={() => setQuickViewStudent(student)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }} title="Quick View">
                              <Icon name="eye" size={14} />
                            </button>
                          </div>
                          <div style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Icon name="mail" size={12} /> {student.email}</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleAssign(student)}
                        disabled={processingId === student.id || (isFull && !selectedBatch.enable_waitlist)}
                        style={{ 
                          background: "#eff6ff", color: "#3b82f6", border: "1px solid #bfdbfe", padding: "6px 14px", 
                          borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: (processingId === student.id || (isFull && !selectedBatch.enable_waitlist)) ? "not-allowed" : "pointer", 
                          display: "flex", alignItems: "center", gap: 6, opacity: (processingId === student.id || (isFull && !selectedBatch.enable_waitlist)) ? 0.6 : 1, transition: "all 0.2s" 
                        }}
                      >
                        {processingId === student.id ? "Adding..." : (isFull && selectedBatch.enable_waitlist ? "Waitlist" : <><Icon name="plus" size={14} /> Add</>)}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Enrolled Students */}
          <div 
            style={{ flex: 1, background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, 'enrolled')}
          >
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Enrolled in {selectedBatch.name}</h2>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Active: {activeCount} / {selectedBatch.max_capacity}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button 
                    onClick={handleDownloadList} 
                    disabled={enrolledStudentsData.length === 0}
                    style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#475569", display: "flex", alignItems: "center", gap: 6, cursor: enrolledStudentsData.length === 0 ? "not-allowed" : "pointer", opacity: enrolledStudentsData.length === 0 ? 0.6 : 1, transition: "all 0.2s" }}
                  >
                    <Icon name="download" size={14} /> Download CSV
                  </button>
                  <div style={{ width: 44, height: 44, borderRadius: 22, border: "3px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: isFull ? "#ef4444" : "#10b981", borderColor: isFull ? "#fecaca" : "#a7f3d0", background: "#fff" }}>
                    {Math.round((activeCount / selectedBatch.max_capacity) * 100)}%
                  </div>
                </div>
              </div>
              
              {selectedEnrolled.size > 0 && (
                <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fef2f2", padding: "8px 12px", borderRadius: 8, border: "1px solid #fecaca" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#b91c1c" }}>{selectedEnrolled.size} selected</span>
                  <button onClick={handleBulkRemove} disabled={processingBulk} style={{ background: "#ef4444", color: "#fff", border: "none", padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: processingBulk ? "not-allowed" : "pointer" }}>
                    {processingBulk ? "Processing..." : `Remove Selected`}
                  </button>
                </div>
              )}
            </div>
            
            <div style={{ flex: 1, overflowY: "auto", padding: "20px", background: "#fff" }}>
              {enrolledStudentsData.length === 0 ? (
                <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 0", fontSize: 14 }}>
                  <Icon name="user-check" size={32} />
                  <div style={{ marginTop: 12 }}>No students enrolled in this batch yet.</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {enrolledStudentsData.map((student: any, i: number) => {
                    const isWaitlisted = student.enrollment_status === "waitlisted";
                    return (
                      <div 
                        key={student.id} 
                        draggable 
                        onDragStart={(e) => onDragStart(e, student.id, 'enrolled')}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: isWaitlisted ? "#fff7ed" : (selectedEnrolled.has(student.id) ? "#fef2f2" : "#f8fafc"), border: `1px solid ${isWaitlisted ? "#fed7aa" : (selectedEnrolled.has(student.id) ? "#fecaca" : "#f1f5f9")}`, borderRadius: 10, cursor: "grab" }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <input type="checkbox" checked={selectedEnrolled.has(student.id)} onChange={() => toggleSelectEnrolled(student.id)} style={{ width: 16, height: 16, accentColor: "#ef4444", cursor: "pointer" }} />
                          <div style={{ width: 28, height: 28, borderRadius: 14, background: isWaitlisted ? "#ffedd5" : "#e2e8f0", color: isWaitlisted ? "#ea580c" : "#475569", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {i + 1}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
                              {student.first_name} {student.last_name || ""}
                              {isWaitlisted && <span style={{ fontSize: 10, background: "#ea580c", color: "#fff", padding: "2px 6px", borderRadius: 4 }}>Waitlisted</span>}
                              <button onClick={() => setQuickViewStudent(student)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }} title="Quick View">
                                <Icon name="eye" size={13} />
                              </button>
                            </div>
                            <div style={{ fontSize: 11, color: "#64748b" }}>{student.email}</div>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleRemove(student)}
                          disabled={processingId === student.id}
                          style={{ 
                            background: "transparent", color: "#ef4444", border: "none", padding: "4px 6px", 
                            borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: processingId === student.id ? "not-allowed" : "pointer", 
                            display: "flex", alignItems: "center", gap: 4, opacity: processingId === student.id ? 0.6 : 1 
                          }}
                        >
                          {processingId === student.id ? "..." : <Icon name="trash" size={14} />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#fff", borderRadius: 16, border: "1px dashed #cbd5e1" }}>
          <div style={{ color: "#cbd5e1", marginBottom: 16 }}><Icon name="layers" size={48} /></div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#475569", margin: "0 0 8px" }}>No Batch Selected</h3>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: 0, maxWidth: 300, textAlign: "center" }}>Select a batch from the dropdown above to manage its student enrollments.</p>
        </div>
      )}

      {/* Quick View Modal */}
      {quickViewStudent && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.4)", backdropFilter: "blur(4px)" }} onClick={() => setQuickViewStudent(null)} />
          <div style={{ position: "relative", width: "100%", maxWidth: 400, background: "#fff", borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.18)", overflow: "hidden", animation: "batchPop 0.2s ease-out" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "flex-start", justifyContent: "space-between", background: "#fafbfc" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 24, background: "linear-gradient(135deg,#0ea5e9,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 18, fontWeight: 800 }}>
                  {quickViewStudent.first_name[0]}{quickViewStudent.last_name ? quickViewStudent.last_name[0] : ""}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{quickViewStudent.first_name} {quickViewStudent.last_name || ""}</h3>
                  <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{quickViewStudent.email}</p>
                </div>
              </div>
              <button onClick={() => setQuickViewStudent(null)} style={{ background: "#f1f5f9", border: "none", width: 30, height: 30, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", cursor: "pointer" }}>
                <Icon name="x" size={14} />
              </button>
            </div>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Phone Number</div>
                  <div style={{ fontSize: 14, color: "#0f172a", fontWeight: 500 }}>{quickViewStudent.phone || "N/A"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Registered On</div>
                  <div style={{ fontSize: 14, color: "#0f172a", fontWeight: 500 }}>{new Date(quickViewStudent.created_at || Date.now()).toLocaleDateString()}</div>
                </div>
              </div>
              
              {quickViewStudent.purchase_status && (
                <div style={{ marginTop: 8, padding: "12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 6 }}>Course Purchase Status</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: quickViewStudent.purchase_status === 'completed' ? '#10b981' : '#f59e0b', textTransform: "capitalize" }}>
                      {quickViewStudent.purchase_status}
                    </span>
                    {quickViewStudent.due_amount > 0 && (
                      <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 600 }}>Due: ₹{quickViewStudent.due_amount}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Batch Modal */}
      {showCreateBatch && (
        <BatchCreateModal
          onClose={() => setShowCreateBatch(false)}
          onSuccess={async (newBatchId) => {
            setShowCreateBatch(false);
            await fetchData();
            if (newBatchId) {
              setSelectedBatchId(String(newBatchId));
            }
          }}
        />
      )}
    </div>
  );
}

export default function BatchAssignPage() {
  return (
    <AdminProvider>
      <BatchAssignContent />
    </AdminProvider>
  );
}
