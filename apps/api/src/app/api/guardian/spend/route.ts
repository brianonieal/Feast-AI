// @version 0.8.0 - Shield: cost report API
// Returns current day's live spend summary or historical report
// Used by admin dashboard in v0.9.0

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { applyRateLimit } from "@/lib/rateLimit";
import { getDailySpendSummary } from "@/council/guardian";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, "standard");
  if (limited) return limited;

  try {
    await requireAuth();
  } catch {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const dateParam = req.nextUrl.searchParams.get("date");

  // Historical date: query saved DailySpendReport
  if (dateParam) {
    const requestedDate = new Date(dateParam);
    requestedDate.setHours(0, 0, 0, 0);

    if (isNaN(requestedDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format", code: "INVALID_DATE" },
        { status: 400 }
      );
    }

    const report = await db.dailySpendReport.findFirst({
      where: { date: requestedDate },
    });

    if (!report) {
      return NextResponse.json(
        { error: "No report for this date", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        summary: {
          date: dateParam,
          totalCostUsd: report.totalCostUsd,
          byAgent: report.byAgent,
          callCount: report.callCount,
          limitUsd: report.limitUsd,
          percentUsed: report.percentUsed,
          status: report.downgradedAt
            ? "downgraded"
            : report.percentUsed >= 0.8
              ? "critical"
              : report.percentUsed >= 0.5
                ? "warning"
                : "normal",
        },
      },
      {
        headers: { "Cache-Control": "private, max-age=30" },
      }
    );
  }

  // Default: today's live summary
  const summary = await getDailySpendSummary();

  return NextResponse.json(
    { success: true, summary },
    {
      headers: { "Cache-Control": "private, max-age=30" },
    }
  );
}
