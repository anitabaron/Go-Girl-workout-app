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
import { ExerciseSelectorM3 } from "./ExerciseSelectorM3";

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
      ? "Add"
      : selectedExercises.length === 1
        ? "Add 1 exercise"
        : `Add ${selectedExercises.length} exercises`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="gap-2"
        >
          <Plus className="size-4" />
          Add exercise
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[400px] md:max-w-[600px] lg:max-w-[1000px]">
        <DialogHeader>
          <DialogTitle>Select exercises</DialogTitle>
          <DialogDescription>
            Choose one or more exercises from your library to add to the plan.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <ExerciseSelectorM3
            selectedExerciseIds={selectedExerciseIds}
            onToggleExercise={handleToggleExercise}
            excludedExerciseIds={existingExerciseIds}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleAdd}
            disabled={selectedExercises.length === 0}
          >
            {countLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
