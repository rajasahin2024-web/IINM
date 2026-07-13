"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { apiFetch } from "@/lib/apiFetch";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/* ───────── Admin helper (same pattern used across the codebase) ───────── */
function isAdminLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  const loggedIn = localStorage.getItem("iinm_is_logged_in") === "true";
  const expiry = localStorage.getItem("iinm_login_expiry");
  return loggedIn && expiry !== null && Date.now() < Number(expiry);
}

/* ───────── Types ───────── */
type MilestoneData = {
  id: number;
  tag: string;
  title: string;
  description: string;
  accent_color: string;
  scene_type: string;
  order_position: number;
  is_active: boolean;
};

type SectionData = {
  badge: string;
  heading: string;
  subheading: string;
};

/* ----------------------------- Illustration Scenes ----------------------------- */

// Feature 1: 24/7 AI Doubt Clearing Portal
function SceneDoubtPortal() {
  return (
    <svg className="journey-svg" viewBox="0 0 420 420" fill="none">
      <rect x="40" y="40" width="340" height="340" rx="26" fill="#020716" stroke="rgba(0,240,255,0.15)" strokeWidth="1.5" />
      <line x1="40" y1="84" x2="380" y2="84" stroke="rgba(0,240,255,0.15)" />
      <circle cx="66" cy="62" r="4.5" fill="#ef4444" />
      <circle cx="82" cy="62" r="4.5" fill="#f59e0b" />
      <circle cx="98" cy="62" r="4.5" fill="#10b981" />
      <text x="120" y="66" fill="rgba(255,255,255,0.4)" fontSize="10" fontFamily="monospace">ai_doubt_portal.live</text>
      {/* AI core */}
      <circle cx="210" cy="200" r="42" fill="url(#dpCore)" />
      <circle cx="210" cy="200" r="62" stroke="rgba(0,240,255,0.2)" strokeWidth="1" strokeDasharray="5 6" className="jr-spin" />
      {/* Student bubble */}
      <g className="jr-float-a">
        <rect x="66" y="110" width="200" height="44" rx="12" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.06)" />
        <text x="80" y="137" fill="rgba(255,255,255,0.85)" fontSize="11" fontWeight="600">How to fine-tune an LLM?</text>
      </g>
      {/* AI bubble */}
      <g className="jr-float-b">
        <rect x="156" y="270" width="200" height="50" rx="12" fill="rgba(0,240,255,0.05)" stroke="rgba(0,240,255,0.18)" />
        <text x="170" y="292" fill="#00f0ff" fontSize="11" fontWeight="600">Sure! Start with LoRA...</text>
        <text x="170" y="308" fill="rgba(255,255,255,0.6)" fontSize="9.5">peft.get_peft_model(base)</text>
      </g>
      {/* Typing dots */}
      <g transform="translate(110,238)">
        <circle cx="0" cy="0" r="3" fill="#00f0ff" className="jr-dot-1" />
        <circle cx="11" cy="0" r="3" fill="#00f0ff" className="jr-dot-2" />
        <circle cx="22" cy="0" r="3" fill="#00f0ff" className="jr-dot-3" />
      </g>
      <defs>
        <radialGradient id="dpCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="35%" stopColor="rgba(0,240,255,0.6)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>
    </svg>
  );
}

// Feature 2: Learn Latest AI Tools & Skills
function SceneAITools() {
  return (
    <svg className="journey-svg" viewBox="0 0 420 420" fill="none">
      <rect x="40" y="40" width="340" height="340" rx="26" fill="#01040f" stroke="rgba(244,114,182,0.15)" strokeWidth="1.5" />
      {/* center core */}
      <circle cx="210" cy="210" r="52" fill="url(#tCore)" />
      <polygon points="210,176 240,228 180,228" stroke="rgba(244,114,182,0.6)" strokeWidth="2" className="jr-spin" />
      {/* connection lines */}
      <g stroke="rgba(255,255,255,0.1)" strokeWidth="1.2" strokeDasharray="3 4">
        <line x1="210" y1="210" x2="110" y2="120" />
        <line x1="210" y1="210" x2="310" y2="120" />
        <line x1="210" y1="210" x2="110" y2="300" />
        <line x1="210" y1="210" x2="310" y2="300" />
      </g>
      {/* ChatGPT */}
      <g className="jr-float-a">
        <circle cx="110" cy="120" r="26" fill="rgba(16,185,129,0.12)" stroke="rgba(16,185,129,0.35)" />
        <path d="M110,107 L114,117 L124,121 L114,125 L110,135 L106,125 L96,121 L106,117 Z" fill="#10b981" />
        <text x="110" y="160" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="8">ChatGPT</text>
      </g>
      {/* Claude */}
      <g className="jr-float-b">
        <circle cx="310" cy="120" r="26" fill="rgba(217,119,6,0.12)" stroke="rgba(217,119,6,0.35)" />
        <path d="M300,131 L310,108 L320,131" stroke="#d97706" strokeWidth="2.5" />
        <text x="310" y="160" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="8">Claude</text>
      </g>
      {/* Gemini */}
      <g className="jr-float-a">
        <circle cx="110" cy="300" r="26" fill="rgba(59,130,246,0.12)" stroke="rgba(59,130,246,0.35)" />
        <path d="M110,287 C112,296 116,300 124,302 C116,304 112,308 110,317 C108,308 104,304 96,302 C104,300 108,296 110,287 Z" fill="#3b82f6" />
        <text x="110" y="336" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="8">Gemini</text>
      </g>
      {/* Cursor */}
      <g className="jr-float-b">
        <circle cx="310" cy="300" r="26" fill="rgba(147,51,234,0.12)" stroke="rgba(147,51,234,0.35)" />
        <path d="M303,290 L320,300 L312,304 L317,314 L312,317 L307,307 Z" fill="#a855f7" />
        <text x="310" y="336" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="8">Cursor</text>
      </g>
      <defs>
        <radialGradient id="tCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,100,200,0.4)" />
          <stop offset="100%" stopColor="rgba(1,4,15,0)" />
        </radialGradient>
      </defs>
    </svg>
  );
}

