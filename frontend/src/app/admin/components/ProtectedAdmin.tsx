"use client";
import { apiFetch } from "@/lib/apiFetch";
import React, { useEffect, useState, useCallback, createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import AdminLayout from "../AdminLayout";
import DeleteModal from "./DeleteModal";
import AdminSkeleton from "./AdminSkeleton";
import { Icon } from "../icons";
import { API_BASE_URL } from "@/lib/config";
import { ToastProvider, useToast } from "./ToastProvider";
import { SiteSettingsProvider, useSiteSettings } from "./SiteSettingsContext";

interface DeviceSession {
  id: number;
  device_token: string;
  location: string;
  ip_address: string;
  created_at: string;
  is_approved: boolean;
  requester_name: string | null;
  requester_email: string | null;
  requester_phone: string | null;
  purpose: string | null;
  device_model: string | null;
}

interface AdminContextType {
  sessions: DeviceSession[];
  loading: boolean;
  fetchSessions: () => Promise<void>;
  handleToggleDevice: (device: DeviceSession) => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

/** Inner component — lives inside ToastProvider so useToast() works safely */
function AdminInner({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const { siteSettings } = useSiteSettings();
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [deviceToToggle, setDeviceToToggle] = useState<DeviceSession | null>(null);

  /** Get the stored device token from localStorage */
  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("iinm_device_token") : null;

  const fetchSessions = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await apiFetch(`${API_BASE_URL}/sessions`, {
        headers: { "X-Device-Token": token },
      });
      if (res.ok) setSessions(await res.json());
    } catch (e) { console.error(e); }
  }, []);

  const handleToggleDevice = async (device: DeviceSession) => {
    setDeviceToToggle(device);
  };

  const confirmToggleDevice = async () => {
    if (!deviceToToggle) return;
    const action = deviceToToggle.is_approved ? "revoke" : "grant";
    try {
      const token = getToken();
      const res = await apiFetch(`${API_BASE_URL}/toggle-device/${deviceToToggle.id}`, {
        method: "POST",
        headers: { "X-Device-Token": token || "" },
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(prev => prev.map(s => s.id === deviceToToggle.id ? { ...s, is_approved: data.is_approved } : s));
        showToast(`Permission has been successfully ${action}ed.`, "success");
      }
    } catch { 
      showToast("Failed to update device permission", "error");
    } finally {
      setDeviceToToggle(null);
    }
  };

  useEffect(() => {
    const token = getToken();

    if (!token) {
      // No device token at all — send to device registration
      router.replace("/device-request");
      return;
    }

    /** Verify that this device is still approved on the backend */
    const verifyAuth = async () => {
      // 1. Check 48-hour client-side expiry first
      const expiry = localStorage.getItem("iinm_login_expiry");
      if (!expiry || Date.now() >= Number(expiry)) {
        localStorage.removeItem("iinm_is_logged_in");
        localStorage.removeItem("iinm_login_expiry");
        router.replace("/login");
        return;
      }

      // 2. Verify device is still approved on the server
      try {
        const res = await apiFetch(`${API_BASE_URL}/verify-device`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ device_token: token }),
        });
        if (!res.ok) throw new Error("unauthorized");
        setLoading(false);
        fetchSessions();
      } catch {
        // Device rejected or server unreachable — clear session and go to login
        localStorage.removeItem("iinm_is_logged_in");
        localStorage.removeItem("iinm_login_expiry");
        router.replace("/login");
      }
    };

    verifyAuth();

    // Re-verify every 60 seconds to catch revoked sessions
    const interval = setInterval(verifyAuth, 60_000);
    return () => clearInterval(interval);
  }, [router, pathname, fetchSessions]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("iinm_is_logged_in");
    localStorage.removeItem("iinm_login_expiry");
    router.replace("/");
  }, [router]);

  if (loading) {
    return <AdminSkeleton />;
  }

  return (
    <AdminContext.Provider value={{ sessions, loading, fetchSessions, handleToggleDevice }}>
      <AdminLayout activePath={pathname} onNavigate={(href) => router.push(href)} onLogout={handleLogout}>
        {children}

        {deviceToToggle && (
          <DeleteModal
            title="Are you sure?"
            description={`Do you want to ${deviceToToggle.is_approved ? "revoke" : "grant"} permission for this device?`}
            confirmText={`Yes, ${deviceToToggle.is_approved ? "Revoke" : "Grant"} permission`}
            confirmColor={deviceToToggle.is_approved ? "#ef4444" : "#10b981"}
            onConfirm={confirmToggleDevice}
            onCancel={() => setDeviceToToggle(null)}
          />
        )}
      </AdminLayout>
    </AdminContext.Provider>
  );
}

/** Public wrapper — provides ToastProvider and SiteSettingsProvider */
export function AdminProvider({ children }: { children: React.ReactNode }) {
  return (
    <SiteSettingsProvider>
      <ToastProvider>
        <AdminInner>{children}</AdminInner>
      </ToastProvider>
    </SiteSettingsProvider>
  );
}

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) throw new Error("useAdmin must be used within an AdminProvider");
  return context;
};
