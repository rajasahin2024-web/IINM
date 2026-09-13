"use client";
import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSiteSettings, type SiteSettings } from "@/lib/siteSettingsCache";
import { resolveAssetUrl } from "@/lib/config";
import { resetPassword, StudentApiError } from "@/lib/studentApi";
import "../student-auth.css";

const MIN_PASSWORD_LEN = 8;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    getSiteSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
    document.title = "Reset Password | Student Portal";
  }, []);

  const logo = settings?.logo_url ? resolveAssetUrl(settings.logo_url) : "";

  const validate = (): string => {
    if (!token) return "This reset link is missing its token. Please request a new one.";
    if (password.length < MIN_PASSWORD_LEN)
      return `Password must be at least ${MIN_PASSWORD_LEN} characters.`;
    if (password !== confirm) return "Passwords do not match.";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setLoading(true);
    setError("");
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.push("/signin"), 2500);
    } catch (err) {
      setError(
        err instanceof StudentApiError || err instanceof Error
          ? err.message
          : "This reset link is invalid or has expired."
      );
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

        {done ? (
          <>
            <div className="sau-success-icon" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="sau-heading">
              <h1 className="sau-title">Password updated</h1>
              <p className="sau-subtitle">
                Your password has been set. You can now sign in with it — redirecting you to the
                sign-in page…
              </p>
            </div>
            <div className="sau-footer">
              <Link href="/signin">Go to sign in now</Link>
            </div>
          </>
        ) : (
          <>
            <div className="sau-heading">
              <h1 className="sau-title">Set a new password</h1>
              <p className="sau-subtitle">
                Choose a strong password for your student account. If this is your first time
                setting one, this becomes your login password.
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
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=" "
                  required
                  minLength={MIN_PASSWORD_LEN}
                  autoComplete="new-password"
                  className="sau-float-input sau-float-input-pwd"
                />
                <label htmlFor="password" className="sau-float-label">
                  New Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="sau-pwd-toggle"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>

              <div className="sau-float-group">
                <input
                  id="confirm"
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder=" "
                  required
                  minLength={MIN_PASSWORD_LEN}
                  autoComplete="new-password"
                  className="sau-float-input"
                />
                <label htmlFor="confirm" className="sau-float-label">
                  Confirm New Password
                </label>
              </div>

              <p className="sau-field-hint">Minimum {MIN_PASSWORD_LEN} characters.</p>

              <button type="submit" disabled={loading} className="sau-btn-submit">
                <span>{loading ? "Updating..." : "Set Password & Sign In"}</span>
                {!loading && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                )}
              </button>
            </form>

            <div className="sau-footer">
              <Link href="/signin">Back to sign in</Link>
              {" · "}
              <Link href="/forgot-password">Request a new link</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="sau-page">
          <div className="sau-card">
            <div className="sau-heading">
              <h1 className="sau-title">Loading…</h1>
            </div>
          </div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
