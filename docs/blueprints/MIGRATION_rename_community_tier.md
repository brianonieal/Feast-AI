# MIGRATION: rename_community_tier_enum
# Version: pre-v0.6.0
# Date: 2026-03-23
# Purpose: Align CommunityTier enum with proposal language before frontend sprint
#
# OPUS INSTRUCTIONS — execute in this exact order. Stop and report after each step.

---

## STEP 1: Create the Prisma migration file

Create this file at:
apps/api/prisma/migrations/20260323_rename_community_tier_enum/migration.sql

Contents:
```sql
-- Migration: rename_community_tier_enum
-- PostgreSQL cannot rename enum values directly.
-- Strategy: create new enum, migrate columns, drop old enum.
-- Affects: users.community_tier, feast_events.community_tier

BEGIN;

CREATE TYPE "CommunityTier_new" AS ENUM (
  'commons',
  'kitchen',
  'founding_table'
);

ALTER TABLE "users"
  ALTER COLUMN "community_tier" TYPE "CommunityTier_new"
  USING (
    CASE "community_tier"::text
      WHEN 'PUBLIC'      THEN 'commons'::"CommunityTier_new"
      WHEN 'REGIONAL'    THEN 'kitchen'::"CommunityTier_new"
      WHEN 'FUNDERS'     THEN 'founding_table'::"CommunityTier_new"
      WHEN 'COOPERATIVE' THEN 'founding_table'::"CommunityTier_new"
    END
  );

ALTER TABLE "feast_events"
  ALTER COLUMN "community_tier" TYPE "CommunityTier_new"
  USING (
    CASE "community_tier"::text
      WHEN 'PUBLIC'      THEN 'commons'::"CommunityTier_new"
      WHEN 'REGIONAL'    THEN 'kitchen'::"CommunityTier_new"
      WHEN 'FUNDERS'     THEN 'founding_table'::"CommunityTier_new"
      WHEN 'COOPERATIVE' THEN 'founding_table'::"CommunityTier_new"
    END
  );

DROP TYPE "CommunityTier";

ALTER TYPE "CommunityTier_new" RENAME TO "CommunityTier";

COMMIT;
```

---

## STEP 2: Update schema.prisma

In apps/api/prisma/schema.prisma, make exactly these two changes:

### Change 1 — Replace the enum block:
FIND:
```prisma
enum CommunityTier {
  PUBLIC
  REGIONAL
  FUNDERS
  COOPERATIVE
}
```

REPLACE WITH:
```prisma
enum CommunityTier {
  commons
  kitchen
  founding_table
}
```

### Change 2 — Update default on User model:
FIND:
```prisma
communityTier   CommunityTier @default(PUBLIC) @map("community_tier")
```
REPLACE WITH:
```prisma
communityTier   CommunityTier @default(commons) @map("community_tier")
```

### Change 3 — Update default on FeastEvent model:
FIND:
```prisma
communityTier CommunityTier @default(PUBLIC) @map("community_tier")
```
REPLACE WITH:
```prisma
communityTier CommunityTier @default(commons) @map("community_tier")
```

---

## STEP 3: Update packages/shared types

In packages/shared/src/types/user.ts, replace the existing CommunityTier type:

FIND (whatever currently exists):
```typescript
export type CommunityTier = 'PUBLIC' | 'REGIONAL' | 'FUNDERS' | 'COOPERATIVE';
```

REPLACE WITH:
```typescript
export type UserTier = 'commons' | 'kitchen' | 'founding_table';

// Keep CommunityTier as an alias so existing imports don't break
// Remove this alias once all references are updated
export type CommunityTier = UserTier;
```

Also update the User interface — find `communityTier: CommunityTier` and add the new field:
```typescript
tier: UserTier;          // new canonical name
communityTier: UserTier; // kept for DB compatibility via Prisma
```

---

## STEP 4: Run validation

```bash
npx prisma validate
pnpm typecheck
pnpm lint
```

All three must pass with zero errors before continuing.
If any fail, fix them before moving to Step 5.

---

## STEP 5: Apply migration to database

```bash
npx prisma migrate deploy
```

If running locally with migrate dev:
```bash
npx prisma migrate dev --name rename_community_tier_enum
```

NOTE: Do NOT run this against the production database without Brian's explicit confirmation.
Run against the development/staging database only.

---

## STEP 6: Verify and report

Run:
```bash
npx prisma studio
```

Confirm:
- users table: community_tier column shows commons/kitchen/founding_table values
- feast_events table: same
- No rows have NULL in community_tier

Then report:
- Migration applied: yes/no
- typecheck: pass/fail
- lint: pass/fail
- Any rows affected in each table

---

## STEP 7: Update CHANGELOG.md

Append this entry:

```markdown
## [pre-0.6.0] - CommunityTier enum alignment - 2026-03-23

### Changed
- **CommunityTier enum**: renamed values to align with proposal language
  - PUBLIC → commons
  - REGIONAL → kitchen  
  - FUNDERS → founding_table
  - COOPERATIVE → founding_table
- **packages/shared**: added UserTier type alias, kept CommunityTier for DB compatibility
- **schema.prisma**: updated enum + default values on User and FeastEvent models
```

---

## DO NOT PROCEED to frontend sprint until all steps above are complete and verified.
