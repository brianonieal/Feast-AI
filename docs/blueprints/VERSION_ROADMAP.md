# VERSION_ROADMAP.md
## Feast-AI: Version Roadmap

> Each version has a strict scope. Do not build features from future versions.
> Every version must pass all prior version tests before starting new work.

---

## Phase 1: Foundation (v0.1.0 - v0.4.0)

### v0.1.0 - "Foundation"
Monorepo scaffold. Zero features, just a working project structure.
- [ ] Turborepo + pnpm workspace
- [ ] packages/shared: types (User, FeastEvent), schemas (Zod), constants, theme tokens
- [ ] apps/api: Next.js 15, Prisma schema (User, FeastEvent), health check route
- [ ] apps/mobile: Expo SDK 52, Expo Router, 5-tab bottom nav, placeholder screens, NativeWind
- [ ] Root configs, .env.example, .gitignore, README
- [ ] `pnpm typecheck` and `pnpm lint` pass clean

### v0.2.0 - "Conduit"
Authentication and platform connector scaffolding.
- [ ] Clerk auth: sign up, sign in, sign out (mobile + API)
- [ ] Protected API routes with Clerk middleware
- [ ] User profile screen (mobile)
- [ ] Circle.so adapter: scaffold with connection test
- [ ] HubSpot adapter: scaffold with connection test
- [ ] Integration health check endpoint: GET /api/integrations/status

### v0.3.0 - "Signal"
Inbound message handling. Host can text the system.
- [ ] Twilio SMS/WhatsApp webhook handler
- [ ] Intent classification: parse "I want to host a dinner..." into structured intent
- [ ] @SAGE agent: first Council agent, handles conversational intake
- [ ] Message logging to database (InboundMessage model)

### v0.4.0 - "Spark"
Event creation pipeline. The core workflow.
- [ ] @COORDINATOR agent: event lifecycle management
- [ ] CreateEvent tool: validates input, creates event in DB
- [ ] PostToCircle tool: creates event in Circle.so (correct space/tier)
- [ ] Inngest background job: event creation pipeline
- [ ] Event model expanded: location, capacity, type (open/closed), tier, status
- [ ] Basic event API: CRUD endpoints

---

## Phase 2: Content and Distribution (v0.5.0 - v0.7.0)

### v0.5.0 - "Echo"
Post-dinner content transformation.
- [ ] @COMMUNICATOR agent: content generation
- [ ] ContentSubmission model: photos, quotes, reflections
- [ ] Photo processing (upload to storage, select best)
- [ ] Audio transcription (Deepgram integration)
- [ ] Content transformation pipeline:
      - Raw materials -> website article
      - Raw materials -> Instagram caption
      - Raw materials -> Circle recap
      - Raw materials -> newsletter blurb
- [ ] WordPress adapter: publish article draft
- [ ] Anti-hallucination: strict source-material-only constraint

### v0.6.0 - "Beacon"
Multi-channel distribution engine.
- [ ] @COMMUNICATOR extended: channel-specific formatting
- [ ] Instagram adapter: post image + caption
- [ ] Mailing list integration (HubSpot or Mailchimp)
- [ ] Distribution routing:
      - Open event -> Instagram + full list + Circle public
      - Closed event -> Circle tier + CRM subset
- [ ] Content approval queue (admin can review before publish)

### v0.7.0 - "Compass"
Member onboarding and CRM sync.
- [ ] @SAGE extended: onboarding conversation flow
- [ ] "How Will You Feast?" classification:
      - Attend a Dinner
      - Become a Host (+ regional interest check)
      - Become a Facilitator
      - DIY (waitlist)
      - Not Sure (newsletter)
- [ ] HubSpot contact creation with correct tags/pipeline
- [ ] Automated welcome email per classification
- [ ] Regional interest tracking (city + count)

---

## Phase 3: Production Readiness (v0.8.0 - v1.0.0)

### v0.8.0 - "Shield"
Security, monitoring, cost controls.
- [ ] @GUARDIAN agent: cost monitoring, anomaly detection
- [ ] Rate limiting (Upstash Redis)
- [ ] API key rotation support
- [ ] Sentry error tracking
- [ ] Daily cost report (agent API spend)
- [ ] Hard spending limits with auto-downgrade

