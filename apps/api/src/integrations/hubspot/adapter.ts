// @version 0.2.0 - Conduit: HubSpot adapter scaffold
import type { BaseAdapter, AdapterHealthResult } from "@feast-ai/shared";

const HUBSPOT_API_BASE = "https://api.hubspot.com";

export class HubSpotAdapter implements BaseAdapter {
  name = "hubspot" as const;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.HUBSPOT_API_KEY ?? "";
  }

  async healthCheck(): Promise<AdapterHealthResult> {
    if (!this.apiKey) {
      return { connected: false, latencyMs: 0, error: "HUBSPOT_API_KEY not configured" };
    }

    const start = Date.now();
    try {
      const res = await fetch(
        `${HUBSPOT_API_BASE}/crm/v3/objects/contacts?limit=1`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(10_000),
        }
      );

      const latencyMs = Date.now() - start;

      if (!res.ok) {
        return {
          connected: false,
          latencyMs,
          error: `HTTP ${res.status}: ${res.statusText}`,
        };
      }

      return { connected: true, latencyMs };
    } catch (err: unknown) {
      const latencyMs = Date.now() - start;
      const message = err instanceof Error ? err.message : "Unknown error";
      return { connected: false, latencyMs, error: message };
    }
  }
}

/** Singleton instance */
export const hubspotAdapter = new HubSpotAdapter();
