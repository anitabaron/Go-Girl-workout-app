"use client";

import { Button } from "@/components/ui/button";
import type { RepsDisplayProps } from "@/types/workout-session-assistant";
import { useTranslations } from "@/i18n/client";

export function RepsDisplayM3({
  reps,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- API compatibility
  setNumber: _setNumber,
  sideLabel,
  onComplete,
}: Readonly<RepsDisplayProps>) {
  const t = useTranslations("assistantTimers");
  if (!reps || reps <= 0) return null;
  if (typeof onComplete !== "function") return null;

  return (
    <div className="flex flex-col items-center justify-center gap-3 pb-10">
      <div className="relative flex h-60 w-60 flex-col items-center justify-center">
        <div
          className="absolute inset-0 rounded-full bg-[var(--m3-primary-container)] opacity-30"
          aria-hidden
        />
        <div className="relative z-10 flex flex-col items-center gap-1">
          <span className="text-7xl font-bold text-destructive sm:text-8xl md:text-8xl">
            {reps}
          </span>
          <span className="text-sm font-medium text-muted-foreground">
            {t("reps")}
            {sideLabel
              ? ` (${
                  sideLabel === "one_side"
                    ? t("firstSide")
                    : t("secondSide")
                })`
              : ""}
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
        {t("ok")}
      </Button>
    </div>
  );
}
