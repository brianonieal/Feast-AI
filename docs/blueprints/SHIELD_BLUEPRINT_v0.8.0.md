# FEAST-AI v0.8.0 SHIELD BLUEPRINT
# Codename: Shield
# Architect: Claude Sonnet 4.6 (chat)
# Executor: Claude Opus 4.6 (Claude Code)
# Date: March 2026
# Scope: Security + monitoring + @GUARDIAN + Sentry + cost controls

---

## OPUS BOOT INSTRUCTIONS

Read in this order before writing a single line of code:
1. docs/blueprints/CONTRACT.md
2. docs/CHANGELOG.md (last 10 entries)
3. docs/blueprints/TECH_STACK.md
4. docs/blueprints/COUNCIL_AGENTS.md
5. This file (SHIELD_BLUEPRINT_v0.8.0.md) in full

Then run the health check:
  pnpm typecheck
  pnpm lint
  npx prisma validate

All three must pass before writing any code.
Current version: 0.8.0
Sacred Rule: Do not build anything from v0.9.0 or later.

---

## SECTION 1: SCOPE

v0.8.0 Shield builds exactly these things. Nothing more.

### What gets built:
1. @GUARDIAN agent -- cost monitoring, anomaly detection, model downgrade
2. AgentSpendLog model -- tracks per-agent API costs in DB
3. Cost tracking wrapper -- wraps all Anthropic API calls with cost logging
4. Daily cost report -- Inngest scheduled function, runs at midnight
5. Hard spending limits -- auto-downgrade to Haiku when approaching limit
6. Sentry wired into apps/api -- error tracking + performance monitoring
7. Sentry wired into apps/web -- error tracking + performance monitoring
8. API key rotation support -- endpoint to rotate keys without downtime
9. Enhanced rate limiting -- stricter limits on AI-triggering routes

### What does NOT get built in this version:
- Admin dashboard UI (v0.9.0 Lens)
- Any new AI agent capabilities
- Mobile Sentry (deferred)
- Any frontend changes

### Spending limits (confirmed):
- Development: $5.00/day hard limit
- Production: $25.00/day hard limit
- Warning threshold: 80% of limit
- Auto-downgrade: at 90% of limit, all agents switch to claude-haiku-4-5

---

## SECTION 2: PRISMA SCHEMA ADDITIONS

Add to apps/api/prisma/schema.prisma. Append only.

```prisma
// @version 0.8.0 - Shield

model AgentSpendLog {
  id            String   @id @default(cuid())
  agent         String                     // @SAGE, @COORDINATOR, etc.
  model         String                     // claude-sonnet-4-6, etc.
  action        String                     // which tool or operation
  inputTokens   Int      @map("input_tokens")
  outputTokens  Int      @map("output_tokens")
  costUsd       Float    @map("cost_usd")
  durationMs    Int      @map("duration_ms")
  success       Boolean  @default(true)
  error         String?
  correlationId String?  @map("correlation_id")
  environment   String   @default("development")
  createdAt     DateTime @default(now()) @map("created_at")

  @@index([agent, createdAt])
  @@index([createdAt])
  @@map("agent_spend_logs")
}

model DailySpendReport {
  id              String   @id @default(cuid())
  date            DateTime @unique              // date only, no time
  totalCostUsd    Float    @map("total_cost_usd")
  byAgent         Json     @map("by_agent")     // { "@SAGE": 0.12, ... }
  callCount       Int      @map("call_count")
  limitUsd        Float    @map("limit_usd")
  percentUsed     Float    @map("percent_used")
  downgradedAt    DateTime? @map("downgraded_at")
  alertSent       Boolean  @default(false) @map("alert_sent")
  createdAt       DateTime @default(now()) @map("created_at")

  @@map("daily_spend_reports")
}
```

After adding:
1. npx prisma migrate dev --name add_shield_models
2. npx prisma validate
3. pnpm typecheck
All must pass before continuing.

---

