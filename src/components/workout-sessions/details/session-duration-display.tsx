import type { WorkoutSessionStatus } from "@/types";

type SessionDurationDisplayProps = {
  readonly startedAt: string;
  readonly completedAt: string | null;
  readonly status: WorkoutSessionStatus;
};

export function SessionDurationDisplay({
  startedAt,
  completedAt,
  status,
}: SessionDurationDisplayProps) {
  const start = new Date(startedAt);
  const end =
    status === "completed" && completedAt
      ? new Date(completedAt)
      : new Date(); // Dla in_progress użyj aktualnego czasu

  const diffMs = end.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const minutes = diffMins % 60;

  if (status === "in_progress") {
    if (hours > 0) {
      return <span>{hours}h {minutes}min</span>;
    }
    return <span>{minutes}min</span>;
  }

  // Dla completed
  if (hours > 0) {
    return <span>{hours}h {minutes}min</span>;
  }
  return <span>{minutes}min</span>;
}
