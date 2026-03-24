// @version 0.1.0 - Foundation scaffold
// @version pre-0.6.0 - CommunityTier enum alignment

import { z } from "zod";

export const UserRoleSchema = z.enum([
  "ATTENDEE",
  "HOST",
  "FACILITATOR",
  "ADMIN",
]);

export const UserTierSchema = z.enum([
  "commons",
  "kitchen",
  "founding_table",
]);

// Alias for backward compatibility
export const CommunityTierSchema = UserTierSchema;

export const UserSchema = z.object({
  id: z.string().cuid(),
  clerkId: z.string().min(1),
  email: z.string().email(),
  name: z.string().nullable(),
  phone: z.string().nullable(),
  city: z.string().nullable(),
  role: UserRoleSchema,
  communityTier: CommunityTierSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
});

export const CreateUserSchema = z.object({
  clerkId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  role: UserRoleSchema.optional(),
  communityTier: CommunityTierSchema.optional(),
});
