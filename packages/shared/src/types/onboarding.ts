// @version 1.0.1 - Onboarding types (HubSpot fields removed)

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
  },
  host: {
    intent: "host",
    nextStep: "Complete your host application",
    emailTemplate: "welcome_host",
  },
  facilitate: {
    intent: "facilitate",
    nextStep: "Complete your facilitator application",
    emailTemplate: "welcome_facilitate",
  },
  diy: {
    intent: "diy",
    nextStep: "Join the DIY waitlist",
    emailTemplate: "welcome_diy",
  },
  newsletter: {
    intent: "newsletter",
    nextStep: "Stay connected via newsletter",
    emailTemplate: "welcome_newsletter",
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
