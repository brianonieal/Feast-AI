# FEAST-AI v1.1.0 EMBER BLUEPRINT
# Codename: Ember
# Architect: Claude Sonnet 4.6 (chat)
# Executor: Claude Opus 4.6 (Claude Code)
# Date: March 2026
# Scope: Resilience -- circuit breakers, retry logic, dead letter queue, graceful degradation

---

## OPUS BOOT INSTRUCTIONS

Read in this order before writing a single line of code:
1. docs/blueprints/CONTRACT.md
2. docs/CHANGELOG.md (last 10 entries)
3. docs/blueprints/TECH_STACK.md
4. This file (EMBER_BLUEPRINT_v1.1.0.md) in full

Then run the health check:
  pnpm typecheck
  pnpm lint
  npx prisma validate

All three must pass before writing any code.
Current version: 1.1.0
Sacred Rule: Do not build anything from v1.2.0 or later.

---

## SECTION 1: SCOPE

v1.1.0 Ember makes the system resilient.
No new features. No new pages. No new agents.
Everything that exists gets hardened.

### What gets built:
1. CircuitBreaker class -- generic, reusable, in packages/shared
2. FailedJob model -- dead letter queue in DB
3. Circuit breakers applied to: Resend, Twilio webhook
4. Enhanced Inngest retry logic -- exponential backoff on all 5 functions
5. Dead letter queue -- exhausted jobs saved to FailedJob table
6. Inngest scheduled function -- retry failed jobs (runs every 15 min)
7. GET /api/admin/system/failed-jobs -- view dead letter queue
8. Admin page update -- failed jobs count badge on Agents nav item
9. Graceful degradation -- all API routes return partial success on service failure

### What does NOT change:
- No schema changes to existing models
- No frontend page additions (one small nav badge only)
- No new Council agents
- No new API features

---

## SECTION 2: PRISMA SCHEMA ADDITION

Add ONE model to apps/api/prisma/schema.prisma:

```prisma
// @version 1.1.0 - Ember

model FailedJob {
  id            String   @id @default(cuid())
  inngestJobId  String?  @map("inngest_job_id")
  functionId    String   @map("function_id")    // e.g. "application-submitted-pipeline"
  eventName     String   @map("event_name")     // e.g. "application/submitted"
  payload       Json                             // the original event data
  error         String                           // last error message
  attempts      Int      @default(1)            // how many times it was tried
  exhausted     Boolean  @default(true)         // true = all retries used up
  resolvedAt    DateTime? @map("resolved_at")   // set when manually resolved
  resolvedBy    String?   @map("resolved_by")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@index([functionId, createdAt])
  @@index([exhausted, createdAt])
  @@map("failed_jobs")
}
```

After adding:
  npx prisma migrate dev --name add_failed_jobs
  npx prisma validate
  pnpm typecheck

---

## SECTION 3: CIRCUIT BREAKER

Create packages/shared/src/lib/circuitBreaker.ts (NEW FILE):

