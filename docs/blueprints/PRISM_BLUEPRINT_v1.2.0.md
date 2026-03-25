# FEAST-AI v1.2.0 PRISM BLUEPRINT
# Codename: Prism
# Architect: Claude Sonnet 4.6 (chat)
# Executor: Claude Opus 4.6 (Claude Code)
# Date: March 2026
# Scope: RAG + pgvector embeddings + @ANALYST agent + semantic search

---

## OPUS BOOT INSTRUCTIONS

Read in this order before writing a single line of code:
1. docs/blueprints/CONTRACT.md
2. docs/CHANGELOG.md (last 10 entries)
3. docs/blueprints/TECH_STACK.md
4. docs/blueprints/COUNCIL_AGENTS.md
5. This file (PRISM_BLUEPRINT_v1.2.0.md) in full

Then run the health check:
  pnpm typecheck
  pnpm lint
  npx prisma validate

All three must pass before writing any code.
Current version: 1.2.0
Sacred Rule: Do not build anything from v1.3.0 or later.

---

## SECTION 1: SCOPE

v1.2.0 Prism adds intelligence to the system.
The Council can now understand the community's history,
find patterns across reflections, and answer questions
about what members care about.

### What gets built:
1. pgvector extension + Embedding model via Anthropic
2. Embedding model -- Supabase pgvector, 1536-dim vectors
3. EmbeddingService -- generate + store + search embeddings
4. Inngest pipeline -- embed new content automatically
5. @ANALYST agent -- community health + pattern analysis
6. Semantic search API -- GET /api/search
7. Community health API -- GET /api/analyst/health
8. Admin page -- community insights at /admin/insights
9. @SAGE enhanced -- uses RAG to personalize responses

### Content types embedded (all 4):
- Reflections (post-dinner member reflections)
- Articles (published content from @COMMUNICATOR)
- Events (event descriptions + details)
- MemberIntents (onboarding inputs)

### What does NOT change:
- No new frontend pages beyond /admin/insights
- No changes to existing agent logic (enhancement only)
- No new auth or rate limit changes

---

## SECTION 2: SUPABASE PGVECTOR SETUP

pgvector must be enabled in Supabase before running migrations.

### 2.1 Enable pgvector in Supabase (Brian -- manual step)

Go to: Supabase dashboard → your project → SQL Editor
Run this SQL:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Verify it worked:
```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

Should return one row. If it errors, go to:
Supabase dashboard → Database → Extensions → search "vector" → enable it

### 2.2 Prisma schema addition

Prisma does not natively support the vector type.
We manage the embedding column via raw SQL migration.

Add the Embedding model WITHOUT the vector column first:

```prisma
// @version 1.2.0 - Prism

model Embedding {
  id          String   @id @default(cuid())
  sourceType  String   @map("source_type")
  // Valid values: 'reflection', 'article', 'event', 'member_intent'
  sourceId    String   @map("source_id")
  content     String   // the text that was embedded (for reference)
  model       String   @default("voyage-3") // embedding model used
  dimensions  Int      @default(1536)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@unique([sourceType, sourceId])  // one embedding per source record
  @@index([sourceType])
  @@map("embeddings")
}
```

After Prisma migration, run this SQL in Supabase to add
the vector column and index (cannot be done via Prisma):

```sql
-- Add vector column
ALTER TABLE embeddings
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create IVFFlat index for fast similarity search
-- lists = 100 is appropriate for up to 1M vectors
CREATE INDEX IF NOT EXISTS embeddings_vector_idx
ON embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

Save this SQL -- Brian runs it manually in Supabase SQL Editor
after the Prisma migration completes.

---

## SECTION 3: ANTHROPIC EMBEDDINGS

Anthropic provides embeddings via their API.
Model: claude-3-5-haiku-20241022 is used for classification
but embeddings use a different endpoint.

Check Anthropic docs -- as of March 2026, Anthropic embeddings
use voyage-3 via their partnership with Voyage AI.
The API call goes through the Anthropic SDK.

Create apps/api/src/lib/embeddings.ts:

```typescript
// @version 1.2.0 - Prism
// Embedding generation via Anthropic (Voyage AI partnership)
// Stores and retrieves vectors from Supabase pgvector

import Anthropic from '@anthropic-ai/sdk';
import { db } from './db';

const client = new Anthropic();

const EMBEDDING_MODEL = 'voyage-3';
const EMBEDDING_DIMENSIONS = 1536;

export interface EmbeddingResult {
  id: string;
  sourceType: string;
  sourceId: string;
  content: string;
}

// Generate embedding vector for a piece of text
export async function generateEmbedding(text: string): Promise<number[]> {
  // Anthropic embeddings via Voyage AI
  // @ts-expect-error -- embeddings endpoint may not be in SDK types yet
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  // @ts-expect-error
  return response.data[0].embedding as number[];
}

// Store an embedding in the DB + pgvector column
export async function storeEmbedding(params: {
  sourceType: 'reflection' | 'article' | 'event' | 'member_intent';
  sourceId: string;
  content: string;
}): Promise<EmbeddingResult> {
  const vector = await generateEmbedding(params.content);

  // Upsert the Embedding record via Prisma
  const record = await db.embedding.upsert({
    where: {
      sourceType_sourceId: {
        sourceType: params.sourceType,
        sourceId: params.sourceId,
      },
    },
    update: {
      content: params.content,
      updatedAt: new Date(),
    },
    create: {
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      content: params.content,
      model: EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIMENSIONS,
    },
  });

  // Update the vector column via raw SQL (Prisma can't handle vector type)
  const vectorStr = `[${vector.join(',')}]`;
  await db.$executeRaw`
    UPDATE embeddings
    SET embedding = ${vectorStr}::vector
    WHERE id = ${record.id}
  `;

  return record;
}

// Semantic search -- find most similar embeddings to a query
export async function semanticSearch(params: {
  query: string;
  sourceType?: string;   // filter by type (optional)
  limit?: number;        // default 5
  threshold?: number;    // cosine similarity threshold 0-1, default 0.7
}): Promise<Array<{ id: string; sourceType: string; sourceId: string; content: string; similarity: number }>> {
  const { query, sourceType, limit = 5, threshold = 0.7 } = params;
  const vector = await generateEmbedding(query);
  const vectorStr = `[${vector.join(',')}]`;

  // Raw SQL for vector similarity search
  const typeFilter = sourceType ? `AND source_type = '${sourceType}'` : '';

  const results = await db.$queryRaw<Array<{
    id: string;
    source_type: string;
    source_id: string;
    content: string;
    similarity: number;
  }>>`
    SELECT
      id,
      source_type,
      source_id,
      content,
      1 - (embedding <=> ${vectorStr}::vector) AS similarity
    FROM embeddings
    WHERE embedding IS NOT NULL
    ${sourceType ? db.$queryRaw`AND source_type = ${sourceType}` : db.$queryRaw``}
    AND 1 - (embedding <=> ${vectorStr}::vector) > ${threshold}
    ORDER BY embedding <=> ${vectorStr}::vector
    LIMIT ${limit}
  `;

  return results.map(r => ({
    id: r.id,
    sourceType: r.source_type,
    sourceId: r.source_id,
    content: r.content,
    similarity: r.similarity,
  }));
}
```

NOTE: The Anthropic embeddings API may use a different
method signature than shown above. Before writing this file,
check the installed @anthropic-ai/sdk version and its actual
embeddings support. If the SDK doesn't support embeddings
directly, use the Voyage AI SDK instead:
  pnpm --filter api add voyageai
  import VoyageAI from 'voyageai'
  const voyage = new VoyageAI({ apiKey: process.env.VOYAGE_API_KEY })
  const response = await voyage.embed({ input: [text], model: 'voyage-3' })

Add to .env.example if Voyage AI is needed:
  VOYAGE_API_KEY=      # voyage.ai -- required for v1.2.0 embeddings

---

## SECTION 4: EMBEDDING INNGEST PIPELINE

Create apps/api/src/inngest/functions/embed-content.ts:

