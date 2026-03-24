// @version 0.4.0 - Spark: event creation pipeline (background job)
import { inngest } from "@/lib/inngest";
import { db } from "@/lib/db";
import { circleAdapter } from "@/integrations/circle/adapter";

/**
 * Event creation pipeline:
 * 1. Update event status to SCHEDULED
 * 2. Post to Circle (correct space based on event type/tier)
 * 3. Update event with Circle post ID
 * 4. Update status to MARKETED
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
    const feastEvent = await step.run("mark-scheduled", async () => {
      return db.feastEvent.update({
        where: { id: eventId },
        data: { status: "SCHEDULED" },
        include: { host: { select: { name: true } } },
      });
    });

    // Step 2: Post to Circle
    const circleResult = await step.run("post-to-circle", async () => {
      try {
        const spaces = await circleAdapter.listSpaces();

        // Select space based on event type and tier
        // Default to first space found — proper space mapping comes with full Circle setup
        const targetSpace = spaces[0];
        if (!targetSpace) {
          return { posted: false as const, error: "No Circle spaces found" };
        }

        const post = await circleAdapter.createPost({
          spaceId: targetSpace.id,
          name: feastEvent.name,
          body: `${feastEvent.description ?? feastEvent.name}\n\nDate: ${feastEvent.date.toLocaleDateString()}\nLocation: ${feastEvent.location}, ${feastEvent.city}\nCapacity: ${feastEvent.capacity}\nHosted by: ${feastEvent.host.name ?? "A Feast Host"}`,
        });

        return { posted: true as const, postId: post.id, url: post.url };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown Circle error";
        console.error("Circle post failed:", message);
        return { posted: false as const, error: message };
      }
    });

    // Step 3: Update event with Circle post ID (if posted)
    if (circleResult.posted) {
      await step.run("update-circle-id", async () => {
        return db.feastEvent.update({
          where: { id: eventId },
          data: {
            circlePostId: circleResult.postId,
            status: "MARKETED",
          },
        });
      });
    }

    return {
      eventId,
      status: circleResult.posted ? "MARKETED" : "SCHEDULED",
      circle: circleResult,
    };
  }
);
