// @version 0.5.0 - Echo: Clerk provider wrapper
// Handles missing publishableKey during static generation / CI builds.
// In production, the key is always present via env vars.
"use client";

import { ClerkProvider } from "@clerk/nextjs";

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export function ClerkClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // During `next build` without real Clerk keys, render children without Clerk
  if (!publishableKey) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      {children}
    </ClerkProvider>
  );
}
