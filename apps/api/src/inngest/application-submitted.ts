// @version 0.7.0 - Compass: application submitted → classify + email pipeline
// Triggered when a host/facilitator application is submitted from /apply form.
// Runs: classify intent → send welcome email → update application notes.

import { inngest } from "@/lib/inngest";
import { db } from "@/lib/db";
import { processOnboarding } from "@/services/onboarding";

// ESCAPE: Inngest v4 inferred type not portable without Fetch reference
export const applicationSubmittedPipeline: ReturnType<
  typeof inngest.createFunction
> = inngest.createFunction(
  {
    id: "application-submitted-pipeline",
    name: "Application Submitted \u2014 Classify + Email",
    retries: 3,
    triggers: [{ event: "application/submitted" }],
  },
  async ({
    event,
    step,
  }: {
    event: {
      data: {
        applicationId: string;
        userId: string;
        email: string;
        role: string;
        name: string;
        city: string;
        motivation?: string;
      };
    };
    step: {
      run: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
    };
  }) => {
    const { applicationId, userId, email, role, name, city, motivation } =
      event.data;

    // Step 1: Run full onboarding flow (classify → save intent → email)
    const result = await step.run("process-onboarding", async () => {
      const message =
        `I want to become a ${role} for The Feast. ${motivation ?? ""}`.trim();
      return processOnboarding({
        userId,
        email,
        name,
        city,
        message,
        source: "apply_form",
      });
    });

    // Step 2: Update application with classification result
    await step.run("update-application", async () => {
      return db.application.update({
        where: { id: applicationId },
        data: {
          notes: `Classified as: ${result.classification.intent} (confidence: ${result.classification.confidence.toFixed(2)})`,
        },
      });
    });

    return {
      applicationId,
      intent: result.classification.intent,
      confidence: result.classification.confidence,
      emailSent: result.emailSent,
      memberIntentId: result.memberIntentId,
    };
  }
);
