import { z } from "zod";
import {
  exercisePartValues,
  exerciseTypeValues,
} from "@/lib/validation/exercises";
import { exercisePrescriptionConfigSchema } from "@/lib/training/exercise-prescription";

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const durationMonthsSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);

export const sessionsPerWeekSchema = z
  .number()
  .int("sessions_per_week musi być liczbą całkowitą")
  .min(1, "sessions_per_week musi być >= 1")
  .max(7, "sessions_per_week musi być <= 7");

export const programWeekdaySchema = z.enum([
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
]);

export const programModeSchema = z.enum([
  "existing_only",
  "mix_existing_new",
  "new_only",
]);

const generatedPlanExerciseSchema = z
  .object({
    exercise_id: z
      .string()
      .refine((val) => uuidRegex.test(val), "exercise_id musi być UUID")
      .optional()
      .nullable(),
    section_type: z.enum(exerciseTypeValues),
    section_order: z.number().int().positive(),
    exercise_title: z.string().trim().min(1).max(160),
    exercise_type: z.enum(exerciseTypeValues).optional().nullable(),
    exercise_part: z.enum(exercisePartValues).optional().nullable(),
    exercise_details: z.string().trim().max(2000).optional().nullable(),
    exercise_is_unilateral: z.boolean().optional().nullable(),
    planned_sets: z.number().int().positive().optional().nullable(),
    planned_reps: z.number().int().positive().optional().nullable(),
    planned_duration_seconds: z.number().int().positive().optional().nullable(),
    planned_rest_seconds: z.number().int().nonnegative().optional().nullable(),
    planned_rest_after_series_seconds: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .nullable(),
    estimated_set_time_seconds: z.number().int().positive().optional().nullable(),
    exercise_prescription_config: exercisePrescriptionConfigSchema
      .optional()
      .nullable(),
  })
  .strict();

const generatedPlanTemplateSchema = z
  .object({
    template_key: z.string().trim().min(1).max(80),
    name: z.string().trim().min(1).max(160),
    description: z.string().trim().max(1000).optional().nullable(),
    part: z.enum(exercisePartValues).optional().nullable(),
    exercises: z.array(generatedPlanExerciseSchema).min(1),
  })
  .strict();

export const programSessionCreateSchema = z
  .object({
    workout_plan_id: z
      .string()
      .refine((val) => uuidRegex.test(val), "workout_plan_id musi być UUID"),
    generated_plan: generatedPlanTemplateSchema.optional(),
    scheduled_date: z.string().date("scheduled_date musi być datą YYYY-MM-DD"),
    week_index: z.number().int().min(1),
    session_index: z.number().int().min(1),
    status: z.enum(["planned", "completed"]).default("planned"),
    progression_overrides: z
      .record(z.string(), z.unknown())
      .nullable()
      .optional(),
  })
  .strict()
  .partial({ workout_plan_id: true })
  .refine((payload) => Boolean(payload.workout_plan_id || payload.generated_plan), {
    message: "Sesja musi zawierać workout_plan_id lub generated_plan",
    path: ["workout_plan_id"],
  });

export const programGenerateSchema = z
  .object({
    goal_text: z
      .string()
      .trim()
      .min(1, "goal_text nie może być puste")
      .max(4000, "goal_text nie może przekraczać 4000 znaków"),
    duration_months: durationMonthsSchema.default(1),
    sessions_per_week: sessionsPerWeekSchema.default(2),
    program_mode: programModeSchema.default("mix_existing_new"),
    mix_ratio: z.number().int().min(10).max(90).default(60),
    weekdays: z
      .array(programWeekdaySchema)
      .min(1, "weekdays musi zawierać co najmniej 1 dzień")
      .max(7, "weekdays może zawierać maksymalnie 7 dni")
      .optional(),
    constraints: z.string().trim().max(4000).nullable().optional(),
    profile_id: z
      .string()
      .refine((val) => uuidRegex.test(val), "profile_id musi być UUID")
      .nullable()
      .optional(),
  })
  .refine(
    (payload) =>
      !payload.weekdays || new Set(payload.weekdays).size === payload.weekdays.length,
    { message: "weekdays nie może zawierać duplikatów" },
  )
  .refine(
    (payload) =>
      payload.program_mode !== "mix_existing_new" ||
      (payload.mix_ratio >= 10 && payload.mix_ratio <= 90),
    { message: "mix_ratio musi być w zakresie 10-90 dla trybu mix" },
  )
  .strict();

export const programCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    goal_text: z.string().trim().max(4000).nullable().optional(),
    duration_months: durationMonthsSchema,
    sessions_per_week: sessionsPerWeekSchema,
    source: z.enum(["ai", "manual"]).default("ai"),
    status: z.enum(["draft", "active", "archived"]).default("draft"),
    coach_profile_snapshot: z
      .record(z.string(), z.unknown())
      .nullable()
      .optional(),
    sessions: z.array(programSessionCreateSchema).min(1),
  })
  .strict();

export const programUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    goal_text: z.string().trim().max(4000).nullable().optional(),
    duration_months: durationMonthsSchema.optional(),
    sessions_per_week: sessionsPerWeekSchema.optional(),
    status: z.enum(["draft", "active", "archived"]).optional(),
    coach_profile_snapshot: z
      .record(z.string(), z.unknown())
      .nullable()
      .optional(),
  })
  .strict();

export const programListQuerySchema = z
  .object({
    status: z.enum(["draft", "active", "archived"]).optional(),
    source: z.enum(["ai", "manual"]).optional(),
    limit: z.number().int().positive().max(100).default(30),
  })
  .strict();

export const programSessionListQuerySchema = z
  .object({
    from: z.string().date().optional(),
    to: z.string().date().optional(),
    status: z.enum(["planned", "completed"]).optional(),
  })
  .strict();

export const programSessionUpdateSchema = z
  .object({
    scheduled_date: z.string().date().optional(),
    status: z.enum(["planned", "completed"]).optional(),
    progression_overrides: z
      .record(z.string(), z.unknown())
      .nullable()
      .optional(),
  })
  .strict()
  .refine(
    (payload) =>
      payload.scheduled_date !== undefined ||
      payload.status !== undefined ||
      payload.progression_overrides !== undefined,
    { message: "Przekaż co najmniej jedno pole do aktualizacji." },
  );

export const programNoteCreateSchema = z
  .object({
    program_session_id: z
      .string()
      .refine((val) => uuidRegex.test(val), "program_session_id musi być UUID")
      .nullable()
      .optional(),
    note_text: z
      .string()
      .trim()
      .min(1, "note_text nie może być puste")
      .max(4000, "note_text nie może przekraczać 4000 znaków"),
    fatigue_level: z.number().int().min(1).max(10).nullable().optional(),
    vitality_level: z.number().int().min(1).max(10).nullable().optional(),
  })
  .strict();

export const programNoteListQuerySchema = z
  .object({
    program_session_id: z
      .string()
      .refine((val) => uuidRegex.test(val), "program_session_id musi być UUID")
      .optional(),
    limit: z.number().int().positive().max(100).default(50),
  })
  .strict();
