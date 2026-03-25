// @version 1.3.0 - Nexus: regional growth strategy
// GET /api/strategist/growth — founding_table only
// Uses Claude Opus via @STRATEGIST — most expensive single API call
// Cache: 10 minutes (double analyst/health due to Opus cost)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { applyRateLimit } from "@/lib/rateLimit";
import { generateGrowthStrategy } from "@/council/strategist";

export async function GET(req: NextRequest) {
  // Rate limit: ai tier — this hits Voyage AI + Claude Opus
  const limited = await applyRateLimit(req, "ai");
  if (limited) return limited;

  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  // founding_table only — Opus calls are expensive
  const tier = (sessionClaims?.publicMetadata as { tier?: string })?.tier;
  if (tier !== "founding_table") {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const strategy = await generateGrowthStrategy();

  return NextResponse.json(
    {
      success: true,
      strategy,
      model: "claude-opus-4-6",
      cachedFor: "10 minutes",
    },
    {
      headers: {
        "Cache-Control": "private, max-age=600",
      },
    }
  );
}
