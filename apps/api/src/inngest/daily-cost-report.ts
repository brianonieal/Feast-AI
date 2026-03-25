// @version 0.8.0 - Shield: daily cost report — @GUARDIAN
// Runs at 00:00 UTC daily
// In production, consider timezone implications --
// The Feast operates across multiple US timezones.
// UTC midnight = 7pm ET / 4pm PT (previous day).
// A noon UTC cron ('0 12 * * *') would be more
// meaningful for a US-based community. Adjust when
// production timezone is confirmed.

import { inngest } from "@/lib/inngest";
import {
  runDailyReport,
  restoreAgentModels,
} from "@/council/guardian";
import { saveFailedJob } from "../services/deadLetter";

// ESCAPE: Inngest v4 inferred type not portable without Fetch reference
export const dailyCostReportFunction: ReturnType<
  typeof inngest.createFunction
> = inngest.createFunction(
  {
    id: "daily-cost-report",
    name: "Daily Cost Report — @GUARDIAN",
    retries: 1,
    triggers: [{ cron: "0 0 * * *" }],
    // ESCAPE: Inngest v4 onFailure type is any
    onFailure: async (ctx: any) => {
      await saveFailedJob({
        functionId: "daily-cost-report",
        eventName: ctx.event?.name ?? "cron/daily-cost-report",
        payload: (ctx.event?.data as Record<string, unknown>) ?? {},
        error: ctx.error?.message ?? "Unknown error",
        attempts: ctx.attempt ?? 1,
      });
    },
  },
  async ({ step }: { step: { run: <T>(name: string, fn: () => Promise<T>) => Promise<T> } }) => {
    // Step 1: Restore any model overrides from previous day
    // New day starts with clean model defaults
    await step.run("restore-models", async () => {
      await restoreAgentModels();
    });

    // Step 2: Generate and save daily report
    const report = await step.run("generate-report", async () => {
      return runDailyReport();
    });

    return {
      date: report.date,
      totalCostUsd: report.totalCostUsd,
      status: report.status,
      callCount: report.callCount,
    };
  }
);
