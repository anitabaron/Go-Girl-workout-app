"use client";

import { Badge } from "@/components/ui/badge";

export function NewRecordBadge() {
  return (
    <Badge
      variant="default"
      className="bg-destructive text-destructive-foreground"
    >
      Nowy
    </Badge>
  );
}
