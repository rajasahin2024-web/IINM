"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminProvider } from "../../components/ProtectedAdmin";
import { Icon } from "../../icons";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL } from "@/lib/config";

// ─── TYPES ──────────────────────────────────────────────
interface BatchData {
  batch_id: number | "unassigned";
  batch_name: string;
  total_revenue: number;
  collected: number;
  outstanding: number;
  students_count: number;
}

interface CourseData {
  course_id: number;
  course_title: string;
  total_revenue: number;
  collected: number;
  outstanding: number;
  students_count: number;
  batches: BatchData[];
  unassigned: BatchData;
}

interface CollectionsData {
  global_metrics: {
    total_revenue: number;
    total_collected: number;
    total_outstanding: number;
    total_courses: number;
  };
  collections_by_course: CourseData[];
}

interface OutstandingDetail {
  purchase_id: number;
  student_name: string;
  student_email: string | null;
  student_phone: string | null;
  course_title: string;
  batch_name: string;
  due_amount: number;
  is_installment: boolean;
  next_due_date: string | null;
}

// ─── HELPERS ────────────────────────────────────────────
const fmtRs = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const pct = (part: number, total: number) => {
  if (total === 0) return 0;
  return Math.min(Math.round((part / total) * 100), 100);
};

// ─── COMPONENTS ─────────────────────────────────────────
function StatCard({ label, value, sub, icon, color, onClick }: { label: string; value: string | number; sub?: string; icon: string; color: string; onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      style={{
        background: "#fff", borderRadius: 16, padding: 20,
        border: "1px solid #f1f5f9", boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.2s, box-shadow 0.2s",
        ...(onClick ? { ':hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' } } : {})
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)";
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = "none";
          e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.03)";
        }
      }}
    >
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, fontWeight: 500 }}>{sub}</div>}
      </div>
      <div style={{
        width: 48, height: 48, borderRadius: 12, background: `${color}15`, color: color,
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <Icon name={icon} size={24} />
      </div>
    </div>
  );
}

