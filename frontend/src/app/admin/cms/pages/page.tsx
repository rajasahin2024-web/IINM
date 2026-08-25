"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL, BASE_URL } from "@/lib/config";
import { AdminProvider } from "../../components/ProtectedAdmin";
import { Icon } from "@/app/admin/icons";


/* ─── Types ─── */
interface StaticPage {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image: string | null;
  status: "draft" | "published" | "archived";
  seo_title: string | null;
  updated_at: string | null;
  published_at: string | null;
  created_at: string;
}
interface Stats {
  total: number;
  published: number;
  drafts: number;
  archived: number;
}

const STATUS_TABS = ["all", "published", "draft", "archived"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

const C = {
  navy: "#0a1628",
  red: "#e63946",
  gray50: "#f8fafc",
  gray100: "#f1f5f9",
  gray200: "#e2e8f0",
  gray400: "#94a3b8",
  gray500: "#64748b",
  gray600: "#475569",
  gray900: "#0f172a",
};

function statusBadge(status: string) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    published: { bg: "#dcfce7", color: "#166534", label: "Published" },
    draft:     { bg: "#fef9c3", color: "#854d0e", label: "Draft" },
    archived:  { bg: "#f1f5f9", color: "#64748b", label: "Archived" },
  };
  const s = map[status] ?? { bg: "#f1f5f9", color: "#64748b", label: status };
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: "3px 10px", borderRadius: 3,
      fontSize: 11, fontWeight: 700,
    }}>{s.label}</span>
  );
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function CopyUrl({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : BASE_URL;
  const fullUrl = `${origin}/page/${slug}`;
  const handle = async () => {
    try { await navigator.clipboard.writeText(fullUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };
  return (
    <button onClick={handle} title="Copy public URL" style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: "transparent", border: `1px solid ${C.gray200}`,
      borderRadius: 3, padding: "3px 8px", fontSize: 11.5,
      color: copied ? "#166534" : C.gray500, cursor: "pointer",
      fontWeight: 600, fontFamily: "monospace",
    }}>
      <Icon name={copied ? "check" : "copy"} size={12} />
      {copied ? "Copied" : `/page/${slug}`}
    </button>
  );
}

function ActionBtn({ title, onClick, color, children, disabled = false }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 30, height: 30,
        background: "#fff", border: `1px solid ${C.gray200}`,
        borderRadius: 3, color, cursor: "pointer",
        transition: "all 0.12s",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = C.gray50; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fff"; }}
    >{children}</button>
  );
}

