// @version 0.5.0 - Echo: RSVP button for event cards
// Renders correct variant per event status
// Role guard: hosts see "Manage" instead of RSVP
// onRSVP is a no-op stub this sprint
"use client";

import type { FeastEventStatus } from "@feast-ai/shared";
import { useUserStore } from "@/stores/useUserStore";

interface RSVPButtonProps {
  eventId: string;
  status: FeastEventStatus;
  onRSVP?: (eventId: string) => void;
}

export function RSVPButton({ eventId, status, onRSVP }: RSVPButtonProps) {
  const can = useUserStore((s) => s.can);

  const handleClick = () => {
    // No-op stub this sprint — will connect to API later
    console.log("[RSVPButton] action:", eventId, status);
    onRSVP?.(eventId);
  };

  // Role guard: hosts see "Manage" instead
  if (can("canHostEvents")) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="font-sans text-[11px] font-medium text-navy border border-navy rounded-full px-3 py-1 hover:bg-navy/5 transition-colors"
      >
        Manage
      </button>
    );
  }

  if (status === "open") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="font-sans text-[11px] font-medium text-white bg-mustard rounded-full px-4 py-1 hover:bg-mustard/90 transition-colors"
      >
        RSVP
      </button>
    );
  }

  if (status === "confirmed") {
    return (
      <span className="font-sans text-[11px] font-medium text-teal border border-teal rounded-full px-3 py-1">
        Confirmed ✓
      </span>
    );
  }

  // full / draft / completed — disabled ghost
  return (
    <span className="font-sans text-[11px] font-medium text-ink-light border border-border rounded-full px-3 py-1 opacity-60">
      Full
    </span>
  );
}
