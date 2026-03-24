// @version 0.6.0 - Beacon: content approval → distribution pipeline
// Triggered when admin approves content in the approval queue.
// Runs distribution to all appropriate channels based on event visibility.
import { inngest } from "@/lib/inngest";
import { db } from "@/lib/db";
import { distributeContent } from "@/services/distribution";
import { getDistributionTargets } from "@feast-ai/shared";
import type { EventVisibility } from "@feast-ai/shared";

// ESCAPE: Inngest v4 inferred type not portable without Fetch reference
export const contentApprovedPipeline: ReturnType<typeof inngest.createFunction> = inngest.createFunction(
  {
    id: "content-approved-pipeline",
    name: "Content Approved — Distribute",
    retries: 3,
    triggers: [{ event: "content/approved" }],
  },
  async ({ event, step }: { event: { data: { queueItemId: string; approvedBy: string } }; step: {
    run: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
  }}) => {
    const { queueItemId, approvedBy } = event.data;

    // Step 1: Fetch queue item + event
    const queueItem = await step.run("fetch-queue-item", async () => {
      return db.contentApprovalQueue.findUnique({
        where: { id: queueItemId },
        include: { event: true },
      });
    });

    if (!queueItem) throw new Error(`Queue item ${queueItemId} not found`);

    // Step 2: Determine distribution targets from event visibility
    const targets = getDistributionTargets(
      queueItem.event.communityTier as EventVisibility
    );

    // Step 3: Distribute to all channels (sequential, with per-channel logging)
    const results = await step.run("distribute-content", async () => {
      return distributeContent({
        approvalQueueId: queueItemId,
        targets,
        triggeredBy: approvedBy,
      });
    });

    // Step 4: Return summary
    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return {
      queueItemId,
      channels: results.length,
      succeeded,
      failed,
      results,
    };
  }
);
