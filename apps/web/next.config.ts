// @version 0.5.0 - Echo: web app scaffold
// @version 0.7.0 - Compass: added API rewrite proxy
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@feast-ai/shared"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
