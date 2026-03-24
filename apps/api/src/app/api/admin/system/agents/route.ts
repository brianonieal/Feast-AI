// @version 0.9.0 - Lens: admin agent status + spend summary
// GET /api/admin/system/agents — founding_table only
// Returns @GUARDIAN daily spend summary + last 20 spend logs

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { applyRateLimit } from "@/lib/rateLimit";
import { getDailySpendSummary } from "@/council/guardian";

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

  const [summary, recentLogs] = await Promise.all([
    getDailySpendSummary(),
    db.agentSpendLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      summary,
      recentLogs: recentLogs.map((log) => ({
        id: log.id,
        agent: log.agent,
        model: log.model,
        action: log.action,
        inputTokens: log.inputTokens,
        outputTokens: log.outputTokens,
        costUsd: log.costUsd,
        durationMs: log.durationMs,
        success: log.success,
        error: log.error,
        createdAt: log.createdAt,
      })),
    },
  });
}
