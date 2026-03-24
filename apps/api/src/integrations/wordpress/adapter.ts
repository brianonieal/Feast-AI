// @version 0.5.0 - Echo: WordPress adapter for article publishing
import type { BaseAdapter, AdapterHealthResult } from "@feast-ai/shared";

export class WordPressAdapter implements BaseAdapter {
  name = "wordpress" as const;
  private baseUrl: string;
  private username: string;
  private appPassword: string;

  constructor(opts?: { baseUrl?: string; username?: string; appPassword?: string }) {
    this.baseUrl = opts?.baseUrl ?? process.env.WORDPRESS_URL ?? "";
    this.username = opts?.username ?? process.env.WORDPRESS_USERNAME ?? "";
    this.appPassword = opts?.appPassword ?? process.env.WORDPRESS_APP_PASSWORD ?? "";
  }

  private get authHeader(): string {
    return `Basic ${Buffer.from(`${this.username}:${this.appPassword}`).toString("base64")}`;
  }

  async healthCheck(): Promise<AdapterHealthResult> {
    if (!this.baseUrl || !this.appPassword) {
      return { connected: false, latencyMs: 0, error: "WordPress credentials not configured" };
    }

    const start = Date.now();
    try {
      const res = await fetch(`${this.baseUrl}/wp-json/wp/v2/posts?per_page=1`, {
        headers: { Authorization: this.authHeader },
        signal: AbortSignal.timeout(10_000),
      });
      const latencyMs = Date.now() - start;

      if (!res.ok) {
        return { connected: false, latencyMs, error: `HTTP ${res.status}: ${res.statusText}` };
      }
      return { connected: true, latencyMs };
    } catch (err: unknown) {
      const latencyMs = Date.now() - start;
      return { connected: false, latencyMs, error: err instanceof Error ? err.message : "Unknown error" };
    }
  }

  /** Create a draft post. All @COMMUNICATOR content is published as drafts for admin review. */
  async createPost(input: {
    title: string;
    content: string;
    status?: "draft" | "publish";
  }): Promise<{ id: number; link: string }> {
    if (!this.baseUrl) throw new Error("WordPress URL not configured");

    const res = await fetch(`${this.baseUrl}/wp-json/wp/v2/posts`, {
      method: "POST",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: input.title,
        content: input.content,
        status: input.status ?? "draft",
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      throw new Error(`WordPress createPost failed: HTTP ${res.status}`);
    }

    const data = await res.json() as { id: number; link: string };
    return { id: data.id, link: data.link };
  }
}

export const wordpressAdapter = new WordPressAdapter();