// Feature 3: Live Practical Classes
function SceneLiveClasses() {
  return (
    <svg className="journey-svg" viewBox="0 0 420 420" fill="none">
      <rect x="40" y="40" width="340" height="340" rx="26" fill="#030818" stroke="rgba(16,185,129,0.15)" strokeWidth="1.5" />
      {/* editor */}
      <rect x="70" y="86" width="280" height="190" rx="12" fill="#01040a" stroke="rgba(16,185,129,0.2)" />
      <line x1="70" y1="112" x2="350" y2="112" stroke="rgba(255,255,255,0.08)" />
      <circle cx="88" cy="99" r="3.5" fill="#ff5f56" />
      <circle cx="100" cy="99" r="3.5" fill="#ffbd2e" />
      <circle cx="112" cy="99" r="3.5" fill="#27c93f" />
      {/* live badge */}
      <rect x="290" y="93" width="48" height="13" rx="4" fill="rgba(230,57,70,0.15)" stroke="rgba(230,57,70,0.3)" />
      <circle cx="299" cy="99.5" r="2.6" fill="#e63946" className="jr-pulse" />
      <text x="306" y="103" fill="#e63946" fontSize="7" fontWeight="bold">LIVE</text>
      {/* code lines */}
      <rect x="86" y="128" width="110" height="7" rx="3.5" fill="#3b82f6" />
      <rect x="86" y="142" width="200" height="7" rx="3.5" fill="#a855f7" />
      <rect x="104" y="156" width="150" height="7" rx="3.5" fill="#10b981" />
      <rect x="104" y="170" width="120" height="7" rx="3.5" fill="#f59e0b" />
      <rect x="120" y="184" width="180" height="7" rx="3.5" fill="#00f0ff" className="jr-pulse" />
      <rect x="86" y="208" width="140" height="7" rx="3.5" fill="#3b82f6" />
      {/* webcam */}
      <rect x="250" y="200" width="86" height="62" rx="8" fill="rgba(255,255,255,0.05)" stroke="rgba(16,185,129,0.3)" />
      <circle cx="293" cy="226" r="13" fill="#10b981" opacity="0.45" />
      <path d="M276,250 C276,238 285,236 293,236 C301,236 310,238 310,250" fill="#10b981" opacity="0.45" />
      {/* students joining */}
      <g className="jr-float-a">
        <circle cx="110" cy="318" r="14" fill="rgba(0,240,255,0.12)" stroke="rgba(0,240,255,0.3)" />
        <circle cx="110" cy="313" r="4.5" fill="#00f0ff" opacity="0.6" />
        <path d="M101,326 C101,319 105,317 110,317 C115,317 119,319 119,326" fill="#00f0ff" opacity="0.6" />
      </g>
      <g className="jr-float-b">
        <circle cx="150" cy="330" r="14" fill="rgba(96,165,250,0.12)" stroke="rgba(96,165,250,0.3)" />
        <circle cx="150" cy="325" r="4.5" fill="#60a5fa" opacity="0.6" />
        <path d="M141,338 C141,331 145,329 150,329 C155,329 159,331 159,338" fill="#60a5fa" opacity="0.6" />
      </g>
      <g className="jr-float-a">
        <circle cx="190" cy="320" r="14" fill="rgba(168,85,247,0.12)" stroke="rgba(168,85,247,0.3)" />
        <circle cx="190" cy="315" r="4.5" fill="#a855f7" opacity="0.6" />
        <path d="M181,328 C181,321 185,319 190,319 C195,319 199,321 199,328" fill="#a855f7" opacity="0.6" />
      </g>
      {/* soundwaves */}
      <g transform="translate(250,310)">
        <line x1="0" y1="10" x2="0" y2="22" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" className="jr-wave-1" />
        <line x1="10" y1="2" x2="10" y2="30" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" className="jr-wave-2" />
        <line x1="20" y1="8" x2="20" y2="24" stroke="#00f0ff" strokeWidth="2.5" strokeLinecap="round" className="jr-wave-3" />
        <line x1="30" y1="0" x2="30" y2="32" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" className="jr-wave-1" />
      </g>
    </svg>
  );
}

