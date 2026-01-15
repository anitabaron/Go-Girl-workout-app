"use client";

import type { WorkoutSessionStatus } from "@/types";
import { ResumeSessionButton } from "./resume-session-button";

type WorkoutSessionActionsProps = {
  readonly sessionId: string;
  readonly status: WorkoutSessionStatus;
};

export function WorkoutSessionActions({
  sessionId,
  status,
}: WorkoutSessionActionsProps) {
  if (status === "in_progress") {
    return (
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-border dark:bg-zinc-950">
        <ResumeSessionButton sessionId={sessionId} />
      </div>
    );
  }

  // Dla completed nie wyświetlamy żadnych akcji
  return null;
}
