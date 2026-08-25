"use client";
import React, { useState, useEffect, useCallback } from "react";
import { AdminProvider } from "../../../components/ProtectedAdmin";
import { useToast } from "../../../components/ToastProvider";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL } from "@/lib/config";
import { Icon } from "../../../icons";

const API = BASE_URL;

interface Application {
  id: number;
  job_post_id: number | null;
  job_title: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  cv_url: string | null;
  cover_note: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  twitter_url: string | null;
  expected_salary: number | null;
  notice_period_days: number | null;
  years_experience: number | null;
  status: string;
  admin_notes: string | null;
  is_read: boolean;
  created_at: string;
}

const STATUSES = ["new", "reviewing", "interview", "hired", "rejected"] as const;
const STATUS_META: Record<string, { bg: string; c: string; label: string }> = {
  new:        { bg: "#dbeafe", c: "#1e40af", label: "New" },
  reviewing:  { bg: "#fef3c7", c: "#92400e", label: "Reviewing" },
  interview:  { bg: "#e0e7ff", c: "#4338ca", label: "Interview" },
  hired:      { bg: "#d1fae5", c: "#065f46", label: "Hired" },
  rejected:   { bg: "#fee2e2", c: "#991b1b", label: "Rejected" },
};

function ApplicationsInner() {
  const { showToast } = useToast();
  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Application | null>(null);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Application | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (filter !== "all") params.set("status", filter);
      const res = await apiFetch(`${API}/api/career/applications?${params}`);
      if (res.ok) { const d = await res.json(); setItems(d.items || []); }
    } catch { showToast("Failed to load applications.", "error"); }
    finally { setLoading(false); }
  }, [filter, showToast]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (a: Application) => {
    setSelected(a);
    setNotes(a.admin_notes || "");
    // Mark as read
    if (!a.is_read) {
      try {
        await apiFetch(`${API}/api/career/applications/${a.id}/read`, { method: "PATCH" });
        setItems(prev => prev.map(x => x.id === a.id ? { ...x, is_read: true } : x));
      } catch { /* non-critical */ }
    }
  };

  const changeStatus = async (status: string) => {
    if (!selected) return;
    setChangingStatus(true);
    try {
      const res = await apiFetch(`${API}/api/career/applications/${selected.id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = { ...selected, status };
        setSelected(updated);
        setItems(prev => prev.map(x => x.id === selected.id ? updated : x));
        showToast(`Status set to ${STATUS_META[status]?.label || status}.`, "success");
      }
    } catch { showToast("Status change failed.", "error"); }
    finally { setChangingStatus(false); }
  };

  const saveNotes = async () => {
    if (!selected) return;
    setSavingNotes(true);
    try {
      const res = await apiFetch(`${API}/api/career/applications/${selected.id}/notes`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ admin_notes: notes }),
      });
      if (res.ok) {
        setItems(prev => prev.map(x => x.id === selected.id ? { ...x, admin_notes: notes } : x));
        showToast("Notes saved.", "success");
      }
    } catch { showToast("Failed to save notes.", "error"); }
    finally { setSavingNotes(false); }
  };

  const del = async () => {
    if (!confirmDel) return;
    try {
      await apiFetch(`${API}/api/career/applications/${confirmDel.id}`, { method: "DELETE" });
      showToast("Application deleted.", "success");
      if (selected?.id === confirmDel.id) setSelected(null);
      setConfirmDel(null);
      load();
    } catch { showToast("Delete failed.", "error"); }
  };

  const filtered = items.filter(a =>
    !search || a.full_name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase())
  );

  const fmtDate = (s: string) => s ? new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 14, border: "1.5px solid #e2e8f0",
    outline: "none", boxSizing: "border-box", fontFamily: "inherit", color: "#0f172a", background: "#fff",
  };

  return (
    <div style={{ padding: "40px 48px", width: "100%", fontFamily: "'Inter', sans-serif", boxSizing: "border-box" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: "0 0 6px" }}>Job Requests</h1>
      <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 24px" }}>Candidate applications and their hiring pipeline.</p>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        <button onClick={() => setFilter("all")} style={{
          border: "none", cursor: "pointer", padding: "7px 16px", borderRadius: 7, fontSize: 13, fontWeight: 600,
          background: filter === "all" ? "#0f172a" : "transparent", color: filter === "all" ? "#fff" : "#64748b",
        }}>All <span style={{ opacity: 0.6, marginLeft: 4 }}>{items.length}</span></button>
        {STATUSES.map(st => (
          <button key={st} onClick={() => setFilter(st)} style={{
            border: "none", cursor: "pointer", padding: "7px 16px", borderRadius: 7, fontSize: 13, fontWeight: 600,
            background: filter === st ? "#0f172a" : "transparent", color: filter === st ? "#fff" : "#64748b",
          }}>{STATUS_META[st].label}</button>
        ))}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…" style={{ ...inputStyle, marginBottom: 20, maxWidth: 320 }} />

      {loading ? (
        <div style={{ color: "#94a3b8", fontSize: 14 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", color: "#94a3b8", fontSize: 14, background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0" }}>
          No applications found.
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Candidate</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Applied For</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Date</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Status</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "right" }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => {
                const sm = STATUS_META[a.status] || STATUS_META.new;
                return (
                  <tr key={a.id} onClick={() => openDetail(a)} style={{ borderTop: "1px solid #f1f5f9", cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 600, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                        {!a.is_read && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#3b6fe0", flexShrink: 0 }} />}
                        {a.full_name}
                      </div>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>{a.email}</div>
                    </td>
                    <td style={{ padding: "14px 16px", color: "#64748b" }}>{a.job_title || "Open application"}</td>
                    <td style={{ padding: "14px 16px", color: "#94a3b8", fontSize: 12 }}>{fmtDate(a.created_at)}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ background: sm.bg, color: sm.c, padding: "2px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600 }}>{sm.label}</span>
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <Icon name="chevron-right" size={14} color="#cbd5e1" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail drawer */}
      {selected && (
        <>
          <div onClick={() => setSelected(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", zIndex: 1000 }} />
          <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0, width: "100%", maxWidth: 480, background: "#fff",
            zIndex: 1001, overflow: "auto", boxShadow: "-8px 0 32px rgba(0,0,0,0.1)", padding: 32, boxSizing: "border-box",
            fontFamily: "'Inter', sans-serif",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: 0 }}>{selected.full_name}</h2>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{selected.email}{selected.phone ? ` · ${selected.phone}` : ""}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ border: "none", background: "#f1f5f9", borderRadius: 6, width: 32, height: 32, cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="x" size={16} /></button>
            </div>

            {/* Status pipeline */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Pipeline</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {STATUSES.map(st => {
                  const sm = STATUS_META[st];
                  const active = selected.status === st;
                  return (
                    <button key={st} onClick={() => changeStatus(st)} disabled={changingStatus} style={{
                      border: active ? "none" : `1px solid #e2e8f0`, background: active ? sm.bg : "#fff", color: active ? sm.c : "#64748b",
                      borderRadius: 7, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: changingStatus ? "wait" : "pointer",
                    }}>{sm.label}</button>
                  );
                })}
              </div>
            </div>

            {/* Applied for */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Applied For</div>
              <div style={{ fontSize: 14, color: "#0f172a" }}>{selected.job_title || "Open application (no specific role)"}</div>
            </div>

            {/* Meta */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20, fontSize: 13 }}>
              {selected.years_experience != null && <div><span style={{ color: "#94a3b8" }}>Experience:</span> <span style={{ color: "#0f172a" }}>{selected.years_experience} yrs</span></div>}
              {selected.expected_salary != null && <div><span style={{ color: "#94a3b8" }}>Expected:</span> <span style={{ color: "#0f172a" }}>₹{selected.expected_salary.toLocaleString("en-IN")}</span></div>}
              {selected.notice_period_days != null && <div><span style={{ color: "#94a3b8" }}>Notice:</span> <span style={{ color: "#0f172a" }}>{selected.notice_period_days} days</span></div>}
              <div><span style={{ color: "#94a3b8" }}>Applied:</span> <span style={{ color: "#0f172a" }}>{fmtDate(selected.created_at)}</span></div>
            </div>

            {/* Cover note */}
            {selected.cover_note && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Cover Note</div>
                <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.6, background: "#f8fafc", padding: 14, borderRadius: 8, border: "1px solid #f1f5f9", whiteSpace: "pre-wrap" }}>{selected.cover_note}</div>
              </div>
            )}

            {/* CV */}
            {selected.cv_url && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>CV / Resume</div>
                <a href={selected.cv_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#0f172a", color: "#fff", textDecoration: "none", borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 600 }}>
                  <Icon name="download" size={16} color="#fff" /> Download CV
                </a>
              </div>
            )}

            {/* Social profiles */}
            {(selected.linkedin_url || selected.github_url || selected.portfolio_url || selected.twitter_url) && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Social Profiles</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {selected.linkedin_url && <a href={selected.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ ...inputStyle, width: "auto", padding: "8px 14px", textDecoration: "none", fontSize: 12, fontWeight: 600 }}>LinkedIn ↗</a>}
                  {selected.github_url && <a href={selected.github_url} target="_blank" rel="noopener noreferrer" style={{ ...inputStyle, width: "auto", padding: "8px 14px", textDecoration: "none", fontSize: 12, fontWeight: 600 }}>GitHub ↗</a>}
                  {selected.portfolio_url && <a href={selected.portfolio_url} target="_blank" rel="noopener noreferrer" style={{ ...inputStyle, width: "auto", padding: "8px 14px", textDecoration: "none", fontSize: 12, fontWeight: 600 }}>Portfolio ↗</a>}
                  {selected.twitter_url && <a href={selected.twitter_url} target="_blank" rel="noopener noreferrer" style={{ ...inputStyle, width: "auto", padding: "8px 14px", textDecoration: "none", fontSize: 12, fontWeight: 600 }}>Twitter ↗</a>}
                </div>
              </div>
            )}

            {/* Admin notes */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Admin Notes</div>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} style={{ ...inputStyle, minHeight: 100, resize: "vertical" }} placeholder="Internal notes about this candidate…" />
              <button onClick={saveNotes} disabled={savingNotes} style={{ marginTop: 8, background: "#0f172a", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: savingNotes ? "wait" : "pointer", opacity: savingNotes ? 0.6 : 1 }}>{savingNotes ? "Saving…" : "Save Notes"}</button>
            </div>

            {/* Delete */}
            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 20, marginTop: 24 }}>
              <button onClick={() => setConfirmDel(selected)} style={{ border: "none", background: "transparent", color: "#dc2626", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="trash" size={14} color="#dc2626" /> Delete application
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete confirm */}
      {confirmDel && (
        <div onClick={() => setConfirmDel(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 400 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>Delete application?</h3>
            <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 20px" }}>“{confirmDel.full_name}” will be permanently removed.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmDel(null)} style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#64748b" }}>Cancel</button>
              <button onClick={del} style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CareerApplicationsPage() {
  return (
    <AdminProvider>
      <ApplicationsInner />
    </AdminProvider>
  );
}
