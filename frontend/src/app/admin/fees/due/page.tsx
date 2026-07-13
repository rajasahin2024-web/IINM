"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Icon } from "../../icons";
import { useToast } from "../../components/ToastProvider";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL } from "@/lib/config";
import { AdminProvider } from "../../components/ProtectedAdmin";
import { CSS } from "../../academic/purchase/components";
import { PurchaseDetailModal } from "../../academic/purchase/page";
import "../../admin.css";

const COLS = "1.8fr 1.5fr 1.2fr 1fr 1fr 100px";

function DuePurchasesInner() {
  const { showToast } = useToast();
  const [overdueList, setOverdueList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<number | null>(null);

  // Filters & State
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchOverdue = useCallback(async () => {
    setLoading(true);
    try {
      // Background call to mark as seen (clear notification badge)
      apiFetch(`${API_BASE_URL}/academic/purchases/overdue/mark-seen`, { method: "POST" }).catch(() => {});

      const res = await apiFetch(`${API_BASE_URL}/academic/purchases/overdue`);
      if (res.ok) {
        setOverdueList(await res.json());
      } else {
        throw new Error("Failed to load overdue records");
      }
    } catch (err: any) {
      showToast(err.message, "error");
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    fetchOverdue();
  }, [fetchOverdue]);

  const fmt = (n: number) => `₹${n.toFixed(2)}`;

  const filteredList = overdueList.filter(o => {
    const q = search.toLowerCase();
    return (
      o.student_name?.toLowerCase().includes(q) ||
      o.student_email?.toLowerCase().includes(q) ||
      o.student_phone?.toLowerCase().includes(q)
    );
  });

  const totalDueAmount = filteredList.reduce((sum, o) => sum + o.overdue_installment_amount, 0);

  const exportCSV = () => {
    if (filteredList.length === 0) {
      showToast("No data to export", "warning");
      return;
    }
    const headers = ["Purchase ID", "Student Name", "Email", "Phone", "Course", "Net Fee", "Total Paid", "Total Due", "Inst #", "Inst Due Amount", "Due Date"];
    const rows = filteredList.map(o => [
      o.purchase_id,
      `"${o.student_name}"`,
      o.student_email,
      o.student_phone,
      `"${o.course_title}"`,
      o.net_fee,
      o.paid_amount,
      o.due_amount,
      o.installment_no,
      o.overdue_installment_amount,
      o.due_date
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Due_Outstanding_${new Date().getTime()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="manager-content">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {detailId && <PurchaseDetailModal purchaseId={detailId} onClose={() => setDetailId(null)} onSuccess={fetchOverdue} />}

      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }}>Due (Outstanding)</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>List of students with overdue installment payments</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={exportCSV} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="download" size={14} /> Export CSV
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <div style={{ flex: 1, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "20px", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 50, height: 50, borderRadius: 25, background: "#fef2f2", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="users" size={24} /></div>
          <div>
            <div style={{ fontSize: 13, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Total Defaulters</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>{filteredList.length}</div>
          </div>
        </div>
        <div style={{ flex: 1, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "20px", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 50, height: 50, borderRadius: 25, background: "#fef2f2", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="alert-circle" size={24} /></div>
          <div>
            <div style={{ fontSize: 13, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Total Overdue Amount</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#b91c1c", marginTop: 4 }}>{fmt(totalDueAmount)}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20, background: "#fff", padding: "16px 20px", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,.04)", alignItems: "center" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <div style={{ position: "absolute", left: 14, top: 10, color: "#94a3b8" }}><Icon name="search" size={16} /></div>
          <input type="text" placeholder="Search by student name, email or phone..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px 10px 40px", borderRadius: 8, border: "1px solid #e2e8f0", outline: "none", fontSize: 13, color: "#0f172a" }} />
        </div>
        {search !== "" && (
          <button onClick={() => { setSearch(""); setCurrentPage(1); }} style={{ background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="x" size={14} /> Reset
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,.06)", border: "1px solid #f1f5f9", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", fontSize: 12, fontWeight: 700, color: "#64748b" }}>
          {filteredList.length} records found
        </div>

        <div style={{ overflowX: "auto" }}>
          <div className="tbl-head" style={{ gridTemplateColumns: COLS, minWidth: 900 }}>
            <span>Student</span>
            <span>Course & Total Due</span>
            <span>Overdue Amount</span>
            <span>Inst #</span>
            <span>Due Date</span>
            <span>Action</span>
          </div>
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>Loading records...</div>
          ) : overdueList.length === 0 ? (
            <div style={{ padding: "60px", textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: 28, background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "#10b981" }}><Icon name="check-circle" size={26} /></div>
              <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 16 }}>Great job! No due payments.</div>
              <div style={{ color: "#64748b", fontSize: 14, marginTop: 6 }}>All active students are up to date with their installments.</div>
            </div>
          ) : filteredList.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>No records match your search.</div>
          ) : filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((o: any) => {
            return (
              <div key={o.purchase_id} className="tbl-row" style={{ gridTemplateColumns: COLS, minWidth: 900, cursor: "pointer", background: "#fef2f2" }} onClick={() => setDetailId(o.purchase_id)}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{o.student_name}</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{o.student_phone}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{o.student_email}</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: "#475569", fontWeight: 700 }}>{o.course_title}</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Total Due: <span style={{color:"#0f172a", fontWeight:700}}>{fmt(o.due_amount)}</span></div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#b91c1c" }}>{fmt(o.overdue_installment_amount)}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Inst #{o.installment_no}</div>
                <div><span style={{ background: "#fee2e2", color: "#ef4444", padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{o.due_date}</span></div>
                <div>
                  <span style={{ background: "#fff", border: "1px solid #ef4444", padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700, color: "#ef4444", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Icon name="dollar-sign" size={12} /> Pay Now
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {filteredList.length > itemsPerPage && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "#fff", borderTop: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredList.length)} of {filteredList.length} records
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)} style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: "#0f172a", fontSize: 13, fontWeight: 600, cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? .5 : 1 }}>Previous</button>
              <button disabled={currentPage === Math.ceil(filteredList.length / itemsPerPage)} onClick={() => setCurrentPage(currentPage + 1)} style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: "#0f172a", fontSize: 13, fontWeight: 600, cursor: currentPage === Math.ceil(filteredList.length / itemsPerPage) ? "not-allowed" : "pointer", opacity: currentPage === Math.ceil(filteredList.length / itemsPerPage) ? .5 : 1 }}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DuePurchasesPage() {
  return <AdminProvider><DuePurchasesInner /></AdminProvider>;
}
