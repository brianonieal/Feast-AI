// @version 1.5.0 - Chorus
// Runs every hour — checks for events starting in ~24h
// Sends reminder push notifications to confirmed attendees

import { inngest } from "@/lib/inngest";
import { db } from "@/lib/db";
import { sendPushNotification } from "@/services/notifications";
import { saveFailedJob } from "../services/deadLetter";

// ESCAPE: Inngest v4 inferred type not portable without Fetch reference
export const eventReminderFunction: ReturnType<
  typeof inngest.createFunction
> = inngest.createFunction(
  {
    id: "event-reminder",
    name: "Event Reminders — Chorus",
    retries: 2,
    // ESCAPE: Inngest v4 onFailure type is any
    onFailure: async (ctx: any) => {
      await saveFailedJob({
        functionId: "event-reminder",
        eventName: "scheduled/hourly",
        payload: {},
        error: ctx.error?.message ?? "Unknown",
        attempts: ctx.attempt ?? 1,
      });
    },
    triggers: [{ cron: "0 * * * *" }], // every hour
  },
  async ({
    step,
  }: {
    step: {
      run: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
    };
  }) => {
    // 23-25 hour window prevents double-sending
    // if the function runs slightly early or late
    const now = new Date();
    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const events = await step.run("fetch-upcoming-events", async () => {
      return db.feastEvent.findMany({
        where: {
          date: { gte: windowStart, lte: windowEnd },
          status: { in: ["MARKETED", "LIVE"] },
        },
        include: {
          attendances: {
            where: { status: "CONFIRMED" },
            include: { user: { select: { id: true, name: true } } },
          },
        },
      });
    });

    let sent = 0;
    for (const event of events) {
      for (const attendance of event.attendances) {
        await step.run(
          `remind-${event.id}-${attendance.userId}`,
          async () => {
            await sendPushNotification({
              userId: attendance.userId,
              type: "event_reminder",
              title: "Your Feast dinner is tomorrow \uD83C\uDF7D",
              body: `Don't forget — "${event.name}" in ${event.city} starts tomorrow.`,
              data: { eventId: event.id, screen: "EventDetail" },
            });
            sent++;
          }
        );
      }
    }

    return { events: events.length, reminders: sent };
  }
);
