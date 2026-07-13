"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import PublicNavbar from "@/components/PublicNavbar";
import PublicFooter from "@/components/PublicFooter";
import "../home.css";

const API = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== "undefined" ? `http://${window.location.hostname}:2007` : "http://localhost:2007");
const INTERESTS = ["Course Enrollment", "General Query", "Corporate / Partnership", "Career Guidance", "Other"];

/* ── Auto Carousel ── */
function HeroCarousel({ banners }: { banners: any[] }) {
  const [cur, setCur] = useState(0);
  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(() => setCur(c => (c + 1) % banners.length), 4500);
    return () => clearInterval(t);
  }, [banners.length]);

  if (!banners.length) return (
    <div style={{ height: 520, background: "linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0369a1 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 30% 50%, rgba(56,189,248,.15) 0%, transparent 60%)" }} />
      <div style={{ position: "relative", textAlign: "center", zIndex: 2 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#38bdf8", letterSpacing: 4, textTransform: "uppercase", marginBottom: 16 }}>Get In Touch</div>
        <h1 style={{ fontSize: "clamp(36px,6vw,72px)", fontWeight: 900, color: "#fff", letterSpacing: -2, lineHeight: 1.1, margin: "0 0 16px" }}>Contact <span style={{ color: "#38bdf8" }}>Us</span></h1>
        <p style={{ fontSize: 18, color: "rgba(255,255,255,.7)", margin: 0 }}>We'd love to hear from you</p>
      </div>
    </div>
  );

  return (
    <div style={{ position: "relative", height: 520, overflow: "hidden" }}>
      {banners.map((b, i) => (
        <div key={b.id} style={{ position: "absolute", inset: 0, opacity: i === cur ? 1 : 0, transform: i === cur ? "scale(1)" : "scale(1.04)", transition: "opacity .8s ease, transform .8s ease", zIndex: i === cur ? 1 : 0 }}>
          <img src={b.image_url.startsWith("/uploads") ? `${API}${b.image_url}` : b.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(0,0,0,.65) 0%, rgba(0,0,0,.3) 60%, transparent 100%)" }} />
        </div>
      ))}
      {/* Hero text overlay */}
      <div style={{ position: "absolute", top: "50%", left: "clamp(32px,8vw,100px)", transform: "translateY(-50%)", zIndex: 5, color: "#fff" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#38bdf8", letterSpacing: 4, textTransform: "uppercase", marginBottom: 14 }}>Get In Touch</div>
        <h1 style={{ fontSize: "clamp(32px,5vw,60px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: -1, margin: "0 0 14px", textShadow: "0 2px 24px rgba(0,0,0,.5)" }}>Contact <span style={{ color: "#38bdf8" }}>Us</span></h1>
        <p style={{ fontSize: 18, color: "rgba(255,255,255,.8)", margin: 0 }}>We'd love to hear from you</p>
      </div>
      {/* Dots */}
      {banners.length > 1 && (
        <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8, zIndex: 10 }}>
          {banners.map((_, i) => (
            <button key={i} onClick={() => setCur(i)} style={{ width: i === cur ? 24 : 8, height: 8, borderRadius: 4, border: "none", cursor: "pointer", background: i === cur ? "#38bdf8" : "rgba(255,255,255,.5)", transition: "all .3s", padding: 0 }} />
          ))}
        </div>
      )}
      {banners.length > 1 && (
        <>
          <button onClick={() => setCur(c => (c - 1 + banners.length) % banners.length)} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", zIndex: 10, background: "rgba(255,255,255,.15)", backdropFilter: "blur(8px)", color: "#fff", border: "1px solid rgba(255,255,255,.2)", borderRadius: "50%", width: 44, height: 44, cursor: "pointer", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
          <button onClick={() => setCur(c => (c + 1) % banners.length)} style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", zIndex: 10, background: "rgba(255,255,255,.15)", backdropFilter: "blur(8px)", color: "#fff", border: "1px solid rgba(255,255,255,.2)", borderRadius: "50%", width: 44, height: 44, cursor: "pointer", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
        </>
      )}
    </div>
  );
}

/* ── Info Card ── */
function InfoCard({ icon, gradient, shadowColor, label, lines, href }: { icon: React.ReactNode; gradient: string; shadowColor: string; label: string; lines: string[]; href?: string }) {
  const content = (
    <div style={{ background: "#fff", borderRadius: 20, padding: "28px 24px", boxShadow: "0 4px 24px rgba(0,0,0,.05)", border: "1px solid #f1f5f9", transition: "transform .3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow .3s", height: "100%", boxSizing: "border-box" as const, position: "relative", overflow: "hidden" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-8px)"; e.currentTarget.style.boxShadow = `0 20px 40px ${shadowColor}`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,.05)"; }}>
      
      {/* Decorative background glow */}
      <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, background: gradient, opacity: 0.05, filter: "blur(20px)", borderRadius: "50%", pointerEvents: "none" }} />

      {/* Icon Circle */}
      <div style={{ width: 48, height: 48, borderRadius: "50%", background: gradient, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", marginBottom: 20, boxShadow: `0 8px 16px ${shadowColor}` }}>
        {icon}
      </div>

      <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: 1.5, marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {lines.filter(Boolean).map((l, i) => <div key={i} style={{ fontSize: 15, color: i === 0 ? "#0f172a" : "#475569", lineHeight: 1.5, fontWeight: i === 0 ? 700 : 500, wordBreak: "break-word" }}>{l}</div>)}
      </div>
    </div>
  );
  return href ? <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "block", height: "100%" }}>{content}</a> : <div style={{ height: "100%" }}>{content}</div>;
}

