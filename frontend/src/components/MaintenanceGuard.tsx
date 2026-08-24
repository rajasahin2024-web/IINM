"use client";
import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import { BASE_URL } from "@/lib/config";

/**
 * MaintenanceGuard — lightweight client-side maintenance check.
 *
 * The middleware (middleware.ts) already handles the initial redirect before
 * the page renders. This component serves as a runtime fallback: it periodically
 * checks if maintenance mode was turned ON while the user is already browsing.
 *
 * Unlike the previous version, it does NOT show a skeleton screen or block
 * rendering — the middleware has already verified the site is up.
 */
export default function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    // Skip for admin routes, maintenance page
    if (pathname?.startsWith("/admin") || pathname === "/maintenance") return;

    // Logged-in admins bypass maintenance
    try {
      const adminCookie = document.cookie
        .split("; ")
        .find((c) => c.startsWith("iinm_admin="));
      if (adminCookie?.split("=")[1] === "1") return;
    } catch {}

    // Periodic background check (every 60s) — catches maintenance turned on mid-session
    const checkMaintenance = () => {
      fetch(`${BASE_URL}/api/settings/maintenance`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (d.maintenance_mode) {
            window.location.replace("/maintenance");
          }
        })
        .catch(() => {
          // Network error — don't redirect (middleware handles full outages)
        });
    };

    // Initial check after 5s (let the page load first), then every 60s
    const initialTimer = setTimeout(checkMaintenance, 5000);
    const interval = setInterval(checkMaintenance, 60_000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [pathname]);

  return <>{children}</>;
}
