// @version 0.4.0 - Spark: parse event request from natural language
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { COORDINATOR_SYSTEM_PROMPT } from "./prompt";

const client = new Anthropic();

/** Schema for parsed event details extracted from natural language */
export const ParsedEventSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
  date: z.string(),
  location: z.string().min(1),
  city: z.string().min(1),
  capacity: z.number().int().positive(),
  type: z.enum(["OPEN", "CLOSED"]),
  communityTier: z.enum(["commons", "kitchen", "founding_table"]),
  missingFields: z.array(z.string()),
});

export type ParsedEvent = z.infer<typeof ParsedEventSchema>;

const PARSE_PROMPT = `Parse the following event request from a host into structured details.
Extract as many fields as possible. For any field you cannot determine from the message, leave it as the default and add it to missingFields.

Defaults:
- capacity: 12
- type: "OPEN"
- communityTier: "commons"
- description: null

Respond with ONLY a JSON object matching this schema:
{
  "name": "string (generate a good event name if not explicit)",
  "description": "string or null",
  "date": "ISO 8601 datetime string",
  "location": "string (address or venue name)",
  "city": "string (city name)",
  "capacity": number,
  "type": "OPEN" or "CLOSED",
  "communityTier": "commons" or "kitchen" or "founding_table",
  "missingFields": ["list of fields that were not in the original message"]
}`;

export async function parseEventRequest(
  rawMessage: string,
  hostName?: string
): Promise<ParsedEvent> {
  const userContent = hostName
    ? `Host "${hostName}" says: "${rawMessage}"`
    : `Host says: "${rawMessage}"`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6-20250514",
    max_tokens: 512,
    system: `${COORDINATOR_SYSTEM_PROMPT}\n\n${PARSE_PROMPT}`,
    messages: [{ role: "user", content: userContent }],
  });

  const text = response.content[0];
  if (!text || text.type !== "text") {
    throw new Error("No text response from @COORDINATOR");
  }

  const parsed = JSON.parse(text.text) as unknown;
  return ParsedEventSchema.parse(parsed);
}
