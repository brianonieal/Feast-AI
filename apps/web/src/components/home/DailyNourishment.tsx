// @version 0.5.0 - Echo: Daily Nourishment card for home feed
// Matches mockup Row 1 Col 1 — left-border mustard accent card
// Static display only in this sprint — no API calls
"use client";

interface DailyNourishmentProps {
  heading: string;
  subtext: string;
}

export function DailyNourishment({ heading, subtext }: DailyNourishmentProps) {
  return (
    <section>
      <p className="font-sans text-[10px] font-medium tracking-[0.09em] uppercase text-mustard mb-2">
        Today&apos;s Nourishment
      </p>
      <div className="bg-card border border-border rounded-md py-3 pr-4 pl-4 border-l-[3px] border-l-mustard">
        <h2 className="font-display italic font-light text-xl text-navy leading-tight">
          {heading}
        </h2>
        <p className="font-sans text-sm text-ink-mid mt-1 leading-relaxed">
          {subtext}
        </p>
        <div className="flex items-center gap-2 mt-3">
          <span className="w-2 h-2 rounded-full bg-teal inline-block" />
          <button
            type="button"
            className="font-sans text-xs font-medium text-teal hover:text-teal/80 transition-colors"
          >
            Reflect
          </button>
        </div>
      </div>
    </section>
  );
}
