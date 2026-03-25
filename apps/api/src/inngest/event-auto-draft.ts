// @version 2.0.0 - Pantheon
// Auto-draft pipeline for high-confidence SMS events
// Triggered when @SAGE confidence >= 0.8 on CREATE_EVENT intent

import { inngest } from "@/lib/inngest";
import { db } from "@/lib/db";
import { trackedCall } from "@/lib/costTracker";
import { sendPushNotification } from "@/services/notifications";
import { saveFailedJob } from "../services/deadLetter";

function getNextSaturday(): Date {
  const d = new Date();
  const day = d.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntilSaturday);
  d.setHours(19, 0, 0, 0);
  return d;
}

// ESCAPE: Inngest v4 inferred type not portable without Fetch reference
export const eventAutoDraftFunction: ReturnType<
  typeof inngest.createFunction
> = inngest.createFunction(
  {
    id: "event-auto-draft",
    name: "Event Auto-Draft — @SAGE Autonomous",
    retries: 2,
    // ESCAPE: Inngest v4 onFailure type
    onFailure: async (ctx: any) => {
      await saveFailedJob({
        functionId: "event-auto-draft",
        eventName: "event/auto-draft",
        payload: ctx.event?.data ?? {},
        error: ctx.error?.message ?? "Unknown",
        attempts: ctx.attempt ?? 1,
      });
    },
    triggers: [{ event: "event/auto-draft" }],
  },
  async ({ event, step }: any) => {
    const { userId, message, confidence } = event.data as {
      userId: string;
      message: string;
      confidence: number;
    };

    // Step 1: Parse event details from message using Claude
    const parsed = await step.run("parse-event-details", async () => {
      const response = await trackedCall({
        agent: "@SAGE",
        model: "claude-sonnet-4-6",
        action: "parse_event_from_sms",
        system: `Extract event details from this SMS message.
Return ONLY valid JSON:
{
  "name": "string",
  "city": "string",
  "date": "ISO date string or null",
  "maxSeats": number,
  "description": "string"
}
If a field is unclear, use a sensible default.
date: default to next Saturday if not specified.
maxSeats: default to 10 if not specified.`,
        messages: [{ role: "user", content: message }],
        maxTokens: 256,
      });

      const firstBlock = response.content?.[0];
      const text =
        firstBlock && firstBlock.type === "text" ? firstBlock.text : "{}";
      try {
        const clean = text
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        return JSON.parse(clean) as {
          name?: string;
          city?: string;
          date?: string;
          maxSeats?: number;
          description?: string;
        };
      } catch {
        return {
          name: "Feast Dinner",
          city: "TBD",
          maxSeats: 10,
          description: message,
        };
      }
    });

    // Step 2: Create draft event
    const eventRecord = await step.run("create-draft-event", async () => {
      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error(`User ${userId} not found`);

      const eventDate = parsed.date
        ? new Date(parsed.date)
        : getNextSaturday();

      return db.feastEvent.create({
        data: {
          hostId: userId,
          name: parsed.name ?? "Feast Dinner",
          description: parsed.description,
          city: parsed.city ?? "TBD",
          location: parsed.city ?? "TBD",
          capacity: parsed.maxSeats ?? 10,
          date: eventDate,
          status: "DRAFT",
          communityTier: "commons",
        },
      });
    });

    // Step 3: Send confirmation push with event ID
    await step.run("send-confirmation-push", async () => {
      await sendPushNotification({
        userId,
        type: "event_reminder",
        title: "🍽 Your event is drafted!",
        body: `"${eventRecord.name}" is ready to review. One tap to publish.`,
        data: {
          screen: "EventConfirm",
          eventId: eventRecord.id,
          confidence,
          action: "confirm_auto_draft",
        },
      }).catch(() => {});
    });

    return {
      eventId: eventRecord.id,
      eventName: eventRecord.name,
      confidence,
      status: "draft",
    };
  }
);
