"use client";
import React, { useState, useEffect, useCallback } from "react";
import { AdminProvider, useAdmin } from "./components/ProtectedAdmin";
import { Icon } from "./icons";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL } from "@/lib/config";

// ─── Types ───────────────────────────────────────────────
interface DashboardData {
  counts: {
    total_courses: number; active_courses: number;
    total_students: number; active_students: number;
    total_batches: number; active_batches: number;
    total_questions: number; total_materials: number;
    total_exams: number; total_chapters: number; month_purchases: number;
  };
  revenue: {
    month_revenue: number; total_revenue: number;
    overdue_count: number;
    monthly_chart: { month: string; amount: number }[];
  };
  devices: { approved: number; pending: number; rejected: number };
  recent_students: { id: number; name: string; email: string; created_at: string | null; is_active: boolean }[];
  recent_courses: { id: number; title: string; is_active: boolean; created_at: string | null }[];
  batch_overview: { id: number; name: string; status: string; enrolled: number; capacity: number; start_date: string | null }[];
  upcoming_installments: { id: number; student_name: string; amount: number; due_date: string | null; installment_no: number }[];
}

// ─── Helpers ─────────────────────────────────────────────
const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
const fmtRs = (n: number) => n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : `₹${n.toFixed(0)}`;
const relTime = (iso: string | null) => {
  if (!iso) return "";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
};

