"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import PublicNavbar from "@/components/PublicNavbar";
import PublicFooter from "@/components/PublicFooter";
import { API_BASE_URL, BACKEND_BASE_URL } from "@/lib/config";
import { apiFetch } from "@/lib/apiFetch";
import "./mission-vision.css";

// ── Types ──
interface MissionVisionData {
  hero_eyebrow?: string;
  hero_title?: string;
  hero_text?: string;
  hero_stats_json?: string;
  hero_credentials_json?: string;

  trust_eyebrow?: string;
  trust_title?: string;
  trust_desc?: string;
  trust_cards_json?: string;

  pillars_eyebrow?: string;
  pillars_title?: string;
  pillars_desc?: string;
  mission_tag?: string;
  mission_title?: string;
  mission_statement?: string;
  mission_points_json?: string;
  vision_tag?: string;
  vision_title?: string;
  vision_statement?: string;
  vision_points_json?: string;

  objectives_eyebrow?: string;
  objectives_title?: string;
  objectives_desc?: string;
  objectives_cards_json?: string;

  values_eyebrow?: string;
  values_title?: string;
  values_desc?: string;
  values_cards_json?: string;
  director_quote?: string;
  director_name?: string;
  director_title?: string;
  director_image_url?: string;

  cta_title?: string;
  cta_desc?: string;
  cta_primary_btn_text?: string;
  cta_primary_btn_link?: string;
  cta_secondary_btn_text?: string;
  cta_secondary_btn_link?: string;

  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  canonical_url?: string;
  og_image_url?: string;
  aeo_faqs_json?: string;
}

type EditorModalType = "hero" | "trust" | "pillars" | "objectives" | "values" | "cta" | "seo" | null;

// ── Interactive Network Grid Canvas ──
function NetworkGridCanvas({ mousePos }: { mousePos: { x: number; y: number } }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener("resize", handleResize);

    const nodeCount = Math.min(Math.max(Math.floor((width * height) / 16000), 28), 50);
    const nodes: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      isRed: boolean;
    }> = [];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 1.5 + 1.5,
        isRed: Math.random() < 0.2,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Gridlines
      const gridSize = 60;
      ctx.strokeStyle = "rgba(10, 22, 40, 0.035)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // 2. Nodes and connections
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;

        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;

        ctx.fillStyle = n.isRed ? "rgba(230, 57, 70, 0.55)" : "rgba(10, 22, 40, 0.25)";
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n.x - n2.x;
          const dy = n.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            const alpha = (1 - dist / 120) * 0.1;
            ctx.strokeStyle = n.isRed || n2.isRed ? `rgba(230, 57, 70, ${alpha * 1.6})` : `rgba(10, 22, 40, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();
          }
        }

        if (mousePos.x >= 0 && mousePos.y >= 0) {
          const mdx = n.x - mousePos.x;
          const mdy = n.y - mousePos.y;
          const mDist = Math.sqrt(mdx * mdx + mdy * mdy);

          if (mDist < 140) {
            const mAlpha = (1 - mDist / 140) * 0.4;
            ctx.strokeStyle = `rgba(230, 57, 70, ${mAlpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(mousePos.x, mousePos.y);
            ctx.stroke();

            ctx.fillStyle = "rgba(230, 57, 70, 0.75)";
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.radius + 1.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [mousePos]);

  return <canvas ref={canvasRef} className="mv-hero-canvas" />;
}

// ── Safe JSON Parser ──
function parseJsonSafe<T>(jsonStr?: string, fallback: T = [] as any): T {
  if (!jsonStr) return fallback;
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    return fallback;
  }
}

