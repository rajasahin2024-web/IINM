"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/config";

// --- API Helper ---
const API = (path: string) => `${API_BASE_URL}${path}`;

// --- Icons ---
const ShieldIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);
const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);
const LoginArrowIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
  </svg>
);
const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
  </svg>
);
const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const MapIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
  </svg>
);

// --- Login View ---
function DeviceAdminLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API("/device-admin/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Login failed");
      onLogin(data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="da-login-container">
      <div className="da-login-header">
        <div className="da-login-icon">
          <ShieldIcon />
        </div>
        <h1>Device Admin Panel</h1>
        <p>Approve or reject device registration requests</p>
      </div>

      <div className="da-login-card">
        <form onSubmit={handleSubmit}>
          <div className="da-form-group">
            <label>Admin Email</label>
            <div className="da-input-wrapper">
              <span className="da-input-icon"><MailIcon /></span>
              <input type="email" placeholder="deviceadmin@gmail.com" required value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="da-form-group">
            <label>Password</label>
            <div className="da-input-wrapper">
              <span className="da-input-icon"><LockIcon /></span>
              <input type={showPwd ? "text" : "password"} placeholder="••••••••" required value={password} onChange={e => setPassword(e.target.value)} />
              <button type="button" className="da-pwd-toggle" onClick={() => setShowPwd(!showPwd)}>
                {showPwd ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {error && <div className="da-error">{error}</div>}

          <button type="submit" className="da-submit-btn" disabled={loading}>
            <LoginArrowIcon /> {loading ? "Signing in..." : "Sign In to Device Panel"}
          </button>
        </form>
        <div className="da-login-footer">
          Default: deviceadmin@gmail.com / admin123
        </div>
      </div>

      <style>{`
        .da-login-container { min-height: 100vh; background: #0b1120; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: 'Inter', sans-serif; color: #f1f5f9; }
        .da-login-header { text-align: center; margin-bottom: 32px; }
        .da-login-icon { background: #3b82f6; width: 64px; height: 64px; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; box-shadow: 0 0 20px rgba(59, 130, 246, 0.4); }
        .da-login-header h1 { font-size: 28px; font-weight: 700; margin: 0 0 8px; }
        .da-login-header p { color: #94a3b8; font-size: 15px; margin: 0; }
        .da-login-card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 40px; width: 100%; max-width: 440px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
        .da-form-group { margin-bottom: 24px; text-align: left; }
        .da-form-group label { display: block; font-size: 13px; color: #cbd5e1; margin-bottom: 8px; font-weight: 500; }
        .da-input-wrapper { position: relative; display: flex; align-items: center; }
        .da-input-icon { position: absolute; left: 14px; color: #64748b; display: flex; }
        .da-input-wrapper input { width: 100%; background: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 14px 14px 14px 44px; color: #f1f5f9; font-size: 15px; outline: none; transition: border 0.2s; }
        .da-input-wrapper input:focus { border-color: #3b82f6; }
        .da-pwd-toggle { position: absolute; right: 14px; background: none; border: none; color: #64748b; cursor: pointer; display: flex; padding: 0; }
        .da-pwd-toggle:hover { color: #94a3b8; }
        .da-error { color: #f87171; font-size: 13px; margin-bottom: 16px; text-align: center; }
        .da-submit-btn { width: 100%; background: #2563eb; color: #fff; border: none; border-radius: 10px; padding: 14px; font-size: 16px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: background 0.2s; }
        .da-submit-btn:hover { background: #1d4ed8; }
        .da-submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .da-login-footer { margin-top: 32px; text-align: center; font-size: 12px; color: #64748b; }
      `}</style>
    </div>
  );
}

