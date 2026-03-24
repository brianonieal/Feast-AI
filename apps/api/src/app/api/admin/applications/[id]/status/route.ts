// @version 0.9.0 - Lens: admin application status update
// PATCH /api/admin/applications/[id]/status — approve or reject an application

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { applyRateLimit } from "@/lib/rateLimit";

const ActionSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await applyRateLimit(req, "standard");
  if (limited) return limited;

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const { id } = await params;

  const body = (await req.json()) as unknown;
  const parsed = ActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid action", code: "VALIDATION_ERROR", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const application = await db.application.findUnique({ where: { id } });
  if (!application) {
    return NextResponse.json(
      { error: "Application not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  if (application.status !== "PENDING") {
    return NextResponse.json(
      {
        error: `Application already ${application.status.toLowerCase()}`,
        code: "ALREADY_PROCESSED",
      },
      { status: 409 }
    );
  }

  const updated = await db.application.update({
    where: { id },
    data: {
      status: parsed.data.action === "approve" ? "APPROVED" : "REJECTED",
      reviewedBy: userId,
      reviewedAt: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    data: { id: updated.id, status: updated.status },
  });
}
