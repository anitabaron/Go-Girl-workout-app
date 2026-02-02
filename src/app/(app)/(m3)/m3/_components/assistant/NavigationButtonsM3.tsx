"use client";

import { ChevronLeft, ChevronRight, Pause, Play, RedoDot } from "lucide-react";
import { Button } from "@/components/ui/button";

type NavigationButtonsM3Props = {
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

export function NavigationButtonsM3({
  onPrevious,
  onPause,
  onResume,
  onSkip,
  onNext,
  isPaused,
  canGoPrevious,
  canGoNext,
  isLoading = false,
}: Readonly<NavigationButtonsM3Props>) {
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
        className="h-12 text-base font-semibold px-2 sm:h-16 sm:px-4"
        aria-label="Previous exercise"
      >
        <ChevronLeft className="size-5 shrink-0 sm:mr-2" />
        <span className="hidden sm:inline">Previous</span>
      </Button>

      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={isPaused ? onResume : onPause}
        disabled={isLoading}
        className="h-12 text-base font-semibold px-2 sm:h-16 sm:px-4"
        aria-label={isPaused ? "Resume session" : "Pause session"}
      >
        {isPaused ? (
          <>
            <Play className="size-5 shrink-0 sm:mr-2" />
            <span className="hidden sm:inline">Resume</span>
          </>
        ) : (
          <>
            <Pause className="size-5 shrink-0 sm:mr-2" />
            <span className="hidden sm:inline">Pause</span>
          </>
        )}
      </Button>

      <Button
        type="button"
        variant="secondary"
        size="lg"
        onClick={onSkip}
        disabled={isLoading}
        className="h-12 text-base font-semibold px-2 sm:h-16 sm:px-4"
        aria-label="Skip exercise"
        data-test-id="workout-assistant-skip-button"
      >
        <RedoDot className="size-5 shrink-0" />
      </Button>

      <Button
        type="button"
        size="lg"
        onClick={onNext}
        disabled={!canGoNext || isLoading}
        className="m3-cta h-12 text-base font-semibold px-2 sm:h-16 sm:px-4"
        aria-label="Next exercise"
        data-test-id="workout-assistant-next-button"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="size-5 shrink-0 sm:ml-2" />
      </Button>
    </div>
  );
}
