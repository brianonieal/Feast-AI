// @version 0.5.0 - Echo: Clerk middleware + route protection
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
]);

const isKitchenRoute = createRouteMatcher(["/kitchen(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect();

  if (isKitchenRoute(req)) {
    const { sessionClaims } = await auth();
    const tier = (sessionClaims?.publicMetadata as { tier?: UserTier })?.tier;
    if (!tier || tier === "commons") {
      return NextResponse.redirect(new URL("/home", req.url));
    }
  }
});

export const config = {
  matcher: ["/((?!_next|.*\\..*|favicon.ico).*)"],
};
