"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { exerciseTypeValues } from "@/lib/validation/exercises";
import type { WorkoutPlanExerciseItemProps } from "@/types/workout-plan-form";
import { PlannedParamsEditor } from "./planned-params-editor";
import { useId } from "react";

const partLabels: Record<string, string> = {
  Legs: "Nogi",
  Core: "Brzuch",
  Back: "Plecy",
  Arms: "Ręce",
  Chest: "Klatka",
};

const typeLabels: Record<string, string> = {
  "Warm-up": "Rozgrzewka",
  "Main Workout": "Główny trening",
  "Cool-down": "Schłodzenie",
};

export function WorkoutPlanExerciseItem({
  exercise,
  index,
  onChange,
  onRemove,
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-semibold">{exercise.exercise_title || "Brak nazwy"}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {exercise.exercise_type && (
                <Badge variant="secondary" className="text-xs">
                  {typeLabels[exercise.exercise_type] || exercise.exercise_type}
                </Badge>
              )}
              {exercise.exercise_part && (
                <Badge variant="outline" className="text-xs">
                  {partLabels[exercise.exercise_part] || exercise.exercise_part}
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
              <SelectTrigger id={sectionTypeId} className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {exerciseTypeValues.map((type) => (
                  <SelectItem key={type} value={type}>
                    {typeLabels[type] || type}
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
            <Input
              id={sectionOrderId}
              type="number"
              min="1"
              step="1"
              value={exercise.section_order}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (!Number.isNaN(value) && Number.isInteger(value) && value > 0) {
                  onChange({ section_order: value });
                }
              }}
              disabled={disabled}
              className="mt-1"
              aria-invalid={exerciseErrors.section_order ? "true" : "false"}
            />
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
            }}
            onChange={(field, value) => onChange({ [field]: value })}
            errors={plannedParamsErrors}
            disabled={disabled}
          />
        </div>
      </CardContent>
    </Card>
  );
}
