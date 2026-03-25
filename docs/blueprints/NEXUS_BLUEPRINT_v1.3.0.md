# FEAST-AI v1.3.0 NEXUS BLUEPRINT
# Codename: Nexus
# Architect: Claude Sonnet 4.6 (chat)
# Executor: Claude Opus 4.6 (Claude Code)
# Date: March 2026
# Scope: Advanced events -- recurring templates, multi-host, waitlist, @STRATEGIST

---

## OPUS BOOT INSTRUCTIONS

Read in this order before writing a single line of code:
1. docs/blueprints/CONTRACT.md
2. docs/CHANGELOG.md (last 10 entries)
3. docs/blueprints/TECH_STACK.md
4. docs/blueprints/COUNCIL_AGENTS.md
5. This file (NEXUS_BLUEPRINT_v1.3.0.md) in full

Then run the health check:
  pnpm typecheck
  pnpm lint
  npx prisma validate

All three must pass before writing any code.
Current version: 1.3.0
Sacred Rule: Do not build anything from v1.4.0 or later.

---

## SECTION 1: SCOPE

v1.3.0 Nexus makes events smarter and more powerful.
Hosts can create recurring event series, coordinate with
co-hosts, manage waitlists, and get AI-powered regional
growth recommendations from @STRATEGIST.

### What gets built:
1. EventTemplate model -- reusable event blueprints
2. EventWaitlist model -- waitlist management per event
3. CoHost model -- multi-host coordination
4. @STRATEGIST agent -- regional growth + event strategy
5. Event template API routes (CRUD)
6. Waitlist API routes (join, leave, promote)
7. Co-host API routes (invite, accept, remove)
8. @STRATEGIST API route -- regional recommendations
9. Admin events page update -- templates tab + waitlist view
10. Trigger embed on event creation (close the RAG loop)

### What does NOT change:
- No mobile changes
- No auth changes
- No new Inngest pipelines (events use existing event-created)
- No design system changes

---

## SECTION 2: PRISMA SCHEMA ADDITIONS

Append to apps/api/prisma/schema.prisma:

```prisma
// @version 1.3.0 - Nexus

model EventTemplate {
  id            String      @id @default(cuid())
  creatorId     String      @map("creator_id")
  creator       User        @relation(fields: [creatorId], references: [id])
  name          String
  description   String?
  city          String
  maxSeats      Int         @default(12) @map("max_seats")
  communityTier CommunityTier @default(commons) @map("community_tier")
  cadence       String      @default("monthly")
  // cadence values: 'weekly', 'biweekly', 'monthly', 'custom'
  isActive      Boolean     @default(true) @map("is_active")
  usageCount    Int         @default(0) @map("usage_count")
  events        FeastEvent[]
  createdAt     DateTime    @default(now()) @map("created_at")
  updatedAt     DateTime    @updatedAt @map("updated_at")

  @@map("event_templates")
}

model EventWaitlist {
  id         String   @id @default(cuid())
  eventId    String   @map("event_id")
  event      FeastEvent @relation(fields: [eventId], references: [id])
  userId     String   @map("user_id")
  user       User     @relation(fields: [userId], references: [id])
  position   Int                          // 1-based queue position
  notified   Boolean  @default(false)     // true when promoted to confirmed
  notifiedAt DateTime? @map("notified_at")
  createdAt  DateTime @default(now()) @map("created_at")

  @@unique([eventId, userId])             // one entry per user per event
  @@unique([eventId, position])           // unique position in each event's queue
  @@map("event_waitlist")
}

model CoHost {
  id         String    @id @default(cuid())
  eventId    String    @map("event_id")
  event      FeastEvent @relation(fields: [eventId], references: [id])
  userId     String    @map("user_id")
  user       User      @relation(fields: [userId], references: [id])
  role       String    @default("co_host")
  // role values: 'co_host', 'facilitator', 'assistant'
  status     String    @default("pending")
  // status values: 'pending', 'accepted', 'declined'
  invitedBy  String    @map("invited_by")
  invitedAt  DateTime  @default(now()) @map("invited_at")
  respondedAt DateTime? @map("responded_at")

  @@unique([eventId, userId])
  @@map("co_hosts")
}
```

