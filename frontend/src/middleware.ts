import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

// In-memory cache for maintenance check (avoids hitting API on every single request)
let cachedMaintenance: { status: "ok" | "down" | "maintenance"; timestamp: number } | null = null;
const CACHE_TTL_MS = 10_000; // 10 seconds

// In-memory cache for SEO redirects (avoids hitting API on every single request)
let cachedRedirects: { rules: { from_path: string; to_path: string; status_code: number }[]; timestamp: number } | null = null;
const REDIRECT_CACHE_TTL_MS = 60_000; // 60 seconds

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip admin, maintenance, API, and static asset routes
  if (
    pathname.startsWith("/admin") ||
    pathname === "/maintenance" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  // ── SEO Redirect check (runs before maintenance check) ──
  const now = Date.now();
  if (!cachedRedirects || now - cachedRedirects.timestamp > REDIRECT_CACHE_TTL_MS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${API_BASE}/seo/redirects`, { cache: "no-store", signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const rules = await res.json();
        cachedRedirects = { rules: Array.isArray(rules) ? rules : [], timestamp: now };
      }
    } catch {
      // keep old cache or empty
      if (!cachedRedirects) cachedRedirects = { rules: [], timestamp: now };
    }
  }

  if (cachedRedirects && cachedRedirects.rules.length > 0) {
    const match = cachedRedirects.rules.find((r) => r.from_path === pathname);
    if (match) {
      const targetUrl = match.to_path.startsWith("http")
        ? match.to_path
        : new URL(match.to_path, request.url).toString();
      return NextResponse.redirect(targetUrl, match.status_code || 301);
    }
  }

  // Skip if admin is logged in (admin cookie set during login)
  const adminCookie = request.cookies.get("iinm_admin")?.value;
  if (adminCookie === "1") return NextResponse.next();

  // Check in-memory cache first
  if (cachedMaintenance && now - cachedMaintenance.timestamp < CACHE_TTL_MS) {
    if (cachedMaintenance.status !== "ok") {
      return NextResponse.redirect(new URL("/maintenance", request.url));
    }
    return NextResponse.next();
  }

  // Check maintenance mode + DB health
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${API_BASE}/settings/maintenance`, {
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      // DB down or backend error → maintenance
      cachedMaintenance = { status: "down", timestamp: now };
      return NextResponse.redirect(new URL("/maintenance", request.url));
    }

    const data = await res.json();
    if (data.maintenance_mode) {
      cachedMaintenance = { status: "maintenance", timestamp: now };
      return NextResponse.redirect(new URL("/maintenance", request.url));
    }

    // All good
    cachedMaintenance = { status: "ok", timestamp: now };
    return NextResponse.next();
  } catch {
    // Network error or timeout → maintenance
    cachedMaintenance = { status: "down", timestamp: now };
    return NextResponse.redirect(new URL("/maintenance", request.url));
  }
}

export const config = {
  matcher: ["/((?!admin|maintenance|_next|api).*)"],
};
