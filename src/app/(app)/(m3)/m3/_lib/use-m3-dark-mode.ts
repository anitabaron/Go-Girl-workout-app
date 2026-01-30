"use client";

import { useM3ThemeStore } from "@/stores/m3-theme-store";

/**
 * Hook for M3 dark mode toggle. Reads from Zustand store (persisted in localStorage).
 * Scoped to m3 only – does not affect legacy routes.
 */
export function useM3DarkMode() {
  const isDark = useM3ThemeStore((state) => state.isDark);
  const toggle = useM3ThemeStore((state) => state.toggle);

  return {
    isDark: isDark ?? false,
    toggle,
  };
}
