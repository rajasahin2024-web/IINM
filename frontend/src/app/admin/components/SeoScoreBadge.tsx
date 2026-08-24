"use client";
import React from "react";

interface SeoScoreBadgeProps {
  score: number;
  label?: string;
}

/**
 * SeoScoreBadge — colored score indicator (red < 40, yellow 40-70, green > 70).
 */
export default function SeoScoreBadge({ score, label = "SEO" }: SeoScoreBadgeProps) {
  const color = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";
  const bg = score >= 70 ? "#ecfdf5" : score >= 40 ? "#fffbeb" : "#fef2f2";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px",
      background: bg, color, fontSize: 12, fontWeight: 700,
      border: `1px solid ${color}33`,
    }}>
      {label} {score}
    </span>
  );
}
