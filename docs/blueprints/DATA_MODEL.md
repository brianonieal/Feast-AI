# DATA_MODEL.md
## Feast-AI: Data Model and Entity Relationships

---

## Design Principles

1. **Prisma is the source of truth** for database schema. All types in packages/shared are derived from (or aligned with) the Prisma schema.
2. **snake_case for database columns**, camelCase in TypeScript (Prisma handles mapping).
3. **Soft deletes** on user-facing entities (deleted_at timestamp, not hard delete).
4. **Audit fields** on every table: created_at, updated_at.
5. **UUID primary keys** (cuid() in Prisma) for all tables.

---

## Entity Relationship Overview

```
User (1) ----< (many) EventAttendance >---- (1) FeastEvent
User (1) ----< (many) Reflection
User (1) ----< (many) FeastEvent (as host)
FeastEvent (1) ----< (many) ContentSubmission
FeastEvent (1) ----< (many) PublishedContent
ContentSubmission (1) ----< (many) PublishedContent
User (1) ----< (many) AgentMessage (as initiator)
```

---

## Schema (Prisma)

### Introduced in v0.1.0 - Foundation

```prisma
// Base user model
model User {
  id              String    @id @default(cuid())
  clerkId         String    @unique @map("clerk_id")
  email           String    @unique
  name            String?
  phone           String?
  city            String?
  role            UserRole  @default(ATTENDEE)
  communityTier   CommunityTier @default(PUBLIC) @map("community_tier")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")

  // Relations
  hostedEvents    FeastEvent[]      @relation("HostedEvents")
  attendances     EventAttendance[]
  reflections     Reflection[]
  contentSubmissions ContentSubmission[]

  @@map("users")
}

enum UserRole {
  ATTENDEE
  HOST
  FACILITATOR
  ADMIN
}

enum CommunityTier {
  PUBLIC
  REGIONAL
  FUNDERS
  COOPERATIVE
}

// Core event model
model FeastEvent {
  id            String      @id @default(cuid())
  name          String
  description   String?
  date          DateTime
  location      String
  city          String
  capacity      Int         @default(12)
  type          EventType   @default(OPEN)
  status        EventStatus @default(DRAFT)
  communityTier CommunityTier @default(PUBLIC) @map("community_tier")

  // External IDs
  circlePostId  String?     @map("circle_post_id")
  circleEventId String?     @map("circle_event_id")

  // Relations
  hostId        String      @map("host_id")
  host          User        @relation("HostedEvents", fields: [hostId], references: [id])
  attendances   EventAttendance[]
  reflections   Reflection[]
  contentSubmissions ContentSubmission[]
  publishedContent   PublishedContent[]

  createdAt     DateTime    @default(now()) @map("created_at")
  updatedAt     DateTime    @updatedAt @map("updated_at")
  deletedAt     DateTime?   @map("deleted_at")

  @@map("feast_events")
}

enum EventType {
  OPEN
  CLOSED
}

enum EventStatus {
  DRAFT
  SCHEDULED
  MARKETED
  LIVE
  COMPLETED
  CANCELLED
}

model EventAttendance {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  eventId   String   @map("event_id")
  status    RSVPStatus @default(INTERESTED)
  user      User     @relation(fields: [userId], references: [id])
  event     FeastEvent @relation(fields: [eventId], references: [id])
  createdAt DateTime @default(now()) @map("created_at")

  @@unique([userId, eventId])
  @@map("event_attendances")
}

enum RSVPStatus {
  INTERESTED
  CONFIRMED
  DECLINED
  ATTENDED
  NO_SHOW
}
```

### Introduced in v0.3.0 - Signal

```prisma
// Inbound messages from Twilio
model InboundMessage {
  id          String   @id @default(cuid())
  from        String                   // phone number
  body        String
  channel     MessageChannel
  intent      String?                  // classified intent
  confidence  Float?                   // classification confidence
  processed   Boolean  @default(false)
  userId      String?  @map("user_id")
  user        User?    @relation(fields: [userId], references: [id])
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("inbound_messages")
}

enum MessageChannel {
  SMS
  WHATSAPP
  EMAIL
  WEB
}
```

### Introduced in v0.5.0 - Echo

