// @version 0.7.0 - Compass: application submitted → classify + email pipeline
// Triggered when a host/facilitator application is submitted from /apply form.
// Runs: classify intent → send welcome email → update application notes.

import { inngest } from "@/lib/inngest";
import { db } from "@/lib/db";
import { processOnboarding } from "@/services/onboarding";
import { sendPushNotification } from "@/services/notifications";
import { saveFailedJob } from "../services/deadLetter";

// ESCAPE: Inngest v4 inferred type not portable without Fetch reference
export const applicationSubmittedPipeline: ReturnType<
  typeof inngest.createFunction
> = inngest.createFunction(
  {
    id: "application-submitted-pipeline",
    name: "Application Submitted \u2014 Classify + Email",
    retries: 3,
    triggers: [{ event: "application/submitted" }],
    // ESCAPE: Inngest v4 onFailure type is any
    onFailure: async (ctx: any) => {
      await saveFailedJob({
        functionId: "application-submitted-pipeline",
        eventName: ctx.event?.name ?? "application/submitted",
        payload: (ctx.event?.data as Record<string, unknown>) ?? {},
        error: ctx.error?.message ?? "Unknown error",
        attempts: ctx.attempt ?? 3,
      });
    },
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

    // Step 3: Send welcome push notification (v1.5.0 Chorus)
    await step.run("send-welcome-notification", async () => {
      await sendPushNotification({
        userId,
        type: "welcome",
        title: "Welcome to The Feast \uD83C\uDF7D",
        body: "Your application is received. We'll be in touch soon.",
        data: { screen: "Home" },
      }).catch(() => {}); // silent — notification is non-critical
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