// ─── Stat Card ───────────────────────────────────────────
function StatCard({ label, value, sub, icon, accent, onClick }: {
  label: string; value: string | number; sub?: string;
  icon: string; accent: string; onClick?: () => void;
}) {
  return (
    <div
      className={`stat-card${onClick ? " clickable" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
    >
      <div className="stat-icon" style={{ background: `${accent}18`, color: accent }}>
        <Icon name={icon} size={18} />
      </div>
      <div className="stat-info">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

// ─── SVG Area Chart (premium) ────────────────────────────
function RevenueChart({ data }: { data: { month: string; amount: number }[] }) {
  const [hovered, setHovered] = React.useState<number | null>(null);

  const W = 560; const H = 110;
  const PAD = { top: 12, right: 16, bottom: 28, left: 8 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const max = Math.max(...data.map(d => d.amount), 1);
  const n = data.length;

  // X / Y helpers
  const xOf = (i: number) => PAD.left + (i / (n - 1)) * chartW;
  const yOf = (v: number) => PAD.top + chartH - (v / max) * chartH;

  // Smooth Bezier path (catmull-rom → cubic bezier approximation)
  const pts = data.map((d, i) => ({ x: xOf(i), y: yOf(d.amount) }));

  // Build smooth cubic bezier
  function smoothPath(points: { x: number; y: number }[]) {
    if (points.length < 2) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const cp1x = points[i].x + (points[i + 1].x - (points[i - 1]?.x ?? points[i].x)) / 6;
      const cp1y = points[i].y + (points[i + 1].y - (points[i - 1]?.y ?? points[i].y)) / 6;
      const cp2x = points[i + 1].x - (points[i + 2]?.x ?? points[i + 1].x - (points[i].x - points[i + 1].x)) / 6;
      const cp2y = points[i + 1].y - (points[i + 2]?.y ?? points[i + 1].y - (points[i].y - points[i + 1].y)) / 6;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${points[i + 1].x} ${points[i + 1].y}`;
    }
    return d;
  }

  const linePath  = smoothPath(pts);
  const areaPath  = linePath
    + ` L ${pts[pts.length - 1].x} ${PAD.top + chartH}`
    + ` L ${pts[0].x} ${PAD.top + chartH} Z`;

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="d-chart">
      <svg viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#0ea5e9" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {gridLines.map((f, i) => {
          const gy = PAD.top + chartH - f * chartH;
          return (
            <line key={i}
              x1={PAD.left} y1={gy} x2={PAD.left + chartW} y2={gy}
              stroke="#e2e8f0" strokeWidth={f === 0 ? 1.5 : 1}
              strokeDasharray={f === 0 ? "0" : "3 4"}
            />
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill="url(#areaGrad)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />

        {/* Month labels */}
        {data.map((d, i) => (
          <text key={i}
            x={xOf(i)} y={H - 4}
            textAnchor="middle" fontSize={9.5} fill="#94a3b8" fontWeight={600} fontFamily="inherit"
          >{d.month}</text>
        ))}

        {/* Hover hit zones + dots */}
        {pts.map((p, i) => (
          <g key={i}>
            <rect
              x={p.x - chartW / (2 * (n - 1))} y={PAD.top}
              width={chartW / (n - 1)} height={chartH}
              fill="transparent"
              style={{ cursor: "default" }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
            {/* Dot */}
            <circle
              cx={p.x} cy={p.y} r={hovered === i ? 5 : 3}
              fill={hovered === i ? "#0284c7" : "#38bdf8"}
              stroke="#fff" strokeWidth={1.5}
              style={{ transition: "r 0.15s" }}
            />
            {/* Tooltip */}
            {hovered === i && (
              <g>
                <rect
                  x={Math.min(Math.max(p.x - 30, PAD.left), PAD.left + chartW - 60)}
                  y={p.y - 30} width={60} height={20} rx={5}
                  fill="#0f172a" opacity={0.9}
                />
                <text
                  x={Math.min(Math.max(p.x, PAD.left + 30), PAD.left + chartW - 30)}
                  y={p.y - 15}
                  textAnchor="middle" fontSize={10} fill="#f0f9ff" fontWeight={700} fontFamily="inherit"
                >{fmtRs(data[i].amount)}</text>
              </g>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── Section Header ──────────────────────────────────────
function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="d-sec-head">
      <h3 className="d-sec-title">{title}</h3>
      {action && <button type="button" className="d-sec-action" onClick={onAction}>{action} →</button>}
    </div>
  );
}

// ─── Batch Progress Bar ──────────────────────────────────
function BatchBar({ name, enrolled, capacity, status, startDate }: { name: string; enrolled: number; capacity: number; status: string; startDate: string | null }) {
  const pct = Math.min(Math.round((enrolled / capacity) * 100), 100);
  const color = status === "Ongoing" ? "#10b981" : "#f59e0b";
  return (
    <div className="bb">
      <div className="bb-head">
        <div>
          <span className="bb-name">{name}</span>
          {startDate && <span className="bb-date">{new Date(startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>}
        </div>
        <div className="bb-meta">
          <span className="bb-count">{enrolled}/{capacity}</span>
          <span className="bb-status" style={{ color, background: `${color}18` }}>{status}</span>
        </div>
      </div>
      <div className="bb-track">
        <div className="bb-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────
function DashboardView() {
  const { sessions } = useAdmin();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ visible: boolean; msg: string }>({ visible: false, msg: "" });

  const pendingDevices = sessions.filter(s => !s.is_approved && s.requester_name !== "Main Admin");

  const fetchSummary = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/dashboard/summary`);
      if (res.ok) setData(await res.json());
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  useEffect(() => {
    const msg = sessionStorage.getItem("iinm_redirect_toast");
    if (msg) {
      sessionStorage.removeItem("iinm_redirect_toast");
      setToast({ visible: true, msg });
      setTimeout(() => setToast({ visible: false, msg: "" }), 5000);
    }
  }, []);

  // Safe: only true when data is fully loaded and not null
  const isReady = !loading && data !== null;
  const c = data?.counts;
  const r = data?.revenue;
  const d = data?.devices;

  return (
    <>
      {/* Toast */}
      {toast.visible && (
        <div className="dash-toast">
          <div style={{ flex: 1 }}>
            <div className="dash-toast-title">Session Notice</div>
            <div className="dash-toast-msg">{toast.msg}</div>
          </div>
          <button type="button" className="dash-toast-close" aria-label="Dismiss" onClick={() => setToast({ visible: false, msg: "" })}>✕</button>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Dashboard</h1>
          <p className="dash-date">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="dash-chips">
          {pendingDevices.length > 0 && (
            <div className="dash-chip dash-chip-warn" onClick={() => router.push("/admin/devices")}>
              <Icon name="alert-triangle" size={14} /> {pendingDevices.length} device request{pendingDevices.length > 1 ? "s" : ""} pending
            </div>
          )}
          <div className="dash-chip dash-chip-ok">
            <div className="dash-chip-dot" />
            <span>System Active</span>
          </div>
        </div>
      </div>

      {/* ── ROW 1: Stat Cards ── */}
      <div className="dash-card dash-stats">
        <StatCard label="Courses" value={isReady ? c!.total_courses : "—"} sub={isReady ? `${c!.active_courses} active` : ""} icon="book" accent="#3b82f6" onClick={() => router.push("/admin/masters/catalog/courses")} />
        <StatCard label="Students" value={isReady ? c!.total_students : "—"} sub={isReady ? `${c!.active_students} active` : ""} icon="users" accent="#8b5cf6" onClick={() => router.push("/admin/academic")} />
        <StatCard label="Batches" value={isReady ? c!.active_batches : "—"} sub={isReady ? `${c!.total_batches} total` : ""} icon="layers" accent="#10b981" onClick={() => router.push("/admin/batch")} />
        <StatCard label="Month Revenue" value={isReady ? fmtRs(r!.month_revenue) : "—"} sub={isReady ? `Total: ${fmtRs(r!.total_revenue)}` : ""} icon="credit-card" accent="#f59e0b" />
        <StatCard label="Devices" value={isReady ? (d!.approved + d!.pending) : "—"} sub={isReady ? `${d!.pending} pending` : ""} icon="monitor" accent="#a855f7" onClick={() => router.push("/admin/devices")} />
        <StatCard label="Purchases" value={isReady ? c!.month_purchases : "—"} sub="this month" icon="shopping-bag" accent="#ec4899" onClick={() => router.push("/admin/academic")} />
      </div>

      {/* ── ROW 2: Revenue Chart + Finance Summary ── */}
      <div className="dash-card dash-grid three" style={{ animationDelay: "0.05s" }}>
        {/* Revenue Chart */}
        <div className="d-card span-2">
          <SectionHeader title="Revenue — Last 6 Months" />
          {!isReady ? (
            <div className="d-empty">Loading…</div>
          ) : (
            <RevenueChart data={r!.monthly_chart} />
          )}
        </div>
        {/* Finance KPIs */}
        <div className="d-card">
          <SectionHeader title="Finance" />
          <div className="fin-grid">
            <div>
              <div className="fin-label">TOTAL COLLECTED</div>
              <div className="fin-value">{isReady ? fmtRs(r!.total_revenue) : "—"}</div>
            </div>
            <div className="fin-item-div">
              <div className="fin-label">OUTSTANDING DUES</div>
              <div className="fin-value" style={{ fontSize: 18, color: isReady ? (r!.overdue_count > 0 ? "#ef4444" : "#10b981") : "#0f172a" }}>
                {isReady ? r!.overdue_count : "—"} {isReady && r!.overdue_count > 0 && <span style={{ fontSize: 11, fontWeight: 600 }}>students</span>}
              </div>
            </div>
            <div className="fin-item-div fin-devices">
              <div className="fin-label">DEVICE ACCESS</div>
              <div className="fin-chips">
                {[["Approved", d?.approved ?? "—", "#10b981"], ["Pending", d?.pending ?? "—", "#f59e0b"], ["Rejected", d?.rejected ?? "—", "#ef4444"]].map(([lbl, val, col]) => (
                  <div key={lbl as string} className="fin-chip-num" style={{ color: col as string }}>
                    <span className="fin-chip-lbl">{lbl} </span>{val}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 3: Recent Students + Recent Courses ── */}
      <div className="dash-card dash-grid two" style={{ animationDelay: "0.1s" }}>
        {/* Recent Students */}
        <div className="d-card">
          <SectionHeader title="Recent Students" action="+ Register Student" onAction={() => router.push("/admin/academic/register")} />
          {!isReady ? (
            <div className="d-empty">Loading…</div>
          ) : data!.recent_students.length === 0 ? (
            <div className="d-empty">No students yet</div>
          ) : (
            <div className="d-list">
              {data!.recent_students.map((s) => (
                <div key={s.id} className="d-row">
                  <div className="d-avatar">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="d-row-main">
                    <div className="d-row-title">{s.name}</div>
                    <div className="d-row-sub">{s.email}</div>
                  </div>
                  <span className="d-pill" style={{ color: s.is_active ? "#10b981" : "#94a3b8", background: s.is_active ? "#f0fdf4" : "#f8fafc" }}>
                    {s.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Courses + Quick Stats */}
        <div className="dash-col">
          <div className="d-card">
            <SectionHeader title="Recent Courses" action="View All" onAction={() => router.push("/admin/masters/catalog/courses")} />
            {!isReady ? (
              <div className="d-empty">Loading…</div>
            ) : data!.recent_courses.length === 0 ? (
              <div className="d-empty">No courses yet</div>
            ) : (
              <div>
                {data!.recent_courses.map((course) => (
                  <div key={course.id} className="d-row" style={{ justifyContent: "space-between" }}>
                    <div className="d-row-title" style={{ maxWidth: "65%" }}>{course.title}</div>
                    <div className="d-row-end">
                      <span className="d-pill" style={{ color: course.is_active ? "#10b981" : "#94a3b8", background: course.is_active ? "#f0fdf4" : "#f8fafc" }}>{course.is_active ? "Active" : "Draft"}</span>
                      <span className="d-time">{relTime(course.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── ROW 4 mini: Quick Stats ── */}
          <div className="mini-stats">
            {[
              { label: "Questions", value: c?.total_questions ?? "—", icon: "help-circle", color: "#6366f1" },
              { label: "Materials", value: c?.total_materials ?? "—", icon: "video", color: "#0ea5e9" },
              { label: "Exams", value: c?.total_exams ?? "—", icon: "clipboard", color: "#f59e0b" },
              { label: "Chapters", value: c?.total_chapters ?? "—", icon: "book-open", color: "#10b981" },
              { label: "Total Batches", value: c?.total_batches ?? "—", icon: "layers", color: "#8b5cf6" },
              { label: "Purchases", value: c?.month_purchases ?? "—", icon: "shopping-bag", color: "#ec4899" },
            ].map(item => (
              <div key={item.label} className="mini-stat">
                <div className="mini-stat-head">
                  <div style={{ color: item.color, display: "flex", flexShrink: 0 }}><Icon name={item.icon} size={13} /></div>
                  <span className="mini-stat-label">{item.label}</span>
                </div>
                <div className="mini-stat-value">{isReady ? fmt(Number(item.value)) : "—"}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ROW 5: Upcoming Installments & Batch Overview ── */}
      <div className="dash-card dash-grid two" style={{ animationDelay: "0.15s" }}>
        {/* Upcoming Installments */}
        <div className="d-card">
          <SectionHeader title="Upcoming Installments" action="View All" onAction={() => router.push("/admin/academic/purchase")} />
          {!isReady ? (
            <div className="d-empty">Loading…</div>
          ) : (data!.upcoming_installments || []).length === 0 ? (
            <div className="d-empty">No upcoming installments</div>
          ) : (
            <div className="d-list">
              {(data!.upcoming_installments || []).map((inst) => (
                <div key={inst.id} className="d-row" style={{ justifyContent: "space-between" }}>
                  <div className="d-row-main">
                    <div className="d-row-title">{inst.student_name}</div>
                    <div className="d-row-sub">Installment {inst.installment_no} • Due: {inst.due_date ? new Date(inst.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "N/A"}</div>
                  </div>
                  <div className="d-amt">{fmtRs(inst.amount)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Batch Overview */}
        <div className="d-card">
          <SectionHeader title="Batch Overview" action="Manage Batches" onAction={() => router.push("/admin/batch")} />
          {!isReady ? (
             <div className="d-empty">Loading…</div>
          ) : data!.batch_overview.length === 0 ? (
             <div className="d-empty">No active batches</div>
          ) : (
            <div className="d-list">
              {data!.batch_overview.map(b => (
                <BatchBar key={b.id} name={b.name} enrolled={b.enrolled} capacity={b.capacity} status={b.status} startDate={b.start_date} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── ROW 6: Quick Actions ── */}
      <div className="dash-card d-card" style={{ animationDelay: "0.2s" }}>
        <SectionHeader title="Quick Actions" />
        <div className="quick-grid">
          {[
            { label: "Add Student", icon: "user-plus", color: "#8b5cf6", path: "/admin/academic/register" },
            { label: "Create Course", icon: "book", color: "#3b82f6", path: "/admin/masters/catalog/courses" },
            { label: "New Batch", icon: "layers", color: "#10b981", path: "/admin/batch" },
            { label: "Add Question", icon: "help-circle", color: "#f59e0b", path: "/admin/masters/curriculum/questions/create" },
            { label: "Upload Material", icon: "upload", color: "#0ea5e9", path: "/admin/masters/curriculum/media" },
            { label: "Manage Devices", icon: "monitor", color: "#a855f7", path: "/admin/devices" },
            { label: "Fees & Dues", icon: "credit-card", color: "#ec4899", path: "/admin/academic/purchase" },
            { label: "Site Settings", icon: "settings", color: "#64748b", path: "/admin/settings/site" },
          ].map(a => (
            <button key={a.label} type="button" className="quick-btn" onClick={() => router.push(a.path)}>
              <span className="quick-icon" style={{ background: `${a.color}14`, color: a.color }}><Icon name={a.icon} size={15} /></span>
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export default function AdminDashboard() {
  return (
    <AdminProvider>
      <DashboardView />
    </AdminProvider>
  );
}
