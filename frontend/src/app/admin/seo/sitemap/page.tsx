"use client";
import React, { useEffect, useState } from "react";
import { AdminProvider } from "../../components/ProtectedAdmin";
import { useToast } from "../../components/ToastProvider";
import { Icon } from "../../icons";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL } from "@/lib/config";

const S = {
  card: { background: "#fff", border: "1px solid #e2e8f0", padding: 24, marginBottom: 16 } as React.CSSProperties,
  statCard: { background: "#fff", border: "1px solid #e2e8f0", padding: 16 } as React.CSSProperties,
  sectionTitle: { fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid #f1f5f9" } as React.CSSProperties,
  statLabel: { fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: "0.5px" } as React.CSSProperties,
  statValue: { fontSize: 26, fontWeight: 800, color: "#0f172a" } as React.CSSProperties,
  btnPrimary: { padding: "10px 20px", border: "none", background: "#0a1628", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" } as React.CSSProperties,
  btnGhost: { padding: "8px 16px", border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 13, fontWeight: 600, textDecoration: "none" } as React.CSSProperties,
  hint: { fontSize: 12, color: "#94a3b8", marginTop: 12 } as React.CSSProperties,
};

function SeoSitemapInner() {
  const { showToast } = useToast();
  const toast = { success: (m: string) => showToast(m, "success"), error: (m: string) => showToast(m, "error") };
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [pinging, setPinging] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await apiFetch(`${BASE_URL}/api/seo/sitemap-status`);
      if (res.ok) setData(await res.json());
    } catch { toast.error("Failed to load sitemap status."); }
    finally { setLoading(false); }
  };

  const handlePing = async (engine: string) => {
    setPinging(true);
    try {
      const res = await apiFetch(`${BASE_URL}/api/seo/sitemap-ping?engine=${engine}`, { method: "POST" });
      const result = await res.json();
      if (result.status === "success") toast.success(`${engine} pinged successfully.`);
      else toast.error(`${engine} ping failed.`);
    } catch { toast.error("Ping failed."); }
    finally { setPinging(false); }
  };

  if (loading) return <div className="manager-content"><div className="skeleton sk-h1"></div></div>;

  return (
    <div className="manager-content" style={{ width: "100%" }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="map" size={24} /> Sitemap Management
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>Monitor and manage your XML sitemap.</p>
      </header>

      <div style={S.card}>
        <h3 style={S.sectionTitle}>Sitemap URL</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <code style={{ padding: "8px 14px", background: "#f1f5f9", fontSize: 13, color: "#0f172a" }}>
            {data?.base_url || "https://iinmedu.com"}/sitemap.xml
          </code>
          <a href={`/sitemap.xml`} target="_blank" rel="noopener noreferrer" style={S.btnGhost}>Open Sitemap</a>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
        <div style={S.statCard}>
          <div style={S.statLabel}>Total URLs</div>
          <div style={S.statValue}>{data?.total || 0}</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statLabel}>Courses</div>
          <div style={S.statValue}>{data?.courses?.count || 0}</div>
          {data?.courses?.last_modified && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Last: {new Date(data.courses.last_modified).toLocaleDateString()}</div>}
        </div>
        <div style={S.statCard}>
          <div style={S.statLabel}>Blogs</div>
          <div style={S.statValue}>{data?.blogs?.count || 0}</div>
          {data?.blogs?.last_modified && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Last: {new Date(data.blogs.last_modified).toLocaleDateString()}</div>}
        </div>
        <div style={S.statCard}>
          <div style={S.statLabel}>Static Pages</div>
          <div style={S.statValue}>{data?.static?.count || 0}</div>
        </div>
      </div>

      <div style={S.card}>
        <h3 style={S.sectionTitle}>Submit to Search Engines</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => handlePing("google")} disabled={pinging} style={{ ...S.btnPrimary, background: "#4285f4", opacity: pinging ? 0.6 : 1, cursor: pinging ? "not-allowed" : "pointer" }}>Ping Google</button>
          <button onClick={() => handlePing("bing")} disabled={pinging} style={{ ...S.btnPrimary, background: "#0078d4", opacity: pinging ? 0.6 : 1, cursor: pinging ? "not-allowed" : "pointer" }}>Ping Bing</button>
        </div>
        <div style={S.hint}>The sitemap is auto-generated at /sitemap.xml with ISR (1 hour revalidation). No manual generation needed.</div>
      </div>

      <div style={S.card}>
        <h3 style={S.sectionTitle}>Included URLs</h3>
        <ul style={{ margin: 0, padding: "0 0 0 20px", fontSize: 13, color: "#475569", lineHeight: 1.8 }}>
          <li>/ (Home)</li>
          <li>/courses (Course listing)</li>
          <li>/courses/[slug] (Each published course)</li>
          <li>/blog (Blog listing)</li>
          <li>/blog/[slug] (Each published blog post)</li>
          <li>/about-us, /about-iinm, /contact-us</li>
        </ul>
        <h3 style={{ fontSize: 13, fontWeight: 700, marginTop: 16, marginBottom: 8, color: "#ef4444" }}>Excluded</h3>
        <ul style={{ margin: 0, padding: "0 0 0 20px", fontSize: 13, color: "#94a3b8", lineHeight: 1.8 }}>
          <li>/admin/* (Admin panel)</li>
          <li>/api/* (API routes)</li>
          <li>/login, /device-admin, /device-request</li>
          <li>Draft/unpublished courses and blogs</li>
        </ul>
      </div>
    </div>
  );
}

export default function SeoSitemapPage() {
  return <AdminProvider><SeoSitemapInner /></AdminProvider>;
}
