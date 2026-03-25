// @version 1.2.0 - Prism
// @ANALYST — community health analysis using RAG
// Analyzes patterns in reflections, events, and member data
// Uses Voyage AI embeddings for semantic search + Claude for synthesis

import { semanticSearch } from "../../lib/embeddings";
import { db } from "../../lib/db";
import { trackedCall } from "../../lib/costTracker";

export interface CommunityHealthReport {
  date: string;
  totalReflections: number;
  totalEvents: number;
  totalMembers: number;
  topThemes: string[];
  sentimentSummary: string;
  regionalStrengths: Array<{ city: string; count: number }>;
  recommendations: string[];
  generatedAt: Date;
}

/**
 * Generate community health report using RAG.
 * Gathers raw data + semantic search for themes, then uses Claude to synthesize.
 *
 * NOTE: 5 embedding calls + 1 Claude call per report.
 * Cost: ~$0.002 total. Cached at API layer for 5 min.
 */
export async function generateHealthReport(): Promise<CommunityHealthReport> {
  const now = new Date();

  // Gather raw data
  const [reflectionCount, eventCount, memberCount, regionalData] =
    await Promise.all([
      db.reflection.count(),
      db.feastEvent.count({
        where: { status: { in: ["COMPLETED", "LIVE"] } },
      }),
      db.user.count(),
      db.regionalInterest.findMany({
        orderBy: { count: "desc" },
        take: 5,
      }),
    ]);

  // Use semantic search to find common themes in reflections
  const themeQueries = [
    "community connection belonging",
    "personal growth transformation",
    "vulnerability authenticity",
    "abundance sharing generosity",
    "meaningful conversation purpose",
  ];

  const themeResults = await Promise.all(
    themeQueries.map((q) =>
      semanticSearch({
        query: q,
        sourceType: "reflection",
        limit: 3,
        threshold: 0.6,
      })
    )
  );

  const relevantContent = themeResults
    .flat()
    .map((r) => r.content)
    .filter(Boolean)
    .slice(0, 10)
    .join("\n\n---\n\n");

  // Use Claude to synthesize the analysis
  const response = await trackedCall({
    agent: "@ANALYST",
    model: "claude-sonnet-4-6",
    action: "generate_health_report",
    system: `You are @ANALYST for The Feast community platform.
Analyze the provided community data and reflection excerpts.
Return ONLY valid JSON matching this exact schema:
{
  "topThemes": ["string", "string", "string"],
  "sentimentSummary": "string (2-3 sentences)",
  "recommendations": ["string", "string", "string"]
}
Be specific and grounded in the actual content provided.
Never fabricate data not present in the context.`,
    messages: [
      {
        role: "user",
        content: `Community data:
- Total reflections: ${reflectionCount}
- Completed events: ${eventCount}
- Total members: ${memberCount}
- Top regions: ${regionalData.map((r) => `${r.city} (${r.count})`).join(", ")}

Recent reflection excerpts:
${relevantContent || "No reflections yet."}

Generate the community health analysis.`,
      },
    ],
    maxTokens: 512,
  });

  const firstBlock = response.content[0];
  const text =
    firstBlock?.type === "text" ? firstBlock.text : "{}";

  let parsed: {
    topThemes: string[];
    sentimentSummary: string;
    recommendations: string[];
  };
  try {
    const clean = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    parsed = JSON.parse(clean);
  } catch {
    parsed = {
      topThemes: ["Connection", "Abundance", "Community"],
      sentimentSummary: "Community data is being gathered.",
      recommendations: [
        "Host more events",
        "Encourage reflections",
        "Expand regionally",
      ],
    };
  }

  return {
    date: now.toISOString().split("T")[0] ?? "",
    totalReflections: reflectionCount,
    totalEvents: eventCount,
    totalMembers: memberCount,
    topThemes: parsed.topThemes,
    sentimentSummary: parsed.sentimentSummary,
    regionalStrengths: regionalData.map((r) => ({
      city: r.city,
      count: r.count,
    })),
    recommendations: parsed.recommendations,
    generatedAt: now,
  };
}

/**
 * RAG-enhanced intent lookup.
 * Called by @SAGE to find similar past intents for context.
 * Never throws — returns empty array on any failure.
 */
export async function findSimilarIntents(message: string): Promise<string[]> {
  try {
    const results = await semanticSearch({
      query: message,
      sourceType: "member_intent",
      limit: 3,
      threshold: 0.75,
    });
    return results.map((r) => r.content);
  } catch {
    // Never throw — RAG context is supplementary, not critical
    return [];
  }
}
