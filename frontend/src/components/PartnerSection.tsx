"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiFetch";

interface TopIcon { name: string; iconUrl: string; }
interface Category { name: string; link: string; }
interface PartnerLogo { name: string; logoUrl: string; }

interface PartnerSectionData {
  topIcons: TopIcon[];
  label: string;
  heading: string;
  primaryButtonText: string;
  primaryButtonLink: string;
  secondaryButtonText: string;
  secondaryButtonLink: string;
  exploreLinkText: string;
  exploreLinkUrl: string;
  categories: Category[];
  partnerLogos: PartnerLogo[];
}

const defaultData: PartnerSectionData = {
  topIcons: [
    { name: "Python", iconUrl: "" }, { name: "R", iconUrl: "" },
    { name: "SQL", iconUrl: "" }, { name: "ChatGPT", iconUrl: "" },
    { name: "Power BI", iconUrl: "" }, { name: "Excel", iconUrl: "" },
    { name: "Snowflake", iconUrl: "" }, { name: "Git", iconUrl: "" },
  ],
  label: "WHY IINM FOR BUSINESS?",
  heading: "Tailored data and AI upskilling for your business",
  primaryButtonText: "IINM for Business",
  primaryButtonLink: "/contact-us",
  secondaryButtonText: "Request Demo",
  secondaryButtonLink: "/contact-us",
  exploreLinkText: "Explore industry-wide solutions by IINM",
  exploreLinkUrl: "/courses",
  categories: [
    { name: "Healthcare", link: "/courses" },
    { name: "Technology", link: "/courses" },
    { name: "Energy", link: "/courses" },
    { name: "Government", link: "/contact-us" },
  ],
  partnerLogos: [
    { name: "Google", logoUrl: "" }, { name: "Apple", logoUrl: "" },
    { name: "Microsoft", logoUrl: "" }, { name: "ING", logoUrl: "" },
    { name: "3M", logoUrl: "" }, { name: "Live Nation", logoUrl: "" },
    { name: "Bloomberg", logoUrl: "" }, { name: "Uber", logoUrl: "" },
    { name: "Tesla", logoUrl: "" }, { name: "Oxford", logoUrl: "" },
    { name: "Duke", logoUrl: "" }, { name: "AXA", logoUrl: "" },
  ],
};

function isAdminLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  const loggedIn = localStorage.getItem("iinm_is_logged_in") === "true";
  const expiry = localStorage.getItem("iinm_login_expiry");
  return loggedIn && !!expiry && Date.now() < Number(expiry);
}

function DefaultIcon({ name }: { name: string }) {
  const icons: Record<string, React.JSX.Element> = {
    Python: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2c-2 0-4 1-4 3v2h6v2H6v6h2v-4h8v4h2v-6h-2V7h4c0-2-2-3-4-3H12z" />
        <circle cx="9" cy="9" r="1" fill="currentColor" stroke="none" />
        <circle cx="15" cy="15" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
    R: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h7a4 4 0 0 1 4 4 4 4 0 0 1-4 4H8v8" /><path d="M16 12h6a3 3 0 0 1 3 3v1a3 3 0 0 1-3 3h-1" /><path d="M20 19v3" />
      </svg>
    ),
    SQL: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
      </svg>
    ),
    ChatGPT: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" /><path d="M9 21h6" />
      </svg>
    ),
    "Power BI": (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="4" height="18" rx="1" /><rect x="10" y="8" width="4" height="13" rx="1" /><rect x="17" y="13" width="4" height="8" rx="1" />
      </svg>
    ),
    Excel: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 7l4 10M11 7L7 17" /><path d="M13 7h4M13 12h4M13 17h4" />
      </svg>
    ),
    Snowflake: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07l14.14-14.14" /><path d="M12 2l3 3-3 3-3-3zM12 22l3-3-3-3-3 3zM2 12l3-3 3 3-3 3zM22 12l-3-3-3 3 3 3z" />
      </svg>
    ),
    Git: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="12" r="3" />
        <path d="M6 9v6M9 6h3a3 3 0 0 1 3 3v0a3 3 0 0 1-3 3h-3" />
      </svg>
    ),
  };
  return icons[name] || (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="4" /><circle cx="12" cy="12" r="5" />
    </svg>
  );
}