```prisma
// Raw content submitted by hosts after dinners
model ContentSubmission {
  id          String   @id @default(cuid())
  eventId     String   @map("event_id")
  event       FeastEvent @relation(fields: [eventId], references: [id])
  submittedBy String   @map("submitted_by")
  submitter   User     @relation(fields: [submittedBy], references: [id])
  photos      Json?                    // array of photo URLs
  quotes      Json?                    // array of { text, attribution }
  audioUrl    String?  @map("audio_url")
  transcript  String?                  // Deepgram output
  status      ContentStatus @default(RECEIVED)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  publishedContent PublishedContent[]

  @@map("content_submissions")
}

enum ContentStatus {
  RECEIVED
  PROCESSING
  READY_FOR_REVIEW
  APPROVED
  PUBLISHED
  REJECTED
}

// Generated content ready for distribution
model PublishedContent {
  id              String   @id @default(cuid())
  eventId         String   @map("event_id")
  event           FeastEvent @relation(fields: [eventId], references: [id])
  submissionId    String?  @map("submission_id")
  submission      ContentSubmission? @relation(fields: [submissionId], references: [id])
  channel         ContentChannel
  title           String?
  body            String
  imageUrl        String?  @map("image_url")
  metadata        Json?                // channel-specific metadata (hashtags, subject line, etc.)
  status          PublishStatus @default(DRAFT)
  publishedAt     DateTime? @map("published_at")
  externalId      String?  @map("external_id")  // WordPress post ID, Instagram post ID, etc.
  externalUrl     String?  @map("external_url")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@map("published_content")
}

enum ContentChannel {
  WEBSITE_ARTICLE
  INSTAGRAM
  CIRCLE_RECAP
  NEWSLETTER
  EMAIL_CAMPAIGN
}

enum PublishStatus {
  DRAFT
  PENDING_REVIEW
  APPROVED
  PUBLISHED
  FAILED
}

// Post-dinner reflections from attendees
model Reflection {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  user      User     @relation(fields: [userId], references: [id])
  eventId   String   @map("event_id")
  event     FeastEvent @relation(fields: [eventId], references: [id])
  text      String
  sentiment String?                    // positive, neutral, reflective, etc.
  themes    Json?                      // extracted themes array
  createdAt DateTime @default(now()) @map("created_at")

  @@map("reflections")
}
```

### Introduced in v0.8.0 - Shield

```prisma
// Agent activity log for cost tracking and debugging
model AgentLog {
  id            String   @id @default(cuid())
  agent         String                   // @SAGE, @COORDINATOR, etc.
  model         String                   // claude-sonnet-4-6, etc.
  action        String                   // tool name or action description
  inputTokens   Int      @map("input_tokens")
  outputTokens  Int      @map("output_tokens")
  costUsd       Float    @map("cost_usd")
  durationMs    Int      @map("duration_ms")
  success       Boolean
  error         String?
  correlationId String?  @map("correlation_id")  // traces multi-agent flows
  createdAt     DateTime @default(now()) @map("created_at")

  @@map("agent_logs")
}

// Integration health tracking
model IntegrationLog {
  id          String   @id @default(cuid())
  service     String                   // circle, hubspot, twilio, etc.
  operation   String
  success     Boolean
  statusCode  Int?     @map("status_code")
  latencyMs   Int      @map("latency_ms")
  error       String?
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("integration_logs")
}
```

### Introduced in v1.2.0 - Prism (RAG)

```prisma
// Vector embeddings for semantic search
// Requires pgvector extension: CREATE EXTENSION IF NOT EXISTS vector;
model Embedding {
  id          String   @id @default(cuid())
  sourceType  String   @map("source_type")   // reflection, article, event, etc.
  sourceId    String   @map("source_id")
  content     String                          // the text that was embedded
  // vector field managed via raw SQL (Prisma doesn't support vector type natively)
  // embedding  vector(1536) -- added via migration SQL
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("embeddings")
}
```

---

## Migration Strategy

- Use `npx prisma migrate dev` for development migrations
- Use `npx prisma migrate deploy` for production
- Migration files live in `apps/api/prisma/migrations/`
- Name migrations descriptively: `20260322_add_user_model`, `20260401_add_event_model`
- Never edit existing migration files. Create new migrations for changes.
- The pgvector extension (v1.2.0) requires a manual SQL migration:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ALTER TABLE embeddings ADD COLUMN embedding vector(1536);
  CREATE INDEX ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
  ```

---

*Last updated: 2026-03-22. Human approval required for schema changes.*
