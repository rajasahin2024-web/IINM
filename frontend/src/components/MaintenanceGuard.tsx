"use client";
import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BASE_URL } from "@/lib/config";

interface MaintenanceData {
  maintenance_mode: boolean;
  maintenance_title: string;
  maintenance_message: string;
  maintenance_video_url: string;
  maintenance_bg_image_url: string;
}

function LightSkeletonScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
        padding: "24px",
      }}
    >
      <div style={{ maxWidth: 640, width: "100%", textAlign: "center" }}>
        <div
          className="mg-skel"
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            margin: "0 auto 24px",
          }}
        />
        <div
          className="mg-skel"
          style={{
            height: 42,
            borderRadius: 8,
            margin: "0 auto 12px",
            maxWidth: 380,
          }}
        />
        <div
          className="mg-skel"
          style={{
            height: 16,
            borderRadius: 6,
            margin: "0 auto 32px",
            maxWidth: 480,
          }}
        />
        <div
          className="mg-skel"
          style={{
            height: 220,
            borderRadius: 16,
            margin: "0 auto 32px",
            maxWidth: 560,
          }}
        />
        <div
          className="mg-skel"
          style={{
            height: 14,
            borderRadius: 6,
            margin: "0 auto",
            maxWidth: 180,
          }}
        />
      </div>
      <style>{`
        .mg-skel {
          background: linear-gradient(90deg, rgba(10,22,40,0.04) 25%, rgba(10,22,40,0.10) 50%, rgba(10,22,40,0.04) 75%);
          background-size: 200% 100%;
          animation: mg-shimmer 1.5s infinite;
        }
        @keyframes mg-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

export default function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    // Skip for admin routes, maintenance page, and SSR
    if (pathname?.startsWith("/admin") || pathname === "/maintenance" || typeof window === "undefined") {
      setChecking(false);
      return;
    }

    const token = localStorage.getItem("iinm_device_token");
    // Logged-in users bypass maintenance
    if (token) {
      setChecking(false);
      return;
    }

    const bUrl = BASE_URL;
    fetch(`${bUrl}/api/settings/maintenance`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: MaintenanceData) => {
        if (d.maintenance_mode) {
          setBlocked(true);
          // Hard redirect — browser navigates immediately, no children ever render
          window.location.replace("/maintenance");
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [pathname]);

  // While checking API, show a neutral skeleton so nothing leaks
  if (checking || blocked) {
    return <LightSkeletonScreen />;
  }

  return <>{children}</>;
}
