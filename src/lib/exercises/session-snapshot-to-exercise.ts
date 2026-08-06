import type { ExerciseCreateCommand, SessionExerciseDTO } from "@/types";

/**
 * Konwertuje snapshot ćwiczenia z sesji treningowej (exercise_id = null) na
 * dane do utworzenia ćwiczenia w bibliotece. W przeciwieństwie do planów,
 * sesja nie ma "planu" (planned_* może być null) — bazujemy więc przede
 * wszystkim na tym, co faktycznie wykonano (actual_*).
 */
export function convertSessionSnapshotToExercise(
  snapshot: SessionExerciseDTO,
): ExerciseCreateCommand {
  if (!snapshot.exercise_title_at_time || !snapshot.exercise_part_at_time) {
    throw new Error("Brak wymaganych danych ćwiczenia (tytuł lub partia)");
  }

  const exerciseType =
    snapshot.exercise_type_at_time ?? DEFAULT_EXERCISE_TYPE_FALLBACK;

  const series =
    snapshot.actual_count_sets ?? snapshot.planned_sets ?? 1;

  const exerciseData: ExerciseCreateCommand = {
    title: snapshot.exercise_title_at_time,
    types: [exerciseType],
    parts: [snapshot.exercise_part_at_time],
    series,
  };

  const repsPerSet =
    snapshot.actual_sum_reps != null && series > 0
      ? Math.round(snapshot.actual_sum_reps / series)
      : snapshot.planned_reps ?? null;

  if (repsPerSet != null) {
    exerciseData.reps = repsPerSet;
  } else if (
    snapshot.actual_duration_seconds != null ||
    snapshot.planned_duration_seconds != null
  ) {
    exerciseData.duration_seconds =
      snapshot.actual_duration_seconds ?? snapshot.planned_duration_seconds!;
  } else {
    exerciseData.reps = 10;
  }

  if (snapshot.planned_rest_seconds != null) {
    exerciseData.rest_in_between_seconds = snapshot.planned_rest_seconds;
  }

  if (snapshot.planned_rest_after_series_seconds != null) {
    exerciseData.rest_after_series_seconds =
      snapshot.planned_rest_after_series_seconds;
  }

  if (
    !exerciseData.rest_in_between_seconds &&
    !exerciseData.rest_after_series_seconds
  ) {
    exerciseData.rest_after_series_seconds = 60;
  }

  if (snapshot.exercise_is_unilateral_at_time !== undefined) {
    exerciseData.is_unilateral =
      snapshot.exercise_is_unilateral_at_time === true;
  }

  return exerciseData;
}

const DEFAULT_EXERCISE_TYPE_FALLBACK = "Main Workout" as const;
