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
}: Readonly<QuickStartButtonProps>) {
  if (variant === "fab") {
    return (
      <Link href={QUICK_START_HREF}>
        <Button
          size="icon"
          className={`h-10 w-10 rounded-full shadow-lg ${className ?? ""}`}
          aria-label="Start treningu"
        >
          <Play className="h-5 w-5" />
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
