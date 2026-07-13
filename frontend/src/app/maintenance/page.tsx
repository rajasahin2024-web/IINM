"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BASE_URL } from "@/lib/config";

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
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

function MaintenanceSkeleton() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a1628",
        padding: "24px",
      }}
    >
      <div style={{ maxWidth: 640, width: "100%", textAlign: "center" }}>
        <div className="mp-skel" style={{ width: 80, height: 80, borderRadius: "50%", margin: "0 auto 24px" }} />
        <div className="mp-skel" style={{ height: 42, borderRadius: 8, margin: "0 auto 12px", maxWidth: 380 }} />
        <div className="mp-skel" style={{ height: 16, borderRadius: 6, margin: "0 auto 32px", maxWidth: 480 }} />
        <div className="mp-skel" style={{ height: 220, borderRadius: 16, margin: "0 auto 32px", maxWidth: 560 }} />
        <div className="mp-skel" style={{ height: 14, borderRadius: 6, margin: "0 auto", maxWidth: 180 }} />
      </div>
      <style>{`
        .mp-skel {
          background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%);
          background-size: 200% 100%;
          animation: mp-shimmer 1.5s infinite;
        }
        @keyframes mp-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

export default function MaintenancePage() {
  const router = useRouter();
  const [data, setData] = useState<MaintenanceData>({
    maintenance_mode: true,
    maintenance_title: "We'll be right back",
    maintenance_message: "Our team is currently performing scheduled maintenance to improve your experience. Please check back soon.",
    maintenance_video_url: "",
    maintenance_bg_image_url: "",
  });
  const [site, setSite] = useState<SiteInfo>({ site_name: "IINM", logo_url: "", dark_logo_url: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("iinm_device_token") : null;
    if (token) {
      router.replace("/");
      return;
    }

    const bUrl = BASE_URL;
    Promise.all([
      fetch(`${bUrl}/api/settings/maintenance`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${bUrl}/api/settings/site`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([maint, siteData]) => {
      if (maint) {
        setData({
          maintenance_mode: maint.maintenance_mode ?? true,
          maintenance_title: maint.maintenance_title || "We'll be right back",
          maintenance_message: maint.maintenance_message || "Our team is currently performing scheduled maintenance to improve your experience. Please check back soon.",
          maintenance_video_url: maint.maintenance_video_url || "",
          maintenance_bg_image_url: maint.maintenance_bg_image_url || "",
        });
        if (!maint.maintenance_mode) {
          router.replace("/");
        }
      }
      if (siteData) {
        setSite({
          site_name: siteData.site_name || "IINM",
          logo_url: siteData.logo_url || "",
          dark_logo_url: siteData.dark_logo_url || "",
        });
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [router]);

  const videoId = extractYouTubeId(data.maintenance_video_url);
  const bgUrl = data.maintenance_bg_image_url
    ? data.maintenance_bg_image_url.startsWith("http")
      ? data.maintenance_bg_image_url
      : `${BASE_URL}${data.maintenance_bg_image_url}`
    : null;

  if (loading) {
    return <MaintenanceSkeleton />;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: bgUrl
          ? "#0a1628"
          : "radial-gradient(circle at 50% 40%, #0c1b32 0%, #0a1628 50%, #070f1c 100%)",
        color: "#f1f5f9",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle abstract background image */}
      {bgUrl && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${bgUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.06,
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      )}

      {/* Main content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 640,
          width: "100%",
          textAlign: "center",
        }}
      >
        {/* Dark Logo */}
        {site.dark_logo_url ? (
          <img
            src={site.dark_logo_url.startsWith("http") ? site.dark_logo_url : `${BASE_URL}${site.dark_logo_url}`}
            alt={site.site_name}
            style={{
              height: 80,
              width: "auto",
              margin: "0 auto 24px",
              display: "block",
              objectFit: "contain",
            }}
          />
        ) : site.logo_url ? (
          <img
            src={site.logo_url.startsWith("http") ? site.logo_url : `${BASE_URL}${site.logo_url}`}
            alt={site.site_name}
            style={{
              height: 80,
              width: "auto",
              margin: "0 auto 24px",
              display: "block",
              objectFit: "contain",
              filter: "brightness(1.2)",
            }}
          />
        ) : (
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              margin: "0 auto 24px",
              background: "linear-gradient(135deg, #e63946 0%, #d62839 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 20px rgba(230,57,70,0.35)",
              fontSize: 28,
              fontWeight: 800,
              color: "#fff",
            }}
          >
            {site.site_name.slice(0, 2).toUpperCase()}
          </div>
        )}

        {/* Title */}
        <h1
          style={{
            fontSize: "clamp(28px, 5vw, 42px)",
            fontWeight: 800,
            margin: "0 0 12px",
            color: "#f1f5f9",
            letterSpacing: "-0.5px",
          }}
        >
          {data.maintenance_title}
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 16,
            color: "#94a3b8",
            lineHeight: 1.7,
            margin: "0 0 32px",
            maxWidth: 480,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          {data.maintenance_message}
        </p>

        {/* Video */}
        {videoId && (
          <div
            style={{
              position: "relative",
              paddingBottom: "56.25%",
              height: 0,
              borderRadius: 16,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
              marginBottom: 32,
            }}
          >
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&rel=0&modestbranding=1`}
              title="Maintenance Video"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                border: "none",
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontSize: 13,
            color: "#64748b",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#e63946",
              display: "inline-block",
            }}
          />
          <span>System under maintenance</span>
        </div>
      </div>
    </div>
  );
}
