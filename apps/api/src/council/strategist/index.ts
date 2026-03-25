// @version 1.3.0 - Nexus
// @STRATEGIST — regional growth strategy using RAG + community data
// Uses Claude Opus for high-stakes strategic planning decisions
// Cost: ~$0.01-0.03 per call (3 DB queries + up to 5 embedding calls + 1 Opus call)
// Cached 10 min at API layer

import { trackedCall } from "../../lib/costTracker";
import { semanticSearch } from "../../lib/embeddings";
import { db } from "../../lib/db";

export interface RegionalRecommendation {
  city: string;
  currentInterest: number;
  recommendedAction: string;
  rationale: string;
  suggestedCadence: string;
  priorityScore: number; // 0-10
}

export interface GrowthStrategy {
  generatedAt: Date;
  topOpportunities: RegionalRecommendation[];
  globalInsights: string[];
  nextActions: string[];
}

/**
 * Generate a regional growth strategy using @STRATEGIST (Claude Opus).
 * Combines regional interest data, recent event activity, host pipeline metrics,
 * and RAG-powered member intent analysis to produce actionable recommendations.
 *
 * Estimated cost: ~$0.01-0.03 per call
 * - 3 DB queries (parallel)
 * - Up to 5 Voyage AI embedding calls (one per top city)
 * - 1 Claude Opus call
 */
export async function generateGrowthStrategy(): Promise<GrowthStrategy> {
  const now = new Date();

  // Gather regional data
  const [regionalData, recentEvents, memberIntentCount] = await Promise.all([
    db.regionalInterest.findMany({ orderBy: { count: "desc" }, take: 10 }),
    db.feastEvent.findMany({
      where: { status: { in: ["COMPLETED", "LIVE", "MARKETED"] } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        city: true,
        status: true,
        capacity: true,
        _count: { select: { attendances: true } },
      },
    }),
    db.memberIntent.count({ where: { intent: "HOST" } }),
  ]);

  // Early return for fresh installs with no regional data
  if (regionalData.length === 0) {
    return {
      generatedAt: now,
      topOpportunities: [],
      globalInsights: [
        "No regional data yet — encourage member sign-ups",
      ],
      nextActions: [
        "Launch first event",
        "Invite founding members",
        "Build regional interest",
      ],
    };
  }

  // Use RAG to find patterns in member intents for each top city
  const cityInsights = await Promise.all(
    regionalData.slice(0, 5).map(async (region) => {
      const similar = await semanticSearch({
        query: `host dinner ${region.city} community gathering`,
        sourceType: "member_intent",
        limit: 3,
        threshold: 0.6,
      });
      return {
        city: region.city,
        count: region.count,
        insights: similar.length,
      };
    })
  );

  // Use Claude Opus for strategic planning
  const response = await trackedCall({
    agent: "@STRATEGIST",
    model: "claude-opus-4-6",
    action: "generate_growth_strategy",
    system: `You are @STRATEGIST for The Feast community platform.
Your role is to identify regional growth opportunities and recommend
specific, actionable strategies for expanding the dinner community.

The Feast's mission: bring people together for meaningful dinners
that build community and practice abundance.

Return ONLY valid JSON matching this exact schema:
{
  "topOpportunities": [
    {
      "city": "string",
      "currentInterest": number,
      "recommendedAction": "string (specific, actionable)",
      "rationale": "string (1-2 sentences)",
      "suggestedCadence": "weekly|biweekly|monthly",
      "priorityScore": number (0-10)
    }
  ],
  "globalInsights": ["string", "string", "string"],
  "nextActions": ["string", "string", "string"]
}

Provide exactly 3 topOpportunities, 3 globalInsights, 3 nextActions.
Be specific and data-driven. Reference actual cities from the data.`,
    messages: [
      {
        role: "user" as const,
        content: `Regional interest data:
${regionalData.map((r) => `${r.city}: ${r.count} interested`).join("\n")}

Recent event activity:
${recentEvents.map((e) => `${e.city}: ${e.status} (${e._count.attendances}/${e.capacity} seats)`).join("\n")}

Host applicants: ${memberIntentCount}

City RAG insights (similar member intents found):
${cityInsights.map((c) => `${c.city}: ${c.insights} similar intents in corpus`).join("\n")}

Generate the regional growth strategy.`,
      },
    ],
    maxTokens: 1024,
  });

  const firstBlock = response.content[0];
  const text =
    firstBlock && firstBlock.type === "text" ? firstBlock.text : "{}";

  let parsed: {
    topOpportunities: RegionalRecommendation[];
    globalInsights: string[];
    nextActions: string[];
  };

  try {
    const clean = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    parsed = JSON.parse(clean);
  } catch {
    // Fallback: construct strategy from raw data
    parsed = {
      topOpportunities: regionalData.slice(0, 3).map((r, i) => ({
        city: r.city,
        currentInterest: r.count,
        recommendedAction: `Host a Feast dinner in ${r.city}`,
        rationale: `${r.count} people have expressed interest in this region.`,
        suggestedCadence: "monthly" as const,
        priorityScore: 10 - i * 2,
      })),
      globalInsights: [
        "Growing interest across multiple regions",
        "Host pipeline is building",
        "Community momentum is positive",
      ],
      nextActions: [
        "Activate top regional hosts",
        "Schedule inaugural dinners",
        "Build local facilitator network",
      ],
    };
  }

  return {
    generatedAt: now,
    topOpportunities: parsed.topOpportunities,
    globalInsights: parsed.globalInsights,
    nextActions: parsed.nextActions,
  };
}
