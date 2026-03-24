// @version 0.9.0 - Lens: admin sidebar navigation
// Active state via usePathname() — same pattern as BottomNav
// SYSTEM section only renders for founding_table tier
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CheckSquare,
  Users,
  Cpu,
  Plug,
  ChevronLeft,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useUserStore } from "@/stores/useUserStore";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const MANAGE_NAV: NavItem[] = [
  { label: "Events", href: "/admin/events", icon: CalendarDays },
  { label: "Content Queue", href: "/admin/queue", icon: CheckSquare },
  { label: "Members", href: "/admin/members", icon: Users },
];

const SYSTEM_NAV: NavItem[] = [
  { label: "Agents", href: "/admin/system/agents", icon: Cpu },
  { label: "Integrations", href: "/admin/system/integrations", icon: Plug },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const user = useUserStore((s) => s.user);
  const isFoundingTable = user?.tier === "founding_table";

  // Derive initials
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  return (
    <aside className="w-60 flex-shrink-0 bg-[var(--bg-surface)] border-r border-border min-h-screen flex flex-col">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <span className="font-display italic font-light text-lg text-navy">
          The Feast
        </span>
      </div>
      <div className="border-b border-border mb-3" />

      {/* MANAGE section */}
      <NavSection label="Manage" items={MANAGE_NAV} pathname={pathname} />

      {/* SYSTEM section — founding_table only */}
      {isFoundingTable && (
        <NavSection label="System" items={SYSTEM_NAV} pathname={pathname} />
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom: user + back link */}
      <div className="border-t border-border px-4 py-4 space-y-3">
        {/* User display */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-mustard-soft flex items-center justify-center flex-shrink-0">
            <span className="font-sans text-[10px] font-bold text-mustard">
              {initials}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-sans text-xs font-medium text-ink truncate">
              {user?.name ?? "Admin"}
            </p>
            <span className="font-sans text-[9px] uppercase tracking-wider text-ink-light">
              {user?.tier === "founding_table"
                ? "Founding Table"
                : user?.tier === "kitchen"
                  ? "Kitchen"
                  : "Commons"}
            </span>
          </div>
        </div>

        {/* Back to app */}
        <Link
          href="/home"
          className="flex items-center gap-1.5 font-sans text-xs text-ink-light hover:text-ink transition-colors"
        >
          <ChevronLeft size={14} />
          Back to app
        </Link>
      </div>
    </aside>
  );
}

function NavSection({
  label,
  items,
  pathname,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
}) {
  return (
    <div className="mb-2">
      <p className="font-sans text-[10px] font-medium tracking-[0.09em] uppercase text-mustard px-5 mb-1">
        {label}
      </p>
      {items.map((item) => {
        const isActive = pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm mx-2 transition-colors ${
              isActive
                ? "border-l-2 border-mustard bg-mustard-soft text-mustard font-medium rounded-r-md rounded-l-none"
                : "text-ink-mid rounded-md hover:bg-[var(--bg-page)]"
            }`}
          >
            <Icon size={16} />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
