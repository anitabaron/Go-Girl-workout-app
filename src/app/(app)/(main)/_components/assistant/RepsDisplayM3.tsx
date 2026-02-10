"use client";

import { Button } from "@/components/ui/button";
import type { RepsDisplayProps } from "@/types/workout-session-assistant";

const SIDE_LABELS: Record<
  NonNullable<RepsDisplayProps["sideLabel"]>,
  string
> = {
  one_side: "first side",
  other_side: "second side",
};

export function RepsDisplayM3({
  reps,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- API compatibility
  setNumber: _setNumber,
  sideLabel,
  onComplete,
}: Readonly<RepsDisplayProps>) {
  if (!reps || reps <= 0) return null;
  if (typeof onComplete !== "function") return null;

  return (
    <div className="flex flex-col items-center justify-center gap-3 pb-10">
      <div className="relative flex h-60 w-60 flex-col items-center justify-center">
        <div
          className="absolute inset-0 rounded-full bg-[#ffbdc8] opacity-30"
          aria-hidden
        />
        <div className="relative z-10 flex flex-col items-center gap-1">
          <span className="text-7xl font-bold text-destructive sm:text-8xl md:text-8xl">
            {reps}
          </span>
          <span className="text-sm font-medium text-muted-foreground">
            reps{sideLabel ? ` (${SIDE_LABELS[sideLabel]})` : ""}
          </span>
        </div>
      </div>
      <Button
        type="button"
        onClick={onComplete}
        size="lg"
        className="m3-cta min-w-[120px] text-lg"
        data-test-id="timer-ok-button"
      >
        OK
      </Button>
    </div>
  );
}
