"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./AIEcosystemSection.module.css";
import { apiFetch } from "@/lib/apiFetch";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/* ─── Types ─── */
interface SectionData {
  label: string;
  heading_line1: string;
  heading_line2: string;
  accent_word: string;
  lead: string;
}

interface CardData {
  id: number;
  title: string;
  description: string;
  accent_color: string;
  order_position: number;
  is_active: boolean;
}

const DEFAULT_SECTION: SectionData = {
  label: "IINM AI Ecosystem",
  heading_line1: "Everything you need",
  heading_line2: "to master modern AI",
  accent_word: "modern AI",
  lead: "One complete learning environment. Six interconnected pillars. From your first doubt to your final credential — everything lives here.",
};

const DEFAULT_CARDS: CardData[] = [
  { id: 1, title: "AI Doubt Portal", description: "24/7 curriculum-trained AI mentor helping students solve coding, automation, prompting and AI workflow problems instantly.", accent_color: "#4facfe", order_position: 1, is_active: true },
  { id: 2, title: "Latest AI Tools", description: "Hands-on training with ChatGPT, Claude, Gemini, Cursor and every cutting-edge tool the industry adopts. Stay ahead of the curve.", accent_color: "#00f2fe", order_position: 2, is_active: true },
  { id: 3, title: "Live Practical Classes", description: "Real instructors, live coding, screen sharing and interactive problem solving. Learn by building, not just watching.", accent_color: "#4facfe", order_position: 3, is_active: true },
  { id: 4, title: "Verified Credentials", description: "Earn industry-recognized certificates after rigorous assessment. Blockchain-verified badges that recruiters trust.", accent_color: "#00f2fe", order_position: 4, is_active: true },
  { id: 5, title: "Lifetime Updates", description: "AI evolves daily. Your enrollment unlocks every future module, tool update and curriculum refresh forever. Pay once, grow forever.", accent_color: "#4facfe", order_position: 5, is_active: true },
  { id: 6, title: "AI Community", description: "Join a high-signal global network of AI builders, mentors and collaborators. Share prompts, find partners, accelerate together.", accent_color: "#00f2fe", order_position: 6, is_active: true },
];

function isAdminLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("iinm_is_logged_in") === "true";
}

