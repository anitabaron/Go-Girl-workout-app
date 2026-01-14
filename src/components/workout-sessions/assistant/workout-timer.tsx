"use client";

import { useEffect, useState, useRef } from "react";
import { CountdownCircleTimer } from "react-countdown-circle-timer";

type WorkoutTimerProps = {
  startedAt: string; // ISO timestamp rozpoczęcia sesji
  isPaused: boolean; // czy sesja jest w pauzie
  currentExerciseName: string; // nazwa bieżącego ćwiczenia
  currentSetNumber: number; // numer bieżącej serii (domyślnie 1)
  currentExerciseIndex: number; // indeks bieżącego ćwiczenia (0-based)
  totalExercises: number; // całkowita liczba ćwiczeń w sesji
  restSeconds?: number; // opcjonalna liczba sekund przerwy do odliczania
};

/**
 * Komponent WorkoutTimer wyświetla timer globalny sesji, odliczanie przerwy oraz status sesji.
 * Timer jest widoczny z odległości 1,5m, z największymi sekundami.
 */
export function WorkoutTimer({
  startedAt,
  isPaused,
  currentExerciseName,
  currentSetNumber,
  currentExerciseIndex,
  totalExercises,
  restSeconds,
}: WorkoutTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const pausedAtRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(new Date(startedAt).getTime());
  const elapsedSecondsRef = useRef<number>(0);

  // Obliczanie elapsedSeconds z startedAt
  useEffect(() => {
    if (isPaused) {
      // Zatrzymaj timer, zapamiętaj czas pauzy
      if (pausedAtRef.current === null) {
        pausedAtRef.current = elapsedSecondsRef.current;
      }
      return;
    }

    // Wznów timer od zapamiętanego czasu
    if (pausedAtRef.current !== null) {
      startTimeRef.current = Date.now() - pausedAtRef.current * 1000;
      pausedAtRef.current = null;
    } else {
      startTimeRef.current = new Date(startedAt).getTime();
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTimeRef.current) / 1000);
      elapsedSecondsRef.current = elapsed;
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt, isPaused]);

  // Formatowanie czasu: MM:SS lub HH:MM:SS
  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Jeśli jest odliczanie przerwy, użyj CountdownCircleTimer
  if (restSeconds !== undefined && restSeconds > 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">
            Ćwiczenie: {currentExerciseName}
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Seria {currentSetNumber}
          </p>
        </div>

        <CountdownCircleTimer
          isPlaying={!isPaused}
          duration={restSeconds}
          colors={["#ef4444", "#f87171", "#fca5a5"]}
          colorsTime={[restSeconds, restSeconds * 0.5, 0]}
          size={240}
          strokeWidth={12}
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
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Ćwiczenie {currentExerciseIndex + 1} z {totalExercises}
          </p>
        </div>
      </div>
    );
  }

  // Timer globalny sesji
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">
          Ćwiczenie: {currentExerciseName}
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Seria {currentSetNumber}
        </p>
      </div>

      <div
        className={`flex flex-col items-center transition-opacity ${
          !isPaused ? "animate-pulse" : ""
        }`}
      >
        <div className="text-6xl font-bold text-destructive sm:text-7xl md:text-8xl">
          {formatTime(elapsedSeconds)}
        </div>
        <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Czas treningu
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Status: {isPaused ? "Pauza" : "W trakcie"}
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Ćwiczenie {currentExerciseIndex + 1} z {totalExercises}
        </p>
      </div>
    </div>
  );
}
