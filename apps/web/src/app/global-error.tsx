// @version 0.8.0 - Shield: global error boundary with Sentry capture
"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body
        style={{
          background: "#F7F2EA",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <h2
            style={{
              fontFamily: "Georgia, serif",
              fontStyle: "italic",
              color: "#2D1B69",
              marginBottom: 12,
            }}
          >
            Something went wrong
          </h2>
          <p style={{ color: "#4A4468", fontSize: 14, marginBottom: 24 }}>
            We&apos;ve been notified and are looking into it.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#C97B1A",
              color: "white",
              border: "none",
              borderRadius: 22,
              padding: "10px 24px",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
