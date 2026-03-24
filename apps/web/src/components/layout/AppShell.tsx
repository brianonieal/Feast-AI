// @version 0.5.0 - Echo: main app shell layout
"use client";

import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-page)]">
      <TopBar />
      <main className="flex-1 pt-[52px] pb-[68px] overflow-y-auto px-4">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
