"use client";

import { SetLogsListM3 } from "./SetLogsListM3";
import { ExecutionSummaryDisplayM3 } from "./ExecutionSummaryDisplayM3";
import { useExerciseExecutionForm } from "@/hooks/use-exercise-execution-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { SessionExerciseDTO } from "@/types";
import type {
  ExerciseFormData,
  FormErrors,
} from "@/types/workout-session-assistant";

type ExerciseExecutionFormM3Props = {
  exercise: SessionExerciseDTO;
  onChange: (data: ExerciseFormData) => void;
  errors?: FormErrors;
};

export function ExerciseExecutionFormM3({
  exercise,
  onChange,
  errors,
}: Readonly<ExerciseExecutionFormM3Props>) {
  const {
    formData,
    summaryValues,
    handlers: {
      handleSetAdd,
      handleSetUpdate,
      handleSetRemove,
      handleSkipToggle,
    },
  } = useExerciseExecutionForm(exercise, onChange);

  const showDuration =
    exercise.planned_duration_seconds !== null &&
    exercise.planned_duration_seconds > 0;

  return (
    <div className="space-y-2 rounded-[var(--m3-radius-lg)] border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-high)] p-4 shadow-sm">
      <h3 className="m3-title">Exercise execution</h3>

      <SetLogsListM3
        sets={formData.sets}
        onAdd={handleSetAdd}
        onUpdate={handleSetUpdate}
        onRemove={handleSetRemove}
        errors={errors?.sets}
        showDuration={showDuration}
        showReps={exercise.planned_reps !== null && exercise.planned_reps > 0}
        isSkipped={formData.is_skipped}
      />

      <ExecutionSummaryDisplayM3
        values={summaryValues}
        showDuration={showDuration}
      />

      <div className="flex items-center gap-2 space-y-0">
        <Checkbox
          id="is_skipped"
          checked={formData.is_skipped}
          onCheckedChange={(checked) => handleSkipToggle(checked === true)}
          aria-label="Skip exercise"
        />
        <Label
          htmlFor="is_skipped"
          className="cursor-pointer text-sm font-medium text-foreground"
        >
          Skip exercise
        </Label>
      </div>

      {errors?._form && errors._form.length > 0 && (
        <div className="rounded-[var(--m3-radius-lg)] border border-destructive bg-destructive/10 p-3">
          <p className="text-sm font-medium text-destructive">Form errors:</p>
          <ul className="mt-1 list-disc list-inside text-sm text-destructive">
            {errors._form.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