## SECTION 3: SHARED TYPES

Add to packages/shared/src/types/guardian.ts (NEW FILE):

```typescript
// @version 0.8.0 - Shield

export type AgentName =
  | '@SAGE'
  | '@COORDINATOR'
  | '@COMMUNICATOR'
  | '@ANALYST'
  | '@STRATEGIST'
  | '@GUARDIAN';

export type ModelName =
  | 'claude-opus-4-6'
  | 'claude-sonnet-4-6'
  | 'claude-haiku-4-5';

// Cost per 1K tokens in USD (as of March 2026)
export const MODEL_COSTS: Record<ModelName, { input: number; output: number }> = {
  'claude-opus-4-6':    { input: 0.015,  output: 0.075  },
  'claude-sonnet-4-6':  { input: 0.003,  output: 0.015  },
  'claude-haiku-4-5':   { input: 0.00025, output: 0.00125 },
};

export function estimateCost(
  model: ModelName,
  inputTokens: number,
  outputTokens: number
): number {
  const costs = MODEL_COSTS[model];
  return (inputTokens / 1000) * costs.input + (outputTokens / 1000) * costs.output;
}

export interface SpendRecord {
  agent: AgentName;
  model: ModelName;
  action: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  success: boolean;
  error?: string;
  correlationId?: string;
}

export interface DailySpendSummary {
  date: string;           // YYYY-MM-DD
  totalCostUsd: number;
  byAgent: Record<string, number>;
  callCount: number;
  limitUsd: number;
  percentUsed: number;
  status: 'normal' | 'warning' | 'critical' | 'downgraded';
}

export const SPEND_LIMITS = {
  development: 5.00,
  production:  25.00,
  warningPct:  0.80,    // 80% -- send alert
  downgradePct: 0.90,   // 90% -- auto-downgrade to Haiku
} as const;
```

Export from packages/shared/src/types/index.ts barrel.

---

## SECTION 4: COST TRACKING WRAPPER

Create apps/api/src/lib/costTracker.ts:

