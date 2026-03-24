// @version 0.5.0 - Echo: theme state management
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  set: (t: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "light",
      toggle: () =>
        set({ theme: get().theme === "light" ? "dark" : "light" }),
      set: (theme) => set({ theme }),
    }),
    { name: "feast-theme" }
  )
);
