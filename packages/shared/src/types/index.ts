// @version 0.1.0 - Foundation scaffold

export type {
  UserRole,
  UserTier,
  CommunityTier,
  User,
  UserPublic,
  FeastUserRole,
  FeastUser,
  ClerkUserMetadata,
  TierPermissions,
} from "./user";

export { getUserTier, getPermissions } from "./user";

export type {
  EventType,
  EventStatus,
  RSVPStatus,
  FeastEvent,
  FeastEventWithHost,
  EventAttendance,
} from "./event";

// @version 0.2.0 - Conduit: adapter types
export type {
  AdapterHealthResult,
  IntegrationStatus,
  BaseAdapter,
} from "./adapter";

// @version 0.3.0 - Signal: message types
export type {
  MessageChannel,
  MessageIntent,
  InboundMessage,
  IntentClassification,
} from "./message";

// @version 0.5.0 - Echo: frontend event view model types
export type {
  EventVisibility,
  FeastEventStatus,
  FeastEventView,
  RSVP,
} from "./events";

// @version 0.5.0 - Echo: Council AI types
export type {
  CouncilOutputType,
  CouncilJobType,
  CouncilJobStatus,
  CouncilJobOutput,
  CouncilJob,
} from "./ai";

// @version 0.6.0 - Beacon: distribution types (supersedes ai.ts DistributionTarget)
export type {
  DistributionChannel,
  DistributionTarget,
  DistributionResult,
  ApprovalQueueItem,
} from "./distribution";

export { getDistributionTargets } from "./distribution";

// @version 0.7.0 - Compass: onboarding + classification types
export type {
  MemberIntentType,
  ApplicationRole,
  ApplicationStatus,
  ClassificationResult,
  OnboardingPath,
  EmailTemplate,
  ApplicationSubmission,
} from "./onboarding";

export { ONBOARDING_PATHS } from "./onboarding";

// @version 0.5.0 - Echo: content types
export type {
  ContentStatus,
  ContentChannel,
  PublishStatus,
  DinnerQuote,
  ContentSubmission,
  PublishedContent,
  Reflection,
  ContentPipelineInput,
  ContentPipelineOutput,
} from "./content";
