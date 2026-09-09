"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { AdminProvider } from "../components/ProtectedAdmin";
import { Icon } from "../icons";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL } from "@/lib/config";

// ─── Types ───────────────────────────────────────────────
interface CpuInfo {
  overall_pct: number;
  per_core_pct: number[];
  model: string;
  cores: number;
  speed_mhz: number | null;
}
interface MemInfo {
  total_bytes: number;
  used_bytes: number;
  available_bytes: number;
  used_pct: number;
}
interface DiskInfo {
  total_bytes: number;
  used_bytes: number;
  available_bytes: number;
  used_pct: number;
  mount: string;
}
interface LoadAvg {
  one: number;
  five: number;
  fifteen: number;
}
interface ProcInfo {
  pid: number;
  name: string;
  cpu_pct: number;
  mem_pct: number;
  command: string;
  exe_path: string | null;
  started_at: string | null;
}
interface ServerResource {
  cpu: CpuInfo;
  memory: MemInfo;
  disk: DiskInfo;
  load_avg: LoadAvg;
  uptime_seconds: number;
  platform: string;
  hostname: string;
  top_processes: ProcInfo[];
}

// ─── Helpers ─────────────────────────────────────────────
const POLL_MS = 2500;

function fmtBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  const gb = 1024 ** 3;
  if (n >= gb) return `${(n / gb).toFixed(1)} GB`;
  const mb = 1024 ** 2;
  if (n >= mb) return `${(n / mb).toFixed(0)} MB`;
  const kb = 1024;
  if (n >= kb) return `${(n / kb).toFixed(0)} KB`;
  return `${n} B`;
}

function fmtUptime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "—";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtStartedAt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function barColor(p: number): string {
  if (p > 90) return "#ef4444";
  if (p > 70) return "#f59e0b";
  return "#10b981";
}

// ─── Stat Card ───────────────────────────────────────────
function GaugeCard({ icon, label, percent, value, sub }: {
  icon: string; label: string; percent: number; value: string; sub: string;
}) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div style={{
      background: "#fff", borderRadius: 14, padding: 20,
      border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, color: "#64748b", fontSize: 13, fontWeight: 600 }}>
        <Icon name={icon} />
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: "#0f172a" }}>{value}</span>
        <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>{pct(clamped)}</span>
      </div>
      <div style={{ height: 8, width: "100%", borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${clamped}%`, borderRadius: 99,
          background: barColor(clamped), transition: "width 0.4s ease, background 0.3s ease",
        }} />
      </div>
      <p style={{ margin: "10px 0 0", fontSize: 12, color: "#94a3b8" }}>{sub}</p>
    </div>
  );
}

function CoreBar({ index, percent }: { index: number; percent: number }) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
      <span style={{ width: 52, flexShrink: 0, fontSize: 12, color: "#64748b" }}>core {index}</span>
      <div style={{ position: "relative", height: 6, flex: 1, borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
        <div style={{
          position: "absolute", inset: 0, width: `${clamped}%`, borderRadius: 99,
          background: barColor(clamped), transition: "width 0.4s ease",
        }} />
      </div>
      <span style={{ width: 48, textAlign: "right", fontSize: 12, color: "#64748b", fontWeight: 600 }}>{pct(clamped)}</span>
    </div>
  );
}

function LoadBar({ label, value, cores }: { label: string; value: number; cores: number }) {
  const ceiling = Math.max(1, cores);
  const ratio = Math.min(1, value / ceiling);
  const saturated = value > ceiling;
  const color = saturated ? "#ef4444" : value > ceiling * 0.7 ? "#f59e0b" : "#10b981";
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: "#64748b" }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
          {value.toFixed(2)}
          {saturated && <span style={{ marginLeft: 6, fontSize: 11, color: "#ef4444" }}>saturated</span>}
        </span>
      </div>
      <div style={{ height: 8, width: "100%", borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${ratio * 100}%`, borderRadius: 99,
          background: color, transition: "width 0.4s ease",
        }} />
      </div>
    </div>
  );
}

