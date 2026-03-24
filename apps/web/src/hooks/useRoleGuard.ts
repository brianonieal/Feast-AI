// @version 0.5.0 - Echo: role-based access guard hook
"use client";

import { useUserStore } from "@/stores/useUserStore";

// Use this in any component that conditionally renders based on role
// Example: {can('canHostEvents') && <HostOnlyButton />}
export function useRoleGuard() {
  const can = useUserStore((s) => s.can);
  const user = useUserStore((s) => s.user);
  const isLoading = useUserStore((s) => s.isLoading);
  return { can, user, isLoading };
}
