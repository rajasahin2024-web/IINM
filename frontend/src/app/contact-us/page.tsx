"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import PublicNavbar from "@/components/PublicNavbar";
import PublicFooter from "@/components/PublicFooter";
import { BASE_URL } from "@/lib/config";
import { apiFetch } from "@/lib/apiFetch";

const ContactUsSettingsInner = dynamic(
  () => import("@/app/admin/settings/institute/contact-us/ContactUsSettingsInner").then(m => m.ContactUsSettingsInner),
  { ssr: false }
);
const ToastProvider = dynamic(
  () => import("@/app/admin/components/ToastProvider").then(m => m.ToastProvider),
  { ssr: false }
);

interface ContactData {
  [key: string]: string | undefined;
  phone1?: string; phone2?: string; whatsapp?: string;
  email1?: string; email2?: string;
  address_line1?: string; address_line2?: string;
  city?: string; state?: string; pin_code?: string; country?: string;
  weekday_hours?: string; weekend_hours?: string;
  map_embed_url?: string; map_lat?: string; map_lng?: string;
  facebook_url?: string; instagram_url?: string; linkedin_url?: string;
  youtube_url?: string; twitter_url?: string;
  page_title?: string; page_subtitle?: string;
  get_in_touch_heading?: string; get_in_touch_description?: string;
  contact_email_label?: string; contact_phone_label?: string;
  registered_office_label?: string; registered_office_city?: string;
  registered_office_address?: string;
  form_title?: string; form_subtitle?: string;
  state_options?: string; qualification_options?: string;
  terms_text?: string; terms_url?: string;
  success_message?: string; review_badges?: string;
}


const COPY_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
);

const PHONE_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
);

const MAIL_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
);

const LOCATION_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
);

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 4,
  border: "1.5px solid #e2e8f0",
  outline: "none",
  fontSize: 14,
  color: "#0f172a",
  background: "#fff",
  boxSizing: "border-box",
  fontFamily: "inherit",
  transition: "border-color .2s, box-shadow .2s",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#334155",
  marginBottom: 6,
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 6,
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 24px rgba(0,0,0,.05)",
  padding: "24px",
};

const shimmerKeyframes = `
@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}
`;

const skeletonStyle: React.CSSProperties = {
  background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
  backgroundSize: "1000px 100%",
  animation: "shimmer 1.5s infinite linear",
  borderRadius: 6,
};

