import { z } from "zod";

export const externalWorkoutSportTypeValues = [
  "pole_dance",
  "calisthenics",
  "other",
] as const;

export const externalWorkoutSourceValues = [
  "manual",
  "garmin",
  "apple_health",
] as const;

export const externalWorkoutCreateSchema = z
  .object({
    started_at: z
      .string()
      .refine(
        (val) => !Number.isNaN(Date.parse(val)),
        "started_at musi być prawidłowym timestampem ISO 8601",
      ),
    sport_type: z.enum(externalWorkoutSportTypeValues),
    duration_minutes: z
      .number()
      .int()
      .positive("duration_minutes musi być > 0")
      .max(24 * 60, "duration_minutes nie może przekraczać 1440"),
    calories: z.number().int().nonnegative("calories musi być >= 0").optional(),
    hr_avg: z
      .number()
      .int()
      .min(1, "hr_avg musi być >= 1")
      .max(260, "hr_avg nie może przekraczać 260")
      .optional(),
    hr_max: z
      .number()
      .int()
      .min(1, "hr_max musi być >= 1")
      .max(260, "hr_max nie może przekraczać 260")
      .optional(),
    intensity_rpe: z
      .number()
      .int()
      .min(1, "intensity_rpe musi być >= 1")
      .max(10, "intensity_rpe nie może przekraczać 10")
      .optional(),
    notes: z
      .string()
      .trim()
      .max(2000, "notes nie może przekraczać 2000 znaków")
      .optional(),
    source: z.enum(externalWorkoutSourceValues).default("manual"),
    external_id: z
      .string()
      .trim()
      .min(1, "external_id nie może być pusty")
      .max(255, "external_id nie może przekraczać 255 znaków")
      .optional(),
    raw_payload: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.hr_avg === undefined || data.hr_max === undefined) return true;
      return data.hr_max >= data.hr_avg;
    },
    {
      message: "hr_max nie może być mniejsze niż hr_avg",
      path: ["hr_max"],
    },
  );

export const externalWorkoutListQuerySchema = z
  .object({
    from: z
      .string()
      .refine(
        (val) => !Number.isNaN(Date.parse(val)),
        "from musi być prawidłową datą ISO 8601",
      )
      .optional(),
    to: z
      .string()
      .refine(
        (val) => !Number.isNaN(Date.parse(val)),
        "to musi być prawidłową datą ISO 8601",
      )
      .optional(),
    limit: z.number().int().positive().max(500).default(100),
  })
  .strict();
