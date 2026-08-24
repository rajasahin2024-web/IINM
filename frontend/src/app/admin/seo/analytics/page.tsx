"use client";
import React, { useEffect, useState } from "react";
import { AdminProvider } from "../../components/ProtectedAdmin";
import { useToast } from "../../components/ToastProvider";
import { Icon } from "../../icons";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL } from "@/lib/config";
import GscConnectButton from "../../components/GscConnectButton";
import SeoScoreBadge from "../../components/SeoScoreBadge";

const S = {
  card: { background: "#fff", border: "1px solid #e2e8f0", padding: 24, marginBottom: 16 } as React.CSSProperties,
  statCard: { background: "#fff", border: "1px solid #e2e8f0", padding: 16 } as React.CSSProperties,
  sectionTitle: { fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid #f1f5f9" } as React.CSSProperties,
  statLabel: { fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: "0.5px" } as React.CSSProperties,
  statValue: { fontSize: 26, fontWeight: 800, color: "#0f172a" } as React.CSSProperties,
  btnGhost: { padding: "10px 20px", border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 14, cursor: "pointer" } as React.CSSProperties,
  hint: { fontSize: 12, color: "#94a3b8" } as React.CSSProperties,
};

function SeoAnalyticsInner() {
  const { showToast } = useToast();
  const toast = { success: (m: string) => showToast(m, "success"), error: (m: string) => showToast(m, "error") };
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await apiFetch(`${BASE_URL}/api/seo/gsc/stats`).catch(() => null);
      if (res && res.ok) setStats(await res.json());
    } catch { /* not connected */ }
    finally { setLoading(false); }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await apiFetch(`${BASE_URL}/api/seo/gsc/sync`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      toast.success("GSC data synced.");
      load();
    } catch { toast.error("Sync failed. Make sure GSC is connected."); }
    finally { setSyncing(false); }
  };

  if (loading) return <div className="manager-content"><div className="skeleton sk-h1"></div></div>;

  const summary = stats?.summary || { impressions: 0, clicks: 0, ctr: 0, avg_position: 0 };
  const topQueries = stats?.top_queries || [];
  const topPages = stats?.top_pages || [];

  return (
    <div className="manager-content" style={{ width: "100%" }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="bar-chart" size={24} /> SEO Analytics
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>Google Search Console performance and query insights.</p>
      </header>

      {!stats && (
        <div style={S.card}>
          <h3 style={S.sectionTitle}>Connect Google Search Console</h3>
          <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>Connect your GSC account to view search performance data, top queries, and page rankings.</p>
          <GscConnectButton onConnected={load} />
        </div>
      )}

      {stats && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: "#10b981", fontWeight: 600 }}>✓ GSC Connected</span>
            <button onClick={handleSync} disabled={syncing} style={{ ...S.btnGhost, opacity: syncing ? 0.6 : 1, cursor: syncing ? "not-allowed" : "pointer" }}>
              {syncing ? "Syncing..." : "Sync Now"}
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
            <div style={S.statCard}>
              <div style={S.statLabel}>Impressions</div>
              <div style={S.statValue}>{summary.impressions.toLocaleString()}</div>
            </div>
            <div style={S.statCard}>
              <div style={S.statLabel}>Clicks</div>
              <div style={S.statValue}>{summary.clicks.toLocaleString()}</div>
            </div>
            <div style={S.statCard}>
              <div style={S.statLabel}>CTR</div>
              <div style={S.statValue}>{(summary.ctr * 100).toFixed(1)}%</div>
            </div>
            <div style={S.statCard}>
              <div style={S.statLabel}>Avg Position</div>
              <div style={S.statValue}>{summary.avg_position.toFixed(1)}</div>
            </div>
          </div>

          {topQueries.length > 0 && (
            <div style={S.card}>
              <h3 style={S.sectionTitle}>Top Search Queries</h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, color: "#64748b", textTransform: "uppercase" }}>Query</th>
                    <th style={{ textAlign: "right", padding: "8px 12px", fontSize: 11, color: "#64748b", textTransform: "uppercase" }}>Impressions</th>
                    <th style={{ textAlign: "right", padding: "8px 12px", fontSize: 11, color: "#64748b", textTransform: "uppercase" }}>Clicks</th>
                    <th style={{ textAlign: "right", padding: "8px 12px", fontSize: 11, color: "#64748b", textTransform: "uppercase" }}>Position</th>
                  </tr>
                </thead>
                <tbody>
                  {topQueries.slice(0, 15).map((q: any, i: number) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 12px", fontSize: 13, color: "#0f172a" }}>{q.query}</td>
                      <td style={{ padding: "8px 12px", fontSize: 13, color: "#475569", textAlign: "right" }}>{q.impressions}</td>
                      <td style={{ padding: "8px 12px", fontSize: 13, color: "#475569", textAlign: "right" }}>{q.clicks}</td>
                      <td style={{ padding: "8px 12px", fontSize: 13, textAlign: "right" }}>
                        <SeoScoreBadge score={Math.max(0, 100 - q.position * 10)} label="POS" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {topPages.length > 0 && (
            <div style={S.card}>
              <h3 style={S.sectionTitle}>Top Pages</h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, color: "#64748b", textTransform: "uppercase" }}>Page</th>
                    <th style={{ textAlign: "right", padding: "8px 12px", fontSize: 11, color: "#64748b", textTransform: "uppercase" }}>Impressions</th>
                    <th style={{ textAlign: "right", padding: "8px 12px", fontSize: 11, color: "#64748b", textTransform: "uppercase" }}>Clicks</th>
                    <th style={{ textAlign: "right", padding: "8px 12px", fontSize: 11, color: "#64748b", textTransform: "uppercase" }}>Position</th>
                  </tr>
                </thead>
                <tbody>
                  {topPages.slice(0, 15).map((p: any, i: number) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 12px", fontSize: 13, color: "#0f172a" }}><code style={{ fontSize: 12 }}>{p.page || p.url}</code></td>
                      <td style={{ padding: "8px 12px", fontSize: 13, color: "#475569", textAlign: "right" }}>{p.impressions}</td>
                      <td style={{ padding: "8px 12px", fontSize: 13, color: "#475569", textAlign: "right" }}>{p.clicks}</td>
                      <td style={{ padding: "8px 12px", fontSize: 13, color: "#475569", textAlign: "right" }}>{p.position?.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function SeoAnalyticsPage() {
  return <AdminProvider><SeoAnalyticsInner /></AdminProvider>;
}
