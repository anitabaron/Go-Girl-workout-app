"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  patchWorkoutSessionTimer,
  patchWorkoutSessionTimerKeepalive,
  patchWorkoutSessionExerciseKeepalive,
} from "@/lib/api/workout-sessions";
import { formDataToAutosaveCommand } from "@/types/workout-session-assistant";
import { useWorkoutSessionStore } from "@/stores/workout-session-store";
import type { ExerciseFormData } from "@/types/workout-session-assistant";

type SaveExerciseFn = (
  data: ExerciseFormData,
  advanceCursor: boolean,
) => Promise<boolean>;
type StopTimerFn = () => Promise<void>;

type RefLike<T> = { current: T };

/**
 * Hook do auto-pauzy przy opuszczeniu strony, zamknięciu przeglądarki, visibilitychange.
 */
export function useAutoPause(
  sessionId: string,
  _stopTimer: StopTimerFn,
  saveExercise: SaveExerciseFn,
  timerInitializedRef: RefLike<boolean>,
  isMountedRef: RefLike<boolean>,
  isFirstRenderRef: RefLike<boolean>,
  isAutoTransitioningRef: RefLike<boolean>,
  formDataRef: RefLike<ExerciseFormData | null>,
) {
  const pathname = usePathname();

  const isPaused = useWorkoutSessionStore((s) => s.isPaused);
  const session = useWorkoutSessionStore((s) => s.session);
  const setSession = useWorkoutSessionStore((s) => s.setSession);
  const setIsPaused = useWorkoutSessionStore((s) => s.setIsPaused);

  const autoPauseExecutedRef = useRef<string | null>(null);
  const previousPathnameRef = useRef<string | null>(null);
  const lastVisibleTimeRef = useRef<number>(0);
  const autoPauseRef = useRef<
    ((saveProgress?: boolean) => Promise<void>) | null
  >(null);

  const autoPause = useCallback(
    async (saveProgress = false) => {
      if (isFirstRenderRef.current) return;
      if (!isMountedRef.current) return;
      if (session?.status !== "in_progress") return;
      if (isPaused) return;
      if (!timerInitializedRef.current) return;

      if (isAutoTransitioningRef.current) {
        if (saveProgress && session?.status === "in_progress") {
          try {
            const currentFormData = formDataRef.current;
            if (currentFormData) {
              await saveExercise(currentFormData, false);
            }
          } catch (error) {
            if (
              !(
                error instanceof Error &&
                error.message.includes("nie jest w statusie 'in_progress'")
              )
            ) {
              console.error(
                "[useAutoPause] Error saving progress during auto-transition:",
                error,
              );
            }
          }
        }
        return;
      }

      if (saveProgress) {
        try {
          const currentFormData = formDataRef.current;
          if (currentFormData) {
            await saveExercise(currentFormData, false);
          }
        } catch (error) {
          if (
            !(
              error instanceof Error &&
              error.message.includes("nie jest w statusie 'in_progress'")
            )
          ) {
            console.error("[useAutoPause] Error saving progress:", error);
          }
        }
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
        }
      } catch (error) {
        console.error("[useAutoPause] Error pausing timer:", error);
      }
    },
    [
      session?.status,
      isPaused,
      sessionId,
      saveExercise,
      setSession,
      setIsPaused,
      isFirstRenderRef,
      isMountedRef,
      timerInitializedRef,
      isAutoTransitioningRef,
      formDataRef,
    ],
  );

  useEffect(() => {
    autoPauseRef.current = autoPause;
  }, [autoPause]);

  const saveProgressOnUnload = useCallback(() => {
    const currentFormData = formDataRef.current;
    const currentExercise =
      session?.exercises[
        useWorkoutSessionStore.getState().currentExerciseIndex
      ];

    if (currentFormData && currentExercise) {
      const command = formDataToAutosaveCommand(currentFormData, false);
      patchWorkoutSessionExerciseKeepalive(
        sessionId,
        currentExercise.exercise_order,
        command,
      ).catch(() => {});
    }

    const now = new Date().toISOString();
    patchWorkoutSessionTimerKeepalive(sessionId, {
      last_timer_stopped_at: now,
    }).catch(() => {});
  }, [sessionId, session?.exercises, formDataRef]);

  useEffect(() => {
    if (!isMountedRef.current) return;
    if (!timerInitializedRef.current) return;
    if (isFirstRenderRef.current) return;

    const activePagePath = `/workout-sessions/${sessionId}/active`;
    const isOnActivePage = pathname === activePagePath;
    const pathnameChanged = previousPathnameRef.current !== pathname;
    const previousPathname = previousPathnameRef.current;
    previousPathnameRef.current = pathname;

    if (
      !isOnActivePage &&
      !isPaused &&
      pathname &&
      pathname !== activePagePath &&
      pathname.trim() !== ""
    ) {
      if (autoPauseExecutedRef.current !== pathname) {
        autoPauseExecutedRef.current = pathname;
        void autoPause(true);
      }
    } else if (
      isOnActivePage &&
      pathnameChanged &&
      previousPathname !== activePagePath
    ) {
      autoPauseExecutedRef.current = null;
    }
  }, [
    pathname,
    sessionId,
    isPaused,
    autoPause,
    isMountedRef,
    timerInitializedRef,
    isFirstRenderRef,
  ]);

  useEffect(() => {
    const handleUnload = () => {
      if (!isPaused) {
        saveProgressOnUnload();
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
    };
  }, [isPaused, saveProgressOnUnload]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!isMountedRef.current) return;

      if (document.visibilityState === "visible") {
        lastVisibleTimeRef.current = Date.now();
        return;
      }

      if (document.visibilityState === "hidden" && !isPaused) {
        const timeSinceLastVisible = Date.now() - lastVisibleTimeRef.current;
        const MIN_VISIBLE_TIME = 1000;

        if (timeSinceLastVisible < MIN_VISIBLE_TIME) return;

        void autoPause(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (document.visibilityState === "visible") {
      lastVisibleTimeRef.current = Date.now();
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isPaused, autoPause, isMountedRef]);

  useEffect(() => {
    return () => {
      if (autoPauseRef.current) {
        void autoPauseRef.current(true);
      }
    };
  }, []);

  return { autoPause, saveProgressOnUnload };
}
