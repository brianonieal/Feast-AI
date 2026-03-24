// @version 0.5.0 - Echo: top navigation bar
"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

// Dynamically import UserButton so it doesn't crash during SSG without Clerk keys
const UserButton = dynamic(
  () => import("@clerk/nextjs").then((mod) => mod.UserButton),
  {
    ssr: false,
    loading: () => (
      <div className="w-9 h-9 rounded-full bg-mustard-soft flex items-center justify-center">
        <span className="font-sans text-xs font-bold text-mustard">?</span>
      </div>
    ),
  }
);

export function TopBar() {
  return (
    <header className="fixed top-0 left-0 right-0 h-[52px] z-50 bg-[var(--bg-surface)] flex items-center justify-between px-4">
      <span className="font-display italic font-light text-xl text-navy">
        The Feast
      </span>
      <Link href="/profile" className="flex items-center">
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: "w-9 h-9",
            },
          }}
        />
      </Link>
    </header>
  );
}
