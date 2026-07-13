"use client";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import "../app/home.css";

import { BASE_URL } from "@/lib/config";

interface FooterMenuItem {
  title: string;
  link: string;
}

interface FooterMenuGroup {
  title: string;
  items: FooterMenuItem[];
}

interface FooterBottomLink {
  title: string;
  link: string;
}

export default function PublicFooter() {
  const [siteName, setSiteName] = useState("IINM");
  const [logoUrl, setLogoUrl] = useState("");
  const [darkLogoUrl, setDarkLogoUrl] = useState("");
  const [contactInfo, setContactInfo] = useState<any>(null);
  const [footerGroups, setFooterGroups] = useState<FooterMenuGroup[]>([]);
  const [footerBottomLinks, setFooterBottomLinks] = useState<FooterBottomLink[]>([]);

  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [formStatus, setFormStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  useEffect(() => {
    const bUrl = BASE_URL;
    try {
      const cachedSite = localStorage.getItem("iinm_site_settings");
      if (cachedSite) {
        const d = JSON.parse(cachedSite);
        setSiteName(d.site_name || "IINM");
        setLogoUrl(d.logo_url || "");
        setDarkLogoUrl(d.dark_logo_url || "");
      }
      const cachedContact = localStorage.getItem("iinm_contact_settings");
      if (cachedContact) {
        setContactInfo(JSON.parse(cachedContact));
      }
    } catch (e) {
      console.error("Cache read error", e);
    }

    fetch(`${bUrl}/api/settings/site`).then(r => r.json()).then(d => {
      localStorage.setItem("iinm_site_settings", JSON.stringify(d));
      setSiteName(d.site_name || "IINM");
      setLogoUrl(d.logo_url || "");
      setDarkLogoUrl(d.dark_logo_url || "");
    }).catch(() => {});

    fetch(`${bUrl}/api/contact/settings`).then(r => r.json()).then(d => {
      localStorage.setItem("iinm_contact_settings", JSON.stringify(d));
      setContactInfo(d);
    }).catch(() => {});

    fetch(`${bUrl}/api/settings/footer-menu`).then(r => r.json()).then(d => {
      if (d.groups && d.groups.length > 0) {
        setFooterGroups(d.groups);
        setFooterBottomLinks(d.bottom_links || []);
      }
    }).catch(() => {
      // Fallback: use hardcoded groups if API fails
      setFooterGroups([
        { title: "Company", items: [
          { title: "About", link: "/about-us" },
          { title: "Careers", link: "/courses" },
          { title: "Contact", link: "/contact-us" },
          { title: "Blog", link: "/" },
        ]},
        { title: "Resources", items: [
          { title: "Courses", link: "/courses" },
          { title: "Curriculum", link: "/courses" },
          { title: "Labs", link: "/about-us" },
          { title: "Projects", link: "/courses" },
        ]},
        { title: "Plans", items: [
          { title: "For Individuals", link: "/courses" },
          { title: "For Students", link: "/courses" },
          { title: "For Business", link: "/contact-us" },
          { title: "Discounts", link: "/courses" },
        ]},
        { title: "Subjects", items: [
          { title: "AI", link: "/courses" },
          { title: "Machine Learning", link: "/courses" },
          { title: "Data Science", link: "/courses" },
          { title: "Robotics", link: "/courses" },
          { title: "Python", link: "/courses" },
          { title: "Cloud Computing", link: "/courses" },
        ]},
        { title: "Career Building", items: [
          { title: "Career Paths", link: "/courses" },
          { title: "Interview Prep", link: "/contact-us" },
          { title: "Certifications", link: "/courses" },
          { title: "Placements", link: "/contact-us" },
        ]},
      ]);
      setFooterBottomLinks([
        { title: "Privacy Policy", link: "/" },
        { title: "Cookie Policy", link: "/" },
        { title: "Terms", link: "/" },
      ]);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    setFormStatus("submitting");
    try {
      const res = await fetch(`${BASE_URL}/api/contact/inquiry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, interest: "Footer Enquiry" }),
      });
      if (res.ok) {
        setFormStatus("success");
        setForm({ name: "", email: "", phone: "", message: "" });
        setTimeout(() => setFormStatus("idle"), 4000);
      } else {
        setFormStatus("error");
      }
    } catch {
      setFormStatus("error");
    }
  };

  return (
    <footer className="hp-footer">
      {/* Subtle gradient orbs */}
      <div className="hp-footer-glow hp-footer-glow--tl" />
      <div className="hp-footer-glow hp-footer-glow--br" />

      <div className="hp-footer-inner">

        {/* ── LEFT: Logo + Multi-column Links ── */}
        <div className="hp-footer-left">
          {/* Dark Logo */}
          <div className="hp-footer-logo-wrap">
            {darkLogoUrl || logoUrl ? (
              <img src={darkLogoUrl || logoUrl} alt={siteName} className="hp-footer-dark-logo" />
            ) : (
              <div className="hp-footer-logo-fallback">
                <span className="hp-footer-logo-name" style={{ color: '#64748b', fontSize: 14 }}>Logo Not Uploaded</span>
              </div>
            )}
          </div>

          <div className="hp-footer-links-grid">
            {footerGroups.map((group, idx) => (
              <div className="hp-footer-group" key={idx}>
                <h4 className="hp-footer-group-title">{group.title}</h4>
                <ul>
                  {group.items.map((item, iIdx) => (
                    <li key={iIdx}><Link href={item.link || "/"}>{item.title}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Enquiry Form ── */}
        <div className="hp-footer-form-col">
          <div className="hp-footer-form-box">
            <h3 className="hp-footer-form-title">Quick Enquiry</h3>
            <p className="hp-footer-form-sub">Send us a message and we will get back to you shortly.</p>
            <form onSubmit={handleSubmit} className="hp-footer-form">
              <div className="hp-footer-form-row">
                <input
                  type="text"
                  placeholder="Your Name"
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="hp-footer-input"
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="hp-footer-input"
                />
              </div>
              <input
                type="tel"
                placeholder="Phone Number"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="hp-footer-input"
              />
              <textarea
                placeholder="How can we help you?"
                rows={3}
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                className="hp-footer-textarea"
              />
              <button
                type="submit"
                disabled={formStatus === "submitting"}
                className="hp-footer-submit"
              >
                {formStatus === "submitting" ? "Sending..." : "Send Enquiry"}
              </button>
              {formStatus === "success" && (
                <span className="hp-footer-form-msg hp-footer-form-msg--ok">Thank you! We will reach out soon.</span>
              )}
              {formStatus === "error" && (
                <span className="hp-footer-form-msg hp-footer-form-msg--err">Something went wrong. Please try again.</span>
              )}
            </form>
          </div>
        </div>

      </div>

      {/* ── Bottom Bar ── */}
      <div className="hp-footer-bottom-bar">
        <div className="hp-footer-bottom-inner">
          <div className="hp-footer-legal">
            {footerBottomLinks.map((link, idx) => (
              <React.Fragment key={idx}>
                <Link href={link.link || "/"}>{link.title}</Link>
                {idx < footerBottomLinks.length - 1 && <span className="hp-footer-dot">|</span>}
              </React.Fragment>
            ))}
          </div>
          <span className="hp-footer-copyright">© {new Date().getFullYear()} {siteName}. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}

