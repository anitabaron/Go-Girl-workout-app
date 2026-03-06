import { z } from "zod";

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

export const programSessionCreateSchema = z
  .object({
    workout_plan_id: z
      .string()
      .refine((val) => uuidRegex.test(val), "workout_plan_id musi być UUID"),
    scheduled_date: z.string().date("scheduled_date musi być datą YYYY-MM-DD"),
    week_index: z.number().int().min(1),
    session_index: z.number().int().min(1),
    status: z.enum(["planned", "completed"]).default("planned"),
    progression_overrides: z
      .record(z.string(), z.unknown())
      .nullable()
      .optional(),
  })
  .strict();

export const programGenerateSchema = z
  .object({
    goal_text: z
      .string()
      .trim()
      .min(1, "goal_text nie może być puste")
      .max(4000, "goal_text nie może przekraczać 4000 znaków"),
    duration_months: durationMonthsSchema.default(1),
    sessions_per_week: sessionsPerWeekSchema.default(2),
    constraints: z.string().trim().max(4000).nullable().optional(),
    profile_id: z
      .string()
      .refine((val) => uuidRegex.test(val), "profile_id musi być UUID")
      .nullable()
      .optional(),
  })
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
