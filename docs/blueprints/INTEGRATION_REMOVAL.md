# INTEGRATION_REMOVAL.md
# Operation: Remove Circle, HubSpot, Twilio, WordPress
# Date: March 2026
# Reason: Production unblocking -- these integrations are not needed for MVP
#         and their stubs/placeholders are creating noise and confusion.

---

## OPUS BOOT INSTRUCTIONS

Read CONTRACT.md first. Run health check before touching anything.
This is a REMOVAL operation -- be surgical. Only remove what is listed.
Do not remove anything not explicitly listed here.
After every file change: typecheck immediately. Fix before continuing.

---

## WHAT TO REMOVE

### 1. Adapter files -- delete entirely

```
apps/api/src/integrations/circle/          DELETE entire directory
apps/api/src/integrations/hubspot/         DELETE entire directory
apps/api/src/integrations/wordpress/       DELETE entire directory
```

Twilio webhook handler stays -- it's a real inbound route already built.
Just remove Twilio from the integrations health check (see Section 3).

### 2. packages/shared/src/types/distribution.ts

Remove these channels from DistributionChannel union type:
  - 'circle_public'
  - 'circle_tier'
  - 'crm_regional'
  - 'hubspot_email'

Keep only:
  export type DistributionChannel = 'instagram';
  (Instagram stays as a type even though it's deferred --
   the adapter code is valid and will be used in v1.7.0)

Update getDistributionTargets() -- remove all routing logic.
Replace with a stub that returns an empty array for now:
  export function getDistributionTargets(): DistributionTarget[] {
    return [];
  }

Update ONBOARDING_PATHS in packages/shared/src/types/onboarding.ts:
Remove all hubspotTags and hubspotPipeline fields from every path.
These fields exist on the OnboardingPath interface -- remove them
from the interface definition and from all 5 path objects.

### 3. apps/api/src/services/distribution.ts

Remove the entire switch statement body -- replace with:

```typescript
export async function distributeContent(params: {
  approvalQueueId: string;
  targets: DistributionTarget[];
  triggeredBy: string;
}): Promise<DistributionResult[]> {
  // Distribution channels will be activated in v1.1.0+
  // when integration credentials are configured.
  console.log(`[Distribution] ${params.targets.length} targets -- no channels active`);
  return [];
}
```

Keep the function signature identical so nothing that calls it breaks.

### 4. apps/api/src/services/onboarding.ts

Remove the HubSpot stub block entirely (the console.log + TODO comment).
Remove hubspotSynced from the OnboardingResult interface and return value.
Remove the hubspotTags references.

Updated OnboardingResult:
```typescript
interface OnboardingResult {
  classification: ClassificationResult;
  memberIntentId: string;
  emailSent: boolean;
}
```

### 5. apps/api/src/app/api/integrations/status/route.ts

Remove Circle and HubSpot from the health checks.
Keep only Resend (key check) and Supabase (DB ping).

### 6. apps/api/src/app/api/admin/system/integrations/route.ts

Remove Circle and HubSpot adapter imports and health checks.
Keep: Resend, Supabase DB ping.
Remove: Twilio and WordPress NOT CONFIGURED stubs.
The integrations page should only show services that are
actually configured and relevant right now.

