"use client";

import { useMemo } from "react";
import type { WorkoutPlanExerciseItemState } from "@/types/workout-plan-form";
import { WorkoutPlanExerciseItemM3 } from "./WorkoutPlanExerciseItemM3";

const SECTION_TYPE_ORDER: Record<string, number> = {
  "Warm-up": 1,
  "Main Workout": 2,
  "Cool-down": 3,
};

type WorkoutPlansExercisesListM3Props = {
  exercises: WorkoutPlanExerciseItemState[];
  onRemoveExercise: (index: number) => void;
  onUpdateExercise: (
    index: number,
    exercise: Partial<WorkoutPlanExerciseItemState>,
  ) => void;
  onMoveExercise: (index: number, direction: "up" | "down") => void;
  errors: Record<string, string>;
  disabled: boolean;
};

export function WorkoutPlansExercisesListM3({
  exercises,
  onRemoveExercise,
  onUpdateExercise,
  onMoveExercise,
  errors,
  disabled,
}: Readonly<WorkoutPlansExercisesListM3Props>) {
  const sortedExercises = useMemo(
    () =>
      [...exercises]
        .map((exercise, originalIndex) => ({ exercise, originalIndex }))
        .sort((a, b) => {
          const typeDiff =
            (SECTION_TYPE_ORDER[a.exercise.section_type] ?? 999) -
            (SECTION_TYPE_ORDER[b.exercise.section_type] ?? 999);
          if (typeDiff !== 0) return typeDiff;
          return a.exercise.section_order - b.exercise.section_order;
        }),
    [exercises],
  );

  if (exercises.length === 0) return null;

  return (
    <div className="space-y-4">
      {sortedExercises.map(({ exercise, originalIndex }) => {
        const stableKey = exercise.id
          ? `exercise-${exercise.id}`
          : `exercise-${exercise.exercise_id}-${originalIndex}`;

        return (
          <div key={stableKey}>
            <WorkoutPlanExerciseItemM3
              exercise={exercise}
              index={originalIndex}
              exercises={exercises}
              onChange={(updates) => onUpdateExercise(originalIndex, updates)}
              onRemove={() => onRemoveExercise(originalIndex)}
              onMoveUp={() => onMoveExercise(originalIndex, "up")}
              onMoveDown={() => onMoveExercise(originalIndex, "down")}
              errors={errors}
              disabled={disabled}
            />
          </div>
        );
      })}
    </div>
  );
}
