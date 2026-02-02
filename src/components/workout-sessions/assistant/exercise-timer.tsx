"use client";

import { useMemo, useCallback } from "react";
import type { ExerciseTimerProps } from "@/types/workout-session-assistant";
import { useExerciseTimer } from "@/hooks/use-exercise-timer";
import { SetCountdownTimer } from "./exercise-timer/set-countdown-timer";
import { RepsDisplay } from "./exercise-timer/reps-display";
import { RestBetweenSetsTimer } from "./exercise-timer/rest-between-sets-timer";
import { RestAfterSeriesTimer } from "./exercise-timer/rest-after-series-timer";

/**
 * Główny komponent timera ćwiczenia.
 * Zarządza stanem timera i przejściami między różnymi fazami ćwiczenia
 * (seria, przerwa między seriami, przerwa po seriach).
 * Timer działa tylko wtedy, gdy asystent treningowy jest otwarty i aktywny.
 */
export function ExerciseTimer({
  exercise,
  currentSetNumber,
  isPaused,
  onSetComplete,
  onRestBetweenComplete,
  onRestAfterSeriesComplete,
  onRepsComplete,
}: Readonly<ExerciseTimerProps>) {
  // Walidacja: sprawdź, czy ćwiczenie ma planowane wartości
  const hasPlannedValues = useMemo(() => {
    return (
      (exercise.planned_duration_seconds !== null &&
        exercise.planned_duration_seconds > 0) ||
      (exercise.planned_reps !== null && exercise.planned_reps > 0)
    );
  }, [exercise.planned_duration_seconds, exercise.planned_reps]);

  // Walidacja numeru serii
  const isValidSetNumber = useMemo(() => {
    if (currentSetNumber < 1) return false;
    if (
      exercise.planned_sets !== null &&
      currentSetNumber > exercise.planned_sets
    ) {
      return false;
    }
    return true;
  }, [currentSetNumber, exercise.planned_sets]);

  // Hook do zarządzania logiką timera (zawsze wywoływany, zgodnie z zasadami React)
  const { timerState, startRestBetweenTimer, startRestAfterSeriesTimer } =
    useExerciseTimer(
      exercise,
      currentSetNumber,
      isPaused,
      onSetComplete,
      onRestBetweenComplete,
      onRestAfterSeriesComplete,
    );

  // Callbacki do obsługi zakończenia serii - automatyczne przejście do przerwy
  const handleSetCompleteWithTransition = useCallback(() => {
    const plannedSets = exercise.planned_sets ?? 1;
    const isLastSet = currentSetNumber >= plannedSets;

    // Wywołaj callback zakończenia serii
    onSetComplete();

    // Automatycznie przejdź do odpowiedniej przerwy
    if (isLastSet) {
      // Ostatnia seria - przejdź do przerwy po seriach
      startRestAfterSeriesTimer();
    } else {
      // Nie ostatnia seria - przejdź do przerwy między seriami
      startRestBetweenTimer();
    }
  }, [
    currentSetNumber,
    exercise.planned_sets,
    onSetComplete,
    startRestBetweenTimer,
    startRestAfterSeriesTimer,
  ]);

  // Callback do obsługi zakończenia powtórzeń - podobnie jak handleSetCompleteWithTransition
  const handleRepsCompleteWithTransition = useCallback(() => {
    const plannedSets = exercise.planned_sets ?? 1;
    const isLastSet = currentSetNumber >= plannedSets;

    // Wywołaj callback zakończenia powtórzeń
    onRepsComplete();

    // Automatycznie przejdź do odpowiedniej przerwy
    if (isLastSet) {
      // Ostatnia seria - przejdź do przerwy po seriach
      startRestAfterSeriesTimer();
    } else {
      // Nie ostatnia seria - przejdź do przerwy między seriami
      startRestBetweenTimer();
    }
  }, [
    currentSetNumber,
    exercise.planned_sets,
    onRepsComplete,
    startRestBetweenTimer,
    startRestAfterSeriesTimer,
  ]);

  // Jeśli ćwiczenie nie ma planowanych wartości lub numer serii jest nieprawidłowy, nie wyświetlaj timera
  if (!hasPlannedValues || !isValidSetNumber) {
    return null;
  }

  const isUnilateral = exercise.exercise_is_unilateral_at_time ?? false;
  const displayMultiplier = isUnilateral ? 2 : 1;

  switch (timerState.type) {
    case "waiting":
      return null;

    case "set_countdown":
      return (
        <SetCountdownTimer
          durationSeconds={timerState.remainingSeconds * displayMultiplier}
          isPaused={isPaused}
          onComplete={handleSetCompleteWithTransition}
        />
      );

    case "reps_display":
      return (
        <RepsDisplay
          reps={timerState.reps * displayMultiplier}
          setNumber={timerState.setNumber}
          onComplete={handleRepsCompleteWithTransition}
        />
      );

    case "rest_between_sets":
      return (
        <RestBetweenSetsTimer
          restSeconds={timerState.remainingSeconds}
          isPaused={isPaused}
          onComplete={onRestBetweenComplete}
        />
      );

    case "rest_after_series":
      return (
        <RestAfterSeriesTimer
          restSeconds={timerState.remainingSeconds}
          isPaused={isPaused}
          onComplete={onRestAfterSeriesComplete}
        />
      );

    default:
      return null;
  }
}
