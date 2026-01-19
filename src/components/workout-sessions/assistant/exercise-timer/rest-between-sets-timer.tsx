"use client";

import { CountdownCircleTimer } from "react-countdown-circle-timer";
import type { RestBetweenSetsTimerProps } from "@/types/workout-session-assistant";

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
  // Walidacja: restSeconds musi być > 0
  if (!restSeconds || restSeconds <= 0) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">
          Przerwa między seriami
        </h3>
      </div>

      <CountdownCircleTimer
        isPlaying={!isPaused}
        duration={restSeconds}
        colors={["#ef4444", "#f87171", "#fca5a5"]}
        colorsTime={[restSeconds, restSeconds * 0.5, 0]}
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
              sekund przerwy
            </div>
          </div>
        )}
      </CountdownCircleTimer>

      <div className="text-center">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Status: {isPaused ? "Pauza" : "W trakcie"}
        </p>
      </div>
    </div>
  );
}
