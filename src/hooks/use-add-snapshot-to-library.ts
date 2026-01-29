"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getExerciseByTitle, createExercise } from "@/lib/api/exercises";
import {
  patchWorkoutPlan,
  linkSnapshotToExercise,
} from "@/lib/api/workout-plans";
import { convertSnapshotToExercise } from "@/lib/exercises/snapshot-to-exercise";
import type { WorkoutPlanExerciseDTO, ExerciseCreateCommand } from "@/types";

const ALREADY_EXISTS_MSG =
  "Ćwiczenie już istnieje w bazie. Łączenie z istniejącym ćwiczeniem.";
const NOT_FOUND_MSG =
  "Ćwiczenie o tej nazwie już istnieje, ale nie udało się go znaleźć.";
const INVALID_DATA_MSG = "Nieprawidłowe dane ćwiczenia.";

async function getOrCreateExerciseId(
  exerciseData: ExerciseCreateCommand,
): Promise<string> {
  const existing = await getExerciseByTitle(exerciseData.title);
  if (existing?.id) {
    toast.info(ALREADY_EXISTS_MSG);
    return existing.id;
  }

  try {
    const created = await createExercise(exerciseData);
    return created.id;
  } catch (createError) {
    const errMsg = createError instanceof Error ? createError.message : "";
    return handleCreateConflict(exerciseData.title, errMsg, createError);
  }
}

function handleCreateConflict(
  title: string,
  errMsg: string,
  createError: unknown,
): Promise<string> {
  const isConflict =
    errMsg.includes("już istnieje") ||
    errMsg.includes("CONFLICT") ||
    errMsg.includes("409");
  if (isConflict) {
    return resolveExistingByTitle(title);
  }

  const isBadRequest =
    errMsg.includes("Nieprawidłowe") || errMsg.includes("400");
  if (isBadRequest) {
    throw new Error(errMsg || INVALID_DATA_MSG);
  }

  throw createError;
}

async function resolveExistingByTitle(title: string): Promise<string> {
  const found = await getExerciseByTitle(title);
  if (found?.id) {
    toast.info(ALREADY_EXISTS_MSG);
    return found.id;
  }
  throw new Error(NOT_FOUND_MSG);
}

function buildExercisePatchPayload(
  exercise: WorkoutPlanExerciseDTO,
  exerciseId: string,
) {
  return {
    id: exercise.id,
    exercise_id: exerciseId,
    exercise_title: null,
    exercise_type: null,
    exercise_part: null,
    section_type: exercise.section_type,
    section_order: exercise.section_order,
    planned_sets: exercise.planned_sets ?? 1,
    planned_reps: exercise.planned_reps ?? null,
    planned_duration_seconds: exercise.planned_duration_seconds ?? null,
    planned_rest_seconds: exercise.planned_rest_seconds ?? null,
    planned_rest_after_series_seconds:
      exercise.planned_rest_after_series_seconds ??
      exercise.exercise_rest_after_series_seconds ??
      null,
    estimated_set_time_seconds:
      exercise.estimated_set_time_seconds ??
      exercise.exercise_estimated_set_time_seconds ??
      null,
  };
}

export function useAddSnapshotToLibrary(
  exercise: WorkoutPlanExerciseDTO,
  planId: string,
) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const addToLibrary = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const exerciseData = convertSnapshotToExercise(exercise);
      const exerciseId = await getOrCreateExerciseId(exerciseData);

      if (exercise.snapshot_id) {
        await linkSnapshotToExercise(exercise.snapshot_id, exerciseId);
      } else {
        await patchWorkoutPlan(planId, {
          exercises: [buildExercisePatchPayload(exercise, exerciseId)],
        });
      }

      toast.success("Ćwiczenie zostało połączone z bazą ćwiczeń.");
      router.refresh();
    } catch (error) {
      console.error("Error adding exercise to library:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Wystąpił błąd podczas dodawania ćwiczenia do bazy.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [exercise, planId, isLoading, router]);

  return { addToLibrary, isLoading };
}