function ProcRow({ proc, rank }: { proc: ProcInfo; rank: number }) {
  const cpuClamped = Math.min(100, Math.max(0, proc.cpu_pct));
  return (
    <tr style={{ borderBottom: "1px solid #f8fafc", verticalAlign: "top" }}>
      <td style={{ padding: "12px 12px", color: "#94a3b8", fontWeight: 600 }}>
        <span style={{
          display: "inline-flex", height: 22, width: 22, alignItems: "center", justifyContent: "center",
          borderRadius: "50%", background: "#f1f5f9", fontSize: 11, fontWeight: 700,
        }}>{rank}</span>
      </td>
      <td style={{ padding: "12px 12px", color: "#64748b", fontWeight: 600 }}>{proc.pid}</td>
      <td style={{ padding: "12px 12px" }}>
        <div style={{ fontWeight: 600, color: "#0f172a" }}>{proc.name}</div>
        {proc.exe_path && proc.exe_path !== proc.name && (
          <div style={{ marginTop: 2, fontSize: 11, color: "#94a3b8", fontFamily: "monospace", wordBreak: "break-all" }}>
            {proc.exe_path}
          </div>
        )}
        {proc.command && (
          <div style={{ marginTop: 4, maxWidth: 360, fontSize: 11, color: "#94a3b8", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={proc.command}>
            {proc.command}
          </div>
        )}
      </td>
      <td style={{ padding: "12px 12px", textAlign: "right" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
          <div style={{ display: "none", height: 6, width: 64, borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${cpuClamped}%`, background: barColor(cpuClamped) }} />
          </div>
          <span style={{ fontWeight: 600, color: "#0f172a" }}>{pct(proc.cpu_pct)}</span>
        </div>
      </td>
      <td style={{ padding: "12px 12px", textAlign: "right", color: "#64748b", fontWeight: 600 }}>{pct(proc.mem_pct)}</td>
      <td style={{ padding: "12px 12px", textAlign: "right", color: "#64748b", fontSize: 12 }}>{fmtStartedAt(proc.started_at)}</td>
    </tr>
  );
}

// ─── View ────────────────────────────────────────────────
function ServerResourceView({ data, fetching }: { data: ServerResource; fetching: boolean }) {
  const { cpu, memory, disk, load_avg, top_processes, uptime_seconds, platform, hostname } = data;
  return (
    <>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }}>Server Resource</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
            Live host snapshot — {platform} · {hostname} · uptime {fmtUptime(uptime_seconds)}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#64748b" }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%", background: fetching ? "#f59e0b" : "#10b981",
            boxShadow: "0 0 0 3px rgba(16,185,129,0.15)",
          }} />
          {fetching ? "refreshing…" : "live"} · polls every {(POLL_MS / 1000).toFixed(1)}s
        </div>
      </header>

      {/* Gauge cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginTop: 24 }}>
        <GaugeCard
          icon="cpu"
          label="CPU"
          percent={cpu.overall_pct}
          value={pct(cpu.overall_pct)}
          sub={`${cpu.cores} cores · ${cpu.speed_mhz ? `${cpu.speed_mhz.toFixed(0)} MHz` : "—"}`}
        />
        <GaugeCard
          icon="layers"
          label="Memory"
          percent={memory.used_pct}
          value={fmtBytes(memory.used_bytes)}
          sub={`${fmtBytes(memory.used_bytes)} / ${fmtBytes(memory.total_bytes)}`}
        />
        <GaugeCard
          icon="hard-drive"
          label="Disk"
          percent={disk.used_pct}
          value={fmtBytes(disk.used_bytes)}
          sub={`${fmtBytes(disk.used_bytes)} / ${fmtBytes(disk.total_bytes)} · ${disk.mount}`}
        />
      </div>

      {/* CPU model + per-core */}
      <div style={{
        background: "#fff", borderRadius: 14, padding: 24, marginTop: 16,
        border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>CPU — {cpu.model}</h2>
        <p style={{ margin: "0 0 16px", fontSize: 12, color: "#94a3b8" }}>Per-core utilization</p>
        {cpu.per_core_pct.map((p, i) => (
          <CoreBar key={i} index={i} percent={p} />
        ))}
      </div>

      {/* Load average */}
      <div style={{
        background: "#fff", borderRadius: 14, padding: 24, marginTop: 16,
        border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Load Average</h2>
        <p style={{ margin: "0 0 16px", fontSize: 12, color: "#94a3b8" }}>
          Saturation ceiling = {cpu.cores} cores
        </p>
        <LoadBar label="1 min" value={load_avg.one} cores={cpu.cores} />
        <LoadBar label="5 min" value={load_avg.five} cores={cpu.cores} />
        <LoadBar label="15 min" value={load_avg.fifteen} cores={cpu.cores} />
      </div>

      {/* Top processes */}
      <div style={{
        background: "#fff", borderRadius: 14, padding: 24, marginTop: 16,
        border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
          Top 5 Processes (by CPU)
          <span style={{ background: "#f1f5f9", color: "#475569", fontSize: 11, padding: "2px 8px", borderRadius: 8, fontWeight: 600 }}>
            {top_processes.length}
          </span>
        </h2>
        <p style={{ margin: "0 0 16px", fontSize: 12, color: "#94a3b8" }}>Sampled live from the host</p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                <th style={{ padding: "10px 12px", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>#</th>
                <th style={{ padding: "10px 12px", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>PID</th>
                <th style={{ padding: "10px 12px", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>Process</th>
                <th style={{ padding: "10px 12px", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "right" }}>CPU</th>
                <th style={{ padding: "10px 12px", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "right" }}>MEM</th>
                <th style={{ padding: "10px 12px", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "right" }}>Started</th>
              </tr>
            </thead>
            <tbody>
              {top_processes.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>No process data available.</td></tr>
              ) : (
                top_processes.map((p, i) => <ProcRow key={p.pid} proc={p} rank={i + 1} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─── Page ────────────────────────────────────────────────
function ServerResourcePageInner() {
  const [data, setData] = useState<ServerResource | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    setFetching(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/server-resource/overview`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ServerResource = await res.json();
      setData(json);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load server resource");
    } finally {
      setFetching(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    timerRef.current = setInterval(fetchData, POLL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchData]);

  if (loading && !data) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ fontSize: 14, color: "#64748b" }}>Loading server resource…</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }}>Server Resource</h1>
        <p style={{ margin: "12px 0 0", fontSize: 13, color: "#ef4444" }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      {data && <ServerResourceView data={data} fetching={fetching} />}
      {error && data && (
        <p style={{ marginTop: 16, fontSize: 12, color: "#ef4444" }}>Last refresh failed: {error}</p>
      )}
    </div>
  );
}

export default function ServerResourcePage() {
  return (
    <AdminProvider>
      <ServerResourcePageInner />
    </AdminProvider>
  );
}