function ProgressBar({ collected, total }: { collected: number; total: number }) {
  const p = pct(collected, total);
  return (
    <div style={{ width: "100%", minWidth: 100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>
        <span>{p}% Collected</span>
      </div>
      <div style={{ height: 6, background: "#f1f5f9", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${p}%`, background: p === 100 ? "#10b981" : "#3b82f6", borderRadius: 10, transition: "width 0.8s ease" }} />
      </div>
    </div>
  );
}

function CourseRow({ course }: { course: CourseData }) {
  const [expanded, setExpanded] = useState(false);

  const hasBatches = course.batches.length > 0 || course.unassigned.students_count > 0;

  return (
    <div style={{
      background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0",
      marginBottom: 12, overflow: "hidden", transition: "0.2s",
      boxShadow: expanded ? "0 10px 25px rgba(0,0,0,0.05)" : "0 2px 4px rgba(0,0,0,0.02)"
    }}>
      {/* Course Header (Clickable) */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "16px 20px", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1.5fr 40px",
          gap: 16, alignItems: "center", cursor: "pointer",
          background: expanded ? "#f8fafc" : "#fff",
          borderBottom: expanded ? "1px solid #e2e8f0" : "none"
        }}
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{course.course_title}</div>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{course.students_count} Student{course.students_count !== 1 ? "s" : ""} Enrolled</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>Revenue</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{fmtRs(course.total_revenue)}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>Collected</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#10b981" }}>{fmtRs(course.collected)}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>Outstanding</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: course.outstanding > 0 ? "#ef4444" : "#94a3b8" }}>{fmtRs(course.outstanding)}</div>
        </div>
        <div>
          <ProgressBar collected={course.collected} total={course.total_revenue} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", color: "#94a3b8" }}>
          <Icon name={expanded ? "chevron-up" : "chevron-down"} size={20} />
        </div>
      </div>

      {/* Expanded Batches Breakdown */}
      {expanded && (
        <div style={{ padding: "0 20px", background: "#fff" }}>
          {!hasBatches ? (
             <div style={{ padding: "20px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No batch enrollments found.</div>
          ) : (
            <div style={{ padding: "12px 0 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="layers" size={12} /> Batch-wise Breakdown
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {course.batches.map(b => (
                  <div key={b.batch_id} style={{
                    display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 16,
                    padding: "12px 16px", background: "#f8fafc", borderRadius: 8, alignItems: "center",
                    border: "1px solid #f1f5f9"
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 2 }}>{b.batch_name}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{b.students_count} Student{b.students_count !== 1 ? "s" : ""}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{fmtRs(b.total_revenue)} <span style={{fontSize: 10, color: "#94a3b8", fontWeight:500}}>Rev</span></div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#10b981" }}>{fmtRs(b.collected)} <span style={{fontSize: 10, color: "#94a3b8", fontWeight:500}}>Coll</span></div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: b.outstanding > 0 ? "#ef4444" : "#94a3b8" }}>{fmtRs(b.outstanding)} <span style={{fontSize: 10, color: "#94a3b8", fontWeight:500}}>Outst</span></div>
                  </div>
                ))}

                {course.unassigned.students_count > 0 && (
                  <div style={{
                    display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 16,
                    padding: "12px 16px", background: "#fff7ed", borderRadius: 8, alignItems: "center",
                    border: "1px dashed #fdba74"
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#9a3412", marginBottom: 2 }}>{course.unassigned.batch_name}</div>
                      <div style={{ fontSize: 11, color: "#c2410c" }}>{course.unassigned.students_count} Student{course.unassigned.students_count !== 1 ? "s" : ""}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#9a3412" }}>{fmtRs(course.unassigned.total_revenue)}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#10b981" }}>{fmtRs(course.unassigned.collected)}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: course.unassigned.outstanding > 0 ? "#ef4444" : "#fdba74" }}>{fmtRs(course.unassigned.outstanding)}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OutstandingDetailsModal({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<OutstandingDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter States
  const [search, setSearch] = useState("");
  const [filterCourse, setFilterCourse] = useState("All");
  const [filterBatch, setFilterBatch] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [sortBy, setSortBy] = useState("highest");

  useEffect(() => {
    async function fetchOutstanding() {
      try {
        const res = await apiFetch(`${API_BASE_URL}/academic/collections/outstanding-details`);
        if (res.ok) setData(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchOutstanding();
  }, []);

  // Reset page when filters change
  useEffect(() => setCurrentPage(1), [search, filterCourse, filterBatch, filterType, sortBy]);

  // Derive unique dropdown options
  const uniqueCourses = Array.from(new Set(data.map(d => d.course_title))).sort();
  const uniqueBatches = Array.from(new Set(data.map(d => d.batch_name))).sort();

  // Apply filters & sorting
  let filteredData = data.filter(item => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!item.student_name.toLowerCase().includes(q) && 
          !(item.student_email || "").toLowerCase().includes(q) && 
          !(item.student_phone || "").toLowerCase().includes(q)) return false;
    }
    if (filterCourse !== "All" && item.course_title !== filterCourse) return false;
    if (filterBatch !== "All" && item.batch_name !== filterBatch) return false;
    if (filterType === "Installment" && !item.is_installment) return false;
    if (filterType === "Immediate" && item.is_installment) return false;
    return true;
  });

  filteredData.sort((a, b) => {
    if (sortBy === "highest") return b.due_amount - a.due_amount;
    if (sortBy === "upcoming") {
      if (!a.next_due_date && !b.next_due_date) return 0;
      if (!a.next_due_date) return 1;
      if (!b.next_due_date) return -1;
      return new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime();
    }
    return 0;
  });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3000, display: "flex", alignItems: "flex-start", justifyContent: "center", background: "#f8fafc", animation: "fadeIn .2s" }}>
      <div style={{ width: "100vw", maxWidth: "100vw", background: "#fff", borderRadius: 0, overflow: "hidden", display: "flex", flexDirection: "column", height: "100vh", maxHeight: "100vh" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "#ef444415", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="alert-circle" size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: "#0f172a" }}>Outstanding Dues Details</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Comprehensive list of students with pending fees</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", color: "#475569", padding: "8px 12px", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600 }}>
            <Icon name="x" size={16} /> Close
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "32px 40px", background: "#f8fafc" }}>
          {/* Filters Bar */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 24, background: "#fff", padding: "16px 20px", borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
            <div style={{ flex: "1 1 240px", position: "relative" }}>
              <div style={{ position: "absolute", left: 14, top: 10, color: "#94a3b8" }}><Icon name="search" size={16} /></div>
              <input type="text" placeholder="Search name, email, phone..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: "100%", padding: "10px 14px 10px 40px", borderRadius: 8, border: "1px solid #e2e8f0", outline: "none", fontSize: 13, boxSizing: "border-box" }} />
            </div>
            <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)} style={{ flex: "1 1 160px", padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0", outline: "none", fontSize: 13, cursor: "pointer", background: "#fff" }}>
              <option value="All">All Courses</option>
              {uniqueCourses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterBatch} onChange={e => setFilterBatch(e.target.value)} style={{ flex: "1 1 160px", padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0", outline: "none", fontSize: 13, cursor: "pointer", background: "#fff" }}>
              <option value="All">All Batches</option>
              {uniqueBatches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ flex: "1 1 140px", padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0", outline: "none", fontSize: 13, cursor: "pointer", background: "#fff" }}>
              <option value="All">All Payment Types</option>
              <option value="Installment">Installments (EMI)</option>
              <option value="Immediate">Immediate (Lump Sum)</option>
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ flex: "1 1 160px", padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0", outline: "none", fontSize: 13, cursor: "pointer", background: "#fff" }}>
              <option value="highest">Highest Amount Due</option>
              <option value="upcoming">Upcoming Due Date</option>
            </select>
            {(search !== "" || filterCourse !== "All" || filterBatch !== "All" || filterType !== "All" || sortBy !== "highest") && (
              <button 
                onClick={() => {
                  setSearch("");
                  setFilterCourse("All");
                  setFilterBatch("All");
                  setFilterType("All");
                  setSortBy("highest");
                  setCurrentPage(1);
                }}
                style={{ background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
              >
                <Icon name="x" size={14} /> Reset
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>Loading details...</div>
          ) : data.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#10b981", fontSize: 15, fontWeight: 600 }}>All clears! No outstanding dues.</div>
          ) : filteredData.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>No records match your filters.</div>
          ) : (
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.5fr 1fr 1fr", background: "#f1f5f9", padding: "12px 16px", fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                <div>Student</div>
                <div>Course & Batch</div>
                <div>Pending Amount</div>
                <div>Next Payment</div>
              </div>
              {filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item, idx) => (
                <div key={item.purchase_id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1.5fr 1fr 1fr", padding: "14px 16px", borderBottom: idx < Math.min(filteredData.length, currentPage * itemsPerPage) - 1 ? "1px solid #f1f5f9" : "none", alignItems: "center", fontSize: 13 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>{item.student_name}</div>
                    <div style={{ color: "#64748b", fontSize: 11, display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
                      {item.student_email && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Icon name="mail" size={10} /> {item.student_email}</span>}
                      {item.student_phone && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Icon name="phone" size={10} /> {item.student_phone}</span>}
                      {!item.student_email && !item.student_phone && <span>No Contact Info</span>}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: "#1e293b" }}>{item.course_title}</div>
                    <div style={{ color: "#6366f1", fontSize: 11, fontWeight: 600 }}>{item.batch_name}</div>
                  </div>
                  <div style={{ fontWeight: 800, color: "#ef4444", fontSize: 15 }}>
                    {fmtRs(item.due_amount)}
                  </div>
                  <div>
                    {item.is_installment ? (
                      item.next_due_date ? (
                        <span style={{ background: "#fee2e2", color: "#dc2626", padding: "4px 8px", borderRadius: 6, fontWeight: 700, fontSize: 11 }}>
                          Due: {new Date(item.next_due_date).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: 12 }}>No pending installments</span>
                      )
                    ) : (
                      <span style={{ background: "#fef3c7", color: "#d97706", padding: "4px 8px", borderRadius: 6, fontWeight: 700, fontSize: 11 }}>
                        Immediate (Lump Sum)
                      </span>
                    )}
                  </div>
                </div>
              ))}
              
              {filteredData.length > itemsPerPage && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "#fff", borderTop: "1px solid #f1f5f9" }}>
                  <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} records
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)} style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: "#0f172a", fontSize: 13, fontWeight: 600, cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? 0.5 : 1 }}>Previous</button>
                    <button disabled={currentPage === Math.ceil(filteredData.length / itemsPerPage)} onClick={() => setCurrentPage(currentPage + 1)} style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: "#0f172a", fontSize: 13, fontWeight: 600, cursor: currentPage === Math.ceil(filteredData.length / itemsPerPage) ? "not-allowed" : "pointer", opacity: currentPage === Math.ceil(filteredData.length / itemsPerPage) ? 0.5 : 1 }}>Next</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CollectionsView() {
  const [data, setData] = useState<CollectionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOutstandingModal, setShowOutstandingModal] = useState(false);

  const fetchCollections = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/academic/collections/overview`);
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  return (
    <div style={{ paddingBottom: 60 }}>
      {showOutstandingModal && <OutstandingDetailsModal onClose={() => setShowOutstandingModal(false)} />}
      
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px" }}>Course & Batch Collections</h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 14 }}>
            Detailed breakdown of revenue performance across all academic offerings.
          </p>
        </div>
        <button onClick={fetchCollections} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#475569", cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
          <Icon name="refresh-cw" size={14} /> Refresh
        </button>
      </div>

      {loading && !data ? (
        <div style={{ padding: "60px 0", textAlign: "center", color: "#64748b", fontSize: 14, fontWeight: 500 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16, animation: "spin 1s linear infinite" }}><Icon name="loader" size={24} /></div>
          Loading collections data...
        </div>
      ) : data ? (
        <>
          {/* Top Metrics Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 32 }}>
            <StatCard 
              label="Total Revenue" 
              value={fmtRs(data.global_metrics.total_revenue)} 
              sub={`${data.global_metrics.total_courses} Active Courses`} 
              icon="pie-chart" 
              color="#3b82f6" 
            />
            <StatCard 
              label="Total Collected" 
              value={fmtRs(data.global_metrics.total_collected)} 
              sub={`${pct(data.global_metrics.total_collected, data.global_metrics.total_revenue)}% of total revenue`} 
              icon="check-circle" 
              color="#10b981" 
            />
            <StatCard 
              label="Total Outstanding" 
              value={fmtRs(data.global_metrics.total_outstanding)} 
              sub="Click to view student details" 
              icon="alert-circle" 
              color="#ef4444" 
              onClick={() => setShowOutstandingModal(true)}
            />
          </div>

          {/* Grouped Data Area */}
          <div style={{ background: "#f8fafc", padding: "24px", borderRadius: 16, border: "1px solid #e2e8f0" }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: 10 }}>
              <Icon name="folder" size={18} color="#64748b" /> Revenue by Course
            </h2>

            {data.collections_by_course.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8", fontSize: 14 }}>
                No active courses with revenue found.
              </div>
            ) : (
              <div>
                {data.collections_by_course.map(course => (
                  <CourseRow key={course.course_id} course={course} />
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={{ padding: "40px", textAlign: "center", color: "#ef4444" }}>Failed to load data.</div>
      )}
    </div>
  );
}

export default function CourseBatchCollectionsPage() {
  return (
    <AdminProvider>
      <CollectionsView />
    </AdminProvider>
  );
}
