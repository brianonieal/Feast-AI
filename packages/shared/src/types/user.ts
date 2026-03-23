// @version 0.1.0 - Foundation scaffold

/** User roles within the Feast community */
export type UserRole = "ATTENDEE" | "HOST" | "FACILITATOR" | "ADMIN";

/** Community access tiers for content and event visibility */
export type CommunityTier = "PUBLIC" | "REGIONAL" | "FUNDERS" | "COOPERATIVE";

/** Core user type aligned with Prisma User model */
export interface User {
  id: string;
  clerkId: string;
  email: string;
  name: string | null;
  phone: string | null;
  city: string | null;
  role: UserRole;
  communityTier: CommunityTier;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/** Subset of User for public-facing contexts */
export interface UserPublic {
  id: string;
  name: string | null;
  city: string | null;
  role: UserRole;
}
