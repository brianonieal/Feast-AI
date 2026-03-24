// @version 0.5.0 - Echo: theme state management (mobile)
// On mobile, theme follows system appearance via useColorScheme().
// This store allows manual override if needed.
import { create } from "zustand";

type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  set: (t: Theme) => void;
}

export const useThemeStore = create<ThemeState>()((set, get) => ({
  theme: "light",
  toggle: () =>
    set({ theme: get().theme === "light" ? "dark" : "light" }),
  set: (theme) => set({ theme }),
}));
