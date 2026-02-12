import { z } from "zod";

import { EXERCISE_PART_VALUES } from "@/lib/constants";
import type {
  ExerciseCreateCommand,
  ExerciseQueryParams,
  ExerciseType,
} from "@/types";

export const EXERCISE_MAX_LIMIT = 100;
export const EXERCISE_DEFAULT_LIMIT = 50;

export { EXERCISE_PART_VALUES as exercisePartValues } from "@/lib/constants";

export const exerciseTypeValues = [
  "Warm-up",
  "Main Workout",
  "Cool-down",
] as const satisfies ExerciseType[];

export const exerciseSortFields = [
  "created_at",
  "title",
  "part",
  "type",
] as const satisfies NonNullable<ExerciseQueryParams["sort"]>[];

export const exerciseOrderValues = ["asc", "desc"] as const;

const titleSchema = z.string().trim().min(1).max(120);
const levelSchema = z.string().trim().min(1).max(60).optional().nullable();
const detailsSchema = z.string().trim().min(1).max(1000).optional().nullable();
const repsSchema = z.number().int().positive().nullable().optional();
const durationSchema = z.number().int().positive().nullable().optional();
const restSchema = z.number().int().nonnegative().nullable().optional();
const seriesSchema = z.number().int().positive();
const estimatedSetTimeSchema = z
  .number()
  .int()
  .positive()
  .nullable()
  .optional();

const METRIC_ERROR = "Podaj dokładnie jedno z pól: reps lub duration_seconds.";
const REST_ERROR =
  "Wymagane jest co najmniej jedno pole odpoczynku (rest_in_between_seconds lub rest_after_series_seconds).";

const exerciseBaseSchema = z
  .object({
    title: titleSchema,
    types: z.array(z.enum(exerciseTypeValues)).min(1),
    parts: z.array(z.enum(EXERCISE_PART_VALUES)).min(1),
    level: levelSchema,
    details: detailsSchema,
    is_unilateral: z.boolean().optional().default(false),
    is_save_to_pr: z.boolean().optional().nullable().default(true),
    reps: repsSchema,
    duration_seconds: durationSchema,
    series: seriesSchema,
    rest_in_between_seconds: restSchema,
    rest_after_series_seconds: restSchema,
    estimated_set_time_seconds: estimatedSetTimeSchema,
  })
  .strict();

export const exerciseCreateSchema = exerciseBaseSchema.superRefine(
  (data, ctx) => {
    const errors = collectBusinessRuleErrors(data);

    errors.forEach((message) =>
      ctx.addIssue({
        code: "custom",
        message,
      }),
    );
  },
);

export const exerciseUpdateSchema = exerciseBaseSchema
  .partial()
  .superRefine((data, ctx) => {
    const hasReps = hasOwnValue(data, "reps");
    const hasDuration = hasOwnValue(data, "duration_seconds");

    if (hasReps && hasDuration) {
      ctx.addIssue({
        code: "custom",
        message: METRIC_ERROR,
      });
    }

    const hasRestBetween = hasOwnValue(data, "rest_in_between_seconds");
    const hasRestAfter = hasOwnValue(data, "rest_after_series_seconds");

    if (!hasRestBetween && !hasRestAfter && hasOwnValue(data, "series")) {
      ctx.addIssue({
        code: "custom",
        message: REST_ERROR,
      });
    }
  });

export const exerciseQuerySchema = z
  .object({
    search: z.string().trim().max(100).optional(),
    part: z.enum(EXERCISE_PART_VALUES).optional(),
    type: z.enum(exerciseTypeValues).optional(),
    exercise_id: z.uuid().optional(),
    sort: z.enum(exerciseSortFields).default("created_at"),
    order: z.enum(exerciseOrderValues).default("desc"),
    limit: z
      .number()
      .int()
      .positive()
      .max(EXERCISE_MAX_LIMIT)
      .default(EXERCISE_DEFAULT_LIMIT),
    cursor: z.string().optional().nullable(),
  })
  .strict();

/**
 * Normalizacja tytułu z usuwaniem diakrytyków (ą→a, ć→c itd.).
 * Używana m.in. do wyświetlania, sortowania, porównań poza bazą.
 */
export function normalizeTitle(value: string) {
  return value
    .normalize("NFKD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .trim()
    .replaceAll(/\s+/g, " ")
    .toLowerCase();
}

/**
 * Normalizacja tytułu w taki sam sposób jak kolumna GENERATED w PostgreSQL:
 * lower(trim(regexp_replace(title, '\s+', ' ', 'g'))).
 * Nie usuwa polskich znaków (ą, ć, ę itd.) – musi być zgodna z title_normalized w bazie.
 * Używaj przy wyszukiwaniu po tytule (by-title, match_by_name, unikalność).
 */
export function normalizeTitleForDbLookup(value: string) {
  return value.trim().replaceAll(/\s+/g, " ").toLowerCase();
}

export function validateExerciseBusinessRules(
  input: Partial<
    Pick<
      ExerciseCreateCommand,
      | "reps"
      | "duration_seconds"
      | "rest_in_between_seconds"
      | "rest_after_series_seconds"
      | "series"
    >
  >,
) {
  return collectBusinessRuleErrors(input);
}

function collectBusinessRuleErrors(
  input: Partial<
    Pick<
      ExerciseCreateCommand,
      | "reps"
      | "duration_seconds"
      | "rest_in_between_seconds"
      | "rest_after_series_seconds"
      | "series"
    >
  >,
) {
  const errors: string[] = [];
  const hasReps = input.reps !== undefined && input.reps !== null;
  const hasDuration =
    input.duration_seconds !== undefined && input.duration_seconds !== null;

  if (hasReps === hasDuration) {
    errors.push(METRIC_ERROR);
  }

  const hasRestBetween =
    input.rest_in_between_seconds !== undefined &&
    input.rest_in_between_seconds !== null;
  const hasRestAfter =
    input.rest_after_series_seconds !== undefined &&
    input.rest_after_series_seconds !== null;

  if (!hasRestBetween && !hasRestAfter) {
    errors.push(REST_ERROR);
  }

  if (input.series !== undefined && input.series <= 0) {
    errors.push("Pole series musi być większe od zera.");
  }

  if (
    input.rest_in_between_seconds !== undefined &&
    input.rest_in_between_seconds !== null &&
    input.rest_in_between_seconds < 0
  ) {
    errors.push("Pole rest_in_between_seconds nie może być ujemne.");
  }

  if (
    input.rest_after_series_seconds !== undefined &&
    input.rest_after_series_seconds !== null &&
    input.rest_after_series_seconds < 0
  ) {
    errors.push("Pole rest_after_series_seconds nie może być ujemne.");
  }

  return errors;
}

function hasOwnValue<T extends object, K extends keyof T>(
  obj: T,
  key: K,
): obj is T & Required<Pick<T, K>> {
  return Object.hasOwn(obj, key);
}
