import { z } from "zod";

import type { ExerciseCreateCommand } from "@/types";
import {
  exercisePartValues,
  exerciseTypeValues,
} from "@/lib/validation/exercises";

const METRIC_ERROR = "Podaj dokładnie jedno z pól: reps lub duration_seconds.";
const REST_ERROR =
  "Wymagane jest co najmniej jedno pole odpoczynku (rest_in_between_seconds lub rest_after_series_seconds).";

const optionalPositiveIntString = z
  .string()
  .transform((val) => {
    if (!val || val.trim() === "") return null;
    const num = Number(val);
    if (Number.isNaN(num) || !Number.isInteger(num) || num <= 0) return null;
    return num;
  })
  .nullable()
  .optional();

const requiredPositiveIntString = z.string().transform((val) => {
  if (!val || val.trim() === "") {
    throw new z.ZodError([
      {
        code: "custom",
        message: "Serie są wymagane",
        path: [],
      } as z.core.$ZodIssue,
    ]);
  }
  const num = Number(val);
  if (Number.isNaN(num) || !Number.isInteger(num) || num <= 0) {
    throw new z.ZodError([
      {
        code: "custom",
        message: "Serie muszą być liczbą całkowitą większą od zera",
        path: [],
      } as z.core.$ZodIssue,
    ]);
  }
  return num;
});

const levelStringSchema = z
  .string()
  .transform((val) => {
    if (!val || val.trim() === "" || val === "none") return null;
    if (["Beginner", "Intermediate", "Advanced"].includes(val)) {
      return val as "Beginner" | "Intermediate" | "Advanced";
    }
    throw new z.ZodError([
      {
        code: "custom",
        message: "Wybierz poprawny poziom",
        path: [],
      } as z.core.$ZodIssue,
    ]);
  })
  .nullable()
  .optional();

export type ExerciseFormValues = z.input<typeof exerciseFormSchema>;

const typesSchema = z
  .array(z.enum(exerciseTypeValues))
  .min(1, "Wybierz co najmniej jeden typ");

const partsSchema = z
  .array(z.enum(exercisePartValues))
  .min(1, "Wybierz co najmniej jedną partię");

export const exerciseFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Tytuł jest wymagany")
      .max(120, "Tytuł może mieć maksymalnie 120 znaków"),
    types: typesSchema,
    parts: partsSchema,
    level: levelStringSchema,
    details: z
      .string()
      .trim()
      .max(1000, "Szczegóły mogą mieć maksymalnie 1000 znaków")
      .optional()
      .nullable(),
    is_unilateral: z.boolean().optional().default(false),
    is_save_to_pr: z.boolean().optional().nullable().default(false),
    reps: optionalPositiveIntString,
    duration_seconds: optionalPositiveIntString,
    series: requiredPositiveIntString,
    rest_in_between_seconds: z
      .string()
      .transform((val) => {
        if (!val || val.trim() === "") return null;
        const num = Number(val);
        if (Number.isNaN(num) || !Number.isInteger(num) || num < 0) {
          throw new z.ZodError([
            {
              code: "custom",
              message: "Odpoczynek między seriami nie może być ujemny",
              path: [],
            } as z.core.$ZodIssue,
          ]);
        }
        return num;
      })
      .nullable()
      .optional(),
    rest_after_series_seconds: z
      .string()
      .transform((val) => {
        if (!val || val.trim() === "") return null;
        const num = Number(val);
        if (Number.isNaN(num) || !Number.isInteger(num) || num < 0) {
          throw new z.ZodError([
            {
              code: "custom",
              message: "Odpoczynek po serii nie może być ujemny",
              path: [],
            } as z.core.$ZodIssue,
          ]);
        }
        return num;
      })
      .nullable()
      .optional(),
    estimated_set_time_seconds: z
      .string()
      .transform((val) => {
        if (!val || val.trim() === "") return null;
        const num = Number(val);
        if (Number.isNaN(num) || !Number.isInteger(num) || num <= 0) {
          throw new z.ZodError([
            {
              code: "custom",
              message:
                "Szacunkowy czas zestawu musi być liczbą całkowitą większą od zera",
              path: [],
            } as z.core.$ZodIssue,
          ]);
        }
        return num;
      })
      .nullable()
      .optional(),
  })
  .superRefine((data, ctx) => {
    const hasReps = data.reps !== undefined && data.reps !== null;
    const hasDuration =
      data.duration_seconds !== undefined && data.duration_seconds !== null;

    if (hasReps === hasDuration) {
      ctx.addIssue({
        code: "custom",
        message: METRIC_ERROR,
        path: ["reps"],
      });
      ctx.addIssue({
        code: "custom",
        message: METRIC_ERROR,
        path: ["duration_seconds"],
      });
    }

    const hasRestBetween =
      data.rest_in_between_seconds !== undefined &&
      data.rest_in_between_seconds !== null;
    const hasRestAfter =
      data.rest_after_series_seconds !== undefined &&
      data.rest_after_series_seconds !== null;

    if (!hasRestBetween && !hasRestAfter) {
      ctx.addIssue({
        code: "custom",
        message: REST_ERROR,
        path: ["rest_in_between_seconds"],
      });
      ctx.addIssue({
        code: "custom",
        message: REST_ERROR,
        path: ["rest_after_series_seconds"],
      });
    }
  });

export function formValuesToCommand(
  data: z.output<typeof exerciseFormSchema>,
): ExerciseCreateCommand {
  return {
    title: data.title.trim(),
    types: data.types,
    parts: data.parts,
    series: data.series,
    level: data.level ?? null,
    details: data.details?.trim() || null,
    is_unilateral: data.is_unilateral ?? false,
    is_save_to_pr: data.is_save_to_pr ?? false,
    reps: data.reps ?? undefined,
    duration_seconds: data.duration_seconds ?? undefined,
    rest_in_between_seconds: data.rest_in_between_seconds ?? undefined,
    rest_after_series_seconds: data.rest_after_series_seconds ?? undefined,
    estimated_set_time_seconds: data.estimated_set_time_seconds ?? undefined,
  };
}
