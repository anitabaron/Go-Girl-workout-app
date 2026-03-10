import { z } from "zod";

import { movementKeyValues } from "@/lib/training/movement-keys";
import { UUID_REGEX } from "@/lib/service-utils";

const capabilityProfileShape = {
  movement_key: z.enum(movementKeyValues).optional(),
  exercise_id: z
    .string()
    .refine((val) => UUID_REGEX.test(val), "exercise_id musi być UUID")
    .nullable()
    .optional(),
  current_level: z.string().trim().max(120).nullable().optional(),
  comfort_max_reps: z.number().int().positive().nullable().optional(),
  comfort_max_duration_seconds: z.number().int().positive().nullable().optional(),
  comfort_max_load_kg: z.number().nonnegative().nullable().optional(),
  best_recent_reps: z.number().int().positive().nullable().optional(),
  best_recent_duration_seconds: z.number().int().positive().nullable().optional(),
  best_recent_load_kg: z.number().nonnegative().nullable().optional(),
  weekly_progression_cap_percent: z.number().int().min(0).max(30).optional(),
  per_session_progression_cap_reps: z.number().int().positive().nullable().optional(),
  per_session_progression_cap_duration_seconds: z
    .number()
    .int()
    .positive()
    .nullable()
    .optional(),
  confidence_score: z.number().int().min(0).max(100).optional(),
  pain_flag: z.boolean().optional(),
  pain_notes: z.string().trim().max(1000).nullable().optional(),
  updated_from: z
    .enum(["manual", "ai_feedback", "session_result", "import"])
    .optional(),
} as const;

export const capabilityProfilePatchSchema = z
  .object(capabilityProfileShape)
  .strict()
  .refine(
    (payload) => Object.keys(payload).length > 0,
    { message: "Przekaż co najmniej jedno pole do aktualizacji profilu możliwości." },
  );

export const capabilityProfileUpsertSchema = z
  .object({
    ...capabilityProfileShape,
    movement_key: z.enum(movementKeyValues),
  })
  .strict();
