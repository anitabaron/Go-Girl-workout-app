"use client";

import { CountdownCircleTimer } from "react-countdown-circle-timer";
import type { RestAfterSeriesTimerProps } from "@/types/workout-session-assistant";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n/client";
import { useTimerPalette } from "./use-timer-palette";

export function RestAfterSeriesTimerM3({
  restSeconds,
  isPaused,
  onComplete,
  nextExerciseName,
  isLastExercise,
}: Readonly<RestAfterSeriesTimerProps>) {
  const t = useTranslations("assistantTimers");
  const timerPalette = useTimerPalette("series");
  if (!restSeconds || restSeconds <= 0) return null;
  if (typeof onComplete !== "function") return null;

  let messageContent: React.ReactNode;
  if (isLastExercise) {
    messageContent = t("endWorkout");
  } else if (nextExerciseName?.trim()) {
    messageContent = (
      <>
        {t("getReadyPrefix")} <span className="font-bold">{nextExerciseName}</span>
      </>
    );
  } else {
    messageContent = t("getReadyNext");
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <CountdownCircleTimer
        isPlaying={!isPaused}
        duration={restSeconds}
        colors={timerPalette.colors}
        colorsTime={[restSeconds, restSeconds * 0.5, 0]}
        trailColor={timerPalette.trailColor}
        size={240}
        strokeWidth={12}
        onComplete={() => {
          onComplete();
          return { shouldRepeat: false };
        }}
      >
        {({ remainingTime }) => (
          <div className="flex flex-col items-center">
            <div className="text-6xl font-bold text-destructive sm:text-7xl md:text-8xl">
              {remainingTime}
            </div>
            <div className="text-sm text-muted-foreground">
              {t("secondsRest")}
            </div>
          </div>
        )}
      </CountdownCircleTimer>
      <Button
        onClick={onComplete}
        size="lg"
        className="m3-cta min-w-[120px] text-md font-light"
        data-test-id="timer-skip-break-button"
      >
        {t("skipBreak")}
      </Button>
      <div className="text-center">
        <p className="text-sm text-muted-foreground">{messageContent}</p>
      </div>
    </div>
  );
}
