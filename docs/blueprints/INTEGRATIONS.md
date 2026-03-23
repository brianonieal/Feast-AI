# INTEGRATIONS.md
## Feast-AI: External Integration Specifications

---

## Adapter Pattern

All external services are accessed through typed adapter classes. Adapters handle:
- Authentication
- Request/response transformation
- Error handling with typed errors
- Rate limiting awareness
- Circuit breaker pattern (trip after 3 failures, recover after 60s)

```typescript
// Base adapter interface (packages/shared/src/types/adapter.ts)
interface BaseAdapter {
  name: string;
  healthCheck(): Promise<{ connected: boolean; latency_ms: number }>;
}

// All adapters live in: apps/api/src/integrations/[service]/
// Each has: adapter.ts, types.ts, and adapter.test.ts
```

---

## Circle.so (v0.2.0)

**Purpose**: Community platform. Events, spaces, posts, member directory.
**API**: REST v2 (https://api.circle.so/v2)
**Auth**: API Key in header (`Authorization: Token <key>`)

### Operations Needed

| Operation | Endpoint | Used By | Version |
|-----------|----------|---------|---------|
| List spaces | GET /spaces | @COORDINATOR (find correct event space) | v0.2.0 |
| Create post | POST /posts | @COORDINATOR (event announcement) | v0.4.0 |
| Create event | POST /events | @COORDINATOR (native Circle event) | v0.4.0 |
| Get members | GET /members | @SAGE (member lookup) | v0.7.0 |
| Post to space | POST /spaces/:id/posts | @COMMUNICATOR (recap) | v0.5.0 |

### Space Mapping (from Workflow PDF)
- **Public community space**: Open events, general announcements
- **Regional spaces**: Region-specific events and content
- **Funders space**: Closed events for funders tier
- **Cooperative owners space**: Closed events for co-op tier
- **Host space**: Host-only communications and resources

---

## HubSpot (v0.2.0)

**Purpose**: CRM. Contact management, pipelines, email sequences.
**API**: REST v3 (https://api.hubspot.com/crm/v3)
**Auth**: API Key or Private App token

### Operations Needed

| Operation | Endpoint | Used By | Version |
|-----------|----------|---------|---------|
| Create contact | POST /objects/contacts | @SAGE (onboarding) | v0.7.0 |
| Update contact | PATCH /objects/contacts/:id | @SAGE, @COORDINATOR | v0.7.0 |
| Search contacts | POST /objects/contacts/search | @SAGE (find member) | v0.7.0 |
| Add to pipeline | POST /objects/deals | @SAGE (host/facilitator applications) | v0.7.0 |
| Send email | Marketing API | @COMMUNICATOR (newsletters) | v0.6.0 |

### Contact Properties (Custom)
- `feast_role`: attendee | host | facilitator | diy | admin
- `feast_region`: city/metro area
- `feast_interest_date`: when they first expressed interest
- `feast_events_attended`: count
- `feast_events_hosted`: count
- `feast_community_tier`: public | regional | funders | cooperative

---

## Twilio (v0.3.0)

**Purpose**: SMS and WhatsApp inbound/outbound messaging.
**API**: twilio SDK
**Auth**: Account SID + Auth Token

### Operations Needed

| Operation | Method | Used By | Version |
|-----------|--------|---------|---------|
| Receive SMS/WhatsApp | Webhook (POST /api/webhooks/twilio) | @SAGE | v0.3.0 |
| Send SMS | client.messages.create() | @SAGE, @COORDINATOR | v0.3.0 |
| Send WhatsApp | client.messages.create() (whatsapp: prefix) | @SAGE, @COORDINATOR | v0.3.0 |

### Webhook Verification
All inbound Twilio webhooks MUST be verified using `twilio.validateRequest()` with the auth token. Reject unverified requests with 403.

---

## WordPress (v0.5.0)

**Purpose**: Website content publishing.
**API**: REST v2 (https://[site]/wp-json/wp/v2)
**Auth**: App Password (Basic Auth)

### Operations Needed

| Operation | Endpoint | Used By | Version |
|-----------|----------|---------|---------|
| Create post (draft) | POST /posts | @COMMUNICATOR | v0.5.0 |
| Upload media | POST /media | @COMMUNICATOR (event images) | v0.5.0 |
| Get categories | GET /categories | @COMMUNICATOR | v0.5.0 |

### Content Flow
@COMMUNICATOR creates posts as **drafts**. Admin reviews in dashboard and approves for publication. Never auto-publish without human approval.

---

## Instagram (v0.6.0)

**Purpose**: Content distribution (event marketing, dinner recaps).
**API**: Instagram Graph API (via Facebook/Meta)
**Auth**: OAuth 2.0 (long-lived token)

### Operations Needed

| Operation | Endpoint | Used By | Version |
|-----------|----------|---------|---------|
| Create container | POST /{ig-user-id}/media | @COMMUNICATOR | v0.6.0 |
| Publish container | POST /{ig-user-id}/media_publish | @COMMUNICATOR | v0.6.0 |

### Content Flow
1. @COMMUNICATOR generates caption + selects/generates image
2. Upload image to storage, get public URL
3. Create media container with image URL + caption
4. Publish container
5. All posts go through approval queue first (admin reviews in dashboard)

---

## Deepgram (v0.5.0)

**Purpose**: Audio transcription (host reflections after dinners).
**API**: @deepgram/sdk
**Auth**: API Key

### Operations Needed
- Transcribe audio file (pre-recorded, not streaming)
- Return timestamped transcript

---

## Replicate (v0.5.0)

**Purpose**: AI image generation for event marketing.
**API**: replicate SDK
**Auth**: API Token

### Image Generation Pipeline (from EOM-AI)
1. @COMMUNICATOR analyzes event details -> deep text analysis of themes/mood
2. @COMMUNICATOR generates optimized Flux prompt from analysis
3. Replicate runs Flux model with prompt
4. Result stored in Supabase Storage

---

## Error Handling: Circuit Breaker

All adapters implement:
```typescript
interface CircuitBreakerConfig {
  failureThreshold: 3;      // trips after 3 consecutive failures
  recoveryTimeout: 60_000;  // 60 seconds before half-open
  halfOpenMaxAttempts: 1;    // 1 test request in half-open state
}

// States: CLOSED (normal) -> OPEN (tripped) -> HALF_OPEN (testing) -> CLOSED
// On trip: log to IntegrationLog table, notify @GUARDIAN, queue pending requests
```

---

*Last updated: 2026-03-22. Human approval required for new integrations.*
