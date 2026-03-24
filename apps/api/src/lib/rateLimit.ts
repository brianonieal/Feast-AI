// @version 0.6.0 - Beacon: Upstash Redis rate limiting
// @version 0.8.0 - Shield: added ai (5/min) and auth (10/min) tiers
// Five tiers: standard (60/min), distribution (10/min), webhook (100/min),
//             ai (5/min), auth (10/min)
// Singleton Redis client — same pattern as db.ts

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

// Singleton Redis client via globalThis (avoids multiple instances in dev)
const globalForRedis = globalThis as unknown as {
  upstashRedis: Redis | undefined;
};

const redis =
  globalForRedis.upstashRedis ??
  new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.upstashRedis = redis;
}

export { redis };

// Three tiers of rate limiting
export const rateLimiters = {
  // Standard API routes: 60 requests per minute per IP
  standard: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, "1 m"),
    analytics: true,
    prefix: "feast:standard",
  }),

  // Content distribution: 10 per minute (expensive external API calls)
  distribution: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    analytics: true,
    prefix: "feast:distribution",
  }),

  // Webhooks: 100 per minute (Twilio/Circle can be chatty)
  webhook: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "1 m"),
    analytics: true,
    prefix: "feast:webhook",
  }),

  // AI routes: 5 per minute (each call costs money via Claude API)
  ai: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    analytics: true,
    prefix: "feast:ai",
  }),

  // Auth routes: 10 per minute (prevent brute force)
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    analytics: true,
    prefix: "feast:auth",
  }),
};

/**
 * Apply rate limiting to a request. Returns a 429 NextResponse if limited,
 * or null if the request is within limits (proceed normally).
 */
export async function applyRateLimit(
  req: NextRequest,
  tier: keyof typeof rateLimiters = "standard"
): Promise<NextResponse | null> {
  const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const { success, limit, remaining, reset } =
    await rateLimiters[tier].limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: "Rate limit exceeded", code: "RATE_LIMITED" },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        },
      }
    );
  }

  return null;
}
