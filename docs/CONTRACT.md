# CONTRACT.md
## Feast-AI: Inviolable Build Rules and Configuration Source of Truth

> **This document cannot be modified by any AI agent without explicit human approval.**

---

## CURRENT VERSION

```
CURRENT_VERSION=0.6.0
CURRENT_CODENAME=Beacon
NEXT_VERSION=0.7.0
NEXT_CODENAME=TBD
```

---

## Section 1: Architecture Rules

### 1.1 No Unauthorized Technology
If a package, service, or tool is not listed in CLAUDE.md's Tech Stack table or in blueprints/TECH_STACK.md, it cannot be used. To propose a new dependency:
1. State the need
2. List alternatives considered
3. Justify the choice
4. Wait for human approval
5. Add to TECH_STACK.md BEFORE writing any code that imports it

### 1.2 Single Source of Truth
- **Types**: packages/shared/src/types/ (consumed by both apps/api and apps/mobile)
- **Schemas**: packages/shared/src/schemas/ (Zod schemas that match Prisma models)
- **Design tokens**: packages/shared/src/theme.ts (PANTHEON colors, fonts, spacing)
- **Constants**: packages/shared/src/constants.ts (app name, version, API base URL)
- **Prisma schema**: apps/api/prisma/schema.prisma (single schema file, no splits)
- **Environment variables**: .env.example at repo root (canonical list of all env vars)

### 1.3 No Duplication
If a type, schema, constant, or utility exists in packages/shared, import it. Never redefine it in apps/api or apps/mobile.

### 1.4 Version Scope Enforcement
Every file, function, and component must be tagged with the version that introduces it. Use this comment format:
```typescript
// @version 0.1.0 - Foundation scaffold
export function healthCheck() { ... }
```

Do not build features from future versions. If you need something from a later version to complete current work, flag it as BLOCKED and explain.

---

## Section 2: Code Standards

### 2.1 TypeScript
- Strict mode: true in all tsconfig files
- No `any` types except documented escape hatches: `// ESCAPE: [reason]`
- All function parameters and return types must be explicitly typed
- Prefer `interface` for object shapes, `type` for unions/intersections

### 2.2 Naming Conventions
| Item | Convention | Example |
|------|-----------|---------|
| Files (components) | PascalCase | `EventCard.tsx` |
| Files (utilities) | camelCase | `formatDate.ts` |
| Files (API routes) | kebab in path | `api/events/[id]/route.ts` |
| Types/Interfaces | PascalCase | `FeastEvent` |
| Zod schemas | PascalCase + Schema | `CreateEventSchema` |
| Constants | UPPER_SNAKE | `API_BASE_URL` |
| Functions | camelCase | `createEvent()` |
| React components | PascalCase | `<EventCard />` |
| Database tables | snake_case | `feast_events` |
| Env variables | UPPER_SNAKE | `DATABASE_URL` |

### 2.3 Error Handling
- All API routes return consistent error shapes: `{ error: string, code: string, details?: unknown }`
- All async operations use try/catch with typed error handling
- Never swallow errors silently
- Log errors with context (which agent, which operation, what input)

### 2.4 Testing Requirements
- Every API route: at least 1 happy path + 1 error path test
- Every Council agent: at least 1 test per tool, 1 test for the system prompt producing valid output
- Every shared schema: validation tests for valid + invalid input
- Coverage target: 80% for apps/api, 60% for apps/mobile

---

## Section 3: Agent Rules

### 3.1 Anti-Hallucination (Mandatory for All Agents)
Every Council agent system prompt MUST include:
```
<constraints>
- If you do not have the data to answer, say "I don't have that information."
- Never fabricate names, dates, locations, quotes, or statistics.
- Only use information from the provided context and tool results.
- If a tool call fails, report the failure. Do not guess what the result would have been.
</constraints>
```

### 3.2 Structured Outputs
Every agent tool definition MUST use `strict: true` for input schemas. Every agent response that feeds into downstream processing MUST use `output_config.format` with a JSON schema.

### 3.3 Cost Controls
- @GUARDIAN monitors total API spend per day
- Hard limit: $10/day during development, $50/day in production
- If limit is approaching, @GUARDIAN downgrades all agents to Haiku 4.5
- Log every API call with model, tokens in, tokens out, cost estimate

### 3.4 Prompt Caching
All agent system prompts and tool definitions must be structured for prompt caching:
- Static content (system prompt, tool schemas, few-shot examples) at the top
- Variable content (user message, context) at the bottom
- Use `cache_control: { type: "ephemeral" }` on all agent API calls

---

## Section 4: Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...          # Supabase direct connection for migrations

# Auth
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...

# AI
ANTHROPIC_API_KEY=sk-ant-...

# Integrations (add as each integration comes online)
CIRCLE_API_KEY=                       # v0.2.0
HUBSPOT_API_KEY=                      # v0.2.0
INSTAGRAM_ACCESS_TOKEN=               # v0.6.0
WORDPRESS_APP_PASSWORD=               # v0.5.0

# Infrastructure
UPSTASH_REDIS_REST_URL=               # v0.4.0
UPSTASH_REDIS_REST_TOKEN=             # v0.4.0
INNGEST_EVENT_KEY=                    # v0.4.0
INNGEST_SIGNING_KEY=                  # v0.4.0

# Monitoring
SENTRY_DSN=                           # v0.8.0
```

---

## Section 5: Deployment Rules

### 5.1 Development
- Local Expo dev server for mobile: `pnpm --filter mobile dev`
- Local Next.js for API: `pnpm --filter api dev`
- Local PostgreSQL via Supabase CLI or Docker

### 5.2 Staging
- API: Vercel preview deployments (automatic on PR)
- Mobile: EAS development builds
- Database: Supabase staging project

### 5.3 Production
- API: Vercel production (main branch)
- Mobile: EAS production builds -> App Store / Play Store
- Database: Supabase production project
- Never deploy without: all tests passing, typecheck clean, CHANGELOG updated

---

*Last modified: 2026-03-22. Human approval required for all changes.*
