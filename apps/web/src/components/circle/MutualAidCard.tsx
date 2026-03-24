// @version 0.5.0 - Echo: Mutual aid card
// Matches mockup Row 1 Col 3 — left-border varies by type
// Badge: OFFERING (teal) or SEEKING (coral)
"use client";

interface MutualAidCardProps {
  type: "offering" | "seeking";
  memberName: string;
  description: string;
}

const TYPE_STYLES = {
  offering: {
    border: "border-l-teal",
    badgeBg: "bg-teal-soft",
    badgeText: "text-teal",
    label: "OFFERING",
  },
  seeking: {
    border: "border-l-coral",
    badgeBg: "bg-coral-soft",
    badgeText: "text-coral",
    label: "SEEKING",
  },
} as const;

export function MutualAidCard({
  type,
  memberName,
  description,
}: MutualAidCardProps) {
  const styles = TYPE_STYLES[type];

  return (
    <article
      className={`bg-card border border-border rounded-md p-3 border-l-[3px] ${styles.border}`}
    >
      {/* Badge + member name row */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`font-sans text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-sm ${styles.badgeBg} ${styles.badgeText}`}
        >
          {styles.label}
        </span>
        <span className="font-sans text-[11px] text-ink-light">
          {memberName}
        </span>
      </div>

      {/* Description */}
      <p className="font-display italic font-light text-[15px] text-navy leading-tight">
        {description}
      </p>

      {/* Connect ghost button */}
      <div className="flex justify-end mt-3">
        <button
          type="button"
          onClick={() =>
            console.log("[MutualAidCard] connect:", memberName, type)
          }
          className="font-sans text-[11px] font-medium text-ink-mid border border-border rounded-full px-3 py-1 hover:border-ink-light transition-colors"
        >
          Connect
        </button>
      </div>
    </article>
  );
}
