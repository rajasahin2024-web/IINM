"use client";
import React, { useState, useDeferredValue, useCallback, useRef } from "react";
import Link from "next/link";
import PublicFooter from "@/components/PublicFooter";
import { API_BASE_URL as API } from "@/lib/config";

interface Post {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  featured_image: string | null;
  category_name: string | null;
  author_name: string;
  published_at: string;
  reading_time: number;
  views: number;
}

const fmt = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export default function BlogListClient({ initialPosts, pageSize }: { initialPosts: Post[]; pageSize: number }) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length === pageSize);
  const skipRef = useRef(initialPosts.length);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`${API}/blogs?status=published&limit=${pageSize}&skip=${skipRef.current}`);
      const d = await res.json();
      const items: Post[] = d.items || [];
      setPosts((prev) => [...prev, ...items]);
      skipRef.current += items.length;
      setHasMore(items.length === pageSize);
    } catch {
      /* ignore */
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, pageSize]);

  // Filter on the deferred value so typing stays smooth.
  const filtered = posts.filter((p) =>
    p.title.toLowerCase().includes(deferredSearch.toLowerCase()) ||
    (p.excerpt || "").toLowerCase().includes(deferredSearch.toLowerCase())
  );

  const heroPost = filtered[0];
  const showHero = heroPost && deferredSearch === "";
  const gridPosts = filtered.slice(showHero ? 1 : 0);

  return (
    <>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px 60px" }}>
        {/* Search */}
        <div style={{ maxWidth: 500, margin: "0 auto 40px", position: "relative" }}>
          <input
            type="text"
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "14px 20px 14px 44px",
              borderRadius: 999,
              border: "1px solid #e2e8f0",
              background: "#fff",
              color: "#0a1628",
              fontSize: 15,
              outline: "none",
              transition: "all 0.2s ease",
              boxSizing: "border-box",
            }}
          />
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }}>
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#0a1628", marginBottom: 8 }}>No articles found</div>
            <div style={{ fontSize: 14, color: "#64748b" }}>Try a different search term.</div>
          </div>
        ) : (
          <>
            {/* Featured Hero Card */}
            {showHero && (
              <Link href={`/blog/${heroPost.slug}`} style={{ textDecoration: "none", color: "inherit", display: "block", marginBottom: 40 }}>
                <article
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.1fr 1fr",
                    gap: 0,
                    borderRadius: 16,
                    overflow: "hidden",
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 16px rgba(10,22,40,0.06)",
                    transition: "transform 0.3s ease, box-shadow 0.3s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(10,22,40,0.1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(10,22,40,0.06)"; }}
                >
                  <div style={{ height: "100%", minHeight: 320, background: heroPost.featured_image ? "none" : "#f1f5f9", overflow: "hidden" }}>
                    {heroPost.featured_image ? (
                      <img src={heroPost.featured_image} alt={heroPost.title} loading="eager" fetchPriority="high" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 40, opacity: 0.12 }}>📝</span>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "32px 28px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    {heroPost.category_name && (
                      <span style={{ alignSelf: "flex-start", background: "#e63946", color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 999, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>
                        {heroPost.category_name}
                      </span>
                    )}
                    <h2 style={{ fontSize: 26, fontWeight: 800, color: "#0a1628", lineHeight: 1.25, marginBottom: 12, letterSpacing: -0.4 }}>{heroPost.title}</h2>
                    <p style={{ fontSize: 15, color: "#475569", lineHeight: 1.6, marginBottom: 20 }}>{heroPost.excerpt || ""}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "#94a3b8" }}>
                      <span>{fmt(heroPost.published_at)}</span>
                      <span>·</span>
                      <span>{heroPost.reading_time || 1} min read</span>
                      <span>·</span>
                      <span>{heroPost.views || 0} views</span>
                    </div>
                  </div>
                </article>
              </Link>
            )}

            {/* Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24 }}>
              {gridPosts.map((p) => (
                <Link key={p.id} href={`/blog/${p.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <article
                    style={{
                      borderRadius: 14,
                      overflow: "hidden",
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 2px 8px rgba(10,22,40,0.04)",
                      transition: "transform 0.25s ease, box-shadow 0.25s ease",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 10px 24px rgba(10,22,40,0.08)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(10,22,40,0.04)"; }}
                  >
                    <div style={{ height: 180, background: p.featured_image ? "none" : "#f1f5f9", overflow: "hidden" }}>
                      {p.featured_image ? (
                        <img src={p.featured_image} alt={p.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s ease" }} onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; }} onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 28, opacity: 0.12 }}>📝</span>
                        </div>
                      )}
                    </div>
                    <div style={{ padding: 18, flex: 1, display: "flex", flexDirection: "column" }}>
                      {p.category_name && (
                        <span style={{ alignSelf: "flex-start", background: "rgba(10,22,40,0.06)", color: "#475569", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 999, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
                          {p.category_name}
                        </span>
                      )}
                      <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0a1628", lineHeight: 1.35, marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", flex: 1 }}>{p.title}</h3>
                      <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.5, marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.excerpt || ""}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94a3b8", marginTop: "auto" }}>
                        <span>{fmt(p.published_at)}</span>
                        <span>·</span>
                        <span>{p.reading_time || 1} min</span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>

            {/* Load More (only when not searching and more posts exist) */}
            {deferredSearch === "" && hasMore && (
              <div style={{ textAlign: "center", marginTop: 40 }}>
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  style={{
                    background: "#0a1628",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 700,
                    padding: "12px 28px",
                    borderRadius: 999,
                    border: "none",
                    cursor: loadingMore ? "wait" : "pointer",
                    opacity: loadingMore ? 0.7 : 1,
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => { if (!loadingMore) e.currentTarget.style.background = "#e63946"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#0a1628"; }}
                >
                  {loadingMore ? "Loading…" : "Load more articles"}
                </button>
              </div>
            )}

            <div style={{ textAlign: "center", marginTop: 48, fontSize: 13, color: "#94a3b8" }}>
              Showing {gridPosts.length + (showHero ? 1 : 0)} article{(gridPosts.length + (showHero ? 1 : 0)) !== 1 ? "s" : ""}
              {deferredSearch !== "" && " (filtered)"}
            </div>
          </>
        )}
      </div>
      <PublicFooter />
    </>
  );
}
