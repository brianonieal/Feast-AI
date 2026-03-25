// @version 1.3.0 - Nexus: waitlist management
// POST   /api/events/[id]/waitlist — join waitlist
// DELETE /api/events/[id]/waitlist — leave waitlist
// GET    /api/events/[id]/waitlist — get position + queue length

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { applyRateLimit } from "@/lib/rateLimit";
import { db } from "@/lib/db";
import {
  joinWaitlist,
  leaveWaitlist,
  getWaitlistPosition,
} from "@/services/waitlist";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** POST — join the waitlist for an event */
export async function POST(req: NextRequest, { params }: RouteParams) {
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

  const { id: eventId } = await params;

  // Verify event exists and is joinable
  const event = await db.feastEvent.findUnique({ where: { id: eventId } });
  if (!event) {
    return NextResponse.json(
      { error: "Event not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  if (event.status === "CANCELLED" || event.status === "COMPLETED") {
    return NextResponse.json(
      { error: "Event is not accepting waitlist entries", code: "EVENT_CLOSED" },
      { status: 400 }
    );
  }

  // Check if already on waitlist
  const existing = await db.eventWaitlist.findUnique({
    where: { eventId_userId: { eventId, userId: user.id } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Already on waitlist", code: "ALREADY_ON_WAITLIST" },
      { status: 409 }
    );
  }

  // Check if already a confirmed attendee
  const attendance = await db.eventAttendance.findFirst({
    where: { eventId, userId: user.id },
  });
  if (attendance) {
    return NextResponse.json(
      { error: "Already attending this event", code: "ALREADY_ATTENDING" },
      { status: 409 }
    );
  }

  const entry = await joinWaitlist(eventId, user.id);

  return NextResponse.json(
    { success: true, data: { position: entry.position } },
    { status: 201 }
  );
}

/** DELETE — leave the waitlist */
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

  const { id: eventId } = await params;

  // Verify user is on the waitlist
  const existing = await db.eventWaitlist.findUnique({
    where: { eventId_userId: { eventId, userId: user.id } },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Not on waitlist", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  await leaveWaitlist(eventId, user.id);

  return NextResponse.json({ success: true });
}

/** GET — check position and queue length */
export async function GET(req: NextRequest, { params }: RouteParams) {
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

  const { id: eventId } = await params;

  const [position, totalWaiting] = await Promise.all([
    getWaitlistPosition(eventId, user.id),
    db.eventWaitlist.count({ where: { eventId } }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      position,
      totalWaiting,
      isOnWaitlist: position !== null,
    },
  });
}
