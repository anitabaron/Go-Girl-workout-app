"use client";

import { useEffect, useState, useMemo, type ReactNode } from "react";
import { CountdownCircleTimer } from "react-countdown-circle-timer";
import { useUnilateralDisplay } from "./UnilateralDisplayContext";

type WorkoutTimerM3Props = {
  activeDurationSeconds: number;
  lastTimerStartedAt: string | null;
  lastTimerStoppedAt: string | null;
  isPaused: boolean;
  currentSetNumber: number;
  currentExerciseIndex: number;
  totalExercises: number;
  restSeconds?: number;
  exerciseTimerContent?: ReactNode;
  onTimerStop?: () => void;
};

export function WorkoutTimerM3({
  activeDurationSeconds,
  lastTimerStartedAt,
  lastTimerStoppedAt,
  isPaused,
  currentSetNumber,
  currentExerciseIndex,
  totalExercises,
  restSeconds,
  exerciseTimerContent,
  onTimerStop,
}: Readonly<WorkoutTimerM3Props>) {
  const unilateralDisplay = useUnilateralDisplay();
  const displaySetNumber =
    unilateralDisplay?.displayInfo?.displaySetNumber ?? currentSetNumber;

  const baseSeconds = useMemo(
    () => activeDurationSeconds || 0,
    [activeDurationSeconds],
  );

  const isTimerStopped = useMemo(() => {
    return (
      lastTimerStoppedAt !== null &&
      (lastTimerStartedAt === null ||
        new Date(lastTimerStoppedAt).getTime() >
          new Date(lastTimerStartedAt).getTime())
    );
  }, [lastTimerStoppedAt, lastTimerStartedAt]);

  const [elapsedSeconds, setElapsedSeconds] = useState(baseSeconds);

  useEffect(() => {
    if (isPaused || isTimerStopped || !lastTimerStartedAt) {
      const rafId = requestAnimationFrame(() => {
        setElapsedSeconds(baseSeconds);
      });
      return () => cancelAnimationFrame(rafId);
    }

    const updateElapsed = () => {
      const now = Date.now();
      const startedAt = new Date(lastTimerStartedAt).getTime();
      const currentElapsed = Math.floor((now - startedAt) / 1000);
      const totalElapsed = baseSeconds + currentElapsed;
      setElapsedSeconds(totalElapsed);
    };

    const immediateRafId = requestAnimationFrame(updateElapsed);
    const interval = setInterval(updateElapsed, 1000);

    return () => {
      cancelAnimationFrame(immediateRafId);
      clearInterval(interval);
    };
  }, [baseSeconds, lastTimerStartedAt, isPaused, isTimerStopped]);

  useEffect(() => {
    return () => {
      if (lastTimerStartedAt && onTimerStop) {
        onTimerStop();
      }
    };
  }, [lastTimerStartedAt, onTimerStop]);

  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  if (restSeconds !== undefined && restSeconds > 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3">
        <CountdownCircleTimer
          isPlaying={!isPaused}
          duration={restSeconds}
          colors={["#ef4444", "#f87171", "#fca5a5"]}
          colorsTime={[restSeconds, restSeconds * 0.5, 0]}
          trailColor="#ffbdc8"
          size={240}
          strokeWidth={12}
        >
          {({ remainingTime }) => (
            <div className="flex flex-col items-center">
              <div className="text-6xl font-bold text-destructive sm:text-7xl md:text-8xl">
                {remainingTime}
              </div>
              <div className="text-sm text-muted-foreground">seconds rest</div>
            </div>
          )}
        </CountdownCircleTimer>
        <div className="text-center">
          <h3 className="m3-title">Set {displaySetNumber}</h3>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Status: {isPaused ? "Paused" : "In progress"}
          </p>
          <p className="text-sm text-muted-foreground">
            Exercise {currentExerciseIndex + 1} of {totalExercises}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="text-center">
        <h3 className="m3-title">Set {displaySetNumber}</h3>
      </div>
      {exerciseTimerContent}
      <div
        className={`flex gap-2 items-center transition-opacity ${
          isPaused ? "" : "animate-pulse"
        }`}
      >
        <div className="text-sm text-muted-foreground">Total workout time</div>
        <div className="text-xl font-semibold text-foreground">
          {formatTime(elapsedSeconds)}
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Exercise {currentExerciseIndex + 1} of {totalExercises}
          </p>
        </div>
      </div>
    </div>
  );
}
