// @version 0.5.0 - Echo: content pipeline types

export type ContentStatus =
  | "RECEIVED"
  | "PROCESSING"
  | "READY_FOR_REVIEW"
  | "APPROVED"
  | "PUBLISHED"
  | "REJECTED";

export type ContentChannel =
  | "WEBSITE_ARTICLE"
  | "INSTAGRAM"
  | "CIRCLE_RECAP"
  | "NEWSLETTER"
  | "EMAIL_CAMPAIGN";

export type PublishStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "PUBLISHED"
  | "FAILED";

/** A quote submitted by a host after a dinner */
export interface DinnerQuote {
  text: string;
  attribution: string | null;
}

/** Raw content submission from a host */
export interface ContentSubmission {
  id: string;
  eventId: string;
  submittedBy: string;
  photos: string[] | null;
  quotes: DinnerQuote[] | null;
  audioUrl: string | null;
  transcript: string | null;
  status: ContentStatus;
  createdAt: Date;
  updatedAt: Date;
}

/** Generated content ready for distribution */
export interface PublishedContent {
  id: string;
  eventId: string;
  submissionId: string | null;
  channel: ContentChannel;
  title: string | null;
  body: string;
  imageUrl: string | null;
  metadata: Record<string, unknown> | null;
  status: PublishStatus;
  publishedAt: Date | null;
  externalId: string | null;
  externalUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Post-dinner reflection from an attendee */
export interface Reflection {
  id: string;
  userId: string;
  eventId: string;
  text: string;
  sentiment: string | null;
  themes: string[] | null;
  createdAt: Date;
}

/** Input to the content transformation pipeline */
export interface ContentPipelineInput {
  eventId: string;
  submissionId: string;
  photos: string[];
  quotes: DinnerQuote[];
  transcript: string | null;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  hostName: string;
}

/** Output from @COMMUNICATOR content transformation */
export interface ContentPipelineOutput {
  article: { title: string; body: string } | null;
  instagram: { caption: string } | null;
  circleRecap: { body: string } | null;
  newsletter: { subject: string; preview: string; body: string } | null;
}
