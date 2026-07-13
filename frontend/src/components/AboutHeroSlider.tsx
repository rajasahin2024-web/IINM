"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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

interface AboutSlide {
  badge: string;
  title: string;
  highlightText: string;
  description: string;
  primaryCtaText: string;
  primaryCtaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
}

interface AboutHeroData {
  slides: AboutSlide[];
  videoYoutubeId: string;
  videoThumbnailUrl?: string;
  avatarImages: string[];
  googleRatingText: string;
  googleRatingStars: number;
  googleRatingSubtext: string;
  statsYears: string;
  statsStudents: string;
  statsCourses: string;
}

const defaultAboutHero: AboutHeroData = {
  slides: [
    {
      badge: "ABOUT IINM",
      title: "Connecting the Dots of Artificial Intelligence",
      highlightText: "Artificial Intelligence",
      description: "IINM is dedicated to building highly-skilled global leaders ready for the cognitive computing landscape. Discover our narrative, meet the pioneers, and explore our roadmap.",
      primaryCtaText: "Our Story",
      primaryCtaLink: "#story",
      secondaryCtaText: "Meet the Team",
      secondaryCtaLink: "#team",
    },
    {
      badge: "OUR MISSION",
      title: "Empowering the Next Generation of AI Innovators",
      highlightText: "AI Innovators",
      description: "We bridge the gap between academic theory and industry practice. Our curriculum is designed by experts, validated by industry leaders, and delivered through hands-on laboratory learning.",
      primaryCtaText: "Our Mission",
      primaryCtaLink: "#mission",
      secondaryCtaText: "Explore Programs",
      secondaryCtaLink: "/courses",
    },
    {
      badge: "OUR JOURNEY",
      title: "From Vision to Reality in AI Education Excellence",
      highlightText: "AI Education Excellence",
      description: "What started as a bold idea has grown into a thriving ecosystem of learners, educators, and industry partners. Trace our milestones, celebrate our achievements, and join our future.",
      primaryCtaText: "View Timeline",
      primaryCtaLink: "#timeline",
      secondaryCtaText: "Contact Us",
      secondaryCtaLink: "/contact-us",
    },
  ],
  videoYoutubeId: "FwOTs4UxQS4",
  videoThumbnailUrl: "",
  avatarImages: [
    "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=80&h=80&q=80",
    "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=80&h=80&q=80",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=80&h=80&q=80",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=80&h=80&q=80",
  ],
  googleRatingText: "4.4/5",
  googleRatingStars: 5,
  googleRatingSubtext: "Trusted Google Rating by Indian Learners",
  statsYears: "3+",
  statsStudents: "10,000+",
  statsCourses: "50+",
};

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  return null;
}
function buildYouTubeUrl(id: string) { return `https://www.youtube.com/watch?v=${id}`; }

interface Props {
  settings?: any;
}

