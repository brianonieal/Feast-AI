// @version 2.0.0 - Pantheon
// Confidence threshold gate for autonomous agent actions
// Controls when @SAGE acts autonomously vs escalates to human

import { db } from "./db";
import { sendPushNotification } from "../services/notifications";

export const CONFIDENCE_THRESHOLDS = {
  AUTO_DRAFT: 0.8, // >= 0.80: auto-draft, send push to confirm
  REVIEW: 0.5, // 0.50-0.79: send to approval queue
  ESCALATE: 0.5, // < 0.50: escalate to human reviewer
} as const;

export type ConfidenceAction = "auto_draft" | "sent_to_review" | "escalated";

export function getConfidenceAction(confidence: number): ConfidenceAction {
  if (confidence >= CONFIDENCE_THRESHOLDS.AUTO_DRAFT) return "auto_draft";
  if (confidence >= CONFIDENCE_THRESHOLDS.REVIEW) return "sent_to_review";
  return "escalated";
}

export async function logConfidenceDecision(params: {
  inboundMessageId?: string;
  intent: string;
  confidence: number;
  action: ConfidenceAction;
  escalatedTo?: string;
}): Promise<void> {
  try {
    await db.confidenceLog.create({
      data: {
        inboundMessageId: params.inboundMessageId,
        intent: params.intent,
        confidence: params.confidence,
        action: params.action,
        escalatedTo: params.escalatedTo,
      },
    });
  } catch (err) {
    // Never crash the SMS pipeline for a logging failure
    console.error("[ConfidenceGate] Failed to log decision:", err);
  }
}

// Send "one tap confirm" push notification for semi-autonomous actions
export async function sendAutoDraftConfirmation(params: {
  userId: string;
  eventId: string;
  eventName: string;
  confidence: number;
}): Promise<void> {
  await sendPushNotification({
    userId: params.userId,
    type: "event_reminder", // reuse existing type for now
    title: "@SAGE drafted your event ✨",
    body: `"${params.eventName}" is ready. Tap to review and publish.`,
    data: {
      screen: "EventConfirm",
      eventId: params.eventId,
      confidence: params.confidence,
      action: "confirm_auto_draft",
    },
  }).catch((err) => {
    console.error("[ConfidenceGate] Push notification failed:", err);
  });
}
