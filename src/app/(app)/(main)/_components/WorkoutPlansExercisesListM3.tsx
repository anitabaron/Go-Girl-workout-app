"use client";

import { useMemo } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WorkoutPlanExerciseItemState } from "@/types/workout-plan-form";
import { WorkoutPlanExerciseItemM3 } from "./WorkoutPlanExerciseItemM3";
import { useTranslations } from "@/i18n/client";

const SECTION_TYPE_ORDER: Record<string, number> = {
  "Warm-up": 1,
  "Main Workout": 2,
  "Cool-down": 3,
};

type Slot =
  | {
      kind: "single";
      exercise: WorkoutPlanExerciseItemState;
      originalIndex: number;
    }
  | {
      kind: "scope";
      scopeId: string;
      repeatCount: number;
      items: {
        exercise: WorkoutPlanExerciseItemState;
        originalIndex: number;
      }[];
    };

type WorkoutPlansExercisesListM3Props = {
  exercises: WorkoutPlanExerciseItemState[];
  onRemoveExercise: (index: number) => void;
  onUpdateExercise: (
    index: number,
    exercise: Partial<WorkoutPlanExerciseItemState>,
  ) => void;
  onMoveExercise: (index: number, direction: "up" | "down") => void;
  onUpdateScopeSectionOrder?: (indices: number[], sectionOrder: number) => void;
  onMoveWithinScope?: (index: number, direction: "up" | "down") => void;
  errors: Record<string, string>;
  disabled: boolean;
};

function buildSlots(exercises: WorkoutPlanExerciseItemState[]): Slot[] {
  const sorted = [...exercises]
    .map((exercise, originalIndex) => ({ exercise, originalIndex }))
    .sort((a, b) => {
      const typeDiff =
        (SECTION_TYPE_ORDER[a.exercise.section_type] ?? 999) -
        (SECTION_TYPE_ORDER[b.exercise.section_type] ?? 999);
      if (typeDiff !== 0) return typeDiff;
      if (a.exercise.section_order !== b.exercise.section_order) {
        return a.exercise.section_order - b.exercise.section_order;
      }
      const aNr = a.exercise.in_scope_nr ?? 0;
      const bNr = b.exercise.in_scope_nr ?? 0;
      return aNr - bNr;
    });

  const slots: Slot[] = [];
  let i = 0;
  while (i < sorted.length) {
    const { exercise, originalIndex } = sorted[i];
    if (exercise.scope_id != null && exercise.in_scope_nr != null) {
      const scopeId = exercise.scope_id;
      const repeatCount = exercise.scope_repeat_count ?? 1;
      const items = sorted
        .filter(({ exercise: ex }) => ex.scope_id === scopeId)
        .sort(
          (a, b) =>
            (a.exercise.in_scope_nr ?? 0) - (b.exercise.in_scope_nr ?? 0),
        );
      slots.push({ kind: "scope", scopeId, repeatCount, items });
      i += items.length;
    } else {
      slots.push({ kind: "single", exercise, originalIndex });
      i += 1;
    }
  }
  return slots;
}

