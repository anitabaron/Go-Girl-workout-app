"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ExerciseTypeBadge } from "@/components/ui/exercise-type-badge";
import {
  EXERCISE_LABELS_NAMESPACE,
  getExercisePartLabel,
} from "@/lib/exercises/labels";
import { SetLogsListM3 } from "./assistant/SetLogsListM3";
import { useExerciseExecutionForm } from "@/hooks/use-exercise-execution-form";
import { patchWorkoutSessionExercise } from "@/lib/api/workout-sessions";
import { formDataToAutosaveCommand } from "@/types/workout-session-assistant";
import type { SessionExerciseDTO } from "@/types";
import { toast } from "sonner";
import { useTranslations } from "@/i18n/client";

type WorkoutSessionExerciseItemEditableM3Props = {
  readonly exercise: SessionExerciseDTO;
  readonly exerciseIndex: number;
  readonly totalExercises: number;
  readonly sessionId: string;
  readonly onSaved?: (updatedExercise: SessionExerciseDTO) => void;
};

export function WorkoutSessionExerciseItemEditableM3({
  exercise,
  exerciseIndex,
  totalExercises,
  sessionId,
  onSaved,
}: WorkoutSessionExerciseItemEditableM3Props) {
  const t = useTranslations("workoutSessionExerciseItemEditable");
  const tExerciseLabel = useTranslations(EXERCISE_LABELS_NAMESPACE);
  const [isSaving, setIsSaving] = useState(false);

  const {
    formData,
    handlers: {
      handleSetAdd,
      handleSetUpdate,
      handleSetRemove,
      handleSkipToggle,
    },
  } = useExerciseExecutionForm(exercise, () => {});

  const showDuration =
    exercise.planned_duration_seconds !== null &&
    exercise.planned_duration_seconds > 0;
  const showReps = exercise.planned_reps !== null && exercise.planned_reps > 0;

  const title =
    exercise.exercise_title_at_time ??
    `${t("exerciseLabel")} ${exerciseIndex + 1}`;
  const order = exercise.exercise_order;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const command = formDataToAutosaveCommand(formData, false);
      const response = await patchWorkoutSessionExercise(
        sessionId,
        order,
        command,
      );
      toast.success(t("savedSuccess"));
      onSaved?.(response.data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("saveFailed");
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card data-test-id="workout-session-exercise-item-editable">
      <CardHeader>
        <div className="mb-3 flex items-start justify-between">
          <h3 className="m3-title">{title}</h3>
          <span className="text-sm text-muted-foreground">
            {exerciseIndex + 1} {t("of")} {totalExercises}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {exercise.exercise_type_at_time && (
            <ExerciseTypeBadge type={exercise.exercise_type_at_time} />
          )}
          {exercise.exercise_part_at_time && (
            <Badge variant="outline">
              {getExercisePartLabel(tExerciseLabel, exercise.exercise_part_at_time)}
            </Badge>
          )}
          {exercise.exercise_is_unilateral_at_time && (
            <Badge variant="secondary">{t("unilateral")}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-[var(--m3-radius-lg)] border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-high)] p-4 shadow-sm">
          <h4 className="mb-3 m3-label">{t("editExecution")}</h4>

          <SetLogsListM3
            sets={formData.sets}
            onAdd={handleSetAdd}
            onUpdate={handleSetUpdate}
            onRemove={handleSetRemove}
            showDuration={showDuration}
            showReps={showReps}
            isSkipped={formData.is_skipped}
          />

          <div className="mt-4 flex items-center gap-2">
            <Checkbox
              id={`is_skipped_${exercise.id}`}
              checked={formData.is_skipped}
              onCheckedChange={(checked) => handleSkipToggle(checked === true)}
              aria-label={t("skipExercise")}
            />
            <Label
              htmlFor={`is_skipped_${exercise.id}`}
              className="cursor-pointer text-sm font-medium text-foreground"
            >
              {t("skipExercise")}
            </Label>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="m3-cta"
          aria-busy={isSaving}
        >
          {isSaving ? t("saving") : t("saveExercise")}
        </Button>
      </CardContent>
    </Card>
  );
}
