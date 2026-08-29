"use client";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import PublicNavbar from "@/components/PublicNavbar";
import PublicFooter from "@/components/PublicFooter";
import AboutInstitutionalLayout from "@/components/AboutInstitutionalLayout";
import { API_BASE_URL, BASE_URL, BACKEND_BASE_URL } from "@/lib/config";
import { apiFetch } from "@/lib/apiFetch";
import "../home.css";
import "../about-institutional.css";

// ── Type definitions ──
interface AboutSettingsData {
  mission_statement: string;
  vision_statement: string;
  story_title: string;
  story_text: string;
  stats_years: string;
  stats_students: string;
  stats_courses: string;
  director_name: string;
  director_title: string;
  director_message: string;
  director_image_url: string;
  hero_eyebrow: string;
  hero_title: string;
  hero_subtitle: string;
  hero_note: string;
  hero_image_1: string;
  hero_image_2: string;
  hero_image_3: string;
  hero_image_4: string;
  hero_image_5: string;
  hero_image_6: string;
  difference_eyebrow: string;
  difference_title: string;
  difference_video_url: string;
  difference_at_iinm_heading: string;
  difference_traditional_heading: string;
  difference_rows_json: string;
  alumni_eyebrow: string;
  alumni_title: string;
  alumni_description: string;
}

interface FounderData {
  name: string;
  role: string;
  bio: string;
  quote: string;
  image_url: string;
  video_url: string;
  linkedin_url: string;
  business_logo_url: string;
}

interface GalleryItem {
  id: string;
  image_url: string;
  caption: string;
}

interface TimelineItem {
  id: string;
  year: string;
  title: string;
  description: string;
  icon_name: string;
}

interface DifferenceRow {
  at_iinm: string;
  traditional: string;
}

interface AlumniLogoItem {
  id: string;
  image_url: string;
}

interface ExtendedData {
  founder1: FounderData;
  founder2: FounderData;
  gallery: GalleryItem[];
  timeline: TimelineItem[];
  alumni_logos: AlumniLogoItem[];
}

interface TeamMember {
  id: number;
  name: string;
  designation: string;
  image_url: string;
  bio: string;
}

interface CoreValue {
  id: number;
  title: string;
  description: string;
  icon_name: string;
}

interface SelectOption {
  value: string;
  label: string;
}

type InputChangeEvent = React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
type FileChangeEvent = React.ChangeEvent<HTMLInputElement>;

interface FormInputProps {
  label: string;
  value: string | undefined;
  onChange: (e: InputChangeEvent) => void;
  type?: string;
  isTextArea?: boolean;
  rows?: number;
  selectOptions?: SelectOption[] | null;
}

