// @version 1.3.0 - Nexus: spawn event from template
// POST /api/events/templates/[id]/spawn — create a FeastEvent from a template

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { applyRateLimit } from "@/lib/rateLimit";
import { db } from "@/lib/db";
import { spawnEventFromTemplate } from "@/services/eventTemplates";

const SpawnSchema = z.object({
  scheduledAt: z.string(),
  overrides: z
    .object({
      name: z.string().max(100).optional(),
      description: z.string().max(500).optional(),
      maxSeats: z.coerce.number().min(2).max(50).optional(),
    })
    .optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id: templateId } = await params;

  // Verify template exists and belongs to user
  const template = await db.eventTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    return NextResponse.json(
      { error: "Template not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  if (template.creatorId !== user.id) {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const parsed = SpawnSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Validate date is in the future
  const date = new Date(parsed.data.scheduledAt);
  if (isNaN(date.getTime()) || date <= new Date()) {
    return NextResponse.json(
      { error: "Date must be a valid future date", code: "INVALID_DATE" },
      { status: 400 }
    );
  }

  const event = await spawnEventFromTemplate({
    templateId,
    hostId: user.id,
    date,
    overrides: parsed.data.overrides,
  });

  return NextResponse.json({ success: true, data: event }, { status: 201 });
}
