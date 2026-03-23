// @version 0.3.0 - Signal: intent classification using Anthropic Claude
import Anthropic from "@anthropic-ai/sdk";
import { IntentClassificationSchema } from "@feast-ai/shared";
import type { IntentClassification } from "@feast-ai/shared";

const client = new Anthropic();

const CLASSIFY_SYSTEM_PROMPT = `You are an intent classifier for The Feast, a community dinner organization.
Given a message from someone, classify their intent into one of these categories:

- CREATE_EVENT: They want to host or create a dinner event
- ATTEND_EVENT: They want to find or attend a dinner
- BECOME_HOST: They want to become a host for The Feast
- BECOME_FACILITATOR: They want to become a facilitator
- DIY_INTEREST: They want to run their own gathering using Feast methodology
- ASK_QUESTION: They have a general question about The Feast
- SUBMIT_REFLECTION: They are sharing thoughts/reflections about a dinner they attended
- UNKNOWN: The message doesn't fit any category

Respond with ONLY a JSON object: { "intent": "...", "confidence": 0.0-1.0, "reasoning": "..." }
Do not include any other text.`;

export async function classifyIntent(
  message: string,
  context?: string
): Promise<IntentClassification> {
  const userMessage = context
    ? `Context: ${context}\n\nMessage: ${message}`
    : `Message: ${message}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6-20250514",
    max_tokens: 256,
    system: CLASSIFY_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content[0];
  if (!text || text.type !== "text") {
    return { intent: "UNKNOWN", confidence: 0, reasoning: "No text response from model" };
  }

  try {
    const parsed = JSON.parse(text.text) as unknown;
    return IntentClassificationSchema.parse(parsed);
  } catch {
    return { intent: "UNKNOWN", confidence: 0, reasoning: "Failed to parse classification response" };
  }
}
