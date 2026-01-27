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
const sectionOrderSchema = z.number().int().positive();
const plannedSetsSchema = z.number().int().positive().nullable().optional();
const plannedRepsSchema = z.number().int().positive().nullable().optional();
const plannedDurationSchema = z.number().int().positive().nullable().optional();
const plannedRestSchema = z.number().int().nonnegative().nullable().optional();
const plannedRestAfterSeriesSchema = z.number().int().nonnegative().nullable().optional();
const estimatedSetTimeSchema = z.number().int().positive().nullable().optional();

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
    section_order: sectionOrderSchema,
    planned_sets: plannedSetsSchema,
    planned_reps: plannedRepsSchema,
    planned_duration_seconds: plannedDurationSchema,
    planned_rest_seconds: plannedRestSchema,
    planned_rest_after_series_seconds: plannedRestAfterSeriesSchema,
    estimated_set_time_seconds: estimatedSetTimeSchema,
  })
  .strict();

/**
 * Schema dla częściowej aktualizacji ćwiczenia w planie treningowym.
 * Wymaga id ćwiczenia w planie i pozwala na aktualizację tylko wybranych pól.
 */
export const workoutPlanExerciseUpdateSchema = z
  .object({
    id: z
      .string()
      .refine(
        (val) => uuidRegex.test(val),
        "id musi być prawidłowym UUID ćwiczenia w planie"
      ),
    exercise_id: z
      .string()
      .refine(
        (val) => uuidRegex.test(val),
        "exercise_id musi być prawidłowym UUID"
      )
      .optional(),
    section_type: sectionTypeSchema.optional(),
    section_order: sectionOrderSchema.optional(),
    planned_sets: plannedSetsSchema,
    planned_reps: plannedRepsSchema,
    planned_duration_seconds: plannedDurationSchema,
    planned_rest_seconds: plannedRestSchema,
    planned_rest_after_series_seconds: plannedRestAfterSeriesSchema,
    estimated_set_time_seconds: estimatedSetTimeSchema,
  })
  .strict();

/**
 * Schema dla ćwiczenia w trybie aktualizacji planu.
 * Może być to aktualizacja istniejącego ćwiczenia (z id) lub dodanie nowego (bez id).
 * Jeśli id jest podane, to jest aktualizacja (wszystkie pola opcjonalne).
 * Jeśli id nie jest podane, to jest dodanie (wymaga exercise_id, section_type, section_order).
 */
export const workoutPlanExerciseUpdateOrCreateSchema = z
  .object({
    id: z
      .string()
      .refine(
        (val) => uuidRegex.test(val),
        "id musi być prawidłowym UUID ćwiczenia w planie"
      )
      .optional(),
    exercise_id: z
      .string()
      .refine(
        (val) => uuidRegex.test(val),
        "exercise_id musi być prawidłowym UUID"
      )
      .optional()
      .nullable(),
    // Pola snapshot - można je ustawić na null, aby wyczyścić snapshot
    exercise_title: z.string().trim().max(120).optional().nullable(),
    exercise_type: z.enum(exerciseTypeValues).optional().nullable(),
    exercise_part: z.enum(exercisePartValues).optional().nullable(),
    section_type: sectionTypeSchema.optional(),
    section_order: sectionOrderSchema.optional(),
    planned_sets: plannedSetsSchema,
    planned_reps: plannedRepsSchema,
    planned_duration_seconds: plannedDurationSchema,
    planned_rest_seconds: plannedRestSchema,
    planned_rest_after_series_seconds: plannedRestAfterSeriesSchema,
    estimated_set_time_seconds: estimatedSetTimeSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    // Jeśli nie ma id, to jest nowe ćwiczenie - wymaga exercise_id, section_type, section_order
    if (!data.id) {
      if (!data.exercise_id) {
        ctx.addIssue({
          code: "custom",
          message: "Nowe ćwiczenie musi mieć exercise_id",
          path: ["exercise_id"],
        });
      }
      if (!data.section_type) {
        ctx.addIssue({
          code: "custom",
          message: "Nowe ćwiczenie musi mieć section_type",
          path: ["section_type"],
        });
      }
      if (!data.section_order) {
        ctx.addIssue({
          code: "custom",
          message: "Nowe ćwiczenie musi mieć section_order",
          path: ["section_order"],
        });
      }
    }
  });

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
 * Pozwala na częściową aktualizację ćwiczeń - ćwiczenia mogą mieć id (aktualizacja)
 * lub nie mieć id (dodanie nowego ćwiczenia).
 */
