"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QUICK_START_HREF } from "./navigation-items";

export type QuickStartButtonVariant = "fab" | "button";

export interface QuickStartButtonProps {
  variant?: QuickStartButtonVariant;
  className?: string;
}

/**
 * Client Component z wyróżnionym przyciskiem szybkiego startu sesji treningowej.
 * Renderuje się jako FAB na mobile i primary button na desktop.
 */
export function QuickStartButton({
  variant = "button",
  className,
}: QuickStartButtonProps) {
  if (variant === "fab") {
    return (
      <Link href={QUICK_START_HREF}>
        <Button
          size="icon"
          className={`h-14 w-14 rounded-full shadow-lg ${className ?? ""}`}
          aria-label="Start treningu"
        >
          <Play className="h-6 w-6" />
        </Button>
      </Link>
    );
  }

  return (
    <Link href={QUICK_START_HREF}>
      <Button
        className={className}
        aria-label="Start treningu"
      >
        <Play className="mr-2 h-4 w-4" />
        Start treningu
      </Button>
    </Link>
  );
}