```typescript
// @version 0.8.0 - Shield
// Wraps Anthropic API calls with automatic cost logging
// Use this instead of calling client.messages.create() directly

import Anthropic from '@anthropic-ai/sdk';
import { db } from './db';
import { estimateCost, SPEND_LIMITS } from '@feast-ai/shared/types/guardian';
import type { AgentName, ModelName, SpendRecord } from '@feast-ai/shared/types/guardian';

const client = new Anthropic();

const ENV = (process.env.NODE_ENV ?? 'development') as 'development' | 'production';
const DAILY_LIMIT = ENV === 'production' ? SPEND_LIMITS.production : SPEND_LIMITS.development;

// Current model override -- set by @GUARDIAN when downgrading
let modelOverride: ModelName | null = null;

export function setModelOverride(model: ModelName | null) {
  modelOverride = model;
  if (model) {
    console.warn(`[@GUARDIAN] Model override active: all agents using ${model}`);
  } else {
    console.log('[@GUARDIAN] Model override cleared -- agents using configured models');
  }
}

export function getEffectiveModel(requestedModel: ModelName): ModelName {
  return modelOverride ?? requestedModel;
}

interface TrackedCallParams {
  agent: AgentName;
  model: ModelName;
  action: string;
  correlationId?: string;
  messages: Anthropic.MessageParam[];
  system?: string;
  maxTokens?: number;
  tools?: Anthropic.Tool[];
}

export async function trackedCall(
  params: TrackedCallParams
): Promise<Anthropic.Message> {
  const effectiveModel = getEffectiveModel(params.model);
  const start = Date.now();
  let success = true;
  let error: string | undefined;
  let response: Anthropic.Message | undefined;

  try {
    // Check if today's spend is already at limit before making the call
    const todaySpend = await getTodaySpend();
    if (todaySpend >= DAILY_LIMIT) {
      throw new Error(
        `[@GUARDIAN] Daily spend limit of $${DAILY_LIMIT} reached. ` +
        `Current spend: $${todaySpend.toFixed(4)}. Call blocked.`
      );
    }

    response = await client.messages.create({
      model: effectiveModel,
      max_tokens: params.maxTokens ?? 1024,
      system: params.system,
      messages: params.messages,
      tools: params.tools,
    });

    return response;
  } catch (err) {
    success = false;
    error = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    const durationMs = Date.now() - start;
    const inputTokens  = response?.usage?.input_tokens  ?? 0;
    const outputTokens = response?.usage?.output_tokens ?? 0;
    const costUsd = estimateCost(effectiveModel, inputTokens, outputTokens);

    // Log spend asynchronously -- don't await, don't block the response
    logSpend({
      agent: params.agent,
      model: effectiveModel,
      action: params.action,
      inputTokens,
      outputTokens,
      costUsd,
      durationMs,
      success,
      error,
      correlationId: params.correlationId,
    }).catch((err) => console.error('[@GUARDIAN] Failed to log spend:', err));
  }
}

async function logSpend(record: SpendRecord): Promise<void> {
  await db.agentSpendLog.create({
    data: {
      agent: record.agent,
      model: record.model,
      action: record.action,
      inputTokens: record.inputTokens,
      outputTokens: record.outputTokens,
      costUsd: record.costUsd,
      durationMs: record.durationMs,
      success: record.success,
      error: record.error,
      correlationId: record.correlationId,
      environment: ENV,
    },
  });

  // Check thresholds after logging
  const todaySpend = await getTodaySpend();
  const pct = todaySpend / DAILY_LIMIT;

  if (pct >= SPEND_LIMITS.downgradePct && !modelOverride) {
    console.warn(
      `[@GUARDIAN] Spend at ${(pct * 100).toFixed(1)}% of limit. ` +
      `Auto-downgrading all agents to claude-haiku-4-5.`
    );
    setModelOverride('claude-haiku-4-5');
  } else if (pct >= SPEND_LIMITS.warningPct) {
    console.warn(
      `[@GUARDIAN] Spend warning: $${todaySpend.toFixed(4)} / $${DAILY_LIMIT} ` +
      `(${(pct * 100).toFixed(1)}%)`
    );
  }
}

export async function getTodaySpend(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const result = await db.agentSpendLog.aggregate({
    where: {
      createdAt: { gte: today, lt: tomorrow },
      environment: ENV,
    },
    _sum: { costUsd: true },
  });

  return result._sum.costUsd ?? 0;
}
```

---

## SECTION 5: @GUARDIAN AGENT

Create apps/api/src/council/guardian/index.ts:

