"use client";
import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/config";
import { toast } from "react-hot-toast";

interface SiteSettingsData {
  site_name: string;
  logo_url: string;
}

export default function StudentSignIn() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [siteSettings, setSiteSettings] = useState<SiteSettingsData>({
    site_name: "IINM",
    logo_url: "",
  });

  useEffect(() => {
    const fetchSiteSettings = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/settings/site`);
        if (res.ok) {
          const data = await res.json();
          setSiteSettings({
            site_name: data.site_name || "IINM",
            logo_url: data.logo_url || "",
          });
        }
      } catch { /* silently ignore */ }
    };
    fetchSiteSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/student/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Invalid credentials or account is inactive");
      }

      const data = await res.json();
      const student = data.student;
      toast.success(`Login successful! Welcome back, ${student?.first_name || "Student"}.`, {
        duration: 4000,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(msg === "Failed to fetch" ? "Cannot connect to server." : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#f8fafc]">

      {/* ── Left Hero ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0a1628] text-white flex-col justify-between p-10 xl:p-16 relative overflow-hidden">
        {/* Abstract glows */}
        <div className="absolute top-[-120px] right-[-120px] w-[420px] h-[420px] rounded-full bg-[#1e3a5f] blur-[100px] opacity-60" />
        <div className="absolute bottom-[-160px] left-[-120px] w-[480px] h-[480px] rounded-full bg-[#0f4c75] blur-[100px] opacity-40" />

        {/* Top brand */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white font-bold text-lg">
            {siteSettings.logo_url ? (
              <img
                src={siteSettings.logo_url}
                alt={siteSettings.site_name}
                className="w-full h-full object-contain p-1"
              />
            ) : (
              <span>{siteSettings.site_name[0]}</span>
            )}
          </div>
          <span className="font-semibold text-lg tracking-wide">{siteSettings.site_name}</span>
        </div>

        {/* Hero content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#e63946]/20 text-[#ff7b85] text-xs font-semibold w-fit mb-6 border border-[#e63946]/20">
            <span className="w-2 h-2 rounded-full bg-[#e63946] animate-pulse" />
            STUDENT PORTAL
          </div>
          <h1 className="text-4xl xl:text-5xl font-extrabold leading-[1.15] mb-5 tracking-tight">
            Learn from the <span className="text-[#38bdf8]">best</span> in the industry.
          </h1>
          <p className="text-[#94a3b8] text-lg max-w-md leading-relaxed mb-10">
            Access your courses, materials, and progress — all in one secure place.
          </p>

          {/* Trust / stats strip */}
          <div className="grid grid-cols-3 gap-4 max-w-md">
            {[
              ["10+", "Expert Mentors"],
              ["50+", "Live Sessions"],
              ["1000+", "Students"],
            ].map(([num, label]) => (
              <div
                key={label}
                className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur-sm"
              >
                <div className="text-xl font-bold text-white">{num}</div>
                <div className="text-xs text-[#94a3b8] mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10 text-xs text-[#64748b]">
          &copy; {new Date().getFullYear()} {siteSettings.site_name}. All rights reserved.
        </div>
      </div>

      {/* ── Right Form ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-10 relative">
        <div className="w-full max-w-[420px] bg-white rounded-2xl p-8 md:p-10 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)] border border-slate-100">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-lg bg-[#0a1628] flex items-center justify-center text-white font-bold text-sm">
              {siteSettings.logo_url ? (
                <img
                src={siteSettings.logo_url}
                alt={siteSettings.site_name}
                className="w-full h-full object-contain p-1"
              />
              ) : (
                <span>{siteSettings.site_name[0]}</span>
              )}
            </div>
            <span className="font-semibold text-slate-900">{siteSettings.site_name}</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Student Login</h2>
            <p className="text-sm text-[#64748b]">
              Enter your phone or email and password to access your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-slate-700 mb-1.5">
                Phone or Email
              </label>
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter phone or email"
                required
                autoComplete="username"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#0a1628] focus:ring-2 focus:ring-[#0a1628]/10"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#0a1628] focus:ring-2 focus:ring-[#0a1628]/10"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700 border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#0a1628] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#141f35] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <div className="flex items-center justify-between text-sm pt-1">
              <span className="text-[#64748b]">
                Don&apos;t have access?{" "}
                <span className="text-slate-500">Contact your admin.</span>
              </span>
            </div>
          </form>

          <p className="mt-8 text-center text-xs text-[#94a3b8]">
            By signing in, you agree to our{" "}
            <a href="#" className="text-[#0a1628] hover:underline font-medium">Terms</a>{" "}
            and{" "}
            <a href="#" className="text-[#0a1628] hover:underline font-medium">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
