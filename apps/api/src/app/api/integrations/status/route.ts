// @version 1.0.1 - Integration health check (active integrations only)
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(): Promise<NextResponse> {
  const checks: { service: string; connected: boolean; latencyMs: number; error?: string }[] = [];

  // Resend
  checks.push({
    service: "resend",
    connected: !!process.env.RESEND_API_KEY,
    latencyMs: 0,
  });

  // Supabase DB ping
  const dbStart = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    checks.push({
      service: "supabase",
      connected: true,
      latencyMs: Date.now() - dbStart,
    });
  } catch (e) {
    checks.push({
      service: "supabase",
      connected: false,
      latencyMs: Date.now() - dbStart,
      error: e instanceof Error ? e.message : "DB ping failed",
    });
  }

  return NextResponse.json({
    success: true,
    integrations: checks,
    timestamp: new Date().toISOString(),
  });
}
