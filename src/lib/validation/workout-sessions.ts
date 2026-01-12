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
