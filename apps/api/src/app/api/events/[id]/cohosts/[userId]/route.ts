// @version 1.3.0 - Nexus: co-host response + removal
// PATCH  /api/events/[id]/cohosts/[userId] — accept/decline (invited user only)
// DELETE /api/events/[id]/cohosts/[userId] — remove co-host (primary host only)

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { applyRateLimit } from "@/lib/rateLimit";
import { db } from "@/lib/db";

const ResponseSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

interface RouteParams {
  params: Promise<{ id: string; userId: string }>;
}

/** PATCH — accept or decline a co-host invitation (invited user only) */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
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

  const { id: eventId, userId: targetUserId } = await params;

  // Only the invited user can respond
  if (targetUserId !== user.id) {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const cohost = await db.coHost.findUnique({
    where: { eventId_userId: { eventId, userId: targetUserId } },
  });

  if (!cohost) {
    return NextResponse.json(
      { error: "Co-host invitation not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  if (cohost.status !== "pending") {
    return NextResponse.json(
      { error: "Invitation already responded to", code: "ALREADY_RESPONDED" },
      { status: 409 }
    );
  }

  const body = await req.json();
  const parsed = ResponseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await db.coHost.update({
    where: { id: cohost.id },
    data: {
      status: parsed.data.action === "accept" ? "accepted" : "declined",
      respondedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

/** DELETE — remove a co-host (primary host only) */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
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

  const { id: eventId, userId: targetUserId } = await params;

  // Cannot remove yourself (primary host)
  if (targetUserId === user.id) {
    return NextResponse.json(
      { error: "Cannot remove yourself as primary host", code: "CANNOT_REMOVE_SELF" },
      { status: 400 }
    );
  }

  // Verify event exists and requesting user is the primary host
  const event = await db.feastEvent.findUnique({ where: { id: eventId } });
  if (!event) {
    return NextResponse.json(
      { error: "Event not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  if (event.hostId !== user.id) {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  // Verify co-host record exists
  const cohost = await db.coHost.findUnique({
    where: { eventId_userId: { eventId, userId: targetUserId } },
  });
  if (!cohost) {
    return NextResponse.json(
      { error: "Co-host not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  await db.coHost.delete({ where: { id: cohost.id } });

  return NextResponse.json({ success: true });
}
