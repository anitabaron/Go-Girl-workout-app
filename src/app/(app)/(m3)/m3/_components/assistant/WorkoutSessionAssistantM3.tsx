"use client";

import type { SessionDetailDTO } from "@/types";
import { useWorkoutSessionAssistant } from "@/hooks/use-workout-session-assistant";
import { WorkoutTimerM3 } from "./WorkoutTimerM3";
import { CurrentExerciseInfoM3 } from "./CurrentExerciseInfoM3";
import { ExerciseExecutionFormM3 } from "./ExerciseExecutionFormM3";
import { ExerciseTimerM3 } from "./ExerciseTimerM3";
import { NavigationButtonsM3 } from "./NavigationButtonsM3";
import { AutosaveIndicatorM3 } from "./AutosaveIndicatorM3";
import { ExitSessionButtonM3 } from "./ExitSessionButtonM3";

export type WorkoutSessionAssistantM3Props = {
  readonly sessionId: string;
  readonly initialSession: SessionDetailDTO;
};

/**
 * M3 version of WorkoutSessionAssistant – training assistant UI.
 * Uses M3-styled components and redirects to /m3/workout-sessions on exit.
 */
export function WorkoutSessionAssistantM3({
  sessionId,
  initialSession,
}: Readonly<WorkoutSessionAssistantM3Props>) {
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
    exerciseTimerProps,
    handleExit,
    handlePrevious,
    handleNext,
    handleSkip,
    handlePause,
    handleResume,
    stopTimer,
  } = useWorkoutSessionAssistant({
    sessionId,
    initialSession,
    exitHref: "/m3/workout-sessions",
  });

  if (!currentExercise) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="m3-body">Brak ćwiczeń w sesji</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="flex min-h-[50vh] flex-col overflow-hidden">
      <ExitSessionButtonM3 onExit={handleExit} />

      <AutosaveIndicatorM3
        status={autosaveStatus}
        errorMessage={autosaveError}
      />

      <div className="flex-1 overflow-y-auto pb-[10.5rem] md:pb-0 md:pt-4">
        <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6">
          <WorkoutTimerM3
            activeDurationSeconds={session.active_duration_seconds ?? 0}
            lastTimerStartedAt={session.last_timer_started_at ?? null}
            lastTimerStoppedAt={session.last_timer_stopped_at ?? null}
            isPaused={isPaused}
            currentSetNumber={currentSetNumber}
            currentExerciseIndex={currentExerciseIndex}
            totalExercises={session.exercises.length}
            exerciseTimerContent={
              exerciseTimerProps ? (
                <ExerciseTimerM3 {...exerciseTimerProps} />
              ) : null
            }
            onTimerStop={stopTimer}
          />

          <CurrentExerciseInfoM3 exercise={currentExercise} />

          <ExerciseExecutionFormM3
            exercise={currentExercise}
            onChange={setFormData}
            errors={formErrors}
          />
        </div>
      </div>

      <div className="fixed left-0 right-0 bottom-above-mobile-nav z-40 border-t border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container)] p-4 shadow-[0_-2px_10px_rgb(0_0_0/0.08)] md:static md:bottom-auto md:z-auto md:shadow-none">
        <div className="mx-auto w-full max-w-4xl">
          <NavigationButtonsM3
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