export const workoutPlanUpdateSchema = z
  .object({
    name: nameSchema.optional(),
    description: descriptionSchema,
    part: partSchema,
    exercises: z
      .array(workoutPlanExerciseUpdateOrCreateSchema)
      .min(1, "Lista ćwiczeń nie może być pusta")
      .optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.exercises !== undefined && data.exercises.length > 0) {
      // Walidacja reguł biznesowych dla wszystkich ćwiczeń
      const exercisesForBusinessRules: WorkoutPlanExerciseInput[] = [];
      
      for (let i = 0; i < data.exercises.length; i++) {
        const exercise = data.exercises[i];
        
        // Jeśli ćwiczenie ma id, to jest aktualizacją istniejącego
        // Jeśli nie ma id, to jest nowym ćwiczeniem i wymaga wszystkich pól
        if (!exercise.id) {
          // Nowe ćwiczenie - sprawdź czy ma wszystkie wymagane pola
          if (!exercise.exercise_id || !exercise.section_type || !exercise.section_order) {
            ctx.addIssue({
              code: "custom",
              message: `Nowe ćwiczenie na pozycji ${i} musi mieć exercise_id, section_type i section_order.`,
              path: ["exercises", i],
            });
          } else {
            exercisesForBusinessRules.push({
              exercise_id: exercise.exercise_id,
              section_type: exercise.section_type,
              section_order: exercise.section_order,
              planned_sets: exercise.planned_sets,
              planned_reps: exercise.planned_reps,
              planned_duration_seconds: exercise.planned_duration_seconds,
              planned_rest_seconds: exercise.planned_rest_seconds,
              planned_rest_after_series_seconds: exercise.planned_rest_after_series_seconds,
              estimated_set_time_seconds: exercise.estimated_set_time_seconds,
            });
          }
        } else {
          // Istniejące ćwiczenie - użyj wartości z aktualizacji lub istniejących
          // Dla walidacji reguł biznesowych potrzebujemy pełnych danych
          // Ale w trybie aktualizacji nie wszystkie pola są wymagane
          // Więc pomijamy walidację reguł biznesowych dla aktualizacji
        }
      }
      
      // Walidacja reguł biznesowych tylko dla nowych ćwiczeń
      if (exercisesForBusinessRules.length > 0) {
        const errors = validateWorkoutPlanBusinessRules(exercisesForBusinessRules);
        errors.forEach((message) =>
          ctx.addIssue({
            code: "custom",
            message,
          })
        );
      }
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

    if (
      exercise.planned_rest_after_series_seconds !== undefined &&
      exercise.planned_rest_after_series_seconds !== null &&
      exercise.planned_rest_after_series_seconds < 0
    ) {
      errors.push(
        `planned_rest_after_series_seconds nie może być ujemne dla ćwiczenia na kolejności ${order} w sekcji ${exercise.section_type}.`
      );
    }

    if (
      exercise.estimated_set_time_seconds !== undefined &&
      exercise.estimated_set_time_seconds !== null &&
      exercise.estimated_set_time_seconds <= 0
    ) {
      errors.push(
        `estimated_set_time_seconds musi być większe od zera dla ćwiczenia na kolejności ${order} w sekcji ${exercise.section_type}.`
      );
    }
  }

  return errors;
}

/**
 * Schema dla ćwiczenia w planie przy imporcie (obsługuje exercise_id, match_by_name lub snapshot).
 * 
 * Opcje:
 * - exercise_id: UUID istniejącego ćwiczenia w bazie
 * - match_by_name: nazwa ćwiczenia do znalezienia w bazie (znormalizowana, case-insensitive)
 * - exercise_title (exercise_type i exercise_part opcjonalne): nowe ćwiczenie jako snapshot (nie istnieje w bazie)
 */
