"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { API_BASE_URL } from "@/lib/config";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  Fingerprint,
  Globe,
  GraduationCap,
  Loader2,
  Lock,
  Mail,
  MapPin,
  MonitorSmartphone,
  Newspaper,
  ShieldAlert,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

/**
 * Cross-browser stable hardware fingerprint.
 * Uses only properties that are IDENTICAL across Chrome, Firefox, Edge on same machine.
 */
function generateDeviceFingerprint(): string {
  const screen_w  = typeof screen !== "undefined" ? screen.width : 0;
  const screen_h  = typeof screen !== "undefined" ? screen.height : 0;
  const color_d   = typeof screen !== "undefined" ? screen.colorDepth : 0;
  const cpu_cores = typeof navigator !== "undefined" ? (navigator.hardwareConcurrency || 0) : 0;
  const timezone  = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";
  // navigator.platform is deprecated; fallback to userAgentData or userAgent
  let platform = "";
  try {
    platform = (navigator as any).userAgentData?.platform || (navigator as any).platform || "";
  } catch { /* ignore */ }
  if (!platform) {
    const ua = (navigator as any).userAgent?.toLowerCase() || "";
    if (ua.includes("win")) platform = "Windows";
    else if (ua.includes("mac")) platform = "MacOS";
    else if (ua.includes("linux")) platform = "Linux";
    else platform = "Unknown";
  }
  const lang = (navigator as any).language || "";
  const mem = (navigator as any) .deviceMemory || 0;

  const raw = `${screen_w}x${screen_h}x${color_d}|cpu:${cpu_cores}|tz:${timezone}|os:${platform}|lang:${lang}|mem:${mem}`;

  let h1 = 0x9dc5_79b7, h2 = 0x97f4_a787;
  for (let i = 0; i < raw.length; i++) {
    const c = raw.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x9e37_79b9);
    h2 = Math.imul(h2 ^ c, 0x6c62_272e);
    h1 = ((h1 << 13) | (h1 >>> 19)) ^ h2;
    h2 = ((h2 << 11) | (h2 >>> 21)) ^ h1;
  }
  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, "0");
  return `${toHex(h1)}${toHex(h2)}${toHex(h1 ^ h2)}${toHex(Math.imul(h1, h2) >>> 0)}`;
}

interface SiteSettingsData {
  site_name: string;
  logo_url: string;
}

interface LocationInfo {
  device_name: string;
  device_model: string;
  location: string;
  lat: number | null;
  lng: number | null;
  ip_address: string;
  registered_at: string | null;
}

const inputCls =
  "h-12 w-full border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-900 transition-colors duration-200 placeholder:text-slate-400 hover:border-slate-400 focus:border-[#0a1628] focus:outline-none focus:ring-2 focus:ring-[#0a1628]/15 sm:text-base";