// Feature 4: Verified Certification
function SceneCertification() {
  return (
    <svg className="journey-svg" viewBox="0 0 420 420" fill="none">
      <rect x="40" y="40" width="340" height="340" rx="26" fill="#01030e" stroke="rgba(167,139,250,0.15)" strokeWidth="1.5" />
      {/* certificate */}
      <rect x="100" y="84" width="220" height="252" rx="14" fill="rgba(255,255,255,0.02)" stroke="rgba(167,139,250,0.22)" strokeWidth="2" />
      <path d="M114,108 L132,108 L114,126 Z" fill="rgba(167,139,250,0.3)" />
      <path d="M306,108 L288,108 L306,126 Z" fill="rgba(167,139,250,0.3)" />
      <text x="210" y="128" textAnchor="middle" fill="#a78bfa" fontSize="12" fontWeight="bold" letterSpacing="1">IINM CERTIFIED</text>
      <line x1="140" y1="146" x2="280" y2="146" stroke="rgba(167,139,250,0.2)" />
      <text x="210" y="178" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="bold">Your Name</text>
      <line x1="160" y1="190" x2="260" y2="190" stroke="#a78bfa" strokeWidth="1.5" />
      <text x="210" y="212" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9">Advanced AI Engineering Track</text>
      {/* verification badge */}
      <g transform="translate(210,272)">
        <circle cx="0" cy="0" r="26" fill="url(#cBadge)" className="jr-pulse" />
        <polygon points="0,-18 5,-4 19,-4 8,5 12,19 0,11 -12,19 -8,5 -19,-4 -5,-4" fill="#a78bfa" opacity="0.85" />
        <path d="M-7,0 L-2,6 L8,-6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
      {/* scan laser */}
      <line x1="70" y1="160" x2="350" y2="160" stroke="#a78bfa" strokeWidth="2.2" className="jr-laser" />
      <defs>
        <radialGradient id="cBadge" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>
    </svg>
  );
}

