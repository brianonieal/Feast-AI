// @version 0.5.0 - Echo: Kitchen page — role-guarded, Tier 2+
// Matches mockup Row 2 Col 3 — project pods list
// Hard role guard: redirect to /home if !canAccessKitchen
// Static seed data — will be replaced by API calls in later version
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/stores/useUserStore";
import { LoadingState } from "@/components/ui/LoadingState";
import { ProjectPodCard } from "@/components/kitchen/ProjectPodCard";

// Seed pods — clearly labeled as placeholders
const SEED_PODS = [
  {
    id: "p1",
    name: "100 Dinners Campaign",
    domain: "Events",
    memberCount: 12,
    lastActivity: "Active now",
  },
  {
    id: "p2",
    name: "Content Studio",
    domain: "Creative Economy",
    memberCount: 6,
    lastActivity: "Updated 2h ago",
  },
  {
    id: "p3",
    name: "Regional Expansion",
    domain: "Governance",
    memberCount: 4,
    lastActivity: "Updated yesterday",
  },
  {
    id: "p4",
    name: "Cooperative Architecture",
    domain: "Community Finance",
    memberCount: 8,
    lastActivity: "Active now",
  },
  {
    id: "p5",
    name: "Host Training Program",
    domain: "Land & Agriculture",
    memberCount: 5,
    lastActivity: "Updated 3d ago",
  },
];

export default function KitchenPage() {
  const router = useRouter();
  const can = useUserStore((s) => s.can);
  const isLoading = useUserStore((s) => s.isLoading);

  // Role guard — redirect to /home if not allowed
  useEffect(() => {
    if (!isLoading && !can("canAccessKitchen")) {
      router.replace("/home");
    }
  }, [isLoading, can, router]);

  if (isLoading) return <LoadingState />;
  if (!can("canAccessKitchen")) return <LoadingState />;

  return (
    <div className="py-6 space-y-5">
      {/* Tier badge */}
      <span className="font-sans text-[9px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-sm bg-teal-soft text-teal inline-block">
        The Kitchen · Tier 2
      </span>

      {/* Header */}
      <div>
        <p className="font-sans text-[10px] font-medium tracking-[0.09em] uppercase text-mustard mb-1">
          The Kitchen
        </p>
        <h1 className="font-display italic font-light text-2xl text-navy leading-tight">
          Project Pods
        </h1>
        <p className="font-sans text-[13px] text-ink-mid mt-1">
          Co-creators, domain stewards, and cooperative architects.
        </p>
      </div>

      {/* Pod card list */}
      <section className="space-y-3">
        {SEED_PODS.map((pod) => (
          <ProjectPodCard
            key={pod.id}
            name={pod.name}
            domain={pod.domain}
            memberCount={pod.memberCount}
            lastActivity={pod.lastActivity}
          />
        ))}
      </section>
    </div>
  );
}
