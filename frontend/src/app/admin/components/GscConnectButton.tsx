"use client";
import React, { useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL } from "@/lib/config";
import { useToast } from "./ToastProvider";

/**
 * GscConnectButton — triggers Google Search Console OAuth flow.
 * Opens the OAuth URL in a new tab.
 */
export default function GscConnectButton({ onConnected }: { onConnected?: () => void }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${BASE_URL}/api/seo/gsc/oauth/start`);
      if (!res.ok) throw new Error("Failed to start OAuth");
      const data = await res.json();
      if (data.auth_url) {
        window.open(data.auth_url, "_blank");
        showToast("Complete the Google authorization in the new tab.", "success");
      }
    } catch (e: any) {
      showToast(e.message || "Failed to connect GSC", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      style={{
        padding: "10px 20px", border: "none",
        background: loading ? "#94a3b8" : "#4285f4", color: "#fff",
        fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", gap: 8,
      }}
    >
      {loading ? "Connecting..." : "Connect Google Search Console"}
    </button>
  );
}
