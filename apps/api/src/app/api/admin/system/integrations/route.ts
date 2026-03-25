// @version 1.0.1 - Integration cleanup: only Resend + Supabase
// GET /api/admin/system/integrations — founding_table only

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { applyRateLimit } from "@/lib/rateLimit";

interface IntegrationResult {
  service: string;
  connected: boolean;
  latencyMs: number;
  error?: string;
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

  const tier = (sessionClaims?.publicMetadata as { tier?: string })?.tier;
  if (tier !== "founding_table") {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const integrations: IntegrationResult[] = [];

  // Resend
  integrations.push({
    service: "Resend",
    connected: !!process.env.RESEND_API_KEY,
    latencyMs: 0,
  });

  // Supabase DB ping
  const dbStart = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    integrations.push({
      service: "Supabase",
      connected: true,
      latencyMs: Date.now() - dbStart,
    });
  } catch (err) {
    integrations.push({
      service: "Supabase",
      connected: false,
      latencyMs: Date.now() - dbStart,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return NextResponse.json({
    success: true,
    data: integrations,
    checkedAt: new Date().toISOString(),
  });
}