function ContactSkeleton() {
  return (
    <main style={{ padding: "40px 48px" }}>
      <style>{shimmerKeyframes}</style>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 40, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <div>
              <div style={{ ...skeletonStyle, height: 28, width: 180, marginBottom: 12 }} />
              <div style={{ ...skeletonStyle, height: 16, width: "100%", marginBottom: 8 }} />
              <div style={{ ...skeletonStyle, height: 16, width: "80%" }} />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
              <div style={{ ...skeletonStyle, height: 70, width: 260, borderRadius: 6 }} />
              <div style={{ ...skeletonStyle, height: 70, width: 260, borderRadius: 6 }} />
            </div>
            <div>
              <div style={{ ...skeletonStyle, height: 24, width: 200, marginBottom: 14 }} />
              <div style={{ ...skeletonStyle, height: 100, width: 360, borderRadius: 6 }} />
            </div>
          </div>
          <div style={{ ...cardStyle, padding: 32, borderLeft: "4px solid #f97317" }}>
            <div style={{ ...skeletonStyle, height: 24, width: 200, marginBottom: 24 }} />
            <div style={{ ...skeletonStyle, height: 48, width: "100%", marginBottom: 16 }} />
            <div style={{ ...skeletonStyle, height: 48, width: "100%", marginBottom: 16 }} />
            <div style={{ ...skeletonStyle, height: 48, width: "100%", marginBottom: 16 }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div style={{ ...skeletonStyle, height: 48 }} />
              <div style={{ ...skeletonStyle, height: 48 }} />
            </div>
            <div style={{ ...skeletonStyle, height: 24, width: "100%", marginBottom: 16 }} />
            <div style={{ ...skeletonStyle, height: 48, width: "100%" }} />
          </div>
        </div>
        <div style={{ marginTop: 56, display: "flex", justifyContent: "center", gap: 16 }}>
          <div style={{ ...skeletonStyle, height: 70, width: 180 }} />
          <div style={{ ...skeletonStyle, height: 70, width: 180 }} />
          <div style={{ ...skeletonStyle, height: 70, width: 180 }} />
        </div>
        <div style={{ marginTop: 56 }}>
          <div style={{ ...skeletonStyle, height: 28, width: 200, margin: "0 auto 16px" }} />
          <div style={{ ...skeletonStyle, height: 400, width: "100%", borderRadius: 6 }} />
        </div>
      </div>
    </main>
  );
}

export default function ContactUsPage() {
  const [contact, setContact] = useState<ContactData>({});
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", phone: "", phoneCode: "+91", state: "", qualification: "", terms: false });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [copied, setCopied] = useState<string | null>(null);
  const [showFloat, setShowFloat] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [mapApiKey, setMapApiKey] = useState("");
  const [showMapPicker, setShowMapPicker] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const loggedIn = localStorage.getItem("iinm_is_logged_in") === "true";
    const expiry = localStorage.getItem("iinm_login_expiry");
    const valid = loggedIn && expiry ? Date.now() < Number(expiry) : false;
    setIsAdmin(valid);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      fetch(`${BASE_URL}/api/contact/settings`).then(r => r.ok ? r.json() : {}),
      fetch(`${BASE_URL}/api/contact/google-api`).then(r => r.ok ? r.json() : {}),
    ]).then(([settingsRes, googleRes]) => {
      if (cancelled) return;
      if (settingsRes.status === "fulfilled") setContact(settingsRes.value || {});
      if (googleRes.status === "fulfilled" && (googleRes.value as any)?.google_map_api_key) setMapApiKey((googleRes.value as any).google_map_api_key);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const v = (key: keyof ContactData, fallback: string) => contact[key] || fallback;

  const stateOptions = useMemo(() => {
    if (!contact.state_options) return [];
    try { const arr = JSON.parse(contact.state_options); return Array.isArray(arr) ? arr : []; } catch { return []; }
  }, [contact.state_options]);

  const qualificationOptions = useMemo(() => {
    if (!contact.qualification_options) return [];
    try { const arr = JSON.parse(contact.qualification_options); return Array.isArray(arr) ? arr : []; } catch { return []; }
  }, [contact.qualification_options]);

  const reviewBadges = useMemo(() => {
    if (!contact.review_badges) return [];
    try { const arr = JSON.parse(contact.review_badges); return Array.isArray(arr) ? arr : []; } catch { return []; }
  }, [contact.review_badges]);

  const copy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => { setCopied(label); setTimeout(() => setCopied(null), 1200); });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.terms) return;
    setStatus("submitting");
    try {
      const fullPhone = `${form.phoneCode} ${form.phone}`.trim();
      const res = await fetch(`${BASE_URL}/api/contact/inquiry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: fullPhone,
          state: form.state,
          qualification: form.qualification,
          message: `State: ${form.state || "-"}, Qualification: ${form.qualification || "-"}`,
        }),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
      setForm({ name: "", email: "", phone: "", phoneCode: "+91", state: "", qualification: "", terms: false });
    } catch {
      setStatus("error");
    }
  };

  const getHeading = v("get_in_touch_heading", "");
  const getDescription = v("get_in_touch_description", "");
  const emailLabel = v("contact_email_label", "");
  const phoneLabel = v("contact_phone_label", "");
  const officeLabel = v("registered_office_label", "");
  const officeCity = v("registered_office_city", "");
  const officeAddress = v("registered_office_address", "");
  const formTitle = v("form_title", "");
  const formSubtitle = v("form_subtitle", "");
  const termsText = v("terms_text", "");
  const termsUrl = v("terms_url", "");
  const successMsg = v("success_message", "");

  const email = contact.email1 || "";
  const phone = contact.phone1 || "";

  const closeEditor = () => {
    setShowEditor(false);
    if (typeof window !== "undefined") window.location.reload();
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      <PublicNavbar />

      {isAdmin && !showEditor && (
        <button onClick={() => setShowEditor(true)} style={{ position: "fixed", top: 100, right: 20, zIndex: 150, background: "#0f172a", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 6px 20px rgba(0,0,0,.25)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit Contact Page
        </button>
      )}

      {showEditor && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "#f8fafc" }}>
          <ToastProvider>
            <ContactUsSettingsInner forceFullScreen onFullScreenClose={closeEditor} initialData={contact as any} />
          </ToastProvider>
        </div>
      )}

      {loading && <ContactSkeleton />}

      {!loading && (
        <main style={{ padding: "40px 48px" }}>
          <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 40, alignItems: "start" }}>
            {/* Left */}
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              <div>
                {(getHeading || getDescription) && (
                  <div style={{ marginBottom: 32 }}>
                    {getHeading && <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>{getHeading}</h2>}
                    {getDescription.split("\n").map((p, i) => p && <p key={i} style={{ color: "#475569", fontSize: 15, lineHeight: 1.6, marginBottom: 6 }}>{p}</p>)}
                  </div>
                )}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
              {email && (
                <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14, minWidth: 260, position: "relative" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>{MAIL_ICON}</div>
                  <div>
                    <p style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{emailLabel || "Email"}</p>
                    <p style={{ fontSize: 15, color: "#0f172a", fontWeight: 600 }}>{email}</p>
                  </div>
                  <button type="button" onClick={() => copy(email, "email")} style={{ marginLeft: "auto", background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }} title="Copy">{COPY_ICON}</button>
                  {copied === "email" && <span style={{ position: "absolute", right: 12, top: -18, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>Copied!</span>}
                </div>
              )}

              {phone && (
                <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14, minWidth: 260, position: "relative" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>{PHONE_ICON}</div>
                  <div>
                    <p style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{phoneLabel || "Phone"}</p>
                    <p style={{ fontSize: 15, color: "#0f172a", fontWeight: 600 }}>{phone}</p>
                  </div>
                  <button type="button" onClick={() => copy(phone, "phone")} style={{ marginLeft: "auto", background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }} title="Copy">{COPY_ICON}</button>
                  {copied === "phone" && <span style={{ position: "absolute", right: 12, top: -18, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>Copied!</span>}
                </div>
              )}
            </div>

            {(officeLabel || officeCity || officeAddress) && (
              <div style={{ marginTop: 32 }}>
                {officeLabel && <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 14 }}>{officeLabel}</h2>}
                <div style={{ ...cardStyle, maxWidth: 360 }}>
                  {officeCity && <p style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}><span style={{ color: "#2563eb" }}>{LOCATION_ICON}</span> {officeCity}</p>}
                  {officeAddress && <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6 }}>{officeAddress}</p>}
                </div>
              </div>
            )}
          </div>
          </div>

          {/* Right form */}
          <div style={{ ...cardStyle, padding: 32, boxShadow: "0 10px 40px rgba(0,0,0,.08)", borderLeft: "4px solid #f97317" }}>
            {formTitle && (
              <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 4, height: 22, background: "#f97317", borderRadius: 2, flexShrink: 0 }} />
                <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: 0 }}>{formTitle}</h2>
                {formSubtitle && <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>{formSubtitle}</p>}
              </div>
            )}

            {status === "success" ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#dcfce7", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px" }}>✓</div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>Thank You!</h3>
                <p style={{ color: "#64748b", fontSize: 15, lineHeight: 1.6 }}>{successMsg}</p>
                <button onClick={() => setStatus("idle")} style={{ marginTop: 20, background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Submit Another</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Name</label>
                  <input required type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={inputStyle} placeholder="Your name" />
                </div>
                <div>
                  <label style={labelStyle}>Email Address</label>
                  <input required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} style={inputStyle} placeholder="you@example.com" />
                </div>
                <div>
                  <label style={labelStyle}>Phone Number</label>
                  <div style={{ display: "flex", borderRadius: 10, border: "1.5px solid #e2e8f0", overflow: "hidden" }}>
                    <select value={form.phoneCode} onChange={e => setForm(p => ({ ...p, phoneCode: e.target.value }))} style={{ ...inputStyle, width: "auto", minWidth: 80, border: "none", borderRight: "1.5px solid #e2e8f0", borderRadius: 0, background: "#f8fafc" }}>
                      <option value="+91">IN (+91)</option>
                      <option value="+880">BD (+880)</option>
                      <option value="+1">US (+1)</option>
                      <option value="+44">UK (+44)</option>
                    </select>
                    <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} style={{ ...inputStyle, border: "none", borderRadius: 0 }} placeholder="Phone number" />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16 }}>
                  <div>
                    <label style={labelStyle}>State</label>
                    <select value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} style={{ ...inputStyle, appearance: "menulist" as any, background: "#fff" }}>
                      <option value="">Select State</option>
                      {stateOptions.map((s: string) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Qualification</label>
                    <select value={form.qualification} onChange={e => setForm(p => ({ ...p, qualification: e.target.value }))} style={{ ...inputStyle, appearance: "menulist" as any, background: "#fff" }}>
                      <option value="">Select Qualification</option>
                      {qualificationOptions.map((q: string) => <option key={q} value={q}>{q}</option>)}
                    </select>
                  </div>
                </div>

                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", marginTop: 4 }}>
                  <input type="checkbox" checked={form.terms} onChange={e => setForm(p => ({ ...p, terms: e.target.checked }))} style={{ width: 18, height: 18, marginTop: 2, accentColor: "#2563eb" }} />
                  <span style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                    {termsText ? (
                      <span dangerouslySetInnerHTML={{ __html: termsText.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "") }} />
                    ) : termsUrl ? (
                      <>You agree to our <Link href={termsUrl} style={{ color: "#2563eb", textDecoration: "underline" }}>Terms of Service</Link> and <Link href={termsUrl.replace("terms", "privacy")} style={{ color: "#2563eb", textDecoration: "underline" }}>Privacy Policy</Link>.</>
                    ) : (
                      <>I agree to the terms and conditions.</>
                    )}
                  </span>
                </label>

                {status === "error" && (
                  <p style={{ fontSize: 13, color: "#dc2626", background: "#fef2f2", borderRadius: 8, padding: "10px 14px" }}>Something went wrong. Please try again.</p>
                )}

                <button type="submit" disabled={!form.terms || status === "submitting"} style={{ width: "100%", padding: "14px", borderRadius: 6, border: "none", background: "#2563eb", color: "#fff", fontSize: 15, fontWeight: 700, cursor: !form.terms || status === "submitting" ? "not-allowed" : "pointer", opacity: !form.terms || status === "submitting" ? 0.6 : 1, transition: "all .2s", boxShadow: "0 6px 20px rgba(37,99,235,.25)", marginTop: 4 }}>
                  {status === "submitting" ? "Submitting..." : "Submit"}
                </button>
              </form>
            )}
          </div>
        </div>

          {/* Review badges */}
          {reviewBadges.length > 0 && (
            <div style={{ marginTop: 56, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16 }}>
              {reviewBadges.map((b: any) => (
                <div key={b.name} style={{ background: "#fff", borderRadius: 6, border: "1px solid #e2e8f0", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 4px 20px rgba(0,0,0,.04)" }}>
                  {b.icon ? (
                    <img src={b.icon} alt={b.name} width={40} height={40} style={{ objectFit: "contain", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 800, background: b.accent || "#0f172a" }}>{b.name.charAt(0)}</div>
                  )}
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{b.name}</p>
                    <p style={{ fontSize: 12, color: "#64748b" }}>Rated {b.rating}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Map */}
          <div style={{ marginTop: 56 }}>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginBottom: 16 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0 }}>Find Us on Map</h2>
              {isAdmin && mapApiKey && (
                <button onClick={() => setShowMapPicker(true)} style={{ background: "#0f172a", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {contact.map_lat ? "Change Location" : "Mark Location"}
                </button>
              )}
            </div>
            <div style={{ borderRadius: 6, overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(0,0,0,.05)", position: "relative" }}>
              {mapApiKey && contact.map_lat && contact.map_lng ? (
                <InteractiveMap apiKey={mapApiKey} lat={parseFloat(contact.map_lat)} lng={parseFloat(contact.map_lng)} />
              ) : contact.map_embed_url && contact.map_embed_url.includes("embed") ? (
                <iframe src={contact.map_embed_url} width="100%" height="400" style={{ border: 0, display: "block" }} allowFullScreen loading="lazy" />
              ) : (
                <div style={{ height: 400, display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", color: "#94a3b8", fontSize: 14, flexDirection: "column", gap: 8 }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  <p>No location set yet.</p>
                  {isAdmin && mapApiKey && <p style={{ fontSize: 13 }}>Click "Mark Location" to set your location on the map.</p>}
                  {!mapApiKey && <p style={{ fontSize: 12 }}>Google Maps API key not configured. Add it in Admin Settings → Google API.</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      )}

      {/* Map Location Picker Modal */}
      {showMapPicker && mapApiKey && (
        <MapLocationPicker
          apiKey={mapApiKey}
          initialLat={contact.map_lat ? parseFloat(contact.map_lat) : undefined}
          initialLng={contact.map_lng ? parseFloat(contact.map_lng) : undefined}
          onClose={() => setShowMapPicker(false)}
          onSave={async (lat: number, lng: number) => {
            try {
              await apiFetch(`${BASE_URL}/api/contact/settings`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ map_lat: String(lat), map_lng: String(lng) }),
              });
              setContact(prev => ({ ...prev, map_lat: String(lat), map_lng: String(lng) }));
              setShowMapPicker(false);
            } catch {
              alert("Failed to save location.");
            }
          }}
        />
      )}

      {/* Floating buttons */}
      {showFloat && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 40, display: "flex", flexDirection: "column", gap: 10 }}>
          {phone && (
            <a href={`tel:${phone.replace(/\s/g, "")}`} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", borderRadius: 50, padding: "10px 18px", boxShadow: "0 6px 24px rgba(0,0,0,.12)", border: "1px solid #e2e8f0", textDecoration: "none", color: "#0f172a", fontSize: 14, fontWeight: 700 }}>
              <span style={{ width: 32, height: 32, borderRadius: "50%", background: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>{PHONE_ICON}</span>
              Call Us Now
            </a>
          )}
          {(contact.whatsapp || phone) && (
            <a href={`https://wa.me/${(contact.whatsapp || phone).replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", borderRadius: 50, padding: "10px 18px", boxShadow: "0 6px 24px rgba(0,0,0,.12)", border: "1px solid #e2e8f0", textDecoration: "none", color: "#0f172a", fontSize: 14, fontWeight: 700 }}>
              <span style={{ width: 32, height: 32, borderRadius: "50%", background: "#22c55e", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
              </span>
              Whatsapp Us
            </a>
          )}
          <button onClick={() => setShowFloat(false)} style={{ alignSelf: "flex-end", width: 32, height: 32, borderRadius: "50%", background: "#e2e8f0", color: "#475569", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18 }} aria-label="Close">×</button>
        </div>
      )}

      <PublicFooter />
    </div>
  );
}

