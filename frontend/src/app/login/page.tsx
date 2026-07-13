"use client";
import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/config";

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
  const mem = (navigator as any).deviceMemory || 0;

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

const BrainIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
  </svg>
);

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

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [publicIp, setPublicIp] = useState<string | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; msg: string; type?: string }>({ visible: false, msg: "" });
  const [siteSettings, setSiteSettings] = useState<SiteSettingsData>({ site_name: "IINM", logo_url: "" });

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

  /* ── Loading / checking state ── */
  if (checking) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ textAlign: "center", color: "#64748b", fontSize: "14px", fontWeight: "500" }}>
          <div style={{
            width: "40px", height: "40px", border: "3px solid #e2e8f0",
            borderTopColor: "#2baee0", borderRadius: "50%",
            animation: "spin 0.8s linear infinite", margin: "0 auto 16px"
          }} />
          Verifying security protocols…
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ── Login form with Premium Split Layout ── */
  return (
    <div className="login-container">

      {/* Left Side: The Form Area */}
      <div className="login-form-side">

        {/* ── Toast inside white panel, top-right ── */}
        {toast.visible && (
          <div className={`auth-toast auth-toast--${toast.type || "warning"}`}>
            <div className="auth-toast-icon">
              {toast.type === "success" ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              )}
            </div>
            <div className="auth-toast-body">
              <div className="auth-toast-title">
                {toast.type === "success" ? "Success" : "Already Signed In"}
              </div>
              <div className="auth-toast-msg">{toast.msg}</div>
            </div>
            <button className="auth-toast-close" onClick={() => setToast({ visible: false, msg: "" })}>✕</button>
          </div>
        )}
        {/* Top left brand logo */}
        <div className="login-brand">
          <div className="logo-icon-small">
            {siteSettings.logo_url ? (
              <img
                src={siteSettings.logo_url}
                alt={siteSettings.site_name}
              />
            ) : (
              <BrainIcon />
            )}
          </div>
          <span className="brand-text">{siteSettings.site_name || "IINM"}</span>
        </div>

        <div className="login-form-wrapper">
          <div className="login-header">
            <h1 className="login-title">IINM Administrator Portal</h1>
            {/* <p className="login-subtitle">Enter your details to access the admin portal.</p> */}
          </div>

          <form onSubmit={handleLogin} className="login-form">

            {/* Email — floating label */}
            <div className="float-group">
              <input
                id="email"
                type="email"
                placeholder="admin@iinm.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <label htmlFor="email">Email Address</label>
            </div>

            {/* Password — floating label + forgot link */}
            <div className="float-group">
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <label htmlFor="password">Password</label>
              <a href="#" className="forgot-link float-forgot">Forgot password?</a>
            </div>

            {error && <div className="error-banner">{error}</div>}

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Authenticating…" : "Sign In"}
            </button>

            {/* ── Location Info Card (from DB) ── */}
            <div className="location-card">
              {locationLoading ? (
                <div className="location-loading">
                  <div className="location-spinner" />
                  <span>Loading location…</span>
                </div>
              ) : location ? (
                <>
                  {location.location && location.location !== "Unknown Location" && location.location !== "Location not provided" && (
                    <div className="location-name">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',marginRight:'5px',verticalAlign:'middle',flexShrink:0}}>
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                      {location.location}
                    </div>
                  )}
                  <div className="location-coords">
                    {location.lat !== null && location.lng !== null && (
                      <span>📍 {location.lat?.toFixed(4)}°, {location.lng?.toFixed(4)}°</span>
                    )}
                    <span className="location-ip">IP: {publicIp || location.ip_address}</span>
                  </div>
                </>
              ) : (
                <div className="location-unavailable">No location data</div>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Right Side: The Premium Visual Area */}
      <div className="login-visual-side">
        <div className="visual-content">
          <div className="visual-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            Zero-Trust Network
          </div>
          <h2 className="visual-title">Secure Admin Portal</h2>
          <p className="visual-subtitle">
            Manage your entire learning platform from our unified, highly secure dashboard. All device access is strictly monitored and authorized.
          </p>

          <div className="abstract-ui">
            <div className="ui-header" />
            <div className="ui-row">
              <div className="ui-card flex-1" />
              <div className="ui-card flex-1" />
              <div className="ui-card flex-2" />
            </div>
            <div className="ui-row">
              <div className="ui-card flex-full height-tall" />
            </div>
          </div>
        </div>

        <div className="glass-orb orb-1"></div>
        <div className="glass-orb orb-2"></div>
      </div>

      <style>{`
        .login-container {
          display: flex;
          min-height: 100vh;
          font-family: 'Inter', system-ui, sans-serif;
          background-color: #ffffff;
        }

        .login-form-side {
          flex: 0 0 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
          position: relative;
        }

        .login-brand {
          position: absolute;
          top: 30px;
          left: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .logo-icon-small {
          width: 52px; height: 52px; border-radius: 12px;
          background-color: #f0f9ff; color: #0284c7;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
        }
        .logo-icon-small img {
          width: 100%; height: 100%; object-fit: contain;
        }
        .logo-icon-small svg {
          width: 32px; height: 32px;
        }
        .brand-text {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: 0.5px;
        }

        @media(min-width: 1024px) {
          .login-form-side {
            flex: 0 0 40%;
            padding: 0 60px;
          }
          .login-brand {
            top: 40px;
            left: 60px;
          }
        }
        .login-form-wrapper {
          width: 100%;
          max-width: 400px;
        }
        
        .login-header { margin-bottom: 40px; }
        .login-title {
          margin: 0; font-size: 32px; font-weight: 800;
          color: #0f172a; letter-spacing: -0.5px;
        }
        .login-subtitle { margin: 8px 0 0 0; font-size: 15px; color: #64748b; }

        .login-form { display: flex; flex-direction: column; gap: 28px; }

        /* ── Floating Label ── */
        .float-group {
          position: relative;
          width: 100%;
        }

        .float-group input {
          width: 100%;
          padding: 14px 16px;
          border-radius: 10px;
          border: 1.5px solid #e2e8f0;
          background-color: #ffffff;
          font-size: 14px;
          color: #0f172a;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          box-sizing: border-box;
          font-family: inherit;
        }

        .float-group input::placeholder {
          color: transparent;
        }

        .float-group input:focus::placeholder {
          color: #94a3b8;
        }

        .float-group label {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 14px;
          color: #94a3b8;
          font-weight: 400;
          pointer-events: none;
          transition: all 0.2s cubic-bezier(.4,0,.2,1);
          background: transparent;
          z-index: 1;
        }

        /* Float label up when focused or has value */
        .float-group input:focus ~ label,
        .float-group input:not(:placeholder-shown) ~ label {
          top: -9px;
          transform: none;
          font-size: 11px;
          font-weight: 600;
          color: #0284c7;
          background: #fff;
          padding: 0 4px;
          letter-spacing: 0.3px;
        }

        .float-group input:not(:placeholder-shown):not(:focus) ~ label {
          color: #64748b;
        }

        .float-group input:focus {
          border-color: #0284c7;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
        }

        /* Forgot link floated in the password group */
        .float-forgot {
          position: absolute;
          right: 0;
          top: -22px;
          font-size: 12px;
          color: #0284c7;
          text-decoration: none;
          font-weight: 600;
        }
        .float-forgot:hover { text-decoration: underline; }
        .forgot-link { font-size: 13px; color: #0284c7; text-decoration: none; font-weight: 600; }
        .forgot-link:hover { text-decoration: underline; }

        .login-button {
          width: 100%; padding: 14px; border-radius: 0;
          background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
          color: white; font-size: 16px; font-weight: 600;
          border: none; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; margin-top: 4px;
        }
        .login-button:hover:not(:disabled) {
          transform: translateY(-2px); box-shadow: 0 8px 20px rgba(2, 132, 199, 0.3);
        }
        .login-button:disabled { opacity: 0.7; cursor: not-allowed; }


        /* Location card */
        .location-card {
          margin-top: 4px;
          padding: 14px 16px;
          border-radius: 12px;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border: 1px solid #bae6fd;
          font-size: 13px;
        }
        .location-card-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 700;
          color: #0369a1;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-size: 11px;
        }
        .location-loading {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #64748b;
          font-size: 13px;
        }
        .location-spinner {
          width: 14px; height: 14px;
          border: 2px solid #bae6fd;
          border-top-color: #0284c7;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          flex-shrink: 0;
        }
        .location-details { display: flex; flex-direction: column; gap: 4px; }
        .location-main { font-size: 15px; font-weight: 700; color: #0f172a; }
        .location-sub { font-size: 13px; color: #475569; font-weight: 500; }
        .location-coords {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 6px;
          padding-top: 6px;
          border-top: 1px solid #bae6fd;
          color: #64748b;
          font-size: 11px;
          flex-wrap: wrap;
          gap: 4px;
        }
        .location-ip {
          background: #dbeafe;
          color: #1d4ed8;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
          font-family: monospace;
        }
        .location-unavailable { color: #94a3b8; font-style: italic; font-size: 13px; }
        .location-name {
          font-size: 13px;
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 8px;
          line-height: 1.5;
          display: flex;
          align-items: flex-start;
          gap: 2px;
        }
        .location-address {
          font-size: 12px;
          color: #334155;
          margin-top: 4px;
          line-height: 1.5;
          background: rgba(255,255,255,0.6);
          padding: 5px 8px;
          border-radius: 6px;
          border: 1px solid #e0f2fe;
        }
        .location-reg-date {
          font-size: 10px;
          color: #94a3b8;
          margin-top: 4px;
          padding-top: 4px;
          border-top: 1px dashed #bae6fd;
        }

        .error-banner {
          padding: 12px; border-radius: 8px; background-color: #fef2f2;
          color: #b91c1c; font-size: 14px; font-weight: 500; border: 1px solid #fecaca;
        }
        .success-banner {
          padding: 12px; border-radius: 8px; background-color: #f0fdf4;
          color: #15803d; font-size: 14px; font-weight: 500; border: 1px solid #bbf7d0;
        }

        .login-visual-side {
          display: none; position: relative; background-color: #0f172a; overflow: hidden;
        }
        @media(min-width: 1024px) {
          .login-visual-side { display: flex; flex: 1; align-items: center; justify-content: center; padding: 60px; }
        }

        .visual-content { position: relative; z-index: 10; max-width: 600px; color: white; }
        
        .visual-badge {
          display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px;
          background-color: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 100px;
          font-size: 13px; font-weight: 600; color: #bae6fd; margin-bottom: 24px;
        }
        
        .visual-title { font-size: 48px; font-weight: 800; margin: 0 0 16px 0; letter-spacing: -1px; line-height: 1.1; }
        .visual-subtitle { font-size: 18px; color: #94a3b8; line-height: 1.6; margin: 0 0 40px 0; }

        .abstract-ui {
          width: 100%; background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; padding: 24px;
          display: flex; flex-direction: column; gap: 16px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .ui-header { width: 30%; height: 16px; border-radius: 4px; background: rgba(255, 255, 255, 0.15); }
        .ui-row { display: flex; gap: 16px; }
        .ui-card { height: 80px; border-radius: 12px; background: rgba(255, 255, 255, 0.08); }
        .ui-card.flex-1 { flex: 1; } .ui-card.flex-2 { flex: 2; }
        .ui-card.flex-full { flex: 1; } .ui-card.height-tall { height: 160px; }

        .glass-orb { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.5; z-index: 1; }
        .orb-1 { width: 400px; height: 400px; background-color: #0284c7; top: -100px; right: -100px; }
        .orb-2 { width: 500px; height: 500px; background-color: #3b82f6; bottom: -200px; left: -100px; opacity: 0.3; }

        /* ── Auth Toast ── */
        @keyframes toastSlideIn {
          from { transform: translateX(120%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .auth-toast {
          position: absolute;
          top: 20px;
          right: 20px;
          z-index: 9999;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: #0f172a;
          color: #f1f5f9;
          border: 1px solid #1e293b;
          border-left: 4px solid #f59e0b;
          border-radius: 12px;
          padding: 14px 16px;
          max-width: 360px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
          animation: toastSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .auth-toast--success {
          border-left-color: #22c55e;
        }
        .auth-toast--success .auth-toast-icon {
          background: rgba(34, 197, 94, 0.15);
          color: #22c55e;
        }
        .auth-toast--success .auth-toast-title {
          color: #4ade80;
        }
        .auth-toast--warning {
        }
        .auth-toast-icon {
          flex-shrink: 0;
          width: 32px; height: 32px;
          background: rgba(245, 158, 11, 0.15);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          color: #f59e0b;
        }
        .auth-toast--warning .auth-toast-icon {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
        }
        .auth-toast-body { flex: 1; }
        .auth-toast-title {
          font-size: 13px;
          font-weight: 700;
          color: #fbbf24;
          margin-bottom: 3px;
        }
        .auth-toast-msg {
          font-size: 12px;
          color: #94a3b8;
          line-height: 1.5;
        }
        .auth-toast-close {
          background: none; border: none; cursor: pointer;
          color: #475569; font-size: 13px; padding: 0;
          flex-shrink: 0; line-height: 1;
        }
        .auth-toast-close:hover { color: #f1f5f9; }
      `}</style>
    </div>
  );
}
