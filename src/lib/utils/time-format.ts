export function formatCompactSeconds(seconds: number): string {
  if (seconds <= 60) {
    return `${seconds}`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "-";
  return formatCompactSeconds(seconds);
}

/**
 * Formats reps or duration for display in plan card.
 * Returns "10 reps" if reps set, compact duration ("45", "1:05"), otherwise "-".
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
