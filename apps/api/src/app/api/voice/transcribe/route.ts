// @version 2.0.0 - Pantheon: Voice transcription via Deepgram
// Receives audio (m4a from mobile, webm from web)
// Returns transcript text. Stubs gracefully when no API key.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { applyRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, "ai");
  if (limited) return limited;

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
  if (!DEEPGRAM_API_KEY) {
    // Stub when key not configured — graceful degradation
    console.log("[Voice] DEEPGRAM_API_KEY not set — returning stub");
    return NextResponse.json({ transcript: "", stub: true });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided", code: "NO_AUDIO" },
        { status: 400 }
      );
    }

    const audioBuffer = await audioFile.arrayBuffer();

    const dgRes = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${DEEPGRAM_API_KEY}`,
          "Content-Type": audioFile.type || "audio/m4a",
        },
        body: audioBuffer,
      }
    );

    if (!dgRes.ok) {
      throw new Error(`Deepgram error: ${dgRes.status}`);
    }

    const data = (await dgRes.json()) as {
      results?: {
        channels?: Array<{
          alternatives?: Array<{ transcript?: string }>;
        }>;
      };
    };

    const transcript =
      data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";

    return NextResponse.json({ transcript });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[Voice] Transcription failed:", error);
    return NextResponse.json(
      { error: "Transcription failed", code: "TRANSCRIPTION_ERROR" },
      { status: 500 }
    );
  }
}
