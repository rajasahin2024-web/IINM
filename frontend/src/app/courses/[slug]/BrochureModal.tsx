"use client";

import React, { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL } from "@/lib/config";

/* ─────────────────────────────────────────
   BrochureModal
   Two-column lead capture modal:
   - Left: brand card + auto-rotating learner reviews
   - Right: Name / Email / Phone (+91) / Type / Send OTP
───────────────────────────────────────── */

interface Review {
  id: number;
  student_name: string;
  role_title: string | null;
  company_name: string | null;
  feedback_text: string;
  avatar_url: string | null;
  star_rating: number;
}

interface BrochureModalProps {
  open: boolean;
  onClose: () => void;
  courseTitle: string;
  onSubmit: (payload: { name: string; email: string; phone: string; leadType: string }) => void;
  submitting: boolean;
}

const LEAD_TYPES = ["Student", "Business Owner", "Working Professional", "Others"];

function resolveImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${BASE_URL}${url}`;
  return url;
}

function StarRow({ count }: { count: number }) {
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill={i < count ? "#f59e0b" : "rgba(255,255,255,0.25)"}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

function IndiaFlag() {
  return (
    <svg width="20" height="14" viewBox="0 0 40 28" style={{ borderRadius: 2, boxShadow: "0 0 0 1px rgba(0,0,0,0.08)", flexShrink: 0 }}>
      <rect width="40" height="9.33" fill="#FF9932" />
      <rect y="9.33" width="40" height="9.33" fill="#FFFFFF" />
      <rect y="18.67" width="40" height="9.33" fill="#138808" />
      <circle cx="20" cy="14" r="4.5" fill="#000080" />
    </svg>
  );
}

export default function BrochureModal({ open, onClose, courseTitle, onSubmit, submitting }: BrochureModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [leadType, setLeadType] = useState("");

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [currentReview, setCurrentReview] = useState(0);

  const fetchReviews = useCallback(async () => {
    setReviewLoading(true);
    try {
      const res = await apiFetch("/api/settings/learner-reviews");
      if (res.ok) {
        const json = await res.json();
        const items = (json.reviews || []).filter((r: Review) => r.feedback_text);
        setReviews(items);
      }
    } catch { /* ignore */ }
    setReviewLoading(false);
  }, []);

  useEffect(() => {
    if (open) {
      fetchReviews();
      // reset form when modal opens
      setName("");
      setEmail("");
      setPhone("");
      setLeadType("");
    }
  }, [open, fetchReviews]);

  // Auto-rotate reviews every 4 seconds
  useEffect(() => {
    if (!open || reviews.length <= 1) return;
    const id = setInterval(() => {
      setCurrentReview(prev => (prev + 1) % reviews.length);
    }, 4000);
    return () => clearInterval(id);
  }, [open, reviews.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !leadType) return;
    onSubmit({ name, email, phone, leadType });
  };

  if (!open) return null;

  const review = reviews[currentReview];

  return (
    <div className="cd-brochure-backdrop" onClick={onClose}>
      <div className="cd-brochure-modal" onClick={e => e.stopPropagation()}>

        {/* ── Left: Brand + Reviews ── */}
        <div className="cd-brochure-left">
          <div className="cd-brochure-left-top">
            <div className="cd-brochure-logo">IINM</div>
            <h2 className="cd-brochure-headline">
              Start your <em>journey</em> with us.
            </h2>
            <p className="cd-brochure-subline">
              Upskill in Industry Relevant Skillset to switch to Top 1% roles in Tech and Data Industry.
            </p>
          </div>

          <div className="cd-brochure-review-wrap">
            {reviewLoading || !review ? (
              <div className="cd-brochure-review-skeleton">
                <div style={{ height: 12, width: "60%", background: "rgba(255,255,255,0.1)", borderRadius: 4, marginBottom: 14 }} />
                <div style={{ height: 10, width: "100%", background: "rgba(255,255,255,0.08)", borderRadius: 4, marginBottom: 8 }} />
                <div style={{ height: 10, width: "90%", background: "rgba(255,255,255,0.08)", borderRadius: 4, marginBottom: 8 }} />
                <div style={{ height: 10, width: "80%", background: "rgba(255,255,255,0.08)", borderRadius: 4 }} />
              </div>
            ) : (
              <div className="cd-brochure-review-card">
                <p className="cd-brochure-review-text">"{review.feedback_text}"</p>
                <div className="cd-brochure-review-footer">
                  <div className="cd-brochure-review-avatar">
                    {review.avatar_url ? (
                      <img src={resolveImageUrl(review.avatar_url)} alt={review.student_name} />
                    ) : (
                      <span>{review.student_name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="cd-brochure-review-meta">
                    <div className="cd-brochure-review-name">{review.student_name}</div>
                    <div className="cd-brochure-review-role">{review.role_title || "Learner"}{review.company_name ? ` · ${review.company_name}` : ""}</div>
                    <StarRow count={review.star_rating} />
                  </div>
                </div>
              </div>
            )}

            {/* Pagination dots */}
            {reviews.length > 1 && (
              <div className="cd-brochure-review-dots">
                {reviews.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentReview(i)}
                    className={i === currentReview ? "active" : ""}
                    aria-label={`Review ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Decorative gradient orb */}
          <div className="cd-brochure-orb" />
        </div>

        {/* ── Right: Form ── */}
        <div className="cd-brochure-right">
          <button className="cd-brochure-close" onClick={onClose} aria-label="Close">×</button>

          <h3 className="cd-brochure-form-title">Download Brochure</h3>
          <p className="cd-brochure-form-subtitle">We keep things simple, just fill some basic details</p>

          <form onSubmit={handleSubmit} className="cd-brochure-form">
            <div className="cd-brochure-field">
              <label>Name<span>*</span></label>
              <input
                type="text"
                placeholder="Enter Your Full Name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            <div className="cd-brochure-field">
              <label>Email</label>
              <input
                type="email"
                placeholder="Enter Your Email Address"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="cd-brochure-field">
              <label>Phone Number<span>*</span></label>
              <div className="cd-brochure-phone-row">
                <div className="cd-brochure-country">
                  <IndiaFlag />
                  <span>+91</span>
                </div>
                <input
                  type="tel"
                  placeholder="Enter Your Phone Number"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                  required
                  maxLength={10}
                />
              </div>
            </div>

            <div className="cd-brochure-field">
              <label>You are a<span>*</span></label>
              <div className="cd-brochure-type-chips">
                {LEAD_TYPES.map(opt => (
                  <label
                    key={opt}
                    className={leadType === opt ? "active" : ""}
                  >
                    <input
                      type="radio"
                      name="leadType"
                      value={opt}
                      checked={leadType === opt}
                      onChange={() => setLeadType(opt)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="cd-brochure-submit"
              disabled={submitting || !name || !phone || !leadType}
            >
              {submitting ? "Submitting..." : "Send OTP"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
