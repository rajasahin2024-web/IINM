"use client";
import React,{useState,useEffect,useCallback} from "react";
import {Icon} from "../../icons";
import {useToast} from "../../components/ToastProvider";
import {apiFetch} from "@/lib/apiFetch";
import {API_BASE_URL} from "@/lib/config";
import {AdminProvider} from "../../components/ProtectedAdmin";
import {CSS,FI,FS,SummaryRow,Toggle} from "./components";
import "../../admin.css";

const COLS="1.8fr 1.4fr 1fr 1fr 1fr 1.2fr 100px 100px";
const MTHS=["Generate Invoice Link (Pending)","Cash","UPI","Bank Transfer","Card"];

const handleDownloadReceipt=async(data:any)=>{
  try {
    const html2pdf = (await import('html2pdf.js')).default;
    const invId = `INV-${new Date().getFullYear()}-${String(data.id).padStart(4,'0')}`;
    const htmlString = `
      <div style="font-family: Arial, sans-serif; color: #1e293b; background: #fff; padding: 40px; width: 794px; min-height: 1123px; box-sizing: border-box; margin: 0 auto;">
        
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
          <div>
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
              <img src="${window.location.origin}/logo.png" style="width: 50px; height: auto;" alt="Logo" />
              <div style="font-size: 28px; font-weight: 800; color: #0f172a; letter-spacing: -1px;">IINM</div>
            </div>
            <div style="font-size: 13px; color: #64748b; line-height: 1.6;">
              Connecting The Dots Of AI<br/>
              contact@iinm.com<br/>
              +91 9876543210
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 36px; font-weight: 800; color: #e2e8f0; margin-bottom: 12px; letter-spacing: 2px;">INVOICE</div>
            <div style="font-size: 13px; color: #475569;">
              <div style="margin-bottom: 6px;">Invoice No: <strong style="color: #0f172a; margin-left: 8px;">${invId}</strong></div>
              <div style="margin-bottom: 6px;">Date: <strong style="color: #0f172a; margin-left: 8px;">${new Date().toLocaleDateString('en-GB')}</strong></div>
              <div>Status: <strong style="margin-left: 8px; color: ${data.status==='completed'?'#16a34a':data.status==='cancelled'?'#dc2626':'#eab308'}">${data.status.toUpperCase()}</strong></div>
            </div>
          </div>
        </div>

        <!-- Billed To -->
        <div style="margin-bottom: 40px; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #f1f5f9;">
          <div style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Billed To</div>
          <div style="font-size: 16px; color: #0f172a; font-weight: 600; margin-bottom: 4px;">${data.student_name}</div>
          <div style="font-size: 14px; color: #475569;">${data.student_email || "No Email Provided"}</div>
        </div>

        <!-- Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr>
              <th style="background: #0f172a; color: #fff; text-transform: uppercase; font-size: 12px; padding: 14px 16px; text-align: left; border-radius: 8px 0 0 8px;">Description</th>
              <th style="background: #0f172a; color: #fff; text-transform: uppercase; font-size: 12px; padding: 14px 16px; text-align: right; border-radius: 0 8px 8px 0; width: 150px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 16px; border-bottom: 1px solid #e2e8f0;">
                <div style="font-weight: 600; color: #0f172a; font-size: 15px; margin-bottom: 4px;">Course Enrollment</div>
                <div style="font-size: 13px; color: #64748b;">${data.course_title}</div>
              </td>
              <td style="padding: 16px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600; font-size: 15px; color: #0f172a;">₹${(data.net_fee + (data.discount || 0)).toFixed(2)}</td>
            </tr>
            ${data.discount > 0 ? `
            <tr>
              <td style="padding: 16px; border-bottom: 1px solid #e2e8f0;">
                <div style="font-weight: 600; color: #16a34a; font-size: 15px;">Discount Applied</div>
              </td>
              <td style="padding: 16px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600; font-size: 15px; color: #16a34a;">-₹${data.discount.toFixed(2)}</td>
            </tr>` : ''}
          </tbody>
        </table>

        <!-- Summary Box -->
        <div style="width: 320px; margin-left: auto; margin-bottom: 40px;">
          <div style="display: flex; justify-content: space-between; padding: 10px 16px; font-size: 14px; color: #475569; border-bottom: 1px solid #f1f5f9;">
            <span>Subtotal</span>
            <span style="font-weight: 600; color: #0f172a;">₹${(data.net_fee + (data.discount || 0)).toFixed(2)}</span>
          </div>
          ${data.discount > 0 ? `
          <div style="display: flex; justify-content: space-between; padding: 10px 16px; font-size: 14px; color: #16a34a; border-bottom: 1px solid #f1f5f9;">
            <span>Discount</span>
            <span style="font-weight: 600;">-₹${data.discount.toFixed(2)}</span>
          </div>` : ''}
          <div style="display: flex; justify-content: space-between; padding: 16px; font-size: 18px; font-weight: 800; color: #0f172a; background: #f8fafc; border-radius: 8px; margin-top: 8px;">
            <span>Net Total</span>
            <span>₹${data.net_fee.toFixed(2)}</span>
          </div>
        </div>

        <!-- Payment Status -->
        <div style="display: flex; gap: 20px; padding: 24px; background: ${data.due_amount > 0 ? '#fef2f2' : '#f0fdf4'}; border: 1px solid ${data.due_amount > 0 ? '#fecaca' : '#bbf7d0'}; border-radius: 12px; margin-bottom: 40px;">
          <div style="flex: 1;">
            <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 6px;">Total Paid</div>
            <div style="font-size: 22px; font-weight: 800; color: #16a34a;">₹${data.paid_amount.toFixed(2)}</div>
          </div>
          <div style="flex: 1; text-align: right;">
            <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 6px;">Balance Due</div>
            <div style="font-size: 22px; font-weight: 800; color: ${data.due_amount > 0 ? '#dc2626' : '#64748b'};">₹${data.due_amount.toFixed(2)}</div>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; border-top: 2px solid #f1f5f9; padding-top: 24px; margin-top: 40px;">
          <div style="font-weight: 600; color: #64748b; font-size: 14px; margin-bottom: 6px;">Thank you for your business!</div>
          <div style="font-size: 12px; color: #94a3b8;">This is a computer-generated document and does not require a physical signature.</div>
        </div>
        
      </div>
    `;
    const opt: any = {
      margin: 0,
      filename: `Invoice_${invId}.pdf`,
      image: { type: 'jpeg', quality: 1 },
      html2canvas: { scale: 2, useCORS: true, windowWidth: 794 },
      jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait' }
    };
    html2pdf().set(opt).from(htmlString).save();
  } catch (error) {
    console.error("PDF generation failed", error);
  }
};

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
          <button onClick={onConfirm} className="btn-primary" style={{padding:"10px 20px",borderRadius:8,flex:1}}>Download</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Editable Institute Bank Details ─── */
