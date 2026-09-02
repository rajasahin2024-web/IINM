import { serverFetch, isDbDown } from "@/lib/serverFetch";
import PublicNavbar from "@/components/PublicNavbar";
import PublicFooter from "@/components/PublicFooter";
import JsonLd from "@/components/JsonLd";
import BlogListClient from "./BlogListClient";

const REVALIDATE = 300; // 5-min ISR
const PAGE_SIZE = 12;

// Next.js requires a literal number for the `revalidate` export, not a
// const reference — otherwise it throws "Unknown identifier" at build time.
export const revalidate = 300;

export default async function BlogListingPage() {
  // Server-fetch the first page so Googlebot sees real blog post links and
  // titles in the initial HTML (previously this was a client-only component
  // that rendered empty skeletons to crawlers).
  const [blogsData, site] = await Promise.all([
    serverFetch(`/blogs?status=published&limit=${PAGE_SIZE}`, REVALIDATE),
    serverFetch("/settings/site", REVALIDATE),
  ]);

  const initialPosts = blogsData && !isDbDown(blogsData) && Array.isArray(blogsData.items)
    ? blogsData.items
    : [];
  const baseUrl = site && !isDbDown(site) && (site as any).canonical_base_url
    ? (site as any).canonical_base_url.replace(/\/$/, "")
    : "https://iinmedu.com";
  const siteName = site && !isDbDown(site) && (site as any).site_name
    ? (site as any).site_name
    : "IINM";

  // ── JSON-LD: Blog hub + Breadcrumb ──
  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `${siteName} Blog`,
    url: `${baseUrl}/blog`,
    description: "Insights, tutorials, and stories on AI, programming, and the future of learning.",
    publisher: { "@type": "Organization", name: siteName },
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${baseUrl}/blog` },
    ],
  };

  return (
    <>
      <JsonLd data={[blogSchema, breadcrumbSchema]} />
      <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
        <PublicNavbar />

        {/* Page Header */}
        <div style={{ background: "#0a1628", padding: "80px 24px 60px", textAlign: "center" }}>
          <h1 style={{ fontSize: "clamp(28px,5vw,48px)", fontWeight: 800, color: "#fff", marginBottom: 12, letterSpacing: -0.8 }}>
            IINM Blog
          </h1>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", maxWidth: 540, margin: "0 auto", lineHeight: 1.6 }}>
            Insights, tutorials, and stories on AI, programming, and the future of learning.
          </p>
        </div>

        {/* Client child handles search + pagination, but receives the
         * server-rendered initial posts so crawlers see real links in HTML. */}
        <BlogListClient initialPosts={initialPosts} pageSize={PAGE_SIZE} />
      </div>
    </>
  );
}
