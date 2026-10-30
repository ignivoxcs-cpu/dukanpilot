import type { NextConfig } from "next";

// Every page shows per-business, time-sensitive data, so pages render at
// request time (no build-time prerendering of business data).
const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
