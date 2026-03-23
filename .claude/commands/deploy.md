## /deploy - Deployment Checklist

### Pre-Deploy Checks
1. pnpm typecheck passes with 0 errors
2. pnpm lint passes with 0 warnings
3. pnpm test passes with 0 failures
4. docs/CHANGELOG.md updated with current version changes
5. docs/CONTRACT.md CURRENT_VERSION matches what we are deploying
6. All environment variables in .env.example are documented
7. No hardcoded API keys, tokens, or secrets

### API Deployment (Vercel)
1. cd apps/api && npx prisma migrate deploy
2. Push to main branch (Vercel auto-deploys)
3. Verify health check endpoint

### Mobile Deployment (EAS)
1. Update apps/mobile/app.json version number
2. cd apps/mobile && eas build --platform all
3. Test on physical devices before app store submission

### Post-Deploy
1. Git tag: git tag v[VERSION] && git push --tags
2. Monitor Sentry for new errors (first 30 minutes)
3. Update CHANGELOG status from PENDING to DEPLOYED
