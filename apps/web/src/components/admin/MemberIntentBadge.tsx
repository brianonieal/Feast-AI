// @version 0.9.0 - Lens: member intent classification pill badge
"use client";

type IntentType = "ATTEND" | "HOST" | "FACILITATE" | "DIY" | "NEWSLETTER";

const INTENT_STYLES: Record<
  IntentType,
  { bg: string; text: string; label: string }
> = {
  ATTEND: { bg: "bg-teal-soft", text: "text-teal", label: "Attend" },
  HOST: { bg: "bg-mustard-soft", text: "text-mustard", label: "Host" },
  FACILITATE: { bg: "bg-navy", text: "text-white", label: "Facilitate" },
  DIY: { bg: "bg-[var(--bg-surface)]", text: "text-ink-mid", label: "DIY" },
  NEWSLETTER: {
    bg: "bg-[var(--bg-surface)]",
    text: "text-ink-mid",
    label: "Newsletter",
  },
};

interface MemberIntentBadgeProps {
  intent: string;
}

export function MemberIntentBadge({ intent }: MemberIntentBadgeProps) {
  const style =
    INTENT_STYLES[intent as IntentType] ?? INTENT_STYLES.NEWSLETTER;
  return (
    <span
      className={`inline-block font-sans text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${style.bg} ${style.text}`}
    >
      {style.label}
    </span>
  );
}
