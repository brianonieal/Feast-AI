// @version 1.5.0 - Chorus: notification preferences
// GET   /api/notifications/preferences — get current preferences
// PATCH /api/notifications/preferences — update preferences

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { applyRateLimit } from "@/lib/rateLimit";
import { db } from "@/lib/db";

const DEFAULTS = {
  eventReminders: true,
  weeklyDigest: true,
  newEventInCity: true,
  waitlistUpdates: true,
  welcomeNotif: true,
};

const UpdateSchema = z.object({
  eventReminders: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  newEventInCity: z.boolean().optional(),
  waitlistUpdates: z.boolean().optional(),
  welcomeNotif: z.boolean().optional(),
});

/** GET — return current preferences (defaults if none set) */
export async function GET(req: NextRequest) {
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

  const pref = await db.notificationPreference.findUnique({
    where: { userId: user.id },
  });

  return NextResponse.json({
    success: true,
    data: pref
      ? {
          eventReminders: pref.eventReminders,
          weeklyDigest: pref.weeklyDigest,
          newEventInCity: pref.newEventInCity,
          waitlistUpdates: pref.waitlistUpdates,
          welcomeNotif: pref.welcomeNotif,
        }
      : DEFAULTS,
  });
}

/** PATCH — update notification preferences (upsert) */
export async function PATCH(req: NextRequest) {
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

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await db.notificationPreference.upsert({
    where: { userId: user.id },
    update: parsed.data,
    create: {
      userId: user.id,
      ...DEFAULTS,
      ...parsed.data,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      eventReminders: updated.eventReminders,
      weeklyDigest: updated.weeklyDigest,
      newEventInCity: updated.newEventInCity,
      waitlistUpdates: updated.waitlistUpdates,
      welcomeNotif: updated.welcomeNotif,
    },
  });
}
