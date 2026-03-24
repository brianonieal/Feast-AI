// @version 0.5.0 - Echo: bottom tab navigation
// Uses usePathname() for active tab detection — not manual state.
// Routes come from TABS constant — no hardcoded strings here.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  UtensilsCrossed,
  Users,
  CalendarDays,
  BookOpen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { TABS } from "@feast-ai/shared";

const ICON_MAP: Record<string, LucideIcon> = {
  UtensilsCrossed,
  Users,
  CalendarDays,
  BookOpen,
};

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[68px] z-50 bg-[var(--bg-surface)] border-t border-border flex items-center justify-around px-2">
      {TABS.map((tab) => {
        const isActive = pathname.startsWith(tab.route);
        const Icon = ICON_MAP[tab.icon] as LucideIcon;

        return (
          <Link
            key={tab.key}
            href={tab.route}
            className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 transition-colors ${
              isActive ? "text-mustard" : "text-ink-light"
            }`}
          >
            <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
            {isActive && (
              <span className="font-sans text-[10px] font-medium tracking-wide">
                {tab.label}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
