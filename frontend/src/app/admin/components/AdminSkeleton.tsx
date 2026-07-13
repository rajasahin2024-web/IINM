"use client";
import React, { useState, useEffect } from "react";
import "../admin.css";

/**
 * AdminSkeleton — Compact Smart Skeleton
 *
 * Only appears after 250ms delay:
 * - Fast network (< 250ms) → never shows, page loads directly
 * - Slow network (> 250ms) → fades in gracefully
 */
export default function AdminSkeleton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 250);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.2s ease",
      }}
    >
      {/* ── Fake Top Bar ── */}
      <div
        style={{
          position: "fixed",
          top: 0, left: 0, right: 0,
          height: 60,
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          zIndex: 100,
          boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
        }}
      >
        {/* Left: logo + nav pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }} />
          <div className="skeleton" style={{ width: 64, height: 14, borderRadius: 4 }} />
          {[80, 70, 90, 75].map((w, i) => (
            <div key={i} className="skeleton"
              style={{ width: w, height: 12, borderRadius: 4, opacity: 0.6 }}
            />
          ))}
        </div>

        {/* Right: icons + avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 7 }} />
          <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 7 }} />
          <div style={{ width: 1, height: 28, background: "#e2e8f0", margin: "0 4px" }} />
          <div className="skeleton" style={{ width: 32, height: 32, borderRadius: "50%" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div className="skeleton" style={{ width: 60, height: 11, borderRadius: 3 }} />
            <div className="skeleton" style={{ width: 40, height: 9, borderRadius: 3 }} />
          </div>
        </div>
      </div>

      {/* ── Fake Content ── */}
      <div style={{ marginTop: 60, padding: "28px 40px" }}>

        {/* Page title */}
        <div style={{ marginBottom: 22 }}>
          <div className="skeleton" style={{ width: 180, height: 24, borderRadius: 5, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 280, height: 13, borderRadius: 4 }} />
        </div>

        {/* Table card */}
        <div style={{
          background: "#fff",
          borderRadius: 12,
          padding: "18px 20px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}>
          {/* Card header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div className="skeleton" style={{ width: 140, height: 17, borderRadius: 4 }} />
            <div className="skeleton" style={{ width: 96, height: 32, borderRadius: 7 }} />
          </div>

          {/* Rows */}
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 80px",
              gap: 14,
              padding: "12px 0",
              borderBottom: i < 4 ? "1px solid #f1f5f9" : "none",
              alignItems: "center",
            }}>
              <div className="skeleton" style={{ height: 13, borderRadius: 4 }} />
              <div className="skeleton" style={{ height: 13, borderRadius: 4 }} />
              <div className="skeleton" style={{ height: 20, borderRadius: 100, width: 60 }} />
              <div className="skeleton" style={{ height: 28, borderRadius: 6 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

