// @version 0.5.0 - Echo: Event card for events page
// Matches mockup Row 1 Col 2 — strict 3-column row layout
// Left border accent: mustard for open/confirmed, muted for full
"use client";

import type { FeastEventStatus } from "@feast-ai/shared";
import { RSVPButton } from "./RSVPButton";

interface EventCardProps {
  id: string;
  title: string;
  location: string;
  date: Date;
  maxSeats: number;
  confirmedSeats: number;
  status: FeastEventStatus;
}

const MONTH_ABBREV = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

function getBorderColor(status: FeastEventStatus): string {
  if (status === "full") return "border-l-[#E5DDD0]";
  return "border-l-mustard";
}

export function EventCard({
  id,
  title,
  location,
  date,
  maxSeats,
  confirmedSeats,
  status,
}: EventCardProps) {
  const eventDate = new Date(date);
  const month = MONTH_ABBREV[eventDate.getMonth()];
  const day = eventDate.getDate();
  const seatsLeft = maxSeats - confirmedSeats;

  return (
    <article
      className={`bg-card border border-border rounded-md p-3 border-l-[3px] ${getBorderColor(status)} flex items-center gap-3`}
    >
      {/* DATE BLOCK — fixed width 48px */}
      <div className="w-12 flex-shrink-0 bg-mustard-soft rounded-md py-2 text-center">
        <p className="font-sans text-[10px] uppercase text-mustard leading-none">
          {month}
        </p>
        <p className="font-sans text-sm font-bold text-mustard leading-tight mt-0.5">
          {day}
        </p>
      </div>

      {/* EVENT DETAILS — flex-1 */}
      <div className="flex-1 min-w-0">
        <h3 className="font-display italic font-light text-[15px] text-navy leading-tight truncate">
          {title}
        </h3>
        <p className="font-sans text-xs text-ink-light mt-0.5 truncate">
          {location}
        </p>
        <p className="font-sans text-xs text-ink-light mt-0.5">
          {seatsLeft > 0 ? `${seatsLeft} seats left` : "No seats left"}
        </p>
      </div>

      {/* ACTION / STATUS — right-aligned */}
      <div className="flex-shrink-0">
        <RSVPButton eventId={id} status={status} />
      </div>
    </article>
  );
}
