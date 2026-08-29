import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "iinmedu.com",
    "api.iinmedu.com",
    "www.iinmedu.com",
    // Tailscale / local network IPs used during development
    "100.99.40.44",
    "169.254.83.107",
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
              "style-src 'self' 'unsafe-inline'",
              // In development, images are served from the backend on
              // http://localhost:2007 (not https), so we must allow that
              // origin explicitly — otherwise every <img src="http://localhost:2007/uploads/...">
              // is blocked by CSP. In production, https: covers the backend.
              `img-src 'self' data: https: blob:${isDev ? ` ${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:2007"}` : ""}`,
              "media-src 'self' https://www.youtube.com",
              "frame-src https://challenges.cloudflare.com https://www.youtube.com https://www.youtube-nocookie.com https://checkout.razorpay.com https://api.razorpay.com",
              // In development the backend runs on http://localhost:2007 (not https),
              // so we must allow that origin explicitly — otherwise every API call
              // is blocked by CSP and surfaces as "Failed to fetch" TypeErrors.
              `connect-src 'self' https: https://api.razorpay.com${isDev ? ` ${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:2007"}` : ""}`,
              // Allow worker-src for html2pdf.js canvas rendering
              "worker-src 'self' blob:",
              "font-src 'self' data:",
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

  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:2007"}/uploads/:path*`,
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
