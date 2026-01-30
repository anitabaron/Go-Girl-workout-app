"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type {
  ExerciseFormData,
  FormErrors,
} from "@/types/workout-session-assistant";
import { patchWorkoutSessionStatus } from "@/lib/api/workout-sessions";
import { useWorkoutSessionStore } from "@/stores/workout-session-store";

type SaveExerciseFn = (
  data: ExerciseFormData,
  advanceCursor: boolean,
) => Promise<boolean>;
type ValidateFormFn = (data: ExerciseFormData) => FormErrors;

/**
 * Hook do nawigacji między ćwiczeniami w sesji treningowej.
 */
export function useSessionNavigation(
  sessionId: string,
  saveExercise: SaveExerciseFn,
  formDataRef: React.RefObject<ExerciseFormData | null>,
  validateForm: ValidateFormFn,
) {
  const router = useRouter();
  const session = useWorkoutSessionStore((s) => s.session);
  const currentExerciseIndex = useWorkoutSessionStore(
    (s) => s.currentExerciseIndex,
  );
  const setCurrentExerciseIndex = useWorkoutSessionStore(
    (s) => s.setCurrentExerciseIndex,
  );
  const setSession = useWorkoutSessionStore((s) => s.setSession);
  const setFormErrors = useWorkoutSessionStore((s) => s.setFormErrors);

  const isAutoTransitioningRef = useRef(false);

  const markAutoTransition = useCallback(() => {
    isAutoTransitioningRef.current = true;
    setTimeout(() => {
      isAutoTransitioningRef.current = false;
    }, 2000);
  }, []);

  const handleNext = useCallback(async () => {
    const currentFormData = formDataRef.current;
    if (!currentFormData) return;

    const errors = validateForm(currentFormData);
    if (Object.keys(errors).length > 0 && !currentFormData.is_skipped) {
      setFormErrors(errors);
      toast.error("Popraw błędy w formularzu przed zapisem");
      return;
    }

    const success = await saveExercise(currentFormData, true);
    if (!success) return;

    const exercises = session?.exercises ?? [];
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
    } else {
      try {
        const result = await patchWorkoutSessionStatus(sessionId, {
          status: "completed",
        });

        setSession((prev) => ({
          ...prev,
          status: "completed" as const,
          completed_at: result.completed_at ?? prev.completed_at,
        }));
        toast.success("Sesja treningowa zakończona!");
        router.push(`/workout-sessions/${sessionId}`);
      } catch {
        toast.error("Błąd podczas zakończenia sesji");
      }
    }
  }, [
    formDataRef,
    validateForm,
    saveExercise,
    session,
    currentExerciseIndex,
    sessionId,
    setCurrentExerciseIndex,
    setSession,
    setFormErrors,
    router,
  ]);

  const handlePrevious = useCallback(() => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(currentExerciseIndex - 1);
      setFormErrors({});
    }
  }, [currentExerciseIndex, setCurrentExerciseIndex, setFormErrors]);

  const handleSkip = useCallback(async () => {
    const skippedData: ExerciseFormData = {
      actual_count_sets: null,
      actual_sum_reps: null,
      actual_duration_seconds: null,
      actual_rest_seconds: null,
      sets: [],
      is_skipped: true,
    };

    const success = await saveExercise(skippedData, true);
    if (!success) return;

    const exercises = session?.exercises ?? [];
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
    } else {
      try {
        const result = await patchWorkoutSessionStatus(sessionId, {
          status: "completed",
        });

        setSession((prev) => ({
          ...prev,
          status: "completed" as const,
          completed_at: result.completed_at ?? prev.completed_at,
        }));
        toast.success("Sesja treningowa zakończona!");
        router.push(`/workout-sessions/${sessionId}`);
      } catch {
        toast.error("Błąd podczas zakończenia sesji");
      }
    }
  }, [
    saveExercise,
    session,
    currentExerciseIndex,
    sessionId,
    setCurrentExerciseIndex,
    setSession,
    router,
  ]);

  return {
    handleNext,
    handlePrevious,
    handleSkip,
    markAutoTransition,
    isAutoTransitioningRef,
  };
}
