// @version 1.4.0 - Harvest: member reflection history
// GET /api/analytics/reflections/me — authenticated user's reflection journey
// Auth: required. No cache (personal data).

import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/rateLimit";
import { requireAuth } from "@/lib/auth";
import { getMemberReflectionHistory } from "@/services/analytics";

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, "standard");
  if (limited) return limited;

  let user;
  try {
    user = await requireAuth();
  } catch {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const history = await getMemberReflectionHistory(user.id);

  return NextResponse.json({ success: true, data: history });
}
