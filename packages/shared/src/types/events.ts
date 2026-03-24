// @version 0.5.0 - Echo: frontend event view model types

import type { UserTier } from "./user";

/** Event visibility — maps to tier + public */
export type EventVisibility = "public" | UserTier;

/** Frontend event lifecycle status */
export type FeastEventStatus = "draft" | "open" | "confirmed" | "full" | "completed";

/** Frontend event view model — used by mobile + web UI layers */
export interface FeastEventView {
  id: string;
  title: string;
  description?: string;
  hostId: string;
  hostName: string;
  date: Date;
  location: string;
  city: string;
  maxSeats: number;
  confirmedSeats: number;
  visibility: EventVisibility;
  status: FeastEventStatus;
  imageUrl?: string;
  createdAt: Date;
}

/** RSVP record for frontend */
export interface RSVP {
  id: string;
  eventId: string;
  userId: string;
  status: "confirmed" | "waitlisted" | "cancelled";
  createdAt: Date;
}
