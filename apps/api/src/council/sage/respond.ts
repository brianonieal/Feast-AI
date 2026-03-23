// @version 0.3.0 - Signal: @SAGE conversational response
import Anthropic from "@anthropic-ai/sdk";
import { SAGE_SYSTEM_PROMPT } from "./prompt";
import type { IntentClassification } from "@feast-ai/shared";

const client = new Anthropic();

interface SageResponseInput {
  message: string;
  intent: IntentClassification;
  senderPhone: string;
  senderName?: string;
}

/**
 * Generate a conversational response from @SAGE based on the classified intent.
 * In v0.3.0, this handles basic conversational intake. Tool use (search_events, etc.)
 * will be added in later versions as those features come online.
 */
export async function generateSageResponse(
  input: SageResponseInput
): Promise<string> {
  const contextMessage = `The sender's phone is ${input.senderPhone}.${
    input.senderName ? ` Their name is ${input.senderName}.` : ""
  }
Their message was classified as: ${input.intent.intent} (confidence: ${input.intent.confidence}).
Reasoning: ${input.intent.reasoning}

Respond appropriately based on their intent:
- CREATE_EVENT: Acknowledge their interest in hosting, ask for event details (date, location, capacity, open/closed).
- ATTEND_EVENT: Let them know you'd love to help them find a dinner, ask for their city.
- BECOME_HOST: Express excitement, explain briefly what hosting involves, ask about their city and availability.
- BECOME_FACILITATOR: Explain the facilitator role, ask about their experience and interest.
- DIY_INTEREST: Let them know the DIY toolkit is coming soon, offer to add them to the waitlist.
- ASK_QUESTION: Answer helpfully using what you know about The Feast, or offer to connect them with someone.
- SUBMIT_REFLECTION: Thank them warmly for sharing, acknowledge the value of their reflection.
- UNKNOWN: Warmly greet them and ask how you can help them with The Feast.

Keep your response concise (2-4 sentences) since this will be sent via SMS.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6-20250514",
    max_tokens: 300,
    system: SAGE_SYSTEM_PROMPT,
    messages: [
      { role: "user", content: `${contextMessage}\n\nOriginal message: "${input.message}"` },
    ],
  });

  const text = response.content[0];
  if (!text || text.type !== "text") {
    return "Thanks for reaching out to The Feast! How can I help you today?";
  }

  return text.text;
}
