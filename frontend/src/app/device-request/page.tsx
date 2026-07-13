"use client";
import { useState, useEffect, useCallback } from "react";

/**
 * Generates a stable hardware fingerprint from properties that are IDENTICAL
 * across Chrome, Firefox, and Edge on the same physical machine.
 * Does NOT use user-agent (browser-specific) or canvas/audio (rendering-specific).
 *
 * Properties used:
 *   - screen.width + screen.height + screen.colorDepth  (monitor hardware)
 *   - navigator.hardwareConcurrency                     (CPU core count)
 *   - Intl.DateTimeFormat().resolvedOptions().timeZone  (system timezone)
 *   - navigator.platform                                (OS platform: Win32, MacIntel, etc.)
 */
function generateDeviceFingerprint(): string {
  const screen_w  = typeof screen !== "undefined" ? screen.width : 0;
  const screen_h  = typeof screen !== "undefined" ? screen.height : 0;
  const color_d   = typeof screen !== "undefined" ? screen.colorDepth : 0;
  const cpu_cores = navigator.hardwareConcurrency || 0;
  const timezone  = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  // navigator.platform is deprecated; fallback to userAgentData or userAgent
  let platform = "";
  try {
    platform = (navigator as any).userAgentData?.platform || navigator.platform || "";
  } catch { /* ignore */ }
  if (!platform) {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("win")) platform = "Windows";
    else if (ua.includes("mac")) platform = "MacOS";
    else if (ua.includes("linux")) platform = "Linux";
    else platform = "Unknown";
  }
  // Add some entropy so same-model laptops don't collide
  const lang = navigator.language || "";
  const mem = (navigator as any).deviceMemory || 0;

  const raw = `${screen_w}x${screen_h}x${color_d}|cpu:${cpu_cores}|tz:${timezone}|os:${platform}|lang:${lang}|mem:${mem}`;

  // Simple deterministic hash
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


function getDeviceName(): string {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("iphone")) return "iPhone";
  if (ua.includes("ipad")) return "iPad";
  if (ua.includes("android")) return "Android Device";
  if (ua.includes("macintosh") || ua.includes("mac os x")) return "Mac";
  if (ua.includes("windows")) return "Windows PC";
  if (ua.includes("linux")) return "Linux PC";
  return "Unknown Device";
}

import { API_BASE_URL } from "@/lib/config";
const API = (path: string) => `${API_BASE_URL}${path}`;

/* ──────────────── icons ──────────────── */
const ShieldIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const LocationIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const ClockIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const XIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
);

type Status = "form" | "pending" | "approved" | "rejected";

