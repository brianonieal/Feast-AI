// @version 0.7.0 - Compass: onboarding intent classification
// Called from web onboarding flow — NO auth required (pre-signup visitors)
// Rate limited to prevent abuse of Claude API calls

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { applyRateLimit } from "@/lib/rateLimit";
import { processOnboarding } from "@/services/onboarding";

const ClassifySchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  city: z.string().optional(),
  message: z.string().min(1).max(1000),
  source: z.enum(["web", "sms", "apply_form"]).optional(),
});

/** POST /api/onboarding/classify — classify a new member's intent */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // Rate limit first — unauthenticated route hitting Claude API
  const limited = await applyRateLimit(req, "ai");
  if (limited) return limited;

  const body = (await req.json()) as unknown;
  const parsed = ClassifySchema.safeParse(body);
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

  const result = await processOnboarding({
    email: parsed.data.email,
    name: parsed.data.name,
    city: parsed.data.city,
    message: parsed.data.message,
    source: parsed.data.source ?? "web",
  });

  return NextResponse.json({
    success: true,
    intent: result.classification.intent,
    confidence: result.classification.confidence,
    nextStep: result.classification.suggestedPath.nextStep,
    emailSent: result.emailSent,
  });
}
