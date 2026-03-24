# CHANGELOG.md
## Feast-AI Version History

All notable changes to this project will be documented in this file.
Format: [Conventional Changelog](https://www.conventionalcommits.org/)

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