```typescript
// @version 1.2.0 - Prism
// Triggered when new content is created that should be embedded
// Events that trigger this:
//   content/reflection.created
//   content/article.published
//   content/event.created
//   content/intent.classified

import { inngest } from '../client';
import { storeEmbedding } from '../../lib/embeddings';
import { db } from '../../lib/db';
import { saveFailedJob } from '../../services/deadLetter';

export const embedContentFunction = inngest.createFunction(
  {
    id: 'embed-content',
    name: 'Embed Content — @ANALYST',
    retries: 3,
    onFailure: async (ctx: any) => {
      // ESCAPE: Inngest v4 onFailure type
      await saveFailedJob({
        functionId: 'embed-content',
        eventName: ctx.event?.name ?? 'content/embed',
        payload: ctx.event?.data ?? {},
        error: ctx.error?.message ?? 'Unknown error',
        attempts: ctx.attempt ?? 1,
      });
    },
  },
  {
    // Listen to multiple event types
    event: 'content/embed',
  },
  async ({ event, step }) => {
    const { sourceType, sourceId } = event.data as {
      sourceType: 'reflection' | 'article' | 'event' | 'member_intent';
      sourceId: string;
    };

    // Fetch the content to embed based on source type
    const content = await step.run('fetch-content', async () => {
      switch (sourceType) {
        case 'reflection': {
          const r = await db.reflection.findUnique({ where: { id: sourceId } });
          return r?.text ?? null;
        }
        case 'article': {
          const a = await db.publishedContent.findUnique({ where: { id: sourceId } });
          return a ? `${a.title ?? ''}\n\n${a.body}` : null;
        }
        case 'event': {
          const e = await db.feastEvent.findUnique({ where: { id: sourceId } });
          return e ? `${e.name}\n\n${e.description ?? ''}\n\nCity: ${e.city}` : null;
        }
        case 'member_intent': {
          const m = await db.memberIntent.findUnique({ where: { id: sourceId } });
          return m?.rawInput ?? null;
        }
        default:
          return null;
      }
    });

    if (!content) {
      return { skipped: true, reason: 'No content found' };
    }

    // Generate and store the embedding
    const embedding = await step.run('store-embedding', async () => {
      return storeEmbedding({ sourceType, sourceId, content });
    });

    return { embedded: true, embeddingId: embedding.id, sourceType, sourceId };
  }
);
```

Register in inngest/index.ts and serve route.
Total Inngest functions: 7

---

## SECTION 5: @ANALYST AGENT

Create apps/api/src/council/analyst/index.ts:

```typescript
// @version 1.2.0 - Prism
// @ANALYST -- community health analysis using RAG
// Analyzes patterns in reflections, events, and member data

import Anthropic from '@anthropic-ai/sdk';
import { semanticSearch } from '../../lib/embeddings';
import { db } from '../../lib/db';
import { trackedCall } from '../../lib/costTracker';

const client = new Anthropic();

export interface CommunityHealthReport {
  date: string;
  totalReflections: number;
  totalEvents: number;
  totalMembers: number;
  topThemes: string[];
  sentimentSummary: string;
  regionalStrengths: Array<{ city: string; count: number }>;
  recommendations: string[];
  generatedAt: Date;
}

// Generate community health report using RAG
export async function generateHealthReport(): Promise<CommunityHealthReport> {
  const now = new Date();

  // Gather raw data
  const [reflectionCount, eventCount, memberCount, regionalData] = await Promise.all([
    db.reflection.count(),
    db.feastEvent.count({ where: { status: { in: ['COMPLETED', 'LIVE'] } } }),
    db.user.count(),
    db.regionalInterest.findMany({ orderBy: { count: 'desc' }, take: 5 }),
  ]);

  // Use semantic search to find common themes in reflections
  const themeQueries = [
    'community connection belonging',
    'personal growth transformation',
    'vulnerability authenticity',
    'abundance abundance sharing',
    'meaningful conversation purpose',
  ];

  const themeResults = await Promise.all(
    themeQueries.map(q =>
      semanticSearch({ query: q, sourceType: 'reflection', limit: 3, threshold: 0.6 })
    )
  );

  const relevantContent = themeResults
    .flat()
    .map(r => r.content)
    .filter(Boolean)
    .slice(0, 10)
    .join('\n\n---\n\n');

  // Use Claude to synthesize the analysis
  const response = await trackedCall({
    agent: '@ANALYST',
    model: 'claude-sonnet-4-6',
    action: 'generate_health_report',
    system: `You are @ANALYST for The Feast community platform.
Analyze the provided community data and reflection excerpts.
Return ONLY valid JSON matching this exact schema:
{
  "topThemes": ["string", "string", "string"],
  "sentimentSummary": "string (2-3 sentences)",
  "recommendations": ["string", "string", "string"]
}
Be specific and grounded in the actual content provided.
Never fabricate data not present in the context.`,
    messages: [
      {
        role: 'user',
        content: `Community data:
- Total reflections: ${reflectionCount}
- Completed events: ${eventCount}
- Total members: ${memberCount}
- Top regions: ${regionalData.map(r => `${r.city} (${r.count})`).join(', ')}

