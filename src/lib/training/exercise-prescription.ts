import { z } from "zod";

export const exercisePrescriptionModeValues = [
  "reps_based",
  "duration_based_dynamic",
  "duration_based_isometric",
] as const;

export type ExercisePrescriptionMode =
  (typeof exercisePrescriptionModeValues)[number];

const positiveIntOrNullSchema = z.number().int().positive().nullable();

export const exercisePrescriptionConfigSchema = z
  .object({
    prescription_mode: z.enum(exercisePrescriptionModeValues),
    min_sets: z.number().int().positive(),
    max_sets: z.number().int().positive(),
    min_reps: positiveIntOrNullSchema,
    max_reps: positiveIntOrNullSchema,
    min_duration_seconds: positiveIntOrNullSchema,
    max_duration_seconds: positiveIntOrNullSchema,
    min_rest_seconds: z.number().int().nonnegative(),
    max_rest_seconds: z.number().int().nonnegative(),
    progression_step_reps: positiveIntOrNullSchema,
    progression_step_duration_seconds: positiveIntOrNullSchema,
    progression_step_load_percent: positiveIntOrNullSchema,
  })
  .strict()
  .superRefine((config, ctx) => {
    if (config.max_sets < config.min_sets) {
      ctx.addIssue({
        code: "custom",
        message: "max_sets nie może być mniejsze niż min_sets.",
        path: ["max_sets"],
      });
    }

    if (config.max_rest_seconds < config.min_rest_seconds) {
      ctx.addIssue({
        code: "custom",
        message: "max_rest_seconds nie może być mniejsze niż min_rest_seconds.",
        path: ["max_rest_seconds"],
      });
    }

    const repsMode = config.prescription_mode === "reps_based";
    const durationMode = !repsMode;

    if (repsMode) {
      if (
        config.min_reps === null ||
        config.max_reps === null ||
        config.progression_step_reps === null
      ) {
        ctx.addIssue({
          code: "custom",
          message:
            "Dla trybu reps_based wymagane są min_reps, max_reps i progression_step_reps.",
          path: ["prescription_mode"],
        });
      }
      if (
        config.min_duration_seconds !== null ||
        config.max_duration_seconds !== null ||
        config.progression_step_duration_seconds !== null
      ) {
        ctx.addIssue({
          code: "custom",
          message:
            "Dla trybu reps_based pola duration muszą być nullem.",
          path: ["prescription_mode"],
        });
      }
    }

    if (durationMode) {
      if (
        config.min_duration_seconds === null ||
        config.max_duration_seconds === null ||
        config.progression_step_duration_seconds === null
      ) {
        ctx.addIssue({
          code: "custom",
          message:
            "Dla trybów duration_based wymagane są min_duration_seconds, max_duration_seconds i progression_step_duration_seconds.",
          path: ["prescription_mode"],
        });
      }
      if (
        config.min_reps !== null ||
        config.max_reps !== null ||
        config.progression_step_reps !== null
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Dla trybów duration_based pola reps muszą być nullem.",
          path: ["prescription_mode"],
        });
      }
    }

    if (
      config.min_reps !== null &&
      config.max_reps !== null &&
      config.max_reps < config.min_reps
    ) {
      ctx.addIssue({
        code: "custom",
        message: "max_reps nie może być mniejsze niż min_reps.",
        path: ["max_reps"],
      });
    }

    if (
      config.min_duration_seconds !== null &&
      config.max_duration_seconds !== null &&
      config.max_duration_seconds < config.min_duration_seconds
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "max_duration_seconds nie może być mniejsze niż min_duration_seconds.",
        path: ["max_duration_seconds"],
      });
    }
  });

export type ExercisePrescriptionConfig = z.infer<
  typeof exercisePrescriptionConfigSchema
>;

type ExercisePrescriptionSeed = {
  title?: string | null;
  reps?: number | null;
  duration_seconds?: number | null;
  series?: number | null;
  rest_in_between_seconds?: number | null;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function isLikelyIsometricTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  const normalized = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return /(hold|isometric|plank|l-?sit|support|wall lean|hollow body)/.test(
    normalized,
  );
}

export function buildDefaultExercisePrescriptionConfig(
  seed: ExercisePrescriptionSeed,
): ExercisePrescriptionConfig {
  const baseSets = clamp(seed.series ?? 3, 1, 6);
  const baseRest = clamp(seed.rest_in_between_seconds ?? 60, 20, 180);
  const minSets = Math.max(1, baseSets - 1);
  const maxSets = clamp(Math.max(baseSets + 1, 4), baseSets, 6);
  const minRest = Math.max(15, baseRest - 15);
  const maxRest = Math.min(180, Math.max(baseRest + 45, 45));

  if (seed.reps !== null && seed.reps !== undefined) {
    const baseReps = clamp(seed.reps, 1, 30);
    return {
      prescription_mode: "reps_based",
      min_sets: minSets,
      max_sets: maxSets,
      min_reps: Math.max(1, baseReps - 4),
      max_reps: Math.min(30, Math.max(baseReps + 4, 8)),
      min_duration_seconds: null,
      max_duration_seconds: null,
      min_rest_seconds: minRest,
      max_rest_seconds: maxRest,
      progression_step_reps: baseReps >= 15 ? 1 : 2,
      progression_step_duration_seconds: null,
      progression_step_load_percent: 5,
    };
  }

  const isometric = isLikelyIsometricTitle(seed.title);
  const durationCap = isometric ? 45 : 120;
  const baseDuration = clamp(
    seed.duration_seconds ?? (isometric ? 15 : 30),
    isometric ? 10 : 10,
    durationCap,
  );

  return {
    prescription_mode: isometric
      ? "duration_based_isometric"
      : "duration_based_dynamic",
    min_sets: minSets,
    max_sets: maxSets,
    min_reps: null,
    max_reps: null,
    min_duration_seconds: Math.max(10, baseDuration - (isometric ? 5 : 10)),
    max_duration_seconds: Math.min(
      durationCap,
      baseDuration + (isometric ? 10 : 20),
    ),
    min_rest_seconds: minRest,
    max_rest_seconds: maxRest,
    progression_step_reps: null,
    progression_step_duration_seconds: isometric ? 2 : 5,
    progression_step_load_percent: 5,
  };
}

export function resolveExercisePrescriptionConfig(input: {
  title?: string | null;
  reps?: number | null;
  duration_seconds?: number | null;
  series?: number | null;
  rest_in_between_seconds?: number | null;
  prescription_config?: ExercisePrescriptionConfig | null;
}): ExercisePrescriptionConfig {
  const defaults = buildDefaultExercisePrescriptionConfig(input);
  const merged = input.prescription_config
    ? { ...defaults, ...input.prescription_config }
    : defaults;
  const parsed = exercisePrescriptionConfigSchema.safeParse(merged);
  return parsed.success ? parsed.data : defaults;
}
