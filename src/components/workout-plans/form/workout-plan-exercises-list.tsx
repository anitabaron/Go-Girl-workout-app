"use client";

import type { WorkoutPlanExercisesListProps } from "@/types/workout-plan-form";
import { WorkoutPlanExerciseItem } from "./workout-plan-exercise-item";

export function WorkoutPlanExercisesList({
  exercises,
  onRemoveExercise,
  onUpdateExercise,
  errors,
  disabled,
}: Readonly<WorkoutPlanExercisesListProps>) {
  if (exercises.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {exercises.map((exercise, index) => (
        <WorkoutPlanExerciseItem
          key={`${exercise.exercise_id}-${index}`}
          exercise={exercise}
          index={index}
          onChange={(updates) => onUpdateExercise(index, updates)}
          onRemove={() => onRemoveExercise(index)}
          errors={errors}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
