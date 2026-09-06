"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import PublicNavbar from "@/components/PublicNavbar";
import PublicFooter from "@/components/PublicFooter";
import { API_BASE_URL, BACKEND_BASE_URL } from "@/lib/config";
import { apiFetch } from "@/lib/apiFetch";
import "./certification.css";

// ── Types ──
interface CertificationDoc {
  id?: string;
  badge?: string;
  title: string;
  authority: string;
  reg_no?: string;
  image_url: string;
  year?: string;
  is_visible?: boolean;
}

interface CertificationData {
  hero_eyebrow?: string;
  hero_title?: string;
  hero_subtitle?: string;
  hero_text?: string;
  hero_badges_json?: string;
  hero_card_rows_json?: string;

  standards_eyebrow?: string;
  standards_title?: string;
  standards_desc?: string;
  standards_cards_json?: string;

  gallery_eyebrow?: string;
  gallery_title?: string;
  gallery_desc?: string;
  gallery_items_json?: string;

  partners_eyebrow?: string;
  partners_title?: string;
  partners_desc?: string;
  partners_cards_json?: string;

  verification_eyebrow?: string;
  verification_title?: string;
  verification_desc?: string;
  verification_steps_json?: string;
  verification_portal_url?: string;

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

type EditorModalType = "hero" | "standards" | "gallery" | "partners" | "verification" | "cta" | "seo" | null;

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

    const nodeCount = Math.min(Math.max(Math.floor((width * height) / 16000), 28), 48);
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
        isRed: Math.random() < 0.22,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Gridlines
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

      // Nodes & connections
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

  return <canvas ref={canvasRef} className="cert-hero-canvas" />;
}

// ── Safe JSON Helper ──
function parseJsonSafe<T>(jsonStr?: string, fallback: T = [] as any): T {
  if (!jsonStr) return fallback;
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    return fallback;
  }
}

