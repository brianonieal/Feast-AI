// @version 0.9.0 - Lens: admin event list
// GET /api/admin/events — paginated event list with host info + attendance count

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { applyRateLimit } from "@/lib/rateLimit";
import type { EventStatus } from "@prisma/client";

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
  const statusFilter = url.searchParams.get("status") as EventStatus | null;
  const cityFilter = url.searchParams.get("city");

  const where = {
    deletedAt: null,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(cityFilter ? { city: cityFilter } : {}),
  };

  const [events, total] = await Promise.all([
    db.feastEvent.findMany({
      where,
      include: {
        host: { select: { name: true } },
        _count: { select: { attendances: true } },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.feastEvent.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: events.map((e) => ({
      id: e.id,
      name: e.name,
      date: e.date,
      location: e.location,
      city: e.city,
      capacity: e.capacity,
      status: e.status,
      hostName: e.host.name,
      confirmedSeats: e._count.attendances,
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
