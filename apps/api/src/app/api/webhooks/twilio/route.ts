// @version 0.3.0 - Signal: Twilio SMS/WhatsApp webhook handler
// @version 2.0.0 - Pantheon: confidence gate for autonomous SMS
import { NextRequest, NextResponse } from "next/server";
import { TwilioWebhookSchema } from "@feast-ai/shared";
import type { MessageChannel, MessageIntent } from "@feast-ai/shared";
import { db } from "@/lib/db";
import { verifyTwilioWebhook, sendSms } from "@/lib/twilio";
import { classifyIntent, generateSageResponse } from "@/council/sage";
import {
  getConfidenceAction,
  logConfidenceDecision,
  sendAutoDraftConfirmation,
} from "@/lib/confidenceGate";
import { inngest } from "@/lib/inngest";

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Parse form-encoded body from Twilio
  const formData = await req.formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = value.toString();
  });

  // Verify Twilio signature
  const signature = req.headers.get("x-twilio-signature") ?? "";
  const webhookUrl = process.env.TWILIO_WEBHOOK_URL ?? req.url;

  if (!verifyTwilioWebhook(signature, webhookUrl, params)) {
    return NextResponse.json(
      { error: "Invalid Twilio signature", code: "WEBHOOK_VERIFY_ERROR" },
      { status: 403 }
    );
  }

  // Validate payload
  const parsed = TwilioWebhookSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid webhook payload", code: "VALIDATION_ERROR", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { From: from, Body: body } = parsed.data;

  // Determine channel (WhatsApp numbers start with "whatsapp:")
  const channel: MessageChannel = from.startsWith("whatsapp:") ? "WHATSAPP" : "SMS";
  const cleanPhone = from.replace("whatsapp:", "");

  // Look up user by phone number
  const existingUser = await db.user.findFirst({
    where: { phone: cleanPhone, deletedAt: null },
  });

  // Classify intent + generate @SAGE response — graceful degradation on failure
  let sageResponse =
    "Thank you for reaching out to The Feast. We'll be in touch soon.";
  let intent: { intent: MessageIntent; confidence: number; reasoning: string } = {
    intent: "UNKNOWN" as MessageIntent,
    confidence: 0,
    reasoning: "@SAGE unavailable — graceful fallback",
  };

  try {
    intent = await classifyIntent(body, existingUser?.name ?? undefined);
    sageResponse = await generateSageResponse({
      message: body,
      intent,
      senderPhone: cleanPhone,
      senderName: existingUser?.name ?? undefined,
    });
  } catch (err) {
    console.error(
      "[Twilio webhook] @SAGE failed:",
      err instanceof Error ? err.message : err
    );
    // Graceful degradation — default response used, intent logged as newsletter/0
  }

  // @version 2.0.0 - Pantheon: confidence gate (CREATE_EVENT only)
  if (intent.intent === "CREATE_EVENT" && existingUser) {
    const action = getConfidenceAction(intent.confidence);

    await logConfidenceDecision({
      intent: intent.intent,
      confidence: intent.confidence,
      action,
    });

    if (action === "auto_draft") {
      // High confidence — auto-draft the event via Inngest
      await inngest
        .send({
          name: "event/auto-draft",
          data: {
            userId: existingUser.id,
            message: body,
            confidence: intent.confidence,
          },
        })
        .catch(() => {});

      await sendAutoDraftConfirmation({
        userId: existingUser.id,
        eventId: "pending",
        eventName: "your dinner",
        confidence: intent.confidence,
      });

      // Log inbound + return early
      await db.inboundMessage.create({
        data: {
          from: cleanPhone,
          body,
          channel,
          intent: intent.intent,
          confidence: intent.confidence,
          userId: existingUser.id,
        },
      });

      const twiml =
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Got it! I\'ve drafted your event. Check your phone to review and publish with one tap. 🍽</Message></Response>';
      return new NextResponse(twiml, {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    if (action === "escalated") {
      // Low confidence — ask for clarification
      await db.inboundMessage.create({
        data: {
          from: cleanPhone,
          body,
          channel,
          intent: intent.intent,
          confidence: intent.confidence,
          userId: existingUser.id,
        },
      });

      const twiml =
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message>I want to make sure I understand. Could you tell me a bit more about what you\'re planning? For example: "Host a dinner next Saturday in Brooklyn for 10 people."</Message></Response>';
      return new NextResponse(twiml, {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Medium confidence (sent_to_review) — falls through to existing flow
  }

  // Log inbound message (always, even if @SAGE failed)
  const message = await db.inboundMessage.create({
    data: {
      from: cleanPhone,
      body,
      channel,
      intent: intent.intent,
      confidence: intent.confidence,
      userId: existingUser?.id ?? null,
    },
  });

  // Mark message as processed with response
  await db.inboundMessage.update({
    where: { id: message.id },
    data: { processed: true, response: sageResponse },
  });

  // Send reply via SMS/WhatsApp
  try {
    await sendSms(from, sageResponse);
  } catch (err: unknown) {
    // Log but don't fail the webhook — message is already saved
    console.error("Failed to send SMS reply:", err instanceof Error ? err.message : err);
  }

  // Return TwiML empty response (Twilio expects XML or empty 200)
  return new NextResponse(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    }
  );
}
