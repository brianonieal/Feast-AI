// @version 0.7.0 - Compass: host/facilitator application submission
// Receives from /apply frontend form. Saves to DB, triggers Inngest pipeline.
// Rate limited → auth → validate → save → trigger pipeline

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { inngest } from "@/lib/inngest";
import { applyRateLimit } from "@/lib/rateLimit";

const ApplicationSchema = z.object({
  role: z.enum(["host", "facilitator"]),
  name: z.string().min(2).max(100),
  city: z.string().min(2).max(100),
  isOrganizer: z.string().optional(),
  motivation: z.string().optional(),
});

/** POST /api/applications — submit a host/facilitator application */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // Rate limit first — before auth or body parsing
  const limited = await applyRateLimit(req, "standard");
  if (limited) return limited;

  let user;
  try {
    user = await requireAuth();
  } catch {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const body = (await req.json()) as unknown;
  const parsed = ApplicationSchema.safeParse(body);
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

  // Convert lowercase role to Prisma enum (uppercase)
  const prismaRole = parsed.data.role.toUpperCase() as "HOST" | "FACILITATOR";

  // Check for duplicate pending application
  const existing = await db.application.findFirst({
    where: { userId: user.id, role: prismaRole, status: "PENDING" },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Application already pending", code: "DUPLICATE_APPLICATION" },
      { status: 409 }
    );
  }

  // Save application
  const application = await db.application.create({
    data: {
      userId: user.id,
      role: prismaRole,
      name: parsed.data.name,
      city: parsed.data.city,
      isOrganizer: parsed.data.isOrganizer,
      motivation: parsed.data.motivation,
    },
  });

  // Trigger Inngest pipeline — if Inngest fails, application is still saved
  let pipelineQueued = true;
  try {
    await inngest.send({
      name: "application/submitted",
      data: {
        applicationId: application.id,
        userId: user.id,
        email: user.email,
        role: parsed.data.role,
        name: parsed.data.name,
        city: parsed.data.city,
        motivation: parsed.data.motivation,
      },
    });
  } catch (err) {
    console.error("[applications] Inngest send failed:", err);
    pipelineQueued = false;
  }

  if (!pipelineQueued) {
    return NextResponse.json(
      {
        success: true,
        applicationId: application.id,
        pipelineQueued: false,
        warning: "Application saved but pipeline not queued",
      },
      { status: 201 }
    );
  }

  return NextResponse.json(
    { success: true, applicationId: application.id, pipelineQueued: true },
    { status: 201 }
  );
}
