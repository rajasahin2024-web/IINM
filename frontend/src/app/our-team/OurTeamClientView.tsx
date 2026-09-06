"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import PublicNavbar from "@/components/PublicNavbar";
import PublicFooter from "@/components/PublicFooter";
import { API_BASE_URL, BACKEND_BASE_URL } from "@/lib/config";
import { apiFetch } from "@/lib/apiFetch";
import "./our-team.css";

// ── Types ──
export interface TeamMember {
  id?: string;
  name: string;
  designation: string;
  category?: string;
  specialty?: string;
  experience_badge?: string;
  bio?: string;
  image_url: string;
  linkedin_url?: string;
  email?: string;
  is_visible?: boolean;
  order_index?: number;
}

export interface ExecutiveMember {
  role: string;
  name: string;
  degrees?: string;
  bio?: string;
  quote?: string;
  image_url: string;
  experience_badge?: string;
  linkedin_url?: string;
  email?: string;
}

export interface AffiliationItem {
  id: string;
  name: string;
  tag?: string;
  logo_url?: string;
}

export interface OurTeamData {
  hero_eyebrow?: string;
  hero_title?: string;
  hero_subtitle?: string;
  hero_text?: string;
  hero_badges_json?: string;
  hero_card_rows_json?: string;

  executive_eyebrow?: string;
  executive_title?: string;
  executive_desc?: string;
  executive_cards_json?: string;

  team_eyebrow?: string;
  team_title?: string;
  team_desc?: string;
  team_categories_json?: string;
  team_members_json?: string;

  affiliations_eyebrow?: string;
  affiliations_title?: string;
  affiliations_desc?: string;
  affiliations_logos_json?: string;

  framework_eyebrow?: string;
  framework_title?: string;
  framework_desc?: string;
  framework_cards_json?: string;

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

type EditorModalType = "hero" | "executive" | "faculty" | "affiliations" | "framework" | "cta" | "seo" | null;

// ── Interactive Light Grid Canvas (Subtle hover motion) ──
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

    const nodeCount = Math.min(Math.max(Math.floor((width * height) / 16000), 28), 46);
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
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: Math.random() * 1.5 + 1.5,
        isRed: Math.random() < 0.22,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Light Gridlines
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

      // Nodes & subtle interconnections
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

