// @version 2.0.0 - Pantheon: Governance voting (founding_table only)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { applyRateLimit } from "@/lib/rateLimit";

const VoteSchema = z.object({
  vote: z.enum(["for", "against", "abstain"]),
  comment: z.string().max(1000).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await applyRateLimit(req, "standard");
  if (limited) return limited;

  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const tier = (sessionClaims?.publicMetadata as { tier?: string })?.tier;
  if (tier !== "founding_table") {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const user = await db.user.findUnique({ where: { clerkId: userId } });
  if (!user) {
    return NextResponse.json(
      { error: "User not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  const { id: proposalId } = await params;

  // Validate body
  const body = await req.json();
  const parsed = VoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", code: "VALIDATION_ERROR", details: parsed.error.issues },
      { status: 400 }
    );
  }

  // 1. Proposal exists
  const proposal = await db.governanceProposal.findUnique({
    where: { id: proposalId },
  });
  if (!proposal) {
    return NextResponse.json(
      { error: "Proposal not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  // 2. Status is open or voting
  if (!["open", "voting"].includes(proposal.status)) {
    return NextResponse.json(
      { error: "Proposal is no longer accepting votes", code: "PROPOSAL_CLOSED" },
      { status: 409 }
    );
  }

  // 3. Not past closing date
  if (proposal.closesAt <= new Date()) {
    return NextResponse.json(
      { error: "Voting period has ended", code: "VOTING_ENDED" },
      { status: 409 }
    );
  }

  // 4. User hasn't voted yet
  const existingVote = await db.governanceVote.findUnique({
    where: { proposalId_userId: { proposalId, userId: user.id } },
  });
  if (existingVote) {
    return NextResponse.json(
      { error: "Already voted on this proposal", code: "ALREADY_VOTED" },
      { status: 409 }
    );
  }

  // Save vote
  await db.governanceVote.create({
    data: {
      proposalId,
      userId: user.id,
      vote: parsed.data.vote,
      comment: parsed.data.comment,
    },
  });

  // Update proposal counts
  const updateData: Record<string, unknown> = {};
  if (parsed.data.vote === "for") {
    updateData.votesFor = { increment: 1 };
  } else if (parsed.data.vote === "against") {
    updateData.votesAgainst = { increment: 1 };
  }

  // Check if quorum reached → update status to 'voting'
  const totalVotes =
    proposal.votesFor +
    proposal.votesAgainst +
    1; // +1 for this vote (abstains still count toward quorum)

  if (totalVotes >= proposal.quorum && proposal.status === "open") {
    updateData.status = "voting";
  }

  await db.governanceProposal.update({
    where: { id: proposalId },
    data: updateData,
  });

  return NextResponse.json({ success: true, vote: parsed.data.vote });
}
