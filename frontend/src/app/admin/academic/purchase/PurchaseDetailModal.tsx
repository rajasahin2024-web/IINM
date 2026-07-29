"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Icon } from "../../icons";
import { useToast } from "../../components/ToastProvider";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL } from "@/lib/config";
import { FI } from "./components";

function ConfirmAlert({ title, message, onConfirm, onCancel }: { title: string; message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }}>
      <div style={{ background: "#fff", padding: 24, borderRadius: 12, maxWidth: 400, width: "90%", textAlign: "center" }}>
        <h4 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 800 }}>{title}</h4>
        <p style={{ margin: "0 0 20px", fontSize: 14, color: "#64748b" }}>{message}</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={onCancel} style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#f8fafc", cursor: "pointer" }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#3b82f6", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

function PaymentMethodFields({ form, setForm }: { form: any; setForm: (f: any) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 8 }}>
        {["Cash", "UPI", "Bank Transfer", "Card"].map(m => (
          <button key={m} type="button" onClick={() => setForm({ ...form, method: m })} style={{ flex: 1, padding: "8px 4px", borderRadius: 6, fontSize: 12, fontWeight: 700, border: form.method === m ? "2px solid #3b82f6" : "1px solid #cbd5e1", background: form.method === m ? "#eff6ff" : "#fff", color: form.method === m ? "#1d4ed8" : "#475569", cursor: "pointer" }}>{m}</button>
        ))}
      </div>
      <FI label="Reference / Txn No." value={form.ref} onChange={v => setForm({ ...form, ref: v })} placeholder="Txn ID / Ref" />
      <FI label="Notes" value={form.notes} onChange={v => setForm({ ...form, notes: v })} placeholder="Additional notes" />
    </div>
  );
}

