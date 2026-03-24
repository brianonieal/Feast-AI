// @version 0.9.0 - Lens: admin content approval queue
// GET /api/admin/queue — paginated PENDING content queue items

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

  const where = { status: "PENDING" as const };

  const [items, total] = await Promise.all([
    db.contentApprovalQueue.findMany({
      where,
      include: {
        event: { select: { name: true, date: true, city: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.contentApprovalQueue.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: items.map((item) => ({
      id: item.id,
      eventName: item.event.name,
      eventDate: item.event.date,
      city: item.event.city,
      channel: item.channel,
      generatedTitle: item.generatedTitle,
      generatedBody: item.generatedBody,
      status: item.status,
      createdAt: item.createdAt,
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
