// @version 0.4.0 - Spark: Inngest serve endpoint
import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import {
  eventCreatedPipeline,
  contentSubmittedPipeline,
  contentApprovedPipeline,
  applicationSubmittedPipeline,
  dailyCostReportFunction,
  retryFailedJobsFunction,
  embedContentFunction,
  eventReminderFunction,
  weeklyDigestFunction,
} from "@/inngest";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    eventCreatedPipeline,
    contentSubmittedPipeline,
    contentApprovedPipeline,
    applicationSubmittedPipeline,
    dailyCostReportFunction,
    retryFailedJobsFunction,
    embedContentFunction,
    eventReminderFunction,
    weeklyDigestFunction,
  ],
});
