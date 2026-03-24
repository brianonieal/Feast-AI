// @version 0.5.0 - Echo: user state management (mobile)
import { create } from "zustand";
import type { FeastUser, TierPermissions } from "@feast-ai/shared";
import { getPermissions } from "@feast-ai/shared";

interface UserState {
  user: FeastUser | null;
  permissions: TierPermissions | null;
  isLoading: boolean;
  setUser: (user: FeastUser) => void;
  clearUser: () => void;
  setLoading: (v: boolean) => void;
  can: (permission: keyof TierPermissions) => boolean;
}

export const useUserStore = create<UserState>()((set, get) => ({
  user: null,
  permissions: null,
  isLoading: true,
  setUser: (user) =>
    set({ user, permissions: getPermissions(user), isLoading: false }),
  clearUser: () =>
    set({ user: null, permissions: null, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  can: (permission) => get().permissions?.[permission] ?? false,
}));
