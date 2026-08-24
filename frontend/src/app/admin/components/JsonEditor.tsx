"use client";
import React, { useState, useEffect } from "react";

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}

/**
 * JsonEditor — textarea with live JSON validation.
 */
export default function JsonEditor({ value, onChange, placeholder = '{\n  "@context": "https://schema.org",\n  ...\n}', minHeight = 200 }: JsonEditorProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!value.trim()) {
      setError(null);
      return;
    }
    try {
      JSON.parse(value);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [value]);

  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", minHeight, padding: "12px 16px",
          fontSize: 13, fontFamily: "monospace",
          background: "#f8fafc", border: `2px solid ${error ? "#ef4444" : "#e2e8f0"}`,
          outline: "none", resize: "vertical",
          color: "#0f172a", lineHeight: 1.5,
        }}
      />
      {error && (
        <div style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>
          ⚠ Invalid JSON: {error}
        </div>
      )}
      {!error && value.trim() && (
        <div style={{ fontSize: 12, color: "#10b981", marginTop: 4 }}>
          ✓ Valid JSON
        </div>
      )}
    </div>
  );
}
