// @version 1.3.0 - Nexus: event template CRUD
// GET  /api/events/templates — list templates for current user
// POST /api/events/templates — create a new template

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { applyRateLimit } from "@/lib/rateLimit";
import {
  createTemplate,
  getTemplatesByUser,
} from "@/services/eventTemplates";

const CreateTemplateSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  city: z.string().min(2).max(100),
  maxSeats: z.coerce.number().min(2).max(50).default(12),
  communityTier: z
    .enum(["commons", "kitchen", "founding_table"])
    .default("commons"),
  cadence: z
    .enum(["weekly", "biweekly", "monthly", "custom"])
    .default("monthly"),
});

export async function GET(req: NextRequest) {
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

  const templates = await getTemplatesByUser(user.id);

  return NextResponse.json({ success: true, data: templates });
}

export async function POST(req: NextRequest) {
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

  const body = await req.json();
  const parsed = CreateTemplateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const template = await createTemplate({
    creatorId: user.id,
    ...parsed.data,
  });

  return NextResponse.json({ success: true, data: template }, { status: 201 });
}
