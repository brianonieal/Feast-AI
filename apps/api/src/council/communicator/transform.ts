// @version 0.5.0 - Echo: content transformation pipeline
import Anthropic from "@anthropic-ai/sdk";
import { ContentPipelineOutputSchema } from "@feast-ai/shared";
import type { ContentPipelineInput, ContentPipelineOutput } from "@feast-ai/shared";
import { COMMUNICATOR_SYSTEM_PROMPT } from "./prompt";

const client = new Anthropic();

const TRANSFORM_PROMPT = `Transform the following dinner materials into content for multiple channels.
Use ONLY the provided source materials. Never fabricate quotes or details.

Respond with ONLY a JSON object:
{
  "article": { "title": "string (compelling, 8-12 words)", "body": "string (500-800 words, narrative, include 2-3 pull quotes from source)" } or null,
  "instagram": { "caption": "string (max 2200 chars, include 5-15 hashtags at the end)" } or null,
  "circleRecap": { "body": "string (200-300 words, casual community tone)" } or null,
  "newsletter": { "subject": "string (max 60 chars)", "preview": "string (max 120 chars)", "body": "string (~200 words)" } or null
}

If there are not enough materials for a channel, set it to null.`;

export async function transformDinnerContent(
  input: ContentPipelineInput
): Promise<ContentPipelineOutput> {
  const sourceMaterial = buildSourceMaterial(input);

  const response = await client.messages.create({
    model: "claude-sonnet-4-6-20250514",
    max_tokens: 4096,
    system: `${COMMUNICATOR_SYSTEM_PROMPT}\n\n${TRANSFORM_PROMPT}`,
    messages: [{ role: "user", content: sourceMaterial }],
  });

  const text = response.content[0];
  if (!text || text.type !== "text") {
    return { article: null, instagram: null, circleRecap: null, newsletter: null };
  }

  try {
    const parsed = JSON.parse(text.text) as unknown;
    return ContentPipelineOutputSchema.parse(parsed);
  } catch {
    return { article: null, instagram: null, circleRecap: null, newsletter: null };
  }
}

function buildSourceMaterial(input: ContentPipelineInput): string {
  const parts: string[] = [
    `Event: ${input.eventName}`,
    `Date: ${input.eventDate}`,
    `Location: ${input.eventLocation}`,
    `Host: ${input.hostName}`,
  ];

  if (input.quotes.length > 0) {
    parts.push("\nQuotes from attendees:");
    for (const q of input.quotes) {
      const attr = q.attribution ? ` — ${q.attribution}` : "";
      parts.push(`  "${q.text}"${attr}`);
    }
  }

  if (input.transcript) {
    parts.push(`\nHost reflection transcript:\n${input.transcript}`);
  }

  if (input.photos.length > 0) {
    parts.push(`\n${input.photos.length} photo(s) were submitted (URLs available for publishing).`);
  }

  return parts.join("\n");
}
