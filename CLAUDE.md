# FEAST-AI: CLAUDE CODE MASTER INSTRUCTIONS
# Clean Slate Build - March 2026
# Current Version: 0.1.0
# Target: v1.0.0 MVP -> v2.0.0 PANTHEON

---

## BOOT SEQUENCE (Execute Every Session)

```
STEP 1: Read this file (CLAUDE.md)
STEP 2: Read docs/VISION.md (what we're building and why)
STEP 2.5: View docs/FEAST-AI-PANTHEON-v2-mockup.jpg (visual target for the app)
        Read docs/blueprints/BRAND_ALIGNMENT.md (brand colors, typography, design patterns)
STEP 3: Read docs/CONTRACT.md (inviolable rules and config)
STEP 4: Read docs/CHANGELOG.md (last 10 entries)
STEP 5: Health check:
        pnpm typecheck          (npx tsc --noEmit across all packages)
        npx prisma validate     (schema integrity)
        pnpm lint               (zero warnings policy)
STEP 6: Confirm current version: git tag --sort=-v:refname | head -5
STEP 7: Read version scope in docs/blueprints/VERSION_ROADMAP.md for CURRENT version
STEP 8: Resume work within that scope ONLY
```

If health check fails: STOP. Report the failure. Fix it before writing new code.

---

## GOLDEN RULES

1. **Never build ahead of the current version scope.** If the roadmap says v0.3.0 adds SMS, do not write SMS code in v0.2.0.
2. **Never remove or weaken tests.** Tests are the immune system. Add tests, never delete them.
3. **Never add a dependency without checking CONTRACT.md first.** If it's not in the approved stack, flag it, justify it, wait for approval.
4. **Never guess at data.** If you don't have the data, say so. Never fabricate API responses, mock data that looks real, or hallucinate configuration values.
5. **Every file must pass typecheck.** Zero `any` types except in explicitly typed escape hatches documented with `// ESCAPE: reason`.
6. **Commit messages follow Conventional Commits.** `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
7. **When in doubt, ask.** Do not make architectural decisions silently.

---

## PROJECT IDENTITY

- **App Name**: Feast-AI
- **Tagline**: AI-native community operating system for meaningful gatherings
- **Owner**: Brian Onieal (brianonieal on GitHub)
- **Domain**: Community dinners, events, reflections, connection
- **Users**: Feast community members, hosts, facilitators, admins
- **Org**: The Feast (community dinner organization)

---

## TECH STACK (Approved)

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Monorepo | Turborepo + pnpm | latest | Workspace: apps/*, packages/* |
| Mobile | Expo (React Native) + Expo Router | SDK 52+ | 5-tab bottom nav (PANTHEON layout) |
| API | Next.js 15 (App Router) | 15.x | API routes only, no pages |
| ORM | Prisma | latest | PostgreSQL target |
| Database | Supabase (managed PostgreSQL) | - | pgvector extension for RAG |
| Auth | Clerk | latest | @clerk/clerk-expo + @clerk/nextjs |
| State (client) | Zustand | latest | Mobile app state |
| Styling | NativeWind (Tailwind for RN) | latest | PANTHEON design tokens |
| AI | Anthropic Claude API | claude-sonnet-4-6 | Council agents + content generation |
| AI SDK | Vercel AI SDK | latest | Streaming, tool use |
| Background Jobs | Inngest | latest | Event-driven workflows |
| Cache | Upstash Redis | latest | Rate limiting, session cache |
| Deployment (API) | Vercel | - | Serverless functions |
| Deployment (Mobile) | EAS Build (Expo) | - | iOS + Android builds |
| Types | Zod | latest | Runtime validation, shared schemas |
| Testing | Vitest + React Native Testing Library | latest | Unit + integration |

---

## MONOREPO STRUCTURE

```
feast-ai/
|-- CLAUDE.md                    <-- YOU ARE HERE
|-- turbo.json
|-- package.json
|-- pnpm-workspace.yaml
|-- tsconfig.base.json
|-- .env.example
|-- .gitignore
|
|-- docs/
|   |-- VISION.md                <-- Product vision, user personas, PANTHEON goal
|   |-- CONTRACT.md              <-- Inviolable rules, config source of truth
|   |-- CHANGELOG.md             <-- Version history
|   |-- blueprints/
|       |-- VERSION_ROADMAP.md   <-- Version scopes and feature gates
|       |-- TECH_STACK.md        <-- Detailed stack decisions and rationale
|       |-- COUNCIL_AGENTS.md    <-- Agent architecture, prompts, tool schemas
|       |-- INTEGRATIONS.md      <-- Circle, HubSpot, Instagram, WordPress APIs
|       |-- DATA_MODEL.md        <-- Prisma schema design, entity relationships
|       |-- BRAND_ALIGNMENT.md   <-- Brand colors, typography, design patterns (replaces DESIGN_SYSTEM.md)
|
|-- .claude/
|   |-- commands/
|       |-- build.md             <-- /build slash command
|       |-- test.md              <-- /test slash command
|       |-- deploy.md            <-- /deploy slash command
|
|-- packages/
|   |-- shared/                  <-- Shared types, schemas, constants, theme tokens
|       |-- src/
|           |-- types/           <-- User, Event, Reflection, Content, Agent types
|           |-- schemas/         <-- Zod schemas matching Prisma models
|           |-- constants.ts     <-- App name, version, API URL
|           |-- theme.ts         <-- PANTHEON design tokens
|           |-- index.ts         <-- Barrel export
|
|-- apps/
    |-- api/                     <-- Next.js API backend
    |   |-- prisma/
    |   |   |-- schema.prisma
    |   |-- src/
    |       |-- app/api/         <-- Route handlers
    |       |-- lib/             <-- DB client, auth, AI client, redis
    |       |-- council/         <-- Agent definitions, prompts, tool schemas
    |       |-- inngest/         <-- Background job functions
    |
    |-- mobile/                  <-- Expo React Native app
        |-- app/                 <-- Expo Router file-based routing
        |   |-- (tabs)/          <-- 5-tab bottom navigator
        |   |-- (auth)/          <-- Auth screens
        |-- components/          <-- UI components
        |-- hooks/               <-- Custom hooks
        |-- stores/              <-- Zustand stores
        |-- lib/                 <-- API client, helpers
