/**
 * Oblicza agregaty z serii, jeśli nie zostały podane ręcznie.
 * Mapuje nazwy API (actual_count_sets, actual_sum_reps) na nazwy bazy danych (actual_sets, actual_reps).
 *
 * Uwaga: Oblicza actual_reps tylko jeśli planned_reps nie jest null (ćwiczenie oparte na powtórzeniach).
 * Oblicza actual_duration_seconds tylko jeśli planned_duration_seconds nie jest null (ćwiczenie oparte na czasie).
 */
export function calculateAggregatesFromSets(
  parsed: {
    actual_count_sets?: number | null;
    actual_sum_reps?: number | null;
    actual_duration_seconds?: number | null;
    sets?: Array<{
      reps?: number | null;
      duration_seconds?: number | null;
      weight_kg?: number | null;
    }> | null;
  },
  plannedReps?: number | null,
  plannedDurationSeconds?: number | null,
): {
  actual_sets: number | null;
  actual_reps: number | null;
  actual_duration_seconds: number | null;
} {
  let actualSets: number | null = null;
  if (parsed.actual_count_sets !== undefined) {
    actualSets = parsed.actual_count_sets;
  } else if (parsed.sets && parsed.sets.length > 0) {
    actualSets = parsed.sets.length;
  }

  let actualReps: number | null = null;
  if (parsed.actual_sum_reps !== undefined) {
    actualReps = parsed.actual_sum_reps;
  } else if (
    parsed.sets &&
    parsed.sets.length > 0 &&
    plannedReps !== null &&
    plannedReps !== undefined
  ) {
    const repsWithValues = parsed.sets
      .map((set) => set.reps)
      .filter((r): r is number => r !== null && r !== undefined);

    if (repsWithValues.length > 0) {
      const sum = repsWithValues.reduce((acc, reps) => acc + reps, 0);
      actualReps = sum > 0 ? sum : null;
    }
  }

  let actualDurationSeconds: number | null = null;
  if (parsed.actual_duration_seconds !== undefined) {
    actualDurationSeconds = parsed.actual_duration_seconds;
  } else if (
    parsed.sets &&
    parsed.sets.length > 0 &&
    plannedDurationSeconds !== null &&
    plannedDurationSeconds !== undefined
  ) {
    const durations = parsed.sets
      .map((set) => set.duration_seconds)
      .filter((d): d is number => d !== null && d !== undefined);
    if (durations.length > 0) {
      actualDurationSeconds = Math.max(...durations);
    }
  }

  return {
    actual_sets: actualSets,
    actual_reps: actualReps,
    actual_duration_seconds: actualDurationSeconds,
  };
}

/**
 * Przygotowuje dane planned_* do aktualizacji.
 * Zwraca null jeśli żadne pole nie zostało podane.
 */
export function preparePlannedUpdates(parsed: {
  planned_sets?: number | null;
  planned_reps?: number | null;
  planned_duration_seconds?: number | null;
  planned_rest_seconds?: number | null;
}): {
  planned_sets?: number | null;
  planned_reps?: number | null;
  planned_duration_seconds?: number | null;
  planned_rest_seconds?: number | null;
} | null {
  if (
    parsed.planned_sets === undefined &&
    parsed.planned_reps === undefined &&
    parsed.planned_duration_seconds === undefined &&
    parsed.planned_rest_seconds === undefined
  ) {
    return null;
  }

  const updates: {
    planned_sets?: number | null;
    planned_reps?: number | null;
    planned_duration_seconds?: number | null;
    planned_rest_seconds?: number | null;
  } = {};

  if (parsed.planned_sets !== undefined) {
    updates.planned_sets = parsed.planned_sets;
  }
  if (parsed.planned_reps !== undefined) {
    updates.planned_reps = parsed.planned_reps;
  }
  if (parsed.planned_duration_seconds !== undefined) {
    updates.planned_duration_seconds = parsed.planned_duration_seconds;
  }
  if (parsed.planned_rest_seconds !== undefined) {
    updates.planned_rest_seconds = parsed.planned_rest_seconds;
  }

  return updates;
}
