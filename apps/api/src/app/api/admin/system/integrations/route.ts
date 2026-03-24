// @version 0.9.0 - Lens: admin integration health check
// GET /api/admin/system/integrations — founding_table only
// Runs all adapter healthChecks in parallel via Promise.allSettled

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { applyRateLimit } from "@/lib/rateLimit";
import { circleAdapter } from "@/integrations/circle/adapter";
import { hubspotAdapter } from "@/integrations/hubspot/adapter";

interface IntegrationResult {
  service: string;
  connected: boolean;
  latencyMs: number;
  error?: string;
}

async function checkAdapter(
  name: string,
  fn: () => Promise<{ connected: boolean; latency?: number }>
): Promise<IntegrationResult> {
  const start = Date.now();
  try {
    const result = await fn();
    return {
      service: name,
      connected: result.connected,
      latencyMs: result.latency ?? Date.now() - start,
    };
  } catch (err) {
    return {
      service: name,
      connected: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, "standard");
  if (limited) return limited;

  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  // founding_table only
  const tier = (sessionClaims?.publicMetadata as { tier?: string })?.tier;
  if (tier !== "founding_table") {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const results = await Promise.allSettled([
    // Circle.so
    checkAdapter("Circle.so", () => circleAdapter.healthCheck()),

    // HubSpot
    checkAdapter("HubSpot", () => hubspotAdapter.healthCheck()),

    // Resend — check if API key is configured
    checkAdapter("Resend", async () => {
      const hasKey = !!process.env.RESEND_API_KEY;
      return { connected: hasKey, latency: 0 };
    }),

    // Supabase (DB ping)
    checkAdapter("Supabase", async () => {
      const start = Date.now();
      await db.$queryRaw`SELECT 1`;
      return { connected: true, latency: Date.now() - start };
    }),
  ]);

  const integrations: IntegrationResult[] = results.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : {
          service: "unknown",
          connected: false,
          latencyMs: 0,
          error: r.reason instanceof Error ? r.reason.message : String(r.reason),
        }
  );

  // Static NOT CONFIGURED entries for adapters not yet wired
  integrations.push(
    { service: "Twilio", connected: false, latencyMs: 0, error: "Not configured" },
    { service: "WordPress", connected: false, latencyMs: 0, error: "Not configured" }
  );

  return NextResponse.json({
    success: true,
    data: integrations,
    checkedAt: new Date().toISOString(),
  });
}
