"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Icon } from "../../icons";
import { apiFetch } from "@/lib/apiFetch";
import { useToast } from "../../components/ToastProvider";
import { AdminProvider } from "../../components/ProtectedAdmin";

interface BrochureLead {
  id: number;
  course_id: number | null;
  course_title: string;
  name: string;
  phone: string;
  email: string | null;
  lead_type: string | null;
  source: string | null;
  is_read: boolean;
  created_at: string | null;
}

const LEAD_TYPES = ["Student", "Business Owner", "Working Professional", "Others"];

function BrochureLeadsView() {
  const { showToast } = useToast();
  const [leads, setLeads] = useState<BrochureLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filterType, setFilterType] = useState<string>("");
  const limit = 20;

  const fetchLeads = useCallback(async (p: number = 1) => {
    setLoading(true);
    try {
      let url = `/api/courses/brochure-leads?page=${p}&limit=${limit}`;
      if (filterType) url += `&lead_type=${encodeURIComponent(filterType)}`;
      const res = await apiFetch(url);
      if (!res.ok) throw new Error("Failed to fetch leads");
      const data = await res.json();
      setLeads(data.items || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      setPages(data.pages || 1);
    } catch (err: any) {
      showToast("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [filterType, showToast]);

  useEffect(() => {
    fetchLeads(1);
  }, [fetchLeads]);

  const markRead = async (id: number) => {
    try {
      const res = await apiFetch(`/api/courses/brochure-leads/${id}/read`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to mark as read");
      setLeads(prev => prev.map(l => l.id === id ? { ...l, is_read: true } : l));
      showToast("Marked as read");
    } catch (err: any) {
      showToast("Error: " + err.message);
    }
  };

  const fmtDate = (d: string | null) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return d;
    }
  };

  const typeColor = (t: string | null) => {
    switch (t) {
      case "Student": return { bg: "#dbeafe", color: "#1d4ed8" };
      case "Business Owner": return { bg: "#fef3c7", color: "#b45309" };
      case "Working Professional": return { bg: "#ede9fe", color: "#6d28d9" };
      case "Others": return { bg: "#f1f5f9", color: "#475569" };
      default: return { bg: "#f1f5f9", color: "#94a3b8" };
    }
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="file-text" size={24} color="#0a1628" /> Brochure Leads
          </h1>
          <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>
            Leads collected from course brochure download form
          </p>
        </div>
        <button
          onClick={() => fetchLeads(page)}
          style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "#0f172a" }}
        >
          <Icon name="refresh-cw" size={14} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Filter by Type:</span>
        <select
          value={filterType}
          onChange={e => { setFilterType(e.target.value); }}
          style={{ padding: "8px 14px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, fontWeight: 600, color: "#0f172a", background: "#fff", cursor: "pointer", outline: "none" }}
        >
          <option value="">All Types</option>
          {LEAD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span style={{ fontSize: 13, color: "#94a3b8", marginLeft: "auto" }}>
          {total} total lead{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "#94a3b8" }}>
            <div style={{ display: "inline-block", width: 36, height: 36, border: "3px solid #e2e8f0", borderTopColor: "#0a1628", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ marginTop: 12, fontWeight: 600 }}>Loading leads...</p>
          </div>
        ) : leads.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "#94a3b8" }}>
            <Icon name="file-text" size={40} color="#cbd5e1" />
            <p style={{ marginTop: 12, fontWeight: 600, fontSize: 15 }}>No brochure leads yet</p>
            <p style={{ fontSize: 13 }}>Leads will appear here when users download course brochures</p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div style={{ display: "grid", gridTemplateColumns: "50px 1.5fr 1.2fr 1fr 1fr 0.8fr 1fr 80px", gap: 12, padding: "12px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <span>#</span>
              <span>Name</span>
              <span>Phone</span>
              <span>Email</span>
              <span>Course</span>
              <span>Type</span>
              <span>Date</span>
              <span>Status</span>
            </div>
            {/* Table Rows */}
            {leads.map((lead, idx) => {
              const tc = typeColor(lead.lead_type);
              return (
                <div
                  key={lead.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "50px 1.5fr 1.2fr 1fr 1fr 0.8fr 1fr 80px",
                    gap: 12,
                    padding: "14px 20px",
                    borderBottom: idx < leads.length - 1 ? "1px solid #f1f5f9" : "none",
                    alignItems: "center",
                    fontSize: 13,
                    color: "#0f172a",
                    background: lead.is_read ? "#fff" : "#fefce8",
                  }}
                >
                  <span style={{ color: "#94a3b8", fontWeight: 600 }}>{(page - 1) * limit + idx + 1}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: lead.is_read ? "#f1f5f9" : "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon name="user" size={14} color={lead.is_read ? "#64748b" : "#1d4ed8"} />
                    </div>
                    <span style={{ fontWeight: 700 }}>{lead.name}</span>
                  </div>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#475569" }}>
                    <Icon name="phone" size={12} color="#94a3b8" /> {lead.phone}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#475569", fontSize: 12 }}>
                    {lead.email ? <><Icon name="mail" size={12} color="#94a3b8" /> {lead.email}</> : "—"}
                  </span>
                  <span style={{ color: "#475569", fontSize: 12, fontWeight: 600 }}>{lead.course_title}</span>
                  <span>
                    {lead.lead_type ? (
                      <span style={{ background: tc.bg, color: tc.color, borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700 }}>{lead.lead_type}</span>
                    ) : "—"}
                  </span>
                  <span style={{ color: "#94a3b8", fontSize: 12 }}>{fmtDate(lead.created_at)}</span>
                  <span>
                    {lead.is_read ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#16a34a", fontSize: 11, fontWeight: 700 }}>
                        <Icon name="check" size={12} color="#16a34a" /> Read
                      </span>
                    ) : (
                      <button
                        onClick={() => markRead(lead.id)}
                        style={{ background: "#fef3c7", color: "#b45309", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                      >
                        <Icon name="eye" size={11} /> Mark Read
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 24 }}>
          <button
            onClick={() => fetchLeads(page - 1)}
            disabled={page <= 1}
            style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.5 : 1, fontSize: 13, fontWeight: 600, color: "#0f172a" }}
          >
            ← Prev
          </button>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#475569", padding: "0 12px" }}>
            Page {page} of {pages}
          </span>
          <button
            onClick={() => fetchLeads(page + 1)}
            disabled={page >= pages}
            style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: page >= pages ? "not-allowed" : "pointer", opacity: page >= pages ? 0.5 : 1, fontSize: 13, fontWeight: 600, color: "#0f172a" }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

export default function BrochureLeadsPage() {
  return (
    <AdminProvider>
      <BrochureLeadsView />
    </AdminProvider>
  );
}