// Feature 5: Lifetime Course Updates
function SceneLifetime() {
  return (
    <svg className="journey-svg" viewBox="0 0 420 420" fill="none">
      <rect x="40" y="40" width="340" height="340" rx="26" fill="#01040a" stroke="rgba(251,191,36,0.15)" strokeWidth="1.5" />
      {/* infinity loop */}
      <path d="M110,210 C110,110 310,110 310,210 C310,310 110,310 110,210 Z" stroke="rgba(251,191,36,0.15)" strokeWidth="4" />
      <path d="M110,210 C110,110 310,110 310,210 C310,310 110,310 110,210 Z" stroke="url(#lGrad)" strokeWidth="3" strokeDasharray="28 180" className="jr-dash" />
      {/* nodes */}
      <g>
        <circle cx="140" cy="140" r="9" fill="#01040a" stroke="#fbbf24" strokeWidth="2.4" />
        <rect x="152" y="128" width="50" height="24" rx="4" fill="rgba(251,191,36,0.08)" stroke="rgba(251,191,36,0.2)" />
        <text x="160" y="144" fill="#fbbf24" fontSize="9" fontWeight="bold">v1.0</text>
      </g>
      <g>
        <circle cx="290" cy="170" r="9" fill="#01040a" stroke="#fbbf24" strokeWidth="2.4" />
        <rect x="226" y="158" width="56" height="24" rx="4" fill="rgba(251,191,36,0.08)" stroke="rgba(251,191,36,0.2)" />
        <text x="233" y="174" fill="#fbbf24" fontSize="9" fontWeight="bold">AGENTS</text>
      </g>
      <g>
        <circle cx="170" cy="290" r="11" fill="#01040a" stroke="#fbbf24" strokeWidth="2.8" className="jr-pulse" />
        <rect x="186" y="278" width="78" height="24" rx="4" fill="rgba(251,191,36,0.12)" stroke="rgba(251,191,36,0.4)" />
        <text x="193" y="294" fill="#fff" fontSize="9" fontWeight="bold">COGNITIVE</text>
      </g>
      {/* sync core */}
      <g transform="translate(210,210)">
        <circle cx="0" cy="0" r="26" fill="rgba(251,191,36,0.08)" />
        <path d="M-11,0 A11,11 0 1,1 0,11" stroke="#fbbf24" strokeWidth="2.4" fill="none" className="jr-spin" />
        <path d="M11,0 A11,11 0 1,1 0,-11" stroke="#fbbf24" strokeWidth="2.4" fill="none" className="jr-spin" />
        <text x="0" y="3" textAnchor="middle" fill="#fbbf24" fontSize="7" fontWeight="bold" fontFamily="monospace">SYNC</text>
      </g>
      <defs>
        <linearGradient id="lGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Feature 6: Global AI Network
function SceneGlobalNetwork() {
  return (
    <svg className="journey-svg" viewBox="0 0 420 420" fill="none">
      <rect x="40" y="40" width="340" height="340" rx="26" fill="#01030d" stroke="rgba(59,130,246,0.15)" strokeWidth="1.5" />
      {/* globe */}
      <circle cx="210" cy="210" r="120" fill="none" stroke="rgba(59,130,246,0.08)" />
      <circle cx="210" cy="210" r="84" fill="none" stroke="rgba(59,130,246,0.05)" />
      <ellipse cx="210" cy="210" rx="120" ry="40" fill="none" stroke="rgba(59,130,246,0.08)" className="jr-spin" />
      <ellipse cx="210" cy="210" rx="40" ry="120" fill="none" stroke="rgba(59,130,246,0.08)" className="jr-spin" />
      {/* links */}
      <g stroke="rgba(96,165,250,0.25)" strokeWidth="1.2">
        <line x1="210" y1="120" x2="290" y2="185" />
        <line x1="290" y1="185" x2="266" y2="280" />
        <line x1="266" y1="280" x2="154" y2="280" />
        <line x1="154" y1="280" x2="130" y2="185" />
        <line x1="130" y1="185" x2="210" y2="120" />
      </g>
      <g stroke="#00f0ff" strokeWidth="1.4" strokeDasharray="3 4">
        <line x1="210" y1="120" x2="210" y2="210" />
        <line x1="290" y1="185" x2="210" y2="210" />
        <line x1="266" y1="280" x2="210" y2="210" />
        <line x1="154" y1="280" x2="210" y2="210" />
        <line x1="130" y1="185" x2="210" y2="210" />
      </g>
      {/* nodes */}
      <g className="jr-float-a"><circle cx="210" cy="120" r="11" fill="url(#nGlow)" /><circle cx="210" cy="120" r="4" fill="#60a5fa" /></g>
      <g className="jr-float-b"><circle cx="290" cy="185" r="9" fill="url(#nGlow)" /><circle cx="290" cy="185" r="3.5" fill="#3b82f6" /></g>
      <g className="jr-float-a"><circle cx="266" cy="280" r="11" fill="url(#nGlow)" /><circle cx="266" cy="280" r="4" fill="#00f0ff" /></g>
      <g className="jr-float-b"><circle cx="154" cy="280" r="9" fill="url(#nGlow)" /><circle cx="154" cy="280" r="3.5" fill="#3b82f6" /></g>
      <g className="jr-float-a"><circle cx="130" cy="185" r="11" fill="url(#nGlow)" /><circle cx="130" cy="185" r="4" fill="#60a5fa" /></g>
      {/* central hub */}
      <circle cx="210" cy="210" r="20" fill="url(#hubGlow)" />
      <circle cx="210" cy="210" r="6" fill="#fff" className="jr-pulse" />
      <defs>
        <radialGradient id="nGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#60a5fa" /><stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff" /><stop offset="40%" stopColor="#3b82f6" /><stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>
    </svg>
  );
}

/* ----------------------------- Scene map ----------------------------- */
const sceneMap: Record<string, React.FC> = {
  doubt_portal: SceneDoubtPortal,
  ai_tools: SceneAITools,
  live_classes: SceneLiveClasses,
  certification: SceneCertification,
  lifetime: SceneLifetime,
  global_network: SceneGlobalNetwork,
};

/* ───────── Default data (fallback when API is unreachable) ───────── */
const defaultSection: SectionData = {
  badge: "THE IINM LEARNING PATHWAY",
  heading: "Your Journey Through a Complete AI Ecosystem",
  subheading: "Scroll to travel the path. Each milestone lights up as you progress — from your first doubt to a global network of AI builders.",
};

const defaultMilestones: MilestoneData[] = [
  { id: 1, tag: "MILESTONE 01", title: "24/7 AI Doubt Clearing Portal", description: "An always-on LLM assistant trained on our curriculum. Ask anything, anytime — get instant answers, code fixes, and prompt guidance the moment you're stuck.", accent_color: "#00f0ff", scene_type: "doubt_portal", order_position: 1, is_active: true },
  { id: 2, tag: "MILESTONE 02", title: "Learn Latest AI Tools & Skills", description: "Master the modern stack — ChatGPT, Claude, Gemini, and Cursor — through real workflow connections. We teach what the industry uses right now, not last year.", accent_color: "#f472b6", scene_type: "ai_tools", order_position: 2, is_active: true },
  { id: 3, tag: "MILESTONE 03", title: "Live Practical Classes", description: "Real instructors teaching live. Students join, screens are shared, and code is written together in real time — no recorded video fatigue, just genuine interaction.", accent_color: "#10b981", scene_type: "live_classes", order_position: 3, is_active: true },
  { id: 4, tag: "MILESTONE 04", title: "Verified Certification", description: "Complete your assessment, build your capstone, and earn a verified credential with a tamper-proof badge — proof of expertise recognized by top recruiters.", accent_color: "#a78bfa", scene_type: "certification", order_position: 4, is_active: true },
  { id: 5, tag: "MILESTONE 05", title: "Lifetime Course Updates", description: "AI evolves fast. As new tools arrive, your access unlocks automatically — forever. Pay once, stay current for life across every future cohort and module.", accent_color: "#fbbf24", scene_type: "lifetime", order_position: 5, is_active: true },
  { id: 6, tag: "MILESTONE 06", title: "Global AI Network", description: "Join a worldwide grid of connected learners, mentors, and professionals. Share prompts, find collaborators, and tap into a high-signal network of AI builders.", accent_color: "#3b82f6", scene_type: "global_network", order_position: 6, is_active: true },
];

/* Admin inline-edit shared styles */
const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 6,
  color: "#fff",
  padding: "8px 10px",
  fontSize: 13,
  outline: "none",
  width: "100%",
};
const labelStyle: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 0.8,
  marginBottom: 2,
};
const btnStyle: React.CSSProperties = {
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

export default function ScrollStorytellingSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<SVGPathElement>(null);
  const sparkRef = useRef<SVGCircleElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const milestoneRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [box, setBox] = useState({ w: 0, h: 0 });

  /* ── API data ── */
  const [section, setSection] = useState<SectionData>(defaultSection);
  const [milestones, setMilestones] = useState<MilestoneData[]>(defaultMilestones);
  const [loading, setLoading] = useState(true);

  /* ── Admin state ── */
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editSection, setEditSection] = useState<SectionData>(defaultSection);
  const [editMilestones, setEditMilestones] = useState<MilestoneData[]>(defaultMilestones);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [secRes, msRes] = await Promise.all([
        apiFetch("/api/settings/journey-section"),
        apiFetch("/api/settings/journey-milestones"),
      ]);
      if (secRes.ok) {
        const sec = await secRes.json();
        setSection(sec);
        setEditSection(sec);
      }
      if (msRes.ok) {
        const ms = await msRes.json();
        setMilestones(ms);
        setEditMilestones(JSON.parse(JSON.stringify(ms)));
      }
    } catch {
      // keep defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    setIsAdmin(isAdminLoggedIn());
    const handleStorage = () => setIsAdmin(isAdminLoggedIn());
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [fetchData]);

  /* ── GSAP scroll animation (runs after data loads) ── */
  useEffect(() => {
    if (typeof window === "undefined" || loading) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const buildPath = () => {
      const container = timelineRef.current;
      if (!container) return "";
      const c = container.getBoundingClientRect();
      const pts = nodeRefs.current
        .map((n) => {
          if (!n) return null;
          const r = n.getBoundingClientRect();
          return { x: r.left - c.left + r.width / 2, y: r.top - c.top + r.height / 2 };
        })
        .filter(Boolean) as { x: number; y: number }[];
      return pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
    };

    let ctx: ReturnType<typeof gsap.context> | null = null;

    const apply = () => {
      const container = timelineRef.current;
      if (!container) return;
      const d = buildPath();
      if (!d) return;
      const rect = container.getBoundingClientRect();
      setBox({ w: rect.width, h: rect.height });
      if (trackRef.current) trackRef.current.setAttribute("d", d);

      if (ctx) ctx.revert();
      ctx = gsap.context(() => {
        const track = trackRef.current;
        const spark = sparkRef.current;

        if (track && spark) {
          const length = track.getTotalLength();
          const proxy = { p: 0 };
          gsap.to(proxy, {
            p: 1,
            ease: "none",
            scrollTrigger: {
              trigger: container,
              start: "top 70%",
              end: "bottom 80%",
              scrub: reduce ? false : 1,
              onUpdate: () => {
                const pt = track.getPointAtLength(length * proxy.p);
                gsap.set(spark, {
                  attr: { cx: pt.x, cy: pt.y },
                  opacity: proxy.p > 0.005 && proxy.p < 0.995 ? 1 : 0
                });
              }
            }
          });
        }

        milestoneRefs.current.forEach((el, idx) => {
          if (!el) return;
          gsap.fromTo(
            el,
            { opacity: 0, y: 60 },
            {
              opacity: 1,
              y: 0,
              duration: 0.9,
              ease: "power3.out",
              scrollTrigger: {
                trigger: el,
                start: "top 78%",
                toggleActions: "play none none reverse",
                onEnter: () => setActiveIndex(idx),
                onEnterBack: () => setActiveIndex(idx)
              }
            }
          );
        });
      }, sectionRef);

      ScrollTrigger.refresh();
    };

    const raf = requestAnimationFrame(apply);
    window.addEventListener("resize", apply);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", apply);
      if (ctx) ctx.revert();
    };
  }, [loading, milestones.length]);

  /* ── Admin handlers ── */
  const enterEdit = () => {
    setEditSection({ ...section });
    setEditMilestones(JSON.parse(JSON.stringify(milestones)));
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditSection({ ...section });
    setEditMilestones(JSON.parse(JSON.stringify(milestones)));
  };

  const updateMilestone = (id: number, field: keyof MilestoneData, value: string | number | boolean) => {
    setEditMilestones((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const addMilestone = () => {
    const maxId = editMilestones.reduce((max, m) => (m.id > max ? m.id : max), 0);
    const newM: MilestoneData = {
      id: maxId + 1,
      tag: `MILESTONE ${String(editMilestones.length + 1).padStart(2, "0")}`,
      title: "New Milestone",
      description: "Describe this milestone...",
      accent_color: "#00f0ff",
      scene_type: "doubt_portal",
      order_position: editMilestones.length + 1,
      is_active: true,
    };
    setEditMilestones((prev) => [...prev, newM]);
  };

  const removeMilestone = (id: number) => {
    setEditMilestones((prev) => prev.filter((m) => m.id !== id));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      // Save section header
      await apiFetch("/api/settings/journey-section", {
        method: "POST",
        body: JSON.stringify(editSection),
      });

      // Fetch current DB milestones for diff
      const allRes = await apiFetch("/api/settings/journey-milestones/all");
      const dbMilestones: MilestoneData[] = allRes.ok ? await allRes.json() : [];
      const dbIds = new Set(dbMilestones.map((m) => m.id));

      // Update existing
      for (const m of editMilestones) {
        if (dbIds.has(m.id)) {
          await apiFetch(`/api/settings/journey-milestones/${m.id}`, {
            method: "PUT",
            body: JSON.stringify(m),
          });
        } else {
          await apiFetch("/api/settings/journey-milestones", {
            method: "POST",
            body: JSON.stringify(m),
          });
        }
      }

      // Delete removed
      const editIds = new Set(editMilestones.map((m) => m.id));
      for (const m of dbMilestones) {
        if (!editIds.has(m.id)) {
          await apiFetch(`/api/settings/journey-milestones/${m.id}`, { method: "DELETE" });
        }
      }

      // Refresh public data
      await fetchData();
      setIsEditing(false);
    } catch (err) {
      alert("Save failed. Check console.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const displayMilestones = isEditing ? editMilestones : milestones;

  if (loading) {
    return (
      <section style={{ position: "relative", background: "#01040f", padding: "120px 48px 140px", overflow: "hidden" }}>
        <div style={{ maxWidth: 760, margin: "0 auto 100px", textAlign: "center", padding: "0" }}>
          <div className="js-skel" style={{ height: 28, borderRadius: 100, maxWidth: 200, margin: "0 auto 24px" }} />
          <div className="js-skel" style={{ height: 52, borderRadius: 8, maxWidth: 560, margin: "0 auto 18px" }} />
          <div className="js-skel" style={{ height: 20, borderRadius: 6, maxWidth: 420, margin: "0 auto" }} />
        </div>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0", display: "flex", flexDirection: "column", gap: 120 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
              <div className="js-skel" style={{ aspectRatio: "1/1", borderRadius: 26, maxWidth: 360 }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="js-skel" style={{ height: 14, borderRadius: 4, maxWidth: 100 }} />
                <div className="js-skel" style={{ height: 36, borderRadius: 6, maxWidth: 360 }} />
                <div className="js-skel" style={{ height: 60, borderRadius: 6, maxWidth: 420 }} />
              </div>
            </div>
          ))}
        </div>
        <style>{`
          .js-skel {
            background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%);
            background-size: 200% 100%;
            animation: js-shimmer 1.5s infinite;
          }
          @keyframes js-shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          @media (max-width: 860px) {
            .js-skel + div { grid-template-columns: 1fr !important; gap: 24px !important; }
          }
        `}</style>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="journey-section">
      <div className="journey-bg-grid" />
      <div className="journey-bg-orb" />

      {/* Admin top bar */}
      {isAdmin && !isEditing && (
        <div style={{ position: "absolute", top: 16, right: 16, zIndex: 50 }}>
          <button
            onClick={enterEdit}
            style={{
              background: "#e63946", color: "#fff", border: "none",
              borderRadius: 6, padding: "6px 14px", fontSize: 12,
              fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
            Edit Journey Section
          </button>
        </div>
      )}

      {/* Header */}
      <div className="journey-header">
        {isEditing ? (
          <div className="admin-edit-panel" style={{ maxWidth: 760, margin: "0 auto 40px", padding: 24, background: "rgba(255,255,255,0.04)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
            <h4 style={{ color: "#fff", margin: "0 0 16px", fontSize: 14, textTransform: "uppercase", letterSpacing: 1 }}>Edit Section Header</h4>
            <div style={{ display: "grid", gap: 12 }}>
              <label style={{ color: "#94a3b8", fontSize: 11 }}>Badge</label>
              <input value={editSection.badge} onChange={(e) => setEditSection((s) => ({ ...s, badge: e.target.value }))} style={inputStyle} />
              <label style={{ color: "#94a3b8", fontSize: 11 }}>Heading</label>
              <input value={editSection.heading} onChange={(e) => setEditSection((s) => ({ ...s, heading: e.target.value }))} style={inputStyle} />
              <label style={{ color: "#94a3b8", fontSize: 11 }}>Subheading</label>
              <textarea value={editSection.subheading} onChange={(e) => setEditSection((s) => ({ ...s, subheading: e.target.value }))} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
            </div>
          </div>
        ) : (
          <>
            <div className="journey-badge">
              <span className="journey-badge-dot" /> {section.badge}
            </div>
            <h2 className="journey-heading">
              {section.heading.split("AI Ecosystem")[0]}
              <span className="journey-gradient">AI Ecosystem</span>
              {section.heading.split("AI Ecosystem")[1] || ""}
            </h2>
            <p className="journey-sub">{section.subheading}</p>
          </>
        )}
      </div>

      {/* Timeline */}
      <div ref={timelineRef} className="journey-timeline">
        <svg className="journey-path-svg" viewBox={`0 0 ${box.w} ${box.h}`} preserveAspectRatio="none" fill="none">
          <path ref={trackRef} className="journey-track" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          <circle ref={sparkRef} r="8" className="journey-spark" opacity="0" />
        </svg>

        {/* Milestones */}
        <div className="journey-milestones">
          {displayMilestones.map((m, idx) => {
            const side = idx % 2 === 0 ? "left" : "right";
            const isActive = activeIndex >= idx;
            const Scene = sceneMap[m.scene_type] || SceneDoubtPortal;
            return (
              <div
                key={m.id}
                ref={(el) => { milestoneRefs.current[idx] = el; }}
                className={`journey-milestone side-${side} ${isActive ? "is-active" : ""}`}
                style={{ ["--accent" as string]: m.accent_color }}
              >
                {/* Illustration */}
                <div className="journey-illustration">
                  <div
                    ref={(el) => { nodeRefs.current[idx] = el; }}
                    className={`journey-node ${isActive ? "node-active" : ""}`}
                  >
                    <span className="journey-node-ring" />
                    <span className="journey-node-core">{idx + 1}</span>
                  </div>
                  <div className="journey-illustration-lens">
                    <Scene />
                  </div>
                </div>

                {/* Text or Admin Edit */}
                {isEditing ? (
                  <div className="journey-content" style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "grid", gap: 8 }}>
                      <label style={labelStyle}>Tag</label>
                      <input value={m.tag} onChange={(e) => updateMilestone(m.id, "tag", e.target.value)} style={inputStyle} />
                      <label style={labelStyle}>Title</label>
                      <input value={m.title} onChange={(e) => updateMilestone(m.id, "title", e.target.value)} style={inputStyle} />
                      <label style={labelStyle}>Description</label>
                      <textarea value={m.description} onChange={(e) => updateMilestone(m.id, "description", e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div>
                          <label style={labelStyle}>Accent</label>
                          <input value={m.accent_color} onChange={(e) => updateMilestone(m.id, "accent_color", e.target.value)} style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Scene</label>
                          <select value={m.scene_type} onChange={(e) => updateMilestone(m.id, "scene_type", e.target.value)} style={inputStyle}>
                            {Object.keys(sceneMap).map((k) => (
                              <option key={k} value={k}>{k}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div>
                          <label style={labelStyle}>Order</label>
                          <input type="number" value={m.order_position} onChange={(e) => updateMilestone(m.id, "order_position", Number(e.target.value))} style={inputStyle} />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 16 }}>
                          <input type="checkbox" id={`active-${m.id}`} checked={m.is_active} onChange={(e) => updateMilestone(m.id, "is_active", e.target.checked)} />
                          <label htmlFor={`active-${m.id}`} style={{ ...labelStyle, margin: 0 }}>Active</label>
                        </div>
                      </div>
                      <button onClick={() => removeMilestone(m.id)} style={{ ...btnStyle, background: "#ef4444" }}>Remove Milestone</button>
                    </div>
                  </div>
                ) : (
                  <div className="journey-content">
                    <span className="journey-content-tag">{m.tag}</span>
                    <h3 className="journey-content-title">{m.title}</h3>
                    <p className="journey-content-desc">{m.description}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Admin: Add new + Save/Cancel toolbar */}
        {isEditing && (
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 40, flexWrap: "wrap" }}>
            <button onClick={addMilestone} style={{ ...btnStyle, background: "#3b82f6" }}>+ Add New Milestone</button>
            <button onClick={saveAll} disabled={saving} style={{ ...btnStyle, background: "#22c55e" }}>{saving ? "Saving..." : "Save All Changes"}</button>
            <button onClick={cancelEdit} style={{ ...btnStyle, background: "#64748b" }}>Cancel</button>
          </div>
        )}
      </div>

      <style jsx>{`
        .journey-section {
          position: relative;
          background: #01040f;
          background-image: radial-gradient(circle at 50% 0%, #04122e 0%, #01040f 70%);
          padding: 120px 48px 140px;
          color: #fff;
          overflow: hidden;
          font-family: 'Inter', system-ui, sans-serif;
          border-top: 1px solid rgba(255,255,255,0.03);
        }
        .journey-bg-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
          background-size: 44px 44px;
          mask-image: radial-gradient(ellipse at 50% 30%, black 10%, transparent 75%);
          pointer-events: none;
        }
        .journey-bg-orb {
          position: absolute; top: 20%; left: 50%;
          transform: translateX(-50%);
          width: 900px; height: 900px;
          background: radial-gradient(circle, rgba(0,240,255,0.06) 0%, rgba(1,4,15,0) 70%);
          filter: blur(120px); pointer-events: none;
        }

        .journey-header {
          position: relative; z-index: 2;
          max-width: 760px; margin: 0 auto 100px;
          text-align: center; padding: 0;
        }
        .journey-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(0,240,255,0.05);
          border: 1px solid rgba(0,240,255,0.2);
          color: #00f0ff; border-radius: 100px;
          padding: 6px 14px; font-size: 11px; font-weight: 800;
          letter-spacing: 1.5px; margin-bottom: 24px;
        }
        .journey-badge-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #00f0ff; box-shadow: 0 0 10px #00f0ff;
          animation: jrBlink 1.4s infinite alternate;
        }
        @keyframes jrBlink { from { opacity: 0.4; } to { opacity: 1; } }
        .journey-heading {
          font-size: 42px; font-weight: 900;
          letter-spacing: -1.2px; line-height: 1.15; margin: 0 0 18px;
        }
        .journey-gradient {
          background: linear-gradient(135deg, #00f0ff 0%, #3b82f6 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .journey-sub { font-size: 15.5px; line-height: 1.6; color: #94a3b8; }

        /* Timeline wrapper */
        .journey-timeline {
          position: relative; z-index: 2;
          max-width: 1100px; margin: 0 auto; padding: 0;
        }
        .journey-path-svg {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          pointer-events: none; z-index: 1; overflow: visible;
        }
        .journey-track {
          stroke: rgba(96,165,250,0.13);
        }
        .journey-spark {
          fill: #eaffff;
          filter: drop-shadow(0 0 6px #00f0ff) drop-shadow(0 0 14px #00f0ff) drop-shadow(0 0 24px rgba(0,240,255,0.6));
        }

        .journey-milestones {
          position: relative; z-index: 2;
          display: flex; flex-direction: column; gap: 120px;
        }

        /* Each milestone row */
        .journey-milestone {
          position: relative;
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-items: center;
          gap: 80px;
          min-height: 300px;
        }
        .journey-milestone.side-left .journey-illustration { grid-column: 1; }
        .journey-milestone.side-left .journey-content { grid-column: 2; text-align: left; }
        .journey-milestone.side-right .journey-illustration { grid-column: 2; }
        .journey-milestone.side-right .journey-content { grid-column: 1; text-align: right; order: -1; }

        /* Connecting node sits at the outer-top corner of each illustration */
        .journey-node {
          position: absolute; top: -18px; z-index: 6;
          width: 52px; height: 52px;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.5s ease;
        }
        .journey-milestone.side-left .journey-node { left: -14px; right: auto; }
        .journey-milestone.side-right .journey-node { right: -14px; left: auto; }
        .journey-node-ring {
          position: absolute; inset: 0; border-radius: 50%;
          border: 2px solid rgba(96,165,250,0.25);
          transition: all 0.5s ease;
        }
        .journey-node-core {
          position: relative; z-index: 2;
          width: 34px; height: 34px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: #060d20; border: 2px solid rgba(96,165,250,0.3);
          font-size: 13px; font-weight: 800; color: #64748b;
          transition: all 0.5s ease;
        }
        .node-active .journey-node-ring {
          border-color: var(--accent);
          box-shadow: 0 0 20px var(--accent), inset 0 0 12px var(--accent);
          animation: nodePulse 1.8s infinite;
        }
        .node-active .journey-node-core {
          background: var(--accent); border-color: #fff; color: #03060f;
          box-shadow: 0 0 18px var(--accent);
        }
        @keyframes nodePulse {
          0% { transform: scale(1); opacity: 1; }
          70% { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1.5); opacity: 0; }
        }

        /* Illustration */
        .journey-illustration { position: relative; display: flex; }
        .journey-milestone.side-left .journey-illustration { justify-content: flex-start; }
        .journey-milestone.side-right .journey-illustration { justify-content: flex-end; }
        .journey-illustration-lens {
          width: 100%; max-width: 360px; aspect-ratio: 1/1;
          background: radial-gradient(circle, rgba(10,20,52,0.35) 0%, rgba(3,7,23,0.6) 100%);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 26px; padding: 14px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
          transition: transform 0.6s cubic-bezier(0.16,1,0.3,1), box-shadow 0.6s ease;
        }
        .is-active .journey-illustration-lens {
          box-shadow: 0 20px 60px rgba(0,0,0,0.55), 0 0 40px -10px var(--accent);
        }

        /* Content */
        .journey-content { display: flex; flex-direction: column; }
        .journey-milestone.side-right .journey-content { align-items: flex-end; }
        .journey-content-tag {
          font-family: monospace; font-size: 11px; font-weight: bold;
          color: var(--accent); letter-spacing: 2px; margin-bottom: 12px;
          text-shadow: 0 0 12px var(--accent);
        }
        .journey-content-title {
          font-size: 28px; font-weight: 850; letter-spacing: -0.6px;
          line-height: 1.2; margin: 0 0 16px; color: #fff;
          max-width: 420px;
        }
        .journey-content-desc {
          font-size: 14.5px; line-height: 1.65; color: #94a3b8;
          margin: 0; max-width: 420px;
        }

        :global(.journey-svg) { width: 100%; height: 100%; }

        /* shared scene animations */
        :global(.jr-spin) { animation: jrSpin 26s linear infinite; transform-origin: center; transform-box: fill-box; }
        @keyframes jrSpin { to { transform: rotate(360deg); } }
        :global(.jr-float-a) { animation: jrFloat 5s ease-in-out infinite alternate; }
        :global(.jr-float-b) { animation: jrFloat 6s ease-in-out infinite alternate-reverse; }
        @keyframes jrFloat { from { transform: translateY(0); } to { transform: translateY(-7px); } }
        :global(.jr-dot-1) { animation: jrBounce 1.2s ease-in-out infinite; }
        :global(.jr-dot-2) { animation: jrBounce 1.2s ease-in-out infinite 0.2s; }
        :global(.jr-dot-3) { animation: jrBounce 1.2s ease-in-out infinite 0.4s; }
        @keyframes jrBounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        :global(.jr-pulse) { animation: jrPulseOp 1.4s ease-in-out infinite alternate; }
        @keyframes jrPulseOp { from { opacity: 0.5; } to { opacity: 1; } }
        :global(.jr-wave-1) { animation: jrWave 0.8s ease-in-out infinite alternate; transform-origin: bottom; transform-box: fill-box; }
        :global(.jr-wave-2) { animation: jrWave 1.1s ease-in-out infinite alternate; transform-origin: bottom; transform-box: fill-box; }
        :global(.jr-wave-3) { animation: jrWave 0.7s ease-in-out infinite alternate; transform-origin: bottom; transform-box: fill-box; }
        @keyframes jrWave { from { transform: scaleY(0.4); } to { transform: scaleY(1.2); } }
        :global(.jr-laser) { animation: jrLaser 4s ease-in-out infinite; }
        @keyframes jrLaser { 0%,100% { transform: translateY(-70px); opacity: 0.3; } 50% { transform: translateY(110px); opacity: 0.9; } }
        :global(.jr-dash) { stroke-dasharray: 28 180; animation: jrDash 16s linear infinite; }
        @keyframes jrDash { to { stroke-dashoffset: -1000; } }

        /* Responsive */
        @media (max-width: 860px) {
          .journey-section { padding: 100px 24px 120px; }
          .journey-heading { font-size: 30px; }
          .journey-milestones { gap: 70px; }
          .journey-milestone,
          .journey-milestone.side-left,
          .journey-milestone.side-right {
            grid-template-columns: 1fr;
            gap: 24px;
            padding-left: 60px;
            min-height: 0;
          }
          .journey-milestone.side-left .journey-illustration,
          .journey-milestone.side-right .journey-illustration { grid-column: 1; }
          .journey-milestone.side-left .journey-content,
          .journey-milestone.side-right .journey-content {
            grid-column: 1; order: 0; text-align: left; align-items: flex-start;
          }
          .journey-milestone.side-right .journey-content { align-items: flex-start; }
          .journey-milestone.side-left .journey-illustration,
          .journey-milestone.side-right .journey-illustration { justify-content: flex-start; }
          .journey-milestone.side-right .journey-node { right: auto; left: -14px; }
          .journey-content-title,
          .journey-content-desc { max-width: 100%; }
          .journey-illustration-lens { max-width: 300px; }
        }
        @media (max-width: 480px) {
          .journey-section { padding: 80px 16px 100px; }
          .journey-heading { font-size: 25px; }
          .journey-content-title { font-size: 22px; }
        }
      `}</style>
    </section>
  );
}
