// @version 0.5.0 - Echo: content processing pipeline
import { inngest } from "@/lib/inngest";
import { db } from "@/lib/db";
import { deepgramAdapter } from "@/integrations/deepgram/adapter";
import { wordpressAdapter } from "@/integrations/wordpress/adapter";
import { circleAdapter } from "@/integrations/circle/adapter";
import { transformDinnerContent } from "@/council/communicator";
import type { ContentPipelineInput, DinnerQuote } from "@feast-ai/shared";

/**
 * Content processing pipeline:
 * 1. Mark submission as PROCESSING
 * 2. Transcribe audio if present (Deepgram)
 * 3. Transform content via @COMMUNICATOR (Claude)
 * 4. Save generated content as PublishedContent records (DRAFT status)
 * 5. Publish article draft to WordPress
 * 6. Post recap to Circle
 * 7. Mark submission as READY_FOR_REVIEW
 */
export const contentSubmittedPipeline = inngest.createFunction(
  {
    id: "content-submitted-pipeline",
    name: "Content Submitted Pipeline",
    retries: 2,
    triggers: [{ event: "feast/content.submitted" }],
  },
  async ({ event, step }: { event: { data: { submissionId: string } }; step: {
    run: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
  }}) => {
    const { submissionId } = event.data;

    // Step 1: Load submission and mark PROCESSING
    const submission = await step.run("load-and-mark-processing", async () => {
      return db.contentSubmission.update({
        where: { id: submissionId },
        data: { status: "PROCESSING" },
        include: {
          event: {
            include: { host: { select: { name: true } } },
          },
        },
      });
    });

    // Step 2: Transcribe audio if present
    const transcript = await step.run("transcribe-audio", async () => {
      if (!submission.audioUrl) return submission.transcript;

      try {
        const text = await deepgramAdapter.transcribe(submission.audioUrl);
        await db.contentSubmission.update({
          where: { id: submissionId },
          data: { transcript: text },
        });
        return text;
      } catch (err: unknown) {
        console.error("Deepgram transcription failed:", err instanceof Error ? err.message : err);
        return submission.transcript;
      }
    });

    // Step 3: Transform content via @COMMUNICATOR
    const photos = (submission.photos as string[] | null) ?? [];
    const quotes = (submission.quotes as DinnerQuote[] | null) ?? [];

    const pipelineInput: ContentPipelineInput = {
      eventId: submission.eventId,
      submissionId: submission.id,
      photos,
      quotes,
      transcript: transcript ?? null,
      eventName: submission.event.name,
      eventDate: submission.event.date.toISOString(),
      eventLocation: `${submission.event.location}, ${submission.event.city}`,
      hostName: submission.event.host.name ?? "A Feast Host",
    };

    const content = await step.run("transform-content", async () => {
      return transformDinnerContent(pipelineInput);
    });

    // Step 4: Save generated content as PublishedContent records
    const savedContent = await step.run("save-content-records", async () => {
      const records = [];

      if (content.article) {
        records.push(
          db.publishedContent.create({
            data: {
              eventId: submission.eventId,
              submissionId,
              channel: "WEBSITE_ARTICLE",
              title: content.article.title,
              body: content.article.body,
              status: "DRAFT",
            },
          })
        );
      }
      if (content.instagram) {
        records.push(
          db.publishedContent.create({
            data: {
              eventId: submission.eventId,
              submissionId,
              channel: "INSTAGRAM",
              body: content.instagram.caption,
              status: "DRAFT",
            },
          })
        );
      }
      if (content.circleRecap) {
        records.push(
          db.publishedContent.create({
            data: {
              eventId: submission.eventId,
              submissionId,
              channel: "CIRCLE_RECAP",
              body: content.circleRecap.body,
              status: "DRAFT",
            },
          })
        );
      }
      if (content.newsletter) {
        records.push(
          db.publishedContent.create({
            data: {
              eventId: submission.eventId,
              submissionId,
              channel: "NEWSLETTER",
              title: content.newsletter.subject,
              body: content.newsletter.body,
              metadata: { preview: content.newsletter.preview },
              status: "DRAFT",
            },
          })
        );
      }

      return Promise.all(records);
    });

    // Step 5: Publish article draft to WordPress (if generated)
    if (content.article) {
      await step.run("publish-to-wordpress", async () => {
        try {
          const post = await wordpressAdapter.createPost({
            title: content.article!.title,
            content: content.article!.body,
            status: "draft",
          });
          // Update the article record with external ID
          const articleRecord = savedContent.find((r) => r.channel === "WEBSITE_ARTICLE");
          if (articleRecord) {
            await db.publishedContent.update({
              where: { id: articleRecord.id },
              data: { externalId: String(post.id), externalUrl: post.link },
            });
          }
          return post;
        } catch (err: unknown) {
          console.error("WordPress publish failed:", err instanceof Error ? err.message : err);
          return null;
        }
      });
    }

    // Step 6: Post recap to Circle (if generated)
    if (content.circleRecap) {
      await step.run("post-to-circle", async () => {
        try {
          const spaces = await circleAdapter.listSpaces();
          const targetSpace = spaces[0];
          if (!targetSpace) return null;

          return circleAdapter.createPost({
            spaceId: targetSpace.id,
            name: `Recap: ${submission.event.name}`,
            body: content.circleRecap!.body,
          });
        } catch (err: unknown) {
          console.error("Circle recap post failed:", err instanceof Error ? err.message : err);
          return null;
        }
      });
    }

    // Step 7: Mark submission as READY_FOR_REVIEW
    await step.run("mark-ready", async () => {
      return db.contentSubmission.update({
        where: { id: submissionId },
        data: { status: "READY_FOR_REVIEW" },
      });
    });

    return {
      submissionId,
      channelsGenerated: savedContent.map((r) => r.channel),
      status: "READY_FOR_REVIEW",
    };
  }
);
