# FEAST-AI v0.6.0 BEACON BLUEPRINT
# Codename: Beacon
# Architect: Claude Sonnet 4.6 (chat)
# Executor: Claude Opus 4.6 (Claude Code)
# Date: March 2026
# Scope: Multi-channel content distribution engine

---

## OPUS BOOT INSTRUCTIONS

Read in this order before writing a single line of code:
1. docs/blueprints/CONTRACT.md
2. docs/CHANGELOG.md (last 10 entries)
3. docs/blueprints/TECH_STACK.md
4. docs/blueprints/INTEGRATIONS.md
5. docs/blueprints/COUNCIL_AGENTS.md
6. This file (BEACON_BLUEPRINT.md) in full

Then run the health check:
  pnpm typecheck
  pnpm lint
  npx prisma validate

All three must pass before writing any code.
If any fail, fix them first and report before continuing.

Current version: 0.6.0
Sacred Rule: Do not build anything from v0.7.0 or later.

---

## SECTION 1: SCOPE

v0.6.0 Beacon builds exactly these things. Nothing more.

### What gets built:
1. Distribution routing logic -- open vs closed event content routing
2. Instagram adapter -- extended with publish capability (createContainer + publishContainer)
3. HubSpot email adapter -- send transactional email via HubSpot Marketing API
4. Rate limiting middleware -- Upstash Redis on all external-facing API routes
5. Content approval queue -- admin can review before any content goes live
6. @COMMUNICATOR extended -- channel-specific formatting for all 4 outputs
7. Inngest pipeline extended -- distribution step added after content generation
8. New API routes -- /api/content/distribute, /api/content/approve

### What does NOT get built in this version:
- Member onboarding flow (v0.7.0 Compass)
- @SAGE classification updates (v0.7.0)
- HubSpot contact creation (v0.7.0)
- Twilio/WhatsApp distribution (v0.7.0)
- Any frontend changes (frontend sprint is complete)

---

## SECTION 2: PRISMA SCHEMA ADDITIONS

Add these models to apps/api/prisma/schema.prisma.
Do NOT modify existing models -- append only.

```prisma
// @version 0.6.0 - Beacon

model ContentApprovalQueue {
  id              String        @id @default(cuid())
  submissionId    String        @map("submission_id")
  submission      ContentSubmission @relation(fields: [submissionId], references: [id])
  eventId         String        @map("event_id")
  event           FeastEvent    @relation(fields: [eventId], references: [id])
  channel         ContentChannel
  generatedBody   String        @map("generated_body")
  generatedTitle  String?       @map("generated_title")
  imageUrl        String?       @map("image_url")
  metadata        Json?
  status          ApprovalStatus @default(PENDING)
  reviewedBy      String?       @map("reviewed_by")
  reviewedAt      DateTime?     @map("reviewed_at")
  rejectionReason String?       @map("rejection_reason")
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  @@map("content_approval_queue")
}

enum ApprovalStatus {
  PENDING
  APPROVED
  REJECTED
  PUBLISHED
}

model DistributionLog {
  id          String    @id @default(cuid())
  eventId     String    @map("event_id")
  channel     ContentChannel
  target      String                    // instagram, hubspot_list_id, circle_space_id
  status      String                    // success, failed, skipped
  externalId  String?   @map("external_id")
  externalUrl String?   @map("external_url")
  error       String?
  triggeredBy String    @map("triggered_by")
  createdAt   DateTime  @default(now()) @map("created_at")

  @@map("distribution_logs")
}
```

After adding these models:
1. Run: npx prisma migrate dev --name add_beacon_models
2. Run: npx prisma validate
3. Run: pnpm typecheck
All must pass before continuing.

---

## SECTION 3: SHARED TYPES

Add to packages/shared/src/types/distribution.ts (NEW FILE):

