import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Cpu, HardDrive, MemoryStick, Activity, Server, RefreshCw, Clock, Folder } from "lucide-react";
import type { ServerResourceOverview, ServerResourceProcess } from "@paperclipai/shared";
import { serverResourceApi } from "../api/server-resource";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { formatBytes } from "../lib/issue-output";
import { cn } from "../lib/utils";
import { PageSkeleton } from "../components/PageSkeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const POLL_INTERVAL_MS = 2500;

function formatUptime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatStartedAt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}

/** Tailwind fill class by utilization threshold (token-backed colors). */
function fillClass(pct: number): string {
  if (pct > 90) return "bg-(--status-task-blocked)";
  if (pct > 70) return "bg-(--status-task-todo)";
  return "bg-(--status-task-done)";
}

interface GaugeCardProps {
  icon: typeof Cpu;
  label: string;
  percent: number;
  value: string;
  sub: string;
}

function GaugeCard({ icon: Icon, label, percent, value, sub }: GaugeCardProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon className="h-4 w-4" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-3xl font-semibold tabular-nums">{value}</span>
          <span className="text-sm text-muted-foreground tabular-nums">{pct(clamped)}</span>
        </div>
        <div
          role="progressbar"
          aria-label={`${label}: ${Math.round(clamped)}%`}
          aria-valuenow={Math.round(clamped)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="relative h-2 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className={cn("absolute inset-y-0 left-0 rounded-full", fillClass(clamped))}
            style={{ width: `${clamped}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

function CoreBar({ index, percent }: { index: number; percent: number }) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 text-xs text-muted-foreground tabular-nums">core {index}</span>
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full", fillClass(clamped))}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{pct(clamped)}</span>
    </div>
  );
}

/** Load average bar — height scales the value against the saturation ceiling. */
function LoadBar({
  label,
  value,
  cores,
}: {
  label: string;
  value: number;
  cores: number;
}) {
  // Saturation ceiling = core count. Bar fills proportionally up to 100% at
  // the ceiling; values above the ceiling clamp to 100% and are flagged red.
  const ceiling = Math.max(1, cores);
  const ratio = Math.min(1, value / ceiling);
  const saturated = value > ceiling;
  const barClass = saturated
    ? "bg-(--status-task-blocked)"
    : value > ceiling * 0.7
      ? "bg-(--status-task-todo)"
      : "bg-(--status-task-done)";
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold tabular-nums">
          {value.toFixed(2)}
          {saturated && <span className="ml-1 text-xs text-(--status-task-blocked)">saturated</span>}
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full", barClass)}
          style={{ width: `${ratio * 100}%` }}
        />
        {/* saturation ceiling marker */}
        <div
          className="absolute inset-y-0 w-px bg-foreground/30"
          style={{ left: "100%" }}
          title={`ceiling: ${ceiling}`}
        />
      </div>
    </div>
  );
}

/** Mini sparkline-style trend of the three load averages (1 → 5 → 15 min). */
function LoadTrend({ loadAvg, cores }: { loadAvg: ServerResourceOverview["loadAvg"]; cores: number }) {
  const points = [loadAvg.one, loadAvg.five, loadAvg.fifteen];
  const ceiling = Math.max(1, cores);
  // Scale so the chart top = 1.5x ceiling (gives headroom above saturation).
  const chartMax = ceiling * 1.5;
  const width = 100;
  const height = 40;
  const stepX = width / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = i * stepX;
    const y = height - (Math.min(p, chartMax) / chartMax) * height;
    return [x, y] as const;
  });
  const linePath = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;
  const ceilingY = height - (ceiling / chartMax) * height;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-20 w-full" preserveAspectRatio="none" role="img" aria-label="Load average trend 1/5/15 min">
      <defs>
        <linearGradient id="loadArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--status-task-done)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--status-task-done)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* saturation ceiling line */}
      <line x1="0" y1={ceilingY} x2={width} y2={ceilingY} stroke="var(--foreground)" strokeOpacity="0.25" strokeDasharray="3 3" />
      <path d={areaPath} fill="url(#loadArea)" />
      <path d={linePath} fill="none" stroke="var(--status-task-done)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      {coords.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.6" fill="var(--status-task-done)" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

function ProcessRow({ proc, rank }: { proc: ServerResourceProcess; rank: number }) {
  const cpuClamped = Math.min(100, Math.max(0, proc.cpuPct));
  return (
    <tr className="border-b border-border last:border-0 align-top">
      <td className="py-2.5 pr-3 tabular-nums text-muted-foreground">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
          {rank}
        </span>
      </td>
      <td className="py-2.5 pr-4 tabular-nums text-muted-foreground">{proc.pid}</td>
      <td className="py-2.5 pr-4">
        <div className="font-medium">{proc.name}</div>
        {proc.exePath && proc.exePath !== proc.name && (
          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground/80">
            <Folder className="h-3 w-3 shrink-0" />
            <code className="break-all font-mono text-[11px]">{proc.exePath}</code>
          </div>
        )}
        {proc.command && (
          <div className="mt-1 max-w-md truncate text-xs text-muted-foreground/70" title={proc.command}>
            <code className="font-mono text-[11px]">{proc.command}</code>
          </div>
        )}
      </td>
      <td className="py-2.5 pr-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:block">
            <div className={cn("h-full rounded-full", fillClass(cpuClamped))} style={{ width: `${cpuClamped}%` }} />
          </div>
          <span className="tabular-nums font-medium">{pct(proc.cpuPct)}</span>
        </div>
      </td>
      <td className="py-2.5 pr-4 text-right tabular-nums text-muted-foreground">{pct(proc.memPct)}</td>
      <td className="py-2.5 text-right">
        <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3 shrink-0" />
          {formatStartedAt(proc.startedAt)}
        </div>
      </td>
    </tr>
  );
}

export function ServerResource() {
  const { setBreadcrumbs } = useBreadcrumbs();
  useEffect(() => {
    setBreadcrumbs([{ label: "Server" }]);
  }, [setBreadcrumbs]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.serverResource,
    queryFn: ({ signal }) => serverResourceApi.get(signal),
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });

  if (isLoading || !data) {
    return <PageSkeleton variant="dashboard" />;
  }

  return <ServerResourceView data={data} fetching={isFetching} />;
}

function ServerResourceView({ data, fetching }: { data: ServerResourceOverview; fetching: boolean }) {
  const { cpu, memory, disk, loadAvg, topProcesses } = data;
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Server</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Live host resources for this Paperclip instance — CPU, memory, disk, load averages, and the top 5 processes.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Server className="h-3.5 w-3.5" />
              {data.hostname}
            </span>
            <span>{data.platform}</span>
            <span>uptime {formatUptime(data.uptimeSeconds)}</span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <RefreshCw className={cn("h-3.5 w-3.5", fetching && "animate-spin")} />
          refreshing every {POLL_INTERVAL_MS / 1000}s
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <GaugeCard
          icon={Cpu}
          label="CPU"
          percent={cpu.overallPct}
          value={pct(cpu.overallPct)}
          sub={`${cpu.cores} cores${cpu.speedMhz ? ` · ${cpu.speedMhz} MHz` : ""}`}
        />
        <GaugeCard
          icon={MemoryStick}
          label="Memory"
          percent={memory.usedPct}
          value={formatBytes(memory.usedBytes)}
          sub={`${formatBytes(memory.usedBytes)} / ${formatBytes(memory.totalBytes)}`}
        />
        <GaugeCard
          icon={HardDrive}
          label="Disk"
          percent={disk.usedPct}
          value={formatBytes(disk.usedBytes)}
          sub={`${formatBytes(disk.availableBytes)} free on ${disk.mount}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Cpu className="h-4 w-4" />
              Per-core CPU
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {cpu.perCorePct.length > 0 ? (
              cpu.perCorePct.map((p, i) => <CoreBar key={i} index={i} percent={p} />)
            ) : (
              <p className="text-xs text-muted-foreground">No core data available.</p>
            )}
            <p className="pt-1 text-xs text-muted-foreground/70">{cpu.model}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Activity className="h-4 w-4" />
              Load averages
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <LoadTrend loadAvg={loadAvg} cores={cpu.cores} />
            <div className="space-y-2.5">
              <LoadBar label="1 min" value={loadAvg.one} cores={cpu.cores} />
              <LoadBar label="5 min" value={loadAvg.five} cores={cpu.cores} />
              <LoadBar label="15 min" value={loadAvg.fifteen} cores={cpu.cores} />
            </div>
            <p className="text-xs text-muted-foreground/70">
              {cpu.cores} logical cores — load above {cpu.cores} indicates saturation. Trend shows 1 → 5 → 15 min.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Top 5 processes (by CPU)</CardTitle>
        </CardHeader>
        <CardContent>
          {topProcesses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">#</th>
                    <th className="py-2 pr-4 font-medium">PID</th>
                    <th className="py-2 pr-4 font-medium">Process</th>
                    <th className="py-2 pr-4 text-right font-medium">CPU</th>
                    <th className="py-2 pr-4 text-right font-medium">MEM</th>
                    <th className="py-2 text-right font-medium">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {topProcesses.map((proc, i) => (
                    <ProcessRow key={proc.pid} proc={proc} rank={i + 1} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No process data available.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
