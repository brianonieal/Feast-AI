// @version 2.0.0 - Pantheon: White-label org config storage
// Foundation only — full theming is v2.2.0 scope
// GET: any authenticated user (orgs read own config on app load)
// POST: founding_table only (create/update org config)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { applyRateLimit } from "@/lib/rateLimit";

const WhiteLabelSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  name: z.string().min(2).max(100),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  logoUrl: z.string().url().optional(),
  domain: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, "standard");
  if (limited) return limited;

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  // Return first active org config (single-tenant for now)
  const org = await db.whiteLabelOrg.findFirst({
    where: { isActive: true },
  });

  return NextResponse.json({ success: true, org: org ?? null });
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

  const body = await req.json();
  const parsed = WhiteLabelSchema.safeParse(body);
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

  const org = await db.whiteLabelOrg.upsert({
    where: { slug: parsed.data.slug },
    update: {
      name: parsed.data.name,
      primaryColor: parsed.data.primaryColor,
      logoUrl: parsed.data.logoUrl,
      domain: parsed.data.domain,
    },
    create: {
      slug: parsed.data.slug,
      name: parsed.data.name,
      primaryColor: parsed.data.primaryColor,
      logoUrl: parsed.data.logoUrl,
      domain: parsed.data.domain,
    },
  });

  return NextResponse.json({ success: true, org }, { status: 201 });
}
