"use client";

import type { SessionDetailDTO } from "@/types";
import { useWorkoutSessionAssistant } from "@/hooks/use-workout-session-assistant";
import { WorkoutTimer } from "./workout-timer";
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
 * Cienki warstwa prezentacyjna – logika orchestracji w useWorkoutSessionAssistant.
 */
export function WorkoutSessionAssistant({
  sessionId,
  initialSession,
}: Readonly<WorkoutSessionAssistantProps>) {
  const {
    session,
    currentExercise,
    currentExerciseIndex,
    currentSetNumber,
    setFormData,
    formErrors,
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
  } = useWorkoutSessionAssistant({ sessionId, initialSession });

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
