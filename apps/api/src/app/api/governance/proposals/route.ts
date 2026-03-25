// @version 2.0.0 - Pantheon: Governance proposals (founding_table only)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { applyRateLimit } from "@/lib/rateLimit";

const CreateProposalSchema = z.object({
  title: z.string().min(5).max(200),
  body: z.string().min(20).max(5000),
  category: z
    .enum(["general", "policy", "financial", "membership"])
    .default("general"),
  closesAt: z.string().refine((s) => new Date(s) > new Date(), {
    message: "closesAt must be a future date",
  }),
});

async function requireFoundingTable(req: NextRequest) {
  const limited = await applyRateLimit(req, "standard");
  if (limited) return { error: limited };

  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      ),
    };
  }

  const tier = (sessionClaims?.publicMetadata as { tier?: string })?.tier;
  if (tier !== "founding_table") {
    return {
      error: NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 }
      ),
    };
  }

  const user = await db.user.findUnique({ where: { clerkId: userId } });
  if (!user) {
    return {
      error: NextResponse.json(
        { error: "User not found", code: "NOT_FOUND" },
        { status: 404 }
      ),
    };
  }

  return { user };
}

export async function GET(req: NextRequest) {
  const result = await requireFoundingTable(req);
  if ("error" in result && result.error instanceof NextResponse) {
    return result.error;
  }
  const { user } = result as { user: { id: string } };

  const proposals = await db.governanceProposal.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { name: true } },
      votes: { select: { userId: true, vote: true } },
    },
  });

  const data = proposals.map((p: any) => {
    const userVote = p.votes.find((v: any) => v.userId === user.id);
    return {
      id: p.id,
      title: p.title,
      body: p.body,
      category: p.category,
      status: p.status,
      authorName: p.author?.name ?? "Unknown",
      votesFor: p.votesFor,
      votesAgainst: p.votesAgainst,
      abstentions: p.votes.filter((v: any) => v.vote === "abstain").length,
      quorum: p.quorum,
      totalVotes: p.votes.length,
      closesAt: p.closesAt.toISOString(),
      createdAt: p.createdAt.toISOString(),
      userVote: userVote?.vote ?? null,
    };
  });

  return NextResponse.json({ success: true, data });
}

export async function POST(req: NextRequest) {
  const result = await requireFoundingTable(req);
  if ("error" in result && result.error instanceof NextResponse) {
    return result.error;
  }
  const { user } = result as { user: { id: string } };

  const body = await req.json();
  const parsed = CreateProposalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: parsed.error.issues,
      },
      { status: 400 }
    );
  }

  const proposal = await db.governanceProposal.create({
    data: {
      authorId: user.id,
      title: parsed.data.title,
      body: parsed.data.body,
      category: parsed.data.category,
      closesAt: new Date(parsed.data.closesAt),
    },
  });

  return NextResponse.json(
    { success: true, proposalId: proposal.id },
    { status: 201 }
  );
}
