// @version 0.6.0 - Beacon: multi-channel content distribution orchestrator
// Called by Inngest pipeline after content is approved.
// Iterates targets sequentially — each channel logged independently.

import { hubspotAdapter } from "../integrations/hubspot/adapter";
import { circleAdapter } from "../integrations/circle/adapter";
import { db } from "../lib/db";
import type {
  DistributionTarget,
  DistributionResult,
} from "@feast-ai/shared";

export async function distributeContent(params: {
  approvalQueueId: string;
  targets: DistributionTarget[];
  triggeredBy: string;
}): Promise<DistributionResult[]> {
  const { approvalQueueId, targets, triggeredBy } = params;

  const queueItem = await db.contentApprovalQueue.findUnique({
    where: { id: approvalQueueId },
    include: { event: true, submission: true },
  });

  if (!queueItem) {
    throw new Error(`Queue item ${approvalQueueId} not found`);
  }
  if (queueItem.status !== "APPROVED") {
    throw new Error(
      `Queue item ${approvalQueueId} is not approved (status: ${queueItem.status})`
    );
  }

  const results: DistributionResult[] = [];

  // Sequential iteration — failure on one channel must not cancel others
  for (const target of targets) {
    let result: DistributionResult = {
      channel: target.channel,
      success: false,
    };

    try {
      switch (target.channel) {
        case "hubspot_email": {
          const send = await hubspotAdapter.sendToList({
            listId: process.env.HUBSPOT_COMMUNITY_LIST_ID ?? "",
            subject: queueItem.generatedTitle ?? queueItem.event.name,
            body: queueItem.generatedBody,
            fromName: "The Feast",
            fromEmail:
              process.env.FEAST_FROM_EMAIL ?? "hello@feastongood.com",
          });
          result = { channel: "hubspot_email", success: send.success };
          break;
        }

        case "circle_public": {
          const spaceId = process.env.CIRCLE_PUBLIC_SPACE_ID;
          if (!spaceId) {
            result.error = "Circle public space ID not configured";
            break;
          }
          const post = await circleAdapter.createPost({
            spaceId,
            name: queueItem.generatedTitle ?? queueItem.event.name,
            body: queueItem.generatedBody,
          });
          result = {
            channel: "circle_public",
            success: true,
            externalId: post.id,
            externalUrl: post.url,
          };
          break;
        }

        case "circle_tier": {
          const spaceId = getTierSpaceId(queueItem.event.communityTier);
          if (!spaceId) {
            result.error =
              "Circle space ID not configured for this tier";
            break;
          }
          const post = await circleAdapter.createPost({
            spaceId,
            name: queueItem.generatedTitle ?? queueItem.event.name,
            body: queueItem.generatedBody,
          });
          result = {
            channel: "circle_tier",
            success: true,
            externalId: post.id,
            externalUrl: post.url,
          };
          break;
        }

        case "crm_regional": {
          const listId = getRegionalListId(queueItem.event.city);
          if (!listId) {
            result.error = `No HubSpot list found for city: ${queueItem.event.city}`;
            break;
          }
          const send = await hubspotAdapter.sendToList({
            listId,
            subject: queueItem.generatedTitle ?? queueItem.event.name,
            body: queueItem.generatedBody,
            fromName: "The Feast",
            fromEmail:
              process.env.FEAST_FROM_EMAIL ?? "hello@feastongood.com",
          });
          result = { channel: "crm_regional", success: send.success };
          break;
        }
      }
    } catch (err) {
      result = {
        channel: target.channel,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    // Log every attempt regardless of success/failure
    await db.distributionLog.create({
      data: {
        eventId: queueItem.eventId,
        channel: channelToContentChannel(target.channel),
        target: target.targetId ?? target.channel,
        status: result.success ? "success" : "failed",
        externalId: result.externalId,
        externalUrl: result.externalUrl,
        error: result.error,
        triggeredBy,
      },
    });

    results.push(result);
  }

  // Update approval queue status
  const allSucceeded = results.every((r) => r.success);
  await db.contentApprovalQueue.update({
    where: { id: approvalQueueId },
    data: { status: allSucceeded ? "PUBLISHED" : "APPROVED" },
  });

  return results;
}

/**
 * Maps CommunityTier enum value to Circle space ID from env.
 * Returns empty string if not configured.
 */
function getTierSpaceId(tier: string): string {
  const map: Record<string, string | undefined> = {
    kitchen: process.env.CIRCLE_KITCHEN_SPACE_ID,
    founding_table: process.env.CIRCLE_FOUNDING_TABLE_SPACE_ID,
    commons: process.env.CIRCLE_PUBLIC_SPACE_ID,
  };
  return map[tier] ?? "";
}

/**
 * Maps city name to HubSpot regional list ID from env.
 * Convention: HUBSPOT_LIST_BROOKLYN, HUBSPOT_LIST_LA, etc.
 * Returns empty string if not configured.
 */
function getRegionalListId(city: string): string {
  const cityKey = city.toLowerCase().replace(/[^a-z]/g, "_");
  return process.env[`HUBSPOT_LIST_${cityKey.toUpperCase()}`] ?? "";
}

/**
 * Maps DistributionChannel to the Prisma ContentChannel enum.
 * DistributionLog.channel is typed as ContentChannel in the schema.
 */
function channelToContentChannel(
  channel: string
): "WEBSITE_ARTICLE" | "INSTAGRAM" | "CIRCLE_RECAP" | "NEWSLETTER" | "EMAIL_CAMPAIGN" {
  const map: Record<string, "WEBSITE_ARTICLE" | "INSTAGRAM" | "CIRCLE_RECAP" | "NEWSLETTER" | "EMAIL_CAMPAIGN"> = {
    hubspot_email: "EMAIL_CAMPAIGN",
    circle_public: "CIRCLE_RECAP",
    circle_tier: "CIRCLE_RECAP",
    crm_regional: "EMAIL_CAMPAIGN",
  };
  return map[channel] ?? "NEWSLETTER";
}
