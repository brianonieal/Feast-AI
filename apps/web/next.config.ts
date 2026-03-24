// @version 0.5.0 - Echo: web app scaffold
// @version 0.7.0 - Compass: added API rewrite proxy
// @version 0.8.0 - Shield: wrapped with Sentry
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

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

export default withSentryConfig(nextConfig, {
  org: "feast-ai",
  project: "feast-ai-web",
  silent: true,
  widenClientFileUpload: true,
  sourcemaps: {
    disable: true,
  },
  authToken: process.env.SENTRY_AUTH_TOKEN,
});
