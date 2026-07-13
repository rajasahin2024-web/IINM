"use client";
import React from "react";
import TopBar from "./TopBar";
import "./admin.css";

/* ──────────────────────────────────────────────────
   AdminLayout — Top Navbar Only Version
   ────────────────────────────────────────────────── */

interface AdminLayoutProps {
  children: React.ReactNode;
  activePath: string;
  onNavigate: (href: string) => void;
  onLogout: () => void;
}

export default function AdminLayout({ children, activePath, onNavigate, onLogout }: AdminLayoutProps) {
  return (
    <div className="admin-shell">
      <TopBar
        onNavigate={onNavigate}
        onLogout={onLogout}
        activePath={activePath}
      />
      <main className="admin-main">
        {children}
      </main>
    </div>
  );
}
