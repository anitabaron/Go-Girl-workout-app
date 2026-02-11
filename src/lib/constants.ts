import type { ExercisePart, ExerciseType } from "@/types";

/**
 * Dozwolone wartości części ciała (workout part / exercise part).
 * Używane w: planach treningowych (part), ćwiczeniach (part/parts), imporcie JSON (part, exercise_part).
 */
export const EXERCISE_PART_VALUES = [
  "Legs",
  "Core",
  "Back",
  "Arms",
  "Chest",
  "Glutes",
] as const satisfies ExercisePart[];

/**
 * Buduje mapę etykiet tożsamych z wartością domenową.
 * Pozwala uniknąć ręcznych map typu X: "X".
 */
function createIdentityLabels<T extends string>(
  values: readonly T[],
): Record<T, string> {
  return values.reduce(
    (acc, value) => {
      acc[value] = value;
      return acc;
    },
    {} as Record<T, string>,
  );
}

/**
 * Etykiety części ciała (ExercisePart) domyślnie równe wartości domenowej.
 */
export const EXERCISE_PART_LABELS = createIdentityLabels(
  EXERCISE_PART_VALUES,
);

/**
 * Etykiety typów ćwiczeń (ExerciseType) domyślnie równe wartości domenowej.
 */
export const EXERCISE_TYPE_VALUES = [
  "Warm-up",
  "Main Workout",
  "Cool-down",
] as const satisfies ExerciseType[];

export const EXERCISE_TYPE_LABELS = createIdentityLabels(
  EXERCISE_TYPE_VALUES,
);

/**
 * Klasy CSS dla badge'ów typów ćwiczeń - zgodne z /import-instruction:
 * Warm-up: czerwony, Main Workout: różowy, Cool-down: fioletowy
 */
export const EXERCISE_TYPE_BADGE_CLASSES: Record<ExerciseType, string> = {
  "Warm-up":
    "border-red-500 bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-300",
  "Main Workout":
    "border-pink-500 bg-pink-50 text-pink-700 dark:bg-pink-950/20 dark:text-pink-300",
  "Cool-down":
    "border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-300",
};

export const DEFAULT_EXERCISE_VALUE = {
  section_type: EXERCISE_TYPE_VALUES[1], // "Main Workout"
  planned_sets: 3,
  planned_rest_after_series_seconds: 60,
  estimated_set_time_seconds: 360,
};