export const workoutPlanExerciseImportSchema = z
  .object({
    // Opcja A: istniejące ćwiczenie przez exercise_id
    exercise_id: z
      .string()
      .refine(
        (val) => uuidRegex.test(val),
        "exercise_id musi być prawidłowym UUID"
      )
      .optional()
      .nullable(),
    // Opcja B: istniejące ćwiczenie przez nazwę (znormalizowaną) - system znajdzie exercise_id
    match_by_name: z.string().trim().min(1).max(120).optional().nullable(),
    // Opcja C: nowe ćwiczenie przez snapshot (nie istnieje w bazie)
    exercise_title: z.string().trim().min(1).max(120).optional().nullable(),
    exercise_type: sectionTypeSchema.optional().nullable(),
    exercise_part: z.enum(exercisePartValues).optional().nullable(),
    exercise_details: z.string().trim().max(1000).optional().nullable(),
    // Wspólne pola
    section_type: sectionTypeSchema,
    section_order: sectionOrderSchema,
    planned_sets: plannedSetsSchema,
    planned_reps: plannedRepsSchema,
    planned_duration_seconds: plannedDurationSchema,
    planned_rest_seconds: plannedRestSchema,
    planned_rest_after_series_seconds: plannedRestAfterSeriesSchema,
    estimated_set_time_seconds: estimatedSetTimeSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    const hasExerciseId = data.exercise_id !== undefined && data.exercise_id !== null;
    const hasMatchByName = data.match_by_name !== undefined && data.match_by_name !== null;
    const hasSnapshot = 
      data.exercise_title !== undefined && data.exercise_title !== null;

    // Musi być co najmniej jedna opcja: exercise_id, match_by_name, lub snapshot
    if (!hasExerciseId && !hasMatchByName && !hasSnapshot) {
      ctx.addIssue({
        code: "custom",
        message: "Musisz podać albo exercise_id, albo match_by_name, albo exercise_title (exercise_type i exercise_part są opcjonalne)",
        path: ["exercise_id"],
      });
    }

    // Nie można mieć jednocześnie exercise_id i match_by_name
    if (hasExerciseId && hasMatchByName) {
      ctx.addIssue({
        code: "custom",
        message: "Nie można podać jednocześnie exercise_id i match_by_name",
        path: ["exercise_id"],
      });
    }

    // Nie można mieć jednocześnie exercise_id i snapshot
    if (hasExerciseId && hasSnapshot) {
      ctx.addIssue({
        code: "custom",
        message: "Nie można podać jednocześnie exercise_id i snapshot pól (exercise_title, opcjonalnie exercise_type i exercise_part)",
        path: ["exercise_id"],
      });
    }

    // Nie można mieć jednocześnie match_by_name i snapshot
    if (hasMatchByName && hasSnapshot) {
      ctx.addIssue({
        code: "custom",
        message: "Nie można podać jednocześnie match_by_name i snapshot pól (exercise_title, opcjonalnie exercise_type i exercise_part)",
        path: ["match_by_name"],
      });
    }
  });

/**
 * Schema dla importu planu treningowego z JSON.
 */
export const workoutPlanImportSchema = z
  .object({
    name: nameSchema,
    description: descriptionSchema,
    part: partSchema,
    exercises: z
      .array(workoutPlanExerciseImportSchema)
      .min(1, "Plan treningowy musi zawierać co najmniej jedno ćwiczenie"),
  })
  .strict()
  .superRefine((data, ctx) => {
    // Walidacja reguł biznesowych (unikalność pozycji, wartości dodatnie)
    const exercisesForBusinessRules: WorkoutPlanExerciseInput[] = data.exercises.map((e) => ({
      exercise_id: e.exercise_id ?? undefined,
      section_type: e.section_type,
      section_order: e.section_order,
      planned_sets: e.planned_sets,
      planned_reps: e.planned_reps,
      planned_duration_seconds: e.planned_duration_seconds,
      planned_rest_seconds: e.planned_rest_seconds,
      planned_rest_after_series_seconds: e.planned_rest_after_series_seconds,
      estimated_set_time_seconds: e.estimated_set_time_seconds,
    } as WorkoutPlanExerciseInput));

    const errors = validateWorkoutPlanBusinessRules(exercisesForBusinessRules);
    errors.forEach((message) =>
      ctx.addIssue({
        code: "custom",
        message,
      })
    );
  });

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
