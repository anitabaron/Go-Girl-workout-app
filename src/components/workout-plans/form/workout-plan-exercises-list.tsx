"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  WorkoutPlanExercisesListProps,
  WorkoutPlanExerciseItemState,
} from "@/types/workout-plan-form";
import { WorkoutPlanExerciseItem } from "./workout-plan-exercise-item";

const SECTION_TYPE_ORDER: Record<string, number> = {
  "Warm-up": 1,
  "Main Workout": 2,
  "Cool-down": 3,
};

type Slot =
  | { type: "single"; indices: number[]; exercises: WorkoutPlanExerciseItemState[] }
  | {
      type: "scope";
      indices: number[];
      exercises: WorkoutPlanExerciseItemState[];
      scopeRepeatCount: number;
    };

function groupIntoSlots(
  exercises: WorkoutPlanExerciseItemState[],
): { slots: Slot[]; sortedWithIndex: { exercise: WorkoutPlanExerciseItemState; originalIndex: number }[] } {
  const sortedWithIndex = [...exercises]
    .map((exercise, originalIndex) => ({ exercise, originalIndex }))
    .sort((a, b) => {
      const typeDiff =
        (SECTION_TYPE_ORDER[a.exercise.section_type] ?? 999) -
        (SECTION_TYPE_ORDER[b.exercise.section_type] ?? 999);
      if (typeDiff !== 0) return typeDiff;
      if (a.exercise.section_order !== b.exercise.section_order) {
        return a.exercise.section_order - b.exercise.section_order;
      }
      const aNr = a.exercise.in_scope_nr ?? 999;
      const bNr = b.exercise.in_scope_nr ?? 999;
      return aNr - bNr;
    });

  const slots: Slot[] = [];
  let i = 0;
  while (i < sortedWithIndex.length) {
    const { exercise, originalIndex } = sortedWithIndex[i];
    const inScope =
      exercise.in_scope_nr != null && exercise.scope_id != null;
    if (!inScope) {
      slots.push({
        type: "single",
        indices: [originalIndex],
        exercises: [exercise],
      });
      i += 1;
      continue;
    }
    const scopeId = exercise.scope_id;
    const scopeRepeatCount = exercise.scope_repeat_count ?? 1;
    const scopeItems: { exercise: WorkoutPlanExerciseItemState; originalIndex: number }[] = [];
    while (
      i < sortedWithIndex.length &&
      sortedWithIndex[i].exercise.scope_id === scopeId
    ) {
      scopeItems.push(sortedWithIndex[i]);
      i += 1;
    }
    slots.push({
      type: "scope",
      indices: scopeItems.map((x) => x.originalIndex),
      exercises: scopeItems.map((x) => x.exercise),
      scopeRepeatCount,
    });
  }
  return { slots, sortedWithIndex };
}

export function WorkoutPlanExercisesList({
  exercises,
  onRemoveExercise,
  onUpdateExercise,
  onMoveExercise,
  errors,
  disabled,
  ...props
}: Readonly<WorkoutPlanExercisesListProps>) {
  const { slots } = useMemo(
    () => groupIntoSlots(exercises),
    [exercises],
  );

  if (exercises.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4" {...props}>
      {slots.map((slot, slotIndex) => {
        if (slot.type === "single") {
          const exercise = slot.exercises[0];
          const originalIndex = slot.indices[0];
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
                  ease: [0.4, 0, 0.2, 1],
                },
                opacity: { duration: 0.2 },
                y: { duration: 0.2 },
              }}
              style={{ willChange: "transform" }}
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
        }

        const scopeId = slot.exercises[0]?.scope_id ?? `scope-${slotIndex}`;
        const firstIndex = slot.indices[0];
        const handleScopeRepeatChange = (value: number | null) => {
          const count = value ?? 1;
          slot.indices.forEach((idx) =>
            onUpdateExercise(idx, { scope_repeat_count: count }),
          );
        };

        return (
          <motion.div
            key={`scope-${scopeId}`}
            layout
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{
              layout: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
              opacity: { duration: 0.2 },
              y: { duration: 0.2 },
            }}
            style={{ willChange: "transform" }}
            className="rounded-lg border-2 border-primary/30 bg-muted/30 p-4"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="font-medium">Scope ×</span>
              <Label htmlFor={`scope-repeat-${scopeId}`} className="sr-only">
                Repeat count
              </Label>
              <Input
                id={`scope-repeat-${scopeId}`}
                type="number"
                min={1}
                value={slot.scopeRepeatCount}
                onChange={(e) =>
                  handleScopeRepeatChange(
                    e.target.value === ""
                      ? 1
                      : Number.parseInt(e.target.value, 10),
                  )
                }
                className="w-16"
                disabled={disabled}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  [...slot.indices].sort((a, b) => b - a).forEach((idx) => onRemoveExercise(idx))
                }
                disabled={disabled}
                className="text-destructive hover:text-destructive"
              >
                Remove scope
              </Button>
            </div>
            <div className="space-y-2">
              {slot.exercises.map((exercise, scopePos) => {
                const originalIndex = slot.indices[scopePos];
                const stableKey = exercise.id
                  ? `exercise-${exercise.id}`
                  : `scope-${scopeId}-${exercise.in_scope_nr}`;
                return (
                  <WorkoutPlanExerciseItem
                    key={stableKey}
                    exercise={exercise}
                    index={originalIndex}
                    exercises={exercises}
                    onChange={(updates) =>
                      onUpdateExercise(originalIndex, updates)
                    }
                    onRemove={() => onRemoveExercise(originalIndex)}
                    onMoveUp={
                      slotIndex > 0
                        ? () => onMoveExercise(firstIndex, "up")
                        : undefined
                    }
                    onMoveDown={() => onMoveExercise(firstIndex, "down")}
                    errors={errors}
                    disabled={disabled}
                  />
                );
              })}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
