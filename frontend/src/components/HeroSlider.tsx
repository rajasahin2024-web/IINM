"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { apiFetch } from "@/lib/apiFetch";
import {
  ClaudeIcon,
  ChatGPTIcon,
  GeminiIcon,
  GrokIcon,
  CursorIcon,
  WindsurfIcon,
  KimiIcon,
  QwenIcon,
  NvidiaIcon,
  MicrosoftIcon,
} from "./AIToolIcons";
import type { HomeHeroData } from "./HeroSliderTypes";
import { defaultHeroData } from "./HeroSliderTypes";

// Admin editing UI is dynamically imported (ssr: false) so it's split into a
// separate chunk and never shipped to non-admin visitors. Only loaded when
// isAdmin becomes true.
const HeroSliderAdmin = dynamic(() => import("./HeroSliderAdmin"), { ssr: false });

function isAdminLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  const loggedIn = localStorage.getItem("iinm_is_logged_in") === "true";
  const expiry = localStorage.getItem("iinm_login_expiry");
  const sessionValid = loggedIn && expiry ? Date.now() < Number(expiry) : false;
  return sessionValid;
}

interface HeroSliderProps {
  initialData?: HomeHeroData | null;
}

export default function HeroSlider({ initialData }: HeroSliderProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlayed, setIsPlayed] = useState(false);
  const [heroData, setHeroData] = useState<HomeHeroData>(initialData || defaultHeroData);
  const [loading, setLoading] = useState(!initialData);
  const [isAdmin, setIsAdmin] = useState(false);
  const deviceBoxRef = useRef<HTMLDivElement>(null);

  // Load hero content from DB (skipped when initialData is provided by the
  // server component — avoids a duplicate client fetch and lets the hero
  // render immediately from SSR'd data).
  const loadHero = useCallback(async () => {
    try {
      const res = await apiFetch("/api/settings/hero");
      if (res.ok) {
        const data = await res.json();
        if (data.content) {
          setHeroData(data.content);
        }
      }
    } catch {
      /* ignore network errors, fall back to defaults */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialData) {
      loadHero();
    }
    setIsAdmin(isAdminLoggedIn());
    const handleStorage = () => setIsAdmin(isAdminLoggedIn());
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [loadHero, initialData]);

  // Auto slide rotation every 7 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroData.slides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [heroData.slides.length]);

  const handleDotClick = (index: number) => {
    setCurrentSlide(index);
  };

  function getThumbSrc(data: HomeHeroData): string {
    if (data.videoThumbnailUrl) return data.videoThumbnailUrl;
    return `https://img.youtube.com/vi/${data.videoYoutubeId}/maxresdefault.jpg`;
  }

  // ── Admin drag/resize handlers ──────────────────────────────────────
  // These stay in the parent because the device box is rendered in the
  // public JSX below and the handlers must be attached directly to it.
  // The admin component receives them as props for its resize handle.
  const isResizing = useRef(false);
  const isMoving = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);
  const moveStartX = useRef(0);
  const moveStartY = useRef(0);
  const startTop = useRef(0);
  const startLeft = useRef(0);

  const onResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!deviceBoxRef.current) return;
    isResizing.current = true;
    startX.current = e.clientX;
    startW.current = deviceBoxRef.current.getBoundingClientRect().width;
    document.body.style.cursor = "se-resize";
    document.body.style.userSelect = "none";
  };

  const onMoveStart = (e: React.MouseEvent) => {
    if (!deviceBoxRef.current) return;
    isMoving.current = true;
    moveStartX.current = e.clientX;
    moveStartY.current = e.clientY;
    const rect = deviceBoxRef.current.getBoundingClientRect();
    const parent = deviceBoxRef.current.offsetParent as HTMLElement | null;
    const parentRect = parent?.getBoundingClientRect();
    startTop.current = rect.top - (parentRect?.top ?? 0);
    startLeft.current = rect.left - (parentRect?.left ?? 0);
    document.body.style.cursor = "move";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = deviceBoxRef.current;
      if (isResizing.current && el) {
        const delta = e.clientX - startX.current;
        const newW = Math.max(320, Math.min(startW.current + delta, 960));
        const newH = (newW * 9) / 16;
        el.style.width = `${newW}px`;
        el.style.height = `${newH}px`;
        el.style.paddingBottom = "unset";
        el.style.maxWidth = "unset";
      }
      if (isMoving.current && el) {
        const dx = e.clientX - moveStartX.current;
        const dy = e.clientY - moveStartY.current;
        el.style.top = `${startTop.current + dy}px`;
        el.style.left = `${startLeft.current + dx}px`;
      }
    };
    const onUp = () => {
      if (isResizing.current && deviceBoxRef.current) {
        const w = deviceBoxRef.current.getBoundingClientRect().width;
        setHeroData((p) => ({ ...p, playerWidth: Math.round(w) }));
      }
      if (isMoving.current && deviceBoxRef.current) {
        const rect = deviceBoxRef.current.getBoundingClientRect();
        const parent = deviceBoxRef.current.offsetParent as HTMLElement | null;
        const parentRect = parent?.getBoundingClientRect();
        setHeroData((p) => ({
          ...p,
          playerTop: Math.round(rect.top - (parentRect?.top ?? 0)),
          playerLeft: Math.round(rect.left - (parentRect?.left ?? 0)),
        }));
      }
      isResizing.current = false;
      isMoving.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const slide = heroData.slides[currentSlide];

  if (loading) {
    return (
      <section
        style={{
          position: "relative",
          background: "radial-gradient(circle at 30% 30%, #ffffff 0%, #f3f7ff 50%, #ebf1ff 100%)",
          minHeight: "580px",
          display: "flex",
          alignItems: "center",
          padding: "60px 48px",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 1400,
            margin: "0 auto",
            padding: "0",
            display: "grid",
            gridTemplateColumns: "1fr 1.25fr",
            gap: 48,
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="hs-skel" style={{ height: 28, borderRadius: 30, maxWidth: 260 }} />
            <div className="hs-skel" style={{ height: 120, borderRadius: 12 }} />
            <div className="hs-skel" style={{ height: 72, borderRadius: 12 }} />
            <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              <div className="hs-skel" style={{ width: 120, height: 36, borderRadius: 30 }} />
              <div className="hs-skel" style={{ width: 160, height: 40, borderRadius: 8 }} />
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 4 }}>
              <div className="hs-skel" style={{ width: 140, height: 40, borderRadius: 8 }} />
              <div className="hs-skel" style={{ width: 140, height: 40, borderRadius: 8 }} />
            </div>
            <div className="hs-skel" style={{ height: 8, borderRadius: 4, maxWidth: 120, marginTop: 4 }} />
          </div>
          <div className="hs-skel" style={{ width: "100%", maxWidth: 680, paddingBottom: "56.25%", borderRadius: 8 }} />
        </div>
        <style>{`
          .hs-skel {
            background: linear-gradient(90deg, rgba(10,22,40,0.04) 25%, rgba(10,22,40,0.10) 50%, rgba(10,22,40,0.04) 75%);
            background-size: 200% 100%;
            animation: hs-shimmer 1.5s infinite;
          }
          @keyframes hs-shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          @media (max-width: 991px) {
            .hs-skel { padding: 0 !important; }
          }
        `}</style>
      </section>
    );
  }

  // Colors based on logo:
  // Navy: #0a1628
  // Red: #e63946
  return (
    <section
      className="hero-section"
      style={{
        position: "relative",
        background: "radial-gradient(circle at 30% 30%, #ffffff 0%, #f3f7ff 50%, #ebf1ff 100%)",
        minHeight: "580px", // Increased height slightly for standard premium space
        display: "flex",
        alignItems: "center",
        padding: "60px 48px",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        /* Native App / PWA Feel Responsive Styling */
        .hero-grid {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          padding: 0;
          box-sizing: border-box;
          display: grid;
          grid-template-columns: 1fr 1.25fr;
          gap: 48px;
          align-items: center;
          z-index: 2;
          position: relative;
        }
        @media (max-width: 1200px) {
          .hero-grid {
            gap: 32px;
            padding: 0;
          }
          .hero-title-h1 {
            font-size: 38px !important;
          }
        }

        @media (max-width: 1100px) {
          .hero-grid {
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            padding: 0;
          }
          .hero-title-h1 {
            font-size: 34px !important;
          }
        }
        
        .hero-title-container {
          position: relative;
          min-height: 120px;
        }

        .hero-title-h1 {
          font-size: 44px;
          font-weight: 850;
          line-height: 1.15;
          letter-spacing: -1.2px;
          color: #0a1628;
          margin: 0;
          width: 100%;
          transition: opacity 0.6s ease-in-out, transform 0.6s ease-in-out;
        }

        .hero-desc-container {
          position: relative;
          min-height: 72px;
        }

        .hero-desc-p {
          font-size: 15px;
          line-height: 1.65;
          color: #475569;
          margin: 0;
          width: 100%;
          transition: opacity 0.6s ease-in-out 0.1s, transform 0.6s ease-in-out 0.1s;
        }

        .cta-container {
          display: flex;
          gap: 16px;
          align-items: center;
          margin-top: 4px;
        }

        .cta-btn-primary {
          background: linear-gradient(135deg, #e63946 0%, #c1202f 100%);
          color: #ffffff;
          border: none;
          border-radius: 8px;
          padding: 12px 28px;
          font-size: 14px;
          font-weight: 700;
          text-align: center;
          text-decoration: none;
          box-shadow: 0 4px 14px rgba(230, 57, 70, 0.2);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          display: inline-block;
          cursor: pointer;
        }

        .cta-btn-primary:active {
          transform: scale(0.97);
        }

        .cta-btn-secondary {
          background: #ffffff;
          color: #0a1628;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 12px 28px;
          font-size: 14px;
          font-weight: 700;
          text-align: center;
          text-decoration: none;
          transition: all 0.25s ease;
          display: inline-block;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }

        .cta-btn-secondary:active {
          transform: scale(0.97);
          background: #f1f5f9;
        }

        .device-wrapper {
          display: flex;
          justify-content: center;
          position: relative;
          width: 100%;
        }

        .device-box {
          background: transparent; /* Transparent backing so no black borders appear */
          border-radius: 8px;
          border: none; /* Zero outlines */
          box-shadow: none; /* Lift shadow handled directly on inner child */
          padding: 0px;
          width: 100%;
          max-width: 680px;
          position: relative;
          transition: transform 0.3s ease;
          overflow: visible;
        }

        @keyframes pulsePlay {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(230, 57, 70, 0.4); }
          70% { transform: scale(1.08); box-shadow: 0 0 0 16px rgba(230, 57, 70, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(230, 57, 70, 0); }
        }
        .pulse-play-btn {
          animation: pulsePlay 2s infinite cubic-bezier(0.4, 0, 0.2, 1);
        }
        .video-thumb-img {
          transition: transform 0.3s ease;
        }
        .video-thumb-img:hover {
          transform: scale(1.03);
        }

        @media (max-width: 991px) {
          .hero-grid {
            grid-template-columns: 1fr;
            gap: 32px;
            padding: 0 !important; /* Zero padding override for flawless mobile spacing */
          }
          .hero-section {
            padding: 36px 24px !important;
            min-height: auto !important;
          }
          .hero-title-h1 {
            font-size: 32px !important;
            letter-spacing: -0.8px;
          }
          .hero-title-container {
            min-height: auto;
          }
          .hero-desc-container {
            min-height: auto;
          }
          .hero-desc-p {
            font-size: 14px;
          }
          .device-box {
            max-width: 100%;
          }
        }

        @media (max-width: 991px) {
          .device-box {
            width: 100% !important;
            height: auto !important;
            position: relative !important;
            top: auto !important;
            left: auto !important;
            padding-bottom: 56.25% !important;
            max-width: 100% !important;
          }
        }

        @media (max-width: 576px) {
          /* Ultra Responsive App/PWA UI */
          .hero-section {
            padding: 24px 16px !important;
          }
          .hero-title-h1 {
            font-size: 26px !important;
            text-align: center;
          }
          .hero-desc-p {
            text-align: center;
          }
          .cta-container {
            flex-direction: column;
            gap: 12px;
            width: 100%;
            margin-top: 12px;
          }
          .cta-btn-primary, .cta-btn-secondary {
            width: 100%;
            box-sizing: border-box;
            padding: 14px 20px;
            font-size: 15px;
            border-radius: 8px; /* Reduced from 14px to 8px for sharper look */
          }
          .rating-wrapper {
            justify-content: center !important;
          }
          .pagination-dots {
            justify-content: center !important;
            margin-top: 8px !important;
          }
          .device-box {
            border-radius: 8px; /* Reduced from 16px to 8px */
            padding: 0px;
          }
        }

        @keyframes floatIcon {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.18; }
          33% { transform: translateY(-14px) rotate(5deg); opacity: 0.28; }
          66% { transform: translateY(8px) rotate(-3deg); opacity: 0.22; }
        }
      `}</style>

      {/* Animated AI Tools — Real Brand-Style Floating Icons */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        {/* Claude */}
        <div style={{ position: "absolute", top: "10%", left: "5%", animation: "floatIcon 9s ease-in-out infinite" }}>
          <ClaudeIcon size={44} />
        </div>
        {/* ChatGPT */}
        <div style={{ position: "absolute", top: "6%", left: "26%", animation: "floatIcon 11s ease-in-out infinite 1s" }}>
          <ChatGPTIcon size={40} />
        </div>
        {/* Gemini */}
        <div style={{ position: "absolute", top: "16%", left: "46%", animation: "floatIcon 8s ease-in-out infinite 2.3s" }}>
          <GeminiIcon size={42} />
        </div>
        {/* Grok */}
        <div style={{ position: "absolute", top: "8%", left: "66%", animation: "floatIcon 10s ease-in-out infinite 0.6s" }}>
          <GrokIcon size={38} />
        </div>
        {/* Cursor */}
        <div style={{ position: "absolute", top: "20%", left: "84%", animation: "floatIcon 12s ease-in-out infinite 2.8s" }}>
          <CursorIcon size={38} />
        </div>
        {/* Windsurf */}
        <div style={{ position: "absolute", top: "40%", left: "3%", animation: "floatIcon 9.5s ease-in-out infinite 1.5s" }}>
          <WindsurfIcon size={42} />
        </div>
        {/* Kimi */}
        <div style={{ position: "absolute", top: "50%", left: "30%", animation: "floatIcon 10s ease-in-out infinite 3.8s" }}>
          <KimiIcon size={40} />
        </div>
        {/* Qwen */}
        <div style={{ position: "absolute", top: "44%", left: "56%", animation: "floatIcon 11s ease-in-out infinite 1.9s" }}>
          <QwenIcon size={40} />
        </div>
        {/* Nvidia */}
        <div style={{ position: "absolute", top: "56%", left: "76%", animation: "floatIcon 8.5s ease-in-out infinite 0.4s" }}>
          <NvidiaIcon size={46} />
        </div>
        {/* Microsoft */}
        <div style={{ position: "absolute", top: "72%", left: "12%", animation: "floatIcon 10s ease-in-out infinite 3.2s" }}>
          <MicrosoftIcon size={40} />
        </div>
        {/* Extra scattered duplicates */}
        <div style={{ position: "absolute", top: "80%", left: "44%", animation: "floatIcon 13s ease-in-out infinite 4.5s" }}>
          <ChatGPTIcon size={34} />
        </div>
        <div style={{ position: "absolute", top: "64%", left: "90%", animation: "floatIcon 9s ease-in-out infinite 0.9s" }}>
          <GrokIcon size={36} />
        </div>
        <div style={{ position: "absolute", top: "28%", left: "52%", animation: "floatIcon 12s ease-in-out infinite 5.5s" }}>
          <GeminiIcon size={32} />
        </div>
      </div>

      <div className="hero-grid" style={{ position: "relative" }}>
        {/* Left Column: Rich Typography & Interactive Controls */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* Glowing Badge */}
          <div style={{ display: "flex", justifyContent: "flex-start" }} className="rating-wrapper">
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(10, 22, 40, 0.05)",
                border: "1px solid rgba(10, 22, 40, 0.12)",
                borderRadius: "30px",
                padding: "6px 14px",
              }}
            >
              <span style={{ display: "flex", gap: "4px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#e63946", animation: "pulse 1.5s infinite" }}></span>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#0a1628" }}></span>
              </span>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  color: "#0a1628",
                  letterSpacing: "1.2px",
                  textTransform: "uppercase",
                }}
              >
                {slide.badge}
              </span>
            </div>
          </div>

          {/* Large Header */}
          <div className="hero-title-container">
            {heroData.slides.map((s, idx) => (
              <h1
                key={idx}
                className="hero-title-h1"
                style={{
                  position: idx === currentSlide ? "relative" : "absolute",
                  top: 0,
                  left: 0,
                  opacity: idx === currentSlide ? 1 : 0,
                  visibility: idx === currentSlide ? "visible" : "hidden",
                  transform: idx === currentSlide ? "translateY(0px)" : "translateY(12px)",
                  pointerEvents: idx === currentSlide ? "auto" : "none",
                  zIndex: idx === currentSlide ? 2 : 0,
                }}
              >
                {s.title.includes(s.highlightText) ? (
                  <>
                    {s.title.split(s.highlightText)[0]}
                    <span
                      style={{
                        background: "linear-gradient(135deg, #e63946 0%, #a21824 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        display: "inline-block",
                      }}
                    >
                      {s.highlightText}
                    </span>
                    {s.title.split(s.highlightText)[1]}
                  </>
                ) : (
                  s.title
                )}
              </h1>
            ))}
          </div>

          {/* Description */}
          <div className="hero-desc-container">
            {heroData.slides.map((s, idx) => (
              <p
                key={idx}
                className="hero-desc-p"
                style={{
                  position: idx === currentSlide ? "relative" : "absolute",
                  top: 0,
                  left: 0,
                  opacity: idx === currentSlide ? 1 : 0,
                  visibility: idx === currentSlide ? "visible" : "hidden",
                  transform: idx === currentSlide ? "translateY(0px)" : "translateY(8px)",
                  pointerEvents: idx === currentSlide ? "auto" : "none",
                  zIndex: idx === currentSlide ? 2 : 0,
                }}
              >
                {s.description}
              </p>
            ))}
          </div>

          {/* Google Rating Card next to Indian Face Avatar Stack (Image 2 style) */}
          <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }} className="rating-wrapper">
            {/* Indian Avatar Stack */}
            <div style={{ display: "flex", alignItems: "center" }}>
              {heroData.avatarImages.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt="IINM Indian Learner Face"
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    border: "2px solid #ffffff",
                    marginLeft: i === 0 ? "0px" : "-12px",
                    objectFit: "cover",
                    zIndex: 4 - i,
                    boxShadow: "0 2px 8px rgba(10, 22, 40, 0.1)",
                  }}
                />
              ))}
            </div>

            {/* Google Rating Details */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: "#ffffff",
                border: "1px solid #e2e8f4",
                borderRadius: "14px",
                padding: "6px 14px",
                boxShadow: "0 4px 12px rgba(10, 22, 40, 0.03)",
              }}
            >
              {/* Google colored SVG Icon */}
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.18 1-.76 1.85-1.59 2.4v2.79h2.58c1.51-1.39 2.38-3.44 2.38-5.2H22.56z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H3.18v2.87C5 21.09 8.27 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.03H3.18C2.42 8.53 2 10.22 2 12s.42 3.47 1.18 4.97l2.66-2.88z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 8.27 1 5 2.91 3.18 5.93l3.5 2.87c.88-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
                  <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#1e293b" }}>{heroData.googleRatingText}</span>
                  <div style={{ display: "flex", gap: "1px", marginLeft: "4px" }}>
                    {[...Array(heroData.googleRatingStars)].map((_, i) => (
                      <span key={i} style={{ color: "#fbbf24", fontSize: "11px" }}>★</span>
                    ))}
                  </div>
                </div>
                <span style={{ fontSize: "10px", fontWeight: 600, color: "#64748b" }}>{heroData.googleRatingSubtext}</span>
              </div>
            </div>
          </div>

          {/* Action Call to Buttons */}
          <div className="cta-container">
            <Link href={slide.primaryCtaLink} className="cta-btn-primary">
              {slide.primaryCtaText}
            </Link>

            <Link href={slide.secondaryCtaLink} className="cta-btn-secondary">
              {slide.secondaryCtaText}
            </Link>
          </div>

          {/* Slider Pagination Dots */}
          <div style={{ display: "flex", gap: "8px", marginTop: "20px", alignItems: "center" }} className="pagination-dots">
            {heroData.slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => handleDotClick(idx)}
                style={{
                  width: idx === currentSlide ? "24px" : "8px",
                  height: "8px",
                  borderRadius: "4px",
                  background: idx === currentSlide ? "#e63946" : "#cbd5e1",
                  boxShadow: idx === currentSlide ? "0 0 10px rgba(230, 57, 70, 0.4)" : "none",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  padding: 0,
                }}
                title={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Right Column: Premium Device Mockup carrying Autoplay Video */}
        <div className="device-wrapper">

          {/* Futuristic device border / glowing drop shadow frame */}
          <div
            ref={deviceBoxRef}
            className="device-box"
            style={{
              paddingBottom: heroData.playerWidth ? "unset" : "56.25%",
              height: heroData.playerWidth ? (heroData.playerWidth * 9) / 16 : 0,
              width: heroData.playerWidth ?? "100%",
              maxWidth: heroData.playerWidth ? "unset" : 680,
              position: heroData.playerTop || heroData.playerLeft ? "absolute" : "relative",
              top: heroData.playerTop ?? undefined,
              left: heroData.playerLeft ?? undefined,
              zIndex: 1,
            }}
            onMouseDown={isAdmin ? onMoveStart : undefined}
          >
            {/* Inner Video Container */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                borderRadius: "8px",
                overflow: "hidden",
                backgroundColor: "#000000",
                boxShadow: "0 20px 45px -12px rgba(10, 22, 40, 0.25)", /* Clean shadow without neon tint */
                cursor: isAdmin ? "move" : "pointer",
                zIndex: 2, // Placed strictly above rays (zIndex: 0)
              }}
              onClick={() => !isAdmin && setIsPlayed(true)}
            >
              {!isPlayed ? (
                <>
                  {/* HD Cover Image — custom thumbnail or YouTube default */}
                  <img
                    src={getThumbSrc(heroData)}
                    alt="Classroom Video Thumbnail"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src.includes("maxresdefault.jpg")) {
                        target.src = `https://img.youtube.com/vi/${heroData.videoYoutubeId}/sddefault.jpg`;
                      } else if (target.src.includes("sddefault.jpg")) {
                        target.src = `https://img.youtube.com/vi/${heroData.videoYoutubeId}/hqdefault.jpg`;
                      }
                    }}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                    className="video-thumb-img"
                  />
                  
                  {/* Glassmorphic dark overlay overlay */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(10, 22, 40, 0.35)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {/* Premium Pulsing Red Play Button with Glass Ring */}
                    <div
                      className="pulse-play-btn"
                      style={{
                        position: "relative",
                        width: "78px",
                        height: "78px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {/* Outer glassmorphic ring */}
                      <div
                        style={{
                          position: "absolute",
                          inset: "-10px",
                          borderRadius: "50%",
                          border: "1.5px solid rgba(255,255,255,0.35)",
                          background: "rgba(255,255,255,0.08)",
                          backdropFilter: "blur(6px)",
                          WebkitBackdropFilter: "blur(6px)",
                          boxShadow: "0 0 0 1px rgba(255,255,255,0.1), 0 8px 32px rgba(0,0,0,0.15)",
                        }}
                      />
                      {/* Inner red button */}
                      <div
                        style={{
                          width: "78px",
                          height: "78px",
                          background: "linear-gradient(135deg, #e63946 0%, #c1202f 100%)",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "2.5px solid #ffffff",
                          boxShadow: "0 8px 28px rgba(230, 57, 70, 0.45), inset 0 1px 2px rgba(255,255,255,0.25)",
                          position: "relative",
                          zIndex: 1,
                          transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1.08)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1)"; }}
                      >
                        {/* Premium Play Icon */}
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="#ffffff" style={{ marginLeft: "3px" }}>
                          <path d="M8 5.14v13.72c0 .88.96 1.42 1.71.95l11.42-6.86c.73-.44.73-1.46 0-1.9L9.71 4.19c-.75-.45-1.71.07-1.71.95z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <iframe
                  id="classroom-video-iframe"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    border: "none",
                  }}
                  src={`https://www.youtube.com/embed/${heroData.videoYoutubeId}?autoplay=1&mute=0&controls=1&loop=1&playlist=${heroData.videoYoutubeId}&enablejsapi=1&modestbranding=1&rel=0`}
                  title="Classroom Device Demo"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              )}
            </div>
          </div>

          {/* Floating abstract glowing decorative items in background */}
          <div
            style={{
              position: "absolute",
              top: "-20px",
              right: "-20px",
              width: "120px",
              height: "120px",
              background: "radial-gradient(circle, rgba(230, 57, 70, 0.1) 0%, transparent 70%)",
              zIndex: -1,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-30px",
              left: "-30px",
              width: "140px",
              height: "140px",
              background: "radial-gradient(circle, rgba(10, 22, 40, 0.08) 0%, transparent 70%)",
              zIndex: -1,
              pointerEvents: "none",
            }}
          />
        </div>
      </div>

      {isAdmin && (
        <HeroSliderAdmin
          heroData={heroData}
          setHeroData={setHeroData}
          deviceBoxRef={deviceBoxRef}
          getThumbSrc={getThumbSrc}
          onResizeStart={onResizeStart}
        />
      )}

      <style jsx global>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes toastIn {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </section>
  );
}
