// @version 1.1.0 - Ember
// Dead letter queue -- saves exhausted Inngest jobs for manual review
// saveFailedJob() NEVER throws -- a failure to log must not cause another failure

import { db } from "../lib/db";

export interface FailedJobInput {
  inngestJobId?: string;
  functionId: string;
  eventName: string;
  payload: Record<string, unknown>;
  error: string;
  attempts: number;
}

export async function saveFailedJob(input: FailedJobInput): Promise<void> {
  try {
    await db.failedJob.create({
      data: {
        inngestJobId: input.inngestJobId,
        functionId: input.functionId,
        eventName: input.eventName,
        payload: input.payload as object,
        error: input.error,
        attempts: input.attempts,
        exhausted: true,
      },
    });
    console.error(
      `[DeadLetter] Job saved: ${input.functionId} after ${input.attempts} attempts. ` +
        `Error: ${input.error}`
    );
  } catch (err) {
    // Never let dead letter logging crash the process
    console.error("[DeadLetter] Failed to save job:", err);
  }
}

export async function resolveFailedJob(
  jobId: string,
  resolvedBy: string
): Promise<void> {
  await db.failedJob.update({
    where: { id: jobId },
    data: { resolvedAt: new Date(), resolvedBy, exhausted: false },
  });
}

export async function getFailedJobs(limit = 50) {
  return db.failedJob.findMany({
    where: { exhausted: true, resolvedAt: null },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getFailedJobCount(): Promise<number> {
  return db.failedJob.count({
    where: { exhausted: true, resolvedAt: null },
  });
}
