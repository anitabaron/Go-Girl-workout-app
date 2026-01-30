"use client";

import { useMemo } from "react";
import { Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { exerciseTypeValues } from "@/lib/validation/exercises";
import type { WorkoutPlanExerciseItemProps } from "@/types/workout-plan-form";
import { ExerciseTypeBadge } from "@/components/ui/exercise-type-badge";
import { EXERCISE_PART_LABELS, EXERCISE_TYPE_LABELS } from "@/lib/constants";
import { PlannedParamsEditorM3 } from "./PlannedParamsEditorM3";

export function WorkoutPlanExerciseItemM3({
  exercise,
  index,
  exercises,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  errors,
  disabled,
}: Readonly<WorkoutPlanExerciseItemProps>) {
  const exerciseKey = `exercise_${index}`;
  const exerciseErrors: Partial<{
    section_type: string;
    section_order: string;
  }> = {};
  if (errors[`${exerciseKey}.section_type`]) {
    exerciseErrors.section_type = errors[`${exerciseKey}.section_type`];
  }
  if (errors[`${exerciseKey}.section_order`]) {
    exerciseErrors.section_order = errors[`${exerciseKey}.section_order`];
  }

  const { canMoveUp, canMoveDown } = useMemo(() => {
    const exercisesInSection = exercises
      .map((ex, i) => ({ exercise: ex, originalIndex: i }))
      .filter(({ exercise: ex }) => ex.section_type === exercise.section_type)
      .sort((a, b) => a.exercise.section_order - b.exercise.section_order);

    const currentPosition = exercisesInSection.findIndex(
      ({ originalIndex }) => originalIndex === index,
    );

    if (currentPosition === -1) {
      return { canMoveUp: false, canMoveDown: false };
    }

    return {
      canMoveUp: onMoveUp != null && currentPosition > 0,
      canMoveDown:
        onMoveDown != null && currentPosition < exercisesInSection.length - 1,
    };
  }, [exercises, exercise.section_type, index, onMoveUp, onMoveDown]);

  const plannedParamsErrors: Record<string, string> = {};
  const plannedKeys = [
    "planned_sets",
    "planned_reps",
    "planned_duration_seconds",
    "planned_rest_seconds",
    "planned_rest_after_series_seconds",
    "estimated_set_time_seconds",
  ] as const;
  for (const key of plannedKeys) {
    const err = errors[`${exerciseKey}.${key}`];
    if (err) plannedParamsErrors[key] = err;
  }

  const exerciseTestId =
    exercise.id != null
      ? `workout-plan-exercise-item-${exercise.id}`
      : `workout-plan-exercise-item-${exercise.exercise_id ?? "new"}-${index}`;

  return (
    <Card data-test-id={exerciseTestId}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="m3-title">{exercise.exercise_title ?? "No name"}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {exercise.exercise_type && (
                <ExerciseTypeBadge
                  type={exercise.exercise_type}
                  className="text-xs"
                />
              )}
              {exercise.exercise_part && (
                <Badge variant="outline" className="text-xs">
                  {EXERCISE_PART_LABELS[exercise.exercise_part] ??
                    exercise.exercise_part}
                </Badge>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            disabled={disabled}
            className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            aria-label="Remove exercise from plan"
            data-test-id={`${exerciseTestId}-remove-button`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground">
              Section type
            </label>
            <Select
              value={exercise.section_type}
              onValueChange={(value) =>
                onChange({
                  section_type: value as typeof exercise.section_type,
                })
              }
              disabled={disabled}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {exerciseTypeValues.map((t) => (
                  <SelectItem key={t} value={t}>
                    {EXERCISE_TYPE_LABELS[t] ?? t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {exerciseErrors.section_type && (
              <p className="mt-1 text-xs text-destructive" role="alert">
                {exerciseErrors.section_type}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground">
              Order
            </label>
            <div className="mt-1 flex items-center gap-1.5">
              <div
                className="flex h-9 w-12 items-center justify-center rounded-md border border-input bg-background text-sm font-medium"
                aria-invalid={!!exerciseErrors.section_order}
              >
                {exercise.section_order}
              </div>
              <div className="flex gap-0.5">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onMoveUp}
                  disabled={disabled || !canMoveUp}
                  className="h-8 w-8 shrink-0"
                  aria-label="Move up"
                >
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onMoveDown}
                  disabled={disabled || !canMoveDown}
                  className="h-8 w-8 shrink-0"
                  aria-label="Move down"
                >
                  <ChevronDown className="size-4" />
                </Button>
              </div>
            </div>
            {exerciseErrors.section_order && (
              <p className="mt-1 text-xs text-destructive" role="alert">
                {exerciseErrors.section_order}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium text-muted-foreground">
            Planned parameters (optional)
          </label>
          <PlannedParamsEditorM3
            params={{
              planned_sets: exercise.planned_sets,
              planned_reps: exercise.planned_reps,
              planned_duration_seconds: exercise.planned_duration_seconds,
              planned_rest_seconds: exercise.planned_rest_seconds,
              planned_rest_after_series_seconds:
                exercise.planned_rest_after_series_seconds,
              estimated_set_time_seconds: exercise.estimated_set_time_seconds,
            }}
            onChange={(field, value) => onChange({ [field]: value })}
            errors={plannedParamsErrors}
            disabled={disabled}
            data-test-id-prefix={exerciseTestId}
          />
        </div>
      </CardContent>
    </Card>
  );
}
