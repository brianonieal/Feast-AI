// @version 1.2.0 - Prism
// Embedding generation via Voyage AI (voyage-3 model, 1536 dimensions)
// Stores and retrieves vectors from Supabase pgvector
// Stubs gracefully when VOYAGE_API_KEY is missing — app boots without live key

import { VoyageAIClient } from "voyageai";
import { db } from "./db";

const EMBEDDING_MODEL = "voyage-3";
const EMBEDDING_DIMENSIONS = 1536;

// Lazy client instantiation — only created when actually needed
let voyageClient: VoyageAIClient | null = null;

function getVoyageClient(): VoyageAIClient {
  if (!voyageClient) {
    if (!process.env.VOYAGE_API_KEY) {
      throw new Error("VOYAGE_API_KEY not set");
    }
    voyageClient = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY });
  }
  return voyageClient;
}

export interface EmbeddingResult {
  id: string;
  sourceType: string;
  sourceId: string;
  content: string;
}

/**
 * Generate embedding vector for a piece of text.
 * Returns a 1536-dimension float array.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Stub when no API key — return zero vector for development
  if (!process.env.VOYAGE_API_KEY) {
    console.log(`[Embeddings stub] Would embed ${text.length} chars`);
    return new Array(EMBEDDING_DIMENSIONS).fill(0);
  }

  const client = getVoyageClient();
  const response = await client.embed({
    input: text,
    model: EMBEDDING_MODEL,
  });

  const embedding = response.data?.[0]?.embedding;
  if (!embedding) {
    throw new Error("No embedding returned from Voyage AI");
  }

  return embedding;
}

/**
 * Store an embedding in the DB + pgvector column.
 * Upserts by (sourceType, sourceId) — one embedding per source record.
 */
export async function storeEmbedding(params: {
  sourceType: "reflection" | "article" | "event" | "member_intent";
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
  const vectorStr = `[${vector.join(",")}]`;
  await db.$executeRawUnsafe(
    `UPDATE embeddings SET embedding = $1::vector WHERE id = $2`,
    vectorStr,
    record.id
  );

  return record;
}

/**
 * Semantic search — find most similar embeddings to a query.
 * Uses pgvector cosine distance for similarity ranking.
 */
export async function semanticSearch(params: {
  query: string;
  sourceType?: string;
  limit?: number;
  threshold?: number; // cosine similarity threshold 0-1, default 0.7
}): Promise<
  Array<{
    id: string;
    sourceType: string;
    sourceId: string;
    content: string;
    similarity: number;
  }>
> {
  const { query, sourceType, limit = 5, threshold = 0.7 } = params;
  const vector = await generateEmbedding(query);
  const vectorStr = `[${vector.join(",")}]`;

  // Build query with optional sourceType filter
  let sql = `
    SELECT
      id,
      source_type,
      source_id,
      content,
      1 - (embedding <=> $1::vector) AS similarity
    FROM embeddings
    WHERE embedding IS NOT NULL
    AND 1 - (embedding <=> $1::vector) > $2
  `;
  const sqlParams: (string | number)[] = [vectorStr, threshold];

  if (sourceType) {
    sql += ` AND source_type = $3`;
    sqlParams.push(sourceType);
  }

  sql += ` ORDER BY embedding <=> $1::vector LIMIT ${limit}`;

  const results = await db.$queryRawUnsafe<
    Array<{
      id: string;
      source_type: string;
      source_id: string;
      content: string;
      similarity: number;
    }>
  >(sql, ...sqlParams);

  return results.map((r) => ({
    id: r.id,
    sourceType: r.source_type,
    sourceId: r.source_id,
    content: r.content,
    similarity: r.similarity,
  }));
}
