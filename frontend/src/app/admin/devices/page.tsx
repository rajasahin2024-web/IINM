"use client";
import React from "react";
import { AdminProvider, useAdmin } from "../components/ProtectedAdmin";
import { Icon } from "../icons";

function DeviceManagerView() {
  const { sessions, handleToggleDevice } = useAdmin();
  const visibleDevices = sessions.filter(s => s.requester_name !== "Main Admin");

  return (
    <>
      <header>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }}>Device Management</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Review and manage device access permissions.</p>
      </header>

      <div style={{ background: "#fff", borderRadius: 14, padding: 28, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9", marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
            Active & Pending Devices
            <span style={{ background: "#f1f5f9", color: "#475569", fontSize: 11, padding: "2px 8px", borderRadius: 8, fontWeight: 600 }}>{visibleDevices.length}</span>
          </h2>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                <th style={{ padding: "10px 14px", fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>Requester</th>
                <th style={{ padding: "10px 14px", fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>Contact</th>
                <th style={{ padding: "10px 14px", fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>Device & Location</th>
                <th style={{ padding: "10px 14px", fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>Purpose</th>
                <th style={{ padding: "10px 14px", fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "right" }}>Permission</th>
              </tr>
            </thead>
            <tbody>
              {visibleDevices.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>No device requests found.</td></tr>
              ) : (
                visibleDevices.map(req => (
                  <tr key={req.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                    <td style={{ padding: "14px", fontWeight: 500, color: "#0f172a" }}>{req.requester_name || "Unknown"}</td>
                    <td style={{ padding: "14px", color: "#475569" }}>
                      <div style={{ fontSize: 12.5 }}>{req.requester_email || "N/A"}</div>
                      <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 2 }}>{req.requester_phone || "N/A"}</div>
                    </td>
                    <td style={{ padding: "14px", color: "#475569" }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: "#0f172a" }}>{req.device_model || "Unknown Device"}</div>
                      <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 3 }}>{req.location}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>IP: {req.ip_address}</div>
                    </td>
                    <td style={{ padding: "14px", color: "#475569", maxWidth: 180 }}>
                      <div style={{ background: "#f8fafc", padding: "7px 10px", borderRadius: 6, fontSize: 12.5, lineHeight: 1.4 }}>
                        {req.purpose || "No purpose provided"}
                      </div>
                    </td>
                    <td style={{ padding: "14px", textAlign: "right" }}>
                      <div
                        onClick={() => handleToggleDevice(req)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 600, color: req.is_approved ? "#059669" : "#ef4444" }}>
                          {req.is_approved ? "Active" : "Blocked"}
                        </span>
                        <div style={{
                          width: 40, height: 22, borderRadius: 22,
                          background: req.is_approved ? "#10b981" : "#cbd5e1",
                          position: "relative", transition: "background 0.3s",
                        }}>
                          <div style={{
                            width: 16, height: 16, borderRadius: "50%",
                            background: "#fff", position: "absolute", top: 3,
                            left: req.is_approved ? 21 : 3,
                            transition: "left 0.3s cubic-bezier(.68,-.55,.27,1.55)",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                          }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default function DevicesPage() {
  return (
    <AdminProvider>
      <DeviceManagerView />
    </AdminProvider>
  );
}
