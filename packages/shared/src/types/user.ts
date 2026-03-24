// @version 0.1.0 - Foundation scaffold
// @version pre-0.6.0 - CommunityTier enum alignment

/** User roles within the Feast community */
export type UserRole = "ATTENDEE" | "HOST" | "FACILITATOR" | "ADMIN";

/** Community access tiers — aligned with proposal language (pre-0.6.0) */
export type UserTier = "commons" | "kitchen" | "founding_table";

// Keep CommunityTier as an alias so existing imports don't break
// Remove this alias once all references are updated
export type CommunityTier = UserTier;

/** Core user type aligned with Prisma User model */
export interface User {
  id: string;
  clerkId: string;
  email: string;
  name: string | null;
  phone: string | null;
  city: string | null;
  role: UserRole;
  communityTier: UserTier; // Prisma column name
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/** Convenience getter — tier is the canonical name for communityTier */
export function getUserTier(user: User): UserTier {
  return user.communityTier;
}

/** Subset of User for public-facing contexts */
export interface UserPublic {
  id: string;
  name: string | null;
  city: string | null;
  role: UserRole;
}

// @version 0.5.0 - Echo: frontend view model types

/** Frontend role type (lowercase) for UI display */
export type FeastUserRole = "attendee" | "host" | "facilitator";

/** Frontend user view model — used by mobile + web UI layers */
export interface FeastUser {
  id: string;
  clerkId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  tier: UserTier;
  role: FeastUserRole;
  city?: string;
  hubRegion?: string;
  dinnerCount: number;
  createdAt: Date;
}

/** Stored in Clerk publicMetadata */
export interface ClerkUserMetadata {
  tier: UserTier;
  role: FeastUserRole;
  feastDbId: string;
}

/** Permission flags derived from user tier + role */
export interface TierPermissions {
  canAccessKitchen: boolean;
  canAccessFoundingTable: boolean;
  canHostEvents: boolean;
  canFacilitateCircles: boolean;
  canManageProjectPods: boolean;
  canTriggerAICouncil: boolean;
  canPublishContent: boolean;
  canViewHostDashboard: boolean;
}

/** Compute permissions from a FeastUser */
export function getPermissions(user: FeastUser): TierPermissions {
  const isKitchenPlus = (["kitchen", "founding_table"] as string[]).includes(user.tier);
  const isHost = (["host", "facilitator"] as string[]).includes(user.role);

  return {
    canAccessKitchen: isKitchenPlus,
    canAccessFoundingTable: user.tier === "founding_table",
    canHostEvents: isHost,
    canFacilitateCircles: user.role === "facilitator",
    canManageProjectPods: isKitchenPlus,
    canTriggerAICouncil: isHost,
    canPublishContent: isHost,
    canViewHostDashboard: isHost || isKitchenPlus,
  };
}
