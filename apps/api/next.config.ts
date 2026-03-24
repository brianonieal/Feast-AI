// @version 0.1.0 - Foundation scaffold
// @version 0.8.0 - Shield: wrapped with Sentry
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  transpilePackages: ["@feast-ai/shared"],
};

export default withSentryConfig(nextConfig, {
  org: "feast-ai",
  project: "feast-ai-api",
  silent: true,
  widenClientFileUpload: true,
  sourcemaps: {
    disable: true,
  },
  authToken: process.env.SENTRY_AUTH_TOKEN,
});
