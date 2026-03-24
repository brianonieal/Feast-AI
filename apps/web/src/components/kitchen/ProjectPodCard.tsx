// @version 0.5.0 - Echo: Project pod card for kitchen page
// Matches mockup Row 2 Col 3 — left-border teal accent card
// "Enter" button is a stub this sprint
"use client";

interface ProjectPodCardProps {
  name: string;
  domain: string;
  memberCount: number;
  lastActivity: string;
}

export function ProjectPodCard({
  name,
  domain,
  memberCount,
  lastActivity,
}: ProjectPodCardProps) {
  return (
    <article className="bg-card border border-border rounded-md p-3 border-l-[3px] border-l-teal flex items-center gap-3">
      {/* Pod details — flex-1 */}
      <div className="flex-1 min-w-0">
        <h3 className="font-display italic font-light text-[15px] text-navy leading-tight truncate">
          {name}
        </h3>

        <div className="flex items-center gap-2 mt-1.5">
          {/* Domain tag */}
          <span className="font-sans text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-sm bg-teal-soft text-teal inline-block">
            {domain}
          </span>
        </div>

        <div className="flex items-center gap-3 mt-1.5">
          <span className="font-sans text-xs text-ink-light">
            {memberCount} members
          </span>
          <span className="font-sans text-xs text-ink-light">
            {lastActivity}
          </span>
        </div>
      </div>

      {/* Enter button — right-aligned */}
      <div className="flex-shrink-0">
        <button
          type="button"
          onClick={() => console.log("[ProjectPod] enter:", name)}
          className="font-sans text-xs font-medium text-white bg-mustard rounded-full px-4 py-1.5 hover:bg-mustard/90 transition-colors"
        >
          Enter
        </button>
      </div>
    </article>
  );
}
