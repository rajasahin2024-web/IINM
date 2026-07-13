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
  const [paying, setPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  // Load Razorpay script once
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

  const formatDate = (dStr: string) => {
    if (!dStr) return "N/A";
    return new Date(dStr).toLocaleDateString("en-GB", {day:"2-digit",month:"short",year:"numeric"});
  };

  const handlePay = () => {
    if (isPaid) return;
    setShowPayModal(true);
  };

  const startRazorpay = async () => {
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) { alert("Enter a valid amount"); return; }
    if (!data.razorpay_key_id) { alert("Payment gateway not configured. Please contact support."); return; }

    setPaying(true);
    try {
      // 1. Create order on backend
      const res = await fetch(`${API_BASE_URL}/invoice/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_uuid: uuid, amount: amt })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Failed to create order"); }
      const order = await res.json();

      // 2. Open Razorpay checkout
      const options = {
        key: data.razorpay_key_id,
        amount: order.amount,
        currency: order.currency,
        name: "IINM Institute",
        description: data.course.item_title,
        order_id: order.order_id,
        prefill: {
          name: data.student.name,
          email: data.student.email,
          contact: data.student.phone,
        },
        theme: { color: "#059669" },
        handler: async (response: any) => {
          // 3. Verify on backend
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
            })
          });
          if (!verRes.ok) {
            const e = await verRes.json();
            alert("Payment verification failed: " + (e.detail || "Unknown error"));
          } else {
            setPaySuccess(true);
            setShowPayModal(false);
            loadData(); // Refresh invoice data
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

  return (
    <div style={{minHeight:"100vh",background:"#f8fafc",fontFamily:"system-ui, -apple-system, sans-serif",paddingBottom:100}}>
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 640px) {
          .inv-container { padding: 0 16px !important; margin-top: 20px !important; }
          .inv-card { padding: 24px 20px !important; }
          .inv-header { flex-direction: column !important; align-items: flex-start !important; gap: 20px !important; }
          .inv-header-right { text-align: left !important; }
          .inv-header-right > div { justify-content: flex-start !important; }
          .inv-progress { flex-direction: column !important; gap: 16px !important; padding: 20px !important; }
          .inv-items { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; }
          .inv-items-price { align-self: flex-start !important; }
          .inv-total { width: 100% !important; }
          .inv-footer { flex-direction: column !important; gap: 24px !important; padding: 24px 20px !important; }
          .inv-pay-bar { flex-direction: column !important; padding: 16px 20px !important; text-align: center !important; gap: 16px !important; }
          .inv-pay-btn { width: 100% !important; justify-content: center !important; }
        }
      `}} />
      {/* Top Navbar */}
      <div style={{background:"#fff",borderBottom:"1px solid #e2e8f0",padding:"16px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{background:"#0ea5e9",color:"#fff",padding:6,borderRadius:8,display:"flex"}}><Icon name="file-text" size={20}/></div>
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

      <div className="inv-container" style={{maxWidth:800,margin:"40px auto 0",padding:"0 20px"}}>
        {/* Status Banners */}
        {paySuccess && (
          <div style={{background:"#10b981",color:"#fff",borderRadius:12,padding:"16px 20px",display:"flex",alignItems:"center",gap:16,marginBottom:24,boxShadow:"0 10px 25px -5px rgba(16,185,129,0.3)"}}>
            <div style={{background:"rgba(255,255,255,0.2)",padding:8,borderRadius:"50%",display:"flex"}}><Icon name="check-circle" size={24}/></div>
            <div>
              <div style={{fontWeight:700,fontSize:16}}>Payment Successful!</div>
              <div style={{fontSize:13,opacity:0.9,marginTop:2}}>Your payment has been recorded. Thank you!</div>
            </div>
          </div>
        )}
        {!isPaid && isOverdue && !paySuccess && (
          <div style={{background:"#ef4444",color:"#fff",borderRadius:12,padding:"16px 20px",display:"flex",alignItems:"center",gap:16,marginBottom:24,boxShadow:"0 10px 25px -5px rgba(239,68,68,0.3)"}}>
            <div style={{background:"rgba(255,255,255,0.2)",padding:8,borderRadius:"50%",display:"flex"}}><Icon name="alert-circle" size={24}/></div>
            <div>
              <div style={{fontWeight:700,fontSize:16}}>Payment Overdue</div>
              <div style={{fontSize:13,opacity:0.9,marginTop:2}}>This invoice was due on {formatDate(data.due_date)}</div>
            </div>
          </div>
        )}
        {isPaid && !paySuccess && (
          <div style={{background:"#10b981",color:"#fff",borderRadius:12,padding:"16px 20px",display:"flex",alignItems:"center",gap:16,marginBottom:24,boxShadow:"0 10px 25px -5px rgba(16,185,129,0.3)"}}>
            <div style={{background:"rgba(255,255,255,0.2)",padding:8,borderRadius:"50%",display:"flex"}}><Icon name="check-circle" size={24}/></div>
            <div>
              <div style={{fontWeight:700,fontSize:16}}>Payment Complete</div>
              <div style={{fontSize:13,opacity:0.9,marginTop:2}}>Thank you for your payment!</div>
            </div>
          </div>
        )}

        {/* Main Invoice Card */}
        <div style={{background:"#fff",borderRadius:16,boxShadow:"0 4px 6px -1px rgba(0,0,0,0.05)",overflow:"hidden"}}>
          <div className="inv-card inv-header" style={{padding:"40px 40px 30px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",borderBottom:"1px solid #f1f5f9"}}>
            <div style={{display:"flex",alignItems:"center",gap:16}}>
              <div style={{width:56,height:56,background:"#1e1b4b",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:20}}>II</div>
              <div>
                <div style={{fontWeight:800,fontSize:20,color:"#0f172a"}}>IINM Institute</div>
                <div style={{color:"#64748b",fontSize:13,marginTop:4}}>Kolkata, West Bengal</div>
              </div>
            </div>
            <div className="inv-header-right" style={{textAlign:"right"}}>
              <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1}}>Amount Due</div>
              <div style={{fontSize:36,fontWeight:800,color:"#0f172a",lineHeight:1.1,marginTop:4}}>₹{data.current_due.toFixed(2)}</div>
              <div style={{display:"flex",gap:16,justifyContent:"flex-end",marginTop:12,fontSize:12,color:"#64748b"}}>
                <div style={{display:"flex",alignItems:"center",gap:4}}><Icon name="calendar" size={14}/> <span>Issued: {formatDate(data.date)}</span></div>
                {data.due_date && <div style={{color:isOverdue?"#ef4444":"#64748b",display:"flex",alignItems:"center",gap:4}}><Icon name="clock" size={14}/> <span>Due: {formatDate(data.due_date)}</span></div>}
              </div>
            </div>
          </div>

          <div className="inv-card" style={{padding:"30px 40px",borderBottom:"1px solid #f1f5f9"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>Bill To</div>
            <div style={{fontWeight:700,fontSize:16,color:"#0f172a"}}>{data.student.name}</div>
            <div style={{color:"#64748b",fontSize:13,marginTop:4}}>{data.student.email}</div>
            <div style={{color:"#64748b",fontSize:13,marginTop:2}}>{data.student.phone}</div>
          </div>

          {/* Payment Progress for installment or partial payment */}
          {(data.already_paid > 0 || data.is_installment) && (
            <div className="inv-progress" style={{padding:"24px 40px",background:"#f0fdf4",borderBottom:"1px solid #dcfce7",display:"flex",gap:32,flexWrap:"wrap"}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"#16a34a",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Already Paid</div>
                <div style={{fontWeight:800,fontSize:20,color:"#14532d"}}>₹{(data.already_paid||0).toFixed(2)}</div>
              </div>
              {data.is_installment && data.total_installments && (
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:"#059669",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Installment Stage</div>
                  <div style={{fontWeight:800,fontSize:20,color:"#14532d"}}>{data.installment_no} of {data.total_installments}</div>
                </div>
              )}
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Total Course Fee</div>
                <div style={{fontWeight:800,fontSize:20,color:"#0f172a"}}>₹{(data.total_fee||data.total_due).toFixed(2)}</div>
              </div>
              {/* Progress bar */}
              {data.total_fee > 0 && (
                <div style={{width:"100%",marginTop:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#64748b",marginBottom:6}}>
                    <span>Payment Progress</span>
                    <span style={{fontWeight:700,color:"#16a34a"}}>{Math.round((data.already_paid/data.total_fee)*100)}% complete</span>
                  </div>
                  <div style={{height:8,background:"#dcfce7",borderRadius:99,overflow:"hidden"}}>
                    <div style={{height:"100%",background:"#16a34a",borderRadius:99,width:`${Math.min((data.already_paid/data.total_fee)*100,100)}%`,transition:"width .6s ease"}}/>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="inv-card" style={{padding:"30px 40px 10px"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1,marginBottom:16}}>Invoice Items</div>
            <div className="inv-items" style={{background:"#f8fafc",borderRadius:12,padding:"20px",display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16}}>
              <div style={{display:"flex",gap:16}}>
                <div style={{background:"#d1fae5",color:"#059669",padding:8,borderRadius:8,display:"flex"}}><Icon name="book-open" size={20}/></div>
                <div>
                  <div style={{fontWeight:700,fontSize:15,color:"#0f172a"}}>{data.course.item_title}</div>
                  <div style={{fontSize:13,color:"#64748b",marginTop:4}}>Course Enrollment Fee</div>
                </div>
              </div>
              <div className="inv-items-price" style={{fontWeight:800,fontSize:16,color:"#0f172a"}}>₹{data.current_due.toFixed(2)}</div>
            </div>
          </div>

          <div className="inv-card" style={{padding:"10px 40px 40px",display:"flex",justifyContent:"flex-end"}}>
            <div className="inv-total" style={{width:300}}>
              <div style={{display:"flex",justifyContent:"space-between",padding:"12px 0",borderBottom:"1px solid #f1f5f9",fontSize:14,color:"#64748b"}}>
                <span>Subtotal</span>
                <span style={{fontWeight:600,color:"#0f172a"}}>₹{data.current_due.toFixed(2)}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",padding:"16px 0 0",fontSize:16,fontWeight:800,color:"#0f172a"}}>
                <span>Total Due</span>
                <span>₹{data.current_due.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="inv-footer" style={{background:"#f8fafc",padding:"30px 40px",display:"flex",justifyContent:"space-between",gap:40}}>
            <div style={{flex:1}}>
              <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Notes</div>
              <div style={{fontSize:12,color:"#64748b",lineHeight:1.6}}>Thank you for choosing IINM Institute. If you have any questions, please contact our support team.</div>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Terms & Conditions</div>
              <div style={{fontSize:12,color:"#64748b",lineHeight:1.6}}>Please make the payment by the due date to avoid any late fees or suspension of course access.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Pay Bar */}
      {!isPaid && !paySuccess && (
        <div className="inv-pay-bar" style={{position:"fixed",bottom:0,left:0,right:0,background:"#059669",padding:"20px 40px",display:"flex",justifyContent:"space-between",alignItems:"center",boxShadow:"0 -10px 40px rgba(5,150,105,0.2)",zIndex:20}}>
          <div>
            <div style={{color:"#fff",fontWeight:700,fontSize:18}}>Ready to complete your payment?</div>
            <div style={{color:"#d1fae5",fontSize:14,marginTop:4}}>Pay securely using Razorpay — UPI, Cards, Net Banking</div>
          </div>
          <button onClick={handlePay} className="inv-pay-btn" style={{background:"#fff",color:"#059669",border:"none",padding:"14px 32px",borderRadius:12,fontWeight:800,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",gap:10,boxShadow:"0 4px 14px rgba(0,0,0,0.1)"}}>
            <Icon name="credit-card" size={20}/> Pay ₹{data.current_due.toFixed(2)}
          </button>
        </div>
      )}

      {/* Amount Selection Modal */}
      {showPayModal && (
        <div style={{position:"fixed",inset:0,zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(15,23,42,.6)",backdropFilter:"blur(6px)"}}>
          <div style={{width:"100%",maxWidth:440,background:"#fff",borderRadius:24,boxShadow:"0 24px 60px rgba(0,0,0,.2)",overflow:"hidden"}}>
            <div style={{padding:"24px",borderBottom:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontWeight:800,fontSize:20,color:"#0f172a"}}>Choose Amount</div>
              <button onClick={() => setShowPayModal(false)} style={{background:"none",border:"none",color:"#94a3b8",cursor:"pointer"}}><Icon name="x" size={24}/></button>
            </div>

            <div style={{padding:"24px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:16,padding:"12px 16px",background:"#f8fafc",borderRadius:10}}>
                <span style={{color:"#64748b",fontSize:14,fontWeight:600}}>Total Due</span>
                <span style={{fontWeight:800,fontSize:18,color:"#0f172a"}}>₹{data.current_due.toFixed(2)}</span>
              </div>

              <div style={{marginBottom:20}}>
                <label style={{display:"block",fontSize:13,fontWeight:700,color:"#334155",marginBottom:8}}>Payment Amount</label>
                <div style={{position:"relative"}}>
                  <div style={{position:"absolute",left:16,top:"50%",transform:"translateY(-50%)",color:"#64748b",fontWeight:600,fontSize:16}}>₹</div>
                  <input
                    type="number"
                    value={payAmount}
                    onChange={e => { setPayAmount(e.target.value); setSelectedPreset(null); }}
                    style={{width:"100%",background:"#fff",border:"1.5px solid #e2e8f0",borderRadius:12,padding:"16px 16px 16px 36px",fontSize:18,fontWeight:700,color:"#0f172a",outline:"none",boxSizing:"border-box"}}
                  />
                </div>
                <div style={{display:"flex",gap:8,marginTop:10}}>
                  <button onClick={() => { setPayAmount(data.current_due.toString()); setSelectedPreset("full"); }}
                    style={{flex:1,padding:"9px",background:selectedPreset==="full"?"#d1fae5":"#f1f5f9",color:selectedPreset==="full"?"#059669":"#475569",border:selectedPreset==="full"?"1.5px solid #6ee7b7":"1.5px solid transparent",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",transition:"all .15s"}}>
                    Full Amount
                  </button>
                  <button onClick={() => { setPayAmount((data.current_due * 0.5).toFixed(2)); setSelectedPreset("half"); }}
                    style={{flex:1,padding:"9px",background:selectedPreset==="half"?"#d1fae5":"#f1f5f9",color:selectedPreset==="half"?"#059669":"#475569",border:selectedPreset==="half"?"1.5px solid #6ee7b7":"1.5px solid transparent",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",transition:"all .15s"}}>
                    50%
                  </button>
                </div>
              </div>

              <div style={{marginBottom:20}}>
                <label style={{display:"block",fontSize:13,fontWeight:700,color:"#334155",marginBottom:8}}>Payment Remarks (Optional)</label>
                <textarea ref={notesRef} rows={2} placeholder="Enter any notes..." style={{width:"100%",background:"#fff",border:"1.5px solid #e2e8f0",borderRadius:12,padding:"12px 16px",fontSize:14,color:"#0f172a",outline:"none",resize:"none",boxSizing:"border-box"}}></textarea>
              </div>

              {/* Razorpay button */}
              <button
                onClick={startRazorpay}
                disabled={paying}
                style={{width:"100%",background:paying?"#94a3b8":"#059669",color:"#fff",border:"none",padding:"16px",borderRadius:14,fontWeight:800,fontSize:16,cursor:paying?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,transition:"background .2s"}}>
                {paying
                  ? "Processing…"
                  : <><span style={{background:"rgba(255,255,255,0.2)",borderRadius:6,padding:"2px 8px",fontStyle:"italic",fontSize:14}}>R</span> Pay ₹{parseFloat(payAmount||"0").toFixed(2)} via Razorpay</>
                }
              </button>

              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,color:"#94a3b8",fontSize:11,fontWeight:600,marginTop:14}}>
                <Icon name="shield" size={12}/> Secured by Razorpay · 256-bit SSL encryption
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
