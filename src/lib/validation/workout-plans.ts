import { z } from "zod";

import type { PlanQueryParams, WorkoutPlanExerciseInput } from "@/types";
import {
  decodeCursor as decodeCursorBase,
  encodeCursor as encodeCursorBase,
  type CursorPayload,
} from "@/lib/cursor-utils";
import { DEFAULT_EXERCISE_VALUE } from "@/lib/constants";
import {
  exercisePartValues,
  exerciseTypeValues,
} from "@/lib/validation/exercises";

export const WORKOUT_PLAN_MAX_LIMIT = 100;
export const WORKOUT_PLAN_DEFAULT_LIMIT = 30;

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
const plannedRestAfterSeriesSchema = z
  .number()
  .int()
  .nonnegative()
  .nullable()
  .optional();
const estimatedSetTimeSchema = z
  .number()
  .int()
  .positive()
  .nullable()
  .optional();

/**
 * UUID regex for exercise_id and scope_id.
 */
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const scopeIdSchema = z
  .union([
    z.string().refine((val) => uuidRegex.test(val), "scope_id musi być UUID"),
    z.null(),
  ])
  .optional();
const inScopeNrSchema = z.number().int().positive().nullable().optional();
const scopeRepeatCountSchema = z
  .number()
  .int()
  .min(1, "scope_repeat_count musi być >= 1")
  .nullable()
  .optional();

