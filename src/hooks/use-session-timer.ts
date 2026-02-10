"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { patchWorkoutSessionTimer } from "@/lib/api/workout-sessions";
import { useWorkoutSessionStore } from "@/stores/workout-session-store";
import type { ExerciseFormData } from "@/types/workout-session-assistant";

type SaveExerciseFn = (
  data: ExerciseFormData,
  advanceCursor: boolean,
) => Promise<boolean>;

/**
 * Hook do zarządzania timerem sesji treningowej.
 * Start on mount, handlePause, handleResume, stopTimer.
 */
export function useSessionTimer(
  sessionId: string,
  saveExercise: SaveExerciseFn,
) {
  const session = useWorkoutSessionStore((s) => s.session);
  const isPaused = useWorkoutSessionStore((s) => s.isPaused);
  const setSession = useWorkoutSessionStore((s) => s.setSession);
  const setIsPaused = useWorkoutSessionStore((s) => s.setIsPaused);

  const timerInitializedRef = useRef(false);
  const timerStateRef = useRef({
    lastTimerStartedAt: session?.last_timer_started_at ?? null,
    lastTimerStoppedAt: session?.last_timer_stopped_at ?? null,
  });
  const sessionStatusRef = useRef(session?.status ?? "draft");
  const isMountedRef = useRef(false);
  const isFirstRenderRef = useRef(true);
  const previousSessionIdRef = useRef<string>(sessionId);

  useEffect(() => {
    if (previousSessionIdRef.current !== sessionId) {
      previousSessionIdRef.current = sessionId;
      timerInitializedRef.current = false;
      isMountedRef.current = false;
      isFirstRenderRef.current = true;
      if (session) {
        timerStateRef.current = {
          lastTimerStartedAt: session.last_timer_started_at ?? null,
          lastTimerStoppedAt: session.last_timer_stopped_at ?? null,
        };
        sessionStatusRef.current = session.status;
      }
    }
    // session needed for timer state sync on sessionId change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    if (session) {
      timerStateRef.current = {
        lastTimerStartedAt: session.last_timer_started_at ?? null,
        lastTimerStoppedAt: session.last_timer_stopped_at ?? null,
      };
      sessionStatusRef.current = session.status;
    }
  }, [
    session,
    session?.last_timer_started_at,
    session?.last_timer_stopped_at,
    session?.status,
  ]);

  const stopTimer = useCallback(async () => {
    if (sessionStatusRef.current !== "in_progress") return;

    const lastTimerStartedAt = timerStateRef.current.lastTimerStartedAt;
    const lastTimerStoppedAt = timerStateRef.current.lastTimerStoppedAt;

    if (!lastTimerStartedAt) return;

    const isTimerActive =
      !lastTimerStoppedAt ||
      (lastTimerStoppedAt &&
        new Date(lastTimerStartedAt).getTime() >
          new Date(lastTimerStoppedAt).getTime());

    if (!isTimerActive) return;

    const now = new Date().toISOString();
    try {
      const result = await patchWorkoutSessionTimer(sessionId, {
        last_timer_stopped_at: now,
      });

      if (result.data) {
        setSession((prev) => ({
          ...prev,
          active_duration_seconds:
            result.data.active_duration_seconds ??
            prev.active_duration_seconds ??
            0,
          last_timer_started_at:
            result.data.last_timer_started_at ?? prev.last_timer_started_at,
          last_timer_stopped_at:
            result.data.last_timer_stopped_at ?? prev.last_timer_stopped_at,
        }));
      }
    } catch {
      // Ignoruj błędy - nie blokujemy unmount
    }
  }, [sessionId, setSession]);

  const handlePause = useCallback(async () => {
    const formData = useWorkoutSessionStore.getState().formData;
    if (formData) {
      await saveExercise(formData, false);
    }

    const now = new Date().toISOString();
    try {
      const result = await patchWorkoutSessionTimer(sessionId, {
        last_timer_stopped_at: now,
      });

      if (result.data) {
        setSession((prev) => ({
          ...prev,
          active_duration_seconds:
            result.data.active_duration_seconds ??
            prev.active_duration_seconds ??
            0,
          last_timer_started_at:
            result.data.last_timer_started_at ?? prev.last_timer_started_at,
          last_timer_stopped_at:
            result.data.last_timer_stopped_at ?? prev.last_timer_stopped_at,
        }));
        setIsPaused(true);
      } else {
        toast.error("Błąd podczas pauzowania timera");
      }
    } catch {
      toast.error("Błąd podczas pauzowania timera");
    }
  }, [sessionId, saveExercise, setSession, setIsPaused]);

  const handleResume = useCallback(async () => {
    const now = new Date().toISOString();
    try {
      const result = await patchWorkoutSessionTimer(sessionId, {
        last_timer_started_at: now,
      });

      if (result.data) {
        setSession((prev) => ({
          ...prev,
          active_duration_seconds:
            result.data.active_duration_seconds ??
            prev.active_duration_seconds ??
            0,
          last_timer_started_at:
            result.data.last_timer_started_at ?? prev.last_timer_started_at,
          last_timer_stopped_at:
            result.data.last_timer_stopped_at ?? prev.last_timer_stopped_at,
        }));
        setIsPaused(false);
      } else {
        toast.error("Błąd podczas wznawiania timera");
      }
    } catch {
      toast.error("Błąd podczas wznawiania timera");
    }
  }, [sessionId, setSession, setIsPaused]);

  useEffect(() => {
    if (timerInitializedRef.current) {
      isMountedRef.current = true;
      return;
    }

    const timerStarted = timerStateRef.current.lastTimerStartedAt !== null;
    const timerStopped = timerStateRef.current.lastTimerStoppedAt !== null;
    const lastTimerStartedAt = timerStateRef.current.lastTimerStartedAt;
    const lastTimerStoppedAt = timerStateRef.current.lastTimerStoppedAt;

    let shouldStart = !timerStarted;
    if (
      timerStarted &&
      timerStopped &&
      lastTimerStartedAt &&
      lastTimerStoppedAt
    ) {
      const startedTime = new Date(lastTimerStartedAt).getTime();
      const stoppedTime = new Date(lastTimerStoppedAt).getTime();
      if (stoppedTime >= startedTime) {
        shouldStart = true;
      }
    }

    if (shouldStart) {
      timerInitializedRef.current = true;
      const now = new Date().toISOString();

      patchWorkoutSessionTimer(sessionId, { last_timer_started_at: now })
        .then((result) => {
          if (result.data) {
            setSession((prev) => ({
              ...prev,
              active_duration_seconds:
                result.data.active_duration_seconds ??
                prev.active_duration_seconds ??
                0,
              last_timer_started_at:
                result.data.last_timer_started_at ?? prev.last_timer_started_at,
              last_timer_stopped_at:
                result.data.last_timer_stopped_at ?? prev.last_timer_stopped_at,
            }));
          }
          isMountedRef.current = true;
          isFirstRenderRef.current = false;
        })
        .catch(() => {
          timerInitializedRef.current = false;
        });
    } else {
      timerInitializedRef.current = true;
      isMountedRef.current = true;
      isFirstRenderRef.current = false;
    }
  }, [sessionId, setSession]);

  return {
    isPaused,
    setIsPaused,
    stopTimer,
    handlePause,
    handleResume,
    timerInitializedRef,
    isMountedRef,
    isFirstRenderRef,
  };
}
