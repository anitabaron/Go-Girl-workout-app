"use client";

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
import { PlannedParamsEditor } from "./planned-params-editor";
import { useId, useMemo } from "react";
import {
  EXERCISE_PART_LABELS,
  EXERCISE_TYPE_LABELS,
} from "@/lib/constants";

export function WorkoutPlanExerciseItem({
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
  const sectionTypeId = useId();
  const sectionOrderId = useId();

  const exerciseKey = `exercise_${index}`;
  const exerciseErrors: Partial<{
    section_type: string;
    section_order: string;
  }> = errors[`${exerciseKey}.section_type`]
    ? { section_type: errors[`${exerciseKey}.section_type`] }
    : errors[`${exerciseKey}.section_order`]
      ? { section_order: errors[`${exerciseKey}.section_order`] }
      : {};

  // Sprawdź czy można przesunąć ćwiczenie w górę/dół w ramach tej samej sekcji
  const { canMoveUp, canMoveDown } = useMemo(() => {
    if (!onMoveUp && !onMoveDown) {
      return { canMoveUp: false, canMoveDown: false };
    }

    // Znajdź wszystkie ćwiczenia w tej samej sekcji i posortuj je
    const exercisesInSection = exercises
      .map((ex, i) => ({ exercise: ex, originalIndex: i }))
      .filter(({ exercise: ex }) => ex.section_type === exercise.section_type)
      .sort((a, b) => a.exercise.section_order - b.exercise.section_order);

    // Znajdź pozycję bieżącego ćwiczenia (porównaj po indexie w oryginalnej tablicy)
    const currentPosition = exercisesInSection.findIndex(
      ({ originalIndex }) => originalIndex === index
    );

    if (currentPosition === -1) {
      return { canMoveUp: false, canMoveDown: false };
    }

    return {
      canMoveUp: onMoveUp !== undefined && currentPosition > 0,
      canMoveDown:
        onMoveDown !== undefined &&
        currentPosition < exercisesInSection.length - 1,
    };
  }, [exercises, exercise.section_type, index, onMoveUp, onMoveDown]);

  const plannedParamsErrors: Record<string, string> = {};
  if (errors[`${exerciseKey}.planned_sets`]) {
    plannedParamsErrors.planned_sets = errors[`${exerciseKey}.planned_sets`];
  }
  if (errors[`${exerciseKey}.planned_reps`]) {
    plannedParamsErrors.planned_reps = errors[`${exerciseKey}.planned_reps`];
  }
  if (errors[`${exerciseKey}.planned_duration_seconds`]) {
    plannedParamsErrors.planned_duration_seconds =
      errors[`${exerciseKey}.planned_duration_seconds`];
  }
  if (errors[`${exerciseKey}.planned_rest_seconds`]) {
    plannedParamsErrors.planned_rest_seconds =
      errors[`${exerciseKey}.planned_rest_seconds`];
  }
  if (errors[`${exerciseKey}.planned_rest_after_series_seconds`]) {
    plannedParamsErrors.planned_rest_after_series_seconds =
      errors[`${exerciseKey}.planned_rest_after_series_seconds`];
  }
  if (errors[`${exerciseKey}.estimated_set_time_seconds`]) {
    plannedParamsErrors.estimated_set_time_seconds =
      errors[`${exerciseKey}.estimated_set_time_seconds`];
  }

  // Generate stable test ID based on exercise_id or id
  const exerciseTestId = exercise.id 
    ? `workout-plan-exercise-item-${exercise.id}`
    : `workout-plan-exercise-item-${exercise.exercise_id}-${index}`;

  return (
    <Card data-test-id={exerciseTestId}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-semibold">{exercise.exercise_title || "Brak nazwy"}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {exercise.exercise_type && (
                <Badge variant="secondary" className="text-xs">
                  {EXERCISE_TYPE_LABELS[exercise.exercise_type] || exercise.exercise_type}
                </Badge>
              )}
              {exercise.exercise_part && (
                <Badge variant="outline" className="text-xs">
                  {EXERCISE_PART_LABELS[exercise.exercise_part] || exercise.exercise_part}
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
            aria-label="Usuń ćwiczenie z planu"
            data-test-id={`${exerciseTestId}-remove-button`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Section Type and Order */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor={sectionTypeId}
              className="block text-xs font-medium text-muted-foreground"
            >
              Typ sekcji
            </label>
            <Select
              value={exercise.section_type}
              onValueChange={(value) =>
                onChange({ section_type: value as typeof exercise.section_type })
              }
              disabled={disabled}
            >
              <SelectTrigger id={sectionTypeId} className="mt-1" data-test-id={`${exerciseTestId}-section-type`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {exerciseTypeValues.map((type) => (
                  <SelectItem key={type} value={type}>
                    {EXERCISE_TYPE_LABELS[type] || type}
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
            <label
              htmlFor={sectionOrderId}
              className="block text-xs font-medium text-muted-foreground"
            >
              Kolejność
            </label>
            <div className="mt-1 flex items-center gap-1.5">
              <div
                id={sectionOrderId}
                className="flex h-9 w-12 items-center justify-center rounded-md border border-input bg-background text-sm font-medium transition-colors"
                aria-invalid={exerciseErrors.section_order ? "true" : "false"}
              >
                {exercise.section_order}
              </div>
              <div className="flex flex-row gap-0.5">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onMoveUp}
                  disabled={disabled || !canMoveUp}
                  className="h-8 w-8 shrink-0"
                  aria-label="Przesuń w górę"
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
                  aria-label="Przesuń w dół"
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

        {/* Planned Parameters */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-2">
            Parametry planowane (opcjonalne)
          </label>
            <PlannedParamsEditor
            params={{
              planned_sets: exercise.planned_sets,
              planned_reps: exercise.planned_reps,
              planned_duration_seconds: exercise.planned_duration_seconds,
              planned_rest_seconds: exercise.planned_rest_seconds,
              planned_rest_after_series_seconds: exercise.planned_rest_after_series_seconds,
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
