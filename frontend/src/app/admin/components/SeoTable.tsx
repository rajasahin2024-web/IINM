"use client";
import React from "react";
import SeoScoreBadge from "./SeoScoreBadge";

interface Column {
  key: string;
  label: string;
  width?: string;
  render?: (row: any) => React.ReactNode;
}

interface SeoTableProps {
  columns: Column[];
  data: any[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: any) => void;
}

/**
 * SeoTable — reusable table for SEO admin pages.
 * Minimalist design — no rounded edges.
 */
export default function SeoTable({ columns, data, loading, emptyMessage = "No data found.", onRowClick }: SeoTableProps) {
  if (loading) {
    return (
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", padding: 24, textAlign: "center" }}>
        <div style={{ color: "#94a3b8", fontSize: 14 }}>Loading...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", padding: 32, textAlign: "center" }}>
        <div style={{ color: "#94a3b8", fontSize: 14 }}>{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            {columns.map((col) => (
              <th key={col.key} style={{
                padding: "10px 16px", textAlign: "left",
                fontSize: 12, fontWeight: 700, color: "#475569",
                textTransform: "uppercase", letterSpacing: "0.5px",
                width: col.width,
              }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={idx}
              onClick={() => onRowClick?.(row)}
              style={{
                borderBottom: idx < data.length - 1 ? "1px solid #f1f5f9" : "none",
                cursor: onRowClick ? "pointer" : "default",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { if (onRowClick) e.currentTarget.style.background = "#f8fafc"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              {columns.map((col) => (
                <td key={col.key} style={{ padding: "10px 16px", fontSize: 13, color: "#0f172a" }}>
                  {col.render ? col.render(row) : (row[col.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
