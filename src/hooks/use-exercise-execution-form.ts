"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
} from "react";
import type { SessionExerciseDTO } from "@/types";
import type {
  ExerciseFormData,
  SetLogFormData,
} from "@/types/workout-session-assistant";
import { exerciseToFormData } from "@/types/workout-session-assistant";

export type SummaryValues = {
  count_sets: number | "-";
  sum_reps: number | "-";
  duration_seconds: number | "-";
  rest_seconds: number | null | "-";
};

export function useExerciseExecutionForm(
  exercise: SessionExerciseDTO,
  onChange: (data: ExerciseFormData) => void,
) {
  const initialFormData = useMemo(
    () => exerciseToFormData(exercise),
    [exercise],
  );

  const [formData, setFormData] = useState<ExerciseFormData>(initialFormData);
  const prevExerciseIdRef = useRef<string | number | undefined>(exercise.id);

  const calculateActuals = useCallback(
    (sets: SetLogFormData[]) => {
      const actualCountSets = sets.length;

      let actualSumReps: number | null = null;
      if (
        exercise.planned_reps !== null &&
        exercise.planned_reps !== undefined
      ) {
        const sum = sets.reduce((sum, set) => sum + (set.reps ?? 0), 0);
        actualSumReps = sum > 0 ? sum : null;
      }

      let actualDurationSeconds: number | null = null;
      if (
        exercise.planned_duration_seconds !== null &&
        exercise.planned_duration_seconds !== undefined
      ) {
        const durations = sets
          .map((set) => set.duration_seconds)
          .filter((d): d is number => d !== null && d !== undefined);
        if (durations.length > 0) {
          actualDurationSeconds = Math.max(...durations);
        }
      }

      const actualRestSeconds = exercise.planned_rest_seconds ?? null;

      return {
        actual_count_sets: actualCountSets > 0 ? actualCountSets : null,
        actual_sum_reps: actualSumReps,
        actual_duration_seconds: actualDurationSeconds,
        actual_rest_seconds: actualRestSeconds,
      };
    },
    [
      exercise.planned_reps,
      exercise.planned_duration_seconds,
      exercise.planned_rest_seconds,
    ],
  );

  useEffect(() => {
    if (prevExerciseIdRef.current === exercise.id) {
      return;
    }

    prevExerciseIdRef.current = exercise.id;

    startTransition(() => {
      const newData = exerciseToFormData(exercise);
      setFormData(newData);
      onChange(newData);
    });
  }, [exercise, onChange]);

  const updateFormData = useCallback(
    (updates: Partial<ExerciseFormData>) => {
      const newFormData = { ...formData, ...updates };

      if (updates.sets !== undefined) {
        const calculated = calculateActuals(updates.sets);
        newFormData.actual_count_sets = calculated.actual_count_sets;
        newFormData.actual_sum_reps = calculated.actual_sum_reps;
        newFormData.actual_duration_seconds =
          calculated.actual_duration_seconds;
        newFormData.actual_rest_seconds = calculated.actual_rest_seconds;
      }

      setFormData(newFormData);
      onChange(newFormData);
    },
    [formData, onChange, calculateActuals],
  );

  const summaryValues = useMemo((): SummaryValues => {
    if (formData.is_skipped) {
      return {
        count_sets: "-",
        sum_reps: "-",
        duration_seconds: "-",
        rest_seconds: "-",
      };
    }

    const countSets = formData.sets.length;
    const sumReps = formData.sets.reduce(
      (sum, set) => sum + (set.reps ?? 0),
      0,
    );
    const maxDuration = formData.sets.reduce(
      (max, set) => Math.max(max, set.duration_seconds ?? 0),
      0,
    );
    const restSeconds = exercise.planned_rest_seconds ?? null;

    return {
      count_sets: Math.max(0, countSets),
      sum_reps: Math.max(0, sumReps),
      duration_seconds: Math.max(0, maxDuration),
      rest_seconds: restSeconds,
    };
  }, [formData.sets, formData.is_skipped, exercise.planned_rest_seconds]);

  const handleSetAdd = useCallback(() => {
    const nextSetNumber =
      formData.sets.length > 0
        ? Math.max(...formData.sets.map((s) => s.set_number)) + 1
        : 1;

    const newSet: SetLogFormData = {
      set_number: nextSetNumber,
      reps: null,
      duration_seconds: null,
      weight_kg: null,
    };

    updateFormData({
      sets: [...formData.sets, newSet],
    });
  }, [formData.sets, updateFormData]);

  const handleSetUpdate = useCallback(
    (index: number, set: SetLogFormData) => {
      const newSets = [...formData.sets];
      newSets[index] = set;
      updateFormData({ sets: newSets });
    },
    [formData.sets, updateFormData],
  );

  const handleSetRemove = useCallback(
    (index: number) => {
      const newSets = formData.sets.filter((_, i) => i !== index);
      updateFormData({ sets: newSets });
    },
    [formData.sets, updateFormData],
  );

  const handleSkipToggle = useCallback(
    (checked: boolean) => {
      updateFormData({ is_skipped: checked });
    },
    [updateFormData],
  );

  return {
    formData,
    summaryValues,
    handlers: {
      handleSetAdd,
      handleSetUpdate,
      handleSetRemove,
      handleSkipToggle,
    },
  };
}
