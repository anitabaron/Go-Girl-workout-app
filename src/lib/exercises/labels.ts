import type { ExercisePart, ExerciseType } from "@/types";

type Translator = (key: string) => string;

export const EXERCISE_LABELS_NAMESPACE = "exerciseLabels";

const PART_KEY_MAP: Record<ExercisePart, string> = {
  Legs: "part.legs",
  Core: "part.core",
  Back: "part.back",
  Arms: "part.arms",
  Chest: "part.chest",
  Glutes: "part.glutes",
};

const TYPE_KEY_MAP: Record<ExerciseType, string> = {
  "Warm-up": "type.warmup",
  "Main Workout": "type.mainWorkout",
  "Cool-down": "type.cooldown",
};

function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function getExercisePartLabel(
  t: Translator,
  part: ExercisePart | string | null | undefined,
): string {
  if (!part) return "";
  if (hasOwn(PART_KEY_MAP, part)) {
    return t(PART_KEY_MAP[part as ExercisePart]);
  }
  return part;
}

export function getExerciseTypeLabel(
  t: Translator,
  type: ExerciseType | string | null | undefined,
): string {
  if (!type) return "";
  if (hasOwn(TYPE_KEY_MAP, type)) {
    return t(TYPE_KEY_MAP[type as ExerciseType]);
  }
  return type;
}
