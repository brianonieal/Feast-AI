// @version 0.5.0 - Echo: client-side theme provider
// IMPORTANT: Root layout is a Server Component. This client component
// reads useThemeStore and applies data-theme to document.documentElement.
// This prevents the RSC/client store conflict and avoids FOUC on theme load.
"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/stores/useThemeStore";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.set);

  useEffect(() => {
    // On first mount, if the store has no persisted value, seed from system pref
    const stored = localStorage.getItem("feast-theme");
    if (!stored) {
      setTheme(getSystemTheme());
    }
  }, [setTheme]);

  useEffect(() => {
    // Sync data-theme attribute whenever store changes
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    // Listen for OS-level theme changes and sync to store
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? "dark" : "light");
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [setTheme]);

  return <>{children}</>;
}
