// @version 0.9.0 - Lens: visual spend bar for @GUARDIAN cost monitoring
"use client";

type SpendStatus = "normal" | "warning" | "critical" | "downgraded";

const BAR_COLORS: Record<SpendStatus, string> = {
  normal: "bg-teal",
  warning: "bg-mustard",
  critical: "bg-coral",
  downgraded: "bg-coral",
};

interface SpendMeterProps {
  spent: number;
  limit: number;
  status: SpendStatus;
}

export function SpendMeter({ spent, limit, status }: SpendMeterProps) {
  const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      {/* Label row */}
      <div className="flex items-center justify-between mb-2">
        <p className="font-sans text-[10px] font-medium tracking-[0.09em] uppercase text-ink-light">
          Daily Spend
        </p>
        <div className="flex items-center gap-2">
          {status === "downgraded" && (
            <span className="font-sans text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-coral-soft text-coral">
              Downgraded
            </span>
          )}
          <span className="font-sans text-xs text-ink-mid">
            {pct.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Amount */}
      <p className="font-display italic font-light text-xl text-navy mb-2">
        ${spent.toFixed(4)}{" "}
        <span className="font-sans text-sm text-ink-light not-italic">
          / ${limit.toFixed(2)}
        </span>
      </p>

      {/* Progress bar */}
      <div className="w-full h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${BAR_COLORS[status]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