/* ──────────────────────────────────────────────────
   InteractiveMap — Read-only Google Map with marker
   ────────────────────────────────────────────────── */
function InteractiveMap({ apiKey, lat, lng }: { apiKey: string; lat: number; lng: number }) {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    const scriptId = "gmaps-interactive-script";
    if ((window as any).google && (window as any).google.maps) {
      setLoaded(true);
      return;
    }
    if (document.getElementById(scriptId)) {
      const check = setInterval(() => {
        if ((window as any).google && (window as any).google.maps) {
          clearInterval(check);
          setLoaded(true);
        }
      }, 100);
      return () => clearInterval(check);
    }
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const checkReady = setInterval(() => {
        const g = (window as any).google;
        if (g && g.maps && typeof g.maps.Map === "function") {
          clearInterval(checkReady);
          setLoaded(true);
        }
      }, 100);
    };
    document.head.appendChild(script);
  }, [apiKey]);

  React.useEffect(() => {
    if (!loaded || !mapRef.current) return;
    const g = (window as any).google;
    if (!g || !g.maps || typeof g.maps.Map !== "function") return;
    const map = new g.maps.Map(mapRef.current, {
      center: { lat, lng },
      zoom: 14,
      mapId: "iinm-contact-map",
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });
    new g.maps.marker.AdvancedMarkerElement({
      position: { lat, lng },
      map,
    });
  }, [loaded, lat, lng]);

  return <div ref={mapRef} style={{ width: "100%", height: 400, background: "#f1f5f9" }} />;
}

