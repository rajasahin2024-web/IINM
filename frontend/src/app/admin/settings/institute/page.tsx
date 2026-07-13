"use client";
import React from "react";
import { AdminProvider } from "../../components/ProtectedAdmin";
import { Icon } from "../../icons";

export default function InstituteSettingsPage() {
  return (
    <AdminProvider>
      <div className="manager-content" style={{ width: "100%" }}>
        <header style={{ marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 12 }}>
              <Icon name="home" size={28} /> Institute
            </h1>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: "#64748b" }}>
              Manage institute details, accreditation, and registration information.
            </p>
          </div>
        </header>

        <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9", padding: "48px 32px", textAlign: "center" }}>
          <Icon name="home" size={48} />
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginTop: 16 }}>Institute Settings</h2>
          <p style={{ color: "#64748b", fontSize: 14, marginTop: 8 }}>Coming soon — institute profile & LIC management.</p>
        </div>
      </div>
    </AdminProvider>
  );
}
