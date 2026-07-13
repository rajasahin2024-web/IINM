"use client";
import React, { useEffect, useState } from "react";
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

interface FounderDeskData {
  id: number;
  badge_text: string;
  title: string;
  typewriter_words: string[];
  description: string;
  cta_text: string;
  cta_link: string;
  secondary_cta_text: string;
  secondary_cta_link: string;
  founder_image_url: string | null;
  founder_name: string | null;
  founder_role: string | null;
  founder_quote: string | null;
  right_card_title: string | null;
  right_card_body: string | null;
  background_image_url: string | null;
  video_youtube_id: string | null;
  is_active: boolean;
}

const DEFAULT_DATA: FounderDeskData = {
  id: 1,
  badge_text: "Industry Insights",
  title: "Industry Updates by",
  typewriter_words: ["Founder", "AI Trends", "Tech Insights", "Industry News"],
  description: "Stay ahead with curated insights, industry trends, and forward-looking analysis from our founder. Explore the latest in AI, technology, and education.",
  cta_text: "Read All Updates",
  cta_link: "/blog",
  secondary_cta_text: "Contact Us",
  secondary_cta_link: "/contact-us",
  founder_image_url: null,
  founder_name: "Founder Name",
  founder_role: "CEO & Co-Founder",
  founder_quote: "The future belongs to those who prepare for it today.",
  right_card_title: "Latest from the Founder",
  right_card_body: "Discover exclusive insights on AI evolution, emerging technologies, and how we are shaping the next generation of tech professionals.",
  background_image_url: null,
  video_youtube_id: null,
  is_active: true,
};

function isAdminLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  const loggedIn = localStorage.getItem("iinm_is_logged_in") === "true";
  const expiry = localStorage.getItem("iinm_login_expiry");
  if (!loggedIn) return false;
  if (expiry && new Date(expiry) < new Date()) {
    localStorage.removeItem("iinm_is_logged_in");
    localStorage.removeItem("iinm_login_expiry");
    return false;
  }
  return true;
}

function useTypewriter(words: string[], speed = 100, pause = 2500) {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!words.length) return;
    const word = words[currentIndex % words.length];
    let timer: ReturnType<typeof setTimeout>;

    if (isDeleting) {
      timer = setTimeout(() => {
        setDisplayText((prev) => prev.slice(0, -1));
        if (displayText.length <= 1) {
          setIsDeleting(false);
          setCurrentIndex((prev) => (prev + 1) % words.length);
        }
      }, speed / 2);
    } else {
      timer = setTimeout(() => {
        setDisplayText(word.slice(0, displayText.length + 1));
        if (displayText.length + 1 >= word.length) {
          timer = setTimeout(() => setIsDeleting(true), pause);
        }
      }, speed);
    }
    return () => clearTimeout(timer);
  }, [displayText, isDeleting, currentIndex, words, speed, pause]);

  return displayText;
}

