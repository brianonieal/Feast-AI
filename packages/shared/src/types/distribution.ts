// @version 1.0.1 - Distribution types (channels cleared, Instagram retained as type)

export type DistributionChannel = "instagram";

export interface DistributionTarget {
  channel: DistributionChannel;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Distribution routing stub — returns empty array.
 * Channels will be activated when integrations are configured.
 */
export function getDistributionTargets(): DistributionTarget[] {
  return [];
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
