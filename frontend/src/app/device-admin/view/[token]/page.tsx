"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/config";

// --- API Helper ---
const API = (path: string) => `${API_BASE_URL}${path}`;

export default function DeviceView() {
  const { token } = useParams() as { token: string };
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const adminToken = localStorage.getItem("device_admin_token");
    if (!adminToken) {
      router.push("/device-admin");
      return;
    }

    const fetchDetail = async () => {
      try {
        const res = await fetch(API(`/device-admin/session-by-token/${token}`), {
          headers: { "Authorization": `Bearer ${adminToken}` },
        });
        if (!res.ok) {
          if (res.status === 401) router.push("/device-admin");
          throw new Error("Failed to fetch session details or session not found.");
        }
        const data = await res.json();
        setSession(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchDetail();
  }, [token, router]);

  if (loading) {
    return <div style={{ minHeight: "100vh", backgroundColor: "#0b1120", color: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading details...</div>;
  }

  if (error || !session) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#0b1120", color: "#f1f5f9", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
        <h2 style={{ color: "#ef4444" }}>Error</h2>
        <p>{error || "Session not found."}</p>
        <button onClick={() => window.close()} style={{ padding: "8px 16px", background: "#1e293b", border: "1px solid #334155", color: "#fff", borderRadius: "6px", cursor: "pointer" }}>Close Window</button>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "#22c55e";
      case "rejected": return "#ef4444";
      default: return "#eab308";
    }
  };

  return (
    <div className="dv-container">
      <header className="dv-header">
        <div className="dv-title">
          <h2>Device Registration Request</h2>
          <span className="dv-badge" style={{ borderColor: getStatusColor(session.status), color: getStatusColor(session.status), background: `${getStatusColor(session.status)}1a` }}>
            <span className="dv-dot" style={{ backgroundColor: getStatusColor(session.status) }}></span>
            {session.status.toUpperCase()}
          </span>
        </div>
        <button className="dv-btn-close" onClick={() => window.close()}>Close</button>
      </header>

      <main className="dv-main">
        <div className="dv-grid">
          {/* Section: User Information */}
          <section className="dv-section">
            <h3>User Information</h3>
            <div className="dv-field">
              <label>Full Name</label>
              <div className="dv-value">{session.requester_name || "N/A"}</div>
            </div>
            <div className="dv-field">
              <label>Email Address</label>
              <div className="dv-value">{session.requester_email || "N/A"}</div>
            </div>
            <div className="dv-field">
              <label>Phone Number</label>
              <div className="dv-value">{session.requester_phone || "N/A"}</div>
            </div>
            <div className="dv-field">
              <label>Purpose</label>
              <div className="dv-value">{session.purpose || "N/A"}</div>
            </div>
          </section>

          {/* Section: Device Information */}
          <section className="dv-section">
            <h3>Device Information</h3>
            <div className="dv-field">
              <label>Device Name (User Input)</label>
              <div className="dv-value">{session.device_name || "N/A"}</div>
            </div>
            <div className="dv-field">
              <label>Device Model (User Agent)</label>
              <div className="dv-value">{session.device_model || "N/A"}</div>
            </div>
            <div className="dv-field">
              <label>Device Token (Hardware ID)</label>
              <div className="dv-value" style={{ fontFamily: "monospace", fontSize: "13px", wordBreak: "break-all" }}>
                {session.device_token}
              </div>
            </div>
            <div className="dv-field">
              <label>Registration Date</label>
              <div className="dv-value">
                {session.created_at ? new Date(session.created_at).toLocaleString() : "Unknown"}
              </div>
            </div>
          </section>

          {/* Section: Network & Location */}
          <section className="dv-section" style={{ gridColumn: "1 / -1" }}>
            <h3>Network & Location Data</h3>
            <div className="dv-grid-inner">
              <div className="dv-field">
                <label>Public IP Address</label>
                <div className="dv-value" style={{ fontFamily: "monospace", color: "#60a5fa" }}>{session.ip_address || "Unknown"}</div>
              </div>
              <div className="dv-field">
                <label>GPS Coordinates</label>
                <div className="dv-value" style={{ fontFamily: "monospace" }}>
                  {session.lat && session.lng ? `${session.lat}, ${session.lng}` : "Not captured"}
                </div>
              </div>
              <div className="dv-field" style={{ gridColumn: "1 / -1" }}>
                <label>Physical Address (Reverse Geocoded)</label>
                <div className="dv-value" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{session.location || "Unknown"}</span>
                  {session.lat && session.lng && (
                    <a href={`https://www.google.com/maps/search/?api=1&query=${session.lat},${session.lng}`} target="_blank" rel="noreferrer" className="dv-map-link">
                      View on Google Maps ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <style>{`
        .dv-container { min-height: 100vh; background: #0b1120; font-family: 'Inter', sans-serif; color: #f1f5f9; padding: 40px 20px; }
        .dv-header { max-width: 900px; margin: 0 auto 30px; display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 20px; border-bottom: 1px solid #1e293b; }
        .dv-title h2 { margin: 0 0 10px 0; font-size: 24px; font-weight: 600; }
        .dv-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; border: 1px solid; }
        .dv-dot { width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 5px currentColor; }
        .dv-btn-close { background: #1e293b; border: 1px solid #334155; color: #cbd5e1; padding: 8px 16px; border-radius: 6px; font-size: 14px; cursor: pointer; transition: 0.2s; }
        .dv-btn-close:hover { background: #334155; color: #fff; }

        .dv-main { max-width: 900px; margin: 0 auto; }
        .dv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .dv-grid-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        
        .dv-section { background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
        .dv-section h3 { margin: 0 0 20px 0; font-size: 16px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #1e293b; padding-bottom: 10px; }
        
        .dv-field { margin-bottom: 16px; }
        .dv-field:last-child { margin-bottom: 0; }
        .dv-field label { display: block; font-size: 12px; color: #64748b; margin-bottom: 6px; font-weight: 500; }
        .dv-field .dv-value { font-size: 15px; color: #f8fafc; background: #1e293b; padding: 12px 16px; border-radius: 8px; border: 1px solid #334155; line-height: 1.5; }

        .dv-map-link { display: inline-flex; align-items: center; justify-content: center; background: #2563eb; color: #fff; text-decoration: none; padding: 8px 16px; font-size: 13px; font-weight: 500; border-radius: 6px; transition: 0.2s; white-space: nowrap; }
        .dv-map-link:hover { background: #1d4ed8; }
      `}</style>
    </div>
  );
}
