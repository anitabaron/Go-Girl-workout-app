"use client";

import { useState } from "react";
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
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDTO | null>(
    null
  );

  const handleSelectExercise = (exercise: ExerciseDTO) => {
    setSelectedExercise(exercise);
  };

  const handleAdd = () => {
    if (selectedExercise) {
      onAddExercise(selectedExercise);
      setSelectedExercise(null);
      setOpen(false);
    }
  };

  const handleCancel = () => {
    setSelectedExercise(null);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Wybierz ćwiczenie</DialogTitle>
          <DialogDescription>
            Wybierz ćwiczenie z biblioteki, które chcesz dodać do planu
            treningowego.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <ExerciseSelector
            onSelectExercise={handleSelectExercise}
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
            disabled={!selectedExercise}
          >
            Dodaj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