export default function DeviceRequest() {
  const [status, setStatus]         = useState<Status>("form");
  const [name, setName]             = useState("");
  const [email, setEmail]           = useState("");
  const [phone, setPhone]           = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [location, setLocation]     = useState("Requesting location…");
  const [lat, setLat]               = useState<number | null>(null);
  const [lng, setLng]               = useState<number | null>(null);
  const [fingerprint, setFingerprint] = useState("");
  const [deviceToken, setDeviceToken] = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [locationError, setLocationError] = useState(false);
  const [locationFetching, setLocationFetching] = useState(false);
  const [publicIp, setPublicIp]     = useState("");

  /* ── Init: token (= fingerprint), device name ── */
  useEffect(() => {
    // Fingerprint IS the device token — stable across browsers on same machine
    const fp = generateDeviceFingerprint();
    setFingerprint(fp);
    setDeviceToken(fp);
    localStorage.setItem("iinm_device_token", fp);

    // Auto device name
    setDeviceName(getDeviceName());

    // Check URL for pre-set status
    const params = new URLSearchParams(window.location.search);
    const st = params.get("status");
    if (st === "pending") { setStatus("pending"); setLocation(""); return; }
    if (st === "rejected") { setStatus("rejected"); setLocation(""); return; }

    // Auto-request GPS on load
    requestGPS();

    // Fetch real public IP
    fetch("https://api.ipify.org?format=json")
      .then(r => r.json())
      .then(d => setPublicIp(d.ip || ""))
      .catch(() => {});
  }, []);


  /* ── GPS request (also called by button) ── */
  const requestGPS = () => {
    if (!navigator.geolocation) {
      setLocation("Geolocation not supported by this browser");
      setLocationError(true);
      return;
    }
    setLocation("Requesting your location…");
    setLocationError(false);
    setLocationFetching(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, altitude } = pos.coords;
        setLat(latitude);
        setLng(longitude);
        // Reverse geocode via free Nominatim (no API key needed)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          if (data && data.display_name) {
            const altStr = altitude != null ? ` | Alt: ${altitude.toFixed(1)}m` : "";
            setLocation(`${data.display_name}${altStr}`);
          } else {
            setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          }
        } catch {
          setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        }
        setLocationFetching(false);
      },
      (err) => {
        console.warn("Geolocation denied:", err);
        if (err.code === 1) {
          setLocation("Permission denied — please allow location access in your browser");
        } else if (err.code === 2) {
          setLocation("Position unavailable — check your network/GPS");
        } else {
          setLocation("Location timed out — please try again");
        }
        setLocationError(true);
        setLocationFetching(false);
      },
      { timeout: 15000, enableHighAccuracy: false }
    );
  };

  /* ── Poll device status when in pending state ── */
  const pollStatus = useCallback(async () => {
    const dt = localStorage.getItem("iinm_device_token");
    if (!dt) return;
    try {
      const res = await fetch(API(`/device-status?token=${encodeURIComponent(dt)}`));
      const data = await res.json();
      if (data.status === "approved") {
        setStatus("approved");
        setTimeout(() => { window.location.href = "/"; }, 2500);
      } else if (data.status === "rejected") {
        setStatus("rejected");
      }
    } catch { /* network error, ignore */ }
  }, []);

  useEffect(() => {
    if (status !== "pending") return;
    const interval = setInterval(pollStatus, 8000); // poll every 8 seconds
    return () => clearInterval(interval);
  }, [status, pollStatus]);

  /* ── Submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone || !deviceName) {
      setError("Please fill in all required fields.");
      return;
    }
    if (!lat || !lng) {
      setError("📍 Location is required. Please allow location access and click 'Get Location'.");
      return;
    }
    setLoading(true); setError("");
    try {
      const res = await fetch(API("/request-device"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_token: deviceToken,
          name, email, phone,
          device_name: deviceName,
          lat, lng,
          location,
          ip_address: publicIp,
          user_agent: navigator.userAgent,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        let errorMsg = "Submission failed";
        if (d.detail) {
          if (Array.isArray(d.detail)) {
            errorMsg = d.detail.map((err: any) => `${err.loc?.slice(-1)}: ${err.msg}`).join(", ");
          } else if (typeof d.detail === "string") {
            errorMsg = d.detail;
          } else {
            errorMsg = JSON.stringify(d.detail);
          }
        }
        throw new Error(errorMsg);
      }
      setStatus("pending");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  /* ────────────────────────────────── PENDING SCREEN ── */
  if (status === "pending") {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ color: "#f59e0b", marginBottom: 16 }}><ClockIcon /></div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Request Pending</h2>
          <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.7, textAlign: "center", maxWidth: 320 }}>
            Your device registration request has been submitted.<br />
            Wait for the <strong style={{ color: "#e2e8f0" }}>Device Admin</strong> to approve your device.<br />
            You&apos;ll be automatically redirected once approved.
          </p>
          <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 10, color: "#64748b", fontSize: 13 }}>
            <div style={spinnerSmall} />
            Checking status every 8 seconds…
          </div>
          <button
            onClick={() => { setStatus("form"); }}
            style={{ ...btnOutline, marginTop: 28 }}>
            ← Edit My Request
          </button>
        </div>
        <style>{spinCSS}</style>
      </div>
    );
  }

  /* ────────────────────────────────── APPROVED SCREEN ── */
  if (status === "approved") {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ color: "#22c55e", marginBottom: 16, animation: "pop 0.4s ease" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <polyline points="9 12 11 14 15 10"/>
            </svg>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Device Approved!</h2>
          <p style={{ color: "#94a3b8", fontSize: 14, textAlign: "center" }}>
            Your device has been approved. Redirecting to login…
          </p>
        </div>
        <style>{spinCSS}</style>
      </div>
    );
  }

  /* ────────────────────────────────── REJECTED SCREEN ── */
  if (status === "rejected") {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ color: "#ef4444", marginBottom: 16 }}><XIcon /></div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Access Denied</h2>
          <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.7, textAlign: "center", maxWidth: 300 }}>
            Your device request was rejected by the Admin. Contact your administrator for assistance.
          </p>
          <button
            onClick={() => {
              // Recompute fingerprint — same machine = same token
              const fp = generateDeviceFingerprint();
              localStorage.setItem("iinm_device_token", fp);
              setDeviceToken(fp);
              setStatus("form");
              setName(""); setEmail(""); setPhone("");
            }}
            style={{ ...btnPrimary, marginTop: 28 }}>
            Submit New Request
          </button>
        </div>
        <style>{spinCSS}</style>
      </div>
    );
  }

  /* ────────────────────────────────── FORM SCREEN ── */
  return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, maxWidth: 560, padding: "40px 44px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ color: "#3b82f6" }}><ShieldIcon /></div>
          <span style={{ fontSize: 12, color: "#64748b", letterSpacing: 1, textTransform: "uppercase" }}>
            Device Access Request
          </span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", marginBottom: 6 }}>
          Register Your Device
        </h1>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 28, lineHeight: 1.6 }}>
          Fill in your details to request access. The Admin will review and approve your device.
        </p>

        {/* Location bar */}
        <div style={{ ...locationBar, width: "100%" }}>
          <div style={{ flexShrink: 0, display: "flex" }}><LocationIcon /></div>
          <span style={{ fontSize: 13, color: locationError ? "#f87171" : "#94a3b8", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>
            {location}
          </span>
        </div>

        <form onSubmit={handleSubmit} style={{ width: "100%" }}>
          {/* Row 1 */}
          <div style={formRow}>
            <div style={fieldWrap}>
              <label style={labelStyle}>Full Name <span style={{ color: "#ef4444" }}>*</span></label>
              <input style={inputStyle} placeholder="John Doe" value={name}
                onChange={e => setName(e.target.value)} required />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Phone Number <span style={{ color: "#ef4444" }}>*</span></label>
              <input style={inputStyle} placeholder="+91 9876543210" value={phone}
                onChange={e => setPhone(e.target.value)} required />
            </div>
          </div>

          {/* Row 2 */}
          <div style={formRow}>
            <div style={fieldWrap}>
              <label style={labelStyle}>Email ID <span style={{ color: "#ef4444" }}>*</span></label>
              <input style={inputStyle} type="email" placeholder="you@company.com" value={email}
                onChange={e => setEmail(e.target.value)} required />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Device Name <span style={{ color: "#ef4444" }}>*</span></label>
              <input style={inputStyle} placeholder="Windows PC" value={deviceName}
                onChange={e => setDeviceName(e.target.value)} required />
            </div>
          </div>

          {/* Location (required) */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <LocationIcon />
              Device Location
              <span style={{ color: "#ef4444" }}>*</span>
              <span style={{ color: "#64748b", fontWeight: 400 }}>(GPS — Required)</span>
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{
                ...inputStyle, flex: 1, display: "flex", alignItems: "center", gap: 8,
                border: locationError ? "1px solid #ef4444" : lat && lng ? "1px solid #22c55e" : "1px solid #334155",
                color: locationError ? "#f87171" : lat && lng ? "#86efac" : "#64748b",
                cursor: "default", padding: "11px 14px",
                minWidth: 0
              }}>
                {locationFetching ? (
                  <><div style={spinnerSmall} /><span style={{ fontSize: 13, whiteSpace: "nowrap" }}>Detecting your location…</span></>
                ) : lat && lng ? (
                  <><span style={{ fontSize: 16, flexShrink: 0 }}>✓</span><span style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{location}</span></>
                ) : locationError ? (
                  <><span style={{ flexShrink: 0 }}>⚠</span><span style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{location}</span></>
                ) : (
                  <span style={{ fontSize: 13, color: "#475569", whiteSpace: "nowrap" }}>Requesting location…</span>
                )}
              </div>
              <button
                type="button"
                onClick={requestGPS}
                disabled={locationFetching}
                title="Refresh GPS location"
                style={{
                  background: locationFetching ? "#1e293b" : "#1d4ed8",
                  border: "1px solid #3b82f6", borderRadius: 8,
                  color: locationFetching ? "#475569" : "#fff",
                  padding: "0 16px", cursor: locationFetching ? "not-allowed" : "pointer",
                  fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0,
                  display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s",
                }}
              >
                {locationFetching ? <><div style={spinnerSmall} /> Detecting…</> : <><LocationIcon /> Get Location</>}
              </button>
            </div>
            {lat && lng && (
              <div style={{ fontSize: 11, color: "#4ade80", marginTop: 4 }}>
                ✓ GPS captured: {lat.toFixed(6)}°N, {lng.toFixed(6)}°E
              </div>
            )}
            {!lat && !lng && !locationFetching && !locationError && (
              <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 4 }}>
                ⚠ Location is required to submit this form
              </div>
            )}
          </div>

          {/* Fingerprint */}
          <div style={{ marginBottom: 28, background: "#1e293b", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <div>
              <div style={{ fontSize: 11, color: "#475569", marginBottom: 2 }}>Hardware Fingerprint</div>
              <div style={{ fontSize: 12, color: "#64748b", fontFamily: "monospace" }}>
                {fingerprint || "Generating…"}
              </div>
            </div>
          </div>

          {error && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 16, textAlign: "center" }}>{error}</p>}

          <button type="submit" style={{ ...btnPrimary, width: "100%", justifyContent: "center" }} disabled={loading}>
            {loading ? (
              <><div style={spinnerSmall} /> Submitting…</>
            ) : (
              <><ShieldIcon /> Submit Registration Request</>
            )}
          </button>
        </form>
      </div>
      <style>{spinCSS}</style>
    </div>
  );
}

