"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import PublicNavbar from "@/components/PublicNavbar";
import PublicFooter from "@/components/PublicFooter";
import { API_BASE_URL, BACKEND_BASE_URL } from "@/lib/config";
import { apiFetch } from "@/lib/apiFetch";
import "./sample-certificate.css";

// ── Types ──
export interface SampleCertificateItem {
  id?: string;
  course_name: string;
  short_code?: string;
  category: string;
  level?: string;
  duration?: string;
  reg_no_sample?: string;
  image_url: string;
  description?: string;
  skills_covered?: string[];
  is_visible?: boolean;
  order_index?: number;
}

export interface SampleCertificateData {
  hero_eyebrow?: string;
  hero_title?: string;
  hero_subtitle?: string;
  hero_text?: string;
  hero_badges_json?: string;
  hero_card_rows_json?: string;

  verify_eyebrow?: string;
  verify_title?: string;
  verify_desc?: string;
  verify_portal_url?: string;
  verify_steps_json?: string;

  gallery_eyebrow?: string;
  gallery_title?: string;
  gallery_desc?: string;
  gallery_categories_json?: string;
  sample_certificates_json?: string;

  security_eyebrow?: string;
  security_title?: string;
  security_desc?: string;
  security_features_json?: string;

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

type EditorModalType = "hero" | "verify" | "gallery" | "security" | "cta" | "seo" | null;

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

    const nodeCount = Math.min(Math.max(Math.floor((width * height) / 16000), 26), 44);
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