const capabilityCards = [
  { icon: GraduationCap, title: "Courses & Batches", desc: "Catalog, pricing and batch schedules" },
  { icon: Newspaper, title: "Content & Media", desc: "Blogs, pages, notices and banners" },
  { icon: Users, title: "Students & Admissions", desc: "Admissions, invoices and receipts" },
  { icon: MonitorSmartphone, title: "Devices & Access", desc: "Approve devices, audit sign-ins" },
] as const;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [publicIp, setPublicIp] = useState<string | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; msg: string; type?: string }>({ visible: false, msg: "" });
  const [siteSettings, setSiteSettings] = useState<SiteSettingsData>({ site_name: "IINM", logo_url: "" });
  const [logoError, setLogoError] = useState(false);

  const showToast = (msg: string, type: string = "warning") => {
    setToast({ visible: true, msg, type });
    setTimeout(() => setToast({ visible: false, msg: "" }), 4000);
  };

  /* ── Fetch site settings (logo + name) ── */
  useEffect(() => {
    const fetchSiteSettings = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/settings/site`);
        if (res.ok) {
          const data = await res.json();
          setSiteSettings({
            site_name: data.site_name || "IINM",
            logo_url: data.logo_url || "",
          });
        }
      } catch { /* silently ignore */ }
    };
    fetchSiteSettings();
  }, []);

  /* ── On mount: guard already-logged-in users + verify device token ── */
  useEffect(() => {
    // If already logged in AND session not expired → redirect to dashboard
    const isLoggedIn = localStorage.getItem("iinm_is_logged_in");
    const expiry = localStorage.getItem("iinm_login_expiry");
    const sessionValid = isLoggedIn === "true" && expiry && Date.now() < Number(expiry);
    if (sessionValid) {
      sessionStorage.setItem("iinm_redirect_toast", "You are already signed in. Please log out before accessing the login page.");
      window.location.href = "/admin";
      return;
    }
    // Clear stale/expired session flags
    if (isLoggedIn === "true" && (!expiry || Date.now() >= Number(expiry))) {
      localStorage.removeItem("iinm_is_logged_in");
      localStorage.removeItem("iinm_login_expiry");
    }

    const checkDevice = async () => {
      // Prefer stored token so an approved device stays recognized
      let fp = localStorage.getItem("iinm_device_token");
      if (!fp) {
        fp = generateDeviceFingerprint();
        localStorage.setItem("iinm_device_token", fp);
      }
      try {
        const res = await fetch(
          `${API_BASE_URL}/device-status?token=${encodeURIComponent(fp)}`
        );
        const data = await res.json();
        if (data.status === "approved") {
          setChecking(false);
        } else if (data.status === "pending" || data.status === "unknown") {
          window.location.href = "/device-request?status=" + data.status;
        } else if (data.status === "rejected") {
          window.location.href = "/device-request?status=rejected";
        } else {
          window.location.href = "/device-request";
        }
      } catch {
        setChecking(false);
      }
    };
    checkDevice();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── On mount: get LIVE location from browser GPS ── */
  useEffect(() => {
    const GMAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    // Primary: Google Maps Geocoding API
    const reverseGeocodeGoogle = async (lat: number, lng: number): Promise<string | null> => {
      if (!GMAPS_KEY) return null;
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GMAPS_KEY}`
        );
        const data = await res.json();
        if (data.status === "OK" && data.results && data.results.length > 0) {
          return data.results[0].formatted_address;
        }
      } catch { /* ignore */ }
      return null;
    };

    // Fallback: OpenStreetMap Nominatim (free, no key needed)
    const reverseGeocodeNominatim = async (lat: number, lng: number): Promise<string | null> => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
          { headers: { "Accept-Language": "en" } }
        );
        const data = await res.json();
        if (data && data.display_name) return data.display_name;
      } catch { /* ignore */ }
      return null;
    };

    // Try Google Maps first, then Nominatim
    const resolveAddress = async (lat: number, lng: number): Promise<string> => {
      const fromGoogle = await reverseGeocodeGoogle(lat, lng);
      if (fromGoogle) return fromGoogle;
      const fromNominatim = await reverseGeocodeNominatim(lat, lng);
      if (fromNominatim) return fromNominatim;
      return "Unknown Location";
    };

    const fetchLiveLocation = () => {
      if (!navigator.geolocation) {
        fallbackToDb();
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const address = await resolveAddress(lat, lng);
            setLocation({
              device_name: "",
              device_model: "",
              location: address,
              lat,
              lng,
              ip_address: "",
              registered_at: null,
            });
          } catch {
            fallbackToDb();
          } finally {
            setLocationLoading(false);
          }
        },
        () => {
          // Permission denied — fallback to DB
          fallbackToDb();
        },
        { timeout: 8000, maximumAge: 0 }
      );
    };

    const fallbackToDb = async () => {
      try {
        const dt = localStorage.getItem("iinm_device_token");
        if (!dt) return;
        const res = await fetch(`${API_BASE_URL}/device-info?token=${encodeURIComponent(dt)}`);
        if (!res.ok) return;
        const data = await res.json();

        let resolvedLocation = data.location;
        const badLocation = !resolvedLocation
          || resolvedLocation === "Unknown Location"
          || resolvedLocation === "Location not provided";

        // Try Google Maps → Nominatim with DB coords
        if (badLocation && data.lat != null && data.lng != null) {
          resolvedLocation = await resolveAddress(data.lat, data.lng);
        }

        setLocation({
          device_name:   data.device_name,
          device_model:  data.device_model,
          location:      resolvedLocation,
          lat:           data.lat,
          lng:           data.lng,
          ip_address:    data.ip_address,
          registered_at: data.registered_at,
        });
      } catch {
        // silently ignore
      } finally {
        setLocationLoading(false);
      }
    };

    fetchLiveLocation();

    // Fetch real public IP separately
    fetch("https://api.ipify.org?format=json")
      .then(r => r.json())
      .then(d => setPublicIp(d.ip))
      .catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(""); setSuccessMsg("");

    // Always recompute fingerprint — no fake fallback token
    const dt = generateDeviceFingerprint();
    localStorage.setItem("iinm_device_token", dt);

    try {
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, device_token: dt }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const detail = data.detail || "";
        if (detail === "device_pending") {
          window.location.href = "/device-request?status=pending"; return;
        }
        if (detail === "unauthorized_device" || detail === "device_rejected") {
          window.location.href = "/device-request"; return;
        }
        throw new Error(detail || `Login failed (${res.status})`);
      }

      const data = await res.json();
      localStorage.setItem("iinm_device_token", data.device_token);
      localStorage.setItem("iinm_is_logged_in", "true");
      // Store 48-hour expiry timestamp
      const expiryMs = Date.now() + 48 * 60 * 60 * 1000;
      localStorage.setItem("iinm_login_expiry", String(expiryMs));
      // Set admin cookie so middleware can bypass maintenance for admins
      document.cookie = "iinm_admin=1; path=/; max-age=172800"; // 48h
      showToast("Signed in successfully! Redirecting…", "success");
      setTimeout(() => { window.location.href = "/admin"; }, 1000);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(msg === "Failed to fetch"
        ? "Cannot connect to server. Make sure the backend is running."
        : msg);
    } finally {
      setLoading(false);
    }
  };

  const brandName = (siteSettings.site_name || "IINM").split("|")[0].trim() || "IINM";
  const logoSrc = siteSettings.logo_url && !logoError ? siteSettings.logo_url : null;
  const toastSuccess = toast.type === "success";

  const ipDisplay = publicIp || location?.ip_address || "";
  const locDisplay =
    location && location.location &&
    location.location !== "Unknown Location" &&
    location.location !== "Location not provided"
      ? location.location
      : "";
  const deviceDisplay =
    [location?.device_name, location?.device_model].filter(Boolean).join(" · ") ||
    "This device";

  const brandLockup = (
    <>
      {logoSrc ? (
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden border border-white/15 bg-white">
          <Image
            src={logoSrc}
            alt={brandName}
            width={40}
            height={40}
            unoptimized
            onError={() => setLogoError(true)}
            className="h-9 w-9 object-contain"
          />
        </span>
      ) : (
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center bg-[#e63946] text-xl font-medium text-white">
          {brandName.charAt(0)}
        </span>
      )}
      <span className="truncate text-lg font-medium tracking-tight text-white">
        {brandName}
      </span>
    </>
  );

  /* ── Loading / checking state ── */
  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center gap-4 text-sm font-medium text-slate-500"
        >
          <Loader2 className="h-10 w-10 animate-spin text-[#0a1628] motion-reduce:animate-none" aria-hidden />
          Verifying security protocols…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-12 lg:bg-white">

      {/* ── Toast — top-right, aria-live ── */}
      {toast.visible && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-4 top-4 z-50 motion-safe:animate-[login-toast-in_0.45s_cubic-bezier(0.16,1,0.3,1)_both] sm:inset-x-auto sm:right-6 sm:top-6 sm:w-96"
        >
          <div
            className={`flex items-start gap-3 border border-white/10 bg-[#0a1628] p-4 shadow-2xl ${
              toastSuccess ? "border-l-4 border-l-emerald-400" : "border-l-4 border-l-amber-400"
            }`}
          >
            <span
              className={`flex h-9 w-9 flex-shrink-0 items-center justify-center ${
                toastSuccess ? "bg-emerald-400/15 text-emerald-400" : "bg-amber-400/15 text-amber-400"
              }`}
            >
              {toastSuccess
                ? <CheckCircle2 className="h-5 w-5" aria-hidden />
                : <ShieldAlert className="h-5 w-5" aria-hidden />}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className={`text-sm font-medium ${toastSuccess ? "text-emerald-300" : "text-amber-300"}`}>
                {toastSuccess ? "Success" : "Already Signed In"}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{toast.msg}</p>
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => setToast({ visible: false, msg: "" })}
              className="-mr-1 -mt-1 flex h-11 w-11 flex-shrink-0 items-center justify-center border-0 bg-transparent text-slate-500 transition-colors hover:bg-white/10 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      )}

      {/* ── Info panel — navy; 8 of 12 columns on desktop ── */}
      <section className="relative overflow-hidden bg-[#0a1628] lg:col-span-8 lg:flex lg:min-h-screen lg:flex-col">
        <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-[#e63946]" />
        <div aria-hidden className="login-grid pointer-events-none absolute inset-0" />

        <header className="relative z-10 flex items-center gap-3 px-5 pt-9 sm:px-8 lg:px-14 lg:pt-10 xl:px-20">
          {brandLockup}
        </header>

        {/* Mobile hero — app-style header block */}
        <div className="relative z-10 px-5 pb-20 pt-10 sm:px-8 lg:hidden">
          <span className="inline-flex items-center gap-2 border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200">
            <ShieldCheck className="h-4 w-4 text-[#e63946]" aria-hidden />
            Device-verified access
          </span>
          <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-white">
            {brandName} Admin Portal
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
            Sign in with your administrator credentials. Every device is fingerprinted and explicitly authorized.
          </p>
        </div>

        {/* Desktop panel content */}
        <div className="relative z-10 hidden flex-1 flex-col justify-center px-14 py-14 lg:flex xl:px-20">
          <span className="inline-flex w-fit items-center gap-2 border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-slate-200">
            <ShieldCheck className="h-4 w-4 text-[#e63946]" aria-hidden />
            Device-verified access
          </span>
          <h1 className="mt-6 max-w-xl text-4xl font-semibold leading-[1.12] tracking-tight text-white xl:text-5xl">
            {brandName} Admin Portal<span className="text-[#e63946]">.</span>
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-400 xl:text-base">
            Manage courses, content, students and site settings from one secure dashboard.
            Access is limited to fingerprinted, explicitly authorized devices.
          </p>

          {/* Capability cards — hairline grid */}
          <div className="mt-12 grid max-w-3xl grid-cols-2 gap-px border border-white/10 bg-white/10">
            {capabilityCards.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-[#0a1628] p-5">
                <span className="flex h-9 w-9 items-center justify-center bg-white/10 text-slate-200">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <p className="mt-3.5 text-sm font-medium text-white">{title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex max-w-3xl flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/10 pt-6 text-xs text-slate-400">
            <span className="flex items-center gap-2">
              <Fingerprint className="h-4 w-4 text-[#e63946]" aria-hidden />
              Hardware fingerprinting
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#e63946]" aria-hidden />
              Geo-verified sign-in
            </span>
            <span className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-[#e63946]" aria-hidden />
              48-hour sessions
            </span>
          </div>
        </div>
      </section>

      {/* ── Login column — 4 of 12 columns on desktop ── */}
      <main className="relative px-4 pb-12 sm:px-6 lg:col-span-4 lg:flex lg:min-h-screen lg:items-center lg:border-l lg:border-slate-200 lg:bg-slate-50 lg:px-8 xl:px-12">
        <div className="mx-auto -mt-12 w-full max-w-md lg:mt-0">

          {/* Login box */}
          <div className="border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5 sm:p-7">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Sign in</h2>
            <p className="mt-1 text-sm text-slate-500">Administrator access only.</p>

            <form onSubmit={handleLogin} className="mt-6 flex flex-col gap-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden />
                  <input
                    id="email"
                    type="email"
                    placeholder="admin@iinm.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className={`${inputCls} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center border-0 bg-transparent text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0a1628]"
                  >
                    {showPassword
                      ? <EyeOff className="h-5 w-5" aria-hidden />
                      : <Eye className="h-5 w-5" aria-hidden />}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 border border-[#e63946]/30 bg-[#e63946]/10 px-4 py-3 text-sm text-[#a82633]"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-1 flex h-12 w-full items-center justify-center gap-2 border-0 bg-[#0a1628] text-sm font-medium text-white transition-colors duration-200 hover:bg-[#12233d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a1628] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                    Authenticating…
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <p className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-400">
              <Fingerprint className="h-4 w-4 flex-shrink-0 text-[#e63946]" aria-hidden />
              Protected by hardware fingerprinting
            </p>
          </div>

          {/* Location box — session context rows */}
          <div className="mt-4 border border-slate-200 bg-white">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center bg-[#e63946]/10 text-[#e63946]">
                <ShieldCheck className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">Session security</p>
                <p className="truncate text-xs text-slate-400">Verified against this device</p>
              </div>
            </div>
            <ul className="divide-y divide-slate-100">
              <li className="flex items-center gap-3 px-5 py-3.5">
                <MapPin className="h-4 w-4 flex-shrink-0 text-slate-400" aria-hidden />
                <span className="w-20 flex-shrink-0 text-xs text-slate-400">Location</span>
                {locationLoading ? (
                  <span className="ml-auto flex items-center gap-2 text-xs text-slate-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    Detecting…
                  </span>
                ) : (
                  <span className="ml-auto truncate text-right text-xs text-slate-700" title={locDisplay || undefined}>
                    {locDisplay || "Unavailable"}
                  </span>
                )}
              </li>
              <li className="flex items-center gap-3 px-5 py-3.5">
                <Globe className="h-4 w-4 flex-shrink-0 text-slate-400" aria-hidden />
                <span className="w-20 flex-shrink-0 text-xs text-slate-400">IP address</span>
                <span className="ml-auto truncate text-right font-mono text-xs text-slate-700">
                  {ipDisplay || "—"}
                </span>
              </li>
              <li className="flex items-center gap-3 px-5 py-3.5">
                <Fingerprint className="h-4 w-4 flex-shrink-0 text-slate-400" aria-hidden />
                <span className="w-20 flex-shrink-0 text-xs text-slate-400">Device</span>
                <span className="ml-auto flex items-center gap-1.5 truncate text-right text-xs text-slate-700">
                  <span className="truncate" title={deviceDisplay}>{deviceDisplay}</span>
                  <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" aria-hidden />
                </span>
              </li>
            </ul>
          </div>

          <p className="mt-5 text-center text-xs text-slate-400">
            Authorized devices only · All sign-ins are logged
          </p>
        </div>
      </main>

      <style>{`
        @keyframes login-toast-in {
          from { transform: translateX(120%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .login-grid {
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
          background-size: 44px 44px;
        }
      `}</style>
    </div>
  );
}
