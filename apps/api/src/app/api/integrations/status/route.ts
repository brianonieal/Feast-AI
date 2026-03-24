// @version 0.5.0 - Echo: Integration health check endpoint (all adapters)
import { NextResponse } from "next/server";
import type { IntegrationStatus } from "@feast-ai/shared";
import { circleAdapter } from "@/integrations/circle/adapter";
import { hubspotAdapter } from "@/integrations/hubspot/adapter";
import { deepgramAdapter } from "@/integrations/deepgram/adapter";
import { wordpressAdapter } from "@/integrations/wordpress/adapter";

export async function GET(): Promise<NextResponse> {
  const [circle, hubspot, deepgram, wordpress] = await Promise.all([
    circleAdapter.healthCheck(),
    hubspotAdapter.healthCheck(),
    deepgramAdapter.healthCheck(),
    wordpressAdapter.healthCheck(),
  ]);

  const status: IntegrationStatus = {
    circle,
    hubspot,
    deepgram,
    wordpress,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(status);
}
