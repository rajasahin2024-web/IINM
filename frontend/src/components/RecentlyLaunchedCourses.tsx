"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL } from "@/lib/config";

interface CourseCardData {
  id: number;
  slug: string;
  title: string;
  description?: string | null;
  thumbnail_url?: string | null;
  instructor_name?: string | null;
  skill_level?: string | null;
  price?: number | null;
  discount_price?: number | null;
  price_usd?: number | null;
  discount_price_usd?: number | null;
  currency?: string;
  is_free?: boolean;
  has_certificate?: boolean;
  rating?: number | null;
  order_position?: number;
  is_active?: boolean;
}

interface SectionConfig {
  id: number;
  title: string;
  subtitle: string;
  cta_text: string;
  cta_link: string;
  background_image_url: string | null;
  is_active: boolean;
}

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

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="rlc-stars">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} style={{ color: s <= Math.round(rating) ? "#0a1628" : "#cbd5e1", fontSize: 13 }}>★</span>
      ))}
      <span className="rlc-rating-num">{rating.toFixed(1)}</span>
    </span>
  );
}

const EMPTY_CARD: Partial<CourseCardData> = {
  title: "", slug: "", description: "", thumbnail_url: "",
  instructor_name: "", skill_level: "", price: undefined,
  discount_price: undefined, currency: "INR", is_free: false,
  has_certificate: true, rating: undefined, order_position: 0, is_active: true,
};

