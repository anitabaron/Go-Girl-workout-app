"use client";

import { CountdownCircleTimer } from "react-countdown-circle-timer";
import type { RestAfterSeriesTimerProps } from "@/types/workout-session-assistant";
import { Button } from "@/components/ui/button";

export function RestAfterSeriesTimerM3({
  restSeconds,
  isPaused,
  onComplete,
}: Readonly<RestAfterSeriesTimerProps>) {
  if (!restSeconds || restSeconds <= 0) return null;
  if (typeof onComplete !== "function") return null;

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <CountdownCircleTimer
        isPlaying={!isPaused}
        duration={restSeconds}
        colors={["#be123c", "#e11d48", "#f43f5e"]}
        colorsTime={[restSeconds, restSeconds * 0.5, 0]}
        trailColor="#ffbdc8"
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
            <div className="text-sm text-muted-foreground">seconds rest</div>
          </div>
        )}
      </CountdownCircleTimer>
      <Button
        onClick={onComplete}
        size="lg"
        className="m3-cta min-w-[120px] text-md font-light"
        data-test-id="timer-skip-break-button"
      >
        Skip break
      </Button>
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Get ready for the next exercise
        </p>
      </div>
    </div>
  );
}
