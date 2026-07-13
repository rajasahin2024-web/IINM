"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiFetch";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  radius: number;
  alpha: number;
  pulseSpeed: number;
  pulsePhase: number;
}

interface SectionData {
  badge_text: string;
  heading_line1: string;
  heading_accent: string;
  heading_line2: string;
  description: string;
  button_text: string;
  button_link: string;
}

const DEFAULT_SECTION: SectionData = {
  badge_text: "Admissions Open",
  heading_line1: "Ready to",
  heading_accent: "Connect the Dots",
  heading_line2: "of AI?",
  description: "Enroll in our upcoming cohort to master deep tech competencies, work in elite robotics laboratories, and accelerate your career trajectory.",
  button_text: "Apply For Admission",
  button_link: "/contact-us",
};

function isAdminLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("iinm_is_logged_in") === "true";
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
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "6px",
    padding: "8px 12px",
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
      <textarea value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} rows={3} />
    );
  }
  return <input type="text" value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />;
}

export default function AnimatedCTASection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  
  // Track mouse position and swipe speed for fluid flow field physics
  const mouseVelocityRef = useRef({ vx: 0, vy: 0, lastX: 0, lastY: 0, hasMoved: false });

  const [section, setSection] = useState<SectionData>(DEFAULT_SECTION);
  const [editSection, setEditSection] = useState<SectionData>(DEFAULT_SECTION);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const res = await apiFetch("/api/settings/cta-section");
      if (res.ok) {
        const data = await res.json();
        setSection(data);
        setEditSection(data);
      }
    } catch (e) {
      console.error("Failed to load CTA section data:", e);
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

  const startEdit = () => {
    setEditSection({ ...section });
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  const saveEdit = async () => {
    setIsSaving(true);
    try {
      const res = await apiFetch("/api/settings/cta-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editSection),
      });
      if (res.ok) {
        setSection({ ...editSection });
        setIsEditing(false);
      }
    } catch (e) {
      console.error("Save failed:", e);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = container.offsetWidth);
    let height = (canvas.height = container.offsetHeight);

    const particles: Particle[] = [];
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    const particleCount = isMobile ? 40 : 100; // Slightly more smaller particles for a dense flowing mesh
    const connectionDistance = isMobile ? 90 : 130;

    // Create particles with realistic initial states and glowing sizes
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.12, // Slow cinematic starting speed
        vy: (Math.random() - 0.5) * 0.12,
        ax: 0,
        ay: 0,
        radius: Math.random() * 1.5 + 0.8, // Small, ultra-elegant particles (reset back as requested)
        alpha: Math.random() * 0.3 + 0.12, // Soft white transparency
        pulseSpeed: Math.random() * 0.015 + 0.005, // Slower breathing pulse
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }

    const handleResize = () => {
      if (!container || !canvas) return;
      width = canvas.width = container.offsetWidth;
      height = canvas.height = container.offsetHeight;
    };

    window.addEventListener("resize", handleResize);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Decay mouse velocity naturally inside the physics tick
      const mVel = mouseVelocityRef.current;
      mVel.vx *= 0.94;
      mVel.vy *= 0.94;

      // Render dark ambient space gradient blending into var(--navy) (#0a1628)
      const radialGrad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        10,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.8
      );
      radialGrad.addColorStop(0, "rgba(13, 30, 56, 0.9)");
      radialGrad.addColorStop(1, "rgba(10, 22, 40, 1)"); // Seamlessly matches var(--navy) exactly
      ctx.fillStyle = radialGrad;
      ctx.fillRect(0, 0, width, height);

      // Draw subtle mouse hover light
      if (mouse) {
        const mouseGlow = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          0,
          mouse.x,
          mouse.y,
          250
        );
        mouseGlow.addColorStop(0, "rgba(255, 255, 255, 0.02)");
        mouseGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = mouseGlow;
        ctx.fillRect(0, 0, width, height);
      }

      // Physics integration loop
      particles.forEach((p) => {
        // 1. Slow organic random steering force (graceful cosmic drifting physics)
        p.ax += (Math.random() - 0.5) * 0.0012;
        p.ay += (Math.random() - 0.5) * 0.0012;

        // 2. Mouse interactive fluid-flow current & swirl physics
        if (mouse) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.hypot(dx, dy);

          if (dist < 220) {
            const force = (220 - dist) / 220;

            // Flow current: Push particles along with mouse velocity direction (drag factor)
            p.ax += mVel.vx * force * 0.14;
            p.ay += mVel.vy * force * 0.14;

            // Swirl / Vortex eddy current (circular flow around cursor)
            const swirlSpeed = force * 0.015;
            p.ax += (dy / dist) * swirlSpeed;
            p.ay -= (dx / dist) * swirlSpeed;

            // Gentle static attraction pull towards cursor
            const gravityForce = force * 0.004;
            p.ax += (dx / dist) * gravityForce;
            p.ay += (dy / dist) * gravityForce;

            // Prevent crowding directly on cursor with soft local repulsion
            if (dist < 40) {
              const pushForce = (40 - dist) / 40 * 0.03;
              p.ax -= (dx / dist) * pushForce;
              p.ay -= (dy / dist) * pushForce;
            }
          }
        }

        // 3. Update Velocities & Damping (Inertia + Smooth Friction)
        p.vx += p.ax;
        p.vy += p.ay;

        const friction = 0.99; // Very high friction for extremely smooth glide
        p.vx *= friction;
        p.vy *= friction;

        // Speed clamping for ultra-slow cinematic motion
        const speed = Math.hypot(p.vx, p.vy);
        const maxSpeed = 0.22;
        if (speed > maxSpeed) {
          p.vx = (p.vx / speed) * maxSpeed;
          p.vy = (p.vy / speed) * maxSpeed;
        }

        // 4. Update Positions
        p.x += p.vx;
        p.y += p.vy;

        // Reset frame accelerations
        p.ax = 0;
        p.ay = 0;

        // 5. Wrap or soft-bounce around borders smoothly
        const buffer = 40;
        if (p.x < -buffer) p.x = width + buffer;
        if (p.x > width + buffer) p.x = -buffer;
        if (p.y < -buffer) p.y = height + buffer;
        if (p.y > height + buffer) p.y = -buffer;

        // Update pulse phase for breathing light effect
        p.pulsePhase += p.pulseSpeed;
        const currentAlpha = p.alpha + Math.sin(p.pulsePhase) * 0.05;
        const boundedAlpha = Math.max(0.04, Math.min(0.35, currentAlpha));

        // 6. Draw small glowing particle with very subtle halos (Bokeh effect)
        
        // Subtle outer glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${boundedAlpha * 0.16})`;
        ctx.fill();

        // Solid core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${boundedAlpha * 0.9})`;
        ctx.fill();
      });

      // Particle-to-Particle connections
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.hypot(dx, dy);

          if (dist < connectionDistance) {
            // Apply molecular repulsion if they get too close to simulate space physics
            if (dist < 35) {
              const repel = (35 - dist) / 35 * 0.004;
              p1.ax -= (dx / dist) * repel;
              p1.ay -= (dy / dist) * repel;
              p2.ax += (dx / dist) * repel;
              p2.ay += (dy / dist) * repel;
            }

            const alpha = (1 - dist / connectionDistance) * 0.075; // Low opacity physical links
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }

        // Physical mouse link string
        if (mouse) {
          const dx = mouse.x - p1.x;
          const dy = mouse.y - p1.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 150) {
            const alpha = (1 - dist / 150) * 0.1;
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [mouse]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    // Measure cursor swipe speed and direction
    const mVel = mouseVelocityRef.current;
    if (mVel.hasMoved) {
      mVel.vx = currentX - mVel.lastX;
      mVel.vy = currentY - mVel.lastY;
    } else {
      mVel.hasMoved = true;
    }
    mVel.lastX = currentX;
    mVel.lastY = currentY;

    setMouse({
      x: currentX,
      y: currentY,
    });
  };

  const handleMouseLeave = () => {
    setMouse(null);
    setIsHovered(false);
    
    // Reset mouse velocities on leave
    const mVel = mouseVelocityRef.current;
    mVel.hasMoved = false;
    mVel.vx = 0;
    mVel.vy = 0;
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        width: "100%",
        background: "var(--navy, #0a1628)", // Matches site background exactly
        position: "relative",
        overflow: "hidden",
        padding: "110px 48px",
        margin: "0", // Zero margins to merge completely with surrounding sections
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      {/* Lightweight interactive background canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Subtle grid background overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.015) 1px, transparent 1px)`,
          backgroundSize: "36px 32px",
          pointerEvents: "none",
          zIndex: 1,
          opacity: isHovered ? 0.7 : 0.4,
          transition: "opacity 0.6s ease",
        }}
      />

      {/* Clean, Elegant Content Box */}
      <div
        style={{
          position: "relative",
          zIndex: 3,
          maxWidth: "680px",
          width: "100%",
          padding: "0 16px",
        }}
      >
        {/* Admin Edit Buttons */}
        {isAdmin && !isEditing && (
          <div style={{ marginBottom: 16, display: "flex", gap: 8, justifyContent: "center" }}>
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
          <div style={{ marginBottom: 16, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={saveEdit}
              disabled={isSaving}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "1px solid rgba(0,242,254,0.4)",
                background: "rgba(0,242,254,0.1)",
                color: "#00f2fe",
                fontSize: 12,
                fontWeight: 600,
                cursor: isSaving ? "not-allowed" : "pointer",
                opacity: isSaving ? 0.6 : 1,
              }}
            >
              {isSaving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={cancelEdit}
              disabled={isSaving}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.6)",
                fontSize: 12,
                fontWeight: 600,
                cursor: isSaving ? "not-allowed" : "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Minimalist Soft Badge */}
        {isEditing ? (
          <div style={{ marginBottom: 28 }}>
            <InlineEdit
              value={editSection.badge_text}
              onChange={(v) => setEditSection((p) => ({ ...p, badge_text: v }))}
              style={{ fontSize: 11, letterSpacing: "2.2px", maxWidth: 280 }}
            />
          </div>
        ) : (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.07)",
              color: "rgba(255, 255, 255, 0.65)",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "2.2px",
              textTransform: "uppercase",
              borderRadius: "4px",
              padding: "5px 12px",
              marginBottom: "28px",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "4px",
                height: "4px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.7)",
                boxShadow: "0 0 8px rgba(255, 255, 255, 0.7)",
              }}
            />
            {section.badge_text}
          </span>
        )}

        {/* Premium Minimal Header */}
        {isEditing ? (
          <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              <InlineEdit value={editSection.heading_line1} onChange={(v) => setEditSection((p) => ({ ...p, heading_line1: v }))} style={{ fontSize: "clamp(18px, 3vw, 28px)", fontWeight: 800, maxWidth: 200 }} />
              <InlineEdit value={editSection.heading_accent} onChange={(v) => setEditSection((p) => ({ ...p, heading_accent: v }))} style={{ fontSize: "clamp(18px, 3vw, 28px)", fontWeight: 800, maxWidth: 280 }} />
              <InlineEdit value={editSection.heading_line2} onChange={(v) => setEditSection((p) => ({ ...p, heading_line2: v }))} style={{ fontSize: "clamp(18px, 3vw, 28px)", fontWeight: 800, maxWidth: 160 }} />
            </div>
          </div>
        ) : (
          <h2
            style={{
              fontSize: "clamp(30px, 4.5vw, 48px)",
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-0.5px",
              marginBottom: "20px",
              lineHeight: "1.25",
            }}
          >
            {section.heading_line1}{" "}
            <span
              style={{
                background: "linear-gradient(90deg, #ffffff 30%, rgba(255, 255, 255, 0.55) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {section.heading_accent}
            </span>{" "}
            {section.heading_line2}
          </h2>
        )}

        {isEditing ? (
          <div style={{ marginBottom: 44 }}>
            <InlineEdit
              value={editSection.description}
              onChange={(v) => setEditSection((p) => ({ ...p, description: v }))}
              isTextArea
              style={{ fontSize: 15, maxWidth: 600 }}
            />
          </div>
        ) : (
          <p
            style={{
              fontSize: "16px",
              color: "rgba(255, 255, 255, 0.55)",
              maxWidth: "600px",
              margin: "0 auto 44px",
              lineHeight: "1.8",
              fontWeight: 400,
            }}
          >
            {section.description}
          </p>
        )}

        {/* Premium Clean Button */}
        {isEditing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
            <InlineEdit
              value={editSection.button_text}
              onChange={(v) => setEditSection((p) => ({ ...p, button_text: v }))}
              style={{ fontSize: 15, fontWeight: 700, maxWidth: 280 }}
            />
            <InlineEdit
              value={editSection.button_link}
              onChange={(v) => setEditSection((p) => ({ ...p, button_link: v }))}
              style={{ fontSize: 12, maxWidth: 280 }}
            />
          </div>
        ) : (
          <Link
            href={section.button_link}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              background: "#ffffff",
              color: "#020610",
              border: "none",
              borderRadius: "4px",
              padding: "18px 40px",
              fontSize: "15px",
              fontWeight: 700,
              cursor: "pointer",
              textDecoration: "none",
              transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              boxShadow: "0 4px 20px rgba(255, 255, 255, 0.08)",
              position: "relative",
              overflow: "hidden",
              letterSpacing: "0.5px",
            }}
          >
            <span style={{ position: "relative", zIndex: 2 }}>{section.button_text}</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                position: "relative",
                zIndex: 2,
                transition: "transform 0.3s ease",
                transform: isHovered ? "translateX(4px)" : "none",
              }}
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        )}
      </div>
    </div>
  );
}
