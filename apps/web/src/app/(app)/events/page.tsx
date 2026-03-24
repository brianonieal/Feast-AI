// @version 0.5.0 - Echo: Events / The Arc page
// Matches mockup Row 1 Col 2 — vertical layout with city filter strip
// Static seed data — will be replaced by API calls in later version
"use client";

import { useState } from "react";
import { EventCard } from "@/components/events/EventCard";
import { CouncilTriggerButton } from "@/components/ai/CouncilTriggerButton";
import type { FeastEventStatus } from "@feast-ai/shared";

// Seed cities for filter pills
const CITIES = ["All", "Brooklyn", "LA", "DC", "Chicago", "London"] as const;

// Seed events — clearly labeled as placeholders, never fabricated as real
interface SeedEvent {
  id: string;
  title: string;
  location: string;
  city: string;
  date: Date;
  maxSeats: number;
  confirmedSeats: number;
  status: FeastEventStatus;
}

const SEED_EVENTS: SeedEvent[] = [
  {
    id: "e1",
    title: "Brooklyn Spring Dinner",
    location: "Fort Greene Community Space",
    city: "Brooklyn",
    date: new Date("2026-04-12"),
    maxSeats: 12,
    confirmedSeats: 8,
    status: "open",
  },
  {
    id: "e2",
    title: "LA Westside Community Feast",
    location: "Venice Canals Gathering",
    city: "LA",
    date: new Date("2026-04-15"),
    maxSeats: 16,
    confirmedSeats: 16,
    status: "full",
  },
  {
    id: "e3",
    title: "Meditation Rooftop Gathering",
    location: "Williamsburg Loft",
    city: "Brooklyn",
    date: new Date("2026-04-18"),
    maxSeats: 10,
    confirmedSeats: 7,
    status: "confirmed",
  },
  {
    id: "e4",
    title: "Lincoln Bridge Supper Club",
    location: "Adams Morgan House",
    city: "DC",
    date: new Date("2026-04-22"),
    maxSeats: 8,
    confirmedSeats: 3,
    status: "open",
  },
  {
    id: "e5",
    title: "Tokyo Diffuse Night Host",
    location: "Omotesando Gallery",
    city: "Chicago",
    date: new Date("2026-04-25"),
    maxSeats: 14,
    confirmedSeats: 14,
    status: "full",
  },
];

export default function EventsPage() {
  const [selectedCity, setSelectedCity] = useState<string>("All");

  return (
    <div className="py-6 space-y-5">
      {/* Header */}
      <div>
        <p className="font-sans text-[10px] font-medium tracking-[0.09em] uppercase text-mustard mb-1">
          The Arc
        </p>
        <h1 className="font-display italic font-light text-2xl text-navy leading-tight">
          Upcoming Gatherings
        </h1>
      </div>

      {/* City filter pill strip — horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {CITIES.map((city) => (
          <button
            key={city}
            type="button"
            onClick={() => setSelectedCity(city)}
            className={`flex-shrink-0 rounded-full px-4 py-1 text-xs font-sans font-medium transition-colors ${
              selectedCity === city
                ? "bg-mustard text-white"
                : "bg-[var(--bg-surface)] border border-border text-ink-mid hover:border-mustard/40"
            }`}
          >
            {city}
          </button>
        ))}
      </div>

      {/* Event card list */}
      <section className="space-y-3">
        {SEED_EVENTS.map((event) => (
          <EventCard
            key={event.id}
            id={event.id}
            title={event.title}
            location={event.location}
            date={event.date}
            maxSeats={event.maxSeats}
            confirmedSeats={event.confirmedSeats}
            status={event.status}
          />
        ))}
      </section>

      {/* AI Council trigger — only visible if canTriggerAICouncil */}
      <div className="mt-4">
        <CouncilTriggerButton
          type="post_event_content"
          eventId="demo-event-1"
          label="Generate post-event content"
        />
      </div>
    </div>
  );
}
