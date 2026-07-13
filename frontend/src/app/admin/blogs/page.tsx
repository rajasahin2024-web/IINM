"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL } from "@/lib/config";
import { AdminProvider } from "../components/ProtectedAdmin";

/* ─── Types ─── */
interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image: string | null;
  category_name: string | null;
  category_color: string | null;
  subcategory_name: string | null;
  tags: string | null;
  author_name: string;
  status: "draft" | "published" | "archived";
  is_featured: boolean;
  reading_time: number;
  views: number;
  published_at: string | null;
  created_at: string;
}
interface Stats {
  total: number;
  published: number;
  drafts: number;
  archived: number;
  featured: number;
  total_views: number;
}

const STATUS_TABS = ["all", "published", "draft", "archived"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

function statusBadge(status: string) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    published: { bg: "#d1fae5", color: "#065f46", label: "Published" },
    draft:     { bg: "#fef3c7", color: "#92400e", label: "Draft" },
    archived:  { bg: "#f1f5f9", color: "#64748b", label: "Archived" },
  };
  const s = map[status] ?? { bg: "#f1f5f9", color: "#64748b", label: status };
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: "2px 10px", borderRadius: 100,
      fontSize: 11, fontWeight: 600,
    }}>{s.label}</span>
  );
}

function BlogsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<StatusTab>("all");
  const [search, setSearch] = useState("");
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<BlogPost | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (tab !== "all") params.set("status", tab);
      if (search.trim()) params.set("search", search.trim());
      const [postsRes, statsRes] = await Promise.all([
        apiFetch(`${API_BASE_URL}/blogs?${params}`),
        apiFetch(`${API_BASE_URL}/blogs/stats`),
      ]);
      if (postsRes.ok) {
        const data = await postsRes.json();
        setPosts(data.items ?? []);
      }
      if (statsRes.ok) setStats(await statsRes.json());
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  useEffect(() => { load(); }, [load]);

  const quickAction = async (id: number, action: "publish" | "archive" | "draft") => {
    await apiFetch(`${API_BASE_URL}/blogs/${id}/${action}`, { method: "POST" });
    load();
  };

  const deletePost = async () => {
    if (!confirm) return;
    setDeleting(confirm.id);
    await apiFetch(`${API_BASE_URL}/blogs/${confirm.id}`, { method: "DELETE" });
    setConfirm(null);
    setDeleting(null);
    load();
  };

  const statCards = [
    { label: "Total Posts", value: stats?.total ?? 0, color: "#6366f1", icon: "📝" },
    { label: "Published",   value: stats?.published ?? 0, color: "#10b981", icon: "🌐" },
    { label: "Drafts",      value: stats?.drafts ?? 0, color: "#f59e0b", icon: "✏️" },
    { label: "Total Views", value: stats?.total_views ?? 0, color: "#3b82f6", icon: "👁️" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <style>{`
        .blog-stat-card { transition: transform 0.15s, box-shadow 0.15s; cursor: default; }
        .blog-stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.10); }
        .blog-row { transition: background 0.12s; }
        .blog-row:hover { background: #f8fafc !important; }
        .blog-action-btn { border: none; cursor: pointer; border-radius: 6px; padding: 5px 10px; font-size: 12px; font-weight: 500; transition: opacity 0.15s; }
        .blog-action-btn:hover { opacity: 0.8; }
        .tab-btn { border: none; cursor: pointer; padding: 7px 18px; border-radius: 7px; font-size: 13px; font-weight: 500; transition: all 0.15s; }
        .tab-btn.active { background: #0f172a; color: #fff; }
        .tab-btn:not(.active) { background: transparent; color: #64748b; }
        .tab-btn:not(.active):hover { background: #f1f5f9; color: #0f172a; }
        input[type=search]:focus { outline: none; border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
      `}</style>

      <div style={{ padding: "28px 36px" }}>
        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", margin: 0 }}>Blog Management</h1>
            <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>Write, manage and publish articles for your audience</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => router.push("/admin/blogs/authors")}
              style={{ background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              👥 Authors
            </button>
            <button
              onClick={() => router.push("/admin/blogs/categories")}
              style={{ background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              📁 Categories
            </button>
            <button
              onClick={() => router.push("/admin/blogs/editor/new")}
              style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              + New Post
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
          {statCards.map(s => (
            <div key={s.label} className="blog-stat-card" style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)", borderLeft: `4px solid ${s.color}` }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a" }}>{s.value.toLocaleString()}</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div style={{ background: "#fff", borderRadius: 12, padding: "14px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {STATUS_TABS.map(t => (
              <button key={t} className={`tab-btn ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
                {t !== "all" && stats && (
                  <span style={{ marginLeft: 6, background: tab === t ? "rgba(255,255,255,0.2)" : "#f1f5f9", color: tab === t ? "#fff" : "#64748b", borderRadius: 100, padding: "1px 7px", fontSize: 11 }}>
                    {t === "published" ? stats.published : t === "draft" ? stats.drafts : stats.archived}
                  </span>
                )}
              </button>
            ))}
          </div>
          <input
            type="search"
            placeholder="Search posts…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "7px 14px", fontSize: 13, width: 260, transition: "all 0.2s" }}
          />
        </div>

        {/* ── Table ── */}
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "40px 3fr 1fr 1fr 90px 80px 130px", gap: 12, padding: "10px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            {["", "Title", "Category", "Author", "Status", "Views", "Actions"].map(h => (
              <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</span>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: "48px 20px", textAlign: "center", color: "#94a3b8" }}>Loading…</div>
          ) : posts.length === 0 ? (
            <div style={{ padding: "60px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
              <div style={{ fontSize: 15, color: "#64748b", fontWeight: 500 }}>No posts found</div>
              <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>Click "New Post" to create your first blog article</div>
            </div>
          ) : posts.map((p, i) => (
            <div
              key={p.id}
              className="blog-row"
              style={{
                display: "grid",
                gridTemplateColumns: "40px 3fr 1fr 1fr 90px 80px 130px",
                gap: 12,
                padding: "13px 20px",
                borderBottom: i < posts.length - 1 ? "1px solid #f1f5f9" : "none",
                alignItems: "center",
                background: "#fff",
              }}
            >
              {/* Featured image */}
              <div style={{ width: 32, height: 32, borderRadius: 6, background: "#f1f5f9", overflow: "hidden", flexShrink: 0 }}>
                {p.featured_image ? <img src={p.featured_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>📄</span>}
              </div>

              {/* Title + meta */}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {p.is_featured && <span title="Featured" style={{ marginRight: 6 }}>⭐</span>}
                  {p.title}
                </div>
                <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 2, display: "flex", gap: 8 }}>
                  <span>📖 {p.reading_time} min read</span>
                  {p.published_at && <span>· {new Date(p.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>}
                </div>
              </div>

              {/* Category */}
              <div style={{ fontSize: 12.5, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {p.category_name ? (
                  <span style={{ background: `${p.category_color}20`, color: p.category_color ?? "#6366f1", padding: "2px 8px", borderRadius: 100, fontSize: 11, fontWeight: 600 }}>
                    {p.category_name}
                  </span>
                ) : <span style={{ color: "#cbd5e1" }}>—</span>}
                {p.subcategory_name && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{p.subcategory_name}</div>}
              </div>

              {/* Author */}
              <div style={{ fontSize: 12.5, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.author_name}</div>

              {/* Status */}
              <div>{statusBadge(p.status)}</div>

              {/* Views */}
              <div style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>{p.views.toLocaleString()}</div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 5 }}>
                <button
                  className="blog-action-btn"
                  style={{ background: "#ede9fe", color: "#6d28d9" }}
                  onClick={() => router.push(`/admin/blogs/editor/${p.id}`)}
                >Edit</button>
                {p.status !== "published" && (
                  <button className="blog-action-btn" style={{ background: "#d1fae5", color: "#065f46" }} onClick={() => quickAction(p.id, "publish")}>Publish</button>
                )}
                {p.status === "published" && (
                  <button className="blog-action-btn" style={{ background: "#fef3c7", color: "#92400e" }} onClick={() => quickAction(p.id, "draft")}>Unpublish</button>
                )}
                <button className="blog-action-btn" style={{ background: "#fee2e2", color: "#991b1b" }} onClick={() => setConfirm(p)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Delete Confirm Modal ── */}
      {confirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "32px 28px", maxWidth: 420, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🗑️</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>Delete Post?</h3>
            <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 24px" }}>
              "<strong>{confirm.title}</strong>" will be permanently deleted. This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirm(null)} style={{ border: "1.5px solid #e2e8f0", background: "#fff", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={deletePost} disabled={deleting === confirm.id} style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {deleting === confirm.id ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BlogsPageWrapper() {
  return <AdminProvider><BlogsPage /></AdminProvider>;
}