```typescript
// @version 1.1.0 - Ember
// Generic circuit breaker -- use to wrap any external service call
//
// States:
//   CLOSED   -- normal operation, calls pass through
//   OPEN     -- tripped, calls fail fast without hitting the service
//   HALF_OPEN -- testing recovery, one call allowed through
//
// Usage:
//   const breaker = new CircuitBreaker('resend', { failureThreshold: 3, recoveryTimeout: 60_000 })
//   const result = await breaker.call(() => resend.emails.send(...))

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number;    // trips after N consecutive failures (default: 3)
  recoveryTimeout: number;     // ms before attempting recovery (default: 60_000)
  halfOpenMaxAttempts: number; // test calls in half-open state (default: 1)
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  recoveryTimeout: 60_000,
  halfOpenMaxAttempts: 1,
};

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private lastFailureTime = 0;
  private halfOpenAttempts = 0;
  private readonly config: CircuitBreakerConfig;
  readonly name: string;

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.name = name;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  getState(): CircuitState { return this.state; }
  getFailures(): number { return this.failures; }

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.config.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        this.halfOpenAttempts = 0;
        console.log(`[CircuitBreaker:${this.name}] → HALF_OPEN (testing recovery)`);
      } else {
        throw new Error(
          `[CircuitBreaker:${this.name}] OPEN — service unavailable. ` +
          `Retrying in ${Math.round((this.config.recoveryTimeout - elapsed) / 1000)}s`
        );
      }
    }

    if (this.state === 'HALF_OPEN') {
      if (this.halfOpenAttempts >= this.config.halfOpenMaxAttempts) {
        throw new Error(`[CircuitBreaker:${this.name}] HALF_OPEN — max test attempts reached`);
      }
      this.halfOpenAttempts++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      console.log(`[CircuitBreaker:${this.name}] → CLOSED (recovered)`);
    }
    this.state = 'CLOSED';
    this.failures = 0;
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN' || this.failures >= this.config.failureThreshold) {
      this.state = 'OPEN';
      console.error(
        `[CircuitBreaker:${this.name}] → OPEN after ${this.failures} failure(s). ` +
        `Recovery in ${this.config.recoveryTimeout / 1000}s`
      );
    }
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.halfOpenAttempts = 0;
  }
}

// Registry -- singleton breakers per service name
// Prevents creating multiple breakers for the same service
const registry = new Map<string, CircuitBreaker>();

export function getBreaker(
  name: string,
  config?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  if (!registry.has(name)) {
    registry.set(name, new CircuitBreaker(name, config));
  }
  return registry.get(name)!;
}

export function getAllBreakerStates(): Record<string, { state: CircuitState; failures: number }> {
  const result: Record<string, { state: CircuitState; failures: number }> = {};
  registry.forEach((breaker, name) => {
    result[name] = { state: breaker.getState(), failures: breaker.getFailures() };
  });
  return result;
}
```

Export from packages/shared/src/index.ts:
  export { CircuitBreaker, getBreaker, getAllBreakerStates } from './lib/circuitBreaker';
  export type { CircuitState, CircuitBreakerConfig } from './lib/circuitBreaker';

NOTE: packages/shared/src/lib/ may not exist yet.
Create the directory if needed.

---

## SECTION 4: APPLY CIRCUIT BREAKERS TO ADAPTERS

### 4.1 Resend adapter

Update apps/api/src/integrations/resend/adapter.ts.
Wrap the resend.emails.send() call with a circuit breaker:

```typescript
// Add at top of file (after imports):
import { getBreaker } from '@feast-ai/shared';

// Wrap the send call inside sendWelcomeEmail():
// BEFORE:
//   const result = await resend.emails.send({ ... })
// AFTER:
const breaker = getBreaker('resend', { failureThreshold: 3, recoveryTimeout: 60_000 });
try {
  const result = await breaker.call(() =>
    resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: params.to,
      subject: content.subject,
      html: content.html(params.variables),
    })
  );
  return { success: true, id: result.data?.id };
} catch (err) {
  const error = err instanceof Error ? err.message : String(err);
  // Circuit open or send failed -- log and return graceful failure
  console.error(`[Resend] ${error}`);
  return { success: false, error };
}
```

### 4.2 Twilio webhook handler

Update apps/api/src/app/api/webhooks/twilio/route.ts.
The @SAGE call inside the webhook handler should be wrapped
so a Claude API failure doesn't crash the webhook response.

Wrap the @SAGE classification call:
```typescript
// Wrap the sage call in try/catch with graceful fallback:
let sageResponse = 'Thank you for your message. We\'ll be in touch soon.';
try {
  sageResponse = await classifyAndRespond(body, userId);
} catch (err) {
  console.error('[Twilio webhook] @SAGE failed:', err);
  // Graceful degradation -- send a default response, don't crash
}
```

---

## SECTION 5: DEAD LETTER QUEUE SERVICE

Create apps/api/src/services/deadLetter.ts:

