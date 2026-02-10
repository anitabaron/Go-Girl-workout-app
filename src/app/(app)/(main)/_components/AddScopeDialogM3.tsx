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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Layers } from "lucide-react";
import type { ExerciseDTO, ExerciseType } from "@/types";
import { ExerciseSelectorM3 } from "./ExerciseSelectorM3";

const SECTION_TYPES: { value: ExerciseType; label: string }[] = [
  { value: "Warm-up", label: "Warm-up" },
  { value: "Main Workout", label: "Main Workout" },
  { value: "Cool-down", label: "Cool-down" },
];

const DEFAULT_REPEAT_COUNT = 3;

type AddScopeDialogM3Props = {
  onAddScope: (
    exercises: ExerciseDTO[],
    sectionType: ExerciseType,
    repeatCount: number,
  ) => void;
  disabled: boolean;
  existingExerciseIds?: string[];
};

export function AddScopeDialogM3({
  onAddScope,
  disabled,
  existingExerciseIds = [],
}: Readonly<AddScopeDialogM3Props>) {
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
  const isValidRepeat = !Number.isNaN(repeatCountNum) && repeatCountNum >= 1;
  const canConfirm = selectedExercises.length > 0 && isValidRepeat;
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
          className="m3-cta gap-2"
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

        <div className="space-y-2">
          <div className="flex gap-2 items-end">
            <div className="min-w-0 space-y-2">
              <label htmlFor="scope-section-type" className="text-sm">
                Section
              </label>
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
            <div className="w-16 shrink-0 space-y-2">
              <label
                htmlFor="scope-repeat-count"
                className="text-sm whitespace-nowrap"
              >
                Repeat (times)
              </label>
              <Input
                id="scope-repeat-count"
                type="number"
                min={1}
                max={9}
                value={repeatCount}
                onChange={(e) => {
                  const v = e.target.value;
                  setRepeatCount(
                    v === "" ? DEFAULT_REPEAT_COUNT : Number.parseInt(v, 10),
                  );
                }}
                className="w-full text-center tabular-nums"
                data-test-id="workout-plan-form-add-scope-repeat"
              />
            </div>
          </div>

          <div>
            <p className="text-sm mb-2">Exercises in scope (order)</p>
            <ExerciseSelectorM3
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
            className="m3-cta"
            data-test-id="workout-plan-form-add-scope-dialog-confirm"
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
