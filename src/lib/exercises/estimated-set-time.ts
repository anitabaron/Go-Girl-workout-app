type EstimatedSetTimeInput = {
  series: number | string;
  reps?: number | string | null;
  duration_seconds?: number | string | null;
  rest_in_between_seconds?: number | string | null;
  rest_after_series_seconds?: number | string | null;
};

/**
 * Oblicza szacunkowy czas zestawu na podstawie parametrów ćwiczenia.
 * duration: duration × series + (series−1) × rest + rest after
 * reps: reps × 5s × series + (series−1) × rest + rest after
 */
export function calculateEstimatedSetTimeSeconds(
  values: EstimatedSetTimeInput,
): number | null {
  const series = Number(values.series);
  if (!Number.isFinite(series) || series < 1) return null;

  const rest = Number(values.rest_in_between_seconds) || 0;
  const restAfter = Number(values.rest_after_series_seconds) || 0;

  const duration = Number(values.duration_seconds);
  const reps = Number(values.reps);

  if (Number.isFinite(duration) && duration > 0) {
    return duration * series + (series - 1) * rest + restAfter;
  }
  if (Number.isFinite(reps) && reps > 0) {
    return reps * 5 * series + (series - 1) * rest + restAfter;
  }
  return null;
}