```typescript
// @version 1.1.0 - Ember
// Dead letter queue -- saves exhausted Inngest jobs for manual review

import { db } from '../lib/db';

export interface FailedJobInput {
  inngestJobId?: string;
  functionId: string;
  eventName: string;
  payload: Record<string, unknown>;
  error: string;
  attempts: number;
}

export async function saveFailedJob(input: FailedJobInput): Promise<void> {
  try {
    await db.failedJob.create({
      data: {
        inngestJobId: input.inngestJobId,
        functionId: input.functionId,
        eventName: input.eventName,
        payload: input.payload,
        error: input.error,
        attempts: input.attempts,
        exhausted: true,
      },
    });
    console.error(
      `[DeadLetter] Job saved: ${input.functionId} after ${input.attempts} attempts. ` +
      `Error: ${input.error}`
    );
  } catch (err) {
    // Never let dead letter logging crash the process
    console.error('[DeadLetter] Failed to save job:', err);
  }
}

export async function resolveFailedJob(
  jobId: string,
  resolvedBy: string
): Promise<void> {
  await db.failedJob.update({
    where: { id: jobId },
    data: { resolvedAt: new Date(), resolvedBy, exhausted: false },
  });
}

export async function getFailedJobs(limit = 50) {
  return db.failedJob.findMany({
    where: { exhausted: true, resolvedAt: null },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function getFailedJobCount(): Promise<number> {
  return db.failedJob.count({
    where: { exhausted: true, resolvedAt: null },
  });
}
```

---

## SECTION 6: ENHANCED INNGEST RETRY LOGIC

Update ALL 5 existing Inngest functions with:
1. Explicit retry configuration
2. Dead letter queue on final failure
3. Exponential backoff note (Inngest handles this automatically)

### Pattern to apply to every function:

```typescript
// BEFORE (all functions currently have):
retries: 3,

// AFTER -- explicit retry config + dead letter on exhaustion:
retries: 3,
onFailure: async ({ event, error, attempt }) => {
  // Called after all retries are exhausted
  await saveFailedJob({
    functionId: '[function-id-here]',
    eventName: event.name,
    payload: event.data as Record<string, unknown>,
    error: error.message,
    attempts: attempt,
  });
},
```

Apply this pattern to all 5 functions:
1. event-created.ts          → functionId: 'event-created-pipeline'
2. content-submitted.ts      → functionId: 'content-submitted-pipeline'
3. content-approved.ts       → functionId: 'content-approved-pipeline'
4. application-submitted.ts  → functionId: 'application-submitted-pipeline'
5. daily-cost-report.ts      → functionId: 'daily-cost-report'

Import saveFailedJob in each:
  import { saveFailedJob } from '../../services/deadLetter';

---

## SECTION 7: RETRY FAILED JOBS FUNCTION

Create apps/api/src/inngest/functions/retry-failed-jobs.ts:

```typescript
// @version 1.1.0 - Ember
// Runs every 15 minutes -- retries failed jobs that haven't been
// manually resolved. Only retries jobs created in the last 24 hours.

import { inngest } from '../client';
import { db } from '../../lib/db';

export const retryFailedJobsFunction = inngest.createFunction(
  {
    id: 'retry-failed-jobs',
    name: 'Retry Failed Jobs — @GUARDIAN',
    retries: 0,   // do not retry the retry function itself
  },
  { cron: '*/15 * * * *' },   // every 15 minutes
  async ({ step }) => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const jobs = await step.run('fetch-failed-jobs', async () => {
      return db.failedJob.findMany({
        where: {
          exhausted: true,
          resolvedAt: null,
          createdAt: { gte: cutoff },
        },
        orderBy: { createdAt: 'asc' },
        take: 10,   // process 10 at a time
      });
    });

    if (jobs.length === 0) {
      return { retried: 0 };
    }

    let retried = 0;

    for (const job of jobs) {
      await step.run(`retry-${job.id}`, async () => {
        try {
          // Re-send the original event to Inngest
          await inngest.send({
            name: job.eventName as string,
            data: job.payload as Record<string, unknown>,
          });

          // Mark as resolved (being retried)
          await db.failedJob.update({
            where: { id: job.id },
            data: {
              resolvedAt: new Date(),
              resolvedBy: 'auto-retry',
              exhausted: false,
            },
          });

          retried++;
        } catch (err) {
          console.error(`[RetryFailedJobs] Failed to retry job ${job.id}:`, err);
        }
      });
    }

    return { retried, total: jobs.length };
  }
);
```