```typescript
// @version 0.6.0 - Beacon

export type DistributionChannel =
  | 'instagram'
  | 'hubspot_email'
  | 'circle_public'
  | 'circle_tier'
  | 'crm_regional';

export interface DistributionTarget {
  channel: DistributionChannel;
  targetId?: string;     // circle space ID, hubspot list ID, etc.
  metadata?: Record<string, unknown>;
}

// From workflow PDF:
// Open event  → instagram + mailing_list + circle_public
// Closed event → circle_tier + crm_regional
export function getDistributionTargets(
  eventVisibility: 'public' | 'commons' | 'kitchen' | 'founding_table'
): DistributionTarget[] {
  if (eventVisibility === 'public') {
    return [
      { channel: 'instagram' },
      { channel: 'hubspot_email' },
      { channel: 'circle_public' },
    ];
  }
  return [
    { channel: 'circle_tier' },
    { channel: 'crm_regional' },
  ];
}

export interface DistributionResult {
  channel: DistributionChannel;
  success: boolean;
  externalId?: string;
  externalUrl?: string;
  error?: string;
}

export interface ApprovalQueueItem {
  id: string;
  submissionId: string;
  eventId: string;
  channel: string;
  generatedBody: string;
  generatedTitle?: string;
  imageUrl?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';
  createdAt: Date;
}
```

Export from packages/shared/src/types/index.ts barrel.

---

## SECTION 4: RATE LIMITING MIDDLEWARE

Create apps/api/src/lib/rateLimit.ts:

```typescript
// @version 0.6.0 - Beacon
// Upstash Redis rate limiting for all external-facing routes

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

// Singleton Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Three tiers of rate limiting
export const rateLimiters = {
  // Standard API routes: 60 requests per minute per IP
  standard: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    analytics: true,
    prefix: 'feast:standard',
  }),

  // Content distribution: 10 per minute (expensive operations)
  distribution: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: true,
    prefix: 'feast:distribution',
  }),

  // Webhooks: 100 per minute (Twilio/Circle can be chatty)
  webhook: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
    prefix: 'feast:webhook',
  }),
};

export async function applyRateLimit(
  req: NextRequest,
  tier: keyof typeof rateLimiters = 'standard'
): Promise<NextResponse | null> {
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const { success, limit, remaining, reset } = await rateLimiters[tier].limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', code: 'RATE_LIMITED' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        },
      }
    );
  }
  return null; // null = not rate limited, proceed
}
```

Install required packages:
```bash
pnpm --filter api add @upstash/ratelimit @upstash/redis
```

---

## SECTION 5: INSTAGRAM ADAPTER EXTENSION

Extend apps/api/src/integrations/instagram/adapter.ts.
The file may not exist yet -- check first. If it doesn't, create it.

```typescript
// @version 0.6.0 - Beacon
// Instagram Graph API adapter
// Docs: https://developers.facebook.com/docs/instagram-api/

import { BaseAdapter } from '@feast-ai/shared/types/adapter';

interface InstagramPost {
  imageUrl: string;    // must be a public URL
  caption: string;
}

interface InstagramPublishResult {
  postId: string;
  permalink?: string;
}

export class InstagramAdapter implements BaseAdapter {
  name = 'instagram';
  private accessToken: string;
  private igUserId: string;
  private baseUrl = 'https://graph.facebook.com/v19.0';

  constructor() {
    this.accessToken = process.env.INSTAGRAM_ACCESS_TOKEN!;
    this.igUserId = process.env.INSTAGRAM_USER_ID!;
  }

  async healthCheck(): Promise<{ connected: boolean; latency_ms: number }> {
    const start = Date.now();
    try {
      const res = await fetch(
        `${this.baseUrl}/${this.igUserId}?fields=id,username&access_token=${this.accessToken}`
      );
      return { connected: res.ok, latency_ms: Date.now() - start };
    } catch {
      return { connected: false, latency_ms: Date.now() - start };
    }
  }

  // Step 1: Create media container
  async createContainer(post: InstagramPost): Promise<string> {
    const res = await fetch(
      `${this.baseUrl}/${this.igUserId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: post.imageUrl,
          caption: post.caption,
          access_token: this.accessToken,
        }),
      }
    );
    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Instagram container creation failed: ${JSON.stringify(err)}`);
    }
    const data = await res.json();
    return data.id; // containerId
  }

  // Step 2: Publish the container
  async publishContainer(containerId: string): Promise<InstagramPublishResult> {
    const res = await fetch(
      `${this.baseUrl}/${this.igUserId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: this.accessToken,
        }),
      }
    );
    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Instagram publish failed: ${JSON.stringify(err)}`);
    }
    const data = await res.json();
    return { postId: data.id };
  }

  // Combined: create + publish in one call
  async post(content: InstagramPost): Promise<InstagramPublishResult> {
    const containerId = await this.createContainer(content);
    // Instagram requires a brief wait between create and publish
    await new Promise(resolve => setTimeout(resolve, 2000));
    return this.publishContainer(containerId);
  }
}

export const instagramAdapter = new InstagramAdapter();
```