```typescript
// @version 0.8.0 - Shield
// @GUARDIAN — cost monitoring, anomaly detection, system health

import { db } from '../../lib/db';
import { getTodaySpend, setModelOverride } from '../../lib/costTracker';
import { SPEND_LIMITS } from '@feast-ai/shared/types/guardian';
import type { DailySpendSummary, ModelName } from '@feast-ai/shared/types/guardian';

const ENV = (process.env.NODE_ENV ?? 'development') as 'development' | 'production';
const DAILY_LIMIT = ENV === 'production' ? SPEND_LIMITS.production : SPEND_LIMITS.development;

export async function getDailySpendSummary(): Promise<DailySpendSummary> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const logs = await db.agentSpendLog.findMany({
    where: {
      createdAt: { gte: today, lt: tomorrow },
      environment: ENV,
    },
    select: { agent: true, costUsd: true },
  });

  const byAgent: Record<string, number> = {};
  let totalCostUsd = 0;

  for (const log of logs) {
    byAgent[log.agent] = (byAgent[log.agent] ?? 0) + log.costUsd;
    totalCostUsd += log.costUsd;
  }

  const percentUsed = totalCostUsd / DAILY_LIMIT;
  const status =
    percentUsed >= SPEND_LIMITS.downgradePct ? 'downgraded' :
    percentUsed >= SPEND_LIMITS.warningPct   ? 'critical'   :
    percentUsed >= 0.5                        ? 'warning'    :
    'normal';

  return {
    date: today.toISOString().split('T')[0],
    totalCostUsd,
    byAgent,
    callCount: logs.length,
    limitUsd: DAILY_LIMIT,
    percentUsed,
    status,
  };
}

export async function runDailyReport(): Promise<DailySpendSummary> {
  const summary = await getDailySpendSummary();

  // Save to DailySpendReport table
  const date = new Date();
  date.setHours(0, 0, 0, 0);

  await db.dailySpendReport.upsert({
    where: { date },
    update: {
      totalCostUsd: summary.totalCostUsd,
      byAgent: summary.byAgent,
      callCount: summary.callCount,
      limitUsd: summary.limitUsd,
      percentUsed: summary.percentUsed,
    },
    create: {
      date,
      totalCostUsd: summary.totalCostUsd,
      byAgent: summary.byAgent,
      callCount: summary.callCount,
      limitUsd: summary.limitUsd,
      percentUsed: summary.percentUsed,
    },
  });

  console.log(`[@GUARDIAN] Daily report: $${summary.totalCostUsd.toFixed(4)} / $${DAILY_LIMIT} (${(summary.percentUsed * 100).toFixed(1)}%)`);
  console.log(`[@GUARDIAN] By agent:`, summary.byAgent);

  return summary;
}

export async function downgradeAllAgents(reason: string): Promise<void> {
  console.warn(`[@GUARDIAN] Downgrading all agents. Reason: ${reason}`);
  setModelOverride('claude-haiku-4-5');

  const date = new Date();
  date.setHours(0, 0, 0, 0);

  await db.dailySpendReport.upsert({
    where: { date },
    update: { downgradedAt: new Date() },
    create: {
      date,
      totalCostUsd: await getTodaySpend(),
      byAgent: {},
      callCount: 0,
      limitUsd: DAILY_LIMIT,
      percentUsed: (await getTodaySpend()) / DAILY_LIMIT,
      downgradedAt: new Date(),
    },
  });
}

export async function restoreAgentModels(): Promise<void> {
  console.log('[@GUARDIAN] Restoring agent models to configured defaults.');
  setModelOverride(null);
}
```

---

## SECTION 6: INNGEST SCHEDULED FUNCTION

Create apps/api/src/inngest/functions/daily-cost-report.ts:

```typescript
// @version 0.8.0 - Shield
// Runs at midnight every day -- generates daily spend report
// and resets model overrides from previous day

import { inngest } from '../client';
import { runDailyReport, restoreAgentModels } from '../../council/guardian';

export const dailyCostReportFunction = inngest.createFunction(
  {
    id: 'daily-cost-report',
    name: 'Daily Cost Report — @GUARDIAN',
    retries: 1,
  },
  { cron: '0 0 * * *' },   // midnight UTC every day
  async ({ step }) => {

    // Step 1: Restore any model overrides from previous day
    await step.run('restore-models', async () => {
      await restoreAgentModels();
    });

    // Step 2: Generate and save daily report
    const report = await step.run('generate-report', async () => {
      return runDailyReport();
    });

    return {
      date: report.date,
      totalCostUsd: report.totalCostUsd,
      status: report.status,
      callCount: report.callCount,
    };
  }
);
```

Register in inngest/index.ts and serve route.
Total functions after this step: 5
1. eventCreatedPipeline
2. contentSubmittedPipeline
3. contentApprovedPipeline
4. applicationSubmittedPipeline
5. dailyCostReportFunction

---

## SECTION 7: COST REPORT API ROUTE

Create apps/api/src/app/api/guardian/spend/route.ts:

```typescript
// @version 0.8.0 - Shield
// Returns current day's spend summary -- used by admin dashboard in v0.9.0

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { applyRateLimit } from '@/lib/rateLimit';
import { getDailySpendSummary } from '@/council/guardian';

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, 'standard');
  if (limited) return limited;

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const summary = await getDailySpendSummary();
  return NextResponse.json({ success: true, summary });
}
```

