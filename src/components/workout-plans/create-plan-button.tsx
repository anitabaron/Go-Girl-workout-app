"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type CreatePlanButtonProps = {
  variant?: "auto" | "fab" | "default";
};

export function CreatePlanButton({ variant = "default" }: CreatePlanButtonProps) {
  // Auto variant: FAB na mobile, button na desktop
  if (variant === "auto") {
    return (
      <>
        {/* FAB - widoczny tylko na mobile */}
        <Button
          asChild
          size="icon"
          className="fixed bottom-20 right-6 md:bottom-6 h-14 w-14 rounded-full bg-destructive shadow-lg hover:bg-destructive/90 text-destructive-foreground z-50 md:hidden"
          aria-label="Utwórz nowy plan treningowy"
        >
          <Link href="/workout-plans/new">
            <Plus className="h-6 w-6" />
          </Link>
        </Button>

        {/* Button - widoczny tylko na desktop */}
        <div className="hidden md:block">
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
        </div>
      </>
    );
  }

  if (variant === "fab") {
    return (
      <Button
        asChild
        size="icon"
        className="fixed bottom-20 right-6 md:bottom-6 h-14 w-14 rounded-full bg-destructive shadow-lg hover:bg-destructive/90 text-destructive-foreground z-50"
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
