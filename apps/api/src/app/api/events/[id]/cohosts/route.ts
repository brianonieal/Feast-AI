// @version 1.3.0 - Nexus: co-host invitation
// POST /api/events/[id]/cohosts — invite a co-host (primary host only)

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { applyRateLimit } from "@/lib/rateLimit";
import { db } from "@/lib/db";

const InviteSchema = z.object({
  userId: z.string(),
  role: z.enum(["co_host", "facilitator", "assistant"]).default("co_host"),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

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

  // Verify event exists
  const event = await db.feastEvent.findUnique({ where: { id: eventId } });
  if (!event) {
    return NextResponse.json(
      { error: "Event not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  // Only primary host can invite co-hosts
  if (event.hostId !== user.id) {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const parsed = InviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Verify invited user exists
  const invitedUser = await db.user.findUnique({
    where: { id: parsed.data.userId },
  });
  if (!invitedUser) {
    return NextResponse.json(
      { error: "Invited user not found", code: "USER_NOT_FOUND" },
      { status: 404 }
    );
  }

  // Check for duplicate invitation (pending or accepted)
  const existing = await db.coHost.findUnique({
    where: { eventId_userId: { eventId, userId: parsed.data.userId } },
  });
  if (existing && (existing.status === "pending" || existing.status === "accepted")) {
    return NextResponse.json(
      { error: "User already invited", code: "ALREADY_INVITED" },
      { status: 409 }
    );
  }

  // Create or upsert (if previously declined, allow re-invite)
  const cohost = existing
    ? await db.coHost.update({
        where: { id: existing.id },
        data: { status: "pending", role: parsed.data.role, respondedAt: null },
      })
    : await db.coHost.create({
        data: {
          eventId,
          userId: parsed.data.userId,
          role: parsed.data.role,
          invitedBy: user.id,
        },
      });

  return NextResponse.json({ success: true, data: cohost }, { status: 201 });
}