Register in inngest/index.ts and serve route.
Total functions after this step: 6

---

## SECTION 8: NEW API ROUTE

Create apps/api/src/app/api/admin/system/failed-jobs/route.ts:

```typescript
// @version 1.1.0 - Ember
// Returns failed jobs for admin review
// POST with { jobId } to manually resolve a job

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { applyRateLimit } from '@/lib/rateLimit';
import { getFailedJobs, resolveFailedJob, getFailedJobCount } from '@/services/deadLetter';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, 'standard');
  if (limited) return limited;

  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const tier = (sessionClaims?.publicMetadata as { tier?: string })?.tier;
  if (tier !== 'founding_table') {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
  }

  const jobs = await getFailedJobs(50);
  const count = await getFailedJobCount();

  return NextResponse.json({ success: true, jobs, count });
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, 'standard');
  if (limited) return limited;

  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const tier = (sessionClaims?.publicMetadata as { tier?: string })?.tier;
  if (tier !== 'founding_table') {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
  }

  const body = await req.json() as unknown;
  const parsed = z.object({ jobId: z.string() }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', code: 'VALIDATION_ERROR' }, { status: 400 });
  }

  await resolveFailedJob(parsed.data.jobId, userId);
  return NextResponse.json({ success: true });
}
```

---

## SECTION 9: GRACEFUL DEGRADATION

Apply this pattern to all API routes that call external services.
The principle: a service failure should never return 500 to the client.
Instead return a partial success with a warning.

### Routes to update:

**POST /api/applications/route.ts**
The Inngest send is already in a try/catch from v0.7.0.
Verify it returns `{ success: true, pipelineQueued: false, warning: '...' }`
on Inngest failure. If not, fix it.

**POST /api/onboarding/classify/route.ts**
Wrap processOnboarding() in try/catch:
```typescript
try {
  const result = await processOnboarding({ ... });
  return NextResponse.json({ success: true, ...result });
} catch (err) {
  // Classification failed -- return graceful response
  console.error('[/api/onboarding/classify] Failed:', err);
  return NextResponse.json({
    success: true,
    intent: 'newsletter',
    confidence: 0,
    nextStep: 'Stay connected via newsletter',
    emailSent: false,
    degraded: true,
  });
}
```

**POST /api/content/approve/route.ts**
Inngest send is already try/caught. Verify.

### Admin routes:
All admin routes query the DB directly -- no external services.
No changes needed.

---

## SECTION 10: ADMIN NAV BADGE (small frontend change)

Update apps/web/src/components/admin/AdminSidebar.tsx.

Add a failed jobs count badge on the "Agents" nav item.
This is the only frontend change in v1.1.0.

```typescript
// In AdminSidebar.tsx, fetch failed job count on mount:
const [failedCount, setFailedCount] = useState(0);

useEffect(() => {
  if (user?.tier === 'founding_table') {
    fetch('/api/admin/system/failed-jobs')
      .then(r => r.json())
      .then(d => setFailedCount(d.count ?? 0))
      .catch(() => {})  // silent fail -- badge is non-critical
  }
}, [user?.tier])

// On the Agents nav item, add a badge if failedCount > 0:
{failedCount > 0 && (
  <span className="ml-auto bg-coral text-white text-[9px] font-medium
                   px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
    {failedCount > 99 ? '99+' : failedCount}
  </span>
)}
```

---

