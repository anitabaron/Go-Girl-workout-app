"use client";

import { useMemo, useCallback } from "react";
import type { ExerciseTimerProps } from "@/types/workout-session-assistant";
import { useExerciseTimer } from "@/hooks/use-exercise-timer";
import { SetCountdownTimerM3 } from "./SetCountdownTimerM3";
import { RepsDisplayM3 } from "./RepsDisplayM3";
import { RestBetweenSetsTimerM3 } from "./RestBetweenSetsTimerM3";
import { RestAfterSeriesTimerM3 } from "./RestAfterSeriesTimerM3";

/**
 * M3 version of ExerciseTimer – manages timer state and transitions.
 * Uses M3-styled subcomponents.
 */
export function ExerciseTimerM3({
  exercise,
  currentSetNumber,
  isPaused,
  onSetComplete,
  onRestBetweenComplete,
  onRestAfterSeriesComplete,
  onRepsComplete,
}: Readonly<ExerciseTimerProps>) {
  const hasPlannedValues = useMemo(
    () =>
      (exercise.planned_duration_seconds !== null &&
        exercise.planned_duration_seconds > 0) ||
      (exercise.planned_reps !== null && exercise.planned_reps > 0),
    [exercise.planned_duration_seconds, exercise.planned_reps],
  );

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

  const { timerState, startRestBetweenTimer, startRestAfterSeriesTimer } =
    useExerciseTimer(
      exercise,
      currentSetNumber,
      isPaused,
      onSetComplete,
      onRestBetweenComplete,
      onRestAfterSeriesComplete,
    );

  const handleSetCompleteWithTransition = useCallback(() => {
    const plannedSets = exercise.planned_sets ?? 1;
    const isLastSet = currentSetNumber >= plannedSets;
    onSetComplete();
    if (isLastSet) {
      startRestAfterSeriesTimer();
    } else {
      startRestBetweenTimer();
    }
  }, [
    currentSetNumber,
    exercise.planned_sets,
    onSetComplete,
    startRestBetweenTimer,
    startRestAfterSeriesTimer,
  ]);

  const handleRepsCompleteWithTransition = useCallback(() => {
    const plannedSets = exercise.planned_sets ?? 1;
    const isLastSet = currentSetNumber >= plannedSets;
    onRepsComplete();
    if (isLastSet) {
      startRestAfterSeriesTimer();
    } else {
      startRestBetweenTimer();
    }
  }, [
    currentSetNumber,
    exercise.planned_sets,
    onRepsComplete,
    startRestBetweenTimer,
    startRestAfterSeriesTimer,
  ]);

  if (!hasPlannedValues || !isValidSetNumber) {
    return null;
  }

  switch (timerState.type) {
    case "waiting":
      return null;
    case "set_countdown":
      return (
        <SetCountdownTimerM3
          durationSeconds={timerState.remainingSeconds}
          isPaused={isPaused}
          onComplete={handleSetCompleteWithTransition}
        />
      );
    case "reps_display":
      return (
        <RepsDisplayM3
          reps={timerState.reps}
          setNumber={timerState.setNumber}
          onComplete={handleRepsCompleteWithTransition}
        />
      );
    case "rest_between_sets":
      return (
        <RestBetweenSetsTimerM3
          restSeconds={timerState.remainingSeconds}
          isPaused={isPaused}
          onComplete={onRestBetweenComplete}
        />
      );
    case "rest_after_series":
      return (
        <RestAfterSeriesTimerM3
          restSeconds={timerState.remainingSeconds}
          isPaused={isPaused}
          onComplete={onRestAfterSeriesComplete}
        />
      );
    default:
      return null;
  }
}