Recent reflection excerpts:
${relevantContent || 'No reflections yet.'}

Generate the community health analysis.`,
      },
    ],
    maxTokens: 512,
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';

  let parsed: { topThemes: string[]; sentimentSummary: string; recommendations: string[] };
  try {
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(clean);
  } catch {
    parsed = {
      topThemes: ['Connection', 'Abundance', 'Community'],
      sentimentSummary: 'Community data is being gathered.',
      recommendations: ['Host more events', 'Encourage reflections', 'Expand regionally'],
    };
  }

  return {
    date: now.toISOString().split('T')[0] ?? '',
    totalReflections: reflectionCount,
    totalEvents: eventCount,
    totalMembers: memberCount,
    topThemes: parsed.topThemes,
    sentimentSummary: parsed.sentimentSummary,
    regionalStrengths: regionalData.map(r => ({ city: r.city, count: r.count })),
    recommendations: parsed.recommendations,
    generatedAt: now,
  };
}

// RAG-enhanced member intent classification
// Called by @SAGE to find similar past intents for context
export async function findSimilarIntents(message: string): Promise<string[]> {
  const results = await semanticSearch({
    query: message,
    sourceType: 'member_intent',
    limit: 3,
    threshold: 0.75,
  });
  return results.map(r => r.content);
}
```

---

## SECTION 6: API ROUTES

### GET /api/search

Create apps/api/src/app/api/search/route.ts:

```typescript
// @version 1.2.0 - Prism
// Semantic search across all embedded content

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { applyRateLimit } from '@/lib/rateLimit';
import { semanticSearch } from '@/lib/embeddings';
import { z } from 'zod';

const SearchSchema = z.object({
  q: z.string().min(2).max(200),
  type: z.enum(['reflection', 'article', 'event', 'member_intent']).optional(),
  limit: z.coerce.number().min(1).max(20).default(5),
});

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, 'ai');  // semantic search calls embeddings API
  if (limited) return limited;

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = SearchSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const results = await semanticSearch({
    query: parsed.data.q,
    sourceType: parsed.data.type,
    limit: parsed.data.limit,
  });

  return NextResponse.json({ success: true, results, count: results.length });
}
```

### GET /api/analyst/health

Create apps/api/src/app/api/analyst/health/route.ts:

```typescript
// @version 1.2.0 - Prism
// Community health report from @ANALYST

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { applyRateLimit } from '@/lib/rateLimit';
import { generateHealthReport } from '@/council/analyst';

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, 'ai');
  if (limited) return limited;

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const report = await generateHealthReport();
  return NextResponse.json(
    { success: true, report },
    { headers: { 'Cache-Control': 'private, max-age=300' } }  // cache 5 min
  );
}
```

---

## SECTION 7: ADMIN INSIGHTS PAGE

Create apps/web/src/app/(admin)/admin/insights/page.tsx:

```
Page layout top to bottom:

1. Header: "Intelligence" section label + "Community Insights"
   Fraunces italic heading + "Powered by @ANALYST" navy badge

2. Stats row (4 AdminStatCards):
   Total Reflections, Total Events, Total Members, Embeddings Count

3. Top Themes section:
   Section label "What the community cares about"
   3 theme pills: bg-navy text-white rounded-full px-4 py-2
   (from report.topThemes)

4. Sentiment summary card:
   Left-border-teal card
   Section label "Community sentiment"
   Body: report.sentimentSummary in DM Sans text-sm ink

5. Regional strengths table:
   AdminDataTable
   Columns: City | Interest Count | Relative size bar

6. Recommendations section:
   Section label "Recommended actions"
   3 recommendation cards, left-border-mustard
   Each: Fraunces italic text-navy + description

7. Refresh button bottom:
   "Regenerate Report" mustard ghost pill
   onClick: re-fetches /api/analyst/health
   Note: this calls Claude -- warn "Takes ~10 seconds"
   Show loading spinner while fetching
```

Add "Insights" to AdminSidebar.tsx under MANAGE section:
  Insights  /admin/insights  Sparkles icon (Lucide)

---

## SECTION 8: ENHANCE @SAGE WITH RAG

Update apps/api/src/council/sage/classifyOnboarding.ts.

After classification, use findSimilarIntents() to add
context from past similar intents:

