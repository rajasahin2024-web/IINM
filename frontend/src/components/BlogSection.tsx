"use client";
import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:2007/api";

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  featured_image: string | null;
  category_name: string | null;
  category_color: string | null;
  author_name: string | null;
  author_avatar: string | null;
  published_at: string | null;
  reading_time: number;
}

export default function BlogSection() {
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    fetch(`${API_BASE}/blogs?status=published&limit=4`)
      .then((r) => r.json())
      .then((data) => {
        setPosts(data.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const scroll = (dir: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 320, behavior: "smooth" });
    }
  };

  // ─── Subtle particle network canvas ───────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = section.getBoundingClientRect();
      canvas.width = rect.width * (window.devicePixelRatio || 1);
      canvas.height = rect.height * (window.devicePixelRatio || 1);
      const dpr = window.devicePixelRatio || 1;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
    };
    resize();

    const PARTICLE_COUNT = 55;
    const CONNECTION_DIST = 110;
    const MOUSE_REPEL = 130;
    const REPEL_FORCE = 0.35;

    interface P {
      x: number;
      y: number;
      baseX: number;
      baseY: number;
      vx: number;
      vy: number;
      r: number;
    }

    const w = () => canvas!.width / (window.devicePixelRatio || 1);
    const h = () => canvas!.height / (window.devicePixelRatio || 1);

    const particles: P[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * w(),
      y: Math.random() * h(),
      baseX: 0,
      baseY: 0,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.2 + 0.6,
    }));
    particles.forEach((p) => {
      p.baseX = p.x;
      p.baseY = p.y;
    });

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas!.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };
    const handleMouseLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 };
    };

    section.addEventListener("mousemove", handleMouseMove);
    section.addEventListener("mouseleave", handleMouseLeave);

    let animId: number;
    const animate = () => {
      const width = w();
      const height = h();
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // gentle ambient drift
        p.x += p.vx;
        p.y += p.vy;

        // soft return toward base to keep particles from drifting too far
        p.vx += (p.baseX - p.x) * 0.0008;
        p.vy += (p.baseY - p.y) * 0.0008;
        // slight damping so they don't accelerate forever
        p.vx *= 0.998;
        p.vy *= 0.998;

        // wrap around edges
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        // mouse repulsion — slow, smooth, wave-like
        const mdx = p.x - mouseRef.current.x;
        const mdy = p.y - mouseRef.current.y;
        const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mDist < MOUSE_REPEL && mDist > 0) {
          const force = ((MOUSE_REPEL - mDist) / MOUSE_REPEL) * REPEL_FORCE;
          const angle = Math.atan2(mdy, mdx);
          p.vx += Math.cos(angle) * force;
          p.vy += Math.sin(angle) * force;
        }

        // draw dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(10, 22, 40, 0.09)";
        ctx.fill();
      }

      // draw network lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            const alpha = 0.045 * (1 - dist / CONNECTION_DIST);
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(10, 22, 40, ${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(animate);
    };
    animate();

    const ro = new ResizeObserver(resize);
    ro.observe(section);

    return () => {
      cancelAnimationFrame(animId);
      section.removeEventListener("mousemove", handleMouseMove);
      section.removeEventListener("mouseleave", handleMouseLeave);
      ro.disconnect();
    };
  }, []);

  const fmtDate = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    const skeletonCards = Array.from({ length: 4 });
    return (
      <section className="blog-section" style={{ padding: "80px 48px", background: "#ffffff" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0" }}>
          {/* Skeleton header */}
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ width: 130, height: 28, borderRadius: 999, background: "#e2e8f0", margin: "0 auto 16px" }} />
            <div style={{ width: 260, height: 38, borderRadius: 8, background: "#e2e8f0", margin: "0 auto 12px" }} />
            <div style={{ width: 420, height: 20, borderRadius: 6, background: "#e2e8f0", margin: "0 auto" }} />
          </div>
          {/* Skeleton cards */}
          <div style={{ display: "flex", gap: 24, padding: "8px 0" }}>
            {skeletonCards.map((_, i) => (
              <div key={i} style={{ flex: "0 0 280px", minWidth: 280 }}>
                <div style={{ borderRadius: 16, border: "1px solid #f1f5f9", overflow: "hidden", background: "#fff", boxShadow: "0 2px 8px rgba(10,22,40,0.04)", animation: "blog-skeleton-pulse 1.6s ease-in-out infinite", animationDelay: `${i * 0.15}s` }}>
                  <div style={{ height: 170, background: "#e2e8f0" }} />
                  <div style={{ padding: 20 }}>
                    <div style={{ height: 18, borderRadius: 6, background: "#e2e8f0", marginBottom: 10, width: "92%" }} />
                    <div style={{ height: 18, borderRadius: 6, background: "#e2e8f0", marginBottom: 10, width: "65%" }} />
                    <div style={{ height: 14, borderRadius: 6, background: "#e2e8f0", marginBottom: 6, width: "100%" }} />
                    <div style={{ height: 14, borderRadius: 6, background: "#e2e8f0", marginBottom: 16, width: "80%" }} />
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, borderTop: "1px solid #f1f5f9" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#e2e8f0" }} />
                        <div style={{ width: 90, height: 14, borderRadius: 6, background: "#e2e8f0" }} />
                      </div>
                      <div style={{ width: 80, height: 12, borderRadius: 6, background: "#e2e8f0" }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Skeleton CTA */}
          <div style={{ textAlign: "center", marginTop: 40 }}>
            <div style={{ width: 160, height: 42, borderRadius: 999, background: "#e2e8f0", margin: "0 auto" }} />
          </div>
        </div>
      </section>
    );
  }

  if (posts.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      className="blog-section"
      style={{ padding: "80px 48px", background: "#ffffff", position: "relative", overflow: "hidden" }}
    >
      {/* Subtle particle network canvas */}
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
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0", position: "relative", zIndex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(10,22,40,0.06)",
              border: "1px solid rgba(10,22,40,0.12)",
              borderRadius: 999,
              padding: "6px 16px",
              fontSize: 12,
              fontWeight: 600,
              color: "#0a1628",
              letterSpacing: 0.5,
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e63946" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            Latest Articles
          </div>
          <h2
            style={{
              fontSize: "clamp(28px, 4vw, 38px)",
              fontWeight: 800,
              color: "#0a1628",
              marginBottom: 12,
              letterSpacing: -0.5,
              lineHeight: 1.2,
            }}
          >
            From Our Blog
          </h2>
          <p style={{ fontSize: 16, color: "#64748b", maxWidth: 520, margin: "0 auto", lineHeight: 1.6 }}>
            Stay updated with the latest insights, tutorials, and news about AI and technology.
          </p>
        </div>

        {/* Cards + Navigation */}
        <div style={{ position: "relative" }}>
          {/* Left Arrow */}
          <button
            onClick={() => scroll(-1)}
            aria-label="Previous"
            style={{
              position: "absolute",
              left: -16,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 10,
              width: 44,
              height: 44,
              borderRadius: "50%",
              border: "1px solid #e2e8f0",
              background: "#fff",
              boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget.style.borderColor = "#e63946");
              (e.currentTarget.style.color = "#e63946");
            }}
            onMouseLeave={(e) => {
              (e.currentTarget.style.borderColor = "#e2e8f0");
              (e.currentTarget.style.color = "#0a1628");
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Right Arrow */}
          <button
            onClick={() => scroll(1)}
            aria-label="Next"
            style={{
              position: "absolute",
              right: -16,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 10,
              width: 44,
              height: 44,
              borderRadius: "50%",
              border: "1px solid #e2e8f0",
              background: "#fff",
              boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget.style.borderColor = "#e63946");
              (e.currentTarget.style.color = "#e63946");
            }}
            onMouseLeave={(e) => {
              (e.currentTarget.style.borderColor = "#e2e8f0");
              (e.currentTarget.style.color = "#0a1628");
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* Scrollable cards */}
          <div
            ref={scrollRef}
            style={{
              display: "flex",
              gap: 24,
              overflowX: "auto",
              scrollSnapType: "x mandatory",
              padding: "8px 0",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                onClick={(e) => {
                  // Mobile fix: scroll-snap container can swallow touch clicks.
                  // Force programmatic navigation so the blog page always opens.
                  if (e.ctrlKey || e.metaKey || e.shiftKey) return;
                  e.preventDefault();
                  router.push(`/blog/${post.slug}`);
                }}
                style={{
                  flex: "0 0 280px",
                  minWidth: 280,
                  scrollSnapAlign: "start",
                  textDecoration: "none",
                  color: "inherit",
                  cursor: "pointer",
                }}
              >
                <article
                  style={{
                    background: "#fff",
                    borderRadius: 16,
                    border: "1px solid #f1f5f9",
                    overflow: "hidden",
                    boxShadow: "0 2px 8px rgba(10,22,40,0.04)",
                    transition: "transform 0.25s ease, box-shadow 0.25s ease",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-6px)";
                    e.currentTarget.style.boxShadow = "0 12px 32px rgba(10,22,40,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(10,22,40,0.04)";
                  }}
                >
                  {/* Image */}
                  <div style={{ position: "relative", height: 170, overflow: "hidden", background: "#f8fafc" }}>
                    {post.featured_image ? (
                      <img
                        src={post.featured_image}
                        alt={post.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s ease" }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.06)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                      />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)" }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                    )}
                    {/* Category tag */}
                    {post.category_name && (
                      <span
                        style={{
                          position: "absolute",
                          top: 12,
                          left: 12,
                          background: post.category_color || "#e63946",
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "4px 10px",
                          borderRadius: 999,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                        }}
                      >
                        {post.category_name}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ padding: "20px", display: "flex", flexDirection: "column", flex: 1 }}>
                    <h3
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#0a1628",
                        lineHeight: 1.35,
                        marginBottom: 10,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {post.title}
                    </h3>
                    <p
                      style={{
                        fontSize: 14,
                        color: "#64748b",
                        lineHeight: 1.55,
                        marginBottom: 16,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        flex: 1,
                      }}
                    >
                      {post.excerpt || "Read the full article to learn more about this topic."}
                    </p>

                    {/* Footer: author + meta */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, borderTop: "1px solid #f1f5f9" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        {post.author_avatar ? (
                          <img src={post.author_avatar} alt={post.author_name || ""} style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#0a1628", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                            {(post.author_name || "A").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#334155", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{post.author_name || "Team IINM"}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94a3b8", whiteSpace: "nowrap", flexShrink: 0 }}>
                        <span style={{ whiteSpace: "nowrap" }}>{fmtDate(post.published_at)}</span>
                        {post.reading_time ? (
                          <>
                            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#cbd5e1", flexShrink: 0 }} />
                            <span style={{ whiteSpace: "nowrap" }}>{post.reading_time} min read</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>

        {/* View All */}
        <div style={{ textAlign: "center", marginTop: 40 }}>
          <Link
            href="/blog"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: "#0a1628",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              padding: "12px 28px",
              borderRadius: 999,
              textDecoration: "none",
              transition: "all 0.25s ease",
              boxShadow: "0 4px 14px rgba(10,22,40,0.25)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#e63946";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(230,57,70,0.35)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#0a1628";
              e.currentTarget.style.boxShadow = "0 4px 14px rgba(10,22,40,0.25)";
            }}
          >
            View All Articles
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
