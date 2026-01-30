import type { ExercisePart, ExerciseType } from "@/types";

/**
 * Etykiety części ciała (ExercisePart) w języku angielskim.
 */
export const EXERCISE_PART_LABELS: Record<ExercisePart, string> = {
  Legs: "Legs",
  Core: "Core",
  Back: "Back",
  Arms: "Arms",
  Chest: "Chest",
};

/**
 * Etykiety typów ćwiczeń (ExerciseType) w języku angielskim.
 */
export const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  "Warm-up": "Warm-up",
  "Main Workout": "Main Workout",
  "Cool-down": "Cool-down",
};

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
