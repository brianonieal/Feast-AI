// @version 1.4.0 - Harvest: 100 Dinners campaign tracker
// GET /api/analytics/campaign — campaign progress with city breakdown
// Auth: any authenticated user. Cache: 5 min.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { applyRateLimit } from "@/lib/rateLimit";
import { getCampaignData } from "@/services/analytics";

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

  const campaign = await getCampaignData();

  return NextResponse.json(
    { success: true, data: campaign },
    { headers: { "Cache-Control": "private, max-age=300" } }
  );
}
