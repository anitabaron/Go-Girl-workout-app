export function formatCompactSeconds(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  if (safeSeconds <= 60) {
    return `${safeSeconds} s`;
  }

  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")} min`;
}

export function formatTimerSeconds(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  if (safeSeconds <= 60) {
    return `${safeSeconds}`;
  }

  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "-";
  return formatCompactSeconds(seconds);
}

/**
 * Formats reps or duration for display in plan card.
 * Returns "10 reps" if reps set, compact duration ("45 s", "1:05 min"), otherwise "-".
 */
export function formatRepsOrDuration(
  reps: number | null | undefined,
  durationSeconds: number | null | undefined
): string {
  if (reps != null && reps > 0) return `${reps} reps`;
  if (durationSeconds != null && durationSeconds > 0) {
    return formatDuration(durationSeconds);
  }
  return "-";
}

export function formatTotalDuration(seconds: number): string {
  return formatCompactSeconds(seconds);
}