Add to .env.example:
```
INSTAGRAM_ACCESS_TOKEN=         # v0.6.0
INSTAGRAM_USER_ID=              # v0.6.0 - numeric IG user ID
```

---

## SECTION 6: HUBSPOT EMAIL ADAPTER EXTENSION

Extend apps/api/src/integrations/hubspot/adapter.ts.
Add email sending capability alongside existing contact methods.

Add these methods to the existing HubSpot adapter class:

```typescript
// @version 0.6.0 - Beacon - ADD to existing HubSpotAdapter class

  // Send a transactional email to a contact
  async sendTransactionalEmail(params: {
    emailId: number;          // HubSpot email template ID
    to: string;               // recipient email
    contactProperties?: Record<string, string>;
  }): Promise<{ success: boolean; statusCode?: number }> {
    const res = await fetch(
      'https://api.hubspot.com/marketing/v3/transactional/single-email/send',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          emailId: params.emailId,
          message: { to: params.to },
          contactProperties: params.contactProperties ?? {},
        }),
      }
    );
    return { success: res.ok, statusCode: res.status };
  }

  // Send to a list (marketing email blast)
  async sendToList(params: {
    listId: string;
    subject: string;
    body: string;           // HTML
    fromName: string;
    fromEmail: string;
  }): Promise<{ success: boolean; campaignId?: string }> {
    // HubSpot single-send API for list-based sends
    const res = await fetch(
      'https://api.hubspot.com/marketing/v3/emails/send',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          listId: params.listId,
          subject: params.subject,
          body: params.body,
          from: { name: params.fromName, email: params.fromEmail },
        }),
      }
    );
    const data = await res.json();
    return { success: res.ok, campaignId: data.id };
  }
```

---

## SECTION 7: DISTRIBUTION SERVICE

Create apps/api/src/services/distribution.ts (NEW FILE):

