// @version 1.2.0 - Prism: community health report from @ANALYST
// Any authenticated user can view — transparency is a Feast value.
// Cached for 5 min — report takes 5-10s to generate (Voyage AI + Claude).
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { applyRateLimit } from "@/lib/rateLimit";
import { generateHealthReport } from "@/council/analyst";

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, "ai");
  if (limited) return limited;

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const report = await generateHealthReport();

  return NextResponse.json(
    { success: true, report },
    { headers: { "Cache-Control": "private, max-age=300" } }
  );
}
