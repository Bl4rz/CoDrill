import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Explicit, not relying on the (already-off) default — keeps app source
  // out of browser devtools in production.
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      {
        // Baked pixel art (npm run art) has content-hashed names, so it never changes under a URL.
        source: "/art/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
