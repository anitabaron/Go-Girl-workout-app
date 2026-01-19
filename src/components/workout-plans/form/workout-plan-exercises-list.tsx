"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { WorkoutPlanExercisesListProps } from "@/types/workout-plan-form";
import { WorkoutPlanExerciseItem } from "./workout-plan-exercise-item";

export function WorkoutPlanExercisesList({
  exercises,
  onRemoveExercise,
  onUpdateExercise,
  onMoveExercise,
  errors,
  disabled,
}: Readonly<WorkoutPlanExercisesListProps>) {
  // Sortuj ćwiczenia według section_type i section_order przed renderowaniem
  const sortedExercises = useMemo(() => {
    return [...exercises]
      .map((exercise, originalIndex) => ({ exercise, originalIndex }))
      .sort((a, b) => {
        // Najpierw sortuj według section_type (Warm-up, Main Workout, Cool-down)
        const typeOrder: Record<string, number> = {
          "Warm-up": 1,
          "Main Workout": 2,
          "Cool-down": 3,
        };
        const typeDiff =
          (typeOrder[a.exercise.section_type] || 999) -
          (typeOrder[b.exercise.section_type] || 999);
        if (typeDiff !== 0) return typeDiff;

        // Następnie sortuj według section_order
        return a.exercise.section_order - b.exercise.section_order;
      });
  }, [exercises]);

  if (exercises.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {sortedExercises.map(({ exercise, originalIndex }) => {
        // Użyj id jeśli istnieje (tryb edycji), w przeciwnym razie użyj kombinacji exercise_id i originalIndex
        // originalIndex jest stabilny - to pozycja w oryginalnej tablicy, która nie zmienia się podczas przesuwania
        const stableKey = exercise.id
          ? `exercise-${exercise.id}`
          : `exercise-${exercise.exercise_id}-${originalIndex}`;

        return (
          <motion.div
            key={stableKey}
            layout
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{
              layout: {
                duration: 0.4,
                ease: [0.4, 0, 0.2, 1], // ease-in-out cubic bezier
              },
              opacity: { duration: 0.2 },
              y: { duration: 0.2 },
            }}
            style={{
              willChange: "transform",
            }}
          >
            <WorkoutPlanExerciseItem
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
          </motion.div>
        );
      })}
    </div>
  );
}
