// @version 0.1.0 - Foundation scaffold
// @version 0.5.0 - Echo: updated version, tier defaults

export const APP_NAME = "Feast-AI";
export const APP_VERSION = "0.5.0";
export const APP_TAGLINE = "AI-native community operating system for meaningful gatherings";

export const API_URL = "http://localhost:3000";

// @version 0.5.0 - Echo: bottom nav tabs
export const TABS = [
  { key: "home", label: "Home", route: "/home", icon: "UtensilsCrossed" },
  { key: "circle", label: "Circle", route: "/circle", icon: "Users" },
  { key: "events", label: "Events", route: "/events", icon: "CalendarDays" },
  { key: "library", label: "Library", route: "/library", icon: "BookOpen" },
] as const;

export type TabKey = (typeof TABS)[number]["key"];

// @version 0.5.0 - Echo: Library / The Pantry resource domains
export const PANTRY_DOMAINS = [
  "Personal Growth",
  "Land & Agriculture",
  "Community Finance",
  "Creative Economy",
  "Governance",
  "Water",
  "Decentralized Technology",
] as const;

export type PantryDomain = (typeof PANTRY_DOMAINS)[number];

export const DEFAULTS = {
  EVENT_CAPACITY: 12,
  EVENT_TYPE: "OPEN" as const,
  USER_ROLE: "ATTENDEE" as const,
  COMMUNITY_TIER: "commons" as const,
} as const;
