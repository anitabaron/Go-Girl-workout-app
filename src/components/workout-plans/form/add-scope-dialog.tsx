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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Layers } from "lucide-react";
import type { ExerciseDTO, ExerciseType } from "@/types";
import type { AddScopeDialogProps } from "@/types/workout-plan-form";
import { ExerciseSelector } from "./exercise-selector";

const SECTION_TYPES: { value: ExerciseType; label: string }[] = [
  { value: "Warm-up", label: "Warm-up" },
  { value: "Main Workout", label: "Main Workout" },
  { value: "Cool-down", label: "Cool-down" },
];

const DEFAULT_REPEAT_COUNT = 3;

export function AddScopeDialog({
  onAddScope,
  disabled,
  existingExerciseIds = [],
}: Readonly<AddScopeDialogProps>) {
  const [open, setOpen] = useState(false);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [exercisesMap, setExercisesMap] = useState<Map<string, ExerciseDTO>>(
    new Map(),
  );
  const [sectionType, setSectionType] = useState<ExerciseType>("Main Workout");
  const [repeatCount, setRepeatCount] = useState(DEFAULT_REPEAT_COUNT);

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
    if (selectedExercises.length > 0 && repeatCount >= 1) {
      onAddScope(selectedExercises, sectionType, repeatCount);
      setSelectedExerciseIds([]);
      setExercisesMap(new Map());
      setRepeatCount(DEFAULT_REPEAT_COUNT);
      setSectionType("Main Workout");
      setOpen(false);
    }
  };

  const handleCancel = () => {
    setSelectedExerciseIds([]);
    setExercisesMap(new Map());
    setRepeatCount(DEFAULT_REPEAT_COUNT);
    setSectionType("Main Workout");
    setOpen(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedExerciseIds([]);
      setExercisesMap(new Map());
      setRepeatCount(DEFAULT_REPEAT_COUNT);
      setSectionType("Main Workout");
    }
    setOpen(isOpen);
  };

  const repeatCountNum =
    typeof repeatCount === "string"
      ? Number.parseInt(repeatCount, 10)
      : repeatCount;
  const isValidRepeat =
    !Number.isNaN(repeatCountNum) && repeatCountNum >= 1;
  const canConfirm =
    selectedExercises.length > 0 && isValidRepeat;
  const exerciseSuffix = selectedExercises.length === 1 ? "" : "s";
  const confirmLabel =
    selectedExercises.length === 0
      ? "Add scope"
      : `Add scope (${selectedExercises.length} exercise${exerciseSuffix} × ${repeatCountNum})`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="gap-2"
          data-test-id="workout-plan-form-add-scope-button"
        >
          <Layers className="size-4" />
          Add scope
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-[400px] md:max-w-[600px] lg:max-w-[1000px]"
        data-test-id="workout-plan-form-add-scope-dialog"
      >
        <DialogHeader>
          <DialogTitle>Add scope</DialogTitle>
          <DialogDescription>
            Choose multiple exercises to run one after another, then repeat the
            block. Example: Exercise A → B → C, repeated 3 times.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="scope-section-type">Section</Label>
              <Select
                value={sectionType}
                onValueChange={(v) => setSectionType(v as ExerciseType)}
              >
                <SelectTrigger id="scope-section-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SECTION_TYPES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="scope-repeat-count">Repeat (times)</Label>
              <Input
                id="scope-repeat-count"
                type="number"
                min={1}
                value={repeatCount}
                onChange={(e) =>
                  setRepeatCount(
                    e.target.value === ""
                      ? DEFAULT_REPEAT_COUNT
                      : Number.parseInt(e.target.value, 10),
                  )
                }
                data-test-id="workout-plan-form-add-scope-repeat"
              />
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Exercises in scope (order)</Label>
            <ExerciseSelector
              selectedExerciseIds={selectedExerciseIds}
              onToggleExercise={handleToggleExercise}
              excludedExerciseIds={existingExerciseIds}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            data-test-id="workout-plan-form-add-scope-dialog-cancel"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleAdd}
            disabled={!canConfirm}
            data-test-id="workout-plan-form-add-scope-dialog-confirm"
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