```typescript
// @version 0.6.0 - Beacon
// Orchestrates content distribution across all channels
// Called by Inngest pipeline after content is approved

import { instagramAdapter } from '../integrations/instagram/adapter';
import { hubspotAdapter } from '../integrations/hubspot/adapter';
import { circleAdapter } from '../integrations/circle/adapter';
import { prisma } from '../lib/db';
import type { DistributionTarget, DistributionResult } from '@feast-ai/shared/types/distribution';
import type { ContentChannel } from '@prisma/client';

export async function distributeContent(params: {
  approvalQueueId: string;
  targets: DistributionTarget[];
  triggeredBy: string;
}): Promise<DistributionResult[]> {
  const { approvalQueueId, targets, triggeredBy } = params;

  const queueItem = await prisma.contentApprovalQueue.findUnique({
    where: { id: approvalQueueId },
    include: { event: true, submission: true },
  });

  if (!queueItem) throw new Error(`Queue item ${approvalQueueId} not found`);
  if (queueItem.status !== 'APPROVED') {
    throw new Error(`Queue item ${approvalQueueId} is not approved (status: ${queueItem.status})`);
  }

  const results: DistributionResult[] = [];

  for (const target of targets) {
    let result: DistributionResult = { channel: target.channel, success: false };

    try {
      switch (target.channel) {
        case 'instagram': {
          if (!queueItem.imageUrl) {
            result.error = 'No image URL — Instagram requires an image';
            break;
          }
          const post = await instagramAdapter.post({
            imageUrl: queueItem.imageUrl,
            caption: queueItem.generatedBody,
          });
          result = { channel: 'instagram', success: true, externalId: post.postId };
          break;
        }

        case 'hubspot_email': {
          const send = await hubspotAdapter.sendToList({
            listId: process.env.HUBSPOT_COMMUNITY_LIST_ID!,
            subject: queueItem.generatedTitle ?? queueItem.event.name,
            body: queueItem.generatedBody,
            fromName: 'The Feast',
            fromEmail: process.env.FEAST_FROM_EMAIL ?? 'hello@feastongood.com',
          });
          result = { channel: 'hubspot_email', success: send.success };
          break;
        }

        case 'circle_public': {
          const post = await circleAdapter.createPost({
            spaceId: process.env.CIRCLE_PUBLIC_SPACE_ID!,
            title: queueItem.generatedTitle ?? queueItem.event.name,
            body: queueItem.generatedBody,
          });
          result = { channel: 'circle_public', success: true, externalId: post.postId };
          break;
        }

        case 'circle_tier': {
          const spaceId = getTierSpaceId(queueItem.event.communityTier);
          const post = await circleAdapter.createPost({
            spaceId,
            title: queueItem.generatedTitle ?? queueItem.event.name,
            body: queueItem.generatedBody,
          });
          result = { channel: 'circle_tier', success: true, externalId: post.postId };
          break;
        }

        case 'crm_regional': {
          // Regional list send — use event city to determine list
          const listId = await getRegionalListId(queueItem.event.city);
          if (!listId) {
            result.error = `No HubSpot list found for city: ${queueItem.event.city}`;
            break;
          }
          const send = await hubspotAdapter.sendToList({
            listId,
            subject: queueItem.generatedTitle ?? queueItem.event.name,
            body: queueItem.generatedBody,
            fromName: 'The Feast',
            fromEmail: process.env.FEAST_FROM_EMAIL ?? 'hello@feastongood.com',
          });
          result = { channel: 'crm_regional', success: send.success };
          break;
        }
      }
    } catch (err) {
      result = {
        channel: target.channel,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    // Log every attempt regardless of success/failure
    await prisma.distributionLog.create({
      data: {
        eventId: queueItem.eventId,
        channel: result.channel.toUpperCase() as ContentChannel,
        target: target.targetId ?? target.channel,
        status: result.success ? 'success' : 'failed',
        externalId: result.externalId,
        externalUrl: result.externalUrl,
        error: result.error,
        triggeredBy,
      },
    });

    results.push(result);
  }

  // Update approval queue status
  const allSucceeded = results.every(r => r.success);
  await prisma.contentApprovalQueue.update({
    where: { id: approvalQueueId },
    data: { status: allSucceeded ? 'PUBLISHED' : 'APPROVED' },
  });

  return results;
}

// Maps CommunityTier to Circle space ID
function getTierSpaceId(tier: string): string {
  const map: Record<string, string> = {
    kitchen:         process.env.CIRCLE_KITCHEN_SPACE_ID ?? '',
    founding_table:  process.env.CIRCLE_FOUNDING_TABLE_SPACE_ID ?? '',
    commons:         process.env.CIRCLE_PUBLIC_SPACE_ID ?? '',
  };
  return map[tier] ?? process.env.CIRCLE_PUBLIC_SPACE_ID ?? '';
}

// Maps city name to HubSpot regional list ID
// Stored in env vars for now — move to DB in v0.7.0
async function getRegionalListId(city: string): Promise<string | null> {
  const cityKey = city.toLowerCase().replace(/[^a-z]/g, '_');
  return process.env[`HUBSPOT_LIST_${cityKey.toUpperCase()}`] ?? null;
}
```

Add to .env.example:
```
# Distribution
CIRCLE_PUBLIC_SPACE_ID=           # v0.6.0
CIRCLE_KITCHEN_SPACE_ID=          # v0.6.0
CIRCLE_FOUNDING_TABLE_SPACE_ID=   # v0.6.0
HUBSPOT_COMMUNITY_LIST_ID=        # v0.6.0
HUBSPOT_LIST_BROOKLYN=            # v0.6.0 - one per active city
FEAST_FROM_EMAIL=hello@feastongood.com
```

