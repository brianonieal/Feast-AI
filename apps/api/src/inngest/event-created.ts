// @version 1.0.1 - Event creation pipeline (Circle posting removed)
import { inngest } from "@/lib/inngest";
import { db } from "@/lib/db";
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

    return {
      eventId,
      status: "MARKETED",
    };
  }
);
