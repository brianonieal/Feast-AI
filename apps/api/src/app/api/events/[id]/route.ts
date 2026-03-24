// @version 0.4.0 - Spark: event detail + update
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { EventStatusSchema } from "@feast-ai/shared";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const UpdateEventSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  date: z.coerce.date().optional(),
  location: z.string().min(1).max(500).optional(),
  city: z.string().min(1).max(100).optional(),
  capacity: z.number().int().positive().max(100).optional(),
  type: z.enum(["OPEN", "CLOSED"]).optional(),
  status: EventStatusSchema.optional(),
  communityTier: z.enum(["commons", "kitchen", "founding_table"]).optional(),
});

/** GET /api/events/:id — get single event */
export async function GET(
  _req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;

  const event = await db.feastEvent.findUnique({
    where: { id },
    include: {
      host: { select: { id: true, name: true, city: true, role: true } },
      attendances: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  if (!event || event.deletedAt) {
    return NextResponse.json(
      { error: "Event not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  return NextResponse.json(event);
}

/** PATCH /api/events/:id — update event (host or admin only) */
export async function PATCH(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;
  const user = await requireAuth();

  const existing = await db.feastEvent.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    return NextResponse.json(
      { error: "Event not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  if (existing.hostId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only the host or admin can update this event", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const body = await req.json() as unknown;
  const parsed = UpdateEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", code: "VALIDATION_ERROR", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const event = await db.feastEvent.update({
    where: { id },
    data: parsed.data,
    include: { host: { select: { id: true, name: true, city: true, role: true } } },
  });

  return NextResponse.json(event);
}