## SECTION 11: EXECUTION ORDER

```
STEP 1: Schema + migration
  - Add FailedJob model to schema.prisma
  - npx prisma migrate dev --name add_failed_jobs
  - npx prisma validate + pnpm typecheck
  - Report: migration output

STEP 2: CircuitBreaker (packages/shared)
  - Create packages/shared/src/lib/ directory
  - Create circuitBreaker.ts
  - Export from packages/shared/src/index.ts
  - pnpm typecheck (4/4)
  - Report: exports, typecheck result

STEP 3: Dead letter service
  - Create apps/api/src/services/deadLetter.ts
  - pnpm typecheck
  - Report: functions exported

STEP 4: Apply circuit breakers
  - Update Resend adapter
  - Update Twilio webhook handler
  - pnpm typecheck + pnpm lint
  - Report: what changed in each file

STEP 5: Enhanced Inngest functions
  - Add onFailure handler to all 5 existing functions
  - Import saveFailedJob in each
  - pnpm typecheck + pnpm lint
  - Report: all 5 functions updated

STEP 6: Retry failed jobs function
  - Create retry-failed-jobs.ts
  - Register in inngest/index.ts + serve route (now 6 functions)
  - Apply ReturnType annotation
  - pnpm typecheck + pnpm lint
  - Report: function ID, cron schedule, total count

STEP 7: New API route
  - Create /api/admin/system/failed-jobs/route.ts
  - pnpm typecheck + pnpm lint
  - next build (API): report route count

STEP 8: Graceful degradation
  - Review + update /api/applications
  - Update /api/onboarding/classify
  - Review /api/content/approve
  - pnpm typecheck + pnpm lint

STEP 9: Admin nav badge (frontend)
  - Update AdminSidebar.tsx
  - pnpm typecheck (apps/web)
  - next build (apps/web): confirm page count unchanged

STEP 10: Full verification
  - pnpm typecheck: 4/4 packages, 0 errors
  - pnpm lint: 4/4 packages, 0 warnings
  - npx prisma validate
  - pnpm --filter api build: report route count
  - pnpm --filter web build: report page count
  - npx prisma db push (apply FailedJob table to Supabase)
  - Report full output

STEP 11: CHANGELOG + CONTRACT + tag
  - Write CHANGELOG v1.1.0 entry
  - Update CONTRACT.md:
      CURRENT_VERSION=1.1.0
      CURRENT_CODENAME=Ember
      NEXT_VERSION=1.2.0
      NEXT_CODENAME=Prism
  - git commit -m "feat: v1.1.0 Ember — circuit breakers + retry logic + dead letter queue"
  - git tag v1.1.0
  - git push origin main --tags
  - Report commit hash + tag
```

---

## SECTION 12: v1.1.0 DEFINITION OF DONE

- [ ] pnpm typecheck: 4/4 packages, 0 errors
- [ ] pnpm lint: 4/4 packages, 0 warnings
- [ ] npx prisma validate: passes
- [ ] next build (API + Web): 0 errors
- [ ] FailedJob model in DB (npx prisma db push)
- [ ] CircuitBreaker class exported from packages/shared
- [ ] getBreaker() registry prevents duplicate breakers
- [ ] Resend adapter wrapped with circuit breaker
- [ ] Twilio webhook graceful on @SAGE failure
- [ ] All 5 Inngest functions have onFailure → saveFailedJob
- [ ] retry-failed-jobs function registered (6 total)
- [ ] GET /api/admin/system/failed-jobs returns jobs + count
- [ ] POST /api/admin/system/failed-jobs resolves a job
- [ ] /api/onboarding/classify returns degraded response on failure
- [ ] AdminSidebar shows coral badge when failed jobs > 0
- [ ] CHANGELOG.md updated
- [ ] CONTRACT.md: 1.1.0 Ember / 1.2.0 Prism
- [ ] Git tagged v1.1.0 + pushed

---

END OF EMBER BLUEPRINT v1.1.0
