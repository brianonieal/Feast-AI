// @version 1.0.1 - Onboarding orchestration (HubSpot stub removed)
// Runs the full flow: classify → save intent → update regional interest → send email

import { db } from "../lib/db";
import { classifyMemberIntent } from "../council/sage/classifyOnboarding";
import { sendWelcomeEmail } from "../integrations/resend/adapter";
import type { ClassificationResult } from "@feast-ai/shared";

interface OnboardingInput {
  userId?: string;
  email: string;
  name: string;
  city?: string;
  message: string;
  source?: string;
}

interface OnboardingResult {
  classification: ClassificationResult;
  memberIntentId: string;
  emailSent: boolean;
}

export async function processOnboarding(
  input: OnboardingInput
): Promise<OnboardingResult> {
  const { userId, email, name, city, message, source = "web" } = input;

  // Step 1: Classify intent via @SAGE
  const classification = await classifyMemberIntent({
    message,
    city,
    context: source,
  });

  // Step 2: Save MemberIntent to DB
  const memberIntent = await db.memberIntent.create({
    data: {
      userId: userId ?? null,
      email,
      name,
      city: city ?? null,
      // ESCAPE: Prisma enum requires uppercase, shared type uses lowercase
      intent: classification.intent.toUpperCase() as any,
      confidence: classification.confidence,
      rawInput: message,
      source,
    },
  });

  // Step 3: Update regional interest count
  if (city) {
    const normalizedCity = city.trim().toLowerCase();
    await db.regionalInterest.upsert({
      where: { city: normalizedCity },
      update: { count: { increment: 1 } },
      create: { city: normalizedCity, count: 1 },
    });
  }

  // Step 4: Send welcome email via Resend
  const emailResult = await sendWelcomeEmail({
    to: email,
    template: classification.suggestedPath.emailTemplate,
    variables: { name, city },
  });

  // Step 5: Update MemberIntent with email status
  await db.memberIntent.update({
    where: { id: memberIntent.id },
    data: {
      emailSent: emailResult.success,
      emailSentAt: emailResult.success ? new Date() : null,
    },
  });

  return {
    classification,
    memberIntentId: memberIntent.id,
    emailSent: emailResult.success,
  };
}