// --- Dashboard View ---
function DeviceAdminDashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API("/device-admin/sessions"), {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 401) {
          // Token expired (server restarted) — silently log out, no error overlay
          onLogout();
          return;
        }
        throw new Error(`Server error: ${res.status}`);
      }
      const data = await res.json();
      setSessions(data);
    } catch (err: any) {
      // Only log non-auth errors so the console is not flooded on normal logouts
      if (!err.message?.includes("401")) {
        console.error("fetchSessions error:", err);
      }
    } finally {
      setLoading(false);
    }
  }, [token, onLogout]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleAction = async (id: number, action: "approve" | "reject" | "revoke") => {
    try {
      const res = await fetch(API(`/device-admin/${action}/${id}`), {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (res.ok) fetchSessions();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Permanently delete this rejected device? This cannot be undone.")) return;
    try {
      const res = await fetch(API(`/device-admin/delete/${id}`), {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (res.ok) fetchSessions();
    } catch (err) { console.error(err); }
  };

  const filteredSessions = sessions.filter(s => {
    if (filter !== "All" && filter.toLowerCase() !== s.status) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.requester_name?.toLowerCase().includes(q) ||
        s.requester_email?.toLowerCase().includes(q) ||
        s.device_name?.toLowerCase().includes(q) ||
        s.location?.toLowerCase().includes(q) ||
        s.ip_address?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Reset to page 1 when filter/search changes
  useEffect(() => { setPage(1); }, [filter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / PAGE_SIZE));
  const paginated = filteredSessions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const count = (f: string) =>
    f === "All" ? sessions.length : sessions.filter(s => s.status === f.toLowerCase()).length;

  return (
    <div className="da-dash-container">
      {/* Header */}
      <header className="da-header">
        <div className="da-header-left">
          <div className="da-header-icon"><ShieldIcon /></div>
          <div>
            <h2>Device Admin Panel</h2>
            <p>IINM Device Management</p>
          </div>
        </div>
        <div className="da-header-right">
          <button className="da-btn da-btn-outline" onClick={fetchSessions}><RefreshIcon /> Refresh</button>
          <button className="da-btn da-btn-outline" onClick={onLogout}><LogoutIcon /> Logout</button>
        </div>
      </header>

      <main className="da-main">
        {/* Analytics Cards */}
        <div className="da-cards">
          <div className="da-card" style={{ borderColor: "#1e3a8a" }}>
            <div className="da-card-title">Total</div>
            <div className="da-card-value" style={{ color: "#3b82f6" }}>{count("All")}</div>
          </div>
          <div className="da-card" style={{ borderColor: "#422006" }}>
            <div className="da-card-title">Pending</div>
            <div className="da-card-value" style={{ color: "#eab308" }}>{count("Pending")}</div>
          </div>
          <div className="da-card" style={{ borderColor: "#064e3b" }}>
            <div className="da-card-title">Approved</div>
            <div className="da-card-value" style={{ color: "#22c55e" }}>{count("Approved")}</div>
          </div>
          <div className="da-card" style={{ borderColor: "#450a0a" }}>
            <div className="da-card-title">Rejected</div>
            <div className="da-card-value" style={{ color: "#ef4444" }}>{count("Rejected")}</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="da-toolbar">
          <div className="da-search">
            <SearchIcon />
            <input type="text" placeholder="Search name, email, device, location..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="da-filters">
            {["All", "Pending", "Approved", "Rejected"].map(f => (
              <button key={f} className={`da-filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="da-table-wrapper">
          <table className="da-table">
            <thead>
              <tr>
                <th>REQUESTER</th>
                <th>DEVICE</th>
                <th>LOCATION & IP</th>
                <th>STATUS</th>
                <th>DATE</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Loading sessions...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>No requests found.</td></tr>
              ) : (
                paginated.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div className="da-user-cell">
                        <div className="da-avatar" style={{ backgroundColor: s.status === 'rejected' ? '#7f1d1d' : s.status === 'approved' ? '#064e3b' : '#1e3a8a' }}>
                          {s.requester_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="da-fw-600">{s.requester_name || 'Unknown'}</div>
                          <div className="da-subtext"><MailIcon /> {s.requester_email || 'No email'}</div>
                          <div className="da-subtext">📞 {s.requester_phone || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="da-fw-600">{s.device_name || 'Unknown'}</div>
                      <div className="da-subtext" style={{ fontSize: 11, marginTop: 2 }}>{s.device_model || '—'}</div>
                      <div className="da-detail-chip" title={s.device_token}>
                        🔑 {s.device_token?.slice(0, 14)}…
                      </div>
                    </td>
                    <td>
                      <div style={{ maxWidth: "260px" }}>
                        {s.location && s.location !== "Unknown Location" && s.location !== "Location not provided" ? (
                          <div className="da-location-name">
                            📍 {s.location}
                          </div>
                        ) : (
                          <div className="da-subtext" style={{ fontStyle: "italic" }}>No location stored</div>
                        )}
                        {s.lat && s.lng && (
                          <div className="da-coords">
                            🌐 {parseFloat(s.lat).toFixed(5)}°N, {parseFloat(s.lng).toFixed(5)}°E
                          </div>
                        )}
                        <div className="da-ip-chip">IP: {s.ip_address || 'Unknown'}</div>
                        {s.lat && s.lng && (
                          <a href={`https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`} target="_blank" rel="noreferrer" className="da-link">
                            View Map <MapIcon />
                          </a>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`da-status-badge da-status-${s.status}`}>
                        <span className="da-dot"></span>
                        {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                      </span>
                    </td>
                    <td>
                      <div className="da-subtext" style={{ fontSize: 12 }}>{new Date(s.created_at).toLocaleString()}</div>
                    </td>
                    <td>
                      <div className="da-actions">
                        {s.status === 'pending' && (
                          <>
                            <button className="da-btn-action da-btn-approve" onClick={() => handleAction(s.id, 'approve')}>✓ Approve</button>
                            <button className="da-btn-action da-btn-reject" onClick={() => handleAction(s.id, 'reject')}>✗ Reject</button>
                          </>
                        )}
                        {s.status === 'approved' && (
                          <button className="da-btn-action da-btn-revoke" onClick={() => handleAction(s.id, 'revoke')}>⊘ Revoke</button>
                        )}
                        {s.status === 'rejected' && (
                          <>
                            <button className="da-btn-action da-btn-approve" onClick={() => handleAction(s.id, 'approve')}>✓ Approve</button>
                            <button className="da-btn-action da-btn-delete" onClick={() => handleDelete(s.id)}>🗑 Delete</button>
                          </>
                        )}
                        <Link href={`/device-admin/view/${encodeURIComponent(s.device_token)}`} target="_blank">
                          <button className="da-btn-action da-btn-view">👁 View Details</button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {filteredSessions.length > 0 && (
            <div className="da-pagination">
              <span className="da-page-info">
                Showing {Math.min((page - 1) * PAGE_SIZE + 1, filteredSessions.length)}–{Math.min(page * PAGE_SIZE, filteredSessions.length)} of {filteredSessions.length}
              </span>
              <div className="da-page-controls">
                <button className="da-page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} className={`da-page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                ))}
                <button className="da-page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            </div>
          )}
        </div>
      </main>

      <style>{`
        .da-dash-container { min-height: 100vh; background: #0b1120; font-family: 'Inter', sans-serif; color: #f1f5f9; }
        .da-header { background: #1e293b; border-bottom: 1px solid #334155; padding: 16px 32px; display: flex; justify-content: space-between; align-items: center; }
        .da-header-left { display: flex; align-items: center; gap: 16px; }
        .da-header-icon { background: #3b82f6; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
        .da-header-left h2 { margin: 0; font-size: 18px; font-weight: 600; }
        .da-header-left p { margin: 0; font-size: 12px; color: #94a3b8; }
        .da-header-right { display: flex; gap: 12px; }
        .da-btn { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; border-radius: 6px; padding: 8px 16px; cursor: pointer; transition: all 0.2s; }
        .da-btn-outline { background: #0f172a; border: 1px solid #334155; color: #cbd5e1; }
        .da-btn-outline:hover { background: #1e293b; border-color: #475569; }

        .da-main { padding: 32px; max-width: 1500px; margin: 0 auto; }

        .da-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-bottom: 32px; }
        .da-card { background: #1e293b; border-top: 3px solid; border-radius: 12px; padding: 24px; }
        .da-card-title { font-size: 14px; color: #94a3b8; margin-bottom: 12px; }
        .da-card-value { font-size: 32px; font-weight: 700; }

        .da-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; background: #1e293b; padding: 12px 24px; border-radius: 12px; border: 1px solid #334155; }
        .da-search { display: flex; align-items: center; gap: 10px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 8px 16px; width: 360px; }
        .da-search input { background: transparent; border: none; color: #f1f5f9; outline: none; width: 100%; font-size: 14px; }
        .da-search input::placeholder { color: #64748b; }

        .da-filters { display: flex; gap: 8px; }
        .da-filter-btn { background: #0f172a; border: 1px solid #334155; color: #94a3b8; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .da-filter-btn.active { background: #3b82f6; border-color: #3b82f6; color: #fff; }

        .da-table-wrapper { background: #1e293b; border-radius: 12px; border: 1px solid #334155; overflow: hidden; }
        .da-table { width: 100%; border-collapse: collapse; text-align: left; }
        .da-table th { background: #0f172a; color: #64748b; font-size: 11px; font-weight: 600; padding: 14px 20px; letter-spacing: 0.5px; border-bottom: 1px solid #334155; }
        .da-table td { padding: 16px 20px; border-bottom: 1px solid #1e2d45; vertical-align: top; }
        .da-table tr:last-child td { border-bottom: none; }
        .da-table tr:hover td { background: #1a2740; }

        .da-user-cell { display: flex; gap: 12px; }
        .da-avatar { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px; flex-shrink: 0; }
        .da-fw-600 { font-weight: 600; margin-bottom: 3px; font-size: 14px; color: #f1f5f9; }
        .da-subtext { font-size: 12px; color: #94a3b8; display: flex; align-items: center; gap: 5px; margin-bottom: 3px; }
        .da-detail-chip { font-size: 11px; color: #475569; font-family: monospace; margin-top: 4px; background: #0f172a; padding: 2px 6px; border-radius: 4px; display: inline-block; }

        .da-location-name { font-size: 12px; color: #cbd5e1; line-height: 1.5; margin-bottom: 4px; }
        .da-coords { font-size: 11px; color: #64748b; margin-bottom: 4px; font-family: monospace; }
        .da-ip-chip { display: inline-block; font-size: 11px; font-family: monospace; font-weight: 600; color: #60a5fa; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 4px; padding: 1px 7px; margin-bottom: 4px; }
        .da-link { display: inline-flex; align-items: center; gap: 4px; color: #3b82f6; text-decoration: none; font-size: 11px; font-weight: 500; transition: color 0.2s; }
        .da-link:hover { color: #60a5fa; text-decoration: underline; }

        .da-status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
        .da-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .da-status-pending { background: rgba(234, 179, 8, 0.1); color: #fde047; border: 1px solid rgba(234, 179, 8, 0.2); }
        .da-status-pending .da-dot { background: #facc15; box-shadow: 0 0 5px #facc15; }
        .da-status-approved { background: rgba(34, 197, 94, 0.1); color: #86efac; border: 1px solid rgba(34, 197, 94, 0.2); }
        .da-status-approved .da-dot { background: #4ade80; box-shadow: 0 0 5px #4ade80; }
        .da-status-rejected { background: rgba(239, 68, 68, 0.1); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.2); }
        .da-status-rejected .da-dot { background: #f87171; box-shadow: 0 0 5px #f87171; }

        .da-actions { display: flex; flex-direction: column; gap: 6px; min-width: 100px; }
        .da-btn-action { background: transparent; border: 1px solid #334155; border-radius: 5px; padding: 5px 10px; font-size: 12px; font-weight: 500; color: #cbd5e1; cursor: pointer; transition: all 0.2s; text-align: left; }
        .da-btn-approve:hover { background: rgba(34, 197, 94, 0.1); border-color: #22c55e; color: #4ade80; }
        .da-btn-reject:hover { background: rgba(239, 68, 68, 0.1); border-color: #ef4444; color: #f87171; }
        .da-btn-revoke:hover { background: rgba(245, 158, 11, 0.1); border-color: #f59e0b; color: #fbbf24; }
        .da-btn-delete { border-color: #7f1d1d; color: #fca5a5; }
        .da-btn-delete:hover { background: rgba(239, 68, 68, 0.15); border-color: #ef4444; color: #f87171; }
        .da-btn-view { border-color: #1e3a8a; color: #60a5fa; width: 100%; display: flex; align-items: center; justify-content: center; gap: 4px; }
        .da-btn-view:hover { background: rgba(59, 130, 246, 0.1); border-color: #3b82f6; color: #93c5fd; }

        /* Pagination */
        .da-pagination { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; border-top: 1px solid #334155; background: #0f172a; }
        .da-page-info { font-size: 13px; color: #64748b; }
        .da-page-controls { display: flex; gap: 6px; }
        .da-page-btn { background: #1e293b; border: 1px solid #334155; color: #94a3b8; padding: 6px 12px; border-radius: 6px; font-size: 13px; cursor: pointer; transition: all 0.2s; }
        .da-page-btn:hover:not(:disabled) { background: #334155; color: #f1f5f9; }
        .da-page-btn.active { background: #3b82f6; border-color: #3b82f6; color: #fff; font-weight: 600; }
        .da-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>
    </div>
  );
}

export default function DeviceAdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("device_admin_token");
    if (stored) setToken(stored);
  }, []);

  if (!mounted) return null;

  if (!token) {
    return <DeviceAdminLogin onLogin={(t) => {
      localStorage.setItem("device_admin_token", t);
      setToken(t);
    }} />;
  }

  return <DeviceAdminDashboard token={token} onLogout={() => {
    localStorage.removeItem("device_admin_token");
    setToken(null);
  }} />;
}
