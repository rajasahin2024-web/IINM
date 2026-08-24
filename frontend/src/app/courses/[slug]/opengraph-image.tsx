import { ImageResponse } from "next/og";
import { API_BASE_URL as API } from "@/lib/config";

export const alt = "Course — IINM";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { slug: string } }) {
  // Fetch course data
  let course: any = null;
  try {
    const res = await fetch(`${API}/courses/public/courses/${params.slug}`, {
      next: { revalidate: 300 },
    });
    if (res.ok) course = await res.json();
  } catch {}

  const title = course?.seo_title || course?.title || "IINM Course";
  const instructor = course?.instructor_name || "";
  const price = course?.is_free ? "Free" : course?.discount_price != null ? `₹${course.discount_price}` : course?.price != null ? `₹${course.price}` : "";

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
          <div style={{ fontSize: 16, opacity: 0.6 }}>| Course</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.2, maxWidth: 1000 }}>{title}</div>
          <div style={{ display: "flex", gap: 20, fontSize: 22, opacity: 0.8 }}>
            {instructor && <div>👨‍🏫 {instructor}</div>}
            {price && <div>💰 {price}</div>}
          </div>
        </div>
        <div style={{ fontSize: 18, color: "#38bdf8" }}>iinmedu.com/courses/{params.slug}</div>
      </div>
    ),
    { ...size }
  );
}
