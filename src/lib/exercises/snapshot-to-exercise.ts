import type { ExerciseCreateCommand, WorkoutPlanExerciseDTO } from "@/types";

/**
 * Konwertuje snapshot ćwiczenia z planu treningowego na dane do utworzenia ćwiczenia w bibliotece.
 * Rzuca błąd przy braku wymaganych danych (title, part, type).
 */
export function convertSnapshotToExercise(
  snapshot: WorkoutPlanExerciseDTO,
): ExerciseCreateCommand {
  if (!snapshot.exercise_title || !snapshot.exercise_part) {
    throw new Error("Brak wymaganych danych ćwiczenia (tytuł lub partia)");
  }

  const exerciseType = snapshot.exercise_type ?? snapshot.section_type;
  if (!exerciseType) {
    throw new Error("Brak typu ćwiczenia");
  }

  const exerciseData: ExerciseCreateCommand = {
    title: snapshot.exercise_title,
    types: [exerciseType],
    parts: [snapshot.exercise_part],
    series: snapshot.planned_sets ?? 1,
  };

  if (snapshot.exercise_details) {
    exerciseData.details = snapshot.exercise_details;
  }

  if (snapshot.planned_reps !== null && snapshot.planned_reps !== undefined) {
    exerciseData.reps = snapshot.planned_reps;
  } else if (
    snapshot.planned_duration_seconds !== null &&
    snapshot.planned_duration_seconds !== undefined
  ) {
    exerciseData.duration_seconds = snapshot.planned_duration_seconds;
  } else {
    exerciseData.reps = 10;
  }

  if (
    snapshot.planned_rest_seconds !== null &&
    snapshot.planned_rest_seconds !== undefined
  ) {
    exerciseData.rest_in_between_seconds = snapshot.planned_rest_seconds;
  }

  if (
    snapshot.planned_rest_after_series_seconds !== null &&
    snapshot.planned_rest_after_series_seconds !== undefined
  ) {
    exerciseData.rest_after_series_seconds =
      snapshot.planned_rest_after_series_seconds;
  }

  if (
    !exerciseData.rest_in_between_seconds &&
    !exerciseData.rest_after_series_seconds
  ) {
    exerciseData.rest_after_series_seconds = 60;
  }

  if (
    snapshot.exercise_estimated_set_time_seconds !== null &&
    snapshot.exercise_estimated_set_time_seconds !== undefined
  ) {
    exerciseData.estimated_set_time_seconds =
      snapshot.exercise_estimated_set_time_seconds;
  }

  return exerciseData;
}
