import type { Database } from "@/db/database.types";
import type { WorkoutPlanExerciseUpdateOrCreate } from "@/types";

export type WorkoutPlanExerciseUpdateData =
  Database["public"]["Tables"]["workout_plan_exercises"]["Update"] & {
    planned_rest_after_series_seconds?: number | null;
    estimated_set_time_seconds?: number | null;
    exercise_title?: string | null;
    exercise_type?: Database["public"]["Enums"]["exercise_type"] | null;
    exercise_part?: Database["public"]["Enums"]["exercise_part"] | null;
  };

/**
 * Mapuje dane aktualizacji ćwiczenia (z payloadu PATCH) na format bazy danych.
 * Funkcja czysta – testowalna w Vitest bez Supabase.
 *
 * @param exerciseUpdate - Częściowa aktualizacja ćwiczenia z id
 * @returns Obiekt Update dla workout_plan_exercises (tylko zdefiniowane pola)
 */
export function mapExerciseUpdateToDb(
  exerciseUpdate: WorkoutPlanExerciseUpdateOrCreate & { id: string },
): WorkoutPlanExerciseUpdateData {
  const updateData: WorkoutPlanExerciseUpdateData = {};

  if (exerciseUpdate.exercise_id !== undefined) {
    updateData.exercise_id = exerciseUpdate.exercise_id ?? null;
  }
  if (exerciseUpdate.exercise_title !== undefined) {
    updateData.exercise_title = exerciseUpdate.exercise_title ?? null;
  }
  if (exerciseUpdate.exercise_type !== undefined) {
    updateData.exercise_type = exerciseUpdate.exercise_type as
      | Database["public"]["Enums"]["exercise_type"]
      | null;
  }
  if (exerciseUpdate.exercise_part !== undefined) {
    updateData.exercise_part = exerciseUpdate.exercise_part as
      | Database["public"]["Enums"]["exercise_part"]
      | null;
  }
  if (exerciseUpdate.section_type !== undefined) {
    updateData.section_type =
      exerciseUpdate.section_type as Database["public"]["Enums"]["exercise_type"];
  }
  if (exerciseUpdate.section_order !== undefined) {
    updateData.section_order = exerciseUpdate.section_order;
  }
  if (exerciseUpdate.planned_sets !== undefined) {
    updateData.planned_sets = exerciseUpdate.planned_sets ?? null;
  }
  if (exerciseUpdate.planned_reps !== undefined) {
    updateData.planned_reps = exerciseUpdate.planned_reps ?? null;
  }
  if (exerciseUpdate.planned_duration_seconds !== undefined) {
    updateData.planned_duration_seconds =
      exerciseUpdate.planned_duration_seconds ?? null;
  }
  if (exerciseUpdate.planned_rest_seconds !== undefined) {
    updateData.planned_rest_seconds =
      exerciseUpdate.planned_rest_seconds ?? null;
  }
  if (exerciseUpdate.planned_rest_after_series_seconds !== undefined) {
    updateData.planned_rest_after_series_seconds =
      exerciseUpdate.planned_rest_after_series_seconds ?? null;
  }
  if (exerciseUpdate.estimated_set_time_seconds !== undefined) {
    updateData.estimated_set_time_seconds =
      exerciseUpdate.estimated_set_time_seconds ?? null;
  }

  return updateData;
}
