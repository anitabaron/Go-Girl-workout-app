"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { WorkoutPlanExerciseDTO } from "@/types";
import { useExerciseExists } from "@/hooks/use-exercise-exists";
import { useAddSnapshotToLibrary } from "@/hooks/use-add-snapshot-to-library";

type AddSnapshotExerciseButtonProps = {
  readonly exercise: WorkoutPlanExerciseDTO;
  readonly planId: string;
};

/**
 * Przycisk do dodawania ćwiczenia ze snapshotu do bazy ćwiczeń.
 * Wyświetla się tylko dla ćwiczeń, które nie są w bibliotece (is_exercise_in_library === false).
 */
export function AddSnapshotExerciseButton({
  exercise,
  planId,
}: AddSnapshotExerciseButtonProps) {
  const exerciseExists = useExerciseExists(
    exercise.exercise_title ?? null,
    exercise.is_exercise_in_library === true,
  );
  const { addToLibrary, isLoading } = useAddSnapshotToLibrary(exercise, planId);

  if (exercise.is_exercise_in_library !== false) {
    return null;
  }

  if (exerciseExists === true) {
    return null;
  }

  if (exerciseExists === null) {
    return null;
  }

  return (
    <Button
      onClick={addToLibrary}
      disabled={isLoading}
      variant="outline"
      size="sm"
      className="mt-4"
    >
      <Plus className="mr-2 h-4 w-4" />
      {isLoading ? "Dodawanie..." : "Dodaj to ćwiczenie do bazy ćwiczeń"}
    </Button>
  );
}