/* ─── Simple Canvas Particles ─── */
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0, h = 0;
    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];

    const resize = () => {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const isMobile = window.innerWidth <= 860;
    const count = isMobile ? 80 : 350;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        size: Math.random() * 1.2 + 0.3,
        alpha: Math.random() * 0.35 + 0.1,
      });
    }

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(79,172,254,${p.alpha})`;
        ctx.fill();
      }
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.particleCanvas} />;
}

/* ─── Inline Edit Field ─── */
function InlineEdit({
  value,
  onChange,
  isTextArea = false,
  style = {},
}: {
  value: string;
  onChange: (v: string) => void;
  isTextArea?: boolean;
  style?: React.CSSProperties;
}) {
  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(79,172,254,0.4)",
    borderRadius: "6px",
    padding: "6px 10px",
    color: "#fff",
    fontSize: "inherit",
    fontFamily: "inherit",
    lineHeight: "inherit",
    width: "100%",
    outline: "none",
    resize: "none",
    ...style,
  };

  if (isTextArea) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
        rows={3}
      />
    );
  }
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={inputStyle}
    />
  );
}

/* ─── Main Section ─── */
export default function AIEcosystemSection() {
  const trackRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const [activeAccordion, setActiveAccordion] = useState<number | null>(0);

  const [section, setSection] = useState<SectionData>(DEFAULT_SECTION);
  const [cards, setCards] = useState<CardData[]>(DEFAULT_CARDS);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [editSection, setEditSection] = useState<SectionData>(DEFAULT_SECTION);
  const [editCards, setEditCards] = useState<CardData[]>(DEFAULT_CARDS);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [secRes, cardRes] = await Promise.all([
        apiFetch("/api/settings/ai-ecosystem-section"),
        apiFetch("/api/settings/ai-ecosystem-cards"),
      ]);
      if (secRes.ok) {
        const secData = await secRes.json();
        setSection(secData);
        setEditSection(secData);
      }
      if (cardRes.ok) {
        const cardData = await cardRes.json();
        setCards(cardData);
        setEditCards(cardData);
      }
    } catch (e) {
      console.error("Failed to load AI Ecosystem data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    setIsAdmin(isAdminLoggedIn());
    const handleStorage = () => setIsAdmin(isAdminLoggedIn());
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [loadData]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const cardsEl = cardsRef.current;
    if (!cardsEl) return;

    const cardEls = cardsEl.querySelectorAll(`.${styles.accordionItem}`);

    cardEls.forEach((el, i) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 40, scale: 0.96 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
          delay: i * 0.08,
        }
      );
    });

    return () => {
      ScrollTrigger.getAll().forEach((t) => {
        if (cardEls.length && Array.from(cardEls).includes(t.trigger as Element)) t.kill();
      });
    };
  }, [cards.length]);

  const startEdit = () => {
    setEditSection({ ...section });
    setEditCards(cards.map((c) => ({ ...c })));
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const secRes = await apiFetch("/api/settings/ai-ecosystem-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editSection),
      });

      for (const card of editCards) {
        await apiFetch(`/api/settings/ai-ecosystem-cards/${card.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: card.title,
            description: card.description,
            accent_color: card.accent_color,
            order_position: card.order_position,
            is_active: card.is_active,
          }),
        });
      }

      if (secRes.ok) {
        setSection({ ...editSection });
        setCards([...editCards]);
        setIsEditing(false);
      }
    } catch (e) {
      console.error("Save failed:", e);
      alert("Save failed. Check console.");
    } finally {
      setSaving(false);
    }
  };

  const updateCardField = (idx: number, field: keyof CardData, value: string | number | boolean) => {
    setEditCards((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const activeCards = isEditing ? editCards : cards;

  if (loading) {
    return (
      <section className={styles.section}>
        <div className={styles.track} style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>Loading…</div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <div ref={trackRef} className={styles.track}>
        <ParticleCanvas />

        <div className={styles.content}>
          {/* Left: Text */}
          <div className={styles.textCol}>
            {isAdmin && !isEditing && (
              <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
                <button
                  onClick={startEdit}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 6,
                    border: "1px solid rgba(79,172,254,0.4)",
                    background: "rgba(79,172,254,0.1)",
                    color: "#4facfe",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Edit Section
                </button>
              </div>
            )}

            {isAdmin && isEditing && (
              <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 6,
                    border: "1px solid rgba(0,242,254,0.4)",
                    background: "rgba(0,242,254,0.1)",
                    color: "#00f2fe",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: saving ? "not-allowed" : "pointer",
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={cancelEdit}
                  disabled={saving}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 6,
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: "rgba(255,255,255,0.05)",
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            )}

            {isEditing ? (
              <>
                <InlineEdit value={editSection.label} onChange={(v) => setEditSection((p) => ({ ...p, label: v }))} style={{ fontSize: 11, letterSpacing: "1.5px", textTransform: "uppercase", maxWidth: 260 }} />
                <InlineEdit value={editSection.heading_line1} onChange={(v) => setEditSection((p) => ({ ...p, heading_line1: v }))} style={{ fontSize: "clamp(24px,3vw,40px)", fontWeight: 700 }} />
                <InlineEdit value={editSection.heading_line2} onChange={(v) => setEditSection((p) => ({ ...p, heading_line2: v }))} style={{ fontSize: "clamp(24px,3vw,40px)", fontWeight: 700 }} />
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
                  Accent word:
                  <InlineEdit value={editSection.accent_word} onChange={(v) => setEditSection((p) => ({ ...p, accent_word: v }))} style={{ maxWidth: 200 }} />
                </div>
                <InlineEdit value={editSection.lead} onChange={(v) => setEditSection((p) => ({ ...p, lead: v }))} isTextArea style={{ maxWidth: 420 }} />
              </>
            ) : (
              <>
                <span className={styles.label}>{section.label}</span>
                <h2 className={styles.heading}>
                  {section.heading_line1}
                  <br />
                  {section.heading_line2.split(section.accent_word)[0]}
                  <span className={styles.accent}>{section.accent_word}</span>
                </h2>
                <p className={styles.lead}>{section.lead}</p>
              </>
            )}
          </div>

          {/* Right: Feature Accordion */}
          <div ref={cardsRef} className={styles.cardsCol}>
            {activeCards.map((card, i) => (
              <div
                key={card.id}
                className={`${styles.accordionItem} ${activeAccordion === card.id ? styles.active : ""}`}
                style={{ ["--card-accent" as string]: card.accent_color }}
                onMouseEnter={() => setActiveAccordion(card.id)}
                onClick={() => setActiveAccordion(activeAccordion === card.id ? null : card.id)}
              >
                <div className={styles.accordionHeader}>
                  <span className={styles.cardNumber}>0{i + 1}</span>
                  {isEditing ? (
                    <InlineEdit
                      value={card.title}
                      onChange={(v) => updateCardField(i, "title", v)}
                      style={{ fontSize: 15, fontWeight: 600, flex: 1 }}
                    />
                  ) : (
                    <h3 className={styles.cardTitle}>{card.title}</h3>
                  )}
                  {!isEditing && (
                    <span className={styles.accordionIcon}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                </div>
                <div className={styles.accordionPanel}>
                  {isEditing ? (
                    <>
                      <InlineEdit
                        value={card.description}
                        onChange={(v) => updateCardField(i, "description", v)}
                        isTextArea
                        style={{ fontSize: 13, marginBottom: 8 }}
                      />
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
                        Color:
                        <input
                          type="color"
                          value={card.accent_color}
                          onChange={(e) => updateCardField(i, "accent_color", e.target.value)}
                          style={{ width: 28, height: 28, border: "none", background: "none", cursor: "pointer" }}
                        />
                        <span style={{ fontFamily: "monospace", fontSize: 11 }}>{card.accent_color}</span>
                      </div>
                    </>
                  ) : (
                    <p className={styles.cardDesc}>{card.description}</p>
                  )}
                </div>
                <div className={styles.cardGlow} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
