# FEAST-AI v1.0.0 FEAST BLUEPRINT
# Codename: Feast
# Architect: Claude Sonnet 4.6 (chat)
# Executor: Claude Opus 4.6 (Claude Code) + Human-in-the-loop (Brian)
# Date: March 2026
# Scope: Production deployment -- GitHub + Vercel + EAS + smoke test

---

## OPUS BOOT INSTRUCTIONS

Read in this order before writing a single line of code:
1. docs/blueprints/CONTRACT.md
2. docs/CHANGELOG.md (last 10 entries)
3. docs/blueprints/TECH_STACK.md
4. This file (FEAST_BLUEPRINT_v1.0.0.md) in full

Then run the health check:
  pnpm typecheck
  pnpm lint
  npx prisma validate

All three must pass before writing any code.
Current version: 1.0.0
Sacred Rule: This is the production release version.
All code changes must be minimal and deployment-focused only.

---

## SECTION 1: SCOPE

v1.0.0 Feast is the production deployment version.
Code changes are minimal -- this version is about
getting what's already built running in production.

### What gets built/configured:
1. API URL environment variable -- fixes the prod API proxy
2. README.md -- complete project documentation
3. GitHub push -- all code to brianonieal/Feast-AI
4. Vercel feast-ai -- connect GitHub, configure apps/api
5. Vercel feast-ai-web -- create project, configure apps/web
6. Environment variables -- all keys set in both Vercel projects
7. Custom domain -- app.feastongood.com on feast-ai-web
8. Production database -- run prisma migrate deploy
9. Smoke test -- verify end-to-end flow works
10. Mobile build -- EAS build configuration (setup only, not submit)

### What does NOT change:
- No new features
- No new API routes
- No schema changes
- No frontend changes (except the API URL env var fix)

---

## SECTION 2: CODE CHANGES (minimal)

### 2.1 API URL fix (apps/web/next.config.ts)

The current rewrites() hardcodes localhost:3000.
In production the API runs on Vercel, not localhost.

Update apps/web/next.config.ts rewrites():

```typescript
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: process.env.NEXT_PUBLIC_API_URL
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`
        : 'http://localhost:3000/api/:path*',
    },
  ];
},
```

Add to apps/web/.env.local (development -- gitignored):
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Add to .env.example:
```
# v1.0.0 Feast -- Production
NEXT_PUBLIC_API_URL=https://feast-ai.vercel.app
```

In Vercel feast-ai-web project, set:
  NEXT_PUBLIC_API_URL=https://feast-ai.vercel.app
  (or whatever the API project's URL is)

### 2.2 Production Prisma config check

Verify apps/api/prisma/schema.prisma datasource uses
connection pooling correctly for Vercel serverless:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

This should already be correct from v0.1.0.
The DATABASE_URL (pooled, port 6543) handles app queries.
The DIRECT_URL (direct, port 5432) handles migrations.

### 2.3 README.md

Create a comprehensive README.md at the repo root:

```markdown
# Feast-AI

AI-native community operating system for The Feast.

## What it is
Feast-AI automates the operational backbone of running a community
dinner movement: event creation, marketing, content capture,
member onboarding, and community health tracking.

## Architecture
- **Backend**: Next.js 15 API routes on Vercel (apps/api)
- **Frontend**: Next.js 15 App Router on Vercel (apps/web)
- **Mobile**: Expo React Native (apps/mobile)
- **Database**: Supabase PostgreSQL + pgvector
- **Auth**: Clerk
- **AI**: Anthropic Claude (6 Council agents)
- **Jobs**: Inngest
- **Cache**: Upstash Redis
- **Email**: Resend
- **Monitoring**: Sentry

## The Council (AI Agents)
| Agent | Model | Role |
|-------|-------|------|
| @SAGE | Sonnet | Conversational intake + onboarding |
| @COORDINATOR | Sonnet | Event lifecycle management |
| @COMMUNICATOR | Sonnet | Content generation + distribution |
| @ANALYST | Sonnet | Community data analysis |
| @STRATEGIST | Opus | Growth recommendations |
| @GUARDIAN | Haiku | Cost monitoring + security |

## Getting started

### Prerequisites
- Node.js 18+
- pnpm 8+
- Supabase project
- Clerk application
- Anthropic API key

### Setup
```bash
git clone https://github.com/brianonieal/Feast-AI
cd Feast-AI
pnpm install
cp .env.example .env
# Fill in .env with your keys
cd apps/api && npx prisma db push
pnpm dev
```

