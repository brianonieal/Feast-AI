// @version 1.4.0 - Harvest: impact metrics
// GET /api/analytics/impact — aggregated platform metrics
// Auth: any authenticated user. Cache: 5 min.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { applyRateLimit } from "@/lib/rateLimit";
import { getImpactMetrics } from "@/services/analytics";

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, "standard");
  if (limited) return limited;

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const metrics = await getImpactMetrics();

  return NextResponse.json(
    { success: true, data: metrics },
    { headers: { "Cache-Control": "private, max-age=300" } }
  );
}
