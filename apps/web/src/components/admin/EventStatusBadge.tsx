// @version 0.9.0 - Lens: event status pill badge
"use client";

type EventStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "MARKETED"
  | "LIVE"
  | "COMPLETED"
  | "CANCELLED";

const STATUS_STYLES: Record<
  EventStatus,
  { bg: string; text: string; label: string }
> = {
  DRAFT: { bg: "bg-[var(--bg-surface)]", text: "text-ink-light", label: "Draft" },
  SCHEDULED: { bg: "bg-mustard-soft", text: "text-mustard", label: "Scheduled" },
  MARKETED: { bg: "bg-teal-soft", text: "text-teal", label: "Marketed" },
  LIVE: { bg: "bg-teal", text: "text-white", label: "Live" },
  COMPLETED: { bg: "bg-navy", text: "text-white", label: "Completed" },
  CANCELLED: { bg: "bg-coral-soft", text: "text-coral", label: "Cancelled" },
};

interface EventStatusBadgeProps {
  status: EventStatus;
}

export function EventStatusBadge({ status }: EventStatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT;
  return (
    <span
      className={`inline-block font-sans text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${style.bg} ${style.text}`}
    >
      {style.label}
    </span>
  );
}
