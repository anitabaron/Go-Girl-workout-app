export type EstimatedSetTimeInput = {
  series: number | string;
  reps?: number | string | null;
  duration_seconds?: number | string | null;
  rest_in_between_seconds?: number | string | null;
  rest_after_series_seconds?: number | string | null;
  /** Czy ćwiczenie jest unilateralne (plany: exercise_is_unilateral, formularz: is_unilateral). Czas pracy (duration lub reps×5s) ×2; odpoczynki bez zmian. */
  exercise_is_unilateral?: boolean | null;
};

/**
 * Oblicza szacunkowy czas zestawu na podstawie parametrów ćwiczenia.
 * duration: (duration × series [×2 jeśli exercise_is_unilateral]) + (series−1) × rest + rest after
 * reps: (reps × 5s × series [×2 jeśli exercise_is_unilateral]) + (series−1) × rest + rest after
 */
export function calculateEstimatedSetTimeSeconds(
  values: EstimatedSetTimeInput,
): number | null {
  const series = Number(values.series);
  if (!Number.isFinite(series) || series < 1) return null;

  const rest = Number(values.rest_in_between_seconds) || 0;
  const restAfter = Number(values.rest_after_series_seconds) || 0;
  const workMultiplier = values.exercise_is_unilateral ? 2 : 1;

  const duration = Number(values.duration_seconds);
  const reps = Number(values.reps);

  if (Number.isFinite(duration) && duration > 0) {
    const workTime = duration * series * workMultiplier;
    return workTime + (series - 1) * rest + restAfter;
  }
  if (Number.isFinite(reps) && reps > 0) {
    const workTime = reps * 5 * series * workMultiplier;
    return workTime + (series - 1) * rest + restAfter;
  }
  return null;
}

const ESTIMATED_SET_TIME_LABEL_BASE = "Estimated set time";

/**
 * Zwraca etykietę dla pola estimated set time (z opcjonalną podpowiedzią ≈ X s).
 * @param calculatedSeconds - wynik calculateEstimatedSetTimeSeconds lub null
 * @param unit - "s" (krótka) lub "sec" (pełna), domyślnie "s"
 */
export function getEstimatedSetTimeLabel(
  calculatedSeconds: number | null,
  unit: "s" | "sec" = "s",
): string {
  const suffix = unit === "sec" ? " (sec)" : " (s)";
  if (calculatedSeconds === null) {
    return `${ESTIMATED_SET_TIME_LABEL_BASE}${suffix}`;
  }
  return `${ESTIMATED_SET_TIME_LABEL_BASE}${suffix} ≈ ${calculatedSeconds} s`;
}