/* ──────────────────── styles ──────────────────── */
const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: "24px 16px",
  fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
};
const cardStyle: React.CSSProperties = {
  background: "rgba(30, 41, 59, 0.85)",
  backdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 16,
  padding: "48px 36px",
  width: "100%",
  maxWidth: 420,
  display: "flex", flexDirection: "column", alignItems: "center",
  textAlign: "center",
};
const locationBar: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8,
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 8,
  padding: "9px 14px",
  marginBottom: 24,
  color: "#64748b",
};
const formRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16,
  marginBottom: 16,
};
const fieldWrap: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: "#94a3b8", textAlign: "left" };
const inputStyle: React.CSSProperties = {
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 8,
  padding: "11px 14px",
  fontSize: 14,
  color: "#e2e8f0",
  fontFamily: "inherit",
  outline: "none",
  width: "100%",
  transition: "border-color 0.2s",
};
const btnPrimary: React.CSSProperties = {
  background: "#3b82f6",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "13px 28px",
  fontSize: 15,
  fontWeight: 600,
  fontFamily: "inherit",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 10,
  transition: "background 0.2s",
};
const btnOutline: React.CSSProperties = {
  background: "transparent",
  border: "1px solid #334155",
  color: "#94a3b8",
  borderRadius: 8,
  padding: "10px 22px",
  fontSize: 13,
  fontFamily: "inherit",
  cursor: "pointer",
};
const spinnerSmall: React.CSSProperties = {
  width: 16, height: 16,
  border: "2px solid rgba(255,255,255,0.2)",
  borderTopColor: "#fff",
  borderRadius: "50%",
  animation: "spin 0.7s linear infinite",
  flexShrink: 0,
};
const spinCSS = `
  * { box-sizing: border-box; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pop  { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  input:focus { border-color: #3b82f6 !important; }
  input:-webkit-autofill,
  input:-webkit-autofill:hover, 
  input:-webkit-autofill:focus, 
  input:-webkit-autofill:active {
      -webkit-box-shadow: 0 0 0 30px #1e293b inset !important;
      -webkit-text-fill-color: #e2e8f0 !important;
      transition: background-color 5000s ease-in-out 0s;
  }
`;
