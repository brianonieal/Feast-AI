// @version 1.2.0 - Prism: embed new content automatically
// Single event type 'content/embed' handles all 4 source types
// based on sourceType field in event data.
// Returns { skipped: true } when no content found — NOT an error.

import { inngest } from "@/lib/inngest";
import { db } from "@/lib/db";
import { storeEmbedding } from "@/lib/embeddings";
import { saveFailedJob } from "../services/deadLetter";

// ESCAPE: Inngest v4 inferred type not portable without Fetch reference
export const embedContentFunction: ReturnType<typeof inngest.createFunction> =
  inngest.createFunction(
    {
      id: "embed-content",
      name: "Embed Content — @ANALYST",
      retries: 3,
      triggers: [{ event: "content/embed" }],
      // ESCAPE: Inngest v4 onFailure type is any
      onFailure: async (ctx: any) => {
        await saveFailedJob({
          functionId: "embed-content",
          eventName: ctx.event?.name ?? "content/embed",
          payload: (ctx.event?.data as Record<string, unknown>) ?? {},
          error: ctx.error?.message ?? "Unknown error",
          attempts: ctx.attempt ?? 3,
        });
      },
    },
    async ({
      event,
      step,
    }: {
      event: {
        data: {
          sourceType: "reflection" | "article" | "event" | "member_intent";
          sourceId: string;
        };
      };
      step: {
        run: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
      };
    }) => {
      const { sourceType, sourceId } = event.data;

      // Step 1: Fetch the content to embed based on source type
      const content = await step.run("fetch-content", async () => {
        switch (sourceType) {
          case "reflection": {
            const r = await db.reflection.findUnique({
              where: { id: sourceId },
            });
            return r?.text ?? null;
          }
          case "article": {
            const a = await db.publishedContent.findUnique({
              where: { id: sourceId },
            });
            return a ? `${a.title ?? ""}\n\n${a.body}` : null;
          }
          case "event": {
            const e = await db.feastEvent.findUnique({
              where: { id: sourceId },
            });
            return e
              ? `${e.name}\n\n${e.description ?? ""}\n\nCity: ${e.city}`
              : null;
          }
          case "member_intent": {
            const m = await db.memberIntent.findUnique({
              where: { id: sourceId },
            });
            return m?.rawInput ?? null;
          }
          default:
            return null;
        }
      });

      if (!content) {
        return { skipped: true, reason: "No content found" };
      }

      // Step 2: Generate and store the embedding
      const embedding = await step.run("store-embedding", async () => {
        return storeEmbedding({ sourceType, sourceId, content });
      });

      return {
        embedded: true,
        embeddingId: embedding.id,
        sourceType,
        sourceId,
      };
    }
  );
