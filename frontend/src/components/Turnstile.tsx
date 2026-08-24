"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";

/**
 * Cloudflare Turnstile widget wrapper.
 *
 * Loads the Turnstile script once, renders a widget, and exposes the token
 * via the `onToken` callback. If no site key is configured (env var unset),
 * renders nothing and calls `onToken` with a sentinel so the form still works
 * (the backend also fails open when TURNSTILE_SECRET_KEY is unset).
 */

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id: string) => void;
    };
  }
}

let _scriptPromise: Promise<void> | null = null;
function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (_scriptPromise) return _scriptPromise;
  _scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Turnstile script"));
    document.head.appendChild(s);
  });
  return _scriptPromise;
}

interface TurnstileProps {
  onToken: (token: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export default function Turnstile({ onToken, className, style }: TurnstileProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);

  const handleToken = useCallback(
    (token: string) => {
      onToken(token);
    },
    [onToken]
  );

  useEffect(() => {
    // No site key configured: fail open — pass a sentinel so the backend
    // (which also fails open without its secret) accepts the request.
    if (!siteKey) {
      handleToken("__turnstile_not_configured__");
      return;
    }
    let cancelled = false;
    loadTurnstileScript()
      .then(() => {
        if (cancelled || !window.turnstile || !containerRef.current) return;
        setReady(true);
        // Render after the container is visible.
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: handleToken,
          "error-callback": () => handleToken(""),
          "expired-callback": () => handleToken(""),
          theme: "light",
        });
      })
      .catch(() => handleToken(""));
    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* ignore */
        }
      }
    };
  }, [siteKey, handleToken]);

  if (!siteKey) return null;
  return (
    <div
      ref={containerRef}
      className={className}
      style={{ minHeight: ready ? 65 : 0, ...style }}
    />
  );
}
