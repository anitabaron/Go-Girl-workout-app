import { z } from "zod";

import type { SessionListQueryParams } from "@/types";

export const SESSION_MAX_LIMIT = 100;
export const SESSION_DEFAULT_LIMIT = 20;

export const sessionStatusValues = ["in_progress", "completed"] as const;

export const sessionSortFields = [
  "started_at",
  "completed_at",
  "status",
] as const satisfies NonNullable<SessionListQueryParams["sort"]>[];

export const sessionOrderValues = ["asc", "desc"] as const;

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Schema dla rozpoczęcia sesji treningowej (POST /api/workout-sessions).
 */
export const sessionStartSchema = z
  .object({
    workout_plan_id: z
      .string()
      .refine(
        (val) => uuidRegex.test(val),
        "workout_plan_id musi być prawidłowym UUID"
      ),
  })
  .strict();

/**
 * Schema dla parametrów zapytania listy sesji treningowych (GET /api/workout-sessions).
 */
export const sessionListQuerySchema = z
  .object({
    status: z.enum(sessionStatusValues).optional(),
    plan_id: z
      .string()
      .refine(
        (val) => uuidRegex.test(val),
        "plan_id musi być prawidłowym UUID"
      )
      .optional(),
    from: z
      .string()
      .refine(
        (val) => !Number.isNaN(Date.parse(val)),
        "from musi być prawidłową datą ISO 8601"
      )
      .optional(),
    to: z
      .string()
      .refine(
        (val) => !Number.isNaN(Date.parse(val)),
        "to musi być prawidłową datą ISO 8601"
      )
      .optional(),
    sort: z.enum(sessionSortFields).default("started_at"),
    order: z.enum(sessionOrderValues).default("desc"),
    limit: z
      .number()
      .int()
      .positive()
      .max(SESSION_MAX_LIMIT)
      .default(SESSION_DEFAULT_LIMIT),
    cursor: z.string().optional().nullable(),
  })
  .strict();

/**
 * Schema dla aktualizacji statusu sesji (PATCH /api/workout-sessions/{id}/status).
 */
export const sessionStatusUpdateSchema = z
  .object({
    status: z.enum(sessionStatusValues),
  })
  .strict();

/**
 * Schema dla pojedynczej serii ćwiczenia w autosave.
 */
const sessionExerciseSetSchema = z
  .object({
    set_number: z.number().int().positive("set_number musi być liczbą całkowitą większą od 0"),
    reps: z.number().int().nonnegative("reps musi być >= 0").nullable().optional(),
    duration_seconds: z
      .number()
      .int()
      .nonnegative("duration_seconds musi być >= 0")
      .nullable()
      .optional(),
    weight_kg: z
      .number()
      .nonnegative("weight_kg musi być >= 0")
      .nullable()
      .optional(),
  })
  .refine(
    (data) =>
      data.reps !== null ||
      data.duration_seconds !== null ||
      data.weight_kg !== null,
    {
      message:
        "Każda seria musi mieć co najmniej jedną metrykę (reps, duration_seconds, lub weight_kg)",
    }
  );

/**
 * Schema dla autosave ćwiczenia w sesji treningowej (PATCH /api/workout-sessions/{id}/exercises/{order}).
 */
export const sessionExerciseAutosaveSchema = z
  .object({
    // Parametry faktyczne (opcjonalne)
    // actual_count_sets - liczba wykonanych serii (można pominąć, zostanie obliczona z sets.length)
    actual_count_sets: z
      .number()
      .int()
      .nonnegative("actual_count_sets musi być >= 0")
      .nullable()
      .optional(),
    // actual_sum_reps - suma reps ze wszystkich serii (można pominąć, zostanie obliczona automatycznie)
    actual_sum_reps: z
      .number()
      .int()
      .nonnegative("actual_sum_reps musi być >= 0")
      .nullable()
      .optional(),
    actual_duration_seconds: z
      .number()
      .int()
      .nonnegative("actual_duration_seconds musi być >= 0")
      .nullable()
      .optional(),

    // Parametry planowane (opcjonalne)
    planned_sets: z
      .number()
      .int()
      .positive("planned_sets musi być > 0")
      .nullable()
      .optional(),
    planned_reps: z
      .number()
      .int()
      .positive("planned_reps musi być > 0")
      .nullable()
      .optional(),
    planned_duration_seconds: z
      .number()
      .int()
      .positive("planned_duration_seconds musi być > 0")
      .nullable()
      .optional(),
    planned_rest_seconds: z
      .number()
      .int()
      .nonnegative("planned_rest_seconds musi być >= 0")
      .nullable()
      .optional(),

    // Flaga pominięcia (opcjonalne)
    is_skipped: z.boolean().optional(),

    // Serie ćwiczenia (opcjonalne, zastępuje wszystkie istniejące serie)
    sets: z.array(sessionExerciseSetSchema).optional(),

    // Flaga przesunięcia kursora do następnego ćwiczenia (opcjonalne)
    advance_cursor_to_next: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) => {
      // Jeśli is_skipped = true, dozwolone są puste serie
      if (data.is_skipped === true) {
        return true;
      }
      // Jeśli is_skipped = false lub nie podano, a podano serie, każda musi mieć metryki
      if (data.sets && data.sets.length > 0) {
        return data.sets.every(
          (set) =>
            set.reps !== null ||
            set.duration_seconds !== null ||
            set.weight_kg !== null
        );
      }
      return true;
    },
    {
      message:
        "Jeśli is_skipped = false, każda seria musi mieć co najmniej jedną metrykę",
    }
  )
  .refine(
    (data) => {
      // Sprawdź unikalność set_number w tablicy sets
      if (data.sets && data.sets.length > 0) {
        const setNumbers = data.sets.map((set) => set.set_number);
        const uniqueSetNumbers = new Set(setNumbers);
        return uniqueSetNumbers.size === setNumbers.length;
      }
      return true;
    },
    {
      message: "set_number musi być unikalne w tablicy sets",
    }
  );

/**
 * Enkoduje kursor paginacji do base64url string.
 */
export function encodeCursor(cursor: {
  sort: (typeof sessionSortFields)[number];
  order: (typeof sessionOrderValues)[number];
  value: string | number;
  id: string;
}): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

/**
 * Dekoduje kursor paginacji z base64url string.
 */
export function decodeCursor(cursor: string): {
  sort: (typeof sessionSortFields)[number];
  order: (typeof sessionOrderValues)[number];
  value: string | number;
  id: string;
} {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8")
    ) as {
      sort: string;
      order: string;
      value: string | number;
      id: string;
    };

    if (
      !sessionSortFields.includes(
        parsed.sort as unknown as (typeof sessionSortFields)[number]
      )
    ) {
      throw new Error("Unsupported sort field");
    }

    if (
      !sessionOrderValues.includes(
        parsed.order as unknown as (typeof sessionOrderValues)[number]
      )
    ) {
      throw new Error("Unsupported order value");
    }

    if (!parsed.id || parsed.value === undefined || parsed.value === null) {
      throw new Error("Cursor missing fields");
    }

    return {
      sort: parsed.sort as (typeof sessionSortFields)[number],
      order: parsed.order as (typeof sessionOrderValues)[number],
      value: parsed.value,
      id: parsed.id,
    };
  } catch (error) {
    throw new Error("INVALID_CURSOR", { cause: error });
  }
}
