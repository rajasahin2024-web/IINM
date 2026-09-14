"use client";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  getStudentMe,
  studentLogout,
  StudentApiError,
  type StudentProfile,
} from "@/lib/studentApi";
import { getSiteSettings, type SiteSettings } from "@/lib/siteSettingsCache";
import { resolveAssetUrl } from "@/lib/config";
import { StudentContext } from "./context";
import SIcon from "./icons";
import "./student.css";

/* ────────────────────────────────────────────────────────────
   /student layout — auth guard + responsive LMS shell.
   The session cookie is httpOnly, so the backend is the guard:
   GET /api/student/me → 401 means "redirect to /signin".

   Chrome is route-aware:
     /student            → card landing — menu-free per board
                           direction (slim top bar only).
     /student/courses/*  → no chrome here; the course layout owns
                           the full course-scoped sidebar/drawer.
     other /student/*    → global shell (sidebar + bottom nav).

   Mobile  (<1024px): app-like chrome — compact navy header,
   card-first content, fixed bottom nav.
   Desktop (≥1024px): enterprise LMS — navy sidebar + content.
   ──────────────────────────────────────────────────────────── */

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getSiteSettings()
      .then((s) => !cancelled && setSettings(s))
      .catch(() => {});

    getStudentMe()
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof StudentApiError && err.status === 401) {
          router.replace("/signin");
        } else {
          setLoadError("Could not load your student profile. Please retry.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const logout = useCallback(async () => {
    await studentLogout();
    router.replace("/signin");
  }, [router]);

  /* ── Loading / guard states ── */
  if (loadError) {
    return (
      <div className="stu-guard">
        <div className="stu-guard-card">
          <p className="stu-guard-title">Something went wrong</p>
          <p className="stu-guard-sub">{loadError}</p>
          <button className="stu-btn-primary" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="stu-guard" aria-busy="true">
        <div className="stu-guard-card">
          <span className="stu-spinner" aria-hidden="true" />
          <p className="stu-guard-sub">Opening your student portal…</p>
        </div>
      </div>
    );
  }

  const logo = settings?.logo_url ? resolveAssetUrl(settings.logo_url) : "";
  const darkLogo = settings?.dark_logo_url
    ? resolveAssetUrl(settings.dark_logo_url)
    : logo;
  const siteName = settings?.site_name || "IINM";
  const initials = (profile.first_name?.[0] || "S").toUpperCase();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  /* Course routes own their full chrome (sidebar/drawer) via the
     courses/[id] layout — render only the context provider here. */
  if (pathname.startsWith("/student/courses/")) {
    return (
      <StudentContext.Provider value={{ profile, logout }}>
        {children}
      </StudentContext.Provider>
    );
  }

  /* Card landing: menu-free. Slim top bar with profile + sign out only. */
  if (pathname === "/student") {
    return (
      <StudentContext.Provider value={{ profile, logout }}>
        <div className="stu-shell stu-shell-landing">
          <header className="stu-mobile-header stu-topbar-always">
            <Link href="/student" className="stu-mobile-brand" aria-label="Student portal home">
              {darkLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={darkLogo} alt={siteName} className="stu-mobile-logo" />
              ) : (
                <span className="stu-brand-text">{siteName}</span>
              )}
              <span className="stu-portal-tag stu-portal-tag-inline">Student Portal</span>
            </Link>
            <div className="stu-topbar-actions">
              <Link href="/student/profile" className="stu-topbar-icon" aria-label="My profile">
                <span className="stu-avatar stu-avatar-sm" aria-hidden="true">{initials}</span>
              </Link>
              <button
                type="button"
                className="stu-topbar-icon"
                onClick={logout}
                aria-label="Sign out"
              >
                <SIcon name="logout" size={20} />
              </button>
            </div>
          </header>
          <main className="stu-main stu-main-flat">
            <div className="stu-content">{children}</div>
          </main>
        </div>
      </StudentContext.Provider>
    );
  }

  return (
    <StudentContext.Provider value={{ profile, logout }}>
      <div className="stu-shell">
        {/* ════════ Desktop sidebar (≥1024px) ════════ */}
        <aside className="stu-sidebar">
          <div className="stu-sidebar-brand">
            <Link href="/student" aria-label="Student portal home">
              {darkLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={darkLogo} alt={siteName} className="stu-sidebar-logo" />
              ) : (
                <span className="stu-brand-text">{siteName}</span>
              )}
            </Link>
            <span className="stu-portal-tag">Student Portal</span>
          </div>

          <nav className="stu-sidebar-nav" aria-label="Student navigation">
            <Link
              href="/student"
              className={`stu-nav-item ${pathname === "/student" ? "active" : ""}`}
            >
              <SIcon name="grid" size={19} />
              My Courses
            </Link>
            <Link
              href="/student/profile"
              className={`stu-nav-item ${isActive("/student/profile") ? "active" : ""}`}
            >
              <SIcon name="person" size={19} />
              My Profile
            </Link>
            <Link
              href="/student/help"
              className={`stu-nav-item ${isActive("/student/help") ? "active" : ""}`}
            >
              <SIcon name="help" size={19} />
              Help &amp; Support
            </Link>
            <Link href="/courses" className="stu-nav-item">
              <SIcon name="explore" size={19} />
              Browse Courses
            </Link>
          </nav>

          <div className="stu-sidebar-footer">
            <div className="stu-profile">
              <span className="stu-avatar" aria-hidden="true">{initials}</span>
              <div className="stu-profile-meta">
                <span className="stu-profile-name">
                  {profile.first_name} {profile.last_name ?? ""}
                </span>
                <span className="stu-profile-email">{profile.email}</span>
              </div>
            </div>
            <button type="button" className="stu-logout-btn" onClick={logout}>
              <SIcon name="logout" size={19} />
              Sign out
            </button>
          </div>
        </aside>

        {/* ════════ Mobile app header (<1024px) ════════ */}
        <header className="stu-mobile-header">
          <Link href="/student" className="stu-mobile-brand" aria-label="Student portal home">
            {darkLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={darkLogo} alt={siteName} className="stu-mobile-logo" />
            ) : (
              <span className="stu-brand-text">{siteName}</span>
            )}
          </Link>
          <Link href="/student/profile" aria-label="My profile">
            <span className="stu-avatar stu-avatar-sm" aria-hidden="true">{initials}</span>
          </Link>
        </header>

        {/* ════════ Content ════════ */}
        <main className="stu-main">
          <div className="stu-content">{children}</div>
        </main>

        {/* ════════ Mobile bottom nav (<1024px) ════════ */}
        <nav className="stu-bottom-nav" aria-label="Student navigation">
          <Link
            href="/student"
            className={`stu-bottom-item ${pathname === "/student" ? "active" : ""}`}
          >
            <SIcon name="grid" size={19} />
            Courses
          </Link>
          <Link
            href="/student/profile"
            className={`stu-bottom-item ${isActive("/student/profile") ? "active" : ""}`}
          >
            <SIcon name="person" size={19} />
            Profile
          </Link>
          <Link
            href="/student/help"
            className={`stu-bottom-item ${isActive("/student/help") ? "active" : ""}`}
          >
            <SIcon name="help" size={19} />
            Help
          </Link>
          <button type="button" className="stu-bottom-item" onClick={logout}>
            <SIcon name="logout" size={19} />
            Sign out
          </button>
        </nav>
      </div>
    </StudentContext.Provider>
  );
}
