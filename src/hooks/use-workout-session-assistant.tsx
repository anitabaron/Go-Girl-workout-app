"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { SessionDetailDTO, SessionExerciseDTO } from "@/types";
import { useWorkoutSessionStore } from "@/stores/workout-session-store";
import { useSaveExercise } from "@/hooks/use-save-exercise";
import { useSessionForm } from "@/hooks/use-session-form";
import { useSessionTimer } from "@/hooks/use-session-timer";
import { useSessionNavigation } from "@/hooks/use-session-navigation";
import { useAutoPause } from "@/hooks/use-auto-pause";
import { ExerciseTimer } from "@/components/workout-sessions/assistant/exercise-timer";
import type { FormErrors } from "@/types/workout-session-assistant";

export type UseWorkoutSessionAssistantProps = {
  readonly sessionId: string;
  readonly initialSession: SessionDetailDTO;
};

export type UseWorkoutSessionAssistantResult = {
  session: SessionDetailDTO | null;
  currentExercise: SessionExerciseDTO | undefined;
  currentExerciseIndex: number;
  formData: ReturnType<typeof useSessionForm>["formData"];
  setFormData: ReturnType<typeof useSessionForm>["setFormData"];
  formErrors: FormErrors;
  currentSetNumber: number;
  isPaused: boolean;
  autosaveStatus: "idle" | "saving" | "saved" | "error";
  autosaveError: string | undefined;
  canGoNext: boolean;
  canGoPrevious: boolean;
  exerciseTimerContent: React.ReactNode;
  handleExit: () => Promise<void>;
  handlePrevious: () => void;
  handleNext: () => Promise<void>;
  handleSkip: () => Promise<void>;
  handlePause: () => Promise<void>;
  handleResume: () => Promise<void>;
  stopTimer: () => Promise<void>;
};

/**
 * Hook encapsulating all orchestration logic for the workout session assistant.
 * Returns derived state and handlers for the presentational component.
 */
export function useWorkoutSessionAssistant({
  sessionId,
  initialSession,
}: UseWorkoutSessionAssistantProps): UseWorkoutSessionAssistantResult {
  const router = useRouter();
  const resetStore = useWorkoutSessionStore((s) => s.resetStore);
  const setAutosaveStatus = useWorkoutSessionStore((s) => s.setAutosaveStatus);

  useEffect(() => {
    resetStore(sessionId, initialSession);
  }, [sessionId, initialSession, resetStore]);

  const { saveExercise, autosaveStatus, autosaveError } = useSaveExercise();

  const {
    formData,
    setFormData,
    formDataRef,
    formErrors,
    validateForm,
    currentSetNumber,
    handleSetComplete,
    handleRestBetweenComplete,
    handleRepsComplete,
    currentExercise,
  } = useSessionForm();

  const {
    isPaused,
    stopTimer,
    handlePause,
    handleResume,
    timerInitializedRef,
    isMountedRef,
    isFirstRenderRef,
  } = useSessionTimer(sessionId, saveExercise);

  const {
    handleNext,
    handlePrevious,
    handleSkip,
    markAutoTransition,
    isAutoTransitioningRef,
  } = useSessionNavigation(sessionId, saveExercise, formDataRef, validateForm);

  const { autoPause } = useAutoPause(sessionId, stopTimer, saveExercise, {
    timerInitializedRef,
    isMountedRef,
    isFirstRenderRef,
    isAutoTransitioningRef,
    formDataRef,
  });

  useEffect(() => {
    if (autosaveStatus === "saved") {
      const timer = setTimeout(() => {
        setAutosaveStatus("idle");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [autosaveStatus, setAutosaveStatus]);

  const handleRestAfterSeriesComplete = useCallback(() => {
    markAutoTransition();
    void handleNext();
  }, [markAutoTransition, handleNext]);

  const session = useWorkoutSessionStore((s) => s.session);
  const currentExerciseIndex = useWorkoutSessionStore(
    (s) => s.currentExerciseIndex,
  );

  const canGoNext = useMemo(() => {
    if (!formData) return false;
    if (formData.is_skipped) return true;
    if (formData.sets.length === 0) return false;
    const errors = validateForm(formData);
    return Object.keys(errors).length === 0;
  }, [formData, validateForm]);

  const canGoPrevious = currentExerciseIndex > 0;

  const handleExit = useCallback(async () => {
    try {
      await autoPause(true);
    } catch {
      // Ignoruj błędy - przekieruj użytkownika
    } finally {
      router.push("/");
    }
  }, [autoPause, router]);

  const exerciseTimerContent = useMemo(
    () =>
      currentExercise ? (
        <ExerciseTimer
          exercise={currentExercise}
          currentSetNumber={currentSetNumber}
          isPaused={isPaused}
          onSetComplete={handleSetComplete}
          onRestBetweenComplete={handleRestBetweenComplete}
          onRestAfterSeriesComplete={handleRestAfterSeriesComplete}
          onRepsComplete={handleRepsComplete}
        />
      ) : null,
    [
      currentExercise,
      currentSetNumber,
      isPaused,
      handleSetComplete,
      handleRestBetweenComplete,
      handleRestAfterSeriesComplete,
      handleRepsComplete,
    ],
  );

  return {
    session,
    currentExercise,
    currentExerciseIndex,
    formData,
    setFormData,
    formErrors,
    currentSetNumber,
    isPaused,
    autosaveStatus,
    autosaveError,
    canGoNext,
    canGoPrevious,
    exerciseTimerContent,
    handleExit,
    handlePrevious,
    handleNext,
    handleSkip,
    handlePause,
    handleResume,
    stopTimer,
  };
}
