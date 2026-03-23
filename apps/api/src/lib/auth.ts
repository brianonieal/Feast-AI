// @version 0.2.0 - Conduit: Clerk auth helpers
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "./db";
import type { User } from "@feast-ai/shared";

/** Get the authenticated Clerk user ID, or null if not authenticated */
export async function getAuthUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

/** Get the database user for the current Clerk session. Returns null if not found. */
export async function getAuthUser(): Promise<User | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { clerkId: userId },
  });

  return user;
}

/**
 * Require authentication. Returns the database user or throws.
 * Use in protected API routes after Clerk middleware has already verified the JWT.
 */
export async function requireAuth(): Promise<User> {
  const user = await getAuthUser();
  if (!user) {
    throw new Error("Authenticated user not found in database");
  }
  return user;
}

/** Get Clerk user details (email, name) for user sync */
export async function getClerkUserDetails(): Promise<{
  clerkId: string;
  email: string;
  name: string | null;
} | null> {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const primaryEmail = clerkUser.emailAddresses.find(
    (e) => e.id === clerkUser.primaryEmailAddressId
  );

  return {
    clerkId: clerkUser.id,
    email: primaryEmail?.emailAddress ?? "",
    name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null,
  };
}
