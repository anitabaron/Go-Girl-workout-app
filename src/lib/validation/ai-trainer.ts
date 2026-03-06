import { z } from "zod";

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const aiTrainerChatSchema = z
  .object({
    message: z
      .string()
      .trim()
      .min(1, "message nie może być pusty")
      .max(2000, "message nie może przekraczać 2000 znaków"),
    workout_plan_id: z
      .string()
      .refine((val) => uuidRegex.test(val), "workout_plan_id musi być UUID")
      .optional()
      .nullable(),
    conversation_id: z
      .string()
      .refine((val) => uuidRegex.test(val), "conversation_id musi być UUID")
      .optional()
      .nullable(),
    profile_id: z
      .string()
      .refine((val) => uuidRegex.test(val), "profile_id musi być UUID")
      .optional()
      .nullable(),
    attachments: z
      .array(
        z
          .object({
            type: z.enum(["plan", "program", "date_range", "session", "metric_pack"]),
            value: z.record(z.string(), z.unknown()),
          })
          .strict(),
      )
      .max(20)
      .optional()
      .nullable(),
  })
  .strict();

export type AITrainerChatCommand = z.infer<typeof aiTrainerChatSchema>;
