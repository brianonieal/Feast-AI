// @version 0.5.0 - Echo: Resource card for library/pantry page
// Matches mockup Row 1 Col 4 — left-border navy accent card
// Entire card is clickable (stub href="#" this sprint)
"use client";

import { ArrowUpRight } from "lucide-react";

interface ResourceCardProps {
  domain: string;
  title: string;
  description: string;
  href?: string;
}

export function ResourceCard({
  domain,
  title,
  description,
  href = "#",
}: ResourceCardProps) {
  return (
    <a
      href={href}
      className="block bg-card border border-border rounded-md p-3 border-l-[3px] border-l-navy group hover:border-navy/30 transition-colors relative"
    >
      {/* External link arrow — top-right */}
      <ArrowUpRight
        size={14}
        className="absolute top-3 right-3 text-ink-light group-hover:text-navy transition-colors"
      />

      {/* Domain badge */}
      <span className="font-sans text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-sm bg-teal-soft text-teal inline-block">
        {domain}
      </span>

      {/* Title */}
      <h3 className="font-display italic font-light text-[15px] text-navy leading-tight mt-2 pr-5">
        {title}
      </h3>

      {/* Description — 2 lines max */}
      <p className="font-sans text-xs text-ink-mid leading-relaxed mt-1 line-clamp-2">
        {description}
      </p>
    </a>
  );
}
