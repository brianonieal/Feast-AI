// @version 0.5.0 - Echo: Deepgram audio transcription adapter
// Uses REST API directly — the @deepgram/sdk v4 is WebSocket-focused
import type { BaseAdapter, AdapterHealthResult } from "@feast-ai/shared";

const DEEPGRAM_API_BASE = "https://api.deepgram.com/v1";

export class DeepgramAdapter implements BaseAdapter {
  name = "deepgram" as const;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.DEEPGRAM_API_KEY ?? "";
  }

  async healthCheck(): Promise<AdapterHealthResult> {
    if (!this.apiKey) {
      return { connected: false, latencyMs: 0, error: "DEEPGRAM_API_KEY not configured" };
    }
    return { connected: true, latencyMs: 0 };
  }

  /**
   * Transcribe a pre-recorded audio file from a URL via Deepgram REST API.
   * Returns the full transcript text.
   */
  async transcribe(audioUrl: string): Promise<string> {
    if (!this.apiKey) throw new Error("DEEPGRAM_API_KEY not configured");

    const res = await fetch(
      `${DEEPGRAM_API_BASE}/listen?model=nova-2&smart_format=true`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: audioUrl }),
        signal: AbortSignal.timeout(120_000),
      }
    );

    if (!res.ok) {
      throw new Error(`Deepgram transcription failed: HTTP ${res.status}`);
    }

    const data = await res.json() as {
      results?: {
        channels?: Array<{
          alternatives?: Array<{ transcript?: string }>;
        }>;
      };
    };

    return data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
  }
}

export const deepgramAdapter = new DeepgramAdapter();
