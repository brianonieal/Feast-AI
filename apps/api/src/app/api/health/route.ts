// @version 0.1.0 - Foundation scaffold
import { NextResponse } from "next/server";
import { APP_VERSION } from "@feast-ai/shared";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: "ok",
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
  });
}