---

## SECTION 8: NEW API ROUTES

### POST /api/content/approve

Create apps/api/src/app/api/content/approve/route.ts:

```typescript
// @version 0.6.0 - Beacon
// Admin approves or rejects a content queue item

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { applyRateLimit } from '@/lib/rateLimit';
import { z } from 'zod';

const ApproveSchema = z.object({
  queueItemId: z.string(),
  action: z.enum(['approve', 'reject']),
  rejectionReason: z.string().optional(),
  editedBody: z.string().optional(),  // host may edit before approving
});

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, 'standard');
  if (limited) return limited;

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = ApproveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { queueItemId, action, rejectionReason, editedBody } = parsed.data;

  const item = await prisma.contentApprovalQueue.findUnique({
    where: { id: queueItemId },
  });

  if (!item) {
    return NextResponse.json({ error: 'Queue item not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  if (item.status !== 'PENDING') {
    return NextResponse.json(
      { error: `Item already ${item.status.toLowerCase()}`, code: 'ALREADY_PROCESSED' },
      { status: 409 }
    );
  }

  const updated = await prisma.contentApprovalQueue.update({
    where: { id: queueItemId },
    data: {
      status: action === 'approve' ? 'APPROVED' : 'REJECTED',
      reviewedBy: userId,
      reviewedAt: new Date(),
      rejectionReason: action === 'reject' ? rejectionReason : null,
      generatedBody: editedBody ?? item.generatedBody,
    },
  });

  // If approved, trigger distribution via Inngest
  if (action === 'approve') {
    const { inngest } = await import('@/lib/inngest');
    await inngest.send({
      name: 'content/approved',
      data: { queueItemId: updated.id, approvedBy: userId },
    });
  }

  return NextResponse.json({ success: true, item: updated });
}
```

### POST /api/content/distribute

Create apps/api/src/app/api/content/distribute/route.ts:

```typescript
// @version 0.6.0 - Beacon
// Manually trigger distribution for an approved queue item
// Used by admin dashboard for re-distribution or retry

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { applyRateLimit } from '@/lib/rateLimit';
import { distributeContent } from '@/services/distribution';
import { getDistributionTargets } from '@feast-ai/shared/types/distribution';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const DistributeSchema = z.object({
  queueItemId: z.string(),
});

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, 'distribution');
  if (limited) return limited;

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = DistributeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const item = await prisma.contentApprovalQueue.findUnique({
    where: { id: parsed.data.queueItemId },
    include: { event: true },
  });

  if (!item) {
    return NextResponse.json({ error: 'Queue item not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  const targets = getDistributionTargets(item.event.communityTier as any);

  const results = await distributeContent({
    approvalQueueId: item.id,
    targets,
    triggeredBy: userId,
  });

  return NextResponse.json({ success: true, results });
}
```

---

## SECTION 9: INNGEST PIPELINE EXTENSION

Extend the existing content pipeline in apps/api/src/inngest/functions/.
Find the existing content-submitted pipeline and add a distribution step after READY_FOR_REVIEW.

Add a new Inngest function for the content/approved event:

Create apps/api/src/inngest/functions/content-approved.ts:

```typescript
// @version 0.6.0 - Beacon
// Triggered when admin approves content in the approval queue
// Runs distribution to all appropriate channels

import { inngest } from '../client';
import { prisma } from '../../lib/db';
import { distributeContent } from '../../services/distribution';
import { getDistributionTargets } from '@feast-ai/shared/types/distribution';

export const contentApprovedPipeline = inngest.createFunction(
  {
    id: 'content-approved-pipeline',
    name: 'Content Approved — Distribute',
    retries: 3,
  },
  { event: 'content/approved' },
  async ({ event, step }) => {
    const { queueItemId, approvedBy } = event.data;

    // Step 1: Fetch queue item + event
    const queueItem = await step.run('fetch-queue-item', async () => {
      return prisma.contentApprovalQueue.findUnique({
        where: { id: queueItemId },
        include: { event: true },
      });
    });

    if (!queueItem) throw new Error(`Queue item ${queueItemId} not found`);

    // Step 2: Determine distribution targets from event visibility
    const targets = getDistributionTargets(
      queueItem.event.communityTier as any
    );

    // Step 3: Distribute to all channels
    const results = await step.run('distribute-content', async () => {
      return distributeContent({
        approvalQueueId: queueItemId,
        targets,
        triggeredBy: approvedBy,
      });
    });

    // Step 4: Log summary
    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return {
      queueItemId,
      channels: results.length,
      succeeded,
      failed,
      results,
    };
  }
);
```

