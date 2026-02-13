"use client";

import { CountdownCircleTimer } from "react-countdown-circle-timer";
import type { RestBetweenSetsTimerProps } from "@/types/workout-session-assistant";
import { Button } from "@/components/ui/button";
import { useTimerPalette } from "../use-timer-palette";

/**
 * Komponent wyświetlający odliczanie przerwy między seriami.
 * Odlicza od `restSeconds` do 0 i automatycznie wywołuje `onComplete`.
 * Timer jest widoczny z odległości 1,5m, z największymi sekundami.
 */
export function RestBetweenSetsTimer({
  restSeconds,
  isPaused,
  onComplete,
}: Readonly<RestBetweenSetsTimerProps>) {
  const timerPalette = useTimerPalette();
  // Walidacja: restSeconds musi być > 0
  if (!restSeconds || restSeconds <= 0) {
    return null;
  }

  // Walidacja: onComplete musi być funkcją
  if (typeof onComplete !== "function") {
    return null;
  }

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 pb-10">
      <CountdownCircleTimer
        isPlaying={!isPaused}
        duration={restSeconds}
        colors={timerPalette.colors}
        colorsTime={[restSeconds, restSeconds * 0.5, 0]}
        trailColor={timerPalette.trailColor}
        size={240}
        strokeWidth={12}
        onComplete={() => {
          onComplete();
          return { shouldRepeat: false };
        }}
      >
        {({ remainingTime }) => (
          <div className="flex flex-col items-center">
            <div className="text-6xl font-bold text-destructive sm:text-7xl md:text-8xl">
              {remainingTime}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              sekund przerwy
            </div>
          </div>
        )}
      </CountdownCircleTimer>

      <Button
        onClick={handleSkip}
        size="lg"
        className="min-w-[120px] text-md font-light "
        data-test-id="timer-skip-break-button"
      >
        Pomiń przerwę
      </Button>
    </div>
  );
}