  return <canvas ref={canvasRef} className="sample-cert-hero-canvas" />;
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

export default function SampleCertificateClientView({ initialData }: { initialData: SampleCertificateData }) {
  // Pre-populated directly from server SSR (Instant 0ms first render!)
  const [data, setData] = useState<SampleCertificateData>(initialData);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All Certificates");
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(0);
  const [lightboxCert, setLightboxCert] = useState<SampleCertificateItem | null>(null);

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
    } else if (type === "verify") {
      setFormState({
        verify_eyebrow: data.verify_eyebrow || "",
        verify_title: data.verify_title || "",
        verify_desc: data.verify_desc || "",
        verify_portal_url: data.verify_portal_url || "",
        verify_steps: parseJsonSafe<Array<{ step: string; title: string; desc: string }>>(data.verify_steps_json, []),
      });
    } else if (type === "gallery") {
      const certs = parseJsonSafe<SampleCertificateItem[]>(data.sample_certificates_json, []);
      const primary = certs[0] || {
        id: "sc-1",
        course_name: "Post Graduate Diploma in Artificial Intelligence & Machine Learning",
        short_code: "PGD-AIML",
        category: "AI & Machine Learning",
        level: "Post Graduate Diploma",
        duration: "1 Year Intensive",
        reg_no_sample: "IINM-AIML-2026-9842",
        image_url: "https://cdn.iinmedu.com/sample-certificates/iinm_pgd_ai_ml_sample_certificate.jpg",
        description: "Awarded upon successful completion of core transformer architectures, LLM fine-tuning, computer vision, and deep reinforcement learning capstone defenses.",
        skills_covered: ["Transformers & LLMs", "PyTorch Deep Learning", "Computer Vision", "MLOps Pipelines", "Neural Architectures"],
        is_visible: true,
      };

      setFormState({
        gallery_eyebrow: data.gallery_eyebrow || "OFFICIAL CREDENTIAL SPECIMEN",
        gallery_title: data.gallery_title || "Explore Official Sample Certificate",
        gallery_desc: data.gallery_desc || "Inspect our official specimen credential awarded upon graduation. Engineered with high-resolution typography, anti-counterfeit Guilloche borders, and instant digital QR verification.",
        single_cert: primary,
        skills_csv: (primary.skills_covered || []).join(", "),
      });
    } else if (type === "security") {
      setFormState({
        security_eyebrow: data.security_eyebrow || "",
        security_title: data.security_title || "",
        security_desc: data.security_desc || "",
        security_features: parseJsonSafe<Array<{ title: string; desc: string }>>(data.security_features_json, []),
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

      let payload: Partial<SampleCertificateData> = {};

      if (editorModal === "hero") {
        payload = {
          hero_eyebrow: formState.hero_eyebrow,
          hero_title: formState.hero_title,
          hero_subtitle: formState.hero_subtitle,
          hero_text: formState.hero_text,
          hero_badges_json: JSON.stringify(formState.hero_badges || []),
          hero_card_rows_json: JSON.stringify(formState.hero_card_rows || []),
        };
      } else if (editorModal === "verify") {
        payload = {
          verify_eyebrow: formState.verify_eyebrow,
          verify_title: formState.verify_title,
          verify_desc: formState.verify_desc,
          verify_portal_url: formState.verify_portal_url,
          verify_steps_json: JSON.stringify(formState.verify_steps || []),
        };
      } else if (editorModal === "gallery") {
        const skillsArray = (formState.skills_csv || "")
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);

        const updatedCert: SampleCertificateItem = {
          ...(formState.single_cert || {}),
          skills_covered: skillsArray,
        };

        payload = {
          gallery_eyebrow: formState.gallery_eyebrow,
          gallery_title: formState.gallery_title,
          gallery_desc: formState.gallery_desc,
          sample_certificates_json: JSON.stringify([updatedCert]),
        };
      } else if (editorModal === "security") {
        payload = {
          security_eyebrow: formState.security_eyebrow,
          security_title: formState.security_title,
          security_desc: formState.security_desc,
          security_features_json: JSON.stringify(formState.security_features || []),
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

      const res = await apiFetch(`${API_BASE_URL}/sample-certificate/data`, {
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

  // Upload sample certificate helper (supports Cloudflare R2 bucket)
  const handleUploadCertificate = async (
    e: React.ChangeEvent<HTMLInputElement>,
    itemIndex: number
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiFetch(`${API_BASE_URL}/sample-certificate/upload-certificate`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        const updated = [...(formState.sample_certificates || [])];
        updated[itemIndex] = { ...updated[itemIndex], image_url: json.url };
        setFormState((prev) => ({ ...prev, sample_certificates: updated }));
        setModalStatus({ msg: "Certificate uploaded to Cloudflare CDN! Click Save to apply.", type: "success" });
      } else {
        setModalStatus({ msg: "Upload failed.", type: "error" });
      }
    } catch {
      setModalStatus({ msg: "Upload error.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Upload single sample certificate directly to Cloudflare R2
  const handleUploadSingleCertificate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSaving(true);
      setModalStatus({ msg: "Uploading certificate directly to Cloudflare R2 bucket...", type: "" });
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiFetch(`${API_BASE_URL}/sample-certificate/upload-certificate`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        setFormState((prev) => ({
          ...prev,
          single_cert: {
            ...(prev.single_cert || {}),
            image_url: json.url,
          },
        }));
        setModalStatus({ msg: "Certificate uploaded to Cloudflare CDN! Click Save to apply.", type: "success" });
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
  const verifySteps = parseJsonSafe<Array<{ step: string; title: string; desc: string }>>(data.verify_steps_json, []);
  const sampleCertificates = parseJsonSafe<SampleCertificateItem[]>(data.sample_certificates_json, []);
  const securityFeatures = parseJsonSafe<Array<{ title: string; desc: string }>>(data.security_features_json, []);
  const aeoFaqs = parseJsonSafe<Array<{ q: string; a: string }>>(data.aeo_faqs_json, []);

  // Exactly 1 certificate displayed in the Explore Sample Certificate section (as requested)
  const singleCertificate = sampleCertificates.find((item) => item.is_visible !== false) || sampleCertificates[0] || null;

  return (
    <div className="sample-cert-page">
      <PublicNavbar />

      {/* ── Breadcrumb Bar ── */}
      <div className="sample-cert-breadcrumb-wrapper">
        <div className="sample-cert-container">
          <nav className="sample-cert-breadcrumb-bar" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="sample-cert-breadcrumb-sep">/</span>
            <Link href="/courses">Academics</Link>
            <span className="sample-cert-breadcrumb-sep">/</span>
            <span className="sample-cert-breadcrumb-active">Sample Certificates</span>
          </nav>
        </div>
      </div>

      <main>
        {/* ══════════════════════════════════════════════════════════
            SECTION 1: HERO (LIGHT) WITH LIGHT GRID CANVAS
            ══════════════════════════════════════════════════════════ */}
        <section
          className="sample-cert-hero-section"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <NetworkGridCanvas mousePos={mousePos} />

          <div className="sample-cert-container sample-cert-hero-inner">
            {isSuperAdmin && (
              <div className="sample-cert-admin-bar">
                <button type="button" onClick={() => handleOpenEditor("hero")} className="sample-cert-edit-btn">
                  <span>✎ Super Admin: Edit Hero Section</span>
                </button>
              </div>
            )}

            <div className="sample-cert-hero-grid">
              {/* Left Column */}
              <div className="sample-cert-hero-left">
                <div className="sample-cert-eyebrow">
                  {data.hero_eyebrow || "OFFICIAL CREDENTIALS & ACADEMIC INTEGRITY"}
                </div>

                <h1>
                  {data.hero_title || "Sample Course Certificates & Verified Credentials"}
                </h1>

                {data.hero_subtitle && (
                  <div className="sample-cert-hero-subtitle">{data.hero_subtitle}</div>
                )}

                <p className="sample-cert-hero-text">
                  {data.hero_text}
                </p>

                {heroBadges.length > 0 && (
                  <div className="sample-cert-hero-badges-row">
                    {heroBadges.map((badge, idx) => (
                      <div key={idx} className="sample-cert-hero-badge-pill">
                        <span className="sample-cert-hero-badge-dot" />
                        <span>{badge}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="sample-cert-hero-actions">
                  <a href="#verify-gateway" className="sample-cert-btn-red">
                    Verify Any Certificate ↗
                  </a>
                  <a href="#certificates-gallery" className="sample-cert-btn-outline-navy">
                    Browse Sample Diplomas ↓
                  </a>
                </div>
              </div>

              {/* Right Column: Institutional Credentials Assurance Card */}
              <div className="sample-cert-assurance-card">
                <div className="sample-cert-card-header">
                  <span className="sample-cert-card-title">Credential Authenticity</span>
                  <span className="sample-cert-card-tag">ISO 9001:2015</span>
                </div>

                <div className="sample-cert-card-list">
                  {heroCardRows.map((row, idx) => (
                    <div key={idx} className="sample-cert-card-row">
                      <span className="sample-cert-card-row-dot" />
                      <div>
                        <div className="sample-cert-card-row-title">{row.title}</div>
                        <div className="sample-cert-card-row-sub">{row.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION 2: CERTIFICATE VERIFICATION GATEWAY (DARK - #0a1628)
            ══════════════════════════════════════════════════════════ */}
        <section id="verify-gateway" className="sample-cert-verify-section">
          <div className="sample-cert-container">
            {isSuperAdmin && (
              <div className="sample-cert-admin-bar">
                <button type="button" onClick={() => handleOpenEditor("verify")} className="sample-cert-edit-btn sample-cert-edit-btn-dark">
                  <span>✎ Super Admin: Edit Verification Gateway</span>
                </button>
              </div>
            )}

            <div className="sample-cert-verify-header">
              <div className="sample-cert-eyebrow sample-cert-eyebrow-dark">
                {data.verify_eyebrow || "AUTHENTICATION GATEWAY"}
              </div>
              <h2>{data.verify_title || "Verify Any IINM Certificate in Real Time"}</h2>
              <p>{data.verify_desc}</p>
            </div>

            <div className="sample-cert-verify-steps-grid">
              {verifySteps.map((step, idx) => (
                <div key={idx} className="sample-cert-verify-step-card">
                  <span className="sample-cert-verify-step-num">STEP {step.step}</span>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
              ))}
            </div>

            {/* Verification Action Box */}
            <div className="sample-cert-verify-action-box">
              <div className="sample-cert-verify-action-text">
                <h4>Looking to verify a student credential or transcript?</h4>
                <p>
                  Access our central student verification database to authenticate candidate records, marks, and completion status.
                </p>
              </div>
              <Link
                href={data.verify_portal_url || "/certification#verification"}
                className="sample-cert-btn-red"
              >
                Access Verification Portal →
              </Link>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION 3: OFFICIAL SAMPLE CERTIFICATE SHOWCASE (LIGHT - #ffffff)
            ══════════════════════════════════════════════════════════ */}
        <section id="certificates-gallery" className="sample-cert-gallery-section">
          <div className="sample-cert-container">
            {isSuperAdmin && (
              <div className="sample-cert-admin-bar">
                <button type="button" onClick={() => handleOpenEditor("gallery")} className="sample-cert-edit-btn">
                  <span>✎ Super Admin: Manage Official Sample Certificate</span>
                </button>
              </div>
            )}

            <div className="sample-cert-section-header">
              <div className="sample-cert-eyebrow">
                {data.gallery_eyebrow || "OFFICIAL CREDENTIAL SPECIMEN"}
              </div>
              <h2>{data.gallery_title || "Explore Official Sample Certificate"}</h2>
              <p>{data.gallery_desc || "Inspect our official specimen credential awarded upon graduation. Engineered with high-resolution typography, anti-counterfeit Guilloche borders, and instant digital QR verification."}</p>
            </div>

            {/* Single Certificate Showcase (Hidden item NEVER shows on public page) */}
            {singleCertificate && singleCertificate.is_visible !== false ? (
              <div className="sample-cert-single-showcase">
                {/* Certificate Mount Frame */}
                <div
                  className="sample-cert-specimen-frame"
                  onClick={() => setLightboxCert(singleCertificate)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Inspect ${singleCertificate.course_name} sample certificate`}
                >
                  <div className="sample-cert-specimen-ribbon">
                    ★ Official Specimen • 300 DPI
                  </div>
                  <div className="sample-cert-specimen-img-wrap">
                    <img
                      src={resolveImage(singleCertificate.image_url)}
                      alt={singleCertificate.course_name}
                      className="sample-cert-specimen-img"
                    />
                    <div className="sample-cert-specimen-overlay">
                      <span className="sample-cert-specimen-zoom-pill">
                        🔍 Inspect Full Resolution
                      </span>
                    </div>
                  </div>
                </div>

                {/* Certificate Anatomy & Details */}
                <div className="sample-cert-specimen-details">
                  <div className="sample-cert-specimen-meta">
                    <span className="sample-cert-specimen-level">
                      {singleCertificate.level || "Diploma"} • {singleCertificate.category || "Flagship Program"}
                    </span>
                    {singleCertificate.reg_no_sample && (
                      <span className="sample-cert-specimen-serial">
                        Reg No: {singleCertificate.reg_no_sample}
                      </span>
                    )}
                  </div>

                  <h3 className="sample-cert-specimen-title">{singleCertificate.course_name}</h3>

                  {singleCertificate.description && (
                    <p className="sample-cert-specimen-desc">{singleCertificate.description}</p>
                  )}

                  {/* Security & Verification Specifications */}
                  <div className="sample-cert-audit-list">
                    <div className="sample-cert-audit-item">
                      <span className="sample-cert-audit-icon">✓</span>
                      <div><strong>Tamper-Proof Verification:</strong> Instant live QR validation mapped to central academic registry.</div>
                    </div>
                    <div className="sample-cert-audit-item">
                      <span className="sample-cert-audit-icon">✓</span>
                      <div><strong>Dual Executive Signatures:</strong> Authenticated by Academic Director &amp; Controller of Examinations.</div>
                    </div>
                    <div className="sample-cert-audit-item">
                      <span className="sample-cert-audit-icon">✓</span>
                      <div><strong>ISO 9001:2015 Standards:</strong> Audited educational framework and project defense benchmark.</div>
                    </div>
                  </div>

                  {/* Skills / Competencies Validated */}
                  {singleCertificate.skills_covered && singleCertificate.skills_covered.length > 0 && (
                    <div className="sample-cert-specimen-skills">
                      {singleCertificate.skills_covered.map((skill, sIdx) => (
                        <span key={sIdx} className="sample-cert-skill-pill">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="sample-cert-specimen-actions">
                    <button
                      type="button"
                      onClick={() => setLightboxCert(singleCertificate)}
                      className="sample-cert-btn-inspect"
                    >
                      🔍 Inspect Specimen (Full Screen)
                    </button>
                    <Link href="/certification#verification" className="sample-cert-btn-verify-outline">
                      Verify Credential Online →
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
                <p>No sample certificate is currently active.</p>
              </div>
            )}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION 4: TAMPER-PROOF SECURITY FEATURES (DARK - #0d1e38)
            ══════════════════════════════════════════════════════════ */}
        <section className="sample-cert-security-section">
          <div className="sample-cert-container">
            {isSuperAdmin && (
              <div className="sample-cert-admin-bar">
                <button type="button" onClick={() => handleOpenEditor("security")} className="sample-cert-edit-btn sample-cert-edit-btn-dark">
                  <span>✎ Super Admin: Edit Security Features</span>
                </button>
              </div>
            )}

            <div className="sample-cert-security-header">
              <div className="sample-cert-eyebrow sample-cert-eyebrow-dark">
                {data.security_eyebrow || "CREDENTIAL DEFENSE & SECURITY"}
              </div>
              <h2>{data.security_title}</h2>
              <p>{data.security_desc}</p>
            </div>

            <div className="sample-cert-security-grid">
              {securityFeatures.map((feat, idx) => (
                <div key={idx} className="sample-cert-security-card">
                  <h3>{feat.title}</h3>
                  <p>{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION 5: VISUAL AEO FAQ ACCORDION (LIGHT - #ffffff)
            ══════════════════════════════════════════════════════════ */}
        {aeoFaqs.length > 0 && (
          <section className="sample-cert-faq-section">
            <div className="sample-cert-container">
              {isSuperAdmin && (
                <div className="sample-cert-admin-bar">
                  <button type="button" onClick={() => handleOpenEditor("seo")} className="sample-cert-edit-btn">
                    <span>✎ Super Admin: Edit SEO & AEO Engine</span>
                  </button>
                </div>
              )}

              <div className="sample-cert-section-header">
                <div className="sample-cert-eyebrow">
                  CERTIFICATE VALIDITY FAQ
                </div>
                <h2>Frequently Asked Questions</h2>
                <p>
                  Answers about credential verification, physical issuance, and corporate recognition.
                </p>
              </div>

              <div className="sample-cert-faq-list">
                {aeoFaqs.map((faq, idx) => (
                  <div key={idx} className={`sample-cert-faq-item ${activeFaqIndex === idx ? "active" : ""}`}>
                    <button
                      type="button"
                      className="sample-cert-faq-trigger"
                      onClick={() => setActiveFaqIndex(activeFaqIndex === idx ? null : idx)}
                    >
                      <span>{faq.q}</span>
                      <span className="sample-cert-faq-icon">{activeFaqIndex === idx ? "−" : "+"}</span>
                    </button>
                    {activeFaqIndex === idx && (
                      <div className="sample-cert-faq-body">
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
            SECTION 6: CTA STRIP (DARK - #0a1628)
            ══════════════════════════════════════════════════════════ */}
        <section className="sample-cert-cta-section">
          <div className="sample-cert-container">
            {isSuperAdmin && (
              <div className="sample-cert-admin-bar" style={{ marginBottom: 12 }}>
                <button type="button" onClick={() => handleOpenEditor("cta")} className="sample-cert-edit-btn sample-cert-edit-btn-dark">
                  <span>✎ Super Admin: Edit CTA Section</span>
                </button>
              </div>
            )}

            <div className="sample-cert-cta-inner">
              <div className="sample-cert-cta-content">
                <h2>{data.cta_title || "Ready to Earn Your Industry-Recognized Credential?"}</h2>
                <p>{data.cta_desc}</p>
              </div>

              <div className="sample-cert-cta-buttons">
                <Link href={data.cta_primary_btn_link || "/courses"} className="sample-cert-btn-red">
                  {data.cta_primary_btn_text || "Explore Certified Courses"}
                </Link>
                <Link href={data.cta_secondary_btn_link || "/certification#verification"} className="sample-cert-btn-outline-white">
                  {data.cta_secondary_btn_text || "Access Verification Portal"}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ══════════════════════════════════════════════════════════
          HIGH-RESOLUTION LIGHTBOX MODAL
          ══════════════════════════════════════════════════════════ */}
      {lightboxCert && (
        <div className="sample-cert-lightbox-backdrop" onClick={() => setLightboxCert(null)}>
          <div className="sample-cert-lightbox-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="sample-cert-lightbox-header">
              <h3 className="sample-cert-lightbox-title">{lightboxCert.course_name}</h3>
              <button
                type="button"
                className="sample-cert-lightbox-close"
                onClick={() => setLightboxCert(null)}
              >
                ✕
              </button>
            </div>

            <div className="sample-cert-lightbox-body">
              <img
                src={resolveImage(lightboxCert.image_url)}
                alt={lightboxCert.course_name}
                className="sample-cert-lightbox-img"
              />
            </div>

            <div className="sample-cert-lightbox-footer">
              <div className="sample-cert-lightbox-meta">
                <span>Sample Serial No: <strong>{lightboxCert.reg_no_sample || "IINM-VERIFIED"}</strong></span>
                <span style={{ margin: "0 10px" }}>•</span>
                <span>Track: <strong>{lightboxCert.category}</strong></span>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <Link
                  href={data.verify_portal_url || "/certification#verification"}
                  className="sample-cert-btn-red"
                  style={{ padding: "8px 16px", fontSize: "12.5px" }}
                >
                  Verify this Credential ↗
                </Link>
                <button
                  type="button"
                  className="sample-cert-btn-outline-white"
                  style={{ padding: "8px 16px", fontSize: "12.5px" }}
                  onClick={() => setLightboxCert(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          UNIVERSAL SUPER ADMIN EDIT MODALS
          ══════════════════════════════════════════════════════════ */}
      {editorModal && (
        <div className="sample-cert-modal-backdrop" onClick={() => setEditorModal(null)}>
          <div className="sample-cert-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="sample-cert-modal-header">
              <h3>
                {editorModal === "hero" && "Super Admin: Edit Hero Section"}
                {editorModal === "verify" && "Super Admin: Edit Verification Gateway"}
                {editorModal === "gallery" && "Super Admin: Manage Sample Certificates"}
                {editorModal === "security" && "Super Admin: Edit Security Features"}
                {editorModal === "cta" && "Super Admin: Edit Call to Action"}
                {editorModal === "seo" && "Super Admin: Edit SEO & AEO Engine"}
              </h3>
              <button type="button" className="sample-cert-modal-close-btn" onClick={() => setEditorModal(null)}>✕</button>
            </div>

            <div className="sample-cert-modal-body">
              {/* HERO MODAL */}
              {editorModal === "hero" && (
                <>
                  <div className="sample-cert-form-group">
                    <label className="sample-cert-form-label">Eyebrow Tag</label>
                    <input
                      type="text"
                      className="sample-cert-form-input"
                      value={formState.hero_eyebrow || ""}
                      onChange={(e) => setFormState({ ...formState, hero_eyebrow: e.target.value })}
                    />
                  </div>
                  <div className="sample-cert-form-group">
                    <label className="sample-cert-form-label">Main Heading</label>
                    <input
                      type="text"
                      className="sample-cert-form-input"
                      value={formState.hero_title || ""}
                      onChange={(e) => setFormState({ ...formState, hero_title: e.target.value })}
                    />
                  </div>
                  <div className="sample-cert-form-group">
                    <label className="sample-cert-form-label">Subtitle</label>
                    <input
                      type="text"
                      className="sample-cert-form-input"
                      value={formState.hero_subtitle || ""}
                      onChange={(e) => setFormState({ ...formState, hero_subtitle: e.target.value })}
                    />
                  </div>
                  <div className="sample-cert-form-group">
                    <label className="sample-cert-form-label">Narrative Text</label>
                    <textarea
                      className="sample-cert-form-input sample-cert-form-textarea"
                      value={formState.hero_text || ""}
                      onChange={(e) => setFormState({ ...formState, hero_text: e.target.value })}
                    />
                  </div>

                  <div className="sample-cert-form-group">
                    <label className="sample-cert-form-label">Hero Badges (Pills)</label>
                    {(formState.hero_badges || []).map((badge: string, idx: number) => (
                      <div key={idx} style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
                        <input
                          type="text"
                          className="sample-cert-form-input"
                          value={badge}
                          onChange={(e) => {
                            const updated = [...formState.hero_badges];
                            updated[idx] = e.target.value;
                            setFormState({ ...formState, hero_badges: updated });
                          }}
                        />
                        <button
                          type="button"
                          className="sample-cert-json-remove-btn"
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
                      className="sample-cert-json-add-btn"
                      onClick={() => setFormState({ ...formState, hero_badges: [...(formState.hero_badges || []), "New Badge Item"] })}
                    >
                      + Add Badge Pill
                    </button>
                  </div>
                </>
              )}

              {/* VERIFICATION GATEWAY MODAL */}
              {editorModal === "verify" && (
                <>
                  <div className="sample-cert-form-group">
                    <label className="sample-cert-form-label">Heading</label>
                    <input
                      type="text"
                      className="sample-cert-form-input"
                      value={formState.verify_title || ""}
                      onChange={(e) => setFormState({ ...formState, verify_title: e.target.value })}
                    />
                  </div>
                  <div className="sample-cert-form-group">
                    <label className="sample-cert-form-label">Description</label>
                    <textarea
                      className="sample-cert-form-input sample-cert-form-textarea"
                      value={formState.verify_desc || ""}
                      onChange={(e) => setFormState({ ...formState, verify_desc: e.target.value })}
                    />
                  </div>
                  <div className="sample-cert-form-group">
                    <label className="sample-cert-form-label">Verification Portal URL</label>
                    <input
                      type="text"
                      className="sample-cert-form-input"
                      value={formState.verify_portal_url || ""}
                      onChange={(e) => setFormState({ ...formState, verify_portal_url: e.target.value })}
                    />
                  </div>

                  <div className="sample-cert-form-group">
                    <label className="sample-cert-form-label">3-Step Verification Guide</label>
                    {(formState.verify_steps || []).map((step: any, idx: number) => (
                      <div key={idx} className="sample-cert-json-item-box">
                        <div className="sample-cert-json-item-header">
                          <span>Step #{idx + 1}</span>
                          <button
                            type="button"
                            className="sample-cert-json-remove-btn"
                            onClick={() => {
                              const updated = formState.verify_steps.filter((_: any, i: number) => i !== idx);
                              setFormState({ ...formState, verify_steps: updated });
                            }}
                          >
                            Remove
                          </button>
                        </div>
                        <input
                          type="text"
                          className="sample-cert-form-input"
                          placeholder="Step Number (e.g. 01)"
                          value={step.step || ""}
                          onChange={(e) => {
                            const updated = [...formState.verify_steps];
                            updated[idx] = { ...updated[idx], step: e.target.value };
                            setFormState({ ...formState, verify_steps: updated });
                          }}
                        />
                        <input
                          type="text"
                          className="sample-cert-form-input"
                          placeholder="Step Title"
                          value={step.title || ""}
                          onChange={(e) => {
                            const updated = [...formState.verify_steps];
                            updated[idx] = { ...updated[idx], title: e.target.value };
                            setFormState({ ...formState, verify_steps: updated });
                          }}
                        />
                        <textarea
                          className="sample-cert-form-input sample-cert-form-textarea"
                          placeholder="Step Description"
                          value={step.desc || ""}
                          onChange={(e) => {
                            const updated = [...formState.verify_steps];
                            updated[idx] = { ...updated[idx], desc: e.target.value };
                            setFormState({ ...formState, verify_steps: updated });
                          }}
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      className="sample-cert-json-add-btn"
                      onClick={() =>
                        setFormState({
                          ...formState,
                          verify_steps: [
                            ...(formState.verify_steps || []),
                            { step: `0${(formState.verify_steps || []).length + 1}`, title: "Step Title", desc: "Instruction details" },
                          ],
                        })
                      }
                    >
                      + Add Verification Step
                    </button>
                  </div>
                </>
              )}

              {/* SINGLE OFFICIAL SAMPLE CERTIFICATE MODAL */}
              {editorModal === "gallery" && (
                <>
                  <div className="sample-cert-form-group">
                    <label className="sample-cert-form-label">Section Eyebrow</label>
                    <input
                      type="text"
                      className="sample-cert-form-input"
                      value={formState.gallery_eyebrow || ""}
                      onChange={(e) => setFormState({ ...formState, gallery_eyebrow: e.target.value })}
                    />
                  </div>
                  <div className="sample-cert-form-group">
                    <label className="sample-cert-form-label">Section Heading</label>
                    <input
                      type="text"
                      className="sample-cert-form-input"
                      value={formState.gallery_title || ""}
                      onChange={(e) => setFormState({ ...formState, gallery_title: e.target.value })}
                    />
                  </div>
                  <div className="sample-cert-form-group">
                    <label className="sample-cert-form-label">Section Description</label>
                    <textarea
                      className="sample-cert-form-input sample-cert-form-textarea"
                      value={formState.gallery_desc || ""}
                      onChange={(e) => setFormState({ ...formState, gallery_desc: e.target.value })}
                    />
                  </div>

                  {/* Single Certificate Item Details */}
                  <div className="sample-cert-form-group">
                    <label className="sample-cert-form-label">Official Specimen Certificate Details</label>
                    <div className="sample-cert-json-item-box">
                      <div className="sample-cert-json-item-header">
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontWeight: 700, color: "#0a1628" }}>Specimen Certificate</span>
                          <button
                            type="button"
                            className={`sample-cert-visibility-pill ${formState.single_cert?.is_visible !== false ? "visible" : "hidden"}`}
                            onClick={() => {
                              setFormState({
                                ...formState,
                                single_cert: {
                                  ...(formState.single_cert || {}),
                                  is_visible: formState.single_cert?.is_visible === false ? true : false,
                                },
                              });
                            }}
                            title="Click to toggle visibility (hidden item will NEVER appear on the public page)"
                          >
                            {formState.single_cert?.is_visible !== false ? "● Visible to Public" : "○ Hidden (Invisible)"}
                          </button>
                        </div>
                      </div>

                      <div style={{ marginBottom: "8px" }}>
                        <label style={{ fontSize: "11px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>
                          Program / Degree Title
                        </label>
                        <input
                          type="text"
                          className="sample-cert-form-input"
                          placeholder="e.g. Post Graduate Diploma in Artificial Intelligence & Machine Learning"
                          value={formState.single_cert?.course_name || ""}
                          onChange={(e) =>
                            setFormState({
                              ...formState,
                              single_cert: { ...(formState.single_cert || {}), course_name: e.target.value },
                            })
                          }
                        />
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                        <div>
                          <label style={{ fontSize: "11px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>
                            Credential Level
                          </label>
                          <input
                            type="text"
                            className="sample-cert-form-input"
                            placeholder="e.g. Post Graduate Diploma"
                            value={formState.single_cert?.level || ""}
                            onChange={(e) =>
                              setFormState({
                                ...formState,
                                single_cert: { ...(formState.single_cert || {}), level: e.target.value },
                              })
                            }
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: "11px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>
                            Category / Stream
                          </label>
                          <input
                            type="text"
                            className="sample-cert-form-input"
                            placeholder="e.g. AI & Machine Learning"
                            value={formState.single_cert?.category || ""}
                            onChange={(e) =>
                              setFormState({
                                ...formState,
                                single_cert: { ...(formState.single_cert || {}), category: e.target.value },
                              })
                            }
                          />
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                        <div>
                          <label style={{ fontSize: "11px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>
                            Specimen Serial / Reg No
                          </label>
                          <input
                            type="text"
                            className="sample-cert-form-input"
                            placeholder="e.g. IINM-AIML-2026-9842"
                            value={formState.single_cert?.reg_no_sample || ""}
                            onChange={(e) =>
                              setFormState({
                                ...formState,
                                single_cert: { ...(formState.single_cert || {}), reg_no_sample: e.target.value },
                              })
                            }
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: "11px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>
                            Duration
                          </label>
                          <input
                            type="text"
                            className="sample-cert-form-input"
                            placeholder="e.g. 1 Year Intensive"
                            value={formState.single_cert?.duration || ""}
                            onChange={(e) =>
                              setFormState({
                                ...formState,
                                single_cert: { ...(formState.single_cert || {}), duration: e.target.value },
                              })
                            }
                          />
                        </div>
                      </div>

                      <div style={{ marginBottom: "8px" }}>
                        <label style={{ fontSize: "11px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>
                          Statement / Program Description
                        </label>
                        <textarea
                          className="sample-cert-form-input sample-cert-form-textarea"
                          placeholder="Awarded upon successful completion of..."
                          value={formState.single_cert?.description || ""}
                          onChange={(e) =>
                            setFormState({
                              ...formState,
                              single_cert: { ...(formState.single_cert || {}), description: e.target.value },
                            })
                          }
                        />
                      </div>

                      <div style={{ marginBottom: "8px" }}>
                        <label style={{ fontSize: "11px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>
                          Validated Competencies / Skills (Comma-separated)
                        </label>
                        <input
                          type="text"
                          className="sample-cert-form-input"
                          placeholder="Transformers & LLMs, PyTorch Deep Learning, Computer Vision, MLOps"
                          value={formState.skills_csv || ""}
                          onChange={(e) => setFormState({ ...formState, skills_csv: e.target.value })}
                        />
                      </div>

                      {/* Certificate Graphic Image Upload to Cloudflare R2 */}
                      <div>
                        <label style={{ fontSize: "11px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>
                          Certificate High-Resolution Image (Cloudflare R2 Bucket / CDN)
                        </label>
                        {formState.single_cert?.image_url && (
                          <div style={{ marginBottom: "8px" }}>
                            <img
                              src={resolveImage(formState.single_cert.image_url)}
                              alt="Certificate Specimen Preview"
                              style={{ width: 180, height: 125, objectFit: "cover", borderRadius: 4, border: "2px solid #0a1628", display: "block" }}
                            />
                            <span style={{ fontSize: "11.5px", color: "#64748b", wordBreak: "break-all", display: "block", marginTop: "4px" }}>
                              {formState.single_cert.image_url}
                            </span>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadSingleCertificate}
                          className="sample-cert-form-input"
                        />
                        <input
                          type="text"
                          className="sample-cert-form-input"
                          placeholder="Or enter direct CDN image URL"
                          style={{ marginTop: "6px" }}
                          value={formState.single_cert?.image_url || ""}
                          onChange={(e) =>
                            setFormState({
                              ...formState,
                              single_cert: { ...(formState.single_cert || {}), image_url: e.target.value },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* SECURITY FEATURES MODAL */}
              {editorModal === "security" && (
                <>
                  <div className="sample-cert-form-group">
                    <label className="sample-cert-form-label">Heading</label>
                    <input
                      type="text"
                      className="sample-cert-form-input"
                      value={formState.security_title || ""}
                      onChange={(e) => setFormState({ ...formState, security_title: e.target.value })}
                    />
                  </div>
                  <div className="sample-cert-form-group">
                    <label className="sample-cert-form-label">Description</label>
                    <textarea
                      className="sample-cert-form-input sample-cert-form-textarea"
                      value={formState.security_desc || ""}
                      onChange={(e) => setFormState({ ...formState, security_desc: e.target.value })}
                    />
                  </div>

                  <div className="sample-cert-form-group">
                    <label className="sample-cert-form-label">Security Features</label>
                    {(formState.security_features || []).map((feat: any, idx: number) => (
                      <div key={idx} className="sample-cert-json-item-box">
                        <div className="sample-cert-json-item-header">
                          <span>Feature #{idx + 1}</span>
                          <button
                            type="button"
                            className="sample-cert-json-remove-btn"
                            onClick={() => {
                              const updated = formState.security_features.filter((_: any, i: number) => i !== idx);
                              setFormState({ ...formState, security_features: updated });
                            }}
                          >
                            Remove
                          </button>
                        </div>
                        <input
                          type="text"
                          className="sample-cert-form-input"
                          placeholder="Feature Title"
                          value={feat.title || ""}
                          onChange={(e) => {
                            const updated = [...formState.security_features];
                            updated[idx] = { ...updated[idx], title: e.target.value };
                            setFormState({ ...formState, security_features: updated });
                          }}
                        />
                        <textarea
                          className="sample-cert-form-input sample-cert-form-textarea"
                          placeholder="Feature Description"
                          value={feat.desc || ""}
                          onChange={(e) => {
                            const updated = [...formState.security_features];
                            updated[idx] = { ...updated[idx], desc: e.target.value };
                            setFormState({ ...formState, security_features: updated });
                          }}
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      className="sample-cert-json-add-btn"
                      onClick={() =>
                        setFormState({
                          ...formState,
                          security_features: [
                            ...(formState.security_features || []),
                            { title: "Security Mark", desc: "Explanation of tamper resistance" },
                          ],
                        })
                      }
                    >
                      + Add Security Feature
                    </button>
                  </div>
                </>
              )}

              {/* CTA MODAL */}
              {editorModal === "cta" && (
                <>
                  <div className="sample-cert-form-group">
                    <label className="sample-cert-form-label">Heading</label>
                    <input
                      type="text"
                      className="sample-cert-form-input"
                      value={formState.cta_title || ""}
                      onChange={(e) => setFormState({ ...formState, cta_title: e.target.value })}
                    />
                  </div>
                  <div className="sample-cert-form-group">
                    <label className="sample-cert-form-label">Description</label>
                    <textarea
                      className="sample-cert-form-input sample-cert-form-textarea"
                      value={formState.cta_desc || ""}
                      onChange={(e) => setFormState({ ...formState, cta_desc: e.target.value })}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                    <div className="sample-cert-form-group">
                      <label className="sample-cert-form-label">Primary Button Text</label>
                      <input
                        type="text"
                        className="sample-cert-form-input"
                        value={formState.cta_primary_btn_text || ""}
                        onChange={(e) => setFormState({ ...formState, cta_primary_btn_text: e.target.value })}
                      />
                    </div>
                    <div className="sample-cert-form-group">
                      <label className="sample-cert-form-label">Primary Button Link</label>
                      <input
                        type="text"
                        className="sample-cert-form-input"
                        value={formState.cta_primary_btn_link || ""}
                        onChange={(e) => setFormState({ ...formState, cta_primary_btn_link: e.target.value })}
                      />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                    <div className="sample-cert-form-group">
                      <label className="sample-cert-form-label">Secondary Button Text</label>
                      <input
                        type="text"
                        className="sample-cert-form-input"
                        value={formState.cta_secondary_btn_text || ""}
                        onChange={(e) => setFormState({ ...formState, cta_secondary_btn_text: e.target.value })}
                      />
                    </div>
                    <div className="sample-cert-form-group">
                      <label className="sample-cert-form-label">Secondary Button Link</label>
                      <input
                        type="text"
                        className="sample-cert-form-input"
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
                  <div className="sample-cert-form-group">
                    <label className="sample-cert-form-label">SEO Meta Title</label>
                    <input
                      type="text"
                      className="sample-cert-form-input"
                      value={formState.seo_title || ""}
                      onChange={(e) => setFormState({ ...formState, seo_title: e.target.value })}
                    />
                  </div>
                  <div className="sample-cert-form-group">
                    <label className="sample-cert-form-label">SEO Meta Description</label>
                    <textarea
                      className="sample-cert-form-input sample-cert-form-textarea"
                      value={formState.seo_description || ""}
                      onChange={(e) => setFormState({ ...formState, seo_description: e.target.value })}
                    />
                  </div>
                  <div className="sample-cert-form-group">
                    <label className="sample-cert-form-label">SEO Keywords</label>
                    <input
                      type="text"
                      className="sample-cert-form-input"
                      value={formState.seo_keywords || ""}
                      onChange={(e) => setFormState({ ...formState, seo_keywords: e.target.value })}
                    />
                  </div>

                  <h4 style={{ margin: "20px 0 10px", color: "#e63946" }}>
                    AEO (Answer Engine Optimization) & FAQ Engine
                  </h4>
                  <div className="sample-cert-form-group">
                    {(formState.aeo_faqs || []).map((faq: any, idx: number) => (
                      <div key={idx} className="sample-cert-json-item-box">
                        <div className="sample-cert-json-item-header">
                          <span>FAQ Question #{idx + 1}</span>
                          <button
                            type="button"
                            className="sample-cert-json-remove-btn"
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
                          className="sample-cert-form-input"
                          placeholder="Question"
                          value={faq.q || ""}
                          onChange={(e) => {
                            const updated = [...formState.aeo_faqs];
                            updated[idx] = { ...updated[idx], q: e.target.value };
                            setFormState({ ...formState, aeo_faqs: updated });
                          }}
                        />
                        <textarea
                          className="sample-cert-form-input sample-cert-form-textarea"
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
                      className="sample-cert-json-add-btn"
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

            <div className="sample-cert-modal-footer">
              <span className={`sample-cert-modal-status ${modalStatus.type}`}>
                {modalStatus.msg}
              </span>
              <div className="sample-cert-modal-actions">
                <button type="button" className="sample-cert-btn-cancel" onClick={() => setEditorModal(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="sample-cert-btn-save"
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
