"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BASE_URL } from "@/lib/config";
import "./course-details.css";
import "../../home.css";
import PublicNavbar from "../../../components/PublicNavbar";
import PublicFooter from "../../../components/PublicFooter";

const Icons = {
  Video: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>,
  FileText: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>,
  ImageIcon: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>,
  CheckCircle: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  Clock: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Award: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>,
  Globe: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>,
  PlayCircle: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>,
  PlaySolid: () => <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M8 5v14l11-7z"/></svg>,
  Lock: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  ChevronDown: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>,
  ChevronUp: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>,
  Users: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Star: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
};

interface Material { id: number; title: string; file_type: string; }
interface SubjectRef { id: number; name: string; }
interface Chapter { id: number; title: string; subject?: SubjectRef | null; materials: Material[]; }
interface Instructor {
  id: number; name: string; bio?: string | null; email?: string | null; avatar_url?: string | null;
  qualification?: string | null; experience_years?: string | null; designation?: string | null;
  specialization?: string | null; social_linkedin?: string | null; social_twitter?: string | null;
  social_website?: string | null; intro_video_url?: string | null; achievements?: string | null;
}
interface CourseDetails {
  id: number; title: string; description: string | null; thumbnail_url: string | null;
  promo_video_url: string | null; price: number | null; discount_price: number | null;
  price_usd: number | null; discount_price_usd: number | null; is_free: boolean; currency: string;
  skill_level: string | null; instructor_name: string | null; show_instructor_publicly: boolean;
  has_certificate: boolean; validity_days: number | null; prerequisites: string | null;
  what_you_will_learn: string | null; target_audience: string | null; chapters: Chapter[]; instructors: Instructor[];
}

// ── Star Rating Display ──────────────────────────────────────────
function StarRating({ rating = 4.5, count = 128 }: { rating?: number; count?: number }) {
  return (
    <div className="cd-star-wrap">
      <span className="cd-star-score">{rating.toFixed(1)}</span>
      <div className="cd-stars">
        {[1, 2, 3, 4, 5].map(i => (
          <span key={i} style={{ color: i <= Math.round(rating) ? "#f59e0b" : "#d1d5db" }}>
            <Icons.Star />
          </span>
        ))}
      </div>
      <span className="cd-star-count">({count.toLocaleString()} ratings)</span>
    </div>
  );
}