### v0.9.0 - "Lens"
Admin dashboard (web).
- [ ] Admin web interface (Next.js pages or separate Vercel app)
- [ ] Event management view
- [ ] Content approval queue
- [ ] Member overview
- [ ] Agent status and cost dashboard
- [ ] Integration health overview

### v1.0.0 - "Feast" (MVP)
Production deployment. Everything works end-to-end.
- [ ] All v0.x features stable and tested
- [ ] End-to-end flow: host texts -> event created -> marketed -> dinner happens -> content published
- [ ] Mobile app: Home + Events tabs fully functional
- [ ] Error recovery and retry logic on all integrations
- [ ] Documentation complete
- [ ] Deployed to production (Vercel + EAS)
- [ ] Monitoring and alerting active

---

## Phase 4: PANTHEON (v1.1.0 - v2.0.0)

### v1.1.0 - "Ember"
Error recovery, resilience.
- [ ] Circuit breakers on all external integrations
- [ ] Retry queues for failed operations
- [ ] Graceful degradation when services are down

### v1.2.0 - "Prism"
RAG and content intelligence.
- [ ] pgvector extension on Supabase
- [ ] Embedding generation for all content (reflections, articles, community wisdom)
- [ ] @ANALYST agent: community health metrics, engagement analysis
- [ ] Semantic search across community content

### v1.3.0 - "Nexus"
Advanced events.
- [ ] Recurring event templates
- [ ] Multi-host coordination
- [ ] Waitlist management
- [ ] @STRATEGIST agent: regional growth recommendations

### v1.4.0 - "Harvest"
Analytics and reporting.
- [ ] Impact metrics (events hosted, people connected, reflections shared)
- [ ] Community health score
- [ ] Regional growth tracking
- [ ] Monthly reports for funders/partners

### v1.5.0 - "Chorus"
Notifications and preferences.
- [ ] Push notifications (Expo)
- [ ] Notification preferences per user
- [ ] Smart digest (weekly summary of community activity)

### v2.0.0 - "Pantheon" (Full Vision)
All 5 mobile tabs fully functional. The complete member experience.
- [ ] Home tab: personalized feed, upcoming events, community pulse
- [ ] Circle tab: community conversations, connections
- [ ] Events tab: browse, RSVP, host management
- [ ] Impact tab: personal growth, reflection history, community metrics
- [ ] Profile tab: settings, host/facilitator status, preferences
- [ ] Voice interface for hosts (text or speak to create events)
- [ ] Real-time AI facilitation prompts during dinners
- [ ] White-label capability exploration

---

## Version Summary

| Version | Codename | Theme | Gate |
|---------|----------|-------|------|
| v0.1.0 | Foundation | Project scaffold | typecheck + lint clean |
| v0.2.0 | Conduit | Auth + connector scaffold | auth flow works, adapters connect |
| v0.3.0 | Signal | Inbound messaging | host can text, intent parsed |
| v0.4.0 | Spark | Event creation | text -> event -> Circle post |
| v0.5.0 | Echo | Content transformation | raw materials -> 4 outputs |
| v0.6.0 | Beacon | Multi-channel distribution | content reaches all channels |
| v0.7.0 | Compass | Onboarding + CRM | new user classified + CRM synced |
| v0.8.0 | Shield | Security + monitoring | rate limits + cost controls active |
| v0.9.0 | Lens | Admin dashboard | admin can manage everything |
| **v1.0.0** | **Feast** | **MVP** | **End-to-end flow in production** |
| v1.2.0 | Prism | RAG + intelligence | semantic search works |
| v1.3.0 | Nexus | Advanced events | recurring + multi-host |
| v1.4.0 | Harvest | Analytics | impact metrics dashboard |
| **v2.0.0** | **Pantheon** | **Full Vision** | **All 5 tabs, voice, AI-native** |

---

*Last updated: 2026-03-22. Owner: Brian Onieal. Human approval required for scope changes.*