export default function RecentlyLaunchedCourses() {
  const [cards, setCards] = useState<CourseCardData[]>([]);
  const [section, setSection] = useState<SectionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState<string>("All");
  const [isAdmin, setIsAdmin] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [isEditingSection, setIsEditingSection] = useState(false);
  const [editSection, setEditSection] = useState<Partial<SectionConfig>>({});
  const [isSavingSection, setIsSavingSection] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditingCard, setIsEditingCard] = useState(false);
  const [editCard, setEditCard] = useState<Partial<CourseCardData>>({});
  const [isSavingCard, setIsSavingCard] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  const fetchSection = async () => {
    try {
      const res = await apiFetch("/api/settings/home-recent-courses");
      if (res.ok) { const data = await res.json(); setSection(data.section); }
    } catch { /* ignore */ }
  };

  const fetchCards = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/settings/home-recent-course-cards");
      if (res.ok) { const data = await res.json(); setCards(Array.isArray(data) ? data : []); }
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchSection(); fetchCards();
    setIsAdmin(isAdminLoggedIn());
    const onStorage = () => setIsAdmin(isAdminLoggedIn());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const openSectionEditor = () => {
    if (!section) return;
    setEditSection({ ...section });
    setIsEditingSection(true);
  };

  const handleSaveSection = async () => {
    setIsSavingSection(true);
    try {
      const res = await apiFetch("/api/settings/home-recent-courses", {
        method: "PUT", body: JSON.stringify(editSection),
      });
      if (res.ok) { setIsEditingSection(false); fetchSection(); }
    } catch { /* ignore */ } finally { setIsSavingSection(false); }
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingBg(true);
    const fd = new FormData(); fd.append("file", file);
    try {
      const res = await apiFetch("/api/settings/site/upload", { method: "POST", body: fd });
      if (res.ok) { const result = await res.json(); setEditSection((s) => ({ ...s, background_image_url: result.url })); }
    } catch { /* ignore */ } finally { setUploadingBg(false); }
  };

  const openCardEditor = (card?: CourseCardData) => {
    if (card) setEditCard({ ...card });
    else setEditCard({ ...EMPTY_CARD, order_position: cards.length + 1 });
    setIsEditingCard(true);
  };

  const handleSaveCard = async () => {
    if (!editCard.title) return;
    setIsSavingCard(true);
    try {
      const isNew = !editCard.id;
      const endpoint = isNew ? "/api/settings/home-recent-course-cards" : `/api/settings/home-recent-course-cards/${editCard.id}`;
      const res = await apiFetch(endpoint, { method: isNew ? "POST" : "PUT", body: JSON.stringify(editCard) });
      if (res.ok) { setIsEditingCard(false); fetchCards(); }
    } catch { /* ignore */ } finally { setIsSavingCard(false); }
  };

  const handleDeleteCard = async (id: number) => {
    if (!confirm("Delete this course card?")) return;
    try {
      const res = await apiFetch(`/api/settings/home-recent-course-cards/${id}`, { method: "DELETE" });
      if (res.ok) fetchCards();
    } catch { /* ignore */ }
  };

  const handleThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingThumb(true);
    const fd = new FormData(); fd.append("file", file);
    try {
      const res = await apiFetch("/api/settings/site/upload", { method: "POST", body: fd });
      if (res.ok) { const result = await res.json(); setEditCard((c) => ({ ...c, thumbnail_url: result.url })); }
    } catch { /* ignore */ } finally { setUploadingThumb(false); }
  };

  const moveCard = async (index: number, dir: "up" | "down") => {
    const target = dir === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= cards.length) return;
    const next = [...cards];
    [next[index], next[target]] = [next[target], next[index]];
    next.forEach((c, i) => { c.order_position = i + 1; });
    setCards(next);
    await Promise.all(next.map((c) =>
      apiFetch(`/api/settings/home-recent-course-cards/${c.id}`, {
        method: "PUT", body: JSON.stringify({ order_position: c.order_position }),
      })
    ));
  };

  const tags = useMemo(() => {
    const set = new Set<string>(); set.add("All");
    cards.forEach((c) => { if (c.skill_level) set.add(c.skill_level); });
    return Array.from(set);
  }, [cards]);

  const filtered = useMemo(() => {
    if (activeTag === "All") return cards;
    return cards.filter((c) => c.skill_level === activeTag);
  }, [cards, activeTag]);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });
  };

  const bgStyle: React.CSSProperties = {};
  if (section?.background_image_url) {
    bgStyle.backgroundImage = `url(${section.background_image_url.startsWith("http") ? section.background_image_url : BASE_URL + section.background_image_url})`;
    bgStyle.backgroundSize = "cover"; bgStyle.backgroundPosition = "center";
  }

  return (
    <>
      <section className="rlc-section" style={bgStyle}>
        <div className="rlc-inner">
          <div className="rlc-left">
            <h2 className="rlc-title">{section?.title || "Get job-ready for an in-demand career"}</h2>
            <p className="rlc-subtitle">{section?.subtitle || "No prior experience needed to get started."}</p>
            <Link href={section?.cta_link || "/courses"} className="rlc-btn">
              {section?.cta_text || "Explore programs"} <span style={{ marginLeft: 6 }}>→</span>
            </Link>
            {isAdmin && (
              <div className="rlc-admin-btns">
                <button onClick={openSectionEditor} className="rlc-admin-edit-btn" title="Edit Section">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  Edit Section
                </button>
                <button onClick={() => openCardEditor()} className="rlc-admin-add-btn" title="Add Card">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add Course Card
                </button>
              </div>
            )}
          </div>
          <div className="rlc-right">
            <div className="rlc-tags">
              {tags.map((tag) => (
                <button key={tag} className={`rlc-tag ${activeTag === tag ? "rlc-tag-active" : ""}`} onClick={() => setActiveTag(tag)}>{tag}</button>
              ))}
            </div>
            <div className="rlc-scroll-controls">
              <button className="rlc-scroll-btn" onClick={() => scroll("left")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <button className="rlc-scroll-btn" onClick={() => scroll("right")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>
            <div className="rlc-cards" ref={scrollRef}>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div className="rlc-card rlc-skeleton" key={i}>
                      <div className="rlc-skeleton-img" /><div className="rlc-skeleton-line short" />
                      <div className="rlc-skeleton-line" /><div className="rlc-skeleton-line short" />
                    </div>
                  ))
                : filtered.map((card) => (
                    <div key={card.id} className="rlc-card" style={{ position: "relative" }}>
                      {isAdmin && (
                        <div className="rlc-card-admin-overlay">
                          <button onClick={() => openCardEditor(card)} className="rlc-card-admin-btn" title="Edit">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                          </button>
                          <button onClick={() => handleDeleteCard(card.id)} className="rlc-card-admin-btn rlc-card-admin-delete" title="Delete">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      )}
                      <CourseCardContent card={card} />
                    </div>
                  ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section Edit Modal */}
      {isEditingSection && (
        <div className="rlc-modal-backdrop" onClick={() => setIsEditingSection(false)}>
          <div className="rlc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rlc-modal-header">
              <h3>Edit Section Settings</h3>
              <button className="rlc-modal-close" onClick={() => setIsEditingSection(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="rlc-modal-body">
              <div className="rlc-form-group"><label>Section Title</label>
                <input type="text" value={editSection.title || ""} onChange={(e) => setEditSection((s) => ({ ...s, title: e.target.value }))} className="rlc-form-input" />
              </div>
              <div className="rlc-form-group"><label>Subtitle</label>
                <input type="text" value={editSection.subtitle || ""} onChange={(e) => setEditSection((s) => ({ ...s, subtitle: e.target.value }))} className="rlc-form-input" />
              </div>
              <div className="rlc-form-row">
                <div className="rlc-form-group"><label>CTA Text</label>
                  <input type="text" value={editSection.cta_text || ""} onChange={(e) => setEditSection((s) => ({ ...s, cta_text: e.target.value }))} className="rlc-form-input" />
                </div>
                <div className="rlc-form-group"><label>CTA Link</label>
                  <input type="text" value={editSection.cta_link || ""} onChange={(e) => setEditSection((s) => ({ ...s, cta_link: e.target.value }))} className="rlc-form-input" />
                </div>
              </div>
              <div className="rlc-form-group">
                <label>Background Pattern Image</label>
                <div className="rlc-bg-upload-row">
                  <button className="rlc-upload-btn" onClick={() => fileInputRef.current?.click()} disabled={uploadingBg}>
                    {uploadingBg ? "Uploading..." : "Upload Background Image"}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleBgUpload} />
                  {editSection.background_image_url && (
                    <button className="rlc-remove-bg-btn" onClick={() => setEditSection((s) => ({ ...s, background_image_url: "" }))}>Remove Background</button>
                  )}
                </div>
                {editSection.background_image_url && (
                  <div className="rlc-bg-preview">
                    <img src={editSection.background_image_url.startsWith("http") ? editSection.background_image_url : BASE_URL + editSection.background_image_url} alt="Background" />
                  </div>
                )}
              </div>
            </div>
            <div className="rlc-modal-footer">
              <button className="rlc-btn-secondary" onClick={() => setIsEditingSection(false)}>Cancel</button>
              <button className="rlc-btn-primary" onClick={handleSaveSection} disabled={isSavingSection}>{isSavingSection ? "Saving..." : "Save Changes"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Card Edit Modal */}
      {isEditingCard && (
        <div className="rlc-modal-backdrop" onClick={() => setIsEditingCard(false)}>
          <div className="rlc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rlc-modal-header">
              <h3>{editCard.id ? "Edit Course Card" : "Add New Course Card"}</h3>
              <button className="rlc-modal-close" onClick={() => setIsEditingCard(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="rlc-modal-body">
              <div className="rlc-form-row">
                <div className="rlc-form-group"><label>Course Title *</label>
                  <input type="text" value={editCard.title || ""} onChange={(e) => setEditCard((c) => ({ ...c, title: e.target.value }))} className="rlc-form-input" />
                </div>
                <div className="rlc-form-group"><label>Slug (URL path)</label>
                  <input type="text" value={editCard.slug || ""} onChange={(e) => setEditCard((c) => ({ ...c, slug: e.target.value }))} className="rlc-form-input" placeholder="e.g. google-data-analytics" />
                </div>
              </div>
              <div className="rlc-form-group"><label>Description</label>
                <input type="text" value={editCard.description || ""} onChange={(e) => setEditCard((c) => ({ ...c, description: e.target.value }))} className="rlc-form-input" />
              </div>
              <div className="rlc-form-row">
                <div className="rlc-form-group"><label>Instructor / Provider</label>
                  <input type="text" value={editCard.instructor_name || ""} onChange={(e) => setEditCard((c) => ({ ...c, instructor_name: e.target.value }))} className="rlc-form-input" />
                </div>
                <div className="rlc-form-group"><label>Skill Level / Tag</label>
                  <input type="text" value={editCard.skill_level || ""} onChange={(e) => setEditCard((c) => ({ ...c, skill_level: e.target.value }))} className="rlc-form-input" placeholder="e.g. Data, Business" />
                </div>
              </div>
              <div className="rlc-form-row">
                <div className="rlc-form-group"><label>Price</label>
                  <input type="number" value={editCard.price ?? ""} onChange={(e) => setEditCard((c) => ({ ...c, price: e.target.value ? Number(e.target.value) : undefined }))} className="rlc-form-input" />
                </div>
                <div className="rlc-form-group"><label>Discount Price</label>
                  <input type="number" value={editCard.discount_price ?? ""} onChange={(e) => setEditCard((c) => ({ ...c, discount_price: e.target.value ? Number(e.target.value) : undefined }))} className="rlc-form-input" />
                </div>
                <div className="rlc-form-group"><label>Currency</label>
                  <select value={editCard.currency || "INR"} onChange={(e) => setEditCard((c) => ({ ...c, currency: e.target.value }))} className="rlc-form-select">
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>
              <div className="rlc-form-row">
                <div className="rlc-form-group" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" checked={!!editCard.is_free} onChange={(e) => setEditCard((c) => ({ ...c, is_free: e.target.checked }))} id="card-is-free" />
                  <label htmlFor="card-is-free" style={{ margin: 0 }}>Free Course</label>
                </div>
                <div className="rlc-form-group" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" checked={!!editCard.has_certificate} onChange={(e) => setEditCard((c) => ({ ...c, has_certificate: e.target.checked }))} id="card-has-cert" />
                  <label htmlFor="card-has-cert" style={{ margin: 0 }}>Has Certificate</label>
                </div>
                <div className="rlc-form-group">
                  <label>Rating (0–5)</label>
                  <input type="number" min="0" max="5" step="0.1" value={editCard.rating ?? ""} onChange={(e) => setEditCard((c) => ({ ...c, rating: e.target.value ? Number(e.target.value) : undefined }))} className="rlc-form-input" placeholder="e.g. 4.5" />
                </div>
              </div>
              <div className="rlc-form-group">
                <label>Thumbnail Image</label>
                <div className="rlc-bg-upload-row">
                  <button className="rlc-upload-btn" onClick={() => thumbInputRef.current?.click()} disabled={uploadingThumb}>
                    {uploadingThumb ? "Uploading..." : "Upload Thumbnail"}
                  </button>
                  <input ref={thumbInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleThumbUpload} />
                  {editCard.thumbnail_url && (
                    <button className="rlc-remove-bg-btn" onClick={() => setEditCard((c) => ({ ...c, thumbnail_url: "" }))}>Remove Image</button>
                  )}
                </div>
                {editCard.thumbnail_url && (
                  <div className="rlc-bg-preview">
                    <img src={editCard.thumbnail_url.startsWith("http") ? editCard.thumbnail_url : BASE_URL + editCard.thumbnail_url} alt="Thumbnail" />
                  </div>
                )}
              </div>
            </div>
            <div className="rlc-modal-footer">
              <button className="rlc-btn-secondary" onClick={() => setIsEditingCard(false)}>Cancel</button>
              <button className="rlc-btn-primary" onClick={handleSaveCard} disabled={isSavingCard}>{isSavingCard ? "Saving..." : (editCard.id ? "Update Card" : "Create Card")}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CourseCardContent({ card }: { card: CourseCardData }) {
  const sym = card.currency === "USD" ? "$" : "₹";
  const base = card.currency === "USD" ? (card.price_usd ?? card.price) : card.price;
  const disc = card.currency === "USD" ? (card.discount_price_usd ?? card.discount_price) : card.discount_price;
  const hasDisc = disc != null && disc < (base ?? 0);
  const displayPrice = hasDisc ? disc : base;
  const cardRating = card.rating ?? (3.8 + (card.id % 12) / 10);
  const instName = card.instructor_name || "IINM";
  const bUrl = typeof window !== "undefined" ? process.env.NEXT_PUBLIC_BASE_URL || `http://${window.location.hostname}:2007` : "";
  const imgUrl = card.thumbnail_url ? (card.thumbnail_url.startsWith("http") ? card.thumbnail_url : `${bUrl}${card.thumbnail_url}`) : null;

  return (
    <>
      <Link href={`/courses/${card.slug}`} className="rlc-card-link">
        <div className="rlc-card-img-wrap">
          {imgUrl ? (
            <img src={imgUrl} alt={card.title} className="rlc-card-img" />
          ) : (
            <div className="rlc-card-img-fallback"><span style={{ fontSize: 32 }}>📚</span></div>
          )}
        </div>
        <div className="rlc-card-body">
          <div className="rlc-provider"><span className="rlc-provider-dot" /><span className="rlc-provider-name">{instName}</span></div>
          <h3 className="rlc-card-title">{card.title}</h3>
          <p className="rlc-cert">{card.has_certificate ? "Professional Certificate" : "Course"}</p>
          <div className="rlc-rating-row"><StarRating rating={cardRating} /></div>
          <div className="rlc-price-row">
            {card.is_free ? <span className="rlc-price">Free</span>
              : displayPrice != null ? <span className="rlc-price">{sym}{Number(displayPrice).toLocaleString()}</span>
              : <span className="rlc-price">Contact us</span>}
            {hasDisc && base != null && <span className="rlc-price-old">{sym}{Number(base).toLocaleString()}</span>}
          </div>
        </div>
      </Link>
      <div className="rlc-card-footer">
        <Link href={`/courses/${card.slug}`} className="rlc-join-btn">Join Next Batch</Link>
      </div>
    </>
  );
}
