// @version 0.7.0 - Compass: member onboarding intent classification
// Standalone classification — separate from SMS classify.ts (v0.3.0)
// Called from /api/onboarding/classify route and Inngest pipeline

import Anthropic from "@anthropic-ai/sdk";
import type {
  ClassificationResult,
  MemberIntentType,
} from "@feast-ai/shared";
import { ONBOARDING_PATHS } from "@feast-ai/shared";

const client = new Anthropic();

export async function classifyMemberIntent(params: {
  message: string;
  city?: string;
  context?: string;
}): Promise<ClassificationResult> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6-20250514",
    max_tokens: 256,
    system: `You classify new member intent for The Feast community platform.
Return ONLY valid JSON matching this schema:
{ "intent": "attend"|"host"|"facilitate"|"diy"|"newsletter", "confidence": 0-1, "reasoning": "string" }

Intent definitions:
- attend: wants to experience a dinner as guest
- host: wants to host dinners in their home or space
- facilitate: wants to guide conversations at dinners
- diy: wants to run their own independent gatherings
- newsletter: unclear or just wants to stay connected

If confidence < 0.6, use "newsletter".
Return ONLY the JSON object. No other text.`,
    messages: [
      {
        role: "user",
        content: `Classify this member:
Message: "${params.message}"
City: ${params.city ?? "not provided"}
Context: ${params.context ?? "web form"}`,
      },
    ],
  });

  const block = response.content[0];
  const raw = block && block.type === "text" ? block.text : "{}";

  // Strip markdown code fences if model wraps output
  const cleaned = raw
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as {
      intent?: string;
      confidence?: number;
      reasoning?: string;
    };

    // Validate intent is a known type
    const validIntents: MemberIntentType[] = [
      "attend",
      "host",
      "facilitate",
      "diy",
      "newsletter",
    ];
    const intent: MemberIntentType = validIntents.includes(
      parsed.intent as MemberIntentType
    )
      ? (parsed.intent as MemberIntentType)
      : "newsletter";

    // Clamp confidence to 0-1 range
    const confidence = Math.min(1, Math.max(0, parsed.confidence ?? 0.5));

    return {
      intent,
      confidence,
      reasoning: parsed.reasoning,
      suggestedPath: ONBOARDING_PATHS[intent],
    };
  } catch {
    // Fallback to newsletter on parse failure
    return {
      intent: "newsletter",
      confidence: 0.5,
      reasoning: "Classification parse failed — defaulting to newsletter",
      suggestedPath: ONBOARDING_PATHS["newsletter"],
    };
  }
}
