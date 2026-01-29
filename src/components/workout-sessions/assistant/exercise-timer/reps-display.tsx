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
  setNumber: _setNumber, // eslint-disable-line @typescript-eslint/no-unused-vars
  onComplete,
}: Readonly<RepsDisplayProps>) {
  // Walidacja: reps musi być > 0
  if (!reps || reps <= 0) {
    return null;
  }

  // Walidacja: onComplete musi być funkcją
  if (typeof onComplete !== "function") {
    return null;
  }

  const handleClick = () => {
    if (typeof onComplete === "function") {
      onComplete();
    } else {
      console.error("[RepsDisplay] onComplete is not a function:", onComplete);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 pb-10">
      {/* Różowe kółko z cyfrą i podpisem */}
      <div className="relative flex h-60 w-60 flex-col items-center justify-center">
        {/* Kółko jako tło z opacity */}
        <div
          className="absolute inset-0 rounded-full bg-[#ffbdc8] opacity-30"
          aria-hidden
        />
        {/* Cyfra i napis nad kółkiem - pełna widoczność */}
        <div className="relative z-10 flex flex-col items-center gap-1">
          <span className="text-7xl font-bold text-destructive sm:text-8xl md:text-8xl">
            {reps}
          </span>
          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            powtórzeń
          </span>
        </div>
      </div>

      <Button
        type="button"
        onClick={handleClick}
        size="lg"
        className="min-w-[120px] text-lg"
      >
        OK
      </Button>
    </div>
  );
}
