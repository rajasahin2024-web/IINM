import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import { Router } from "express";
import type {
  ServerResourceCpu,
  ServerResourceDisk,
  ServerResourceLoadAvg,
  ServerResourceMemory,
  ServerResourceOverview,
  ServerResourceProcess,
} from "@paperclipai/shared";
import { assertBoard } from "./authz.js";

/**
 * Live host resource snapshot for the board. Board-only and never cached —
 * every request samples the machine fresh so the dashboard reflects the
 * server's current state. Mirrors the execFileSync shell-out pattern already
 * used by server-info.ts for git data.
 */
export function serverResourceRoutes() {
  const router = Router();

  router.get("/overview", (req, res) => {
    assertBoard(req);
    res.setHeader("Cache-Control", "no-store");
    res.json(getServerResourceOverview());
  });

  return router;
}

const SAMPLE_INTERVAL_MS = 100;

function cpuTimes(cpus: os.CpuInfo[]): { idle: number; total: number }[] {
  return cpus.map((c) => {
    const { user, nice, sys, idle, irq } = c.times;
    const total = user + nice + sys + idle + irq;
    return { idle, total };
  });
}

function computeCpu(): ServerResourceCpu {
  const cpus = os.cpus();
  const model = cpus.length > 0 ? cpus[0]!.model : "";
  const cores = cpus.length;

  let speedMhz: number | null = null;
  if (cpus.length > 0 && typeof cpus[0]!.speed === "number" && cpus[0]!.speed > 0) {
    speedMhz = cpus[0]!.speed;
  }

  const before = cpuTimes(cpus);
  const start = Date.now();
  while (Date.now() - start < SAMPLE_INTERVAL_MS) {
    // busy-wait a short window to measure the idle/total delta; matches the
    // lightweight sampling approach used by most top-style monitors.
  }
  const after = cpuTimes(os.cpus());

  const perCorePct = before.map((b, i) => {
    const a = after[i] ?? b;
    const idleDelta = a.idle - b.idle;
    const totalDelta = a.total - b.total;
    if (totalDelta <= 0) return 0;
    const used = totalDelta - idleDelta;
    return Math.max(0, Math.min(100, (used / totalDelta) * 100));
  });

  const overallPct =
    perCorePct.length > 0
      ? perCorePct.reduce((sum, pct) => sum + pct, 0) / perCorePct.length
      : 0;

  return { overallPct, perCorePct, model, cores, speedMhz };
}

function computeMemory(): ServerResourceMemory {
  const totalBytes = os.totalmem();
  const availableBytes = os.freemem();
  const usedBytes = totalBytes - availableBytes;
  const usedPct = totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0;
  return { totalBytes, usedBytes, availableBytes, usedPct };
}

function computeDisk(): ServerResourceDisk {
  const mount = "/";
  try {
    const output = execFileSync("df", ["-B1", mount], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 1500,
    });
    const lines = output.trim().split(/\r?\n/);
    const dataLine = lines[lines.length - 1] ?? "";
    const parts = dataLine.trim().split(/\s+/);
    if (parts.length >= 6) {
      const totalBytes = Number(parts[1]);
      const usedBytes = Number(parts[2]);
      const availableBytes = Number(parts[3]);
      if (
        Number.isFinite(totalBytes) &&
        Number.isFinite(usedBytes) &&
        Number.isFinite(availableBytes) &&
        totalBytes > 0
      ) {
        const usedPct = (usedBytes / totalBytes) * 100;
        return { totalBytes, usedBytes, availableBytes, usedPct, mount };
      }
    }
  } catch {
    // df unavailable or failed — fall through to zeros.
  }
  return { totalBytes: 0, usedBytes: 0, availableBytes: 0, usedPct: 0, mount };
}

function computeLoadAvg(): ServerResourceLoadAvg {
  const [one, five, fifteen] = os.loadavg();
  return { one, five, fifteen };
}

/** Resolve the absolute executable path for a PID via /proc/<pid>/exe (Linux). */
function resolveExePath(pid: number): string | null {
  try {
    return fs.realpathSync(`/proc/${pid}/exe`);
  } catch {
    return null;
  }
}

/** Resolve the process start time via /proc/<pid>/stat (Linux). */
function resolveStartedAt(pid: number): string | null {
  try {
    const stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
    const commEnd = stat.lastIndexOf(")");
    if (commEnd === -1) return null;
    const rest = stat.slice(commEnd + 2).split(/\s+/);
    const starttimeTicks = Number(rest[19]);
    if (!Number.isFinite(starttimeTicks)) return null;
    const hz = 100;
    const btimeMatch = fs.readFileSync("/proc/stat", "utf8").match(/btime\s+(\d+)/);
    const bootEpoch = btimeMatch ? Number(btimeMatch[1]) : 0;
    if (!Number.isFinite(bootEpoch) || bootEpoch === 0) return null;
    const startEpoch = bootEpoch + starttimeTicks / hz;
    return new Date(startEpoch * 1000).toISOString();
  } catch {
    return null;
  }
}

function computeTopProcesses(): ServerResourceProcess[] {
  try {
    const output = execFileSync(
      "ps",
      ["-eo", "pid,pcpu,pmem,comm,args", "--sort=-pcpu"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 1500 },
    );
    const lines = output.trim().split(/\r?\n/).slice(1);
    const processes: ServerResourceProcess[] = [];
    for (const line of lines) {
      if (processes.length >= 5) break;
      const trimmed = line.trim();
      if (!trimmed) continue;
      const match = trimmed.match(/^(\d+)\s+([\d.]+)\s+([\d.]+)\s+(\S+)\s+(.*)$/);
      if (!match) continue;
      const pid = Number(match[1]);
      const cpuPct = Number(match[2]);
      const memPct = Number(match[3]);
      const name = match[4]!.trim();
      const command = (match[5] ?? "").trim();
      if (!Number.isFinite(pid) || !Number.isFinite(cpuPct) || !Number.isFinite(memPct)) continue;
      processes.push({
        pid,
        name,
        cpuPct,
        memPct,
        command,
        exePath: resolveExePath(pid),
        startedAt: resolveStartedAt(pid),
      });
    }
    return processes;
  } catch {
    return [];
  }
}

export function getServerResourceOverview(): ServerResourceOverview {
  return {
    cpu: computeCpu(),
    memory: computeMemory(),
    disk: computeDisk(),
    loadAvg: computeLoadAvg(),
    uptimeSeconds: os.uptime(),
    platform: os.platform(),
    hostname: os.hostname(),
    topProcesses: computeTopProcesses(),
  };
}
