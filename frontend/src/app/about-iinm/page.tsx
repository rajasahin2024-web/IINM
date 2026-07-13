"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import PublicNavbar from "@/components/PublicNavbar";
import PublicFooter from "@/components/PublicFooter";
import { API_BASE_URL, BASE_URL } from "@/lib/config";
import { apiFetch } from "@/lib/apiFetch";
import "../home.css";

// Remove /api from API_BASE_URL to get backend root URL for file absolute paths
const BACKEND_BASE = API_BASE_URL.replace("/api", "");

/* ══════════════════════════════════════════════════════
   ICONS — Premium inline SVG icons to prevent dependency issues
   ══════════════════════════════════════════════════════ */
const ICONS: Record<string, React.ReactNode> = {
  Star: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  Lightbulb: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5M9 18h6M10 22h4" />
    </svg>
  ),
  Target: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  Shield: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Users: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Globe: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  Edit: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  ),
  Plus: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Trash: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  ),
  Close: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
};

/* ══════════════════════════════════════════════════════
   FORM INPUT FIELD
   ══════════════════════════════════════════════════════ */
function FormInput({ label, value, onChange, type = "text", isTextArea = false, rows = 3, selectOptions = null }: any) {
  const [f, setF] = useState(false);
  const has = value !== "" && value !== null && value !== undefined;
  
  const base: React.CSSProperties = {
    width: "100%", padding: "14px 12px", borderRadius: 8, fontSize: 13, outline: "none",
    color: "#0f172a", background: "#fff", boxSizing: "border-box", fontFamily: "inherit",
    border: `1.5px solid ${f ? "#e63946" : "#cbd5e1"}`,
    boxShadow: f ? "0 0 0 3px rgba(230,57,70,.15)" : "none",
    transition: "border-color .15s, box-shadow .15s",
    resize: isTextArea ? "vertical" : "none",
    minHeight: isTextArea ? 80 : undefined,
  };
  const lbl: React.CSSProperties = {
    position: "absolute", left: 12,
    top: f || has ? -8 : (isTextArea ? 14 : "50%"),
    transform: f || has ? "none" : (isTextArea ? "none" : "translateY(-50%)"),
    fontSize: f || has ? 10 : 13, fontWeight: f || has ? 700 : 400,
    color: f ? "#e63946" : has ? "#475569" : "#94a3b8",
    background: f || has ? "#fff" : "transparent",
    padding: f || has ? "0 4px" : "0",
    transition: "all .18s ease-in-out", pointerEvents: "none", zIndex: 1,
  };

  return (
    <div style={{ position: "relative", width: "100%", marginBottom: 14 }}>
      {selectOptions ? (
        <select style={base} value={value || ""} onChange={onChange} onFocus={() => setF(true)} onBlur={() => setF(false)}>
          {selectOptions.map((opt: any) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : isTextArea ? (
        <textarea style={base} value={value || ""} onChange={onChange} onFocus={() => setF(true)} onBlur={() => setF(false)} rows={rows} />
      ) : (
        <input type={type} style={base} value={value || ""} onChange={onChange} onFocus={() => setF(true)} onBlur={() => setF(false)} />
      )}
      <label style={lbl}>{label}</label>
    </div>
  );
}

export default function AboutIinmPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // States for fetched data
  const [settings, setSettings] = useState<any>({
    mission_statement: "", vision_statement: "", story_title: "", story_text: "",
    stats_years: "", stats_students: "", stats_courses: "",
    director_name: "", director_title: "", director_message: "", director_image_url: ""
  });
  const [extended, setExtended] = useState<any>({
    founder1: { name: "", role: "", bio: "", quote: "", image_url: "", video_url: "" },
    founder2: { name: "", role: "", bio: "", quote: "", image_url: "", video_url: "" },
    gallery: [],
    timeline: []
  });
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active play state for founder YouTube videos
  const [videoPlay, setVideoPlay] = useState<Record<string, boolean>>({});

  // Active editor modals
  const [editorModal, setEditorModal] = useState<"story" | "founders" | "gallery" | "timeline" | null>(null);
  
  // Temporal editor form states
  const [editSettings, setEditSettings] = useState<any>({});
  const [editExtended, setEditExtended] = useState<any>({});
  const [uploading, setUploading] = useState(false);

  // Fetch all page data
  const loadPageData = async () => {
    try {
      setLoading(true);
      const [sRes, eRes, tRes] = await Promise.all([
        apiFetch(`${API_BASE_URL}/about/settings`),
        apiFetch(`${API_BASE_URL}/about/extended`),
        apiFetch(`${API_BASE_URL}/leadership/public`)
      ]);

      if (sRes.ok) setSettings(await sRes.json());
      if (eRes.ok) {
        const d = await eRes.json();
        setExtended({
          founder1: d?.founder1 || { name: "", role: "", bio: "", quote: "", image_url: "", video_url: "" },
          founder2: d?.founder2 || { name: "", role: "", bio: "", quote: "", image_url: "", video_url: "" },
          gallery: d?.gallery || [],
          timeline: d?.timeline || []
        });
      }
      if (tRes.ok) setTeam(await tRes.json());
    } catch (e) {
      console.error("Error loading About page data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPageData();

    // Setup scroll progress indicator
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        setScrollProgress((window.scrollY / totalScroll) * 100);
      }
    };
    window.addEventListener("scroll", handleScroll);

    // Setup admin checking loop
    const checkAdmin = () => {
      const loggedIn = localStorage.getItem("iinm_is_logged_in") === "true";
      const expiry = localStorage.getItem("iinm_login_expiry");
      const valid = loggedIn && expiry ? Date.now() < Number(expiry) : false;
      setIsAdmin(valid);
    };
    checkAdmin();
    const interval = setInterval(checkAdmin, 2500);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearInterval(interval);
    };
  }, []);

  // Format background paths
  const getAssetUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${BACKEND_BASE}${url}`;
  };

  // Open inline modal forms
  const openEditor = (type: "story" | "founders" | "gallery" | "timeline") => {
    if (type === "story") {
      setEditSettings({ ...settings });
    } else {
      setEditExtended(JSON.parse(JSON.stringify(extended)));
    }
    setEditorModal(type);
  };

  // Save General & Story Info
  const saveStory = async () => {
    setUploading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/about/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editSettings)
      });
      if (res.ok) {
        setSettings(editSettings);
        setEditorModal(null);
      }
    } catch (e) {
      console.error("Save story error", e);
    } finally {
      setUploading(false);
    }
  };

  // Save Extended Config (Founders, Gallery, or Timeline)
  const saveExtended = async (updatedData = editExtended) => {
    setUploading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/about/extended`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData)
      });
      if (res.ok) {
        setExtended(updatedData);
        setEditorModal(null);
      }
    } catch (e) {
      console.error("Save extended error", e);
    } finally {
      setUploading(false);
    }
  };

  // Upload inline images
  const handleImageUpload = async (fieldPath: string[], file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await apiFetch(`${API_BASE_URL}/about/upload-about-image`, {
        method: "POST",
        body: fd
      });
      if (res.ok) {
        const d = await res.json();
        const updated = JSON.parse(JSON.stringify(editExtended));
        
        // Deep nested update
        if (fieldPath.length === 1) {
          updated[fieldPath[0]] = d.url;
        } else if (fieldPath.length === 2) {
          updated[fieldPath[0]][fieldPath[1]] = d.url;
        } else if (fieldPath.length === 3) {
          updated[fieldPath[0]][fieldPath[1]][fieldPath[2]] = d.url;
        }
        setEditExtended(updated);
      }
    } catch (e) {
      console.error("Upload error", e);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ background: "#f8fafc", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#0a1628", fontFamily: "'Inter', sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 44, height: 44, border: "3px solid rgba(10,22,40,0.08)", borderTopColor: "#e63946", borderRadius: "50%", animation: "tickerScroll 1s linear infinite", margin: "0 auto 16px" }} />
          <h2 style={{ fontSize: 15, fontWeight: 700, letterSpacing: 0.5, color: "#475569" }}>Loading About IINM...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="hp-root" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc", position: "relative" }}>
      
      {/* ── TOP SCROLL PROGRESS BAR ── */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "3px",
          width: `${scrollProgress}%`,
          background: "linear-gradient(90deg, #e63946, #ff6b6b)",
          zIndex: 99999,
          boxShadow: "0 0 8px rgba(230,57,70,0.4)",
          transition: "width 0.1s ease-out"
        }}
      />

      {/* Navigation */}
      <PublicNavbar />

      {/* ══════════════════════════════════════════════════════
         ABOUT US HERO — Light, clean, image on right
         ══════════════════════════════════════════════════════ */}
      <section style={{ position: "relative", padding: "100px 48px 90px", overflow: "hidden", background: "radial-gradient(circle at 30% 30%, #ffffff 0%, #f3f7ff 50%, #ebf1ff 100%)" }}>
        {/* Dot grid backdrop */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.35, backgroundImage: "radial-gradient(rgba(10,22,40,0.05) 1px, transparent 1px)", backgroundSize: "24px 24px", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 56, alignItems: "center", position: "relative", zIndex: 2 }}>
          {/* Left: Text content */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Badge */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(230, 57, 70, 0.08)", border: "1px solid rgba(230, 57, 70, 0.2)", borderRadius: 30, padding: "7px 18px", alignSelf: "flex-start" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#e63946", animation: "tickerFade 1.5s infinite" }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: "#e63946", letterSpacing: 1.5, textTransform: "uppercase" }}>About IINM</span>
            </div>

            {/* Heading */}
            <h1 style={{ fontSize: "clamp(34px, 5vw, 52px)", fontWeight: 900, letterSpacing: "-1.5px", lineHeight: 1.15, color: "#0a1628", margin: 0 }}>
              Connecting the Dots of<br />
              <span style={{ background: "linear-gradient(135deg, #e63946 0%, #a21824 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", display: "inline-block" }}>Artificial Intelligence</span>
            </h1>

            {/* Description */}
            <p style={{ fontSize: "clamp(15px, 2vw, 17px)", color: "#475569", lineHeight: 1.7, maxWidth: 520, margin: 0, fontWeight: 500 }}>
              IINM is dedicated to building highly-skilled global leaders ready for the cognitive computing landscape. Discover our narrative, meet the pioneers, and explore our roadmap.
            </p>

            {/* Stats row */}
            <div style={{ display: "flex", gap: 0, maxWidth: 440, background: "#fff", border: "1px solid rgba(10,22,40,0.06)", borderRadius: 16, padding: "22px 12px", boxShadow: "0 4px 20px rgba(10,22,40,0.05)" }}>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 900, color: "#e63946" }}>{settings.stats_years || "3+"}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.6, marginTop: 2 }}>Years</div>
              </div>
              <div style={{ flex: 1, textAlign: "center", borderLeft: "1px solid rgba(10,22,40,0.06)", borderRight: "1px solid rgba(10,22,40,0.06)" }}>
                <div style={{ fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 900, color: "#0a1628" }}>{settings.stats_students || "10,000+"}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.6, marginTop: 2 }}>Students</div>
              </div>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 900, color: "#e63946" }}>{settings.stats_courses || "50+"}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.6, marginTop: 2 }}>Courses</div>
              </div>
            </div>

            {/* CTA buttons */}
            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              <a href="#story" style={{ background: "linear-gradient(135deg, #e63946 0%, #c1202f 100%)", color: "#fff", border: "none", borderRadius: 8, padding: "12px 28px", fontSize: 14, fontWeight: 700, textDecoration: "none", boxShadow: "0 4px 14px rgba(230,57,70,0.2)", transition: "all 0.25s ease", display: "inline-block" }}>Our Story</a>
              <a href="#team" style={{ background: "#fff", color: "#0a1628", border: "1px solid #cbd5e1", borderRadius: 8, padding: "12px 28px", fontSize: 14, fontWeight: 700, textDecoration: "none", boxShadow: "0 2px 4px rgba(0,0,0,0.02)", transition: "all 0.25s ease", display: "inline-block" }}>Meet the Team</a>
            </div>
          </div>

          {/* Right: Single image */}
          <div style={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "center" }}>
            {/* Decorative glow behind image */}
            <div style={{ position: "absolute", top: "-30px", right: "-30px", width: 180, height: 180, background: "radial-gradient(circle, rgba(230,57,70,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: "-40px", left: "-40px", width: 200, height: 200, background: "radial-gradient(circle, rgba(10,22,40,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

            <div style={{ position: "relative", width: "100%", maxWidth: 480, borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 50px -12px rgba(10,22,40,0.2)", border: "1px solid rgba(10,22,40,0.06)" }}>
              <img
                src={settings.director_image_url ? getAssetUrl(settings.director_image_url) : "/female-teacher.png"}
                alt="About IINM"
                style={{ width: "100%", height: "auto", display: "block", objectFit: "cover" }}
              />
              {/* Subtle gradient overlay at bottom */}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40%", background: "linear-gradient(to top, rgba(10,22,40,0.15) 0%, transparent 100%)", pointerEvents: "none" }} />
            </div>
          </div>
        </div>

        {/* Responsive */}
        <style>{`
          @media (max-width: 900px) {
            section:has(> div[style*="grid-template-columns: 1.1fr 0.9fr"]) > div {
              grid-template-columns: 1fr !important;
              gap: 32px !important;
            }
          }
          @media (max-width: 576px) {
            section[style*="padding: 100px 48px 90px"] {
              padding: 60px 20px !important;
            }
          }
        `}</style>
      </section>

      {/* ══════════════════════════════════════════════════════
         MISSION & STORY SECTION — Dark navy
         ══════════════════════════════════════════════════════ */}
      <section style={{ padding: "90px 24px", position: "relative", background: "#0a1628", overflow: "hidden" }}>
        {/* Subtle radial glow */}
        <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: "60%", height: "60%", background: "radial-gradient(circle, rgba(230,57,70,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

        {isAdmin && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 36, position: "relative", zIndex: 2 }}>
            <button onClick={() => openEditor("story")} className="fd-cta-btn-primary" style={{ padding: "8px 18px", fontSize: 13, gap: 6 }}>
              {ICONS.Edit} Edit General Settings & Narrative
            </button>
          </div>
        )}

        <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 2 }}>
          {/* Section heading */}
          <div style={{ textAlign: "center", marginBottom: 50 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#e63946", textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>Who We Are</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 38px)", fontWeight: 900, color: "#fff" }}>Our Mission & Vision</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 28 }}>
            {/* Mission Box */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", padding: "40px 32px", borderRadius: 20, backdropFilter: "blur(12px)" }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(230,57,70,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#e63946", marginBottom: 22 }}>
                {ICONS.Target}
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 14 }}>Our Mission</h3>
              <p style={{ fontSize: 15, color: "#94a3b8", lineHeight: 1.75, margin: 0 }}>
                {settings.mission_statement || "To empower global learners through institutional access to cutting-edge AI skills, world-class mentors, and certified assessment pathways."}
              </p>
            </div>

            {/* Vision Box */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", padding: "40px 32px", borderRadius: 20, backdropFilter: "blur(12px)" }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", marginBottom: 22 }}>
                {ICONS.Globe}
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 14 }}>Our Vision</h3>
              <p style={{ fontSize: 15, color: "#94a3b8", lineHeight: 1.75, margin: 0 }}>
                {settings.vision_statement || "To become the definitive node connecting the dots of Artificial Intelligence education, forming highly robust industry collaborations."}
              </p>
            </div>
          </div>

          {/* Narrative Split */}
          {(settings.story_title || settings.story_text) && (
            <div style={{ maxWidth: 860, margin: "70px auto 0", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 56 }}>
              <h2 style={{ fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 850, color: "#fff", marginBottom: 18 }}>{settings.story_title}</h2>
              <p style={{ fontSize: 16, color: "#94a3b8", lineHeight: 1.85, whiteSpace: "pre-wrap", maxWidth: 800, margin: "0 auto" }}>
                {settings.story_text}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
         FOUNDERS' STORY SECTION — Light/white
         ══════════════════════════════════════════════════════ */}
      <section style={{ padding: "90px 24px", background: "#f8fafc", position: "relative" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#e63946", textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>Pioneers of IINM</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 38px)", fontWeight: 900, color: "#0a1628" }}>Founders' Story</h2>
            {isAdmin && (
              <button onClick={() => openEditor("founders")} className="fd-cta-btn-primary" style={{ padding: "8px 18px", fontSize: 13, gap: 6, marginTop: 14 }}>
                {ICONS.Edit} Edit Founders' Profiles & Videos
              </button>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 36 }}>
            
            {/* Founder 1 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24, background: "#fff", border: "1px solid rgba(10,22,40,0.06)", borderRadius: 20, padding: "32px", boxShadow: "0 4px 24px rgba(10,22,40,0.05)" }}>
              
              {/* Video frame */}
              <div style={{ width: "100%", position: "relative", borderRadius: 14, overflow: "hidden", boxShadow: "0 8px 28px rgba(10,22,40,0.12)" }}>
                <div style={{ height: 28, background: "#0a1628", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px" }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fbbf24" }} />
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
                  </div>
                  <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, letterSpacing: 0.5 }}>IINM FOUNDER CAM 01</div>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#e63946", animation: "tickerFade 1.2s infinite" }} />
                </div>

                <div style={{ position: "relative", paddingTop: "56.25%", background: "#0a1628" }}>
                  {extended?.founder1?.video_url && videoPlay.f1 ? (
                    <iframe
                      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                      src={`https://www.youtube.com/embed/${extended?.founder1?.video_url}?autoplay=1&mute=0&controls=1`}
                      title={extended?.founder1?.name}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  ) : (
                    <>
                      <img src={getAssetUrl(extended?.founder1?.image_url)} alt={extended?.founder1?.name} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                      <div style={{ position: "absolute", inset: 0, background: "rgba(10,22,40,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <button
                          onClick={() => setVideoPlay(p => ({ ...p, f1: true }))}
                          style={{ width: 56, height: 56, borderRadius: "50%", background: "#e63946", border: "2px solid #fff", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "transform 0.2s", boxShadow: "0 0 15px rgba(230,57,70,0.5)" }}
                          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
                          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21" /></svg>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Founder Profile details */}
              <div>
                <h4 style={{ fontSize: 22, fontWeight: 900, color: "#0a1628", margin: "0 0 4px" }}>{extended?.founder1?.name}</h4>
                <div style={{ fontSize: 13, color: "#e63946", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14 }}>{extended?.founder1?.role}</div>
                <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, marginBottom: 16 }}>{extended?.founder1?.bio}</p>
                
                {extended?.founder1?.quote && (
                  <div style={{ borderLeft: "3px solid #e63946", paddingLeft: 14, fontSize: 14, color: "#334155", fontStyle: "italic", fontWeight: 500, lineHeight: 1.6 }}>
                    "{extended?.founder1?.quote}"
                  </div>
                )}
              </div>
            </div>

            {/* Founder 2 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24, background: "#fff", border: "1px solid rgba(10,22,40,0.06)", borderRadius: 20, padding: "32px", boxShadow: "0 4px 24px rgba(10,22,40,0.05)" }}>
              
              {/* Video frame */}
              <div style={{ width: "100%", position: "relative", borderRadius: 14, overflow: "hidden", boxShadow: "0 8px 28px rgba(10,22,40,0.12)" }}>
                <div style={{ height: 28, background: "#0a1628", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px" }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fbbf24" }} />
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
                  </div>
                  <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, letterSpacing: 0.5 }}>IINM FOUNDER CAM 02</div>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#e63946", animation: "tickerFade 1.2s infinite" }} />
                </div>

                <div style={{ position: "relative", paddingTop: "56.25%", background: "#0a1628" }}>
                  {extended?.founder2?.video_url && videoPlay.f2 ? (
                    <iframe
                      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                      src={`https://www.youtube.com/embed/${extended?.founder2?.video_url}?autoplay=1&mute=0&controls=1`}
                      title={extended?.founder2?.name}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  ) : (
                    <>
                      <img src={getAssetUrl(extended?.founder2?.image_url)} alt={extended?.founder2?.name} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                      <div style={{ position: "absolute", inset: 0, background: "rgba(10,22,40,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <button
                          onClick={() => setVideoPlay(p => ({ ...p, f2: true }))}
                          style={{ width: 56, height: 56, borderRadius: "50%", background: "#e63946", border: "2px solid #fff", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "transform 0.2s", boxShadow: "0 0 15px rgba(230,57,70,0.5)" }}
                          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
                          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21" /></svg>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Founder Profile details */}
              <div>
                <h4 style={{ fontSize: 22, fontWeight: 900, color: "#0a1628", margin: "0 0 4px" }}>{extended?.founder2?.name}</h4>
                <div style={{ fontSize: 13, color: "#e63946", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14 }}>{extended?.founder2?.role}</div>
                <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, marginBottom: 16 }}>{extended?.founder2?.bio}</p>
                
                {extended?.founder2?.quote && (
                  <div style={{ borderLeft: "3px solid #e63946", paddingLeft: 14, fontSize: 14, color: "#334155", fontStyle: "italic", fontWeight: 500, lineHeight: 1.6 }}>
                    "{extended?.founder2?.quote}"
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
         FOUNDERS GALLERY SECTION — Dark navy
         ══════════════════════════════════════════════════════ */}
      <section style={{ padding: "90px 24px", position: "relative", background: "#0a1628", overflow: "hidden" }}>
        {/* Subtle radial glow */}
        <div style={{ position: "absolute", bottom: "10%", left: "50%", transform: "translateX(-50%)", width: "50%", height: "50%", background: "radial-gradient(circle, rgba(230,57,70,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 2 }}>
          
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#e63946", textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>Life at IINM</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 38px)", fontWeight: 900, color: "#fff" }}>Founders Gallery</h2>
            {isAdmin && (
              <button onClick={() => openEditor("gallery")} className="fd-cta-btn-primary" style={{ padding: "8px 18px", fontSize: 13, gap: 6, marginTop: 14 }}>
                {ICONS.Edit} Manage Gallery Photos
              </button>
            )}
          </div>

          {extended.gallery.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px", background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 16 }}>
              <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>No gallery images added yet. Add photos in editor.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
              {extended.gallery.map((it: any) => (
                <div key={it.id} style={{ position: "relative", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 20px rgba(0,0,0,0.2)", cursor: "pointer" }} className="group">
                  <div style={{ overflow: "hidden", height: 220 }}>
                    <img
                      src={getAssetUrl(it.image_url)}
                      alt={it.caption}
                      style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s ease-out" }}
                      onMouseEnter={e => e.currentTarget.style.transform = "scale(1.08)"}
                      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                    />
                  </div>
                  {it.caption && (
                    <div style={{ background: "rgba(10,22,40,0.95)", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "14px 18px" }}>
                      <p style={{ margin: 0, color: "#fff", fontSize: 13, fontWeight: 600 }}>{it.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
         TIMELINE ROADMAP — Light/white
         ══════════════════════════════════════════════════════ */}
      <section style={{ padding: "90px 24px", background: "#f8fafc", position: "relative" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#e63946", textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>Chronology of Innovation</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 38px)", fontWeight: 900, color: "#0a1628" }}>Our Journey Timeline</h2>
            {isAdmin && (
              <button onClick={() => openEditor("timeline")} className="fd-cta-btn-primary" style={{ padding: "8px 18px", fontSize: 13, gap: 6, marginTop: 14 }}>
                {ICONS.Edit} Manage Timeline Milestones
              </button>
            )}
          </div>

          {extended.timeline.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px", background: "#fff", border: "1px dashed rgba(10,22,40,0.12)", borderRadius: 16 }}>
              <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>No timeline events found. Manage timeline inline.</p>
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              {/* Central connecting line */}
              <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", width: 2, top: 20, bottom: 20, background: "linear-gradient(to bottom, #e63946 0%, #0a1628 100%)", opacity: 0.15 }} className="hidden md:block" />

              <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
                {extended.timeline.map((it: any, idx: number) => {
                  const isLeft = idx % 2 === 0;
                  const Icon = ICONS[it.icon_name] || ICONS["Target"];
                  
                  return (
                    <div key={it.id} style={{ display: "flex", width: "100%", justifyContent: isLeft ? "flex-start" : "flex-end", position: "relative" }}>
                      
                      {/* Central dot */}
                      <div
                        style={{
                          position: "absolute",
                          left: "50%",
                          top: "24px",
                          transform: "translateX(-50%)",
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          background: "#fff",
                          border: "3px solid #e63946",
                          boxShadow: "0 2px 8px rgba(230,57,70,0.2)",
                          zIndex: 5
                        }}
                        className="hidden md:block"
                      />

                      {/* Content Card */}
                      <div
                        style={{
                          width: "100%",
                          maxWidth: "460px",
                          background: "#fff",
                          border: "1px solid rgba(10,22,40,0.06)",
                          padding: "28px",
                          borderRadius: 16,
                          boxShadow: "0 4px 20px rgba(10,22,40,0.06)",
                          position: "relative"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                          <span style={{ fontSize: 18, fontWeight: 900, color: "#e63946", background: "rgba(230,57,70,0.08)", padding: "4px 14px", borderRadius: "10px" }}>{it.year}</span>
                          <span style={{ color: "#0a1628" }}>{Icon}</span>
                        </div>
                        <h4 style={{ fontSize: 17, fontWeight: 800, color: "#0a1628", marginBottom: 8 }}>{it.title}</h4>
                        <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, margin: 0 }}>{it.description}</p>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
         TEAMS/LEADERSHIP GRID SECTION — Dark navy
         ══════════════════════════════════════════════════════ */}
      <section style={{ padding: "90px 24px", position: "relative", background: "#0a1628", overflow: "hidden" }}>
        {/* Subtle radial glow */}
        <div style={{ position: "absolute", top: "10%", right: "10%", width: "40%", height: "40%", background: "radial-gradient(circle, rgba(230,57,70,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 2 }}>
          
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#e63946", textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>Expert Faculty</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 38px)", fontWeight: 900, color: "#fff" }}>Our Elite Team</h2>
            <p style={{ fontSize: 15, color: "#64748b", marginTop: 10 }}>World-class technical advisors, curriculum engineers, and research directors.</p>
          </div>

          {team.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px", background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 16 }}>
              <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>No team members are configured in CMS. Go to Admin &gt; Leadership to add faculty.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
              {team.map((m: any) => (
                <div key={m.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", transition: "transform 0.25s ease, border-color 0.25s ease", backdropFilter: "blur(8px)" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.borderColor = "rgba(230, 57, 70, 0.3)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)"; }}>
                  
                  {m.image_url && (
                    <div style={{ height: 260, width: "100%", overflow: "hidden" }}>
                      <img src={getAssetUrl(m.image_url)} alt={m.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  )}

                  <div style={{ padding: "22px", flex: 1, display: "flex", flexDirection: "column" }}>
                    <h4 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>{m.name}</h4>
                    <div style={{ fontSize: 12, color: "#e63946", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>{m.designation}</div>
                    {m.bio && <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>{m.bio}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <PublicFooter />

      {/* ══════════════════════════════════════════════════════
         INLINE EDITING MODAL WINDOWS FOR LOGGED IN ADMIN
         ══════════════════════════════════════════════════════ */}
      {editorModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,40,0.7)", backdropFilter: "blur(12px)", zIndex: 999999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ width: "100%", maxWidth: editorModal === "founders" ? 850 : 640, background: "#fff", borderRadius: 20, boxShadow: "0 25px 60px rgba(0,0,0,0.45)", display: "flex", flexDirection: "column", maxHeight: "90vh", overflow: "hidden" }}>
            
            {/* Modal header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid #e2e8f0" }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                {editorModal === "story" && "Edit General Settings & Narrative"}
                {editorModal === "founders" && "Manage Founders Story Profiles"}
                {editorModal === "gallery" && "Manage Moments Gallery"}
                {editorModal === "timeline" && "Manage Journey Milestones"}
              </h3>
              <button onClick={() => setEditorModal(null)} style={{ border: "none", background: "none", color: "#64748b", cursor: "pointer", display: "flex", padding: 4 }}>
                {ICONS.Close}
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
              {editorModal === "story" && (
                <div>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: "#e63946", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>Core Mission & Vision</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <FormInput label="Mission Statement" value={editSettings.mission_statement} onChange={(e: any) => setEditSettings((p: any) => ({ ...p, mission_statement: e.target.value }))} isTextArea rows={4} />
                    <FormInput label="Vision Statement" value={editSettings.vision_statement} onChange={(e: any) => setEditSettings((p: any) => ({ ...p, vision_statement: e.target.value }))} isTextArea rows={4} />
                  </div>

                  <h4 style={{ fontSize: 12, fontWeight: 700, color: "#e63946", textTransform: "uppercase", letterSpacing: 0.5, margin: "14px 0 14px" }}>Narrative Content</h4>
                  <FormInput label="Narrative Title" value={editSettings.story_title} onChange={(e: any) => setEditSettings((p: any) => ({ ...p, story_title: e.target.value }))} />
                  <FormInput label="Narrative Text" value={editSettings.story_text} onChange={(e: any) => setEditSettings((p: any) => ({ ...p, story_text: e.target.value }))} isTextArea rows={5} />

                  <h4 style={{ fontSize: 12, fontWeight: 700, color: "#e63946", textTransform: "uppercase", letterSpacing: 0.5, margin: "14px 0 14px" }}>Key Dynamic Stats</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                    <FormInput label="Years Excellence" value={editSettings.stats_years} onChange={(e: any) => setEditSettings((p: any) => ({ ...p, stats_years: e.target.value }))} />
                    <FormInput label="Students Certified" value={editSettings.stats_students} onChange={(e: any) => setEditSettings((p: any) => ({ ...p, stats_students: e.target.value }))} />
                    <FormInput label="Active Courses" value={editSettings.stats_courses} onChange={(e: any) => setEditSettings((p: any) => ({ ...p, stats_courses: e.target.value }))} />
                  </div>
                </div>
              )}

              {editorModal === "founders" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                  {/* Founder 1 */}
                  <div style={{ background: "#f8fafc", padding: 18, borderRadius: 16, border: "1px solid #e2e8f0" }}>
                    <h4 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 14 }}>Founder 1 Configuration</h4>
                    <FormInput label="Name" value={editExtended.founder1?.name} onChange={(e: any) => setEditExtended((p: any) => { const c = { ...p }; c.founder1.name = e.target.value; return c; })} />
                    <FormInput label="Designation" value={editExtended.founder1?.role} onChange={(e: any) => setEditExtended((p: any) => { const c = { ...p }; c.founder1.role = e.target.value; return c; })} />
                    <FormInput label="Short Bio" value={editExtended.founder1?.bio} onChange={(e: any) => setEditExtended((p: any) => { const c = { ...p }; c.founder1.bio = e.target.value; return c; })} isTextArea rows={3} />
                    <FormInput label="Quote" value={editExtended.founder1?.quote} onChange={(e: any) => setEditExtended((p: any) => { const c = { ...p }; c.founder1.quote = e.target.value; return c; })} />
                    <FormInput label="YouTube Video ID" value={editExtended.founder1?.video_url} onChange={(e: any) => setEditExtended((p: any) => { const c = { ...p }; c.founder1.video_url = e.target.value; return c; })} />
                    
                    <div style={{ marginTop: 10 }}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>Profile Picture</label>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        {editExtended.founder1?.image_url && (
                          <img src={getAssetUrl(editExtended.founder1.image_url)} alt="F1" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "1.5px solid #cbd5e1" }} />
                        )}
                        <input type="file" accept="image/*" style={{ fontSize: 11 }} onChange={(e: any) => {
                          const f = e.target.files?.[0];
                          if (f) handleImageUpload(["founder1", "image_url"], f);
                        }} />
                      </div>
                    </div>
                  </div>

                  {/* Founder 2 */}
                  <div style={{ background: "#f8fafc", padding: 18, borderRadius: 16, border: "1px solid #e2e8f0" }}>
                    <h4 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 14 }}>Founder 2 Configuration</h4>
                    <FormInput label="Name" value={editExtended.founder2?.name} onChange={(e: any) => setEditExtended((p: any) => { const c = { ...p }; c.founder2.name = e.target.value; return c; })} />
                    <FormInput label="Designation" value={editExtended.founder2?.role} onChange={(e: any) => setEditExtended((p: any) => { const c = { ...p }; c.founder2.role = e.target.value; return c; })} />
                    <FormInput label="Short Bio" value={editExtended.founder2?.bio} onChange={(e: any) => setEditExtended((p: any) => { const c = { ...p }; c.founder2.bio = e.target.value; return c; })} isTextArea rows={3} />
                    <FormInput label="Quote" value={editExtended.founder2?.quote} onChange={(e: any) => setEditExtended((p: any) => { const c = { ...p }; c.founder2.quote = e.target.value; return c; })} />
                    <FormInput label="YouTube Video ID" value={editExtended.founder2?.video_url} onChange={(e: any) => setEditExtended((p: any) => { const c = { ...p }; c.founder2.video_url = e.target.value; return c; })} />
                    
                    <div style={{ marginTop: 10 }}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>Profile Picture</label>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        {editExtended.founder2?.image_url && (
                          <img src={getAssetUrl(editExtended.founder2.image_url)} alt="F2" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "1.5px solid #cbd5e1" }} />
                        )}
                        <input type="file" accept="image/*" style={{ fontSize: 11 }} onChange={(e: any) => {
                          const f = e.target.files?.[0];
                          if (f) handleImageUpload(["founder2", "image_url"], f);
                        }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {editorModal === "gallery" && (
                <div>
                  <div style={{ background: "#f8fafc", padding: 18, borderRadius: 16, border: "1px solid #e2e8f0", marginBottom: 20 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>+ Add New Photo</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "flex-end" }}>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>Upload Image File</label>
                        <input type="file" accept="image/*" style={{ fontSize: 12 }} onChange={async (e: any) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          setUploading(true);
                          const fd = new FormData();
                          fd.append("file", f);
                          try {
                            const res = await apiFetch(`${API_BASE_URL}/about/upload-about-image`, { method: "POST", body: fd });
                            if (res.ok) {
                              const d = await res.json();
                              setEditExtended((p: any) => {
                                const c = { ...p };
                                c.gallery.push({ id: `g-${Date.now()}`, image_url: d.url, caption: "" });
                                return c;
                              });
                            }
                          } catch (ex) { console.error(ex); } finally { setUploading(false); }
                        }} />
                      </div>
                      <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>Choose any clear image file. Max 10MB.</p>
                    </div>
                  </div>

                  <h4 style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>Configure Captions & Items</h4>
                  {editExtended.gallery?.length === 0 ? (
                    <p style={{ fontSize: 13, color: "#64748b", textAlign: "center", margin: "20px 0" }}>No photos uploaded yet.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {editExtended.gallery?.map((it: any, index: number) => (
                        <div key={it.id} style={{ display: "flex", gap: 16, alignItems: "center", background: "#f8fafc", padding: 12, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                          <img src={getAssetUrl(it.image_url)} alt="Thumb" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} />
                          <div style={{ flex: 1 }}>
                            <FormInput label="Photo Caption" value={it.caption} onChange={(e: any) => setEditExtended((p: any) => {
                              const c = { ...p };
                              c.gallery[index].caption = e.target.value;
                              return c;
                            })} />
                          </div>
                          <button
                            onClick={() => setEditExtended((p: any) => {
                              const c = { ...p };
                              c.gallery.splice(index, 1);
                              return c;
                            })}
                            style={{ background: "#fee2e2", border: "none", color: "#ef4444", borderRadius: "8px", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                          >
                            {ICONS.Trash}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {editorModal === "timeline" && (
                <div>
                  <div style={{ background: "#f8fafc", padding: 18, borderRadius: 16, border: "1px solid #e2e8f0", marginBottom: 20 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>+ Add New Milestone</h4>
                    <button
                      type="button"
                      onClick={() => setEditExtended((p: any) => {
                        const c = { ...p };
                        c.timeline.push({ id: `t-${Date.now()}`, year: "2026", title: "New Event Title", description: "Milestone description goes here...", icon_name: "Target" });
                        return c;
                      })}
                      style={{ background: "#e63946", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                    >
                      {ICONS.Plus} Append Milestone Card
                    </button>
                  </div>

                  <h4 style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>Configure Milestones</h4>
                  {editExtended.timeline?.length === 0 ? (
                    <p style={{ fontSize: 13, color: "#64748b", textAlign: "center", margin: "20px 0" }}>No milestones defined yet.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                      {editExtended.timeline?.map((it: any, index: number) => (
                        <div key={it.id} style={{ background: "#f8fafc", padding: 18, borderRadius: 16, border: "1px solid #e2e8f0", position: "relative" }}>
                          <button
                            onClick={() => setEditExtended((p: any) => {
                              const c = { ...p };
                              c.timeline.splice(index, 1);
                              return c;
                            })}
                            style={{ position: "absolute", top: 12, right: 12, background: "#fee2e2", border: "none", color: "#ef4444", borderRadius: "8px", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                          >
                            {ICONS.Trash}
                          </button>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginRight: 40 }}>
                            <FormInput label="Year (e.g. 2026)" value={it.year} onChange={(e: any) => setEditExtended((p: any) => {
                              const c = { ...p };
                              c.timeline[index].year = e.target.value;
                              return c;
                            })} />
                            <FormInput
                              label="Milestone Icon"
                              value={it.icon_name}
                              onChange={(e: any) => setEditExtended((p: any) => {
                                const c = { ...p };
                                c.timeline[index].icon_name = e.target.value;
                                return c;
                              })}
                              selectOptions={[
                                { value: "Star", label: "Star 🌟" },
                                { value: "Lightbulb", label: "Lightbulb 💡" },
                                { value: "Target", label: "Target 🎯" },
                                { value: "Shield", label: "Shield 🛡️" },
                                { value: "Users", label: "Users 👥" },
                                { value: "Globe", label: "Globe 🌍" }
                              ]}
                            />
                          </div>

                          <FormInput label="Milestone Title" value={it.title} onChange={(e: any) => setEditExtended((p: any) => {
                            const c = { ...p };
                            c.timeline[index].title = e.target.value;
                            return c;
                          })} />
                          
                          <FormInput label="Milestone Description" value={it.description} onChange={(e: any) => setEditExtended((p: any) => {
                            const c = { ...p };
                            c.timeline[index].description = e.target.value;
                            return c;
                          })} isTextArea rows={2} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ background: "#f8fafc", padding: "16px 24px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => setEditorModal(null)} style={{ background: "transparent", color: "#64748b", border: "1px solid #cbd5e1", padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
              <button
                disabled={uploading}
                onClick={() => {
                  if (editorModal === "story") saveStory();
                  else saveExtended();
                }}
                style={{ background: "#e63946", color: "#fff", border: "none", padding: "10px 24px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: uploading ? "not-allowed" : "pointer", boxShadow: "0 4px 12px rgba(230,57,70,0.15)" }}
              >
                {uploading ? "Uploading..." : "Save Changes"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
