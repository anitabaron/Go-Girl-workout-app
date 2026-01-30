"use client";

import { DesignModeToggle } from "@/components/design-mode-toggle";

/**
 * Stopka z przełącznikiem designu (Legacy/M3).
 * Widoczna tylko w developmentzie – użytkownicy na produkcji go nie widzą.
 */
export function DesignModeFooter({
  currentMode,
}: Readonly<{ currentMode: "legacy" | "m3" }>) {
  const isDev = process.env.NODE_ENV === "development";

  if (!isDev) return null;

  return (
    <footer
      className="fixed bottom-2 right-2 z-[100] p-1 opacity-25 hover:opacity-90"
      aria-hidden
    >
      <DesignModeToggle currentMode={currentMode} />
    </footer>
  );
}
