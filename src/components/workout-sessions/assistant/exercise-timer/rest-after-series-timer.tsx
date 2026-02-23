"use client";

import { CountdownCircleTimer } from "react-countdown-circle-timer";
import type { RestAfterSeriesTimerProps } from "@/types/workout-session-assistant";
import { Button } from "@/components/ui/button";
import { formatCompactSeconds } from "@/lib/utils/time-format";
import { useTimerPalette } from "../use-timer-palette";

/**
 * Komponent wyświetlający odliczanie przerwy po zakończonych seriach ćwiczenia.
 * Odlicza od `restSeconds` do 0 i automatycznie wywołuje `onComplete`.
 * Timer jest widoczny z odległości 1,5m, z największymi sekundami.
 */
export function RestAfterSeriesTimer({
  restSeconds,
  isPaused,
  onComplete,
}: Readonly<RestAfterSeriesTimerProps>) {
  const timerPalette = useTimerPalette("break-series");
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
    <div className="flex flex-col items-center justify-center gap-4">
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
              {formatCompactSeconds(remainingTime)}
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
      </Button>{" "}
      <div className="text-center">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Przygotuj się do następnego ćwiczenia
        </p>
      </div>
    </div>
  );
}