export default function FounderDeskSection() {
  const [data, setData] = useState<FounderDeskData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<FounderDeskData>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [isPlayed, setIsPlayed] = useState(false);

  const typewriterText = useTypewriter(data.typewriter_words || [], 120, 2500);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/settings/founder-desk");
      if (res.ok) {
        const json = await res.json();
        if (json.section) setData({ ...DEFAULT_DATA, ...json.section });
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    setIsAdmin(isAdminLoggedIn());
    const onStorage = () => setIsAdmin(isAdminLoggedIn());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const openEditor = () => {
    setEditData({ ...data });
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await apiFetch("/api/settings/founder-desk", {
        method: "PUT",
        body: JSON.stringify(editData),
      });
      if (res.ok) { setIsEditing(false); fetchData(); }
    } catch { /* ignore */ } finally { setIsSaving(false); }
  };

  const handleUpload = async (
    field: "background_image_url" | "founder_image_url",
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (field === "background_image_url") setUploadingBg(true);
    else setUploadingThumb(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await apiFetch("/api/settings/site/upload", {
        method: "POST",
        body: fd,
      });
      if (res.ok) {
        const r = await res.json();
        setEditData((d: any) => ({ ...d, [field]: r.url }));
      }
    } catch { /* ignore */ } finally {
      if (field === "background_image_url") setUploadingBg(false);
      else setUploadingThumb(false);
    }
  };

  const bUrl =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_BASE_URL || `http://${window.location.hostname}:2007`
      : "";
  const founderImg = data.founder_image_url
    ? data.founder_image_url.startsWith("http")
      ? data.founder_image_url
      : `${bUrl}${data.founder_image_url}`
    : null;

  if (!data.is_active) return null;

  if (loading) {
    return (
      <section
        style={{
          position: "relative",
          background: "radial-gradient(circle at 30% 30%, #ffffff 0%, #f3f7ff 50%, #ebf1ff 100%)",
          minHeight: "580px",
          display: "flex",
          alignItems: "center",
          padding: "60px 0",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 1280,
            margin: "0 auto",
            padding: "0 48px",
            display: "grid",
            gridTemplateColumns: "1fr 1.25fr",
            gap: 48,
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="fd-skel" style={{ height: 28, borderRadius: 30, maxWidth: 260 }} />
            <div className="fd-skel" style={{ height: 120, borderRadius: 12 }} />
            <div className="fd-skel" style={{ height: 72, borderRadius: 12 }} />
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 4 }}>
              <div className="fd-skel" style={{ width: 140, height: 40, borderRadius: 8 }} />
              <div className="fd-skel" style={{ width: 140, height: 40, borderRadius: 8 }} />
            </div>
          </div>
          <div className="fd-skel" style={{ width: "100%", maxWidth: 680, paddingBottom: "56.25%", borderRadius: 8 }} />
        </div>
        <style>{`
          .fd-skel {
            background: linear-gradient(90deg, rgba(10,22,40,0.04) 25%, rgba(10,22,40,0.10) 50%, rgba(10,22,40,0.04) 75%);
            background-size: 200% 100%;
            animation: fd-shimmer 1.5s infinite;
          }
          @keyframes fd-shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </section>
    );
  }

  return (
    <>
      <section
        className="fd-hero-section"
        style={{
          position: "relative",
          background:
            "radial-gradient(circle at 30% 30%, #ffffff 0%, #f3f7ff 50%, #ebf1ff 100%)",
          minHeight: "580px",
          display: "flex",
          alignItems: "center",
          padding: "60px 48px",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        <style>{`
          .fd-hero-grid {
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
            .fd-hero-grid {
              gap: 32px;
              padding: 0;
            }
            .fd-hero-title-h1 {
              font-size: 38px !important;
            }
          }
          @media (max-width: 1100px) {
            .fd-hero-grid {
              grid-template-columns: 1fr 1fr;
              gap: 24px;
              padding: 0;
            }
            .fd-hero-title-h1 {
              font-size: 34px !important;
            }
          }
          .fd-hero-title-h1 {
            font-size: 44px;
            font-weight: 850;
            line-height: 1.15;
            letter-spacing: -1.2px;
            color: #0a1628;
            margin: 0;
            width: 100%;
          }
          .fd-hero-desc-p {
            font-size: 15px;
            line-height: 1.65;
            color: #475569;
            margin: 0;
            width: 100%;
          }
          .fd-cta-container {
            display: flex;
            gap: 16px;
            align-items: center;
            margin-top: 4px;
            flex-wrap: wrap;
          }
          .fd-cta-btn-primary {
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
            display: inline-flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
          }
          .fd-cta-btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(230, 57, 70, 0.3);
          }
          .fd-cta-btn-secondary {
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
            display: inline-flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
          }
          .fd-cta-btn-secondary:hover {
            background: #f1f5f9;
          }
          .fd-device-box {
            background: transparent;
            border-radius: 8px;
            border: none;
            padding: 0;
            width: 100%;
            max-width: 680px;
            position: relative;
            transition: transform 0.3s ease;
            overflow: visible;
          }
          .fd-device-inner {
            position: relative;
            width: 100%;
            padding-bottom: 56.25%;
            border-radius: 8px;
            overflow: hidden;
            background: transparent;
            box-shadow: 0 20px 45px -12px rgba(10, 22, 40, 0.25),
              0 0 30px rgba(0, 255, 102, 0.2);
            cursor: pointer;
          }
          @keyframes fd-ambientGlow {
            0%,
            100% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 0.85;
            }
            50% {
              transform: translate(-50%, -50%) scale(1.18);
              opacity: 1;
            }
          }
          @keyframes fd-rayRotate {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
          @keyframes fd-rayBeam {
            0%,
            100% {
              stroke-dasharray: 20, 80;
              stroke-dashoffset: 0;
              opacity: 0.45;
            }
            50% {
              stroke-dasharray: 80, 20;
              stroke-dashoffset: -45;
              opacity: 1;
            }
          }
          @keyframes fd-floatIcon {
            0%,
            100% {
              transform: translateY(0px) rotate(0deg);
              opacity: 0.18;
            }
            33% {
              transform: translateY(-14px) rotate(5deg);
              opacity: 0.28;
            }
            66% {
              transform: translateY(8px) rotate(-3deg);
              opacity: 0.22;
            }
          }
          @keyframes fd-pulseBadge {
            0%,
            100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.5;
              transform: scale(1.3);
            }
          }
          @keyframes fd-blink {
            0%,
            100% {
              opacity: 1;
            }
            50% {
              opacity: 0;
            }
          }
          @keyframes fd-pulsePlay {
            0% {
              transform: scale(1);
              box-shadow: 0 0 0 0 rgba(230, 57, 70, 0.4);
            }
            70% {
              transform: scale(1.08);
              box-shadow: 0 0 0 16px rgba(230, 57, 70, 0);
            }
            100% {
              transform: scale(1);
              box-shadow: 0 0 0 0 rgba(230, 57, 70, 0);
            }
          }
          @media (max-width: 991px) {
            .fd-hero-grid {
              grid-template-columns: 1fr;
              gap: 32px;
              padding: 0 !important;
            }
            .fd-hero-section {
              padding: 36px 24px !important;
              min-height: auto !important;
            }
            .fd-hero-title-h1 {
              font-size: 32px !important;
              letter-spacing: -0.8px;
            }
            .fd-device-box {
              max-width: 100%;
            }
            .fd-device-inner {
              padding-bottom: 56.25% !important;
            }
            .fd-cta-container {
              flex-direction: column;
              gap: 12px;
              width: 100%;
            }
            .fd-cta-btn-primary,
            .fd-cta-btn-secondary {
              width: 100%;
              box-sizing: border-box;
              padding: 14px 20px;
              font-size: 15px;
              justify-content: center;
            }
          }
          @media (max-width: 576px) {
            .fd-hero-section {
              padding: 24px 16px !important;
            }
            .fd-hero-title-h1 {
              font-size: 26px !important;
              text-align: center;
            }
            .fd-hero-desc-p {
              text-align: center;
            }
            .fd-cta-container {
              align-items: center;
            }
          }
        `}</style>

        {/* Floating AI Tool Icons Background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "10%",
              left: "5%",
              animation: "fd-floatIcon 9s ease-in-out infinite",
            }}
          >
            <ClaudeIcon size={44} />
          </div>
          <div
            style={{
              position: "absolute",
              top: "6%",
              left: "26%",
              animation: "fd-floatIcon 11s ease-in-out infinite 1s",
            }}
          >
            <ChatGPTIcon size={40} />
          </div>
          <div
            style={{
              position: "absolute",
              top: "16%",
              left: "46%",
              animation: "fd-floatIcon 8s ease-in-out infinite 2.3s",
            }}
          >
            <GeminiIcon size={42} />
          </div>
          <div
            style={{
              position: "absolute",
              top: "8%",
              left: "66%",
              animation: "fd-floatIcon 10s ease-in-out infinite 0.6s",
            }}
          >
            <GrokIcon size={38} />
          </div>
          <div
            style={{
              position: "absolute",
              top: "20%",
              left: "84%",
              animation: "fd-floatIcon 12s ease-in-out infinite 2.8s",
            }}
          >
            <CursorIcon size={38} />
          </div>
          <div
            style={{
              position: "absolute",
              top: "40%",
              left: "3%",
              animation: "fd-floatIcon 9.5s ease-in-out infinite 1.5s",
            }}
          >
            <WindsurfIcon size={42} />
          </div>
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "30%",
              animation: "fd-floatIcon 10s ease-in-out infinite 3.8s",
            }}
          >
            <KimiIcon size={40} />
          </div>
          <div
            style={{
              position: "absolute",
              top: "44%",
              left: "56%",
              animation: "fd-floatIcon 11s ease-in-out infinite 1.9s",
            }}
          >
            <QwenIcon size={40} />
          </div>
          <div
            style={{
              position: "absolute",
              top: "56%",
              left: "76%",
              animation: "fd-floatIcon 8.5s ease-in-out infinite 0.4s",
            }}
          >
            <NvidiaIcon size={46} />
          </div>
          <div
            style={{
              position: "absolute",
              top: "72%",
              left: "12%",
              animation: "fd-floatIcon 10s ease-in-out infinite 3.2s",
            }}
          >
            <MicrosoftIcon size={40} />
          </div>
          <div
            style={{
              position: "absolute",
              top: "80%",
              left: "44%",
              animation: "fd-floatIcon 13s ease-in-out infinite 4.5s",
            }}
          >
            <ChatGPTIcon size={34} />
          </div>
          <div
            style={{
              position: "absolute",
              top: "64%",
              left: "90%",
              animation: "fd-floatIcon 9s ease-in-out infinite 0.9s",
            }}
          >
            <GrokIcon size={36} />
          </div>
          <div
            style={{
              position: "absolute",
              top: "28%",
              left: "52%",
              animation: "fd-floatIcon 12s ease-in-out infinite 5.5s",
            }}
          >
            <GeminiIcon size={32} />
          </div>
        </div>

        <div className="fd-hero-grid">
          {/* Left Column */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            {/* Badge */}
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
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
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "#e63946",
                      animation: "fd-pulseBadge 1.5s infinite",
                    }}
                  />
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "#0a1628",
                    }}
                  />
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
                  {data.badge_text}
                </span>
              </div>
            </div>

            {/* Title with Typewriter */}
            <h1 className="fd-hero-title-h1">
              {data.title}{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #e63946 0%, #a21824 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  display: "inline",
                }}
              >
                {typewriterText}
              </span>
              <span
                style={{
                  display: "inline-block",
                  color: "#e63946",
                  fontWeight: 300,
                  animation: "fd-blink 1s step-end infinite",
                  marginLeft: "2px",
                }}
              >
                |
              </span>
            </h1>

            {/* Description */}
            <p className="fd-hero-desc-p">{data.description}</p>

            {/* CTAs */}
            <div className="fd-cta-container">
              <Link href={data.cta_link || "/blog"} className="fd-cta-btn-primary">
                {data.cta_text || "Read All Updates"}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href={data.secondary_cta_link || "/contact-us"}
                className="fd-cta-btn-secondary"
              >
                {data.secondary_cta_text || "Contact Us"}
              </Link>
            </div>

            {/* Admin Edit */}
            {isAdmin && (
              <button
                onClick={openEditor}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  marginTop: "8px",
                  padding: "6px 14px",
                  borderRadius: "6px",
                  border: "1px solid rgba(10,22,40,0.15)",
                  background: "rgba(10,22,40,0.06)",
                  color: "#0a1628",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  alignSelf: "flex-start",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                Edit Section
              </button>
            )}
          </div>

          {/* Right Column — Device Box */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              position: "relative",
              width: "100%",
            }}
          >
            <div className="fd-device-box">
              {/* Neon glow + rays behind */}
              <div
                style={{
                  position: "absolute",
                  inset: "-100px",
                  zIndex: 0,
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "100%",
                    height: "100%",
                    background:
                      "radial-gradient(circle, rgba(0, 255, 102, 0.55) 0%, rgba(0, 229, 117, 0.22) 40%, transparent 70%)",
                    filter: "blur(35px)",
                    borderRadius: "50%",
                    animation: "fd-ambientGlow 5s infinite ease-in-out",
                  }}
                />
                <svg
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    transformOrigin: "center",
                    animation: "fd-rayRotate 60s linear infinite",
                  }}
                  viewBox="0 0 200 200"
                >
                  <defs>
                    <linearGradient
                      id="fd-rayGrad1"
                      x1="0%"
                      y1="100%"
                      x2="0%"
                      y2="0%"
                    >
                      <stop
                        offset="0%"
                        stopColor="#00ff66"
                        stopOpacity="0.95"
                      />
                      <stop
                        offset="60%"
                        stopColor="#00e575"
                        stopOpacity="0.45"
                      />
                      <stop
                        offset="100%"
                        stopColor="#ffffff"
                        stopOpacity="0"
                      />
                    </linearGradient>
                    <linearGradient
                      id="fd-rayGrad2"
                      x1="0%"
                      y1="100%"
                      x2="0%"
                      y2="0%"
                    >
                      <stop
                        offset="0%"
                        stopColor="#00ff87"
                        stopOpacity="0.9"
                      />
                      <stop
                        offset="60%"
                        stopColor="#00cc55"
                        stopOpacity="0.4"
                      />
                      <stop
                        offset="100%"
                        stopColor="#ffffff"
                        stopOpacity="0"
                      />
                    </linearGradient>
                    <filter id="fd-rayGlow">
                      <feGaussianBlur
                        stdDeviation="3.5"
                        result="coloredBlur"
                      />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  {Array.from({ length: 24 }).map((_, i) => {
                    const angle = (i * 360) / 24;
                    const isEven = i % 2 === 0;
                    return (
                      <line
                        key={i}
                        x1="100"
                        y1="100"
                        x2="100"
                        y2="0"
                        stroke={
                          isEven ? "url(#fd-rayGrad1)" : "url(#fd-rayGrad2)"
                        }
                        strokeWidth={isEven ? "3" : "1.8"}
                        strokeLinecap="round"
                        filter="url(#fd-rayGlow)"
                        transform={`rotate(${angle} 100 100)`}
                        style={{
                          animation: `fd-rayBeam ${3.5 + (i % 3) * 1.2}s infinite ease-in-out`,
                          animationDelay: `${i * 0.15}s`,
                        }}
                      />
                    );
                  })}
                </svg>
              </div>

              {/* Inner content */}
              <div
                className="fd-device-inner"
                onClick={() =>
                  data.video_youtube_id && !isPlayed && setIsPlayed(true)
                }
              >
                {data.video_youtube_id && isPlayed ? (
                  <iframe
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      border: "none",
                    }}
                    src={`https://www.youtube.com/embed/${data.video_youtube_id}?autoplay=1&mute=0&controls=1&loop=1&playlist=${data.video_youtube_id}&enablejsapi=1&modestbranding=1&rel=0`}
                    title="Founder Desk Video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                ) : data.video_youtube_id ? (
                  <>
                    <img
                      src={`https://img.youtube.com/vi/${data.video_youtube_id}/hqdefault.jpg`}
                      alt="Video Thumbnail"
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
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
                      <div
                        style={{
                          width: "68px",
                          height: "68px",
                          background: "#e63946",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "3px solid #ffffff",
                          boxShadow: "0 10px 30px rgba(230, 57, 70, 0.5)",
                          animation: "fd-pulsePlay 2s infinite cubic-bezier(0.4, 0, 0.2, 1)",
                        }}
                      >
                        <svg
                          width="22"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="#ffffff"
                          style={{ marginLeft: "4px" }}
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </>
                ) : founderImg ? (
                  <img
                    src={founderImg}
                    alt={data.founder_name || "Founder"}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "linear-gradient(135deg, #0a1628 0%, #1e3a5f 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      width="64"
                      height="64"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="rgba(255,255,255,0.3)"
                      strokeWidth="1"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Decorative glows */}
              <div
                style={{
                  position: "absolute",
                  top: "-20px",
                  right: "-20px",
                  width: "120px",
                  height: "120px",
                  background:
                    "radial-gradient(circle, rgba(230, 57, 70, 0.1) 0%, transparent 70%)",
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
                  background:
                    "radial-gradient(circle, rgba(10, 22, 40, 0.08) 0%, transparent 70%)",
                  zIndex: -1,
                  pointerEvents: "none",
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Admin Edit Modal */}
      {isEditing && (
        <div className="rlc-modal-backdrop" onClick={() => setIsEditing(false)}>
          <div
            className="rlc-modal rlc-modal-wide"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rlc-modal-header">
              <h3>Edit Founder Desk Section</h3>
              <button
                className="rlc-modal-close"
                onClick={() => setIsEditing(false)}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="rlc-modal-body">
              <div className="rlc-form-row">
                <div className="rlc-form-group">
                  <label>Badge Text</label>
                  <input
                    type="text"
                    value={editData.badge_text || ""}
                    onChange={(e) =>
                      setEditData((d) => ({
                        ...d,
                        badge_text: e.target.value,
                      }))
                    }
                    className="rlc-form-input"
                  />
                </div>
                <div className="rlc-form-group">
                  <label>Title (before typewriter)</label>
                  <input
                    type="text"
                    value={editData.title || ""}
                    onChange={(e) =>
                      setEditData((d) => ({
                        ...d,
                        title: e.target.value,
                      }))
                    }
                    className="rlc-form-input"
                  />
                </div>
              </div>
              <div className="rlc-form-group">
                <label>Typewriter Words (comma separated)</label>
                <input
                  type="text"
                  value={(editData.typewriter_words || []).join(", ")}
                  onChange={(e) =>
                    setEditData((d) => ({
                      ...d,
                      typewriter_words: e.target.value
                        .split(",")
                        .map((w) => w.trim())
                        .filter(Boolean),
                    }))
                  }
                  className="rlc-form-input"
                  placeholder="Founder, AI Trends, Tech Insights"
                />
              </div>
              <div className="rlc-form-group">
                <label>Description</label>
                <textarea
                  value={editData.description || ""}
                  onChange={(e) =>
                    setEditData((d) => ({
                      ...d,
                      description: e.target.value,
                    }))
                  }
                  className="rlc-form-textarea"
                  rows={3}
                />
              </div>
              <div className="rlc-form-row">
                <div className="rlc-form-group">
                  <label>Primary CTA Text</label>
                  <input
                    type="text"
                    value={editData.cta_text || ""}
                    onChange={(e) =>
                      setEditData((d) => ({
                        ...d,
                        cta_text: e.target.value,
                      }))
                    }
                    className="rlc-form-input"
                  />
                </div>
                <div className="rlc-form-group">
                  <label>Primary CTA Link</label>
                  <input
                    type="text"
                    value={editData.cta_link || ""}
                    onChange={(e) =>
                      setEditData((d) => ({
                        ...d,
                        cta_link: e.target.value,
                      }))
                    }
                    className="rlc-form-input"
                  />
                </div>
              </div>
              <div className="rlc-form-row">
                <div className="rlc-form-group">
                  <label>Secondary CTA Text</label>
                  <input
                    type="text"
                    value={editData.secondary_cta_text || ""}
                    onChange={(e) =>
                      setEditData((d) => ({
                        ...d,
                        secondary_cta_text: e.target.value,
                      }))
                    }
                    className="rlc-form-input"
                  />
                </div>
                <div className="rlc-form-group">
                  <label>Secondary CTA Link</label>
                  <input
                    type="text"
                    value={editData.secondary_cta_link || ""}
                    onChange={(e) =>
                      setEditData((d) => ({
                        ...d,
                        secondary_cta_link: e.target.value,
                      }))
                    }
                    className="rlc-form-input"
                  />
                </div>
              </div>
              <div className="rlc-form-row">
                <div className="rlc-form-group">
                  <label>Founder Name</label>
                  <input
                    type="text"
                    value={editData.founder_name || ""}
                    onChange={(e) =>
                      setEditData((d) => ({
                        ...d,
                        founder_name: e.target.value,
                      }))
                    }
                    className="rlc-form-input"
                  />
                </div>
                <div className="rlc-form-group">
                  <label>Founder Role</label>
                  <input
                    type="text"
                    value={editData.founder_role || ""}
                    onChange={(e) =>
                      setEditData((d) => ({
                        ...d,
                        founder_role: e.target.value,
                      }))
                    }
                    className="rlc-form-input"
                  />
                </div>
              </div>
              <div className="rlc-form-group">
                <label>Founder Quote</label>
                <textarea
                  value={editData.founder_quote || ""}
                  onChange={(e) =>
                    setEditData((d) => ({
                      ...d,
                      founder_quote: e.target.value,
                    }))
                  }
                  className="rlc-form-textarea"
                  rows={2}
                />
              </div>
              <div className="rlc-form-row">
                <div className="rlc-form-group">
                  <label>YouTube Video ID (optional)</label>
                  <input
                    type="text"
                    value={editData.video_youtube_id || ""}
                    onChange={(e) =>
                      setEditData((d) => ({
                        ...d,
                        video_youtube_id: e.target.value,
                      }))
                    }
                    className="rlc-form-input"
                    placeholder="e.g. FwOTs4UxQS4"
                  />
                </div>
              </div>
              <div className="rlc-form-group">
                <label>Founder Image</label>
                <div className="rlc-bg-upload-row">
                  <button
                    className="rlc-upload-btn"
                    onClick={() => {
                      const input = document.getElementById(
                        "fd-founder-img-input"
                      ) as HTMLInputElement;
                      input?.click();
                    }}
                    disabled={uploadingThumb}
                  >
                    {uploadingThumb
                      ? "Uploading..."
                      : "Upload Founder Image"}
                  </button>
                  <input
                    id="fd-founder-img-input"
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) =>
                      handleUpload("founder_image_url", e)
                    }
                  />
                  {editData.founder_image_url && (
                    <button
                      className="rlc-remove-bg-btn"
                      onClick={() =>
                        setEditData((d) => ({
                          ...d,
                          founder_image_url: "",
                        }))
                      }
                    >
                      Remove Image
                    </button>
                  )}
                </div>
                {editData.founder_image_url && (
                  <div className="rlc-bg-preview">
                    <img
                      src={
                        editData.founder_image_url.startsWith("http")
                          ? editData.founder_image_url
                          : bUrl + editData.founder_image_url
                      }
                      alt="Founder"
                    />
                  </div>
                )}
              </div>
              <div className="rlc-form-group">
                <label>Background Pattern Image</label>
                <div className="rlc-bg-upload-row">
                  <button
                    className="rlc-upload-btn"
                    onClick={() => {
                      const input = document.getElementById(
                        "fd-bg-input"
                      ) as HTMLInputElement;
                      input?.click();
                    }}
                    disabled={uploadingBg}
                  >
                    {uploadingBg
                      ? "Uploading..."
                      : "Upload Background Image"}
                  </button>
                  <input
                    id="fd-bg-input"
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) =>
                      handleUpload("background_image_url", e)
                    }
                  />
                  {editData.background_image_url && (
                    <button
                      className="rlc-remove-bg-btn"
                      onClick={() =>
                        setEditData((d) => ({
                          ...d,
                          background_image_url: "",
                        }))
                      }
                    >
                      Remove Background
                    </button>
                  )}
                </div>
                {editData.background_image_url && (
                  <div className="rlc-bg-preview">
                    <img
                      src={
                        editData.background_image_url.startsWith("http")
                          ? editData.background_image_url
                          : bUrl + editData.background_image_url
                      }
                      alt="Background"
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="rlc-modal-footer">
              <button
                className="rlc-btn-secondary"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </button>
              <button
                className="rlc-btn-primary"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