export default function AboutHeroSlider({ settings }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlayed, setIsPlayed] = useState(false);
  const [heroData, setHeroData] = useState<AboutHeroData>(defaultAboutHero);
  const [loading, setLoading] = useState(true);

  // Merge incoming settings (stats) into hero data
  useEffect(() => {
    if (settings) {
      setHeroData((prev) => ({
        ...prev,
        statsYears: settings.stats_years || prev.statsYears,
        statsStudents: settings.stats_students || prev.statsStudents,
        statsCourses: settings.stats_courses || prev.statsCourses,
      }));
    }
  }, [settings]);

  // Load hero content from DB (reuse homepage hero for video/avatars/ratings)
  const loadHero = useCallback(async () => {
    try {
      const res = await apiFetch("/api/settings/hero");
      if (res.ok) {
        const data = await res.json();
        if (data.content) {
          setHeroData((prev) => ({
            ...prev,
            videoYoutubeId: data.content.videoYoutubeId || prev.videoYoutubeId,
            videoThumbnailUrl: data.content.videoThumbnailUrl || prev.videoThumbnailUrl,
            avatarImages: data.content.avatarImages || prev.avatarImages,
            googleRatingText: data.content.googleRatingText || prev.googleRatingText,
            googleRatingStars: data.content.googleRatingStars || prev.googleRatingStars,
            googleRatingSubtext: data.content.googleRatingSubtext || prev.googleRatingSubtext,
          }));
        }
      }
    } catch {
      /* ignore network errors, fall back to defaults */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHero();
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroData.slides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [loadHero, heroData.slides.length]);

  const handleDotClick = (index: number) => setCurrentSlide(index);

  function getThumbSrc(data: AboutHeroData): string {
    if (data.videoThumbnailUrl) return data.videoThumbnailUrl;
    return `https://img.youtube.com/vi/${data.videoYoutubeId}/maxresdefault.jpg`;
  }

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
            display: "grid",
            gridTemplateColumns: "1fr 1.25fr",
            gap: 48,
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="ahs-skel" style={{ height: 28, borderRadius: 30, maxWidth: 260 }} />
            <div className="ahs-skel" style={{ height: 120, borderRadius: 12 }} />
            <div className="ahs-skel" style={{ height: 72, borderRadius: 12 }} />
            <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              <div className="ahs-skel" style={{ width: 120, height: 36, borderRadius: 30 }} />
              <div className="ahs-skel" style={{ width: 160, height: 40, borderRadius: 8 }} />
            </div>
            <div className="ahs-skel" style={{ height: 8, borderRadius: 4, maxWidth: 120, marginTop: 4 }} />
          </div>
          <div className="ahs-skel" style={{ width: "100%", maxWidth: 680, paddingBottom: "56.25%", borderRadius: 8 }} />
        </div>
        <style>{`
          .ahs-skel {
            background: linear-gradient(90deg, rgba(10,22,40,0.04) 25%, rgba(10,22,40,0.10) 50%, rgba(10,22,40,0.04) 75%);
            background-size: 200% 100%;
            animation: ahs-shimmer 1.5s infinite;
          }
          @keyframes ahs-shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </section>
    );
  }

  const slide = heroData.slides[currentSlide];

  return (
    <section
      className="about-hero-section"
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
      <style>{`
        .about-hero-grid {
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
          .about-hero-grid { gap: 32px; }
          .about-hero-title { font-size: 38px !important; }
        }
        @media (max-width: 1100px) {
          .about-hero-grid { grid-template-columns: 1fr 1fr; gap: 24px; }
          .about-hero-title { font-size: 34px !important; }
        }
        .about-hero-title-container { position: relative; min-height: 120px; }
        .about-hero-title {
          font-size: 44px;
          font-weight: 850;
          line-height: 1.15;
          letter-spacing: -1.2px;
          color: #0a1628;
          margin: 0;
          width: 100%;
          transition: opacity 0.6s ease-in-out, transform 0.6s ease-in-out;
        }
        .about-hero-desc-container { position: relative; min-height: 72px; }
        .about-hero-desc {
          font-size: 15px;
          line-height: 1.65;
          color: #475569;
          margin: 0;
          width: 100%;
          transition: opacity 0.6s ease-in-out 0.1s, transform 0.6s ease-in-out 0.1s;
        }
        .about-cta-container {
          display: flex;
          gap: 16px;
          align-items: center;
          margin-top: 4px;
        }
        .about-cta-primary {
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
        .about-cta-primary:active { transform: scale(0.97); }
        .about-cta-secondary {
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
        .about-cta-secondary:active { transform: scale(0.97); background: #f1f5f9; }
        .about-device-wrapper {
          display: flex;
          justify-content: center;
          position: relative;
          width: 100%;
        }
        .about-device-box {
          background: transparent;
          border-radius: 8px;
          border: none;
          box-shadow: none;
          padding: 0;
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
        .about-pulse-play { animation: pulsePlay 2s infinite cubic-bezier(0.4, 0, 0.2, 1); }
        .about-video-thumb { transition: transform 0.3s ease; }
        .about-video-thumb:hover { transform: scale(1.03); }
        @media (max-width: 991px) {
          .about-hero-grid { grid-template-columns: 1fr; gap: 32px; padding: 0 !important; }
          .about-hero-section { padding: 36px 24px !important; min-height: auto !important; }
          .about-hero-title { font-size: 32px !important; letter-spacing: -0.8px; }
          .about-hero-title-container { min-height: auto; }
          .about-hero-desc-container { min-height: auto; }
          .about-hero-desc { font-size: 14px; }
          .about-device-box { max-width: 100%; width: 100% !important; height: auto !important; position: relative !important; top: auto !important; left: auto !important; padding-bottom: 56.25% !important; }
        }
        @media (max-width: 576px) {
          .about-hero-section { padding: 24px 16px !important; }
          .about-hero-title { font-size: 26px !important; text-align: center; }
          .about-hero-desc { text-align: center; }
          .about-cta-container { flex-direction: column; gap: 12px; width: 100%; margin-top: 12px; }
          .about-cta-primary, .about-cta-secondary { width: 100%; box-sizing: border-box; padding: 14px 20px; font-size: 15px; border-radius: 8px; }
          .about-rating-wrapper { justify-content: center !important; }
          .about-pagination-dots { justify-content: center !important; margin-top: 8px !important; }
          .about-stats-card { max-width: 100% !important; }
        }
        @keyframes floatIcon {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.18; }
          33% { transform: translateY(-14px) rotate(5deg); opacity: 0.28; }
          66% { transform: translateY(8px) rotate(-3deg); opacity: 0.22; }
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Floating AI Tool Icons */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 1 }}>
        <div style={{ position: "absolute", top: "10%", left: "5%", animation: "floatIcon 9s ease-in-out infinite" }}><ClaudeIcon size={44} /></div>
        <div style={{ position: "absolute", top: "6%", left: "26%", animation: "floatIcon 11s ease-in-out infinite 1s" }}><ChatGPTIcon size={40} /></div>
        <div style={{ position: "absolute", top: "16%", left: "46%", animation: "floatIcon 8s ease-in-out infinite 2.3s" }}><GeminiIcon size={42} /></div>
        <div style={{ position: "absolute", top: "8%", left: "66%", animation: "floatIcon 10s ease-in-out infinite 0.6s" }}><GrokIcon size={38} /></div>
        <div style={{ position: "absolute", top: "20%", left: "84%", animation: "floatIcon 12s ease-in-out infinite 2.8s" }}><CursorIcon size={38} /></div>
        <div style={{ position: "absolute", top: "40%", left: "3%", animation: "floatIcon 9.5s ease-in-out infinite 1.5s" }}><WindsurfIcon size={42} /></div>
        <div style={{ position: "absolute", top: "50%", left: "30%", animation: "floatIcon 10s ease-in-out infinite 3.8s" }}><KimiIcon size={40} /></div>
        <div style={{ position: "absolute", top: "44%", left: "56%", animation: "floatIcon 11s ease-in-out infinite 1.9s" }}><QwenIcon size={40} /></div>
        <div style={{ position: "absolute", top: "56%", left: "76%", animation: "floatIcon 8.5s ease-in-out infinite 0.4s" }}><NvidiaIcon size={46} /></div>
        <div style={{ position: "absolute", top: "72%", left: "12%", animation: "floatIcon 10s ease-in-out infinite 3.2s" }}><MicrosoftIcon size={40} /></div>
        <div style={{ position: "absolute", top: "80%", left: "44%", animation: "floatIcon 13s ease-in-out infinite 4.5s" }}><ChatGPTIcon size={34} /></div>
        <div style={{ position: "absolute", top: "64%", left: "90%", animation: "floatIcon 9s ease-in-out infinite 0.9s" }}><GrokIcon size={36} /></div>
      </div>

      <div className="about-hero-grid" style={{ position: "relative" }}>
        {/* Left Column: Typography & Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Badge */}
          <div style={{ display: "flex", justifyContent: "flex-start" }} className="about-rating-wrapper">
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
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#e63946", animation: "pulse 1.5s infinite" }} />
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#0a1628" }} />
              </span>
              <span style={{ fontSize: "10px", fontWeight: 800, color: "#0a1628", letterSpacing: "1.2px", textTransform: "uppercase" }}>
                {slide.badge}
              </span>
            </div>
          </div>

          {/* Title */}
          <div className="about-hero-title-container">
            {heroData.slides.map((s, idx) => (
              <h1
                key={idx}
                className="about-hero-title"
                style={{
                  position: idx === currentSlide ? "relative" : "absolute",
                  top: 0, left: 0,
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
                    <span style={{ background: "linear-gradient(135deg, #e63946 0%, #a21824 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", display: "inline-block" }}>
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
          <div className="about-hero-desc-container">
            {heroData.slides.map((s, idx) => (
              <p
                key={idx}
                className="about-hero-desc"
                style={{
                  position: idx === currentSlide ? "relative" : "absolute",
                  top: 0, left: 0,
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

          {/* Stats Card — About specific */}
          <div className="about-stats-card" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, maxWidth: 480, background: "#fff", border: "1px solid rgba(10,22,40,0.06)", borderRadius: 16, padding: "20px 12px", boxShadow: "0 4px 20px rgba(10,22,40,0.05)" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 900, color: "#e63946" }}>{heroData.statsYears}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.6, marginTop: 2 }}>Years</div>
            </div>
            <div style={{ borderLeft: "1px solid rgba(10,22,40,0.06)", borderRight: "1px solid rgba(10,22,40,0.06)", textAlign: "center" }}>
              <div style={{ fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 900, color: "#0a1628" }}>{heroData.statsStudents}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.6, marginTop: 2 }}>Students</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 900, color: "#e63946" }}>{heroData.statsCourses}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.6, marginTop: 2 }}>Courses</div>
            </div>
          </div>

          {/* Google Rating + Avatars */}
          <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }} className="about-rating-wrapper">
            <div style={{ display: "flex", alignItems: "center" }}>
              {heroData.avatarImages.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt="IINM Learner"
                  style={{
                    width: "36px", height: "36px", borderRadius: "50%",
                    border: "2px solid #ffffff", marginLeft: i === 0 ? "0px" : "-12px",
                    objectFit: "cover", zIndex: 4 - i,
                    boxShadow: "0 2px 8px rgba(10, 22, 40, 0.1)",
                  }}
                />
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "#ffffff", border: "1px solid #e2e8f4", borderRadius: "14px", padding: "6px 14px", boxShadow: "0 4px 12px rgba(10, 22, 40, 0.03)" }}>
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

          {/* CTA Buttons */}
          <div className="about-cta-container">
            <Link href={slide.primaryCtaLink} className="about-cta-primary">{slide.primaryCtaText}</Link>
            <Link href={slide.secondaryCtaLink} className="about-cta-secondary">{slide.secondaryCtaText}</Link>
          </div>

          {/* Pagination Dots */}
          <div style={{ display: "flex", gap: "8px", marginTop: "20px", alignItems: "center" }} className="about-pagination-dots">
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

        {/* Right Column: Video Player */}
        <div className="about-device-wrapper">
          <div className="about-device-box" style={{ paddingBottom: "56.25%" }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                borderRadius: "8px",
                overflow: "hidden",
                backgroundColor: "#000000",
                boxShadow: "0 20px 45px -12px rgba(10, 22, 40, 0.25)",
                cursor: "pointer",
                zIndex: 2,
              }}
              onClick={() => setIsPlayed(true)}
            >
              {!isPlayed ? (
                <>
                  <img
                    src={getThumbSrc(heroData)}
                    alt="About IINM Video"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src.includes("maxresdefault.jpg")) {
                        target.src = `https://img.youtube.com/vi/${heroData.videoYoutubeId}/sddefault.jpg`;
                      } else if (target.src.includes("sddefault.jpg")) {
                        target.src = `https://img.youtube.com/vi/${heroData.videoYoutubeId}/hqdefault.jpg`;
                      }
                    }}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    className="about-video-thumb"
                  />
                  <div style={{ position: "absolute", inset: 0, background: "rgba(10, 22, 40, 0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div className="about-pulse-play" style={{ position: "relative", width: "78px", height: "78px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ position: "absolute", inset: "-10px", borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", boxShadow: "0 0 0 1px rgba(255,255,255,0.1), 0 8px 32px rgba(0,0,0,0.15)" }} />
                      <div
                        style={{
                          width: "78px", height: "78px",
                          background: "linear-gradient(135deg, #e63946 0%, #c1202f 100%)",
                          borderRadius: "50%",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          border: "2.5px solid #ffffff",
                          boxShadow: "0 8px 28px rgba(230, 57, 70, 0.45), inset 0 1px 2px rgba(255,255,255,0.25)",
                          position: "relative", zIndex: 1,
                          transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1.08)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1)"; }}
                      >
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="#ffffff" style={{ marginLeft: "3px" }}>
                          <path d="M8 5.14v13.72c0 .88.96 1.42 1.71.95l11.42-6.86c.73-.44.73-1.46 0-1.9L9.71 4.19c-.75-.45-1.71.07-1.71.95z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <iframe
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                  src={`https://www.youtube.com/embed/${heroData.videoYoutubeId}?autoplay=1&mute=0&controls=1&loop=1&playlist=${heroData.videoYoutubeId}&enablejsapi=1&modestbranding=1&rel=0`}
                  title="About IINM Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              )}
            </div>
          </div>

          {/* Decorative glows */}
          <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "120px", height: "120px", background: "radial-gradient(circle, rgba(230, 57, 70, 0.1) 0%, transparent 70%)", zIndex: -1, pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: "-30px", left: "-30px", width: "140px", height: "140px", background: "radial-gradient(circle, rgba(10, 22, 40, 0.08) 0%, transparent 70%)", zIndex: -1, pointerEvents: "none" }} />
        </div>
      </div>
    </section>
  );
}
