"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { SessionExerciseDTO } from "@/types";
import { useAddSessionSnapshotToLibrary } from "@/hooks/use-add-session-snapshot-to-library";
import { useTranslations } from "@/i18n/client";

type AddSessionSnapshotExerciseButtonM3Props = {
  readonly exercise: SessionExerciseDTO;
  readonly sessionId: string;
};

export function AddSessionSnapshotExerciseButtonM3({
  exercise,
  sessionId,
}: AddSessionSnapshotExerciseButtonM3Props) {
  const t = useTranslations("addSnapshotExerciseButton");
  const { addToLibrary, isLoading } = useAddSessionSnapshotToLibrary(
    exercise,
    sessionId,
  );

  // Ćwiczenie jest już powiązane z biblioteką — nic do dodania.
  if (exercise.exercise_id) return null;

  return (
    <div className="mt-6 pt-2">
      <Button
        variant="outline"
        size="sm"
        onClick={addToLibrary}
        disabled={isLoading}
      >
        <Plus className="mr-2 size-4" />
        {isLoading ? t("adding") : t("add")}
      </Button>
    </div>
  );
}
