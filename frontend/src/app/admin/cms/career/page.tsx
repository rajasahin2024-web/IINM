"use client";
import React, { useState, useEffect } from "react";
import { AdminProvider } from "../../components/ProtectedAdmin";
import { useToast } from "../../components/ToastProvider";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL } from "@/lib/config";

const API = BASE_URL;

/* ── Floating-label input ── */
function FInput({ label, value, onChange, type = "text", isTextArea = false, rows = 3, placeholder }: any) {
  const [f, setF] = useState(false);
  const has = value !== "" && value !== null && value !== undefined;
  const base: React.CSSProperties = {
    width: "100%", padding: "16px 14px", borderRadius: 8, fontSize: 14, outline: "none",
    color: "#0f172a", background: "#fff", boxSizing: "border-box", fontFamily: "inherit",
    border: `1.5px solid ${f ? "#0f172a" : "#e2e8f0"}`,
    transition: "border-color .2s",
    resize: isTextArea ? ("vertical" as const) : ("none" as const),
    minHeight: isTextArea ? 90 : undefined,
  };
  const lbl: React.CSSProperties = {
    position: "absolute", left: 14,
    top: f || has ? -9 : (isTextArea ? 14 : "50%"),
    transform: f || has ? "none" : (isTextArea ? "none" : "translateY(-50%)"),
    fontSize: f || has ? 11 : 14, fontWeight: f || has ? 600 : 400,
    color: f ? "#0f172a" : has ? "#64748b" : "#94a3b8",
    background: f || has ? "#fff" : "transparent",
    padding: f || has ? "0 4px" : "0",
    transition: "all .2s cubic-bezier(.4,0,.2,1)", pointerEvents: "none", zIndex: 1,
  };
  return (
    <div style={{ position: "relative", width: "100%", marginBottom: 8 }}>
      {isTextArea
        ? <textarea style={base} value={value || ""} onChange={onChange} onFocus={() => setF(true)} onBlur={() => setF(false)} rows={rows} placeholder={placeholder} />
        : <input type={type} style={base} value={value || ""} onChange={onChange} onFocus={() => setF(true)} onBlur={() => setF(false)} placeholder={placeholder} />}
      <label style={lbl}>{label}</label>
    </div>
  );
}

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 }}>{title}</h3>
      {hint && <p style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 0" }}>{hint}</p>}
    </div>
  );
}

const EMPTY = {
  hero_eyebrow: "", hero_title: "", hero_subtitle: "", hero_image_url: "",
  intro_eyebrow: "", intro_title: "", intro_text: "",
  culture_eyebrow: "", culture_title: "", culture_text: "", culture_image_url: "",
  perks_json: "[]",
  cta_eyebrow: "", cta_title: "", cta_text: "", cta_button_label: "",
  open_form_title: "", open_form_subtitle: "", open_form_success_message: "",
  email_to_notify: "",
};

