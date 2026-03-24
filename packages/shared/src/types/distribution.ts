// @version 0.6.0 - Beacon: distribution routing types

import type { EventVisibility } from "./events";

export type DistributionChannel =
  | "hubspot_email"
  | "circle_public"
  | "circle_tier"
  | "crm_regional";

export interface DistributionTarget {
  channel: DistributionChannel;
  targetId?: string; // circle space ID, hubspot list ID, etc.
  metadata?: Record<string, unknown>;
}

/**
 * Route content to the correct distribution channels based on event visibility.
 * From workflow PDF:
 *   Open (public) event  → instagram + mailing_list + circle_public
 *   Closed event         → circle_tier + crm_regional
 */
export function getDistributionTargets(
  eventVisibility: EventVisibility
): DistributionTarget[] {
  if (eventVisibility === "public") {
    // instagram deferred to v0.7.x (requires Meta app review + per-user OAuth)
    return [{ channel: "hubspot_email" }, { channel: "circle_public" }];
  }
  // commons, kitchen, founding_table → closed distribution
  return [{ channel: "circle_tier" }, { channel: "crm_regional" }];
}

export interface DistributionResult {
  channel: DistributionChannel;
  success: boolean;
  externalId?: string;
  externalUrl?: string;
  error?: string;
}

export interface ApprovalQueueItem {
  id: string;
  submissionId: string;
  eventId: string;
  channel: string;
  generatedBody: string;
  generatedTitle?: string;
  imageUrl?: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PUBLISHED";
  createdAt: Date;
}
