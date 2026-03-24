// @version 0.5.0 - Echo: Circle page — Reflection Circles + Mutual Aid
// Matches mockup Row 1 Col 3 — two sections separated by divider
// Static seed data — will be replaced by API calls in later version
"use client";

import { ReflectionCircleCard } from "@/components/circle/ReflectionCircleCard";
import { MutualAidCard } from "@/components/circle/MutualAidCard";
import { useUserStore } from "@/stores/useUserStore";

// Seed data — clearly labeled as placeholders
const SEED_CIRCLES = [
  {
    id: "rc1",
    themeName: "Gratitude & Belonging",
    memberCount: 6,
    nextSession: "Mar 28",
    memberInitials: ["BN", "MJ", "KT", "AL"],
  },
  {
    id: "rc2",
    themeName: "Creative Nourishment",
    memberCount: 5,
    nextSession: "Apr 2",
    memberInitials: ["DP", "SE", "RW"],
  },
];

const SEED_AID = [
  {
    id: "ma1",
    type: "offering" as const,
    memberName: "Diego P.",
    description: "Design feedback",
  },
  {
    id: "ma2",
    type: "seeking" as const,
    memberName: "Sarah E.",
    description: "Help quiet space June",
  },
  {
    id: "ma3",
    type: "offering" as const,
    memberName: "Kenji T.",
    description: "Meditation teaching",
  },
];

export default function CirclePage() {
  const can = useUserStore((s) => s.can);

  return (
    <div className="py-6">
      {/* ─── SECTION 1: Reflection Circles ─── */}
      <section>
        <p className="font-sans text-[10px] font-medium tracking-[0.09em] uppercase text-mustard mb-1">
          Reflection Circles
        </p>
        <h2 className="font-display italic font-light text-2xl text-navy leading-tight mb-4">
          Your Circle
        </h2>

        <div className="space-y-3">
          {SEED_CIRCLES.map((circle) => (
            <ReflectionCircleCard
              key={circle.id}
              themeName={circle.themeName}
              memberCount={circle.memberCount}
              nextSession={circle.nextSession}
              memberInitials={circle.memberInitials}
            />
          ))}
        </div>

        {/* CTA — role-guarded */}
        <div className="mt-4">
          {can("canFacilitateCircles") ? (
            <button
              type="button"
              onClick={() => console.log("[Circle] facilitate CTA")}
              className="font-sans text-xs font-medium text-white bg-teal rounded-full px-5 py-2 hover:bg-teal/90 transition-colors"
            >
              Facilitate
            </button>
          ) : (
            <button
              type="button"
              onClick={() => console.log("[Circle] join CTA")}
              className="font-sans text-xs font-medium text-white bg-mustard rounded-full px-5 py-2 hover:bg-mustard/90 transition-colors"
            >
              Join a Circle
            </button>
          )}
        </div>
      </section>

      {/* ─── Divider ─── */}
      <div className="border-t border-border my-6" />

      {/* ─── SECTION 2: Mutual Aid ─── */}
      <section>
        <p className="font-sans text-[10px] font-medium tracking-[0.09em] uppercase text-mustard mb-1">
          Mutual Aid
        </p>
        <h2 className="font-display italic font-light text-2xl text-navy leading-tight mb-4">
          Give &amp; Receive
        </h2>

        <div className="space-y-3">
          {SEED_AID.map((aid) => (
            <MutualAidCard
              key={aid.id}
              type={aid.type}
              memberName={aid.memberName}
              description={aid.description}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
