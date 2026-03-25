// @version 0.6.0 - Beacon: manual content distribution route
// Triggers distribution for an approved queue item
// Used by admin dashboard for re-distribution or retry

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { applyRateLimit } from "@/lib/rateLimit";
import { distributeContent } from "@/services/distribution";
import { getDistributionTargets } from "@feast-ai/shared";
// EventVisibility removed — getDistributionTargets() no longer takes args

const DistributeSchema = z.object({
  queueItemId: z.string(),
});

/** POST /api/content/distribute — manually distribute approved content */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // Rate limit first — distribution tier (10/min)
  const limited = await applyRateLimit(req, "distribution");
  if (limited) return limited;

  const user = await requireAuth();

  const body = (await req.json()) as unknown;
  const parsed = DistributeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: parsed.error.issues,
      },
      { status: 400 }
    );
  }

  const item = await db.contentApprovalQueue.findUnique({
    where: { id: parsed.data.queueItemId },
    include: { event: true },
  });

  if (!item) {
    return NextResponse.json(
      { error: "Queue item not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  if (item.status !== "APPROVED") {
    return NextResponse.json(
      {
        error: `Item is ${item.status.toLowerCase()}, must be approved first`,
        code: "NOT_APPROVED",
      },
      { status: 409 }
    );
  }

  const targets = getDistributionTargets();

  const results = await distributeContent({
    approvalQueueId: item.id,
    targets,
    triggeredBy: user.id,
  });

  return NextResponse.json({ success: true, results });
}
