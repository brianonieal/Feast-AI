# CHANGELOG.md
## Feast-AI Version History

All notable changes to this project will be documented in this file.
Format: [Conventional Changelog](https://www.conventionalcommits.org/)

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
- [ ] Git tagged as v0.1.0
