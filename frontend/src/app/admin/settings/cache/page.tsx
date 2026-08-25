"use client";
import React, { useState, useEffect, useCallback } from "react";
import { AdminProvider } from "../../components/ProtectedAdmin";
import { useToast } from "../../components/ToastProvider";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL } from "@/lib/config";
import { Icon } from "../../icons";

interface CacheKeyDetail {
  key: string;
  age_seconds: number;
  ttl_seconds: number;
  remaining_seconds: number;
  expired: boolean;
}

interface CacheStats {
  entries: number;
  hits: number;
  misses: number;
  sets: number;
  invalidations: number;
  hit_rate: number;
  keys: CacheKeyDetail[];
}

function CachePanel() {
  const { showToast } = useToast();
  const toast = {
    success: (m: string) => showToast(m, "success"),
    error: (m: string) => showToast(m, "error"),
  };
  const baseUrl = BASE_URL;

  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [filter, setFilter] = useState("");

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiFetch(`${baseUrl}/api/settings/cache/stats`, {
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else if (res.status === 401) {
        toast.error("Unauthorized — admin device token required.");
      } else {
        toast.error("Failed to fetch cache stats.");
      }
    } catch (err) {
      console.error("Cache stats fetch error", err);
      toast.error("Network error while fetching cache stats.");
    } finally {
      setLoading(false);
    }
  }, [baseUrl, toast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchStats, 3000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchStats]);

  const handleClearAll = async () => {
    if (!confirm("Clear the ENTIRE cache? All cached responses will be re-fetched from the database on next request.")) return;
    setBusy("clear");
    try {
      const res = await apiFetch(`${baseUrl}/api/settings/cache/clear`, { method: "DELETE" });
      if (res.ok) {
        const r = await res.json();
        toast.success(`Cache cleared — ${r.entries_cleared} entries removed.`);
        await fetchStats();
      } else {
        toast.error("Failed to clear cache.");
      }
    } catch {
      toast.error("Network error while clearing cache.");
    } finally {
      setBusy(null);
    }
  };

  const handleInvalidateKey = async (key: string) => {
    setBusy(`inv:${key}`);
    try {
      const res = await apiFetch(
        `${baseUrl}/api/settings/cache/invalidate/${encodeURIComponent(key)}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        toast.success(`Invalidated: ${key}`);
        await fetchStats();
      } else {
        toast.error(`Failed to invalidate ${key}.`);
      }
    } catch {
      toast.error("Network error while invalidating key.");
    } finally {
      setBusy(null);
    }
  };

  const handleResetStats = async () => {
    if (!confirm("Reset hit/miss/set/invalidation counters to zero? Cache entries will remain.")) return;
    setBusy("reset");
    try {
      const res = await apiFetch(`${baseUrl}/api/settings/cache/reset-stats`, { method: "POST" });
      if (res.ok) {
        toast.success("Counters reset.");
        await fetchStats();
      } else {
        toast.error("Failed to reset counters.");
      }
    } catch {
      toast.error("Network error while resetting counters.");
    } finally {
      setBusy(null);
    }
  };

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    borderRadius: 14,
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)",
    border: "1px solid #f1f5f9",
    marginBottom: 24,
    overflow: "hidden",
  };

  const statCardStyle: React.CSSProperties = {
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    padding: "16px 18px",
    flex: "1 1 0",
    minWidth: 130,
  };

  const filteredKeys = stats
    ? stats.keys.filter((k) => k.key.toLowerCase().includes(filter.toLowerCase()))
    : [];

  const hitRatePct = stats ? (stats.hit_rate * 100).toFixed(1) : "0.0";
  const totalRequests = stats ? stats.hits + stats.misses : 0;

  return (
    <div style={{ width: "100%", padding: "24px 24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="database" size={20} /> Response Cache
          </h1>
          <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>
            In-memory TTL cache for public GET endpoints. Process-local — not shared across workers.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b", cursor: "pointer", userSelect: "none" }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            Auto-refresh (3s)
          </label>
          <button
            onClick={fetchStats}
            disabled={loading}
            style={{
              background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8,
              padding: "8px 14px", fontSize: 13, fontWeight: 600, color: "#0f172a",
              cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <Icon name="refresh-cw" size={14} /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Loading cache stats…</div>
      ) : stats ? (
        <>
          {/* Stat cards */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
            <div style={statCardStyle}>
              <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>Entries</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>{stats.entries}</div>
            </div>
            <div style={statCardStyle}>
              <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>Hits</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#10b981", marginTop: 4 }}>{stats.hits}</div>
            </div>
            <div style={statCardStyle}>
              <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>Misses</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#f59e0b", marginTop: 4 }}>{stats.misses}</div>
            </div>
            <div style={statCardStyle}>
              <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>Hit Rate</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#0ea5e9", marginTop: 4 }}>{hitRatePct}%</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{totalRequests} total requests</div>
            </div>
            <div style={statCardStyle}>
              <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>Sets</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#6366f1", marginTop: 4 }}>{stats.sets}</div>
            </div>
            <div style={statCardStyle}>
              <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>Invalidations</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#ef4444", marginTop: 4 }}>{stats.invalidations}</div>
            </div>
          </div>

          {/* Action bar */}
          <div style={{ ...cardStyle, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div style={{ fontSize: 13, color: "#475569", display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="alert-triangle" size={16} />
              <span>Clearing the cache forces next requests to hit the database. Use after manual DB edits.</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleResetStats}
                disabled={busy === "reset"}
                style={{
                  background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8,
                  padding: "9px 16px", fontSize: 13, fontWeight: 600, color: "#475569",
                  cursor: busy === "reset" ? "not-allowed" : "pointer",
                }}
              >
                {busy === "reset" ? "Resetting…" : "Reset Counters"}
              </button>
              <button
                onClick={handleClearAll}
                disabled={busy === "clear"}
                style={{
                  background: busy === "clear" ? "#fca5a5" : "#ef4444", color: "#fff", border: "none",
                  borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 700,
                  cursor: busy === "clear" ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6,
                }}
              >
                <Icon name="trash" size={14} /> {busy === "clear" ? "Clearing…" : "Clear All Cache"}
              </button>
            </div>
          </div>

          {/* Keys table */}
          <div style={cardStyle}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="layers" size={16} /> Cached Keys ({filteredKeys.length}{filter ? ` of ${stats.keys.length}` : ""})
              </div>
              <input
                type="text"
                placeholder="Filter keys…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                style={{
                  border: "1px solid #e2e8f0", borderRadius: 8, padding: "7px 12px",
                  fontSize: 13, color: "#0f172a", outline: "none", width: 220,
                }}
              />
            </div>

            {filteredKeys.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                {stats.keys.length === 0 ? "Cache is empty. Public GET requests will populate it." : "No keys match your filter."}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                      <th style={{ padding: "10px 16px", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.4px" }}>Key</th>
                      <th style={{ padding: "10px 16px", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.4px" }}>Age</th>
                      <th style={{ padding: "10px 16px", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.4px" }}>TTL</th>
                      <th style={{ padding: "10px 16px", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.4px" }}>Remaining</th>
                      <th style={{ padding: "10px 16px", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.4px" }}>Status</th>
                      <th style={{ padding: "10px 16px", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.4px", textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredKeys.map((k) => {
                      const remainingPct = k.ttl_seconds > 0 ? Math.max(0, Math.min(100, (k.remaining_seconds / k.ttl_seconds) * 100)) : 0;
                      const barColor = remainingPct > 50 ? "#10b981" : remainingPct > 20 ? "#f59e0b" : "#ef4444";
                      return (
                        <tr key={k.key} style={{ borderTop: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "10px 16px", color: "#0f172a", fontWeight: 600, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>
                            {k.key}
                          </td>
                          <td style={{ padding: "10px 16px", color: "#64748b" }}>{k.age_seconds}s</td>
                          <td style={{ padding: "10px 16px", color: "#64748b" }}>{k.ttl_seconds}s</td>
                          <td style={{ padding: "10px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 80, height: 6, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
                                <div style={{ width: `${remainingPct}%`, height: "100%", background: barColor, transition: "width 0.3s" }} />
                              </div>
                              <span style={{ color: "#475569", fontSize: 12 }}>{k.remaining_seconds}s</span>
                            </div>
                          </td>
                          <td style={{ padding: "10px 16px" }}>
                            {k.expired ? (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fee2e2", color: "#dc2626", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                                <Icon name="alert-circle" size={12} /> Expired
                              </span>
                            ) : (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#dcfce7", color: "#16a34a", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                                <Icon name="check-circle" size={12} /> Active
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "10px 16px", textAlign: "right" }}>
                            <button
                              onClick={() => handleInvalidateKey(k.key)}
                              disabled={busy === `inv:${k.key}`}
                              style={{
                                background: "#fff", border: "1px solid #fecaca", borderRadius: 6,
                                padding: "5px 10px", fontSize: 12, fontWeight: 600, color: "#ef4444",
                                cursor: busy === `inv:${k.key}` ? "not-allowed" : "pointer",
                              }}
                            >
                              {busy === `inv:${k.key}` ? "…" : "Invalidate"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Architecture note */}
          <div style={{ ...cardStyle, padding: "16px 20px", background: "#f8fafc", borderColor: "#e2e8f0" }}>
            <div style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "flex-start", gap: 8 }}>
              <Icon name="alert-circle" size={14} />
              <div>
                <b>Multi-worker note:</b> This cache is process-local. Each Uvicorn worker maintains its own cache and own DB connection pool. Invalidation does not propagate across workers. For multi-process production, migrate to Redis (same interface in <code style={{ background: "#e2e8f0", padding: "1px 4px", borderRadius: 3, fontSize: 11 }}>backend/cache.py</code>).
              </div>
            </div>
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>No stats available.</div>
      )}
    </div>
  );
}

export default function CacheSettingsPage() {
  return (
    <AdminProvider>
      <CachePanel />
    </AdminProvider>
  );
}
