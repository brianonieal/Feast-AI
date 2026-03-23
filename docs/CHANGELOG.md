# CHANGELOG.md
## Feast-AI Version History

All notable changes to this project will be documented in this file.
Format: [Conventional Changelog](https://www.conventionalcommits.org/)

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
