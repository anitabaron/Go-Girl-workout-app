"use client";

import { ChevronLeft, ChevronRight, Pause, Play, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";

type NavigationButtonsProps = {
  onPrevious: () => void;
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
  onNext: () => void;
  isPaused: boolean;
  canGoPrevious: boolean;
  canGoNext: boolean;
  isLoading?: boolean;
};

/**
 * Komponent z dużymi przyciskami nawigacji dostosowanymi do użycia jedną ręką.
 * Zawiera: Previous, Pause/Resume, Skip, Next.
 */
export function NavigationButtons({
  onPrevious,
  onPause,
  onResume,
  onSkip,
  onNext,
  isPaused,
  canGoPrevious,
  canGoNext,
  isLoading = false,
}: NavigationButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={onPrevious}
        disabled={!canGoPrevious || isLoading}
        className="h-16 text-base font-semibold"
        aria-label="Poprzednie ćwiczenie"
      >
        <ChevronLeft className="mr-2 size-5" />
        Poprzednie
      </Button>

      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={isPaused ? onResume : onPause}
        disabled={isLoading}
        className="h-16 text-base font-semibold"
        aria-label={isPaused ? "Wznów sesję" : "Pauzuj sesję"}
      >
        {isPaused ? (
          <>
            <Play className="mr-2 size-5" />
            Wznów
          </>
        ) : (
          <>
            <Pause className="mr-2 size-5" />
            Pauza
          </>
        )}
      </Button>

      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={onSkip}
        disabled={isLoading}
        className="h-16 text-base font-semibold"
        aria-label="Pomiń ćwiczenie"
      >
        <SkipForward className="mr-2 size-5" />
        Pomiń
      </Button>

      <Button
        type="button"
        variant="default"
        size="lg"
        onClick={onNext}
        disabled={!canGoNext || isLoading}
        className="h-16 bg-destructive text-destructive-foreground hover:bg-destructive/90 text-base font-semibold"
        aria-label="Następne ćwiczenie"
      >
        Następne
        <ChevronRight className="ml-2 size-5" />
      </Button>
    </div>
  );
}
