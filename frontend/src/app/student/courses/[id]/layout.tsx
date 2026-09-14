"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  getCourseExams,
  getCourseNotices,
  getStudentCourse,
  StudentApiError,
  type StudentCourseDashboard,
} from "@/lib/studentApi";
import { useStudent } from "../../context";
import { CourseContext } from "./context";
import SIcon from "../../icons";

/* ────────────────────────────────────────────────────────────
   /student/courses/[id] — course-scoped panel shell.

   Desktop (≥1024px): navy sidebar with grouped sections
   (Learn / Assess / Account) + global items + profile footer.
   Mobile (<1024px): app chrome — compact header, hamburger
   drawer with the full menu, fixed bottom nav with the
   most-used items (Overview, Content, Classes, Exams, More).
   ──────────────────────────────────────────────────────────── */

interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: "liveExam" | "newNotices";
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

function navGroups(base: string): NavGroup[] {
  return [
    {
      title: "Learn",
      items: [
        { href: `${base}/overview`, label: "Overview", icon: "home" },
        { href: `${base}/content`, label: "Course Content", icon: "book" },
        { href: `${base}/classes`, label: "Live Classes", icon: "video-call" },
      ],
    },
    {
      title: "Assess",
      items: [
        { href: `${base}/exams`, label: "Exams", icon: "clipboard", badge: "liveExam" },
        { href: `${base}/results`, label: "Results / Gradebook", icon: "chart" },
      ],
    },
    {
      title: "Account",
      items: [
        { href: `${base}/payments`, label: "Payments & Invoices", icon: "payments" },
        { href: `${base}/notices`, label: "Notices", icon: "bell", badge: "newNotices" },
        { href: `${base}/certificate`, label: "Certificate", icon: "award" },
        { href: "/student/help", label: "Help & Support", icon: "help" },
      ],
    },
  ];
}

function NavBadge({ kind, badges }: { kind: "liveExam" | "newNotices"; badges: { liveExam: boolean; newNotices: boolean } }) {
  if (kind === "liveExam" && badges.liveExam) {
    return <span className="stu-nav-badge stu-nav-badge-live">LIVE</span>;
  }
  if (kind === "newNotices" && badges.newNotices) {
    return <span className="stu-nav-badge stu-nav-badge-new">NEW</span>;
  }
  return null;
}

