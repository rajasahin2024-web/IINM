"use client";
import React from "react";

interface SeoSerpPreviewProps {
  title: string;
  url: string;
  description: string;
  faviconUrl?: string;
  ogImageUrl?: string;
  baseUrl?: string;
}

/**
 * SeoSerpPreview — Google search result snippet preview + social card preview.
 * Shows how the page will appear in Google search results and on social platforms.
 */
export default function SeoSerpPreview({ title, url, description, faviconUrl, ogImageUrl, baseUrl = "" }: SeoSerpPreviewProps) {
  const displayUrl = url.replace(/^https?:\/\//, "").split("/")[0];
  const urlPath = url.replace(/^https?:\/\/[^/]+/, "");

  const faviconSrc = faviconUrl
    ? (faviconUrl.startsWith("http") ? faviconUrl : `${baseUrl}${faviconUrl}`)
    : "";

  const ogSrc = ogImageUrl
    ? (ogImageUrl.startsWith("http") ? ogImageUrl : `${baseUrl}${ogImageUrl}`)
    : "";

  return (
    <div>
      {/* ── Google SERP snippet ── */}
      <div style={{ maxWidth: 600, padding: "16px 20px", background: "#fff", border: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          {faviconSrc ? (
            <img src={faviconSrc} alt="" style={{ width: 24, height: 24, objectFit: "contain" }} />
          ) : (
            <div style={{ width: 24, height: 24, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#64748b" }}>
              {displayUrl.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.2 }}>{displayUrl}</div>
            {urlPath && <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.2 }}>{urlPath}</div>}
          </div>
        </div>
        <div style={{ fontSize: 18, color: "#1a0dab", lineHeight: 1.3, marginBottom: 4, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {title || "Page Title — appears here"}
        </div>
        <div style={{ fontSize: 13, color: "#4d5156", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {description || "Meta description appears here. Keep it between 120-160 characters for best results."}
        </div>
      </div>

      {/* ── Social card preview (Facebook / LinkedIn / Twitter) ── */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
          Social Card Preview
        </div>
        <div style={{ maxWidth: 600, border: "1px solid #e2e8f0", background: "#fff", overflow: "hidden" }}>
          {ogSrc ? (
            <div style={{ background: "#f8fafc", height: 200, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderBottom: "1px solid #e2e8f0" }}>
              <img src={ogSrc} alt="OG preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ) : (
            <div style={{ background: "#f8fafc", height: 120, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, color: "#cbd5e1", marginBottom: 4 }}>🖼</div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>No OG image set — upload one above</div>
              </div>
            </div>
          )}
          <div style={{ padding: "12px 16px" }}>
            <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>
              {displayUrl}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {title || "Page Title"}
            </div>
            <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {description || "Meta description appears here."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
