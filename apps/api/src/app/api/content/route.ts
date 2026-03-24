// @version 0.5.0 - Echo: content submission API
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { CreateContentSubmissionSchema } from "@feast-ai/shared";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { inngest } from "@/lib/inngest";

/** POST /api/content — submit raw dinner content for processing */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await requireAuth();

  const body = await req.json() as unknown;
  const parsed = CreateContentSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", code: "VALIDATION_ERROR", details: parsed.error.issues },
      { status: 400 }
    );
  }

  // Verify the event exists and user is the host
  const event = await db.feastEvent.findUnique({ where: { id: parsed.data.eventId } });
  if (!event || event.deletedAt) {
    return NextResponse.json(
      { error: "Event not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  if (event.hostId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only the host or admin can submit content", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const submission = await db.contentSubmission.create({
    data: {
      eventId: parsed.data.eventId,
      submittedBy: user.id,
      photos: parsed.data.photos ?? Prisma.JsonNull,
      quotes: parsed.data.quotes ?? Prisma.JsonNull,
      audioUrl: parsed.data.audioUrl ?? null,
      status: "RECEIVED",
    },
  });

  // Trigger content processing pipeline
  await inngest.send({
    name: "feast/content.submitted",
    data: { submissionId: submission.id },
  });

  return NextResponse.json(submission, { status: 201 });
}

/** GET /api/content — list content submissions (for the current user's hosted events) */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await requireAuth();
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");

  const where: Record<string, unknown> = {};
  if (eventId) {
    where.eventId = eventId;
  }
  if (user.role !== "ADMIN") {
    where.submittedBy = user.id;
  }

  const submissions = await db.contentSubmission.findMany({
    where,
    include: {
      event: { select: { id: true, name: true, date: true } },
      publishedContent: { select: { id: true, channel: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(submissions);
}
