// @version 0.9.0 - Lens: admin layout with role guard
// Replaces AppShell entirely for /admin/* routes — no BottomNav, no mobile TopBar
// Client component: needs useUserStore for role check
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/stores/useUserStore";
import { AdminShell } from "@/components/admin/AdminShell";
import { LoadingState } from "@/components/ui/LoadingState";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const can = useUserStore((s) => s.can);
  const isLoading = useUserStore((s) => s.isLoading);

  // Role guard — redirect to /home if not allowed
  useEffect(() => {
    if (!isLoading && !can("canViewHostDashboard")) {
      router.replace("/home");
    }
  }, [isLoading, can, router]);

  if (isLoading) return <LoadingState />;
  if (!can("canViewHostDashboard")) return <LoadingState />;

  return <AdminShell>{children}</AdminShell>;
}
