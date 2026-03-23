// @version 0.2.0 - Conduit: Integration health check endpoint
import { NextResponse } from "next/server";
import type { IntegrationStatus } from "@feast-ai/shared";
import { circleAdapter } from "@/integrations/circle/adapter";
import { hubspotAdapter } from "@/integrations/hubspot/adapter";

export async function GET(): Promise<NextResponse> {
  const [circle, hubspot] = await Promise.all([
    circleAdapter.healthCheck(),
    hubspotAdapter.healthCheck(),
  ]);

  const status: IntegrationStatus = {
    circle,
    hubspot,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(status);
}
