"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getSiteSettings, type SiteSettings } from "@/lib/siteSettingsCache";
import { resolveAssetUrl } from "@/lib/config";
import { forgotPassword, StudentApiError } from "@/lib/studentApi";
import "../student-auth.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    getSiteSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
    document.title = "Forgot Password | Student Portal";
  }, []);

  const logo = settings?.logo_url ? resolveAssetUrl(settings.logo_url) : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await forgotPassword(email.trim().toLowerCase());
      // 200 means the account exists and the reset email was really sent.
      setSubmitted(true);
    } catch (err) {
      // 404 → "no account found" detail; 503 → mail service down; anything
      // else → transport/unexpected failure. All show in the error banner.
      if (err instanceof StudentApiError && err.status === 503) {
        setError(
          "Email service is temporarily unavailable. Please try again later or contact support."
        );
      } else {
        setError(
          err instanceof Error && err.message
            ? err.message
            : "Unable to connect to server. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sau-page">
      <div className="sau-card">
        <div className="sau-logo-bar">
          <Link href="/" aria-label="Home">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="IINM" className="sau-logo-img" />
            ) : (
              <div className="sau-logo-badge">
                <span>I</span>
              </div>
            )}
          </Link>
        </div>

        {submitted ? (
          <>
            <div className="sau-success-icon" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="sau-heading">
              <h1 className="sau-title">Check your email</h1>
              <p className="sau-subtitle">
                If an account exists for <strong>{email.trim()}</strong>, we have sent a password
                reset link. The link expires in about an hour. If you never set a password, this
                link will let you create one.
              </p>
            </div>
            <div className="sau-footer">
              Didn&apos;t receive it? Check spam, or{" "}
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  color: "#0a1628",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "inherit",
                }}
              >
                try again
              </button>
              .
            </div>
          </>
        ) : (
          <>
            <div className="sau-heading">
              <h1 className="sau-title">Forgot password?</h1>
              <p className="sau-subtitle">
                Enter the email address registered with your student account. We will email you a
                secure link to reset your password — or set one for the first time.
              </p>
            </div>

            {error && (
              <div className="sau-error-banner" role="alert">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="sau-form">
              <div className="sau-float-group">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder=" "
                  required
                  autoComplete="email"
                  className="sau-float-input"
                />
                <label htmlFor="email" className="sau-float-label">
                  Registered Email Address
                </label>
              </div>

              <button type="submit" disabled={loading} className="sau-btn-submit">
                <span>{loading ? "Sending link..." : "Send Reset Link"}</span>
                {!loading && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                )}
              </button>
            </form>

            <div className="sau-footer">
              Remembered it? <Link href="/signin">Back to sign in</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
