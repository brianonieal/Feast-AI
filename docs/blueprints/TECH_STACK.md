# TECH_STACK.md
## Feast-AI: Technology Stack Decisions

---

## Guiding Principle

One language (TypeScript), one ecosystem, minimum infrastructure. Every technology choice
must justify its existence against the alternative of "just don't add it."

---

## Core Stack

### Monorepo: Turborepo + pnpm
**Why**: Shared types between mobile and API eliminate contract drift. Turborepo's caching
makes builds fast. pnpm's strict dependency resolution prevents phantom dependencies.
**Alternative considered**: Nx (too complex for this project size), separate repos (type drift).

### Mobile: Expo (React Native) + Expo Router
**Why**: The PANTHEON mockup is a native mobile app with 5-tab bottom navigation. Expo gives
us iOS + Android from one codebase with EAS Build for production. Expo Router provides
file-based routing matching Next.js conventions.
**Alternative considered**: Next.js PWA (no app store presence, limited native APIs), Flutter (different language).

### API: Next.js 15 (App Router, API Routes Only)
**Why**: Serverless API routes on Vercel. No server to manage. Same TypeScript as mobile.
App Router's route handlers are simple and type-safe.
**Alternative considered**: FastAPI/Python (second language, separate deployment), Express (less structured).
**Note**: We use Next.js ONLY for API routes. No pages, no SSR, no frontend. The mobile app IS the frontend.

### ORM + Database: Prisma + Supabase (PostgreSQL)
**Why**: Prisma generates TypeScript types from the schema, which we export to packages/shared.
Supabase provides managed PostgreSQL with pgvector extension (needed for RAG at v1.2.0),
auth helpers, and a dashboard for debugging.
**Alternative considered**: Drizzle (less mature ecosystem), Neon (good but Supabase pgvector is simpler for RAG).

### Auth: Clerk
**Why**: First-class Expo SDK (@clerk/clerk-expo), built-in Google/Apple OAuth, JWT validation
middleware for Next.js API routes. Handles the hard parts (token refresh, session management)
so we don't have to.
**Alternative considered**: Supabase Auth (works but requires more manual wiring on React Native side).

---

## AI Stack

### LLM: Anthropic Claude API
**Models used**:
- `claude-opus-4-6`: @STRATEGIST (complex planning, highest intelligence)
- `claude-sonnet-4-6`: @SAGE, @COORDINATOR, @COMMUNICATOR, @ANALYST (best balance of cost and capability)
- `claude-haiku-4-5`: @GUARDIAN (fast, cheap, routine monitoring)

**Why Claude over OpenAI**: Structured outputs with strict mode, better instruction following
for agent system prompts, adaptive thinking for cost control, prompt caching for 90% cost
reduction on static prefixes.

### AI SDK: Vercel AI SDK
**Why**: Streaming support, tool use abstractions, works with Anthropic provider. Same team
as our deployment platform (Vercel), so integration is tight.

### Embeddings: Anthropic Embeddings (or Voyage AI)
**Why**: Consistency with our LLM provider. Used for RAG at v1.2.0 (pgvector semantic search).
**Introduced**: v1.2.0

### Audio Transcription: Deepgram
**Why**: Fast, accurate, good API. Brian already uses it in EOM-AI.
**Introduced**: v0.5.0

### Image Generation: Replicate (Flux model)
**Why**: Brian already has the three-stage pipeline from EOM-AI (analysis -> prompt engineering -> generation).
**Introduced**: v0.5.0

---

## Infrastructure

### Deployment (API): Vercel
**Why**: Zero-config deployment for Next.js. Preview deployments on every PR. Serverless
scaling. Free tier is generous for development.

### Deployment (Mobile): EAS Build (Expo)
**Why**: Cloud builds for iOS + Android without a Mac. Over-the-air updates for JS changes.

### Background Jobs: Inngest
**Why**: Event-driven, serverless-native. No Redis/BullMQ/Celery to self-host. Functions
defined in code, triggered by events. Perfect for: event creation pipelines, content
generation, scheduled reminders, nightly cost reports.
**Alternative considered**: Trigger.dev (similar, but Inngest has better Vercel integration).
**Introduced**: v0.4.0

### Cache + Rate Limiting: Upstash Redis
**Why**: Serverless Redis with REST API. No Docker, no persistent connections. Pay per request.
Used for: rate limiting, session cache, temporary data.
**Alternative considered**: Self-hosted Redis in Docker (unnecessary infrastructure burden).
**Introduced**: v0.4.0

### Error Tracking: Sentry
**Why**: Industry standard. Expo SDK available. Source maps support.
**Introduced**: v0.8.0

---

## External Integrations

| Service | SDK/Library | Auth Method | Introduced |
|---------|------------|-------------|------------|
| Circle.so | REST API (v2) | API Key | v0.2.0 |
| HubSpot | REST API | API Key | v0.2.0 |
| Twilio | twilio SDK | Account SID + Auth Token | v0.3.0 |
| WordPress | REST API | App Password | v0.5.0 |
| Instagram | Graph API | OAuth 2.0 | v0.6.0 |
| Deepgram | @deepgram/sdk | API Key | v0.5.0 |
| Replicate | replicate SDK | API Token | v0.5.0 |

---

## Development Tools

| Tool | Purpose |
|------|---------|
| TypeScript 5.x | Type safety across entire monorepo |
| Zod | Runtime schema validation, shared between API and mobile |
| Vitest | Unit + integration testing (fast, ESM-native) |
| ESLint + Prettier | Code formatting and linting |
| Husky + lint-staged | Pre-commit hooks |
| GitHub Actions | CI: typecheck + lint + test on every PR |

---

## What We Explicitly Do NOT Use

| Technology | Reason |
|-----------|--------|
| Docker (for dev) | Unnecessary. Supabase CLI or direct connection to hosted DB. |
| Python | One-language monorepo. Everything is TypeScript. |
| Celery/BullMQ | Replaced by Inngest (serverless, no infrastructure). |
| Self-hosted Redis | Replaced by Upstash (serverless). |
| Express.js | Next.js API routes are sufficient. |
| MongoDB | PostgreSQL + pgvector covers all our needs. |
| GraphQL | REST with Zod schemas is simpler for this project's scope. |
| Kubernetes | Way too much infrastructure. Vercel + EAS handles scaling. |

---

*Last updated: 2026-03-22. Human approval required for stack changes.*
