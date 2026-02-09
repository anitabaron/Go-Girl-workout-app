import type { WorkoutPlanDTO, WorkoutPlanExerciseDTO } from "@/types";
import type { z } from "zod";
import { workoutPlanImportSchema } from "@/lib/validation/workout-plans";

export type WorkoutPlanImportPayload = z.infer<typeof workoutPlanImportSchema>;

/**
 * Maps a WorkoutPlanDTO to the JSON structure used for import (see import-instruction page).
 * Exporting and re-importing this JSON recreates the same plan structure.
 */
export function workoutPlanToImportFormat(plan: WorkoutPlanDTO): WorkoutPlanImportPayload {
  return {
    name: plan.name,
    description: plan.description ?? null,
    part: plan.part ?? null,
    exercises: plan.exercises.map((ex) => exerciseToImportFormat(ex)),
  };
}

function exerciseToImportFormat(
  ex: WorkoutPlanExerciseDTO,
): WorkoutPlanImportPayload["exercises"][number] {
  const base = {
    section_type: ex.section_type,
    section_order: ex.section_order,
    planned_sets: ex.planned_sets ?? null,
    planned_reps: ex.planned_reps ?? null,
    planned_duration_seconds: ex.planned_duration_seconds ?? null,
    planned_rest_seconds: ex.planned_rest_seconds ?? null,
    planned_rest_after_series_seconds:
      ex.planned_rest_after_series_seconds ?? null,
    estimated_set_time_seconds:
      ex.exercise_estimated_set_time_seconds ?? null,
    exercise_is_unilateral: ex.exercise_is_unilateral ?? null,
  };

  const hasLibraryExercise =
    ex.exercise_id != null && ex.is_exercise_in_library !== false;

  if (hasLibraryExercise && ex.exercise_title?.trim()) {
    return {
      ...base,
      match_by_name: ex.exercise_title.trim(),
    };
  }

  if (hasLibraryExercise) {
    return {
      ...base,
      exercise_id: ex.exercise_id!,
    };
  }

  return {
    ...base,
    exercise_title: ex.exercise_title ?? "",
    exercise_part: ex.exercise_part ?? null,
    exercise_details: ex.exercise_details ?? null,
    exercise_type: ex.exercise_type ?? null,
  };
}