export default function CertificationClientView({ initialData }: { initialData: CertificationData }) {
  // Pre-populated directly from server SSR (Instant 0ms first render!)
  const [data, setData] = useState<CertificationData>(initialData);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(0);
  const [lightboxDoc, setLightboxDoc] = useState<CertificationDoc | null>(null);

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

  // Check super admin session
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
    } else if (type === "standards") {
      setFormState({
        standards_eyebrow: data.standards_eyebrow || "",
        standards_title: data.standards_title || "",
        standards_desc: data.standards_desc || "",
        standards_cards: parseJsonSafe<Array<{ badge: string; title: string; desc: string }>>(data.standards_cards_json, []),
      });
    } else if (type === "gallery") {
      setFormState({
        gallery_eyebrow: data.gallery_eyebrow || "",
        gallery_title: data.gallery_title || "",
        gallery_desc: data.gallery_desc || "",
        gallery_items: parseJsonSafe<CertificationDoc[]>(data.gallery_items_json, []),
      });
    } else if (type === "partners") {
      setFormState({
        partners_eyebrow: data.partners_eyebrow || "",
        partners_title: data.partners_title || "",
        partners_desc: data.partners_desc || "",
        partners_cards: parseJsonSafe<Array<{ title: string; desc: string }>>(data.partners_cards_json, []),
      });
    } else if (type === "verification") {
      setFormState({
        verification_eyebrow: data.verification_eyebrow || "",
        verification_title: data.verification_title || "",
        verification_desc: data.verification_desc || "",
        verification_steps: parseJsonSafe<Array<{ step: string; title: string; desc: string }>>(data.verification_steps_json, []),
        verification_portal_url: data.verification_portal_url || "",
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

      let payload: Partial<CertificationData> = {};

      if (editorModal === "hero") {
        payload = {
          hero_eyebrow: formState.hero_eyebrow,
          hero_title: formState.hero_title,
          hero_subtitle: formState.hero_subtitle,
          hero_text: formState.hero_text,
          hero_badges_json: JSON.stringify(formState.hero_badges || []),
          hero_card_rows_json: JSON.stringify(formState.hero_card_rows || []),
        };
      } else if (editorModal === "standards") {
        payload = {
          standards_eyebrow: formState.standards_eyebrow,
          standards_title: formState.standards_title,
          standards_desc: formState.standards_desc,
          standards_cards_json: JSON.stringify(formState.standards_cards || []),
        };
      } else if (editorModal === "gallery") {
        payload = {
          gallery_eyebrow: formState.gallery_eyebrow,
          gallery_title: formState.gallery_title,
          gallery_desc: formState.gallery_desc,
          gallery_items_json: JSON.stringify(formState.gallery_items || []),
        };
      } else if (editorModal === "partners") {
        payload = {
          partners_eyebrow: formState.partners_eyebrow,
          partners_title: formState.partners_title,
          partners_desc: formState.partners_desc,
          partners_cards_json: JSON.stringify(formState.partners_cards || []),
        };
      } else if (editorModal === "verification") {
        payload = {
          verification_eyebrow: formState.verification_eyebrow,
          verification_title: formState.verification_title,
          verification_desc: formState.verification_desc,
          verification_steps_json: JSON.stringify(formState.verification_steps || []),
          verification_portal_url: formState.verification_portal_url,
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

      const res = await apiFetch(`${API_BASE_URL}/certification/data`, {
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

  // Upload scanned certificate image
  const handleUploadCertificateImage = async (e: React.ChangeEvent<HTMLInputElement>, itemIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiFetch(`${API_BASE_URL}/certification/upload-document`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        const updated = [...(formState.gallery_items || [])];
        updated[itemIndex] = { ...updated[itemIndex], image_url: json.url };
        setFormState((prev) => ({ ...prev, gallery_items: updated }));
        setModalStatus({ msg: "Scanned document uploaded! Click Save to apply.", type: "success" });
      } else {
        setModalStatus({ msg: "Document upload failed.", type: "error" });
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
  const heroBadges = parseJsonSafe<string[]>(data.hero_badges_json, []);
  const heroCardRows = parseJsonSafe<Array<{ title: string; sub: string }>>(data.hero_card_rows_json, []);
  const standardsCards = parseJsonSafe<Array<{ badge: string; title: string; desc: string }>>(data.standards_cards_json, []);
  const galleryItems = parseJsonSafe<CertificationDoc[]>(data.gallery_items_json, []);
  const partnersCards = parseJsonSafe<Array<{ title: string; desc: string }>>(data.partners_cards_json, []);
  const verificationSteps = parseJsonSafe<Array<{ step: string; title: string; desc: string }>>(data.verification_steps_json, []);
  const aeoFaqs = parseJsonSafe<Array<{ q: string; a: string }>>(data.aeo_faqs_json, []);

  return (
    <div className="cert-page">
      <PublicNavbar />

      {/* ── Breadcrumb Bar ── */}
      <div className="cert-breadcrumb-wrapper">
        <div className="cert-container">
          <nav className="cert-breadcrumb-bar" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="cert-breadcrumb-sep">/</span>
            <Link href="/about-iinm">About</Link>
            <span className="cert-breadcrumb-sep">/</span>
            <span className="cert-breadcrumb-active">Certifications</span>
          </nav>
        </div>
      </div>

      <main>
        {/* ══════════════════════════════════════════════════════════
            SECTION 1: HERO (LIGHT)
            ══════════════════════════════════════════════════════════ */}
        <section 
          className="cert-hero-section"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <NetworkGridCanvas mousePos={mousePos} />

          <div className="cert-container cert-hero-inner">
            {isSuperAdmin && (
              <div className="cert-admin-bar">
                <button type="button" onClick={() => handleOpenEditor("hero")} className="cert-edit-btn">
                  <span>✎ Super Admin: Edit Hero Section</span>
                </button>
              </div>
            )}

            <div className="cert-hero-grid">
              {/* Left Column: Eyebrow, H1, Subtitle, Narrative, Badges */}
              <div className="cert-hero-left">
                <div className="cert-eyebrow-tag">
                  {data.hero_eyebrow || "QUALITY STANDARDS & ACCREDITATIONS"}
                </div>

                <h1 className="cert-hero-heading">
                  {data.hero_title || "Institutional Certifications"}
                </h1>

                {data.hero_subtitle && (
                  <div className="cert-hero-subtitle">{data.hero_subtitle}</div>
                )}

                <p className="cert-hero-text">
                  {data.hero_text}
                </p>

                {heroBadges.length > 0 && (
                  <div className="cert-hero-badges-row">
                    {heroBadges.map((badge, idx) => (
                      <div key={idx} className="cert-hero-badge-pill">
                        <span className="cert-hero-badge-dot" />
                        <span>{badge}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Credentials Assurance Card */}
              <div className="cert-credentials-card">
                <div className="cert-card-header">
                  <span className="cert-card-title">Authenticity Assurance</span>
                  <span className="cert-card-tag">Verifiable Hub</span>
                </div>

                <div className="cert-card-list">
                  {heroCardRows.map((row, idx) => (
                    <div key={idx} className="cert-card-row">
                      <span className="cert-card-row-dot" />
                      <div>
                        <div className="cert-card-row-title">{row.title}</div>
                        <div className="cert-card-row-sub">{row.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION 2: STATUTORY STANDARDS & ACCREDITATIONS (DARK - #0a1628)
            ══════════════════════════════════════════════════════════ */}
        <section className="cert-standards-section">
          <div className="cert-container">
            {isSuperAdmin && (
              <div className="cert-admin-bar">
                <button type="button" onClick={() => handleOpenEditor("standards")} className="cert-edit-btn cert-edit-btn-dark">
                  <span>✎ Super Admin: Edit Standards</span>
                </button>
              </div>
            )}

            <div className="cert-section-header-dark">
              <div className="cert-eyebrow-tag cert-eyebrow-tag-dark">
                {data.standards_eyebrow || "STATUTORY RECOGNITION"}
              </div>
              <h2>{data.standards_title}</h2>
              <p>{data.standards_desc}</p>
            </div>

            <div className="cert-standards-grid">
              {standardsCards.map((card, idx) => (
                <div key={idx} className="cert-standard-card">
                  <span className="cert-standard-badge">{card.badge}</span>
                  <h3>{card.title}</h3>
                  <p>{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION 3: OFFICIAL SCANNED CERTIFICATES GALLERY (LIGHT - #ffffff)
            ══════════════════════════════════════════════════════════ */}
        <section className="cert-gallery-section">
          <div className="cert-container">
            {isSuperAdmin && (
              <div className="cert-admin-bar">
                <button type="button" onClick={() => handleOpenEditor("gallery")} className="cert-edit-btn">
                  <span>✎ Super Admin: Manage Certificate Gallery</span>
                </button>
              </div>
            )}

            <div className="cert-section-header-light">
              <div className="cert-eyebrow-tag">
                {data.gallery_eyebrow || "OFFICIAL DOCUMENT ARCHIVE"}
              </div>
              <h2>{data.gallery_title}</h2>
              <p>{data.gallery_desc}</p>
            </div>

            <div className="cert-gallery-grid">
              {galleryItems
                .filter((item) => item.is_visible !== false)
                .map((item, idx) => (
                  <article key={idx} className="cert-doc-card">
                    <div 
                      className="cert-doc-preview"
                      onClick={() => setLightboxDoc(item)}
                      title="Click to inspect full-screen document"
                    >
                      {item.image_url ? (
                        <img 
                          src={resolveImage(item.image_url)} 
                          alt={item.title} 
                          className="cert-doc-img"
                        />
                      ) : (
                        <div className="cert-doc-fallback">
                          <div className="cert-doc-fallback-seal">📜</div>
                          <span style={{ fontSize: "12px", fontWeight: 600 }}>Official Document Scan</span>
                        </div>
                      )}
                      <div className="cert-doc-overlay">
                        <span className="cert-doc-overlay-btn">🔍 Inspect Document</span>
                      </div>
                    </div>

                    <div className="cert-doc-info">
                      <div className="cert-doc-badge-row">
                        <span className="cert-doc-badge">{item.badge || "VERIFIED"}</span>
                        {item.reg_no && <span className="cert-doc-reg">{item.reg_no}</span>}
                      </div>

                      <h3 className="cert-doc-title">{item.title}</h3>
                      <p className="cert-doc-authority">{item.authority}</p>

                      <button
                        type="button"
                        className="cert-doc-action-btn"
                        onClick={() => setLightboxDoc(item)}
                      >
                        View High-Resolution Scan
                      </button>
                    </div>
                  </article>
                ))}
            </div>
          </div>
        </section>

        {/* ── Document Lightbox Modal ── */}
        {lightboxDoc && (
          <div className="cert-lightbox-backdrop" onClick={() => setLightboxDoc(null)}>
            <div className="cert-lightbox-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="cert-lightbox-header">
                <h3 className="cert-lightbox-title">{lightboxDoc.title}</h3>
                <button type="button" className="cert-lightbox-close" onClick={() => setLightboxDoc(null)}>✕</button>
              </div>

              <div className="cert-lightbox-body">
                {lightboxDoc.image_url ? (
                  <img 
                    src={resolveImage(lightboxDoc.image_url)} 
                    alt={lightboxDoc.title} 
                    className="cert-lightbox-img" 
                  />
                ) : (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
                    <div style={{ fontSize: "42px", marginBottom: "12px" }}>🏛️</div>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: "#0a1628", marginBottom: "6px" }}>
                      {lightboxDoc.title}
                    </div>
                    <p style={{ maxWidth: "480px", margin: "0 auto", fontSize: "14px", lineHeight: 1.6 }}>
                      {lightboxDoc.authority}. Official scanned copy is indexed in our central compliance records. Super Admin can upload the high-resolution scanned document directly from the edit modal.
                    </p>
                  </div>
                )}
              </div>

              <div className="cert-lightbox-footer">
                <div>
                  <strong>Issuing Authority:</strong> {lightboxDoc.authority}
                  {lightboxDoc.reg_no && ` • ${lightboxDoc.reg_no}`}
                </div>
                <button 
                  type="button" 
                  onClick={() => setLightboxDoc(null)} 
                  style={{ background: "#0a1628", color: "#fff", border: "none", padding: "6px 14px", borderRadius: 4, cursor: "pointer", fontWeight: 600, fontSize: "12px" }}
                >
                  Close Viewer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            SECTION 4: ACADEMIC & SKILL FRAMEWORK (DARK - #0d1e38)
            ══════════════════════════════════════════════════════════ */}
        <section className="cert-framework-section">
          <div className="cert-container">
            {isSuperAdmin && (
              <div className="cert-admin-bar">
                <button type="button" onClick={() => handleOpenEditor("partners")} className="cert-edit-btn cert-edit-btn-dark">
                  <span>✎ Super Admin: Edit Framework</span>
                </button>
              </div>
            )}

            <div className="cert-section-header-dark">
              <div className="cert-eyebrow-tag cert-eyebrow-tag-dark">
                {data.partners_eyebrow || "COLLABORATION FRAMEWORK"}
              </div>
              <h2>{data.partners_title}</h2>
              <p>{data.partners_desc}</p>
            </div>

            <div className="cert-framework-grid">
              {partnersCards.map((card, idx) => (
                <div key={idx} className="cert-framework-card">
                  <h3>{card.title}</h3>
                  <p>{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION 5: 3-STEP ONLINE VERIFICATION (LIGHT - #f8fafc)
            ══════════════════════════════════════════════════════════ */}
        <section className="cert-verification-section">
          <div className="cert-container">
            {isSuperAdmin && (
              <div className="cert-admin-bar">
                <button type="button" onClick={() => handleOpenEditor("verification")} className="cert-edit-btn">
                  <span>✎ Super Admin: Edit Verification System</span>
                </button>
              </div>
            )}

            <div className="cert-section-header-light">
              <div className="cert-eyebrow-tag">
                {data.verification_eyebrow || "CREDENTIAL INTEGRITY"}
              </div>
              <h2>{data.verification_title}</h2>
              <p>{data.verification_desc}</p>
            </div>

            <div className="cert-steps-grid">
              {verificationSteps.map((step, idx) => (
                <div key={idx} className="cert-step-card">
                  <span className="cert-step-number">{step.step}</span>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
              ))}
            </div>

            <div className="cert-verification-action-box">
              <div className="cert-verification-action-text">
                <h4>Looking to verify a student credential or mark sheet?</h4>
                <p>Recruiters and institutional partners can verify certificate validity online 24x7.</p>
              </div>
              <Link href={data.verification_portal_url || "/contact-us"} className="cert-btn-verify">
                Access Verification Portal →
              </Link>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION 6: VISUAL AEO FAQ ACCORDION (LIGHT - #ffffff)
            ══════════════════════════════════════════════════════════ */}
        {aeoFaqs.length > 0 && (
          <section className="cert-faq-section">
            <div className="cert-container">
              {isSuperAdmin && (
                <div className="cert-admin-bar">
                  <button type="button" onClick={() => handleOpenEditor("seo")} className="cert-edit-btn">
                    <span>✎ Super Admin: Edit SEO & AEO Engine</span>
                  </button>
                </div>
              )}

              <div className="cert-section-header-light" style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 40px" }}>
                <div className="cert-eyebrow-tag">
                  CERTIFICATION & RECOGNITION FAQ
                </div>
                <h2>Frequently Asked Questions</h2>
                <p>
                  Official answers regarding certificate validity, employer acceptance, and verification processes.
                </p>
              </div>

              <div className="cert-faq-list">
                {aeoFaqs.map((faq, idx) => (
                  <div key={idx} className={`cert-faq-item ${activeFaqIndex === idx ? "active" : ""}`}>
                    <button
                      type="button"
                      className="cert-faq-trigger"
                      onClick={() => setActiveFaqIndex(activeFaqIndex === idx ? null : idx)}
                    >
                      <span>{faq.q}</span>
                      <span className="cert-faq-icon">{activeFaqIndex === idx ? "−" : "+"}</span>
                    </button>
                    {activeFaqIndex === idx && (
                      <div className="cert-faq-body">
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
        <section className="cert-cta-section">
          <div className="cert-container">
            {isSuperAdmin && (
              <div className="cert-admin-bar" style={{ marginBottom: 12 }}>
                <button type="button" onClick={() => handleOpenEditor("cta")} className="cert-edit-btn cert-edit-btn-dark">
                  <span>✎ Super Admin: Edit CTA Section</span>
                </button>
              </div>
            )}

            <div className="cert-cta-inner">
              <div className="cert-cta-content">
                <h2>{data.cta_title || "Validate Your Professional Credentials"}</h2>
                <p>{data.cta_desc}</p>
              </div>

              <div className="cert-cta-buttons">
                <Link href={data.cta_primary_btn_link || "/courses"} className="cert-btn-red">
                  {data.cta_primary_btn_text || "Explore Certified Courses"}
                </Link>
                <Link href={data.cta_secondary_btn_link || "/contact-us"} className="cert-btn-outline-white">
                  {data.cta_secondary_btn_text || "Contact Admissions"}
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
        <div className="cert-modal-backdrop" onClick={() => setEditorModal(null)}>
          <div className="cert-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="cert-modal-header">
              <h3 className="cert-modal-title">
                {editorModal === "hero" && "Super Admin: Edit Hero Section"}
                {editorModal === "standards" && "Super Admin: Edit Accreditations & Standards"}
                {editorModal === "gallery" && "Super Admin: Manage Scanned Documents Gallery"}
                {editorModal === "partners" && "Super Admin: Edit Collaboration Framework"}
                {editorModal === "verification" && "Super Admin: Edit 3-Step Verification System"}
                {editorModal === "cta" && "Super Admin: Edit Call to Action"}
                {editorModal === "seo" && "Super Admin: Edit SEO & AEO Search Engine Engine"}
              </h3>
              <button type="button" className="cert-modal-close-btn" onClick={() => setEditorModal(null)}>✕</button>
            </div>

            <div className="cert-modal-body">
              {/* HERO MODAL */}
              {editorModal === "hero" && (
                <>
                  <div className="cert-form-group">
                    <label className="cert-form-label">Eyebrow Tag</label>
                    <input
                      type="text"
                      className="cert-form-input"
                      value={formState.hero_eyebrow || ""}
                      onChange={(e) => setFormState({ ...formState, hero_eyebrow: e.target.value })}
                    />
                  </div>
                  <div className="cert-form-group">
                    <label className="cert-form-label">Main Heading</label>
                    <input
                      type="text"
                      className="cert-form-input"
                      value={formState.hero_title || ""}
                      onChange={(e) => setFormState({ ...formState, hero_title: e.target.value })}
                    />
                  </div>
                  <div className="cert-form-group">
                    <label className="cert-form-label">Subtitle Highlight</label>
                    <input
                      type="text"
                      className="cert-form-input"
                      value={formState.hero_subtitle || ""}
                      onChange={(e) => setFormState({ ...formState, hero_subtitle: e.target.value })}
                    />
                  </div>
                  <div className="cert-form-group">
                    <label className="cert-form-label">Narrative Text</label>
                    <textarea
                      className="cert-form-input cert-form-textarea"
                      value={formState.hero_text || ""}
                      onChange={(e) => setFormState({ ...formState, hero_text: e.target.value })}
                    />
                  </div>

                  <div className="cert-form-group">
                    <label className="cert-form-label">Hero Accreditation Badges</label>
                    {(formState.hero_badges || []).map((badge: string, idx: number) => (
                      <div key={idx} style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
                        <input
                          type="text"
                          className="cert-form-input"
                          value={badge}
                          onChange={(e) => {
                            const updated = [...formState.hero_badges];
                            updated[idx] = e.target.value;
                            setFormState({ ...formState, hero_badges: updated });
                          }}
                        />
                        <button
                          type="button"
                          className="cert-json-remove-btn"
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
                      className="cert-json-add-btn"
                      onClick={() => setFormState({ ...formState, hero_badges: [...(formState.hero_badges || []), "New Accreditation Badge"] })}
                    >
                      + Add Badge Pill
                    </button>
                  </div>

                  <div className="cert-form-group">
                    <label className="cert-form-label">Right Card: Authenticity Assurance Rows</label>
                    {(formState.hero_card_rows || []).map((row: any, idx: number) => (
                      <div key={idx} className="cert-json-item-box">
                        <div className="cert-json-item-header">
                          <span>Row #{idx + 1}</span>
                          <button
                            type="button"
                            className="cert-json-remove-btn"
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
                          className="cert-form-input"
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
                          className="cert-form-input"
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
                      className="cert-json-add-btn"
                      onClick={() =>
                        setFormState({
                          ...formState,
                          hero_card_rows: [...(formState.hero_card_rows || []), { title: "Assurance Item", sub: "Explanation of statutory validity" }],
                        })
                      }
                    >
                      + Add Assurance Row
                    </button>
                  </div>
                </>
              )}

              {/* STANDARDS MODAL */}
              {editorModal === "standards" && (
                <>
                  <div className="cert-form-group">
                    <label className="cert-form-label">Heading</label>
                    <input
                      type="text"
                      className="cert-form-input"
                      value={formState.standards_title || ""}
                      onChange={(e) => setFormState({ ...formState, standards_title: e.target.value })}
                    />
                  </div>
                  <div className="cert-form-group">
                    <label className="cert-form-label">Description</label>
                    <textarea
                      className="cert-form-input cert-form-textarea"
                      value={formState.standards_desc || ""}
                      onChange={(e) => setFormState({ ...formState, standards_desc: e.target.value })}
                    />
                  </div>

                  <div className="cert-form-group">
                    <label className="cert-form-label">Accreditation Cards</label>
                    {(formState.standards_cards || []).map((card: any, idx: number) => (
                      <div key={idx} className="cert-json-item-box">
                        <div className="cert-json-item-header">
                          <span>Card #{idx + 1}</span>
                          <button
                            type="button"
                            className="cert-json-remove-btn"
                            onClick={() => {
                              const updated = formState.standards_cards.filter((_: any, i: number) => i !== idx);
                              setFormState({ ...formState, standards_cards: updated });
                            }}
                          >
                            Remove
                          </button>
                        </div>
                        <input
                          type="text"
                          className="cert-form-input"
                          placeholder="Badge (e.g. Quality Standard)"
                          value={card.badge || ""}
                          onChange={(e) => {
                            const updated = [...formState.standards_cards];
                            updated[idx] = { ...updated[idx], badge: e.target.value };
                            setFormState({ ...formState, standards_cards: updated });
                          }}
                        />
                        <input
                          type="text"
                          className="cert-form-input"
                          placeholder="Title (e.g. ISO 9001:2015)"
                          value={card.title || ""}
                          onChange={(e) => {
                            const updated = [...formState.standards_cards];
                            updated[idx] = { ...updated[idx], title: e.target.value };
                            setFormState({ ...formState, standards_cards: updated });
                          }}
                        />
                        <textarea
                          className="cert-form-input cert-form-textarea"
                          placeholder="Description"
                          value={card.desc || ""}
                          onChange={(e) => {
                            const updated = [...formState.standards_cards];
                            updated[idx] = { ...updated[idx], desc: e.target.value };
                            setFormState({ ...formState, standards_cards: updated });
                          }}
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      className="cert-json-add-btn"
                      onClick={() =>
                        setFormState({
                          ...formState,
                          standards_cards: [...(formState.standards_cards || []), { badge: "Standard", title: "Certification Title", desc: "Description text" }],
                        })
                      }
                    >
                      + Add Accreditation Card
                    </button>
                  </div>
                </>
              )}

              {/* GALLERY MODAL */}
              {editorModal === "gallery" && (
                <>
                  <div className="cert-form-group">
                    <label className="cert-form-label">Heading</label>
                    <input
                      type="text"
                      className="cert-form-input"
                      value={formState.gallery_title || ""}
                      onChange={(e) => setFormState({ ...formState, gallery_title: e.target.value })}
                    />
                  </div>
                  <div className="cert-form-group">
                    <label className="cert-form-label">Description</label>
                    <textarea
                      className="cert-form-input cert-form-textarea"
                      value={formState.gallery_desc || ""}
                      onChange={(e) => setFormState({ ...formState, gallery_desc: e.target.value })}
                    />
                  </div>

                  <div className="cert-form-group">
                    <label className="cert-form-label">Certificate Document Items</label>
                    {(formState.gallery_items || []).map((item: any, idx: number) => (
                      <div key={idx} className="cert-json-item-box">
                        <div className="cert-json-item-header">
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span>Document #{idx + 1}</span>
                            <button
                              type="button"
                              className={`cert-visibility-pill ${item.is_visible !== false ? "visible" : "hidden"}`}
                              onClick={() => {
                                const updated = [...formState.gallery_items];
                                updated[idx] = { ...updated[idx], is_visible: item.is_visible === false ? true : false };
                                setFormState({ ...formState, gallery_items: updated });
                              }}
                              title="Click to toggle visible or invisible for public visitors"
                            >
                              {item.is_visible !== false ? "● Visible to Public" : "○ Hidden (Invisible)"}
                            </button>
                          </div>
                          <button
                            type="button"
                            className="cert-json-remove-btn"
                            onClick={() => {
                              const updated = formState.gallery_items.filter((_: any, i: number) => i !== idx);
                              setFormState({ ...formState, gallery_items: updated });
                            }}
                          >
                            Remove
                          </button>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                          <input
                            type="text"
                            className="cert-form-input"
                            placeholder="Badge (e.g. ISO CERTIFICATE)"
                            value={item.badge || ""}
                            onChange={(e) => {
                              const updated = [...formState.gallery_items];
                              updated[idx] = { ...updated[idx], badge: e.target.value };
                              setFormState({ ...formState, gallery_items: updated });
                            }}
                          />
                          <input
                            type="text"
                            className="cert-form-input"
                            placeholder="Reg / Certificate No."
                            value={item.reg_no || ""}
                            onChange={(e) => {
                              const updated = [...formState.gallery_items];
                              updated[idx] = { ...updated[idx], reg_no: e.target.value };
                              setFormState({ ...formState, gallery_items: updated });
                            }}
                          />
                        </div>
                        <input
                          type="text"
                          className="cert-form-input"
                          placeholder="Document Title"
                          value={item.title || ""}
                          onChange={(e) => {
                            const updated = [...formState.gallery_items];
                            updated[idx] = { ...updated[idx], title: e.target.value };
                            setFormState({ ...formState, gallery_items: updated });
                          }}
                        />
                        <input
                          type="text"
                          className="cert-form-input"
                          placeholder="Issuing Authority"
                          value={item.authority || ""}
                          onChange={(e) => {
                            const updated = [...formState.gallery_items];
                            updated[idx] = { ...updated[idx], authority: e.target.value };
                            setFormState({ ...formState, gallery_items: updated });
                          }}
                        />

                        {/* Document image upload preview */}
                        <div style={{ marginTop: "4px" }}>
                          <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px" }}>
                            Scanned Document Image (Click Choose File to upload)
                          </label>
                          {item.image_url && (
                            <div style={{ marginBottom: "6px" }}>
                              <img
                                src={resolveImage(item.image_url)}
                                alt="Preview"
                                style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 4, border: "1px solid #e2e8f0" }}
                              />
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleUploadCertificateImage(e, idx)}
                            className="cert-form-input"
                          />
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="cert-json-add-btn"
                      onClick={() =>
                        setFormState({
                          ...formState,
                          gallery_items: [
                            ...(formState.gallery_items || []),
                            { badge: "CERTIFICATE", title: "New Certificate Scan", authority: "Issuing Authority", reg_no: "Reg. No.", image_url: "", is_visible: true },
                          ],
                        })
                      }
                    >
                      + Add Certificate Document
                    </button>
                  </div>
                </>
              )}

              {/* PARTNERS MODAL */}
              {editorModal === "partners" && (
                <>
                  <div className="cert-form-group">
                    <label className="cert-form-label">Heading</label>
                    <input
                      type="text"
                      className="cert-form-input"
                      value={formState.partners_title || ""}
                      onChange={(e) => setFormState({ ...formState, partners_title: e.target.value })}
                    />
                  </div>
                  <div className="cert-form-group">
                    <label className="cert-form-label">Description</label>
                    <textarea
                      className="cert-form-input cert-form-textarea"
                      value={formState.partners_desc || ""}
                      onChange={(e) => setFormState({ ...formState, partners_desc: e.target.value })}
                    />
                  </div>

                  <div className="cert-form-group">
                    <label className="cert-form-label">Partnership Framework Items</label>
                    {(formState.partners_cards || []).map((card: any, idx: number) => (
                      <div key={idx} className="cert-json-item-box">
                        <div className="cert-json-item-header">
                          <span>Item #{idx + 1}</span>
                          <button
                            type="button"
                            className="cert-json-remove-btn"
                            onClick={() => {
                              const updated = formState.partners_cards.filter((_: any, i: number) => i !== idx);
                              setFormState({ ...formState, partners_cards: updated });
                            }}
                          >
                            Remove
                          </button>
                        </div>
                        <input
                          type="text"
                          className="cert-form-input"
                          placeholder="Title"
                          value={card.title || ""}
                          onChange={(e) => {
                            const updated = [...formState.partners_cards];
                            updated[idx] = { ...updated[idx], title: e.target.value };
                            setFormState({ ...formState, partners_cards: updated });
                          }}
                        />
                        <textarea
                          className="cert-form-input cert-form-textarea"
                          placeholder="Description"
                          value={card.desc || ""}
                          onChange={(e) => {
                            const updated = [...formState.partners_cards];
                            updated[idx] = { ...updated[idx], desc: e.target.value };
                            setFormState({ ...formState, partners_cards: updated });
                          }}
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      className="cert-json-add-btn"
                      onClick={() =>
                        setFormState({
                          ...formState,
                          partners_cards: [...(formState.partners_cards || []), { title: "Framework Title", desc: "Description text" }],
                        })
                      }
                    >
                      + Add Framework Item
                    </button>
                  </div>
                </>
              )}

              {/* VERIFICATION MODAL */}
              {editorModal === "verification" && (
                <>
                  <div className="cert-form-group">
                    <label className="cert-form-label">Heading</label>
                    <input
                      type="text"
                      className="cert-form-input"
                      value={formState.verification_title || ""}
                      onChange={(e) => setFormState({ ...formState, verification_title: e.target.value })}
                    />
                  </div>
                  <div className="cert-form-group">
                    <label className="cert-form-label">Description</label>
                    <textarea
                      className="cert-form-input cert-form-textarea"
                      value={formState.verification_desc || ""}
                      onChange={(e) => setFormState({ ...formState, verification_desc: e.target.value })}
                    />
                  </div>
                  <div className="cert-form-group">
                    <label className="cert-form-label">Verification Portal URL</label>
                    <input
                      type="text"
                      className="cert-form-input"
                      value={formState.verification_portal_url || ""}
                      onChange={(e) => setFormState({ ...formState, verification_portal_url: e.target.value })}
                    />
                  </div>

                  <div className="cert-form-group">
                    <label className="cert-form-label">3 Steps Guide</label>
                    {(formState.verification_steps || []).map((step: any, idx: number) => (
                      <div key={idx} className="cert-json-item-box">
                        <div className="cert-json-item-header">
                          <span>Step #{idx + 1}</span>
                          <button
                            type="button"
                            className="cert-json-remove-btn"
                            onClick={() => {
                              const updated = formState.verification_steps.filter((_: any, i: number) => i !== idx);
                              setFormState({ ...formState, verification_steps: updated });
                            }}
                          >
                            Remove
                          </button>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "8px" }}>
                          <input
                            type="text"
                            className="cert-form-input"
                            placeholder="01"
                            value={step.step || ""}
                            onChange={(e) => {
                              const updated = [...formState.verification_steps];
                              updated[idx] = { ...updated[idx], step: e.target.value };
                              setFormState({ ...formState, verification_steps: updated });
                            }}
                          />
                          <input
                            type="text"
                            className="cert-form-input"
                            placeholder="Step Title"
                            value={step.title || ""}
                            onChange={(e) => {
                              const updated = [...formState.verification_steps];
                              updated[idx] = { ...updated[idx], title: e.target.value };
                              setFormState({ ...formState, verification_steps: updated });
                            }}
                          />
                        </div>
                        <textarea
                          className="cert-form-input cert-form-textarea"
                          placeholder="Step Description"
                          value={step.desc || ""}
                          onChange={(e) => {
                            const updated = [...formState.verification_steps];
                            updated[idx] = { ...updated[idx], desc: e.target.value };
                            setFormState({ ...formState, verification_steps: updated });
                          }}
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      className="cert-json-add-btn"
                      onClick={() =>
                        setFormState({
                          ...formState,
                          verification_steps: [
                            ...(formState.verification_steps || []),
                            { step: String(formState.verification_steps?.length + 1 || "01").padStart(2, "0"), title: "Step Title", desc: "Description" },
                          ],
                        })
                      }
                    >
                      + Add Verification Step
                    </button>
                  </div>
                </>
              )}

              {/* CTA MODAL */}
              {editorModal === "cta" && (
                <>
                  <div className="cert-form-group">
                    <label className="cert-form-label">Heading</label>
                    <input
                      type="text"
                      className="cert-form-input"
                      value={formState.cta_title || ""}
                      onChange={(e) => setFormState({ ...formState, cta_title: e.target.value })}
                    />
                  </div>
                  <div className="cert-form-group">
                    <label className="cert-form-label">Description</label>
                    <textarea
                      className="cert-form-input cert-form-textarea"
                      value={formState.cta_desc || ""}
                      onChange={(e) => setFormState({ ...formState, cta_desc: e.target.value })}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                    <div className="cert-form-group">
                      <label className="cert-form-label">Primary Button Text</label>
                      <input
                        type="text"
                        className="cert-form-input"
                        value={formState.cta_primary_btn_text || ""}
                        onChange={(e) => setFormState({ ...formState, cta_primary_btn_text: e.target.value })}
                      />
                    </div>
                    <div className="cert-form-group">
                      <label className="cert-form-label">Primary Button Link</label>
                      <input
                        type="text"
                        className="cert-form-input"
                        value={formState.cta_primary_btn_link || ""}
                        onChange={(e) => setFormState({ ...formState, cta_primary_btn_link: e.target.value })}
                      />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                    <div className="cert-form-group">
                      <label className="cert-form-label">Secondary Button Text</label>
                      <input
                        type="text"
                        className="cert-form-input"
                        value={formState.cta_secondary_btn_text || ""}
                        onChange={(e) => setFormState({ ...formState, cta_secondary_btn_text: e.target.value })}
                      />
                    </div>
                    <div className="cert-form-group">
                      <label className="cert-form-label">Secondary Button Link</label>
                      <input
                        type="text"
                        className="cert-form-input"
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
                  <div className="cert-form-group">
                    <label className="cert-form-label">SEO Meta Title</label>
                    <input
                      type="text"
                      className="cert-form-input"
                      value={formState.seo_title || ""}
                      onChange={(e) => setFormState({ ...formState, seo_title: e.target.value })}
                    />
                  </div>
                  <div className="cert-form-group">
                    <label className="cert-form-label">SEO Meta Description</label>
                    <textarea
                      className="cert-form-input cert-form-textarea"
                      value={formState.seo_description || ""}
                      onChange={(e) => setFormState({ ...formState, seo_description: e.target.value })}
                    />
                  </div>
                  <div className="cert-form-group">
                    <label className="cert-form-label">SEO Keywords</label>
                    <input
                      type="text"
                      className="cert-form-input"
                      value={formState.seo_keywords || ""}
                      onChange={(e) => setFormState({ ...formState, seo_keywords: e.target.value })}
                    />
                  </div>

                  <h4 style={{ margin: "20px 0 10px", color: "#e63946" }}>
                    AEO (Answer Engine Optimization) & FAQ Engine
                  </h4>
                  <p style={{ fontSize: "12.5px", color: "#64748b", margin: "0 0 12px" }}>
                    These questions and answers are parsed into Google/AI Search <code>FAQPage</code> schema and rendered in the page's FAQ section.
                  </p>

                  <div className="cert-form-group">
                    {(formState.aeo_faqs || []).map((faq: any, idx: number) => (
                      <div key={idx} className="cert-json-item-box">
                        <div className="cert-json-item-header">
                          <span>FAQ Question #{idx + 1}</span>
                          <button
                            type="button"
                            className="cert-json-remove-btn"
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
                          className="cert-form-input"
                          placeholder="Question"
                          value={faq.q || ""}
                          onChange={(e) => {
                            const updated = [...formState.aeo_faqs];
                            updated[idx] = { ...updated[idx], q: e.target.value };
                            setFormState({ ...formState, aeo_faqs: updated });
                          }}
                        />
                        <textarea
                          className="cert-form-input cert-form-textarea"
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
                      className="cert-json-add-btn"
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

            <div className="cert-modal-footer">
              <span className={`cert-modal-status ${modalStatus.type}`}>
                {modalStatus.msg}
              </span>
              <div className="cert-modal-actions">
                <button type="button" className="cert-btn-cancel" onClick={() => setEditorModal(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="cert-btn-save"
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
