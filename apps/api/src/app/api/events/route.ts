// @version 0.4.0 - Spark: event list + create
import { NextRequest, NextResponse } from "next/server";
import { CreateEventSchema } from "@feast-ai/shared";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

/** GET /api/events — list events (with optional city/status filters) */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city");
  const status = searchParams.get("status");
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);
  const offset = Number(searchParams.get("offset") ?? 0);

  const where: Record<string, unknown> = { deletedAt: null };
  if (city) where.city = city;
  if (status) where.status = status;

  const [events, total] = await Promise.all([
    db.feastEvent.findMany({
      where,
      include: { host: { select: { id: true, name: true, city: true, role: true } } },
      orderBy: { date: "asc" },
      take: limit,
      skip: offset,
    }),
    db.feastEvent.count({ where }),
  ]);

  return NextResponse.json({ events, total, limit, offset });
}

/** POST /api/events — create a new event (requires auth, host role) */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await requireAuth();

  if (user.role !== "HOST" && user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only hosts and admins can create events", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const body = await req.json() as unknown;
  const parsed = CreateEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", code: "VALIDATION_ERROR", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const event = await db.feastEvent.create({
    data: {
      ...parsed.data,
      hostId: user.id,
      status: "DRAFT",
    },
    include: { host: { select: { id: true, name: true, city: true, role: true } } },
  });

  return NextResponse.json(event, { status: 201 });
}
