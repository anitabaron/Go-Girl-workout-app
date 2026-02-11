import { create } from "zustand";
import { persist } from "zustand/middleware";

const M3_ROOT = ".ui-m3";
const STORAGE_KEY = "m3-theme-store";

/** null = follow system (prefers-color-scheme), true = dark, false = light */
export type M3ThemeMode = boolean | null;

interface M3ThemeStore {
  /** null = follow system, true = dark, false = light */
  isDark: M3ThemeMode;
  setDark: (isDark: M3ThemeMode) => void;
  toggle: () => void;
}

function applyTheme(root: Element | null, isDark: M3ThemeMode) {
  if (!root) return;
  root.classList.toggle("dark", isDark === true);
  root.classList.toggle("light", isDark === false);
}

function applyThemeToDom(isDark: M3ThemeMode) {
  applyTheme(document.documentElement, isDark);
  const roots = document.querySelectorAll(M3_ROOT);
  roots.forEach((root) => applyTheme(root, isDark));
}

/**
 * M3 theme store – dark/light mode for M3 UI.
 * Persists to localStorage. Applies .dark/.light on :root and .ui-m3 roots.
 *
 * @example
 * const isDark = useM3ThemeStore((s) => s.isDark);
 * const toggle = useM3ThemeStore((s) => s.toggle);
 */
export const useM3ThemeStore = create<M3ThemeStore>()(
  persist(
    (set, get) => ({
      isDark: null,

      setDark: (isDark) => {
        set({ isDark });
        if (globalThis.window !== undefined) {
          applyThemeToDom(isDark);
        }
      },

      toggle: () => {
        const prev = get().isDark;
        const next = prev !== true;
        set({ isDark: next });
        if (globalThis.window !== undefined) {
          applyThemeToDom(next);
        }
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({ isDark: state.isDark }),
      onRehydrateStorage: () => (state) => {
        if (state?.isDark != null && globalThis.window !== undefined) {
          applyThemeToDom(state.isDark);
        }
      },
    },
  ),
);
