import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Supports slightly larger, locally-previewed JSON batches for service-book imports.
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