const handleDownloadReceipt = async (data: any) => {
  try {
    const html2pdf = (await import('html2pdf.js')).default;
    const invId = `INV-${new Date().getFullYear()}-${String(data.id).padStart(4, '0')}`;
    const htmlString = `
      <div style="font-family: Arial, sans-serif; color: #1e293b; background: #fff; padding: 40px; width: 794px; min-height: 1123px; box-sizing: border-box; margin: 0 auto;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
          <div>
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
              <img src="${window.location.origin}/logo.png" style="width: 50px; height: auto;" alt="Logo" />
              <div style="font-size: 28px; font-weight: 800; color: #0f172a; letter-spacing: -1px;">IINM</div>
            </div>
            <div style="font-size: 13px; color: #64748b; line-height: 1.6;">
              Connecting The Dots Of AI<br/>
              contact@iinm.com<br/>
              www.iinm.com
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 32px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 1px;">RECEIPT</div>
            <div style="font-size: 14px; font-weight: 700; color: #3b82f6; margin-top: 4px;">${invId}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Date: ${new Date().toLocaleDateString('en-GB')}</div>
          </div>
        </div>
      </div>
    `;
    const opt = {
      margin: 0,
      filename: `${invId}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' as const }
    };
    html2pdf().from(htmlString).set(opt).save();
  } catch (e: any) {
    console.error("PDF generation failed", e);
  }
};

/* ─── Purchase Detail Modal (Installments & Payment) ─── */
export function PurchaseDetailModal({ purchaseId, onClose, onSuccess }: { purchaseId: number; onClose: () => void; onSuccess: () => void }) {
  const { showToast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [payInst, setPayInst] = useState<any>(null);
  const [payForm, setPayForm] = useState({ amount: "", method: "Cash", ref: "", notes: "", cardName: "", ifsc: "", accNo: "", bankName: "" });
  const [paying, setPaying] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch(`${API_BASE_URL}/academic/purchases/${purchaseId}/installments`);
      if (r.ok) setData(await r.json());
      else throw new Error("Failed to load");
    } catch (e: any) { showToast(e.message, "error"); onClose(); }
    finally { setLoading(false); }
  }, [purchaseId, onClose, showToast]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payInst) return;
    const amt = parseFloat(payForm.amount);
    if (amt <= 0) { showToast("Enter a valid amount", "error"); return; }
    setPaying(true);
    let finalNotes = payForm.notes;
    if (payForm.method === "Card") finalNotes = `Card Holder: ${payForm.cardName}`;
    if (payForm.method === "Bank Transfer") finalNotes = `Bank: ${payForm.bankName}, Acc: ${payForm.accNo}, IFSC: ${payForm.ifsc}`;
    try {
      const r = await apiFetch(`${API_BASE_URL}/academic/purchases/${purchaseId}/pay-installment`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ installment_id: payInst.id, amount: amt, payment_method: payForm.method, reference_no: payForm.ref, notes: finalNotes })
      });
      if (!r.ok) { const err = await r.json(); throw new Error(err.detail || "Failed to record payment"); }
      showToast("Payment recorded successfully!", "success");
      setPayInst(null);
      setPayForm({ amount: "", method: "Cash", ref: "", notes: "", cardName: "", ifsc: "", accNo: "", bankName: "" });
      fetchDetail();
      onSuccess();
    } catch (err: any) { showToast(err.message, "error"); }
    finally { setPaying(false); }
  };

  const getStatusBadge = (status: string) => {
    if (status === "paid") return <span className="badge badge-green">Paid</span>;
    if (status === "overdue") return <span className="badge badge-red">Overdue</span>;
    if (status === "partial") return <span className="badge badge-amber">Partial</span>;
    return <span className="badge" style={{ background: "#f1f5f9", color: "#475569" }}>Pending</span>;
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2500, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15,23,42,.6)", backdropFilter: "blur(6px)", animation: "fadeIn .2s" }}>
      <div style={{ width: "90vw", maxWidth: "90vw", background: "#fff", borderRadius: 20, boxShadow: "0 24px 60px rgba(0,0,0,.2)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "94vh", animation: "slideUp .3s cubic-bezier(.16,1,.3,1)" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "#0f172a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="calendar" size={20} /></div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: "#0f172a" }}>Installment Schedule {data?.status === "cancelled" && <span style={{ color: "#ef4444", fontSize: 12, marginLeft: 8 }}>(Cancelled)</span>}{data?.is_active === false && data?.status !== "cancelled" && <span style={{ color: "#ef4444", fontSize: 12, marginLeft: 8 }}>(Inactive)</span>}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{data?.student_name} • {data?.course_title}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {data?.invoice_uuid && (
              <button onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/invoice/${data.invoice_uuid}`);
                showToast("Payment link copied to clipboard!", "success");
              }} style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#16a34a", display: "flex", alignItems: "center", gap: 6 }}><Icon name="link" size={14} /> Copy Link</button>
            )}
            <button onClick={() => setShowConfirm(true)} style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#1d4ed8", display: "flex", alignItems: "center", gap: 6 }}><Icon name="download" size={14} /> Download Receipt</button>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 6 }}><Icon name="x" size={20} /></button>
          </div>
        </div>

        <div style={{ overflowY: "auto", padding: "24px", flex: 1 }}>
          {loading ? <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Loading schedule...</div> : (
            <>
              <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
                <div style={{ flex: 1, background: "#f8fafc", padding: 16, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Net Fee</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>₹{data.net_fee.toFixed(2)}</div>
                </div>
                <div style={{ flex: 1, background: "#f0fdf4", padding: 16, borderRadius: 12, border: "1px solid #bbf7d0" }}>
                  <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 700, textTransform: "uppercase" }}>Paid Amount</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#15803d" }}>₹{data.paid_amount.toFixed(2)}</div>
                </div>
                <div style={{ flex: 1, background: "#fef2f2", padding: 16, borderRadius: 12, border: "1px solid #fecaca" }}>
                  <div style={{ fontSize: 11, color: "#dc2626", fontWeight: 700, textTransform: "uppercase" }}>Due Amount</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#b91c1c" }}>₹{data.due_amount.toFixed(2)}</div>
                </div>
              </div>

              <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr 1fr 1fr 120px", background: "#f8fafc", padding: "12px 16px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" }}>
                  <div>#</div><div>Due Date</div><div>Amount</div><div>Paid</div><div>Status</div><div style={{ textAlign: "right" }}>Action</div>
                </div>
                {data.installments.map((inst: any) => (
                  <div key={inst.id}>
                    <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr 1fr 1fr 120px", padding: "14px 16px", borderBottom: "1px solid #f1f5f9", alignItems: "center", fontSize: 13, background: inst.status === "overdue" ? "#fffafa" : "#fff" }}>
                      <div style={{ fontWeight: 700, color: "#64748b" }}>{inst.installment_no}</div>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{new Date(inst.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      <div style={{ fontWeight: 700, color: "#0f172a" }}>₹{inst.amount.toFixed(2)}</div>
                      <div style={{ fontWeight: 600, color: "#16a34a" }}>₹{inst.paid_amount.toFixed(2)}</div>
                      <div>{getStatusBadge(inst.status)}</div>
                      <div style={{ textAlign: "right" }}>
                        {inst.status !== "paid" && (
                          <button onClick={() => {
                            setPayInst(payInst?.id === inst.id ? null : inst);
                            setPayForm({ ...payForm, amount: (inst.amount - inst.paid_amount).toFixed(2), ref: "", notes: "" });
                          }} className="btn-outline" style={{ padding: "6px 12px", fontSize: 11, marginLeft: "auto" }}>Record Pay</button>
                        )}
                      </div>
                    </div>
                    {payInst?.id === inst.id && (
                      <div style={{ background: "#f8fafc", padding: "16px", borderBottom: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>Record Payment for Installment #{inst.installment_no}</div>
                        <form onSubmit={submitPayment} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          <FI label="Amount (₹)" value={payForm.amount} onChange={v => setPayForm({ ...payForm, amount: v })} required type="number" />
                          <PaymentMethodFields form={payForm} setForm={setPayForm} />
                          <button type="submit" className="btn-primary" disabled={paying} style={{ height: 44, alignSelf: "flex-end", padding: "0 24px" }}>{paying ? "Wait.." : "Submit Payment"}</button>
                        </form>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {showConfirm && <ConfirmAlert title="Download Receipt" message="Do you want to download this receipt as a PDF?" onConfirm={() => { handleDownloadReceipt(data); setShowConfirm(false); }} onCancel={() => setShowConfirm(false)} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Purchase General Detail Modal (For Non-Installment) ─── */
export function PurchaseGeneralModal({ purchaseId, onClose, onSuccess }: { purchaseId: number; onClose: () => void; onSuccess: () => void }) {
  const { showToast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [payForm, setPayForm] = useState({ amount: "", method: "Cash", ref: "", notes: "", cardName: "", ifsc: "", accNo: "", bankName: "" });
  const [paying, setPaying] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch(`${API_BASE_URL}/academic/purchases/${purchaseId}`);
      if (r.ok) setData(await r.json());
      else throw new Error("Failed to load");
    } catch (e: any) { showToast(e.message, "error"); onClose(); }
    finally { setLoading(false); }
  }, [purchaseId, onClose, showToast]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(payForm.amount);
    if (amt <= 0) { showToast("Enter a valid amount", "error"); return; }
    setPaying(true);
    let finalNotes = payForm.notes;
    if (payForm.method === "Card") finalNotes = `Card Holder: ${payForm.cardName}`;
    if (payForm.method === "Bank Transfer") finalNotes = `Bank: ${payForm.bankName}, Acc: ${payForm.accNo}, IFSC: ${payForm.ifsc}`;
    try {
      const r = await apiFetch(`${API_BASE_URL}/academic/purchases/${purchaseId}/pay`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, payment_method: payForm.method, reference_no: payForm.ref, notes: finalNotes })
      });
      if (!r.ok) { const err = await r.json(); throw new Error(err.detail || "Failed to record payment"); }
      showToast("Payment recorded successfully!", "success");
      setPayForm({ amount: "", method: "Cash", ref: "", notes: "", cardName: "", ifsc: "", accNo: "", bankName: "" });
      fetchDetail();
      onSuccess();
    } catch (err: any) { showToast(err.message, "error"); }
    finally { setPaying(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2500, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15,23,42,.6)", backdropFilter: "blur(6px)", animation: "fadeIn .2s" }}>
      <div style={{ width: "90vw", maxWidth: 900, background: "#fff", borderRadius: 20, boxShadow: "0 24px 60px rgba(0,0,0,.2)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "94vh", animation: "slideUp .3s cubic-bezier(.16,1,.3,1)" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "#0f172a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="shopping-cart" size={20} /></div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: "#0f172a" }}>Purchase Details {data?.status === "cancelled" && <span style={{ color: "#ef4444", fontSize: 12, marginLeft: 8 }}>(Cancelled)</span>}{data?.is_active === false && data?.status !== "cancelled" && <span style={{ color: "#ef4444", fontSize: 12, marginLeft: 8 }}>(Inactive)</span>}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{data?.student_name} • {data?.course_title}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {data?.invoice_uuid && (
              <button onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/invoice/${data.invoice_uuid}`);
                showToast("Payment link copied to clipboard!", "success");
              }} style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#16a34a", display: "flex", alignItems: "center", gap: 6 }}><Icon name="link" size={14} /> Copy Link</button>
            )}
            <button onClick={() => setShowConfirm(true)} style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#1d4ed8", display: "flex", alignItems: "center", gap: 6 }}><Icon name="download" size={14} /> Download Receipt</button>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 6 }}><Icon name="x" size={20} /></button>
          </div>
        </div>

        <div style={{ overflowY: "auto", padding: "24px", flex: 1 }}>
          {loading ? <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Loading details...</div> : (
            <>
              <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
                <div style={{ flex: 1, background: "#f8fafc", padding: 16, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Net Fee</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>₹{data.net_fee.toFixed(2)}</div>
                </div>
                <div style={{ flex: 1, background: "#f0fdf4", padding: 16, borderRadius: 12, border: "1px solid #bbf7d0" }}>
                  <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 700, textTransform: "uppercase" }}>Paid Amount</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#15803d" }}>₹{data.paid_amount.toFixed(2)}</div>
                </div>
                <div style={{ flex: 1, background: "#fef2f2", padding: 16, borderRadius: 12, border: "1px solid #fecaca" }}>
                  <div style={{ fontSize: 11, color: "#dc2626", fontWeight: 700, textTransform: "uppercase" }}>Due Amount</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#b91c1c" }}>₹{data.due_amount.toFixed(2)}</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
