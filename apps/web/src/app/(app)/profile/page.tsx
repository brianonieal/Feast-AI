// @version 0.5.0 - Echo: Profile page — full page route at /profile
// Matches mockup Row 2 Col 2 — navy header band + stats + settings
// Client component: needs useUserStore, useThemeStore, useClerk
"use client";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight, Sun, Moon, ArrowUpRight } from "lucide-react";
import { useUserStore } from "@/stores/useUserStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { LoadingState } from "@/components/ui/LoadingState";

const SignOutButton = dynamic(
  () => import("@/components/auth/SignOutButton").then((mod) => mod.SignOutButton),
  { ssr: false }
);

export default function ProfilePage() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const can = useUserStore((s) => s.can);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);

  if (!user) return <LoadingState />;

  // Derive initials from name
  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const tierLabel =
    user.tier === "founding_table"
      ? "Founding Table"
      : user.tier === "kitchen"
        ? "Kitchen"
        : "Commons";

  const roleLabel =
    user.role.charAt(0).toUpperCase() + user.role.slice(1);

  return (
    <div className="-mx-4 -mt-[52px]">
      {/* ─── SECTION 1: Header band ─── */}
      <section className="bg-navy py-8 px-4 text-center relative">
        {/* Back arrow */}
        <button
          type="button"
          onClick={() => router.back()}
          className="absolute top-4 left-4 text-white/60 hover:text-white/90 transition-colors"
        >
          <ChevronLeft size={22} />
        </button>

        {/* Avatar */}
        <div className="w-[72px] h-[72px] rounded-full bg-mustard-soft flex items-center justify-center mx-auto mb-3">
          <span className="font-display italic text-2xl text-mustard leading-none">
            {initials}
          </span>
        </div>

        {/* Name */}
        <p className="text-white font-medium text-sm">{user.name}</p>

        {/* Tier + Role badges */}
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-mustard-soft/20 text-[#F0D490] border border-mustard/30">
            {tierLabel}
          </span>
          <span className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/10 text-white/80 border border-white/20">
            {roleLabel}
          </span>
        </div>
      </section>

      {/* ─── SECTION 2: Stats row ─── */}
      <section className="flex gap-2 px-4 -mt-4">
        <div className="flex-1 bg-card border border-border rounded-lg p-3 text-center shadow-card">
          <p className="font-display italic text-lg text-navy">
            {user.dinnerCount}
          </p>
          <p className="font-sans text-[10px] text-ink-light mt-0.5">
            Dinners
          </p>
        </div>
        <div className="flex-1 bg-card border border-border rounded-lg p-3 text-center shadow-card">
          <p className="font-display italic text-lg text-teal">6</p>
          <p className="font-sans text-[10px] text-ink-light mt-0.5">
            Circle
          </p>
        </div>
        <div className="flex-1 bg-card border border-border rounded-lg p-3 text-center shadow-card">
          <p className="font-display italic text-lg text-mustard">
            {user.city || "Brooklyn"}
          </p>
          <p className="font-sans text-[10px] text-ink-light mt-0.5">Hub</p>
        </div>
      </section>

      {/* ─── SECTION 3: Settings list ─── */}
      <section className="px-4 mt-6">
        <p className="font-sans text-[10px] font-medium tracking-[0.09em] uppercase text-ink-light mb-2">
          Settings
        </p>

        {/* Theme toggle row */}
        <button
          type="button"
          onClick={toggleTheme}
          className="w-full bg-card border border-border rounded-lg px-4 py-3 mb-2 flex items-center"
        >
          <span className="font-sans text-[13px] font-medium text-ink flex-1 text-left">
            Theme
          </span>
          <span className="font-sans text-xs text-ink-light mr-2">
            {theme === "light" ? "Light" : "Dark"}
          </span>
          {theme === "light" ? (
            <Sun size={14} className="text-ink-light" />
          ) : (
            <Moon size={14} className="text-ink-light" />
          )}
        </button>

        {/* Notifications */}
        <div className="bg-card border border-border rounded-lg px-4 py-3 mb-2 flex items-center">
          <span className="font-sans text-[13px] font-medium text-ink flex-1">
            Notifications
          </span>
          <span className="font-sans text-xs text-ink-light mr-2">On</span>
          <ChevronRight size={14} className="text-ink-light" />
        </div>

        {/* Privacy */}
        <div className="bg-card border border-border rounded-lg px-4 py-3 mb-2 flex items-center">
          <span className="font-sans text-[13px] font-medium text-ink flex-1">
            Privacy
          </span>
          <span className="font-sans text-xs text-ink-light mr-2">
            Members only
          </span>
          <ChevronRight size={14} className="text-ink-light" />
        </div>

        {/* Channel */}
        <div className="bg-card border border-border rounded-lg px-4 py-3 mb-2 flex items-center">
          <span className="font-sans text-[13px] font-medium text-ink flex-1">
            Channel
          </span>
          <span className="font-sans text-xs text-ink-light mr-2">
            Circle
          </span>
          <ChevronRight size={14} className="text-ink-light" />
        </div>
      </section>

      {/* ─── SECTION 4: Host analytics (conditional) ─── */}
      {can("canViewHostDashboard") && (
        <section className="px-4 mt-4">
          <p className="font-sans text-[10px] font-medium tracking-[0.09em] uppercase text-ink-light mb-2">
            Host
          </p>
          <button
            type="button"
            onClick={() => console.log("[Profile] My Analytics")}
            className="w-full bg-mustard-soft border border-mustard/20 rounded-lg px-4 py-3 flex items-center"
          >
            <span className="font-display italic font-light text-[15px] text-navy flex-1 text-left">
              My Analytics
            </span>
            <ArrowUpRight size={14} className="text-mustard" />
          </button>
        </section>
      )}

      {/* ─── SECTION 5: Sign out ─── */}
      <section className="px-4 mt-6 pb-8">
        <SignOutButton />
      </section>
    </div>
  );
}
