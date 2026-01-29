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
import type { WorkoutPlanExerciseDTO } from "@/types";

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

      let exerciseId: string;

      const existing = await getExerciseByTitle(exerciseData.title);
      if (existing?.id) {
        exerciseId = existing.id;
        toast.info(
          "Ćwiczenie już istnieje w bazie. Łączenie z istniejącym ćwiczeniem.",
        );
      } else {
        try {
          const created = await createExercise(exerciseData);
          exerciseId = created.id;
        } catch (createError) {
          const errMsg =
            createError instanceof Error ? createError.message : "";
          if (
            errMsg.includes("już istnieje") ||
            errMsg.includes("CONFLICT") ||
            errMsg.includes("409")
          ) {
            const found = await getExerciseByTitle(exerciseData.title);
            if (found?.id) {
              exerciseId = found.id;
              toast.info(
                "Ćwiczenie już istnieje w bazie. Łączenie z istniejącym ćwiczeniem.",
              );
            } else {
              toast.error(
                "Ćwiczenie o tej nazwie już istnieje, ale nie udało się go znaleźć.",
              );
              return;
            }
          } else if (
            errMsg.includes("Nieprawidłowe") ||
            errMsg.includes("400")
          ) {
            toast.error(errMsg || "Nieprawidłowe dane ćwiczenia.");
            return;
          } else {
            throw createError;
          }
        }
      }

      if (!exercise.snapshot_id) {
        await patchWorkoutPlan(planId, {
          exercises: [
            {
              id: exercise.id,
              exercise_id: exerciseId,
              exercise_title: null,
              exercise_type: null,
              exercise_part: null,
              section_type: exercise.section_type,
              section_order: exercise.section_order,
              planned_sets: exercise.planned_sets ?? 1,
              planned_reps: exercise.planned_reps ?? null,
              planned_duration_seconds:
                exercise.planned_duration_seconds ?? null,
              planned_rest_seconds: exercise.planned_rest_seconds ?? null,
              planned_rest_after_series_seconds:
                exercise.planned_rest_after_series_seconds ??
                exercise.exercise_rest_after_series_seconds ??
                null,
              estimated_set_time_seconds:
                exercise.estimated_set_time_seconds ??
                exercise.exercise_estimated_set_time_seconds ??
                null,
            },
          ],
        });
      } else {
        await linkSnapshotToExercise(exercise.snapshot_id, exerciseId);
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
