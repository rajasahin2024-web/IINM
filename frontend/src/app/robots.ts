import type { MetadataRoute } from "next";
import { serverFetch } from "@/lib/serverFetch";

// ── Revalidation: 1 hour ──
const REVALIDATE = 3600;

interface SiteSettings {
  canonical_base_url?: string | null;
  default_robots_index?: boolean | null;
  ai_bot_allow?: string | null;
}

const DEFAULT_AI_BOTS: Record<string, boolean> = {
  GPTBot: true,
  ClaudeBot: true,
  PerplexityBot: true,
  "Google-Extended": true,
  CCBot: true,
  "OAI-SearchBot": true,
  "anthropic-ai": true,
};

function getBaseUrl(site: any): string {
  if (site?.canonical_base_url) return site.canonical_base_url.replace(/\/$/, "");
  return "https://iinmedu.com";
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const site = await serverFetch("/seo/site", REVALIDATE);
  const settings = site && !("__dbDown" in site) ? (site as SiteSettings) : null;
  const baseUrl = getBaseUrl(settings);

  // Parse AI bot allowlist
  let aiBots = DEFAULT_AI_BOTS;
  if (settings?.ai_bot_allow) {
    try {
      const parsed = JSON.parse(settings.ai_bot_allow);
      if (parsed && typeof parsed === "object") {
        aiBots = { ...DEFAULT_AI_BOTS, ...parsed };
      }
    } catch {
      // keep defaults
    }
  }

  const rules: MetadataRoute.Robots["rules"] = [
    {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/login", "/device-admin", "/device-request", "/maintenance"],
    },
  ];

  // Add explicit AI bot rules (allow or disallow based on admin settings)
  for (const [bot, allowed] of Object.entries(aiBots)) {
    rules.push({
      userAgent: bot,
      allow: allowed ? "/" : undefined,
      disallow: allowed ? ["/admin", "/api"] : "/",
    });
  }

  return {
    rules,
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
