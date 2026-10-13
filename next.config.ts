import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '15mb',
    },
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
