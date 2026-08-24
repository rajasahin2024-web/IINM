import { ImageResponse } from "next/og";
import { API_BASE_URL as API } from "@/lib/config";

export const alt = "Blog Post — IINM";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { slug: string } }) {
  // Fetch blog post data
  let post: any = null;
  try {
    const res = await fetch(`${API}/blogs/slug/${params.slug}`, {
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const data = await res.json();
      post = data?.post || data;
    }
  } catch {}

  const title = post?.seo_title || post?.title || "IINM Blog";
  const author = post?.author_name || "";
  const category = post?.category_name || "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0a1628 0%, #1e3a5f 100%)",
          color: "#fff",
          fontFamily: "sans-serif",
          padding: 60,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#38bdf8" }}>IINM</div>
          <div style={{ fontSize: 16, opacity: 0.6 }}>| Blog</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.2, maxWidth: 1000 }}>{title}</div>
          <div style={{ display: "flex", gap: 20, fontSize: 22, opacity: 0.8 }}>
            {author && <div>✍️ {author}</div>}
            {category && <div style={{ padding: "4px 12px", background: "rgba(56,189,248,0.2)", borderRadius: 100, fontSize: 18 }}>{category}</div>}
          </div>
        </div>
        <div style={{ fontSize: 18, color: "#38bdf8" }}>iinmedu.com/blog/{params.slug}</div>
      </div>
    ),
    { ...size }
  );
}
