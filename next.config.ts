import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Explicit, not relying on the (already-off) default — keeps app source
  // out of browser devtools in production.
  productionBrowserSourceMaps: false,
};

export default nextConfig;
