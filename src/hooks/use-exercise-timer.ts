"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { SessionExerciseDTO } from "@/types";
import type { ExerciseTimerState } from "@/types/workout-session-assistant";

/**
 * Custom hook do zarządzania logiką timera ćwiczenia.
 * Obsługuje odliczanie czasu serii, wyświetlanie powtórzeń,
 * przerwy między seriami i przerwy po seriach.
 */
export function useExerciseTimer(
  exercise: SessionExerciseDTO,
  currentSetNumber: number,
  isPaused: boolean,
  onSetComplete: () => void,
  onRestBetweenComplete: () => void,
  onRestAfterSeriesComplete: () => void
): {
  timerState: ExerciseTimerState;
  startSetTimer: () => void;
  startRestBetweenTimer: () => void;
  startRestAfterSeriesTimer: () => void;
  resetTimer: () => void;
} {
  const [timerState, setTimerState] = useState<ExerciseTimerState>({
    type: "waiting",
  });

  // Hook zarządza tylko stanem - CountdownCircleTimer w komponentach odlicza czas
  // Pozostały czas jest przechowywany w stanie timera

  // Rozpoczęcie odliczania czasu serii
  const startSetTimer = useCallback(() => {
    if (!exercise.planned_duration_seconds || exercise.planned_duration_seconds <= 0) {
      return;
    }

    const duration = exercise.planned_duration_seconds;
    setTimerState({
      type: "set_countdown",
      setNumber: currentSetNumber,
      remainingSeconds: duration,
    });
  }, [
    exercise.planned_duration_seconds,
    currentSetNumber,
  ]);

  // Rozpoczęcie przerwy między seriami
  const startRestBetweenTimer = useCallback(() => {
    if (!exercise.planned_rest_seconds || exercise.planned_rest_seconds <= 0) {
      // Jeśli nie ma przerwy, przejdź bezpośrednio do następnej serii
      onRestBetweenComplete();
      return;
    }

    const restSeconds = exercise.planned_rest_seconds;
    setTimerState({
      type: "rest_between_sets",
      remainingSeconds: restSeconds,
    });
  }, [
    exercise.planned_rest_seconds,
    onRestBetweenComplete,
  ]);

  // Rozpoczęcie przerwy po seriach
  const startRestAfterSeriesTimer = useCallback(() => {
    const restSeconds =
      exercise.planned_rest_after_series_seconds ?? 0;
    if (restSeconds <= 0) {
      // Jeśli nie ma przerwy, wywołaj callback natychmiast
      onRestAfterSeriesComplete();
      return;
    }

    setTimerState({
      type: "rest_after_series",
      remainingSeconds: restSeconds,
    });
  }, [
    exercise.planned_rest_after_series_seconds,
    onRestAfterSeriesComplete,
  ]);

  // Reset timera
  const resetTimer = useCallback(() => {
    setTimerState({ type: "waiting" });
  }, []);

  // Ref do śledzenia poprzednich wartości, aby uniknąć niepotrzebnych aktualizacji
  const prevValuesRef = useRef<{
    exerciseId: string | null;
    currentSetNumber: number | null;
    plannedDurationSeconds: number | null;
    plannedReps: number | null;
  }>({
    exerciseId: null,
    currentSetNumber: null,
    plannedDurationSeconds: null,
    plannedReps: null,
  });

  // Ref do śledzenia, czy to pierwszy mount
  const isFirstMountRef = useRef(true);

  // Funkcja pomocnicza do inicjalizacji stanu timera
  const initializeTimerState = useCallback(() => {
    if (
      (exercise.planned_duration_seconds && exercise.planned_duration_seconds > 0) ||
      (exercise.planned_reps && exercise.planned_reps > 0)
    ) {
      // Sprawdź, czy to ćwiczenie z czasem czy powtórzeniami
      if (exercise.planned_duration_seconds && exercise.planned_duration_seconds > 0) {
        setTimerState({
          type: "set_countdown",
          setNumber: currentSetNumber,
          remainingSeconds: exercise.planned_duration_seconds,
        });
      } else {
        // Ćwiczenie z powtórzeniami - wyświetl powtórzenia
        setTimerState({
          type: "reps_display",
          setNumber: currentSetNumber,
          reps: exercise.planned_reps ?? 0,
        });
      }
    } else {
      // Jeśli ćwiczenie nie ma planowanych wartości, ustaw stan oczekiwania
      setTimerState({ type: "waiting" });
    }
  }, [exercise.planned_duration_seconds, exercise.planned_reps, currentSetNumber]);

  // Automatyczne rozpoczęcie serii przy zmianie ćwiczenia lub numeru serii
  useEffect(() => {
    const prev = prevValuesRef.current;
    const hasChanged =
      prev.exerciseId === null ||
      prev.currentSetNumber === null ||
      prev.exerciseId !== exercise.id ||
      prev.currentSetNumber !== currentSetNumber ||
      prev.plannedDurationSeconds !== exercise.planned_duration_seconds ||
      prev.plannedReps !== exercise.planned_reps;

    // Jeśli to pierwszy mount lub wartości się zmieniły, zaktualizuj timer
    if (isFirstMountRef.current || hasChanged) {
      // Aktualizuj ref z nowymi wartościami
      prevValuesRef.current = {
        exerciseId: exercise.id,
        currentSetNumber,
        plannedDurationSeconds: exercise.planned_duration_seconds,
        plannedReps: exercise.planned_reps,
      };

      // Oznacz, że pierwszy mount już minął
      if (isFirstMountRef.current) {
        isFirstMountRef.current = false;
      }

      // Oblicz nowy stan timera na podstawie ćwiczenia
      // Używamy queueMicrotask, aby uniknąć synchronicznego setState w efekcie
      queueMicrotask(() => {
        initializeTimerState();
      });
    }
  }, [exercise.id, currentSetNumber, exercise.planned_duration_seconds, exercise.planned_reps, initializeTimerState]);


  return {
    timerState,
    startSetTimer,
    startRestBetweenTimer,
    startRestAfterSeriesTimer,
    resetTimer,
  };
}
