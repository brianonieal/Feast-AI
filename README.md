# Feast-AI

AI-native community operating system for The Feast.

## What it is

Feast-AI automates the operational backbone of running a community dinner movement: event creation, marketing, content capture, member onboarding, and community health tracking.

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
