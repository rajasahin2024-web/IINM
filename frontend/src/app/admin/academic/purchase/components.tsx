"use client";
import React, { useState } from "react";

export const CSS = `
.cp-page{font-family:Inter,system-ui,sans-serif}
.cp-card{background:#fff;border-radius:16px;border:1px solid #e2e8f0;padding:22px;box-shadow:0 2px 8px rgba(0,0,0,.04);margin-bottom:20px}
.cp-section-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:16px;display:flex;align-items:center;gap:6px}
.fi-wrap{margin-bottom:14px}
.fi-field{position:relative;border:1.5px solid #e2e8f0;border-radius:10px;background:#f8fafc;transition:border-color .2s, box-shadow .2s, background .2s}
.fi-field:focus-within{border-color:#6366f1;background:#fff;box-shadow:0 0 0 3px rgba(99,102,241,.15)}
.fi-label{position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:14px;color:#94a3b8;pointer-events:none;transition:all .18s cubic-bezier(.4,0,.2,1);white-space:nowrap;background:transparent;padding:0 3px;line-height:1}
.fi-label.up{top:0;font-size:11px;font-weight:600;color:#6366f1;background:#fff;letter-spacing:normal;text-transform:none}
.fi-inp{display:block;width:100%;border:none;background:transparent;outline:none;padding:16px 14px;font-size:14px;color:#0f172a;font-family:inherit;font-weight:500;box-sizing:border-box;border-radius:10px}
.fi-inp:read-only{color:#64748b;cursor:not-allowed}
.fi-req{color:#ef4444;margin-left:2px}
.fi-sel{appearance:none;padding-right:30px;cursor:pointer}
.fi-arr{position:absolute;right:12px;top:50%;transform:translateY(-50%);pointer-events:none;font-size:10px;color:#94a3b8}
.stu-drop{position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:200;background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.1);overflow:hidden}
.stu-item{padding:10px 14px;cursor:pointer;border-bottom:1px solid #f8fafc;transition:background .1s}
.stu-item:hover{background:#f0f9ff}
.btn-primary{border:none;background:#6366f1;color:#fff;font-weight:700;font-size:14px;cursor:pointer;border-radius:10px;display:flex;align-items:center;justify-content:center;gap:8px;transition:all .2s;box-shadow:0 4px 14px rgba(99,102,241,.3)}
.btn-primary:hover:not(:disabled){background:#4f46e5;transform:translateY(-1px)}
.btn-primary:disabled{background:#a5b4fc;cursor:not-allowed;box-shadow:none}
.btn-outline{border:1.5px solid #6366f1;background:#eef2ff;color:#6366f1;font-weight:700;font-size:12px;cursor:pointer;border-radius:8px;display:flex;align-items:center;gap:5px;transition:all .2s;white-space:nowrap;flex-shrink:0}
.btn-outline:hover{background:#e0e7ff}
.badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}
.badge-green{background:#dcfce7;color:#16a34a}
.badge-amber{background:#fef3c7;color:#d97706}
.badge-red{background:#fee2e2;color:#dc2626}
.tbl-head{display:grid;padding:11px 18px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px}
.tbl-row{display:grid;padding:13px 18px;border-bottom:1px solid #f1f5f9;align-items:center;transition:background .1s}
.tbl-row:hover{background:#f8fafc}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{transform:translateY(18px);opacity:0}to{transform:translateY(0);opacity:1}}
.toggle-switch{position:relative;width:40px;height:24px;background:#e2e8f0;border-radius:12px;cursor:pointer;transition:background .2s}
.toggle-switch.on{background:#10b981}
.toggle-thumb{position:absolute;top:2px;left:2px;width:20px;height:20px;background:#fff;border-radius:50%;transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.1)}
.toggle-switch.on .toggle-thumb{transform:translateX(16px)}
`;

export function FI({label,value,onChange,required=false,type="text",readOnly=false,placeholder=""}:{
  label:string;value:string;onChange:(v:string)=>void;required?:boolean;type?:string;readOnly?:boolean;placeholder?:string;
}){
  const [focused,setFocused]=useState(false);
  const up=focused||value.length>0||type==="date";
  return(
    <div className="fi-wrap">
      <div className="fi-field">
        <label className={`fi-label${up?" up":""}`}>{label}{required&&<span className="fi-req">*</span>}</label>
        <input className="fi-inp" type={type} value={value} readOnly={readOnly} placeholder={focused?placeholder:""}
          onChange={e=>onChange(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}/>
      </div>
    </div>
  );
}

export function FS({label,value,onChange,children,required=false}:{
  label:string;value:string;onChange:(v:string)=>void;children:React.ReactNode;required?:boolean;
}){
  return(
    <div className="fi-wrap">
      <div className="fi-field">
        <label className="fi-label up">{label}{required&&<span className="fi-req">*</span>}</label>
        <select className="fi-inp fi-sel" value={value} onChange={e=>onChange(e.target.value)}>{children}</select>
        <span className="fi-arr">▼</span>
      </div>
    </div>
  );
}

export function SummaryRow({label,value,highlight=false,color}:{label:string;value:string;highlight?:boolean;color?:string}){
  return(
    <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #e0e7ff"}}>
      <span style={{fontSize:13,color:"#475569",fontWeight:highlight?700:400}}>{label}</span>
      <span style={{fontSize:13,fontWeight:700,color:color||"#1e1b4b"}}>{value}</span>
    </div>
  );
}

export function Toggle({checked,onChange}:{checked:boolean;onChange:(v:boolean)=>void}){
  return(
    <div className={`toggle-switch ${checked?"on":""}`} onClick={()=>onChange(!checked)}>
      <div className="toggle-thumb"/>
    </div>
  );
}
