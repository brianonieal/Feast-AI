// @version 0.1.0 - Foundation scaffold

export const APP_NAME = "Feast-AI";
export const APP_VERSION = "0.1.0";
export const APP_TAGLINE = "AI-native community operating system for meaningful gatherings";

export const API_URL = "http://localhost:3000";

export const DEFAULTS = {
  EVENT_CAPACITY: 12,
  EVENT_TYPE: "OPEN" as const,
  USER_ROLE: "ATTENDEE" as const,
  COMMUNITY_TIER: "PUBLIC" as const,
} as const;