function InstituteBankDetails({onDetailsChange}:{onDetailsChange:(d:any)=>void}){
  const [editing,setEditing]=useState(false);
  const [details,setDetails]=useState({bankName:"State Bank of India",accNo:"12345678901",ifsc:"SBIN0001234"});
  
  useEffect(()=>{
    const saved=localStorage.getItem("iinm_bank_details");
    if(saved){
      const parsed=JSON.parse(saved);
      setDetails(parsed);
      setTimeout(() => onDetailsChange(parsed), 0);
    }
    else setTimeout(() => onDetailsChange(details), 0);
  },[]);

  const handleSave=()=>{
    localStorage.setItem("iinm_bank_details",JSON.stringify(details));
    onDetailsChange(details);
    setEditing(false);
  };

  if(editing) return(
    <div style={{background:"#fff",border:"1px solid #e2e8f0",padding:12,borderRadius:8,fontSize:13}}>
      <div style={{fontWeight:800,color:"#0f172a",marginBottom:8,fontSize:12,textTransform:"uppercase"}}>Edit Bank Details</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        <input value={details.bankName} onChange={e=>setDetails({...details,bankName:e.target.value})} placeholder="Bank Name" style={{padding:8,border:"1px solid #e2e8f0",borderRadius:6,fontSize:12,width:"100%",boxSizing:"border-box",outline:"none"}}/>
        <input value={details.accNo} onChange={e=>setDetails({...details,accNo:e.target.value})} placeholder="Account Number" style={{padding:8,border:"1px solid #e2e8f0",borderRadius:6,fontSize:12,width:"100%",boxSizing:"border-box",outline:"none"}}/>
        <input value={details.ifsc} onChange={e=>setDetails({...details,ifsc:e.target.value})} placeholder="IFSC Code" style={{padding:8,border:"1px solid #e2e8f0",borderRadius:6,fontSize:12,width:"100%",boxSizing:"border-box",outline:"none"}}/>
        <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:4}}>
          <button type="button" onClick={()=>setEditing(false)} style={{padding:"6px 12px",borderRadius:6,border:"1px solid #e2e8f0",background:"#fff",fontSize:12,cursor:"pointer",color:"#475569"}}>Cancel</button>
          <button type="button" onClick={handleSave} style={{padding:"6px 12px",borderRadius:6,border:"none",background:"#6366f1",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>Save</button>
        </div>
      </div>
    </div>
  );

  return(
    <div style={{background:"#fff",border:"1px solid #e2e8f0",padding:12,borderRadius:8,fontSize:13,color:"#475569",lineHeight:1.6,position:"relative"}}>
      <button type="button" onClick={()=>setEditing(true)} style={{position:"absolute",top:12,right:12,background:"none",border:"none",color:"#6366f1",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}><Icon name="edit-2" size={12}/> Edit</button>
      <div style={{fontWeight:800,color:"#0f172a",marginBottom:4,fontSize:12,textTransform:"uppercase",paddingRight:40}}>Institute Bank Details</div>
      <div>Bank Name: <strong style={{color:"#0f172a"}}>{details.bankName}</strong></div>
      <div>Account No: <strong style={{color:"#0f172a"}}>{details.accNo}</strong></div>
      <div>IFSC Code: <strong style={{color:"#0f172a"}}>{details.ifsc}</strong></div>
    </div>
  );
}

/* ─── Dynamic Payment Fields Component ─── */
function PaymentMethodFields({form,setForm,prefix=""}:{form:any,setForm:(v:any)=>void,prefix?:string}){
  const method=form[`${prefix}method`];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:12,width:"100%"}}>
      <FS label="Payment Method" value={method} onChange={v=>setForm({...form,[`${prefix}method`]:v,[`${prefix}ref`]:"",[`${prefix}notes`]:"",cardName:"",ifsc:"",accNo:""})}>
        {MTHS.map(m=><option key={m} value={m}>{m}</option>)}
      </FS>

      {method==="UPI"&&(
        <div style={{background:"#f8fafc",padding:16,borderRadius:8,border:"1px solid #e2e8f0",textAlign:"center"}}>
          <div style={{fontSize:12,fontWeight:700,color:"#64748b",marginBottom:12,textTransform:"uppercase"}}>Scan to Pay</div>
          <img src="/qr.jpg" alt="UPI QR" style={{width:200,height:200,objectFit:"contain",margin:"0 auto 16px",borderRadius:8,border:"1px solid #e2e8f0",background:"#fff",display:"block"}} onError={(e)=>{e.currentTarget.style.display='none'}}/>
          <FI label="UTR Number" value={form[`${prefix}ref`]||""} onChange={v=>setForm({...form,[`${prefix}ref`]:v})} required/>
        </div>
      )}

      {method==="Card"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px",background:"#f8fafc",padding:16,borderRadius:8,border:"1px solid #e2e8f0"}}>
          <FI label="Card Holder Name" value={form.cardName||""} onChange={v=>setForm({...form,cardName:v})} required/>
          <FI label="Last 4 Digits / Txn ID" value={form[`${prefix}ref`]||""} onChange={v=>setForm({...form,[`${prefix}ref`]:v})} required/>
        </div>
      )}

      {method==="Bank Transfer"&&(
        <div style={{background:"#f8fafc",padding:16,borderRadius:8,border:"1px solid #e2e8f0",display:"flex",flexDirection:"column",gap:12}}>
          <InstituteBankDetails onDetailsChange={(d)=>setForm({...form,bankName:d.bankName,accNo:d.accNo,ifsc:d.ifsc})} />
          <FI label="Transaction ID / UTR" value={form[`${prefix}ref`]||""} onChange={v=>setForm({...form,[`${prefix}ref`]:v})} required/>
        </div>
      )}

      {method==="Cash"&&(
        <div style={{background:"#f8fafc",padding:16,borderRadius:8,border:"1px solid #e2e8f0"}}>
          <FI label="Receiver Name / Notes" value={form[`${prefix}notes`]||""} onChange={v=>setForm({...form,[`${prefix}notes`]:v})}/>
        </div>
      )}

      {method==="Generate Invoice Link (Pending)"&&(
        <div style={{background:"#f0fdf4",padding:16,borderRadius:8,border:"1px solid #dcfce7",color:"#16a34a",fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:8}}>
          <Icon name="link" size={16}/> No payment will be recorded now. An invoice will be created for the student to pay online.
        </div>
      )}
    </div>
  )
}

