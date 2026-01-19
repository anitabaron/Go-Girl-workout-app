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
    <div className="flex flex-col items-center justify-center gap-6 py-6">
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex items-center justify-center">
          {/* Różowe kółko jako tło */}
          <div className="absolute w-60 h-60 sm:w-70 sm:h-70 md:w-80 md:h-80 rounded-full bg-[#ffbdc8] opacity-30 pointer-events-none"></div>
          <div className="relative text-7xl font-bold text-destructive sm:text-8xl md:text-8xl">
            {reps}
          </div>
        </div>
        <div className="text-lg text-zinc-600 dark:text-zinc-400">
          powtórzeń
        </div>
      </div>

      <Button
        type="button"
        onClick={handleClick}
        size="lg"
        className="relative z-10 min-w-[120px] text-lg font-semibold"
      >
        OK
      </Button>
    </div>
  );
}