function PagesListPage() {
  const router = useRouter();
  const [tab, setTab] = useState<StatusTab>("all");
  const [search, setSearch] = useState("");
  const [pages, setPages] = useState<StaticPage[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<StaticPage | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (tab !== "all") params.set("status", tab);
      if (search.trim()) params.set("search", search.trim());
      const [pagesRes, statsRes] = await Promise.all([
        apiFetch(`${API_BASE_URL}/pages?${params}`),
        apiFetch(`${API_BASE_URL}/pages/stats`),
      ]);
      if (pagesRes.ok) { const data = await pagesRes.json(); setPages(data.items ?? []); }
      if (statsRes.ok) setStats(await statsRes.json());
    } finally { setLoading(false); }
  }, [tab, search]);

  useEffect(() => { load(); }, [load]);

  const quickAction = async (id: number, action: "publish" | "archive" | "draft") => {
    await apiFetch(`${API_BASE_URL}/pages/${id}/${action}`, { method: "POST" });
    load();
  };

  const deletePage = async () => {
    if (!confirm) return;
    setDeleting(confirm.id);
    await apiFetch(`${API_BASE_URL}/pages/${confirm.id}`, { method: "DELETE" });
    setConfirm(null); setDeleting(null); load();
  };

  const statCards = [
    { label: "Total Pages", value: stats?.total ?? 0, color: C.navy, icon: "file-text" },
    { label: "Published", value: stats?.published ?? 0, color: "#16a34a", icon: "globe" },
    { label: "Drafts", value: stats?.drafts ?? 0, color: "#ca8a04", icon: "clock" },
    { label: "Archived", value: stats?.archived ?? 0, color: C.gray500, icon: "hard-drive" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.gray50, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      <style>{`
        .pg-card { background: #fff; border: 1px solid ${C.gray200}; border-radius: 3px; }
        .pg-stat-card { transition: box-shadow 0.15s; }
        .pg-stat-card:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.06); }
        .pg-row { transition: background 0.12s; }
        .pg-row:hover { background: ${C.gray50} !important; }
        .tab-btn { border: none; cursor: pointer; padding: 8px 18px; border-radius: 3px; font-size: 13px; fontWeight: 700; transition: all 0.12s; }
        .tab-btn.active { background: ${C.navy}; color: #fff; }
        .tab-btn:not(.active) { background: transparent; color: ${C.gray500}; }
        .tab-btn:not(.active):hover { background: ${C.gray100}; color: ${C.gray900}; }
        .pg-search { border: 1px solid ${C.gray200}; border-radius: 3px; padding: 8px 12px; font-size: 13px; outline: none; transition: all 0.15s; }
        .pg-search:focus { border-color: ${C.navy}; box-shadow: 0 0 0 2px rgba(10,22,40,0.08); }
        .pg-icon-act { transition: transform 0.1s; }
        .pg-icon-act:active { transform: scale(0.94); }
        .pg-table { width: 100%; border-collapse: collapse; }
        .pg-table th { text-align: left; padding: 12px 18px; font-size: 11px; font-weight: 800; color: ${C.gray400}; text-transform: uppercase; letter-spacing: 0.4px; background: ${C.gray50}; border-bottom: 1px solid ${C.gray200}; }
        .pg-table td { padding: 14px 18px; border-bottom: 1px solid ${C.gray100}; font-size: 13px; color: ${C.gray600}; }

        @media (max-width: 900px) {
          .pg-list-wrap { padding: 14px 16px; }
          .pg-header { flex-direction: column; align-items: flex-start !important; }
          .pg-stats { grid-template-columns: repeat(2, 1fr) !important; }
          .pg-filters { flex-direction: column; align-items: stretch !important; }
          .pg-search { width: 100%; }
          .pg-table thead { display: none; }
          .pg-table, .pg-table tbody, .pg-table tr, .pg-table td { display: block; width: 100%; }
          .pg-table tr { border: 1px solid ${C.gray200}; border-radius: 3px; margin-bottom: 10px; background: #fff; }
          .pg-table td { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid ${C.gray100}; }
          .pg-table td:last-child { border-bottom: none; }
          .pg-cell-label { font-size: 11px; color: ${C.gray400}; font-weight: 700; text-transform: uppercase; }
          .pg-thumb { width: 42px; height: 42px; }
        }
      `}</style>

      <div className="pg-list-wrap" style={{ padding: "20px 28px" }}>

        {/* Header */}
        <div className="pg-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: C.gray900, margin: 0 }}>Pages</h1>
            <p style={{ color: C.gray500, fontSize: 13, margin: "4px 0 0" }}>Create and manage static website pages.</p>
          </div>
          <button onClick={() => router.push("/admin/cms/pages/editor/new")} style={{ background: C.navy, color: "#fff", border: "none", borderRadius: 3, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="plus" size={15} /> New Page
          </button>
        </div>

        {/* Stats */}
        <div className="pg-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18 }}>
          {statCards.map(s => (
            <div key={s.label} className="pg-card pg-stat-card" style={{ padding: "16px 18px", borderLeft: `4px solid ${s.color}`, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ color: s.color, padding: 8, background: "#fff", border: `1px solid ${C.gray200}`, borderRadius: 3 }}><Icon name={s.icon as any} size={20} /></div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800, color: C.gray900 }}>{s.value.toLocaleString()}</div>
                <div style={{ fontSize: 12, color: C.gray500, fontWeight: 600 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="pg-filters pg-card" style={{ padding: "10px 14px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            {STATUS_TABS.map(t => (
              <button key={t} className={`tab-btn ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
                {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
                {t !== "all" && stats && (
                  <span style={{ marginLeft: 6, background: tab === t ? "rgba(255,255,255,0.18)" : C.gray100, color: tab === t ? "#fff" : C.gray500, borderRadius: 3, padding: "1px 6px", fontSize: 10 }}>
                    {t === "published" ? stats.published : t === "draft" ? stats.drafts : stats.archived}
                  </span>
                )}
              </button>
            ))}
          </div>
          <input type="search" className="pg-search" placeholder="Search pages…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 280 }} />
        </div>

        {/* Table */}
        <div className="pg-card" style={{ overflow: "auto" }}>
          {loading ? (
            <div style={{ padding: "48px 18px", textAlign: "center", color: C.gray400, fontSize: 14 }}>Loading pages…</div>
          ) : pages.length === 0 ? (
            <div style={{ padding: "60px 18px", textAlign: "center" }}>
              <div style={{ fontSize: 34, marginBottom: 10 }}>📄</div>
              <div style={{ fontSize: 15, color: C.gray600, fontWeight: 700 }}>No pages found</div>
              <div style={{ fontSize: 13, color: C.gray400, marginTop: 4 }}>Click “New Page” to create the first one.</div>
            </div>
          ) : (
            <table className="pg-table">
              <thead>
                <tr>
                  <th style={{ width: 56 }}>Thumb</th>
                  <th>Page</th>
                  <th style={{ width: 160 }}>Last Updated</th>
                  <th style={{ width: 120 }}>Status</th>
                  <th style={{ width: 150 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pages.map(p => (
                  <tr key={p.id} className="pg-row" style={{ background: "#fff" }}>
                    <td data-label="Thumb">
                      <div className="pg-thumb" style={{ width: 40, height: 40, borderRadius: 3, background: C.gray100, overflow: "hidden", border: `1px solid ${C.gray200}` }}>
                        {p.featured_image ? <img src={p.featured_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>📄</span>}
                      </div>
                    </td>
                    <td data-label="Page" style={{ minWidth: 260 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ fontWeight: 700, color: C.gray900, fontSize: 14 }}>{p.title}</span>
                        <CopyUrl slug={p.slug} />
                        {p.excerpt && <span style={{ fontSize: 12, color: C.gray500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 360 }}>{p.excerpt}</span>}
                      </div>
                    </td>
                    <td data-label="Last Updated" style={{ whiteSpace: "nowrap" }}>
                      <span style={{ color: C.gray600 }}>{fmtDate(p.updated_at || p.created_at)}</span>
                    </td>
                    <td data-label="Status">{statusBadge(p.status)}</td>
                    <td data-label="Actions" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <ActionBtn title="Edit page" onClick={() => router.push(`/admin/cms/pages/editor/${p.id}`)} color={C.navy}>
                        <Icon name="edit" size={15} />
                      </ActionBtn>
                      {p.status !== "published" ? (
                        <ActionBtn title="Publish" onClick={() => quickAction(p.id, "publish")} color="#16a34a">
                          <Icon name="globe" size={15} />
                        </ActionBtn>
                      ) : (
                        <ActionBtn title="Unpublish" onClick={() => quickAction(p.id, "draft")} color="#ca8a04">
                          <Icon name="eye" size={15} />
                        </ActionBtn>
                      )}
                      <ActionBtn title="Archive" onClick={() => quickAction(p.id, "archive")} color={C.gray500}>
                        <Icon name="hard-drive" size={15} />
                      </ActionBtn>
                      <ActionBtn title="Delete" onClick={() => setConfirm(p)} color={C.red}>
                        <Icon name="trash" size={15} />
                      </ActionBtn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {confirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div className="pg-card" style={{ padding: "28px 24px", maxWidth: 420, width: "100%", boxShadow: "0 12px 32px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Icon name="trash" size={26} color={C.red} />
              <h3 style={{ fontSize: 17, fontWeight: 800, color: C.gray900, margin: 0 }}>Delete Page?</h3>
            </div>
            <p style={{ fontSize: 13.5, color: C.gray500, margin: "0 0 22px", lineHeight: 1.5 }}>
              "<strong>{confirm.title}</strong>" will be permanently removed. The public URL <code style={{ fontFamily: "monospace", background: C.gray50, padding: "2px 6px", borderRadius: 3, color: C.gray900 }}>/page/{confirm.slug}</code> will stop working.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirm(null)} style={{ background: C.gray100, color: C.gray600, border: "none", borderRadius: 3, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button onClick={deletePage} disabled={deleting === confirm.id} style={{ background: C.red, color: "#fff", border: "none", borderRadius: 3, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {deleting === confirm.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PagesListWrapper() {
  return <AdminProvider><PagesListPage /></AdminProvider>;
}
