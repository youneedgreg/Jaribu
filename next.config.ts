import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Wig photos go up through the add-a-wig server action: up to 2 MB plus form overhead.
    serverActions: { bodySizeLimit: "2100kb" },
  },
  // The try-on route reads the demo wig photos from disk; Vercel doesn't bundle public/.
  outputFileTracingIncludes: {
    "/api/tryon": ["./public/wigs/*.jpg"],
  },
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
