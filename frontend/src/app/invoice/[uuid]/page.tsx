"use client";
import React, { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { API_BASE_URL } from "@/lib/config";
import { Icon } from "@/app/admin/icons";

declare global {
  interface Window { Razorpay: any; }
}

export default function InvoicePage() {
  const params = useParams();
  const uuid = params.uuid as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<"full"|"half"|null>("full");
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<number | null>(null);
  const [paying, setPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);
  const [upiUploading, setUpiUploading] = useState(false);
  const [upiSuccess, setUpiSuccess] = useState(false);
  const [upiScreenshot, setUpiScreenshot] = useState<File | null>(null);
  const [upiPreview, setUpiPreview] = useState<string>("");
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const upiNotesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    document.body.appendChild(s);
  }, []);

  const loadData = () => {
    fetch(`${API_BASE_URL}/invoice/public/${uuid}`)
      .then(res => {
        if (!res.ok) throw new Error("Invoice not found or expired");
        return res.json();
      })
      .then(d => {
        setData(d);
        setPayAmount(d.current_due.toString());
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  };

  useEffect(() => { loadData(); }, [uuid]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Invoice link copied!");
  };

  if (loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#f8fafc",color:"#64748b"}}>Loading invoice details...</div>;
  if (error) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#f8fafc",color:"#ef4444",fontWeight:600}}>{error}</div>;

  const isOverdue = data.status === "overdue";
  const isPaid = data.status === "paid";
  const siteName = data.site?.name || "Institute of Innovation and New Media";
  const logoUrl = data.site?.logo_url || data.site?.dark_logo_url || data.site?.favicon_url;
  const founderName = data.site?.founder_name || "Authorized Signatory";
  const founderDesignation = data.site?.founder_designation || "Director / Center Head";
  const founderSig = data.site?.founder_signature_url;
  const contact = data.contact;
  const upi = data.upi;

  const formatDate = (dStr: string) => {
    if (!dStr) return "N/A";
    return new Date(dStr).toLocaleDateString("en-GB", {day:"2-digit",month:"short",year:"numeric"});
  };

  const formatDateTime = (dStr: string) => {
    if (!dStr) return "N/A";
    return new Date(dStr).toLocaleString("en-GB", {day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
  };

  const buildAddress = () => {
    if (!contact) return "";
    const parts = [contact.address_line1, contact.address_line2, contact.city, contact.state, contact.pin_code].filter(Boolean);
    return parts.join(", ");
  };

  const handlePay = () => {
    if (isPaid) return;
    setSelectedInstallmentId(null);
    setPayAmount(data.current_due.toString());
    setSelectedPreset("full");
    setShowPayModal(true);
  };

  const handlePayInstallment = (inst: any) => {
    const remaining = (inst.amount - inst.paid_amount).toFixed(2);
    setSelectedInstallmentId(inst.id);
    setPayAmount(remaining);
    setSelectedPreset("full");
    setShowPayModal(true);
  };

  const startRazorpay = async () => {
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) { alert("Enter a valid amount"); return; }
    if (!data.razorpay_key_id) { alert("Payment gateway not configured. Please contact support."); return; }

    setPaying(true);
    try {
      const res = await fetch(`${API_BASE_URL}/invoice/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_uuid: uuid, amount: amt, installment_id: selectedInstallmentId })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Failed to create order"); }
      const order = await res.json();

      const options = {
        key: data.razorpay_key_id,
        amount: order.amount,
        currency: order.currency,
        name: siteName,
        description: data.course.item_title,
        image: logoUrl || undefined,
        order_id: order.order_id,
        prefill: {
          name: data.student.name,
          email: data.student.email,
          contact: data.student.phone,
        },
        theme: { color: "#0f172a" },
        handler: async (response: any) => {
          const verRes = await fetch(`${API_BASE_URL}/invoice/verify-payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              invoice_uuid: uuid,
              amount_paid: amt,
              notes: notesRef.current?.value || null,
              installment_id: selectedInstallmentId,
            })
          });
          if (!verRes.ok) {
            const e = await verRes.json();
            alert("Payment verification failed: " + (e.detail || "Unknown error"));
          } else {
            setPaySuccess(true);
            setShowPayModal(false);
            setSelectedInstallmentId(null);
            loadData();
          }
        },
        modal: { ondismiss: () => setPaying(false) }
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp: any) => {
        alert("Payment failed: " + resp.error.description);
        setPaying(false);
      });
      rzp.open();
    } catch (err: any) {
      alert(err.message);
      setPaying(false);
    }
  };

  const handleUpiScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setUpiScreenshot(file);
      setUpiPreview(URL.createObjectURL(file));
    }
  };

  const submitUpiScreenshot = async () => {
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) { alert("Enter a valid amount"); return; }
    if (!upiScreenshot) { alert("Please upload payment screenshot"); return; }

    setUpiUploading(true);
    try {
      const formData = new FormData();
      formData.append("invoice_uuid", uuid);
      formData.append("amount", amt.toString());
      formData.append("notes", upiNotesRef.current?.value || "");
      formData.append("file", upiScreenshot);

      const res = await fetch(`${API_BASE_URL}/invoice/upload-upi-screenshot`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.detail || "Upload failed");
      }
      setUpiSuccess(true);
      setShowPayModal(false);
      setUpiScreenshot(null);
      setUpiPreview("");
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpiUploading(false);
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, { bg: string; color: string; text: string }> = {
      paid: { bg: "#dcfce7", color: "#15803d", text: "PAID" },
      pending: { bg: "#fef9c3", color: "#854d0e", text: "PENDING" },
      partial: { bg: "#dbeafe", color: "#1d4ed8", text: "PARTIAL" },
      overdue: { bg: "#fee2e2", color: "#b91c1c", text: "OVERDUE" },
      approved: { bg: "#dcfce7", color: "#15803d", text: "APPROVED" },
      rejected: { bg: "#fee2e2", color: "#b91c1c", text: "REJECTED" },
    };
    const c = colors[status] || { bg: "#f1f5f9", color: "#475569", text: status.toUpperCase() };
    return <span style={{ background: c.bg, color: c.color, fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 0, letterSpacing: 0.5 }}>{c.text}</span>;
  };

  return (
    <div style={{minHeight:"100vh",background:"#f1f5f9",fontFamily:"'Segoe UI', Arial, sans-serif",paddingBottom: upi?.enabled && !isPaid ? 100 : 40}}>
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 640px) {
          .inv-container { padding: 0 12px !important; margin-top: 16px !important; }
          .inv-doc { padding: 24px 20px !important; }
          .inv-details { grid-template-columns: 1fr !important; gap: 16px !important; }
          .inv-pay-bar { flex-direction: column !important; padding: 16px 20px !important; text-align: center !important; gap: 16px !important; }
          .inv-pay-btn { width: 100% !important; justify-content: center !important; }
          .inv-table { font-size: 11px !important; }
          .inv-table th, .inv-table td { padding: 6px 8px !important; }
        }
        @media print { .no-print { display: none !important; } }
      `}} />

      {/* Top Navbar */}
      <div className="no-print" style={{background:"#fff",borderBottom:"1px solid #e2e8f0",padding:"12px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{background:"#0f172a",color:"#fff",padding:6,borderRadius:0,display:"flex"}}><Icon name="file-text" size={20}/></div>
          <div style={{fontWeight:700,color:"#0f172a",fontSize:15}}>{data.invoice_no}</div>
          <div style={{color:"#64748b",fontSize:13}}>• {formatDate(data.date)}</div>
        </div>
        <div style={{display:"flex",gap:16}}>
          <button onClick={copyLink} style={{background:"none",border:"none",color:"#64748b",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
            <Icon name="link" size={14}/> Copy Link
          </button>
          <button style={{background:"none",border:"none",color:"#64748b",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6}} onClick={() => window.print()}>
            <Icon name="download" size={14}/> Download
          </button>
        </div>
      </div>

      <div className="inv-container" style={{maxWidth:794,margin:"32px auto 0",padding:"0 20px"}}>
        {/* Status Banners */}
        {paySuccess && (
          <div className="no-print" style={{background:"#10b981",color:"#fff",borderRadius:0,padding:"14px 20px",display:"flex",alignItems:"center",gap:16,marginBottom:20,boxShadow:"0 8px 20px -4px rgba(16,185,129,0.3)"}}>
            <div style={{background:"rgba(255,255,255,0.2)",padding:8,borderRadius:0,display:"flex"}}><Icon name="check-circle" size={22}/></div>
            <div>
              <div style={{fontWeight:700,fontSize:15}}>Payment Successful!</div>
              <div style={{fontSize:13,opacity:0.9,marginTop:2}}>Your payment has been recorded. Thank you!</div>
            </div>
          </div>
        )}
        {upiSuccess && (
          <div className="no-print" style={{background:"#3b82f6",color:"#fff",borderRadius:0,padding:"14px 20px",display:"flex",alignItems:"center",gap:16,marginBottom:20,boxShadow:"0 8px 20px -4px rgba(59,130,246,0.3)"}}>
            <div style={{background:"rgba(255,255,255,0.2)",padding:8,borderRadius:0,display:"flex"}}><Icon name="check-circle" size={22}/></div>
            <div>
              <div style={{fontWeight:700,fontSize:15}}>Screenshot Submitted!</div>
              <div style={{fontSize:13,opacity:0.9,marginTop:2}}>Your payment is pending admin approval. You will be notified once verified.</div>
            </div>
          </div>
        )}
        {!isPaid && isOverdue && !paySuccess && !upiSuccess && (
          <div className="no-print" style={{background:"#ef4444",color:"#fff",borderRadius:0,padding:"14px 20px",display:"flex",alignItems:"center",gap:16,marginBottom:20,boxShadow:"0 8px 20px -4px rgba(239,68,68,0.3)"}}>
            <div style={{background:"rgba(255,255,255,0.2)",padding:8,borderRadius:0,display:"flex"}}><Icon name="alert-circle" size={22}/></div>
            <div>
              <div style={{fontWeight:700,fontSize:15}}>Payment Overdue</div>
              <div style={{fontSize:13,opacity:0.9,marginTop:2}}>This invoice was due on {formatDate(data.due_date)}</div>
            </div>
          </div>
        )}
        {isPaid && !paySuccess && !upiSuccess && (
          <div className="no-print" style={{background:"#10b981",color:"#fff",borderRadius:0,padding:"14px 20px",display:"flex",alignItems:"center",gap:16,marginBottom:20,boxShadow:"0 8px 20px -4px rgba(16,185,129,0.3)"}}>
            <div style={{background:"rgba(255,255,255,0.2)",padding:8,borderRadius:0,display:"flex"}}><Icon name="check-circle" size={22}/></div>
            <div>
              <div style={{fontWeight:700,fontSize:15}}>Payment Complete</div>
              <div style={{fontSize:13,opacity:0.9,marginTop:2}}>Thank you for your payment!</div>
            </div>
          </div>
        )}

        {/* Receipt-style Invoice Document */}
        <div className="inv-doc" style={{background:"#fff",border:"1px solid #0f172a",position:"relative",overflow:"hidden"}}>
          {/* Watermark */}
          <div style={{position:"absolute",top:"52%",left:"50%",transform:"translate(-50%,-50%) rotate(-35deg)",fontSize:110,color:"rgba(15,23,42,0.03)",fontWeight:900,zIndex:0,pointerEvents:"none",letterSpacing:12,textTransform:"uppercase"}}>
            {isPaid ? "PAID" : "DUE"}
          </div>

          <div style={{position:"relative",zIndex:1,padding:"36px 40px"}}>
            {/* Header */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:20,borderBottom:"2px solid #0f172a",paddingBottom:18}}>
              <div style={{flex:1,minWidth:0}}>
                {logoUrl ? (
                  <div style={{marginBottom:8}}>
                    <img src={logoUrl} alt={siteName} style={{maxHeight:54,maxWidth:240,objectFit:"contain",display:"block"}} onError={(e)=>{ (e.currentTarget.parentElement as HTMLElement).style.display='none'; }} />
                  </div>
                ) : (
                  <div style={{fontSize:18,fontWeight:800,color:"#0f172a",letterSpacing:"-0.3px",marginBottom:6}}>{siteName}</div>
                )}
                {buildAddress() && <div style={{fontSize:11,color:"#475569",lineHeight:1.4,marginTop:4}}>{buildAddress()}</div>}
                {contact && (contact.phone1 || contact.email1) && (
                  <div style={{fontSize:11,color:"#475569",marginTop:4}}>
                    {contact.phone1 && <span>Phone: {contact.phone1}{contact.phone2 ? `, ${contact.phone2}` : ""}</span>}
                    {contact.email1 && <span style={{marginLeft:contact.phone1?8:0}}>Email: {contact.email1}</span>}
                  </div>
                )}
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{border:"2px solid #0f172a",padding:"8px 14px",background:"#f8fafc",textAlign:"right"}}>
                  <div style={{fontSize:14,fontWeight:800,textTransform:"uppercase",letterSpacing:1.5,color:"#0f172a"}}>INVOICE</div>
                  <div style={{fontFamily:"'Consolas','Courier New',monospace",fontSize:13,fontWeight:700,color:"#0f172a",marginTop:4}}>NO: {data.invoice_no}</div>
                  <div style={{fontFamily:"'Consolas','Courier New',monospace",fontSize:11,color:"#475569",marginTop:2}}>DATE: {formatDate(data.date)}</div>
                  {data.due_date && (
                    <div style={{fontFamily:"'Consolas','Courier New',monospace",fontSize:11,color:isOverdue?"#dc2626":"#475569",marginTop:2}}>
                      DUE: {formatDate(data.due_date)} {isOverdue && "⚠ OVERDUE"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="inv-details" style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderBottom:"1px solid #0f172a",marginTop:14,paddingBottom:14,gap:24}}>
              {/* Student Info */}
              <div>
                <div style={{fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:1,color:"#475569",marginBottom:6,borderBottom:"1px solid #cbd5e1",paddingBottom:2}}>STUDENT / BILLED TO</div>
                <div style={{fontSize:15,fontWeight:700,color:"#0f172a",marginBottom:2}}>{data.student.name}</div>
                <div style={{fontFamily:"'Consolas','Courier New',monospace",fontSize:12,color:"#334155",lineHeight:1.5}}>
                  <div>EMAIL: {data.student.email || "N/A"}</div>
                  <div>PHONE: {data.student.phone || "N/A"}</div>
                  {(data.student.city || data.student.state) && (
                    <div style={{fontFamily:"'Segoe UI',Arial,sans-serif",fontSize:11,color:"#475569",marginTop:2}}>
                      ADDRESS: {[data.student.city, data.student.state].filter(Boolean).join(", ")}
                    </div>
                  )}
                </div>
              </div>
              {/* Course Info */}
              <div>
                <div style={{fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:1,color:"#475569",marginBottom:6,borderBottom:"1px solid #cbd5e1",paddingBottom:2}}>COURSE DETAILS</div>
                <div style={{fontSize:14,fontWeight:700,color:"#0f172a",marginBottom:2}}>{data.course.title}</div>
                <div style={{fontFamily:"'Consolas','Courier New',monospace",fontSize:12,color:"#334155",lineHeight:1.5}}>
                  <div>ITEM: {data.course.item_title}</div>
                  {data.is_installment && data.total_installments && (
                    <div>INSTALLMENT: {data.installment_no || 1} OF {data.total_installments}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Summary Table */}
            <div style={{margin:"16px 0"}}>
              <table className="inv-table" style={{width:"100%",borderCollapse:"collapse",border:"1px solid #0f172a",fontFamily:"'Segoe UI',Arial,sans-serif"}}>
                <thead>
                  <tr style={{background:"#0f172a",color:"#fff"}}>
                    <th style={{padding:"8px 12px",textAlign:"left",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1,width:40}}>#</th>
                    <th style={{padding:"8px 12px",textAlign:"left",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>DESCRIPTION</th>
                    <th style={{padding:"8px 12px",textAlign:"center",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1,width:120}}>TOTAL FEE</th>
                    <th style={{padding:"8px 12px",textAlign:"right",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1,width:120}}>AMOUNT DUE</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{borderBottom:"1px solid #cbd5e1"}}>
                    <td style={{padding:"12px",fontFamily:"'Consolas','Courier New',monospace",fontSize:12,verticalAlign:"top"}}>01</td>
                    <td style={{padding:"12px",verticalAlign:"top"}}>
                      <div style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>{data.course.item_title}</div>
                      <div style={{fontSize:11,color:"#475569",marginTop:2}}>Course: {data.course.title}</div>
                    </td>
                    <td style={{padding:"12px",textAlign:"center",fontFamily:"'Consolas','Courier New',monospace",fontSize:13,fontWeight:600,color:"#0f172a",verticalAlign:"top"}}>
                      ₹{(data.total_fee||0).toFixed(2)}
                    </td>
                    <td style={{padding:"12px",textAlign:"right",fontFamily:"'Consolas','Courier New',monospace",fontSize:14,fontWeight:700,color:"#0f172a",verticalAlign:"top"}}>
                      ₹{data.current_due.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr style={{borderTop:"2px solid #0f172a",background:"#f8fafc"}}>
                    <td colSpan={3} style={{padding:"10px 12px",textAlign:"right",fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.5px"}}>ALREADY PAID:</td>
                    <td style={{padding:"10px 12px",textAlign:"right",fontFamily:"'Consolas','Courier New',monospace",fontSize:13,fontWeight:700,color:"#15803d"}}>₹{(data.already_paid||0).toFixed(2)}</td>
                  </tr>
                  <tr style={{background:"#fffbeb",borderTop:"1px solid #e2e8f0"}}>
                    <td colSpan={3} style={{padding:"10px 12px",textAlign:"right",fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.5px",color:"#92400e"}}>REMAINING DUE BALANCE:</td>
                    <td style={{padding:"10px 12px",textAlign:"right",fontFamily:"'Consolas','Courier New',monospace",fontSize:16,fontWeight:800,color:"#dc2626"}}>₹{data.current_due.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Progress bar */}
            {data.total_fee > 0 && (data.already_paid > 0 || data.is_installment) && (
              <div style={{marginBottom:16}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#64748b",marginBottom:6}}>
                  <span style={{fontWeight:600}}>Payment Progress</span>
                  <span style={{fontWeight:700,color:"#15803d"}}>{Math.round((data.already_paid/data.total_fee)*100)}% complete</span>
                </div>
                <div style={{height:8,background:"#e2e8f0",borderRadius:0,overflow:"hidden"}}>
                  <div style={{height:"100%",background:"#15803d",borderRadius:0,width:`${Math.min((data.already_paid/data.total_fee)*100,100)}%`,transition:"width .6s ease"}}/>
                </div>
              </div>
            )}

            {/* Installment Schedule */}
            {data.is_installment && data.installments && data.installments.length > 0 && (
              <div style={{marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <div style={{fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:1,color:"#475569",borderBottom:"1px solid #cbd5e1",paddingBottom:4,flex:1}}>INSTALLMENT SCHEDULE</div>
                  {!isPaid && !paySuccess && (
                    <button onClick={handlePay} className="no-print" style={{background:"#0f172a",color:"#fff",border:"none",padding:"6px 14px",borderRadius:0,fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                      <Icon name="credit-card" size={12}/> Pay All Due
                    </button>
                  )}
                </div>
                <table className="inv-table" style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:"'Segoe UI',Arial,sans-serif"}}>
                  <thead>
                    <tr style={{background:"#f1f5f9",borderBottom:"1px solid #cbd5e1"}}>
                      <th style={{padding:"6px 10px",textAlign:"left",fontSize:10,fontWeight:700,color:"#475569",textTransform:"uppercase"}}>#</th>
                      <th style={{padding:"6px 10px",textAlign:"left",fontSize:10,fontWeight:700,color:"#475569",textTransform:"uppercase"}}>Name</th>
                      <th style={{padding:"6px 10px",textAlign:"left",fontSize:10,fontWeight:700,color:"#475569",textTransform:"uppercase"}}>Due Date</th>
                      <th style={{padding:"6px 10px",textAlign:"right",fontSize:10,fontWeight:700,color:"#475569",textTransform:"uppercase"}}>Amount</th>
                      <th style={{padding:"6px 10px",textAlign:"right",fontSize:10,fontWeight:700,color:"#475569",textTransform:"uppercase"}}>Paid</th>
                      <th style={{padding:"6px 10px",textAlign:"center",fontSize:10,fontWeight:700,color:"#475569",textTransform:"uppercase"}}>Status</th>
                      <th style={{padding:"6px 10px",textAlign:"right",fontSize:10,fontWeight:700,color:"#475569",textTransform:"uppercase"}} className="no-print">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.installments.map((inst: any, i: number) => {
                      const instRemaining = inst.amount - inst.paid_amount;
                      const isInstPaid = inst.status === "paid" || instRemaining <= 0;
                      return (
                        <tr key={i} style={{borderBottom:"1px solid #e2e8f0"}}>
                          <td style={{padding:"6px 10px",fontFamily:"'Consolas','Courier New',monospace",fontWeight:600}}>{inst.installment_no}</td>
                          <td style={{padding:"6px 10px",fontWeight:600,color:"#0f172a"}}>{inst.name || `Installment #${inst.installment_no}`}</td>
                          <td style={{padding:"6px 10px"}}>{formatDate(inst.due_date)}</td>
                          <td style={{padding:"6px 10px",textAlign:"right",fontFamily:"'Consolas','Courier New',monospace",fontWeight:600}}>₹{inst.amount.toFixed(2)}</td>
                          <td style={{padding:"6px 10px",textAlign:"right",fontFamily:"'Consolas','Courier New',monospace",color:inst.paid_amount>0?"#15803d":"#94a3b8"}}>₹{inst.paid_amount.toFixed(2)}</td>
                          <td style={{padding:"6px 10px",textAlign:"center"}}>{statusBadge(inst.status)}</td>
                          <td style={{padding:"6px 10px",textAlign:"right"}} className="no-print">
                            {!isInstPaid && !isPaid ? (
                              <button
                                onClick={() => handlePayInstallment(inst)}
                                style={{background:"#fef3c7",color:"#b45309",border:"1px solid #fde68a",padding:"5px 12px",borderRadius:0,fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}
                              >
                                Pay ₹{instRemaining.toFixed(2)}
                              </button>
                            ) : isInstPaid ? (
                              <span style={{color:"#94a3b8",fontSize:11}}>—</span>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Payment History */}
            {data.transactions && data.transactions.length > 0 && (
              <div style={{marginBottom:16}}>
                <div style={{fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:1,color:"#475569",marginBottom:8,borderBottom:"1px solid #cbd5e1",paddingBottom:4}}>PAYMENT HISTORY</div>
                <table className="inv-table" style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:"'Segoe UI',Arial,sans-serif"}}>
                  <thead>
                    <tr style={{background:"#f1f5f9",borderBottom:"1px solid #cbd5e1"}}>
                      <th style={{padding:"6px 10px",textAlign:"left",fontSize:10,fontWeight:700,color:"#475569",textTransform:"uppercase"}}>Date</th>
                      <th style={{padding:"6px 10px",textAlign:"right",fontSize:10,fontWeight:700,color:"#475569",textTransform:"uppercase"}}>Amount</th>
                      <th style={{padding:"6px 10px",textAlign:"left",fontSize:10,fontWeight:700,color:"#475569",textTransform:"uppercase"}}>Method</th>
                      <th style={{padding:"6px 10px",textAlign:"left",fontSize:10,fontWeight:700,color:"#475569",textTransform:"uppercase"}}>Reference</th>
                      <th style={{padding:"6px 10px",textAlign:"center",fontSize:10,fontWeight:700,color:"#475569",textTransform:"uppercase"}}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transactions.map((t: any, i: number) => (
                      <tr key={i} style={{borderBottom:"1px solid #e2e8f0"}}>
                        <td style={{padding:"6px 10px"}}>{formatDateTime(t.created_at)}</td>
                        <td style={{padding:"6px 10px",textAlign:"right",fontFamily:"'Consolas','Courier New',monospace",fontWeight:600}}>₹{t.amount.toFixed(2)}</td>
                        <td style={{padding:"6px 10px"}}>{t.payment_method || "N/A"}</td>
                        <td style={{padding:"6px 10px",fontFamily:"'Consolas','Courier New',monospace",fontSize:11,color:"#475569"}}>{t.reference_no || "N/A"}</td>
                        <td style={{padding:"6px 10px",textAlign:"center"}}>{statusBadge(t.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Notice */}
            <div style={{border:"1.5px solid #d97706",background:"#fffbeb",padding:"12px 14px",marginBottom:20,fontSize:11,color:"#78350f",lineHeight:1.55}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                <span style={{background:"#d97706",color:"#fff",fontSize:9.5,fontWeight:800,padding:"2px 7px",textTransform:"uppercase",letterSpacing:"0.8px"}}>IMPORTANT NOTICE</span>
                <span style={{fontWeight:700,color:"#92400e",fontSize:11.5}}>Admission &amp; Fee Policy</span>
              </div>
              <div style={{color:"#92400e"}}>
                Admission confirmation and course access are subject to clearance of the remaining balance before class commencement date.
                {isOverdue && <strong> Your payment is overdue — please pay immediately to avoid suspension of access.</strong>}
              </div>
              {contact && (contact.email1 || contact.phone1) && (
                <div style={{marginTop:6,fontSize:10.5,color:"#78350f"}}>
                  For any billing queries: <strong>{contact.email1 || "support"}</strong>{contact.phone1 ? ` | Phone: <strong>${contact.phone1}</strong>` : ""}
                </div>
              )}
            </div>

            {/* Signature */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",paddingTop:10,borderTop:"1px solid #0f172a"}}>
              <div style={{fontSize:10,color:"#64748b",lineHeight:1.4,maxWidth:"60%"}}>
                <div style={{fontFamily:"'Consolas','Courier New',monospace",fontSize:10,color:"#0f172a",fontWeight:700}}>DIGITALLY VERIFIED INVOICE</div>
                <div>Document generated from {siteName}.</div>
                <div style={{fontFamily:"'Consolas','Courier New',monospace",fontSize:9.5,color:"#64748b",marginTop:2}}>SECURE HASH: {(data.invoice_uuid||"").replace(/-/g,"").toUpperCase()}</div>
              </div>
              <div style={{textAlign:"center",minWidth:170}}>
                {founderSig ? (
                  <img src={founderSig} alt="Signature" style={{height:38,maxWidth:150,objectFit:"contain",marginBottom:2,display:"block",marginLeft:"auto",marginRight:"auto"}} onError={(e)=>{ e.currentTarget.style.display='none'; }} />
                ) : (
                  <div style={{height:38}}></div>
                )}
                <div style={{borderTop:"1.5px solid #0f172a",paddingTop:4}}>
                  <div style={{fontSize:11.5,fontWeight:700,color:"#0f172a"}}>{founderName}</div>
                  <div style={{fontSize:10,color:"#475569"}}>{founderDesignation}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Pay Bar */}
      {!isPaid && !paySuccess && !upiSuccess && (
        <div className="inv-pay-bar no-print" style={{position:"fixed",bottom:0,left:0,right:0,background:"#0f172a",padding:"10px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",boxShadow:"0 -6px 20px rgba(15,23,42,0.2)",zIndex:20}}>
          <div>
            <div style={{color:"#fff",fontWeight:700,fontSize:14}}>Ready to make a payment?</div>
            <div style={{color:"#94a3b8",fontSize:11,marginTop:2}}>
              {data.razorpay_key_id && "Pay securely via Razorpay"}
              {data.razorpay_key_id && upi?.enabled ? " or " : ""}
              {upi?.enabled ? "Scan QR & upload screenshot" : ""}
            </div>
          </div>
          <button onClick={handlePay} className="inv-pay-btn" style={{background:"#fff",color:"#0f172a",border:"none",padding:"10px 24px",borderRadius:0,fontWeight:800,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",gap:8,boxShadow:"0 4px 14px rgba(0,0,0,0.15)"}}>
            <Icon name="credit-card" size={18}/> Pay Now
          </button>
        </div>
      )}

      {/* Payment Modal */}
      {showPayModal && (
        <div className="no-print" style={{position:"fixed",inset:0,zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(15,23,42,.6)",backdropFilter:"blur(6px)"}}>
          <div style={{width:"100%",maxWidth:480,background:"#fff",borderRadius:0,boxShadow:"0 24px 60px rgba(0,0,0,.2)",overflow:"hidden",maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{padding:"20px 24px",borderBottom:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"#fff",zIndex:1}}>
              <div style={{fontWeight:800,fontSize:19,color:"#0f172a"}}>Choose Payment Method</div>
              <button onClick={() => setShowPayModal(false)} style={{background:"none",border:"none",color:"#94a3b8",cursor:"pointer"}}><Icon name="x" size={24}/></button>
            </div>

            <div style={{padding:"24px"}}>
              {/* Amount Selection */}
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:16,padding:"12px 16px",background:"#f8fafc",borderRadius:0}}>
                <span style={{color:"#64748b",fontSize:14,fontWeight:600}}>
                  {selectedInstallmentId ? "Installment Due" : "Total Due"}
                </span>
                <span style={{fontWeight:800,fontSize:18,color:"#0f172a"}}>
                  ₹{selectedInstallmentId ? parseFloat(payAmount||"0").toFixed(2) : data.current_due.toFixed(2)}
                </span>
              </div>
              {selectedInstallmentId && (
                <div style={{marginBottom:12,padding:"8px 12px",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:0,fontSize:12,color:"#1d4ed8",fontWeight:600}}>
                  Paying specific installment. Click "Full Amount" to pay all remaining dues instead.
                </div>
              )}

              <div style={{marginBottom:20}}>
                <label style={{display:"block",fontSize:13,fontWeight:700,color:"#334155",marginBottom:8}}>Payment Amount</label>
                <div style={{position:"relative"}}>
                  <div style={{position:"absolute",left:16,top:"50%",transform:"translateY(-50%)",color:"#64748b",fontWeight:600,fontSize:16}}>₹</div>
                  <input
                    type="number"
                    value={payAmount}
                    onChange={e => { setPayAmount(e.target.value); setSelectedPreset(null); }}
                    style={{width:"100%",background:"#fff",border:"1.5px solid #e2e8f0",borderRadius:0,padding:"16px 16px 16px 36px",fontSize:18,fontWeight:700,color:"#0f172a",outline:"none",boxSizing:"border-box"}}
                  />
                </div>
                <div style={{display:"flex",gap:8,marginTop:10}}>
                  <button onClick={() => { setPayAmount(data.current_due.toString()); setSelectedPreset("full"); setSelectedInstallmentId(null); }}
                    style={{flex:1,padding:"9px",background:selectedPreset==="full"?"#dbeafe":"#f1f5f9",color:selectedPreset==="full"?"#1d4ed8":"#475569",border:selectedPreset==="full"?"1.5px solid #93c5fd":"1.5px solid transparent",borderRadius:0,fontSize:12,fontWeight:700,cursor:"pointer",transition:"all .15s"}}>
                    Full Amount
                  </button>
                  <button onClick={() => { setPayAmount((data.current_due * 0.5).toFixed(2)); setSelectedPreset("half"); setSelectedInstallmentId(null); }}
                    style={{flex:1,padding:"9px",background:selectedPreset==="half"?"#dbeafe":"#f1f5f9",color:selectedPreset==="half"?"#1d4ed8":"#475569",border:selectedPreset==="half"?"1.5px solid #93c5fd":"1.5px solid transparent",borderRadius:0,fontSize:12,fontWeight:700,cursor:"pointer",transition:"all .15s"}}>
                    50%
                  </button>
                </div>
              </div>

              {/* Razorpay Section */}
              {data.razorpay_key_id && (
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#334155",marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
                    <span style={{background:"#0f172a",color:"#fff",fontSize:10,fontWeight:800,padding:"3px 8px",borderRadius:0}}>ONLINE</span>
                    Pay via Razorpay
                  </div>
                  <div style={{marginBottom:12}}>
                    <textarea ref={notesRef} rows={2} placeholder="Payment remarks (optional)..." style={{width:"100%",background:"#fff",border:"1.5px solid #e2e8f0",borderRadius:0,padding:"10px 14px",fontSize:13,color:"#0f172a",outline:"none",resize:"none",boxSizing:"border-box"}}></textarea>
                  </div>
                  <button
                    onClick={startRazorpay}
                    disabled={paying}
                    style={{width:"100%",background:paying?"#94a3b8":"#0f172a",color:"#fff",border:"none",padding:"14px",borderRadius:0,fontWeight:800,fontSize:15,cursor:paying?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,transition:"background .2s"}}>
                    {paying
                      ? "Processing…"
                      : <><span style={{background:"rgba(255,255,255,0.15)",borderRadius:0,padding:"2px 8px",fontStyle:"italic",fontSize:13}}>R</span> Pay ₹{parseFloat(payAmount||"0").toFixed(2)} via Razorpay</>
                    }
                  </button>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,color:"#94a3b8",fontSize:11,fontWeight:600,marginTop:10}}>
                    <Icon name="shield" size={12}/> Secured by Razorpay · 256-bit SSL encryption
                  </div>
                </div>
              )}

              {/* UPI QR Section */}
              {upi?.enabled && (
                <div>
                  <div style={{borderTop:"1px solid #e2e8f0",marginBottom:20}} />
                  <div style={{fontSize:13,fontWeight:700,color:"#334155",marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
                    <span style={{background:"#22c55e",color:"#fff",fontSize:10,fontWeight:800,padding:"3px 8px",borderRadius:0}}>UPI</span>
                    Scan QR & Upload Screenshot
                  </div>

                  {/* QR Display */}
                  <div style={{display:"flex",gap:16,marginBottom:16,alignItems:"flex-start"}}>
                    {upi.qr_url && (
                      <div style={{flexShrink:0}}>
                        <div style={{width:160,height:160,border:"1.5px solid #e2e8f0",borderRadius:0,overflow:"hidden",background:"#fff"}}>
                          <img src={upi.qr_url} alt="UPI QR" style={{width:"100%",height:"100%",objectFit:"contain"}} />
                        </div>
                        <div style={{fontSize:11,color:"#64748b",textAlign:"center",marginTop:6,fontWeight:600}}>Scan to Pay</div>
                      </div>
                    )}
                    <div style={{flex:1,fontSize:12,color:"#475569",lineHeight:1.6}}>
                      <div style={{marginBottom:8}}>
                        <strong>How to pay:</strong>
                      </div>
                      <div style={{marginBottom:4}}>1. Open any UPI app (GPay, PhonePe, Paytm)</div>
                      <div style={{marginBottom:4}}>2. Scan the QR code</div>
                      <div style={{marginBottom:4}}>3. Pay ₹{parseFloat(payAmount||"0").toFixed(2)}</div>
                      <div style={{marginBottom:4}}>4. Take a screenshot of the payment</div>
                      <div>5. Upload the screenshot below</div>
                      {upi.upi_id && (
                        <div style={{marginTop:10,padding:"8px 12px",background:"#f0fdf4",borderRadius:0,border:"1px solid #bbf7d0"}}>
                          <div style={{fontSize:10,fontWeight:700,color:"#15803d",textTransform:"uppercase"}}>UPI ID</div>
                          <div style={{fontFamily:"'Consolas','Courier New',monospace",fontSize:13,fontWeight:700,color:"#0f172a"}}>{upi.upi_id}</div>
                          {upi.payee_name && <div style={{fontSize:11,color:"#475569",marginTop:2}}>{upi.payee_name}</div>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Screenshot Upload */}
                  <div style={{marginBottom:12}}>
                    <label style={{display:"block",fontSize:13,fontWeight:700,color:"#334155",marginBottom:8}}>Upload Payment Screenshot</label>
                    <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                      <div style={{width:100,height:100,border:"1.5px dashed #cbd5e1",borderRadius:0,background:"#f8fafc",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0}}>
                        {upiPreview ? (
                          <img src={upiPreview} alt="Screenshot" style={{width:"100%",height:"100%",objectFit:"cover"}} />
                        ) : (
                          <span style={{fontSize:10,color:"#94a3b8",textAlign:"center"}}>No image<br />selected</span>
                        )}
                      </div>
                      <div style={{flex:1}}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUpiScreenshotChange}
                          style={{display:"none"}}
                          id="upi-screenshot-upload"
                        />
                        <label
                          htmlFor="upi-screenshot-upload"
                          style={{display:"inline-flex",alignItems:"center",gap:8,padding:"10px 16px",borderRadius:0,border:"1.5px solid #e2e8f0",background:"#fff",color:"#475569",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all .2s"}}
                        >
                          <Icon name="upload" size={16}/> Choose Screenshot
                        </label>
                        {upiScreenshot && (
                          <button
                            type="button"
                            onClick={() => { setUpiScreenshot(null); setUpiPreview(""); }}
                            style={{marginLeft:8,padding:"10px 12px",borderRadius:0,border:"1px solid #fecaca",background:"#fef2f2",color:"#dc2626",fontSize:13,fontWeight:600,cursor:"pointer"}}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{marginBottom:12}}>
                    <textarea ref={upiNotesRef} rows={2} placeholder="Notes (e.g. UPI transaction ID)..." style={{width:"100%",background:"#fff",border:"1.5px solid #e2e8f0",borderRadius:0,padding:"10px 14px",fontSize:13,color:"#0f172a",outline:"none",resize:"none",boxSizing:"border-box"}}></textarea>
                  </div>

                  <button
                    onClick={submitUpiScreenshot}
                    disabled={upiUploading || !upiScreenshot}
                    style={{width:"100%",background:upiUploading||!upiScreenshot?"#94a3b8":"#22c55e",color:"#fff",border:"none",padding:"14px",borderRadius:0,fontWeight:800,fontSize:15,cursor:upiUploading||!upiScreenshot?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,transition:"background .2s"}}>
                    {upiUploading ? "Uploading…" : <><Icon name="upload" size={18}/> Submit Screenshot for Approval</>}
                  </button>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,color:"#94a3b8",fontSize:11,fontWeight:600,marginTop:10}}>
                    <Icon name="info" size={12}/> Your payment will be verified by admin before approval
                  </div>
                </div>
              )}

              {!data.razorpay_key_id && !upi?.enabled && (
                <div style={{textAlign:"center",padding:20,color:"#64748b",fontSize:14}}>
                  No payment methods configured. Please contact support.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