function PartnerLogoFallback({ name }: { name: string }) {
  return <span style={{ fontSize: 15, fontWeight: 700, color: "#94a3b8", letterSpacing: "-0.3px", whiteSpace: "nowrap" }}>{name}</span>;
}

export default function PartnerSection() {
  const [data, setData] = useState<PartnerSectionData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<PartnerSectionData>(defaultData);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [uploadingIdx, setUploadingIdx] = useState<{ type: "icon" | "logo"; idx: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUpload, setPendingUpload] = useState<{ type: "icon" | "logo"; idx: number } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await apiFetch("/api/settings/partners");
      if (res.ok) {
        const json = await res.json();
        if (json.content) setData(json.content);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadData();
    setIsAdmin(isAdminLoggedIn());
    const handleStorage = () => setIsAdmin(isAdminLoggedIn());
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [loadData]);

  const openEdit = () => { setDraft(JSON.parse(JSON.stringify(data))); setIsEditing(true); setSaveMsg(""); };
  const closeEdit = () => setIsEditing(false);

  const handleSave = async () => {
    setSaving(true); setSaveMsg("");
    try {
      const res = await apiFetch("/api/settings/partners", {
        method: "PUT",
        body: JSON.stringify({ content_json: JSON.stringify(draft) }),
      });
      if (res.ok) { setData(draft); setSaveMsg("Saved!"); setTimeout(() => setIsEditing(false), 800); }
      else { const err = await res.json().catch(() => ({})); setSaveMsg(err.detail || "Save failed"); }
    } catch { setSaveMsg("Network error"); }
    finally { setSaving(false); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingUpload) return;
    handleUpload(file, pendingUpload.type, pendingUpload.idx);
    setPendingUpload(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const triggerUpload = (type: "icon" | "logo", idx: number) => {
    setPendingUpload({ type, idx });
    setTimeout(() => fileInputRef.current?.click(), 0);
  };

  const handleUpload = async (file: File, type: "icon" | "logo", idx: number) => {
    setUploadingIdx({ type, idx });
    try {
      const ext = file.name.split(".").pop() || "png";
      const key = `partner-section/${type}-${idx}-${Date.now()}.${ext}`;
      const fd = new FormData(); fd.append("file", file);
      const res = await apiFetch(`/api/settings/r2/upload?key=${encodeURIComponent(key)}`, { method: "POST", body: fd });
      if (res.ok) {
        const result = await res.json();
        setDraft((prev) => {
          const next = JSON.parse(JSON.stringify(prev)) as PartnerSectionData;
          if (type === "icon") next.topIcons[idx] = { ...next.topIcons[idx], iconUrl: result.url };
          else next.partnerLogos[idx] = { ...next.partnerLogos[idx], logoUrl: result.url };
          return next;
        });
      }
    } finally { setUploadingIdx(null); }
  };

  const updateField = <K extends keyof PartnerSectionData>(field: K, value: PartnerSectionData[K]) => setDraft((prev) => ({ ...prev, [field]: value }));

  const updateCategory = (idx: number, key: keyof Category, value: string) => setDraft((prev) => { const cats = [...prev.categories]; cats[idx] = { ...cats[idx], [key]: value }; return { ...prev, categories: cats }; });
  const addCategory = () => setDraft((prev) => ({ ...prev, categories: [...prev.categories, { name: "New Category", link: "/courses" }] }));
  const removeCategory = (idx: number) => setDraft((prev) => ({ ...prev, categories: prev.categories.filter((_, i) => i !== idx) }));

  const updateIconName = (idx: number, name: string) => setDraft((prev) => { const icons = [...prev.topIcons]; icons[idx] = { ...icons[idx], name }; return { ...prev, topIcons: icons }; });
  const addIcon = () => setDraft((prev) => ({ ...prev, topIcons: [...prev.topIcons, { name: "New Icon", iconUrl: "" }] }));
  const removeIcon = (idx: number) => setDraft((prev) => ({ ...prev, topIcons: prev.topIcons.filter((_, i) => i !== idx) }));

  const updateLogoName = (idx: number, name: string) => setDraft((prev) => { const logos = [...prev.partnerLogos]; logos[idx] = { ...logos[idx], name }; return { ...prev, partnerLogos: logos }; });
  const addLogo = () => setDraft((prev) => ({ ...prev, partnerLogos: [...prev.partnerLogos, { name: "New Partner", logoUrl: "" }] }));
  const removeLogo = (idx: number) => setDraft((prev) => ({ ...prev, partnerLogos: prev.partnerLogos.filter((_, i) => i !== idx) }));

  const activeData = isEditing ? draft : data;

  const inputStyle = { fontSize: 13, padding: "6px 8px", borderRadius: 4, border: "1px solid #334155", background: "#0f1d33", color: "#fff", width: "100%", boxSizing: "border-box" as const };
  const smallBtnStyle = { fontSize: 10, padding: "2px 6px", borderRadius: 4, border: "1px solid #334155", background: "#1e293b", color: "#94a3b8", cursor: "pointer" };

  if (loading) {
    return (
      <section className="partner-section" style={{ background: "#0a1628", padding: "32px 48px 60px", position: "relative" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", position: "relative", zIndex: 2, padding: "0" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 48, marginBottom: 32, flexWrap: "wrap" }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="ps-skel" style={{ width: 24, height: 24, borderRadius: 4 }} />
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="ps-skel" style={{ height: 14, borderRadius: 6, maxWidth: 200 }} />
              <div className="ps-skel" style={{ height: 80, borderRadius: 8 }} />
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div className="ps-skel" style={{ width: 140, height: 36, borderRadius: 6 }} />
                <div className="ps-skel" style={{ width: 140, height: 36, borderRadius: 6 }} />
              </div>
              <div className="ps-skel" style={{ height: 14, borderRadius: 6, maxWidth: 280 }} />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="ps-skel" style={{ width: 90, height: 28, borderRadius: 20 }} />
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "28px 24px", alignItems: "center", justifyItems: "end" }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="ps-skel" style={{ width: "80%", height: 32, borderRadius: 4 }} />
              ))}
            </div>
          </div>
        </div>
        <style>{`
          .ps-skel {
            background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%);
            background-size: 200% 100%;
            animation: ps-shimmer 1.5s infinite;
          }
          @keyframes ps-shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          @media (max-width: 900px) {
            .partner-section > div > div:last-child { grid-template-columns: 1fr !important; gap: 40px !important; }
          }
        `}</style>
      </section>
    );
  }

  return (
    <section className="partner-section" style={{ background: "#0a1628", padding: "32px 48px 60px", position: "relative" }}>
      {isAdmin && !isEditing && (
        <div onClick={openEdit} style={{ position: "absolute", inset: 0, cursor: "pointer", zIndex: 10, background: "transparent" }} title="Click to edit Partner Section" />
      )}
      <input type="file" ref={fileInputRef} style={{ display: "none" }} accept="image/*" onChange={handleFileSelect} />

      <div className="partner-inner" style={{ maxWidth: 1400, margin: "0 auto", position: "relative", zIndex: 2, padding: 0 }}>
        {/* ── Scrolling Top Icons Marquee ── */}
        <div className="partner-marquee-outer" style={{ position: "relative", marginBottom: 32 }}>
          {/* Subtle gradient glow behind the row */}
          <div style={{
            position: "absolute",
            inset: "-20px -48px",
            background: "radial-gradient(ellipse 60% 80% at 50% 50%, rgba(30,58,100,0.35) 0%, rgba(10,22,40,0.15) 40%, transparent 70%)",
            pointerEvents: "none",
            zIndex: 0,
          }} />

          {isEditing ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 32, flexWrap: "wrap", position: "relative", zIndex: 1 }}>
              {activeData.topIcons.map((icon, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: "#94a3b8", minWidth: 48 }}>
                  <div style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {icon.iconUrl ? (
                      <img src={icon.iconUrl} alt={icon.name} style={{ width: 28, height: 28, objectFit: "contain", filter: "brightness(0) invert(0.7)" }} />
                    ) : (
                      <div style={{ width: 28, height: 28, color: "#94a3b8" }}><DefaultIcon name={icon.name} /></div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                    <input value={icon.name} onChange={(e) => updateIconName(i, e.target.value)} style={{ ...inputStyle, width: 80, fontSize: 10, padding: "2px 4px" }} />
                    <button onClick={() => triggerUpload("icon", i)} style={smallBtnStyle}>{uploadingIdx?.type === "icon" && uploadingIdx.idx === i ? "..." : "Upload"}</button>
                    <button onClick={() => removeIcon(i)} style={{ ...smallBtnStyle, color: "#ef4444" }}>Remove</button>
                  </div>
                </div>
              ))}
              <button onClick={addIcon} style={{ ...smallBtnStyle, border: "1px dashed #475569" }}>+ Add Icon</button>
            </div>
          ) : (
            <div className="partner-marquee-wrap" style={{ overflow: "hidden", position: "relative", zIndex: 1 }}>
              <div className="partner-marquee-track">
                {/* First set */}
                {activeData.topIcons.map((icon, i) => (
                  <div key={`a-${i}`} className="partner-marquee-item">
                    <div className="partner-marquee-icon">
                      {icon.iconUrl ? (
                        <img src={icon.iconUrl} alt={icon.name} style={{ width: 24, height: 24, objectFit: "contain", filter: "brightness(0) invert(0.65)" }} />
                      ) : (
                        <DefaultIcon name={icon.name} />
                      )}
                    </div>
                    <span className="partner-marquee-label">{icon.name}</span>
                  </div>
                ))}
                {/* Duplicate set for seamless loop */}
                {activeData.topIcons.map((icon, i) => (
                  <div key={`b-${i}`} className="partner-marquee-item">
                    <div className="partner-marquee-icon">
                      {icon.iconUrl ? (
                        <img src={icon.iconUrl} alt={icon.name} style={{ width: 24, height: 24, objectFit: "contain", filter: "brightness(0) invert(0.65)" }} />
                      ) : (
                        <DefaultIcon name={icon.name} />
                      )}
                    </div>
                    <span className="partner-marquee-label">{icon.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Grid */}
        <div className="partner-main-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
          {/* Left Column */}
          <div className="partner-left-col" style={{ display: "flex", flexDirection: "column", gap: 20, paddingLeft: 0 }}>
            {isEditing ? (
              <>
                <input value={draft.label} onChange={(e) => updateField("label", e.target.value)} style={{ ...inputStyle, fontSize: 12, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, color: "#94a3b8" }} />
                <input value={draft.heading} onChange={(e) => updateField("heading", e.target.value)} style={{ ...inputStyle, fontSize: 28, fontWeight: 800, letterSpacing: "-0.5px", lineHeight: 1.2 }} />
              </>
            ) : (
              <>
                <span style={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase", fontWeight: 700, color: "#94a3b8" }}>{activeData.label}</span>
                <h2 style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", lineHeight: 1.2, margin: 0 }}>{activeData.heading}</h2>
              </>
            )}

            {/* Buttons */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {isEditing ? (
                <>
                  <input value={draft.primaryButtonText} onChange={(e) => updateField("primaryButtonText", e.target.value)} style={{ ...inputStyle, width: "auto" }} />
                  <input value={draft.primaryButtonLink} onChange={(e) => updateField("primaryButtonLink", e.target.value)} placeholder="Link" style={{ ...inputStyle, width: 120 }} />
                  <input value={draft.secondaryButtonText} onChange={(e) => updateField("secondaryButtonText", e.target.value)} style={{ ...inputStyle, width: "auto", background: "transparent" }} />
                  <input value={draft.secondaryButtonLink} onChange={(e) => updateField("secondaryButtonLink", e.target.value)} placeholder="Link" style={{ ...inputStyle, width: 120 }} />
                </>
              ) : (
                <>
                  <Link href={activeData.primaryButtonLink} style={{ display: "inline-flex", alignItems: "center", background: "#fff", color: "#0a1628", borderRadius: 6, padding: "10px 18px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>{activeData.primaryButtonText}</Link>
                  <Link href={activeData.secondaryButtonLink} style={{ display: "inline-flex", alignItems: "center", background: "transparent", color: "#fff", border: "1px solid #475569", borderRadius: 6, padding: "10px 18px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>{activeData.secondaryButtonText}</Link>
                </>
              )}
            </div>

            {/* Explore Link */}
            {isEditing ? (
              <div style={{ display: "flex", gap: 8 }}>
                <input value={draft.exploreLinkText} onChange={(e) => updateField("exploreLinkText", e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                <input value={draft.exploreLinkUrl} onChange={(e) => updateField("exploreLinkUrl", e.target.value)} placeholder="URL" style={{ ...inputStyle, width: 120 }} />
              </div>
            ) : (
              <Link href={activeData.exploreLinkUrl} style={{ fontSize: 13, color: "#94a3b8", textDecoration: "none", fontWeight: 500 }}>{activeData.exploreLinkText} →</Link>
            )}

            {/* Category Pills */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
              {activeData.categories.map((cat, i) =>
                isEditing ? (
                  <div key={i} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <input value={cat.name} onChange={(e) => updateCategory(i, "name", e.target.value)} style={{ ...inputStyle, width: 100, borderRadius: 20 }} />
                    <input value={cat.link} onChange={(e) => updateCategory(i, "link", e.target.value)} placeholder="URL" style={{ ...inputStyle, width: 80 }} />
                    <button onClick={() => removeCategory(i)} style={{ ...smallBtnStyle, color: "#ef4444" }}>×</button>
                  </div>
                ) : (
                  <Link key={i} href={cat.link} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#132040", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 600, color: "#94a3b8", textDecoration: "none" }}>{cat.name} ›</Link>
                )
              )}
              {isEditing && <button onClick={addCategory} style={{ ...smallBtnStyle, border: "1px dashed #475569", borderRadius: 20 }}>+ Add</button>}
            </div>
          </div>

          {/* Right Column: Partner Logos */}
          <div className="partner-right-col" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "28px 24px", alignItems: "center", justifyItems: "end", paddingRight: 0 }}>
            {activeData.partnerLogos.map((logo, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 40, width: "100%", position: "relative" }}>
                {logo.logoUrl ? (
                  <img src={logo.logoUrl} alt={logo.name} style={{ maxHeight: 32, maxWidth: "100%", objectFit: "contain", filter: "brightness(0) invert(0.7)" }} />
                ) : (
                  <PartnerLogoFallback name={logo.name} />
                )}
                {isEditing && (
                  <div style={{ position: "absolute", top: -8, right: -8, display: "flex", gap: 4 }}>
                    <button onClick={() => triggerUpload("logo", i)} style={smallBtnStyle} title="Upload logo">{uploadingIdx?.type === "logo" && uploadingIdx.idx === i ? "..." : "↑"}</button>
                    <button onClick={() => removeLogo(i)} style={{ ...smallBtnStyle, color: "#ef4444" }} title="Remove">×</button>
                  </div>
                )}
                {isEditing && (
                  <input value={logo.name} onChange={(e) => updateLogoName(i, e.target.value)} style={{ position: "absolute", bottom: -18, ...inputStyle, width: "90%", textAlign: "center", fontSize: 10, padding: "2px 4px" }} />
                )}
              </div>
            ))}
            {isEditing && <button onClick={addLogo} style={{ ...smallBtnStyle, border: "1px dashed #475569" }}>+ Add Logo</button>}
          </div>
        </div>

        {/* Admin Edit Toolbar */}
        {isEditing && (
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 32, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <button onClick={handleSave} disabled={saving} style={{ background: "#22c55e", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", padding: "8px 16px", fontSize: 13, fontWeight: 700 }}>{saving ? "Saving..." : "Save Changes"}</button>
            <button onClick={closeEdit} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, color: "#fff", cursor: "pointer", padding: "8px 16px", fontSize: 13 }}>Cancel</button>
            {saveMsg && <span style={{ color: saveMsg === "Saved!" ? "#4ade80" : "#fb7185", fontSize: 13, fontWeight: 600 }}>{saveMsg}</span>}
          </div>
        )}
      </div>

      <style>{`
        .partner-marquee-wrap {
          -webkit-mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
          mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
        }
        .partner-marquee-track {
          display: flex;
          gap: 48px;
          width: max-content;
          animation: partnerScroll 25s linear infinite;
        }
        .partner-marquee-item {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
          color: #94a3b8;
        }
        .partner-marquee-icon {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .partner-marquee-icon svg {
          width: 100%;
          height: 100%;
        }
        .partner-marquee-label {
          font-size: 13px;
          font-weight: 500;
          color: #94a3b8;
          white-space: nowrap;
          letter-spacing: -0.2px;
        }
        @keyframes partnerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .partner-left-col { padding-left: 0; }
        .partner-right-col { justify-self: end; padding-right: 0; }
        @media (max-width: 900px) {
          .partner-main-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .partner-section { padding: 48px 24px !important; }
          .partner-inner { padding: 0 !important; }
        }
        @media (max-width: 480px) {
          .partner-section { padding: 36px 16px !important; }
          .partner-marquee-track { gap: 32px !important; }
          .partner-inner { padding: 0 !important; }
        }
      `}</style>
    </section>
  );
}
