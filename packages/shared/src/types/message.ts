// @version 0.3.0 - Signal: inbound message types

/** Channel through which a message was received */
export type MessageChannel = "SMS" | "WHATSAPP" | "EMAIL" | "WEB";

/** Classified intent of an inbound message */
export type MessageIntent =
  | "CREATE_EVENT"
  | "ATTEND_EVENT"
  | "BECOME_HOST"
  | "BECOME_FACILITATOR"
  | "DIY_INTEREST"
  | "ASK_QUESTION"
  | "SUBMIT_REFLECTION"
  | "UNKNOWN";

/** Inbound message record */
export interface InboundMessage {
  id: string;
  from: string;
  body: string;
  channel: MessageChannel;
  intent: MessageIntent | null;
  confidence: number | null;
  processed: boolean;
  response: string | null;
  userId: string | null;
  createdAt: Date;
}

/** Result of intent classification */
export interface IntentClassification {
  intent: MessageIntent;
  confidence: number;
  reasoning: string;
}
