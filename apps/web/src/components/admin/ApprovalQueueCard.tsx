// @version 0.9.0 - Lens: content approval queue card
// Left-border accent color varies by channel
"use client";

type ContentChannel =
  | "WEBSITE_ARTICLE"
  | "INSTAGRAM"
  | "CIRCLE_RECAP"
  | "NEWSLETTER"
  | "EMAIL_CAMPAIGN";

const CHANNEL_ACCENT: Record<string, string> = {
  WEBSITE_ARTICLE: "border-l-navy",
  INSTAGRAM: "border-l-mustard",
  CIRCLE_RECAP: "border-l-teal",
  NEWSLETTER: "border-l-navy",
  EMAIL_CAMPAIGN: "border-l-teal",
};

const CHANNEL_BADGE: Record<string, { bg: string; text: string }> = {
  WEBSITE_ARTICLE: { bg: "bg-navy", text: "text-white" },
  INSTAGRAM: { bg: "bg-mustard-soft", text: "text-mustard" },
  CIRCLE_RECAP: { bg: "bg-teal-soft", text: "text-teal" },
  NEWSLETTER: { bg: "bg-navy", text: "text-white" },
  EMAIL_CAMPAIGN: { bg: "bg-teal-soft", text: "text-teal" },
};

interface ApprovalQueueCardProps {
  id: string;
  eventName: string;
  eventDate: string;
  channel: string;
  generatedTitle?: string | null;
  generatedBody: string;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onReview?: (id: string) => void;
}

export function ApprovalQueueCard({
  id,
  eventName,
  eventDate,
  channel,
  generatedTitle,
  generatedBody,
  onApprove,
  onReject,
  onReview,
}: ApprovalQueueCardProps) {
  const accent = CHANNEL_ACCENT[channel] ?? "border-l-border";
  const badge = CHANNEL_BADGE[channel] ?? {
    bg: "bg-[var(--bg-surface)]",
    text: "text-ink-light",
  };
  const preview =
    generatedBody.length > 150
      ? generatedBody.slice(0, 150) + "…"
      : generatedBody;

  const formattedDate = new Date(eventDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div
      className={`bg-card border border-border rounded-md p-4 border-l-[3px] ${accent}`}
    >
      {/* Header: event name + date + channel badge */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="font-display italic font-light text-[15px] text-navy">
            {eventName}
          </p>
          <p className="font-sans text-xs text-ink-light">{formattedDate}</p>
        </div>
        <span
          className={`font-sans text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm ${badge.bg} ${badge.text}`}
        >
          {channel.replace(/_/g, " ")}
        </span>
      </div>

      {/* Title if present */}
      {generatedTitle && (
        <p className="font-sans text-xs font-medium text-ink mb-1">
          {generatedTitle}
        </p>
      )}

      {/* Body preview */}
      <p className="font-sans text-xs text-ink-mid leading-relaxed mb-3">
        {preview}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {onReview && (
          <button
            type="button"
            onClick={() => onReview(id)}
            className="font-sans text-xs font-medium text-mustard border border-mustard/30 rounded-full px-3 py-1 hover:bg-mustard-soft transition-colors"
          >
            Review
          </button>
        )}
        <button
          type="button"
          onClick={() => onApprove(id)}
          className="font-sans text-xs font-medium text-white bg-teal rounded-full px-3 py-1 hover:bg-teal/90 transition-colors"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => onReject(id)}
          className="font-sans text-xs font-medium text-coral border border-coral rounded-full px-3 py-1 hover:bg-coral/5 transition-colors"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
