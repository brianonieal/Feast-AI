// @version 0.3.0 - Signal: inbound message schemas
import { z } from "zod";

export const MessageChannelSchema = z.enum(["SMS", "WHATSAPP", "EMAIL", "WEB"]);

export const MessageIntentSchema = z.enum([
  "CREATE_EVENT",
  "ATTEND_EVENT",
  "BECOME_HOST",
  "BECOME_FACILITATOR",
  "DIY_INTEREST",
  "ASK_QUESTION",
  "SUBMIT_REFLECTION",
  "UNKNOWN",
]);

export const IntentClassificationSchema = z.object({
  intent: MessageIntentSchema,
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

export const InboundMessageSchema = z.object({
  id: z.string().cuid(),
  from: z.string().min(1),
  body: z.string().min(1),
  channel: MessageChannelSchema,
  intent: MessageIntentSchema.nullable(),
  confidence: z.number().nullable(),
  processed: z.boolean(),
  response: z.string().nullable(),
  userId: z.string().cuid().nullable(),
  createdAt: z.coerce.date(),
});

/** Schema for Twilio webhook payload */
export const TwilioWebhookSchema = z.object({
  From: z.string().min(1),
  Body: z.string().min(1),
  To: z.string().min(1),
  MessageSid: z.string().min(1),
  AccountSid: z.string().min(1),
  NumMedia: z.string().optional(),
});