export const workoutPlanExerciseInputSchema = z
  .object({
    exercise_id: z
      .string()
      .refine(
        (val) => uuidRegex.test(val),
        "exercise_id musi być prawidłowym UUID",
      ),
    section_type: sectionTypeSchema,
    section_order: sectionOrderSchema,
    scope_id: scopeIdSchema,
    in_scope_nr: inScopeNrSchema,
    scope_repeat_count: scopeRepeatCountSchema,
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
        "id musi być prawidłowym UUID ćwiczenia w planie",
      ),
    exercise_id: z
      .string()
      .refine(
        (val) => uuidRegex.test(val),
        "exercise_id musi być prawidłowym UUID",
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
        "id musi być prawidłowym UUID ćwiczenia w planie",
      )
      .optional(),
    exercise_id: z
      .string()
      .refine(
        (val) => uuidRegex.test(val),
        "exercise_id musi być prawidłowym UUID",
      )
      .optional()
      .nullable(),
    // Pola snapshot - można je ustawić na null, aby wyczyścić snapshot
    exercise_title: z.string().trim().max(120).optional().nullable(),
    exercise_type: z.enum(exerciseTypeValues).optional().nullable(),
    exercise_part: z.enum(exercisePartValues).optional().nullable(),
    section_type: sectionTypeSchema.optional(),
    section_order: sectionOrderSchema.optional(),
    scope_id: scopeIdSchema,
    in_scope_nr: inScopeNrSchema,
    scope_repeat_count: scopeRepeatCountSchema,
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
      }),
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

        // Jeśli ćwiczenie ma id, to jest aktualizacją istniejącego - pomijamy walidację reguł biznesowych
        if (exercise.id) {
          continue;
        }
        // Nowe ćwiczenie - sprawdź czy ma wszystkie wymagane pola
        if (
          !exercise.exercise_id ||
          !exercise.section_type ||
          !exercise.section_order
        ) {
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
            planned_rest_after_series_seconds:
              exercise.planned_rest_after_series_seconds,
            estimated_set_time_seconds: exercise.estimated_set_time_seconds,
          });
        }
      }

      // Walidacja reguł biznesowych tylko dla nowych ćwiczeń
      if (exercisesForBusinessRules.length > 0) {
        const errors = validateWorkoutPlanBusinessRules(
          exercisesForBusinessRules,
        );
        errors.forEach((message) =>
          ctx.addIssue({
            code: "custom",
            message,
          }),
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

function getDuplicateOrderErrors(
  exercises: WorkoutPlanExerciseInput[],
): string[] {
  const errors: string[] = [];
  const slotKey = (ex: WorkoutPlanExerciseInput) =>
    `${ex.section_type}:${ex.section_order}`;
  const isScopeExercise = (ex: WorkoutPlanExerciseInput) =>
    ex.scope_id != null;
  const groups = new Map<string, WorkoutPlanExerciseInput[]>();
  for (const ex of exercises) {
    const key = slotKey(ex);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(ex);
  }
  for (const [key, group] of groups) {
    if (group.length === 1) continue;
    const withScope = group.filter(isScopeExercise);
    const withoutScope = group.filter((ex) => !isScopeExercise(ex));
    if (withoutScope.length > 0 && withScope.length > 0) {
      errors.push(
        `W slocie ${key} może być albo jedno ćwiczenie, albo zestaw (scope); mieszanie niedozwolone.`,
      );
      continue;
    }
    if (withoutScope.length > 1) {
      errors.push(
        `Duplikat kolejności w sekcji ${key}. W slocie może być tylko jedno ćwiczenie bez zestawu.`,
      );
      continue;
    }
    const scopeIds = new Set(withScope.map((ex) => ex.scope_id));
    if (scopeIds.size > 1) {
      errors.push(
        `W jednym slocie ${key} tylko jeden zestaw (scope). Różne scope_id.`,
      );
    }
  }
  return errors;
}

function getPlannedValuesErrors(exercise: WorkoutPlanExerciseInput): string[] {
  const errors: string[] = [];
  const { section_type, section_order } = exercise;
  const label = `ćwiczenia na kolejności ${section_order} w sekcji ${section_type}`;

  if (
    exercise.planned_sets !== undefined &&
    exercise.planned_sets !== null &&
    exercise.planned_sets <= 0
  ) {
    errors.push(`planned_sets musi być większe od zera dla ${label}.`);
  }
  if (
    exercise.planned_reps !== undefined &&
    exercise.planned_reps !== null &&
    exercise.planned_reps <= 0
  ) {
    errors.push(`planned_reps musi być większe od zera dla ${label}.`);
  }
  if (
    exercise.planned_duration_seconds !== undefined &&
    exercise.planned_duration_seconds !== null &&
    exercise.planned_duration_seconds <= 0
  ) {
    errors.push(
      `planned_duration_seconds musi być większe od zera dla ${label}.`,
    );
  }
  if (
    exercise.planned_rest_seconds !== undefined &&
    exercise.planned_rest_seconds !== null &&
    exercise.planned_rest_seconds < 0
  ) {
    errors.push(`planned_rest_seconds nie może być ujemne dla ${label}.`);
  }
  if (
    exercise.planned_rest_after_series_seconds !== undefined &&
    exercise.planned_rest_after_series_seconds !== null &&
    exercise.planned_rest_after_series_seconds < 0
  ) {
    errors.push(
      `planned_rest_after_series_seconds nie może być ujemne dla ${label}.`,
    );
  }
  if (
    exercise.estimated_set_time_seconds !== undefined &&
    exercise.estimated_set_time_seconds !== null &&
    exercise.estimated_set_time_seconds <= 0
  ) {
    errors.push(
      `estimated_set_time_seconds musi być większe od zera dla ${label}.`,
    );
  }

  return errors;
}

/**
 * Walidacja reguł biznesowych dla ćwiczeń w planie treningowym.
 * Sprawdza:
 * - Co najmniej jedno ćwiczenie
 * - Unikalność pozycji w ramach każdej sekcji
 * - Pozytywne wartości dla planned_* (jeśli podane)
 */
export function validateWorkoutPlanBusinessRules(
  exercises: WorkoutPlanExerciseInput[],
): string[] {
  if (exercises.length === 0) {
    return ["Plan treningowy musi zawierać co najmniej jedno ćwiczenie."];
  }

  const errors = [...getDuplicateOrderErrors(exercises)];
  for (const exercise of exercises) {
    errors.push(...getPlannedValuesErrors(exercise));
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
        "exercise_id musi być prawidłowym UUID",
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
    // Wspólne pola (section_type i section_order opcjonalne – gdy brak, z constants / kolejności w JSON)
    section_type: sectionTypeSchema.optional(),
    section_order: sectionOrderSchema.optional(),
    scope_id: scopeIdSchema,
    in_scope_nr: inScopeNrSchema,
    scope_repeat_count: scopeRepeatCountSchema,
    planned_sets: plannedSetsSchema,
    planned_reps: plannedRepsSchema,
    planned_duration_seconds: plannedDurationSchema,
    planned_rest_seconds: plannedRestSchema,
    planned_rest_after_series_seconds: plannedRestAfterSeriesSchema,
    estimated_set_time_seconds: estimatedSetTimeSchema,
    exercise_is_unilateral: z.boolean().optional().nullable(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const hasExerciseId =
      data.exercise_id !== undefined && data.exercise_id !== null;
    const hasMatchByName =
      data.match_by_name !== undefined && data.match_by_name !== null;
    const hasSnapshot =
      data.exercise_title !== undefined && data.exercise_title !== null;

    // Musi być co najmniej jedna opcja: exercise_id, match_by_name, lub snapshot
    if (!hasExerciseId && !hasMatchByName && !hasSnapshot) {
      ctx.addIssue({
        code: "custom",
        message:
          "Musisz podać albo exercise_id, albo match_by_name, albo exercise_title (exercise_type i exercise_part są opcjonalne)",
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
        message:
          "Nie można podać jednocześnie exercise_id i snapshot pól (exercise_title, opcjonalnie exercise_type i exercise_part)",
        path: ["exercise_id"],
      });
    }

    // Nie można mieć jednocześnie match_by_name i snapshot
    if (hasMatchByName && hasSnapshot) {
      ctx.addIssue({
        code: "custom",
        message:
          "Nie można podać jednocześnie match_by_name i snapshot pól (exercise_title, opcjonalnie exercise_type i exercise_part)",
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
    // section_type: gdy brak – z DEFAULT_EXERCISE_VALUE
    // section_order: gdy brak – z kolejności występowania w JSON (w ramach każdej sekcji)
    const sectionOrderCounters = new Map<string, number>();
    const defaultSectionType = DEFAULT_EXERCISE_VALUE.section_type;
    const exercisesForBusinessRules: WorkoutPlanExerciseInput[] =
      data.exercises.map((e) => {
        const sectionType = e.section_type ?? defaultSectionType;
        const order =
          e.section_order ??
          (() => {
            const next = (sectionOrderCounters.get(sectionType) ?? 0) + 1;
            sectionOrderCounters.set(sectionType, next);
            return next;
          })();
        return {
          exercise_id: e.exercise_id ?? undefined,
          section_type: sectionType,
          section_order: order,
          scope_id: e.scope_id ?? undefined,
          in_scope_nr: e.in_scope_nr ?? undefined,
          scope_repeat_count: e.scope_repeat_count ?? undefined,
          planned_sets: e.planned_sets,
          planned_reps: e.planned_reps,
          planned_duration_seconds: e.planned_duration_seconds,
          planned_rest_seconds: e.planned_rest_seconds,
          planned_rest_after_series_seconds:
            e.planned_rest_after_series_seconds,
          estimated_set_time_seconds: e.estimated_set_time_seconds,
        } as WorkoutPlanExerciseInput;
      });

    const errors = validateWorkoutPlanBusinessRules(exercisesForBusinessRules);
    errors.forEach((message) =>
      ctx.addIssue({
        code: "custom",
        message,
      }),
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
  return encodeCursorBase(cursor as CursorPayload);
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
  const parsed = decodeCursorBase(cursor, {
    sortFields: workoutPlanSortFields,
    orderValues: workoutPlanOrderValues,
  });
  return parsed as {
    sort: (typeof workoutPlanSortFields)[number];
    order: (typeof workoutPlanOrderValues)[number];
    value: string | number;
    id: string;
  };
}
