"use client";
import React, { useEffect, useState, useCallback } from "react";
import { BASE_URL } from "@/lib/config";
import TickerEditModal, { TickerItem, TickerSettings } from "./TickerEditModal";

const DISMISS_KEY = "iinm_topbar_dismissed";

export default function NotificationBar() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [fallbackText, setFallbackText] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Ticker visual settings
  const [speed, setSpeed] = useState(30);
  const [animationType, setAnimationType] = useState("scroll");
  const [bgColor, setBgColor] = useState("#01081b");
  const [textColor, setTextColor] = useState("#ffffff");
  const [labelBgColor, setLabelBgColor] = useState("#e63946");
  const [labelTextColor, setLabelTextColor] = useState("#ffffff");

  const bUrl = BASE_URL;

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`${bUrl}/api/settings/site`);
      if (res.ok) {
        const data = await res.json();
        setFallbackText(data.notification_bar_text || "");
        setSpeed(data.ticker_speed || 30);
        setAnimationType(data.ticker_animation_type || "scroll");
        setBgColor(data.ticker_bg_color || "#01081b");
        setTextColor(data.ticker_text_color || "#ffffff");
        setLabelBgColor(data.ticker_label_bg_color || "#e63946");
        setLabelTextColor(data.ticker_label_text_color || "#ffffff");
        try {
          const parsed = JSON.parse(data.notification_bar_items || "[]");
          if (Array.isArray(parsed)) {
            // Support both string[] (old format) and {text, icon_url}[] (new format)
            const normalized: TickerItem[] = parsed
              .map((it: any) => typeof it === "string" ? { text: it } : { text: it.text || "", icon_url: it.icon_url, link: it.link })
              .filter((it: TickerItem) => it.text.trim());
            setItems(normalized);
          }
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
    finally { setLoaded(true); }
  }, [bUrl]);

  useEffect(() => {
    fetchSettings();

    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "true") setIsDismissed(true);
    } catch { /* ignore */ }

    const checkAdmin = () => {
      const loggedIn = localStorage.getItem("iinm_is_logged_in");
      const expiry = localStorage.getItem("iinm_login_expiry");
      if (loggedIn === "true" && expiry && Date.now() < Number(expiry)) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    };
    checkAdmin();
    const interval = setInterval(checkAdmin, 5000);
    return () => clearInterval(interval);
  }, [fetchSettings]);

  const handleDismiss = () => {
    setIsDismissed(true);
    try { sessionStorage.setItem(DISMISS_KEY, "true"); } catch { /* ignore */ }
  };

  const handleModalSave = (settings: TickerSettings) => {
    setItems(settings.items);
    setSpeed(settings.speed);
    setAnimationType(settings.animationType);
    setBgColor(settings.bgColor);
    setTextColor(settings.textColor);
    setLabelBgColor(settings.labelBgColor);
    setLabelTextColor(settings.labelTextColor);
  };

  const displayItems: TickerItem[] = items.length > 0
    ? items
    : fallbackText
      ? [{ text: fallbackText }]
      : loaded
        ? [{ text: "Welcome to IINM — Connecting the Dots of AI" }]
        : [];

  if (isDismissed && !isAdmin) return null;
  if (!loaded) {
    return (
      <div style={{
        position: "relative", width: "100%", height: 40,
        background: bgColor, display: "flex", alignItems: "center",
        zIndex: 101, boxSizing: "border-box", borderBottom: "1px solid rgba(255,255,255,0.06)",
        overflow: "hidden", flexShrink: 0,
      }} />
    );
  }

  const animationName = animationType === "fade" ? "tickerFade" : animationType === "slide" ? "tickerSlide" : "tickerScroll";

  return (
    <>
      <style>{`
        @keyframes tickerScroll {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        @keyframes tickerFade {
          0%, 100% { opacity: 0; transform: translate3d(30px, 0, 0); }
          25%, 75% { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        @keyframes tickerSlide {
          0% { transform: translate3d(0, 0, 0); }
          15%, 85% { transform: translate3d(-25%, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
        .ticker-pulse-dot {
          animation: pulseDot 1.5s ease-in-out infinite;
        }
      `}</style>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: 40,
          background: bgColor,
          display: "flex",
          alignItems: "center",
          zIndex: 101,
          boxSizing: "border-box",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {/* Left: "IINM Updates:" badge */}
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "0 14px",
            height: "100%",
            background: labelBgColor,
            color: labelTextColor,
            fontSize: "12px",
            fontWeight: 800,
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            zIndex: 2,
          }}
        >
          <span
            className="ticker-pulse-dot"
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: labelTextColor,
              display: "inline-block",
            }}
          />
          IINM Updates:
        </div>

        {/* Center: Scrolling marquee */}
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            height: "100%",
            display: "flex",
            alignItems: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "inline-block",
              whiteSpace: "nowrap",
              color: textColor,
              fontSize: "13px",
              fontWeight: 500,
              letterSpacing: "0.2px",
              animation: `${speed}s linear infinite`,
              animationName: animationName,
              willChange: "transform",
              backfaceVisibility: "hidden",
              WebkitFontSmoothing: "antialiased",
              paddingLeft: "40px",
              minWidth: "200%",
            } as React.CSSProperties}
            onMouseEnter={(e) => { e.currentTarget.style.animationPlayState = "paused"; }}
            onMouseLeave={(e) => { e.currentTarget.style.animationPlayState = "running"; }}
          >
            {displayItems.map((item, idx) => (
              <span key={idx} style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                {item.icon_url && (
                  <img
                    src={item.icon_url.startsWith("/") ? `${bUrl}${item.icon_url}` : item.icon_url}
                    alt=""
                    style={{ width: 16, height: 16, objectFit: "contain", display: "inline-block", verticalAlign: "middle" }}
                  />
                )}
                {item.text}
                {item.link && item.link.trim() && (
                  <a
                    href={item.link.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "4px",
                      padding: "2px 10px", borderRadius: 4,
                      border: `1px solid ${textColor}66`,
                      color: textColor, fontSize: 11, fontWeight: 600,
                      textDecoration: "none", cursor: "pointer",
                      whiteSpace: "nowrap", transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = `${textColor}1a`; e.currentTarget.style.borderColor = textColor; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = `${textColor}66`; }}
                  >
                    Learn More
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7" /><path d="M7 7h10v10" /></svg>
                  </a>
                )}
                {idx < displayItems.length - 1 && (
                  <span style={{ margin: "0 20px", opacity: 0.3 }}>•</span>
                )}
              </span>
            ))}
            <span style={{ margin: "0 40px", opacity: 0.3 }}>•</span>
            {displayItems.map((item, idx) => (
              <span key={`dup-${idx}`} style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                {item.icon_url && (
                  <img
                    src={item.icon_url.startsWith("/") ? `${bUrl}${item.icon_url}` : item.icon_url}
                    alt=""
                    style={{ width: 16, height: 16, objectFit: "contain", display: "inline-block", verticalAlign: "middle" }}
                  />
                )}
                {item.text}
                {item.link && item.link.trim() && (
                  <a
                    href={item.link.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "4px",
                      padding: "2px 10px", borderRadius: 4,
                      border: `1px solid ${textColor}66`,
                      color: textColor, fontSize: 11, fontWeight: 600,
                      textDecoration: "none", cursor: "pointer",
                      whiteSpace: "nowrap", transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = `${textColor}1a`; e.currentTarget.style.borderColor = textColor; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = `${textColor}66`; }}
                  >
                    Learn More
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7" /><path d="M7 7h10v10" /></svg>
                  </a>
                )}
                {idx < displayItems.length - 1 && (
                  <span style={{ margin: "0 20px", opacity: 0.3 }}>•</span>
                )}
              </span>
            ))}
            <span style={{ margin: "0 40px", opacity: 0.3 }}>•</span>
          </div>
        </div>

        {/* Right: Close button (non-admin) or Admin Edit button */}
        {!isAdmin ? (
          <button
            onClick={handleDismiss}
            title="Dismiss"
            style={{
              flexShrink: 0,
              width: 32,
              height: "100%",
              background: "transparent",
              border: "none",
              borderLeft: `1px solid ${labelTextColor}22`,
              color: `${textColor}88`,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 400,
              transition: "all 0.2s",
              zIndex: 2,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = textColor;
              e.currentTarget.style.background = `${textColor}0a`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = `${textColor}88`;
              e.currentTarget.style.background = "transparent";
            }}
          >
            ×
          </button>
        ) : (
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "0 10px",
              height: "100%",
              zIndex: 2,
              background: "rgba(0,0,0,0.2)",
              borderLeft: `1px solid ${labelTextColor}22`,
            }}
          >
            <button
              onClick={() => setModalOpen(true)}
              title="Edit Ticker"
              style={{
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "4px",
                color: "#fff",
                cursor: "pointer",
                padding: "3px 10px",
                fontSize: "11px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "4px",
                transition: "background 0.2s",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.25)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
              Edit
            </button>
          </div>
        )}
      </div>

      {/* Full-screen edit modal */}
      <TickerEditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleModalSave}
        initialSettings={{
          items,
          speed,
          animationType,
          bgColor,
          textColor,
          labelBgColor,
          labelTextColor,
        }}
      />
    </>
  );
}
