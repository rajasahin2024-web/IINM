"use client";
import React from "react";
import { icons as LucideIcons } from "lucide-react";

/* ────────────────────────────────────────────────────────────
   NavbarIcon — renders the `icon` value stored on a NavbarItem.

   Supported formats:
     "lucide:code"          → Lucide icon (kebab-case name)
     "material:school"      → Google Material Symbols Rounded
     "https://... / /..."   → Image URL (CDN link or uploaded file)
     "🧠" (any emoji/text)  → Rendered as-is
   ──────────────────────────────────────────────────────────── */

const kebabToPascal = (s: string) =>
  s.split("-").map(p => p.charAt(0).toUpperCase() + p.slice(1)).join("");

export default function NavbarIcon({ icon, size = 16, className }: { icon: string; size?: number; className?: string }) {
  if (!icon) return null;

  if (icon.startsWith("lucide:")) {
    const name = kebabToPascal(icon.slice(7).trim());
    const LucideComp = (LucideIcons as Record<string, React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>>)[name];
    if (LucideComp) return <LucideComp size={size} className={className} strokeWidth={1.8} />;
    return null;
  }

  if (icon.startsWith("material:")) {
    return (
      <span
        className={`material-symbols-rounded ${className || ""}`}
        style={{
          fontSize: size,
          lineHeight: 1,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        {icon.slice(9).trim()}
      </span>
    );
  }

  if (icon.startsWith("http://") || icon.startsWith("https://") || icon.startsWith("/")) {
    return <img src={icon} alt="" width={size} height={size} className={className} style={{ objectFit: "contain", display: "inline-block" }} />;
  }

  // Emoji / plain text fallback
  return <span className={className} style={{ fontSize: size, lineHeight: 1, display: "inline-flex", alignItems: "center" }}>{icon}</span>;
}

/* Hand-drawn style chevron (pen-sketched look) used for menu carets */
export function HandDrawnCaret({ size = 12, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3.2 5.6c1.7 1.2 3.3 2.6 4.8 4.4 1.6-1.7 3.2-3.1 5-4.6" />
    </svg>
  );
}
