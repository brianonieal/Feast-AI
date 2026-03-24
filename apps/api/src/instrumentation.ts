// @version 0.8.0 - Shield: Sentry instrumentation for apps/api
// Next.js instrumentation hook — Sentry init runs here instead of separate config files

import * as Sentry from "@sentry/nextjs";

export const onRequestError = Sentry.captureRequestError;

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV ?? "development",
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      enabled: !!process.env.SENTRY_DSN,
      ignoreErrors: [
        "RATE_LIMITED",
        "UNAUTHORIZED",
        "NOT_FOUND",
        "DUPLICATE_APPLICATION",
        "ALREADY_PROCESSED",
        "VALIDATION_ERROR",
      ],
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      enabled: !!process.env.SENTRY_DSN,
    });
  }
}
