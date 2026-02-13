"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import type { ExerciseDTO } from "@/types";
import { ExerciseSelectorM3 } from "@/components/exercises/ExerciseSelectorM3";
import { useTranslations } from "@/i18n/client";

type AddExerciseDialogM3Props = {
  onAddExercise: (exercises: ExerciseDTO | ExerciseDTO[]) => void;
  disabled: boolean;
  existingExerciseIds?: string[];
};

export function AddExerciseDialogM3({
  onAddExercise,
  disabled,
  existingExerciseIds = [],
}: Readonly<AddExerciseDialogM3Props>) {
  const t = useTranslations("addExerciseDialog");
  const [open, setOpen] = useState(false);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [exercisesMap, setExercisesMap] = useState<Map<string, ExerciseDTO>>(
    new Map(),
  );

  const handleToggleExercise = (exercise: ExerciseDTO) => {
    setSelectedExerciseIds((prev) => {
      const isSelected = prev.includes(exercise.id);
      if (isSelected) {
        return prev.filter((id) => id !== exercise.id);
      }
      return [...prev, exercise.id];
    });
    setExercisesMap((prev) => {
      const newMap = new Map(prev);
      if (newMap.has(exercise.id)) {
        newMap.delete(exercise.id);
      } else {
        newMap.set(exercise.id, exercise);
      }
      return newMap;
    });
  };

  const selectedExercises = useMemo(
    () =>
      selectedExerciseIds
        .map((id) => exercisesMap.get(id))
        .filter((ex): ex is ExerciseDTO => ex !== undefined),
    [selectedExerciseIds, exercisesMap],
  );

  const handleAdd = () => {
    if (selectedExercises.length > 0) {
      onAddExercise(selectedExercises);
      setSelectedExerciseIds([]);
      setExercisesMap(new Map());
      setOpen(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedExerciseIds([]);
      setExercisesMap(new Map());
    }
    setOpen(isOpen);
  };

  const countLabel =
    selectedExercises.length === 0
      ? t("add")
      : selectedExercises.length === 1
        ? t("addOne")
        : t("addMany").replace("{count}", String(selectedExercises.length));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          disabled={disabled}
          className="m3-cta gap-2"
          data-test-id="workout-plan-form-add-exercise-button"
        >
          <Plus className="size-4" />
          {t("trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="flex max-h-[calc(100vh-2rem)] max-w-[400px] flex-col overflow-hidden rounded-[var(--m3-radius-large)] p-4 sm:p-6 md:max-w-[600px] lg:max-w-[1000px]"
        data-test-id="workout-plan-form-add-exercise-dialog"
      >
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto py-2 pr-1">
          <ExerciseSelectorM3
            selectedExerciseIds={selectedExerciseIds}
            onToggleExercise={handleToggleExercise}
            excludedExerciseIds={existingExerciseIds}
          />
        </div>

        <DialogFooter className="mt-2 shrink-0 pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            data-test-id="workout-plan-form-add-exercise-dialog-cancel"
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleAdd}
            disabled={selectedExercises.length === 0}
            data-test-id="workout-plan-form-add-exercise-dialog-confirm"
          >
            {countLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
