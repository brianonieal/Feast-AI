// @version 0.5.0 - Echo: Library / The Pantry page
// Matches mockup Row 1 Col 4 — domain filter pills + resource cards
// Static seed data — will be replaced by API calls in later version
"use client";

import { useState } from "react";
import { PANTRY_DOMAINS } from "@feast-ai/shared";
import { ResourceCard } from "@/components/library/ResourceCard";

// Seed resources — one per domain, clearly labeled as placeholders
const SEED_RESOURCES = [
  {
    id: "r1",
    domain: "Personal Growth",
    title: "On Abundance & the Scarcity Myth",
    description:
      "Exploring how abundance mindsets reshape community relationships and challenge dominant economic narratives.",
  },
  {
    id: "r2",
    domain: "Land & Agriculture",
    title: "Regenerative Farming Primer",
    description:
      "A practical introduction to soil health, cover cropping, and community-supported agriculture models.",
  },
  {
    id: "r3",
    domain: "Community Finance",
    title: "Cooperative Ownership Models",
    description:
      "How worker-owned cooperatives and community land trusts build shared wealth across generations.",
  },
  {
    id: "r4",
    domain: "Creative Economy",
    title: "The Artist as Community Anchor",
    description:
      "Case studies of artists driving neighborhood revitalization through creative placemaking.",
  },
  {
    id: "r5",
    domain: "Governance",
    title: "Community Decision-Making Frameworks",
    description:
      "Consent-based, sociocratic, and consensus models for collective governance at scale.",
  },
  {
    id: "r6",
    domain: "Water",
    title: "Urban Water Commons",
    description:
      "How cities are reclaiming water infrastructure as shared community resources.",
  },
  {
    id: "r7",
    domain: "Decentralized Technology",
    title: "Web3 for Community Builders",
    description:
      "Practical applications of decentralized tools for mutual aid, governance, and collective ownership.",
  },
];

export default function LibraryPage() {
  const [selectedDomain, setSelectedDomain] = useState<string>(
    PANTRY_DOMAINS[0]
  );

  return (
    <div className="py-6 space-y-5">
      {/* Header */}
      <div>
        <p className="font-sans text-[10px] font-medium tracking-[0.09em] uppercase text-mustard mb-1">
          The Pantry
        </p>
        <h1 className="font-display italic font-light text-2xl text-navy leading-tight">
          Curated Resources
        </h1>
      </div>

      {/* Domain filter pills — flex-wrap, NOT horizontal scroll */}
      <div className="flex flex-wrap gap-2">
        {PANTRY_DOMAINS.map((domain) => (
          <button
            key={domain}
            type="button"
            onClick={() => setSelectedDomain(domain)}
            className={`rounded-full px-4 py-1 text-xs font-sans font-medium transition-colors ${
              selectedDomain === domain
                ? "bg-teal text-white"
                : "bg-[var(--bg-surface)] border border-border text-ink-mid hover:border-teal/40"
            }`}
          >
            {domain}
          </button>
        ))}
      </div>

      {/* Resource card list */}
      <section className="space-y-3">
        {SEED_RESOURCES.map((resource) => (
          <ResourceCard
            key={resource.id}
            domain={resource.domain}
            title={resource.title}
            description={resource.description}
          />
        ))}
      </section>
    </div>
  );
}
