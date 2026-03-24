// @version 0.5.0 - Echo: Clerk middleware + route protection
// @version 0.9.0 - Lens: added /admin/* and /admin/system/* route guards
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { UserTier } from "@feast-ai/shared/types/user";

const isProtectedRoute = createRouteMatcher([
  "/home(.*)",
  "/circle(.*)",
  "/events(.*)",
  "/library(.*)",
  "/kitchen(.*)",
  "/apply(.*)",
  "/profile(.*)",
  "/admin(.*)",
]);

const isKitchenRoute = createRouteMatcher(["/kitchen(.*)"]);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isSystemRoute = createRouteMatcher(["/admin/system(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect();

  // Kitchen guard: kitchen tier and above only
  if (isKitchenRoute(req)) {
    const { sessionClaims } = await auth();
    const tier = (sessionClaims?.publicMetadata as { tier?: UserTier })?.tier;
    if (!tier || tier === "commons") {
      return NextResponse.redirect(new URL("/home", req.url));
    }
  }

  // Admin guard: canViewHostDashboard = host, facilitator, kitchen, founding_table
  if (isAdminRoute(req)) {
    const { sessionClaims } = await auth();
    const meta = sessionClaims?.publicMetadata as {
      tier?: string;
      role?: string;
    } | undefined;

    const role = meta?.role;
    const tier = meta?.tier;

    const canAccess =
      role === "host" ||
      role === "facilitator" ||
      tier === "kitchen" ||
      tier === "founding_table";

    if (!canAccess) {
      return NextResponse.redirect(new URL("/home", req.url));
    }
  }

  // System routes guard: founding_table only
  if (isSystemRoute(req)) {
    const { sessionClaims } = await auth();
    const tier = (sessionClaims?.publicMetadata as { tier?: string })?.tier;
    if (tier !== "founding_table") {
      return NextResponse.redirect(new URL("/admin/events", req.url));
    }
  }
});

export const config = {
  matcher: ["/((?!_next|.*\\..*|favicon.ico).*)"],
};
