import type { NextConfig } from "next";
import { config } from "dotenv";
import path from "path";

// Load root monorepo .env so build-time module initialization has DB/auth secrets
config({ path: path.resolve(process.cwd(), "../../.env") });

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
