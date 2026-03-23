// @version 0.2.0 - Conduit: Circle.so adapter scaffold
// @version 0.4.0 - Spark: added createPost, listSpaces
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
  /** List all spaces — used to find correct event posting target */
  async listSpaces(): Promise<{ id: string; name: string; slug: string }[]> {
    if (!this.apiKey) throw new Error("CIRCLE_API_KEY not configured");

    const res = await fetch(`${CIRCLE_API_BASE}/spaces`, {
      headers: { Authorization: `Token ${this.apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      throw new Error(`Circle listSpaces failed: HTTP ${res.status}`);
    }

    const data = await res.json() as { id: string; name: string; slug: string }[];
    return data;
  }

  /** Create a post in a Circle space (event announcement) */
  async createPost(input: {
    spaceId: string;
    name: string;
    body: string;
  }): Promise<{ id: string; url: string }> {
    if (!this.apiKey) throw new Error("CIRCLE_API_KEY not configured");

    const res = await fetch(`${CIRCLE_API_BASE}/posts`, {
      method: "POST",
      headers: {
        Authorization: `Token ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        space_id: input.spaceId,
        name: input.name,
        body: input.body,
        status: "published",
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      throw new Error(`Circle createPost failed: HTTP ${res.status}`);
    }

    const data = await res.json() as { id: string; url: string };
    return data;
  }
}

/** Singleton instance */
export const circleAdapter = new CircleAdapter();