/* ──────────────────────────────────────────────────
   MapLocationPicker — Full-screen modal with search
   ────────────────────────────────────────────────── */
function MapLocationPicker({
  apiKey,
  initialLat,
  initialLng,
  onClose,
  onSave,
}: {
  apiKey: string;
  initialLat?: number;
  initialLng?: number;
  onClose: () => void;
  onSave: (lat: number, lng: number) => void;
}) {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [selected, setSelected] = React.useState<{ lat: number; lng: number } | null>(
    initialLat != null && initialLng != null ? { lat: initialLat, lng: initialLng } : null
  );
  const mapInstance = React.useRef<any>(null);
  const markerRef = React.useRef<any>(null);

  React.useEffect(() => {
    const scriptId = "gmaps-picker-script";
    if ((window as any).google && (window as any).google.maps) {
      setLoaded(true);
      return;
    }
    if (document.getElementById(scriptId)) {
      const check = setInterval(() => {
        if ((window as any).google && (window as any).google.maps) {
          clearInterval(check);
          setLoaded(true);
        }
      }, 100);
      return () => clearInterval(check);
    }
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const checkReady = setInterval(() => {
        const g = (window as any).google;
        if (g && g.maps && typeof g.maps.Map === "function") {
          clearInterval(checkReady);
          setLoaded(true);
        }
      }, 100);
    };
    document.head.appendChild(script);
  }, [apiKey]);

  React.useEffect(() => {
    if (!loaded || !mapRef.current) return;
    const g = (window as any).google;
    if (!g || !g.maps || typeof g.maps.Map !== "function") return;

    const center = selected
      ? { lat: selected.lat, lng: selected.lng }
      : { lat: 22.5726, lng: 88.3639 };

    const map = new g.maps.Map(mapRef.current, {
      center,
      zoom: 12,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
    });
    mapInstance.current = map;

    if (selected) {
      markerRef.current = new g.maps.Marker({
        position: { lat: selected.lat, lng: selected.lng },
        map,
        draggable: true,
      });
      g.maps.event.addListener(markerRef.current, "dragend", (e: any) => {
        setSelected({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      });
    }

    map.addListener("click", (e: any) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setSelected({ lat, lng });
      if (markerRef.current) markerRef.current.setMap(null);
      markerRef.current = new g.maps.Marker({
        position: { lat, lng },
        map,
        draggable: true,
      });
      g.maps.event.addListener(markerRef.current, "dragend", (ev: any) => {
        setSelected({ lat: ev.latLng.lat(), lng: ev.latLng.lng() });
      });
    });

    if (searchRef.current) {
      const autocomplete = new g.maps.places.Autocomplete(searchRef.current, { types: ["geocode"] });
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place || !place.geometry) return;
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setSelected({ lat, lng });
        map.setCenter({ lat, lng });
        map.setZoom(15);
        if (markerRef.current) markerRef.current.setMap(null);
        markerRef.current = new g.maps.Marker({
          position: { lat, lng },
          map,
          draggable: true,
        });
        g.maps.event.addListener(markerRef.current, "dragend", (ev: any) => {
          setSelected({ lat: ev.latLng.lat(), lng: ev.latLng.lng() });
        });
      });
    }
  }, [loaded]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "#f8fafc" }}>
      <div style={{ position: "sticky", top: 0, background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Mark Your Location</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Search or click on the map to set your location.</p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {selected && (
            <span style={{ fontSize: 12, color: "#475569", background: "#f1f5f9", padding: "6px 12px", borderRadius: 6, fontFamily: "monospace" }}>
              {selected.lat.toFixed(6)}, {selected.lng.toFixed(6)}
            </span>
          )}
          <button onClick={onClose} type="button" style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={() => selected && onSave(selected.lat, selected.lng)} disabled={!selected} type="button"
            style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: selected ? "pointer" : "not-allowed", opacity: selected ? 1 : 0.5 }}>
            Save Location
          </button>
        </div>
      </div>
      <div style={{ position: "relative", width: "100%", height: "calc(100vh - 70px)" }}>
        <input
          ref={searchRef}
          type="text"
          placeholder="Search for a place..."
          style={{
            position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
            width: "min(400px, 90%)", padding: "12px 16px", borderRadius: 8,
            border: "1px solid #e2e8f0", fontSize: 14, boxShadow: "0 2px 8px rgba(0,0,0,.12)",
            zIndex: 5, background: "#fff",
          }}
        />
        <div ref={mapRef} style={{ width: "100%", height: "100%", background: "#e2e8f0" }} />
      </div>
    </div>
  );
}
