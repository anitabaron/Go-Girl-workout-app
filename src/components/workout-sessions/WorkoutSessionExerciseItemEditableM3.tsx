"use client";

import { useState } from "react";
import { Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { exerciseTypeValues } from "@/lib/validation/exercises";
import {
  EXERCISE_LABELS_NAMESPACE,
  getExercisePartLabel,
  getExerciseTypeLabel,
} from "@/lib/exercises/labels";
import { SetLogsListM3 } from "./assistant/SetLogsListM3";
import { useExerciseExecutionForm } from "@/hooks/use-exercise-execution-form";
import {
  patchWorkoutSessionExercise,
  deleteWorkoutSessionExercise,
  moveWorkoutSessionExercise,
} from "@/lib/api/workout-sessions";
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
  readonly onDeleted?: () => void;
  readonly onMoved?: () => void;
};

export function WorkoutSessionExerciseItemEditableM3({
  exercise,
  exerciseIndex,
  totalExercises,
  sessionId,
  onSaved,
  onDeleted,
  onMoved,
}: WorkoutSessionExerciseItemEditableM3Props) {
  const t = useTranslations("workoutSessionExerciseItemEditable");
  const tExerciseLabel = useTranslations(EXERCISE_LABELS_NAMESPACE);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  const {
    formData,
    handlers: {
      handleSetAdd,
      handleSetUpdate,
      handleSetRemove,
      handleSkipToggle,
    },
  } = useExerciseExecutionForm(exercise, () => {});

  // Sesja zaimportowana jako DONE nie ma "planu" (planned_* = null), więc o tym,
  // czy pokazać pole powtórzeń/czasu, decyduje obecność danych rzeczywistych
  // (sets / actual_*), a nie tylko planned_* — patrz WorkoutSessionExerciseItemM3.
  const hasActualReps =
    exercise.actual_sum_reps != null ||
    (exercise.sets ?? []).some((set) => set.reps != null);
  const hasActualDuration =
    exercise.actual_duration_seconds != null ||
    (exercise.sets ?? []).some((set) => set.duration_seconds != null);
  const hasRepsSignal =
    (exercise.planned_reps !== null && exercise.planned_reps > 0) ||
    hasActualReps;
  const hasDurationSignal =
    (exercise.planned_duration_seconds !== null &&
      exercise.planned_duration_seconds > 0) ||
    hasActualDuration;
  // Gdy ćwiczenie nie ma jeszcze żadnych danych (ani powtórzeń, ani czasu -
  // np. dodane właśnie do sesji albo bez konkretnej metryki w oryginalnym
  // opisie), pokaż oba pola, żeby dało się wpisać którekolwiek z nich.
  const noSignalYet = !hasRepsSignal && !hasDurationSignal;
  const showReps = hasRepsSignal || noSignalYet;
  const showDuration = hasDurationSignal || noSignalYet;

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

  const handleDelete = async () => {
    if (!window.confirm(t("deleteConfirm"))) return;
    setIsDeleting(true);
    try {
      await deleteWorkoutSessionExercise(sessionId, order);
      toast.success(t("deletedSuccess"));
      onDeleted?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("deleteFailed");
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMove = async (direction: "up" | "down") => {
    setIsMoving(true);
    try {
      await moveWorkoutSessionExercise(sessionId, order, direction);
      onMoved?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("moveFailed");
      toast.error(message);
    } finally {
      setIsMoving(false);
    }
  };

  const handleTypeChange = async (
    value: SessionExerciseDTO["exercise_type_at_time"],
  ) => {
    try {
      const response = await patchWorkoutSessionExercise(sessionId, order, {
        exercise_type_at_time: value,
      });
      onSaved?.(response.data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("saveFailed");
      toast.error(message);
    }
  };

  return (
    <Card data-test-id="workout-session-exercise-item-editable">
      <CardHeader>
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="m3-title">{title}</h3>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {exerciseIndex + 1} {t("of")} {totalExercises}
            </span>
            <div className="flex gap-0.5">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleMove("up")}
                disabled={isMoving || exerciseIndex === 0}
                className="size-8 shrink-0"
                aria-label={t("moveUp")}
              >
                <ChevronUp className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleMove("down")}
                disabled={isMoving || exerciseIndex === totalExercises - 1}
                className="size-8 shrink-0"
                aria-label={t("moveDown")}
              >
                <ChevronDown className="size-4" />
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              aria-label={t("deleteExercise")}
              aria-busy={isDeleting}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {exercise.exercise_type_at_time && (
            <Select
              value={exercise.exercise_type_at_time}
              onValueChange={(value) =>
                handleTypeChange(
                  value as SessionExerciseDTO["exercise_type_at_time"],
                )
              }
            >
              <SelectTrigger size="sm" className="h-8 w-auto text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {exerciseTypeValues.map((typeValue) => (
                  <SelectItem key={typeValue} value={typeValue}>
                    {getExerciseTypeLabel(tExerciseLabel, typeValue)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
