"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type AddExerciseButtonProps = {
  variant?: "fab" | "button" | "auto";
};

export function AddExerciseButton({
  variant = "auto",
}: AddExerciseButtonProps) {
  // Auto variant: FAB na mobile, button na desktop
  if (variant === "auto") {
    return (
      <>
        {/* FAB - widoczny tylko na mobile */}
        <Link
          href="/exercises/new"
          className={cn(
            "fixed bottom-6 right-6 z-50",
            "flex h-14 w-14 items-center justify-center rounded-full",
            "bg-goRed text-white shadow-lg",
            "transition-all hover:scale-110 hover:bg-goRed/90 hover:shadow-xl",
            "focus:outline-none focus:ring-2 focus:ring-goRed focus:ring-offset-2",
            "md:hidden" // Ukryj na desktop
          )}
          aria-label="Dodaj nowe ćwiczenie"
        >
          <Plus className="h-6 w-6" />
        </Link>

        {/* Button - widoczny tylko na desktop */}
        <div className="hidden md:block">
          <Button asChild className="bg-goRed hover:bg-goRed/90 text-white">
            <Link href="/exercises/new">
              <Plus className="mr-2 h-4 w-4" />
              Dodaj ćwiczenie
            </Link>
          </Button>
        </div>
      </>
    );
  }

  if (variant === "fab") {
    return (
      <Link
        href="/exercises/new"
        className={cn(
          "fixed bottom-6 right-6 z-50",
          "flex h-14 w-14 items-center justify-center rounded-full",
          "bg-goRed text-white shadow-lg",
          "transition-all hover:scale-110 hover:bg-goRed/90 hover:shadow-xl",
          "focus:outline-none focus:ring-2 focus:ring-goRed focus:ring-offset-2"
        )}
        aria-label="Dodaj nowe ćwiczenie"
      >
        <Plus className="h-6 w-6" />
      </Link>
    );
  }

  return (
    <Button asChild className="bg-goRed hover:bg-goRed/90 text-white">
      <Link href="/exercises/new">
        <Plus className="mr-2 h-4 w-4" />
        Dodaj ćwiczenie
      </Link>
    </Button>
  );
}
