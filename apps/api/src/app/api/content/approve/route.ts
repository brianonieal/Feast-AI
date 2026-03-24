// @version 0.6.0 - Beacon: content approval route
// Admin approves or rejects a content queue item
// Rate limited → auth → validate → process

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { inngest } from "@/lib/inngest";
import { applyRateLimit } from "@/lib/rateLimit";

const ApproveSchema = z.object({
  queueItemId: z.string(),
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().optional(),
  editedBody: z.string().optional(),
});

/** POST /api/content/approve — approve or reject a queue item */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // Rate limit first — before auth or body parsing
  const limited = await applyRateLimit(req, "standard");
  if (limited) return limited;

  const user = await requireAuth();

  const body = (await req.json()) as unknown;
  const parsed = ApproveSchema.safeParse(body);
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

  const { queueItemId, action, rejectionReason, editedBody } = parsed.data;

  const item = await db.contentApprovalQueue.findUnique({
    where: { id: queueItemId },
  });

  if (!item) {
    return NextResponse.json(
      { error: "Queue item not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  if (item.status !== "PENDING") {
    return NextResponse.json(
      {
        error: `Item already ${item.status.toLowerCase()}`,
        code: "ALREADY_PROCESSED",
      },
      { status: 409 }
    );
  }

  const updated = await db.contentApprovalQueue.update({
    where: { id: queueItemId },
    data: {
      status: action === "approve" ? "APPROVED" : "REJECTED",
      reviewedBy: user.id,
      reviewedAt: new Date(),
      rejectionReason: action === "reject" ? rejectionReason : null,
      generatedBody: editedBody ?? item.generatedBody,
    },
  });

  // If approved, trigger distribution via Inngest
  if (action === "approve") {
    await inngest.send({
      name: "content/approved",
      data: { queueItemId: updated.id, approvedBy: user.id },
    });
  }

  return NextResponse.json({ success: true, item: updated });
}
