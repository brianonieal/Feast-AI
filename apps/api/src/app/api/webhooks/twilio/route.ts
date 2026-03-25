// @version 0.3.0 - Signal: Twilio SMS/WhatsApp webhook handler
import { NextRequest, NextResponse } from "next/server";
import { TwilioWebhookSchema } from "@feast-ai/shared";
import type { MessageChannel, MessageIntent } from "@feast-ai/shared";
import { db } from "@/lib/db";
import { verifyTwilioWebhook, sendSms } from "@/lib/twilio";
import { classifyIntent, generateSageResponse } from "@/council/sage";

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
