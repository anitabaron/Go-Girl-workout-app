"use client";

import { Play, CheckCircle2 } from "lucide-react";
import type { WorkoutSessionStatus } from "@/types";
import { Badge } from "@/components/ui/badge";

type SessionStatusBadgeProps = {
  readonly status: WorkoutSessionStatus;
};

export function SessionStatusBadge({ status }: SessionStatusBadgeProps) {
  if (status === "in_progress") {
    return (
      <Badge
        variant="default"
        className="bg-destructive text-destructive-foreground"
        aria-label="Sesja w trakcie"
      >
        <Play className="mr-1 h-3 w-3" />
        W trakcie
      </Badge>
    );
  }

  if (status === "completed") {
    return (
      <Badge
        variant="secondary"
        className="bg-secondary text-secondary-foreground"
        aria-label="Sesja zakończona"
      >
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Zakończona
      </Badge>
    );
  }

  return null;
}