/* ── Floating Input ── */
function FInput({ label, value, onChange, type = "text", isTextArea = false, required = false }: any) {
  const [f, setF] = useState(false);
  const has = value !== "";
  const border = f ? "#38bdf8" : "#e2e8f0";
  return (
    <div style={{ position: "relative" }}>
      {isTextArea
        ? <textarea required={required} value={value} onChange={onChange} onFocus={() => setF(true)} onBlur={() => setF(false)}
            style={{ width: "100%", padding: "15px 16px", borderRadius: 12, border: `1.5px solid ${border}`, outline: "none", fontSize: 14, color: "#0f172a", background: "#fff", boxSizing: "border-box" as const, fontFamily: "inherit", resize: "vertical" as const, minHeight: 120, boxShadow: f ? "0 0 0 3px rgba(56,189,248,.12)" : "none", transition: "border .2s, box-shadow .2s" }} />
        : <input type={type} required={required} value={value} onChange={onChange} onFocus={() => setF(true)} onBlur={() => setF(false)}
            style={{ width: "100%", padding: "15px 16px", borderRadius: 12, border: `1.5px solid ${border}`, outline: "none", fontSize: 14, color: "#0f172a", background: "#fff", boxSizing: "border-box" as const, fontFamily: "inherit", boxShadow: f ? "0 0 0 3px rgba(56,189,248,.12)" : "none", transition: "border .2s, box-shadow .2s" }} />
      }
      <label style={{ position: "absolute", left: 14, top: f || has ? -9 : isTextArea ? 14 : "50%", transform: f || has ? "none" : isTextArea ? "none" : "translateY(-50%)", fontSize: f || has ? 11 : 14, fontWeight: f || has ? 700 : 400, color: f ? "#38bdf8" : has ? "#64748b" : "#94a3b8", background: f || has ? "#fff" : "transparent", padding: f || has ? "0 4px" : "0", transition: "all .2s cubic-bezier(.4,0,.2,1)", pointerEvents: "none", zIndex: 1 }}>
        {label}{required ? " *" : ""}
      </label>
    </div>
  );
}

