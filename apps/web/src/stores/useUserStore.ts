// @version 0.5.0 - Echo: user state management
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FeastUser, TierPermissions } from "@feast-ai/shared/types/user";
import { getPermissions } from "@feast-ai/shared/types/user";

interface UserState {
  user: FeastUser | null;
  permissions: TierPermissions | null;
  isLoading: boolean;
  setUser: (user: FeastUser) => void;
  clearUser: () => void;
  setLoading: (v: boolean) => void;
  can: (permission: keyof TierPermissions) => boolean;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      permissions: null,
      isLoading: true,
      setUser: (user) =>
        set({ user, permissions: getPermissions(user), isLoading: false }),
      clearUser: () =>
        set({ user: null, permissions: null, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      can: (permission) => get().permissions?.[permission] ?? false,
    }),
    {
      name: "feast-user",
      partialize: (s) => ({ user: s.user }),
    }
  )
);
