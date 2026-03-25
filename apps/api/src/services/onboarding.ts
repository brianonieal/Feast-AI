// @version 1.2.0 - Prism: RAG context + auto-embed on classification
// Runs the full flow: classify → RAG lookup → save intent → embed → regional interest → send email

import { db } from "../lib/db";
import { inngest } from "../lib/inngest";
import { classifyMemberIntent } from "../council/sage/classifyOnboarding";
import { findSimilarIntents } from "../council/analyst";
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

  // Step 1.5: RAG context (light touch — logged, not yet influencing classification)
  // Full RAG integration into the classification prompt is v1.3.0 Nexus
  const similarIntents = await findSimilarIntents(message).catch(() => []);
  if (similarIntents.length > 0) {
    console.log(
      `[@SAGE RAG] ${similarIntents.length} similar past intent(s) found ` +
        `for classification: ${classification.intent}`
    );
  }

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

  // Step 2.5: Embed the intent for future RAG searches
  // Closes the loop: new intent → classified → saved → embedded
  await inngest
    .send({
      name: "content/embed",
      data: {
        sourceType: "member_intent",
        sourceId: memberIntent.id,
      },
    })
    .catch(() => {}); // silent — embedding is non-critical

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