export function WorkoutPlansExercisesListM3({
  exercises,
  onRemoveExercise,
  onUpdateExercise,
  onMoveExercise,
  onUpdateScopeSectionOrder,
  onMoveWithinScope,
  errors,
  disabled,
}: Readonly<WorkoutPlansExercisesListM3Props>) {
  const t = useTranslations("workoutPlansExercisesList");
  const slots = useMemo(() => buildSlots(exercises), [exercises]);

  if (exercises.length === 0) return null;

  return (
    <div className="space-y-4" data-test-id="workout-plan-form-exercises-list">
      {slots.map((slot, slotIndex) =>
        slot.kind === "single" ? (
          <div
            key={
              slot.exercise.id
                ? `single-${slot.exercise.id}`
                : `single-${slot.originalIndex}`
            }
          >
            <WorkoutPlanExerciseItemM3
              exercise={slot.exercise}
              index={slot.originalIndex}
              exercises={exercises}
              onChange={(updates) =>
                onUpdateExercise(slot.originalIndex, updates)
              }
              onRemove={() => onRemoveExercise(slot.originalIndex)}
              onMoveUp={() => onMoveExercise(slot.originalIndex, "up")}
              onMoveDown={() => onMoveExercise(slot.originalIndex, "down")}
              errors={errors}
              disabled={disabled}
            />
          </div>
        ) : (
          <div
            key={`scope-${slot.scopeId}`}
            className="rounded-xl border-2 border-[var(--m3-outline-variant)] bg-[var(--m3-raw-primary-container)] p-4"
          >
            <div className="mb-3 flex flex-wrap items-center gap-3 border-b border-[var(--m3-outline-variant)] pb-2">
              <span className="m3-title text-[var(--m3-on-surface-variant)]">
                {t("scope")} ×
              </span>
              <Input
                type="number"
                min={1}
                value={slot.repeatCount}
                onChange={(e) => {
                  const v = Number.parseInt(e.target.value, 10);
                  if (!Number.isNaN(v) && v >= 1) {
                    for (const { originalIndex } of slot.items) {
                      onUpdateExercise(originalIndex, {
                        scope_repeat_count: v,
                      });
                    }
                  }
                }}
                disabled={disabled}
                className="h-9 w-14 text-center text-sm font-medium"
                aria-label={t("scopeRepeatAria")}
                data-test-id={`scope-${slot.scopeId}-repeat-count`}
              />
              <span className="text-sm text-muted-foreground">
                {t("count")
                  .replace("{count}", String(slot.items.length))
                  .replace(
                    "{label}",
                    slot.items.length === 1
                      ? t("exerciseSingular")
                      : t("exercisePlural"),
                  )}
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("orderInSection")}
                </span>
                {onUpdateScopeSectionOrder ? (
                  <Input
                    type="number"
                    min={1}
                    value={slot.items[0]?.exercise.section_order ?? 1}
                    onChange={(e) => {
                      const v = Number.parseInt(e.target.value, 10);
                      if (!Number.isNaN(v) && v >= 1) {
                        onUpdateScopeSectionOrder(
                          slot.items.map((i) => i.originalIndex),
                          v,
                        );
                      }
                    }}
                    disabled={disabled}
                    className="h-9 w-14 text-center text-sm font-medium"
                    aria-label={t("orderInSection")}
                  />
                ) : (
                  <div className="flex h-9 w-12 items-center justify-center rounded-md border border-input bg-background text-sm font-medium">
                    {slot.items[0]?.exercise.section_order ?? 1}
                  </div>
                )}
                <div className="flex gap-0.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      onMoveExercise(slot.items[0].originalIndex, "up")
                    }
                    disabled={disabled || slotIndex === 0}
                    className="h-8 w-8 shrink-0"
                    aria-label={t("moveScopeUp")}
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      onMoveExercise(slot.items[0].originalIndex, "down")
                    }
                    disabled={disabled || slotIndex === slots.length - 1}
                    className="h-8 w-8 shrink-0"
                    aria-label={t("moveScopeDown")}
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {slot.items.map(({ exercise: ex, originalIndex }) => (
                <div
                  key={
                    ex.id
                      ? `scope-${slot.scopeId}-${ex.in_scope_nr}`
                      : `scope-${slot.scopeId}-${originalIndex}`
                  }
                >
                  <WorkoutPlanExerciseItemM3
                    exercise={ex}
                    index={originalIndex}
                    exercises={exercises}
                    onChange={(updates) =>
                      onUpdateExercise(originalIndex, updates)
                    }
                    onRemove={() => onRemoveExercise(originalIndex)}
                    onMoveUp={() => onMoveExercise(originalIndex, "up")}
                    onMoveDown={() => onMoveExercise(originalIndex, "down")}
                    onMoveWithinScope={
                      onMoveWithinScope
                        ? (dir) => onMoveWithinScope(originalIndex, dir)
                        : undefined
                    }
                    errors={errors}
                    disabled={disabled}
                  />
                </div>
              ))}
            </div>
          </div>
        ),
      )}
    </div>
  );
}
