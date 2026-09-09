"""
Server Resource — live host resource snapshot for the admin dashboard.

Returns a real-time sample of the machine running this backend: CPU usage
(per-core + overall), memory, disk, load average, uptime, and the top 5
processes by CPU. Nothing is persisted or cached — every request samples the
host fresh so the dashboard reflects the server's current state.

Board/admin-only via the standard `require_device` dependency.
"""

from fastapi import APIRouter, Depends
from routers.auth import require_device
import os
import time
import subprocess

router = APIRouter(prefix="/api/server-resource", tags=["server-resource"])

SAMPLE_INTERVAL_MS = 120  # short busy-wait window to measure CPU delta


def _cpu_times():
    """Return [(idle, total)] per logical core from /proc/stat."""
    times = []
    try:
        with open("/proc/stat", "r") as f:
            for line in f:
                if not line.startswith("cpu"):
                    break
                parts = line.split()
                # only aggregate "cpu" lines per core: "cpu0", "cpu1", ...
                if parts[0] == "cpu" or not parts[0][3:].isdigit():
                    continue
                vals = [int(x) for x in parts[1:]]
                idle = vals[3] + (vals[4] if len(vals) > 4 else 0)
                total = sum(vals)
                times.append((idle, total))
    except Exception:
        pass
    return times


def _compute_cpu():
    cpus = os.cpu_count() or 0
    model = ""
    speed_mhz = None
    try:
        with open("/proc/cpuinfo", "r") as f:
            for line in f:
                if line.startswith("model name"):
                    model = line.split(":", 1)[1].strip()
                    break
        for line in f if False else []:
            pass
    except Exception:
        pass
    try:
        with open("/sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq", "r") as f:
            khz = int(f.read().strip())
            speed_mhz = khz / 1000
    except Exception:
        speed_mhz = None

    before = _cpu_times()
    start = time.time()
    while (time.time() - start) * 1000 < SAMPLE_INTERVAL_MS:
        pass
    after = _cpu_times()

    per_core = []
    for i, b in enumerate(before):
        a = after[i] if i < len(after) else b
        idle_d = a[0] - b[0]
        total_d = a[1] - b[1]
        if total_d <= 0:
            per_core.append(0.0)
        else:
            used = total_d - idle_d
            per_core.append(round(max(0.0, min(100.0, (used / total_d) * 100)), 1))

    overall = round(sum(per_core) / len(per_core), 1) if per_core else 0.0
    return {
        "overall_pct": overall,
        "per_core_pct": per_core,
        "model": model,
        "cores": cpus,
        "speed_mhz": speed_mhz,
    }


def _compute_memory():
    total = os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES")
    # Use /proc/meminfo for accurate available memory.
    available = 0
    free = 0
    try:
        with open("/proc/meminfo", "r") as f:
            for line in f:
                if line.startswith("MemAvailable:"):
                    available = int(line.split()[1]) * 1024
                elif line.startswith("MemFree:"):
                    free = int(line.split()[1]) * 1024
    except Exception:
        available = os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_AVPHYS_PAGES")
    if available == 0:
        available = free
    used = total - available
    used_pct = round((used / total) * 100, 1) if total > 0 else 0.0
    return {
        "total_bytes": total,
        "used_bytes": used,
        "available_bytes": available,
        "used_pct": used_pct,
    }


def _compute_disk():
    mount = "/"
    try:
        st = os.statvfs(mount)
        total = st.f_blocks * st.f_frsize
        available = st.f_bavail * st.f_frsize
        used = total - available
        used_pct = round((used / total) * 100, 1) if total > 0 else 0.0
        return {
            "total_bytes": total,
            "used_bytes": used,
            "available_bytes": available,
            "used_pct": used_pct,
            "mount": mount,
        }
    except Exception:
        return {"total_bytes": 0, "used_bytes": 0, "available_bytes": 0, "used_pct": 0.0, "mount": mount}


def _compute_load_avg():
    try:
        with open("/proc/loadavg", "r") as f:
            parts = f.read().split()
            return {"one": float(parts[0]), "five": float(parts[1]), "fifteen": float(parts[2])}
    except Exception:
        return {"one": 0.0, "five": 0.0, "fifteen": 0.0}


def _resolve_exe(pid):
    try:
        return os.readlink(f"/proc/{pid}/exe")
    except Exception:
        return None


def _resolve_started_at(pid):
    try:
        with open(f"/proc/{pid}/stat", "r") as f:
            stat = f.read()
        comm_end = stat.rfind(")")
        if comm_end == -1:
            return None
        rest = stat[comm_end + 2:].split()
        starttime_ticks = int(rest[19])
        with open("/proc/stat", "r") as f:
            btime = 0
            for line in f:
                if line.startswith("btime"):
                    btime = int(line.split()[1])
                    break
        if btime == 0:
            return None
        start_epoch = btime + starttime_ticks / os.sysconf("SC_CLK_TCK")
        import datetime
        return datetime.datetime.utcfromtimestamp(start_epoch).isoformat() + "Z"
    except Exception:
        return None


def _compute_top_processes():
    procs = []
    try:
        out = subprocess.run(
            ["ps", "-eo", "pid,pcpu,pmem,comm,args", "--sort=-pcpu"],
            capture_output=True, text=True, timeout=2,
        ).stdout
        lines = out.strip().split("\n")[1:]
        for line in lines:
            if len(procs) >= 5:
                break
            line = line.strip()
            if not line:
                continue
            # pid pcpu pmem comm args...
            parts = line.split(None, 4)
            if len(parts) < 4:
                continue
            try:
                pid = int(parts[0])
                cpu = float(parts[1])
                mem = float(parts[2])
            except ValueError:
                continue
            name = parts[3]
            command = parts[4] if len(parts) > 4 else ""
            procs.append({
                "pid": pid,
                "name": name,
                "cpu_pct": cpu,
                "mem_pct": mem,
                "command": command,
                "exe_path": _resolve_exe(pid),
                "started_at": _resolve_started_at(pid),
            })
    except Exception:
        pass
    return procs


@router.get("/overview")
def get_server_resource_overview(device: str = Depends(require_device)):
    """Live host resource snapshot. Never cached."""
    return {
        "cpu": _compute_cpu(),
        "memory": _compute_memory(),
        "disk": _compute_disk(),
        "load_avg": _compute_load_avg(),
        "uptime_seconds": int(time.time() - _boot_time()),
        "platform": os.uname().sysname,
        "hostname": os.uname().nodename,
        "top_processes": _compute_top_processes(),
    }


def _boot_time():
    try:
        with open("/proc/stat", "r") as f:
            for line in f:
                if line.startswith("btime"):
                    return int(line.split()[1])
    except Exception:
        pass
    return time.time() - (time.clock_gettime(time.CLOCK_BOOTTIME) if hasattr(time, "CLOCK_BOOTTIME") else 0)
