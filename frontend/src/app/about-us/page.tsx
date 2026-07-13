"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import PublicNavbar from "@/components/PublicNavbar";
import PublicFooter from "@/components/PublicFooter";
import "../home.css";

const API = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== "undefined" ? `http://${window.location.hostname}:2007` : "http://localhost:2007");

/* ── Icons ── */
const ICONS: Record<string, React.ReactNode> = {
  Star: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>,
  Lightbulb: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"></path></svg>,
  Target: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>,
  Shield: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>,
  Users: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  Globe: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
};

const GRADIENTS = [
  { g: "linear-gradient(135deg, #38bdf8 0%, #0369a1 100%)", s: "rgba(56,189,248,.2)" },
  { g: "linear-gradient(135deg, #a78bfa 0%, #6d28d9 100%)", s: "rgba(167,139,250,.2)" },
  { g: "linear-gradient(135deg, #fb923c 0%, #dc2626 100%)", s: "rgba(251,146,60,.2)" },
  { g: "linear-gradient(135deg, #34d399 0%, #059669 100%)", s: "rgba(52,211,153,.2)" },
  { g: "linear-gradient(135deg, #f472b6 0%, #db2777 100%)", s: "rgba(244,114,182,.2)" },
  { g: "linear-gradient(135deg, #fbbf24 0%, #d97706 100%)", s: "rgba(251,191,36,.2)" }
];

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
        <div style={{ fontSize: 13, fontWeight: 700, color: "#38bdf8", letterSpacing: 4, textTransform: "uppercase", marginBottom: 16 }}>Discover</div>
        <h1 style={{ fontSize: "clamp(36px,6vw,72px)", fontWeight: 900, color: "#fff", letterSpacing: -2, lineHeight: 1.1, margin: "0 0 16px" }}>Our <span style={{ color: "#38bdf8" }}>Story</span></h1>
        <p style={{ fontSize: 18, color: "rgba(255,255,255,.7)", margin: 0 }}>Empowering minds, shaping the future</p>
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
      <div style={{ position: "absolute", top: "50%", left: "clamp(32px,8vw,100px)", transform: "translateY(-50%)", zIndex: 5, color: "#fff" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#38bdf8", letterSpacing: 4, textTransform: "uppercase", marginBottom: 14 }}>Discover</div>
        <h1 style={{ fontSize: "clamp(32px,5vw,60px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: -1, margin: "0 0 14px", textShadow: "0 2px 24px rgba(0,0,0,.5)" }}>Our <span style={{ color: "#38bdf8" }}>Story</span></h1>
        <p style={{ fontSize: 18, color: "rgba(255,255,255,.8)", margin: 0 }}>Empowering minds, shaping the future</p>
      </div>
      {banners.length > 1 && (
        <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8, zIndex: 10 }}>
          {banners.map((_, i) => (
            <button key={i} onClick={() => setCur(i)} style={{ width: i === cur ? 24 : 8, height: 8, borderRadius: 4, border: "none", cursor: "pointer", background: i === cur ? "#38bdf8" : "rgba(255,255,255,.5)", transition: "all .3s", padding: 0 }} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Stat Block ── */
function StatBlock({ val, label }: { val: string; label: string }) {
  if (!val) return null;
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "clamp(40px, 5vw, 56px)", fontWeight: 900, color: "#38bdf8", lineHeight: 1, marginBottom: 8, letterSpacing: -1 }}>{val}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: 2 }}>{label}</div>
    </div>
  );
}

export default function AboutUsPage() {
  const [settings, setSettings] = useState<any>({});
  const [banners, setBanners] = useState<any[]>([]);
  const [values, setValues] = useState<any[]>([]);
  const [contact, setContact] = useState<any>({});

  useEffect(() => {
    fetch(`${API}/api/about/settings`).then(r => r.ok ? r.json() : {}).then(d => setSettings(d || {})).catch(() => {});
    fetch(`${API}/api/about/banners`).then(r => r.ok ? r.json() : []).then(d => setBanners(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${API}/api/about/core-values`).then(r => r.ok ? r.json() : []).then(d => setValues(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${API}/api/contact/settings`).then(r => r.ok ? r.json() : {}).then(d => setContact(d || {})).catch(() => {});
  }, []);

  const hasStats = settings.stats_years || settings.stats_students || settings.stats_courses;

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      <PublicNavbar />
      <HeroCarousel banners={banners} />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        
        {/* Mission & Vision (Overlapping Glassmorphism Cards) */}
        {(settings.mission_statement || settings.vision_statement) && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 24, marginTop: -60, position: "relative", zIndex: 20, marginBottom: 100 }}>
            {settings.mission_statement && (
              <div style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(16px)", borderRadius: 24, padding: "40px", boxShadow: "0 12px 40px rgba(0,0,0,0.08)", border: "1px solid rgba(255,255,255,1)" }}>
                <div style={{ width: 48, height: 48, borderRadius: 16, background: "linear-gradient(135deg,#38bdf8,#0369a1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", marginBottom: 20, boxShadow: "0 8px 16px rgba(56,189,248,.2)" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </div>
                <h3 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>Our Mission</h3>
                <p style={{ fontSize: 16, color: "#475569", lineHeight: 1.7, margin: 0 }}>{settings.mission_statement}</p>
              </div>
            )}
            {settings.vision_statement && (
              <div style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(16px)", borderRadius: 24, padding: "40px", boxShadow: "0 12px 40px rgba(0,0,0,0.08)", border: "1px solid rgba(255,255,255,1)" }}>
                <div style={{ width: 48, height: 48, borderRadius: 16, background: "linear-gradient(135deg,#a78bfa,#6d28d9)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", marginBottom: 20, boxShadow: "0 8px 16px rgba(167,139,250,.2)" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h4l3-9 5 18 3-9h5"></path></svg>
                </div>
                <h3 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>Our Vision</h3>
                <p style={{ fontSize: 16, color: "#475569", lineHeight: 1.7, margin: 0 }}>{settings.vision_statement}</p>
              </div>
            )}
          </div>
        )}

        {/* Story & Impact Split Section */}
        {((settings.story_title || settings.story_text) || hasStats) && (
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", 
            gap: 60, 
            marginBottom: 100, 
            alignItems: "center" 
          }}>
            
            {/* Left: Our Story */}
            <div style={{ textAlign: "left", paddingRight: 20 }}>
              {(settings.story_title || settings.story_text) && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#38bdf8", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>Who We Are</div>
                  <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 900, color: "#0f172a", marginBottom: 24, lineHeight: 1.2 }}>{settings.story_title || "Our Story"}</h2>
                  <p style={{ fontSize: 17, color: "#475569", lineHeight: 1.8, whiteSpace: "pre-wrap", margin: 0 }}>
                    {settings.story_text}
                  </p>
                </>
              )}
            </div>

            {/* Right: Impact in Numbers */}
            <div style={{ width: "100%", maxWidth: 800, margin: "0 auto" }}>
              {hasStats && (
                <div style={{ background: "#0f172a", borderRadius: 32, padding: "56px 40px", position: "relative", overflow: "hidden", boxShadow: "0 24px 48px rgba(15,23,42,0.15)" }}>
                  <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 80% 20%, rgba(56,189,248,.15) 0%, transparent 60%)" }} />
                  <div style={{ position: "relative", zIndex: 2, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
                    {settings.stats_years && <StatBlock val={settings.stats_years} label="Years of Excellence" />}
                    {settings.stats_students && <StatBlock val={settings.stats_students} label="Students Enrolled" />}
                    {settings.stats_courses && <StatBlock val={settings.stats_courses} label="Courses Offered" />}
                  </div>
                </div>
              )}
            </div>
            
          </div>
        )}

        {/* Core Values */}
        {values.length > 0 && (
          <div style={{ marginBottom: 100 }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#38bdf8", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>Our Principles</div>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 900, color: "#0f172a", margin: 0, lineHeight: 1.2 }}>Core Values</h2>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 24 }}>
              {values.map((v, i) => {
                const styleObj = GRADIENTS[i % GRADIENTS.length];
                const Icon = ICONS[v.icon_name] || ICONS["Star"];
                return (
                  <div key={v.id} style={{ background: "#fff", borderRadius: 20, padding: "32px 28px", boxShadow: "0 4px 24px rgba(0,0,0,.05)", border: "1px solid #f1f5f9", transition: "transform .3s, box-shadow .3s", position: "relative", overflow: "hidden" }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-8px)"; e.currentTarget.style.boxShadow = `0 20px 40px ${styleObj.s}`; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,.05)"; }}>
                    
                    <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, background: styleObj.g, opacity: 0.05, filter: "blur(20px)", borderRadius: "50%", pointerEvents: "none" }} />
                    <div style={{ width: 56, height: 56, borderRadius: "50%", background: styleObj.g, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", marginBottom: 24, boxShadow: `0 8px 16px ${styleObj.s}` }}>
                      {Icon}
                    </div>
                    <h4 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>{v.title}</h4>
                    <p style={{ fontSize: 15, color: "#475569", lineHeight: 1.6, margin: 0 }}>{v.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Director's Message */}
        {(settings.director_name || settings.director_message) && (
          <div style={{ background: "#fff", borderRadius: 32, padding: "0", boxShadow: "0 20px 60px rgba(0,0,0,.05)", border: "1px solid #f1f5f9", marginBottom: 100, display: "flex", flexDirection: "row", overflow: "hidden", alignItems: "stretch" }}>
            {settings.director_image_url && (
              <div style={{ width: "40%", minWidth: 300, background: "#f8fafc", position: "relative" }}>
                <img src={settings.director_image_url.startsWith("/uploads") ? `${API}${settings.director_image_url}` : settings.director_image_url} alt={settings.director_name} style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
              </div>
            )}
            <div style={{ padding: "64px 48px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", color: "#38bdf8", marginBottom: 24 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" /></svg>
              </div>
              <p style={{ fontSize: "clamp(18px, 2vw, 24px)", color: "#0f172a", lineHeight: 1.6, fontWeight: 500, fontStyle: "italic", marginBottom: 32, position: "relative", zIndex: 2 }}>
                "{settings.director_message}"
              </p>
              <div>
                <h4 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: "0 0 4px" }}>{settings.director_name}</h4>
                <div style={{ fontSize: 14, color: "#38bdf8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>{settings.director_title || "Director / Founder"}</div>
              </div>
            </div>
          </div>
        )}

      </div>

      <PublicFooter />
    </div>
  );
}
