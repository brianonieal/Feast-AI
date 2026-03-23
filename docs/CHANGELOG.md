# CHANGELOG.md
## Feast-AI Version History

All notable changes to this project will be documented in this file.
Format: [Conventional Changelog](https://www.conventionalcommits.org/)

---

## [0.1.0] - Foundation (Not Yet Built)

### Scope
Project scaffolding, monorepo setup, shared types, health check endpoint, mobile shell with 5-tab layout.

### Status: PENDING

### Planned
- Turborepo + pnpm workspace initialization
- packages/shared: types, schemas, constants, theme tokens
- apps/api: Next.js project, Prisma schema (User + Event models), health check route
- apps/mobile: Expo project, Expo Router, 5-tab bottom navigator, placeholder screens
- Root configs: turbo.json, tsconfig.base.json, .gitignore, .env.example
- CI: typecheck + lint passing across all packages

### Definition of Done
- [ ] `pnpm typecheck` passes with 0 errors
- [ ] `npx prisma validate` passes
- [ ] `pnpm lint` passes with 0 warnings
- [ ] Health check endpoint returns `{ status: "ok", version: "0.1.0" }`
- [ ] Mobile app launches in Expo Go with 5 tabs visible
- [ ] All shared types importable from both apps/api and apps/mobile
- [ ] Git tagged as v0.1.0
