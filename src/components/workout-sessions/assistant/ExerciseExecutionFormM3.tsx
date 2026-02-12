"use client";

import { SetLogsListM3 } from "./SetLogsListM3";
import { useExerciseExecutionForm } from "@/hooks/use-exercise-execution-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { SessionExerciseDTO } from "@/types";
import type {
  ExerciseFormData,
  FormErrors,
} from "@/types/workout-session-assistant";
import { useTranslations } from "@/i18n/client";

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
  const t = useTranslations("assistantExerciseExecution");
  const {
    formData,
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
      <h3 className="m3-title">{t("title")}</h3>

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

      <div className="flex items-center gap-2 space-y-0">
        <Checkbox
          id="is_skipped"
          checked={formData.is_skipped}
          onCheckedChange={(checked) => handleSkipToggle(checked === true)}
          aria-label={t("skipExercise")}
        />
        <Label
          htmlFor="is_skipped"
          className="cursor-pointer text-sm font-medium text-foreground"
        >
          {t("skipExercise")}
        </Label>
      </div>

      {errors?._form && errors._form.length > 0 && (
        <div className="rounded-[var(--m3-radius-lg)] border border-destructive bg-destructive/10 p-3">
          <p className="text-sm font-medium text-destructive">
            {t("formErrors")}
          </p>
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
