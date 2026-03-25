// @version 1.3.0 - Nexus
// Event template CRUD + spawn event from template

import { db } from "../lib/db";
import { inngest } from "../lib/inngest";

export async function createTemplate(params: {
  creatorId: string;
  name: string;
  description?: string;
  city: string;
  maxSeats?: number;
  communityTier?: string;
  cadence?: string;
}) {
  return db.eventTemplate.create({
    data: {
      creatorId: params.creatorId,
      name: params.name,
      description: params.description,
      city: params.city,
      maxSeats: params.maxSeats ?? 12,
      // ESCAPE: Prisma enum requires specific type, service accepts string
      communityTier: (params.communityTier as "commons") ?? "commons",
      cadence: params.cadence ?? "monthly",
    },
  });
}

export async function getTemplatesByUser(userId: string) {
  return db.eventTemplate.findMany({
    where: { creatorId: userId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Create a new FeastEvent from a template.
 * Triggers both event-created pipeline and auto-embed via Inngest.
 */
export async function spawnEventFromTemplate(params: {
  templateId: string;
  hostId: string;
  date: Date;
  overrides?: Partial<{
    name: string;
    description: string;
    maxSeats: number;
  }>;
}) {
  const template = await db.eventTemplate.findUnique({
    where: { id: params.templateId },
  });

  if (!template) throw new Error(`Template ${params.templateId} not found`);

  // FeastEvent uses 'capacity' not 'maxSeats', 'date' not 'scheduledAt'
  const event = await db.feastEvent.create({
    data: {
      hostId: params.hostId,
      templateId: params.templateId,
      name: params.overrides?.name ?? template.name,
      description: params.overrides?.description ?? template.description,
      city: template.city,
      capacity: params.overrides?.maxSeats ?? template.maxSeats,
      communityTier: template.communityTier,
      date: params.date,
      location: template.city, // default location to city — host can update
      status: "DRAFT",
    },
  });

  // Increment template usage count
  await db.eventTemplate.update({
    where: { id: params.templateId },
    data: { usageCount: { increment: 1 } },
  });

  // Trigger event-created pipeline + auto-embed
  await Promise.allSettled([
    inngest.send({ name: "event/created", data: { eventId: event.id } }),
    inngest.send({
      name: "content/embed",
      data: { sourceType: "event", sourceId: event.id },
    }),
  ]);

  return event;
}
