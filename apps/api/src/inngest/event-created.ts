// @version 1.0.1 - Event creation pipeline (Circle posting removed)
import { inngest } from "@/lib/inngest";
import { db } from "@/lib/db";

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

    return {
      eventId,
      status: "MARKETED",
    };
  }
);