Updated response returns only:
  - Resend (connected if RESEND_API_KEY is set)
  - Supabase (always connected -- it's the DB)

### 7. apps/web/src/app/(admin)/admin/system/integrations/page.tsx

Update to only show 2 integration cards:
  - Resend
  - Supabase

Remove: Circle, HubSpot, Twilio, WordPress cards.

### 8. .env.example

Remove these keys entirely (not comment out -- delete):
  CIRCLE_API_KEY
  CIRCLE_PUBLIC_SPACE_ID
  CIRCLE_KITCHEN_SPACE_ID
  CIRCLE_FOUNDING_TABLE_SPACE_ID
  HUBSPOT_API_KEY
  HUBSPOT_COMMUNITY_LIST_ID
  HUBSPOT_LIST_BROOKLYN
  WORDPRESS_APP_PASSWORD
  WORDPRESS_SITE_URL

Keep TWILIO keys -- the webhook handler is still live:
  TWILIO_ACCOUNT_SID
  TWILIO_AUTH_TOKEN
  TWILIO_PHONE_NUMBER

### 9. docs/blueprints/INTEGRATIONS.md

This file documents Circle, HubSpot, Twilio, WordPress adapters.
Replace the entire file contents with:

```markdown
# INTEGRATIONS.md
## Feast-AI: Active Integrations

Active integrations as of v1.0.0:

| Service | Purpose | Status |
|---------|---------|--------|
| Anthropic | Council agents (LLM) | Active |
| Clerk | Authentication | Active |
| Supabase | PostgreSQL database | Active |
| Inngest | Background job pipelines | Active |
| Upstash Redis | Rate limiting + cache | Active |
| Resend | Transactional email | Active |
| Sentry | Error tracking | Active |
| Twilio | Inbound SMS webhook | Active (receive only) |

Future integrations are scoped to future versions.
```

### 10. CHANGELOG.md

Add a new entry at the top:

```markdown
## [1.0.1] - Integration cleanup - 2026-03-24

### Removed
- Circle.so adapter (apps/api/src/integrations/circle/)
- HubSpot adapter (apps/api/src/integrations/hubspot/)
- WordPress adapter (apps/api/src/integrations/wordpress/)
- Circle/HubSpot/WordPress distribution channels
- HubSpot contact sync stub from onboarding service
- Unused env vars from .env.example

### Kept
- Twilio webhook handler (inbound SMS still active)
- Instagram adapter (deferred, code retained for v1.7.0)
- All other integrations unchanged
```

---

## EXECUTION ORDER

```
STEP 1: Delete adapter directories
  rm -rf apps/api/src/integrations/circle
  rm -rf apps/api/src/integrations/hubspot
  rm -rf apps/api/src/integrations/wordpress
  Run: pnpm typecheck -- fix ALL import errors before continuing

STEP 2: Update shared types
  - packages/shared/src/types/distribution.ts
  - packages/shared/src/types/onboarding.ts
  Run: pnpm typecheck (4/4)

STEP 3: Update services
  - apps/api/src/services/distribution.ts
  - apps/api/src/services/onboarding.ts
  Run: pnpm typecheck (4/4)

STEP 4: Update API routes
  - apps/api/src/app/api/integrations/status/route.ts
  - apps/api/src/app/api/admin/system/integrations/route.ts
  Run: pnpm typecheck + pnpm lint

STEP 5: Update admin frontend
  - apps/web/src/app/(admin)/admin/system/integrations/page.tsx
  Run: pnpm typecheck (apps/web)

STEP 6: Clean up config files
  - .env.example (remove keys)
  - docs/blueprints/INTEGRATIONS.md (replace contents)
  - docs/CHANGELOG.md (add 1.0.1 entry)

STEP 7: Full verification
  pnpm typecheck: 4/4 packages, 0 errors
  pnpm lint: 4/4 packages, 0 warnings
  pnpm --filter api build: 0 errors
  pnpm --filter web build: 0 errors
  Report full build output

STEP 8: Commit + push
  git add -A
  git commit -m "chore: remove Circle/HubSpot/WordPress integrations"
  git push origin main
  Report commit hash
```

---

## DEFINITION OF DONE

- [ ] apps/api/src/integrations/circle/ does not exist
- [ ] apps/api/src/integrations/hubspot/ does not exist
- [ ] apps/api/src/integrations/wordpress/ does not exist
- [ ] No import of circleAdapter anywhere in codebase
- [ ] No import of hubspotAdapter anywhere in codebase
- [ ] No import of wordpressAdapter anywhere in codebase
- [ ] pnpm typecheck: 4/4 packages, 0 errors
- [ ] pnpm lint: 0 warnings
- [ ] pnpm --filter api build: clean
- [ ] pnpm --filter web build: clean
- [ ] Integrations page shows only Resend + Supabase
- [ ] .env.example has no Circle/HubSpot/WordPress keys
- [ ] git pushed to main (Vercel auto-redeploys)
- [ ] CHANGELOG.md has v1.0.1 entry
```