```

---

## AGENT ARCHITECTURE (The Council)

Six specialized agents, each with a dedicated system prompt, tool set, and scope:

| Agent | Role | Model | Effort |
|-------|------|-------|--------|
| @SAGE | Conversational AI for members (chat, Q&A, reflections) | Sonnet 4.6 | medium |
| @COORDINATOR | Event lifecycle management (create, update, remind, close) | Sonnet 4.6 | medium |
| @ANALYST | Data analysis, engagement metrics, community health | Sonnet 4.6 | high |
| @COMMUNICATOR | Content generation (articles, social posts, newsletters) | Sonnet 4.6 | medium |
| @STRATEGIST | High-level planning, community growth, recommendations | Opus 4.6 | high |
| @GUARDIAN | Security, rate limiting, cost monitoring, anomaly detection | Haiku 4.5 | low |

All agents use:
- **Structured Outputs** (strict: true) for guaranteed JSON schemas
- **Anti-hallucination prompts** ("If unsure, say so. Never fabricate data.")
- **Parallel tool calling** when fetching independent data
- **Prompt caching** on system prompts and tool definitions

---

## WORKFLOW PATTERNS (from Feast-AI Workflow PDF)

### 1. Event Workflow
Host emails/texts event details -> @COORDINATOR parses -> structured event created ->
IF open: marketing to Instagram + full mailing list + Circle public
IF closed: marketing to specific Circle tier + CRM subset

### 2. Content Pipeline
Host sends photos + quotes + reflection after dinner -> @COMMUNICATOR transforms into:
- Website article (WordPress)
- Instagram post
- Circle recap
- Monthly newsletter blurb
Anti-hallucination: ONLY use provided source material. Never fabricate quotes.

### 3. Onboarding Flow
New user arrives -> @SAGE conversational intake -> classify interest:
- Attend a Dinner -> find regional events
- Become a Host -> host application pipeline
- Become a Facilitator -> facilitator application pipeline
- DIY (coming soon) -> waitlist
- Not sure -> newsletter signup

---

## ERROR HANDLING PROTOCOL

When you encounter an error:
1. Read the full error message and stack trace
2. Check if it's a known issue in CHANGELOG.md
3. Fix the root cause, not the symptom
4. Add a test that would have caught this error
5. Log the fix in CHANGELOG.md

Never: silence errors, add try/catch without handling, or skip the test step.

---

## COMMUNICATION STYLE

- Be direct. No filler.
- When reporting status, use: DONE / IN PROGRESS / BLOCKED / SKIPPED with a one-line reason.
- When proposing a change, format as: PROPOSAL: [what] / RATIONALE: [why] / RISK: [what could break]
- When asking a question, number the options and state your recommendation.