export default function CourseDetailsPage() {
  const { slug } = useParams();
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [openChapters, setOpenChapters] = useState<Record<number, boolean>>({});
  const [openSubjects, setOpenSubjects] = useState<Record<string, boolean>>({});
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "requirements" | "instructors">("overview");
  const [stickyVisible, setStickyVisible] = useState(false);
  const enrollCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bUrl = BASE_URL;
    setBaseUrl(bUrl);
    if (!slug) return;
    fetch(`${bUrl}/api/public/courses/${slug}`)
      .then(r => { if (!r.ok) throw new Error("Course not found"); return r.json(); })
      .then(data => {
        setCourse(data);
        if (data.chapters && data.chapters.length > 0) {
          setOpenChapters({ [data.chapters[0].id]: true });
          const initialSubjects: Record<string, boolean> = {};
          data.chapters.forEach((ch: any) => { if (ch.subject?.name) initialSubjects[ch.subject.name] = true; });
          setOpenSubjects(initialSubjects);
        }
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [slug]);

  // Sticky bar on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (enrollCardRef.current) {
        const rect = enrollCardRef.current.getBoundingClientRect();
        setStickyVisible(rect.bottom < 0);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleChapter = (id: number) => setOpenChapters(p => ({ ...p, [id]: !p[id] }));
  const toggleSubject = (name: string) => setOpenSubjects(p => ({ ...p, [name]: !p[name] }));

  const showToast = (msg: string) => {
    const tId = Date.now();
    setToasts(p => [...p, { id: tId, msg }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== tId)), 3000);
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case "video": case "youtube": return <Icons.Video />;
      case "pdf": case "document": return <Icons.FileText />;
      case "image": return <Icons.ImageIcon />;
      default: return <Icons.FileText />;
    }
  };

  if (loading) {
    return (
      <div className="cd-root">
        <PublicNavbar />
        <div className="cd-hero cd-hero-skeleton"><div className="cd-hero-inner"><div className="cd-skeleton" style={{ height: 48, width: "60%", marginBottom: 16 }} /><div className="cd-skeleton" style={{ height: 24, width: "40%" }} /></div></div>
        <div className="cd-main">
          <div className="cd-left-col">
            <div className="cd-skeleton" style={{ height: 400, borderRadius: 8, marginBottom: 24 }} />
            <div className="cd-skeleton" style={{ height: 48, borderRadius: 8, marginBottom: 24 }} />
            <div className="cd-skeleton cd-skeleton-text" style={{ width: "90%" }} /><div className="cd-skeleton cd-skeleton-text" style={{ width: "80%" }} />
          </div>
          <div className="cd-right-col">
            <div className="cd-skeleton" style={{ height: 300, borderRadius: 8, marginBottom: 24 }} />
            <div className="cd-skeleton" style={{ height: 600, borderRadius: 8 }} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="cd-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ color: "#0f172a", marginBottom: 12 }}>Course Not Found</h2>
          <Link href="/courses" style={{ color: "var(--primary-color)", textDecoration: "none", fontWeight: 600 }}>← Back to Courses</Link>
        </div>
      </div>
    );
  }

  const isUsd = course.currency === "USD";
  const currencySymbol = isUsd ? "$" : "₹";
  const basePrice = isUsd ? (course.price_usd ?? course.price) : course.price;
  const discPrice = isUsd ? (course.discount_price_usd ?? course.discount_price) : course.discount_price;
  const hasDiscount = discPrice != null && discPrice < (basePrice ?? 0);
  const displayPrice = hasDiscount ? discPrice : basePrice;
  const totalMaterials = course.chapters.reduce((acc, ch) => acc + ch.materials.length, 0);

  // Fake enrolled count for social proof (based on course ID for consistency)
  const enrolledCount = 120 + (course.id * 37) % 880;

  const chaptersBySubject: Record<string, Chapter[]> = {};
  const noSubjectChapters: Chapter[] = [];
  course.chapters.forEach(ch => {
    if (ch.subject?.name) {
      if (!chaptersBySubject[ch.subject.name]) chaptersBySubject[ch.subject.name] = [];
      chaptersBySubject[ch.subject.name].push(ch);
    } else { noSubjectChapters.push(ch); }
  });

  return (
    <div className="cd-root">
      <PublicNavbar />

      {/* ── DARK HERO BANNER ── */}
      <div className="cd-hero">
        {course.thumbnail_url && (
          <div className="cd-hero-bg" style={{ backgroundImage: `url(${course.thumbnail_url.startsWith("http") ? course.thumbnail_url : `${baseUrl}${course.thumbnail_url}`})` }} />
        )}
        <div className="cd-hero-overlay" />
        <div className="cd-hero-inner">
          <div className="cd-breadcrumbs cd-breadcrumbs-dark">
            <Link href="/">Home</Link><span>›</span>
            <Link href="/courses">Courses</Link><span>›</span>
            <span>{course.title}</span>
          </div>
          <h1 className="cd-hero-title">{course.title}</h1>
          {course.description && (
            <p className="cd-hero-desc">{course.description.replace(/<[^>]+>/g, "").slice(0, 160)}...</p>
          )}

          {/* Social Proof Row */}
          <div className="cd-hero-proof">
            <StarRating rating={4.5} count={enrolledCount} />
            <div className="cd-enrolled-badge">
              <Icons.Users />
              <span><strong>{enrolledCount.toLocaleString()}+</strong> students enrolled</span>
            </div>
            {course.skill_level && <span className="cd-level-badge">{course.skill_level}</span>}
            {course.has_certificate && <span className="cd-cert-badge">🏆 Certificate</span>}
          </div>

          {course.instructor_name && (
            <div className="cd-hero-instructor">
              Created by <strong>{course.instructor_name}</strong>
            </div>
          )}
        </div>
      </div>

      {/* ── STICKY ENROLL BAR ── */}
      {stickyVisible && (
        <div className="cd-sticky-bar">
          <div className="cd-sticky-inner">
            <div className="cd-sticky-title">{course.title}</div>
            <div className="cd-sticky-right">
              <StarRating rating={4.5} count={enrolledCount} />
              <div className="cd-sticky-price">
                {course.is_free ? "Free" : displayPrice != null ? `${currencySymbol}${Number(displayPrice).toLocaleString()}` : "Contact Us"}
              </div>
              <Link href="/login" className="cd-sticky-enroll-btn">Enroll Now</Link>
            </div>
          </div>
        </div>
      )}

      <div className="cd-main">
        {/* ── LEFT COLUMN ── */}
        <div className="cd-left-col">
          {/* Video Player */}
          <div className="cd-video-wrapper" onClick={() => showToast("Please enroll to watch videos.")}>
            {course.thumbnail_url ? (
              <img src={course.thumbnail_url.startsWith("http") ? course.thumbnail_url : `${baseUrl}${course.thumbnail_url}`} alt={course.title} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#cbd5e1" }}>
                <Icons.ImageIcon />
              </div>
            )}
            <div className="cd-video-overlay">
              <div className="cd-video-label">▶ Preview this course</div>
              <div className="cd-play-btn"><Icons.PlaySolid /></div>
            </div>
          </div>

          {/* Tabs */}
          <div className="cd-tabs">
            <button className={`cd-tab ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>Overview</button>
            <button className={`cd-tab ${activeTab === "requirements" ? "active" : ""}`} onClick={() => setActiveTab("requirements")}>Requirements</button>
            {course.show_instructor_publicly && course.instructors?.length > 0 && (
              <button className={`cd-tab ${activeTab === "instructors" ? "active" : ""}`} onClick={() => setActiveTab("instructors")}>Instructors</button>
            )}
          </div>

          {/* Tab Content */}
          <div className="cd-tab-content">
            {activeTab === "overview" && (
              <div>
                {course.description && (
                  <div style={{ marginBottom: 32 }}>
                    <h2 className="cd-section-title">About this course</h2>
                    <div className="cd-desc" dangerouslySetInnerHTML={{ __html: course.description }} />
                  </div>
                )}
                {course.what_you_will_learn?.trim() && (
                  <div className="cd-section-box">
                    <h2 className="cd-section-title">What you'll learn</h2>
                    <div className="cd-learn-grid">
                      {course.what_you_will_learn.split("\n").filter(l => l.trim()).map((point, idx) => (
                        <div key={idx} className="cd-learn-item"><Icons.CheckCircle /><span>{point.trim()}</span></div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "requirements" && (
              <div>
                {course.prerequisites && (<div style={{ marginBottom: 32 }}><h2 className="cd-section-title">Requirements</h2><ul className="cd-list">{course.prerequisites.split("\n").filter(x => x.trim()).map((p, i) => <li key={i}>{p}</li>)}</ul></div>)}
                {course.target_audience && (<div><h2 className="cd-section-title">Who this course is for</h2><ul className="cd-list">{course.target_audience.split("\n").filter(x => x.trim()).map((p, i) => <li key={i}>{p}</li>)}</ul></div>)}
                {!course.prerequisites && !course.target_audience && <p style={{ color: "#64748b" }}>No specific requirements listed.</p>}
              </div>
            )}

            {activeTab === "instructors" && (
              <div>
                <h2 className="cd-section-title">Meet Your Instructors</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {course.instructors.map(inst => (
                    <div key={inst.id} className="cd-instructor-card">
                      {inst.avatar_url
                        ? <img src={inst.avatar_url.startsWith("http") ? inst.avatar_url : `${baseUrl}${inst.avatar_url}`} alt={inst.name} className="cd-inst-img" />
                        : <div className="cd-inst-img-placeholder">{inst.name.charAt(0).toUpperCase()}</div>}
                      <div style={{ flex: 1 }}>
                        <h4 className="cd-inst-name">{inst.name}</h4>
                        {inst.designation && <p className="cd-inst-role">{inst.designation}</p>}
                        <div className="cd-inst-badges">
                          {inst.qualification && <span>🎓 {inst.qualification}</span>}
                          {inst.experience_years && <span>⭐ {inst.experience_years}</span>}
                          {inst.specialization && <span>🎯 {inst.specialization}</span>}
                        </div>
                        {inst.bio && <p className="cd-inst-bio">{inst.bio}</p>}
                        <div className="cd-inst-links">
                          {inst.intro_video_url && <a href={inst.intro_video_url} target="_blank" rel="noopener noreferrer" className="btn-yt">▶ Watch Intro</a>}
                          {inst.social_linkedin && <a href={inst.social_linkedin} target="_blank" rel="noopener noreferrer" className="btn-lnk">LinkedIn</a>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="cd-right-col">
          {/* Enrollment Card */}
          <div className="cd-enroll-card" ref={enrollCardRef}>
            <div className="cd-enroll-body">
              {/* Enrolled Badge */}
              <div className="cd-social-proof-strip">
                <Icons.Users />
                <span><strong>{enrolledCount.toLocaleString()}+</strong> students already enrolled</span>
              </div>

              <div className="cd-price-wrap">
                {course.is_free ? (
                  <span className="cd-price-main">Free</span>
                ) : displayPrice != null ? (
                  <>
                    <span className="cd-price-main">{currencySymbol}{Number(displayPrice).toLocaleString()}</span>
                    {hasDiscount && <span className="cd-price-original">{currencySymbol}{Number(basePrice).toLocaleString()}</span>}
                  </>
                ) : (
                  <span className="cd-price-main">Contact Us</span>
                )}
              </div>

              <Link href="/login" className="cd-enroll-btn">Enroll Now</Link>
              <div className="cd-guarantee">✓ Full lifetime access &nbsp;·&nbsp; ✓ Secure checkout</div>

              <div className="cd-includes">
                <h3 className="cd-includes-title">This course includes:</h3>
                <ul className="cd-includes-list">
                  <li><Icons.Video /><span>{totalMaterials} learning materials</span></li>
                  <li><Icons.Clock /><span>{course.validity_days ? `${course.validity_days} days access` : "Lifetime access"}</span></li>
                  <li><Icons.Globe /><span>Access on mobile and desktop</span></li>
                  {course.has_certificate && <li><Icons.Award /><span>Certificate of completion</span></li>}
                </ul>
              </div>
            </div>
          </div>

          {/* Playlist Curriculum */}
          <div className="cd-playlist">
            <div className="cd-playlist-header">
              <h3>Course Curriculum</h3>
              <p>{course.chapters.length} Modules • {totalMaterials} Resources</p>
            </div>
            <div className="cd-playlist-body">
              {course.chapters.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}>Curriculum will be updated soon.</div>
              ) : (
                <>
                  {Object.entries(chaptersBySubject).map(([subjectName, chapters]) => {
                    const isSubjectOpen = openSubjects[subjectName];
                    return (
                      <div key={subjectName} className="cd-playlist-subject">
                        <div className="cd-subject-header" onClick={() => toggleSubject(subjectName)}>
                          <h4>{subjectName}</h4>
                          {isSubjectOpen ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
                        </div>
                        {isSubjectOpen && (
                          <div className="cd-subject-chapters">
                            {chapters.map(ch => {
                              const isOpen = openChapters[ch.id];
                              return (
                                <div key={ch.id} className="cd-playlist-chapter">
                                  <div className="cd-p-chap-header" onClick={() => toggleChapter(ch.id)}>
                                    <div>{isOpen ? <Icons.ChevronUp /> : <Icons.ChevronDown />}<span>{ch.title}</span></div>
                                    <span className="count">{ch.materials.length} items</span>
                                  </div>
                                  {isOpen && (
                                    <div className="cd-p-materials">
                                      {ch.materials.length === 0 ? <div className="empty">No materials</div> : ch.materials.map(mat => (
                                        <div key={mat.id} className="cd-p-mat-item" onClick={() => showToast("Please enroll to access.")}>
                                          <div className="icon">{getIconForType(mat.file_type)}</div>
                                          <div className="title">{mat.title}</div>
                                          <div className="lock"><Icons.Lock /></div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {noSubjectChapters.length > 0 && (
                    <div className="cd-playlist-subject">
                      <div className="cd-subject-header"><h4>Other Topics</h4></div>
                      <div className="cd-subject-chapters" style={{ paddingTop: 0 }}>
                        {noSubjectChapters.map(ch => {
                          const isOpen = openChapters[ch.id];
                          return (
                            <div key={ch.id} className="cd-playlist-chapter">
                              <div className="cd-p-chap-header" onClick={() => toggleChapter(ch.id)}>
                                <div>{isOpen ? <Icons.ChevronUp /> : <Icons.ChevronDown />}<span>{ch.title}</span></div>
                                <span className="count">{ch.materials.length} items</span>
                              </div>
                              {isOpen && (
                                <div className="cd-p-materials">
                                  {ch.materials.length === 0 ? <div className="empty">No materials</div> : ch.materials.map(mat => (
                                    <div key={mat.id} className="cd-p-mat-item" onClick={() => showToast("Please enroll to access.")}>
                                      <div className="icon">{getIconForType(mat.file_type)}</div>
                                      <div className="title">{mat.title}</div>
                                      <div className="lock"><Icons.Lock /></div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <PublicFooter />

      <div className="cd-toast-container">
        {toasts.map(t => <div key={t.id} className="cd-toast">{t.msg}</div>)}
      </div>
    </div>
  );
}