Add reverse relations to existing models:
```prisma
// Add to FeastEvent model:
templateId    String?        @map("template_id")
template      EventTemplate? @relation(fields: [templateId], references: [id])
waitlist      EventWaitlist[]
coHosts       CoHost[]

// Add to User model:
eventTemplates EventTemplate[]
waitlistEntries EventWaitlist[]
coHosting      CoHost[]
```

After adding:
  npx prisma migrate dev --name add_nexus_models
  npx prisma validate
  pnpm typecheck

---

## SECTION 3: SHARED TYPES

Add to packages/shared/src/types/events.ts (EXTEND existing file):

```typescript
// @version 1.3.0 - Nexus -- ADD to existing events.ts

export type EventCadence = 'weekly' | 'biweekly' | 'monthly' | 'custom';
export type CoHostRole = 'co_host' | 'facilitator' | 'assistant';
export type CoHostStatus = 'pending' | 'accepted' | 'declined';

export interface EventTemplateData {
  id: string;
  name: string;
  description?: string;
  city: string;
  maxSeats: number;
  communityTier: string;
  cadence: EventCadence;
  isActive: boolean;
  usageCount: number;
  createdAt: Date;
}

export interface WaitlistEntry {
  id: string;
  eventId: string;
  userId: string;
  position: number;
  notified: boolean;
  createdAt: Date;
}

export interface CoHostInvite {
  eventId: string;
  userId: string;
  role: CoHostRole;
  status: CoHostStatus;
  invitedBy: string;
}
```

---

## SECTION 4: @STRATEGIST AGENT

Create apps/api/src/council/strategist/index.ts:

```typescript
// @version 1.3.0 - Nexus
// @STRATEGIST -- regional growth strategy using RAG + community data
// Uses Opus for high-stakes strategic planning decisions

import { trackedCall } from '../../lib/costTracker';
import { semanticSearch } from '../../lib/embeddings';
import { db } from '../../lib/db';

export interface RegionalRecommendation {
  city: string;
  currentInterest: number;
  recommendedAction: string;
  rationale: string;
  suggestedCadence: string;
  priorityScore: number;  // 0-10
}

export interface GrowthStrategy {
  generatedAt: Date;
  topOpportunities: RegionalRecommendation[];
  globalInsights: string[];
  nextActions: string[];
}

export async function generateGrowthStrategy(): Promise<GrowthStrategy> {
  const now = new Date();

  // Gather regional data
  const [regionalData, recentEvents, memberIntentCount] = await Promise.all([
    db.regionalInterest.findMany({ orderBy: { count: 'desc' }, take: 10 }),
    db.feastEvent.findMany({
      where: { status: { in: ['COMPLETED', 'LIVE', 'MARKETED'] } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { city: true, status: true, confirmedSeats: true, maxSeats: true },
    }),
    db.memberIntent.count({ where: { intent: 'HOST' } }),
  ]);

  // Use RAG to find patterns in member intents for each top city
  const cityInsights = await Promise.all(
    regionalData.slice(0, 5).map(async (region) => {
      const similar = await semanticSearch({
        query: `host dinner ${region.city} community gathering`,
        sourceType: 'member_intent',
        limit: 3,
        threshold: 0.6,
      });
      return { city: region.city, count: region.count, insights: similar.length };
    })
  );

  // Use Claude Opus for strategic planning
  const response = await trackedCall({
    agent: '@STRATEGIST',
    model: 'claude-opus-4-6',
    action: 'generate_growth_strategy',
    system: `You are @STRATEGIST for The Feast community platform.
Your role is to identify regional growth opportunities and recommend
specific, actionable strategies for expanding the dinner community.

The Feast's mission: bring people together for meaningful dinners
that build community and practice abundance.

Return ONLY valid JSON matching this exact schema:
{
  "topOpportunities": [
    {
      "city": "string",
      "currentInterest": number,
      "recommendedAction": "string (specific, actionable)",
      "rationale": "string (1-2 sentences)",
      "suggestedCadence": "weekly|biweekly|monthly",
      "priorityScore": number (0-10)
    }
  ],
  "globalInsights": ["string", "string", "string"],
  "nextActions": ["string", "string", "string"]
}

Provide exactly 3 topOpportunities, 3 globalInsights, 3 nextActions.
Be specific and data-driven. Reference actual cities from the data.`,
    messages: [
      {
        role: 'user',
        content: `Regional interest data:
${regionalData.map(r => `${r.city}: ${r.count} interested`).join('\n')}

