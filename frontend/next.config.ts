import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["iinmedu.com", "api.iinmedu.com", "www.iinmedu.com"],

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
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
        destination: "http://localhost:2007/uploads/:path*",
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