/* ─── Register Student Modal ─── */
function RegisterModal({onClose,onSuccess}:{onClose:()=>void;onSuccess:(s:any)=>void}){
  const {showToast}=useToast();
  const [f,setF]=useState({first_name:"",last_name:"",email:"",phone:"",gender:"",city:"",state:"",source:""});
  const [saving,setSaving]=useState(false);
  const up=(k:keyof typeof f)=>(v:string)=>setF(p=>({...p,[k]:v}));
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();
    if(!f.first_name.trim()||!f.email.trim()){showToast("Name & email required","error");return;}
    setSaving(true);
    try{
      const res=await apiFetch(`${API_BASE_URL}/students`,{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({...f,first_name:f.first_name.trim(),email:f.email.trim(),last_name:f.last_name||null,phone:f.phone||null,gender:f.gender||null,city:f.city||null,state:f.state||null,source:f.source||null,is_active:true})});
      if(!res.ok){const e=await res.json();throw new Error(e.detail||"Failed");}
      const stu=await res.json();
      showToast("Student registered!","success");
      onSuccess(stu);
    }catch(err:any){showToast(err.message,"error");}
    finally{setSaving(false);}
  };
  return(
    <div style={{position:"fixed",inset:0,zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(15,23,42,.6)",backdropFilter:"blur(6px)",animation:"fadeIn .2s"}}>
      <div style={{width:"94%",maxWidth:560,background:"#fff",borderRadius:20,boxShadow:"0 24px 60px rgba(0,0,0,.2)",overflow:"hidden",display:"flex",flexDirection:"column",maxHeight:"88vh",animation:"slideUp .3s cubic-bezier(.16,1,.3,1)"}}>
        <div style={{padding:"18px 22px",borderBottom:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",alignItems:"center",background:"linear-gradient(135deg,#eef2ff,#e0e7ff)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:10,background:"#6366f1",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="user-plus" size={18}/></div>
            <div><div style={{fontWeight:800,fontSize:16,color:"#1e1b4b"}}>Register New Student</div><div style={{fontSize:11,color:"#6366f1"}}>Quick registration form</div></div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"#94a3b8",padding:6}}><Icon name="x" size={20}/></button>
        </div>
        <div style={{padding:"20px 22px",overflowY:"auto"}}>
          <form id="reg-form" onSubmit={submit}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
              <FI label="First Name" value={f.first_name} onChange={up("first_name")} required/>
              <FI label="Last Name" value={f.last_name} onChange={up("last_name")}/>
            </div>
            <FI label="Email Address" value={f.email} onChange={up("email")} required type="email"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
              <FI label="Phone" value={f.phone} onChange={up("phone")}/>
              <FS label="Gender" value={f.gender} onChange={up("gender")}><option value="">Select…</option>{["Male","Female","Other"].map(o=><option key={o} value={o}>{o}</option>)}</FS>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
              <FI label="City" value={f.city} onChange={up("city")}/>
              <FI label="State" value={f.state} onChange={up("state")}/>
            </div>
            <FS label="Source" value={f.source} onChange={up("source")}><option value="">Select…</option>{["Google","Referral","Social Media","Advertisement","Word of Mouth","Other"].map(o=><option key={o} value={o}>{o}</option>)}</FS>
          </form>
        </div>
        <div style={{padding:"14px 22px",borderTop:"1px solid #f1f5f9",display:"flex",justifyContent:"flex-end",gap:10,background:"#fafbfc"}}>
          <button type="button" onClick={onClose} style={{padding:"10px 20px",borderRadius:8,border:"1.5px solid #e2e8f0",background:"#fff",color:"#475569",fontWeight:600,fontSize:13,cursor:"pointer"}}>Cancel</button>
          <button type="submit" form="reg-form" disabled={saving} className="btn-primary" style={{padding:"10px 24px"}}>{saving?"Saving…":"Register & Select"}</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Purchase Detail Modal (Installments & Payment) ─── */
export function PurchaseDetailModal({purchaseId,onClose,onSuccess}:{purchaseId:number;onClose:()=>void;onSuccess:()=>void}){
  const {showToast}=useToast();
  const [data,setData]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  const [payInst,setPayInst]=useState<any>(null);
  const [payForm,setPayForm]=useState({amount:"",method:"Cash",ref:"",notes:"",cardName:"",ifsc:"",accNo:"",bankName:""});
  const [paying,setPaying]=useState(false);
  const [showConfirm,setShowConfirm]=useState(false);

  const fetchDetail=useCallback(async()=>{
    setLoading(true);
    try{
      const r=await apiFetch(`${API_BASE_URL}/academic/purchases/${purchaseId}/installments`);
      if(r.ok) setData(await r.json());
      else throw new Error("Failed to load");
    }catch(e:any){showToast(e.message,"error");onClose();}
    finally{setLoading(false);}
  },[purchaseId,onClose,showToast]);

  useEffect(()=>{fetchDetail();},[fetchDetail]);

  const submitPayment=async(e:React.FormEvent)=>{
    e.preventDefault();
    if(!payInst)return;
    const amt=parseFloat(payForm.amount);
    if(amt<=0){showToast("Enter a valid amount","error");return;}
    setPaying(true);
    let finalNotes=payForm.notes;
    if(payForm.method==="Card") finalNotes=`Card Holder: ${payForm.cardName}`;
    if(payForm.method==="Bank Transfer") finalNotes=`Bank: ${payForm.bankName}, Acc: ${payForm.accNo}, IFSC: ${payForm.ifsc}`;
    try{
      const r=await apiFetch(`${API_BASE_URL}/academic/purchases/${purchaseId}/pay-installment`,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({installment_id:payInst.id,amount:amt,payment_method:payForm.method,reference_no:payForm.ref,notes:finalNotes})
      });
      if(!r.ok){const err=await r.json();throw new Error(err.detail||"Failed to record payment");}
      showToast("Payment recorded successfully!","success");
      setPayInst(null);
      setPayForm({amount:"",method:"Cash",ref:"",notes:"",cardName:"",ifsc:"",accNo:"",bankName:""});
      fetchDetail();
      onSuccess();
    }catch(err:any){showToast(err.message,"error");}
    finally{setPaying(false);}
  };

  const getStatusBadge=(status:string)=>{
    if(status==="paid") return <span className="badge badge-green">Paid</span>;
    if(status==="overdue") return <span className="badge badge-red">Overdue</span>;
    if(status==="partial") return <span className="badge badge-amber">Partial</span>;
    return <span className="badge" style={{background:"#f1f5f9",color:"#475569"}}>Pending</span>;
  };

  return(
    <div style={{position:"fixed",inset:0,zIndex:2500,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(15,23,42,.6)",backdropFilter:"blur(6px)",animation:"fadeIn .2s"}}>
      <div style={{width:"90vw",maxWidth:"90vw",background:"#fff",borderRadius:20,boxShadow:"0 24px 60px rgba(0,0,0,.2)",overflow:"hidden",display:"flex",flexDirection:"column",maxHeight:"94vh",animation:"slideUp .3s cubic-bezier(.16,1,.3,1)"}}>
        <div style={{padding:"18px 24px",borderBottom:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f8fafc"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:40,height:40,borderRadius:12,background:"#0f172a",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="calendar" size={20}/></div>
            <div>
              <div style={{fontWeight:800,fontSize:17,color:"#0f172a"}}>Installment Schedule {data?.status==="cancelled"&&<span style={{color:"#ef4444",fontSize:12,marginLeft:8}}>(Cancelled)</span>}{data?.is_active===false&&data?.status!=="cancelled"&&<span style={{color:"#ef4444",fontSize:12,marginLeft:8}}>(Inactive)</span>}</div>
              <div style={{fontSize:12,color:"#64748b"}}>{data?.student_name} • {data?.course_title}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:12,alignItems:"center"}}>
            {data?.invoice_uuid && (
              <button onClick={()=>{
                navigator.clipboard.writeText(`${window.location.origin}/invoice/${data.invoice_uuid}`);
                showToast("Payment link copied to clipboard!", "success");
              }} style={{background:"#f0fdf4",border:"1px solid #bbf7d0",padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",color:"#16a34a",display:"flex",alignItems:"center",gap:6}}><Icon name="link" size={14}/> Copy Link</button>
            )}
            <button onClick={()=>setShowConfirm(true)} style={{background:"#eff6ff",border:"1px solid #bfdbfe",padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",color:"#1d4ed8",display:"flex",alignItems:"center",gap:6}}><Icon name="download" size={14}/> Download Receipt</button>
            <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"#94a3b8",padding:6}}><Icon name="x" size={20}/></button>
          </div>
        </div>
        
        <div style={{overflowY:"auto",padding:"24px",flex:1}}>
          {loading?<div style={{textAlign:"center",padding:40,color:"#94a3b8"}}>Loading schedule...</div>:(
            <>
              <div style={{display:"flex",gap:20,marginBottom:24}}>
                <div style={{flex:1,background:"#f8fafc",padding:16,borderRadius:12,border:"1px solid #e2e8f0"}}>
                  <div style={{fontSize:11,color:"#64748b",fontWeight:700,textTransform:"uppercase"}}>Net Fee</div>
                  <div style={{fontSize:18,fontWeight:800,color:"#0f172a"}}>₹{data.net_fee.toFixed(2)}</div>
                </div>
                <div style={{flex:1,background:"#f0fdf4",padding:16,borderRadius:12,border:"1px solid #bbf7d0"}}>
                  <div style={{fontSize:11,color:"#16a34a",fontWeight:700,textTransform:"uppercase"}}>Paid Amount</div>
                  <div style={{fontSize:18,fontWeight:800,color:"#15803d"}}>₹{data.paid_amount.toFixed(2)}</div>
                </div>
                <div style={{flex:1,background:"#fef2f2",padding:16,borderRadius:12,border:"1px solid #fecaca"}}>
                  <div style={{fontSize:11,color:"#dc2626",fontWeight:700,textTransform:"uppercase"}}>Due Amount</div>
                  <div style={{fontSize:18,fontWeight:800,color:"#b91c1c"}}>₹{data.due_amount.toFixed(2)}</div>
                </div>
              </div>

              <div style={{border:"1px solid #e2e8f0",borderRadius:12,overflow:"hidden"}}>
                <div style={{display:"grid",gridTemplateColumns:"60px 1fr 1fr 1fr 1fr 120px",background:"#f8fafc",padding:"12px 16px",fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase",borderBottom:"1px solid #e2e8f0"}}>
                  <div>#</div><div>Due Date</div><div>Amount</div><div>Paid</div><div>Status</div><div style={{textAlign:"right"}}>Action</div>
                </div>
                {data.installments.map((inst:any)=>(
                  <div key={inst.id}>
                    <div style={{display:"grid",gridTemplateColumns:"60px 1fr 1fr 1fr 1fr 120px",padding:"14px 16px",borderBottom:"1px solid #f1f5f9",alignItems:"center",fontSize:13,background:inst.status==="overdue"?"#fffafa":"#fff"}}>
                      <div style={{fontWeight:700,color:"#64748b"}}>{inst.installment_no}</div>
                      <div style={{fontWeight:600,color:"#0f172a"}}>{new Date(inst.due_date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</div>
                      <div style={{fontWeight:700,color:"#0f172a"}}>₹{inst.amount.toFixed(2)}</div>
                      <div style={{fontWeight:600,color:"#16a34a"}}>₹{inst.paid_amount.toFixed(2)}</div>
                      <div>{getStatusBadge(inst.status)}</div>
                      <div style={{textAlign:"right"}}>
                        {inst.status!=="paid"&&(
                          <button onClick={()=>{
                            setPayInst(payInst?.id===inst.id?null:inst);
                            setPayForm({...payForm,amount:(inst.amount-inst.paid_amount).toFixed(2),ref:"",notes:""});
                          }} className="btn-outline" style={{padding:"6px 12px",fontSize:11,marginLeft:"auto"}}>Record Pay</button>
                        )}
                      </div>
                    </div>
                    {payInst?.id===inst.id&&(
                      <div style={{background:"#f8fafc",padding:"16px",borderBottom:"1px solid #e2e8f0"}}>
                        <div style={{fontSize:12,fontWeight:700,color:"#0f172a",marginBottom:12}}>Record Payment for Installment #{inst.installment_no}</div>
                        <form onSubmit={submitPayment} style={{display:"flex",flexDirection:"column",gap:12}}>
                          <FI label="Amount (₹)" value={payForm.amount} onChange={v=>setPayForm({...payForm,amount:v})} required type="number"/>
                          <PaymentMethodFields form={payForm} setForm={setPayForm} />
                          <button type="submit" className="btn-primary" disabled={paying} style={{height:44,alignSelf:"flex-end",padding:"0 24px"}}>{paying?"Wait..":"Submit Payment"}</button>
                        </form>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {showConfirm&&<ConfirmAlert title="Download Receipt" message="Do you want to download this receipt as a PDF?" onConfirm={()=>{handleDownloadReceipt(data);setShowConfirm(false);}} onCancel={()=>setShowConfirm(false)}/>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Purchase General Detail Modal (For Non-Installment) ─── */
export function PurchaseGeneralModal({purchaseId,onClose,onSuccess}:{purchaseId:number;onClose:()=>void;onSuccess:()=>void}){
  const {showToast}=useToast();
  const [data,setData]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  const [payForm,setPayForm]=useState({amount:"",method:"Cash",ref:"",notes:"",cardName:"",ifsc:"",accNo:"",bankName:""});
  const [paying,setPaying]=useState(false);
  const [showConfirm,setShowConfirm]=useState(false);

  const fetchDetail=useCallback(async()=>{
    setLoading(true);
    try{
      const r=await apiFetch(`${API_BASE_URL}/academic/purchases/${purchaseId}`);
      if(r.ok) setData(await r.json());
      else throw new Error("Failed to load");
    }catch(e:any){showToast(e.message,"error");onClose();}
    finally{setLoading(false);}
  },[purchaseId,onClose,showToast]);

  useEffect(()=>{fetchDetail();},[fetchDetail]);

  const submitPayment=async(e:React.FormEvent)=>{
    e.preventDefault();
    const amt=parseFloat(payForm.amount);
    if(amt<=0){showToast("Enter a valid amount","error");return;}
    setPaying(true);
    let finalNotes=payForm.notes;
    if(payForm.method==="Card") finalNotes=`Card Holder: ${payForm.cardName}`;
    if(payForm.method==="Bank Transfer") finalNotes=`Bank: ${payForm.bankName}, Acc: ${payForm.accNo}, IFSC: ${payForm.ifsc}`;
    try{
      const r=await apiFetch(`${API_BASE_URL}/academic/purchases/${purchaseId}/pay`,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({amount:amt,payment_method:payForm.method,reference_no:payForm.ref,notes:finalNotes})
      });
      if(!r.ok){const err=await r.json();throw new Error(err.detail||"Failed to record payment");}
      showToast("Payment recorded successfully!","success");
      setPayForm({amount:"",method:"Cash",ref:"",notes:"",cardName:"",ifsc:"",accNo:"",bankName:""});
      fetchDetail();
      onSuccess();
    }catch(err:any){showToast(err.message,"error");}
    finally{setPaying(false);}
  };

  return(
    <div style={{position:"fixed",inset:0,zIndex:2500,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(15,23,42,.6)",backdropFilter:"blur(6px)",animation:"fadeIn .2s"}}>
      <div style={{width:"90vw",maxWidth:900,background:"#fff",borderRadius:20,boxShadow:"0 24px 60px rgba(0,0,0,.2)",overflow:"hidden",display:"flex",flexDirection:"column",maxHeight:"94vh",animation:"slideUp .3s cubic-bezier(.16,1,.3,1)"}}>
        <div style={{padding:"18px 24px",borderBottom:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f8fafc"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:40,height:40,borderRadius:12,background:"#0f172a",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="shopping-cart" size={20}/></div>
            <div>
              <div style={{fontWeight:800,fontSize:17,color:"#0f172a"}}>Purchase Details {data?.status==="cancelled"&&<span style={{color:"#ef4444",fontSize:12,marginLeft:8}}>(Cancelled)</span>}{data?.is_active===false&&data?.status!=="cancelled"&&<span style={{color:"#ef4444",fontSize:12,marginLeft:8}}>(Inactive)</span>}</div>
              <div style={{fontSize:12,color:"#64748b"}}>{data?.student_name} • {data?.course_title}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:12,alignItems:"center"}}>
            {data?.invoice_uuid && (
              <button onClick={()=>{
                navigator.clipboard.writeText(`${window.location.origin}/invoice/${data.invoice_uuid}`);
                showToast("Payment link copied to clipboard!", "success");
              }} style={{background:"#f0fdf4",border:"1px solid #bbf7d0",padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",color:"#16a34a",display:"flex",alignItems:"center",gap:6}}><Icon name="link" size={14}/> Copy Link</button>
            )}
            <button onClick={()=>setShowConfirm(true)} style={{background:"#eff6ff",border:"1px solid #bfdbfe",padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",color:"#1d4ed8",display:"flex",alignItems:"center",gap:6}}><Icon name="download" size={14}/> Download Receipt</button>
            <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"#94a3b8",padding:6}}><Icon name="x" size={20}/></button>
          </div>
        </div>
        
        <div style={{overflowY:"auto",padding:"24px",flex:1}}>
          {loading?<div style={{textAlign:"center",padding:40,color:"#94a3b8"}}>Loading details...</div>:(
            <>
              <div style={{display:"flex",gap:20,marginBottom:24}}>
                <div style={{flex:1,background:"#f8fafc",padding:16,borderRadius:12,border:"1px solid #e2e8f0"}}>
                  <div style={{fontSize:11,color:"#64748b",fontWeight:700,textTransform:"uppercase"}}>Net Fee</div>
                  <div style={{fontSize:18,fontWeight:800,color:"#0f172a"}}>₹{data.net_fee.toFixed(2)}</div>
                </div>
                <div style={{flex:1,background:"#f0fdf4",padding:16,borderRadius:12,border:"1px solid #bbf7d0"}}>
                  <div style={{fontSize:11,color:"#16a34a",fontWeight:700,textTransform:"uppercase"}}>Paid Amount</div>
                  <div style={{fontSize:18,fontWeight:800,color:"#15803d"}}>₹{data.paid_amount.toFixed(2)}</div>
                </div>
                <div style={{flex:1,background:"#fef2f2",padding:16,borderRadius:12,border:"1px solid #fecaca"}}>
                  <div style={{fontSize:11,color:"#dc2626",fontWeight:700,textTransform:"uppercase"}}>Due Amount</div>
                  <div style={{fontSize:18,fontWeight:800,color:"#b91c1c"}}>₹{data.due_amount.toFixed(2)}</div>
                </div>
                {data.refunded_amount>0&&(
                  <div style={{flex:1,background:"#f8fafc",padding:16,borderRadius:12,border:"1px solid #94a3b8"}}>
                    <div style={{fontSize:11,color:"#475569",fontWeight:700,textTransform:"uppercase"}}>Refunded</div>
                    <div style={{fontSize:18,fontWeight:800,color:"#0f172a"}}>₹{data.refunded_amount.toFixed(2)}</div>
                  </div>
                )}
              </div>

              {data.due_amount>0&&(
                <div style={{background:"#f8fafc",padding:"20px",border:"1px solid #e2e8f0",borderRadius:12,marginBottom:24}}>
                  <div style={{fontSize:13,fontWeight:800,color:"#0f172a",marginBottom:14}}>Record Payment</div>
                  <form onSubmit={submitPayment} style={{display:"flex",flexDirection:"column",gap:14}}>
                    <FI label="Amount (₹)" value={payForm.amount} onChange={v=>setPayForm({...payForm,amount:v})} required type="number"/>
                    <PaymentMethodFields form={payForm} setForm={setPayForm} />
                    <button type="submit" className="btn-primary" disabled={paying} style={{height:44,alignSelf:"flex-end",padding:"0 30px"}}>{paying?"Wait..":"Submit Payment"}</button>
                  </form>
                </div>
              )}

              <div style={{border:"1px solid #e2e8f0",borderRadius:12,overflow:"hidden"}}>
                <div style={{background:"#f1f5f9",padding:"12px 16px",fontSize:12,fontWeight:800,color:"#475569",textTransform:"uppercase"}}>Transaction History</div>
                {data.transactions.length===0?<div style={{padding:20,textAlign:"center",color:"#94a3b8",fontSize:13}}>No transactions yet</div>:
                  data.transactions.map((t:any)=>(
                    <div key={t.id} style={{display:"flex",justifyContent:"space-between",padding:"14px 16px",borderBottom:"1px solid #f1f5f9",alignItems:"center",fontSize:13}}>
                      <div>
                        <div style={{fontWeight:700,color:"#0f172a",display:"flex",alignItems:"center",gap:6}}>
                          ₹{t.amount.toFixed(2)}
                          {t.status==="pending"?<span className="badge badge-amber" style={{fontSize:10,padding:"2px 6px"}}>Pending Approval</span>:
                           t.status==="approved"&&<span className="badge badge-green" style={{fontSize:10,padding:"2px 6px"}}>Approved</span>}
                        </div>
                        <div style={{color:"#64748b",fontSize:11,marginTop:2}}>{new Date(t.created_at).toLocaleString()}</div>
                      </div>
                      <div style={{textAlign:"right",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                        <div style={{fontWeight:600,color:"#475569"}}>{t.payment_method}</div>
                        {t.reference_no&&<div style={{color:"#64748b",fontSize:11}}>Ref: {t.reference_no}</div>}
                        {t.status==="pending"&&(
                          <button onClick={()=>{
                            apiFetch(`${API_BASE_URL}/academic/transactions/${t.id}/approve`,{method:"POST"})
                            .then(()=>fetchDetail());
                          }} style={{background:"#16a34a",color:"#fff",border:"none",padding:"4px 10px",borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer",marginTop:4}}>Approve</button>
                        )}
                      </div>
                    </div>
                  ))
                }
              </div>
              {showConfirm&&<ConfirmAlert title="Download Receipt" message="Do you want to download this receipt as a PDF?" onConfirm={()=>{handleDownloadReceipt(data);setShowConfirm(false);}} onCancel={()=>setShowConfirm(false)}/>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Purchase Form Modal ─── */
function PurchaseModal({students,courses,loadingData,onClose,onSuccess}:{
  students:any[];courses:any[];loadingData:boolean;onClose:()=>void;onSuccess:()=>void;
}){
  const {showToast}=useToast();
  const [showReg,setShowReg]=useState(false);
  const [stuList,setStuList]=useState(students);
  const [submitting,setSubmitting]=useState(false);
  const [stuSearch,setStuSearch]=useState("");
  const [stuOpen,setStuOpen]=useState(false);
  const [showLinkModal,setShowLinkModal]=useState(false);
  const [generatedUuid,setGeneratedUuid]=useState("");
  
  // Basic Form
  const [form,setForm]=useState({student_id:"",student_label:"",course_id:"",discount:"0",paying:"",method:"Generate Invoice Link (Pending)",ref:"",notes:"",cardName:"",ifsc:"",accNo:"",bankName:""});
  const [promoCode,setPromoCode]=useState("");
  const [promoValidating,setPromoValidating]=useState(false);
  
  // Installment Config
  const [isInst,setIsInst]=useState(false);
  const [instCountStr,setInstCountStr]=useState("1");
  const [customDates,setCustomDates]=useState<string[]>([new Date().toISOString().split("T")[0]]);

  const sel=courses.find(c=>String(c.id)===form.course_id);
  const fee=sel?.price||0;
  const disc=parseFloat(form.discount)||0;
  const net=Math.max(fee-disc,0);

  const getInitPay = (course: any, curNet: number, inst: boolean, count: number) => {
    if(curNet <= 0) return "";
    
    if(course?.min_payment_type === "amount" && course?.min_payment_value) {
      return String(course.min_payment_value);
    }
    if(course?.min_payment_type === "percentage" && course?.min_payment_value) {
      return (course.min_payment_value / 100 * curNet).toFixed(2);
    }
    
    if(!inst) return curNet.toFixed(2);
    return (curNet / (count + 1)).toFixed(2);
  };
  
  const validatePromo=async()=>{
    if(!form.course_id){showToast("Select a course first","error");return;}
    if(!promoCode.trim()){showToast("Enter a promo code","error");return;}
    setPromoValidating(true);
    try{
      const r=await apiFetch(`${API_BASE_URL}/academic/coupons/validate`,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({course_id:+form.course_id,coupon_code:promoCode})
      });
      const d=await r.json();
      if(!r.ok) throw new Error(d.detail||"Invalid code");
      setForm(p=>{
         const newDisc = d.calculated_discount;
         const newNet = Math.max(fee - newDisc, 0);
         return {...p, discount: String(newDisc), paying: isInst ? getInitPay(sel, newNet, isInst, parseInt(instCountStr)||1) : p.paying};
      });
      showToast(`Promo code applied! Save ₹${d.calculated_discount}`,"success");
    }catch(e:any){showToast(e.message,"error");}
    finally{setPromoValidating(false);}
  };
  
  const getSchedule=()=>{
    const count = parseInt(instCountStr) || 1;
    if(!isInst||count<1) return [];
    const downPayment = parseFloat(form.paying||"0");
    const remaining = Math.max(net - downPayment, 0);
    const futureCount = count;
    
    const sched=[];
    sched.push({no:1, date:new Date().toISOString().split("T")[0], amt: downPayment});
    
    if(futureCount > 0) {
      const per=Math.floor(remaining/futureCount*100)/100;
      const last=Number((remaining-per*(futureCount-1)).toFixed(2));
      for(let i=0; i<futureCount; i++){
        const dateVal = customDates[i] || new Date().toISOString().split("T")[0];
        sched.push({no:i+2, date:dateVal, amt:(i===futureCount-1)?last:per});
      }
    }
    return sched;
  };
  const sched=getSchedule();

  const pay=parseFloat(form.paying||"0");
  const due=Math.max(net-pay,0);

  let minReq=0,minLbl="";
  if(sel?.min_payment_type==="percentage"&&sel?.min_payment_value){minReq=+(sel.min_payment_value/100*net).toFixed(2);minLbl=`${sel.min_payment_value}% = ₹${minReq}`;}
  else if(sel?.min_payment_type==="amount"&&sel?.min_payment_value){minReq=sel.min_payment_value;minLbl=`Fixed ₹${minReq}`;}
  const invalid=minReq>0&&pay<minReq;

  const filtStu=stuList.filter(s=>{
    const q=stuSearch.toLowerCase();
    return(`${s.first_name} ${s.last_name||""}`.toLowerCase().includes(q)||(s.email||"").toLowerCase().includes(q)||(s.phone||"").includes(q));
  });

  const selStu=(s:any)=>{setForm(p=>({...p,student_id:String(s.id),student_label:`${s.first_name} ${s.last_name||""} — ${s.email}`}));setStuOpen(false);setStuSearch("");};
  const up=(k:keyof typeof form)=>(v:string)=>setForm(p=>({...p,[k]:v}));

  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();
    if(!form.student_id){showToast("Select a student","error");return;}
    if(!form.course_id){showToast("Select a course","error");return;}
    if(pay<=0){showToast("Enter paying amount","error");return;}
    if(invalid){showToast(`Minimum payment: ₹${minReq}`,"error");return;}
    const count = parseInt(instCountStr) || 1;
    if(isInst){
      if(count<1||count>23){showToast("Future installments must be between 1 and 23","error");return;}
      if(customDates.slice(0,count).some(d=>!d)){showToast("Please provide all installment dates","error");return;}
    }
    setSubmitting(true);
    let finalNotes=form.notes;
    if(form.method==="Card") finalNotes=`Card Holder: ${form.cardName}`;
    if(form.method==="Bank Transfer") finalNotes=`Bank: ${form.bankName}, Acc: ${form.accNo}, IFSC: ${form.ifsc}`;
    try{
      const isPending = form.method === "Generate Invoice Link (Pending)";
      const body={
        student_id:+form.student_id,course_id:+form.course_id,discount:disc,paying_amount:pay,
        payment_method: isPending ? "Online (Pending)" : form.method,
        record_payment: !isPending,
        reference_no:form.ref||null,notes:finalNotes||null,
        coupon_code:promoCode.trim()||null,
        is_installment:isInst,total_installments:count+1,
        custom_installment_dates:customDates.slice(0,count)
      };
      const r=await apiFetch(`${API_BASE_URL}/academic/purchase`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      if(!r.ok){const e=await r.json();throw new Error(e.detail||"Failed");}
      const d=await r.json();
      onSuccess(); // refresh the list
      if(d.invoice_uuid){
        setGeneratedUuid(d.invoice_uuid);
        setShowLinkModal(true);
      } else {
        showToast("Purchase complete!","success");
        onClose();
      }
    }catch(err:any){showToast(err.message,"error");}
    setSubmitting(false);
  };

  return(
    <div style={{position:"fixed",inset:0,zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(15,23,42,.6)",backdropFilter:"blur(6px)",animation:"fadeIn .2s"}}>
      {showReg&&<RegisterModal onClose={()=>setShowReg(false)} onSuccess={s=>{setStuList(p=>[s,...p]);selStu(s);setShowReg(false);}}/>}

      {/* Post-Purchase Link Modal — Dynamic based on payment method */}
      {showLinkModal&&(
        <div style={{position:"absolute",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(15,23,42,.55)",backdropFilter:"blur(4px)"}}>
          {(()=>{
            const isPending = form.method === "Generate Invoice Link (Pending)";
            return (
              <div style={{width:"92%",maxWidth:460,background:"#fff",borderRadius:20,boxShadow:"0 24px 60px rgba(0,0,0,.25)",overflow:"hidden",animation:"slideUp .25s cubic-bezier(.16,1,.3,1)"}}>
                
                {/* Header */}
                <div style={{
                  background: isPending ? "linear-gradient(135deg,#fffbeb,#fef3c7)" : "linear-gradient(135deg,#f0fdf4,#dcfce7)",
                  padding:"24px 28px 18px",textAlign:"center",
                  borderBottom: isPending ? "1px solid #fde68a" : "1px solid #bbf7d0"
                }}>
                  <div style={{
                    width:60,height:60,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",
                    background: isPending ? "#f59e0b" : "#16a34a",
                    boxShadow: isPending ? "0 8px 24px rgba(245,158,11,.3)" : "0 8px 24px rgba(22,163,74,.3)"
                  }}>
                    <Icon name={isPending ? "clock" : "check-circle"} size={28} color="#fff"/>
                  </div>
                  <div style={{fontWeight:800,fontSize:20,color: isPending ? "#92400e" : "#14532d"}}>
                    {isPending ? "Payment Pending" : "Enrollment Successful!"}
                  </div>
                  <div style={{fontSize:13,color: isPending ? "#b45309" : "#16a34a",marginTop:6}}>
                    {isPending ? "Enrollment registered. Student payment is awaited." : "Payment received. Enrollment is active."}
                  </div>
                </div>

                {/* Status Pills */}
                <div style={{display:"flex",gap:10,padding:"16px 24px",
                  background: isPending ? "#fffbeb" : "#f0fdf4",
                  borderBottom: isPending ? "1px solid #fde68a" : "1px solid #bbf7d0"
                }}>
                  <div style={{flex:1,background:"#fff",border: isPending ? "1px solid #fde68a" : "1px solid #bbf7d0",borderRadius:10,padding:"10px 14px",textAlign:"center"}}>
                    <div style={{fontSize:10,fontWeight:800,color: isPending ? "#92400e" : "#14532d",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:4}}>Payment Type</div>
                    <div style={{fontSize:13,fontWeight:700,color: isPending ? "#b45309" : "#16a34a",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                      <Icon name={isPending ? "clock" : "check"} size={13} color={isPending ? "#f59e0b" : "#16a34a"}/> {isPending ? "Online (Invoice)" : form.method}
                    </div>
                  </div>
                  <div style={{flex:1,background:"#fff",border: isPending ? "1px solid #fde68a" : "1px solid #bbf7d0",borderRadius:10,padding:"10px 14px",textAlign:"center"}}>
                    <div style={{fontSize:10,fontWeight:800,color: isPending ? "#92400e" : "#14532d",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:4}}>Status</div>
                    <div style={{fontSize:13,fontWeight:700,color: isPending ? "#dc2626" : "#16a34a",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                      <span style={{width:7,height:7,borderRadius:"50%",display:"inline-block",background: isPending ? "#f59e0b" : "#16a34a"}}/>
                      {isPending ? "Awaiting Payment" : "Paid & Active"}
                    </div>
                  </div>
                </div>

                {/* Invoice Link */}
                <div style={{padding:"20px 24px"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#475569",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                    <Icon name="link" size={13} color="#94a3b8"/> {isPending ? "Invoice Link — Share with Student" : "Receipt & Installment Link"}
                  </div>
                  <div style={{background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:10,padding:"11px 14px",fontSize:12,color:"#475569",wordBreak:"break-all",display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
                    <Icon name="link" size={13} color="#94a3b8"/>
                    <span style={{flex:1,fontFamily:"monospace",fontSize:11}}>{typeof window!=="undefined"?`${window.location.origin}/invoice/${generatedUuid}`:""}</span>
                  </div>

                  <div style={{
                    background: isPending ? "#fef9c3" : "#f0fdfa",
                    border: isPending ? "1px solid #fde047" : "1px solid #ccfbf1",
                    borderRadius:10,padding:"10px 14px",fontSize:12,
                    color: isPending ? "#713f12" : "#115e59",
                    marginBottom:18,display:"flex",gap:8,alignItems:"flex-start"
                  }}>
                    <span style={{fontSize:16}}>💡</span>
                    <span>
                      {isPending 
                        ? "Share this link with the student. Once they pay online, payment will be recorded automatically."
                        : "Share this link with the student. They can download their payment receipt and use it to pay future installments online."
                      }
                    </span>
                  </div>

                  <div style={{display:"flex",gap:10,flexDirection:"column"}}>
                    <button onClick={()=>{
                      navigator.clipboard.writeText(`${window.location.origin}/invoice/${generatedUuid}`);
                      showToast("Link copied! Share it with the student.","success");
                      setShowLinkModal(false);
                      onClose();
                    }} style={{
                      background: isPending ? "linear-gradient(135deg,#f59e0b,#d97706)" : "linear-gradient(135deg,#16a34a,#15803d)",
                      color:"#fff",border:"none",padding:"13px",borderRadius:12,fontWeight:700,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                      boxShadow: isPending ? "0 4px 12px rgba(245,158,11,.3)" : "0 4px 12px rgba(22,163,74,.3)"
                    }}>
                      <Icon name="link" size={16} color="#fff"/> {isPending ? "Copy & Send Payment Link" : "Copy Receipt & Link"}
                    </button>
                    <button onClick={()=>{setShowLinkModal(false);onClose();showToast(isPending ? "Enrollment saved with pending payment." : "Enrollment complete!","success");}} style={{background:"#f1f5f9",color:"#475569",border:"1px solid #e2e8f0",padding:"11px",borderRadius:12,fontWeight:600,fontSize:13,cursor:"pointer"}}>
                      {isPending ? "Skip — Mark as Pending Without Sending" : "Skip — Done"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}


      <div style={{width:"90vw",maxWidth:"90vw",background:"#fff",borderRadius:20,boxShadow:"0 24px 60px rgba(0,0,0,.2)",overflow:"hidden",display:"flex",flexDirection:"column",maxHeight:"96vh",animation:"slideUp .3s cubic-bezier(.16,1,.3,1)"}}>
        {/* Header */}
        <div style={{padding:"18px 24px",borderBottom:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",alignItems:"center",background:"linear-gradient(135deg,#eef2ff,#e0e7ff)"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:40,height:40,borderRadius:12,background:"#6366f1",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="shopping-cart" size={20}/></div>
            <div>
              <div style={{fontWeight:800,fontSize:17,color:"#1e1b4b"}}>New Course Purchase</div>
              <div style={{fontSize:12,color:"#6366f1"}}>Enroll a student and record payment</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"#94a3b8",padding:6}}><Icon name="x" size={20}/></button>
        </div>

        {/* Body */}
        <div style={{overflowY:"auto",flex:1,padding:"24px"}}>
          <form id="purchase-form" onSubmit={submit} style={{display:"flex",gap:24,flexWrap:"wrap"}}>
            {/* Left Col */}
            <div style={{flex:"1 1 340px",display:"flex",flexDirection:"column",gap:16}}>
              <div className="cp-card" style={{margin:0}}>
                <div className="cp-section-label" style={{color:"#6366f1"}}><Icon name="users" size={13}/> Student & Course</div>
                <div style={{display:"flex",gap:8,alignItems:"flex-start",position:"relative",marginBottom:14}}>
                  <div style={{flex:1,position:"relative"}}>
                    <div className="fi-field" style={{cursor:"pointer"}} onClick={()=>setStuOpen(p=>!p)}>
                      <label className={`fi-label${form.student_label?" up":""}`}>Select Student <span className="fi-req">*</span></label>
                      <input className="fi-inp" readOnly value={form.student_label} style={{cursor:"pointer"}}/>
                    </div>
                    {stuOpen&&(
                      <div className="stu-drop">
                        <div style={{padding:"8px 12px",borderBottom:"1px solid #f1f5f9"}}>
                          <input autoFocus value={stuSearch} onChange={e=>setStuSearch(e.target.value)} placeholder="Search..."
                            style={{width:"100%",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"8px 12px",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                        </div>
                        <div style={{maxHeight:180,overflowY:"auto"}}>
                          {filtStu.length===0?<div style={{padding:"14px",color:"#94a3b8",fontSize:13,textAlign:"center"}}>No results</div>
                          :filtStu.map(s=>(
                            <div key={s.id} className="stu-item" onClick={()=>selStu(s)}>
                              <div style={{fontWeight:700,fontSize:13,color:"#0f172a"}}>{s.first_name} {s.last_name}</div>
                              <div style={{fontSize:11,color:"#64748b"}}>{s.email}{s.phone?` · ${s.phone}`:""}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <button type="button" className="btn-outline" onClick={()=>setShowReg(true)} style={{height:54,padding:"0 14px"}}><Icon name="user-plus" size={14}/>New</button>
                </div>
                {loadingData?<div style={{color:"#94a3b8",fontSize:13}}>Loading courses…</div>:(
                  <FS label="Select Course" value={form.course_id} onChange={v=>{
                    const c = courses.find(x=>String(x.id)===v);
                    const n = Math.max((c?.price||0), 0);
                    setForm(p=>({...p,course_id:v,paying:getInitPay(c,n,isInst,parseInt(instCountStr)||1),discount:"0"}));
                  }} required>
                    <option value="">Choose a course…</option>
                    {courses.map(c=><option key={c.id} value={String(c.id)}>{c.title} — ₹{c.price?.toFixed(2)||"0.00"}</option>)}
                  </FS>
                )}
              </div>

              <div className="cp-card" style={{margin:0}}>
                <div className="cp-section-label" style={{color:"#6366f1"}}><Icon name="credit-card" size={13}/> Payment Configuration</div>
                
                <div style={{display:"flex",gap:12,marginBottom:14}}>
                  <div style={{flex:1}}><FI label="Promo Code" value={promoCode} onChange={setPromoCode}/></div>
                  <button type="button" onClick={validatePromo} disabled={promoValidating} className="btn-outline" style={{height:54,padding:"0 16px"}}>{promoValidating?"Wait..":"Apply"}</button>
                </div>
                <div style={{marginBottom:14,textAlign:"center",color:"#94a3b8",fontSize:12,fontWeight:600}}>OR</div>
                <FI label="Manual Discount (₹)" value={form.discount} onChange={up("discount")} type="text"/>
                
                <div style={{marginBottom:14}}>
                  <FI label="Paying Amount Now (₹)" value={form.paying} onChange={up("paying")} required type="text"/>
                  {invalid&&<div style={{margin:"-10px 0 10px",padding:"6px 12px",background:"#fef2f2",borderRadius:8,border:"1px solid #fecaca",fontSize:12,color:"#dc2626",fontWeight:600}}>Minimum: ₹{minReq.toFixed(2)}</div>}
                </div>

                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",background:"#f8fafc",borderRadius:10,border:"1px solid #e2e8f0",marginBottom:14,marginTop:14}}>
                  <div style={{fontWeight:700,fontSize:14,color:"#0f172a"}}>Pay in Installments?</div>
                  <Toggle checked={isInst} onChange={(v)=>{
                    setIsInst(v);
                    setForm(p=>({...p, paying: getInitPay(sel, net, v, parseInt(instCountStr)||1)}));
                  }}/>
                </div>

                {isInst&&(
                  <div style={{padding:"16px",background:"#eff6ff",borderRadius:12,border:"1px solid #bfdbfe",marginBottom:14}}>
                    <FI label="No. of Future Installments" value={instCountStr} onChange={v=>{
                      setInstCountStr(v);
                      const c=parseInt(v)||1;
                      if(customDates.length < c) {
                        const newDates = [...customDates];
                        const lastDate = newDates[newDates.length - 1] || new Date().toISOString().split("T")[0];
                        for(let i=newDates.length; i<c; i++){
                          const d = new Date(lastDate);
                          d.setMonth(d.getMonth()+1);
                          newDates.push(d.toISOString().split("T")[0]);
                        }
                        setCustomDates(newDates);
                      }
                      setForm(p=>({...p, paying: getInitPay(sel, net, isInst, c)}));
                    }} type="text"/>
                    
                    {parseInt(instCountStr)>0 && (
                      <div style={{marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 14px"}}>
                        {Array.from({length: parseInt(instCountStr)}).map((_, i) => (
                          <FI key={i} label={`Installment ${i+2} Date`} value={customDates[i]||""} onChange={v=>{
                            const newDates = [...customDates];
                            newDates[i] = v;
                            setCustomDates(newDates);
                          }} type="date" required/>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <PaymentMethodFields form={form} setForm={setForm} />
              </div>
            </div>

            {/* Right Col */}
            <div style={{flex:"1 1 340px",display:"flex",flexDirection:"column",gap:16}}>
              {isInst&&sched.length>0&&(
                <div className="cp-card" style={{margin:0,background:"#f8fafc"}}>
                  <div className="cp-section-label" style={{color:"#6366f1"}}><Icon name="calendar" size={13}/> Installment Schedule Preview</div>
                  <div style={{border:"1px solid #e2e8f0",borderRadius:8,overflow:"hidden",background:"#fff"}}>
                    <div style={{display:"grid",gridTemplateColumns:"40px 1fr 1fr 100px",background:"#f1f5f9",padding:"8px 12px",fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase"}}>
                      <div>#</div><div>Due Date</div><div>Amount</div><div>Status</div>
                    </div>
                    <div style={{maxHeight:220,overflowY:"auto"}}>
                      {sched.map(s=>(
                        <div key={s.no} style={{display:"grid",gridTemplateColumns:"40px 1fr 1fr 100px",padding:"10px 12px",borderBottom:"1px solid #f1f5f9",fontSize:13,alignItems:"center"}}>
                          <div style={{fontWeight:700,color:"#64748b"}}>{s.no}</div>
                          <div>{new Date(s.date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</div>
                          <div style={{fontWeight:700}}>₹{s.amt.toFixed(2)}</div>
                          <div>{s.no===1?<span className="badge badge-green">Paying Now</span>:<span className="badge" style={{background:"#f1f5f9",color:"#475569"}}>Pending</span>}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div style={{background:"linear-gradient(135deg,#eef2ff,#e0e7ff)",borderRadius:16,border:"1px solid #c7d2fe",padding:"20px 22px",marginTop:"auto"}}>
                <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:"#6366f1",marginBottom:12}}>Payment Summary</div>
                <SummaryRow label="Course Fee" value={`₹${fee.toFixed(2)}`}/>
                <SummaryRow label="Discount" value={`− ₹${disc.toFixed(2)}`}/>
                <SummaryRow label="Net Fee" value={`₹${net.toFixed(2)}`} highlight/>
                {isInst&&(
                  <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #e0e7ff"}}>
                    <span style={{fontSize:13,color:"#475569"}}>Installments</span>
                    <span style={{fontSize:13,fontWeight:700,color:"#1e1b4b"}}>{(parseInt(instCountStr)||1) + 1} Payments</span>
                  </div>
                )}
                <SummaryRow label={`Paying Now ${isInst?"(1st)":""}`} value={`₹${pay.toFixed(2)}`} color="#16a34a"/>
                <div style={{display:"flex",justifyContent:"space-between",padding:"12px 0 0",marginTop:4}}>
                  <span style={{fontSize:15,fontWeight:800,color:"#1e1b4b"}}>Due After Payment</span>
                  <span style={{fontSize:17,fontWeight:800,color:due>0?"#dc2626":"#16a34a"}}>₹{due.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div style={{padding:"16px 24px",borderTop:"1px solid #f1f5f9",display:"flex",justifyContent:"flex-end",gap:12,background:"#fafbfc"}}>
          <button type="button" onClick={onClose} style={{padding:"10px 24px",borderRadius:10,border:"1.5px solid #e2e8f0",background:"#fff",color:"#475569",fontWeight:600,fontSize:14,cursor:"pointer"}}>Cancel</button>
          <button type="submit" form="purchase-form" disabled={submitting||!form.student_id||!form.course_id||(!isInst&&pay<=0)}
            className="btn-primary" style={{padding:"10px 28px",fontSize:15}}>
            <Icon name="shopping-cart" size={18}/>{submitting?"Processing…":"Complete Purchase"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Inner ─── */
function CoursePurchaseInner(){
  const {showToast}=useToast();
  const [students,setStudents]=useState<any[]>([]);
  const [courses,setCourses]=useState<any[]>([]);
  const [purchases,setPurchases]=useState<any[]>([]);
  const [loadingData,setLoadingData]=useState(true);
  const [loadingPurchases,setLoadingPurchases]=useState(true);
  const [showModal,setShowModal]=useState(false);
  const [detailId,setDetailId]=useState<number|null>(null);
  const [genDetailId,setGenDetailId]=useState<number|null>(null);
  const [deleteId,setDeleteId]=useState<number|null>(null);
  const [deleting,setDeleting]=useState(false);

  // Filters & State
  const [search,setSearch]=useState("");
  const [filterCourse,setFilterCourse]=useState("all");
  const [filterStatus,setFilterStatus]=useState("all");
  const [overdueList,setOverdueList]=useState<any[]>([]);
  const [currentPage,setCurrentPage]=useState(1);
  const itemsPerPage=10;

  useEffect(()=>{setCurrentPage(1);},[search,filterCourse,filterStatus]);

  const fetchAll=useCallback(async()=>{
    try{
      const [sr,cr]=await Promise.all([apiFetch(`${API_BASE_URL}/students`),apiFetch(`${API_BASE_URL}/courses`)]);
      if(sr.ok)setStudents(await sr.json());
      if(cr.ok)setCourses(await cr.json());
    }catch{showToast("Error loading data","error");}
    setLoadingData(false);
  },[showToast]);

  const fetchPurchases=useCallback(async()=>{
    setLoadingPurchases(true);
    try{
      const [r, or]=await Promise.all([
        apiFetch(`${API_BASE_URL}/academic/purchases`),
        apiFetch(`${API_BASE_URL}/academic/purchases/overdue`)
      ]);
      if(r.ok)setPurchases(await r.json());
      if(or.ok)setOverdueList(await or.json());
    }
    catch{}
    setLoadingPurchases(false);
  },[]);

  const toggleActive=async(id:number, currentStatus:boolean)=>{
    try{
      const r = await apiFetch(`${API_BASE_URL}/academic/purchases/${id}/toggle-active`,{method:"POST"});
      if(r.ok){
        showToast(`Purchase marked ${currentStatus?"Inactive":"Active"}!`,"success");
        fetchPurchases();
      }else{
        throw new Error("Failed to update status");
      }
    }catch(err:any){
      showToast(err.message,"error");
    }
  };

  const deletePurchase=async()=>{
    if(!deleteId) return;
    setDeleting(true);
    try{
      const r = await apiFetch(`${API_BASE_URL}/academic/purchases/${deleteId}`,{method:"DELETE"});
      if(r.ok){
        showToast("Purchase deleted successfully!","success");
        setDeleteId(null);
        fetchPurchases();
      }else{
        throw new Error("Failed to delete purchase");
      }
    }catch(err:any){
      showToast(err.message,"error");
    }
    setDeleting(false);
  };

  useEffect(()=>{fetchAll();fetchPurchases();},[fetchAll,fetchPurchases]);

  const fmt=(n:number)=>`₹${n.toFixed(2)}`;

  const filteredPurchases=purchases.filter(p=>{
    const q=search.toLowerCase();
    const matchSearch=p.student_name.toLowerCase().includes(q)||p.student_email.toLowerCase().includes(q);
    const matchCourse=filterCourse==="all"||p.course_id.toString()===filterCourse;
    const derivedStatus=p.status==="completed"?"completed":p.due_amount<p.net_fee?"active":"pending";
    const matchStatus=filterStatus==="all"||derivedStatus===filterStatus;
    return matchSearch&&matchCourse&&matchStatus;
  });

  const exportCSV=()=>{
    if(filteredPurchases.length===0){showToast("No data to export","warning");return;}
    const headers=["ID","Student","Email","Course","Total Fee","Discount","Net Fee","Paid","Due","Installments","Status"];
    const rows=filteredPurchases.map(p=>[
      p.id, `"${p.student_name}"`, p.student_email, `"${p.course_title}"`, 
      p.total_fee, p.discount, p.net_fee, p.paid_amount, p.due_amount, 
      p.is_installment?`${p.installments_paid}/${p.total_installments}`:"No",
      p.status==="completed"?"Completed":p.due_amount<p.net_fee?"Active":"Pending"
    ]);
    const csv=[headers.join(","),...rows.map(r=>r.join(","))].join("\n");
    const blob=new Blob([csv],{type:"text/csv"});
    const url=window.URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url; a.download=`Purchases_Export_${new Date().getTime()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const totalPages=Math.ceil(filteredPurchases.length/itemsPerPage);
  const paginatedPurchases=filteredPurchases.slice((currentPage-1)*itemsPerPage,currentPage*itemsPerPage);

  const resetFilters=()=>{
    setSearch("");
    setFilterCourse("all");
    setFilterStatus("all");
    setCurrentPage(1);
  };

  return(
    <div className="manager-content">
      <style dangerouslySetInnerHTML={{__html:CSS}}/>
      {showModal&&<PurchaseModal students={students} courses={courses} loadingData={loadingData} onClose={()=>setShowModal(false)} onSuccess={fetchPurchases}/>}
      {detailId&&<PurchaseDetailModal purchaseId={detailId} onClose={()=>setDetailId(null)} onSuccess={fetchPurchases}/>}
      {genDetailId&&<PurchaseGeneralModal purchaseId={genDetailId} onClose={()=>setGenDetailId(null)} onSuccess={fetchPurchases}/>}

      {deleteId&&(
        <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,.6)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",animation:"fadeIn .2s"}}>
          <div style={{background:"#fff",width:"100%",maxWidth:400,borderRadius:16,boxShadow:"0 20px 25px -5px rgba(0,0,0,.1)",overflow:"hidden",animation:"slideUp .3s ease-out"}}>
            <div style={{padding:"24px 24px 0",textAlign:"center"}}>
              <div style={{width:48,height:48,borderRadius:24,background:"#fee2e2",color:"#ef4444",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
                <Icon name="alert-triangle" size={24}/>
              </div>
              <h3 style={{margin:"0 0 8px",fontSize:18,fontWeight:800,color:"#0f172a"}}>Delete Purchase?</h3>
              <p style={{margin:0,fontSize:14,color:"#64748b",lineHeight:1.5}}>
                Are you sure you want to delete this purchase? This will permanently remove all related installments and payment records.
              </p>
            </div>
            <div style={{padding:24,display:"flex",gap:12}}>
              <button onClick={()=>setDeleteId(null)} disabled={deleting} style={{flex:1,padding:"10px",borderRadius:8,border:"1.5px solid #e2e8f0",background:"#fff",color:"#475569",fontWeight:700,fontSize:14,cursor:"pointer"}}>Cancel</button>
              <button onClick={deletePurchase} disabled={deleting} style={{flex:1,padding:"10px",borderRadius:8,border:"none",background:"#ef4444",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                {deleting?"Deleting...":<><Icon name="trash-2" size={16}/> Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div>
          <h1 style={{margin:0,fontSize:22,fontWeight:800,color:"#0f172a"}}>Course Purchases</h1>
          <p style={{margin:"4px 0 0",fontSize:13,color:"#64748b"}}>All student enrollments and payment records</p>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={exportCSV} style={{background:"#f1f5f9",color:"#475569",border:"1px solid #e2e8f0",padding:"10px 16px",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>
            <Icon name="download" size={14}/> Export CSV
          </button>
          <button onClick={()=>setShowModal(true)} style={{background:"#0f172a",color:"#fff",border:"none",padding:"10px 20px",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>
            <Icon name="plus" size={14}/> New Purchase
          </button>
        </div>
      </header>

      {/* Overdue Widget */}
      {overdueList.length>0&&(
        <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:12,padding:"16px 20px",marginBottom:20,display:"flex",gap:16,alignItems:"flex-start"}}>
          <div style={{width:40,height:40,borderRadius:20,background:"#fee2e2",color:"#ef4444",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon name="alert-triangle" size={20}/></div>
          <div style={{flex:1}}>
            <div style={{fontWeight:800,color:"#b91c1c",fontSize:14,marginBottom:6}}>Attention: {overdueList.length} Overdue Installment{overdueList.length>1?"s":""}</div>
            <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:8}}>
              {overdueList.map(o=>(
                <div key={o.purchase_id} onClick={()=>setDetailId(o.purchase_id)} style={{background:"#fff",border:"1px solid #fca5a5",borderRadius:8,padding:"10px 14px",minWidth:220,cursor:"pointer",boxShadow:"0 2px 4px rgba(239,68,68,0.1)"}}>
                  <div style={{fontWeight:700,fontSize:13,color:"#0f172a",marginBottom:2}}>{o.student_name}</div>
                  <div style={{fontSize:11,color:"#dc2626",fontWeight:600}}>{o.course_title}</div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:8,alignItems:"center"}}>
                    <div style={{fontSize:14,fontWeight:800,color:"#b91c1c"}}>₹{o.overdue_installment_amount}</div>
                    <div style={{fontSize:10,background:"#fee2e2",color:"#ef4444",padding:"2px 6px",borderRadius:4,fontWeight:700}}>Due: {o.due_date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{display:"flex",gap:16,marginBottom:20,background:"#fff",padding:"16px 20px",borderRadius:16,border:"1px solid #e2e8f0",boxShadow:"0 1px 3px rgba(0,0,0,.04)",alignItems:"center"}}>
        <div style={{flex:1,position:"relative"}}>
          <div style={{position:"absolute",left:14,top:10,color:"#94a3b8"}}><Icon name="search" size={16}/></div>
          <input type="text" placeholder="Search by student name or email..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:"100%",boxSizing:"border-box",padding:"10px 14px 10px 40px",borderRadius:8,border:"1px solid #e2e8f0",outline:"none",fontSize:13,color:"#0f172a"}}/>
        </div>
        <select value={filterCourse} onChange={e=>setFilterCourse(e.target.value)} style={{padding:"10px 14px",borderRadius:8,border:"1px solid #e2e8f0",outline:"none",fontSize:13,color:"#0f172a",background:"#fff",cursor:"pointer",minWidth:180}}>
          <option value="all">All Courses</option>
          {courses.map((c:any)=><option key={c.id} value={c.id.toString()}>{c.title}</option>)}
        </select>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{padding:"10px 14px",borderRadius:8,border:"1px solid #e2e8f0",outline:"none",fontSize:13,color:"#0f172a",background:"#fff",cursor:"pointer",minWidth:140}}>
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
        </select>
        {(search!==""||filterCourse!=="all"||filterStatus!=="all")&&(
          <button onClick={()=>{setSearch("");setFilterCourse("all");setFilterStatus("all");setCurrentPage(1);}} style={{background:"#fef2f2",color:"#ef4444",border:"1px solid #fecaca",padding:"10px 16px",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
            <Icon name="x" size={14}/> Reset
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{background:"#fff",borderRadius:16,boxShadow:"0 1px 3px rgba(0,0,0,.06)",border:"1px solid #f1f5f9",overflow:"hidden"}}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid #f1f5f9",fontSize:12,fontWeight:700,color:"#64748b",display:"flex",justifyContent:"space-between"}}>
          <span>{filteredPurchases.length} records found</span>
          {filteredPurchases.length!==purchases.length&&<span style={{color:"#38bdf8",cursor:"pointer"}} onClick={()=>{setSearch("");setFilterCourse("all");setFilterStatus("all");}}>Clear Filters</span>}
        </div>

        <div style={{overflowX:"auto"}}>
          <div className="tbl-head" style={{gridTemplateColumns:COLS,minWidth:860}}>
            {["Student","Course","Total Fee","Paid","Due","Installments","Status","Active"].map(h=><span key={h}>{h}</span>)}
          </div>
          {loadingPurchases?(
            <div style={{padding:"40px",textAlign:"center",color:"#94a3b8",fontSize:14}}>Loading records…</div>
          ):purchases.length===0?(
            <div style={{padding:"60px",textAlign:"center"}}>
              <div style={{width:56,height:56,borderRadius:28,background:"#f1f5f9",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",color:"#94a3b8"}}><Icon name="shopping-cart" size={26}/></div>
              <div style={{fontWeight:700,color:"#0f172a",fontSize:16}}>No purchases yet</div>
              <div style={{color:"#64748b",fontSize:14,marginTop:6,marginBottom:20}}>Completed purchases will appear here.</div>
              <button onClick={()=>setShowModal(true)} style={{background:"#6366f1",color:"#fff",border:"none",padding:"12px 24px",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:8}}>
                <Icon name="plus" size={16}/> Create First Purchase
              </button>
            </div>
          ):filteredPurchases.length===0?(
            <div style={{padding:"40px",textAlign:"center",color:"#94a3b8"}}>No purchases found.</div>
          ):filteredPurchases.slice((currentPage-1)*itemsPerPage,currentPage*itemsPerPage).map((p:any)=>{
            const badge=p.status==="completed"?"badge-green":p.due_amount<p.net_fee?"badge-amber":"badge-red";
            const label=p.status==="completed"?"Completed":p.due_amount<p.net_fee?"Active":"Pending";
            return(
              <div key={p.id} className="tbl-row" style={{gridTemplateColumns:COLS,minWidth:860,cursor:"pointer",opacity:p.is_active?1:0.6,background:p.is_active?"#fff":"#f8fafc"}} onClick={()=>p.is_installment?setDetailId(p.id):setGenDetailId(p.id)}>
                <div>
                  <div style={{fontWeight:700,fontSize:13,color:"#0f172a"}}>{p.student_name}</div>
                  <div style={{fontSize:11,color:"#64748b"}}>{p.student_email}</div>
                </div>
                <div style={{fontSize:13,color:"#475569",fontWeight:600}}>{p.course_title}</div>
                <div style={{fontSize:13,fontWeight:600,color:"#0f172a"}}>{fmt(p.net_fee)}</div>
                <div style={{fontSize:13,fontWeight:700,color:"#16a34a"}}>{fmt(p.paid_amount)}</div>
                <div style={{fontSize:13,fontWeight:700,color:p.due_amount>0?"#dc2626":"#16a34a"}}>{fmt(p.due_amount)}</div>
                <div>
                  {p.is_installment?(
                    <span style={{background:"#f1f5f9",padding:"4px 10px",borderRadius:20,fontSize:11,fontWeight:700,color:"#475569",display:"inline-flex",alignItems:"center",gap:4}}>
                      <Icon name="list" size={12}/> {p.installments_paid}/{p.total_installments} Paid
                    </span>
                  ):(
                    <span style={{background:"#f8fafc",border:"1px solid #e2e8f0",padding:"4px 10px",borderRadius:20,fontSize:11,fontWeight:700,color:"#64748b",display:"inline-flex",alignItems:"center",gap:4}}>
                      <Icon name="eye" size={12}/> View Details
                    </span>
                  )}
                </div>
                <div><span className={`badge ${badge}`}>{label}</span></div>
                <div onClick={e=>e.stopPropagation()} style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:16}}>
                  <Toggle checked={p.is_active} onChange={()=>toggleActive(p.id, p.is_active)}/>
                  <button onClick={(e) => { e.stopPropagation(); setDeleteId(p.id); }} title="Delete" style={{ border: "none", background: "#fef2f2", color: "#ef4444", width: 30, height: 30, borderRadius: 6, cursor: "pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredPurchases.length>itemsPerPage&&(
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",background:"#fff",borderTop:"1px solid #f1f5f9"}}>
            <div style={{fontSize:13,color:"#64748b",fontWeight:600}}>
              Showing {(currentPage-1)*itemsPerPage+1} to {Math.min(currentPage*itemsPerPage,filteredPurchases.length)} of {filteredPurchases.length} records
            </div>
            <div style={{display:"flex",gap:8}}>
              <button disabled={currentPage===1} onClick={()=>setCurrentPage(currentPage-1)} style={{padding:"8px 14px",borderRadius:6,border:"1px solid #e2e8f0",background:"#fff",color:"#0f172a",fontSize:13,fontWeight:600,cursor:currentPage===1?"not-allowed":"pointer",opacity:currentPage===1?.5:1}}>Previous</button>
              <button disabled={currentPage===Math.ceil(filteredPurchases.length/itemsPerPage)} onClick={()=>setCurrentPage(currentPage+1)} style={{padding:"8px 14px",borderRadius:6,border:"1px solid #e2e8f0",background:"#fff",color:"#0f172a",fontSize:13,fontWeight:600,cursor:currentPage===Math.ceil(filteredPurchases.length/itemsPerPage)?"not-allowed":"pointer",opacity:currentPage===Math.ceil(filteredPurchases.length/itemsPerPage)?.5:1}}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CoursePurchasePage(){
  return <AdminProvider><CoursePurchaseInner/></AdminProvider>;
}
