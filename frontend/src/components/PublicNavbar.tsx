"use client";
import Link from "next/link";
import React, { useEffect, useState, useRef } from "react";
import NotificationBar from "./NotificationBar";
import "../app/home.css";

import { BASE_URL } from "@/lib/config";
import { apiFetch } from "@/lib/apiFetch";

function isAdminLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  const loggedIn = localStorage.getItem("iinm_is_logged_in") === "true";
  const expiry = localStorage.getItem("iinm_login_expiry");
  const sessionValid = loggedIn && expiry ? Date.now() < Number(expiry) : false;
  return sessionValid;
}

interface NavbarItem {
  id: number;
  parent_id: number | null;
  title: string;
  link: string | null;
  badge: string | null;
  description: string | null;
  item_type: "main" | "dropdown" | "sidebar_item" | "content_item" | "footer_cta";
  order_position: number;
  icon: string | null;
  meta_data: string | null;
  sub_items: NavbarItem[];
}

export default function PublicNavbar() {
  const [siteName, setSiteName] = useState("IINM");
  const [logoUrl, setLogoUrl] = useState("/logo.png");
  const [darkLogoUrl, setDarkLogoUrl] = useState("/logo.png");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [contactInfo, setContactInfo] = useState<any>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Dynamic submenu expand states (both mobile and desktop contexts)
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [activeSidebarId, setActiveSidebarId] = useState<number | null>(null);
  const [navbarItems, setNavbarItems] = useState<NavbarItem[]>([]);
  const [navbarLoading, setNavbarLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // AI Chat & Search Modal states
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    { sender: "ai", text: "Hello! I am your IINM AI Advisor. Ask me anything about our specialized AI courses, ₹7 Lakh scholarships, or placement drives!" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isAiTyping]);

  useEffect(() => {
    const bUrl = BASE_URL;
    
    // Synchronously load from cache for instant zero-latency rendering
    try {
      const cachedSite = localStorage.getItem("iinm_site_settings");
      if (cachedSite) {
        const d = JSON.parse(cachedSite);
        setSiteName(d.site_name || "IINM");
        setLogoUrl(d.logo_url || "/logo.png");
        setDarkLogoUrl(d.dark_logo_url || d.logo_url || "/logo.png");
      }
      const cachedContact = localStorage.getItem("iinm_contact_settings");
      if (cachedContact) {
        setContactInfo(JSON.parse(cachedContact));
      }
      const cachedNavbar = localStorage.getItem("iinm_navbar_items");
      if (cachedNavbar) {
        setNavbarItems(JSON.parse(cachedNavbar));
        setNavbarLoading(false);
      }
    } catch (e) {
      console.error("Cache read error", e);
    }

    // Refresh in background
    fetch(`${bUrl}/api/settings/site`).then(r => r.json()).then(d => {
      localStorage.setItem("iinm_site_settings", JSON.stringify(d));
      setSiteName(d.site_name || "IINM");
      setLogoUrl(d.logo_url || "/logo.png");
      setDarkLogoUrl(d.dark_logo_url || d.logo_url || "/logo.png");
    }).catch(() => {});

    fetch(`${bUrl}/api/contact/settings`).then(r => r.json()).then(d => {
      localStorage.setItem("iinm_contact_settings", JSON.stringify(d));
      setContactInfo(d);
    }).catch(() => {});

    fetch(`${bUrl}/api/settings/navbar`).then(r => r.json()).then(d => {
      localStorage.setItem("iinm_navbar_items", JSON.stringify(d));
      setNavbarItems(d);
      setNavbarLoading(false);
    }).catch(() => {
      setNavbarLoading(false);
    });

    setIsAdmin(isAdminLoggedIn());

    // Check auth status
    const checkLogin = () => {
      const loggedIn = localStorage.getItem("iinm_is_logged_in");
      const expiry = localStorage.getItem("iinm_login_expiry");
      if (loggedIn === "true" && expiry && Date.now() < Number(expiry)) {
        setIsLoggedIn(true);
      } else if (loggedIn === "true") {
        // Clear stale session
        localStorage.removeItem("iinm_is_logged_in");
        localStorage.removeItem("iinm_login_expiry");
        setIsLoggedIn(false);
      }
    };
    checkLogin();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // AI Response generator
  const triggerAiResponse = (userQuery: string) => {
    setIsAiTyping(true);
    
    // Generate authentic matching response
    let responseText = "That is a great question! At IINM, we offer industry-recognized global certifications, intensive curriculum and real-world hands-on project experience in Artificial Intelligence. Would you like to schedule a 1-on-1 career callback with our counseling team?";
    
    const query = userQuery.toLowerCase();
    if (query.includes("course") || query.includes("program") || query.includes("syllabus") || query.includes("ai")) {
      responseText = "IINM offers 3 major specializations: \n\n1. **Advanced AI & Data Science** (11-Month Flagship with global credentials)\n2. **Full Stack AI Engineering** (Focused on LLMs, deployment, and cloud operations)\n3. **AI Product Leadership** (For business & technology directors).\n\nAll courses include capstone projects and live classroom interactions!";
    } else if (query.includes("scholarship") || query.includes("discount") || query.includes("cost") || query.includes("fee") || query.includes("7,00,000")) {
      responseText = "Yes! IINM offers merit-based and need-based scholarships worth up to **₹7,00,000** (as featured on our Admissions Topbar). This program helps top talent acquire skills without financial friction. Applications are open right now!";
    } else if (query.includes("placement") || query.includes("job") || query.includes("salary") || query.includes("partner") || query.includes("career")) {
      responseText = "Our Placement Support is outstanding! IINM features: \n\n- **150+ Top Tech hiring partners** across India and globally.\n- **Direct interview scheduling** with average starting salaries of ₹12 LPA and highest up to ₹42 LPA.\n- **Dedicated resume preparation** and 1-on-1 mock interviews with industry leaders.";
    }

    setTimeout(() => {
      setIsAiTyping(false);
      
      // Simulate typing/streaming effect word by word
      const words = responseText.split(" ");
      let currentText = "";
      let index = 0;
      
      // Place dummy empty AI message
      setChatMessages((prev) => [...prev, { sender: "ai", text: "" }]);
      
      const interval = setInterval(() => {
        if (index < words.length) {
          currentText += (index === 0 ? "" : " ") + words[index];
          setChatMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { sender: "ai", text: currentText };
            return updated;
          });
          index++;
        } else {
          clearInterval(interval);
        }
      }, 45); // Smooth streaming typing speeds
    }, 1200); // 1.2s thinking delay
  };

  const handleSendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setChatInput("");
    triggerAiResponse(userMsg);
  };

  const handleSuggestedClick = (text: string) => {
    setChatMessages((prev) => [...prev, { sender: "user", text }]);
    triggerAiResponse(text);
  };

  return (
    <>
      <div style={{ position: "sticky", top: 0, zIndex: 100, width: "100%" }}>
        <NotificationBar />
        <nav className="hp-nav" style={{ background: "#ffffff", borderBottom: "1px solid #f1f5f9", width: "100%", boxShadow: "0 2px 10px rgba(0,0,0,0.01)" }}>
        {/* Outer full-width container for logo on far-left and login on far-right */}
        <div style={{ padding: "0 48px", width: "100%", boxSizing: "border-box", position: "relative" }} className="hp-nav-full-container">
          <div className="hp-nav-inner" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 74 }}>
            
            {/* Left side brand logo (Far Left) */}
            <Link href="/" style={{ textDecoration: "none", zIndex: 10 }}>
              <div className="hp-logo" style={{ display: "flex", alignItems: "center" }}>
                {logoUrl ? (
                  <img src={logoUrl} alt={siteName} className="hp-logo-img" style={{ height: 44, width: "auto", objectFit: "contain" }} />
                ) : (
                  <div className="hp-logo-box" style={{ width: 40, height: 40, background: "#0a1628", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, fontWeight: 800 }}>I</div>
                )}
              </div>
            </Link>

            {/* Desktop Navigation Links — left aligned near logo, matching Hero left content */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                marginLeft: "24px",
                flex: 1,
              }}
              className="hp-nav-links-wrapper"
            >
                <style>{`
                  .hp-nav-links {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    pointer-events: auto;
                    padding-left: 0px;
                    transition: padding-left 0.2s ease;
                  }
                  @media (max-width: 1200px) {
                    .hp-nav-links {
                      padding-left: 140px; /* Offset only on compact tablet/desktop screens to prevent overlapping the logo */
                      gap: 14px;
                    }
                  }
                  .nav-link-dropdown {
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    cursor: pointer;
                    padding: 12px 0;
                  }
                  .nav-dropdown-card {
                    position: absolute;
                    top: 100%;
                    left: -80px;
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    box-shadow: 0 20px 40px -6px rgba(10, 22, 40, 0.12);
                    width: 580px;
                    display: flex;
                    flex-direction: column;
                    opacity: 0;
                    visibility: hidden;
                    transform: translateY(12px) scale(0.96); /* High-end compact starting scale */
                    transform-origin: top center;
                    transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1), transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.35s;
                    z-index: 1000;
                    overflow: hidden;
                  }
                  .nav-link-dropdown:hover .nav-dropdown-card {
                    opacity: 1;
                    visibility: visible;
                    transform: translateY(2px) scale(1); /* Snappy scale-up bouncy lift */
                  }
                  .dropdown-body {
                    display: flex;
                    width: 100%;
                  }
                  .dropdown-sidebar {
                    width: 38%;
                    background: #f8fafc;
                    border-right: 1px solid #f1f5f9;
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                  }
                  .dropdown-sidebar-title {
                    font-size: 11px;
                    font-weight: 800;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.8px;
                  }
                  .dropdown-sidebar-item {
                    font-size: 13px;
                    font-weight: 700;
                    color: #0f172a;
                    padding: 8px 10px;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.2s;
                  }
                  .dropdown-sidebar-item.active {
                    background: #ffffff;
                    color: #e63946;
                    box-shadow: 0 2px 6px rgba(10, 22, 40, 0.04);
                    border-left: 3px solid #e63946;
                  }
                  .dropdown-content {
                    width: 62%;
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                  }
                  .nav-dropdown-item {
                    padding: 10px 14px;
                    border-radius: 6px;
                    color: #0f172a;
                    text-decoration: none;
                    display: flex;
                    flex-direction: column;
                    transition: all 0.15s ease;
                  }
                  .nav-dropdown-item:hover {
                    background: #f8fafc;
                  }
                  .nav-dropdown-title-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    width: 100%;
                  }
                  .nav-dropdown-title {
                    font-size: 13.5px;
                    font-weight: 800;
                    color: #0f172a;
                    transition: color 0.15s;
                  }
                  .nav-dropdown-item:hover .nav-dropdown-title {
                    color: #e63946;
                  }
                  .nav-dropdown-badge {
                    font-size: 9px;
                    font-weight: 800;
                    padding: 2px 6px;
                    border-radius: 4px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                  }
                  .badge-red {
                    background: rgba(230, 57, 70, 0.1);
                    color: #e63946;
                  }
                  .badge-green {
                    background: rgba(16, 185, 129, 0.1);
                    color: #10b981;
                  }
                  .badge-blue {
                    background: rgba(59, 130, 246, 0.1);
                    color: #3b82f6;
                  }
                  .nav-dropdown-sub {
                    font-size: 11px;
                    color: #64748b;
                    font-weight: 500;
                    margin-top: 3px;
                  }
                  .dropdown-footer {
                    width: 100%;
                    padding: 11px 16px;
                    font-size: 12px;
                    font-weight: 700;
                    text-align: center;
                    text-decoration: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    color: #ffffff !important;
                    transition: opacity 0.2s;
                  }
                  .dropdown-footer:hover {
                    opacity: 0.95;
                  }
                  .search-pill-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: #f1f5f9;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 8px 14px;
                    color: #475569;
                    font-size: 12.5px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s ease;
                  }
                  .search-pill-btn:hover {
                    background: #e2e8f0;
                    border-color: #cbd5e1;
                    color: #0f172a;
                  }
                  .hp-main-menu-item {
                    font-size: 14px;
                    font-weight: 700;
                    color: #0a1628 !important;
                    text-decoration: none;
                    padding: 6px 14px;
                    border-radius: 30px; /* High-end Gen-Z pill outline */
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    cursor: pointer;
                    background: transparent;
                    border: 1px solid transparent;
                  }
                  .hp-main-menu-item:hover,
                  .nav-link-dropdown:hover .hp-main-menu-item {
                    color: #e63946 !important; /* Elegant crimson brand color transition */
                    background: rgba(230, 57, 70, 0.06); /* Ultra light transparent glassmorphic wash */
                    border-color: rgba(230, 57, 70, 0.12); /* Modern soft border glow */
                    transform: scale(1.04) translateY(-1px); /* Premium physical bouncy lift */
                    box-shadow: 0 4px 12px rgba(230, 57, 70, 0.04);
                  }
                  .hp-caret {
                    font-size: 8px;
                    margin-left: 2px;
                    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), color 0.25s ease;
                    opacity: 0.6;
                  }
                  .nav-link-dropdown:hover .hp-caret {
                    transform: rotate(180deg);
                    color: #e63946;
                    opacity: 1;
                  }
                `}</style>

                {navbarLoading ? (
                  // Gorgeous Shimmer Skeletons matching brand sizes
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <div style={{ width: "68px", height: "32px", background: "#f1f5f9", borderRadius: "30px", animation: "pulse 1.5s infinite" }} />
                    <div style={{ width: "84px", height: "32px", background: "#f1f5f9", borderRadius: "30px", animation: "pulse 1.5s infinite" }} />
                    <div style={{ width: "88px", height: "32px", background: "#f1f5f9", borderRadius: "30px", animation: "pulse 1.5s infinite" }} />
                    <div style={{ width: "96px", height: "32px", background: "#f1f5f9", borderRadius: "30px", animation: "pulse 1.5s infinite" }} />
                  </div>
                ) : (
                  navbarItems.map((item) => {
                    const hasSub = item.item_type === "dropdown";
                    
                    if (!hasSub) {
                      return (
                        <Link 
                          key={item.id} 
                          href={item.link || "/"} 
                          className="hp-main-menu-item"
                        >
                          {item.title}
                        </Link>
                      );
                    }

                    // Extract sidebar items and footer items from dropdown
                    const sidebars = item.sub_items?.filter(s => s.item_type === "sidebar_item") || [];
                    const footers = item.sub_items?.filter(s => s.item_type === "footer_cta") || [];

                    // Default active sidebar to first item for this dropdown
                    const activeSidebar = sidebars.find(s => s.id === activeSidebarId) || sidebars[0];
                    const activeContents = activeSidebar?.sub_items?.filter(s => s.item_type === "content_item") || [];

                    return (
                      <div 
                        key={item.id} 
                        className="nav-link-dropdown"
                        onMouseEnter={() => {
                          if (sidebars.length > 0) setActiveSidebarId(sidebars[0].id);
                        }}
                        onMouseLeave={() => setActiveSidebarId(null)}
                      >
                        <span className="hp-main-menu-item">
                          <span>{item.title}</span>
                          <span className="hp-caret">▼</span>
                        </span>
                        
                        <div className="nav-dropdown-card">
                          <div className="dropdown-body">
                            {/* Left Sidebar column */}
                            <div className="dropdown-sidebar">
                              <div className="dropdown-sidebar-title">Sections</div>
                              {sidebars.map(sub => (
                                <div 
                                  key={sub.id} 
                                  className={`dropdown-sidebar-item ${activeSidebar?.id === sub.id ? "active" : ""}`}
                                  onMouseEnter={() => setActiveSidebarId(sub.id)}
                                >
                                  <span>{sub.icon}</span> {sub.title}
                                </div>
                              ))}
                            </div>

                            {/* Right Main column — shows content of ACTIVE sidebar item */}
                            <div className="dropdown-content">
                              {activeContents.length === 0 ? (
                                <div style={{ fontSize: "12px", color: "#94a3b8", padding: "20px" }}>
                                  No items in this section
                                </div>
                              ) : (
                                activeContents.map(sub => (
                                  <Link key={sub.id} href={sub.link || "/"} className="nav-dropdown-item">
                                    <div className="nav-dropdown-title-row">
                                      <span className="nav-dropdown-title">{sub.title}</span>
                                      {sub.badge && <span className="nav-dropdown-badge badge-red">{sub.badge}</span>}
                                    </div>
                                    <span className="nav-dropdown-sub">{sub.description}</span>
                                  </Link>
                                ))
                              )}
                            </div>
                          </div>

                          {/* Bottom CTA bar */}
                          {footers.map(sub => (
                            <Link 
                              key={sub.id} 
                              href={sub.link || "/"} 
                              className="dropdown-footer" 
                              style={{ background: sub.meta_data || "linear-gradient(135deg, #e63946 0%, #cb2d39 100%)" }}
                            >
                              <span>{sub.title}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            {/* Desktop Auth Section (Far Right) with Side-by-Side buttons */}
            <div className="hp-nav-auth-desktop" style={{ display: "flex", alignItems: "center", gap: "16px", zIndex: 10 }}>
              
              {/* Ask AI Assistant Button shifted here side-by-side with Sign In */}
              <button onClick={() => setIsSearchModalOpen(true)} className="search-pill-btn" style={{ margin: 0 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <span>Ask AI Assistant</span>
              </button>

              {isLoggedIn ? (
                <div style={{ position: "relative" }} ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    style={{
                      width: 40, height: 40, borderRadius: "50%", background: "#f8fafc",
                      border: "1px solid #e2e8f0", display: "flex", alignItems: "center",
                      justifyContent: "center", cursor: "pointer", transition: "all 0.2s"
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "#cbd5e1"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "#e2e8f0"}
                  >
                    <span style={{ fontSize: 16, fontWeight: 700, color: "#475569" }}>A</span>
                  </button>
                  
                  {isUserMenuOpen && (
                    <div style={{
                      position: "absolute", top: "100%", right: 0, marginTop: 8,
                      width: 200, background: "#fff", borderRadius: 8,
                      boxShadow: "0 10px 25px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0",
                      overflow: "hidden", zIndex: 100
                    }}>
                      <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>My Account</div>
                      </div>
                      <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                        <Link 
                          href="/admin" 
                          style={{ padding: "8px 12px", fontSize: 14, color: "#475569", textDecoration: "none", borderRadius: 6, transition: "background 0.2s", display: "flex", alignItems: "center", gap: 8 }}
                          onMouseEnter={e => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#0f172a"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#475569"; }}
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
                          Dashboard
                        </Link>
                        <button 
                          onClick={() => {
                            localStorage.removeItem("iinm_is_logged_in");
                            localStorage.removeItem("iinm_device_token");
                            localStorage.removeItem("iinm_login_expiry");
                            setIsLoggedIn(false);
                            setIsUserMenuOpen(false);
                          }} 
                          style={{ padding: "8px 12px", fontSize: 14, color: "#ef4444", textDecoration: "none", borderRadius: 6, transition: "background 0.2s", display: "flex", alignItems: "center", gap: 8, width: "100%", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                          onMouseEnter={e => e.currentTarget.style.background = "#fef2f2"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/login" className="hp-btn-primary" style={{ borderRadius: "8px" }}>Sign In</Link>
              )}
            </div>

            {/* Mobile Hamburger Trigger (Visible on Mobile only, locked on the far right) */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="hp-hamburger-btn"
              style={{
                display: "none",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "8px",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
              }}
              title="Open Menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0a1628" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </nav>
      </div>

      {/* Interactive custom AI Search & Chat Modal with fade-in scale animation */}
      {isSearchModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10, 22, 40, 0.45)",
            backdropFilter: "blur(12px)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setIsSearchModalOpen(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "600px",
              background: "#ffffff",
              borderRadius: "12px",
              boxShadow: "0 25px 60px -10px rgba(10,22,40,0.25)",
              display: "flex",
              flexDirection: "column",
              height: "500px",
              overflow: "hidden",
              border: "1px solid rgba(10, 22, 40, 0.08)",
              animation: "modalFadeIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <style>{`
              @keyframes modalFadeIn {
                from { opacity: 0; transform: scale(0.9) translateY(20px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
              }
              .chat-scrollbar::-webkit-scrollbar {
                width: 6px;
              }
              .chat-scrollbar::-webkit-scrollbar-track {
                background: transparent;
              }
              .chat-scrollbar::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 4px;
              }
              .suggested-pill {
                background: #f1f5f9;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 6px 12px;
                font-size: 11.5px;
                font-weight: 600;
                color: #475569;
                cursor: pointer;
                transition: all 0.2s;
              }
              .suggested-pill:hover {
                background: rgba(230, 57, 70, 0.08);
                border-color: #e63946;
                color: #e63946;
              }
            `}</style>

            {/* Modal Header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0a1628", color: "#ffffff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", animation: "pulse 1.5s infinite" }} />
                <span style={{ fontSize: "15px", fontWeight: 800, letterSpacing: "0.2px" }}>IINM Admissions AI Assistant</span>
              </div>
              <button
                onClick={() => setIsSearchModalOpen(false)}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#ffffff",
                }}
              >
                ×
              </button>
            </div>

            {/* Scrollable Chat Area */}
            <div className="chat-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "14px", background: "#f8fafc" }}>
              {chatMessages.map((msg, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: msg.sender === "user" ? "flex-end" : "flex-start" }}>
                  <div
                    style={{
                      maxWidth: "80%",
                      padding: "12px 16px",
                      borderRadius: "10px",
                      fontSize: "13.5px",
                      lineHeight: "1.5",
                      fontWeight: 550,
                      background: msg.sender === "user" ? "#0a1628" : "#ffffff",
                      color: msg.sender === "user" ? "#ffffff" : "#1e293b",
                      boxShadow: msg.sender === "user" ? "0 4px 10px rgba(10,22,40,0.1)" : "0 2px 8px rgba(0,0,0,0.03)",
                      border: msg.sender === "user" ? "none" : "1px solid #e2e8f0",
                      borderTopRightRadius: msg.sender === "user" ? "0px" : "10px",
                      borderTopLeftRadius: msg.sender === "user" ? "10px" : "0px",
                      whiteSpace: "pre-line",
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {isAiTyping && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", padding: "12px 20px", borderRadius: "10px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ width: "6px", height: "6px", background: "#94a3b8", borderRadius: "50%", animation: "pulse 1.2s infinite" }} />
                    <span style={{ width: "6px", height: "6px", background: "#94a3b8", borderRadius: "50%", animation: "pulse 1.2s infinite 0.2s" }} />
                    <span style={{ width: "6px", height: "6px", background: "#94a3b8", borderRadius: "50%", animation: "pulse 1.2s infinite 0.4s" }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Suggesed Prompts Pill Cards */}
            <div style={{ padding: "10px 20px", background: "#ffffff", borderTop: "1px solid #f1f5f9", display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button onClick={() => handleSuggestedClick("Explain the AI & Data Science syllabus")} className="suggested-pill">
                📚 Syllabus Details
              </button>
              <button onClick={() => handleSuggestedClick("Tell me about the ₹7,00,000 scholarship")} className="suggested-pill">
                🎓 Scholarships
              </button>
              <button onClick={() => handleSuggestedClick("Explain placement support and job packages")} className="suggested-pill">
                💼 Placements
              </button>
            </div>

            {/* Input Submission Area */}
            <form onSubmit={handleSendChat} style={{ padding: "14px 20px", background: "#ffffff", borderTop: "1px solid #f1f5f9", display: "flex", gap: "10px" }}>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about courses, scholarships, placements..."
                style={{
                  flex: 1,
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  padding: "10px 20px",
                  fontSize: "13px",
                  fontWeight: 500,
                  outline: "none",
                  background: "#f8fafc",
                }}
              />
              <button
                type="submit"
                style={{
                  background: "#0a1628",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "50%",
                  width: "40px",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                ➔
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Drawer Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10, 22, 40, 0.4)",
            backdropFilter: "blur(4px)",
            zIndex: 999,
            transition: "opacity 0.3s ease",
          }}
        />
      )}

      {/* Mobile Drawer Sidebar (Upgraded to premium dark midnight navy theme, left slide-in corporate drawer) */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0, // Slides smoothly from LEFT!
          bottom: 0,
          width: "280px",
          background: "#0a1628", // Premium deep midnight navy brand background
          boxShadow: "8px 0 32px rgba(0, 0, 0, 0.3)",
          borderRight: "1px solid rgba(255, 255, 255, 0.06)",
          zIndex: 1000,
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)", // Spring cubic bezier!
          transform: isSidebarOpen ? "translateX(0)" : "translateX(-100%)", // Left slide transform!
        }}
      >
        {/* Drawer Header with Logo & Close Icon */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {darkLogoUrl ? (
              <img src={darkLogoUrl} alt={siteName} style={{ height: 38, width: "auto", objectFit: "contain" }} />
            ) : logoUrl ? (
              <img src={logoUrl} alt={siteName} style={{ height: 38, width: "auto", objectFit: "contain" }} />
            ) : (
              <span style={{ color: "#ffffff", fontWeight: 800, fontSize: "16px", letterSpacing: "0.5px" }}>{siteName}</span>
            )}
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#ffffff",
              transition: "background 0.2s",
            }}
            title="Close Menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Navigation Items (Modern lists with collapsible submenus on mobile) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", overflowY: "auto", flex: 1, marginTop: "12px" }} className="chat-scrollbar">
          <span style={{ fontSize: "11px", fontWeight: 800, color: "rgba(255, 255, 255, 0.5)", letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: "4px" }}>Navigation</span>
          
          {navbarLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ height: "36px", width: "100%", background: "rgba(255, 255, 255, 0.05)", borderRadius: "6px", animation: "pulse 1.5s infinite" }} />
              <div style={{ height: "36px", width: "100%", background: "rgba(255, 255, 255, 0.05)", borderRadius: "6px", animation: "pulse 1.5s infinite" }} />
              <div style={{ height: "36px", width: "100%", background: "rgba(255, 255, 255, 0.05)", borderRadius: "6px", animation: "pulse 1.5s infinite" }} />
            </div>
          ) : (
            navbarItems.map((item) => {
              const hasSub = item.item_type === "dropdown";
              
              if (!hasSub) {
                return (
                  <Link
                    key={item.id}
                    href={item.link || "/"}
                    onClick={() => setIsSidebarOpen(false)}
                    style={{ fontSize: "13.5px", fontWeight: 700, color: "#ffffff", textDecoration: "none", padding: "10px 14px", borderRadius: "6px", background: "rgba(255, 255, 255, 0.04)", display: "block" }}
                  >
                    {item.title}
                  </Link>
                );
              }

              const sidebars = item.sub_items?.filter(s => s.item_type === "sidebar_item") || [];
              const isExpanded = !!expandedItems[item.id];

              return (
                <div key={item.id} style={{ display: "flex", flexDirection: "column" }}>
                  <button
                    onClick={() => setExpandedItems(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                    style={{ width: "100%", textAlign: "left", fontSize: "13.5px", fontWeight: 700, color: "#ffffff", background: "transparent", border: "none", padding: "10px 14px", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", transition: "all 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)"}
                    onMouseLeave={e => { if(!isExpanded) e.currentTarget.style.background = "transparent"; }}
                  >
                    <span>{item.title}</span>
                    <span style={{ fontSize: "10px", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "all 0.2s", color: "rgba(255, 255, 255, 0.6)" }}>▼</span>
                  </button>
                  {isExpanded && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", padding: "4px 0 10px 16px", background: "transparent", borderLeft: "2px solid #e63946", marginLeft: "14px", marginTop: "4px" }}>
                      {sidebars.map(sidebar => {
                        const sidebarExpanded = !!expandedItems[sidebar.id];
                        const sidebarContents = sidebar.sub_items?.filter(s => s.item_type === "content_item") || [];
                        return (
                          <div key={sidebar.id} style={{ display: "flex", flexDirection: "column" }}>
                            <button
                              onClick={() => setExpandedItems(prev => ({ ...prev, [sidebar.id]: !prev[sidebar.id] }))}
                              style={{ width: "100%", textAlign: "left", fontSize: "12.5px", fontWeight: 700, color: "#cbd5e1", background: "transparent", border: "none", padding: "8px 10px", borderRadius: "4px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                            >
                              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span>{sidebar.icon}</span> {sidebar.title}
                              </span>
                              <span style={{ fontSize: "9px", transform: sidebarExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "all 0.2s", color: "rgba(255, 255, 255, 0.4)" }}>▼</span>
                            </button>
                            {sidebarExpanded && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "2px", padding: "2px 0 6px 12px", borderLeft: "1px dashed rgba(255, 255, 255, 0.15)", marginLeft: "8px" }}>
                                {sidebarContents.map(sub => (
                                  <Link 
                                    key={sub.id} 
                                    href={sub.link || "/"} 
                                    onClick={() => setIsSidebarOpen(false)} 
                                    style={{ fontSize: "12.5px", fontWeight: 500, color: "#94a3b8", textDecoration: "none", padding: "6px 10px", borderRadius: "4px" }}
                                  >
                                    {sub.title}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Separator Line */}
        <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.08)" }} />

        {/* Mobile Authentication / Profile Section */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {isLoggedIn ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "0 10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", color: "#0a1628", fontWeight: 700, fontSize: "14px" }}>
                  A
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#ffffff" }}>My Account</span>
                  <span style={{ fontSize: "11px", color: "#cbd5e1" }}>Logged In</span>
                </div>
              </div>

              <Link
                href="/admin"
                onClick={() => setIsSidebarOpen(false)}
                style={{
                  padding: "10px 18px",
                  fontSize: "13.5px",
                  fontWeight: 700,
                  color: "#ffffff",
                  textDecoration: "none",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  transition: "all 0.2s",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
                Dashboard
              </Link>

              <button
                onClick={() => {
                  localStorage.removeItem("iinm_is_logged_in");
                  localStorage.removeItem("iinm_device_token");
                  localStorage.removeItem("iinm_login_expiry");
                  setIsLoggedIn(false);
                  setIsSidebarOpen(false);
                }}
                style={{
                  padding: "10px 18px",
                  fontSize: "13.5px",
                  fontWeight: 700,
                  color: "#ffffff",
                  borderRadius: "8px",
                  background: "#e63946",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  transition: "all 0.2s",
                }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {/* Ask AI Assistant in mobile sidebar */}
              <button
                onClick={() => { setIsSidebarOpen(false); setIsSearchModalOpen(true); }}
                style={{ width: "100%", background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", color: "#ffffff", padding: "12px 14px", borderRadius: "8px", fontWeight: 700, fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "all 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)"}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                Ask AI Assistant
              </button>

              <Link
                href="/login"
                onClick={() => setIsSidebarOpen(false)}
                style={{
                  background: "#e63946", // Brand Red color for Sign In call to action
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "12px 24px",
                  fontSize: "14px",
                  fontWeight: 700,
                  textDecoration: "none",
                  textAlign: "center",
                  display: "block",
                  boxShadow: "0 4px 12px rgba(230, 57, 70, 0.25)",
                  transition: "all 0.2s",
                }}
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @media (max-width: 768px) {
          .hp-nav-links-wrapper {
            display: none !important;
          }
          .hp-nav-links {
            display: none !important;
          }
          .hp-nav-auth-desktop {
            display: none !important;
          }
          .hp-hamburger-btn {
            display: flex !important;
            margin-left: auto !important;
          }
          .hp-nav-full-container {
            padding: 0 16px !important;
          }
          .hp-nav-inner {
            padding: 0 !important;
          }
          .hp-logo-img {
            max-height: 44px !important;
          }
        }
      `}</style>
    </>
  );
}
