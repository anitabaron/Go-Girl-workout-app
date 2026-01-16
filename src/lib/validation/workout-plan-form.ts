import { z } from "zod";
import type { WorkoutPlanFormState, WorkoutPlanExerciseItemState } from "@/types/workout-plan-form";
import {
  exercisePartValues,
  exerciseTypeValues,
} from "@/lib/validation/exercises";

/**
 * Schema dla walidacji pojedynczego pola name
 */
export const workoutPlanNameSchema = z
  .string()
  .trim()
  .min(1, "Nazwa jest wymagana")
  .max(120, "Nazwa może mieć maksymalnie 120 znaków");

/**
 * Schema dla walidacji pola description
 */
export const workoutPlanDescriptionSchema = z
  .string()
  .trim()
  .max(1000, "Opis może mieć maksymalnie 1000 znaków")
  .nullable()
  .optional();

/**
 * Schema dla walidacji pola part
 */
export const workoutPlanPartSchema = z
  .enum(exercisePartValues)
  .nullable()
  .optional();

/**
 * Schema dla walidacji section_type
 */
export const workoutPlanSectionTypeSchema = z.enum(exerciseTypeValues, {
  errorMap: () => ({ message: "Typ sekcji jest wymagany" }),
});

/**
 * Schema dla walidacji section_order
 */
export const workoutPlanSectionOrderSchema = z
  .number()
  .int("Kolejność musi być liczbą całkowitą")
  .positive("Kolejność musi być większa od zera");

/**
 * Schema dla walidacji planned_sets
 */
export const workoutPlanPlannedSetsSchema = z
  .number()
  .int("Liczba serii musi być liczbą całkowitą")
  .positive("Liczba serii musi być większa od zera")
  .nullable()
  .optional();

/**
 * Schema dla walidacji planned_reps
 */
export const workoutPlanPlannedRepsSchema = z
  .number()
  .int("Liczba powtórzeń musi być liczbą całkowitą")
  .positive("Liczba powtórzeń musi być większa od zera")
  .nullable()
  .optional();

/**
 * Schema dla walidacji planned_duration_seconds
 */
export const workoutPlanPlannedDurationSchema = z
  .number()
  .int("Czas trwania musi być liczbą całkowitą")
  .positive("Czas trwania musi być większy od zera")
  .nullable()
  .optional();

/**
 * Schema dla walidacji planned_rest_seconds
 */
export const workoutPlanPlannedRestSchema = z
  .number()
  .int("Czas odpoczynku musi być liczbą całkowitą")
  .nonnegative("Czas odpoczynku nie może być ujemny")
  .nullable()
  .optional();

/**
 * Schema dla walidacji exercise_id (UUID)
 */
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const workoutPlanExerciseIdSchema = z
  .string()
  .refine(
    (val) => uuidRegex.test(val),
    "exercise_id musi być prawidłowym UUID"
  );

/**
 * Schema dla walidacji pojedynczego ćwiczenia w formularzu
 */
export const workoutPlanExerciseItemFormSchema = z
  .object({
    exercise_id: workoutPlanExerciseIdSchema,
    section_type: workoutPlanSectionTypeSchema,
    section_order: workoutPlanSectionOrderSchema,
    planned_sets: workoutPlanPlannedSetsSchema,
    planned_reps: workoutPlanPlannedRepsSchema,
    planned_duration_seconds: workoutPlanPlannedDurationSchema,
    planned_rest_seconds: workoutPlanPlannedRestSchema,
  })
  .strict();

/**
 * Schema dla walidacji całego formularza planu treningowego
 */
export const workoutPlanFormSchema = z
  .object({
    name: workoutPlanNameSchema,
    description: workoutPlanDescriptionSchema,
    part: workoutPlanPartSchema,
    exercises: z
      .array(workoutPlanExerciseItemFormSchema)
      .min(1, "Plan treningowy musi zawierać co najmniej jedno ćwiczenie"),
  })
  .strict()
  .superRefine((data, ctx) => {
    const errors = validateWorkoutPlanFormBusinessRules(data.exercises);

    errors.forEach((message) =>
      ctx.addIssue({
        code: "custom",
        message,
      })
    );
  });