### Development
```bash
pnpm dev          # runs all apps in parallel
pnpm typecheck    # type check all packages
pnpm lint         # lint all packages
pnpm build        # build all packages
```

## Version history
See docs/CHANGELOG.md for full version history.
Current version: 1.0.0 Feast (MVP)

## Built by
Brian Onieal — MS AI Engineering, Johns Hopkins University
```

---

## SECTION 3: GITHUB PUSH

Opus does NOT handle the GitHub push -- this is a human step.
Brian runs these commands manually.

```powershell
cd D:\feast-ai

# If remote not already set:
git remote add origin https://github.com/brianonieal/Feast-AI.git

# Push all branches and tags:
git push -u origin main
git push origin --tags
```

Verify at https://github.com/brianonieal/Feast-AI that all
9 version tags (v0.1.0 through v0.9.0) and the main branch
are visible before proceeding to Vercel setup.

---

## SECTION 4: VERCEL SETUP

This section is executed by Brian in the Vercel dashboard.
Opus documents the exact steps -- Brian follows them.

### 4.1 feast-ai project (API -- already exists)

Go to: https://vercel.com/brianonieal-3707s-projects/feast-ai

Settings → Git:
- Connect to GitHub → brianonieal/Feast-AI
- Production branch: main

Settings → General:
- Root Directory: apps/api
- Build Command: pnpm build (or leave as detected)
- Output Directory: .next
- Install Command: pnpm install --frozen-lockfile

Settings → Environment Variables:
Add ALL of these (Production + Preview + Development):

```
# Database
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres

# Auth
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...

# AI
ANTHROPIC_API_KEY=sk-ant-...

# Background jobs
INNGEST_EVENT_KEY=evt_...
INNGEST_SIGNING_KEY=signkey-...

# Cache
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Email
RESEND_API_KEY=re_...

# Error tracking
SENTRY_DSN=https://...
SENTRY_AUTH_TOKEN=sntrys_...

# Placeholders (add real values when The Feast provides them)
CIRCLE_API_KEY=
HUBSPOT_API_KEY=
CIRCLE_PUBLIC_SPACE_ID=
CIRCLE_KITCHEN_SPACE_ID=
CIRCLE_FOUNDING_TABLE_SPACE_ID=
HUBSPOT_COMMUNITY_LIST_ID=
FEAST_FROM_EMAIL=hello@feastongood.com
```

### 4.2 feast-ai-web project (Web -- create new)

Go to: https://vercel.com/brianonieal-3707s-projects
Click "Add New Project"
- Import from GitHub: brianonieal/Feast-AI
- Root Directory: apps/web
- Framework: Next.js (auto-detected)
- Project name: feast-ai-web

Settings → Environment Variables:
Add ALL of these:

```
# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# API URL (points to the feast-ai Vercel project)
NEXT_PUBLIC_API_URL=https://feast-ai.vercel.app

# Error tracking
NEXT_PUBLIC_SENTRY_DSN=https://...
SENTRY_AUTH_TOKEN=sntrys_...
```

### 4.3 Custom domain

In feast-ai-web project:
Settings → Domains → Add Domain
Enter: app.feastongood.com

Vercel will show DNS records to add.
Add them in your DNS provider (wherever feastongood.com is managed).
DNS propagation: 5-60 minutes.

---

## SECTION 5: PRODUCTION DATABASE

After Vercel is connected and first deploy succeeds, run:

```powershell
cd D:\feast-ai\apps\api
npx prisma migrate deploy
```

`migrate deploy` (not `migrate dev`) is the production command.
It applies all pending migrations in order without creating
new ones. Safe for production databases.

If migrate deploy fails, fall back to:
```powershell
npx prisma db push
```

Then verify in Supabase Table Editor that all tables exist.

---

## SECTION 6: SMOKE TEST

After both Vercel projects are deployed, run this checklist
manually to verify the end-to-end flow works in production.

### 6.1 API health check
```
GET https://feast-ai.vercel.app/api/health
Expected: { status: "ok", version: "1.0.0" }
```

### 6.2 Web app loads
```
Visit: https://app.feastongood.com (or feast-ai-web.vercel.app)
Expected: Redirects to /sign-in, Feast brand visible
```

### 6.3 Auth flow
```
Sign up with a test email
Expected: Redirects to /home, DailyNourishment card visible
```

### 6.4 Application form
```
Visit /apply, fill out Host application, submit
Expected:
  - "Application received" success message
  - Welcome email arrives at test email address
  - Application appears in /admin/members (as host user)
