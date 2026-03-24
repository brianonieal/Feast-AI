// @version 0.9.0 - Lens: admin event status update
// PATCH /api/admin/events/[id]/status — update event status with transition validation

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { applyRateLimit } from "@/lib/rateLimit";

// Build-safe enum — z.enum with string literals instead of Prisma nativeEnum
const EVENT_STATUSES = [
  "DRAFT",
  "SCHEDULED",
  "MARKETED",
  "LIVE",
  "COMPLETED",
  "CANCELLED",
] as const;

type EventStatusValue = (typeof EVENT_STATUSES)[number];

const StatusSchema = z.object({
  status: z.enum(EVENT_STATUSES),
});

// Valid status transitions — forward only (no going backwards)
const VALID_TRANSITIONS: Record<EventStatusValue, EventStatusValue[]> = {
  DRAFT: ["SCHEDULED", "CANCELLED"],
  SCHEDULED: ["MARKETED", "CANCELLED"],
  MARKETED: ["LIVE", "CANCELLED"],
  LIVE: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

// FULL can go back to LIVE (someone cancels) or be CANCELLED
// Not in the Prisma enum — handled by capacity logic, not status.
// If FULL is added as a status later, add transitions here.

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await applyRateLimit(req, "standard");
  if (limited) return limited;

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const { id } = await params;

  const body = (await req.json()) as unknown;
  const parsed = StatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid status", code: "VALIDATION_ERROR", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const event = await db.feastEvent.findUnique({ where: { id } });
  if (!event || event.deletedAt) {
    return NextResponse.json(
      { error: "Event not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  const currentStatus = event.status as EventStatusValue;
  const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(parsed.data.status)) {
    return NextResponse.json(
      {
        error: `Cannot transition from ${event.status} to ${parsed.data.status}`,
        code: "INVALID_TRANSITION",
        currentStatus: event.status,
        allowedTransitions: allowed,
      },
      { status: 409 }
    );
  }

  const updated = await db.feastEvent.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  return NextResponse.json({
    success: true,
    data: { id: updated.id, status: updated.status },
  });
}
