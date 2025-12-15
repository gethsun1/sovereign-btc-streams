import "dotenv/config";
console.log("DEBUG: DATABASE_URL is", process.env.DATABASE_URL);
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
