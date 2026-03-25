// @version 1.0.1 - Event creation pipeline (Circle posting removed)
// @version 1.5.0 - Chorus: city member notifications
import { inngest } from "@/lib/inngest";
import { db } from "@/lib/db";
import { sendBulkNotification } from "@/services/notifications";
import { saveFailedJob } from "../services/deadLetter";

/**
 * Event creation pipeline:
 * 1. Update event status to SCHEDULED
 * 2. Mark as MARKETED (distribution channels deferred)
 *
 * Triggered when a new event is created via the API or @COORDINATOR.
 */
// ESCAPE: Inngest v4 inferred type not portable without Fetch reference
export const eventCreatedPipeline: ReturnType<typeof inngest.createFunction> = inngest.createFunction(
  {
    id: "event-created-pipeline",
    name: "Event Created Pipeline",
    retries: 3,
    triggers: [{ event: "feast/event.created" }],
    // ESCAPE: Inngest v4 onFailure type is any — explicit typing unavailable
    onFailure: async (ctx: any) => {
      await saveFailedJob({
        functionId: "event-created-pipeline",
        eventName: ctx.event?.name ?? "feast/event.created",
        payload: (ctx.event?.data as Record<string, unknown>) ?? {},
        error: ctx.error?.message ?? "Unknown error",
        attempts: ctx.attempt ?? 3,
      });
    },
  },
  async ({ event, step }: { event: { data: { eventId: string } }; step: {
    run: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
  }}) => {
    const { eventId } = event.data;

    // Step 1: Mark as SCHEDULED
    await step.run("mark-scheduled", async () => {
      return db.feastEvent.update({
        where: { id: eventId },
        data: { status: "SCHEDULED" },
        include: { host: { select: { name: true } } },
      });
    });

    // Step 2: Mark as MARKETED (distribution channels to be added later)
    await step.run("mark-marketed", async () => {
      return db.feastEvent.update({
        where: { id: eventId },
        data: { status: "MARKETED" },
      });
    });

    // Step 3: Auto-embed event into RAG corpus (v1.3.0 Nexus)
    await step.run("auto-embed-event", async () => {
      await inngest.send({
        name: "content/embed",
        data: { sourceType: "event", sourceId: eventId },
      }).catch(() => {});
      // Silent — embedding is non-critical to event creation
    });

    // Step 4: Notify city members about new event (v1.5.0 Chorus)
    await step.run("notify-city-members", async () => {
      // Fetch the event to get city + name
      const event = await db.feastEvent.findUnique({
        where: { id: eventId },
        select: { name: true, city: true },
      });
      if (!event) return { notified: 0 };

      // Find users in the same city who have push tokens
      const cityUsers = await db.user.findMany({
        where: {
          pushTokens: { some: { isActive: true } },
          memberIntents: {
            some: {
              city: { equals: event.city, mode: "insensitive" },
            },
          },
        },
        select: { id: true },
      });

      if (cityUsers.length === 0) return { notified: 0 };

      await sendBulkNotification(
        cityUsers.map((u) => u.id),
        {
          type: "new_event_in_city",
          title: `New dinner in ${event.city} \uD83C\uDF7D`,
          body: `"${event.name}" has been posted. Seats are limited.`,
          data: { eventId, screen: "Events" },
        }
      );

      return { notified: cityUsers.length };
    });

    return {
      eventId,
      status: "MARKETED",
    };
  }
);
