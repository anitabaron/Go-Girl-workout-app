import type { ExercisePart, ExerciseType } from "@/types";

/**
 * Tłumaczenia części ciała (ExercisePart) na język polski.
 */
export const EXERCISE_PART_LABELS: Record<ExercisePart, string> = {
  Legs: "Nogi",
  Core: "Brzuch",
  Back: "Plecy",
  Arms: "Ręce",
  Chest: "Klatka",
};

/**
 * Tłumaczenia typów ćwiczeń (ExerciseType) na język polski.
 */
export const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  "Warm-up": "Rozgrzewka",
  "Main Workout": "Główny trening",
  "Cool-down": "Schłodzenie",
};