// Backend root URL (no /api suffix) for resolving relative upload paths.
const BACKEND_BASE = BACKEND_BASE_URL;

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
function FormInput({ label, value, onChange, type = "text", isTextArea = false, rows = 3, selectOptions = null }: FormInputProps) {
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
          {selectOptions.map((opt: SelectOption) => (
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

/* ══════════════════════════════════════════════════════
   SCROLL-REVEAL — lightweight IntersectionObserver hook
   ══════════════════════════════════════════════════════ */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

function Reveal({ children, delay = 0, direction = "up", className = "", style = {} }: {
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "left" | "right" | "scale";
  className?: string;
  style?: React.CSSProperties;
}) {
  const { ref, inView } = useInView();
  const hiddenTransform =
    direction === "left" ? "translateX(-44px)" :
    direction === "right" ? "translateX(44px)" :
    direction === "scale" ? "scale(0.92)" :
    "translateY(34px)";

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "none" : hiddenTransform,
        transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   ANIMATED COUNTER — counts up numeric stats when in view
   ══════════════════════════════════════════════════════ */
function AnimatedCounter({ value, duration = 1400 }: { value: string; duration?: number }) {
  const { ref, inView } = useInView(0.4);
  const [display, setDisplay] = useState<string>(value.replace(/[0-9,]/g, (c) => (c === "," ? "," : "0")));

  useEffect(() => {
    if (!inView) return;
    const match = value.match(/^([\d,]+)(.*)$/);
    if (!match) return;
    const target = parseInt(match[1].replace(/,/g, ""), 10);
    const suffix = match[2] || "";
    if (isNaN(target)) return;

    let start: number | null = null;
    let raf = 0;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(eased * target);
      setDisplay(current.toLocaleString() + suffix);
      if (progress < 1) raf = requestAnimationFrame(step);
      else setDisplay(target.toLocaleString() + suffix);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);

  return <span ref={ref}>{display}</span>;
}

export default function AboutIinmPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // States for fetched data
  const [settings, setSettings] = useState<AboutSettingsData>({
    mission_statement: "", vision_statement: "", story_title: "", story_text: "",
    stats_years: "", stats_students: "", stats_courses: "",
    director_name: "", director_title: "", director_message: "", director_image_url: "",
    hero_eyebrow: "", hero_title: "", hero_subtitle: "", hero_note: "",
    hero_image_1: "", hero_image_2: "", hero_image_3: "", hero_image_4: "", hero_image_5: "", hero_image_6: "",
    difference_eyebrow: "", difference_title: "", difference_video_url: "",
    difference_at_iinm_heading: "", difference_traditional_heading: "", difference_rows_json: "",
    alumni_eyebrow: "", alumni_title: "", alumni_description: ""
  });
  const [extended, setExtended] = useState<ExtendedData>({
    founder1: { name: "", role: "", bio: "", quote: "", image_url: "", video_url: "", linkedin_url: "", business_logo_url: "" },
    founder2: { name: "", role: "", bio: "", quote: "", image_url: "", video_url: "", linkedin_url: "", business_logo_url: "" },
    gallery: [],
    timeline: [],
    alumni_logos: []
  });
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [values, setValues] = useState<CoreValue[]>([]);
  const [loading, setLoading] = useState(true);

  // Active play state for founder YouTube videos
  const [videoPlay, setVideoPlay] = useState<Record<string, boolean>>({});

  // Active editor modals
  const [editorModal, setEditorModal] = useState<"story" | "founders" | "gallery" | "timeline" | "hero" | "who" | "purpose" | "alumni" | null>(null);
  
  // Temporal editor form states
  const [editSettings, setEditSettings] = useState<Record<string, string>>({});
  const [editDifferenceRows, setEditDifferenceRows] = useState<DifferenceRow[]>([]);
  const [editExtended, setEditExtended] = useState<ExtendedData>({
    founder1: { name: "", role: "", bio: "", quote: "", image_url: "", video_url: "", linkedin_url: "", business_logo_url: "" },
    founder2: { name: "", role: "", bio: "", quote: "", image_url: "", video_url: "", linkedin_url: "", business_logo_url: "" },
    gallery: [],
    timeline: [],
    alumni_logos: []
  });
  const [uploading, setUploading] = useState(false);
  const [alumniUploadKey, setAlumniUploadKey] = useState(0);

  // Lightbox preview for gallery images
  const [lightbox, setLightbox] = useState<string | null>(null);
  // Back-to-top floating button visibility
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Page title from site settings
  useEffect(() => {
    const cached = typeof window !== "undefined" ? localStorage.getItem("iinm_site_settings") : null;
    if (cached) {
      const d = JSON.parse(cached);
      document.title = `About Us | ${d.site_name || "IINM"}`;
    }
    fetch(`${BASE_URL}/api/settings/site`)
      .then((r) => r.json())
      .then((d) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("iinm_site_settings", JSON.stringify(d));
        }
        document.title = `About Us | ${d.site_name || "IINM"}`;
      })
      .catch(() => {});
  }, []);

  // Fetch all page data
  const loadPageData = async () => {
    try {
      setLoading(true);
      const [sRes, eRes, tRes, vRes] = await Promise.all([
        apiFetch(`${API_BASE_URL}/about/settings`),
        apiFetch(`${API_BASE_URL}/about/extended`),
        apiFetch(`${API_BASE_URL}/leadership/public`),
        apiFetch(`${API_BASE_URL}/about/core-values`)
      ]);

      if (sRes.ok) setSettings(await sRes.json() as AboutSettingsData);
      if (eRes.ok) {
        const d = await eRes.json() as Partial<ExtendedData>;
        setExtended({
          founder1: d?.founder1 || { name: "", role: "", bio: "", quote: "", image_url: "", video_url: "", linkedin_url: "", business_logo_url: "" },
          founder2: d?.founder2 || { name: "", role: "", bio: "", quote: "", image_url: "", video_url: "", linkedin_url: "", business_logo_url: "" },
          gallery: d?.gallery || [],
          timeline: d?.timeline || [],
          alumni_logos: d?.alumni_logos || []
        });
      }
      if (tRes.ok) setTeam(await tRes.json() as TeamMember[]);
      if (vRes.ok) setValues(await vRes.json() as CoreValue[]);
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
      setShowBackToTop(window.scrollY > 480);
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

  // 3D tilt effect for team cards (mouse-driven, no library)
  const handleCardTilt = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rotateX = ((e.clientY - rect.top - cy) / cy) * -6;
    const rotateY = ((e.clientX - rect.left - cx) / cx) * 6;
    card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
    card.style.borderColor = "rgba(230, 57, 70, 0.3)";
  };
  const resetCardTilt = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = "none";
    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
  };

  // Open inline modal forms
  const openEditor = (type: "story" | "founders" | "gallery" | "timeline" | "hero" | "who" | "purpose" | "alumni") => {
    if (type === "story" || type === "hero" || type === "purpose") {
      setEditSettings({ ...settings });
      if (type === "purpose") {
        try {
          const rows = JSON.parse(settings.difference_rows_json || "[]") as DifferenceRow[];
          setEditDifferenceRows(Array.isArray(rows) ? rows : []);
        } catch {
          setEditDifferenceRows([]);
        }
      }
    } else if (type === "who" || type === "alumni") {
      setEditSettings({ ...settings });
      setEditExtended(JSON.parse(JSON.stringify(extended)) as ExtendedData);
    } else {
      setEditExtended(JSON.parse(JSON.stringify(extended)) as ExtendedData);
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
        setSettings(editSettings as unknown as AboutSettingsData);
        setEditorModal(null);
      }
    } catch (e) {
      console.error("Save story error", e);
    } finally {
      setUploading(false);
    }
  };

  // Save THE DIFFERENCE section settings and comparison rows
  const savePurpose = async () => {
    setUploading(true);
    const updatedSettings = {
      ...editSettings,
      difference_rows_json: JSON.stringify(editDifferenceRows),
    };
    try {
      const res = await apiFetch(`${API_BASE_URL}/about/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSettings)
      });
      if (res.ok) {
        setSettings(updatedSettings as unknown as AboutSettingsData);
        setEditorModal(null);
      }
    } catch (e) {
      console.error("Save difference section error", e);
    } finally {
      setUploading(false);
    }
  };

  // Save Extended Config (Founders, Gallery, or Timeline)
  const saveExtended = async (updatedData: ExtendedData = editExtended) => {
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

  // Save Alumni Section (settings + extended logos)
  const saveAlumni = async () => {
    setUploading(true);
    try {
      const [settingsRes, extendedRes] = await Promise.all([
        apiFetch(`${API_BASE_URL}/about/settings`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editSettings)
        }),
        apiFetch(`${API_BASE_URL}/about/extended`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editExtended)
        })
      ]);
      if (settingsRes.ok && extendedRes.ok) {
        setSettings(editSettings as unknown as AboutSettingsData);
        setExtended(JSON.parse(JSON.stringify(editExtended)) as ExtendedData);
        setEditorModal(null);
      }
    } catch (e) {
      console.error("Save alumni error", e);
    } finally {
      setUploading(false);
    }
  };

  // Save Who We Are (both settings + extended gallery)
  const saveWho = async () => {
    setUploading(true);
    try {
      const [settingsRes, extendedRes] = await Promise.all([
        apiFetch(`${API_BASE_URL}/about/settings`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editSettings)
        }),
        apiFetch(`${API_BASE_URL}/about/extended`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editExtended)
        })
      ]);
      if (settingsRes.ok && extendedRes.ok) {
        setSettings(editSettings as unknown as AboutSettingsData);
        setExtended(JSON.parse(JSON.stringify(editExtended)) as ExtendedData);
        setEditorModal(null);
      }
    } catch (e) {
      console.error("Save who error", e);
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
        const d = await res.json() as { url: string };
        const updated = JSON.parse(JSON.stringify(editExtended)) as ExtendedData;
        
        // Deep nested update
        if (fieldPath.length === 1) {
          (updated as unknown as Record<string, string>)[fieldPath[0]] = d.url;
        } else if (fieldPath.length === 2) {
          ((updated as unknown as Record<string, Record<string, string>>)[fieldPath[0]])[fieldPath[1]] = d.url;
        } else if (fieldPath.length === 3) {
          ((updated as unknown as Record<string, Record<string, Record<string, string>>>)[fieldPath[0]])[fieldPath[1]][fieldPath[2]] = d.url;
        }
        setEditExtended(updated);
      }
    } catch (e) {
      console.error("Upload error", e);
    } finally {
      setUploading(false);
    }
  };

  // Upload a hero collage image
  const handleHeroImageUpload = async (slot: number, file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await apiFetch(`${API_BASE_URL}/about/upload-about-image`, {
        method: "POST",
        body: fd
      });
      if (res.ok) {
        const d = await res.json() as { url: string };
        setEditSettings((previous) => ({ ...previous, [`hero_image_${slot}`]: d.url }));
      }
    } catch (e) {
      console.error("Hero upload error", e);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="about-skeleton">
        {/* Nav bar skeleton */}
        <div className="about-skeleton-bar" />

        {/* Hero skeleton */}
        <div className="about-skeleton-hero">
          <div className="about-skeleton-hero-text">
            <div className="about-skeleton-line w-sm h-sm" />
            <div className="about-skeleton-line h-xl w-lg" />
            <div className="about-skeleton-line h-xl w-md" />
            <div className="about-skeleton-line w-full" />
            <div className="about-skeleton-line w-md" />
            {/* Stats skeleton */}
            <div className="about-skeleton-stats">
              <div className="about-skeleton-stat">
                <div className="about-skeleton-line h-lg w-sm" style={{ margin: "0 auto 8px" }} />
                <div className="about-skeleton-line h-sm w-sm" style={{ margin: "0 auto" }} />
              </div>
              <div className="about-skeleton-stat">
                <div className="about-skeleton-line h-lg w-sm" style={{ margin: "0 auto 8px" }} />
                <div className="about-skeleton-line h-sm w-sm" style={{ margin: "0 auto" }} />
              </div>
              <div className="about-skeleton-stat">
                <div className="about-skeleton-line h-lg w-sm" style={{ margin: "0 auto 8px" }} />
                <div className="about-skeleton-line h-sm w-sm" style={{ margin: "0 auto" }} />
              </div>
            </div>
          </div>
          <div>
            <div className="about-skeleton-img hero" />
            <div className="about-skeleton-float-badge">
              <div className="about-skeleton-img sm" />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div className="about-skeleton-line w-sm" />
                <div className="about-skeleton-line h-sm w-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Mission & Vision skeleton */}
        <div className="about-skeleton-section" style={{ background: "#0a1628" }}>
          <div style={{ textAlign: "center", marginBottom: 50 }}>
            <div className="about-skeleton-line w-sm h-sm" style={{ margin: "0 auto 10px" }} />
            <div className="about-skeleton-line h-xl w-md" style={{ margin: "0 auto" }} />
          </div>
          <div className="about-skeleton-grid-2">
            <div className="about-skeleton-card-dark">
              <div className="about-skeleton-img sm" />
              <div className="about-skeleton-line h-lg w-sm" />
              <div className="about-skeleton-line w-full" />
              <div className="about-skeleton-line w-full" />
              <div className="about-skeleton-line w-md" />
            </div>
            <div className="about-skeleton-card-dark">
              <div className="about-skeleton-img sm" />
              <div className="about-skeleton-line h-lg w-sm" />
              <div className="about-skeleton-line w-full" />
              <div className="about-skeleton-line w-full" />
              <div className="about-skeleton-line w-md" />
            </div>
          </div>
        </div>

        {/* Founders skeleton */}
        <div className="about-skeleton-section">
          <div style={{ textAlign: "center", marginBottom: 50 }}>
            <div className="about-skeleton-line w-sm h-sm" style={{ margin: "0 auto 10px" }} />
            <div className="about-skeleton-line h-xl w-md" style={{ margin: "0 auto" }} />
          </div>
          <div className="about-skeleton-grid-2">
            <div className="about-skeleton-card">
              <div className="about-skeleton-img md" />
              <div className="about-skeleton-line h-lg w-sm" />
              <div className="about-skeleton-line h-lg w-md" />
              <div className="about-skeleton-line w-full" />
              <div className="about-skeleton-line w-full" />
              <div className="about-skeleton-line w-md" />
            </div>
            <div className="about-skeleton-card">
              <div className="about-skeleton-img md" />
              <div className="about-skeleton-line h-lg w-sm" />
              <div className="about-skeleton-line h-lg w-md" />
              <div className="about-skeleton-line w-full" />
              <div className="about-skeleton-line w-full" />
              <div className="about-skeleton-line w-md" />
            </div>
          </div>
        </div>

        {/* Gallery skeleton */}
        <div className="about-skeleton-section" style={{ background: "#0a1628" }}>
          <div style={{ textAlign: "center", marginBottom: 50 }}>
            <div className="about-skeleton-line w-sm h-sm" style={{ margin: "0 auto 10px" }} />
            <div className="about-skeleton-line h-xl w-md" style={{ margin: "0 auto" }} />
          </div>
          <div className="about-skeleton-grid-3">
            <div className="about-skeleton-img md" />
            <div className="about-skeleton-img md" />
            <div className="about-skeleton-img md" />
          </div>
        </div>

        {/* Timeline skeleton */}
        <div className="about-skeleton-section">
          <div style={{ textAlign: "center", marginBottom: 50 }}>
            <div className="about-skeleton-line w-sm h-sm" style={{ margin: "0 auto 10px" }} />
            <div className="about-skeleton-line h-xl w-md" style={{ margin: "0 auto" }} />
          </div>
          <div className="about-skeleton-grid-3">
            <div className="about-skeleton-card">
              <div className="about-skeleton-line h-xl w-sm" />
              <div className="about-skeleton-line h-lg w-md" />
              <div className="about-skeleton-line w-full" />
              <div className="about-skeleton-line w-md" />
            </div>
            <div className="about-skeleton-card">
              <div className="about-skeleton-line h-xl w-sm" />
              <div className="about-skeleton-line h-lg w-md" />
              <div className="about-skeleton-line w-full" />
              <div className="about-skeleton-line w-md" />
            </div>
            <div className="about-skeleton-card">
              <div className="about-skeleton-line h-xl w-sm" />
              <div className="about-skeleton-line h-lg w-md" />
              <div className="about-skeleton-line w-full" />
              <div className="about-skeleton-line w-md" />
            </div>
          </div>
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

      <AboutInstitutionalLayout
        settings={settings}
        extended={extended}
        values={values}
        team={team}
        isAdmin={isAdmin}
        videoPlay={videoPlay}
        getAssetUrl={getAssetUrl}
        onEdit={openEditor}
        onPlayFounder={(key) => setVideoPlay((previous) => ({ ...previous, [key]: true }))}
      />

      <div className="about-legacy-layout">
      {/* ══════════════════════════════════════════════════════
         ABOUT US HERO — Light, clean, image on right
         ══════════════════════════════════════════════════════ */}
      <section style={{ position: "relative", padding: "100px 32px 90px", overflow: "hidden", background: "radial-gradient(circle at 30% 30%, #ffffff 0%, #f3f7ff 50%, #ebf1ff 100%)" }}>
        {/* Dot grid backdrop */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.35, backgroundImage: "radial-gradient(rgba(10,22,40,0.05) 1px, transparent 1px)", backgroundSize: "24px 24px", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 56, alignItems: "center", position: "relative", zIndex: 2 }}>
          {/* Left: Text content */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Badge */}
            <Reveal delay={0}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(230, 57, 70, 0.08)", border: "1px solid rgba(230, 57, 70, 0.2)", borderRadius: 30, padding: "7px 18px", alignSelf: "flex-start" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#e63946", animation: "tickerFade 1.5s infinite" }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: "#e63946", letterSpacing: 1.5, textTransform: "uppercase" }}>About IINM</span>
              </div>
            </Reveal>

            {/* Heading */}
            <Reveal delay={80}>
              <h1 style={{ fontSize: "clamp(34px, 5vw, 52px)", fontWeight: 900, letterSpacing: "-1.5px", lineHeight: 1.15, color: "#0a1628", margin: 0 }}>
                Connecting the Dots of<br />
                <span className="about-gradient-text">Artificial Intelligence</span>
              </h1>
            </Reveal>

            {/* Description */}
            <Reveal delay={160}>
              <p style={{ fontSize: "clamp(15px, 2vw, 17px)", color: "#475569", lineHeight: 1.7, maxWidth: 520, margin: 0, fontWeight: 500 }}>
                IINM is dedicated to building highly-skilled global leaders ready for the cognitive computing landscape. Discover our narrative, meet the pioneers, and explore our roadmap.
              </p>
            </Reveal>

            {/* Stats row */}
            <Reveal delay={240}>
              <div style={{ display: "flex", gap: 0, maxWidth: 440, background: "#fff", border: "1px solid rgba(10,22,40,0.06)", borderRadius: 16, padding: "22px 12px", boxShadow: "0 4px 20px rgba(10,22,40,0.05)" }}>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 900, color: "#e63946" }}><AnimatedCounter value={settings.stats_years || ""} /></div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.6, marginTop: 2 }}>Years</div>
                </div>
                <div style={{ flex: 1, textAlign: "center", borderLeft: "1px solid rgba(10,22,40,0.06)", borderRight: "1px solid rgba(10,22,40,0.06)" }}>
                  <div style={{ fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 900, color: "#0a1628" }}><AnimatedCounter value={settings.stats_students || ""} /></div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.6, marginTop: 2 }}>Students</div>
                </div>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 900, color: "#e63946" }}><AnimatedCounter value={settings.stats_courses || ""} /></div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.6, marginTop: 2 }}>Courses</div>
                </div>
              </div>
            </Reveal>

            {/* CTA buttons */}
            <Reveal delay={320}>
              <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                <a href="#story" style={{ background: "linear-gradient(135deg, #e63946 0%, #c1202f 100%)", color: "#fff", border: "none", borderRadius: 8, padding: "12px 28px", fontSize: 14, fontWeight: 700, textDecoration: "none", boxShadow: "0 4px 14px rgba(230,57,70,0.2)", transition: "transform 0.2s ease, box-shadow 0.2s ease", display: "inline-block" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 20px rgba(230,57,70,0.3)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(230,57,70,0.2)"; }}
                >Our Story</a>
                <a href="#team" style={{ background: "#fff", color: "#0a1628", border: "1px solid #cbd5e1", borderRadius: 8, padding: "12px 28px", fontSize: 14, fontWeight: 700, textDecoration: "none", boxShadow: "0 2px 4px rgba(0,0,0,0.02)", transition: "transform 0.2s ease, box-shadow 0.2s ease", display: "inline-block" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(10,22,40,0.1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.02)"; }}
                >Meet the Team</a>
              </div>
            </Reveal>
          </div>

          {/* Right: Single image */}
          <div style={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "center" }}>
            {/* Decorative glow behind image */}
            <div style={{ position: "absolute", top: "-30px", right: "-30px", width: 180, height: 180, background: "radial-gradient(circle, rgba(230,57,70,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: "-40px", left: "-40px", width: 200, height: 200, background: "radial-gradient(circle, rgba(10,22,40,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

            <Reveal delay={200} direction="scale" style={{ width: "100%", maxWidth: 480, position: "relative" }}>
              <div style={{ position: "relative", width: "100%", borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 50px -12px rgba(10,22,40,0.2)", border: "1px solid rgba(10,22,40,0.06)" }}>
                {settings.director_image_url ? (
                  <Image
                    src={getAssetUrl(settings.director_image_url)}
                    alt="About IINM"
                    width={480}
                    height={360}
                    unoptimized
                    priority
                    style={{ width: "100%", height: "auto", display: "block", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ width: "100%", height: 360, background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "#94a3b8", fontSize: 14, fontWeight: 600 }}>No image set</span>
                  </div>
                )}
                {/* Subtle gradient overlay at bottom */}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40%", background: "linear-gradient(to top, rgba(10,22,40,0.15) 0%, transparent 100%)", pointerEvents: "none" }} />
              </div>

              {/* Floating trust badge */}
              <div className="about-float-badge" style={{ position: "absolute", bottom: -22, left: -22, background: "#fff", border: "1px solid rgba(10,22,40,0.08)", borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 12px 30px rgba(10,22,40,0.15)" }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(230,57,70,0.1)", color: "#e63946", display: "flex", alignItems: "center", justifyContent: "center" }}>{ICONS.Star}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: "#0a1628", lineHeight: 1.1 }}>{settings.stats_students || ""}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#64748b" }}>Trusted Learners</div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        {/* Scroll cue */}
        <a href="#story" style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: "#94a3b8", textDecoration: "none", zIndex: 2 }}>
          <span className="about-scroll-cue" style={{ display: "flex" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </span>
        </a>

        {/* Responsive */}
        <style>{`
          @media (max-width: 900px) {
            section:has(> div[style*="grid-template-columns: 1.1fr 0.9fr"]) > div {
              grid-template-columns: 1fr !important;
              gap: 32px !important;
            }
          }
          @media (max-width: 576px) {
            section[style*="padding: 100px 32px 90px"] {
              padding: 60px 20px !important;
            }
          }
        `}</style>
      </section>

      {/* ══════════════════════════════════════════════════════
         MISSION & STORY SECTION — Dark navy
         ══════════════════════════════════════════════════════ */}
      <section id="story" style={{ padding: "90px 32px", position: "relative", background: "#0a1628", overflow: "hidden" }}>
        {/* Subtle radial glow */}
        <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: "60%", height: "60%", background: "radial-gradient(circle, rgba(230,57,70,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

        {isAdmin && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 36, position: "relative", zIndex: 2 }}>
            <button onClick={() => openEditor("story")} className="about-admin-edit-btn">
              {ICONS.Edit} Edit General Settings & Narrative
            </button>
          </div>
        )}

        <div style={{ maxWidth: 1400, margin: "0 auto", position: "relative", zIndex: 2 }}>
          {/* Section heading */}
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 50 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#e63946", textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>Who We Are</div>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 38px)", fontWeight: 900, color: "#fff" }}>Our Mission & Vision</h2>
            </div>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 28 }}>
            {/* Mission Box */}
            <Reveal direction="left">
              <div className="about-lift-card" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", padding: "40px 32px", borderRadius: 20, backdropFilter: "blur(12px)", height: "100%" }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(230,57,70,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#e63946", marginBottom: 22 }}>
                  {ICONS.Target}
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 14 }}>Our Mission</h3>
                <p style={{ fontSize: 15, color: "#94a3b8", lineHeight: 1.75, margin: 0 }}>
                  {settings.mission_statement || ""}
                </p>
              </div>
            </Reveal>

            {/* Vision Box */}
            <Reveal direction="right">
              <div className="about-lift-card" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", padding: "40px 32px", borderRadius: 20, backdropFilter: "blur(12px)", height: "100%" }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", marginBottom: 22 }}>
                  {ICONS.Globe}
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 14 }}>Our Vision</h3>
                <p style={{ fontSize: 15, color: "#94a3b8", lineHeight: 1.75, margin: 0 }}>
                  {settings.vision_statement || ""}
                </p>
              </div>
            </Reveal>
          </div>

          {/* Narrative Split */}
          {(settings.story_title || settings.story_text) && (
            <Reveal>
              <div style={{ maxWidth: 860, margin: "70px auto 0", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 56 }}>
                <h2 style={{ fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 850, color: "#fff", marginBottom: 18 }}>{settings.story_title}</h2>
                <p style={{ fontSize: 16, color: "#94a3b8", lineHeight: 1.85, whiteSpace: "pre-wrap", maxWidth: 800, margin: "0 auto" }}>
                  {settings.story_text}
                </p>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
         FOUNDERS' STORY SECTION — Light/white
         ══════════════════════════════════════════════════════ */}
      <section style={{ padding: "90px 32px", background: "#f8fafc", position: "relative" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#e63946", textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>Pioneers of IINM</div>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 38px)", fontWeight: 900, color: "#0a1628" }}>Founders&apos; Story</h2>
              {isAdmin && (
                <button onClick={() => openEditor("founders")} className="about-admin-edit-btn" style={{ marginTop: 14 }}>
                  {ICONS.Edit} Edit Founders&apos; Profiles & Videos
                </button>
              )}
            </div>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 36 }}>
            
            {/* Founder 1 */}
            <Reveal direction="left">
            <div className="about-lift-card" style={{ display: "flex", flexDirection: "column", gap: 24, background: "#fff", border: "1px solid rgba(10,22,40,0.06)", borderRadius: 20, padding: "32px", boxShadow: "0 4px 24px rgba(10,22,40,0.05)", height: "100%", boxSizing: "border-box" }}>
              
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
                      {extended?.founder1?.image_url ? (
                        <Image src={getAssetUrl(extended?.founder1?.image_url)} alt={extended?.founder1?.name} width={400} height={225} unoptimized style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "#e2e8f0" }} />
                      )}
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
                    &ldquo;{extended?.founder1?.quote}&rdquo;
                  </div>
                )}
              </div>
            </div>
            </Reveal>

            {/* Founder 2 */}
            <Reveal direction="right">
            <div className="about-lift-card" style={{ display: "flex", flexDirection: "column", gap: 24, background: "#fff", border: "1px solid rgba(10,22,40,0.06)", borderRadius: 20, padding: "32px", boxShadow: "0 4px 24px rgba(10,22,40,0.05)", height: "100%", boxSizing: "border-box" }}>
              
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
                      {extended?.founder2?.image_url ? (
                        <Image src={getAssetUrl(extended?.founder2?.image_url)} alt={extended?.founder2?.name} width={400} height={225} unoptimized style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "#e2e8f0" }} />
                      )}
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
                    &ldquo;{extended?.founder2?.quote}&rdquo;
                  </div>
                )}
              </div>
            </div>
            </Reveal>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
         FOUNDERS GALLERY SECTION — Dark navy
         ══════════════════════════════════════════════════════ */}
      <section style={{ padding: "90px 32px", position: "relative", background: "#0a1628", overflow: "hidden" }}>
        {/* Subtle radial glow */}
        <div style={{ position: "absolute", bottom: "10%", left: "50%", transform: "translateX(-50%)", width: "50%", height: "50%", background: "radial-gradient(circle, rgba(230,57,70,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1400, margin: "0 auto", position: "relative", zIndex: 2 }}>
          
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#e63946", textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>Life at IINM</div>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 38px)", fontWeight: 900, color: "#fff" }}>Founders Gallery</h2>
              {isAdmin && (
                <button onClick={() => openEditor("gallery")} className="about-admin-edit-btn" style={{ marginTop: 14 }}>
                  {ICONS.Edit} Manage Gallery Photos
                </button>
              )}
            </div>
          </Reveal>

          {extended.gallery.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px", background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 16 }}>
              <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>No gallery images added yet. Add photos in editor.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
              {extended.gallery.map((it: GalleryItem, gIdx: number) => (
                <Reveal key={it.id} delay={gIdx * 70} direction="scale">
                  <div
                    className="about-gallery-item about-lift-card"
                    style={{ position: "relative", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}
                    onClick={() => setLightbox(getAssetUrl(it.image_url))}
                  >
                    <div style={{ overflow: "hidden", height: 220 }}>
                      <Image
                        src={getAssetUrl(it.image_url)}
                        alt={it.caption}
                        width={400}
                        height={220}
                        unoptimized
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
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
         TIMELINE ROADMAP — Light/white
         ══════════════════════════════════════════════════════ */}
      <section style={{ padding: "90px 32px", background: "#f8fafc", position: "relative" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 60 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#e63946", textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>Chronology of Innovation</div>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 38px)", fontWeight: 900, color: "#0a1628" }}>Our Journey Timeline</h2>
              {isAdmin && (
                <button onClick={() => openEditor("timeline")} className="about-admin-edit-btn" style={{ marginTop: 14 }}>
                  {ICONS.Edit} Manage Timeline Milestones
                </button>
              )}
            </div>
          </Reveal>

          {extended.timeline.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px", background: "#fff", border: "1px dashed rgba(10,22,40,0.12)", borderRadius: 16 }}>
              <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>No timeline events found. Manage timeline inline.</p>
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              {/* Central connecting line */}
              <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", width: 2, top: 20, bottom: 20, background: "linear-gradient(to bottom, #e63946 0%, #0a1628 100%)", opacity: 0.15 }} className="hidden md:block" />

              <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
                {extended.timeline.map((it: TimelineItem, idx: number) => {
                  const isLeft = idx % 2 === 0;
                  const Icon = ICONS[it.icon_name] || ICONS["Target"];
                  
                  return (
                    <div key={it.id} style={{ display: "flex", width: "100%", justifyContent: isLeft ? "flex-start" : "flex-end", position: "relative" }}>
                      
                      {/* Central dot */}
                      <div
                        className="hidden md:block about-timeline-dot-active"
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
                          zIndex: 5
                        }}
                      />

                      {/* Content Card */}
                      <Reveal direction={isLeft ? "left" : "right"} style={{ width: "100%", maxWidth: "460px" }}>
                        <div
                          className="about-lift-card"
                          style={{
                            width: "100%",
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
                      </Reveal>

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
      <section id="team" style={{ padding: "90px 32px", position: "relative", background: "#0a1628", overflow: "hidden" }}>
        {/* Subtle radial glow */}
        <div style={{ position: "absolute", top: "10%", right: "10%", width: "40%", height: "40%", background: "radial-gradient(circle, rgba(230,57,70,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1400, margin: "0 auto", position: "relative", zIndex: 2 }}>
          
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#e63946", textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>Expert Faculty</div>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 38px)", fontWeight: 900, color: "#fff" }}>Our Elite Team</h2>
              <p style={{ fontSize: 15, color: "#64748b", marginTop: 10 }}>World-class technical advisors, curriculum engineers, and research directors.</p>
            </div>
          </Reveal>

          {team.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px", background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 16 }}>
              <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>No team members are configured in CMS. Go to Admin &gt; Leadership to add faculty.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
              {team.map((m: TeamMember, mIdx: number) => (
                <Reveal key={m.id} delay={mIdx * 80} direction="scale">
                  <div
                    className="about-tilt-card"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", backdropFilter: "blur(8px)" }}
                    onMouseMove={handleCardTilt}
                    onMouseLeave={resetCardTilt}
                  >

                    {m.image_url ? (
                      <div style={{ height: 260, width: "100%", overflow: "hidden" }}>
                        <Image src={getAssetUrl(m.image_url)} alt={m.name} width={300} height={260} unoptimized style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    ) : (
                      <div style={{ height: 260, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, rgba(230,57,70,0.15) 0%, rgba(10,22,40,0.4) 100%)" }}>
                        <span style={{ fontSize: 40, fontWeight: 900, color: "#e63946" }}>
                          {(m.name || "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}
                        </span>
                      </div>
                    )}

                    <div style={{ padding: "22px", flex: 1, display: "flex", flexDirection: "column" }}>
                      <h4 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>{m.name}</h4>
                      <div style={{ fontSize: 12, color: "#e63946", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>{m.designation}</div>
                      {m.bio && <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>{m.bio}</p>}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      </div>

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
                {editorModal === "hero" && "Edit Meet the Academy Section"}
                {editorModal === "who" && "Edit Who We Are"}
                {editorModal === "purpose" && "Edit Why We Exist"}
                {editorModal === "founders" && "Manage Founders Story Profiles"}
                {editorModal === "gallery" && "Manage Moments Gallery"}
                {editorModal === "timeline" && "Manage Journey Milestones"}
                {editorModal === "alumni" && "Edit Alumni Logos & Content"}
              </h3>
              <button onClick={() => setEditorModal(null)} style={{ border: "none", background: "none", color: "#64748b", cursor: "pointer", display: "flex", padding: 4 }}>
                {ICONS.Close}
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
              {editorModal === "hero" && (
                <div>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: "#e63946", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>Meet the Academy Content</h4>
                  <FormInput label="Eyebrow Text" value={editSettings.hero_eyebrow} onChange={(e) => setEditSettings((p) => ({ ...p, hero_eyebrow: e.target.value }))} />
                  <FormInput label="Hero Title" value={editSettings.hero_title} onChange={(e) => setEditSettings((p) => ({ ...p, hero_title: e.target.value }))} />
                  <FormInput label="Subtitle / Description" value={editSettings.hero_subtitle} onChange={(e) => setEditSettings((p) => ({ ...p, hero_subtitle: e.target.value }))} isTextArea rows={3} />
                  <FormInput label="Hero Note" value={editSettings.hero_note} onChange={(e) => setEditSettings((p) => ({ ...p, hero_note: e.target.value }))} />

                  <h4 style={{ fontSize: 12, fontWeight: 700, color: "#e63946", textTransform: "uppercase", letterSpacing: 0.5, margin: "20px 0 14px" }}>Hero Collage Images</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    {Array.from({ length: 6 }, (_, idx) => {
                      const slot = idx + 1;
                      const field = `hero_image_${slot}`;
                      return (
                        <div key={field} style={{ background: "#f8fafc", padding: 12, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 8 }}>Image Slot {slot}</label>
                          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            {editSettings[field] && (
                              <Image src={getAssetUrl(editSettings[field])} alt={`Slot ${slot}`} width={40} height={40} unoptimized style={{ borderRadius: 8, objectFit: "cover" }} />
                            )}
                            <input type="file" accept="image/*" style={{ fontSize: 11 }} onChange={(e: FileChangeEvent) => { const f = e.target.files?.[0]; if (f) handleHeroImageUpload(slot, f); }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {editorModal === "who" && (
                <div>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: "#e63946", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>Who We Are Content</h4>
                  <FormInput label="Section Title" value={editSettings.story_title} onChange={(e) => setEditSettings((p) => ({ ...p, story_title: e.target.value }))} />
                  <FormInput label="Section Description" value={editSettings.story_text} onChange={(e) => setEditSettings((p) => ({ ...p, story_text: e.target.value }))} isTextArea rows={5} />

                  <h4 style={{ fontSize: 12, fontWeight: 700, color: "#e63946", textTransform: "uppercase", letterSpacing: 0.5, margin: "20px 0 14px" }}>Gallery Images (First 3 shown)</h4>

                  <div style={{ background: "#f8fafc", padding: 18, borderRadius: 16, border: "1px solid #e2e8f0", marginBottom: 16 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>+ Upload New Image</h4>
                    <div style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>Choose Image File</label>
                        <input type="file" accept="image/*" style={{ fontSize: 12 }} onChange={async (e: FileChangeEvent) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          setUploading(true);
                          const fd = new FormData();
                          fd.append("file", f);
                          try {
                            const res = await apiFetch(`${API_BASE_URL}/about/upload-about-image`, { method: "POST", body: fd });
                            if (res.ok) {
                              const d = await res.json() as { url: string };
                              setEditExtended((p) => {
                                const c = JSON.parse(JSON.stringify(p)) as ExtendedData;
                                c.gallery.push({ id: `g-${Date.now()}`, image_url: d.url, caption: "" });
                                return c;
                              });
                            }
                          } catch (ex) { console.error(ex); } finally { setUploading(false); }
                        }} />
                      </div>
                      <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>Uploads to R2 bucket. Max 10MB.</p>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {editExtended.gallery?.slice(0, 3).map((it: GalleryItem, index: number) => (
                      <div key={it.id} style={{ display: "flex", gap: 12, alignItems: "center", background: "#f8fafc", padding: 12, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                        <Image src={getAssetUrl(it.image_url)} alt="Thumb" width={48} height={48} unoptimized style={{ borderRadius: 8, objectFit: "cover" }} />
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                          <FormInput label="Caption" value={it.caption} onChange={(e) => setEditExtended((p) => {
                            const c = JSON.parse(JSON.stringify(p)) as ExtendedData;
                            c.gallery[index].caption = e.target.value;
                            return c;
                          })} />
                          <div>
                            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Replace Image</label>
                            <input type="file" accept="image/*" style={{ fontSize: 11 }} onChange={async (e: FileChangeEvent) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              setUploading(true);
                              const fd = new FormData();
                              fd.append("file", f);
                              try {
                                const res = await apiFetch(`${API_BASE_URL}/about/upload-about-image`, { method: "POST", body: fd });
                                if (res.ok) {
                                  const d = await res.json() as { url: string };
                                  setEditExtended((p) => {
                                    const c = JSON.parse(JSON.stringify(p)) as ExtendedData;
                                    c.gallery[index].image_url = d.url;
                                    return c;
                                  });
                                }
                              } catch (ex) { console.error(ex); } finally { setUploading(false); }
                            }} />
                          </div>
                        </div>
                        <button
                          onClick={() => setEditExtended((p) => {
                            const c = JSON.parse(JSON.stringify(p)) as ExtendedData;
                            c.gallery.splice(index, 1);
                            return c;
                          })}
                          style={{ background: "#fee2e2", border: "none", color: "#ef4444", borderRadius: "8px", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
                        >
                          {ICONS.Trash}
                        </button>
                      </div>
                    ))}
                    {editExtended.gallery?.length === 0 && (
                      <p style={{ fontSize: 13, color: "#64748b", textAlign: "center", margin: "12px 0" }}>No gallery images yet. Upload one above.</p>
                    )}
                  </div>
                </div>
              )}

              {editorModal === "purpose" && (
                <div>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: "#e63946", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>The Difference Content</h4>
                  <FormInput label="Eyebrow" value={editSettings.difference_eyebrow} onChange={(e) => setEditSettings((p) => ({ ...p, difference_eyebrow: e.target.value }))} />
                  <FormInput label="Section Title" value={editSettings.difference_title} onChange={(e) => setEditSettings((p) => ({ ...p, difference_title: e.target.value }))} isTextArea rows={2} />
                  <FormInput label="Video Embed URL" value={editSettings.difference_video_url} onChange={(e) => setEditSettings((p) => ({ ...p, difference_video_url: e.target.value }))} />
                  <p style={{ color: "#64748b", fontSize: 11, margin: "-4px 0 18px" }}>Use a YouTube embed URL, for example: https://www.youtube.com/embed/VIDEO_ID</p>

                  <h4 style={{ fontSize: 12, fontWeight: 700, color: "#e63946", textTransform: "uppercase", letterSpacing: 0.5, margin: "20px 0 14px" }}>Comparison Table</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <FormInput label="Left Column Heading" value={editSettings.difference_at_iinm_heading} onChange={(e) => setEditSettings((p) => ({ ...p, difference_at_iinm_heading: e.target.value }))} />
                    <FormInput label="Right Column Heading" value={editSettings.difference_traditional_heading} onChange={(e) => setEditSettings((p) => ({ ...p, difference_traditional_heading: e.target.value }))} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>
                    {editDifferenceRows.map((row, index) => (
                      <div key={`difference-row-${index}`} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, alignItems: "end", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}>
                        <FormInput label={`IINM Point ${index + 1}`} value={row.at_iinm} onChange={(e) => setEditDifferenceRows((p) => p.map((item, itemIndex) => itemIndex === index ? { ...item, at_iinm: e.target.value } : item))} />
                        <FormInput label={`Traditional Point ${index + 1}`} value={row.traditional} onChange={(e) => setEditDifferenceRows((p) => p.map((item, itemIndex) => itemIndex === index ? { ...item, traditional: e.target.value } : item))} />
                        <button type="button" aria-label={`Remove comparison row ${index + 1}`} onClick={() => setEditDifferenceRows((p) => p.filter((_, itemIndex) => itemIndex !== index))} style={{ background: "#fee2e2", border: "none", color: "#ef4444", borderRadius: 8, width: 38, height: 38, cursor: "pointer" }}>{ICONS.Trash}</button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => setEditDifferenceRows((p) => [...p, { at_iinm: "", traditional: "" }])} style={{ background: "#0a1628", color: "#fff", border: "none", borderRadius: 8, padding: "10px 14px", marginTop: 14, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>{ICONS.Plus} Add Comparison Row</button>
                </div>
              )}

              {editorModal === "story" && (
                <div>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: "#e63946", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>Core Mission & Vision</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <FormInput label="Mission Statement" value={editSettings.mission_statement} onChange={(e) => setEditSettings((p) => ({ ...p, mission_statement: e.target.value }))} isTextArea rows={4} />
                    <FormInput label="Vision Statement" value={editSettings.vision_statement} onChange={(e) => setEditSettings((p) => ({ ...p, vision_statement: e.target.value }))} isTextArea rows={4} />
                  </div>

                  <h4 style={{ fontSize: 12, fontWeight: 700, color: "#e63946", textTransform: "uppercase", letterSpacing: 0.5, margin: "14px 0 14px" }}>Narrative Content</h4>
                  <FormInput label="Narrative Title" value={editSettings.story_title} onChange={(e) => setEditSettings((p) => ({ ...p, story_title: e.target.value }))} />
                  <FormInput label="Narrative Text" value={editSettings.story_text} onChange={(e) => setEditSettings((p) => ({ ...p, story_text: e.target.value }))} isTextArea rows={5} />

                  <h4 style={{ fontSize: 12, fontWeight: 700, color: "#e63946", textTransform: "uppercase", letterSpacing: 0.5, margin: "14px 0 14px" }}>Key Dynamic Stats</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                    <FormInput label="Years Excellence" value={editSettings.stats_years} onChange={(e) => setEditSettings((p) => ({ ...p, stats_years: e.target.value }))} />
                    <FormInput label="Students Certified" value={editSettings.stats_students} onChange={(e) => setEditSettings((p) => ({ ...p, stats_students: e.target.value }))} />
                    <FormInput label="Active Courses" value={editSettings.stats_courses} onChange={(e) => setEditSettings((p) => ({ ...p, stats_courses: e.target.value }))} />
                  </div>

                  <h4 style={{ fontSize: 12, fontWeight: 700, color: "#e63946", textTransform: "uppercase", letterSpacing: 0.5, margin: "20px 0 14px" }}>Director / Spotlight Section</h4>
                  <FormInput label="Director Name" value={editSettings.director_name} onChange={(e) => setEditSettings((p) => ({ ...p, director_name: e.target.value }))} />
                  <FormInput label="Director Title" value={editSettings.director_title} onChange={(e) => setEditSettings((p) => ({ ...p, director_title: e.target.value }))} />
                  <FormInput label="Director Message" value={editSettings.director_message} onChange={(e) => setEditSettings((p) => ({ ...p, director_message: e.target.value }))} isTextArea rows={3} />
                  <div style={{ marginTop: 10 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>Director Image</label>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      {editSettings.director_image_url && (
                        <Image src={getAssetUrl(editSettings.director_image_url)} alt="Director" width={44} height={44} unoptimized style={{ borderRadius: 8, objectFit: "cover", border: "1.5px solid #cbd5e1" }} />
                      )}
                      <input type="file" accept="image/*" style={{ fontSize: 11 }} onChange={async (e: FileChangeEvent) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        setUploading(true);
                        const fd = new FormData();
                        fd.append("file", f);
                        try {
                          const res = await apiFetch(`${API_BASE_URL}/about/upload-about-image`, { method: "POST", body: fd });
                          if (res.ok) {
                            const d = await res.json() as { url: string };
                            setEditSettings((p) => ({ ...p, director_image_url: d.url }));
                          }
                        } catch (ex) { console.error(ex); } finally { setUploading(false); }
                      }} />
                    </div>
                  </div>
                </div>
              )}

              {editorModal === "founders" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                  {/* Founder 1 */}
                  <div style={{ background: "#f8fafc", padding: 18, borderRadius: 16, border: "1px solid #e2e8f0" }}>
                    <h4 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 14 }}>Founder 1 Configuration</h4>
                    <FormInput label="Name" value={editExtended.founder1?.name} onChange={(e) => setEditExtended((p) => { const c = { ...p }; c.founder1.name = e.target.value; return c; })} />
                    <FormInput label="Designation" value={editExtended.founder1?.role} onChange={(e) => setEditExtended((p) => { const c = { ...p }; c.founder1.role = e.target.value; return c; })} />
                    <FormInput label="Short Bio" value={editExtended.founder1?.bio} onChange={(e) => setEditExtended((p) => { const c = { ...p }; c.founder1.bio = e.target.value; return c; })} isTextArea rows={3} />
                    <FormInput label="Quote" value={editExtended.founder1?.quote} onChange={(e) => setEditExtended((p) => { const c = { ...p }; c.founder1.quote = e.target.value; return c; })} />
                    <FormInput label="YouTube Video ID" value={editExtended.founder1?.video_url} onChange={(e) => setEditExtended((p) => { const c = { ...p }; c.founder1.video_url = e.target.value; return c; })} />
                    <FormInput label="LinkedIn Profile URL" value={editExtended.founder1?.linkedin_url} onChange={(e) => setEditExtended((p) => { const c = { ...p }; c.founder1.linkedin_url = e.target.value; return c; })} />

                    <div style={{ marginTop: 10 }}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>Profile Picture</label>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        {editExtended.founder1?.image_url && (
                          <Image src={getAssetUrl(editExtended.founder1.image_url)} alt="F1" width={44} height={44} unoptimized style={{ borderRadius: "50%", objectFit: "cover", border: "1.5px solid #cbd5e1" }} />
                        )}
                        <input type="file" accept="image/*" style={{ fontSize: 11 }} onChange={(e: FileChangeEvent) => {
                          const f = e.target.files?.[0];
                          if (f) handleImageUpload(["founder1", "image_url"], f);
                        }} />
                      </div>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>Startup / Business Logo</label>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        {editExtended.founder1?.business_logo_url && (
                          <Image src={getAssetUrl(editExtended.founder1.business_logo_url)} alt="F1 logo" width={44} height={44} unoptimized style={{ borderRadius: 8, objectFit: "contain", border: "1.5px solid #cbd5e1" }} />
                        )}
                        <input type="file" accept="image/*" style={{ fontSize: 11 }} onChange={(e: FileChangeEvent) => {
                          const f = e.target.files?.[0];
                          if (f) handleImageUpload(["founder1", "business_logo_url"], f);
                        }} />
                      </div>
                    </div>
                  </div>

                  {/* Founder 2 */}
                  <div style={{ background: "#f8fafc", padding: 18, borderRadius: 16, border: "1px solid #e2e8f0" }}>
                    <h4 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 14 }}>Founder 2 Configuration</h4>
                    <FormInput label="Name" value={editExtended.founder2?.name} onChange={(e) => setEditExtended((p) => { const c = { ...p }; c.founder2.name = e.target.value; return c; })} />
                    <FormInput label="Designation" value={editExtended.founder2?.role} onChange={(e) => setEditExtended((p) => { const c = { ...p }; c.founder2.role = e.target.value; return c; })} />
                    <FormInput label="Short Bio" value={editExtended.founder2?.bio} onChange={(e) => setEditExtended((p) => { const c = { ...p }; c.founder2.bio = e.target.value; return c; })} isTextArea rows={3} />
                    <FormInput label="Quote" value={editExtended.founder2?.quote} onChange={(e) => setEditExtended((p) => { const c = { ...p }; c.founder2.quote = e.target.value; return c; })} />
                    <FormInput label="YouTube Video ID" value={editExtended.founder2?.video_url} onChange={(e) => setEditExtended((p) => { const c = { ...p }; c.founder2.video_url = e.target.value; return c; })} />
                    <FormInput label="LinkedIn Profile URL" value={editExtended.founder2?.linkedin_url} onChange={(e) => setEditExtended((p) => { const c = { ...p }; c.founder2.linkedin_url = e.target.value; return c; })} />

                    <div style={{ marginTop: 10 }}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>Profile Picture</label>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        {editExtended.founder2?.image_url && (
                          <Image src={getAssetUrl(editExtended.founder2.image_url)} alt="F2" width={44} height={44} unoptimized style={{ borderRadius: "50%", objectFit: "cover", border: "1.5px solid #cbd5e1" }} />
                        )}
                        <input type="file" accept="image/*" style={{ fontSize: 11 }} onChange={(e: FileChangeEvent) => {
                          const f = e.target.files?.[0];
                          if (f) handleImageUpload(["founder2", "image_url"], f);
                        }} />
                      </div>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>Startup / Business Logo</label>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        {editExtended.founder2?.business_logo_url && (
                          <Image src={getAssetUrl(editExtended.founder2.business_logo_url)} alt="F2 logo" width={44} height={44} unoptimized style={{ borderRadius: 8, objectFit: "contain", border: "1.5px solid #cbd5e1" }} />
                        )}
                        <input type="file" accept="image/*" style={{ fontSize: 11 }} onChange={(e: FileChangeEvent) => {
                          const f = e.target.files?.[0];
                          if (f) handleImageUpload(["founder2", "business_logo_url"], f);
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
                        <input type="file" accept="image/*" style={{ fontSize: 12 }} onChange={async (e: FileChangeEvent) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          setUploading(true);
                          const fd = new FormData();
                          fd.append("file", f);
                          try {
                            const res = await apiFetch(`${API_BASE_URL}/about/upload-about-image`, { method: "POST", body: fd });
                            if (res.ok) {
                              const d = await res.json() as { url: string };
                              setEditExtended((p) => {
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
                      {editExtended.gallery?.map((it: GalleryItem, index: number) => (
                        <div key={it.id} style={{ display: "flex", gap: 16, alignItems: "center", background: "#f8fafc", padding: 12, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                          <Image src={getAssetUrl(it.image_url)} alt="Thumb" width={48} height={48} unoptimized style={{ borderRadius: 8, objectFit: "cover" }} />
                          <div style={{ flex: 1 }}>
                            <FormInput label="Photo Caption" value={it.caption} onChange={(e) => setEditExtended((p) => {
                              const c = { ...p };
                              c.gallery[index].caption = e.target.value;
                              return c;
                            })} />
                          </div>
                          <button
                            onClick={() => setEditExtended((p) => {
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
                      onClick={() => setEditExtended((p) => {
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
                      {editExtended.timeline?.map((it: TimelineItem, index: number) => (
                        <div key={it.id} style={{ background: "#f8fafc", padding: 18, borderRadius: 16, border: "1px solid #e2e8f0", position: "relative" }}>
                          <button
                            onClick={() => setEditExtended((p) => {
                              const c = { ...p };
                              c.timeline.splice(index, 1);
                              return c;
                            })}
                            style={{ position: "absolute", top: 12, right: 12, background: "#fee2e2", border: "none", color: "#ef4444", borderRadius: "8px", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                          >
                            {ICONS.Trash}
                          </button>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginRight: 40 }}>
                            <FormInput label="Year (e.g. 2026)" value={it.year} onChange={(e) => setEditExtended((p) => {
                              const c = { ...p };
                              c.timeline[index].year = e.target.value;
                              return c;
                            })} />
                            <FormInput
                              label="Milestone Icon"
                              value={it.icon_name}
                              onChange={(e) => setEditExtended((p) => {
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

                          <FormInput label="Milestone Title" value={it.title} onChange={(e) => setEditExtended((p) => {
                            const c = { ...p };
                            c.timeline[index].title = e.target.value;
                            return c;
                          })} />
                          
                          <FormInput label="Milestone Description" value={it.description} onChange={(e) => setEditExtended((p) => {
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

              {editorModal === "alumni" && (
                <div>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: "#e63946", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>Section Content</h4>
                  <FormInput label="Eyebrow Text" value={editSettings.alumni_eyebrow} onChange={(e) => setEditSettings((p) => ({ ...p, alumni_eyebrow: e.target.value }))} />
                  <FormInput label="Section Title" value={editSettings.alumni_title} onChange={(e) => setEditSettings((p) => ({ ...p, alumni_title: e.target.value }))} />
                  <FormInput label="Description" value={editSettings.alumni_description} onChange={(e) => setEditSettings((p) => ({ ...p, alumni_description: e.target.value }))} isTextArea rows={3} />

                  <h4 style={{ fontSize: 12, fontWeight: 700, color: "#e63946", textTransform: "uppercase", letterSpacing: 0.5, margin: "20px 0 14px" }}>+ Upload Logo</h4>
                  <div style={{ background: "#f8fafc", padding: 18, borderRadius: 16, border: "1px solid #e2e8f0", marginBottom: 20 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "flex-end" }}>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>Upload Logo Image</label>
                        <input key={alumniUploadKey} type="file" accept="image/*" style={{ fontSize: 12 }} onChange={async (e: FileChangeEvent) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          setUploading(true);
                          const fd = new FormData();
                          fd.append("file", f);
                          try {
                            const res = await apiFetch(`${API_BASE_URL}/about/upload-about-image`, { method: "POST", body: fd });
                            if (res.ok) {
                              const d = await res.json() as { url: string };
                              setEditExtended((p) => ({
                                ...p,
                                alumni_logos: [...p.alumni_logos, { id: `al-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, image_url: d.url }]
                              }));
                            } else {
                              const text = await res.text().catch(() => 'Upload failed');
                              console.error('Alumni logo upload failed:', res.status, text);
                            }
                          } catch (ex) { console.error(ex); } finally { setUploading(false); setAlumniUploadKey((k) => k + 1); }
                        }} />
                      </div>
                      <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>Upload company/startup logos. Max 10MB.</p>
                    </div>
                  </div>

                  <h4 style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>Configure Logos</h4>
                  {editExtended.alumni_logos?.length === 0 ? (
                    <p style={{ fontSize: 13, color: "#64748b", textAlign: "center", margin: "20px 0" }}>No logos uploaded yet.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {editExtended.alumni_logos?.map((it: AlumniLogoItem, index: number) => (
                        <div key={it.id} style={{ display: "flex", gap: 16, alignItems: "center", background: "#f8fafc", padding: 12, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                          <Image src={getAssetUrl(it.image_url)} alt="Logo" width={48} height={48} unoptimized style={{ borderRadius: 8, objectFit: "contain" }} />
                          <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>{it.image_url.split("/").pop()}</p>
                          <button
                            onClick={() => setEditExtended((p) => {
                              const c = { ...p };
                              c.alumni_logos.splice(index, 1);
                              return c;
                            })}
                            style={{ marginLeft: "auto", background: "#fee2e2", border: "none", color: "#ef4444", borderRadius: "8px", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                          >
                            {ICONS.Trash}
                          </button>
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
                  if (editorModal === "story" || editorModal === "hero") saveStory();
                  else if (editorModal === "purpose") savePurpose();
                  else if (editorModal === "who") saveWho();
                  else if (editorModal === "alumni") saveAlumni();
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

      {/* ══════════════════════════════════════════════════════
         GALLERY LIGHTBOX PREVIEW
         ══════════════════════════════════════════════════════ */}
      {lightbox && (
        <div className="about-lightbox-overlay" onClick={() => setLightbox(null)}>
          <button className="about-lightbox-close" onClick={() => setLightbox(null)} aria-label="Close preview">
            {ICONS.Close}
          </button>
          <Image
            src={lightbox}
            alt="Gallery preview"
            width={1200}
            height={800}
            unoptimized
            style={{ maxWidth: "90vw", maxHeight: "85vh", objectFit: "contain", borderRadius: 12, boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
         BACK TO TOP
         ══════════════════════════════════════════════════════ */}
      {showBackToTop && (
        <button
          className="about-back-to-top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
        </button>
      )}

    </div>
  );
}
