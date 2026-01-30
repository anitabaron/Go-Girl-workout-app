"use client";

import { SetLogsList } from "./set-logs-list";
import { ExecutionSummaryDisplay } from "./execution-summary-display";
import { useExerciseExecutionForm } from "@/hooks/use-exercise-execution-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { SessionExerciseDTO } from "@/types";
import type {
  ExerciseFormData,
  FormErrors,
} from "@/types/workout-session-assistant";

type ExerciseExecutionFormProps = {
  exercise: SessionExerciseDTO;
  onChange: (data: ExerciseFormData) => void;
  errors?: FormErrors;
};

/**
 * Formularz wprowadzania faktycznego wykonania ćwiczenia.
 * Zawiera pola actual_*, listę set logs oraz checkbox do pominięcia ćwiczenia.
 */
export function ExerciseExecutionForm({
  exercise,
  onChange,
  errors,
}: Readonly<ExerciseExecutionFormProps>) {
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
    <div className="space-y-2 rounded-lg border border-border bg-white p-4 shadow-sm dark:border-border dark:bg-zinc-950">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Wykonanie ćwiczenia
      </h3>

      <SetLogsList
        sets={formData.sets}
        onAdd={handleSetAdd}
        onUpdate={handleSetUpdate}
        onRemove={handleSetRemove}
        errors={errors?.sets}
        showDuration={showDuration}
        showReps={exercise.planned_reps !== null && exercise.planned_reps > 0}
        isSkipped={formData.is_skipped}
      />

      <ExecutionSummaryDisplay
        values={summaryValues}
        showDuration={showDuration}
      />

      <div className="flex items-center gap-2 space-y-0">
        <Checkbox
          id="is_skipped"
          checked={formData.is_skipped}
          onCheckedChange={(checked) => handleSkipToggle(checked === true)}
          aria-label="Pomiń ćwiczenie"
        />
        <Label
          htmlFor="is_skipped"
          className="cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Pomiń ćwiczenie
        </Label>
      </div>

      {errors?._form && errors._form.length > 0 && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-3">
          <p className="text-sm font-medium text-destructive">
            Błędy formularza:
          </p>
          <ul className="mt-1 list-disc list-inside text-sm text-destructive">
            {errors._form.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