export default function MissionVisionClientView({ initialData }: { initialData: MissionVisionData }) {
  // Pre-populated directly from server SSR (Instant 0ms first render!)
  const [data, setData] = useState<MissionVisionData>(initialData);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(0);

  // Mouse hover state for canvas
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  const handleMouseLeave = () => setMousePos({ x: -1000, y: -1000 });

  // Modal Editor state
  const [editorModal, setEditorModal] = useState<EditorModalType>(null);
  const [formState, setFormState] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [modalStatus, setModalStatus] = useState<{ msg: string; type: "success" | "error" | "" }>({ msg: "", type: "" });

  // Check admin session
  useEffect(() => {
    const checkAdmin = () => {
      const loggedIn = localStorage.getItem("iinm_is_logged_in") === "true";
      const expiry = localStorage.getItem("iinm_login_expiry");
      const valid = loggedIn && expiry ? Date.now() < Number(expiry) : false;
      setIsAdmin(valid);
    };
    checkAdmin();
    const interval = setInterval(checkAdmin, 3000);
    return () => clearInterval(interval);
  }, []);

  // Open editor modal populated with current values
  const handleOpenEditor = (type: EditorModalType) => {
    setEditorModal(type);
    setModalStatus({ msg: "", type: "" });

    if (type === "hero") {
      setFormState({
        hero_eyebrow: data.hero_eyebrow || "",
        hero_title: data.hero_title || "",
        hero_text: data.hero_text || "",
        hero_stats: parseJsonSafe<string[]>(data.hero_stats_json, []),
        hero_credentials: parseJsonSafe<Array<{ title: string; sub: string }>>(data.hero_credentials_json, []),
      });
    } else if (type === "trust") {
      setFormState({
        trust_eyebrow: data.trust_eyebrow || "",
        trust_title: data.trust_title || "",
        trust_desc: data.trust_desc || "",
        trust_cards: parseJsonSafe<Array<{ badge: string; title: string; desc: string }>>(data.trust_cards_json, []),
      });
    } else if (type === "pillars") {
      setFormState({
        pillars_eyebrow: data.pillars_eyebrow || "",
        pillars_title: data.pillars_title || "",
        pillars_desc: data.pillars_desc || "",
        mission_tag: data.mission_tag || "",
        mission_title: data.mission_title || "",
        mission_statement: data.mission_statement || "",
        mission_points: parseJsonSafe<Array<{ title: string; desc: string }>>(data.mission_points_json, []),
        vision_tag: data.vision_tag || "",
        vision_title: data.vision_title || "",
        vision_statement: data.vision_statement || "",
        vision_points: parseJsonSafe<Array<{ title: string; desc: string }>>(data.vision_points_json, []),
      });
    } else if (type === "objectives") {
      setFormState({
        objectives_eyebrow: data.objectives_eyebrow || "",
        objectives_title: data.objectives_title || "",
        objectives_desc: data.objectives_desc || "",
        objectives_cards: parseJsonSafe<Array<{ num: string; category: string; title: string; desc: string }>>(data.objectives_cards_json, []),
      });
    } else if (type === "values") {
      setFormState({
        values_eyebrow: data.values_eyebrow || "",
        values_title: data.values_title || "",
        values_desc: data.values_desc || "",
        values_cards: parseJsonSafe<Array<{ title: string; desc: string }>>(data.values_cards_json, []),
        director_quote: data.director_quote || "",
        director_name: data.director_name || "",
        director_title: data.director_title || "",
        director_image_url: data.director_image_url || "",
      });
    } else if (type === "cta") {
      setFormState({
        cta_title: data.cta_title || "",
        cta_desc: data.cta_desc || "",
        cta_primary_btn_text: data.cta_primary_btn_text || "",
        cta_primary_btn_link: data.cta_primary_btn_link || "",
        cta_secondary_btn_text: data.cta_secondary_btn_text || "",
        cta_secondary_btn_link: data.cta_secondary_btn_link || "",
      });
    } else if (type === "seo") {
      setFormState({
        seo_title: data.seo_title || "",
        seo_description: data.seo_description || "",
        seo_keywords: data.seo_keywords || "",
        canonical_url: data.canonical_url || "",
        og_image_url: data.og_image_url || "",
        aeo_faqs: parseJsonSafe<Array<{ q: string; a: string }>>(data.aeo_faqs_json, []),
      });
    }
  };

  // Save changes to backend
  const handleSaveModal = async () => {
    try {
      setSaving(true);
      setModalStatus({ msg: "", type: "" });

      let payload: Partial<MissionVisionData> = {};

      if (editorModal === "hero") {
        payload = {
          hero_eyebrow: formState.hero_eyebrow,
          hero_title: formState.hero_title,
          hero_text: formState.hero_text,
          hero_stats_json: JSON.stringify(formState.hero_stats || []),
          hero_credentials_json: JSON.stringify(formState.hero_credentials || []),
        };
      } else if (editorModal === "trust") {
        payload = {
          trust_eyebrow: formState.trust_eyebrow,
          trust_title: formState.trust_title,
          trust_desc: formState.trust_desc,
          trust_cards_json: JSON.stringify(formState.trust_cards || []),
        };
      } else if (editorModal === "pillars") {
        payload = {
          pillars_eyebrow: formState.pillars_eyebrow,
          pillars_title: formState.pillars_title,
          pillars_desc: formState.pillars_desc,
          mission_tag: formState.mission_tag,
          mission_title: formState.mission_title,
          mission_statement: formState.mission_statement,
          mission_points_json: JSON.stringify(formState.mission_points || []),
          vision_tag: formState.vision_tag,
          vision_title: formState.vision_title,
          vision_statement: formState.vision_statement,
          vision_points_json: JSON.stringify(formState.vision_points || []),
        };
      } else if (editorModal === "objectives") {
        payload = {
          objectives_eyebrow: formState.objectives_eyebrow,
          objectives_title: formState.objectives_title,
          objectives_desc: formState.objectives_desc,
          objectives_cards_json: JSON.stringify(formState.objectives_cards || []),
        };
      } else if (editorModal === "values") {
        payload = {
          values_eyebrow: formState.values_eyebrow,
          values_title: formState.values_title,
          values_desc: formState.values_desc,
          values_cards_json: JSON.stringify(formState.values_cards || []),
          director_quote: formState.director_quote,
          director_name: formState.director_name,
          director_title: formState.director_title,
          director_image_url: formState.director_image_url,
        };
      } else if (editorModal === "cta") {
        payload = {
          cta_title: formState.cta_title,
          cta_desc: formState.cta_desc,
          cta_primary_btn_text: formState.cta_primary_btn_text,
          cta_primary_btn_link: formState.cta_primary_btn_link,
          cta_secondary_btn_text: formState.cta_secondary_btn_text,
          cta_secondary_btn_link: formState.cta_secondary_btn_link,
        };
      } else if (editorModal === "seo") {
        payload = {
          seo_title: formState.seo_title,
          seo_description: formState.seo_description,
          seo_keywords: formState.seo_keywords,
          canonical_url: formState.canonical_url,
          og_image_url: formState.og_image_url,
          aeo_faqs_json: JSON.stringify(formState.aeo_faqs || []),
        };
      }

      const res = await apiFetch(`${API_BASE_URL}/mission-vision/data`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setModalStatus({ msg: "Saved successfully to database!", type: "success" });
        setData((prev) => ({ ...prev, ...payload }));
        setTimeout(() => {
          setEditorModal(null);
        }, 900);
      } else {
        setModalStatus({ msg: "Failed to save. Verify admin login.", type: "error" });
      }
    } catch (e) {
      setModalStatus({ msg: "Connection error while saving.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Image uploader handler
  const handleUploadDirectorImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiFetch(`${API_BASE_URL}/mission-vision/upload-image`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        setFormState((prev) => ({ ...prev, director_image_url: json.url }));
        setModalStatus({ msg: "Image uploaded! Click Save to apply.", type: "success" });
      } else {
        setModalStatus({ msg: "Image upload failed.", type: "error" });
      }
    } catch {
      setModalStatus({ msg: "Upload error.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Resolve media URLs
  const resolveImage = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${BACKEND_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  // Parsed content
  const heroStats = parseJsonSafe<string[]>(data.hero_stats_json, []);
  const heroCredentials = parseJsonSafe<Array<{ title: string; sub: string }>>(data.hero_credentials_json, []);
  const trustCards = parseJsonSafe<Array<{ badge: string; title: string; desc: string }>>(data.trust_cards_json, []);
  const missionPoints = parseJsonSafe<Array<{ title: string; desc: string }>>(data.mission_points_json, []);
  const visionPoints = parseJsonSafe<Array<{ title: string; desc: string }>>(data.vision_points_json, []);
  const objectiveCards = parseJsonSafe<Array<{ num: string; category: string; title: string; desc: string }>>(data.objectives_cards_json, []);
  const valueCards = parseJsonSafe<Array<{ title: string; desc: string }>>(data.values_cards_json, []);
  const aeoFaqs = parseJsonSafe<Array<{ q: string; a: string }>>(data.aeo_faqs_json, []);

  return (
    <div className="mv-page">
      <PublicNavbar />

      {/* ── Breadcrumb Bar ── */}
      <div className="mv-breadcrumb-wrapper">
        <div className="mv-container">
          <nav className="mv-breadcrumb-bar" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="mv-breadcrumb-sep">/</span>
            <Link href="/about-iinm">About</Link>
            <span className="mv-breadcrumb-sep">/</span>
            <span className="mv-breadcrumb-active">Mission & Vision</span>
          </nav>
        </div>
      </div>

      <main>
        {/* ══════════════════════════════════════════════════════════
            SECTION 1: HERO (LIGHT)
            ══════════════════════════════════════════════════════════ */}
        <section 
          className="mv-hero-section"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <NetworkGridCanvas mousePos={mousePos} />

          <div className="mv-container mv-hero-inner">
            {isAdmin && (
              <div className="mv-admin-edit-bar">
                <button type="button" onClick={() => handleOpenEditor("hero")} className="mv-admin-edit-btn">
                  <span>✎ Edit Hero Section</span>
                </button>
              </div>
            )}

            <div className="mv-hero-grid">
              {/* Left Column: Eyebrow, Title, Narrative, Stats */}
              <div className="mv-hero-left">
                <div className="mv-eyebrow-tag">
                  {data.hero_eyebrow || "INSTITUTIONAL MANDATE"}
                </div>

                <h1 className="mv-hero-heading">
                  {data.hero_title ? (
                    data.hero_title
                  ) : (
                    <>Our <span>Mission</span> & <span>Vision</span></>
                  )}
                </h1>

                <p className="mv-hero-text">
                  {data.hero_text}
                </p>

                {heroStats.length > 0 && (
                  <div className="mv-hero-stats-row">
                    {heroStats.map((stat, idx) => (
                      <div key={idx} className="mv-hero-stat-item">
                        <span className="mv-hero-stat-bullet" />
                        <span>{stat}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Institutional Overview & Credential Matrix Card */}
              <div className="mv-hero-credentials-card">
                <div className="mv-hero-card-header">
                  <span className="mv-hero-card-title">Institutional Credentials</span>
                  <span className="mv-hero-card-tag">Accredited Hub</span>
                </div>

                <div className="mv-hero-card-list">
                  {heroCredentials.map((row, idx) => (
                    <div key={idx} className="mv-hero-card-row">
                      <span className="mv-hero-card-dot" />
                      <div>
                        <div className="mv-hero-card-row-title">{row.title}</div>
                        <div className="mv-hero-card-row-sub">{row.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION 2: STATUTORY ACCREDITATIONS & TRUST (DARK)
            ══════════════════════════════════════════════════════════ */}
        <section className="mv-dark-section">
          <div className="mv-container">
            {isAdmin && (
              <div className="mv-admin-edit-bar">
                <button type="button" onClick={() => handleOpenEditor("trust")} className="mv-admin-edit-btn mv-admin-edit-btn-dark">
                  <span>✎ Edit Accreditations</span>
                </button>
              </div>
            )}

            <div className="mv-section-header-dark">
              <div className="mv-eyebrow-tag mv-eyebrow-tag-dark">
                {data.trust_eyebrow || "STATUTORY RECOGNITION"}
              </div>
              <h2>{data.trust_title}</h2>
              <p>{data.trust_desc}</p>
            </div>

            <div className="mv-trust-grid">
              {trustCards.map((card, idx) => (
                <div key={idx} className="mv-trust-card">
                  <span className="mv-trust-badge-label">{card.badge}</span>
                  <h3>{card.title}</h3>
                  <p>{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION 3: THE TWIN PILLARS (LIGHT)
            ══════════════════════════════════════════════════════════ */}
        <section className="mv-light-section">
          <div className="mv-container">
            {isAdmin && (
              <div className="mv-admin-edit-bar">
                <button type="button" onClick={() => handleOpenEditor("pillars")} className="mv-admin-edit-btn">
                  <span>✎ Edit Mission & Vision</span>
                </button>
              </div>
            )}

            <div className="mv-section-header-light">
              <div className="mv-eyebrow-tag">
                {data.pillars_eyebrow || "FOUNDATIONAL PILLARS"}
              </div>
              <h2>{data.pillars_title}</h2>
              <p>{data.pillars_desc}</p>
            </div>

            <div className="mv-pillars-container">
              {/* Mission Card */}
              <article className="mv-pillar-box mv-pillar-mission">
                <div className="mv-pillar-header-row">
                  <span className="mv-pillar-tag">{data.mission_tag || "OUR DAILY MISSION"}</span>
                  <span className="mv-pillar-number">PILLAR 01</span>
                </div>

                <h3>{data.mission_title || "Mission of IINM"}</h3>
                <p className="mv-pillar-desc">{data.mission_statement}</p>

                <div className="mv-pillar-list-title">Key Mission Objectives</div>
                <ul className="mv-pillar-items">
                  {missionPoints.map((item, idx) => (
                    <li key={idx} className="mv-pillar-item">
                      <span className="mv-pillar-bullet" />
                      <span><strong>{item.title}:</strong> {item.desc}</span>
                    </li>
                  ))}
                </ul>
              </article>

              {/* Vision Card */}
              <article className="mv-pillar-box mv-pillar-vision">
                <div className="mv-pillar-header-row">
                  <span className="mv-pillar-tag">{data.vision_tag || "OUR STRATEGIC HORIZON"}</span>
                  <span className="mv-pillar-number">PILLAR 02</span>
                </div>

                <h3>{data.vision_title || "Vision of IINM"}</h3>
                <p className="mv-pillar-desc">{data.vision_statement}</p>

                <div className="mv-pillar-list-title">Future Institutional Goals</div>
                <ul className="mv-pillar-items">
                  {visionPoints.map((item, idx) => (
                    <li key={idx} className="mv-pillar-item">
                      <span className="mv-pillar-bullet" />
                      <span><strong>{item.title}:</strong> {item.desc}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION 4: STRATEGIC OBJECTIVES (DARK - Navy Mid)
            ══════════════════════════════════════════════════════════ */}
        <section className="mv-objectives-section">
          <div className="mv-container">
            {isAdmin && (
              <div className="mv-admin-edit-bar">
                <button type="button" onClick={() => handleOpenEditor("objectives")} className="mv-admin-edit-btn mv-admin-edit-btn-dark">
                  <span>✎ Edit Objectives</span>
                </button>
              </div>
            )}

            <div className="mv-section-header-dark">
              <div className="mv-eyebrow-tag mv-eyebrow-tag-dark">
                {data.objectives_eyebrow || "STRATEGIC FOCUS"}
              </div>
              <h2>{data.objectives_title}</h2>
              <p>{data.objectives_desc}</p>
            </div>

            <div className="mv-objectives-grid">
              {objectiveCards.map((card, idx) => (
                <div key={idx} className="mv-obj-card">
                  <div className="mv-obj-top-row">
                    <span className="mv-obj-num">{card.num}</span>
                    <span className="mv-obj-category">{card.category}</span>
                  </div>
                  <h3>{card.title}</h3>
                  <p>{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION 5: CORE VALUES & LEADERSHIP (LIGHT)
            ══════════════════════════════════════════════════════════ */}
        <section className="mv-values-leadership-section">
          <div className="mv-container">
            {isAdmin && (
              <div className="mv-admin-edit-bar">
                <button type="button" onClick={() => handleOpenEditor("values")} className="mv-admin-edit-btn">
                  <span>✎ Edit Values & Leadership</span>
                </button>
              </div>
            )}

            <div className="mv-section-header-light">
              <div className="mv-eyebrow-tag">
                {data.values_eyebrow || "INSTITUTIONAL PRINCIPLES"}
              </div>
              <h2>{data.values_title}</h2>
              <p>{data.values_desc}</p>
            </div>

            <div className="mv-values-grid">
              {valueCards.map((val, idx) => (
                <div key={idx} className="mv-value-box">
                  <h3>{val.title}</h3>
                  <p>{val.desc}</p>
                </div>
              ))}
            </div>

            {data.director_quote && (
              <div className="mv-director-editorial">
                <div>
                  <blockquote>“{data.director_quote}”</blockquote>
                  <div className="mv-director-meta">
                    <span className="mv-director-name">{data.director_name}</span>
                    <span className="mv-director-role">{data.director_title || "Academic Directorate, IINM"}</span>
                  </div>
                </div>

                {data.director_image_url && (
                  <div className="mv-director-photo-container">
                    <Image
                      src={resolveImage(data.director_image_url)}
                      alt={data.director_name || "Academic Leadership"}
                      fill
                      style={{ objectFit: "cover" }}
                      unoptimized
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION 6: VISUAL AEO FAQ ACCORDION (LIGHT)
            ══════════════════════════════════════════════════════════ */}
        {aeoFaqs.length > 0 && (
          <section className="mv-faq-section">
            <div className="mv-container">
              {isAdmin && (
                <div className="mv-admin-edit-bar">
                  <button type="button" onClick={() => handleOpenEditor("seo")} className="mv-admin-edit-btn">
                    <span>✎ Edit SEO & AEO Engine</span>
                  </button>
                </div>
              )}

              <div className="mv-section-header-light" style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 40px" }}>
                <div className="mv-eyebrow-tag">
                  INSTITUTIONAL GOVERNANCE FAQ
                </div>
                <h2>Frequently Asked Questions</h2>
                <p>
                  Official answers regarding our accreditation, vocational framework, and certification standards.
                </p>
              </div>

              <div className="mv-faq-list">
                {aeoFaqs.map((faq, idx) => (
                  <div key={idx} className={`mv-faq-item ${activeFaqIndex === idx ? "active" : ""}`}>
                    <button
                      type="button"
                      className="mv-faq-trigger"
                      onClick={() => setActiveFaqIndex(activeFaqIndex === idx ? null : idx)}
                    >
                      <span>{faq.q}</span>
                      <span className="mv-faq-icon">{activeFaqIndex === idx ? "−" : "+"}</span>
                    </button>
                    {activeFaqIndex === idx && (
                      <div className="mv-faq-body">
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════
            SECTION 7: CTA STRIP (DARK)
            ══════════════════════════════════════════════════════════ */}
        <section className="mv-cta-section">
          <div className="mv-container">
            {isAdmin && (
              <div className="mv-admin-edit-bar" style={{ marginBottom: 12 }}>
                <button type="button" onClick={() => handleOpenEditor("cta")} className="mv-admin-edit-btn mv-admin-edit-btn-dark">
                  <span>✎ Edit CTA Section</span>
                </button>
              </div>
            )}

            <div className="mv-cta-inner">
              <div className="mv-cta-content">
                <h2>{data.cta_title || "Take the Next Step in Your Career"}</h2>
                <p>{data.cta_desc}</p>
              </div>

              <div className="mv-cta-buttons">
                <Link href={data.cta_primary_btn_link || "/courses"} className="mv-btn-red">
                  {data.cta_primary_btn_text || "Explore Courses"}
                </Link>
                <Link href={data.cta_secondary_btn_link || "/contact-us"} className="mv-btn-outline-white">
                  {data.cta_secondary_btn_text || "Contact Admissions"}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ══════════════════════════════════════════════════════════
          UNIVERSAL ON-PAGE ADMIN EDIT MODALS
          ══════════════════════════════════════════════════════════ */}
      {editorModal && (
        <div className="mv-modal-backdrop" onClick={() => setEditorModal(null)}>
          <div className="mv-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="mv-modal-header">
              <h3 className="mv-modal-title">
                {editorModal === "hero" && "Edit Hero Section"}
                {editorModal === "trust" && "Edit Accreditations & Trust"}
                {editorModal === "pillars" && "Edit Mission & Vision Pillars"}
                {editorModal === "objectives" && "Edit Strategic Objectives"}
                {editorModal === "values" && "Edit Core Values & Leadership"}
                {editorModal === "cta" && "Edit Call to Action"}
                {editorModal === "seo" && "Edit SEO & AEO Search Engine Engine"}
              </h3>
              <button type="button" className="mv-modal-close-btn" onClick={() => setEditorModal(null)}>✕</button>
            </div>

            <div className="mv-modal-body">
              {/* HERO MODAL */}
              {editorModal === "hero" && (
                <>
                  <div className="mv-form-group">
                    <label className="mv-form-label">Eyebrow Tag</label>
                    <input
                      type="text"
                      className="mv-form-input"
                      value={formState.hero_eyebrow || ""}
                      onChange={(e) => setFormState({ ...formState, hero_eyebrow: e.target.value })}
                    />
                  </div>
                  <div className="mv-form-group">
                    <label className="mv-form-label">Main Heading</label>
                    <input
                      type="text"
                      className="mv-form-input"
                      value={formState.hero_title || ""}
                      onChange={(e) => setFormState({ ...formState, hero_title: e.target.value })}
                    />
                  </div>
                  <div className="mv-form-group">
                    <label className="mv-form-label">Narrative Description</label>
                    <textarea
                      className="mv-form-input mv-form-textarea"
                      value={formState.hero_text || ""}
                      onChange={(e) => setFormState({ ...formState, hero_text: e.target.value })}
                    />
                  </div>

                  <div className="mv-form-group">
                    <label className="mv-form-label">Hero Statistics Badges</label>
                    {(formState.hero_stats || []).map((st: string, idx: number) => (
                      <div key={idx} style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
                        <input
                          type="text"
                          className="mv-form-input"
                          value={st}
                          onChange={(e) => {
                            const updated = [...formState.hero_stats];
                            updated[idx] = e.target.value;
                            setFormState({ ...formState, hero_stats: updated });
                          }}
                        />
                        <button
                          type="button"
                          className="mv-json-remove-btn"
                          onClick={() => {
                            const updated = formState.hero_stats.filter((_: any, i: number) => i !== idx);
                            setFormState({ ...formState, hero_stats: updated });
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="mv-json-add-btn"
                      onClick={() => setFormState({ ...formState, hero_stats: [...(formState.hero_stats || []), "New Metric"] })}
                    >
                      + Add Stat Badge
                    </button>
                  </div>

                  <div className="mv-form-group">
                    <label className="mv-form-label">Right Card: Institutional Credentials</label>
                    {(formState.hero_credentials || []).map((row: any, idx: number) => (
                      <div key={idx} className="mv-json-item-box">
                        <div className="mv-json-item-header">
                          <span>Row #{idx + 1}</span>
                          <button
                            type="button"
                            className="mv-json-remove-btn"
                            onClick={() => {
                              const updated = formState.hero_credentials.filter((_: any, i: number) => i !== idx);
                              setFormState({ ...formState, hero_credentials: updated });
                            }}
                          >
                            Remove
                          </button>
                        </div>
                        <input
                          type="text"
                          className="mv-form-input"
                          placeholder="Row Title"
                          value={row.title || ""}
                          onChange={(e) => {
                            const updated = [...formState.hero_credentials];
                            updated[idx] = { ...updated[idx], title: e.target.value };
                            setFormState({ ...formState, hero_credentials: updated });
                          }}
                        />
                        <input
                          type="text"
                          className="mv-form-input"
                          placeholder="Row Subtitle"
                          value={row.sub || ""}
                          onChange={(e) => {
                            const updated = [...formState.hero_credentials];
                            updated[idx] = { ...updated[idx], sub: e.target.value };
                            setFormState({ ...formState, hero_credentials: updated });
                          }}
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      className="mv-json-add-btn"
                      onClick={() =>
                        setFormState({
                          ...formState,
                          hero_credentials: [...(formState.hero_credentials || []), { title: "New Credential", sub: "Description" }],
                        })
                      }
                    >
                      + Add Credential Row
                    </button>
                  </div>
                </>
              )}

              {/* TRUST MODAL */}
              {editorModal === "trust" && (
                <>
                  <div className="mv-form-group">
                    <label className="mv-form-label">Eyebrow Tag</label>
                    <input
                      type="text"
                      className="mv-form-input"
                      value={formState.trust_eyebrow || ""}
                      onChange={(e) => setFormState({ ...formState, trust_eyebrow: e.target.value })}
                    />
                  </div>
                  <div className="mv-form-group">
                    <label className="mv-form-label">Section Heading</label>
                    <input
                      type="text"
                      className="mv-form-input"
                      value={formState.trust_title || ""}
                      onChange={(e) => setFormState({ ...formState, trust_title: e.target.value })}
                    />
                  </div>
                  <div className="mv-form-group">
                    <label className="mv-form-label">Section Description</label>
                    <textarea
                      className="mv-form-input mv-form-textarea"
                      value={formState.trust_desc || ""}
                      onChange={(e) => setFormState({ ...formState, trust_desc: e.target.value })}
                    />
                  </div>

                  <div className="mv-form-group">
                    <label className="mv-form-label">Accreditation Cards</label>
                    {(formState.trust_cards || []).map((card: any, idx: number) => (
                      <div key={idx} className="mv-json-item-box">
                        <div className="mv-json-item-header">
                          <span>Card #{idx + 1}</span>
                          <button
                            type="button"
                            className="mv-json-remove-btn"
                            onClick={() => {
                              const updated = formState.trust_cards.filter((_: any, i: number) => i !== idx);
                              setFormState({ ...formState, trust_cards: updated });
                            }}
                          >
                            Remove
                          </button>
                        </div>
                        <input
                          type="text"
                          className="mv-form-input"
                          placeholder="Badge Label (e.g. Quality Standard)"
                          value={card.badge || ""}
                          onChange={(e) => {
                            const updated = [...formState.trust_cards];
                            updated[idx] = { ...updated[idx], badge: e.target.value };
                            setFormState({ ...formState, trust_cards: updated });
                          }}
                        />
                        <input
                          type="text"
                          className="mv-form-input"
                          placeholder="Title (e.g. ISO 9001:2015)"
                          value={card.title || ""}
                          onChange={(e) => {
                            const updated = [...formState.trust_cards];
                            updated[idx] = { ...updated[idx], title: e.target.value };
                            setFormState({ ...formState, trust_cards: updated });
                          }}
                        />
                        <textarea
                          className="mv-form-input mv-form-textarea"
                          placeholder="Description"
                          value={card.desc || ""}
                          onChange={(e) => {
                            const updated = [...formState.trust_cards];
                            updated[idx] = { ...updated[idx], desc: e.target.value };
                            setFormState({ ...formState, trust_cards: updated });
                          }}
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      className="mv-json-add-btn"
                      onClick={() =>
                        setFormState({
                          ...formState,
                          trust_cards: [...(formState.trust_cards || []), { badge: "Standard", title: "Accreditation", desc: "Description text" }],
                        })
                      }
                    >
                      + Add Accreditation Card
                    </button>
                  </div>
                </>
              )}

              {/* PILLARS MODAL */}
              {editorModal === "pillars" && (
                <>
                  <div className="mv-form-group">
                    <label className="mv-form-label">Section Heading</label>
                    <input
                      type="text"
                      className="mv-form-input"
                      value={formState.pillars_title || ""}
                      onChange={(e) => setFormState({ ...formState, pillars_title: e.target.value })}
                    />
                  </div>
                  <div className="mv-form-group">
                    <label className="mv-form-label">Section Description</label>
                    <input
                      type="text"
                      className="mv-form-input"
                      value={formState.pillars_desc || ""}
                      onChange={(e) => setFormState({ ...formState, pillars_desc: e.target.value })}
                    />
                  </div>

                  <h4 style={{ margin: "16px 0 8px", color: "#e63946" }}>Our Mission Pillar</h4>
                  <div className="mv-form-group">
                    <label className="mv-form-label">Mission Statement</label>
                    <textarea
                      className="mv-form-input mv-form-textarea"
                      value={formState.mission_statement || ""}
                      onChange={(e) => setFormState({ ...formState, mission_statement: e.target.value })}
                    />
                  </div>

                  <div className="mv-form-group">
                    <label className="mv-form-label">Mission Bullet Points</label>
                    {(formState.mission_points || []).map((pt: any, idx: number) => (
                      <div key={idx} className="mv-json-item-box">
                        <div className="mv-json-item-header">
                          <span>Point #{idx + 1}</span>
                          <button
                            type="button"
                            className="mv-json-remove-btn"
                            onClick={() => {
                              const updated = formState.mission_points.filter((_: any, i: number) => i !== idx);
                              setFormState({ ...formState, mission_points: updated });
                            }}
                          >
                            Remove
                          </button>
                        </div>
                        <input
                          type="text"
                          className="mv-form-input"
                          placeholder="Point Title"
                          value={pt.title || ""}
                          onChange={(e) => {
                            const updated = [...formState.mission_points];
                            updated[idx] = { ...updated[idx], title: e.target.value };
                            setFormState({ ...formState, mission_points: updated });
                          }}
                        />
                        <input
                          type="text"
                          className="mv-form-input"
                          placeholder="Point Description"
                          value={pt.desc || ""}
                          onChange={(e) => {
                            const updated = [...formState.mission_points];
                            updated[idx] = { ...updated[idx], desc: e.target.value };
                            setFormState({ ...formState, mission_points: updated });
                          }}
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      className="mv-json-add-btn"
                      onClick={() =>
                        setFormState({
                          ...formState,
                          mission_points: [...(formState.mission_points || []), { title: "Title", desc: "Description" }],
                        })
                      }
                    >
                      + Add Mission Point
                    </button>
                  </div>

                  <h4 style={{ margin: "20px 0 8px", color: "#0a1628" }}>Our Vision Pillar</h4>
                  <div className="mv-form-group">
                    <label className="mv-form-label">Vision Statement</label>
                    <textarea
                      className="mv-form-input mv-form-textarea"
                      value={formState.vision_statement || ""}
                      onChange={(e) => setFormState({ ...formState, vision_statement: e.target.value })}
                    />
                  </div>

                  <div className="mv-form-group">
                    <label className="mv-form-label">Vision Bullet Points</label>
                    {(formState.vision_points || []).map((pt: any, idx: number) => (
                      <div key={idx} className="mv-json-item-box">
                        <div className="mv-json-item-header">
                          <span>Point #{idx + 1}</span>
                          <button
                            type="button"
                            className="mv-json-remove-btn"
                            onClick={() => {
                              const updated = formState.vision_points.filter((_: any, i: number) => i !== idx);
                              setFormState({ ...formState, vision_points: updated });
                            }}
                          >
                            Remove
                          </button>
                        </div>
                        <input
                          type="text"
                          className="mv-form-input"
                          placeholder="Point Title"
                          value={pt.title || ""}
                          onChange={(e) => {
                            const updated = [...formState.vision_points];
                            updated[idx] = { ...updated[idx], title: e.target.value };
                            setFormState({ ...formState, vision_points: updated });
                          }}
                        />
                        <input
                          type="text"
                          className="mv-form-input"
                          placeholder="Point Description"
                          value={pt.desc || ""}
                          onChange={(e) => {
                            const updated = [...formState.vision_points];
                            updated[idx] = { ...updated[idx], desc: e.target.value };
                            setFormState({ ...formState, vision_points: updated });
                          }}
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      className="mv-json-add-btn"
                      onClick={() =>
                        setFormState({
                          ...formState,
                          vision_points: [...(formState.vision_points || []), { title: "Title", desc: "Description" }],
                        })
                      }
                    >
                      + Add Vision Point
                    </button>
                  </div>
                </>
              )}

              {/* OBJECTIVES MODAL */}
              {editorModal === "objectives" && (
                <>
                  <div className="mv-form-group">
                    <label className="mv-form-label">Heading</label>
                    <input
                      type="text"
                      className="mv-form-input"
                      value={formState.objectives_title || ""}
                      onChange={(e) => setFormState({ ...formState, objectives_title: e.target.value })}
                    />
                  </div>
                  <div className="mv-form-group">
                    <label className="mv-form-label">Description</label>
                    <textarea
                      className="mv-form-input mv-form-textarea"
                      value={formState.objectives_desc || ""}
                      onChange={(e) => setFormState({ ...formState, objectives_desc: e.target.value })}
                    />
                  </div>

                  <div className="mv-form-group">
                    <label className="mv-form-label">Strategic Objectives Cards</label>
                    {(formState.objectives_cards || []).map((card: any, idx: number) => (
                      <div key={idx} className="mv-json-item-box">
                        <div className="mv-json-item-header">
                          <span>Card #{card.num || idx + 1}</span>
                          <button
                            type="button"
                            className="mv-json-remove-btn"
                            onClick={() => {
                              const updated = formState.objectives_cards.filter((_: any, i: number) => i !== idx);
                              setFormState({ ...formState, objectives_cards: updated });
                            }}
                          >
                            Remove
                          </button>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "8px" }}>
                          <input
                            type="text"
                            className="mv-form-input"
                            placeholder="01"
                            value={card.num || ""}
                            onChange={(e) => {
                              const updated = [...formState.objectives_cards];
                              updated[idx] = { ...updated[idx], num: e.target.value };
                              setFormState({ ...formState, objectives_cards: updated });
                            }}
                          />
                          <input
                            type="text"
                            className="mv-form-input"
                            placeholder="Category (e.g. AWARENESS)"
                            value={card.category || ""}
                            onChange={(e) => {
                              const updated = [...formState.objectives_cards];
                              updated[idx] = { ...updated[idx], category: e.target.value };
                              setFormState({ ...formState, objectives_cards: updated });
                            }}
                          />
                        </div>
                        <input
                          type="text"
                          className="mv-form-input"
                          placeholder="Title"
                          value={card.title || ""}
                          onChange={(e) => {
                            const updated = [...formState.objectives_cards];
                            updated[idx] = { ...updated[idx], title: e.target.value };
                            setFormState({ ...formState, objectives_cards: updated });
                          }}
                        />
                        <textarea
                          className="mv-form-input mv-form-textarea"
                          placeholder="Description"
                          value={card.desc || ""}
                          onChange={(e) => {
                            const updated = [...formState.objectives_cards];
                            updated[idx] = { ...updated[idx], desc: e.target.value };
                            setFormState({ ...formState, objectives_cards: updated });
                          }}
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      className="mv-json-add-btn"
                      onClick={() =>
                        setFormState({
                          ...formState,
                          objectives_cards: [
                            ...(formState.objectives_cards || []),
                            { num: String(formState.objectives_cards?.length + 1 || "01").padStart(2, "0"), category: "CATEGORY", title: "Objective Title", desc: "Description" },
                          ],
                        })
                      }
                    >
                      + Add Objective Card
                    </button>
                  </div>
                </>
              )}

              {/* VALUES & LEADERSHIP MODAL */}
              {editorModal === "values" && (
                <>
                  <h4 style={{ margin: "0 0 10px", color: "#0a1628" }}>Core Values</h4>
                  <div className="mv-form-group">
                    <label className="mv-form-label">Heading</label>
                    <input
                      type="text"
                      className="mv-form-input"
                      value={formState.values_title || ""}
                      onChange={(e) => setFormState({ ...formState, values_title: e.target.value })}
                    />
                  </div>

                  <div className="mv-form-group">
                    <label className="mv-form-label">Value Items</label>
                    {(formState.values_cards || []).map((val: any, idx: number) => (
                      <div key={idx} className="mv-json-item-box">
                        <div className="mv-json-item-header">
                          <span>Value #{idx + 1}</span>
                          <button
                            type="button"
                            className="mv-json-remove-btn"
                            onClick={() => {
                              const updated = formState.values_cards.filter((_: any, i: number) => i !== idx);
                              setFormState({ ...formState, values_cards: updated });
                            }}
                          >
                            Remove
                          </button>
                        </div>
                        <input
                          type="text"
                          className="mv-form-input"
                          placeholder="Title"
                          value={val.title || ""}
                          onChange={(e) => {
                            const updated = [...formState.values_cards];
                            updated[idx] = { ...updated[idx], title: e.target.value };
                            setFormState({ ...formState, values_cards: updated });
                          }}
                        />
                        <textarea
                          className="mv-form-input mv-form-textarea"
                          placeholder="Description"
                          value={val.desc || ""}
                          onChange={(e) => {
                            const updated = [...formState.values_cards];
                            updated[idx] = { ...updated[idx], desc: e.target.value };
                            setFormState({ ...formState, values_cards: updated });
                          }}
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      className="mv-json-add-btn"
                      onClick={() =>
                        setFormState({
                          ...formState,
                          values_cards: [...(formState.values_cards || []), { title: "Value Title", desc: "Description" }],
                        })
                      }
                    >
                      + Add Core Value
                    </button>
                  </div>

                  <h4 style={{ margin: "20px 0 10px", color: "#e63946" }}>Director & Leadership Editorial Quote</h4>
                  <div className="mv-form-group">
                    <label className="mv-form-label">Director Quote</label>
                    <textarea
                      className="mv-form-input mv-form-textarea"
                      value={formState.director_quote || ""}
                      onChange={(e) => setFormState({ ...formState, director_quote: e.target.value })}
                    />
                  </div>
                  <div className="mv-form-group">
                    <label className="mv-form-label">Director Name</label>
                    <input
                      type="text"
                      className="mv-form-input"
                      value={formState.director_name || ""}
                      onChange={(e) => setFormState({ ...formState, director_name: e.target.value })}
                    />
                  </div>
                  <div className="mv-form-group">
                    <label className="mv-form-label">Director Designation / Title</label>
                    <input
                      type="text"
                      className="mv-form-input"
                      value={formState.director_title || ""}
                      onChange={(e) => setFormState({ ...formState, director_title: e.target.value })}
                    />
                  </div>

                  <div className="mv-form-group">
                    <label className="mv-form-label">Director Photo</label>
                    {formState.director_image_url && (
                      <div style={{ marginBottom: "8px" }}>
                        <img
                          src={resolveImage(formState.director_image_url)}
                          alt="Preview"
                          style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 4, border: "1px solid #e2e8f0" }}
                        />
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadDirectorImage}
                      className="mv-form-input"
                    />
                  </div>
                </>
              )}

              {/* CTA MODAL */}
              {editorModal === "cta" && (
                <>
                  <div className="mv-form-group">
                    <label className="mv-form-label">Heading</label>
                    <input
                      type="text"
                      className="mv-form-input"
                      value={formState.cta_title || ""}
                      onChange={(e) => setFormState({ ...formState, cta_title: e.target.value })}
                    />
                  </div>
                  <div className="mv-form-group">
                    <label className="mv-form-label">Description</label>
                    <textarea
                      className="mv-form-input mv-form-textarea"
                      value={formState.cta_desc || ""}
                      onChange={(e) => setFormState({ ...formState, cta_desc: e.target.value })}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                    <div className="mv-form-group">
                      <label className="mv-form-label">Primary Button Text</label>
                      <input
                        type="text"
                        className="mv-form-input"
                        value={formState.cta_primary_btn_text || ""}
                        onChange={(e) => setFormState({ ...formState, cta_primary_btn_text: e.target.value })}
                      />
                    </div>
                    <div className="mv-form-group">
                      <label className="mv-form-label">Primary Button Link</label>
                      <input
                        type="text"
                        className="mv-form-input"
                        value={formState.cta_primary_btn_link || ""}
                        onChange={(e) => setFormState({ ...formState, cta_primary_btn_link: e.target.value })}
                      />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                    <div className="mv-form-group">
                      <label className="mv-form-label">Secondary Button Text</label>
                      <input
                        type="text"
                        className="mv-form-input"
                        value={formState.cta_secondary_btn_text || ""}
                        onChange={(e) => setFormState({ ...formState, cta_secondary_btn_text: e.target.value })}
                      />
                    </div>
                    <div className="mv-form-group">
                      <label className="mv-form-label">Secondary Button Link</label>
                      <input
                        type="text"
                        className="mv-form-input"
                        value={formState.cta_secondary_btn_link || ""}
                        onChange={(e) => setFormState({ ...formState, cta_secondary_btn_link: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* SEO & AEO MODAL */}
              {editorModal === "seo" && (
                <>
                  <div className="mv-form-group">
                    <label className="mv-form-label">SEO Meta Title</label>
                    <input
                      type="text"
                      className="mv-form-input"
                      value={formState.seo_title || ""}
                      onChange={(e) => setFormState({ ...formState, seo_title: e.target.value })}
                    />
                  </div>
                  <div className="mv-form-group">
                    <label className="mv-form-label">SEO Meta Description</label>
                    <textarea
                      className="mv-form-input mv-form-textarea"
                      value={formState.seo_description || ""}
                      onChange={(e) => setFormState({ ...formState, seo_description: e.target.value })}
                    />
                  </div>
                  <div className="mv-form-group">
                    <label className="mv-form-label">SEO Keywords (comma-separated)</label>
                    <input
                      type="text"
                      className="mv-form-input"
                      value={formState.seo_keywords || ""}
                      onChange={(e) => setFormState({ ...formState, seo_keywords: e.target.value })}
                    />
                  </div>

                  <h4 style={{ margin: "20px 0 10px", color: "#e63946" }}>
                    AEO (Answer Engine Optimization) & FAQ Engine
                  </h4>
                  <p style={{ fontSize: "12.5px", color: "#64748b", margin: "0 0 12px" }}>
                    These Q&As are automatically parsed into Google/AI Search <code>FAQPage</code> schema and rendered in the page's FAQ section.
                  </p>

                  <div className="mv-form-group">
                    {(formState.aeo_faqs || []).map((faq: any, idx: number) => (
                      <div key={idx} className="mv-json-item-box">
                        <div className="mv-json-item-header">
                          <span>FAQ Question #{idx + 1}</span>
                          <button
                            type="button"
                            className="mv-json-remove-btn"
                            onClick={() => {
                              const updated = formState.aeo_faqs.filter((_: any, i: number) => i !== idx);
                              setFormState({ ...formState, aeo_faqs: updated });
                            }}
                          >
                            Remove
                          </button>
                        </div>
                        <input
                          type="text"
                          className="mv-form-input"
                          placeholder="Question"
                          value={faq.q || ""}
                          onChange={(e) => {
                            const updated = [...formState.aeo_faqs];
                            updated[idx] = { ...updated[idx], q: e.target.value };
                            setFormState({ ...formState, aeo_faqs: updated });
                          }}
                        />
                        <textarea
                          className="mv-form-input mv-form-textarea"
                          placeholder="Direct, factual answer"
                          value={faq.a || ""}
                          onChange={(e) => {
                            const updated = [...formState.aeo_faqs];
                            updated[idx] = { ...updated[idx], a: e.target.value };
                            setFormState({ ...formState, aeo_faqs: updated });
                          }}
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      className="mv-json-add-btn"
                      onClick={() =>
                        setFormState({
                          ...formState,
                          aeo_faqs: [...(formState.aeo_faqs || []), { q: "Frequently asked question?", a: "Accurate answer text." }],
                        })
                      }
                    >
                      + Add AEO FAQ Entry
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="mv-modal-footer">
              <span className={`mv-modal-status ${modalStatus.type}`}>
                {modalStatus.msg}
              </span>
              <div className="mv-modal-actions">
                <button type="button" className="mv-btn-cancel" onClick={() => setEditorModal(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="mv-btn-save"
                  disabled={saving}
                  onClick={handleSaveModal}
                >
                  {saving ? "Saving..." : "Save to Database"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <PublicFooter />
    </div>
  );
}
