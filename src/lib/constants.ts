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
