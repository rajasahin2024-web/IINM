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
      onClick={onClick}
      style={{
        background: "#fff", borderRadius: 12, padding: "14px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        cursor: onClick ? "pointer" : "default", transition: "0.2s",
        minHeight: 74,
      }}
      onMouseEnter={e => { if (onClick) { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)"; } }}
      onMouseLeave={e => { if (onClick) { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)"; (e.currentTarget as HTMLDivElement).style.transform = "none"; } }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3, whiteSpace: "nowrap" }}>{sub}</div>}
      </div>
      <div style={{ width: 38, height: 38, borderRadius: 9, background: `${accent}18`, color: accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: 8 }}>
        <Icon name={icon} size={18} />
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
    <div style={{ position: "relative", width: "100%" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#0f172a", letterSpacing: "0.3px" }}>{title}</h3>
      {action && <button onClick={onAction} style={{ background: "none", border: "none", fontSize: 12, color: "#0ea5e9", fontWeight: 600, cursor: "pointer", padding: 0 }}>{action} →</button>}
    </div>
  );
}

// ─── Batch Progress Bar ──────────────────────────────────
function BatchBar({ name, enrolled, capacity, status, startDate }: { name: string; enrolled: number; capacity: number; status: string; startDate: string | null }) {
  const pct = Math.min(Math.round((enrolled / capacity) * 100), 100);
  const color = status === "Ongoing" ? "#10b981" : "#f59e0b";
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>{name}</span>
          {startDate && <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 8 }}>{new Date(startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#64748b" }}>{enrolled}/{capacity}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}18`, padding: "2px 7px", borderRadius: 100 }}>{status}</span>
        </div>
      </div>
      <div style={{ height: 5, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 0.8s ease" }} />
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
      <style>{`
        @keyframes toastSlideIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .dash-card { animation: fadeUp 0.3s ease both; }
        .quick-btn { display:flex; align-items:center; gap:8px; padding:9px 14px; border-radius:8px; border:1.5px solid #e2e8f0; background:#fff; font-size:12px; font-weight:700; color:#374151; cursor:pointer; transition:0.15s; white-space:nowrap; }
        .quick-btn:hover { background:#f8fafc; border-color:#cbd5e1; transform:translateY(-1px); box-shadow:0 3px 10px rgba(0,0,0,0.07); }
      `}</style>

      {/* Toast */}
      {toast.visible && (
        <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, display: "flex", alignItems: "flex-start", gap: 12, background: "#0f172a", color: "#f1f5f9", border: "1px solid #1e293b", borderLeft: "4px solid #f59e0b", borderRadius: 12, padding: "14px 16px", maxWidth: 360, boxShadow: "0 20px 40px rgba(0,0,0,0.35)", animation: "toastSlideIn 0.4s both" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#fbbf24", marginBottom: 2 }}>Session Notice</div>
            <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>{toast.msg}</div>
          </div>
          <button onClick={() => setToast({ visible: false, msg: "" })} style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", fontSize: 14, padding: 0 }}>✕</button>
        </div>
      )}

      {/* ── Page Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a" }}>Dashboard</h1>
          <p style={{ margin: "2px 0 0", color: "#94a3b8", fontSize: 12 }}>
            {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {pendingDevices.length > 0 && (
            <div onClick={() => router.push("/admin/devices")} style={{ display: "flex", alignItems: "center", gap: 6, background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, color: "#92400e", cursor: "pointer" }}>
              <Icon name="alert-triangle" size={14} /> {pendingDevices.length} device request{pendingDevices.length > 1 ? "s" : ""} pending
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "6px 12px" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#15803d" }}>System Active</span>
          </div>
        </div>
      </div>

      {/* ── ROW 1: Stat Cards ── */}
      <div className="dash-card" style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10, marginBottom: 14 }}>
        <StatCard label="Courses" value={isReady ? c!.total_courses : "—"} sub={isReady ? `${c!.active_courses} active` : ""} icon="book" accent="#3b82f6" onClick={() => router.push("/admin/masters/catalog/courses")} />
        <StatCard label="Students" value={isReady ? c!.total_students : "—"} sub={isReady ? `${c!.active_students} active` : ""} icon="users" accent="#8b5cf6" onClick={() => router.push("/admin/academic")} />
        <StatCard label="Batches" value={isReady ? c!.active_batches : "—"} sub={isReady ? `${c!.total_batches} total` : ""} icon="layers" accent="#10b981" onClick={() => router.push("/admin/batch")} />
        <StatCard label="Month Revenue" value={isReady ? fmtRs(r!.month_revenue) : "—"} sub={isReady ? `Total: ${fmtRs(r!.total_revenue)}` : ""} icon="credit-card" accent="#f59e0b" />
        <StatCard label="Devices" value={isReady ? (d!.approved + d!.pending) : "—"} sub={isReady ? `${d!.pending} pending` : ""} icon="monitor" accent="#a855f7" onClick={() => router.push("/admin/devices")} />
        <StatCard label="Purchases" value={isReady ? c!.month_purchases : "—"} sub="this month" icon="shopping-bag" accent="#ec4899" onClick={() => router.push("/admin/academic")} />
      </div>

      {/* ── ROW 2: Revenue Chart + Finance Summary ── */}
      <div className="dash-card" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16, animationDelay: "0.05s" }}>
        {/* Revenue Chart */}
        <div style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", gridColumn: "span 2" }}>
          <SectionHeader title="Revenue — Last 6 Months" />
          {!isReady ? (
            <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 12 }}>Loading…</div>
          ) : (
            <RevenueChart data={r!.monthly_chart} />
          )}
        </div>
        {/* Finance KPIs */}
        <div style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", gap: 12 }}>
          <SectionHeader title="Finance" />
          <div>
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>TOTAL COLLECTED</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>{isReady ? fmtRs(r!.total_revenue) : "—"}</div>
          </div>
          <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>OUTSTANDING DUES</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: isReady ? (r!.overdue_count > 0 ? "#ef4444" : "#10b981") : "#0f172a" }}>
              {isReady ? r!.overdue_count : "—"} {isReady && r!.overdue_count > 0 && <span style={{ fontSize: 11, fontWeight: 600 }}>students</span>}
            </div>
          </div>
          <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>DEVICE ACCESS</div>
            <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
              {[["Approved", d?.approved ?? "—", "#10b981"], ["Pending", d?.pending ?? "—", "#f59e0b"], ["Rejected", d?.rejected ?? "—", "#ef4444"]].map(([lbl, val, col]) => (
                <div key={lbl as string} style={{ fontSize: 11, fontWeight: 700, color: col as string }}>
                  <span style={{ color: "#64748b", fontWeight: 500 }}>{lbl} </span>{val}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 3: Recent Students + Recent Courses ── */}
      <div className="dash-card" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16, animationDelay: "0.1s" }}>
        {/* Recent Students */}
        <div style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <SectionHeader title="Recent Students" action="+ Register Student" onAction={() => router.push("/admin/academic/register")} />
          {!isReady ? (
            <div style={{ color: "#94a3b8", fontSize: 12, textAlign: "center", padding: "20px 0" }}>Loading…</div>
          ) : data!.recent_students.length === 0 ? (
            <div style={{ color: "#94a3b8", fontSize: 12, textAlign: "center", padding: "20px 0" }}>No students yet</div>
          ) : (
            <div style={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 0 }}>
              {data!.recent_students.map((s, i) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < data!.recent_students.length - 1 ? "1px solid #f8fafc" : "none" }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#f0f9ff", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.email}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, flexShrink: 0, color: s.is_active ? "#10b981" : "#94a3b8", background: s.is_active ? "#f0fdf4" : "#f8fafc", padding: "2px 7px", borderRadius: 100 }}>
                    {s.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Courses + Quick Stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <SectionHeader title="Recent Courses" action="View All" onAction={() => router.push("/admin/masters/catalog/courses")} />
            {!isReady ? (
              <div style={{ color: "#94a3b8", fontSize: 12 }}>Loading…</div>
            ) : data!.recent_courses.length === 0 ? (
              <div style={{ color: "#94a3b8", fontSize: 12 }}>No courses yet</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {data!.recent_courses.map((course, i) => (
                  <div key={course.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: i < data!.recent_courses.length - 1 ? "1px solid #f8fafc" : "none" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>{course.title}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: course.is_active ? "#10b981" : "#94a3b8", background: course.is_active ? "#f0fdf4" : "#f8fafc", padding: "2px 7px", borderRadius: 100 }}>{course.is_active ? "Active" : "Draft"}</span>
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>{relTime(course.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── ROW 4 mini: Quick Stats ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[
              { label: "Questions", value: c?.total_questions ?? "—", icon: "help-circle", color: "#6366f1" },
              { label: "Materials", value: c?.total_materials ?? "—", icon: "video", color: "#0ea5e9" },
              { label: "Exams", value: c?.total_exams ?? "—", icon: "clipboard", color: "#f59e0b" },
              { label: "Chapters", value: c?.total_chapters ?? "—", icon: "book-open", color: "#10b981" },
              { label: "Total Batches", value: c?.total_batches ?? "—", icon: "layers", color: "#8b5cf6" },
              { label: "Purchases", value: c?.month_purchases ?? "—", icon: "shopping-bag", color: "#ec4899" },
            ].map(item => (
              <div key={item.label} style={{ background: "#fff", borderRadius: 10, padding: "10px 12px", border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <div style={{ color: item.color }}><Icon name={item.icon} size={13} /></div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>{item.label}</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{isReady ? fmt(Number(item.value)) : "—"}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ROW 5: Upcoming Installments & Batch Overview ── */}
      <div className="dash-card" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16, animationDelay: "0.15s" }}>
        {/* Upcoming Installments */}
        <div style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <SectionHeader title="Upcoming Installments" action="View All" onAction={() => router.push("/admin/academic/purchase")} />
          {!isReady ? (
            <div style={{ color: "#94a3b8", fontSize: 12, textAlign: "center", padding: "20px 0" }}>Loading…</div>
          ) : (data!.upcoming_installments || []).length === 0 ? (
            <div style={{ color: "#94a3b8", fontSize: 12, textAlign: "center", padding: "20px 0" }}>No upcoming installments</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0, maxHeight: 240, overflowY: "auto" }}>
              {(data!.upcoming_installments || []).map((inst, i) => (
                <div key={inst.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: i < (data!.upcoming_installments || []).length - 1 ? "1px solid #f8fafc" : "none" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>{inst.student_name}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>Installment {inst.installment_no} • Due: {inst.due_date ? new Date(inst.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "N/A"}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444" }}>{fmtRs(inst.amount)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Batch Overview */}
        <div style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <SectionHeader title="Batch Overview" action="Manage Batches" onAction={() => router.push("/admin/batch")} />
          {!isReady ? (
             <div style={{ color: "#94a3b8", fontSize: 12, textAlign: "center", padding: "20px 0" }}>Loading…</div>
          ) : data!.batch_overview.length === 0 ? (
             <div style={{ color: "#94a3b8", fontSize: 12, textAlign: "center", padding: "20px 0" }}>No active batches</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: 240, overflowY: "auto" }}>
              {data!.batch_overview.map(b => (
                <BatchBar key={b.id} name={b.name} enrolled={b.enrolled} capacity={b.capacity} status={b.status} startDate={b.start_date} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── ROW 6: Quick Actions ── */}
      <div className="dash-card" style={{ background: "#fff", borderRadius: 12, padding: "14px 18px", border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", animationDelay: "0.2s" }}>
        <SectionHeader title="Quick Actions" />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
            <button key={a.label} className="quick-btn" onClick={() => router.push(a.path)}>
              <span style={{ color: a.color }}><Icon name={a.icon} size={14} /></span>
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