          if (dist < 115) {
            const alpha = (1 - dist / 115) * 0.1;
            ctx.strokeStyle = n.isRed || n2.isRed ? `rgba(230, 57, 70, ${alpha * 1.5})` : `rgba(10, 22, 40, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();
          }
        }

        // Mouse hover interaction
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

  return <canvas ref={canvasRef} className="team-hero-canvas" />;
}

// Safe JSON Parser
function parseJsonSafe<T>(jsonStr?: string, fallback: T = [] as any): T {
  if (!jsonStr) return fallback;
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    return fallback;
  }
}

export default function OurTeamClientView({ initialData }: { initialData: OurTeamData }) {
  // Pre-populated directly from server SSR (Instant 0ms first render!)
  const [data, setData] = useState<OurTeamData>(initialData);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All Members");
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

  // Check Super Admin session
  useEffect(() => {
    const checkAdmin = () => {
      const loggedIn = localStorage.getItem("iinm_is_logged_in") === "true";
      const expiry = localStorage.getItem("iinm_login_expiry");
      const valid = loggedIn && expiry ? Date.now() < Number(expiry) : false;
      setIsSuperAdmin(valid);
    };
    checkAdmin();
    const interval = setInterval(checkAdmin, 3000);
    return () => clearInterval(interval);
  }, []);

  // Open modal populated with section values
  const handleOpenEditor = (type: EditorModalType) => {
    setEditorModal(type);
    setModalStatus({ msg: "", type: "" });

    if (type === "hero") {
      setFormState({
        hero_eyebrow: data.hero_eyebrow || "",
        hero_title: data.hero_title || "",
        hero_subtitle: data.hero_subtitle || "",
        hero_text: data.hero_text || "",
        hero_badges: parseJsonSafe<string[]>(data.hero_badges_json, []),
        hero_card_rows: parseJsonSafe<Array<{ title: string; sub: string }>>(data.hero_card_rows_json, []),
      });
    } else if (type === "executive") {
      setFormState({
        executive_eyebrow: data.executive_eyebrow || "",
        executive_title: data.executive_title || "",
        executive_desc: data.executive_desc || "",
        executive_cards: parseJsonSafe<ExecutiveMember[]>(data.executive_cards_json, []),
      });
    } else if (type === "faculty") {
      setFormState({
        team_eyebrow: data.team_eyebrow || "",
        team_title: data.team_title || "",
        team_desc: data.team_desc || "",
        team_categories: parseJsonSafe<string[]>(data.team_categories_json, []),
        team_members: parseJsonSafe<TeamMember[]>(data.team_members_json, []),
      });
    } else if (type === "affiliations") {
      setFormState({
        affiliations_eyebrow: data.affiliations_eyebrow || "",
        affiliations_title: data.affiliations_title || "",
        affiliations_desc: data.affiliations_desc || "",
        affiliations_logos: parseJsonSafe<AffiliationItem[]>(data.affiliations_logos_json, []),
      });
    } else if (type === "framework") {
      setFormState({
        framework_eyebrow: data.framework_eyebrow || "",
        framework_title: data.framework_title || "",
        framework_desc: data.framework_desc || "",
        framework_cards: parseJsonSafe<Array<{ title: string; desc: string }>>(data.framework_cards_json, []),
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

      let payload: Partial<OurTeamData> = {};

      if (editorModal === "hero") {
        payload = {
          hero_eyebrow: formState.hero_eyebrow,
          hero_title: formState.hero_title,
          hero_subtitle: formState.hero_subtitle,
          hero_text: formState.hero_text,
          hero_badges_json: JSON.stringify(formState.hero_badges || []),
          hero_card_rows_json: JSON.stringify(formState.hero_card_rows || []),
        };
      } else if (editorModal === "executive") {
        payload = {
          executive_eyebrow: formState.executive_eyebrow,
          executive_title: formState.executive_title,
          executive_desc: formState.executive_desc,
          executive_cards_json: JSON.stringify(formState.executive_cards || []),
        };
      } else if (editorModal === "faculty") {
        payload = {
          team_eyebrow: formState.team_eyebrow,
          team_title: formState.team_title,
          team_desc: formState.team_desc,
          team_categories_json: JSON.stringify(formState.team_categories || []),
          team_members_json: JSON.stringify(formState.team_members || []),
        };
      } else if (editorModal === "affiliations") {
        payload = {
          affiliations_eyebrow: formState.affiliations_eyebrow,
          affiliations_title: formState.affiliations_title,
          affiliations_desc: formState.affiliations_desc,
          affiliations_logos_json: JSON.stringify(formState.affiliations_logos || []),
        };
      } else if (editorModal === "framework") {
        payload = {
          framework_eyebrow: formState.framework_eyebrow,
          framework_title: formState.framework_title,
          framework_desc: formState.framework_desc,
          framework_cards_json: JSON.stringify(formState.framework_cards || []),
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

      const res = await apiFetch(`${API_BASE_URL}/our-team/data`, {
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
        setModalStatus({ msg: "Failed to save. Verify Super Admin login.", type: "error" });
      }
    } catch {
      setModalStatus({ msg: "Connection error while saving.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Upload photo helper (supports Cloudflare R2 bucket)
  const handleUploadPhoto = async (
    e: React.ChangeEvent<HTMLInputElement>,
    listName: "executive_cards" | "team_members" | "affiliations_logos",
    itemIndex: number
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiFetch(`${API_BASE_URL}/our-team/upload-photo`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        const updated = [...(formState[listName] || [])];
        if (listName === "affiliations_logos") {
          updated[itemIndex] = { ...updated[itemIndex], logo_url: json.url };
        } else {
          updated[itemIndex] = { ...updated[itemIndex], image_url: json.url };
        }
        setFormState((prev) => ({ ...prev, [listName]: updated }));
        setModalStatus({ msg: "Image uploaded to Cloudflare CDN! Click Save to apply.", type: "success" });
      } else {
        setModalStatus({ msg: "Upload failed.", type: "error" });
      }
    } catch {
      setModalStatus({ msg: "Upload error.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Resolve media URLs
  const resolveImage = (url?: string) => {
    if (!url) return "/placeholder.png";
    if (url.startsWith("http")) return url;
    return `${BACKEND_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  // Parsed content
  const heroBadges = parseJsonSafe<string[]>(data.hero_badges_json, []);
  const heroCardRows = parseJsonSafe<Array<{ title: string; sub: string }>>(data.hero_card_rows_json, []);
  const executiveCards = parseJsonSafe<ExecutiveMember[]>(data.executive_cards_json, []);
  const teamCategories = parseJsonSafe<string[]>(data.team_categories_json, ["All Members"]);
  const teamMembers = parseJsonSafe<TeamMember[]>(data.team_members_json, []);
  const affiliationsLogos = parseJsonSafe<AffiliationItem[]>(data.affiliations_logos_json, []);
  const frameworkCards = parseJsonSafe<Array<{ title: string; desc: string }>>(data.framework_cards_json, []);
  const aeoFaqs = parseJsonSafe<Array<{ q: string; a: string }>>(data.aeo_faqs_json, []);

  // Filter team members: hidden items NEVER show on page
  const visibleFacultyMembers = teamMembers.filter((item) => {
    if (item.is_visible === false) return false;
    if (selectedCategory === "All Members") return true;
    return item.category === selectedCategory;
  });

  return (
    <div className="team-page">
      <PublicNavbar />

      {/* ── Breadcrumb Bar ── */}
      <div className="team-breadcrumb-wrapper">
        <div className="team-container">
          <nav className="team-breadcrumb-bar" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="team-breadcrumb-sep">/</span>
            <Link href="/about-iinm">About</Link>
            <span className="team-breadcrumb-sep">/</span>
            <span className="team-breadcrumb-active">Our Team</span>
          </nav>
        </div>
      </div>

      <main>
        {/* ══════════════════════════════════════════════════════════
            SECTION 1: HERO (LIGHT) WITH LIGHT GRID CANVAS
            ══════════════════════════════════════════════════════════ */}
        <section
          className="team-hero-section"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <NetworkGridCanvas mousePos={mousePos} />

          <div className="team-container team-hero-inner">
            {isSuperAdmin && (
              <div className="team-admin-bar">
                <button type="button" onClick={() => handleOpenEditor("hero")} className="team-edit-btn">
                  <span>✎ Super Admin: Edit Hero Section</span>
                </button>
              </div>
            )}

            <div className="team-hero-grid">
              {/* Left Column */}
              <div className="team-hero-left">
                <div className="team-eyebrow-tag">
                  {data.hero_eyebrow || "INSTITUTIONAL FACULTY & LEADERSHIP"}
                </div>

                <h1 className="team-hero-heading">
                  {data.hero_title || "The Minds Shaping Tomorrow's Tech Leaders"}
                </h1>

                {data.hero_subtitle && (
                  <div className="team-hero-subtitle">{data.hero_subtitle}</div>
                )}

                <p className="team-hero-text">
                  {data.hero_text}
                </p>

                {heroBadges.length > 0 && (
                  <div className="team-hero-badges-row">
                    {heroBadges.map((badge, idx) => (
                      <div key={idx} className="team-hero-badge-pill">
                        <span className="team-hero-badge-dot" />
                        <span>{badge}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Faculty Assurance Card */}
              <div className="team-credentials-card">
                <div className="team-card-header">
                  <span className="team-card-title">Academic Governance</span>
                  <span className="team-card-tag">Excellence Benchmark</span>
                </div>

                <div className="team-card-list">
                  {heroCardRows.map((row, idx) => (
                    <div key={idx} className="team-card-row">
                      <span className="team-card-row-dot" />
                      <div>
                        <div className="team-card-row-title">{row.title}</div>
                        <div className="team-card-row-sub">{row.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION 2: EXECUTIVE LEADERSHIP (DARK - #0a1628)
            ══════════════════════════════════════════════════════════ */}
        <section className="team-executive-section">
          <div className="team-container">
            {isSuperAdmin && (
              <div className="team-admin-bar">
                <button type="button" onClick={() => handleOpenEditor("executive")} className="team-edit-btn team-edit-btn-dark">
                  <span>✎ Super Admin: Edit Executive Leadership</span>
                </button>
              </div>
            )}

            <div className="team-section-header-dark">
              <div className="team-eyebrow-tag team-eyebrow-tag-dark">
                {data.executive_eyebrow || "GOVERNING BODY & DEANS"}
              </div>
              <h2>{data.executive_title}</h2>
              <p>{data.executive_desc}</p>
            </div>

            <div className="team-executive-grid">
              {executiveCards.map((exec, idx) => (
                <article key={idx} className="team-executive-card">
                  <div className="team-executive-photo-wrap">
                    <img
                      src={resolveImage(exec.image_url)}
                      alt={exec.name}
                      className="team-executive-photo"
                    />
                  </div>

                  <div className="team-executive-info">
                    <span className="team-executive-role">{exec.role}</span>
                    <h3 className="team-executive-name">{exec.name}</h3>
                    {exec.degrees && <div className="team-executive-degrees">{exec.degrees}</div>}
                    <p className="team-executive-bio">{exec.bio}</p>

                    {exec.quote && (
                      <blockquote className="team-executive-quote">
                        “{exec.quote}”
                      </blockquote>
                    )}

                    <div className="team-executive-links">
                      {exec.linkedin_url && (
                        <a
                          href={exec.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="team-executive-link"
                        >
                          LinkedIn Profile ↗
                        </a>
                      )}
                      {exec.email && (
                        <a href={`mailto:${exec.email}`} className="team-executive-link">
                          Contact Office ✉
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION 3: FACULTY & MENTORS DIRECTORY (LIGHT - #ffffff)
            ══════════════════════════════════════════════════════════ */}
        <section className="team-directory-section">
          <div className="team-container">
            {isSuperAdmin && (
              <div className="team-admin-bar">
                <button type="button" onClick={() => handleOpenEditor("faculty")} className="team-edit-btn">
                  <span>✎ Super Admin: Manage Faculty & Mentors</span>
                </button>
              </div>
            )}

            <div className="team-section-header-light">
              <div className="team-eyebrow-tag">
                {data.team_eyebrow || "FACULTY & INDUSTRY PRACTITIONERS"}
              </div>
              <h2>{data.team_title}</h2>
              <p>{data.team_desc}</p>
            </div>

            {/* Category Filter Tabs */}
            {teamCategories.length > 0 && (
              <div className="team-category-tabs">
                {teamCategories.map((cat, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`team-category-tab ${selectedCategory === cat ? "active" : ""}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Faculty Grid (Hidden items NEVER show on page) */}
            <div className="team-faculty-grid">
              {visibleFacultyMembers.map((member, idx) => (
                <article key={member.id || idx} className="team-faculty-card">
                  <div className="team-faculty-photo-wrap">
                    <img
                      src={resolveImage(member.image_url)}
                      alt={member.name}
                      className="team-faculty-photo"
                    />
                  </div>

                  <div className="team-faculty-content">
                    {member.specialty && (
                      <span className="team-faculty-specialty-badge">
                        {member.specialty}
                      </span>
                    )}

                    <h3 className="team-faculty-name">{member.name}</h3>
                    <div className="team-faculty-designation">{member.designation}</div>

                    {member.experience_badge && (
                      <div className="team-faculty-experience">
                        {member.experience_badge}
                      </div>
                    )}

                    <p className="team-faculty-bio">{member.bio}</p>

                    <div className="team-faculty-footer">
                      {member.linkedin_url ? (
                        <a
                          href={member.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="team-faculty-link"
                        >
                          LinkedIn ↗
                        </a>
                      ) : <span />}

                      {member.email && (
                        <a href={`mailto:${member.email}`} className="team-faculty-link">
                          Connect ✉
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {visibleFacultyMembers.length === 0 && (
              <div style={{ textAlign: "center", padding: "50px 20px", color: "#64748b" }}>
                <p>No faculty members listed under this category.</p>
              </div>
            )}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION 4: WHERE OUR FACULTY & MENTORS COME FROM (MARQUEE)
            ══════════════════════════════════════════════════════════ */}
        {affiliationsLogos.length > 0 && (
          <section className="team-affiliations-section">
            <div className="team-container">
              {isSuperAdmin && (
                <div className="team-admin-bar" style={{ marginBottom: 12 }}>
                  <button type="button" onClick={() => handleOpenEditor("affiliations")} className="team-edit-btn">
                    <span>✎ Super Admin: Edit Affiliations Marquee</span>
                  </button>
                </div>
              )}

              <div className="team-affiliations-header">
                <div className="team-eyebrow-tag">
                  {data.affiliations_eyebrow || "INSTITUTIONAL PEDIGREE"}
                </div>
                <h2>{data.affiliations_title}</h2>
                <p>{data.affiliations_desc}</p>
              </div>

              {/* Infinite Marquee Track */}
              <div className="team-marquee-wrap">
                <div className="team-marquee-track">
                  {[...affiliationsLogos, ...affiliationsLogos].map((aff, idx) => (
                    <div key={`${aff.id || idx}-${idx}`} className="team-affiliation-cell">
                      {aff.logo_url ? (
                        <img
                          src={resolveImage(aff.logo_url)}
                          alt={aff.name}
                          className="team-affiliation-logo"
                        />
                      ) : (
                        <span className="team-affiliation-name">{aff.name}</span>
                      )}
                      {aff.tag && <span className="team-affiliation-tag">{aff.tag}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════
            SECTION 5: MENTORSHIP FRAMEWORK & PEDAGOGY (DARK - #0d1e38)
            ══════════════════════════════════════════════════════════ */}
        <section className="team-framework-section">
          <div className="team-container">
            {isSuperAdmin && (
              <div className="team-admin-bar">
                <button type="button" onClick={() => handleOpenEditor("framework")} className="team-edit-btn team-edit-btn-dark">
                  <span>✎ Super Admin: Edit Mentorship Framework</span>
                </button>
              </div>
            )}

            <div className="team-section-header-dark">
              <div className="team-eyebrow-tag team-eyebrow-tag-dark">
                {data.framework_eyebrow || "OUR PEDAGOGICAL PHILOSOPHY"}
              </div>
              <h2>{data.framework_title}</h2>
              <p>{data.framework_desc}</p>
            </div>

            <div className="team-framework-grid">
              {frameworkCards.map((card, idx) => (
                <div key={idx} className="team-framework-card">
                  <h3>{card.title}</h3>
                  <p>{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION 6: VISUAL AEO FAQ ACCORDION (LIGHT - #ffffff)
            ══════════════════════════════════════════════════════════ */}
        {aeoFaqs.length > 0 && (
          <section className="team-faq-section">
            <div className="team-container">
              {isSuperAdmin && (
                <div className="team-admin-bar">
                  <button type="button" onClick={() => handleOpenEditor("seo")} className="team-edit-btn">
                    <span>✎ Super Admin: Edit SEO & AEO Engine</span>
                  </button>
                </div>
              )}

              <div className="team-section-header-light" style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 40px" }}>
                <div className="team-eyebrow-tag">
                  FACULTY & MENTORSHIP FAQ
                </div>
                <h2>Frequently Asked Questions</h2>
                <p>
                  Answers about faculty qualifications, 1-on-1 guidance, and joining our academic collective.
                </p>
              </div>

              <div className="team-faq-list">
                {aeoFaqs.map((faq, idx) => (
                  <div key={idx} className={`team-faq-item ${activeFaqIndex === idx ? "active" : ""}`}>
                    <button
                      type="button"
                      className="team-faq-trigger"
                      onClick={() => setActiveFaqIndex(activeFaqIndex === idx ? null : idx)}
                    >
                      <span>{faq.q}</span>
                      <span className="team-faq-icon">{activeFaqIndex === idx ? "−" : "+"}</span>
                    </button>
                    {activeFaqIndex === idx && (
                      <div className="team-faq-body">
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
            SECTION 7: CTA STRIP (DARK - #0a1628)
            ══════════════════════════════════════════════════════════ */}
        <section className="team-cta-section">
          <div className="team-container">
            {isSuperAdmin && (
              <div className="team-admin-bar" style={{ marginBottom: 12 }}>
                <button type="button" onClick={() => handleOpenEditor("cta")} className="team-edit-btn team-edit-btn-dark">
                  <span>✎ Super Admin: Edit CTA Section</span>
                </button>
              </div>
            )}

            <div className="team-cta-inner">
              <div className="team-cta-content">
                <h2>{data.cta_title || "Ready to Learn from Industry Masters?"}</h2>
                <p>{data.cta_desc}</p>
              </div>

              <div className="team-cta-buttons">
                <Link href={data.cta_primary_btn_link || "/courses"} className="team-btn-red">
                  {data.cta_primary_btn_text || "Explore Faculty-Led Courses"}
                </Link>
                <Link href={data.cta_secondary_btn_link || "/contact-us"} className="team-btn-outline-white">
                  {data.cta_secondary_btn_text || "Apply as an Industry Mentor"}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ══════════════════════════════════════════════════════════
          UNIVERSAL SUPER ADMIN EDIT MODALS
          ══════════════════════════════════════════════════════════ */}
      {editorModal && (
        <div className="team-modal-backdrop" onClick={() => setEditorModal(null)}>
          <div className="team-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="team-modal-header">
              <h3 className="team-modal-title">
                {editorModal === "hero" && "Super Admin: Edit Hero Section"}
                {editorModal === "executive" && "Super Admin: Edit Executive Leadership"}
                {editorModal === "faculty" && "Super Admin: Manage Faculty & Mentors Directory"}
                {editorModal === "affiliations" && "Super Admin: Edit Affiliations Marquee"}
                {editorModal === "framework" && "Super Admin: Edit Mentorship Framework"}
                {editorModal === "cta" && "Super Admin: Edit Call to Action"}
                {editorModal === "seo" && "Super Admin: Edit SEO & AEO Search Engine Engine"}
              </h3>
              <button type="button" className="team-modal-close-btn" onClick={() => setEditorModal(null)}>✕</button>
            </div>

            <div className="team-modal-body">
              {/* HERO MODAL */}
              {editorModal === "hero" && (
                <>
                  <div className="team-form-group">
                    <label className="team-form-label">Eyebrow Tag</label>
                    <input
                      type="text"
                      className="team-form-input"
                      value={formState.hero_eyebrow || ""}
                      onChange={(e) => setFormState({ ...formState, hero_eyebrow: e.target.value })}
                    />
                  </div>
                  <div className="team-form-group">
                    <label className="team-form-label">Main Heading</label>
                    <input
                      type="text"
                      className="team-form-input"
                      value={formState.hero_title || ""}
                      onChange={(e) => setFormState({ ...formState, hero_title: e.target.value })}
                    />
                  </div>
                  <div className="team-form-group">
                    <label className="team-form-label">Subtitle</label>
                    <input
                      type="text"
                      className="team-form-input"
                      value={formState.hero_subtitle || ""}
                      onChange={(e) => setFormState({ ...formState, hero_subtitle: e.target.value })}
                    />
                  </div>
                  <div className="team-form-group">
                    <label className="team-form-label">Narrative Text</label>
                    <textarea
                      className="team-form-input team-form-textarea"
                      value={formState.hero_text || ""}
                      onChange={(e) => setFormState({ ...formState, hero_text: e.target.value })}
                    />
                  </div>

                  <div className="team-form-group">
                    <label className="team-form-label">Hero Badges (Pills)</label>
                    {(formState.hero_badges || []).map((badge: string, idx: number) => (
                      <div key={idx} style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
                        <input
                          type="text"
                          className="team-form-input"
                          value={badge}
                          onChange={(e) => {
                            const updated = [...formState.hero_badges];
                            updated[idx] = e.target.value;
                            setFormState({ ...formState, hero_badges: updated });
                          }}
                        />
                        <button
                          type="button"
                          className="team-json-remove-btn"
                          onClick={() => {
                            const updated = formState.hero_badges.filter((_: any, i: number) => i !== idx);
                            setFormState({ ...formState, hero_badges: updated });
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="team-json-add-btn"
                      onClick={() => setFormState({ ...formState, hero_badges: [...(formState.hero_badges || []), "New Faculty Metric"] })}
                    >
                      + Add Badge Pill
                    </button>
                  </div>

                  <div className="team-form-group">
                    <label className="team-form-label">Right Card: Governance Assurance Rows</label>
                    {(formState.hero_card_rows || []).map((row: any, idx: number) => (
                      <div key={idx} className="team-json-item-box">
                        <div className="team-json-item-header">
                          <span>Row #{idx + 1}</span>
                          <button
                            type="button"
                            className="team-json-remove-btn"
                            onClick={() => {
                              const updated = formState.hero_card_rows.filter((_: any, i: number) => i !== idx);
                              setFormState({ ...formState, hero_card_rows: updated });
                            }}
                          >
                            Remove
                          </button>
                        </div>
                        <input
                          type="text"
                          className="team-form-input"
                          placeholder="Row Title"
                          value={row.title || ""}
                          onChange={(e) => {
                            const updated = [...formState.hero_card_rows];
                            updated[idx] = { ...updated[idx], title: e.target.value };
                            setFormState({ ...formState, hero_card_rows: updated });
                          }}
                        />
                        <input
                          type="text"
                          className="team-form-input"
                          placeholder="Row Subtitle"
                          value={row.sub || ""}
                          onChange={(e) => {
                            const updated = [...formState.hero_card_rows];
                            updated[idx] = { ...updated[idx], sub: e.target.value };
                            setFormState({ ...formState, hero_card_rows: updated });
                          }}
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      className="team-json-add-btn"
                      onClick={() =>
                        setFormState({
                          ...formState,
                          hero_card_rows: [...(formState.hero_card_rows || []), { title: "Governance Item", sub: "Explanation text" }],
                        })
                      }
                    >
                      + Add Assurance Row
                    </button>
                  </div>
                </>
              )}

              {/* EXECUTIVE LEADERSHIP MODAL */}
              {editorModal === "executive" && (
                <>
                  <div className="team-form-group">
                    <label className="team-form-label">Heading</label>
                    <input
                      type="text"
                      className="team-form-input"
                      value={formState.executive_title || ""}
                      onChange={(e) => setFormState({ ...formState, executive_title: e.target.value })}
                    />
                  </div>
                  <div className="team-form-group">
                    <label className="team-form-label">Description</label>
                    <textarea
                      className="team-form-input team-form-textarea"
                      value={formState.executive_desc || ""}
                      onChange={(e) => setFormState({ ...formState, executive_desc: e.target.value })}
                    />
                  </div>

                  <div className="team-form-group">
                    <label className="team-form-label">Executive Leaders</label>
                    {(formState.executive_cards || []).map((exec: any, idx: number) => (
                      <div key={idx} className="team-json-item-box">
                        <div className="team-json-item-header">
                          <span>Executive Leader #{idx + 1}</span>
                          <button
                            type="button"
                            className="team-json-remove-btn"
                            onClick={() => {
                              const updated = formState.executive_cards.filter((_: any, i: number) => i !== idx);
                              setFormState({ ...formState, executive_cards: updated });
                            }}
                          >
                            Remove
                          </button>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                          <input
                            type="text"
                            className="team-form-input"
                            placeholder="Role (e.g. Academic Director)"
                            value={exec.role || ""}
                            onChange={(e) => {
                              const updated = [...formState.executive_cards];
                              updated[idx] = { ...updated[idx], role: e.target.value };
                              setFormState({ ...formState, executive_cards: updated });
                            }}
                          />
                          <input
                            type="text"
                            className="team-form-input"
                            placeholder="Name (e.g. Prof. Dr. Anil Sharma)"
                            value={exec.name || ""}
                            onChange={(e) => {
                              const updated = [...formState.executive_cards];
                              updated[idx] = { ...updated[idx], name: e.target.value };
                              setFormState({ ...formState, executive_cards: updated });
                            }}
                          />
                        </div>
                        <input
                          type="text"
                          className="team-form-input"
                          placeholder="Degrees (e.g. Ph.D. IIT Kharagpur)"
                          value={exec.degrees || ""}
                          onChange={(e) => {
                            const updated = [...formState.executive_cards];
                            updated[idx] = { ...updated[idx], degrees: e.target.value };
                            setFormState({ ...formState, executive_cards: updated });
                          }}
                        />
                        <textarea
                          className="team-form-input team-form-textarea"
                          placeholder="Biography"
                          value={exec.bio || ""}
                          onChange={(e) => {
                            const updated = [...formState.executive_cards];
                            updated[idx] = { ...updated[idx], bio: e.target.value };
                            setFormState({ ...formState, executive_cards: updated });
                          }}
                        />
                        <input
                          type="text"
                          className="team-form-input"
                          placeholder="Pull Quote"
                          value={exec.quote || ""}
                          onChange={(e) => {
                            const updated = [...formState.executive_cards];
                            updated[idx] = { ...updated[idx], quote: e.target.value };
                            setFormState({ ...formState, executive_cards: updated });
                          }}
                        />
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                          <input
                            type="text"
                            className="team-form-input"
                            placeholder="LinkedIn URL"
                            value={exec.linkedin_url || ""}
                            onChange={(e) => {
                              const updated = [...formState.executive_cards];
                              updated[idx] = { ...updated[idx], linkedin_url: e.target.value };
                              setFormState({ ...formState, executive_cards: updated });
                            }}
                          />
                          <input
                            type="text"
                            className="team-form-input"
                            placeholder="Email"
                            value={exec.email || ""}
                            onChange={(e) => {
                              const updated = [...formState.executive_cards];
                              updated[idx] = { ...updated[idx], email: e.target.value };
                              setFormState({ ...formState, executive_cards: updated });
                            }}
                          />
                        </div>

                        {/* Photo upload */}
                        <div style={{ marginTop: "4px" }}>
                          <label style={{ fontSize: "11px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>
                            Leader Portrait Photo (Cloudflare CDN)
                          </label>
                          {exec.image_url && (
                            <div style={{ marginBottom: "6px" }}>
                              <img
                                src={resolveImage(exec.image_url)}
                                alt="Preview"
                                style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 4, border: "1px solid #e2e8f0" }}
                              />
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleUploadPhoto(e, "executive_cards", idx)}
                            className="team-form-input"
                          />
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="team-json-add-btn"
                      onClick={() =>
                        setFormState({
                          ...formState,
                          executive_cards: [
                            ...(formState.executive_cards || []),
                            { role: "Academic Council Member", name: "New Leader", degrees: "Ph.D.", bio: "Biography text", quote: "Institutional vision quote", image_url: "" },
                          ],
                        })
                      }
                    >
                      + Add Executive Leader
                    </button>
                  </div>
                </>
              )}

              {/* FACULTY & MENTORS DIRECTORY MODAL */}
              {editorModal === "faculty" && (
                <>
                  <div className="team-form-group">
                    <label className="team-form-label">Heading</label>
                    <input
                      type="text"
                      className="team-form-input"
                      value={formState.team_title || ""}
                      onChange={(e) => setFormState({ ...formState, team_title: e.target.value })}
                    />
                  </div>
                  <div className="team-form-group">
                    <label className="team-form-label">Description</label>
                    <textarea
                      className="team-form-input team-form-textarea"
                      value={formState.team_desc || ""}
                      onChange={(e) => setFormState({ ...formState, team_desc: e.target.value })}
                    />
                  </div>

                  {/* Categories */}
                  <div className="team-form-group">
                    <label className="team-form-label">Department Categories (Filter Tabs)</label>
                    {(formState.team_categories || []).map((cat: string, idx: number) => (
                      <div key={idx} style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
                        <input
                          type="text"
                          className="team-form-input"
                          value={cat}
                          onChange={(e) => {
                            const updated = [...formState.team_categories];
                            updated[idx] = e.target.value;
                            setFormState({ ...formState, team_categories: updated });
                          }}
                        />
                        <button
                          type="button"
                          className="team-json-remove-btn"
                          onClick={() => {
                            const updated = formState.team_categories.filter((_: any, i: number) => i !== idx);
                            setFormState({ ...formState, team_categories: updated });
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="team-json-add-btn"
                      onClick={() => setFormState({ ...formState, team_categories: [...(formState.team_categories || []), "New Category"] })}
                    >
                      + Add Category Tab
                    </button>
                  </div>

                  {/* Team Members List */}
                  <div className="team-form-group">
                    <label className="team-form-label">Faculty & Mentor Profiles</label>
                    {(formState.team_members || []).map((member: any, idx: number) => (
                      <div key={idx} className="team-json-item-box">
                        <div className="team-json-item-header">
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span>Member #{idx + 1}</span>
                            <button
                              type="button"
                              className={`team-visibility-pill ${member.is_visible !== false ? "visible" : "hidden"}`}
                              onClick={() => {
                                const updated = [...formState.team_members];
                                updated[idx] = { ...updated[idx], is_visible: member.is_visible === false ? true : false };
                                setFormState({ ...formState, team_members: updated });
                              }}
                              title="Click to toggle visibility (hidden members do not show in section)"
                            >
                              {member.is_visible !== false ? "● Visible to Public" : "○ Hidden (Invisible)"}
                            </button>
                          </div>
                          <button
                            type="button"
                            className="team-json-remove-btn"
                            onClick={() => {
                              const updated = formState.team_members.filter((_: any, i: number) => i !== idx);
                              setFormState({ ...formState, team_members: updated });
                            }}
                          >
                            Remove
                          </button>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                          <input
                            type="text"
                            className="team-form-input"
                            placeholder="Name (e.g. Dr. Sourav Ganguly)"
                            value={member.name || ""}
                            onChange={(e) => {
                              const updated = [...formState.team_members];
                              updated[idx] = { ...updated[idx], name: e.target.value };
                              setFormState({ ...formState, team_members: updated });
                            }}
                          />
                          <input
                            type="text"
                            className="team-form-input"
                            placeholder="Designation"
                            value={member.designation || ""}
                            onChange={(e) => {
                              const updated = [...formState.team_members];
                              updated[idx] = { ...updated[idx], designation: e.target.value };
                              setFormState({ ...formState, team_members: updated });
                            }}
                          />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                          <input
                            type="text"
                            className="team-form-input"
                            placeholder="Category (e.g. AI & Machine Learning)"
                            value={member.category || ""}
                            onChange={(e) => {
                              const updated = [...formState.team_members];
                              updated[idx] = { ...updated[idx], category: e.target.value };
                              setFormState({ ...formState, team_members: updated });
                            }}
                          />
                          <input
                            type="text"
                            className="team-form-input"
                            placeholder="Specialty (e.g. LLMs & Deep Learning)"
                            value={member.specialty || ""}
                            onChange={(e) => {
                              const updated = [...formState.team_members];
                              updated[idx] = { ...updated[idx], specialty: e.target.value };
                              setFormState({ ...formState, team_members: updated });
                            }}
                          />
                        </div>

                        <input
                          type="text"
                          className="team-form-input"
                          placeholder="Experience Badge (e.g. Ex-TCS Innovation • 12+ Yrs Exp)"
                          value={member.experience_badge || ""}
                          onChange={(e) => {
                            const updated = [...formState.team_members];
                            updated[idx] = { ...updated[idx], experience_badge: e.target.value };
                            setFormState({ ...formState, team_members: updated });
                          }}
                        />

                        <textarea
                          className="team-form-input team-form-textarea"
                          placeholder="Biography & Research Interests"
                          value={member.bio || ""}
                          onChange={(e) => {
                            const updated = [...formState.team_members];
                            updated[idx] = { ...updated[idx], bio: e.target.value };
                            setFormState({ ...formState, team_members: updated });
                          }}
                        />

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                          <input
                            type="text"
                            className="team-form-input"
                            placeholder="LinkedIn URL"
                            value={member.linkedin_url || ""}
                            onChange={(e) => {
                              const updated = [...formState.team_members];
                              updated[idx] = { ...updated[idx], linkedin_url: e.target.value };
                              setFormState({ ...formState, team_members: updated });
                            }}
                          />
                          <input
                            type="text"
                            className="team-form-input"
                            placeholder="Email"
                            value={member.email || ""}
                            onChange={(e) => {
                              const updated = [...formState.team_members];
                              updated[idx] = { ...updated[idx], email: e.target.value };
                              setFormState({ ...formState, team_members: updated });
                            }}
                          />
                        </div>

                        {/* Photo upload */}
                        <div style={{ marginTop: "4px" }}>
                          <label style={{ fontSize: "11px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>
                            Faculty Portrait Photo (Cloudflare CDN)
                          </label>
                          {member.image_url && (
                            <div style={{ marginBottom: "6px" }}>
                              <img
                                src={resolveImage(member.image_url)}
                                alt="Preview"
                                style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 4, border: "1px solid #e2e8f0" }}
                              />
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleUploadPhoto(e, "team_members", idx)}
                            className="team-form-input"
                          />
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="team-json-add-btn"
                      onClick={() =>
                        setFormState({
                          ...formState,
                          team_members: [
                            ...(formState.team_members || []),
                            {
                              id: `tm-${Date.now()}`,
                              name: "New Faculty Member",
                              designation: "Assistant Professor",
                              category: "AI & Machine Learning",
                              specialty: "Core Machine Learning",
                              experience_badge: "Ph.D. Scholar",
                              bio: "Research and teaching biography.",
                              image_url: "",
                              is_visible: true,
                            },
                          ],
                        })
                      }
                    >
                      + Add Faculty Member
                    </button>
                  </div>
                </>
              )}

              {/* AFFILIATIONS MODAL */}
              {editorModal === "affiliations" && (
                <>
                  <div className="team-form-group">
                    <label className="team-form-label">Heading</label>
                    <input
                      type="text"
                      className="team-form-input"
                      value={formState.affiliations_title || ""}
                      onChange={(e) => setFormState({ ...formState, affiliations_title: e.target.value })}
                    />
                  </div>
                  <div className="team-form-group">
                    <label className="team-form-label">Description</label>
                    <textarea
                      className="team-form-input team-form-textarea"
                      value={formState.affiliations_desc || ""}
                      onChange={(e) => setFormState({ ...formState, affiliations_desc: e.target.value })}
                    />
                  </div>

                  <div className="team-form-group">
                    <label className="team-form-label">Affiliation Logos & Badges</label>
                    {(formState.affiliations_logos || []).map((aff: any, idx: number) => (
                      <div key={idx} className="team-json-item-box">
                        <div className="team-json-item-header">
                          <span>Affiliation #{idx + 1}</span>
                          <button
                            type="button"
                            className="team-json-remove-btn"
                            onClick={() => {
                              const updated = formState.affiliations_logos.filter((_: any, i: number) => i !== idx);
                              setFormState({ ...formState, affiliations_logos: updated });
                            }}
                          >
                            Remove
                          </button>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                          <input
                            type="text"
                            className="team-form-input"
                            placeholder="Organization / University Name"
                            value={aff.name || ""}
                            onChange={(e) => {
                              const updated = [...formState.affiliations_logos];
                              updated[idx] = { ...updated[idx], name: e.target.value };
                              setFormState({ ...formState, affiliations_logos: updated });
                            }}
                          />
                          <input
                            type="text"
                            className="team-form-input"
                            placeholder="Tag (e.g. Research Alumni)"
                            value={aff.tag || ""}
                            onChange={(e) => {
                              const updated = [...formState.affiliations_logos];
                              updated[idx] = { ...updated[idx], tag: e.target.value };
                              setFormState({ ...formState, affiliations_logos: updated });
                            }}
                          />
                        </div>

                        {/* Logo upload */}
                        <div style={{ marginTop: "6px" }}>
                          <label style={{ fontSize: "11px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>
                            Organization Logo (Upload Image to Cloudflare CDN)
                          </label>
                          {aff.logo_url && (
                            <div style={{ marginBottom: "6px", display: "flex", alignItems: "center", gap: "10px" }}>
                              <img
                                src={resolveImage(aff.logo_url)}
                                alt="Logo Preview"
                                style={{ height: 36, maxWidth: 120, objectFit: "contain", background: "#ffffff", padding: "4px 8px", borderRadius: 4, border: "1px solid #e2e8f0" }}
                              />
                              <button
                                type="button"
                                className="team-json-remove-btn"
                                onClick={() => {
                                  const updated = [...formState.affiliations_logos];
                                  updated[idx] = { ...updated[idx], logo_url: "" };
                                  setFormState({ ...formState, affiliations_logos: updated });
                                }}
                              >
                                Remove Logo
                              </button>
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleUploadPhoto(e, "affiliations_logos", idx)}
                            className="team-form-input"
                          />
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="team-json-add-btn"
                      onClick={() =>
                        setFormState({
                          ...formState,
                          affiliations_logos: [
                            ...(formState.affiliations_logos || []),
                            { id: `aff-${Date.now()}`, name: "Premier Tech Firm", tag: "Industry Partner" },
                          ],
                        })
                      }
                    >
                      + Add Affiliation Entry
                    </button>
                  </div>
                </>
              )}

              {/* FRAMEWORK MODAL */}
              {editorModal === "framework" && (
                <>
                  <div className="team-form-group">
                    <label className="team-form-label">Heading</label>
                    <input
                      type="text"
                      className="team-form-input"
                      value={formState.framework_title || ""}
                      onChange={(e) => setFormState({ ...formState, framework_title: e.target.value })}
                    />
                  </div>
                  <div className="team-form-group">
                    <label className="team-form-label">Description</label>
                    <textarea
                      className="team-form-input team-form-textarea"
                      value={formState.framework_desc || ""}
                      onChange={(e) => setFormState({ ...formState, framework_desc: e.target.value })}
                    />
                  </div>

                  <div className="team-form-group">
                    <label className="team-form-label">Pillar Cards</label>
                    {(formState.framework_cards || []).map((card: any, idx: number) => (
                      <div key={idx} className="team-json-item-box">
                        <div className="team-json-item-header">
                          <span>Pillar #{idx + 1}</span>
                          <button
                            type="button"
                            className="team-json-remove-btn"
                            onClick={() => {
                              const updated = formState.framework_cards.filter((_: any, i: number) => i !== idx);
                              setFormState({ ...formState, framework_cards: updated });
                            }}
                          >
                            Remove
                          </button>
                        </div>
                        <input
                          type="text"
                          className="team-form-input"
                          placeholder="Pillar Title"
                          value={card.title || ""}
                          onChange={(e) => {
                            const updated = [...formState.framework_cards];
                            updated[idx] = { ...updated[idx], title: e.target.value };
                            setFormState({ ...formState, framework_cards: updated });
                          }}
                        />
                        <textarea
                          className="team-form-input team-form-textarea"
                          placeholder="Description"
                          value={card.desc || ""}
                          onChange={(e) => {
                            const updated = [...formState.framework_cards];
                            updated[idx] = { ...updated[idx], desc: e.target.value };
                            setFormState({ ...formState, framework_cards: updated });
                          }}
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      className="team-json-add-btn"
                      onClick={() =>
                        setFormState({
                          ...formState,
                          framework_cards: [
                            ...(formState.framework_cards || []),
                            { title: "Pillar Title", desc: "Description text" },
                          ],
                        })
                      }
                    >
                      + Add Pillar Card
                    </button>
                  </div>
                </>
              )}

              {/* CTA MODAL */}
              {editorModal === "cta" && (
                <>
                  <div className="team-form-group">
                    <label className="team-form-label">Heading</label>
                    <input
                      type="text"
                      className="team-form-input"
                      value={formState.cta_title || ""}
                      onChange={(e) => setFormState({ ...formState, cta_title: e.target.value })}
                    />
                  </div>
                  <div className="team-form-group">
                    <label className="team-form-label">Description</label>
                    <textarea
                      className="team-form-input team-form-textarea"
                      value={formState.cta_desc || ""}
                      onChange={(e) => setFormState({ ...formState, cta_desc: e.target.value })}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                    <div className="team-form-group">
                      <label className="team-form-label">Primary Button Text</label>
                      <input
                        type="text"
                        className="team-form-input"
                        value={formState.cta_primary_btn_text || ""}
                        onChange={(e) => setFormState({ ...formState, cta_primary_btn_text: e.target.value })}
                      />
                    </div>
                    <div className="team-form-group">
                      <label className="team-form-label">Primary Button Link</label>
                      <input
                        type="text"
                        className="team-form-input"
                        value={formState.cta_primary_btn_link || ""}
                        onChange={(e) => setFormState({ ...formState, cta_primary_btn_link: e.target.value })}
                      />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                    <div className="team-form-group">
                      <label className="team-form-label">Secondary Button Text</label>
                      <input
                        type="text"
                        className="team-form-input"
                        value={formState.cta_secondary_btn_text || ""}
                        onChange={(e) => setFormState({ ...formState, cta_secondary_btn_text: e.target.value })}
                      />
                    </div>
                    <div className="team-form-group">
                      <label className="team-form-label">Secondary Button Link</label>
                      <input
                        type="text"
                        className="team-form-input"
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
                  <div className="team-form-group">
                    <label className="team-form-label">SEO Meta Title</label>
                    <input
                      type="text"
                      className="team-form-input"
                      value={formState.seo_title || ""}
                      onChange={(e) => setFormState({ ...formState, seo_title: e.target.value })}
                    />
                  </div>
                  <div className="team-form-group">
                    <label className="team-form-label">SEO Meta Description</label>
                    <textarea
                      className="team-form-input team-form-textarea"
                      value={formState.seo_description || ""}
                      onChange={(e) => setFormState({ ...formState, seo_description: e.target.value })}
                    />
                  </div>
                  <div className="team-form-group">
                    <label className="team-form-label">SEO Keywords</label>
                    <input
                      type="text"
                      className="team-form-input"
                      value={formState.seo_keywords || ""}
                      onChange={(e) => setFormState({ ...formState, seo_keywords: e.target.value })}
                    />
                  </div>

                  <h4 style={{ margin: "20px 0 10px", color: "#e63946" }}>
                    AEO (Answer Engine Optimization) & FAQ Engine
                  </h4>
                  <p style={{ fontSize: "12.5px", color: "#64748b", margin: "0 0 12px" }}>
                    Factual Q&As parsed into Google/AI Search <code>FAQPage</code> schema and rendered in the page FAQ accordion.
                  </p>

                  <div className="team-form-group">
                    {(formState.aeo_faqs || []).map((faq: any, idx: number) => (
                      <div key={idx} className="team-json-item-box">
                        <div className="team-json-item-header">
                          <span>FAQ Question #{idx + 1}</span>
                          <button
                            type="button"
                            className="team-json-remove-btn"
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
                          className="team-form-input"
                          placeholder="Question"
                          value={faq.q || ""}
                          onChange={(e) => {
                            const updated = [...formState.aeo_faqs];
                            updated[idx] = { ...updated[idx], q: e.target.value };
                            setFormState({ ...formState, aeo_faqs: updated });
                          }}
                        />
                        <textarea
                          className="team-form-input team-form-textarea"
                          placeholder="Accurate factual answer"
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
                      className="team-json-add-btn"
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

            <div className="team-modal-footer">
              <span className={`team-modal-status ${modalStatus.type}`}>
                {modalStatus.msg}
              </span>
              <div className="team-modal-actions">
                <button type="button" className="team-btn-cancel" onClick={() => setEditorModal(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="team-btn-save"
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
