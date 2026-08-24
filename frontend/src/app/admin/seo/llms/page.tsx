"use client";
import React, { useEffect, useState } from "react";
import { AdminProvider } from "../../components/ProtectedAdmin";
import { useToast } from "../../components/ToastProvider";
import { Icon } from "../../icons";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL } from "@/lib/config";

const S = {
  card: { background: "#fff", border: "1px solid #e2e8f0", padding: 24, marginBottom: 16 } as React.CSSProperties,
  sectionTitle: { fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid #f1f5f9" } as React.CSSProperties,
  btnPrimary: { padding: "10px 24px", border: "none", background: "#0a1628", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" } as React.CSSProperties,
  btnGhost: { padding: "6px 14px", border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 12, textDecoration: "none" } as React.CSSProperties,
  hint: { fontSize: 12, color: "#94a3b8" } as React.CSSProperties,
};

function SeoLlmsInner() {
  const { showToast } = useToast();
  const toast = { success: (m: string) => showToast(m, "success"), error: (m: string) => showToast(m, "error") };
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [source, setSource] = useState("auto");
  const [saving, setSaving] = useState(false);
  const [previewFull, setPreviewFull] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [txtRes, fullRes] = await Promise.all([
        apiFetch(`${BASE_URL}/api/seo/llms-txt`),
        apiFetch(`${BASE_URL}/api/seo/llms-full`),
      ]);
      if (txtRes.ok) {
        const data = await txtRes.json();
        setContent(data.content || "");
        setSource(data.source || "auto");
      }
      if (fullRes.ok) {
        const data = await fullRes.json();
        setPreviewFull(data.content || "");
      }
    } catch { toast.error("Failed to load."); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`${BASE_URL}/api/seo/llms-txt`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("llms.txt saved.");
      load();
    } catch { toast.error("Failed to save."); }
    finally { setSaving(false); }
  };

  const handleClear = async () => {
    if (!confirm("Clear manual override and revert to auto-generated?")) return;
    setSaving(true);
    try {
      const res = await apiFetch(`${BASE_URL}/api/seo/llms-txt`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "" }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Reverted to auto-generated.");
      load();
    } catch { toast.error("Failed."); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="manager-content"><div className="skeleton sk-h1"></div></div>;

  return (
    <div className="manager-content" style={{ width: "100%" }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="cpu" size={24} /> llms.txt Manager (AEO)
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>Manage llms.txt and llms-full.txt for AI/LLM crawlers (GPTBot, ClaudeBot, Perplexity, etc.)</p>
      </header>

      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>llms.txt {source === "manual" && <span style={{ fontSize: 12, color: "#f59e0b", marginLeft: 8 }}>(Manual Override)</span>}</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <a href={`/llms.txt`} target="_blank" rel="noopener noreferrer" style={S.btnGhost}>View Live</a>
            {source === "manual" && <button onClick={handleClear} style={{ padding: "6px 14px", border: "1px solid #fecaca", background: "#fef2f2", cursor: "pointer", fontSize: 12, color: "#ef4444" }}>Revert to Auto</button>}
          </div>
        </div>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>Edit the manual override below, or leave empty for auto-generated content based on published courses, blogs, and FAQs.</p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="# IINM&#10;&#10;> Auto-generated if left empty..."
          style={{ width: "100%", minHeight: 300, padding: "16px", fontSize: 13, fontFamily: "monospace", border: "1.5px solid #e2e8f0", boxSizing: "border-box", resize: "vertical", lineHeight: 1.6, outline: "none" }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={handleSave} disabled={saving} style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1, cursor: saving ? "not-allowed" : "pointer" }}>{saving ? "Saving..." : "Save llms.txt"}</button>
        </div>
      </div>

      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>llms-full.txt (Auto-Generated)</h3>
          <a href={`/llms-full.txt`} target="_blank" rel="noopener noreferrer" style={S.btnGhost}>View Live</a>
        </div>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>Full content dump for AI models. Auto-generated from all published courses, blog posts, and FAQs. Not editable — update content to change this.</p>
        <pre style={{ background: "#f8fafc", padding: 16, fontSize: 12, fontFamily: "monospace", overflow: "auto", maxHeight: 400, color: "#475569", margin: 0, whiteSpace: "pre-wrap" }}>
          {previewFull.slice(0, 3000)}{previewFull.length > 3000 ? "\n\n... (truncated preview)" : ""}
        </pre>
      </div>
    </div>
  );
}

export default function SeoLlmsPage() {
  return <AdminProvider><SeoLlmsInner /></AdminProvider>;
}
