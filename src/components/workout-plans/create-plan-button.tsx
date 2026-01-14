"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type CreatePlanButtonProps = {
  variant?: "auto" | "fab" | "default";
};

export function CreatePlanButton({ variant = "default" }: CreatePlanButtonProps) {
  if (variant === "fab") {
    return (
      <Button
        asChild
        size="icon"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-destructive shadow-lg hover:bg-destructive/90 text-destructive-foreground"
        aria-label="Utwórz nowy plan treningowy"
      >
        <Link href="/workout-plans/new">
          <Plus className="h-6 w-6" />
        </Link>
      </Button>
    );
  }

  return (
    <Button
      asChild
      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
      aria-label="Utwórz nowy plan treningowy"
    >
      <Link href="/workout-plans/new">
        <Plus className="mr-2 h-4 w-4" />
        Utwórz plan
      </Link>
    </Button>
  );
}
