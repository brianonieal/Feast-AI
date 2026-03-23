// @version 0.2.0 - Conduit: Circle.so adapter scaffold
import type { BaseAdapter, AdapterHealthResult } from "@feast-ai/shared";

const CIRCLE_API_BASE = "https://api.circle.so/v2";

export class CircleAdapter implements BaseAdapter {
  name = "circle" as const;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.CIRCLE_API_KEY ?? "";
  }

  async healthCheck(): Promise<AdapterHealthResult> {
    if (!this.apiKey) {
      return { connected: false, latencyMs: 0, error: "CIRCLE_API_KEY not configured" };
    }

    const start = Date.now();
    try {
      const res = await fetch(`${CIRCLE_API_BASE}/spaces`, {
        method: "GET",
        headers: {
          Authorization: `Token ${this.apiKey}`,
        },
        signal: AbortSignal.timeout(10_000),
      });

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
export const circleAdapter = new CircleAdapter();
