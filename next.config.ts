import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    // Force Turbopack to treat this project directory as the root to avoid picking up parent lockfiles/config.
    root: __dirname,
  },
};

export default nextConfig;
