// @version 0.5.0 - Echo: content pipeline schemas
import { z } from "zod";

export const ContentStatusSchema = z.enum([
  "RECEIVED", "PROCESSING", "READY_FOR_REVIEW", "APPROVED", "PUBLISHED", "REJECTED",
]);

export const ContentChannelSchema = z.enum([
  "WEBSITE_ARTICLE", "INSTAGRAM", "CIRCLE_RECAP", "NEWSLETTER", "EMAIL_CAMPAIGN",
]);

export const PublishStatusSchema = z.enum([
  "DRAFT", "PENDING_REVIEW", "APPROVED", "PUBLISHED", "FAILED",
]);

export const DinnerQuoteSchema = z.object({
  text: z.string().min(1),
  attribution: z.string().nullable(),
});

export const CreateContentSubmissionSchema = z.object({
  eventId: z.string().cuid(),
  photos: z.array(z.string().url()).optional(),
  quotes: z.array(DinnerQuoteSchema).optional(),
  audioUrl: z.string().url().optional(),
});

export const ContentPipelineOutputSchema = z.object({
  article: z.object({ title: z.string(), body: z.string() }).nullable(),
  instagram: z.object({ caption: z.string() }).nullable(),
  circleRecap: z.object({ body: z.string() }).nullable(),
  newsletter: z.object({
    subject: z.string().max(60),
    preview: z.string().max(120),
    body: z.string(),
  }).nullable(),
});
