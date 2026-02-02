export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "-";
  return `${seconds}s`;
}

/**
 * Formats reps or duration for display in plan card.
 * Returns "10 reps" if reps set, "60s" if duration set (always in seconds), otherwise "-".
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
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) {
    return `${minutes}min`;
  }
  return `${minutes}min ${remainingSeconds}s`;
}
