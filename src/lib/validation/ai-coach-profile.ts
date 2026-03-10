import { z } from "zod";

export const aiCoachProfilePatchSchema = z
  .object({
    persona_name: z.string().trim().min(1).max(120).optional(),
    tone: z.enum(["calm", "motivating", "direct"]).optional(),
    strictness: z.enum(["low", "medium", "high"]).optional(),
    verbosity: z.enum(["short", "balanced", "detailed"]).optional(),
    focus: z.string().trim().max(240).nullable().optional(),
    risk_tolerance: z.string().trim().max(240).nullable().optional(),
    contraindications: z.string().trim().max(5000).nullable().optional(),
    preferred_methodology: z.string().trim().max(240).nullable().optional(),
    rules: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .strict()
  .refine(
    (payload) =>
      payload.persona_name !== undefined ||
      payload.tone !== undefined ||
      payload.strictness !== undefined ||
      payload.verbosity !== undefined ||
      payload.focus !== undefined ||
      payload.risk_tolerance !== undefined ||
      payload.contraindications !== undefined ||
      payload.preferred_methodology !== undefined ||
      payload.rules !== undefined,
    { message: "Przekaż co najmniej jedno pole do aktualizacji profilu." },
  );
