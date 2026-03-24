// @version 0.1.0 - Foundation scaffold

import { z } from "zod";
import { CommunityTierSchema } from "./user";

export const EventTypeSchema = z.enum(["OPEN", "CLOSED"]);

export const EventStatusSchema = z.enum([
  "DRAFT",
  "SCHEDULED",
  "MARKETED",
  "LIVE",
  "COMPLETED",
  "CANCELLED",
]);

export const RSVPStatusSchema = z.enum([
  "INTERESTED",
  "CONFIRMED",
  "DECLINED",
  "ATTENDED",
  "NO_SHOW",
]);

export const FeastEventSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  date: z.coerce.date(),
  location: z.string().min(1),
  city: z.string().min(1),
  capacity: z.number().int().positive(),
  type: EventTypeSchema,
  status: EventStatusSchema,
  communityTier: CommunityTierSchema,
  circlePostId: z.string().nullable(),
  circleEventId: z.string().nullable(),
  hostId: z.string().cuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
});

export const CreateEventSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  date: z.coerce.date(),
  location: z.string().min(1).max(500),
  city: z.string().min(1).max(100),
  capacity: z.number().int().positive().max(100).default(12),
  type: EventTypeSchema.default("OPEN"),
  communityTier: CommunityTierSchema.default("commons"),
});

export const EventAttendanceSchema = z.object({
  id: z.string().cuid(),
  userId: z.string().cuid(),
  eventId: z.string().cuid(),
  status: RSVPStatusSchema,
  createdAt: z.coerce.date(),
});
