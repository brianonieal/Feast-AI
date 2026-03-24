# FEAST-AI v0.9.0 LENS BLUEPRINT
# Codename: Lens
# Architect: Claude Sonnet 4.6 (chat)
# Executor: Claude Opus 4.6 (Claude Code)
# Date: March 2026
# Scope: Admin dashboard -- event mgmt, content queue, members, agent status, integrations

---

## OPUS BOOT INSTRUCTIONS

Read in this order before writing a single line of code:
1. docs/blueprints/CONTRACT.md
2. docs/CHANGELOG.md (last 10 entries)
3. docs/blueprints/TECH_STACK.md
4. docs/blueprints/FEAST_AI_FRONTEND_BLUEPRINT_FINAL.md (design system Section 1 only)
5. docs/blueprints/MOCKUP_REFERENCE.md (visual rules)
6. This file (LENS_BLUEPRINT_v0.9.0.md) in full

Then run the health check:
  pnpm typecheck
  pnpm lint
  npx prisma validate

All three must pass before writing any code.
Current version: 0.9.0
Sacred Rule: Do not build anything from v1.0.0 or later.

---

## SECTION 1: SCOPE

v0.9.0 Lens builds exactly these things. Nothing more.

### What gets built:
1. Admin shell -- layout, navigation, access guards for /admin/*
2. Events page -- view all events, update status, create new event
3. Content queue page -- review + approve/reject AI-generated content
4. Members page -- applications, member intents, regional interest
5. Agent status page -- Council health + @GUARDIAN spend summary
6. Integration health page -- adapter status (founding_table only)
7. New API routes -- admin-specific endpoints
8. Middleware updates -- /admin/* route protection

### Access tiers:
- /admin/*          requires can('canViewHostDashboard')
                    = hosts, facilitators, kitchen, founding_table
- /admin/system/*   requires tier === 'founding_table' only
                    = agent status + integration health

### What does NOT get built:
- Any mobile changes
- Any new agent capabilities
- Real-time updates (polling only in v0.9.0)
- User management / role assignment UI (post-MVP)

---

## SECTION 2: DESIGN SYSTEM FOR ADMIN DASHBOARD

The admin dashboard uses the SAME design system as the rest of apps/web:
- Fraunces italic for ALL headings
- DM Sans for body text
- Warm linen backgrounds (#F7F2EA)
- Left-border accent cards
- Mustard CTAs, teal success, coral danger

The admin shell has a DIFFERENT layout from the member app:
- No BottomNav (replaced by sidebar navigation)
- No TopBar avatar (replaced by inline user display in sidebar)
- Full-width content area
- Sidebar: 240px fixed left, bg-surface, border-r border-border

Admin-specific color usage:
- Sidebar active item: left-border-mustard + bg-mustard-soft text
- Status badges: same pattern as member app (teal/mustard/coral)
- Data tables: bg-card, border-border, alternating bg-surface rows
- Stat cards: same CommunityPulse pattern from home screen

---

## SECTION 3: FOLDER STRUCTURE (apps/web additions only)

```
apps/web/src/
├── app/
│   └── (admin)/                    NEW -- admin shell group
│       ├── layout.tsx              Admin shell: Sidebar + {children}
│       ├── admin/
│       │   ├── page.tsx            Dashboard overview (redirect to /admin/events)
│       │   ├── events/
│       │   │   └── page.tsx        Event management
│       │   ├── queue/
│       │   │   └── page.tsx        Content approval queue
│       │   └── members/
│       │       └── page.tsx        Applications + intents + regional
│       └── admin/system/           founding_table only
│           ├── agents/
│           │   └── page.tsx        Council status + spend
│           └── integrations/
│               └── page.tsx        Adapter health
│
├── components/
│   └── admin/                      NEW
│       ├── AdminShell.tsx          Sidebar + content wrapper
│       ├── AdminSidebar.tsx        Nav links with active state
│       ├── AdminStatCard.tsx       Reusable stat card (number + label + delta)
│       ├── AdminDataTable.tsx      Reusable table (headers + rows + empty state)
│       ├── EventStatusBadge.tsx    Event status pill (DRAFT/OPEN/CONFIRMED/etc)
│       ├── ApprovalQueueCard.tsx   Content item awaiting review
│       ├── MemberIntentBadge.tsx   Intent classification pill
│       └── SpendMeter.tsx          Visual spend bar ($X / $Y, colored by status)
```

---

## SECTION 4: MIDDLEWARE UPDATE

Update apps/web/src/middleware.ts to add admin route protection.

Add to the existing middleware (do NOT replace -- extend):

```typescript
// Add to existing route matchers in middleware.ts:

const isAdminRoute = createRouteMatcher(['/admin(.*)']);
const isSystemRoute = createRouteMatcher(['/admin/system(.*)']);

// Add inside the existing clerkMiddleware callback:
if (isAdminRoute(req)) {
  await auth.protect();
  const { sessionClaims } = await auth();
  const meta = sessionClaims?.publicMetadata as {
    tier?: string;
    role?: string;
  } | undefined;

  const role = meta?.role;
  const tier = meta?.tier;

  // canViewHostDashboard = host, facilitator, kitchen, founding_table
  const canAccess =
    role === 'host' ||
    role === 'facilitator' ||
    tier === 'kitchen' ||
    tier === 'founding_table';

  if (!canAccess) {
    return NextResponse.redirect(new URL('/home', req.url));
  }
}

if (isSystemRoute(req)) {
  await auth.protect();
  const { sessionClaims } = await auth();
  const tier = (sessionClaims?.publicMetadata as { tier?: string })?.tier;
  if (tier !== 'founding_table') {
    return NextResponse.redirect(new URL('/admin/events', req.url));
  }
}
```

---

## SECTION 5: NEW API ROUTES

All admin routes go in apps/api/src/app/api/admin/.

### GET /api/admin/events
Returns paginated event list with host info and attendance counts.
Query params: page (default 1), limit (default 20), status (optional filter), city (optional filter)

### PATCH /api/admin/events/[id]/status
Updates event status. Body: { status: EventStatus }
Auth: requireAuth() -- host/admin only

### GET /api/admin/queue
Returns ContentApprovalQueue items with status PENDING.
Query params: page, limit

### GET /api/admin/members
Returns combined view: applications + member intents + regional interest summary.
Query params: page, limit, intent (optional filter)

### GET /api/admin/system/agents
Returns @GUARDIAN daily spend summary + model override status.
Calls getDailySpendSummary() from council/guardian.
Auth: requireAuth() -- founding_table only (checked via Clerk metadata)

### GET /api/admin/system/integrations
Returns health check results for all configured adapters.
Calls healthCheck() on each adapter in parallel with Promise.allSettled().
Auth: requireAuth() -- founding_table only

### Implementation pattern for all admin routes:
```typescript
// Standard admin route pattern
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { applyRateLimit } from '@/lib/rateLimit';

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

  // ... route logic

  return NextResponse.json({ success: true, data: ... });
}
```

---

## SECTION 6: COMPONENT SPECS

### 6.1 AdminShell.tsx

```
Layout: flex min-h-screen bg-[var(--bg-page)]
Sidebar: w-60 flex-shrink-0 bg-[var(--bg-surface)]
         border-r border-border min-h-screen
Content: flex-1 overflow-auto p-6
```

### 6.2 AdminSidebar.tsx

Header:
- "The Feast" wordmark: Fraunces italic text-navy text-lg, px-5 pt-6 pb-4
- Divider: border-b border-border mb-3

Nav sections:
```
MANAGE (section label: 10px uppercase mustard mono)
  Events          /admin/events       CalendarDays icon
  Content Queue   /admin/queue        CheckSquare icon
  Members         /admin/members      Users icon

SYSTEM (section label -- only renders if founding_table)
  Agents          /admin/system/agents    Cpu icon
  Integrations    /admin/system/integrations  Plug icon
```

Nav item styles:
- Default: flex items-center gap-3 px-4 py-2.5 text-sm text-ink-mid
            rounded-md mx-2 hover:bg-bg-page transition-colors
- Active:   border-l-2 border-mustard bg-mustard-soft text-mustard
            font-medium rounded-r-md rounded-l-none

Bottom of sidebar:
- User display: avatar initials + name + tier badge
- "Back to app" link → /home (ChevronLeft icon)

### 6.3 AdminStatCard.tsx

Props: label, value, delta?, deltaLabel?, color?

```tsx
<div className="bg-card border border-border rounded-lg p-4">
  <p className="font-sans text-[10px] font-medium tracking-[0.09em]
                uppercase text-ink-light mb-1">{label}</p>
  <p className="font-display italic font-light text-2xl text-navy
                leading-none">{value}</p>
  {delta && (
    <p className="font-sans text-xs text-teal mt-1">
      {delta} {deltaLabel}
    </p>
  )}
</div>
```

### 6.4 AdminDataTable.tsx

Props: headers (string[]), rows (React.ReactNode[][]), emptyMessage

```
Table wrapper: w-full overflow-x-auto
Table: w-full text-sm
Header row: bg-surface border-b border-border
  th: px-4 py-3 text-left font-sans font-medium text-xs
      uppercase tracking-wider text-ink-light
Body rows: border-b border-border last:border-0
  Alternating: even rows bg-surface/50
  td: px-4 py-3 text-ink
Empty state: centered, Fraunces italic text-ink-light, py-12
```

### 6.5 SpendMeter.tsx

Props: spent, limit, status ('normal'|'warning'|'critical'|'downgraded')

Visual: label + amount + progress bar + percentage

```
Bar colors:
  normal:     bg-teal
  warning:    bg-mustard
  critical:   bg-coral
  downgraded: bg-coral (with "DOWNGRADED" badge)
```

---

## SECTION 7: PAGE SPECS

### 7.1 /admin/events

Stats row (4 cards): Total Events, This Month, Avg Attendance, Open RSVPs

Filter strip: status pills (All, Draft, Open, Confirmed, Full, Completed)
              city pills (All + unique cities from data)

Events table:
| Date | Title | Host | City | Seats | Status | Actions |
Actions: "View" button (stub) + EventStatusBadge dropdown (PATCH /api/admin/events/[id]/status)

Create event button: mustard filled pill top-right "New Event"
  -- opens a simple modal with the same fields as the COORDINATOR
  -- POST to /api/events (already exists from v0.4.0)

### 7.2 /admin/queue

Stats row (3 cards): Pending Review, Approved Today, Published Today

Queue list (NOT a table -- use ApprovalQueueCard):
Each card shows:
- Event name + date
- Channel badge (WEBSITE_ARTICLE, INSTAGRAM, CIRCLE_RECAP, etc.)
- Preview of generated body (first 150 chars, truncated)
- "Review" button → opens ContentReviewEditor (already built in frontend sprint)
- "Approve" / "Reject" buttons → POST /api/content/approve

Empty state: Fraunces italic "No content awaiting review" + teal dot

### 7.3 /admin/members

Three sub-sections separated by dividers:

APPLICATIONS section:
Stats: Pending, Approved, Rejected
Table: Name | City | Role | Status | Submitted | Actions
Actions: "Approve" / "Reject" buttons (PATCH /api/admin/applications/[id])

MEMBER INTENTS section:
Stats: Total Classified, by intent breakdown
Table: Name | Email | Intent | Confidence | City | Source | Date

REGIONAL INTEREST section:
Stats: Total Cities, Top Region
Table: City | Interest Count | (sorted by count desc)

### 7.4 /admin/system/agents (founding_table only)

Spend overview:
- SpendMeter component (today's spend vs limit)
- 4 stat cards: Today's Spend, Call Count, Top Agent, Status

Agent breakdown table:
| Agent | Calls Today | Cost Today | Model | Status |
Data from getDailySpendSummary() via GET /api/guardian/spend

Recent spend logs table (last 20):
| Time | Agent | Action | Model | Tokens | Cost | Status |
Data from db.agentSpendLog (last 20 records)

Model override status:
- If active: coral banner "DOWNGRADE ACTIVE -- all agents using Haiku"
- If inactive: teal pill "All agents at configured models"

### 7.5 /admin/system/integrations (founding_table only)

Integration health cards (one per adapter):
Each card: left-border (teal=connected, coral=failed, border=unconfigured)
- Service name (Fraunces italic)
- Status badge: CONNECTED / FAILED / NOT CONFIGURED
- Latency (if connected): "42ms"
- Last checked: relative time

Services to check:
- Circle.so
- HubSpot
- Twilio
- WordPress
- Resend
- Supabase (just ping the DB)

"Refresh All" button top-right: re-fetches GET /api/admin/system/integrations
Auto-refreshes every 30 seconds via useEffect + setInterval

---

## SECTION 8: EXECUTION ORDER

Execute in this exact sequence. Stop and report after each step.

```
STEP 1: Middleware update
  - Read existing middleware.ts in full before modifying
  - Add /admin/* and /admin/system/* route protection
  - Run: pnpm typecheck (apps/web)
  - Run: next build (apps/web) -- 13 pages + new admin routes
  - Report: middleware changes, build output

STEP 2: Admin API routes (apps/api)
  - Create apps/api/src/app/api/admin/ directory
  - Build all 6 routes in this order:
    GET /api/admin/events
    PATCH /api/admin/events/[id]/status
    GET /api/admin/queue
    GET /api/admin/members
    GET /api/admin/system/agents
    GET /api/admin/system/integrations
  - Apply rate limiting to all (standard tier)
  - Apply auth to all
  - Apply founding_table check to system routes
  - Run: pnpm typecheck + pnpm lint
  - Run: next build (API) -- report new route count
  - Report: all routes created + build output

STEP 3: Shared admin components
  - Create all 8 components in apps/web/src/components/admin/
  - AdminShell, AdminSidebar, AdminStatCard, AdminDataTable,
    EventStatusBadge, ApprovalQueueCard, MemberIntentBadge, SpendMeter
  - Run: pnpm typecheck (apps/web)
  - Report: components created, typecheck result

STEP 4: Admin layout
  - Create apps/web/src/app/(admin)/layout.tsx
  - Wire AdminShell with role guard
  - Run: pnpm typecheck + next build (apps/web)
  - Report: layout created, page count in build output

STEP 5: Admin pages (in order)
  5a: /admin/page.tsx (redirect to /admin/events)
      /admin/events/page.tsx
  5b: /admin/queue/page.tsx
  5c: /admin/members/page.tsx
  5d: /admin/system/agents/page.tsx
  5e: /admin/system/integrations/page.tsx
  After each page: pnpm typecheck, report result
  Do not proceed to next page without confirmation

STEP 6: Full verification
  - pnpm typecheck: 4/4 packages, 0 errors
  - pnpm lint: 4/4 packages, 0 warnings
  - npx prisma validate
  - next build (API): report total route count
  - next build (Web): report total page count
  - Report full output

STEP 7: CHANGELOG + CONTRACT + tag
  - Write CHANGELOG v0.9.0 entry
  - Update CONTRACT.md:
      CURRENT_VERSION=0.9.0
      CURRENT_CODENAME=Lens
      NEXT_VERSION=1.0.0
      NEXT_CODENAME=Feast
  - git commit -m "feat: v0.9.0 Lens — admin dashboard"
  - git tag v0.9.0
  - Report commit hash + tag
```

---

## SECTION 9: v0.9.0 DEFINITION OF DONE

- [ ] pnpm typecheck: 4/4 packages, 0 errors
- [ ] pnpm lint: 4/4 packages, 0 warnings
- [ ] npx prisma validate: passes
- [ ] next build (API + Web): 0 errors
- [ ] /admin/* redirects unauthenticated users to /sign-in
- [ ] /admin/* redirects commons-tier attendees to /home
- [ ] /admin/system/* redirects non-founding_table to /admin/events
- [ ] All 6 admin API routes return data correctly
- [ ] Events page shows event list with status update capability
- [ ] Content queue shows PENDING items with approve/reject actions
- [ ] Members page shows applications + intents + regional interest
- [ ] Agents page shows spend summary + SpendMeter
- [ ] Integrations page shows adapter health with auto-refresh
- [ ] AdminSidebar SYSTEM section hidden for non-founding_table users
- [ ] CHANGELOG.md updated
- [ ] CONTRACT.md: CURRENT_VERSION=0.9.0, NEXT_VERSION=1.0.0
- [ ] Git tagged as v0.9.0

---

END OF LENS BLUEPRINT v0.9.0