---

## SECTION 8: SENTRY INTEGRATION

### 8.1 Install Sentry in apps/api

```bash
pnpm --filter api add @sentry/nextjs
```

Create apps/api/sentry.server.config.ts:

```typescript
// @version 0.8.0 - Shield
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  enabled: !!process.env.SENTRY_DSN,

  // Don't capture expected errors
  ignoreErrors: [
    'RATE_LIMITED',
    'UNAUTHORIZED',
    'NOT_FOUND',
    'DUPLICATE_APPLICATION',
  ],
});
```

Create apps/api/sentry.edge.config.ts:

```typescript
// @version 0.8.0 - Shield
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  enabled: !!process.env.SENTRY_DSN,
});
```

Update apps/api/next.config.ts to wrap with Sentry:

```typescript
// @version 0.8.0 - Shield
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig = {
  // existing config stays here
};

export default withSentryConfig(nextConfig, {
  org: 'feast-ai',
  project: 'javascript-nextjs',
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  authToken: process.env.SENTRY_AUTH_TOKEN,
});
```

### 8.2 Install Sentry in apps/web

```bash
pnpm --filter web add @sentry/nextjs
```

Create apps/web/sentry.client.config.ts:

```typescript
// @version 0.8.0 - Shield
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
});
```

Create apps/web/sentry.server.config.ts:

```typescript
// @version 0.8.0 - Shield
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});
```

Create apps/web/sentry.edge.config.ts:

```typescript
// @version 0.8.0 - Shield
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});
```

Update apps/web/next.config.ts to wrap with Sentry:

```typescript
// @version 0.8.0 - Shield
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig = {
  // existing config + rewrites() stay here
};

export default withSentryConfig(nextConfig, {
  org: 'feast-ai',
  project: 'feast-ai-web',
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  authToken: process.env.SENTRY_AUTH_TOKEN,
});
```

### 8.3 Error boundary for apps/web

Create apps/web/src/app/global-error.tsx:

```typescript
// @version 0.8.0 - Shield
'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body style={{
        background: '#F7F2EA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'DM Sans, sans-serif',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <h2 style={{
            fontFamily: 'Georgia, serif',
            fontStyle: 'italic',
            color: '#2D1B69',
            marginBottom: 12,
          }}>
            Something went wrong
          </h2>
          <p style={{ color: '#4A4468', fontSize: 14, marginBottom: 24 }}>
            We've been notified and are looking into it.
          </p>
          <button
            onClick={reset}
            style={{
              background: '#C97B1A',
              color: 'white',
              border: 'none',
              borderRadius: 22,
              padding: '10px 24px',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
```

---

## SECTION 9: ENHANCED RATE LIMITING

Update apps/api/src/lib/rateLimit.ts.
Add two new tiers for AI-triggering routes:

```typescript
// ADD to existing rateLimiters object in rateLimit.ts:

// AI routes: 5 per minute (each call costs money)
ai: new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  analytics: true,
  prefix: 'feast:ai',
}),

// Auth routes: 10 per minute (prevent brute force)
auth: new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
  prefix: 'feast:auth',
}),
```

Then update these existing routes to use the 'ai' tier:
- /api/onboarding/classify (currently 'standard' -- change to 'ai')
- /api/content (currently unrated -- add 'ai')

---

## SECTION 10: EXECUTION ORDER

Execute in this exact sequence. Stop and report after each step.

