import { serverFetch } from "@/lib/serverFetch";

export const revalidate = 21600; // 6 hours

export async function GET() {
  const data = await serverFetch("/seo/llms-full", 21600);
  const content = data && !("__dbDown" in data) && (data as any).content ? (data as any).content : "# IINM\n";
  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
    },
  });
}
