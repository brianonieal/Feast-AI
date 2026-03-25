// @version 1.1.0 - Ember: auto-retry failed jobs from dead letter queue
// Runs every 15 minutes — picks up exhausted jobs and re-sends their original events.
// Only retry jobs from the last 24 hours.
// Older failures likely indicate a systemic issue
// that needs manual investigation, not auto-retry.

import { inngest } from "@/lib/inngest";
import { db } from "@/lib/db";

// ESCAPE: Inngest v4 inferred type not portable without Fetch reference
export const retryFailedJobsFunction: ReturnType<
  typeof inngest.createFunction
> = inngest.createFunction(
  {
    id: "retry-failed-jobs",
    name: "Retry Failed Jobs — @GUARDIAN",
    retries: 0, // do not retry the retry function itself
    triggers: [{ cron: "*/15 * * * *" }],
  },
  async ({ step }: { step: { run: <T>(name: string, fn: () => Promise<T>) => Promise<T> } }) => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const jobs = await step.run("fetch-failed-jobs", async () => {
      return db.failedJob.findMany({
        where: {
          exhausted: true,
          resolvedAt: null,
          createdAt: { gte: cutoff },
        },
        orderBy: { createdAt: "asc" },
        take: 10, // process 10 at a time
      });
    });

    if (jobs.length === 0) {
      return { retried: 0 };
    }

    let retried = 0;

    for (const job of jobs) {
      await step.run(`retry-${job.id}`, async () => {
        try {
          // Re-send the original event to Inngest
          await inngest.send({
            name: job.eventName as string,
            data: job.payload as Record<string, unknown>,
          });

          // Mark as resolved (being retried)
          await db.failedJob.update({
            where: { id: job.id },
            data: {
              resolvedAt: new Date(),
              resolvedBy: "auto-retry",
              exhausted: false,
            },
          });

          retried++;
        } catch (err) {
          console.error(
            `[RetryFailedJobs] Failed to retry job ${job.id}:`,
            err
          );
        }
      });
    }

    return { retried, total: jobs.length };
  }
);
