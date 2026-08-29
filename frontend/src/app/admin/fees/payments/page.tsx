"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "../../icons";
import { API_BASE_URL } from "@/lib/config";
import { apiFetch } from "@/lib/apiFetch";
import { useToast } from "../../components/ToastProvider";
import { AdminProvider } from "../../components/ProtectedAdmin";
import { downloadReceiptPdf, ReceiptData } from "@/lib/receipt";

interface PaymentTransaction {
  id: number;
  purchase_id: number;
  invoice_uuid?: string | null;
  amount: number;
  payment_method: string;
  reference_no: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  student_name: string;
  student_contact: string;
  course_title: string;
}

interface OutstandingDetail {
  purchase_id: number;
  student_name: string;
  student_email: string | null;
  student_phone: string | null;
  course_title: string;
  batch_name: string;
  due_amount: number;
  is_installment: boolean;
  next_due_date: string | null;
}

function fmtRs(num: number) {
  return "₹" + num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

const handleDownloadPaymentReceipt = async (t: PaymentTransaction) => {
  if (!t.invoice_uuid) {
    alert("Receipt not available for this transaction.");
    return;
  }
  try {
    const res = await apiFetch(`${API_BASE_URL}/public/slot-booking/receipt/${t.invoice_uuid}`);
    if (!res.ok) throw new Error("Failed to fetch receipt data");
    const receiptData: ReceiptData = await res.json();
    await downloadReceiptPdf(receiptData);
  } catch (error: any) {
    console.error("PDF generation failed", error);
    alert("Could not download receipt: " + (error.message || "Unknown error"));
  }
};

const handleViewPaymentReceipt = (t: PaymentTransaction) => {
  if (!t.invoice_uuid) {
    alert("Receipt not available for this transaction.");
    return;
  }
  window.open(`/receipt/${t.invoice_uuid}`, "_blank");
};

function PaymentsLedgerView() {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [filterMethod, setFilterMethod] = useState("All");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState<PaymentTransaction | null>(null);
  const { showToast } = useToast();

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("limit", "500");
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);
      if (filterMethod !== "All") params.append("payment_method", filterMethod);
      const res = await apiFetch(`${API_BASE_URL}/academic/payments?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(Array.isArray(data) ? data : (data.items || []));
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to fetch transactions", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [filterStatus, dateFrom, dateTo, filterMethod]);

  const totalProcessed = transactions.filter(t => t.status === "approved").reduce((acc, t) => acc + t.amount, 0);
  const totalPending = transactions.filter(t => t.status === "pending").reduce((acc, t) => acc + t.amount, 0);

  const filteredTxns = transactions.filter(t => {
    if (filterMethod !== "All" && t.payment_method !== filterMethod) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return t.student_name.toLowerCase().includes(q) ||
             (t.student_contact || "").toLowerCase().includes(q) ||
             (t.reference_no || "").toLowerCase().includes(q);
    }
    return true;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterMethod, filterStatus, dateFrom, dateTo]);

  const clearDates = () => {
    setDateFrom("");
    setDateTo("");
  };

  return (
    <div style={{ padding: "24px 32px", background: "#f8fafc", minHeight: "100vh", fontFamily: "var(--font-inter), sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", margin: "0 0 8px 0", letterSpacing: "-0.02em" }}>Payment Ledger</h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: 15 }}>Track all incoming transactions and record manual payments.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          style={{ background: "#4f46e5", color: "#fff", border: "none", padding: "12px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 12px rgba(79,70,229,0.25)", transition: "all 0.2s" }}
          onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"}
          onMouseOut={e => e.currentTarget.style.transform = "none"}
        >
          <Icon name="plus" size={18} /> Record New Payment
        </button>
      </div>

      <div style={{ display: "flex", gap: 24, marginBottom: 32, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220, background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
          <div style={{ color: "#64748b", fontSize: 13, fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569" }}><Icon name="list" size={14}/></div>
            Total Transactions
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#0f172a" }}>{transactions.length}</div>
        </div>
        <div style={{ flex: 1, minWidth: 220, background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
          <div style={{ color: "#64748b", fontSize: 13, fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: "#10b98115", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981" }}><Icon name="dollar-sign" size={14}/></div>
            Total Processed (Approved)
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#10b981" }}>{fmtRs(totalProcessed)}</div>
        </div>
        <div style={{ flex: 1, minWidth: 220, background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
          <div style={{ color: "#64748b", fontSize: 13, fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: "#f59e0b15", display: "flex", alignItems: "center", justifyContent: "center", color: "#d97706" }}><Icon name="clock" size={14}/></div>
            Total Pending
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#d97706" }}>{fmtRs(totalPending)}</div>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.03)", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", gap: 16, background: "#f8fafc", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 240, position: "relative" }}>
            <div style={{ position: "absolute", left: 14, top: 10, color: "#94a3b8" }}><Icon name="search" size={16} /></div>
            <input
              type="text"
              placeholder="Search by student, contact, or ref no..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", padding: "10px 14px 10px 40px", borderRadius: 8, border: "1px solid #e2e8f0", outline: "none", fontSize: 13, boxSizing: "border-box" }}
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{ width: 160, padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0", outline: "none", fontSize: 13, background: "#fff", cursor: "pointer" }}
          >
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", outline: "none", fontSize: 13, background: "#fff", color: "#0f172a" }}
              aria-label="Date from"
            />
            <span style={{ color: "#94a3b8", fontSize: 12 }}>→</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", outline: "none", fontSize: 13, background: "#fff", color: "#0f172a" }}
              aria-label="Date to"
            />
          </div>
          <select
            value={filterMethod}
            onChange={e => setFilterMethod(e.target.value)}
            style={{ width: 180, padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0", outline: "none", fontSize: 13, background: "#fff", cursor: "pointer" }}
          >
            <option value="All">All Payment Methods</option>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Card">Card</option>
            <option value="Cheque">Cheque</option>
          </select>
          {(dateFrom !== "" || dateTo !== "") && (
            <button
              onClick={clearDates}
              style={{ background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca", padding: "10px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
            >
              <Icon name="x" size={12}/> Clear Dates
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>Loading ledger...</div>
        ) : filteredTxns.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "#94a3b8", fontSize: 15, fontWeight: 600 }}>No transactions found.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 2fr 1fr 1fr 1fr 100px", padding: "14px 24px", background: "#f1f5f9", fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
              <div>Date & ID</div>
              <div>Student</div>
              <div>Course</div>
              <div>Method & Ref</div>
              <div style={{ textAlign: "right" }}>Amount</div>
              <div style={{ textAlign: "center" }}>Status</div>
              <div style={{ textAlign: "center" }}>Receipt</div>
            </div>
            {filteredTxns.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((t, idx) => (
              <div key={t.id} style={{ display: "grid", gridTemplateColumns: "1fr 2fr 2fr 1fr 1fr 1fr 100px", padding: "16px 24px", borderBottom: "1px solid #f1f5f9", alignItems: "center", fontSize: 13, background: "#fff", transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background="#f8fafc"} onMouseOut={e => e.currentTarget.style.background="#fff"}>
                <div>
                  <div style={{ fontWeight: 600, color: "#0f172a" }}>{new Date(t.created_at).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  <div style={{ color: "#94a3b8", fontSize: 11, fontFamily: "monospace" }}>TXN-{t.id}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: "#0f172a" }}>{t.student_name}</div>
                  <div style={{ color: "#64748b", fontSize: 11 }}>{t.student_contact}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: "#1e293b" }}>{t.course_title}</div>
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, color: "#475569" }}>
                    {t.payment_method === 'Cash' && <Icon name="dollar-sign" size={14}/>}
                    {t.payment_method === 'UPI' && <Icon name="smartphone" size={14}/>}
                    {(t.payment_method === 'Bank Transfer' || t.payment_method === 'Cheque') && <Icon name="briefcase" size={14}/>}
                    {t.payment_method === 'Card' && <Icon name="credit-card" size={14}/>}
                    {t.payment_method}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 11 }}>{t.reference_no || "N/A"}</div>
                </div>
                <div style={{ textAlign: "right", fontWeight: 800, color: "#10b981", fontSize: 15 }}>
                  {fmtRs(t.amount)}
                </div>
                <div style={{ textAlign: "center" }}>
                  <span style={{ 
                    background: t.status === "approved" ? "#d1fae5" : t.status === "pending" ? "#fef3c7" : "#fee2e2",
                    color: t.status === "approved" ? "#059669" : t.status === "pending" ? "#d97706" : "#dc2626",
                    padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: "capitalize"
                  }}>
                    {t.status}
                  </span>
                </div>
                <div style={{ textAlign: "center", display: "flex", gap: 4, justifyContent: "center" }}>
                  <button onClick={() => handleViewPaymentReceipt(t)} title="View Receipt" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", padding: "6px", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" }} onMouseOver={e=>e.currentTarget.style.background="#dcfce7"} onMouseOut={e=>e.currentTarget.style.background="#f0fdf4"}>
                    <Icon name="eye" size={14} />
                  </button>
                  <button onClick={() => setShowConfirm(t)} title="Download Receipt" style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", padding: "6px", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" }} onMouseOver={e=>e.currentTarget.style.background="#dbeafe"} onMouseOut={e=>e.currentTarget.style.background="#eff6ff"}>
                    <Icon name="download" size={14} />
                  </button>
                </div>
              </div>
            ))}
            
            {filteredTxns.length > itemsPerPage && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", background: "#fff", borderTop: "1px solid #f1f5f9" }}>
                <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredTxns.length)} of {filteredTxns.length} records
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)} style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: "#0f172a", fontSize: 13, fontWeight: 600, cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? 0.5 : 1 }}>Previous</button>
                  <button disabled={currentPage === Math.ceil(filteredTxns.length / itemsPerPage)} onClick={() => setCurrentPage(currentPage + 1)} style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: "#0f172a", fontSize: 13, fontWeight: 600, cursor: currentPage === Math.ceil(filteredTxns.length / itemsPerPage) ? "not-allowed" : "pointer", opacity: currentPage === Math.ceil(filteredTxns.length / itemsPerPage) ? 0.5 : 1 }}>Next</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && <RecordPaymentModal onClose={() => setShowModal(false)} onSuccess={fetchTransactions} />}
      {showConfirm && <ConfirmAlert title="Download Receipt" message="Do you want to download this receipt as a PDF?" onConfirm={() => { handleDownloadPaymentReceipt(showConfirm); setShowConfirm(null); }} onCancel={() => setShowConfirm(null)} />}
    </div>
  );
}

export default function PaymentsLedgerPage() {
  return (
    <AdminProvider>
      <PaymentsLedgerView />
    </AdminProvider>
  );
}

function RecordPaymentModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [step, setStep] = useState(1);
  const [outstanding, setOutstanding] = useState<OutstandingDetail[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  
  // Selection
  const [search, setSearch] = useState("");
  const [selectedPurchase, setSelectedPurchase] = useState<OutstandingDetail | null>(null);

  // Payment Details
  const [amount, setAmount] = useState<number | "">("");
  const [method, setMethod] = useState("UPI");
  const [refNo, setRefNo] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    async function fetchOutstanding() {
      try {
        const res = await apiFetch(`${API_BASE_URL}/academic/collections/outstanding-details`);
        if (res.ok) setOutstanding(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingInitial(false);
      }
    }
    fetchOutstanding();
  }, []);

  const handleSelect = (item: OutstandingDetail) => {
    setSelectedPurchase(item);
    setAmount(item.due_amount); // default to full pending amount
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!selectedPurchase) return;
    if (!amount || amount <= 0) return showToast("Enter a valid amount", "error");
    if (amount > selectedPurchase.due_amount) return showToast(`Amount cannot exceed pending dues (${fmtRs(selectedPurchase.due_amount)})`, "error");

    setSubmitting(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/academic/payments/record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchase_id: selectedPurchase.purchase_id,
          amount: Number(amount),
          payment_method: method,
          reference_no: refNo || null,
          notes: notes || null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to record payment");
      
      showToast("Payment recorded successfully", "success");
      onSuccess();
      onClose();
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredOustanding = outstanding.filter(o => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return o.student_name.toLowerCase().includes(q) || (o.student_email||"").toLowerCase().includes(q) || (o.student_phone||"").toLowerCase().includes(q);
  });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 4000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15,23,42,.6)", backdropFilter: "blur(6px)", animation: "fadeIn .2s" }}>
      <div style={{ width: "90vw", maxWidth: 600, background: "#fff", borderRadius: 20, boxShadow: "0 24px 60px rgba(0,0,0,.2)", overflow: "hidden", display: "flex", flexDirection: "column", animation: "slideUp .3s cubic-bezier(.16,1,.3,1)", maxHeight: "90vh" }}>
        
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: "#0f172a" }}>Record Manual Payment</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{step === 1 ? "Select student purchase" : "Enter payment details"}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 6 }}>
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, flex: 1, overflowY: "auto" }}>
          {step === 1 && (
            <div>
              <div style={{ position: "relative", marginBottom: 16 }}>
                <div style={{ position: "absolute", left: 14, top: 12, color: "#94a3b8" }}><Icon name="search" size={16} /></div>
                <input 
                  type="text" 
                  placeholder="Search student by name, email, or phone..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: "100%", padding: "12px 14px 12px 40px", borderRadius: 10, border: "2px solid #e2e8f0", outline: "none", fontSize: 14, boxSizing: "border-box", transition: "border-color 0.2s" }}
                  onFocus={e => e.target.style.borderColor = "#6366f1"}
                  onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                />
              </div>

              {loadingInitial ? (
                <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>Fetching dues...</div>
              ) : outstanding.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: "#10b981", fontSize: 14, fontWeight: 600 }}>No outstanding dues found in the system.</div>
              ) : (
                <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", maxHeight: 300, overflowY: "auto" }}>
                  {filteredOustanding.slice(0, 20).map((item, idx) => (
                    <div 
                      key={item.purchase_id} 
                      onClick={() => handleSelect(item)}
                      style={{ padding: "16px", borderBottom: idx < filteredOustanding.length - 1 ? "1px solid #f1f5f9" : "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: "#fff", transition: "background 0.2s" }}
                      onMouseOver={e => e.currentTarget.style.background = "#f8fafc"}
                      onMouseOut={e => e.currentTarget.style.background = "#fff"}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{item.student_name}</div>
                        <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>{item.course_title} <span style={{color:"#94a3b8"}}>•</span> {item.batch_name}</div>
                        {item.next_due_date && <div style={{ fontSize: 11, color: "#dc2626", fontWeight: 600, marginTop: 4 }}>Next Due: {new Date(item.next_due_date).toLocaleDateString()}</div>}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Pending</div>
                        <div style={{ fontWeight: 800, color: "#ef4444", fontSize: 16 }}>{fmtRs(item.due_amount)}</div>
                      </div>
                    </div>
                  ))}
                  {filteredOustanding.length > 20 && (
                    <div style={{ padding: 12, textAlign: "center", fontSize: 12, color: "#94a3b8", background: "#f8fafc" }}>Showing top 20 results. Keep typing to refine.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 2 && selectedPurchase && (
            <div>
              <div style={{ background: "#f8fafc", padding: 16, borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>PAYMENT FOR</div>
                  <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 15 }}>{selectedPurchase.student_name}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{selectedPurchase.course_title}</div>
                </div>
                <button onClick={() => setStep(1)} style={{ background: "none", border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Change</button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>Amount (Max: {fmtRs(selectedPurchase.due_amount)}) *</label>
                  <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} style={{ width: "100%", padding: "12px", borderRadius: 8, border: "2px solid #e2e8f0", outline: "none", fontSize: 14, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>Payment Method *</label>
                  <select value={method} onChange={e => setMethod(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: 8, border: "2px solid #e2e8f0", outline: "none", fontSize: 14, boxSizing: "border-box", background: "#fff" }}>
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Card</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>Reference Number (Optional)</label>
                <input type="text" placeholder="e.g. UPI Ref / Cheque No" value={refNo} onChange={e => setRefNo(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: 8, border: "2px solid #e2e8f0", outline: "none", fontSize: 14, boxSizing: "border-box" }} />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>Internal Notes (Optional)</label>
                <textarea rows={3} placeholder="Any specific details regarding this payment" value={notes} onChange={e => setNotes(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: 8, border: "2px solid #e2e8f0", outline: "none", fontSize: 14, boxSizing: "border-box", resize: "none" }} />
              </div>

              <button 
                onClick={handleSubmit} 
                disabled={submitting}
                style={{ width: "100%", background: "#10b981", color: "#fff", border: "none", padding: "14px", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? "Processing..." : `Record Payment of ${fmtRs(Number(amount) || 0)}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Confirm Alert Modal ─── */
function ConfirmAlert({title,message,onConfirm,onCancel}:{title:string,message:string,onConfirm:()=>void,onCancel:()=>void}){
  return(
    <div style={{position:"fixed",inset:0,zIndex:4000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(15,23,42,.6)",backdropFilter:"blur(6px)",animation:"fadeIn .2s"}}>
      <div style={{background:"#fff",borderRadius:16,boxShadow:"0 20px 40px rgba(0,0,0,.2)",width:"90%",maxWidth:400,padding:24,textAlign:"center",animation:"slideUp .2s"}}>
        <div style={{width:50,height:50,borderRadius:25,background:"#eff6ff",color:"#3b82f6",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}><Icon name="download" size={24}/></div>
        <div style={{fontSize:18,fontWeight:800,color:"#0f172a",marginBottom:8}}>{title}</div>
        <div style={{fontSize:14,color:"#64748b",marginBottom:24,lineHeight:1.5}}>{message}</div>
        <div style={{display:"flex",gap:12,justifyContent:"center"}}>
          <button onClick={onCancel} style={{padding:"10px 20px",borderRadius:8,border:"1.5px solid #e2e8f0",background:"#fff",color:"#475569",fontWeight:700,cursor:"pointer",flex:1}}>Cancel</button>
          <button onClick={onConfirm} style={{padding:"10px 20px",borderRadius:8,border:"none",background:"#4f46e5",color:"#fff",fontWeight:700,cursor:"pointer",flex:1}}>Download</button>
        </div>
      </div>
    </div>
  )
}