export default function ContactUsPage() {
  const [contact, setContact] = useState<any>({});
  const [banners, setBanners] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", email: "", phone: "", interest: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_BASE_URL || `http://${window.location.hostname}:2007`;
    fetch(`${api}/api/contact/settings`).then(r => r.ok ? r.json() : {}).then(d => setContact(d || {})).catch(() => {});
    fetch(`${api}/api/contact/banners`).then(r => r.ok ? r.json() : []).then(d => setBanners(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setError("");
    try {
      const api = process.env.NEXT_PUBLIC_BASE_URL || `http://${window.location.hostname}:2007`;
      const res = await fetch(`${api}/api/contact/inquiry`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      setSubmitted(true);
    } catch { setError("Submission failed. Please try again."); }
    finally { setSubmitting(false); }
  };

  const fullAddress = [contact.address_line1, contact.address_line2, contact.city, contact.state, contact.pin_code, contact.country].filter(Boolean).join(", ");

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      <PublicNavbar />
      <HeroCarousel banners={banners} />

      {/* Floating contact cards */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 20, marginTop: -56, position: "relative", zIndex: 20, marginBottom: 72 }}>
          {contact.phone1 && <InfoCard 
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>} 
            gradient="linear-gradient(135deg, #38bdf8 0%, #0369a1 100%)" shadowColor="rgba(56,189,248,.2)"
            label="Call Us" lines={[contact.phone1, contact.phone2]} />}
            
          {contact.email1 && <InfoCard 
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>}
            gradient="linear-gradient(135deg, #a78bfa 0%, #6d28d9 100%)" shadowColor="rgba(167,139,250,.2)"
            label="Email Us" lines={[contact.email1, contact.email2]} href={`mailto:${contact.email1}`} />}
            
          {fullAddress && <InfoCard 
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>}
            gradient="linear-gradient(135deg, #fb923c 0%, #dc2626 100%)" shadowColor="rgba(251,146,60,.2)"
            label="Visit Us" lines={[fullAddress]} />}
            
          {contact.weekday_hours && <InfoCard 
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>}
            gradient="linear-gradient(135deg, #34d399 0%, #059669 100%)" shadowColor="rgba(52,211,153,.2)"
            label="Office Hours" lines={[contact.weekday_hours, contact.weekend_hours]} />}
            
          {contact.whatsapp && <InfoCard 
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>}
            gradient="linear-gradient(135deg, #2dd4bf 0%, #0891b2 100%)" shadowColor="rgba(45,212,191,.2)"
            label="WhatsApp" lines={[contact.whatsapp]} href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`} />}
        </div>

        {/* Map + Social + Form */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginBottom: 80 }}>

          {/* LEFT */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {contact.map_embed_url && (
              <div style={{ background: "#fff", borderRadius: 20, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,.07)", border: "1px solid #f1f5f9" }}>
                <iframe src={contact.map_embed_url} width="100%" height="340" style={{ border: 0, display: "block" }} allowFullScreen loading="lazy" />
              </div>
            )}

            {/* Address detail card */}
            {fullAddress && (
              <div style={{ background: "#fff", borderRadius: 20, padding: "28px", boxShadow: "0 4px 24px rgba(0,0,0,.07)", border: "1px solid #f1f5f9" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#38bdf8", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 16 }}>Our Location</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {contact.address_line1 && <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ color: "#38bdf8", marginTop: 2 }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg></div>
                    <span style={{ fontSize: 14, color: "#475569", lineHeight: 1.6 }}>{[contact.address_line1, contact.address_line2].filter(Boolean).join(", ")}</span>
                  </div>}
                  {contact.city && <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ color: "#38bdf8" }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>
                    <span style={{ fontSize: 14, color: "#475569", fontWeight: 600 }}>{[contact.city, contact.state, contact.pin_code].filter(Boolean).join(", ")}</span>
                  </div>}
                  {contact.weekday_hours && <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ color: "#38bdf8" }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></div>
                    <span style={{ fontSize: 14, color: "#475569" }}>{contact.weekday_hours}</span>
                  </div>}
                  {contact.weekend_hours && <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ color: "#38bdf8" }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>
                    <span style={{ fontSize: 14, color: "#475569" }}>{contact.weekend_hours}</span>
                  </div>}
                </div>
              </div>
            )}

            {/* Social */}
            {(contact.facebook_url || contact.instagram_url || contact.linkedin_url || contact.youtube_url || contact.twitter_url) && (
              <div style={{ background: "#fff", borderRadius: 20, padding: "28px", boxShadow: "0 4px 24px rgba(0,0,0,.07)", border: "1px solid #f1f5f9" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#38bdf8", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 16 }}>Follow Us</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {[
                    { href: contact.facebook_url, label: "Facebook", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg> },
                    { href: contact.instagram_url, label: "Instagram", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg> },
                    { href: contact.linkedin_url, label: "LinkedIn", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg> },
                    { href: contact.youtube_url, label: "YouTube", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg> },
                    { href: contact.twitter_url, label: "Twitter / X", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l11.733 16h4.267l-11.733 -16z"></path><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"></path></svg> },
                  ].filter(s => s.href).map(s => (
                    <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                      style={{ display: "flex", alignItems: "center", gap: 7, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "9px 16px", textDecoration: "none", color: "#475569", fontSize: 13, fontWeight: 600, transition: "all .2s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#e0f2fe"; e.currentTarget.style.borderColor = "#38bdf8"; e.currentTarget.style.color = "#0369a1"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#475569"; }}>
                      <span style={{ display: "flex", color: "inherit" }}>{s.icon}</span> {s.label}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — Inquiry Form */}
          <div style={{ background: "#fff", borderRadius: 20, padding: "40px", boxShadow: "0 4px 24px rgba(0,0,0,.07)", border: "1px solid #f1f5f9", position: "sticky", top: 24, alignSelf: "flex-start" }}>
            {submitted ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#d1fae5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 20px" }}>✅</div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: "0 0 10px" }}>Thank You!</h2>
                <p style={{ color: "#64748b", fontSize: 15, lineHeight: 1.6, margin: "0 0 24px" }}>Your inquiry has been submitted.<br />We'll get back to you shortly.</p>
                <button onClick={() => { setSubmitted(false); setForm({ name: "", email: "", phone: "", interest: "", message: "" }); }}
                  style={{ background: "#38bdf8", color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                  Send Another Message
                </button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#38bdf8", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>Inquiry Form</div>
                  <h2 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 800, color: "#0f172a" }}>Send Us a Message</h2>
                  <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>Fill in the form below and we'll respond as soon as possible.</p>
                </div>
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <FInput label="Full Name" required value={form.name} onChange={(e: any) => setForm(p => ({ ...p, name: e.target.value }))} />
                  <FInput label="Email Address" type="email" required value={form.email} onChange={(e: any) => setForm(p => ({ ...p, email: e.target.value }))} />
                  <FInput label="Phone Number" value={form.phone} onChange={(e: any) => setForm(p => ({ ...p, phone: e.target.value }))} />
                  <div style={{ position: "relative" }}>
                    <select value={form.interest} onChange={e => setForm(p => ({ ...p, interest: e.target.value }))}
                      style={{ width: "100%", padding: "15px 16px", borderRadius: 12, border: "1.5px solid #e2e8f0", outline: "none", fontSize: 14, color: form.interest ? "#0f172a" : "#94a3b8", background: "#fff", appearance: "none" as any, cursor: "pointer", fontFamily: "inherit" }}>
                      <option value="">Select Area of Interest</option>
                      {INTERESTS.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                    <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#94a3b8", fontSize: 11 }}>▼</span>
                  </div>
                  <FInput label="Message (Optional)" isTextArea value={form.message} onChange={(e: any) => setForm(p => ({ ...p, message: e.target.value }))} />
                  {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#dc2626" }}>{error}</div>}
                  <button type="submit" disabled={submitting}
                    style={{ background: "linear-gradient(135deg,#0369a1,#38bdf8)", color: "#fff", border: "none", borderRadius: 12, padding: "16px 24px", fontSize: 15, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1, transition: "all .2s", boxShadow: "0 6px 20px rgba(56,189,248,.35)", letterSpacing: 0.3 }}
                    onMouseEnter={e => !submitting && (e.currentTarget.style.transform = "translateY(-2px)")}
                    onMouseLeave={e => !submitting && (e.currentTarget.style.transform = "none")}>
                    {submitting ? "Submitting…" : "Submit Inquiry →"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
