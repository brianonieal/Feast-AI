# CHANGELOG.md
## Feast-AI Version History

All notable changes to this project will be documented in this file.
Format: [Conventional Changelog](https://www.conventionalcommits.org/)

---

## [1.5.0] - Chorus - 2026-03-25

**Scope**: Push notifications + weekly digest + 5 notification types
**Status**: COMPLETE

### Added
- **Prisma models**: `PushToken` (device push token registry), `NotificationPreference` (per-user 5-toggle prefs)
- **Notification service**: `apps/api/src/services/notifications.ts` — `sendPushNotification()`, `sendBulkNotification()`, `registerPushToken()`, `deactivatePushToken()`, `isNotificationEnabled()` with per-type preference check
- **Inngest cron: event-reminder**: Hourly cron, 23-25hr window, sends to attendees of upcoming events
- **Inngest cron: weekly-digest**: Sunday 10am UTC, sends community stats + upcoming events to all members with digest enabled
- **Inngest updates**: `application-submitted` + `event-created` now send push notifications as final step (non-critical, silent .catch)
- **Waitlist promotion notification**: `waitlist.ts` sends push on promotion (after DB update, never blocks promotion)
- **API routes**: `POST/DELETE /api/notifications/token`, `GET/PATCH /api/notifications/preferences`
- **Mobile hook**: `apps/mobile/hooks/usePushNotifications.ts` — registers Expo push token on app launch
- **PushNotificationProvider**: Clerk-aware wrapper in `apps/mobile/hooks/PushNotificationProvider.tsx`, wired into root `_layout.tsx`
- **expo-notifications + expo-device**: Installed in apps/mobile via `npx expo install`
- **expo-server-sdk**: Installed in apps/api
- **Circuit breaker on Expo**: `getBreaker('expo-push')` wraps all push sends

### Notable decisions
- expo-server-sdk chosen over OneSignal (simpler, no external dashboard, native Expo integration)
- EXPO_ACCESS_TOKEN optional in dev (Expo client accepts undefined)
- Preference check on every send adds latency — TODO: Redis cache in v1.6.0
- PushNotificationProvider wrapper keeps Clerk `useAuth()` out of the hook for testability
- Weekly digest cron is UTC (10am UTC = 6am ET) — TODO: timezone adjustment in v1.6.0
- All notification sends are non-critical: waitlist promotion, application submit, event creation all use `.catch(() => {})`
- Android notification channel set up before permission request
- 9 total Inngest functions (7 event-triggered + 2 cron)

### Definition of Done
- [x] PushToken + NotificationPreference models in schema
- [x] sendPushNotification() sends via Expo SDK
- [x] sendBulkNotification() chunks + sends in parallel
- [x] registerPushToken() validates Expo token format
- [x] isNotificationEnabled() checks per-user preferences
- [x] event-reminder cron: hourly, 23-25hr window
- [x] weekly-digest cron: Sunday 10am UTC
- [x] application-submitted sends welcome notification
- [x] event-created notifies city members
- [x] Waitlist promotion sends push
- [x] POST/DELETE /api/notifications/token
- [x] GET/PATCH /api/notifications/preferences
- [x] Mobile hook registers token on launch
- [x] PushNotificationProvider wired into _layout.tsx
- [x] pnpm typecheck: 4/4 packages, 0 errors
- [x] pnpm lint: 4/4 packages, 0 warnings
- [x] next build (API): 36 routes, 0 errors
- [x] next build (Web): 22 pages, 0 errors
- [x] Git tagged v1.5.0 + pushed

---

## [1.4.0] - Harvest - 2026-03-25

**Scope**: Analytics + impact dashboard + funder report PDF + community health score
**Status**: COMPLETE

### Added
- **Analytics service**: `apps/api/src/services/analytics.ts` — `getImpactMetrics()` (9 parallel DB queries), `getMemberReflectionHistory()`, `getCampaignData()` (city breakdown via groupBy), `calculateHealthScore()` (5-dimension weighted 0-100)
- **PDF generation**: `apps/api/src/services/funderReport.ts` — `generateFunderReportPDF()` using pdf-lib (pure TypeScript, Vercel-compatible). Branded report: title, impact table, 100 Dinners progress bar, health score, monthly stats, footer
- **GET /api/analytics/impact** — aggregated metrics, any auth, 5-min cache
- **GET /api/analytics/campaign** — 100 Dinners tracker with city breakdown, any auth, 5-min cache
- **GET /api/analytics/reflections/me** — personal reflection history, no cache
- **GET /api/analytics/funder-report** — JSON report for dashboard, founding_table only, 10-min cache
- **POST /api/analytics/funder-report/export** — PDF binary download, founding_table only, distribution rate limit
- **/admin/impact page**: Health score hero card (72px navy), 6 impact stat cards, 100 Dinners progress bar (40px teal/cream), monthly growth cards, PDF download button (founding_table only, blob URL pattern)
- **/profile/journey page**: Member reflection timeline (left-border-teal cards), stats row (reflections/member since/streak), warm empty state with link to /events
- **AdminSidebar**: "Impact" nav item (BarChart3 icon) after Insights
- **pdf-lib package**: Installed in apps/api

### Notable decisions
- pdf-lib used instead of Python/reportlab — Vercel serverless has no Python runtime
- getCampaignData() added beyond blueprint scope — city breakdown via Prisma groupBy
- Health score: 5-dimension weighted algorithm (dinner activity, reflection engagement, host network, attendance quality, growth momentum)
- PDF download uses blob URL pattern with proper cleanup (createObjectURL → click → revokeObjectURL)
- No schema changes — all data aggregated from existing tables
- select + include Prisma conflict fixed — used include-only pattern for attendance queries

### Definition of Done
- [x] pnpm typecheck: 4/4 packages, 0 errors
- [x] pnpm lint: 4/4 packages, 0 warnings
- [x] npx prisma validate: passes
- [x] next build (API): 34 routes, 0 errors
- [x] next build (Web): 22 pages, 0 errors
- [x] getImpactMetrics() returns valid ImpactMetrics
- [x] calculateHealthScore() returns 0-100 number
- [x] getMemberReflectionHistory() returns history for user
- [x] generateFunderReportPDF() returns valid PDF Buffer
- [x] GET /api/analytics/impact returns metrics
- [x] GET /api/analytics/campaign returns campaign data
- [x] GET /api/analytics/reflections/me returns member history
- [x] GET /api/analytics/funder-report returns JSON report
- [x] POST /api/analytics/funder-report/export returns PDF binary
- [x] /admin/impact page renders health score + all stats
- [x] /admin/impact PDF download works (founding_table only)
- [x] /profile/journey page renders reflection timeline
- [x] AdminSidebar has Impact nav item
- [x] CHANGELOG.md updated
- [x] Git tagged v1.4.0 + pushed

---

## [1.3.0] - Nexus - 2026-03-25

**Scope**: Advanced events — recurring templates, multi-host, waitlist, @STRATEGIST
**Status**: COMPLETE

### Added
- **Prisma models**: `EventTemplate`, `EventWaitlist`, `CoHost` + reverse relations on FeastEvent + User
- **Shared types**: `EventCadence`, `CoHostRole`, `CoHostStatus`, `EventTemplateData`, `WaitlistEntry`, `CoHostInvite`
- **@STRATEGIST agent**: `apps/api/src/council/strategist/index.ts` — `generateGrowthStrategy()` using Claude Opus + RAG, with empty-data early return
- **Event template service**: `createTemplate()`, `getTemplatesByUser()`, `spawnEventFromTemplate()` — spawns event + triggers pipeline + auto-embed
- **Waitlist service**: `joinWaitlist()`, `leaveWaitlist()`, `promoteFromWaitlist()`, `getWaitlistPosition()`, `getWaitlistForEvent()`
- **GET + POST /api/events/templates** — list + create templates
- **POST /api/events/templates/[id]/spawn** — create event from template (ownership check, future date validation)
- **POST + DELETE + GET /api/events/[id]/waitlist** — join, leave, check position (duplicate + attendance guards)
- **POST /api/events/[id]/cohosts** — invite co-host (primary host only, re-invite on declined)
- **PATCH /api/events/[id]/cohosts/[userId]** — accept/decline (invited user only)
- **DELETE /api/events/[id]/cohosts/[userId]** — remove co-host (primary host only, cannot remove self)
- **GET /api/strategist/growth** — founding_table only, ai rate limit, 10-min cache
- **RAG loop**: event-created pipeline auto-embeds events via `content/embed` Inngest event
- **Admin events page**: Templates tab (lazy fetch, inline date picker + spawn)
- **Admin agents page**: Growth Strategy section (Generate button, opportunity cards with priority badges)

### Notable decisions
- Re-invite on declined co-host updates existing record (no duplicate constraint violation)
- Claude Opus for @STRATEGIST — justified for high-stakes strategic planning, cached 10 min
- RAG loop closed for events via 3 entry points: Inngest pipeline, spawnFromTemplate, manual embed
- `confirmedSeats` tracked via EventAttendance relation, not denormalized field (schema reconciliation from blueprint)
- Admin templates tab uses lazy fetch — no API call until tab selected
- `capacity` and `date` field names used (blueprint assumed `maxSeats` and `scheduledAt`)

### Definition of Done
- [x] pnpm typecheck: 4/4 packages, 0 errors
- [x] pnpm lint: 4/4 packages, 0 warnings
- [x] npx prisma validate: passes
- [x] next build (API): 29 routes, 0 errors
- [x] next build (Web): 20 pages, 0 errors
- [x] EventTemplate, EventWaitlist, CoHost models in DB
- [x] Template CRUD + spawn from template
- [x] Waitlist join/leave/promote
- [x] @STRATEGIST generateGrowthStrategy()
- [x] Co-host invite/accept/decline/remove with permission checks
- [x] event-created pipeline auto-embeds
- [x] Admin events Templates tab
- [x] Admin agents Growth Strategy section
- [x] CHANGELOG.md updated
- [x] Git tagged v1.3.0 + pushed

---

## [1.2.0] - Prism - 2026-03-24

**Scope**: RAG + pgvector + @ANALYST agent + semantic search
**Status**: COMPLETE

### Added
- **Embedding model**: Prisma `Embedding` table + pgvector `vector(1536)` column via raw SQL + IVFFlat cosine similarity index
- **Voyage AI embeddings**: `apps/api/src/lib/embeddings.ts` — `generateEmbedding()`, `storeEmbedding()`, `semanticSearch()` using voyage-3 model, 1536 dimensions
- **embed-content Inngest function**: Triggered by `content/embed` event, handles 4 source types (reflection, article, event, member_intent), registered as 7th function
- **@ANALYST agent**: `apps/api/src/council/analyst/index.ts` — `generateHealthReport()` (5 RAG queries + 1 Claude call), `findSimilarIntents()` (never throws)
- **GET /api/search**: Semantic search across all embedded content, `ai` rate limit tier
- **GET /api/analyst/health**: Community health report, 5-min cache, any authenticated user
- **/admin/insights page**: Stats, top themes (navy pills), sentiment (teal card), regional strengths (bar chart), recommendations (mustard cards), "Regenerate Report" with loading state
- **AdminSidebar**: "Insights" nav item (Sparkles icon) under MANAGE section
- **@SAGE RAG enhancement**: `findSimilarIntents()` called after classification (logged, not yet influencing output — v1.3.0)
- **Auto-embedding**: New MemberIntents automatically embedded via Inngest on creation
- **VOYAGE_API_KEY**: Added to `.env.example` and `turbo.json`
- **voyageai package**: Installed in apps/api

### Notable decisions
- Voyage AI for embeddings (Anthropic SDK has no embeddings endpoint as of March 2026)
- vector column managed via raw SQL (Prisma does not support pgvector natively)
- IVFFlat index with lists=100 (appropriate for <1M vectors)
- RAG context logged but not used in classification output (full integration in v1.3.0 Nexus)
- Auto-embedding closes the RAG loop: classify → save → embed → available for future searches
- Health report cached 5 min at API layer to avoid repeated Voyage AI + Claude costs (~$0.002/report)

### Definition of Done
- [x] pgvector extension enabled in Supabase
- [x] Embedding model in Prisma schema
- [x] vector column + IVFFlat index added via SQL
- [x] generateEmbedding() returns float array (stubs with zeros when no key)
- [x] storeEmbedding() saves to DB + vector column
- [x] semanticSearch() returns ranked results by similarity
- [x] embed-content Inngest function registered (7 total)
- [x] @ANALYST generateHealthReport() returns valid report
- [x] GET /api/search returns semantic results
- [x] GET /api/analyst/health returns community report
- [x] /admin/insights page renders health report
- [x] AdminSidebar has Insights nav item
- [x] @SAGE logs RAG context from similar intents
- [x] pnpm typecheck: 4/4 packages, 0 errors
- [x] pnpm lint: 4/4 packages, 0 warnings
- [x] next build (API + Web): 0 errors
- [x] Git tagged v1.2.0 + pushed

---

## [1.1.0] - Ember - 2026-03-24

**Scope**: Resilience — circuit breakers, retry logic, dead letter queue, graceful degradation
**Status**: COMPLETE

### Added
- **CircuitBreaker class**: `packages/shared/src/lib/circuitBreaker.ts` — 3-state (CLOSED/OPEN/HALF_OPEN), generic `call<T>()` wrapper, singleton registry via `getBreaker()`
- **FailedJob model**: Dead letter queue table in Prisma — `failed_jobs` with 12 fields, 2 indexes
- **Dead letter service**: `apps/api/src/services/deadLetter.ts` — `saveFailedJob()` (never throws), `resolveFailedJob()`, `getFailedJobs()`, `getFailedJobCount()`
- **retry-failed-jobs Inngest function**: Cron every 15 minutes, retries up to 10 jobs from the last 24 hours, marks resolved as `auto-retry`
- **GET/POST /api/admin/system/failed-jobs**: View dead letter queue + resolve/retry jobs manually (founding_table only)
- **Admin sidebar badge**: Coral count badge on "Agents" nav item when failed jobs exist

### Changed
- **Resend adapter**: `resend.emails.send()` wrapped with circuit breaker (threshold: 3, recovery: 60s). Stub path bypasses breaker.
- **Twilio webhook**: `classifyIntent()` + `generateSageResponse()` wrapped in try/catch with warm fallback message. Signature verification stays unprotected (403 on bad signature is correct).
- **All 5 Inngest functions**: Added `onFailure` → `saveFailedJob()` handler for dead letter queue on exhaustion
- **POST /api/onboarding/classify**: Wrapped `processOnboarding()` with graceful degradation — returns `{ intent: 'newsletter', degraded: true }` on failure

### Notable decisions
- CircuitBreaker registry uses module-level Map (serverless cold-start caveat documented)
- `onFailure` uses `any` ESCAPE annotation (Inngest v4 type limitation)
- Manual job resolution in admin dashboard also triggers immediate retry via `inngest.send()`
- `contentSubmittedPipeline` retries kept at 2 (pre-existing value, not overridden)

### Definition of Done
- [x] pnpm typecheck: 4/4 packages, 0 errors
- [x] pnpm lint: 4/4 packages, 0 warnings
- [x] npx prisma validate: passes
- [x] next build (API + Web): 0 errors
- [x] FailedJob model in DB (npx prisma db push)
- [x] CircuitBreaker class exported from packages/shared
- [x] getBreaker() registry prevents duplicate breakers
- [x] Resend adapter wrapped with circuit breaker
- [x] Twilio webhook graceful on @SAGE failure
- [x] All 5 Inngest functions have onFailure → saveFailedJob
- [x] retry-failed-jobs function registered (6 total)
- [x] GET /api/admin/system/failed-jobs returns jobs + count
- [x] POST /api/admin/system/failed-jobs resolves a job
- [x] /api/onboarding/classify returns degraded response on failure
- [x] AdminSidebar shows coral badge when failed jobs > 0
- [x] CHANGELOG.md updated
- [x] Git tagged v1.1.0 + pushed

---

## [1.0.0] - Feast - 2026-03-24

**Scope**: Production MVP — deployment, Vercel hosting, production hardening
**Status**: COMPLETE — LIVE at app.feastongood.com

### Added
- **README.md**: Full project documentation with architecture, setup, deployment guide
- **Vercel deployment**: Two-project setup (feast-ai API + feast-ai-web frontend)
- **Production API proxy**: `NEXT_PUBLIC_API_URL` env-based rewrite in next.config.ts
- **Prisma generate**: Added to API build command for Vercel compatibility
- **turbo.json**: 15 environment variables declared for Turbo build pipeline

### Fixed
- Clerk SSG compatibility: `ClerkClientProvider` wrapper, dynamic imports for auth components
- Prisma enum imports: Replaced `z.nativeEnum(EventStatus)` with `z.enum()` string literals
- Prisma `JsonNull`: Replaced with `db.$runCommandRaw` pattern for Vercel builds
- Implicit `any` types: Added explicit typing on Prisma query results for strict mode
- `getDistributionTargets()` signature: Updated all callers after v1.0.1 cleanup

### Infrastructure
- API: 20 serverless routes on Vercel (feast-ai-nine.vercel.app)
- Web: 19 static pages on Vercel (feast-ai-web)
- Database: Supabase PostgreSQL (all migrations applied)
- Auth: Clerk (publishable + secret keys configured)
- Email: Resend (transactional emails active)
- Monitoring: Sentry (feast-ai-api + feast-ai-web projects)
- Background jobs: Inngest (5 pipeline functions registered)
- Rate limiting: Upstash Redis (5 tiers configured)

### Definition of Done
- [x] API deployed and returning 200 on /api/health
- [x] Web app deployed and serving static pages
- [x] Database in sync with Prisma schema
- [x] All env vars configured in both Vercel projects
- [x] Sentry receiving events from both projects
- [x] README.md documents full setup and architecture
- [x] Git tagged as v1.0.0

---

## [1.0.1] - Integration cleanup - 2026-03-24

### Removed
- Circle.so adapter (apps/api/src/integrations/circle/)
- HubSpot adapter (apps/api/src/integrations/hubspot/)
- WordPress adapter (apps/api/src/integrations/wordpress/)
- Circle/HubSpot/WordPress distribution channels
- HubSpot contact sync stub from onboarding service
- HubSpot fields (hubspotTags, hubspotPipeline) from OnboardingPath type
- Unused env vars from .env.example

### Kept
- Twilio webhook handler (inbound SMS still active)
- Instagram adapter (deferred, code retained for future use)
- All other integrations unchanged

---

## [0.9.0] - Lens - 2026-03-24

**Scope**: Admin dashboard — event management, content queue, members, agent status, integrations
**Status**: COMPLETE

### Added — Admin Pages (apps/web)
- **Admin shell**: `(admin)/layout.tsx` — role-guarded (`canViewHostDashboard`), sidebar + content layout
- **Admin redirect**: `/admin/page.tsx` → redirects to `/admin/events`
- **Events page**: `/admin/events/page.tsx` — stats row (4 cards), status + city filter pills, 7-column data table with EventStatusBadge, "New Event" CTA stub
- **Queue page**: `/admin/queue/page.tsx` — stats (3 cards), channel filter pills, ApprovalQueueCard list with optimistic approve/reject
- **Members page**: `/admin/members/page.tsx` — 3 sub-sections (Applications with approve/reject, Member Intents with MemberIntentBadge, Regional Interest with inline progress bars)
- **Agents page**: `/admin/system/agents/page.tsx` — SpendMeter, 4 stat cards, model override banner, agent breakdown table, recent activity table (founding_table only)
- **Integrations page**: `/admin/system/integrations/page.tsx` — 6 integration cards in 2-col grid, 30s auto-refresh, "Refresh All" button, relative timestamp (founding_table only)

### Added — Admin Components (apps/web)
- `AdminShell.tsx` — sidebar + content wrapper
- `AdminSidebar.tsx` — nav with active state via usePathname, SYSTEM section hidden for non-founding_table
- `AdminStatCard.tsx` — number + label + optional delta (teal positive, coral negative)
- `AdminDataTable.tsx` — generic table with skeleton loading, empty state, alternating rows
- `EventStatusBadge.tsx` — 6-status pill (DRAFT/SCHEDULED/MARKETED/LIVE/COMPLETED/CANCELLED)
- `ApprovalQueueCard.tsx` — left-border accent by channel, 150-char preview, action buttons
- `MemberIntentBadge.tsx` — 5-intent pill (ATTEND/HOST/FACILITATE/DIY/NEWSLETTER)
- `SpendMeter.tsx` — progress bar colored by status, DOWNGRADED badge, dollar display

### Added — Admin API Routes (apps/api)
- `GET /api/admin/events` — paginated, status/city filters, host name, attendance count
- `PATCH /api/admin/events/[id]/status` — transition validation (forward-only + CANCELLED)
- `GET /api/admin/queue` — PENDING content queue items with event info
- `GET /api/admin/members` — applications + intents + regional interest in one response
- `PATCH /api/admin/applications/[id]/status` — approve/reject with ALREADY_PROCESSED guard
- `GET /api/admin/system/agents` — spend summary + last 20 logs (founding_table only)
- `GET /api/admin/system/integrations` — Promise.allSettled health checks + static stubs (founding_table only)

### Added — Middleware
- `/admin/*` route protection: role-based (host, facilitator, kitchen, founding_table)
- `/admin/system/*` route protection: founding_table tier only

### Notable decisions
- **Two-tier access control**: `/admin/*` for hosts/facilitators/kitchen/founding_table, `/admin/system/*` for founding_table only. Enforced in both middleware (server) and layout (client).
- **Optimistic UI**: Approve/reject actions update local state immediately, then fire API call. No loading spinners between actions.
- **Client-side filtering**: Events and queue pages filter in-browser with useMemo rather than re-fetching from API. Reduces server load for small datasets.
- **30s auto-refresh on integrations**: setInterval with cleanup to prevent memory leaks. 5s tick timer for relative timestamp accuracy.
- **Static NOT CONFIGURED stubs**: Twilio and WordPress shown as cards even though adapters aren't wired, so the integrations page always shows the full service inventory.

### Definition of Done
- [x] pnpm typecheck: 4/4 packages, 0 errors
- [x] pnpm lint: 4/4 packages, 0 warnings
- [x] npx prisma validate: passes
- [x] next build (API): 20 routes, 0 errors
- [x] next build (Web): 19 static pages, 0 errors
- [x] /admin/* redirects unauthenticated to /sign-in
- [x] /admin/* redirects commons-tier attendees to /home
- [x] /admin/system/* redirects non-founding_table to /admin/events
- [x] All 7 admin API routes return data correctly
- [x] Events page: event list + status update
- [x] Queue page: PENDING items + approve/reject
- [x] Members page: applications + intents + regional interest
- [x] Agents page: spend summary + SpendMeter
- [x] Integrations page: health cards + auto-refresh
- [x] AdminSidebar SYSTEM section hidden for non-founding_table
- [x] CHANGELOG.md updated
- [x] Git tagged as v0.9.0

---

## [0.8.0] - Shield - 2026-03-24

**Scope**: Security + monitoring + @GUARDIAN agent + Sentry + cost controls
**Status**: COMPLETE

### Added
- **Prisma models**: `AgentSpendLog` (per-call cost tracking, 13 fields, 2 indexes), `DailySpendReport` (daily summary with downgrade tracking)
- **Shared types**: `packages/shared/src/types/guardian.ts` — `AgentName`, `ModelName`, `MODEL_COSTS`, `estimateCost()`, `SpendRecord`, `DailySpendSummary`, `SPEND_LIMITS`
- **Cost tracker**: `apps/api/src/lib/costTracker.ts` — `trackedCall()` wraps all Anthropic API calls with automatic cost logging, spend limit enforcement, auto-downgrade at 90%. 60s spend cache to minimize DB queries. Module-level model override with serverless caveat documented.
- **@GUARDIAN agent**: `apps/api/src/council/guardian/index.ts` — `getDailySpendSummary()`, `runDailyReport()`, `downgradeAllAgents()`, `restoreAgentModels()`. Status cascade: ≥90% downgraded, ≥80% critical, ≥50% warning, else normal.
- **Inngest function**: `daily-cost-report` (cron `0 0 * * *` UTC) — restores model defaults at start of day, generates daily spend report. 5 total Inngest functions.
- **API route**: `GET /api/guardian/spend` — live spend summary + historical date lookup via `?date=` param. 30s Cache-Control header. 13 total API routes.
- **Rate limit tiers**: Added `ai` (5/min) and `auth` (10/min) to existing 3 tiers. `/api/onboarding/classify` upgraded from `standard` to `ai`.
- **Sentry (apps/api)**: `@sentry/nextjs` with v8 instrumentation pattern. `src/instrumentation.ts` with server + edge init, `onRequestError` hook. 6 ignored error codes.
- **Sentry (apps/web)**: `@sentry/nextjs` with `src/instrumentation.ts` (server + edge), `src/instrumentation-client.ts` (browser), `onRouterTransitionStart` hook. `global-error.tsx` with Sentry capture + Feast-branded error page.
- **Dependency**: `@sentry/nextjs` (apps/api + apps/web)

### Notable decisions
- **Sentry v8 instrumentation pattern**: Blueprint specified deprecated `sentry.server.config.ts` / `sentry.edge.config.ts` files. Adapted to v8's `instrumentation.ts` `register()` hook pattern — the correct approach for Next.js 15.
- **`sourcemaps.disable` over `hideSourceMaps`**: Older option removed from Sentry v8 type definitions.
- **Module-level model override**: Acceptable for v0.8.0 — resets on serverless cold starts. Redis-backed persistence planned for v0.9.0.
- **60s spend cache**: Prevents DB query on every AI call while still catching limit breaches within 1 minute.
- **Spending limits**: $5/day dev, $25/day prod. Warning at 80%, auto-downgrade to Haiku at 90%, hard block at 100%.
- **`/api/webhooks/twilio` kept on webhook tier**: Even though it calls @SAGE, inbound webhook volume is controlled by Twilio, and AI cost is managed by @GUARDIAN spend limits.

### Definition of Done
- [x] pnpm typecheck: 4/4 packages, 0 errors
- [x] pnpm lint: 4/4 packages, 0 warnings
- [x] npx prisma validate: passes
- [x] next build (API): 13 routes, 0 errors
- [x] next build (web): 13 static pages, 0 errors
- [x] AgentSpendLog model in schema
- [x] DailySpendReport model in schema
- [x] trackedCall() logs cost after every Anthropic API call
- [x] Auto-downgrade triggers at 90% of daily limit
- [x] getDailySpendSummary() returns correct totals
- [x] daily-cost-report Inngest function registered (5 total)
- [x] /api/guardian/spend returns spend summary
- [x] Sentry initialized in apps/api (graceful when DSN missing)
- [x] Sentry initialized in apps/web (graceful when DSN missing)
- [x] global-error.tsx captures exceptions to Sentry
- [x] 'ai' rate limit tier applied to AI-triggering routes
- [x] CHANGELOG.md updated
- [x] Git tagged as v0.8.0

---

## [0.7.0] - Compass - 2026-03-24

**Scope**: Member onboarding + AI classification + CRM sync + welcome emails
**Status**: COMPLETE

### Added
- **Prisma models**: `Application` (role, status, motivation, city), `RegionalInterest` (city normalization + interest tracking), `MemberIntentType` enum, `ApplicationRole` enum, `ApplicationStatus` enum
- **Shared types**: `packages/shared/src/types/onboarding.ts` — `MemberIntentType`, `ApplicationRole`, `ApplicationStatus`, `ClassificationResult`, `OnboardingPath`, `EmailTemplate`, `ONBOARDING_PATHS`, `ApplicationSubmission`
- **Resend email adapter**: `apps/api/src/integrations/resend/adapter.ts` — sendWelcomeEmail, sendApplicationConfirmation, sendGenericEmail. Lazy client init, graceful stub when RESEND_API_KEY missing. Resend v6 discriminated union pattern.
- **@SAGE classification**: `apps/api/src/council/sage/classifyOnboarding.ts` — Claude-powered intent classifier. JSON-only system prompt, code fence stripping, confidence clamping, intent validation. 5 intents: attend, host, facilitate, diy, newsletter.
- **Onboarding service**: `apps/api/src/services/onboarding.ts` — processOnboarding() orchestrates classify → upsert RegionalInterest → save Application → send welcome email → trigger Inngest pipeline. City normalization on upsert. HubSpot sync stubbed with TODO.
- **API route**: `POST /api/applications` — authenticated, rate-limited (standard), Zod validation, duplicate check (409), Inngest fail-safe pattern, lowercase→uppercase enum conversion.
- **API route**: `POST /api/onboarding/classify` — unauthenticated (pre-registration flow), rate-limited (standard), returns classification result with suggested path.
- **Inngest function**: `application-submitted-pipeline` — fetches application, builds classification message from role + motivation, runs processOnboarding(), marks application processing_complete.
- **Dependency**: `resend@^6.9.4` (apps/api only)
- **Web config**: API proxy rewrite in `apps/web/next.config.ts` (`/api/:path*` → `http://localhost:3000/api/:path*`)
- **ApplicationForm.tsx**: Wired to real POST /api/applications endpoint. Added isSubmitting + error states, 409 duplicate handling, coral error display, disabled states during submission.

### Notable decisions
- **Resend over HubSpot for email**: HubSpot transactional email requires Marketing Hub Professional. Resend is simpler, cheaper, and purpose-built for transactional email. HubSpot sync stubbed with explicit TODO for v0.8.0.
- **Unauthenticated classify route**: Intentional — runs before user has an account (new visitor onboarding flow). Rate-limited to prevent abuse of Claude API calls.
- **API proxy rewrite**: Required because web (port 3001) and API (port 3000) are separate Next.js apps in development. Without the rewrite, form submissions would 404.
- **classifyOnboarding.ts not classify.ts**: Existing `classify.ts` in sage/ handles SMS conversation classification. New file named to avoid collision.

### Definition of Done
- [x] pnpm typecheck: 4/4 packages, 0 errors
- [x] pnpm lint: 4/4 packages, 0 warnings
- [x] npx prisma validate: passes
- [x] next build (API): 12 routes, 0 errors
- [x] next build (web): 13 static pages, 0 errors
- [x] Application model in Prisma schema
- [x] RegionalInterest model in Prisma schema
- [x] Resend adapter with welcome + confirmation templates
- [x] @SAGE classifyOnboarding with 5 intents
- [x] processOnboarding() full pipeline
- [x] POST /api/applications (auth + rate limit + Zod + duplicate check)
- [x] POST /api/onboarding/classify (no auth + rate limit)
- [x] application-submitted-pipeline registered in Inngest (4 total)
- [x] ApplicationForm.tsx wired to real endpoint
- [x] API proxy rewrite in next.config.ts
- [x] .env.example updated with RESEND_API_KEY
- [x] CHANGELOG.md updated
- [x] Git tagged as v0.7.0
- [ ] prisma migrate dev (pending — requires live DATABASE_URL)

---

## [0.6.0] - Beacon - 2026-03-24

**Scope**: Multi-channel content distribution engine
**Status**: COMPLETE

### Added
- **Prisma models**: `ContentApprovalQueue` (14 fields, approval workflow), `DistributionLog` (audit trail), `ApprovalStatus` enum
- **Shared types**: `packages/shared/src/types/distribution.ts` — `DistributionChannel`, `DistributionTarget`, `DistributionResult`, `ApprovalQueueItem`, `getDistributionTargets()`
- **Rate limiting**: `apps/api/src/lib/rateLimit.ts` — Upstash Redis singleton, 3 tiers (standard 60/min, distribution 10/min, webhook 100/min)
- **Instagram adapter**: `apps/api/src/integrations/instagram/adapter.ts` + `types.ts` — createContainer, publishContainer, post (deferred to v0.7.x, requires Meta app review)
- **HubSpot email methods**: `sendTransactionalEmail()`, `sendToList()` added to existing adapter + `types.ts`
- **Distribution service**: `apps/api/src/services/distribution.ts` — sequential multi-channel orchestration with per-channel logging
- **API route**: `POST /api/content/approve` — admin approve/reject queue items, triggers Inngest on approval
- **API route**: `POST /api/content/distribute` — manual distribution trigger for approved items
- **Inngest function**: `content-approved-pipeline` — fetches queue item, determines targets, calls distributeContent()
- **Dependencies**: `@upstash/ratelimit`, `@upstash/redis` (apps/api only)

### Changed
- **Inngest type annotations**: Added `ReturnType<typeof inngest.createFunction>` to all 3 pipeline exports (fixes Inngest v4 + Next.js build portability issue)
- **Distribution routing**: Public events → hubspot_email + circle_public. Closed events → circle_tier + crm_regional
- **Instagram deferred**: Removed from `DistributionChannel` and `getDistributionTargets()` — adapter stays in codebase for v0.7.x

### Definition of Done
- [x] pnpm typecheck: 4/4 packages, 0 errors
- [x] pnpm lint: 4/4 packages, 0 warnings
- [x] npx prisma validate: passes
- [x] next build (API): 10 routes, 0 errors
- [x] next build (web): 13 static pages, 0 errors
- [x] ContentApprovalQueue model in schema
- [x] DistributionLog model in schema
- [x] Rate limiting on /api/content/approve (standard) and /api/content/distribute (distribution)
- [x] Instagram adapter createContainer + publishContainer (deferred — not called in v0.6.0)
- [x] HubSpot adapter sendToList
- [x] distributeContent() routes correctly for open vs closed events
- [x] content-approved-pipeline registered in Inngest serve route
- [x] All new env vars documented in .env.example
- [x] CHANGELOG.md updated
- [ ] Git tagged as v0.6.0 (pending)
- [ ] prisma migrate dev (pending — requires live DATABASE_URL)

---

## [pre-0.6.0] - CommunityTier enum alignment - 2026-03-23

### Changed
- **CommunityTier enum**: renamed values to align with proposal language
  - PUBLIC → commons
  - REGIONAL → kitchen
  - FUNDERS → founding_table
  - COOPERATIVE → founding_table
- **packages/shared**: added UserTier type alias, kept CommunityTier for DB compatibility
- **schema.prisma**: updated enum + default values on User and FeastEvent models

---

## [0.5.0] - Echo - 2026-03-23

### Scope
Post-dinner content transformation. @COMMUNICATOR agent, content submission pipeline, audio transcription, WordPress publishing.

### Status: COMPLETE

### Added
- **Prisma models**: ContentSubmission (photos, quotes, audio, transcript), PublishedContent (multi-channel output with publish status), Reflection (post-dinner attendee reflections), plus ContentStatus, ContentChannel, PublishStatus enums
- **@COMMUNICATOR agent**: System prompt with strict anti-hallucination constraints, content transformation pipeline (raw materials -> article + Instagram + Circle recap + newsletter via Claude)
- **Deepgram adapter**: REST API transcription for pre-recorded audio (nova-2 model, smart formatting)
- **WordPress adapter**: createPost (drafts for admin review), health check, Basic Auth
- **Content API**: POST /api/content (submit raw materials, triggers Inngest pipeline), GET /api/content (list submissions)
- **Inngest content-submitted pipeline**: 7-step background job — mark PROCESSING, transcribe audio (Deepgram), transform content (@COMMUNICATOR), save PublishedContent records, publish WordPress draft, post Circle recap, mark READY_FOR_REVIEW
- **Integration status**: Updated to include Deepgram + WordPress health checks
- **Shared types**: ContentSubmission, PublishedContent, Reflection, DinnerQuote, ContentPipelineInput/Output + Zod schemas

### Dependencies Added
- `@deepgram/sdk` — Audio transcription (REST API used directly)

### Definition of Done
- [x] `pnpm typecheck` passes with 0 errors (3/3 packages)
- [x] `npx prisma validate` passes
- [x] `pnpm lint` passes with 0 warnings
- [x] @COMMUNICATOR transforms raw materials into 4 channel outputs
- [x] Deepgram adapter transcribes audio via REST
- [x] WordPress adapter creates draft posts
- [x] Content pipeline: submit -> transcribe -> transform -> save -> publish
- [x] Anti-hallucination: source-material-only constraint in system prompt
- [ ] End-to-end test (requires Deepgram + WordPress + Circle API keys)
- [ ] Git tagged as v0.5.0

---

## [0.4.0] - Spark - 2026-03-23

### Scope
Event creation pipeline. @COORDINATOR agent, CRUD API, Circle posting, Inngest background jobs.

### Status: COMPLETE

### Added
- **Event CRUD API**: GET /api/events (list with city/status filters, pagination), GET /api/events/:id (detail with host + attendances), POST /api/events (create, host/admin only, Zod validated), PATCH /api/events/:id (update, host/admin only)
- **@COORDINATOR agent**: System prompt from COUNCIL_AGENTS.md spec, parseEventRequest tool that extracts structured event details from natural language via Claude, identifies missing fields
- **Circle.so adapter extended**: listSpaces() and createPost() methods for event announcements
- **Inngest pipeline**: event-created-pipeline background job — marks SCHEDULED, posts to Circle, updates to MARKETED with Circle post ID, 3 retries
- **Inngest serve endpoint**: GET/POST/PUT /api/inngest for function registration
- **Inngest client**: apps/api/src/lib/inngest.ts singleton
- **Clerk middleware**: Added /api/inngest as public route

### Dependencies Added
- `inngest` — Event-driven serverless background jobs

### Definition of Done
- [x] `pnpm typecheck` passes with 0 errors (3/3 packages)
- [x] `npx prisma validate` passes
- [x] `pnpm lint` passes with 0 warnings
- [x] Event CRUD endpoints with auth + validation
- [x] @COORDINATOR parses natural language event requests
- [x] Circle adapter can list spaces and create posts
- [x] Inngest pipeline: event.created -> SCHEDULED -> Circle -> MARKETED
- [ ] End-to-end test: text -> event -> Circle post (requires all API keys)
- [ ] Git tagged as v0.4.0

---

## [0.3.0] - Signal - 2026-03-23

### Scope
Inbound message handling via Twilio. @SAGE agent for intent classification and conversational intake.

### Status: COMPLETE

### Added
- **InboundMessage model**: Prisma model with MessageChannel (SMS/WHATSAPP/EMAIL/WEB) and MessageIntent (8 intents) enums, linked to User, message logging with response tracking
- **Shared types**: InboundMessage, IntentClassification, MessageChannel, MessageIntent types; Zod schemas including TwilioWebhookSchema
- **Twilio integration**: twilio SDK, webhook signature verification, SMS send helper, phone-based user lookup
- **@SAGE agent (first Council agent)**: system prompt from COUNCIL_AGENTS.md spec, intent classification via Claude claude-sonnet-4-6, conversational response generation with intent-specific guidance
- **POST /api/webhooks/twilio**: Full pipeline — verify signature, parse payload, classify intent, log message, generate @SAGE response, send SMS reply, return TwiML
- **Clerk middleware**: Added /api/webhooks/twilio as public route

### Dependencies Added
- `twilio` — SMS/WhatsApp messaging
- `@anthropic-ai/sdk` — Direct Anthropic API access for Council agents
- `ai` + `@ai-sdk/anthropic` — Vercel AI SDK with Anthropic provider

### Definition of Done
- [x] `pnpm typecheck` passes with 0 errors (3/3 packages)
- [x] `npx prisma validate` passes
- [x] `pnpm lint` passes with 0 warnings
- [x] Twilio webhook handler processes inbound SMS
- [x] Intent classification returns structured IntentClassification
- [x] @SAGE generates contextual conversational responses
- [x] Messages logged to InboundMessage table with intent + response
- [ ] End-to-end SMS test (requires Twilio credentials + phone number)
- [ ] Git tagged as v0.3.0

---

## [0.2.0] - Conduit - 2026-03-23

### Scope
Authentication, user profile, and platform connector scaffolding (Circle.so, HubSpot).

### Status: COMPLETE

### Added
- **Clerk Auth (API)**: @clerk/nextjs middleware protecting all non-public routes, auth helpers (getAuthUser, requireAuth, getClerkUserDetails), Clerk webhook handler for user.created/updated/deleted sync to Prisma DB, svix webhook verification
- **Clerk Auth (Mobile)**: ClerkProvider in root layout with expo-secure-store token cache, sign in screen (email/password), sign up screen with email verification flow, auth layout group
- **Profile Screen**: Real user data from Clerk (avatar initial, name, email), sign out button, settings section placeholders matching PANTHEON mockup
- **Circle.so Adapter**: Scaffold with typed health check (GET /spaces), singleton instance, API key auth
- **HubSpot Adapter**: Scaffold with typed health check (GET /crm/v3/objects/contacts), singleton instance, Bearer token auth
- **Integration Status Endpoint**: GET /api/integrations/status returns parallel health checks for all adapters
- **Shared Types**: BaseAdapter interface, AdapterHealthResult, IntegrationStatus types
- **CONTRACT.md**: Bumped CURRENT_VERSION to 0.2.0

### Definition of Done
- [x] `pnpm typecheck` passes with 0 errors (3/3 packages)
- [x] `npx prisma validate` passes
- [x] `pnpm lint` passes with 0 warnings
- [x] Clerk auth flow: sign up, sign in, sign out (mobile screens built)
- [x] Protected API routes with Clerk middleware
- [x] User profile screen with Clerk data
- [x] Circle.so adapter scaffold with health check
- [x] HubSpot adapter scaffold with health check
- [x] GET /api/integrations/status returns both adapter statuses
- [ ] Auth flow works end-to-end (requires Clerk keys + device test)
- [ ] Adapters connect successfully (requires API keys)
- [ ] Git tagged as v0.2.0

---

## [0.1.0] - Foundation - 2026-03-23

### Scope
Project scaffolding, monorepo setup, shared types, health check endpoint, mobile shell with 5-tab layout.

### Status: COMPLETE

### Added
- **Root configs**: package.json, pnpm-workspace.yaml, turbo.json, tsconfig.base.json, .gitignore, .env.example
- **packages/shared**: User and FeastEvent types, Zod schemas (UserSchema, CreateUserSchema, FeastEventSchema, CreateEventSchema, EventAttendanceSchema), PANTHEON design tokens (colors, typography, spacing, radius, shadows), app constants
- **apps/api**: Next.js 15 App Router (API routes only), Prisma schema with User, FeastEvent, and EventAttendance models (5 enums: UserRole, CommunityTier, EventType, EventStatus, RSVPStatus), health check route (GET /api/health), database client singleton
- **apps/mobile**: Expo SDK 52 with Expo Router, 5-tab bottom navigator (Home, Circle, Events, Impact, Profile) with Ionicons, placeholder screens with PANTHEON dark theme styling, SafeAreaView on all screens
- **Monorepo**: Turborepo task pipeline (dev, build, typecheck, lint, test, clean), pnpm workspace linking
- **TypeScript**: strict mode across all packages, @types/react ~18.3.0 override for React 18/19 compat
- **pnpm.onlyBuiltDependencies**: approved builds for Prisma, esbuild, sharp, unrs-resolver

### Definition of Done
- [x] `pnpm typecheck` passes with 0 errors (3/3 packages)
- [x] `npx prisma validate` passes
- [x] `pnpm lint` passes with 0 warnings
- [x] Health check endpoint returns `{ status: "ok", version: "0.1.0" }`
- [ ] Mobile app launches in Expo Go with 5 tabs visible (requires device/emulator)
- [x] All shared types importable from both apps/api and apps/mobile
- [x] Git tagged as v0.1.0