Register this function in the Inngest serve route alongside existing functions.

---

## SECTION 10: EXECUTION ORDER

Execute in this exact sequence. Stop and report after each step.

```
STEP 1: Schema + migration
  - Add ContentApprovalQueue and DistributionLog to schema.prisma
  - Run: npx prisma migrate dev --name add_beacon_models
  - Run: npx prisma validate
  - Run: pnpm typecheck
  - Report: migration output + typecheck result

STEP 2: Packages + shared types
  - Install @upstash/ratelimit @upstash/redis in apps/api
  - Create packages/shared/src/types/distribution.ts
  - Export from barrel
  - Run: pnpm typecheck (4/4 packages)
  - Report: installed packages + typecheck result

STEP 3: Rate limiting
  - Create apps/api/src/lib/rateLimit.ts
  - Run: pnpm typecheck
  - Report: file created, typecheck result

STEP 4: Adapters
  - Create/extend apps/api/src/integrations/instagram/adapter.ts
  - Extend apps/api/src/integrations/hubspot/adapter.ts (add email methods)
  - Run: pnpm typecheck
  - Report: what existed vs what was added, typecheck result

STEP 5: Distribution service
  - Create apps/api/src/services/distribution.ts
  - Run: pnpm typecheck
  - Report: file created, typecheck result

STEP 6: API routes
  - Create /api/content/approve/route.ts
  - Create /api/content/distribute/route.ts
  - Apply rate limiting to both
  - Run: pnpm typecheck + pnpm lint
  - Report: routes created, typecheck + lint result

STEP 7: Inngest function
  - Create apps/api/src/inngest/functions/content-approved.ts
  - Register in Inngest serve route
  - Run: pnpm typecheck + pnpm lint
  - Report: function registered, typecheck result

STEP 8: .env.example
  - Add all new env var keys from Sections 5, 6, 7
  - Do NOT add real values — placeholders only
  - Report: keys added

STEP 9: Final verification
  - pnpm typecheck (4/4 packages, 0 errors)
  - pnpm lint (4/4 packages, 0 warnings)
  - npx prisma validate
  - next build (apps/web must still be clean)
  - Report full output of all four

STEP 10: CHANGELOG + CONTRACT
  - Update docs/CHANGELOG.md with v0.6.0 entry
  - Confirm CONTRACT.md shows CURRENT_VERSION=0.6.0
  - Report: changelog entry written
```

---

## SECTION 11: v0.6.0 DEFINITION OF DONE

Before declaring v0.6.0 complete, all of these must be true:

- [ ] pnpm typecheck: 4/4 packages, 0 errors
- [ ] pnpm lint: 4/4 packages, 0 warnings
- [ ] npx prisma validate: passes
- [ ] next build: 13/13 static pages, 0 errors
- [ ] ContentApprovalQueue model exists in DB
- [ ] DistributionLog model exists in DB
- [ ] Rate limiting active on /api/content/approve and /api/content/distribute
- [ ] Instagram adapter can createContainer + publishContainer
- [ ] HubSpot adapter can sendToList
- [ ] distributeContent() routes correctly for open vs closed events
- [ ] content/approved Inngest function registered and visible in Inngest dashboard
- [ ] All new env vars documented in .env.example
- [ ] CHANGELOG.md updated
- [ ] Git tagged as v0.6.0

---

END OF BEACON BLUEPRINT v0.6.0
