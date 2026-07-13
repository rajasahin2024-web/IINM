import toast from "react-hot-toast";

// ─── Shared base style ────────────────────────────────────────
const base = {
  borderRadius: "14px",
  padding: "16px 22px",
  fontSize: "15px",
  fontWeight: "800",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
  minWidth: "260px",
  maxWidth: "380px",
  letterSpacing: "0.2px",
  lineHeight: "1.4",
};

// ─── Success — deep green ─────────────────────────────────────
export const showSuccess = (message: string) =>
  toast.success(message, {
    duration: 3500,
    style: {
      ...base,
      background: "linear-gradient(135deg, #065f46 0%, #047857 100%)",
      border: "1.5px solid #059669",
    },
    iconTheme: {
      primary: "#fff",
      secondary: "#065f46",
    },
  });

// ─── Delete / Error — deep red ────────────────────────────────
export const showDelete = (message: string) =>
  toast.error(message, {
    duration: 4000,
    style: {
      ...base,
      background: "linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)",
      border: "1.5px solid #dc2626",
    },
    iconTheme: {
      primary: "#fff",
      secondary: "#7f1d1d",
    },
  });

// ─── Update — deep blue ───────────────────────────────────────
export const showUpdate = (message: string) =>
  toast(message, {
    duration: 3500,
    icon: "✎",
    style: {
      ...base,
      background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)",
      border: "1.5px solid #3b82f6",
    },
  });

// ─── Info — sky blue ──────────────────────────────────────────
export const showInfo = (message: string) =>
  toast(message, {
    duration: 4000,
    icon: "ℹ",
    style: {
      ...base,
      background: "linear-gradient(135deg, #0369a1 0%, #0284c7 100%)",
      border: "1.5px solid #38bdf8",
    },
  });

// ─── Warning — amber ──────────────────────────────────────────
export const showWarning = (message: string) =>
  toast(message, {
    duration: 4500,
    icon: "⚠",
    style: {
      ...base,
      background: "linear-gradient(135deg, #92400e 0%, #b45309 100%)",
      border: "1.5px solid #f59e0b",
    },
  });
