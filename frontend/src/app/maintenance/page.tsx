import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { API_BASE_URL, BASE_URL } from "@/lib/config";
import styles from "./maintenance.module.css";

interface MaintenanceData {
  maintenance_mode: boolean;
  maintenance_title: string;
  maintenance_message: string;
  maintenance_video_url: string;
  maintenance_bg_image_url: string;
}

interface SiteInfo {
  site_name: string;
  logo_url: string;
  dark_logo_url: string;
  favicon_url: string;
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

async function fetchMaintenanceData(): Promise<{
  maintenance: MaintenanceData | null;
  site: SiteInfo | null;
  dbDown: boolean;
}> {
  try {
    const [maintRes, siteRes] = await Promise.all([
      fetch(`${API_BASE_URL}/settings/maintenance`, { cache: "no-store" }),
      fetch(`${API_BASE_URL}/settings/site`, { cache: "no-store" }),
    ]);

    let maintenance: MaintenanceData | null = null;
    let site: SiteInfo | null = null;

    if (maintRes.ok) {
      maintenance = await maintRes.json();
    }
    if (siteRes.ok) {
      site = await siteRes.json();
    }

    return { maintenance, site, dbDown: !maintRes.ok };
  } catch {
    // Backend completely unreachable
    return { maintenance: null, site: null, dbDown: true };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const { site, dbDown } = await fetchMaintenanceData();

  if (dbDown) {
    return {
      title: "Technical Issues | IINM",
      description: "We're experiencing technical issues. Please check back soon.",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: "Maintenance | IINM",
    description: "Scheduled maintenance in progress. Please check back soon.",
    robots: { index: false, follow: false },
    icons: site?.favicon_url ? { icon: site.favicon_url } : undefined,
  };
}

export default async function MaintenancePage() {
  // Admin bypass — check cookie server-side
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get("iinm_admin")?.value;
  if (adminCookie === "1") {
    redirect("/");
  }

  const { maintenance, site, dbDown } = await fetchMaintenanceData();

  // If maintenance mode is OFF and DB is up, redirect to home
  if (!dbDown && maintenance && !maintenance.maintenance_mode) {
    redirect("/");
  }

  // Determine which variant to show
  const isDbDown = dbDown;
  const title = isDbDown
    ? "Technical Issues"
    : maintenance?.maintenance_title || "We'll be right back";
  const message = isDbDown
    ? "We're experiencing unexpected technical difficulties. Our team has been notified and is working to restore service. Please check back shortly."
    : maintenance?.maintenance_message || "Our team is currently performing scheduled maintenance to improve your experience. Please check back soon.";

  const videoUrl = maintenance?.maintenance_video_url || "";
  const videoId = extractYouTubeId(videoUrl);
  const bgImageUrl = maintenance?.maintenance_bg_image_url
    ? maintenance.maintenance_bg_image_url.startsWith("http")
      ? maintenance.maintenance_bg_image_url
      : `${BASE_URL}${maintenance.maintenance_bg_image_url}`
    : null;

  const siteName = site?.site_name || "IINM";
  const logoUrl = site?.dark_logo_url || site?.logo_url
    ? (site.dark_logo_url || site.logo_url || "").startsWith("http")
      ? site.dark_logo_url || site.logo_url
      : `${BASE_URL}${site.dark_logo_url || site.logo_url}`
    : null;

  return (
    <div className={styles.maintenancePage}>
      {/* Background image */}
      {bgImageUrl && <div className={styles.bgImage} style={{ backgroundImage: `url(${bgImageUrl})` }} />}

      {/* Animated background orbs */}
      <div className={`${styles.orb} ${styles.orb1}`} />
      <div className={`${styles.orb} ${styles.orb2}`} />

      {/* Main content */}
      <div className={styles.content}>
        {/* Logo */}
        <div className={styles.logoWrapper}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={siteName}
              className={styles.logoImg}
            />
          ) : (
            <div className={styles.logoFallback}>
              {siteName.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        {/* Status badge */}
        <div className={styles.statusBadge}>
          <span className={styles.statusDot} />
          <span>{isDbDown ? "Service Disrupted" : "System Under Maintenance"}</span>
        </div>

        {/* Title */}
        <h1 className={styles.title}>
          {title.split(" ").slice(0, -1).join(" ")}{" "}
          {title.split(" ").slice(-1)[0] && (
            <span className={styles.titleAccent}>
              {title.split(" ").slice(-1)[0]}
            </span>
          )}
        </h1>

        {/* Subtitle */}
        <p className={styles.subtitle}>{message}</p>

        {/* Loading indicator */}
        <div className={styles.loadingDots}>
          <div className={styles.loadingDot} />
          <div className={styles.loadingDot} />
          <div className={styles.loadingDot} />
        </div>

        {/* Video */}
        {videoId && (
          <div className={styles.videoWrapper}>
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&rel=0&modestbranding=1`}
              title="Maintenance Video"
              className={styles.videoIframe}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {/* Footer */}
        <div className={styles.footer}>
          <span className={styles.footerDot} />
          <span>{siteName} — {isDbDown ? "Engineers are on it" : "Back soon"}</span>
        </div>
      </div>
    </div>
  );
}