```
STEP 1: Schema + migration
  - Add AgentSpendLog and DailySpendReport to schema.prisma
  - Run: npx prisma migrate dev --name add_shield_models
  - Run: npx prisma validate
  - Run: pnpm typecheck
  - Report: migration output + typecheck result

STEP 2: Shared types
  - Create packages/shared/src/types/guardian.ts
  - Export from barrel
  - Run: pnpm typecheck (4/4 packages)
  - Report: exports list + typecheck result

STEP 3: Cost tracker
  - Create apps/api/src/lib/costTracker.ts
  - Run: pnpm typecheck
  - Report: file created, typecheck result

STEP 4: @GUARDIAN agent
  - Create apps/api/src/council/guardian/index.ts
  - Run: pnpm typecheck
  - Report: functions exported, typecheck result

STEP 5: Inngest scheduled function
  - Create daily-cost-report.ts
  - Register in inngest/index.ts and serve route (now 5 functions)
  - Apply ReturnType annotation
  - Run: pnpm typecheck + pnpm lint
  - Report: function ID, cron schedule, total function count

STEP 6: Cost report API route
  - Create /api/guardian/spend/route.ts
  - Run: pnpm typecheck + pnpm lint
  - Report: route created

STEP 7: Enhanced rate limiting
  - Add 'ai' and 'auth' tiers to rateLimit.ts
  - Update /api/onboarding/classify to use 'ai' tier
  - Update /api/content to use 'ai' tier if unrated
  - Run: pnpm typecheck + pnpm lint
  - Report: which routes were updated

STEP 8: Sentry — apps/api
  - Install @sentry/nextjs in apps/api
  - Create sentry.server.config.ts + sentry.edge.config.ts
  - Wrap next.config.ts with withSentryConfig
  - Run: pnpm typecheck + next build (API)
  - Report: build output, any Sentry-related warnings

STEP 9: Sentry — apps/web
  - Install @sentry/nextjs in apps/web
  - Create sentry.client.config.ts + sentry.server.config.ts + sentry.edge.config.ts
  - Create global-error.tsx
  - Wrap next.config.ts with withSentryConfig
  - Run: pnpm typecheck + next build (Web)
  - Report: build output, page count still 13

STEP 10: Full verification
  - pnpm typecheck: 4/4 packages, 0 errors
  - pnpm lint: 4/4 packages, 0 warnings
  - npx prisma validate
  - next build (API): all routes present including /api/guardian/spend
  - next build (Web): 13 static pages, 0 errors
  - Report full output

STEP 11: .env.example + CHANGELOG + tag
  - Confirm SENTRY_DSN, NEXT_PUBLIC_SENTRY_DSN, SENTRY_AUTH_TOKEN
    are already in .env.example (added in earlier steps)
  - Write CHANGELOG v0.8.0 entry
  - Update CONTRACT.md:
      CURRENT_VERSION=0.8.0
      CURRENT_CODENAME=Shield
      NEXT_VERSION=0.9.0
      NEXT_CODENAME=Lens
  - git commit + git tag v0.8.0
  - Report commit hash + tag
```

---

## SECTION 11: v0.8.0 DEFINITION OF DONE

- [ ] pnpm typecheck: 4/4 packages, 0 errors
- [ ] pnpm lint: 4/4 packages, 0 warnings
- [ ] npx prisma validate: passes
- [ ] next build (API + Web): 0 errors
- [ ] AgentSpendLog model in DB
- [ ] DailySpendReport model in DB
- [ ] trackedCall() logs cost after every Anthropic API call
- [ ] Auto-downgrade triggers at 90% of daily limit
- [ ] getDailySpendSummary() returns correct totals
- [ ] daily-cost-report Inngest function registered (5 total)
- [ ] /api/guardian/spend returns spend summary
- [ ] Sentry initialized in apps/api (graceful when DSN missing)
- [ ] Sentry initialized in apps/web (graceful when DSN missing)
- [ ] global-error.tsx captures exceptions to Sentry
- [ ] 'ai' rate limit tier applied to AI-triggering routes
- [ ] CHANGELOG.md updated
- [ ] CONTRACT.md: CURRENT_VERSION=0.8.0, NEXT_VERSION=0.9.0
- [ ] Git tagged as v0.8.0

---

END OF SHIELD BLUEPRINT v0.8.0
