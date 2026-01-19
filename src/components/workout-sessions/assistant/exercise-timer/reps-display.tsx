"use client";

import { Button } from "@/components/ui/button";
import type { RepsDisplayProps } from "@/types/workout-session-assistant";

/**
 * Komponent wyświetlający liczbę planowanych powtórzeń dla serii z przyciskiem "OK".
 * Użytkowniczka wykonuje powtórzenia i klika "OK" po zakończeniu serii.
 * Wyświetlacz jest widoczny z odległości 1,5m, z największymi liczbami.
 */
export function RepsDisplay({
  reps,
  setNumber,
  onComplete,
}: Readonly<RepsDisplayProps>) {
  // Walidacja: reps musi być > 0
  if (!reps || reps <= 0) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">
          Seria {setNumber}
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Wykonaj powtórzenia
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="text-8xl font-bold text-destructive sm:text-9xl md:text-[12rem]">
          {reps}
        </div>
        <div className="text-lg text-zinc-600 dark:text-zinc-400">
          powtórzeń
        </div>
      </div>

      <Button
        onClick={onComplete}
        size="lg"
        className="min-w-[120px] text-lg font-semibold"
      >
        OK
      </Button>
    </div>
  );
}
