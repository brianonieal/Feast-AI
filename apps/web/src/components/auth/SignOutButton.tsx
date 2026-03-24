// @version 0.5.0 - Echo: Sign out button using Clerk
// Isolated component to avoid importing useClerk at page level during SSG
"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const { signOut } = useClerk();
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => signOut(() => router.push("/sign-in"))}
      className="w-full border border-coral text-coral rounded-full py-2.5 font-sans font-medium text-sm hover:bg-coral/5 transition-colors"
    >
      Sign out
    </button>
  );
}
