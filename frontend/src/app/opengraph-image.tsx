import { ImageResponse } from "next/og";
import { serverFetch } from "@/lib/serverFetch";

export const alt = "IINM — AI-Powered Connected Learning Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const site = await serverFetch("/settings/site", 3600);
  const siteName = (site && !("__dbDown" in site) && (site as any).site_name) || "IINM";
  const desc = (site && !("__dbDown" in site) && (site as any).meta_description) || "AI-Powered Connected Learning Platform";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a1628 0%, #1e3a5f 100%)",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 800, marginBottom: 20 }}>{siteName}</div>
        <div style={{ fontSize: 28, opacity: 0.8, maxWidth: 800, textAlign: "center" }}>{desc}</div>
        <div style={{ marginTop: 40, fontSize: 18, color: "#38bdf8", fontWeight: 600 }}>iinmedu.com</div>
      </div>
    ),
    { ...size }
  );
}
