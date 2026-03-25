// @version 1.1.0 - Ember: dead letter queue admin route
// GET — list unresolved failed jobs + count
// POST — resolve a job (mark resolved + retry original event)
// founding_table only

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { applyRateLimit } from "@/lib/rateLimit";
import { db } from "@/lib/db";
import { inngest } from "@/lib/inngest";
import {
  getFailedJobs,
  resolveFailedJob,
  getFailedJobCount,
} from "@/services/deadLetter";

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, "standard");
  if (limited) return limited;

  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const tier = (sessionClaims?.publicMetadata as { tier?: string })?.tier;
  if (tier !== "founding_table") {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const jobs = await getFailedJobs(50);
  const count = await getFailedJobCount();

  return NextResponse.json({ success: true, jobs, count });
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, "standard");
  if (limited) return limited;

  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const tier = (sessionClaims?.publicMetadata as { tier?: string })?.tier;
  if (tier !== "founding_table") {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const body = (await req.json()) as unknown;
  const parsed = z.object({ jobId: z.string() }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  // Fetch job before resolving to get eventName + payload for retry
  const job = await db.failedJob.findUnique({
    where: { id: parsed.data.jobId },
  });

  if (!job) {
    return NextResponse.json(
      { error: "Job not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  // Mark as resolved
  await resolveFailedJob(parsed.data.jobId, userId);

  // Also retry the job immediately on manual resolve
  try {
    await inngest.send({
      name: job.eventName as string,
      data: job.payload as Record<string, unknown>,
    });
  } catch {
    // Silent — resolution is saved even if retry fails
  }

  return NextResponse.json({ success: true });
}
