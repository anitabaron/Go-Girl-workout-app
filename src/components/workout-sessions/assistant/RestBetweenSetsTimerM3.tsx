"use client";

import { CountdownCircleTimer } from "react-countdown-circle-timer";
import type { RestBetweenSetsTimerProps } from "@/types/workout-session-assistant";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n/client";
import { useTimerPalette } from "./use-timer-palette";

export function RestBetweenSetsTimerM3({
  restSeconds,
  isPaused,
  onComplete,
}: Readonly<RestBetweenSetsTimerProps>) {
  const t = useTranslations("assistantTimers");
  const timerPalette = useTimerPalette("break");
  if (!restSeconds || restSeconds <= 0) return null;
  if (typeof onComplete !== "function") return null;

  return (
    <div className="flex flex-col items-center justify-center gap-3 pb-10">
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
    </div>
  );
}
