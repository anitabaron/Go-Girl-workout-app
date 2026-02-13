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
import { PlannedParamsEditorM3 } from "./PlannedParamsEditorM3";
import { useTranslations } from "@/i18n/client";

export function WorkoutPlanExerciseItemM3({
  exercise,
  index,
  exercises,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  onMoveWithinScope,
  errors,
  disabled,
}: Readonly<WorkoutPlanExerciseItemProps>) {
  const t = useTranslations("workoutPlanExerciseItem");
  const getTypeLabel = (value: string) => {
    if (value === "Warm-up") return t("typeOption.warmup");
    if (value === "Main Workout") return t("typeOption.mainworkout");
    if (value === "Cool-down") return t("typeOption.cooldown");
    return value;
  };
  const getPartLabel = (value: string) => {
    if (value === "Legs") return t("partOption.legs");
    if (value === "Core") return t("partOption.core");
    if (value === "Back") return t("partOption.back");
    if (value === "Arms") return t("partOption.arms");
    if (value === "Chest") return t("partOption.chest");
    if (value === "Glutes") return t("partOption.glutes");
    return value;
  };
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

  const inScope = exercise.scope_id != null && exercise.in_scope_nr != null;
  const scopeMoveFlags = useMemo(() => {
    if (!inScope) return null;
    const inScopeExercises = exercises
      .filter(
        (ex) => ex.scope_id === exercise.scope_id && ex.in_scope_nr != null,
      )
      .sort((a, b) => (a.in_scope_nr ?? 0) - (b.in_scope_nr ?? 0));
    const myNr = exercise.in_scope_nr ?? 0;
    const hasPrev = inScopeExercises.some(
      (ex) => (ex.in_scope_nr ?? 0) === myNr - 1,
    );
    const hasNext = inScopeExercises.some(
      (ex) => (ex.in_scope_nr ?? 0) === myNr + 1,
    );
    return {
      canMoveUp: hasPrev,
      canMoveDown: hasNext,
    };
  }, [exercises, exercise.scope_id, exercise.in_scope_nr, inScope]);

  const { canMoveUp, canMoveDown } = useMemo(() => {
    if (inScope && onMoveWithinScope != null && scopeMoveFlags) {
      return {
        canMoveUp: scopeMoveFlags.canMoveUp,
        canMoveDown: scopeMoveFlags.canMoveDown,
      };
    }
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
  }, [
    inScope,
    onMoveWithinScope,
    scopeMoveFlags,
    exercises,
    exercise.section_type,
    index,
    onMoveUp,
    onMoveDown,
  ]);

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
    exercise.id == null
      ? `workout-plan-exercise-item-${exercise.exercise_id ?? "new"}-${index}`
      : `workout-plan-exercise-item-${exercise.id}`;

  return (
    <Card data-test-id={exerciseTestId}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="m3-title">
              {exercise.exercise_title ?? t("noName")}
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {exercise.exercise_type && (
                <ExerciseTypeBadge
                  type={exercise.exercise_type}
                  className="text-xs"
                />
              )}
              {exercise.exercise_part && (
                <Badge variant="outline" className="text-xs">
                  {getPartLabel(exercise.exercise_part)}
                </Badge>
              )}
              {exercise.exercise_is_unilateral && (
                <Badge variant="secondary" className="text-xs">
                  {t("unilateral")}
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
            aria-label={t("removeAria")}
            data-test-id={`${exerciseTestId}-remove-button`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 xs:grid-cols-2">
          <div>
            <label
              htmlFor={`${exerciseTestId}-section-type`}
              className="block text-xs font-medium text-muted-foreground"
            >
              {t("sectionType")}
            </label>
            <Select
              value={exercise.section_type}
              onValueChange={(value) =>
                onChange({
                  section_type: value as typeof exercise.section_type,
                })
              }
              disabled={disabled || inScope}
            >
              <SelectTrigger
                id={`${exerciseTestId}-section-type`}
                className="mt-1"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {exerciseTypeValues.map((typeValue) => (
                  <SelectItem key={typeValue} value={typeValue}>
                    {getTypeLabel(typeValue)}
                    </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!inScope && exerciseErrors.section_type && (
              <p className="mt-1 text-xs text-destructive" role="alert">
                {exerciseErrors.section_type}
              </p>
            )}
          </div>

          <div>
            <span className="block text-xs font-medium text-muted-foreground">
              {exercise.in_scope_nr != null
                ? t("orderInScope")
                : t("orderInSection")}
            </span>
            <div className="mt-1 flex items-center gap-1.5">
              <div
                className="flex h-9 w-12 items-center justify-center rounded-md border border-input bg-background text-sm font-medium"
                aria-invalid={
                  exercise.in_scope_nr != null
                    ? false
                    : !!exerciseErrors.section_order
                }
              >
                {exercise.in_scope_nr != null
                  ? exercise.in_scope_nr
                  : exercise.section_order}
              </div>
              <div className="flex gap-0.5">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    inScope && onMoveWithinScope
                      ? onMoveWithinScope("up")
                      : onMoveUp?.()
                  }
                  disabled={disabled || !canMoveUp}
                  className="h-8 w-8 shrink-0"
                  aria-label={inScope ? t("moveUpInScope") : t("moveUp")}
                >
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    inScope && onMoveWithinScope
                      ? onMoveWithinScope("down")
                      : onMoveDown?.()
                  }
                  disabled={disabled || !canMoveDown}
                  className="h-8 w-8 shrink-0"
                  aria-label={inScope ? t("moveDownInScope") : t("moveDown")}
                >
                  <ChevronDown className="size-4" />
                </Button>
              </div>
            </div>
            {exercise.in_scope_nr == null && exerciseErrors.section_order && (
              <p className="mt-1 text-xs text-destructive" role="alert">
                {exerciseErrors.section_order}
              </p>
            )}
          </div>
        </div>

        <div>
          <span className="mb-2 block text-xs font-medium text-muted-foreground">
            {t("plannedParamsOptional")}
          </span>
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
            isUnilateral={exercise.exercise_is_unilateral}
            data-test-id-prefix={exerciseTestId}
            showRepsField={(exercise.initial_planned_reps ?? 0) > 0}
            showDurationField={
              (exercise.initial_planned_duration_seconds ?? 0) > 0
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
