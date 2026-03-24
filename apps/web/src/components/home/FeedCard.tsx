// @version 0.5.0 - Echo: Community feed card for home page
// Matches mockup Row 1 Col 1 — left-border navy accent card
// Display only — no interactive actions in this sprint
"use client";

interface FeedCardProps {
  initials: string;
  name: string;
  timestamp: string;
  body: string;
}

export function FeedCard({ initials, name, timestamp, body }: FeedCardProps) {
  return (
    <article className="bg-card border border-border rounded-md py-3 pr-4 pl-4 border-l-[3px] border-l-navy">
      {/* Author row */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-full bg-mustard-soft flex items-center justify-center flex-shrink-0">
          <span className="font-sans text-[10px] font-bold text-mustard leading-none">
            {initials}
          </span>
        </div>
        <span className="font-sans text-[11px] font-bold text-ink">
          {name}
        </span>
        <span className="font-sans text-[11px] text-ink-light">
          {timestamp}
        </span>
      </div>

      {/* Body — 2 lines max then truncate */}
      <p className="font-sans text-xs text-ink-mid leading-relaxed line-clamp-2">
        {body}
      </p>
    </article>
  );
}
