## /build - Build Current Version

1. Read docs/CONTRACT.md to confirm CURRENT_VERSION
2. Read docs/blueprints/VERSION_ROADMAP.md for current version scope
3. Read docs/CHANGELOG.md for last entry
4. Run health check: pnpm typecheck && npx prisma validate && pnpm lint
5. If health check fails, fix issues first
6. Build ONLY items listed in current version scope
7. After each feature: run pnpm typecheck, write at least 1 test, update CHANGELOG
8. When complete: run pnpm test, verify Definition of Done, report DONE

Do NOT build features from future versions. If blocked, report BLOCKED with reason.
