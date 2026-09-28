import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  // Allow an isolated build dir (NEXT_DIST_DIR=.next-verify npm run build)
  // so verification builds don't clobber a running dev server's .next/.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // isomorphic-dompurify's server entry pulls in jsdom, which cannot be
  // bundled (dynamic requires). Keep both external in server bundles; the
  // client bundle still resolves the plain dompurify browser build.
  serverExternalPackages: ["isomorphic-dompurify", "jsdom"],

  allowedDevOrigins: [
    "iinmedu.com",
    "api.iinmedu.com",
    "www.iinmedu.com",
    // Tailscale / local network IPs used during development
    "100.99.40.44",
    "169.254.83.107",
    // Public dev server IP (browsers access http://82.112.226.111:2021)
    "82.112.226.111",
    // Cloudflare quick tunnel (ngrok alternative) — ephemeral domain
    "parent-stockholm-perception-chose.trycloudflare.com",
  ],

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          // CSP: 'unsafe-inline' for style/script is a temporary bridge while
          // inline styles (used heavily across the app) and the Turnstile
          // script are audited. Tighten over time toward nonce-based script-src.
          // In development, 'unsafe-eval' is added because React's dev runtime
          // uses eval() for stack-frame reconstruction / debugging features.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com https://www.youtube.com https://www.gstatic.com https://checkout.razorpay.com https://api.razorpay.com https://cdn.razorpay.com`,
              // fonts.googleapis.com: Material Symbols stylesheet (<link> in
              // layout.tsx) and Inter @imports inside admin <style> blocks.
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // In development, images are served from the backend on
              // http://localhost:2007 (not https), so we must allow that
              // origin explicitly — otherwise every <img src="http://localhost:2007/uploads/...">
              // is blocked by CSP. In production, https: covers the backend.
              `img-src 'self' data: https: blob:${isDev ? ` ${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:2007"}` : ""}`,
              "media-src 'self' https://www.youtube.com https://cdn.iinmedu.com blob:",
              "frame-src https://challenges.cloudflare.com https://www.youtube.com https://www.youtube-nocookie.com https://checkout.razorpay.com https://api.razorpay.com",
              // In development the backend runs on http://localhost:2007 (not https),
              // so we must allow that origin explicitly — otherwise every API call
              // is blocked by CSP and surfaces as "Failed to fetch" TypeErrors.
              `connect-src 'self' https: https://api.razorpay.com${isDev ? ` ${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:2007"}` : ""}`,
              // Allow worker-src for html2pdf.js canvas rendering
              "worker-src 'self' blob:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "geolocation=(self), microphone=(), camera=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
        ],
      },
    ];
  },

  async redirects() {
    // Short public aliases → real CMS pages. Several forms and the
    // CMS-driven contact "terms_url" setting still emit /terms and
    // /privacy; redirect instead of 404ing.
    return [
      { source: "/terms", destination: "/page/terms-conditions", permanent: true },
      { source: "/privacy", destination: "/page/privacy-policy", permanent: true },
    ];
  },

  async rewrites() {
    // Proxy API + uploads to the backend over cert-free internal HTTP so the
    // browser always talks same-origin. This is what makes
    // http://82.112.226.111:2021 work: without it the browser would fetch
    // https://82.112.226.111/api whose self-signed cert silently kills
    // fetch() ("Cannot connect to server"). INTERNAL_BASE_URL is used (not
    // NEXT_PUBLIC_BASE_URL) because server-side proxying to a self-signed
    // https target would fail TLS verification in Node too.
    const backend = process.env.INTERNAL_BASE_URL || "http://127.0.0.1:2007";
    return [
      {
        source: "/api/:path*",
        destination: `${backend}/api/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${backend}/uploads/:path*`,
      },
    ];
  },

  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/uploads/**",
          "**/.next/**",
          "**/dist/**",
        ],
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },

  experimental: {
    optimizePackageImports: [
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@react-three/drei",
      "@react-three/fiber",
      "three",
      "gsap",
      "video.js",
    ],
  },
};

export default nextConfig;
