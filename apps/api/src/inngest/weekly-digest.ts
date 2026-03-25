// @version 1.5.0 - Chorus
// Runs every Sunday at 10am UTC
// Sends weekly community digest to all opted-in members
// TODO: adjust cron to user timezone in v1.6.0
// Currently 10am UTC = 6am ET / 3am PT

import { inngest } from "@/lib/inngest";
import { db } from "@/lib/db";
import { sendBulkNotification } from "@/services/notifications";
import { getImpactMetrics } from "@/services/analytics";
import { saveFailedJob } from "../services/deadLetter";

// ESCAPE: Inngest v4 inferred type not portable without Fetch reference
export const weeklyDigestFunction: ReturnType<
  typeof inngest.createFunction
> = inngest.createFunction(
  {
    id: "weekly-digest",
    name: "Weekly Digest — Chorus",
    retries: 1,
    // ESCAPE: Inngest v4 onFailure type is any
    onFailure: async (ctx: any) => {
      await saveFailedJob({
        functionId: "weekly-digest",
        eventName: "scheduled/weekly",
        payload: {},
        error: ctx.error?.message ?? "Unknown",
        attempts: ctx.attempt ?? 1,
      });
    },
    triggers: [{ cron: "0 10 * * 0" }], // Sunday 10am UTC
  },
  async ({
    step,
  }: {
    step: {
      run: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
    };
  }) => {
    // Get community metrics for the digest
    const metrics = await step.run("fetch-metrics", async () => {
      return getImpactMetrics();
    });

    // Get all users with active push tokens
    const users = await step.run("fetch-users", async () => {
      return db.user.findMany({
        where: { pushTokens: { some: { isActive: true } } },
        select: { id: true },
      });
    });

    const userIds = users.map((u) => u.id);

    const result = await step.run("send-digest", async () => {
      return sendBulkNotification(userIds, {
        type: "weekly_digest",
        title: "The Feast — Weekly Update \uD83C\uDF31",
        body: `${metrics.dinnersHosted} dinners hosted. ${metrics.peopleConnected} people connected. The table is growing.`,
        data: { screen: "Home" },
      });
    });

    return { recipients: userIds.length, ...result };
  }
);