Recent event activity:
${recentEvents.map(e => `${e.city}: ${e.status} (${e.confirmedSeats}/${e.maxSeats} seats)`).join('\n')}

Host applicants: ${memberIntentCount}

City RAG insights (similar member intents found):
${cityInsights.map(c => `${c.city}: ${c.insights} similar intents in corpus`).join('\n')}

Generate the regional growth strategy.`,
      },
    ],
    maxTokens: 1024,
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';

  let parsed: {
    topOpportunities: RegionalRecommendation[];
    globalInsights: string[];
    nextActions: string[];
  };

  try {
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(clean);
  } catch {
    parsed = {
      topOpportunities: regionalData.slice(0, 3).map((r, i) => ({
        city: r.city,
        currentInterest: r.count,
        recommendedAction: `Host a Feast dinner in ${r.city}`,
        rationale: `${r.count} people have expressed interest in this region.`,
        suggestedCadence: 'monthly' as const,
        priorityScore: 10 - i * 2,
      })),
      globalInsights: ['Growing interest across multiple regions', 'Host pipeline is building', 'Community momentum is positive'],
      nextActions: ['Activate top regional hosts', 'Schedule inaugural dinners', 'Build local facilitator network'],
    };
  }

  return {
    generatedAt: now,
    topOpportunities: parsed.topOpportunities,
    globalInsights: parsed.globalInsights,
    nextActions: parsed.nextActions,
  };
}
```

---

## SECTION 5: EVENT TEMPLATE SERVICE

Create apps/api/src/services/eventTemplates.ts:

```typescript
// @version 1.3.0 - Nexus
// Event template CRUD + spawn event from template

import { db } from '../lib/db';
import { inngest } from '../lib/inngest';

export async function createTemplate(params: {
  creatorId: string;
  name: string;
  description?: string;
  city: string;
  maxSeats?: number;
  communityTier?: string;
  cadence?: string;
}) {
  return db.eventTemplate.create({
    data: {
      creatorId: params.creatorId,
      name: params.name,
      description: params.description,
      city: params.city,
      maxSeats: params.maxSeats ?? 12,
      communityTier: (params.communityTier as any) ?? 'commons',
      cadence: params.cadence ?? 'monthly',
    },
  });
}

// Create a new FeastEvent from a template
export async function spawnEventFromTemplate(params: {
  templateId: string;
  hostId: string;
  scheduledAt: Date;
  overrides?: Partial<{
    name: string;
    description: string;
    maxSeats: number;
  }>;
}) {
  const template = await db.eventTemplate.findUnique({
    where: { id: params.templateId },
  });

  if (!template) throw new Error(`Template ${params.templateId} not found`);

  const event = await db.feastEvent.create({
    data: {
      hostId: params.hostId,
      templateId: params.templateId,
      name: params.overrides?.name ?? template.name,
      description: params.overrides?.description ?? template.description,
      city: template.city,
      maxSeats: params.overrides?.maxSeats ?? template.maxSeats,
      communityTier: template.communityTier,
      scheduledAt: params.scheduledAt,
      status: 'DRAFT',
      confirmedSeats: 0,
    },
  });

  // Increment template usage count
  await db.eventTemplate.update({
    where: { id: params.templateId },
    data: { usageCount: { increment: 1 } },
  });

  // Trigger event-created pipeline + auto-embed
  await Promise.allSettled([
    inngest.send({ name: 'event/created', data: { eventId: event.id } }),
    inngest.send({
      name: 'content/embed',
      data: { sourceType: 'event', sourceId: event.id },
    }),
  ]);

  return event;
}
```

---

## SECTION 6: WAITLIST SERVICE

Create apps/api/src/services/waitlist.ts:

```typescript
// @version 1.3.0 - Nexus
// Waitlist management -- join, leave, promote

import { db } from '../lib/db';

export async function joinWaitlist(eventId: string, userId: string) {
  // Check event exists and is full
  const event = await db.feastEvent.findUnique({ where: { id: eventId } });
  if (!event) throw new Error('Event not found');

  // Get current waitlist length for position
  const count = await db.eventWaitlist.count({ where: { eventId } });

  return db.eventWaitlist.create({
    data: {
      eventId,
      userId,
      position: count + 1,
    },
  });
}

export async function leaveWaitlist(eventId: string, userId: string) {
  const entry = await db.eventWaitlist.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });

  if (!entry) throw new Error('Not on waitlist');

  // Delete the entry
  await db.eventWaitlist.delete({
    where: { eventId_userId: { eventId, userId } },
  });

  // Reorder positions for entries below the removed one
  await db.eventWaitlist.updateMany({
    where: { eventId, position: { gt: entry.position } },
    data: { position: { decrement: 1 } },
  });
}

// Promote top N from waitlist to confirmed when seats open up
export async function promoteFromWaitlist(eventId: string, seats: number) {
  const topEntries = await db.eventWaitlist.findMany({
    where: { eventId, notified: false },
    orderBy: { position: 'asc' },
    take: seats,
    include: { user: { select: { email: true, name: true } } },
  });

  for (const entry of topEntries) {
    await db.eventWaitlist.update({
      where: { id: entry.id },
      data: { notified: true, notifiedAt: new Date() },
    });
    // TODO v1.4.0: Send email notification via Resend
    console.log(`[Waitlist] Promoted ${entry.user.email} from waitlist for event ${eventId}`);
  }

  return topEntries;
}

export async function getWaitlistPosition(eventId: string, userId: string) {
  const entry = await db.eventWaitlist.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });
  return entry?.position ?? null;
}
```

---

## SECTION 7: API ROUTES

### 7.1 Event Templates

**GET /api/events/templates** -- list templates for current user
**POST /api/events/templates** -- create template
**POST /api/events/templates/[id]/spawn** -- create event from template

### 7.2 Waitlist

**POST /api/events/[id]/waitlist** -- join waitlist
**DELETE /api/events/[id]/waitlist** -- leave waitlist
**GET /api/events/[id]/waitlist** -- get position + queue length

### 7.3 Co-hosts

**POST /api/events/[id]/cohosts** -- invite co-host
**PATCH /api/events/[id]/cohosts/[userId]** -- accept/decline invitation
**DELETE /api/events/[id]/cohosts/[userId]** -- remove co-host

### 7.4 Strategy

**GET /api/strategist/growth** -- get regional growth recommendations
  Auth: founding_table only
  Rate limit: ai tier
  Cache-Control: private, max-age=600 (10 min -- Opus is expensive)

### Implementation notes for all routes:
- All routes use standard pattern: rate limit → auth → business logic
- Template routes: any authenticated host can create/use templates
- Waitlist routes: any authenticated user can join/leave
- Co-host routes: only event host can invite/remove
- Strategy route: founding_table only (uses Claude Opus)

---

## SECTION 8: ADMIN PAGE UPDATE

Update apps/web/src/app/(admin)/admin/events/page.tsx.

Add two tabs to the events page:
  Tab 1: "Events" (existing content -- unchanged)
  Tab 2: "Templates" (new)

Tab implementation:
```tsx
// Simple tab state at top of component
const [activeTab, setActiveTab] = useState<'events' | 'templates'>('events')

// Tab strip below the page header:
<div className="flex gap-1 mb-6">
  {['events', 'templates'].map(tab => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab as any)}
      className={`px-4 py-2 rounded-full text-sm font-sans capitalize
        transition-colors ${activeTab === tab
          ? 'bg-mustard text-white'
          : 'bg-surface text-ink-mid hover:bg-border'}`}
    >
      {tab}
    </button>
  ))}
</div>
```

Templates tab content:
- Stats row: Total Templates (navy), Active (teal), Total Spawned Events (mustard)
- AdminDataTable: Name | City | Cadence | Seats | Used | Actions
- Actions: "Use Template" mustard pill → spawns new event (POST /api/events/templates/[id]/spawn)
  For now: stub onClick with a date picker modal (simple -- just pick a date)
- "New Template" button top-right → simple inline form (name, city, cadence, max seats)

Also update the strategy section of the admin dashboard:
Add a "Growth Strategy" card to /admin/system/agents page.
Below the recent activity table, add:
  Section label "Regional Strategy"
  "Generate Strategy" mustard button → GET /api/strategist/growth
  Renders top 3 opportunities as left-border-teal cards with priority score badge

---

## SECTION 9: CLOSE THE RAG LOOP FOR EVENTS

Update apps/api/src/inngest/functions/event-created.ts.
After the event is created/processed, send a content/embed event:

