// @version 0.5.0 - Echo: Council AI types for frontend

/** Output types map directly to the 4 WYSIWYG tabs */
export type CouncilOutputType = "article" | "social" | "recap" | "instagram";

export type CouncilJobType =
  | "event_image_gen"      // HuggingFace: event cover image
  | "event_copy_gen"       // Claude: marketing copy for event
  | "post_event_content";  // Claude: article + social + recap + instagram from host submission

export type CouncilJobStatus =
  | "queued"
  | "running"
  | "awaiting_review"    // AI done — host must review in WYSIWYG editor
  | "approved"
  | "rejected"
  | "published";

export interface CouncilJobOutput {
  article?: string;    // markdown
  social?: string;     // plain text
  recap?: string;      // plain text
  instagram?: string;  // plain text
  imageUrl?: string;   // URL from HuggingFace
}

export interface CouncilJob {
  id: string;
  type: CouncilJobType;
  status: CouncilJobStatus;
  triggeredBy: string;
  eventId?: string;
  inputPayload: {
    photos?: string[];         // uploaded URLs
    quotes?: string[];         // attendee quotes
    reflection?: string;       // host recorded reflection transcript
    eventTitle?: string;
    eventDate?: string;
    city?: string;
  };
  output?: CouncilJobOutput;
  activeOutputTab?: CouncilOutputType;
  reviewedBy?: string;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** Distribution targets from workflow PDF */
export type DistributionTarget =
  | "instagram"
  | "mailing_list"
  | "circle_public"
  | "circle_tier"
  | "crm_regional";
