"use client";

import { CountdownCircleTimer } from "react-countdown-circle-timer";
import type { SetCountdownTimerProps } from "@/types/workout-session-assistant";
import { Button } from "@/components/ui/button";

/**
 * Komponent wyświetlający odliczanie czasu dla pojedynczej serii ćwiczenia.
 * Odlicza od `durationSeconds` do 0 i automatycznie wywołuje `onComplete`.
 * Timer jest widoczny z odległości 1,5m, z największymi sekundami.
 */
export function SetCountdownTimer({
  durationSeconds,
  isPaused,
  onComplete,
}: Readonly<SetCountdownTimerProps>) {
  // Walidacja: durationSeconds musi być > 0
  if (!durationSeconds || durationSeconds <= 0) {
    return null;
  }

  // Walidacja: onComplete musi być funkcją
  if (typeof onComplete !== "function") {
    return null;
  }

  const handleComplete = () => {
    onComplete();
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 pb-9">
      <CountdownCircleTimer
        isPlaying={!isPaused}
        duration={durationSeconds}
        colors={["#ef4444", "#f87171", "#fca5a5"]}
        colorsTime={[durationSeconds, durationSeconds * 0.5, 0]}
        trailColor="#ffbdc8"
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
              sekund
            </div>
          </div>
        )}
      </CountdownCircleTimer>
      <Button
        onClick={handleComplete}
        size="lg"
        className="min-w-[120px] text-md font-light"
      >
        OK
      </Button>
    </div>
  );
}
