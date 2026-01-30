"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import {
  type ExerciseFormData,
  formDataToAutosaveCommand,
} from "@/types/workout-session-assistant";
import { patchWorkoutSessionExercise } from "@/lib/api/workout-sessions";
import { useWorkoutSessionStore } from "@/stores/workout-session-store";

/**
 * Hook do zapisywania ćwiczenia w sesji treningowej.
 * Używa store Zustand i warstwy API.
 */
export function useSaveExercise() {
  const sessionId = useWorkoutSessionStore((s) => s.sessionId);
  const session = useWorkoutSessionStore((s) => s.session);
  const currentExerciseIndex = useWorkoutSessionStore(
    (s) => s.currentExerciseIndex,
  );
  const setSession = useWorkoutSessionStore((s) => s.setSession);
  const setAutosaveStatus = useWorkoutSessionStore((s) => s.setAutosaveStatus);
  const setAutosaveError = useWorkoutSessionStore((s) => s.setAutosaveError);

  const autosaveStatus = useWorkoutSessionStore((s) => s.autosaveStatus);
  const autosaveError = useWorkoutSessionStore((s) => s.autosaveError);

  const saveExercise = useCallback(
    async (
      data: ExerciseFormData,
      advanceCursor: boolean,
    ): Promise<boolean> => {
      if (!sessionId || !session) return false;

      const currentExercise = session.exercises[currentExerciseIndex];
      if (!currentExercise) return false;

      setAutosaveStatus("saving");
      setAutosaveError(undefined);

      try {
        const command = formDataToAutosaveCommand(data, advanceCursor);
        const result = await patchWorkoutSessionExercise(
          sessionId,
          currentExercise.exercise_order,
          command,
        );
        const updatedExercise = result.data;

        setSession((prev) => ({
          ...prev,
          exercises: prev.exercises.map((ex) =>
            ex.exercise_order === currentExercise.exercise_order
              ? updatedExercise
              : ex,
          ),
          current_position:
            result.data.cursor?.current_position ?? prev.current_position,
        }));

        setAutosaveStatus("saved");
        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Błąd zapisu ćwiczenia";
        setAutosaveError(errorMessage);
        setAutosaveStatus("error");
        toast.error(errorMessage);
        return false;
      }
    },
    [
      sessionId,
      session,
      currentExerciseIndex,
      setSession,
      setAutosaveStatus,
      setAutosaveError,
    ],
  );

  return {
    saveExercise,
    autosaveStatus,
    setAutosaveStatus,
    autosaveError,
  };
}
