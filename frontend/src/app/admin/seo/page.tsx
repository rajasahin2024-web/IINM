"use client";
import React, { useEffect, useState } from "react";
import { AdminProvider } from "../components/ProtectedAdmin";
import { useToast } from "../components/ToastProvider";
import { Icon } from "../icons";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL } from "@/lib/config";
import SeoScoreBadge from "../components/SeoScoreBadge";

const S = {
  card: { background: "#fff", border: "1px solid #e2e8f0", padding: 20 } as React.CSSProperties,
  statCard: { background: "#fff", border: "1px solid #e2e8f0", padding: 16 } as React.CSSProperties,
  sectionTitle: { fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid #f1f5f9" } as React.CSSProperties,
  btnPrimary: { padding: "10px 20px", border: "none", background: "#0a1628", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" } as React.CSSProperties,
  btnGhost: { padding: "10px 20px", border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 13, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center" } as React.CSSProperties,
  statLabel: { fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: "0.5px" } as React.CSSProperties,
  statValue: { fontSize: 26, fontWeight: 800, color: "#0f172a" } as React.CSSProperties,
};

function SeoDashboardInner() {
  const { showToast } = useToast();
  const toast = { success: (m: string) => showToast(m, "success"), error: (m: string) => showToast(m, "error") };
  const [loading, setLoading] = useState(true);
  const [sitemap, setSitemap] = useState<any>(null);
  const [gscStats, setGscStats] = useState<any>(null);
  const [pinging, setPinging] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [smRes, gscRes] = await Promise.all([
        apiFetch(`${BASE_URL}/api/seo/sitemap-status`),
        apiFetch(`${BASE_URL}/api/seo/gsc/stats`).catch(() => null),
      ]);
      if (smRes.ok) setSitemap(await smRes.json());
      if (gscRes && gscRes.ok) setGscStats(await gscRes.json());
    } catch { toast.error("Failed to load SEO data."); }
    finally { setLoading(false); }
  };

  const handlePing = async (engine: string) => {
    setPinging(true);
    try {
      const res = await apiFetch(`${BASE_URL}/api/seo/sitemap-ping?engine=${engine}`, { method: "POST" });
      const data = await res.json();
      if (data.status === "success") toast.success(`${engine} pinged successfully.`);
      else toast.error(`${engine} ping failed: ${data.message || "unknown"}`);
    } catch { toast.error("Ping failed."); }
    finally { setPinging(false); }
  };

  if (loading) return (
    <div className="manager-content" style={{ width: "100%" }}>
      <header style={{ marginBottom: 20 }}><div className="skeleton sk-h1"></div></header>
      <div className="skeleton sk-title"></div>
    </div>
  );

  const summary = gscStats?.summary || { impressions: 0, clicks: 0, ctr: 0, avg_position: 0 };

  return (
    <div className="manager-content" style={{ width: "100%" }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="search" size={24} /> SEO / AEO Dashboard
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>Monitor search rankings, sitemap health, and AEO performance.</p>
      </header>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div style={S.statCard}>
          <div style={S.statLabel}>Sitemap URLs</div>
          <div style={S.statValue}>{sitemap?.total || 0}</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statLabel}>GSC Impressions</div>
          <div style={S.statValue}>{summary.impressions.toLocaleString()}</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statLabel}>GSC Clicks</div>
          <div style={S.statValue}>{summary.clicks.toLocaleString()}</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statLabel}>Avg Position</div>
          <div style={S.statValue}>{summary.avg_position}</div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ ...S.card, marginBottom: 16 }}>
        <h3 style={S.sectionTitle}>Quick Actions</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => handlePing("google")} disabled={pinging} style={{ ...S.btnPrimary, background: "#4285f4", opacity: pinging ? 0.6 : 1, cursor: pinging ? "not-allowed" : "pointer" }}>
            Ping Google
          </button>
          <button onClick={() => handlePing("bing")} disabled={pinging} style={{ ...S.btnPrimary, background: "#0078d4", opacity: pinging ? 0.6 : 1, cursor: pinging ? "not-allowed" : "pointer" }}>
            Ping Bing
          </button>
          <a href={`/sitemap.xml`} target="_blank" rel="noopener noreferrer" style={S.btnGhost}>View Sitemap</a>
          <a href={`/llms.txt`} target="_blank" rel="noopener noreferrer" style={S.btnGhost}>View llms.txt</a>
          <a href={`/robots.txt`} target="_blank" rel="noopener noreferrer" style={S.btnGhost}>View robots.txt</a>
        </div>
      </div>

      {/* Sitemap breakdown */}
      <div style={{ ...S.card, marginBottom: 16 }}>
        <h3 style={S.sectionTitle}>Sitemap Breakdown</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Courses</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>{sitemap?.courses?.count || 0}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Blogs</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>{sitemap?.blogs?.count || 0}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Static Pages</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>{sitemap?.static?.count || 0}</div>
          </div>
        </div>
      </div>

      {/* Top queries */}
      {gscStats?.top_queries && gscStats.top_queries.length > 0 && (
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
              {gscStats.top_queries.slice(0, 10).map((q: any, i: number) => (
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
    </div>
  );
}

export default function SeoDashboardPage() {
  return (
    <AdminProvider>
      <SeoDashboardInner />
    </AdminProvider>
  );
}