```typescript
// Add at the end of the event-created pipeline:
await step.run('auto-embed', async () => {
  await inngest.send({
    name: 'content/embed',
    data: { sourceType: 'event', sourceId: eventId },
  }).catch(() => {})  // silent -- embedding is non-critical
})
```

This ensures every new event is automatically embedded
into the RAG corpus, making it searchable by meaning.

---

## SECTION 10: EXECUTION ORDER

```
STEP 1: Schema + migration
  - Add EventTemplate, EventWaitlist, CoHost models
  - Add reverse relations to FeastEvent + User
  - npx prisma migrate dev --name add_nexus_models
  - npx prisma validate + pnpm typecheck
  - Report: migration output

STEP 2: Shared types
  - Extend packages/shared/src/types/events.ts
  - Export new types from barrel
  - pnpm typecheck (4/4)
  - Report: new types added

STEP 3: @STRATEGIST agent
  - Create apps/api/src/council/strategist/index.ts
  - pnpm typecheck
  - Report: functions exported, model used (Opus)

STEP 4: Services
  - Create apps/api/src/services/eventTemplates.ts
  - Create apps/api/src/services/waitlist.ts
  - pnpm typecheck
  - Report: services created

STEP 5: API routes (build in this order)
  5a: GET + POST /api/events/templates
      POST /api/events/templates/[id]/spawn
  5b: POST + DELETE + GET /api/events/[id]/waitlist
  5c: POST /api/events/[id]/cohosts
      PATCH /api/events/[id]/cohosts/[userId]
      DELETE /api/events/[id]/cohosts/[userId]
  5d: GET /api/strategist/growth
  After each sub-step: pnpm typecheck + report
  After all routes: next build (API) -- report route count

STEP 6: Close RAG loop for events
  - Update event-created.ts Inngest function
  - pnpm typecheck + pnpm lint
  - Report: what changed

STEP 7: Admin page updates
  - Update /admin/events page with Templates tab
  - Update /admin/system/agents page with Growth Strategy section
  - pnpm typecheck + next build (web)
  - Report: page count (should still be 20)

STEP 8: Full verification
  - pnpm typecheck: 4/4 packages, 0 errors
  - pnpm lint: 4/4 packages, 0 warnings
  - npx prisma validate
  - pnpm --filter api build: report route count
  - pnpm --filter web build: report page count
  - npx prisma db push
  - Report full output

STEP 9: CHANGELOG + CONTRACT + tag + push
  - Write CHANGELOG v1.3.0 entry
  - Update CONTRACT.md:
      CURRENT_VERSION=1.3.0
      CURRENT_CODENAME=Nexus
      NEXT_VERSION=1.4.0
      NEXT_CODENAME=Harvest
  - git commit -m "feat: v1.3.0 Nexus — recurring templates + waitlist + @STRATEGIST"
  - git tag v1.3.0
  - git push origin main --tags
  - Report commit hash + tag
```

---

## SECTION 11: v1.3.0 DEFINITION OF DONE

- [ ] pnpm typecheck: 4/4 packages, 0 errors
- [ ] pnpm lint: 4/4 packages, 0 warnings
- [ ] npx prisma validate: passes
- [ ] next build (API + Web): 0 errors
- [ ] EventTemplate model in DB
- [ ] EventWaitlist model in DB
- [ ] CoHost model in DB
- [ ] createTemplate() creates a new template
- [ ] spawnEventFromTemplate() creates event + triggers pipeline
- [ ] joinWaitlist() + leaveWaitlist() + promoteFromWaitlist() work
- [ ] @STRATEGIST generateGrowthStrategy() returns valid strategy
- [ ] GET /api/events/templates returns user's templates
- [ ] POST /api/events/templates creates template
- [ ] POST /api/events/templates/[id]/spawn creates event from template
- [ ] POST /api/events/[id]/waitlist joins waitlist
- [ ] GET /api/strategist/growth returns growth strategy (Opus)
- [ ] event-created pipeline auto-embeds new events
- [ ] Admin events page has Templates tab
- [ ] Admin agents page has Growth Strategy section
- [ ] CHANGELOG.md updated
- [ ] CONTRACT.md: 1.3.0 Nexus / 1.4.0 Harvest
- [ ] Git tagged v1.3.0 + pushed

---

END OF NEXUS BLUEPRINT v1.3.0
