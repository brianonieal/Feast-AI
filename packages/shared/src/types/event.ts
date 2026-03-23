// @version 0.1.0 - Foundation scaffold

import type { CommunityTier, UserPublic } from "./user";

/** Whether an event is open to the public or restricted */
export type EventType = "OPEN" | "CLOSED";

/** Event lifecycle status */
export type EventStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "MARKETED"
  | "LIVE"
  | "COMPLETED"
  | "CANCELLED";

/** RSVP status for event attendees */
export type RSVPStatus =
  | "INTERESTED"
  | "CONFIRMED"
  | "DECLINED"
  | "ATTENDED"
  | "NO_SHOW";

/** Core event type aligned with Prisma FeastEvent model */
export interface FeastEvent {
  id: string;
  name: string;
  description: string | null;
  date: Date;
  location: string;
  city: string;
  capacity: number;
  type: EventType;
  status: EventStatus;
  communityTier: CommunityTier;
  circlePostId: string | null;
  circleEventId: string | null;
  hostId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/** Event with host info for display */
export interface FeastEventWithHost extends FeastEvent {
  host: UserPublic;
}

/** Event attendance record */
export interface EventAttendance {
  id: string;
  userId: string;
  eventId: string;
  status: RSVPStatus;
  createdAt: Date;
}
