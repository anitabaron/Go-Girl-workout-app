"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { WorkoutPlanExerciseDTO } from "@/types";
import { useExerciseExists } from "@/hooks/use-exercise-exists";
import { useAddSnapshotToLibrary } from "@/hooks/use-add-snapshot-to-library";
import { useTranslations } from "@/i18n/client";

type AddSnapshotExerciseButtonM3Props = {
  readonly exercise: WorkoutPlanExerciseDTO;
  readonly planId: string;
};

export function AddSnapshotExerciseButtonM3({
  exercise,
  planId,
}: AddSnapshotExerciseButtonM3Props) {
  const t = useTranslations("addSnapshotExerciseButton");
  const exerciseExists = useExerciseExists(
    exercise.exercise_title ?? null,
    exercise.is_exercise_in_library === true,
  );
  const { addToLibrary, isLoading } = useAddSnapshotToLibrary(exercise, planId);

  if (exercise.is_exercise_in_library !== false) return null;
  if (exerciseExists === true) return null;
  if (exerciseExists === null) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      className="mt-4"
      onClick={addToLibrary}
      disabled={isLoading}
    >
      <Plus className="mr-2 size-4" />
      {isLoading ? t("adding") : t("add")}
    </Button>
  );
}
