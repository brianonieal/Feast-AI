// @version 1.4.0 - Harvest: funder report JSON view
// GET /api/analytics/funder-report — founding_table only
// Returns metrics + month for dashboard rendering
// Cache: 10 min (expensive aggregation)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { applyRateLimit } from "@/lib/rateLimit";
import { getImpactMetrics } from "@/services/analytics";

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

  const metrics = await getImpactMetrics();
  const month = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return NextResponse.json(
    { success: true, metrics, month, generatedAt: new Date() },
    { headers: { "Cache-Control": "private, max-age=600" } }
  );
}
