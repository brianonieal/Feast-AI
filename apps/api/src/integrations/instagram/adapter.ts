// @version 0.6.0 - Beacon: Instagram Graph API adapter
// Docs: https://developers.facebook.com/docs/instagram-api/
// Two-step publish: createContainer → publishContainer
// Does NOT throw at import time — only at call time if credentials are missing
/** @deferred v0.7.x — requires Meta app review + per-user OAuth */

import type { BaseAdapter, AdapterHealthResult } from "@feast-ai/shared";
import type {
  InstagramPost,
  InstagramPublishResult,
  InstagramContainerResponse,
  InstagramPublishResponse,
} from "./types";

const GRAPH_API_VERSION = "v19.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export class InstagramAdapter implements BaseAdapter {
  name = "instagram" as const;

  private get accessToken(): string {
    const token = process.env.INSTAGRAM_ACCESS_TOKEN;
    if (!token) throw new Error("INSTAGRAM_ACCESS_TOKEN not set");
    return token;
  }

  private get igUserId(): string {
    const id = process.env.INSTAGRAM_USER_ID;
    if (!id) throw new Error("INSTAGRAM_USER_ID not set");
    return id;
  }

  async healthCheck(): Promise<AdapterHealthResult> {
    const start = Date.now();
    try {
      const token = process.env.INSTAGRAM_ACCESS_TOKEN;
      const userId = process.env.INSTAGRAM_USER_ID;
      if (!token || !userId) {
        return {
          connected: false,
          latencyMs: 0,
          error: "Instagram credentials not configured",
        };
      }

      const res = await fetch(
        `${GRAPH_API_BASE}/${userId}?fields=id,username&access_token=${token}`,
        { signal: AbortSignal.timeout(10_000) }
      );

      return { connected: res.ok, latencyMs: Date.now() - start };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return { connected: false, latencyMs: Date.now() - start, error: message };
    }
  }

  /** Step 1: Create media container (image + caption) */
  async createContainer(post: InstagramPost): Promise<string> {
    const res = await fetch(`${GRAPH_API_BASE}/${this.igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: post.imageUrl,
        caption: post.caption,
        access_token: this.accessToken,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(
        `Instagram container creation failed: ${JSON.stringify(err)}`
      );
    }

    const data: InstagramContainerResponse = await res.json();
    return data.id;
  }

  /** Step 2: Publish the created container */
  async publishContainer(
    containerId: string
  ): Promise<InstagramPublishResult> {
    const res = await fetch(
      `${GRAPH_API_BASE}/${this.igUserId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: this.accessToken,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Instagram publish failed: ${JSON.stringify(err)}`);
    }

    const data: InstagramPublishResponse = await res.json();
    return { postId: data.id };
  }

  /** Combined: create container + wait + publish in one call */
  async post(content: InstagramPost): Promise<InstagramPublishResult> {
    const containerId = await this.createContainer(content);
    // Instagram requires a brief wait between create and publish
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return this.publishContainer(containerId);
  }
}

/** Singleton instance */
export const instagramAdapter = new InstagramAdapter();
