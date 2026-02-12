import { calculateEstimatedSetTimeSeconds } from "@/lib/exercises/estimated-set-time";

export type WorkoutPlanEstimatedTimeExercise = {
  scope_id?: string | null;
  scope_repeat_count?: number | null;
  estimated_set_time_seconds?: number | null;
  exercise_estimated_set_time_seconds?: number | null;
  planned_sets?: number | null;
  planned_reps?: number | null;
  planned_duration_seconds?: number | null;
  planned_rest_seconds?: number | null;
  planned_rest_after_series_seconds?: number | null;
  exercise_is_unilateral?: boolean | null;
};

export function getExerciseEstimatedTimeSeconds(
  exercise: WorkoutPlanEstimatedTimeExercise,
): number | null {
  const explicit =
    exercise.estimated_set_time_seconds ??
    exercise.exercise_estimated_set_time_seconds;
  if (explicit != null && Number.isFinite(explicit) && explicit > 0) {
    return explicit;
  }

  return calculateEstimatedSetTimeSeconds({
    series: exercise.planned_sets ?? "",
    reps: exercise.planned_reps ?? null,
    duration_seconds: exercise.planned_duration_seconds ?? null,
    rest_in_between_seconds: exercise.planned_rest_seconds ?? null,
    rest_after_series_seconds: exercise.planned_rest_after_series_seconds ?? null,
    exercise_is_unilateral: exercise.exercise_is_unilateral ?? undefined,
  });
}

export function calculateScopeEstimatedTimeSeconds(
  exercises: WorkoutPlanEstimatedTimeExercise[],
  repeatCount: number,
): number | null {
  if (exercises.length === 0) return null;
  const scopeSetTime = exercises.reduce((sum, exercise) => {
    const estimated = getExerciseEstimatedTimeSeconds(exercise);
    return sum + (estimated ?? 0);
  }, 0);

  if (scopeSetTime <= 0) return null;
  const repeats = Math.max(1, repeatCount);
  return scopeSetTime * repeats;
}

export function calculatePlanEstimatedTotalTimeSeconds(
  exercises: WorkoutPlanEstimatedTimeExercise[],
): number | null {
  const singles = exercises.filter((exercise) => exercise.scope_id == null);
  const scopes = new Map<string, WorkoutPlanEstimatedTimeExercise[]>();

  for (const exercise of exercises) {
    if (exercise.scope_id == null) continue;
    const current = scopes.get(exercise.scope_id) ?? [];
    current.push(exercise);
    scopes.set(exercise.scope_id, current);
  }

  let total = singles.reduce((sum, exercise) => {
    const estimated = getExerciseEstimatedTimeSeconds(exercise);
    return sum + (estimated ?? 0);
  }, 0);

  for (const scopeExercises of scopes.values()) {
    const repeatCount = scopeExercises[0]?.scope_repeat_count ?? 1;
    const scopeEstimated = calculateScopeEstimatedTimeSeconds(
      scopeExercises,
      repeatCount,
    );
    total += scopeEstimated ?? 0;
  }

  return total > 0 ? total : null;
}