/**
 * Walidacja reguł biznesowych dla formularza planu treningowego.
 * Sprawdza:
 * - Co najmniej jedno ćwiczenie (już sprawdzone w schema)
 * - Unikalność section_order w ramach każdej sekcji
 */
export function validateWorkoutPlanFormBusinessRules(
  exercises: WorkoutPlanExerciseItemState[]
): string[] {
  const errors: string[] = [];

  if (exercises.length === 0) {
    errors.push("Plan treningowy musi zawierać co najmniej jedno ćwiczenie.");
    return errors;
  }

  // Sprawdzenie unikalności pozycji w ramach każdej sekcji
  const positionMap = new Map<string, Set<number>>();

  for (const exercise of exercises) {
    const sectionKey = exercise.section_type;
    const order = exercise.section_order;

    if (!positionMap.has(sectionKey)) {
      positionMap.set(sectionKey, new Set());
    }

    const orders = positionMap.get(sectionKey)!;

    if (orders.has(order)) {
      errors.push(
        `Duplikat kolejności ${order} w sekcji ${exercise.section_type}.`
      );
    } else {
      orders.add(order);
    }

    // Walidacja wartości planned_*
    if (
      exercise.planned_sets !== undefined &&
      exercise.planned_sets !== null &&
      exercise.planned_sets <= 0
    ) {
      errors.push(
        `planned_sets musi być większe od zera dla ćwiczenia na kolejności ${order} w sekcji ${exercise.section_type}.`
      );
    }

    if (
      exercise.planned_reps !== undefined &&
      exercise.planned_reps !== null &&
      exercise.planned_reps <= 0
    ) {
      errors.push(
        `planned_reps musi być większe od zera dla ćwiczenia na kolejności ${order} w sekcji ${exercise.section_type}.`
      );
    }

    if (
      exercise.planned_duration_seconds !== undefined &&
      exercise.planned_duration_seconds !== null &&
      exercise.planned_duration_seconds <= 0
    ) {
      errors.push(
        `planned_duration_seconds musi być większe od zera dla ćwiczenia na kolejności ${order} w sekcji ${exercise.section_type}.`
      );
    }

    if (
      exercise.planned_rest_seconds !== undefined &&
      exercise.planned_rest_seconds !== null &&
      exercise.planned_rest_seconds < 0
    ) {
      errors.push(
        `planned_rest_seconds nie może być ujemne dla ćwiczenia na kolejności ${order} w sekcji ${exercise.section_type}.`
      );
    }
  }

  return errors;
}

/**
 * Walidacja pojedynczego pola formularza
 */
export function validateWorkoutPlanFormField(
  field: keyof WorkoutPlanFormState,
  value: unknown
): string | undefined {
  try {
    switch (field) {
      case "name":
        workoutPlanNameSchema.parse(value);
        break;
      case "description":
        workoutPlanDescriptionSchema.parse(value);
        break;
      case "part":
        workoutPlanPartSchema.parse(value);
        break;
      case "exercises":
        // Walidacja ćwiczeń jest bardziej złożona, użyj pełnego schematu
        if (Array.isArray(value)) {
          z.array(workoutPlanExerciseItemFormSchema).parse(value);
        }
        break;
    }
    return undefined;
  } catch (error) {
    if (error instanceof z.ZodError && error.issues && error.issues.length > 0) {
      return error.issues[0].message;
    }
    return undefined;
  }
}

/**
 * Walidacja pojedynczego parametru planned_*
 */
export function validatePlannedParam(
  field: "planned_sets" | "planned_reps" | "planned_duration_seconds" | "planned_rest_seconds",
  value: number | null
): string | undefined {
  try {
    switch (field) {
      case "planned_sets":
        workoutPlanPlannedSetsSchema.parse(value);
        break;
      case "planned_reps":
        workoutPlanPlannedRepsSchema.parse(value);
        break;
      case "planned_duration_seconds":
        workoutPlanPlannedDurationSchema.parse(value);
        break;
      case "planned_rest_seconds":
        workoutPlanPlannedRestSchema.parse(value);
        break;
    }
    return undefined;
  } catch (error) {
    if (error instanceof z.ZodError && error.issues && error.issues.length > 0) {
      return error.issues[0]?.message;
    }
    return undefined;
  }
}
