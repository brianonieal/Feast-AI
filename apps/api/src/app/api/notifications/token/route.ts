// @version 1.5.0 - Chorus: push token registration
// POST   /api/notifications/token — register Expo push token
// DELETE /api/notifications/token — deactivate token (logout/expiry)

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { applyRateLimit } from "@/lib/rateLimit";
import {
  registerPushToken,
  deactivatePushToken,
} from "@/services/notifications";

const RegisterSchema = z.object({
  token: z.string(),
  platform: z.enum(["ios", "android"]),
});

const DeactivateSchema = z.object({
  token: z.string(),
});

/** POST — register or update push token */
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
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    await registerPushToken(user.id, parsed.data.token, parsed.data.platform);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid token", code: "INVALID_TOKEN" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}

/** DELETE — deactivate push token (idempotent) */
export async function DELETE(req: NextRequest) {
  const limited = await applyRateLimit(req, "standard");
  if (limited) return limited;

  try {
    await requireAuth();
  } catch {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const body = await req.json();
  const parsed = DeactivateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  await deactivatePushToken(parsed.data.token);

  // Always 200 — idempotent, even if token not found
  return NextResponse.json({ success: true });
}
