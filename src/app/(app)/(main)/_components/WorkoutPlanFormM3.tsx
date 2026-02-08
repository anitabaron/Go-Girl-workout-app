"use client";

import { useRouter } from "next/navigation";
import { useWorkoutPlanForm } from "@/hooks/use-workout-plan-form";
import type { WorkoutPlanFormProps } from "@/types/workout-plan-form";
import { WorkoutPlanMetadataFieldsM3 } from "./WorkoutPlanMetadataFieldsM3";
import { AddExerciseDialogM3 } from "./AddExerciseDialogM3";
import { WorkoutPlansExercisesListM3 } from "./WorkoutPlansExercisesListM3";
import { CancelButtonM3 } from "./CancelButtonM3";
import { Button } from "@/components/ui/button";

export function WorkoutPlanFormM3({
  initialData,
  mode,
}: Readonly<WorkoutPlanFormProps>) {
  const router = useRouter();
  const {
    fields,
    errors,
    isLoading,
    hasUnsavedChanges,
    handleChange,
    handleBlur,
    handleAddExercise,
    handleRemoveExercise,
    handleUpdateExercise,
    handleMoveExercise,
    handleSubmit,
  } = useWorkoutPlanForm({
    initialData,
    mode,
    onSuccess: () => router.push("/workout-plans"),
    notFoundRedirect: "/workout-plans",
    successRedirect: "/workout-plans",
  });

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
      data-test-id="workout-plan-form"
    >
      {errors._form && errors._form.length > 0 && (
        <div
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-4"
          role="alert"
        >
          <p className="text-sm font-medium text-destructive">
            Validation errors
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-destructive">
            {errors._form.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="space-y-4">
        <h2 className="m3-title">Plan info</h2>
        <WorkoutPlanMetadataFieldsM3
          fields={{
            name: fields.name,
            description: fields.description,
            part: fields.part,
          }}
          errors={{
            name: errors.name,
            description: errors.description,
            part: errors.part,
          }}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={isLoading}
        />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="m3-title">Exercises in plan</h2>
          <AddExerciseDialogM3
            onAddExercise={handleAddExercise}
            disabled={isLoading}
            existingExerciseIds={fields.exercises
              .map((e) => e.exercise_id)
              .filter((id): id is string => id !== null)}
          />
        </div>
        {fields.exercises.length === 0 ? (
          <div
            className="rounded-lg border border-dashed border-[var(--m3-outline-variant)] p-8 text-center"
            data-test-id="workout-plan-form-exercises-empty"
          >
            <p className="text-muted-foreground">
              No exercises in plan. Add your first exercise to get started.
            </p>
          </div>
        ) : (
          <WorkoutPlansExercisesListM3
            exercises={fields.exercises}
            onRemoveExercise={handleRemoveExercise}
            onUpdateExercise={handleUpdateExercise}
            onMoveExercise={handleMoveExercise}
            errors={errors.exercises ?? {}}
            disabled={isLoading}
          />
        )}
      </section>

      <div className="flex flex-col-reverse gap-4 pt-6 sm:flex-row sm:justify-end">
        <CancelButtonM3
          hasUnsavedChanges={hasUnsavedChanges}
          onConfirmLeave={() => router.push("/workout-plans")}
        />
        <Button
          type="submit"
          disabled={isLoading}
          className="m3-cta"
          aria-busy={isLoading}
          data-test-id="workout-plan-form-save-button"
        >
          {isLoading ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}
