"use client";
import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// ── Gradient backgrounds matching toast.ts ──────────────────────────
const BG: Record<ToastType, string> = {
  success: "linear-gradient(135deg, #047857 0%, #059669 100%)",
  error:   "linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)",
  warning: "linear-gradient(135deg, #92400e 0%, #b45309 100%)",
  info:    "linear-gradient(135deg, #0369a1 0%, #0284c7 100%)",
};

const BORDER: Record<ToastType, string> = {
  success: "#059669",
  error:   "#dc2626",
  warning: "#f59e0b",
  info:    "#38bdf8",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
    visible: boolean;
    id: number;
  } | null>(null);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = Date.now();
    setToast({ message, type, visible: true, id });
    setTimeout(() => {
      setToast((prev) => (prev && prev.id === id ? { ...prev, visible: false } : prev));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {toast && toast.visible && (
        <div
          style={{
            position: "fixed",
            top: 85,
            right: 24,
            zIndex: 2147483647,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              background: BG[toast.type],
              border: `1.5px solid ${BORDER[toast.type]}`,
              borderRadius: 14,
              padding: "16px 22px",
              fontSize: 15,
              fontWeight: 800,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: 12,
              boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
              minWidth: 260,
              maxWidth: 380,
              letterSpacing: "0.2px",
              lineHeight: "1.4",
              animation: "toastSlideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
              pointerEvents: "auto",
            }}
          >
            {/* Icon */}
            {toast.type === "success" && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            )}
            {toast.type === "error" && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            )}
            {toast.type === "warning" && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            )}
            {toast.type === "info" && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}

            <span style={{ flex: 1 }}>{toast.message}</span>

            {/* Close button */}
            <button
              onClick={() => setToast((prev) => (prev ? { ...prev, visible: false } : null))}
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "none",
                borderRadius: 6,
                padding: "4px 6px",
                marginLeft: 4,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                transition: "background 0.2s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.25)")}
              onMouseOut={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <style>{`
            @keyframes toastSlideDown {
              from { transform: translateY(-110%); opacity: 0; }
              to   { transform: translateY(0);     opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
