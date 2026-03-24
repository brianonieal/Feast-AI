// @version 0.7.0 - Compass: onboarding + classification types

export type MemberIntentType =
  | "attend"
  | "host"
  | "facilitate"
  | "diy"
  | "newsletter";

export type ApplicationRole = "host" | "facilitator";
export type ApplicationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "waitlisted";

export interface ClassificationResult {
  intent: MemberIntentType;
  confidence: number; // 0-1
  reasoning?: string; // @SAGE's explanation
  suggestedPath: OnboardingPath;
}

export interface OnboardingPath {
  intent: MemberIntentType;
  nextStep: string; // human-readable next action
  emailTemplate: EmailTemplate;
  hubspotTags: string[]; // tags to apply in HubSpot
  hubspotPipeline?: string; // pipeline to add contact to
}

export type EmailTemplate =
  | "welcome_attend"
  | "welcome_host"
  | "welcome_facilitate"
  | "welcome_diy"
  | "welcome_newsletter";

// Maps intent to onboarding path — explicit Record type for safe indexing
export const ONBOARDING_PATHS: Record<MemberIntentType, OnboardingPath> = {
  attend: {
    intent: "attend",
    nextStep: "Find a dinner near you",
    emailTemplate: "welcome_attend",
    hubspotTags: ["feast-attendee", "interest-attend"],
  },
  host: {
    intent: "host",
    nextStep: "Complete your host application",
    emailTemplate: "welcome_host",
    hubspotTags: ["feast-host-applicant", "interest-host"],
    hubspotPipeline: "host-application",
  },
  facilitate: {
    intent: "facilitate",
    nextStep: "Complete your facilitator application",
    emailTemplate: "welcome_facilitate",
    hubspotTags: ["feast-facilitator-applicant", "interest-facilitate"],
    hubspotPipeline: "facilitator-application",
  },
  diy: {
    intent: "diy",
    nextStep: "Join the DIY waitlist",
    emailTemplate: "welcome_diy",
    hubspotTags: ["feast-diy", "interest-diy"],
  },
  newsletter: {
    intent: "newsletter",
    nextStep: "Stay connected via newsletter",
    emailTemplate: "welcome_newsletter",
    hubspotTags: ["feast-newsletter"],
  },
};

export interface ApplicationSubmission {
  role: ApplicationRole;
  name: string;
  city: string;
  isOrganizer?: string;
  motivation?: string;
  userId: string;
}
