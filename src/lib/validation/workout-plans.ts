import { z } from "zod";

import type { PlanQueryParams, WorkoutPlanExerciseInput } from "@/types";
import {
  exercisePartValues,
  exerciseTypeValues,
} from "@/lib/validation/exercises";

export const WORKOUT_PLAN_MAX_LIMIT = 100;
export const WORKOUT_PLAN_DEFAULT_LIMIT = 20;

export const workoutPlanSortFields = [
  "created_at",
  "name",
] as const satisfies NonNullable<PlanQueryParams["sort"]>[];

export const workoutPlanOrderValues = ["asc", "desc"] as const;

const nameSchema = z.string().trim().min(1).max(120);
const descriptionSchema = z.string().trim().max(1000).optional().nullable();
const partSchema = z.enum(exercisePartValues).optional().nullable();
const sectionTypeSchema = z.enum(exerciseTypeValues);
const sectionPositionSchema = z.number().int().positive();
const plannedSetsSchema = z.number().int().positive().nullable().optional();
const plannedRepsSchema = z.number().int().positive().nullable().optional();
const plannedDurationSchema = z.number().int().positive().nullable().optional();
const plannedRestSchema = z.number().int().nonnegative().nullable().optional();

/**
 * Schema dla pojedynczego ćwiczenia w planie treningowym.
 */
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const workoutPlanExerciseInputSchema = z
  .object({
    exercise_id: z
      .string()
      .refine(
        (val) => uuidRegex.test(val),
        "exercise_id musi być prawidłowym UUID"
      ),
    section_type: sectionTypeSchema,
    section_position: sectionPositionSchema,
    planned_sets: plannedSetsSchema,
    planned_reps: plannedRepsSchema,
    planned_duration_seconds: plannedDurationSchema,
    planned_rest_seconds: plannedRestSchema,
  })
  .strict();

/**
 * Schema dla tworzenia planu treningowego.
 */
export const workoutPlanCreateSchema = z
  .object({
    name: nameSchema,
    description: descriptionSchema,
    part: partSchema,
    exercises: z
      .array(workoutPlanExerciseInputSchema)
      .min(1, "Plan treningowy musi zawierać co najmniej jedno ćwiczenie"),
  })
  .strict()
  .superRefine((data, ctx) => {
    const errors = validateWorkoutPlanBusinessRules(data.exercises);

    errors.forEach((message) =>
      ctx.addIssue({
        code: "custom",
        message,
      })
    );
  });

/**
 * Schema dla aktualizacji planu treningowego (partial version of create).
 */
export const workoutPlanUpdateSchema = workoutPlanCreateSchema
  .partial()
  .superRefine((data, ctx) => {
    if (data.exercises !== undefined && data.exercises.length > 0) {
      const errors = validateWorkoutPlanBusinessRules(data.exercises);

      errors.forEach((message) =>
        ctx.addIssue({
          code: "custom",
          message,
        })
      );
    }
  });

/**
 * Schema dla parametrów zapytania listy planów treningowych.
 */
export const workoutPlanQuerySchema = z
  .object({
    part: z.enum(exercisePartValues).optional(),
    sort: z.enum(workoutPlanSortFields).default("created_at"),
    order: z.enum(workoutPlanOrderValues).default("desc"),
    limit: z
      .number()
      .int()
      .positive()
      .max(WORKOUT_PLAN_MAX_LIMIT)
      .default(WORKOUT_PLAN_DEFAULT_LIMIT),
    cursor: z.string().optional().nullable(),
  })
  .strict();

/**
 * Walidacja reguł biznesowych dla ćwiczeń w planie treningowym.
 * Sprawdza:
 * - Co najmniej jedno ćwiczenie
 * - Unikalność pozycji w ramach każdej sekcji
 * - Pozytywne wartości dla planned_* (jeśli podane)
 */
export function validateWorkoutPlanBusinessRules(
  exercises: WorkoutPlanExerciseInput[]
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
    const position = exercise.section_position;

    if (!positionMap.has(sectionKey)) {
      positionMap.set(sectionKey, new Set());
    }

    const positions = positionMap.get(sectionKey)!;

    if (positions.has(position)) {
      errors.push(
        `Duplikat pozycji ${position} w sekcji ${exercise.section_type}.`
      );
    } else {
      positions.add(position);
    }

    // Walidacja wartości planned_*
    if (
      exercise.planned_sets !== undefined &&
      exercise.planned_sets !== null &&
      exercise.planned_sets <= 0
    ) {
      errors.push(
        `planned_sets musi być większe od zera dla ćwiczenia na pozycji ${position} w sekcji ${exercise.section_type}.`
      );
    }

    if (
      exercise.planned_reps !== undefined &&
      exercise.planned_reps !== null &&
      exercise.planned_reps <= 0
    ) {
      errors.push(
        `planned_reps musi być większe od zera dla ćwiczenia na pozycji ${position} w sekcji ${exercise.section_type}.`
      );
    }

    if (
      exercise.planned_duration_seconds !== undefined &&
      exercise.planned_duration_seconds !== null &&
      exercise.planned_duration_seconds <= 0
    ) {
      errors.push(
        `planned_duration_seconds musi być większe od zera dla ćwiczenia na pozycji ${position} w sekcji ${exercise.section_type}.`
      );
    }

    if (
      exercise.planned_rest_seconds !== undefined &&
      exercise.planned_rest_seconds !== null &&
      exercise.planned_rest_seconds < 0
    ) {
      errors.push(
        `planned_rest_seconds nie może być ujemne dla ćwiczenia na pozycji ${position} w sekcji ${exercise.section_type}.`
      );
    }
  }

  return errors;
}

/**
 * Enkoduje kursor paginacji do base64url string.
 */
export function encodeCursor(cursor: {
  sort: (typeof workoutPlanSortFields)[number];
  order: (typeof workoutPlanOrderValues)[number];
  value: string | number;
  id: string;
}): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

/**
 * Dekoduje kursor paginacji z base64url string.
 */
export function decodeCursor(cursor: string): {
  sort: (typeof workoutPlanSortFields)[number];
  order: (typeof workoutPlanOrderValues)[number];
  value: string | number;
  id: string;
} {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8")
    ) as {
      sort: string;
      order: string;
      value: string | number;
      id: string;
    };

    if (
      !workoutPlanSortFields.includes(
        parsed.sort as unknown as (typeof workoutPlanSortFields)[number]
      )
    ) {
      throw new Error("Unsupported sort field");
    }

    if (
      !workoutPlanOrderValues.includes(
        parsed.order as unknown as (typeof workoutPlanOrderValues)[number]
      )
    ) {
      throw new Error("Unsupported order value");
    }

    if (!parsed.id || parsed.value === undefined || parsed.value === null) {
      throw new Error("Cursor missing fields");
    }

    return {
      sort: parsed.sort as (typeof workoutPlanSortFields)[number],
      order: parsed.order as (typeof workoutPlanOrderValues)[number],
      value: parsed.value,
      id: parsed.id,
    };
  } catch (error) {
    throw new Error("INVALID_CURSOR", { cause: error });
  }
}
