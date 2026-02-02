import { z } from "zod";
import type {
  WorkoutPlanFormState,
  WorkoutPlanExerciseItemState,
} from "@/types/workout-plan-form";
import type {
  WorkoutPlanCreateCommand,
  WorkoutPlanUpdateCommand,
} from "@/types";
import {
  exercisePartValues,
  exerciseTypeValues,
} from "@/lib/validation/exercises";

/**
 * Schema dla walidacji pojedynczego pola name
 */
export const workoutPlanNameSchema = z
  .string()
  .trim()
  .min(1, "Nazwa jest wymagana")
  .max(120, "Nazwa może mieć maksymalnie 120 znaków");

/**
 * Schema dla walidacji pola description
 */
export const workoutPlanDescriptionSchema = z
  .string()
  .trim()
  .max(1000, "Opis może mieć maksymalnie 1000 znaków")
  .nullable()
  .optional();

/**
 * Schema dla walidacji pola part
 */
export const workoutPlanPartSchema = z
  .enum(exercisePartValues)
  .nullable()
  .optional();

/**
 * Schema dla walidacji section_type
 */
export const workoutPlanSectionTypeSchema = z.enum(exerciseTypeValues, {
  message: "Typ sekcji jest wymagany",
});

/**
 * Schema dla walidacji section_order
 */
export const workoutPlanSectionOrderSchema = z
  .number()
  .int("Kolejność musi być liczbą całkowitą")
  .positive("Kolejność musi być większa od zera");

/**
 * Schema dla walidacji planned_sets
 */
export const workoutPlanPlannedSetsSchema = z
  .number()
  .int("Liczba serii musi być liczbą całkowitą")
  .positive("Liczba serii musi być większa od zera")
  .nullable()
  .optional();

/**
 * Schema dla walidacji planned_reps
 */
export const workoutPlanPlannedRepsSchema = z
  .number()
  .int("Liczba powtórzeń musi być liczbą całkowitą")
  .positive("Liczba powtórzeń musi być większa od zera")
  .nullable()
  .optional();

/**
 * Schema dla walidacji planned_duration_seconds
 */
export const workoutPlanPlannedDurationSchema = z
  .number()
  .int("Czas trwania musi być liczbą całkowitą")
  .positive("Czas trwania musi być większy od zera")
  .nullable()
  .optional();

/**
 * Schema dla walidacji planned_rest_seconds
 */
export const workoutPlanPlannedRestSchema = z
  .number()
  .int("Czas odpoczynku musi być liczbą całkowitą")
  .nonnegative("Czas odpoczynku nie może być ujemny")
  .nullable()
  .optional();

/**
 * Schema dla walidacji planned_rest_after_series_seconds
 */
export const workoutPlanPlannedRestAfterSeriesSchema = z
  .number()
  .int("Czas odpoczynku po seriach musi być liczbą całkowitą")
  .nonnegative("Czas odpoczynku po seriach nie może być ujemny")
  .nullable()
  .optional();

/**
 * Schema dla walidacji estimated_set_time_seconds
 */
export const workoutPlanEstimatedSetTimeSchema = z
  .number()
  .int("Szacunkowy czas zestawu musi być liczbą całkowitą")
  .positive("Szacunkowy czas zestawu musi być większy od zera")
  .nullable()
  .optional();

/**
 * Schema dla walidacji exercise_id (UUID)
 * Może być string (UUID) lub null (dla snapshot)
 */
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const workoutPlanExerciseIdSchema = z
  .union([
    z
      .string()
      .refine(
        (val) => uuidRegex.test(val),
        "exercise_id musi być prawidłowym UUID",
      ),
    z.null(),
  ])
  .optional();

/**
 * Schema dla walidacji exercise_title (dla snapshot)
 */
export const workoutPlanExerciseTitleSchema = z
  .string()
  .trim()
  .min(1, "Nazwa ćwiczenia jest wymagana dla snapshot")
  .optional();

/**
 * Schema dla walidacji pojedynczego ćwiczenia w formularzu
 * Ćwiczenie musi mieć exercise_id LUB exercise_title (dla snapshot)
 */
