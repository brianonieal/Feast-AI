// @version 1.2.0 - Prism: semantic search across all embedded content
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { applyRateLimit } from "@/lib/rateLimit";
import { semanticSearch } from "@/lib/embeddings";

const SearchSchema = z.object({
  q: z.string().min(2).max(200),
  type: z
    .enum(["reflection", "article", "event", "member_intent"])
    .optional(),
  limit: z.coerce.number().min(1).max(20).default(5),
});

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, "ai");
  if (limited) return limited;

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = SearchSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request",
        code: "VALIDATION_ERROR",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const results = await semanticSearch({
    query: parsed.data.q,
    sourceType: parsed.data.type,
    limit: parsed.data.limit,
  });

  return NextResponse.json({
    success: true,
    results,
    count: results.length,
  });
}
