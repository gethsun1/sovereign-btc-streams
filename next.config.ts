import "dotenv/config";
import "./lib/env";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  turbopack: {
    // Force Turbopack to treat this project directory as the root to avoid picking up parent lockfiles/config.
    root: __dirname,
  },
};

export default nextConfig;
