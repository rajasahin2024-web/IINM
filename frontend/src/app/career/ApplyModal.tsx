"use client";

import React, { useState, useRef, useEffect } from "react";
import { BASE_URL as API } from "@/lib/config";

interface JobPost {
  id: number;
  title: string;
  slug: string;
  location: string | null;
  job_type: string;
  position_title: string | null;
}

interface ApplyModalProps {
  open: boolean;
  onClose: () => void;
  selectedJob: JobPost | null;
  allJobs: JobPost[];
}

export default function ApplyModal({ open, onClose, selectedJob, allJobs }: ApplyModalProps) {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    job_post_id: "",
    cover_note: "",
    linkedin_url: "",
    github_url: "",
    portfolio_url: "",
    twitter_url: "",
    expected_salary: "",
    years_experience: "",
    notice_period_days: "",
  });

  const [cvFile, setCvFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (selectedJob) {
        setForm(p => ({ ...p, job_post_id: String(selectedJob.id) }));
      } else {
        setForm(p => ({ ...p, job_post_id: "" }));
      }
      setSubmitted(false);
      setError("");
    }
  }, [open, selectedJob]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open && !submitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, submitting, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleFile = (file: File | null) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("CV must be a PDF document.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("CV file is too large. Maximum size is 50 MB.");
      return;
    }
    setError("");
    setCvFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0] || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.full_name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!form.email.trim() || !form.email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append(
        "data",
        JSON.stringify({
          full_name: form.full_name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || null,
          job_post_id: form.job_post_id ? Number(form.job_post_id) : null,
          cover_note: form.cover_note.trim() || null,
          linkedin_url: form.linkedin_url.trim() || null,
          github_url: form.github_url.trim() || null,
          portfolio_url: form.portfolio_url.trim() || null,
          twitter_url: form.twitter_url.trim() || null,
          expected_salary: form.expected_salary ? Number(form.expected_salary) : null,
          years_experience: form.years_experience ? Number(form.years_experience) : null,
          notice_period_days: form.notice_period_days ? Number(form.notice_period_days) : null,
        })
      );

      if (cvFile) {
        fd.append("cv", cvFile);
      }

      const res = await fetch(`${API}/api/career/apply`, {
        method: "POST",
        body: fd,
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.detail || "Submission failed. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const currentJobTitle = selectedJob
    ? selectedJob.title
    : form.job_post_id
    ? allJobs.find(j => String(j.id) === form.job_post_id)?.title
    : null;

  return (
    <div className="cr-modal-overlay" onClick={onClose}>
      <div className="cr-modal-dialog" onClick={e => e.stopPropagation()}>
        {/* Close Button */}
        <button className="cr-modal-close" onClick={onClose} aria-label="Close modal">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {submitted ? (
          <div className="cr-modal-success">
            <div className="cr-success-badge">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="cr-success-title">Application Submitted!</h3>
            <p className="cr-success-desc">
              Thank you for applying {currentJobTitle ? `for ${currentJobTitle}` : "to IINM"}. Our recruitment team will review your profile and reach out via email/phone if your background aligns with our requirements.
            </p>
            <button className="cr-btn-primary" onClick={onClose} style={{ marginTop: 24, padding: "12px 36px" }}>
              Done
            </button>
          </div>
        ) : (
          <div className="cr-modal-content">
            {/* Header */}
            <div className="cr-modal-header">
              <div className="cr-modal-tag">Job Application</div>
              <h2 className="cr-modal-title">
                {currentJobTitle ? (
                  <>Applying for <span className="cr-highlight">{currentJobTitle}</span></>
                ) : (
                  <>Submit <span className="cr-highlight">Open Application</span></>
                )}
              </h2>
              <p className="cr-modal-subtitle">
                Fill in your candidate details, attach your resume (PDF), and share any social or portfolio links.
              </p>
            </div>

            {error && <div className="cr-modal-error">{error}</div>}

            <form onSubmit={handleSubmit} className="cr-modal-form">
              {/* Role Selection */}
              <div className="cr-form-group">
                <label className="cr-form-label">Position / Role</label>
                <select className="cr-form-select" value={form.job_post_id} onChange={set("job_post_id")}>
                  <option value="">General Open Application (No specific role)</option>
                  {allJobs.map(j => (
                    <option key={j.id} value={String(j.id)}>
                      {j.title} {j.location ? `(${j.location})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Name & Email */}
              <div className="cr-form-grid-2">
                <div className="cr-form-group">
                  <label className="cr-form-label">
                    Full Name <span className="cr-req">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="cr-form-input"
                    placeholder="e.g. Rahul Sharma"
                    value={form.full_name}
                    onChange={set("full_name")}
                  />
                </div>

                <div className="cr-form-group">
                  <label className="cr-form-label">
                    Email Address <span className="cr-req">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    className="cr-form-input"
                    placeholder="rahul@example.com"
                    value={form.email}
                    onChange={set("email")}
                  />
                </div>
              </div>

              {/* Phone & Experience */}
              <div className="cr-form-grid-2">
                <div className="cr-form-group">
                  <label className="cr-form-label">Phone Number</label>
                  <input
                    type="tel"
                    className="cr-form-input"
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={set("phone")}
                  />
                </div>

                <div className="cr-form-group">
                  <label className="cr-form-label">Total Experience (Years)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    className="cr-form-input"
                    placeholder="e.g. 4"
                    value={form.years_experience}
                    onChange={set("years_experience")}
                  />
                </div>
              </div>

              {/* CV Dropzone */}
              <div className="cr-form-group">
                <label className="cr-form-label">
                  Resume / CV (PDF Format)
                </label>
                <div
                  className={`cr-cv-dropzone ${dragOver ? "is-dragover" : ""} ${cvFile ? "has-file" : ""}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                >
                  {cvFile ? (
                    <div className="cr-cv-file-card">
                      <div className="cr-cv-icon-box">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                      </div>
                      <div className="cr-cv-info">
                        <span className="cr-cv-name">{cvFile.name}</span>
                        <span className="cr-cv-size">{(cvFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                      </div>
                      <button
                        type="button"
                        className="cr-cv-remove-btn"
                        onClick={e => {
                          e.stopPropagation();
                          setCvFile(null);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="cr-cv-placeholder">
                      <div className="cr-cv-upload-icon">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                      </div>
                      <span className="cr-cv-prompt">
                        <strong>Click to upload</strong> or drag and drop your resume
                      </span>
                      <span className="cr-cv-subtext">PDF only (Max 50MB)</span>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    style={{ display: "none" }}
                    onChange={e => handleFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>

              {/* Social Profiles */}
              <div className="cr-form-grid-2">
                <div className="cr-form-group">
                  <label className="cr-form-label">LinkedIn Profile URL</label>
                  <input
                    type="url"
                    className="cr-form-input"
                    placeholder="https://linkedin.com/in/username"
                    value={form.linkedin_url}
                    onChange={set("linkedin_url")}
                  />
                </div>

                <div className="cr-form-group">
                  <label className="cr-form-label">GitHub / Portfolio URL</label>
                  <input
                    type="url"
                    className="cr-form-input"
                    placeholder="https://github.com/username or portfolio"
                    value={form.github_url || form.portfolio_url}
                    onChange={e => {
                      setForm(p => ({
                        ...p,
                        github_url: e.target.value,
                        portfolio_url: e.target.value,
                      }));
                    }}
                  />
                </div>
              </div>

              {/* Salary & Notice Period */}
              <div className="cr-form-grid-2">
                <div className="cr-form-group">
                  <label className="cr-form-label">Expected Annual CTC (₹)</label>
                  <input
                    type="number"
                    min="0"
                    className="cr-form-input"
                    placeholder="e.g. 1200000"
                    value={form.expected_salary}
                    onChange={set("expected_salary")}
                  />
                </div>

                <div className="cr-form-group">
                  <label className="cr-form-label">Notice Period (Days)</label>
                  <input
                    type="number"
                    min="0"
                    className="cr-form-input"
                    placeholder="e.g. 30"
                    value={form.notice_period_days}
                    onChange={set("notice_period_days")}
                  />
                </div>
              </div>

              {/* Cover Note */}
              <div className="cr-form-group">
                <label className="cr-form-label">Why are you excited to join IINM?</label>
                <textarea
                  className="cr-form-textarea"
                  rows={3}
                  placeholder="Tell us briefly about your background and what excites you about this role..."
                  value={form.cover_note}
                  onChange={set("cover_note")}
                />
              </div>

              {/* Actions */}
              <div className="cr-modal-actions">
                <button
                  type="button"
                  className="cr-btn-ghost"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cr-btn-primary"
                  disabled={submitting}
                >
                  {submitting ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="cr-spinner" /> Submitting...
                    </span>
                  ) : (
                    "Submit Application"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
