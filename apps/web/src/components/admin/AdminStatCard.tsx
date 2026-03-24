// @version 0.9.0 - Lens: admin stat card (number + label + optional delta)
"use client";

interface AdminStatCardProps {
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  color?: "navy" | "teal" | "mustard" | "coral";
}

const COLOR_MAP: Record<string, string> = {
  navy: "text-navy",
  teal: "text-teal",
  mustard: "text-mustard",
  coral: "text-coral",
};

export function AdminStatCard({
  label,
  value,
  delta,
  deltaLabel,
  color = "navy",
}: AdminStatCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <p className="font-sans text-[10px] font-medium tracking-[0.09em] uppercase text-ink-light mb-1">
        {label}
      </p>
      <p
        className={`font-display italic font-light text-2xl leading-none ${COLOR_MAP[color] ?? "text-navy"}`}
      >
        {value}
      </p>
      {delta !== undefined && (
        <p
          className={`font-sans text-xs mt-1 ${delta > 0 ? "text-teal" : "text-coral"}`}
        >
          {delta > 0 ? "+" : ""}
          {delta} {deltaLabel}
        </p>
      )}
    </div>
  );
}
