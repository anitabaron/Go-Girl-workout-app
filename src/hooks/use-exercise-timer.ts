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

  // Ref do śledzenia, czy jesteśmy w trakcie przejścia (np. z reps_display do rest)
  // Zapobiega resetowaniu stanu przez useEffect podczas przejścia
  const isTransitioningRef = useRef(false);

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

    // Oznacz, że jesteśmy w trakcie przejścia
    isTransitioningRef.current = true;
    const restSeconds = exercise.planned_rest_seconds;
    setTimerState({
      type: "rest_between_sets",
      remainingSeconds: restSeconds,
    });
    // Zresetuj flagę przejścia po krótkim opóźnieniu
    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 100);
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

    // Oznacz, że jesteśmy w trakcie przejścia
    isTransitioningRef.current = true;
    setTimerState({
      type: "rest_after_series",
      remainingSeconds: restSeconds,
    });
    // Zresetuj flagę przejścia po krótkim opóźnieniu
    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 100);
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
      // Sprawdzamy aktualny stan przed resetowaniem, aby nie nadpisać stanu przerwy
      // ALE tylko wtedy, gdy wartości się nie zmieniły (chroni przed resetowaniem po kliknięciu OK)
      // Jeśli wartości się zmieniły (np. currentSetNumber), zawsze resetuj stan (po pominięciu przerwy)
      const shouldReset = hasChanged; // Zapisz wartość hasChanged przed wywołaniem queueMicrotask
      queueMicrotask(() => {
        setTimerState((currentState) => {
          // Jeśli jesteśmy w trakcie przejścia (np. z reps_display do rest), nie resetuj stanu
          if (isTransitioningRef.current) {
            return currentState;
          }

          // Jeśli wartości się zmieniły (np. currentSetNumber po pominięciu przerwy),
          // zawsze resetuj stan, nawet jeśli timer jest w przerwie
          // Jeśli wartości się NIE zmieniły, ale timer jest w przerwie, nie resetuj
          // (chroni przed resetowaniem po kliknięciu OK w reps_display)
          const isInRestState = 
            currentState.type === "rest_between_sets" || 
            currentState.type === "rest_after_series";
          
          // Jeśli timer jest w przerwie i wartości się NIE zmieniły, nie resetuj
          // (chroni przed resetowaniem po kliknięciu OK w reps_display)
          if (isInRestState && !shouldReset) {
            return currentState;
          }
          
          // W przeciwnym razie zresetuj stan (wartości się zmieniły lub timer nie jest w przerwie)
          if (
            (exercise.planned_duration_seconds && exercise.planned_duration_seconds > 0) ||
            (exercise.planned_reps && exercise.planned_reps > 0)
          ) {
            // Sprawdź, czy to ćwiczenie z czasem czy powtórzeniami
            if (exercise.planned_duration_seconds && exercise.planned_duration_seconds > 0) {
              return {
                type: "set_countdown",
                setNumber: currentSetNumber,
                remainingSeconds: exercise.planned_duration_seconds,
              };
            } else {
              // Ćwiczenie z powtórzeniami - wyświetl powtórzenia
              return {
                type: "reps_display",
                setNumber: currentSetNumber,
                reps: exercise.planned_reps ?? 0,
              };
            }
          } else {
            // Jeśli ćwiczenie nie ma planowanych wartości, ustaw stan oczekiwania
            return { type: "waiting" };
          }
        });
      });
    }
  }, [exercise.id, currentSetNumber, exercise.planned_duration_seconds, exercise.planned_reps]);


  return {
    timerState,
    startSetTimer,
    startRestBetweenTimer,
    startRestAfterSeriesTimer,
    resetTimer,
  };
}
