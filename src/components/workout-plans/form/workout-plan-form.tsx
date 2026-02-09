"use client";

import { useWorkoutPlanForm } from "@/hooks/use-workout-plan-form";
import type { WorkoutPlanFormProps } from "@/types/workout-plan-form";
import { WorkoutPlanMetadataFields } from "./workout-plan-metadata-fields";
import { ValidationErrors } from "@/components/shared/validation-errors";
import { SaveButton } from "./save-button";
import { CancelButton } from "./cancel-button";
import { AddExerciseDialog } from "./add-exercise-dialog";
import { AddScopeDialog } from "./add-scope-dialog";
import { WorkoutPlanExercisesList } from "./workout-plan-exercises-list";

export function WorkoutPlanForm({
  initialData,
  mode,
}: Readonly<WorkoutPlanFormProps>) {
  const {
    fields,
    errors,
    isLoading,
    hasUnsavedChanges,
    handleChange,
    handleBlur,
    handleAddExercise,
    handleAddScope,
    handleRemoveExercise,
    handleUpdateExercise,
    handleMoveExercise,
    handleSubmit,
  } = useWorkoutPlanForm({
    initialData,
    mode,
  });

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
      data-test-id="workout-plan-form"
    >
      {/* Błędy walidacji na poziomie formularza */}
      {errors._form && errors._form.length > 0 && (
        <ValidationErrors errors={errors._form} title="Błędy walidacji" />
      )}

      {/* Pola metadanych planu */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Informacje o planie</h2>
        <WorkoutPlanMetadataFields
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

      {/* Lista ćwiczeń */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Ćwiczenia w planie</h2>
          <div className="flex gap-2">
            <AddExerciseDialog
              onAddExercise={handleAddExercise}
              disabled={isLoading}
              existingExerciseIds={fields.exercises
                .map((e) => e.exercise_id)
                .filter((id): id is string => id !== null)}
            />
            <AddScopeDialog
              onAddScope={handleAddScope}
              disabled={isLoading}
              existingExerciseIds={fields.exercises
                .map((e) => e.exercise_id)
                .filter((id): id is string => id !== null)}
            />
          </div>
        </div>
        {fields.exercises.length === 0 ? (
          <div
            className="rounded-lg border border-dashed border-border p-8 text-center"
            data-test-id="workout-plan-form-exercises-empty"
          >
            <p className="text-muted-foreground">
              Brak ćwiczeń w planie. Dodaj pierwsze ćwiczenie, aby rozpocząć.
            </p>
          </div>
        ) : (
          <WorkoutPlanExercisesList
            exercises={fields.exercises}
            onRemoveExercise={handleRemoveExercise}
            onUpdateExercise={handleUpdateExercise}
            onMoveExercise={handleMoveExercise}
            errors={errors.exercises || {}}
            disabled={isLoading}
            data-test-id="workout-plan-form-exercises-list"
          />
        )}
      </section>

      {/* Przyciski akcji */}
      <div className="flex flex-col-reverse gap-4 pt-6 sm:flex-row sm:justify-end">
        <CancelButton hasUnsavedChanges={hasUnsavedChanges} />
        <SaveButton isLoading={isLoading} disabled={isLoading} />
      </div>
    </form>
  );
}
