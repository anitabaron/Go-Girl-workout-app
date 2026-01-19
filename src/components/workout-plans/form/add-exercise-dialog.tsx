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
import type { AddExerciseDialogProps } from "@/types/workout-plan-form";
import { ExerciseSelector } from "./exercise-selector";

export function AddExerciseDialog({
  onAddExercise,
  disabled,
  existingExerciseIds = [],
}: Readonly<AddExerciseDialogProps>) {
  const [open, setOpen] = useState(false);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [exercisesMap, setExercisesMap] = useState<Map<string, ExerciseDTO>>(
    new Map()
  );

  const handleToggleExercise = (exercise: ExerciseDTO) => {
    setSelectedExerciseIds((prev) => {
      const isSelected = prev.includes(exercise.id);
      if (isSelected) {
        return prev.filter((id) => id !== exercise.id);
      } else {
        return [...prev, exercise.id];
      }
    });
    // Zapisz pełne dane ćwiczenia w mapie
    setExercisesMap((prev) => {
      const newMap = new Map(prev);
      const isSelected = prev.has(exercise.id);
      if (isSelected) {
        newMap.delete(exercise.id);
      } else {
        newMap.set(exercise.id, exercise);
      }
      return newMap;
    });
  };

  const selectedExercises = useMemo(() => {
    return selectedExerciseIds
      .map((id) => exercisesMap.get(id))
      .filter((exercise): exercise is ExerciseDTO => exercise !== undefined);
  }, [selectedExerciseIds, exercisesMap]);

  const handleAdd = () => {
    if (selectedExercises.length > 0) {
      onAddExercise(selectedExercises);
      setSelectedExerciseIds([]);
      setExercisesMap(new Map());
      setOpen(false);
    }
  };

  const handleCancel = () => {
    setSelectedExerciseIds([]);
    setExercisesMap(new Map());
    setOpen(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Resetuj wybór przy zamykaniu
      setSelectedExerciseIds([]);
      setExercisesMap(new Map());
    }
    setOpen(isOpen);
  };

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
          Dodaj ćwiczenie
        </Button>
      </DialogTrigger>
      <DialogContent className=" max-w-[400px] md:max-w-[600px] lg:max-w-[1000px]">
        <DialogHeader>
          <DialogTitle>Wybierz ćwiczenia</DialogTitle>
          <DialogDescription>
            Wybierz jedno lub więcej ćwiczeń z biblioteki, które chcesz dodać do
            planu treningowego. Możesz wybrać kilka ćwiczeń naraz.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <ExerciseSelector
            selectedExerciseIds={selectedExerciseIds}
            onToggleExercise={handleToggleExercise}
            excludedExerciseIds={existingExerciseIds}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Anuluj
          </Button>
          <Button
            type="button"
            onClick={handleAdd}
            disabled={selectedExercises.length === 0}
          >
            {selectedExercises.length === 0
              ? "Dodaj"
              : `Dodaj ${selectedExercises.length} ${
                  selectedExercises.length === 1
                    ? "ćwiczenie"
                    : selectedExercises.length < 5
                      ? "ćwiczenia"
                      : "ćwiczeń"
                }`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
