"use client";
import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { BASE_URL } from "@/lib/config";

interface FomoTheme {
  is_active: boolean;
  position: string;
  bg_color: string;
  text_color: string;
  gradient_style: string;
  use_gradient: boolean;
  border_radius: string;
  animation_type: string;
  display_duration: number;
  interval_duration: number;
}

interface FomoEvent {
  id: string;
  student_name: string;
  image_url: string;
  action: string;
  course_name: string;
  location: string;
  time_text: string;
}

export default function FomoNotification() {
  const pathname = usePathname();
  const [settings, setSettings] = useState<{ theme: FomoTheme; events: FomoEvent[] } | null>(null);
  const [currentEvent, setCurrentEvent] = useState<FomoEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const cycleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const displayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentIndexRef = useRef(0);

  // Do not show on admin pages
  const isAdminPage = pathname?.startsWith("/admin");

  useEffect(() => {
    if (isAdminPage) return;

    console.log("[FOMO Live] Fetching notification settings on path:", pathname);

    // Fetch FOMO settings using the secure apiFetch wrapper with cache-busting query parameter
    apiFetch(`/api/settings/fomo?t=${Date.now()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        console.log("[FOMO Live] API settings loaded:", data);
        if (data && data.theme?.is_active && data.events?.length > 0) {
          setSettings(data);
          console.log("[FOMO Live] System is enabled. Total events:", data.events.length);
        } else {
          console.log("[FOMO Live] System is disabled or has no events. Theme settings:", data?.theme);
        }
      })
      .catch((err) => {
        console.error("[FOMO Live] Error fetching settings:", err);
      });

    return () => {
      clearAllTimers();
    };
  }, [pathname, isAdminPage]);

  // Start the notification display cycle once settings are loaded
  useEffect(() => {
    if (!settings || settings.events.length === 0 || isAdminPage || isDismissed) {
      return;
    }

    console.log("[FOMO Live] Scheduling first popup in 1.5 seconds...");
    // Initial wait before showing the first popup (shortened for better UX)
    const initialTimer = setTimeout(() => {
      triggerNextNotification();
    }, 1500);

    return () => {
      clearTimeout(initialTimer);
      clearAllTimers();
    };
  }, [settings, isDismissed]);

  const clearAllTimers = () => {
    if (cycleTimeoutRef.current) clearTimeout(cycleTimeoutRef.current);
    if (displayTimeoutRef.current) clearTimeout(displayTimeoutRef.current);
  };

  const triggerNextNotification = () => {
    if (!settings || settings.events.length === 0 || isDismissed) return;

    const eventsList = settings.events;
    const nextIndex = currentIndexRef.current % eventsList.length;
    const selectedEvent = eventsList[nextIndex];

    console.log("[FOMO Live] Triggering next notification:", selectedEvent.student_name, "-", selectedEvent.course_name);

    setCurrentEvent(selectedEvent);
    setVisible(true);

    // Increment index for the next cycle
    currentIndexRef.current += 1;

    // Timer to hide this notification after display_duration
    const displayDurationMs = (settings.theme.display_duration || 6) * 1000;
    displayTimeoutRef.current = setTimeout(() => {
      setVisible(false);

      // Randomize interval duration by adding 0 to 4 seconds to the configured interval
      const baseInterval = (settings.theme.interval_duration || 12) * 1000;
      const randomOffset = Math.floor(Math.random() * 4000); // 0 to 4 seconds
      const nextTriggerDelay = baseInterval + randomOffset;

      console.log(`[FOMO Live] Hiding current popup. Next display scheduled in ${nextTriggerDelay / 1000} seconds.`);

      // Schedule the next popup
      cycleTimeoutRef.current = setTimeout(() => {
        triggerNextNotification();
      }, nextTriggerDelay);

    }, displayDurationMs);
  };

  if (isAdminPage || !settings || !settings.theme.is_active || !currentEvent || isDismissed) {
    // Add silent console notice if settings loaded but conditions not met
    if (settings && !settings.theme.is_active) {
      console.log("[FOMO Live] Not rendering: settings.theme.is_active is FALSE");
    }
    return null;
  }

  const { theme } = settings;

  // Build the dynamic CSS classes/styles based on selections
  const radiusStyle = theme.border_radius === "round" ? "12px" : "4px";
  const bgStyle = theme.use_gradient ? theme.gradient_style : theme.bg_color;
  const textColor = theme.text_color || "#ffffff";

  // Advanced glow and border effects
  const isDarkTheme = theme.bg_color !== "#ffffff";
  const glowColor = theme.text_color === "#00ff66" ? "rgba(0, 255, 102, 0.2)" : (isDarkTheme ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)");
  const borderGlow = isDarkTheme 
    ? `1.5px solid ${theme.text_color === "#00ff66" ? "#00ff66" : "rgba(255, 255, 255, 0.15)"}`
    : `1.5px solid #cbd5e1`;

  // Resolve uploaded student picture paths
  const rawImgUrl = currentEvent.image_url;
  const resolvedImgUrl = rawImgUrl && rawImgUrl.startsWith("/uploads/") 
    ? `${BASE_URL}${rawImgUrl}` 
    : (rawImgUrl || "/female-teacher.png");

  return (
    <>
      {/* CSS Keyframe Animations injected dynamically */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fomo-slide-fade-in {
          0% { transform: translateY(40px) scale(0.95); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes fomo-slide-fade-out {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(40px) scale(0.95); opacity: 0; }
        }
        @keyframes fomo-fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes fomo-fade-out {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes fomo-zoom-in {
          0% { transform: scale(0.8) translateY(10px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes fomo-zoom-out {
          0% { transform: scale(1) translateY(0); opacity: 1; }
          100% { transform: scale(0.8) translateY(10px); opacity: 0; }
        }
        @keyframes fomo-bounce-in {
          0% { transform: translateY(70px) scale(0.8); opacity: 0; }
          50% { transform: translateY(-15px) scale(1.03); opacity: 0.9; }
          75% { transform: translateY(5px) scale(0.98); opacity: 0.95; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes fomo-bounce-out {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          25% { transform: translateY(-10px) scale(0.98); opacity: 0.95; }
          100% { transform: translateY(70px) scale(0.8); opacity: 0; }
        }
        @keyframes fomo-pulse-glow {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        .fomo-active-slide-fade-in { animation: fomo-slide-fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .fomo-active-slide-fade-out { animation: fomo-slide-fade-out 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .fomo-active-fade-in { animation: fomo-fade-in 0.4s ease forwards; }
        .fomo-active-fade-out { animation: fomo-fade-out 0.35s ease forwards; }
        .fomo-active-zoom-in { animation: fomo-zoom-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .fomo-active-zoom-out { animation: fomo-zoom-out 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .fomo-active-bounce-in { animation: fomo-bounce-in 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .fomo-active-bounce-out { animation: fomo-bounce-out 0.5s cubic-bezier(0.6, -0.28, 0.735, 0.045) forwards; }
        .fomo-live-dot {
          width: 7px;
          height: 7px;
          background: #10b981;
          border-radius: 50%;
          display: inline-block;
          animation: fomo-pulse-glow 2s infinite;
        }
      `}} />

      {/* FOMO Popup Element (completely independent of Tailwind classes) */}
      <div
        style={{
          position: "fixed",
          bottom: "24px",
          left: theme.position === "bottom-left" ? "24px" : "auto",
          right: theme.position === "bottom-right" ? "24px" : "auto",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          background: bgStyle,
          color: textColor,
          borderRadius: radiusStyle,
          border: borderGlow,
          boxShadow: `0 10px 30px rgba(0, 0, 0, 0.12), 0 2px 8px ${glowColor}`,
          width: "280px",
          zIndex: 99999,
          pointerEvents: "auto",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          padding: "10px 14px",
          boxSizing: "border-box",
          transition: "all 0.3s ease",
        }}
        className={`${
          visible
            ? `fomo-active-${theme.animation_type}-in`
            : `fomo-active-${theme.animation_type}-out`
        }`}
      >
        {/* Dismiss Button */}
        <button
          onClick={() => {
            setVisible(false);
            setIsDismissed(true);
          }}
          style={{
            position: "absolute",
            top: "6px",
            right: "8px",
            background: "none",
            border: "none",
            color: textColor,
            opacity: 0.5,
            cursor: "pointer",
            fontSize: "9px",
            padding: "2px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Dismiss"
        >
          ✕
        </button>

        {/* Student Image with Verified Ring */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <img
            src={resolvedImgUrl}
            alt={currentEvent.student_name}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              border: `1.5px solid ${theme.text_color === "#00ff66" ? "#00ff66" : "rgba(255,255,255,0.3)"}`,
              objectFit: "cover",
              background: "rgba(255,255,255,0.1)",
            }}
          />
          {/* Action category mini icon/badge */}
          <span
            style={{
              position: "absolute",
              bottom: "-1px",
              right: "-1px",
              background: currentEvent.action === "certified" ? "#f59e0b" : "#10b981",
              border: `1px solid ${theme.bg_color === "#ffffff" ? "#ffffff" : "#0a1628"}`,
              borderRadius: "50%",
              width: "12px",
              height: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "6.5px",
              color: "#ffffff",
              fontWeight: "bold",
            }}
          >
            {currentEvent.action === "certified" ? "✓" : "⚡"}
          </span>
        </div>

        {/* Content details */}
        <div style={{ flex: 1, minWidth: 0, paddingRight: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "4px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "4px", minWidth: 0 }}>
              <span className="fomo-live-dot" style={{ width: "5px", height: "5px" }} />
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  letterSpacing: "0.1px",
                  color: textColor,
                }}
              >
                {currentEvent.student_name}
              </p>
            </span>
            <span
              style={{
                fontSize: "7.5px",
                fontWeight: 700,
                opacity: 0.85,
                textTransform: "uppercase",
                letterSpacing: "0.4px",
                background: isDarkTheme ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
                padding: "1px 4px",
                borderRadius: "3px",
                flexShrink: 0,
                color: textColor,
              }}
            >
              {currentEvent.location}
            </span>
          </div>

          <p
            style={{
              fontSize: "10.5px",
              lineHeight: "1.3",
              margin: "3px 0 0 0",
              color: textColor,
              opacity: 0.95,
              whiteSpace: "normal",
              wordBreak: "break-word",
            }}
          >
            <span
              style={{
                fontWeight: 800,
                color: currentEvent.action === "certified" ? "#f59e0b" : (theme.text_color === "#00ff66" ? "#00ff66" : "#38bdf8"),
                textTransform: "capitalize",
              }}
            >
              {currentEvent.action}
            </span>{" "}
            {currentEvent.course_name}
          </p>

          <p
            style={{
              fontSize: "8.5px",
              opacity: 0.75,
              display: "flex",
              alignItems: "center",
              gap: "3px",
              margin: "4px 0 0 0",
              color: textColor,
            }}
          >
            <svg
              width="8"
              height="8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Verified {currentEvent.time_text}
          </p>
        </div>
      </div>
    </>
  );
}
