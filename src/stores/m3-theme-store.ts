import { create } from "zustand";
import { persist } from "zustand/middleware";

const STORAGE_KEY = "m3-theme-store";

/** null = follow system (prefers-color-scheme), true = dark, false = light */
export type M3ThemeMode = boolean | null;
export type M3ColorVariant =
  | "pink"
  | "green"
  | "teal"
  | "blue"
  | "purple";

interface M3ThemeStore {
  /** null = follow system, true = dark, false = light */
  isDark: M3ThemeMode;
  colorVariant: M3ColorVariant;
  setDark: (isDark: M3ThemeMode) => void;
  setColorVariant: (variant: M3ColorVariant) => void;
  toggle: () => void;
}

function applyTheme(root: Element | null, isDark: M3ThemeMode) {
  if (!root) return;
  root.classList.toggle("dark", isDark === true);
  root.classList.toggle("light", isDark === false);
}

function applyColorVariant(root: Element | null, variant: M3ColorVariant) {
  if (!root) return;
  root.setAttribute("data-m3-variant", variant);
}

function applyThemeToDom(isDark: M3ThemeMode) {
  applyTheme(document.documentElement, isDark);
}

function applyColorVariantToDom(variant: M3ColorVariant) {
  applyColorVariant(document.documentElement, variant);
}

/**
 * M3 theme store – dark/light mode and color variant for M3 UI.
 * Persists to localStorage. Applies .dark/.light and [data-m3-variant] on :root.
 */
export const useM3ThemeStore = create<M3ThemeStore>()(
  persist(
    (set, get) => ({
      isDark: null,
      colorVariant: "pink",

      setDark: (isDark) => {
        set({ isDark });
        if (globalThis.window !== undefined) {
          applyThemeToDom(isDark);
        }
      },

      setColorVariant: (colorVariant) => {
        set({ colorVariant });
        if (globalThis.window !== undefined) {
          applyColorVariantToDom(colorVariant);
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
      partialize: (state) => ({
        isDark: state.isDark,
        colorVariant: state.colorVariant,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state || globalThis.window === undefined) return;
        applyThemeToDom(state.isDark);
        applyColorVariantToDom(state.colorVariant ?? "pink");
      },
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<M3ThemeStore> | undefined;
        return {
          ...currentState,
          ...persisted,
          isDark: persisted?.isDark ?? currentState.isDark,
          colorVariant: persisted?.colorVariant ?? currentState.colorVariant,
        };
      },
    },
  ),
);

if (globalThis.window !== undefined) {
  const { isDark, colorVariant } = useM3ThemeStore.getState();
  applyThemeToDom(isDark);
  applyColorVariantToDom(colorVariant);
}