```typescript
// After classifyMemberIntent() returns, enhance with RAG context:
import { findSimilarIntents } from '../analyst';

// In the processOnboarding service (onboarding.ts):
// Find similar past intents for context
const similarIntents = await findSimilarIntents(input.message).catch(() => []);
// Log for now -- in v1.3.0 this will influence the response
if (similarIntents.length > 0) {
  console.log(`[@SAGE RAG] Found ${similarIntents.length} similar past intents`);
}
```

This is a light touch -- the RAG context is logged but
doesn't yet change the classification output. Full RAG
integration into the classification prompt is v1.3.0 Nexus.

---

## SECTION 9: EXECUTION ORDER

```
STEP 1: Supabase pgvector setup (Brian -- manual)
  - Enable pgvector extension in Supabase SQL Editor
  - Verify with: SELECT * FROM pg_extension WHERE extname = 'vector'
  - Report: extension enabled

STEP 2: Prisma schema + migration
  - Add Embedding model (WITHOUT vector column)
  - npx prisma migrate dev --name add_embeddings
  - npx prisma validate + pnpm typecheck
  - Report: migration output

STEP 3: SQL vector column (Brian -- manual)
  - Run the ALTER TABLE + CREATE INDEX SQL in Supabase SQL Editor
  - Report: SQL executed successfully

STEP 4: Embedding service
  - Check Anthropic SDK version for embeddings support
  - If SDK supports it: implement via SDK
  - If not: install voyageai, implement via Voyage AI
  - Create apps/api/src/lib/embeddings.ts
  - Add VOYAGE_API_KEY to .env.example if needed
  - pnpm typecheck
  - Report: which provider used, implementation details

STEP 5: Embed content Inngest function
  - Create embed-content.ts
  - Register (total: 7 functions)
  - pnpm typecheck + pnpm lint
  - Report: function ID, trigger event

STEP 6: @ANALYST agent
  - Create apps/api/src/council/analyst/index.ts
  - pnpm typecheck
  - Report: functions exported

STEP 7: API routes
  - Create /api/search/route.ts
  - Create /api/analyst/health/route.ts
  - pnpm typecheck + pnpm lint
  - next build (API): report route count

STEP 8: Admin insights page
  - Create /admin/insights/page.tsx
  - Update AdminSidebar.tsx (add Insights nav item)
  - pnpm typecheck + next build (web)
  - Report: page count

STEP 9: @SAGE RAG enhancement
  - Update onboarding.ts to call findSimilarIntents
  - pnpm typecheck
  - Report: what changed

STEP 10: Full verification
  - pnpm typecheck: 4/4 packages, 0 errors
  - pnpm lint: 4/4 packages, 0 warnings
  - npx prisma validate
  - pnpm --filter api build: report route count
  - pnpm --filter web build: report page count
  - npx prisma db push
  - Report full output

STEP 11: CHANGELOG + CONTRACT + tag + push
  - Write CHANGELOG v1.2.0 entry
  - Update CONTRACT.md:
      CURRENT_VERSION=1.2.0
      CURRENT_CODENAME=Prism
      NEXT_VERSION=1.3.0
      NEXT_CODENAME=Nexus
  - git commit -m "feat: v1.2.0 Prism — RAG + pgvector + @ANALYST"
  - git tag v1.2.0
  - git push origin main --tags
  - Report commit hash + tag
```

---

## SECTION 10: v1.2.0 DEFINITION OF DONE

- [ ] pgvector extension enabled in Supabase
- [ ] Embedding model in Prisma schema
- [ ] vector column + IVFFlat index added via SQL
- [ ] generateEmbedding() returns float array
- [ ] storeEmbedding() saves to DB + vector column
- [ ] semanticSearch() returns ranked results by similarity
- [ ] embed-content Inngest function registered (7 total)
- [ ] @ANALYST generateHealthReport() returns valid report
- [ ] GET /api/search returns semantic results
- [ ] GET /api/analyst/health returns community report
- [ ] /admin/insights page renders health report
- [ ] AdminSidebar has Insights nav item
- [ ] @SAGE logs RAG context from similar intents
- [ ] pnpm typecheck: 4/4 packages, 0 errors
- [ ] pnpm lint: 4/4 packages, 0 warnings
- [ ] next build (API + Web): 0 errors
- [ ] CHANGELOG.md updated
- [ ] Git tagged v1.2.0 + pushed

---

END OF PRISM BLUEPRINT v1.2.0