export const workoutPlanExerciseItemFormSchema = z
  .object({
    id: z.string().optional(),
    exercise_id: workoutPlanExerciseIdSchema,
    exercise_title: workoutPlanExerciseTitleSchema,
    exercise_type: z.enum(exerciseTypeValues).optional(),
    exercise_part: z.enum(exercisePartValues).optional(),
    exercise_is_unilateral: z.boolean().optional(),
    section_type: workoutPlanSectionTypeSchema,
    section_order: workoutPlanSectionOrderSchema,
    planned_sets: workoutPlanPlannedSetsSchema,
    planned_reps: workoutPlanPlannedRepsSchema,
    planned_duration_seconds: workoutPlanPlannedDurationSchema,
    planned_rest_seconds: workoutPlanPlannedRestSchema,
    planned_rest_after_series_seconds: workoutPlanPlannedRestAfterSeriesSchema,
    estimated_set_time_seconds: workoutPlanEstimatedSetTimeSchema,
  })
  .refine(
    (data) => {
      // Musi mieć exercise_id LUB exercise_title
      const hasExerciseId =
        data.exercise_id &&
        typeof data.exercise_id === "string" &&
        data.exercise_id.trim() !== "";
      const hasExerciseTitle =
        data.exercise_title &&
        typeof data.exercise_title === "string" &&
        data.exercise_title.trim() !== "";
      return hasExerciseId || hasExerciseTitle;
    },
    {
      message:
        "Ćwiczenie musi mieć exercise_id lub exercise_title (dla snapshot)",
      path: ["exercise_id"],
    },
  )
  .refine(
    (data) => {
      // Jeśli exercise_id jest podane, musi być prawidłowym UUID
      if (
        data.exercise_id &&
        typeof data.exercise_id === "string" &&
        data.exercise_id.trim() !== ""
      ) {
        return uuidRegex.test(data.exercise_id);
      }
      return true;
    },
    {
      message: "exercise_id musi być prawidłowym UUID",
      path: ["exercise_id"],
    },
  );

/**
 * Schema dla walidacji całego formularza planu treningowego
 */
export const workoutPlanFormSchema = z
  .object({
    name: workoutPlanNameSchema,
    description: workoutPlanDescriptionSchema,
    part: workoutPlanPartSchema,
    exercises: z
      .array(workoutPlanExerciseItemFormSchema)
      .min(1, "Plan treningowy musi zawierać co najmniej jedno ćwiczenie"),
  })
  .strict()
  .superRefine((data, ctx) => {
    const errors = validateWorkoutPlanFormBusinessRules(
      data.exercises as WorkoutPlanExerciseItemState[],
    );

    errors.forEach((message) =>
      ctx.addIssue({
        code: "custom",
        message,
      }),
    );
  });

export type WorkoutPlanFormValues = z.infer<typeof workoutPlanFormSchema>;

/**
 * Konwertuje wartości formularza na WorkoutPlanCreateCommand.
 */
export function formValuesToCreateCommand(
  data: WorkoutPlanFormValues,
): WorkoutPlanCreateCommand {
  return {
    name: data.name.trim(),
    description: data.description?.trim() || null,
    part: data.part ?? null,
    exercises: data.exercises.map((ex) => ({
      exercise_id: ex.exercise_id ?? undefined,
      section_type: ex.section_type,
      section_order: ex.section_order,
      planned_sets: ex.planned_sets ?? undefined,
      planned_reps: ex.planned_reps ?? undefined,
      planned_duration_seconds: ex.planned_duration_seconds ?? undefined,
      planned_rest_seconds: ex.planned_rest_seconds ?? undefined,
      planned_rest_after_series_seconds:
        ex.planned_rest_after_series_seconds ?? undefined,
      estimated_set_time_seconds: ex.estimated_set_time_seconds ?? undefined,
    })),
  };
}

/**
 * Konwertuje wartości formularza na WorkoutPlanUpdateCommand.
 */
export function formValuesToUpdateCommand(
  data: WorkoutPlanFormValues,
): WorkoutPlanUpdateCommand {
  return {
    name: data.name.trim(),
    description: data.description?.trim() || null,
    part: data.part ?? null,
    exercises: data.exercises.map((ex) => {
      const base = {
        exercise_id: ex.exercise_id,
        section_type: ex.section_type,
        section_order: ex.section_order,
        planned_sets: ex.planned_sets ?? null,
        planned_reps: ex.planned_reps ?? null,
        planned_duration_seconds: ex.planned_duration_seconds ?? null,
        planned_rest_seconds: ex.planned_rest_seconds ?? null,
        planned_rest_after_series_seconds:
          ex.planned_rest_after_series_seconds ?? null,
        estimated_set_time_seconds: ex.estimated_set_time_seconds ?? null,
      };

      if (!ex.exercise_id) {
        return {
          ...base,
          exercise_title: ex.exercise_title ?? null,
          exercise_type: ex.exercise_type ?? null,
          exercise_part: ex.exercise_part ?? null,
          ...(ex.id && { id: ex.id }),
        };
      }
      return ex.id ? { ...base, id: ex.id } : base;
    }),
  };
}

