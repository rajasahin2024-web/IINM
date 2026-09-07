"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "../../icons";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL } from "@/lib/config";
import { useToast } from "../../components/ToastProvider";

interface CareerNavTabsProps {
  onCreateJob?: () => void;
  onRefresh?: () => void;
}

export default function CareerNavTabs({ onCreateJob, onRefresh }: CareerNavTabsProps) {
  const pathname = usePathname();
  const { showToast } = useToast();
  const [seeding, setSeeding] = useState(false);

  const tabs = [
    { label: "Job Categories", href: "/admin/cms/career/categories", icon: "folder" },
    { label: "Career Positions", href: "/admin/cms/career/positions", icon: "layers" },
    { label: "Job Posts", href: "/admin/cms/career/jobs", icon: "file-text" },
    { label: "Job Requests", href: "/admin/cms/career/applications", icon: "inbox" },
  ];

  const handleSeedDefaults = async () => {
    if (!confirm("Seed authentic sample Indian Government, Corporate Hospital, Faculty, and Paramedical categories, positions, and sample jobs?")) return;
    setSeeding(true);
    try {
      const res = await apiFetch(`${BASE_URL}/api/career/admin/seed-defaults`, { method: "POST" });
      if (res.ok) {
        showToast("Sample Government, Corporate, and Healthcare categories seeded successfully!", "success");
        if (onRefresh) onRefresh();
        else window.location.reload();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || "Failed to seed defaults", "error");
      }
    } catch {
      showToast("Network error while seeding defaults", "error");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 12,
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: 10,
      padding: "8px 14px",
      marginBottom: 24,
      boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
    }}>
      {/* Navigation Links */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {tabs.map(tab => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                borderRadius: 6,
                fontSize: 13.5,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "#ffffff" : "#475569",
                background: isActive ? "#0a1628" : "transparent",
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
            >
              <Icon name={tab.icon} size={15} color={isActive ? "#ffffff" : "#64748b"} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          type="button"
          onClick={handleSeedDefaults}
          disabled={seeding}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            color: "#047857",
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            cursor: seeding ? "wait" : "pointer",
            transition: "all 0.15s",
          }}
          title="Seed realistic Indian Government & Corporate Healthcare categories and jobs"
        >
          <span>{seeding ? "Seeding..." : "⚡ Seed Sample Categories"}</span>
        </button>

        {onCreateJob && (
          <button
            type="button"
            onClick={onCreateJob}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 6,
              fontSize: 13.5,
              fontWeight: 500,
              color: "#ffffff",
              background: "#e63946",
              border: "none",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
          >
            <Icon name="plus" size={15} color="#ffffff" />
            <span>New Job Post</span>
          </button>
        )}
      </div>
    </div>
  );
}