function CareerSettingsInner() {
  const { showToast } = useToast();
  const [s, setS] = useState<any>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await apiFetch(`${API}/api/career/settings`);
      if (res.ok) {
        const d = await res.json();
        // perks comes back as array; convert to JSON string for editing
        setS({ ...EMPTY, ...d, perks_json: JSON.stringify(d.perks || [], null, 2) });
      }
    } catch { showToast("Failed to load career settings.", "error"); }
    finally { setLoading(false); }
  };

  const set = (k: string) => (e: any) => setS((p: any) => ({ ...p, [k]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate perks JSON
    try { JSON.parse(s.perks_json || "[]"); }
    catch { showToast("Perks JSON is invalid.", "error"); return; }
    setSaving(true);
    try {
      const res = await apiFetch(`${API}/api/career/settings`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...s, perks_json: s.perks_json }),
      });
      if (res.ok) showToast("Career settings saved.", "success");
      else { const d = await res.json().catch(() => ({})); showToast(d.detail || "Failed to save.", "error"); }
    } catch { showToast("Error saving.", "error"); }
    finally { setSaving(false); }
  };

  const card: React.CSSProperties = { background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 28, marginBottom: 24 };
  const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 };

  if (loading) {
    return <div style={{ padding: "40px 48px", color: "#94a3b8", fontSize: 14 }}>Loading career settings…</div>;
  }

  return (
    <div style={{ padding: "40px 48px", width: "100%", fontFamily: "'Inter', sans-serif", boxSizing: "border-box" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: "0 0 6px" }}>Career Page Configuration</h1>
      <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 28px" }}>Manage the content shown on the public <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>/career</code> page.</p>

      <form onSubmit={save}>
        {/* Hero */}
        <div style={card}>
          <SectionHeader title="Hero Section" hint="The opening banner of the career page." />
          <div style={grid2}>
            <FInput label="Hero Eyebrow" value={s.hero_eyebrow} onChange={set("hero_eyebrow")} placeholder="e.g. We're hiring" />
            <FInput label="Hero Image URL" value={s.hero_image_url} onChange={set("hero_image_url")} placeholder="https://…" />
          </div>
          <FInput label="Hero Title" value={s.hero_title} onChange={set("hero_title")} placeholder="e.g. Build the future of learning" />
          <FInput label="Hero Subtitle" value={s.hero_subtitle} onChange={set("hero_subtitle")} isTextArea rows={2} />
        </div>

        {/* Intro */}
        <div style={card}>
          <SectionHeader title="Intro Section" hint="A short paragraph below the hero." />
          <div style={grid2}>
            <FInput label="Intro Eyebrow" value={s.intro_eyebrow} onChange={set("intro_eyebrow")} />
            <FInput label="Intro Title" value={s.intro_title} onChange={set("intro_title")} />
          </div>
          <FInput label="Intro Text" value={s.intro_text} onChange={set("intro_text")} isTextArea rows={3} />
        </div>

        {/* Culture */}
        <div style={card}>
          <SectionHeader title="Culture Section" hint="Why someone should join your team." />
          <div style={grid2}>
            <FInput label="Culture Eyebrow" value={s.culture_eyebrow} onChange={set("culture_eyebrow")} />
            <FInput label="Culture Image URL" value={s.culture_image_url} onChange={set("culture_image_url")} placeholder="https://…" />
          </div>
          <FInput label="Culture Title" value={s.culture_title} onChange={set("culture_title")} />
          <FInput label="Culture Text" value={s.culture_text} onChange={set("culture_text")} isTextArea rows={4} />
        </div>

        {/* Perks */}
        <div style={card}>
          <SectionHeader title="Perks" hint="JSON array of { icon, title, description }. Icons: Star, Heart, Zap, Users, Globe, Shield, Target, Lightbulb." />
          <FInput label="Perks JSON" value={s.perks_json} onChange={set("perks_json")} isTextArea rows={6} placeholder='[{"icon":"Star","title":"Health","description":"Full coverage"}]' />
        </div>

        {/* CTA */}
        <div style={card}>
          <SectionHeader title="Call To Action" hint="A closing nudge before the application form." />
          <div style={grid2}>
            <FInput label="CTA Eyebrow" value={s.cta_eyebrow} onChange={set("cta_eyebrow")} />
            <FInput label="CTA Button Label" value={s.cta_button_label} onChange={set("cta_button_label")} placeholder="e.g. Apply now" />
          </div>
          <FInput label="CTA Title" value={s.cta_title} onChange={set("cta_title")} />
          <FInput label="CTA Text" value={s.cta_text} onChange={set("cta_text")} isTextArea rows={2} />
        </div>

        {/* Open Form */}
        <div style={card}>
          <SectionHeader title="Open Application Form" hint="Always shown at the bottom of the career page." />
          <FInput label="Form Title" value={s.open_form_title} onChange={set("open_form_title")} placeholder="e.g. Don't see the right role?" />
          <FInput label="Form Subtitle" value={s.open_form_subtitle} onChange={set("open_form_subtitle")} isTextArea rows={2} />
          <FInput label="Success Message" value={s.open_form_success_message} onChange={set("open_form_success_message")} isTextArea rows={2} />
          <div style={{ marginTop: 8 }}>
            <FInput label="Internal Notify Email (optional)" value={s.email_to_notify} onChange={set("email_to_notify")} placeholder="hr@iinmedu.com" />
          </div>
        </div>

        <div style={{ position: "sticky", bottom: 0, background: "#f8fafc", padding: "16px 0", marginTop: 8 }}>
          <button type="submit" disabled={saving} style={{
            background: "#0f172a", color: "#fff", border: "none", borderRadius: 8,
            padding: "12px 28px", fontSize: 14, fontWeight: 600, cursor: saving ? "wait" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}>{saving ? "Saving…" : "Save Settings"}</button>
        </div>
      </form>
    </div>
  );
}

export default function CareerSettingsPage() {
  return (
    <AdminProvider>
      <CareerSettingsInner />
    </AdminProvider>
  );
}
