"use client";

import { useEffect, useState, useMemo, type ReactNode } from "react";
import { CountdownCircleTimer } from "react-countdown-circle-timer";

type WorkoutTimerProps = {
  activeDurationSeconds: number; // skumulowany czas aktywności sesji (z bazy danych)
  lastTimerStartedAt: string | null; // timestamp ostatniego uruchomienia timera
  lastTimerStoppedAt: string | null; // timestamp ostatniego zatrzymania timera
  isPaused: boolean; // czy sesja jest w pauzie
  currentExerciseName: string; // nazwa bieżącego ćwiczenia
  currentSetNumber: number; // numer bieżącej serii (domyślnie 1)
  currentExerciseIndex: number; // indeks bieżącego ćwiczenia (0-based)
  totalExercises: number; // całkowita liczba ćwiczeń w sesji
  restSeconds?: number; // opcjonalna liczba sekund przerwy do odliczania
  exerciseTimerContent?: ReactNode; // zawartość timera ćwiczenia (RepsDisplay, SetCountdownTimer, itp.)
  onTimerStop?: () => void; // callback wywoływany przy unmount (wyjście z asystenta)
};

/**
 * Komponent WorkoutTimer wyświetla timer globalny sesji, odliczanie przerwy oraz status sesji.
 * Timer jest widoczny z odległości 1,5m, z największymi sekundami.
 */
export function WorkoutTimer({
  activeDurationSeconds,
  lastTimerStartedAt,
  lastTimerStoppedAt,
  isPaused,
  currentExerciseName,
  currentSetNumber,
  currentExerciseIndex,
  totalExercises,
  restSeconds,
  exerciseTimerContent,
  onTimerStop,
}: Readonly<WorkoutTimerProps>) {
  // Oblicz bazowy czas (skumulowany czas aktywności z bazy)
  const baseSeconds = useMemo(() => activeDurationSeconds || 0, [activeDurationSeconds]);

  // Sprawdź, czy timer jest zatrzymany
  const isTimerStopped = useMemo(() => {
    return lastTimerStoppedAt !== null && 
      (lastTimerStartedAt === null || 
       new Date(lastTimerStoppedAt).getTime() > new Date(lastTimerStartedAt).getTime());
  }, [lastTimerStoppedAt, lastTimerStartedAt]);

  const [elapsedSeconds, setElapsedSeconds] = useState(baseSeconds);

  // Obliczanie elapsedSeconds na podstawie active_duration_seconds i last_timer_started_at
  useEffect(() => {
    // Jeśli timer jest zatrzymany lub w pauzie, ustaw tylko bazowy czas
    if (isPaused || isTimerStopped || !lastTimerStartedAt) {
      // Użyj requestAnimationFrame, aby uniknąć synchronicznego setState w efekcie
      const rafId = requestAnimationFrame(() => {
        setElapsedSeconds(baseSeconds);
      });
      return () => cancelAnimationFrame(rafId);
    }

    // Timer jest aktywny - aktualizuj co sekundę
    const updateElapsed = () => {
      const now = Date.now();
      const startedAt = new Date(lastTimerStartedAt).getTime();
      const currentElapsed = Math.floor((now - startedAt) / 1000);
      const totalElapsed = baseSeconds + currentElapsed;
      setElapsedSeconds(totalElapsed);
    };

    // Aktualizuj od razu przy pierwszym uruchomieniu (w callback, nie synchronicznie)
    const immediateRafId = requestAnimationFrame(updateElapsed);

    // Aktualizuj co sekundę
    const interval = setInterval(updateElapsed, 1000);

    return () => {
      cancelAnimationFrame(immediateRafId);
      clearInterval(interval);
    };
  }, [baseSeconds, lastTimerStartedAt, isPaused, isTimerStopped]);

  // Cleanup przy unmount - zatrzymaj timer przy wyjściu z asystenta
  useEffect(() => {
    return () => {
      // Wywołaj callback, jeśli timer był uruchomiony (lastTimerStartedAt istnieje)
      // Logika w stopTimer sprawdzi czy trzeba zapisać czas (czy timer został wznowiony po ostatnim zatrzymaniu)
      if (lastTimerStartedAt && onTimerStop) {
        onTimerStop();
      }
    };
  }, [lastTimerStartedAt, onTimerStop]);

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
          trailColor="#ffbdc8"
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
    <div className="flex flex-col items-center justify-center gap-4 pt-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">
          Ćwiczenie: {currentExerciseName}
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Seria {currentSetNumber}
        </p>
      </div>

      {/* Timer/powtórzenia ćwiczenia - wyświetlane bezpośrednio pod nazwą ćwiczenia */}
      {exerciseTimerContent}

      <div
        className={`flex gap-2 items-center transition-opacity ${
          isPaused ? "" : "animate-pulse"
        }`}
      >
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
      Łączny czas treningu
    </div>
        <div className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">
          {formatTime(elapsedSeconds)}
        </div>
        
      <div className="text-center">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Ćwiczenie {currentExerciseIndex + 1} z {totalExercises}
        </p>
      </div>
      </div>

    </div>
  );
}