function validateSectionOrderDuplicates(
  exercises: WorkoutPlanExerciseItemState[],
): string[] {
  const errors: string[] = [];
  const positionMap = new Map<string, Set<number>>();

  for (const exercise of exercises) {
    const sectionKey = exercise.section_type;
    const order = exercise.section_order;

    if (!positionMap.has(sectionKey)) {
      positionMap.set(sectionKey, new Set());
    }

    const orders = positionMap.get(sectionKey)!;
    if (orders.has(order)) {
      errors.push(
        `Duplikat kolejności ${order} w sekcji ${exercise.section_type}.`,
      );
    } else {
      orders.add(order);
    }
  }

  return errors;
}

function validateExercisePlannedParams(
  exercise: WorkoutPlanExerciseItemState,
): string[] {
  const errors: string[] = [];
  const { order, section } = {
    order: exercise.section_order,
    section: exercise.section_type,
  };
  const ctx = `dla ćwiczenia na kolejności ${order} w sekcji ${section}.`;

  const val = exercise.planned_sets;
  if (val !== undefined && val !== null && val <= 0) {
    errors.push(`planned_sets musi być większe od zera ${ctx}`);
  }

  const reps = exercise.planned_reps;
  if (reps !== undefined && reps !== null && reps <= 0) {
    errors.push(`planned_reps musi być większe od zera ${ctx}`);
  }

  const dur = exercise.planned_duration_seconds;
  if (dur !== undefined && dur !== null && dur <= 0) {
    errors.push(`planned_duration_seconds musi być większe od zera ${ctx}`);
  }

  const rest = exercise.planned_rest_seconds;
  if (rest !== undefined && rest !== null && rest < 0) {
    errors.push(`planned_rest_seconds nie może być ujemne ${ctx}`);
  }

  return errors;
}

/**
 * Walidacja reguł biznesowych dla formularza planu treningowego.
 * Sprawdza:
 * - Co najmniej jedno ćwiczenie (już sprawdzone w schema)
 * - Unikalność section_order w ramach każdej sekcji
 */
export function validateWorkoutPlanFormBusinessRules(
  exercises: WorkoutPlanExerciseItemState[],
): string[] {
  if (exercises.length === 0) {
    return ["Plan treningowy musi zawierać co najmniej jedno ćwiczenie."];
  }

  const errors = [...validateSectionOrderDuplicates(exercises)];

  for (const exercise of exercises) {
    errors.push(...validateExercisePlannedParams(exercise));
  }

  return errors;
}

/**
 * Walidacja pojedynczego pola formularza
 */
export function validateWorkoutPlanFormField(
  field: keyof WorkoutPlanFormState,
  value: unknown,
): string | undefined {
  try {
    switch (field) {
      case "name":
        workoutPlanNameSchema.parse(value);
        break;
      case "description":
        workoutPlanDescriptionSchema.parse(value);
        break;
      case "part":
        workoutPlanPartSchema.parse(value);
        break;
      case "exercises":
        // Walidacja ćwiczeń jest bardziej złożona, użyj pełnego schematu
        if (Array.isArray(value)) {
          z.array(workoutPlanExerciseItemFormSchema).parse(value);
        }
        break;
    }
    return undefined;
  } catch (error) {
    if (
      error instanceof z.ZodError &&
      error.issues &&
      error.issues.length > 0
    ) {
      return error.issues[0].message;
    }
    return undefined;
  }
}

/**
 * Walidacja pojedynczego parametru planned_* lub estimated_set_time_seconds
 */
export function validatePlannedParam(
  field:
    | "planned_sets"
    | "planned_reps"
    | "planned_duration_seconds"
    | "planned_rest_seconds"
    | "planned_rest_after_series_seconds"
    | "estimated_set_time_seconds",
  value: number | null,
): string | undefined {
  try {
    switch (field) {
      case "planned_sets":
        workoutPlanPlannedSetsSchema.parse(value);
        break;
      case "planned_reps":
        workoutPlanPlannedRepsSchema.parse(value);
        break;
      case "planned_duration_seconds":
        workoutPlanPlannedDurationSchema.parse(value);
        break;
      case "planned_rest_seconds":
        workoutPlanPlannedRestSchema.parse(value);
        break;
      case "planned_rest_after_series_seconds":
        workoutPlanPlannedRestAfterSeriesSchema.parse(value);
        break;
      case "estimated_set_time_seconds":
        workoutPlanEstimatedSetTimeSchema.parse(value);
        break;
    }
    return undefined;
  } catch (error) {
    if (
      error instanceof z.ZodError &&
      error.issues &&
      error.issues.length > 0
    ) {
      return error.issues[0]?.message;
    }
    return undefined;
  }
}
