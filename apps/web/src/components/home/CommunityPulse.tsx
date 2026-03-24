// @version 0.5.0 - Echo: Community pulse stat strip for home page
// Matches mockup Row 1 Col 1 — 3 equal stat cards in a row
// Static display only — will be API-driven in a later version
"use client";

interface StatCardProps {
  value: string;
  label: string;
  color: "navy" | "teal" | "mustard";
}

const COLOR_MAP: Record<StatCardProps["color"], string> = {
  navy: "text-navy",
  teal: "text-teal",
  mustard: "text-mustard",
};

function StatCard({ value, label, color }: StatCardProps) {
  return (
    <div className="flex-1 bg-card border border-border rounded-md p-3 text-center">
      <p className={`font-display italic text-lg ${COLOR_MAP[color]}`}>
        {value}
      </p>
      <p className="font-sans text-[10px] text-ink-light mt-0.5">{label}</p>
    </div>
  );
}

interface CommunityPulseProps {
  memberCount: string;
  dinnerCount: string;
  attendanceRate: string;
}

export function CommunityPulse({
  memberCount,
  dinnerCount,
  attendanceRate,
}: CommunityPulseProps) {
  return (
    <section className="flex gap-2">
      <StatCard value={memberCount} label="Members" color="navy" />
      <StatCard value={dinnerCount} label="Dinners" color="teal" />
      <StatCard value={attendanceRate} label="Attendance" color="mustard" />
    </section>
  );
}