```

### 6.5 Admin dashboard
```
Visit /admin/events
Expected: Events page loads (empty is fine), no errors
```

### 6.6 Guardian spend check
```
GET https://feast-ai.vercel.app/api/guardian/spend
Expected: { success: true, summary: { totalCostUsd: ..., status: "normal" } }
```

### 6.7 Inngest dashboard
```
Visit https://app.inngest.com
Expected: 5 functions registered and visible
```

### 6.8 Sentry
```
Visit https://feast-ai.sentry.io
Expected: No critical errors from the smoke test
```

---

## SECTION 7: MOBILE BUILD SETUP (EAS)

This is setup only -- not submitting to app stores yet.

Install EAS CLI:
```powershell
npm install -g eas-cli
eas login
```

Configure EAS in apps/mobile:
```powershell
cd D:\feast-ai\apps\mobile
eas build:configure
```

This creates eas.json. Verify it has:
```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

Add Expo-specific env vars to apps/mobile/.env:
```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
EXPO_PUBLIC_API_URL=https://feast-ai.vercel.app
```

First development build (run when ready to test on device):
```powershell
eas build --platform android --profile development
```
This takes 10-15 minutes on EAS cloud. Not required for v1.0.0
MVP -- just document the command.

---

## SECTION 8: EXECUTION ORDER

```
STEP 1: Code changes (Opus)
  - Update apps/web/next.config.ts rewrites()
  - Create apps/web/.env.local
  - Update .env.example with NEXT_PUBLIC_API_URL
  - Write README.md at repo root
  - Run: pnpm typecheck + pnpm lint + next build (web)
  - Run: git add -A + git commit -m "feat: v1.0.0 Feast — production ready"
  - Report: build output, commit hash

STEP 2: GitHub push (Brian -- manual)
  - git remote add origin (if not set)
  - git push -u origin main
  - git push origin --tags
  - Verify all 10 tags visible on GitHub
  - Report back when done

STEP 3: Vercel feast-ai setup (Brian -- manual)
  - Connect GitHub repo
  - Set root directory to apps/api
  - Add all environment variables from Section 4.1
  - Deploy and verify /api/health returns 200
  - Report the deployed API URL

STEP 4: Vercel feast-ai-web setup (Brian -- manual)
  - Create new Vercel project
  - Set root directory to apps/web
  - Add NEXT_PUBLIC_API_URL pointing to API URL from Step 3
  - Add all other env vars from Section 4.2
  - Deploy and verify app loads
  - Report the deployed web URL

STEP 5: Custom domain (Brian -- manual)
  - Add app.feastongood.com in Vercel domains
  - Add DNS records at DNS provider
  - Wait for propagation
  - Verify https://app.feastongood.com loads

STEP 6: Production database (Brian -- manual)
  - Run: npx prisma migrate deploy
  - Verify tables in Supabase Table Editor

STEP 7: Smoke test (Brian -- manual)
  - Run all 8 checks from Section 6
  - Report any failures

STEP 8: Final tag (Opus)
  - git tag v1.0.0
  - git push origin v1.0.0
  - Update CHANGELOG.md with v1.0.0 entry
  - Update CONTRACT.md:
      CURRENT_VERSION=1.0.0
      CURRENT_CODENAME=Feast
      NEXT_VERSION=1.1.0
      NEXT_CODENAME=Ember
  - Report: final commit hash + tag

STEP 9: EAS setup (Brian -- optional, when ready)
  - Install EAS CLI
  - Run eas build:configure in apps/mobile
  - Document first build command
```

---

## SECTION 9: v1.0.0 DEFINITION OF DONE

- [ ] pnpm typecheck: 4/4 packages, 0 errors
- [ ] pnpm lint: 4/4 packages, 0 warnings
- [ ] next build (API + Web): 0 errors
- [ ] All code pushed to github.com/brianonieal/Feast-AI
- [ ] All 10 version tags visible on GitHub (v0.1.0 - v1.0.0)
- [ ] feast-ai Vercel project deployed -- /api/health returns 200
- [ ] feast-ai-web Vercel project deployed -- app loads
- [ ] NEXT_PUBLIC_API_URL set correctly in feast-ai-web
- [ ] Custom domain app.feastongood.com resolving (or in progress)
- [ ] All env vars set in both Vercel projects
- [ ] Production database in sync
- [ ] Smoke test: auth flow works
- [ ] Smoke test: application form submits + email sends
- [ ] Smoke test: admin dashboard loads
- [ ] Smoke test: Inngest shows 5 functions
- [ ] README.md written and pushed
- [ ] CHANGELOG.md updated
- [ ] Git tagged as v1.0.0

---

END OF FEAST BLUEPRINT v1.0.0
