"use client";

import { useM3ThemeStore } from "@/stores/m3-theme-store";

type HexColor = `#${string}`;

type TimerPalette = {
  colors: [HexColor, HexColor, HexColor];
  trailColor: HexColor;
};

type PaletteVariant = "default" | "series";

function readToken(
  styles: CSSStyleDeclaration,
  token: string,
  fallback: HexColor,
): string {
  const value = styles.getPropertyValue(token).trim();
  return value || fallback;
}

function componentToHex(value: number): string {
  return value.toString(16).padStart(2, "0");
}

function toHexColor(value: string, fallback: HexColor): HexColor {
  const normalized = value.trim().toLowerCase();
  if (normalized.startsWith("#")) return normalized as HexColor;
  const rgb = normalized.match(/\d+/g);
  if (!rgb || rgb.length < 3) return fallback;
  const [r, g, b] = rgb.slice(0, 3).map((v) => Number.parseInt(v, 10));
  if ([r, g, b].some((n) => Number.isNaN(n))) return fallback;
  return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}` as HexColor;
}

export function useTimerPalette(
  paletteVariant: PaletteVariant = "default",
): TimerPalette {
  useM3ThemeStore((state) => state.isDark);
  useM3ThemeStore((state) => state.colorVariant);

  if (typeof window === "undefined") {
    return {
      colors:
        paletteVariant === "series"
          ? ["#be123c", "#e11d48", "#f43f5e"]
          : ["#ef4444", "#f87171", "#fca5a5"],
      trailColor: "#ffbdc8",
    };
  }

  const styles = getComputedStyle(document.documentElement);
  const primary = toHexColor(readToken(styles, "--m3-primary", "#ef4444"), "#ef4444");
  const primaryContainer = toHexColor(
    readToken(styles, "--m3-primary-container", "#f87171"),
    "#f87171",
  );
  const outlineVariant = toHexColor(
    readToken(styles, "--m3-outline-variant", "#fca5a5"),
    "#fca5a5",
  );
  const outline = toHexColor(readToken(styles, "--m3-outline", "#e11d48"), "#e11d48");
  const trailColor = toHexColor(
    readToken(styles, "--m3-surface-container-high", "#ffbdc8"),
    "#ffbdc8",
  );

  const colors: [HexColor, HexColor, HexColor] =
    paletteVariant === "series"
      ? [primary, outline, outlineVariant]
      : [primary, primaryContainer, outlineVariant];

  return {
    colors,
    trailColor,
  };
}
