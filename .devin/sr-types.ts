/**
 * Server resource overview — a live snapshot of the host running this
 * Paperclip instance. Board-only; never persisted. See
 * `server/src/routes/server-resource.ts` for the producer.
 */

export interface ServerResourceCpu {
  /** Overall CPU utilization percentage across all cores (0–100). */
  overallPct: number;
  /** Per-core utilization percentage (0–100), one entry per logical core. */
  perCorePct: number[];
  /** CPU model name (e.g. "Intel(R) Core(TM) i7-9700K CPU @ 3.60GHz"). */
  model: string;
  /** Number of logical cores. */
  cores: number;
  /** Estimated clock speed in MHz, when available. */
  speedMhz: number | null;
}

export interface ServerResourceMemory {
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  /** Used memory as a percentage of total (0–100). */
  usedPct: number;
}

export interface ServerResourceDisk {
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  /** Used disk as a percentage of total (0–100). */
  usedPct: number;
  /** Mount point / filesystem being reported (root by default). */
  mount: string;
}

export interface ServerResourceLoadAvg {
  one: number;
  five: number;
  fifteen: number;
}

export interface ServerResourceProcess {
  pid: number;
  /** Short command name. */
  name: string;
  /** CPU percentage reported by `ps` (0–100, may exceed 100 on multicore). */
  cpuPct: number;
  /** Memory percentage reported by `ps` (0–100). */
  memPct: number;
  /** Full command line (executable path + args) reported by `ps args`. */
  command: string;
  /** Absolute path to the executable, when resolvable from /proc/<pid>/exe. */
  exePath: string | null;
  /** Process start time as reported by /proc/<pid>/stat (ISO 8601). */
  startedAt: string | null;
}

export interface ServerResourceOverview {
  cpu: ServerResourceCpu;
  memory: ServerResourceMemory;
  disk: ServerResourceDisk;
  loadAvg: ServerResourceLoadAvg;
  uptimeSeconds: number;
  platform: string;
  hostname: string;
  /** Top processes by CPU usage, capped at 5. */
  topProcesses: ServerResourceProcess[];
}
