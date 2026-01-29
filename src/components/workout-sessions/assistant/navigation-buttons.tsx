"use client";

import { ChevronLeft, ChevronRight, Pause, Play, RedoDot } from "lucide-react";
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
    <div
      className="grid grid-cols-[1fr_1fr_0.5fr_1fr] gap-2 sm:gap-3 sm:grid-cols-[1fr_1fr_0.5fr_1fr]"
      data-test-id="workout-assistant-navigation"
    >
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={onPrevious}
        disabled={!canGoPrevious || isLoading}
        className="h-12 sm:h-16 text-base font-semibold px-2 sm:px-4"
        aria-label="Poprzednie ćwiczenie"
      >
        <ChevronLeft className="size-5 sm:mr-2 shrink-0" />
        <span className="hidden sm:inline">Poprzednie</span>
      </Button>

      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={isPaused ? onResume : onPause}
        disabled={isLoading}
        className="h-12 sm:h-16 text-base font-semibold px-2 sm:px-4"
        aria-label={isPaused ? "Wznów sesję" : "Pauzuj sesję"}
      >
        {isPaused ? (
          <>
            <Play className="size-5 sm:mr-2 shrink-0" />
            <span className="hidden sm:inline">Wznów</span>
          </>
        ) : (
          <>
            <Pause className="size-5 sm:mr-2 shrink-0" />
            <span className="hidden sm:inline">Pauza</span>
          </>
        )}
      </Button>

      <Button
        type="button"
        variant="secondary"
        size="lg"
        onClick={onSkip}
        disabled={isLoading}
        className="h-12 sm:h-16 text-base font-semibold px-2 sm:px-4"
        aria-label="Pomiń ćwiczenie"
        data-test-id="workout-assistant-skip-button"
      >
        <RedoDot className="size-5 sm:mr-2 shrink-0" />
        <span className="hidden sm:inline">Pomiń</span>
      </Button>

      <Button
        type="button"
        variant="default"
        size="lg"
        onClick={onNext}
        disabled={!canGoNext || isLoading}
        className="h-12 sm:h-16 bg-destructive text-destructive-foreground hover:bg-destructive/90 text-base font-semibold px-2 sm:px-4"
        aria-label="Następne ćwiczenie"
        data-test-id="workout-assistant-next-button"
      >
        <span className="hidden sm:inline">Następne</span>
        <ChevronRight className="size-5 sm:ml-2 shrink-0" />
      </Button>
    </div>
  );
}
