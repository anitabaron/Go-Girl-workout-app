"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import type {
  ExerciseTimerProps,
  UnilateralSide,
} from "@/types/workout-session-assistant";
import { useExerciseTimer } from "@/hooks/use-exercise-timer";
import { useUnilateralDisplay } from "./UnilateralDisplayContext";
import { SetCountdownTimerM3 } from "./SetCountdownTimerM3";
import { RepsDisplayM3 } from "./RepsDisplayM3";
import { RestBetweenSetsTimerM3 } from "./RestBetweenSetsTimerM3";
import { RestAfterSeriesTimerM3 } from "./RestAfterSeriesTimerM3";

type UnilateralPhase = "one_side" | "other_side";

/**
 * M3 version of ExerciseTimer – manages timer state and transitions.
 * For unilateral exercises: displays one_side phases (with autosave) then other_side phases (display only, no autosave).
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
  const { setDisplayInfo } = useUnilateralDisplay() ?? {};
  const isUnilateral = exercise.exercise_is_unilateral_at_time ?? false;
  const plannedSets = exercise.planned_sets ?? 1;

  const [unilateralPhase, setUnilateralPhase] =
    useState<UnilateralPhase>("one_side");
  const [unilateralDisplaySetIndex, setUnilateralDisplaySetIndex] = useState(1);

  const effectiveSetNumber =
    isUnilateral && unilateralPhase === "other_side"
      ? unilateralDisplaySetIndex
      : currentSetNumber;

  const wrappedOnRestBetweenComplete = useCallback(() => {
    if (
      isUnilateral &&
      unilateralPhase === "one_side" &&
      currentSetNumber >= plannedSets
    ) {
      setUnilateralPhase("other_side");
      setUnilateralDisplaySetIndex(1);
      return;
    }
    if (
      isUnilateral &&
      unilateralPhase === "other_side" &&
      unilateralDisplaySetIndex < plannedSets
    ) {
      setUnilateralDisplaySetIndex((i) => i + 1);
      return;
    }
    onRestBetweenComplete();
  }, [
    isUnilateral,
    unilateralPhase,
    unilateralDisplaySetIndex,
    currentSetNumber,
    plannedSets,
    onRestBetweenComplete,
  ]);

  const { timerState, startRestBetweenTimer, startRestAfterSeriesTimer } =
    useExerciseTimer(
      exercise,
      effectiveSetNumber,
      isPaused,
      onSetComplete,
      wrappedOnRestBetweenComplete,
      onRestAfterSeriesComplete,
    );

  let sideLabel: UnilateralSide | null = null;
  if (isUnilateral && unilateralPhase === "one_side") {
    sideLabel = "one_side";
  } else if (isUnilateral && unilateralPhase === "other_side") {
    sideLabel = "other_side";
  }

  useEffect(() => {
    if (!setDisplayInfo) return;
    if (isUnilateral && timerState.type !== "waiting") {
      setDisplayInfo({
        displaySetNumber: effectiveSetNumber,
        side: sideLabel,
      });
    } else {
      setDisplayInfo(null);
    }
    return () => {
      setDisplayInfo(null);
    };
  }, [
    setDisplayInfo,
    isUnilateral,
    effectiveSetNumber,
    sideLabel,
    timerState.type,
  ]);

  const hasPlannedValues = useMemo(
    () =>
      (exercise.planned_duration_seconds !== null &&
        exercise.planned_duration_seconds > 0) ||
      (exercise.planned_reps !== null && exercise.planned_reps > 0),
    [exercise.planned_duration_seconds, exercise.planned_reps],
  );

  const isValidSetNumber = useMemo(() => {
    if (effectiveSetNumber < 1) return false;
    if (effectiveSetNumber > plannedSets) return false;
    return true;
  }, [effectiveSetNumber, plannedSets]);

  const handleSetCompleteWithTransition = useCallback(() => {
    const isLastSet = effectiveSetNumber >= plannedSets;
    const isOtherSide = isUnilateral && unilateralPhase === "other_side";

    if (!isOtherSide) {
      onSetComplete();
    }

    if (isOtherSide && isLastSet) {
      startRestAfterSeriesTimer();
    } else if (isOtherSide && !isLastSet) {
      startRestBetweenTimer();
    } else if (!isOtherSide && isLastSet && isUnilateral) {
      startRestBetweenTimer();
    } else if (!isOtherSide && isLastSet) {
      startRestAfterSeriesTimer();
    } else {
      startRestBetweenTimer();
    }
  }, [
    effectiveSetNumber,
    plannedSets,
    isUnilateral,
    unilateralPhase,
    onSetComplete,
    startRestBetweenTimer,
    startRestAfterSeriesTimer,
  ]);

  const handleRepsCompleteWithTransition = useCallback(() => {
    const isLastSet = effectiveSetNumber >= plannedSets;
    const isOtherSide = isUnilateral && unilateralPhase === "other_side";

    if (!isOtherSide) {
      onRepsComplete();
    }

    if (isOtherSide && isLastSet) {
      startRestAfterSeriesTimer();
    } else if (isOtherSide && !isLastSet) {
      startRestBetweenTimer();
    } else if (!isOtherSide && isLastSet && isUnilateral) {
      startRestBetweenTimer();
    } else if (!isOtherSide && isLastSet) {
      startRestAfterSeriesTimer();
    } else {
      startRestBetweenTimer();
    }
  }, [
    effectiveSetNumber,
    plannedSets,
    isUnilateral,
    unilateralPhase,
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
          sideLabel={sideLabel}
          onComplete={handleSetCompleteWithTransition}
        />
      );
    case "reps_display":
      return (
        <RepsDisplayM3
          reps={timerState.reps}
          setNumber={timerState.setNumber}
          sideLabel={sideLabel}
          onComplete={handleRepsCompleteWithTransition}
        />
      );
    case "rest_between_sets":
      return (
        <RestBetweenSetsTimerM3
          restSeconds={timerState.remainingSeconds}
          isPaused={isPaused}
          onComplete={wrappedOnRestBetweenComplete}
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