export default function CourseLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { profile, logout, siteName, darkLogoUrl } = useStudent();
  const courseId = Number(params?.id);
  const invalidId = !Number.isFinite(courseId);

  const [course, setCourse] = useState<StudentCourseDashboard | null>(null);
  const [nowTs, setNowTs] = useState(0);
  const [error, setError] = useState(invalidId ? "Invalid course link." : "");
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const [badges, setBadges] = useState({ liveExam: false, newNotices: false });
  const [navCollapsed, setNavCollapsed] = useState(() => {
    try {
      return typeof window !== "undefined" &&
        localStorage.getItem("stu_nav_collapsed") === "1";
    } catch {
      return false;
    }
  });
  const drawerOpen = drawerPath === pathname;

  const load = useCallback(() => {
    if (invalidId) return;
    getStudentCourse(courseId)
      .then((d) => {
        setNowTs(Date.now());
        setCourse(d);
      })
      .catch((err) => {
        if (err instanceof StudentApiError && err.status === 401) {
          router.replace("/signin");
        } else if (err instanceof StudentApiError && err.status === 403) {
          setError("You do not have access to this course.");
        } else if (err instanceof StudentApiError && err.status === 404) {
          setError("This course was not found on your account.");
        } else {
          setError("Could not load the course. Please retry.");
        }
      });
  }, [courseId, invalidId, router]);

  useEffect(() => {
    load();
  }, [load]);

  // Cheap nav badges: a live/available exam and unseen notices.
  useEffect(() => {
    if (!course || invalidId) return;
    let cancelled = false;
    getCourseExams(courseId)
      .then((exams) => {
        if (cancelled) return;
        setBadges((b) => ({
          ...b,
          liveExam: exams.some((e) => e.state === "in_progress" || e.state === "available"),
        }));
      })
      .catch(() => {});
    getCourseNotices(courseId, 50, 0)
      .then(({ items }) => {
        if (cancelled) return;
        const latest = items[0]?.id ?? 0;
        let seen = 0;
        try {
          seen = Number(localStorage.getItem(`stu_notices_seen_${courseId}`) || 0);
        } catch {}
        setBadges((b) => ({ ...b, newNotices: latest > seen }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [course, courseId, invalidId, pathname]);

  // Desktop sidebar collapse — remembered across visits. Lazy read is
  // safe: the course shell renders only after client-side data loads.
  const toggleNav = useCallback(() => {
    setNavCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem("stu_nav_collapsed", next ? "1" : "0");
      } catch {}
      return next;
    });
  }, []);

  // Lock body scroll while the drawer is open. drawerPath === pathname means
  // the drawer auto-closes on navigation without an extra effect.
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const base = `/student/courses/${courseId}`;
  const groups = useMemo(() => navGroups(base), [base]);

  const isActive = (href: string) => pathname === href;

  const pageLabel = useMemo(() => {
    if (pathname === base) return "Overview";
    for (const g of groups) {
      for (const item of g.items) {
        if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
          return item.label;
        }
      }
    }
    if (pathname.startsWith("/student/help")) return "Help & Support";
    if (pathname.startsWith("/student/profile")) return "My Profile";
    return "";
  }, [groups, pathname, base]);

  if (error) {
    return (
      <div className="stu-shell">
        <main className="stu-main stu-main-flat">
          <div className="stu-content stu-content-fluid">
            <div className="stu-empty" role="alert">
              <SIcon name="lock" size={40} />
              <p className="stu-empty-title">Unavailable</p>
              <p className="stu-empty-sub">{error}</p>
              <Link
                href="/student"
                className="stu-btn-primary"
                style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
              >
                Back to my courses
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="stu-shell" aria-busy="true">
        <main className="stu-main stu-main-flat">
          <div className="stu-content stu-content-fluid">
            <div className="stu-skel" style={{ height: 120, marginBottom: 16 }} />
            <div className="stu-skel stu-skel-line" style={{ width: "40%" }} />
            <div className="stu-skel stu-skel-line" />
            <div className="stu-skel stu-skel-line" style={{ width: "65%" }} />
          </div>
        </main>
      </div>
    );
  }

  const initials = (profile.first_name?.[0] || "S").toUpperCase();

  const navLink = (item: NavItem, onNavigate?: () => void) => (
    <Link
      key={item.href}
      href={item.href}
      className={`stu-nav-item ${isActive(item.href) ? "active" : ""}`}
      onClick={onNavigate}
    >
      <SIcon name={item.icon} size={19} />
      <span className="stu-nav-label">{item.label}</span>
      {item.badge && <NavBadge kind={item.badge} badges={badges} />}
    </Link>
  );

  return (
    <CourseContext.Provider value={{ courseId, course, reload: load, nowTs, badges }}>
      <div className={`stu-shell${navCollapsed ? " stu-shell-collapsed" : ""}`}>
        {/* ════════ Desktop sidebar (≥1024px) ════════ */}
        <aside className="stu-sidebar stu-course-sidebar">
          <div className="stu-sidebar-brand">
            <Link href="/student" className="stu-brand-home" aria-label="Back to my courses">
              {darkLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={darkLogoUrl} alt={siteName} className="stu-sidebar-logo" />
              ) : (
                <span className="stu-brand-text">{siteName}</span>
              )}
            </Link>
            <span className="stu-portal-tag">Student Portal</span>
          </div>

          <div className="stu-course-block">
            <span className="stu-course-block-label">Current course</span>
            <span className="stu-course-block-title">{course.title}</span>
            {course.batchName && (
              <span className="stu-course-block-sub">
                {course.batchName}
                {course.batchMode ? ` · ${course.batchMode}` : ""}
              </span>
            )}
          </div>

          <nav className="stu-sidebar-nav" aria-label="Course navigation">
            {groups.map((g) => (
              <div className="stu-nav-group" key={g.title}>
                <span className="stu-nav-group-title">{g.title}</span>
                {g.items.map((item) => navLink(item))}
              </div>
            ))}
            <div className="stu-nav-group">
              <span className="stu-nav-group-title">General</span>
              <Link href="/student" className="stu-nav-item">
                <SIcon name="grid" size={19} />
                <span className="stu-nav-label">My Courses</span>
              </Link>
              <Link
                href="/student/profile"
                className={`stu-nav-item ${isActive("/student/profile") ? "active" : ""}`}
              >
                <SIcon name="person" size={19} />
                <span className="stu-nav-label">My Profile</span>
              </Link>
            </div>
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
              <button
                type="button"
                className="stu-profile-logout"
                onClick={logout}
                aria-label="Sign out"
                title="Sign out"
              >
                <SIcon name="logout" size={18} />
              </button>
            </div>
          </div>
        </aside>

        {/* ════════ Mobile app header (<1024px) ════════ */}
        <header className="stu-mobile-header">
          <button
            type="button"
            className="stu-topbar-icon"
            onClick={() => setDrawerPath(pathname)}
            aria-label="Open course menu"
          >
            <SIcon name="menu" size={22} />
          </button>
          <div className="stu-mobile-course-title" aria-live="polite">
            {course.title}
          </div>
          <Link href="/student" className="stu-topbar-icon" aria-label="Back to my courses">
            <SIcon name="grid" size={20} />
          </Link>
        </header>

        {/* ════════ Mobile drawer ════════ */}
        {drawerOpen && (
          <div className="stu-drawer-wrap" role="dialog" aria-modal="true" aria-label="Course menu">
            <button
              type="button"
              className="stu-drawer-scrim"
              onClick={() => setDrawerPath(null)}
              aria-label="Close menu"
            />
            <div className="stu-drawer">
              <div className="stu-drawer-head">
                <div className="stu-drawer-course">
                  <span className="stu-course-block-label">Current course</span>
                  <span className="stu-course-block-title">{course.title}</span>
                  {course.batchName && (
                    <span className="stu-course-block-sub">
                      {course.batchName}
                      {course.batchMode ? ` · ${course.batchMode}` : ""}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="stu-topbar-icon"
                  onClick={() => setDrawerPath(null)}
                  aria-label="Close menu"
                >
                  <SIcon name="close" size={22} />
                </button>
              </div>
              <nav className="stu-drawer-nav" aria-label="Course navigation">
                {groups.map((g) => (
                  <div className="stu-nav-group" key={g.title}>
                    <span className="stu-nav-group-title">{g.title}</span>
                    {g.items.map((item) => navLink(item, () => setDrawerPath(null)))}
                  </div>
                ))}
                <div className="stu-nav-group">
                  <span className="stu-nav-group-title">General</span>
                  <Link href="/student" className="stu-nav-item">
                    <SIcon name="grid" size={19} />
                    <span className="stu-nav-label">My Courses</span>
                  </Link>
                  <Link href="/student/profile" className="stu-nav-item">
                    <SIcon name="person" size={19} />
                    <span className="stu-nav-label">My Profile</span>
                  </Link>
                  <button type="button" className="stu-nav-item stu-nav-btn" onClick={logout}>
                    <SIcon name="logout" size={19} />
                    <span className="stu-nav-label">Sign out</span>
                  </button>
                </div>
              </nav>
            </div>
          </div>
        )}

        {/* ════════ Content column (desktop topbar + main) ════════ */}
        <div className="stu-body">
          <header className="stu-desktop-topbar">
            <button
              type="button"
              className="stu-nav-toggle"
              onClick={toggleNav}
              aria-label={navCollapsed ? "Show sidebar" : "Hide sidebar"}
              aria-expanded={!navCollapsed}
              title={navCollapsed ? "Show sidebar" : "Hide sidebar"}
            >
              <SIcon name="menu" size={20} />
            </button>
            <nav className="stu-dtop-crumb" aria-label="Breadcrumb">
              <Link href="/student" className="stu-dtop-crumb-link">
                My Courses
              </Link>
              <SIcon name="chevron-right" size={14} className="stu-dtop-crumb-sep" />
              <Link href={`${base}/overview`} className="stu-dtop-crumb-course">
                {course.title}
              </Link>
              {pageLabel && pageLabel !== "Overview" && (
                <>
                  <SIcon name="chevron-right" size={14} className="stu-dtop-crumb-sep" />
                  <span className="stu-dtop-crumb-cur">{pageLabel}</span>
                </>
              )}
            </nav>
            <div className="stu-dtop-actions">
              <Link href="/student" className="stu-dtop-icon" aria-label="Back to my courses" title="Back to my courses">
                <SIcon name="grid" size={19} />
              </Link>
              <Link href="/student/profile" className="stu-dtop-icon" aria-label="My profile" title="My profile">
                <span className="stu-avatar stu-avatar-sm" aria-hidden="true">{initials}</span>
              </Link>
            </div>
          </header>
          <main className="stu-main">
            <div className="stu-content stu-content-fluid">{children}</div>
          </main>
        </div>

        {/* ════════ Mobile bottom nav (<1024px) ════════ */}
        <nav className="stu-bottom-nav" aria-label="Course navigation">
          <Link
            href={`${base}/overview`}
            className={`stu-bottom-item ${isActive(`${base}/overview`) ? "active" : ""}`}
          >
            <SIcon name="home" size={19} />
            Overview
          </Link>
          <Link
            href={`${base}/content`}
            className={`stu-bottom-item ${isActive(`${base}/content`) ? "active" : ""}`}
          >
            <SIcon name="book" size={19} />
            Content
          </Link>
          <Link
            href={`${base}/classes`}
            className={`stu-bottom-item ${isActive(`${base}/classes`) ? "active" : ""}`}
          >
            <SIcon name="video-call" size={19} />
            Classes
          </Link>
          <Link
            href={`${base}/exams`}
            className={`stu-bottom-item ${isActive(`${base}/exams`) ? "active" : ""}`}
          >
            <SIcon name="clipboard" size={19} />
            Exams
            {badges.liveExam && <span className="stu-dot" aria-label="Exam live now" />}
          </Link>
          <button
            type="button"
            className="stu-bottom-item"
            onClick={() => setDrawerPath(pathname)}
          >
            <SIcon name="dots" size={19} />
            More
          </button>
        </nav>
      </div>
    </CourseContext.Provider>
  );
}
