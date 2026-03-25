// @version 1.3.0 - Nexus
// @version 1.5.0 - Chorus: push notification on waitlist promotion
// Waitlist management — join, leave, promote

import { db } from "../lib/db";
import { sendPushNotification } from "./notifications";

export async function joinWaitlist(eventId: string, userId: string) {
  // Check event exists
  const event = await db.feastEvent.findUnique({ where: { id: eventId } });
  if (!event) throw new Error("Event not found");

  // Get current waitlist length for position
  const count = await db.eventWaitlist.count({ where: { eventId } });

  return db.eventWaitlist.create({
    data: {
      eventId,
      userId,
      position: count + 1,
    },
  });
}

export async function leaveWaitlist(eventId: string, userId: string) {
  const entry = await db.eventWaitlist.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });

  if (!entry) throw new Error("Not on waitlist");

  // Delete the entry
  await db.eventWaitlist.delete({
    where: { eventId_userId: { eventId, userId } },
  });

  // Reorder positions for entries below the removed one
  await db.eventWaitlist.updateMany({
    where: { eventId, position: { gt: entry.position } },
    data: { position: { decrement: 1 } },
  });
}

/**
 * Promote top N from waitlist to confirmed when seats open up.
 * TODO v1.4.0: Send email notification via Resend when promoted.
 */
export async function promoteFromWaitlist(eventId: string, seats: number) {
  const topEntries = await db.eventWaitlist.findMany({
    where: { eventId, notified: false },
    orderBy: { position: "asc" },
    take: seats,
    include: { user: { select: { email: true, name: true } } },
  });

  // Fetch event name for notification message
  const event = await db.feastEvent.findUnique({
    where: { id: eventId },
    select: { name: true },
  });
  const eventName = event?.name ?? "your upcoming dinner";

  for (const entry of topEntries) {
    await db.eventWaitlist.update({
      where: { id: entry.id },
      data: { notified: true, notifiedAt: new Date() },
    });
    // TODO v1.6.0: Send email notification via Resend
    console.log(
      `[Waitlist] Promoted ${entry.user.email} from waitlist for event ${eventId}`
    );
    // Push notification — after DB update succeeds, non-critical
    await sendPushNotification({
      userId: entry.userId,
      type: "waitlist_promotion",
      title: "You're off the waitlist! \uD83C\uDF89",
      body: `A spot opened up for "${eventName}". You're confirmed!`,
      data: { eventId, screen: "EventDetail" },
    }).catch(() => {}); // silent — promotion must succeed even if notification fails
  }

  return topEntries;
}

export async function getWaitlistPosition(eventId: string, userId: string) {
  const entry = await db.eventWaitlist.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });
  return entry?.position ?? null;
}

export async function getWaitlistForEvent(eventId: string) {
  return db.eventWaitlist.findMany({
    where: { eventId },
    orderBy: { position: "asc" },
    include: { user: { select: { name: true, email: true } } },
  });
}
