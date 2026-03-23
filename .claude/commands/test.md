## /test - Run Tests and Report

1. pnpm typecheck - TypeScript compilation across all packages
2. npx prisma validate - Schema integrity
3. pnpm lint - Linting (zero warnings policy)
4. pnpm test - Vitest test suite
5. Report results in this format:

TEST REPORT - [date]
typecheck:  PASS/FAIL (X errors)
prisma:     PASS/FAIL
lint:       PASS/FAIL (X warnings)
tests:      PASS/FAIL (X passed, Y failed, Z skipped)
coverage:   X% (api), Y% (mobile), Z% (shared)

If any step fails, provide the error details and a fix recommendation.
