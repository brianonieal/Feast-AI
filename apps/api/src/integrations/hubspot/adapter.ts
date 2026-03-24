// @version 0.2.0 - Conduit: HubSpot adapter scaffold
// @version 0.6.0 - Beacon: added sendTransactionalEmail + sendToList
import type { BaseAdapter, AdapterHealthResult } from "@feast-ai/shared";
import type {
  HubSpotTransactionalEmailParams,
  HubSpotTransactionalEmailResult,
  HubSpotListSendParams,
  HubSpotListSendResult,
} from "./types";

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
  // @version 0.6.0 - Beacon: transactional email via Marketing API

  /** Send a single transactional email to a contact */
  async sendTransactionalEmail(
    params: HubSpotTransactionalEmailParams
  ): Promise<HubSpotTransactionalEmailResult> {
    if (!this.apiKey) {
      throw new Error("HUBSPOT_API_KEY not set");
    }

    const res = await fetch(
      `${HUBSPOT_API_BASE}/marketing/v3/transactional/single-email/send`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          emailId: params.emailId,
          message: { to: params.to },
          contactProperties: params.contactProperties ?? {},
        }),
      }
    );

    return { success: res.ok, statusCode: res.status };
  }

  /** Send a marketing email blast to a HubSpot list */
  async sendToList(params: HubSpotListSendParams): Promise<HubSpotListSendResult> {
    if (!this.apiKey) {
      throw new Error("HUBSPOT_API_KEY not set");
    }

    const res = await fetch(
      `${HUBSPOT_API_BASE}/marketing/v3/emails/send`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          listId: params.listId,
          subject: params.subject,
          body: params.body,
          from: { name: params.fromName, email: params.fromEmail },
        }),
      }
    );

    const data = await res.json();
    return { success: res.ok, campaignId: data.id };
  }
}

/** Singleton instance */
export const hubspotAdapter = new HubSpotAdapter();
