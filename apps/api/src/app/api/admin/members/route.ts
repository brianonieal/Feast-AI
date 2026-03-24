// @version 0.9.0 - Lens: admin members view
// GET /api/admin/members — applications + member intents + regional interest

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { applyRateLimit } from "@/lib/rateLimit";

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

  const url = req.nextUrl;
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? "20")));
  const intentFilter = url.searchParams.get("intent");

  // Fetch all three datasets in parallel
  const [applications, intents, regions, appTotal, intentTotal] =
    await Promise.all([
      db.application.findMany({
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.memberIntent.findMany({
        where: intentFilter
          ? // ESCAPE: MemberIntentType enum requires uppercase, filter comes lowercase
            { intent: intentFilter.toUpperCase() as never }
          : undefined,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.regionalInterest.findMany({
        orderBy: { count: "desc" },
        take: 20,
      }),
      db.application.count(),
      db.memberIntent.count(
        intentFilter
          ? { where: { intent: intentFilter.toUpperCase() as never } }
          : undefined
      ),
    ]);

  return NextResponse.json({
    success: true,
    data: {
      applications: applications.map((a) => ({
        id: a.id,
        name: a.name,
        city: a.city,
        role: a.role,
        status: a.status,
        createdAt: a.createdAt,
      })),
      intents: intents.map((i) => ({
        id: i.id,
        name: i.name,
        email: i.email,
        intent: i.intent,
        confidence: i.confidence,
        city: i.city,
        source: i.source,
        createdAt: i.createdAt,
      })),
      regions: regions.map((r) => ({
        city: r.city,
        count: r.count,
      })),
    },
    pagination: {
      page,
      limit,
      applicationTotal: appTotal,
      intentTotal,
    },
  });
}
