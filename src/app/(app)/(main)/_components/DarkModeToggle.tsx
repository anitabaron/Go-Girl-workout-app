"use client";

import { Moon, Sun } from "lucide-react";
import { useM3DarkMode } from "../_lib/use-m3-dark-mode";
import { cn } from "@/lib/utils";

type DarkModeToggleProps = {
  className?: string;
  "aria-label"?: string;
};

/**
 * M3 dark mode toggle – switches between light/dark.
 * Uses .ui-m3.dark and m3.css tokens. Scoped to m3 only.
 */
export function DarkModeToggle({
  className,
  "aria-label": ariaLabel = "Toggle dark mode",
}: Readonly<DarkModeToggleProps>) {
  const { isDark, toggle } = useM3DarkMode();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={ariaLabel}
      aria-pressed={isDark}
      className={cn(
        "flex items-center justify-center rounded-[var(--m3-radius-lg)] p-2",
        "text-muted-foreground hover:bg-muted hover:text-foreground",
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      {isDark ? (
        <Sun className="size-5" aria-hidden />
      ) : (
        <Moon className="size-5" aria-hidden />
      )}
    </button>
  );
}
