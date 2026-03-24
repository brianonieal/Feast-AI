// @version 0.5.0 - Echo: Reflection circle card
// Matches mockup Row 1 Col 3 — left-border teal accent card
// Stacked avatar initials with -ml-2 overlap
"use client";

interface ReflectionCircleCardProps {
  themeName: string;
  memberCount: number;
  nextSession: string;
  memberInitials: string[];
}

export function ReflectionCircleCard({
  themeName,
  memberCount,
  nextSession,
  memberInitials,
}: ReflectionCircleCardProps) {
  return (
    <article className="bg-card border border-border rounded-md p-3 border-l-[3px] border-l-teal">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display italic font-light text-[15px] text-navy leading-tight truncate">
            {themeName}
          </h3>
          <p className="font-sans text-xs text-ink-mid mt-1">
            Next: {nextSession}
          </p>
          <p className="font-sans text-xs text-ink-light mt-0.5">
            {memberCount} members
          </p>
        </div>

        {/* Stacked avatar initials */}
        <div className="flex items-center flex-shrink-0">
          {memberInitials.slice(0, 4).map((initials, i) => (
            <div
              key={`${initials}-${i}`}
              className={`w-7 h-7 rounded-full bg-mustard-soft flex items-center justify-center border-2 border-card ${
                i > 0 ? "-ml-2" : ""
              }`}
            >
              <span className="font-sans text-[9px] font-bold text-mustard leading-none">
                {initials}
              </span>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
