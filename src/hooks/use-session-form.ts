"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  type ExerciseFormData,
  type FormErrors,
  type SetLogFormData,
  exerciseToFormData,
} from "@/types/workout-session-assistant";
import { useWorkoutSessionStore } from "@/stores/workout-session-store";

/**
 * Waliduje formularz ćwiczenia.
 */
function validateForm(data: ExerciseFormData): FormErrors {
  const errors: FormErrors = {};

  if (data.is_skipped) {
    return errors;
  }

  if (data.sets.length === 0) {
    errors._form = [
      "Dodaj co najmniej jedną serię lub zaznacz 'Pomiń ćwiczenie'",
    ];
    return errors;
  }

  const setErrors: Record<number, string> = {};
  let hasValidSet = false;

  data.sets.forEach((set, index) => {
    const hasReps = set.reps !== null && set.reps >= 0;
    const hasDuration =
      set.duration_seconds !== null && set.duration_seconds >= 0;
    const hasWeight = set.weight_kg !== null && set.weight_kg >= 0;

    if (!hasReps && !hasDuration && !hasWeight) {
      setErrors[index] =
        "Podaj co najmniej jedną metrykę (powtórzenia, czas lub wagę)";
    } else {
      hasValidSet = true;
    }

    if (set.reps !== null && set.reps < 0) {
      setErrors[index] = "Liczba powtórzeń nie może być ujemna";
    }
    if (set.duration_seconds !== null && set.duration_seconds < 0) {
      setErrors[index] = "Czas trwania nie może być ujemny";
    }
    if (set.weight_kg !== null && set.weight_kg < 0) {
      setErrors[index] = "Waga nie może być ujemna";
    }
  });

  if (Object.keys(setErrors).length > 0) {
    errors.sets = setErrors;
  }

  if (!hasValidSet) {
    errors._form = [
      "Dodaj co najmniej jedną serię z metrykami lub zaznacz 'Pomiń ćwiczenie'",
    ];
  }

  return errors;
}

/**
 * Hook do zarządzania formularzem sesji treningowej.
 */
export function useSessionForm() {
  const session = useWorkoutSessionStore((s) => s.session);
  const currentExerciseIndex = useWorkoutSessionStore(
    (s) => s.currentExerciseIndex,
  );
  const formData = useWorkoutSessionStore((s) => s.formData);
  const formErrors = useWorkoutSessionStore((s) => s.formErrors);
  const currentSetNumber = useWorkoutSessionStore((s) => s.currentSetNumber);

  const setFormData = useWorkoutSessionStore((s) => s.setFormData);
  const setFormErrors = useWorkoutSessionStore((s) => s.setFormErrors);
  const setCurrentSetNumber = useWorkoutSessionStore(
    (s) => s.setCurrentSetNumber,
  );

  const formDataRef = useRef<ExerciseFormData | null>(formData);

  const currentExercise =
    session?.exercises[currentExerciseIndex] ?? session?.exercises[0];

  const setFormDataWithRef = useCallback(
    (
      updater:
        | ExerciseFormData
        | ((prev: ExerciseFormData) => ExerciseFormData),
    ) => {
      setFormData((prev) => {
        const newFormData: ExerciseFormData =
          typeof updater === "function" && prev
            ? (updater as (p: ExerciseFormData) => ExerciseFormData)(prev)
            : (updater as ExerciseFormData);
        formDataRef.current = newFormData;
        return newFormData;
      });
    },
    [setFormData],
  );

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  useEffect(() => {
    if (currentExercise && formData) {
      const newFormData = exerciseToFormData(currentExercise);
      setFormDataWithRef(newFormData);
      setFormErrors({});
      setCurrentSetNumber(1);
    }
  }, [currentExercise]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateSetInForm = useCallback(
    (setNumber: number, updates: Partial<SetLogFormData>) => {
      if (!currentExercise) return;

      setFormDataWithRef((prev) => {
        const setIndex = prev.sets.findIndex(
          (set) => set.set_number === setNumber,
        );

        let newFormData: ExerciseFormData;

        if (setIndex === -1) {
          const newSet: SetLogFormData = {
            set_number: setNumber,
            reps: currentExercise.planned_reps ?? null,
            duration_seconds: currentExercise.planned_duration_seconds ?? null,
            weight_kg: null,
            ...updates,
          };
          const newSets = [...prev.sets, newSet].sort(
            (a, b) => a.set_number - b.set_number,
          );
          newFormData = { ...prev, sets: newSets };
        } else {
          const newSets = [...prev.sets];
          newSets[setIndex] = { ...newSets[setIndex], ...updates };
          newFormData = { ...prev, sets: newSets };
        }

        return newFormData;
      });
    },
    [currentExercise, setFormDataWithRef],
  );

  const handleSetComplete = useCallback(() => {
    if (!currentExercise) return;
    if (
      currentExercise.planned_duration_seconds &&
      currentExercise.planned_duration_seconds > 0
    ) {
      updateSetInForm(currentSetNumber, {
        duration_seconds: currentExercise.planned_duration_seconds,
      });
    }
  }, [currentSetNumber, currentExercise, updateSetInForm]);

  const handleRestBetweenComplete = useCallback(() => {
    if (!currentExercise) return;
    const nextSetNumber = currentSetNumber + 1;
    const plannedSets = currentExercise.planned_sets ?? 1;

    if (nextSetNumber <= plannedSets) {
      setCurrentSetNumber(nextSetNumber);
      updateSetInForm(nextSetNumber, {});
    }
  }, [currentSetNumber, currentExercise, setCurrentSetNumber, updateSetInForm]);

  const handleRepsComplete = useCallback(() => {
    if (!currentExercise) return;
    if (currentExercise.planned_reps && currentExercise.planned_reps > 0) {
      updateSetInForm(currentSetNumber, {
        reps: currentExercise.planned_reps,
      });
    }
  }, [currentSetNumber, currentExercise, updateSetInForm]);

  return {
    formData,
    setFormData: setFormDataWithRef,
    formDataRef,
    formErrors,
    setFormErrors,
    updateSetInForm,
    validateForm,
    currentSetNumber,
    setCurrentSetNumber,
    handleSetComplete,
    handleRestBetweenComplete,
    handleRepsComplete,
    currentExercise,
  };
}
