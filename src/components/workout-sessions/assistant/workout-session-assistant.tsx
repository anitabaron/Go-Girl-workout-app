"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { SessionDetailDTO } from "@/types";
import { useWorkoutSessionStore } from "@/stores/workout-session-store";
import { useSaveExercise } from "@/hooks/use-save-exercise";
import { useSessionForm } from "@/hooks/use-session-form";
import { useSessionTimer } from "@/hooks/use-session-timer";
import { useSessionNavigation } from "@/hooks/use-session-navigation";
import { useAutoPause } from "@/hooks/use-auto-pause";
import { WorkoutTimer } from "./workout-timer";
import { ExerciseTimer } from "./exercise-timer";
import { CurrentExerciseInfo } from "./current-exercise-info";
import { ExerciseExecutionForm } from "./exercise-execution-form";
import { NavigationButtons } from "./navigation-buttons";
import { AutosaveIndicator } from "./autosave-indicator";
import { ExitSessionButton } from "./exit-session-button";

export type WorkoutSessionAssistantProps = {
  readonly sessionId: string;
  readonly initialSession: SessionDetailDTO;
};

/**
 * Główny komponent asystenta treningowego.
 * Zarządza stanem sesji przez Zustand, koordynuje hooki i renderuje UI.
 */
export function WorkoutSessionAssistant({
  sessionId,
  initialSession,
}: Readonly<WorkoutSessionAssistantProps>) {
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

  const { autoPause } = useAutoPause(
    sessionId,
    stopTimer,
    saveExercise,
    timerInitializedRef,
    isMountedRef,
    isFirstRenderRef,
    isAutoTransitioningRef,
    formDataRef,
  );

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

  const handleExit = async () => {
    try {
      await autoPause(true);
    } catch {
      // Ignoruj błędy - przekieruj użytkownika
    } finally {
      router.push("/");
    }
  };

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

  if (!currentExercise) {
    return (
      <div className="fixed inset-x-0 top-0 bottom-16 md:bottom-0 flex items-center justify-center bg-secondary">
        <p className="text-lg">Brak ćwiczeń w sesji</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 top-0 bottom-16 md:bottom-0 flex flex-col bg-secondary overflow-hidden">
      <ExitSessionButton onExit={handleExit} />

      <AutosaveIndicator status={autosaveStatus} errorMessage={autosaveError} />

      <div className="flex-1 overflow-y-auto md:pt-16">
        <div className="mx-auto w-full max-w-4xl px-4 py-6 space-y-6">
          <WorkoutTimer
            activeDurationSeconds={session.active_duration_seconds ?? 0}
            lastTimerStartedAt={session.last_timer_started_at ?? null}
            lastTimerStoppedAt={session.last_timer_stopped_at ?? null}
            isPaused={isPaused}
            currentSetNumber={currentSetNumber}
            currentExerciseIndex={currentExerciseIndex}
            totalExercises={session.exercises.length}
            exerciseTimerContent={exerciseTimerContent}
            onTimerStop={stopTimer}
          />

          <CurrentExerciseInfo exercise={currentExercise} />

          <ExerciseExecutionForm
            exercise={currentExercise}
            onChange={setFormData}
            errors={formErrors}
          />
        </div>
      </div>

      <div className="border-t border-border bg-white p-4 dark:border-border dark:bg-zinc-950">
        <div className="mx-auto w-full max-w-4xl">
          <NavigationButtons
            onPrevious={handlePrevious}
            onPause={handlePause}
            onResume={handleResume}
            onSkip={handleSkip}
            onNext={handleNext}
            isPaused={isPaused}
            canGoPrevious={canGoPrevious}
            canGoNext={canGoNext}
            isLoading={autosaveStatus === "saving"}
          />
        </div>
      </div>
    </div>
  );
}
