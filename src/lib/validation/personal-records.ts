import { z } from "zod";

import type { PersonalRecordQueryParams, PRMetricType } from "@/types";

export const PERSONAL_RECORD_MAX_LIMIT = 100;
export const PERSONAL_RECORD_DEFAULT_LIMIT = 20;

export const prMetricTypeValues = [
  "total_reps",
  "max_duration",
  "max_weight",
] as const satisfies PRMetricType[];

export const personalRecordSortFields = [
  "achieved_at",
  "value",
] as const satisfies NonNullable<PersonalRecordQueryParams["sort"]>[];

export const personalRecordOrderValues = ["asc", "desc"] as const;

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Schema dla parametrów zapytania listy rekordów osobistych (GET /api/personal-records).
 */
export const personalRecordQuerySchema = z
  .object({
    exercise_id: z
      .string()
      .refine(
        (val) => uuidRegex.test(val),
        "exercise_id musi być prawidłowym UUID"
      )
      .optional(),
    metric_type: z.enum(prMetricTypeValues).optional(),
    sort: z.enum(personalRecordSortFields).default("achieved_at"),
    order: z.enum(personalRecordOrderValues).default("desc"),
    limit: z
      .number()
      .int()
      .positive()
      .max(PERSONAL_RECORD_MAX_LIMIT)
      .default(PERSONAL_RECORD_DEFAULT_LIMIT),
    cursor: z.string().optional().nullable(),
  })
  .strict();

type CursorPayload = {
  sort: (typeof personalRecordSortFields)[number];
  order: (typeof personalRecordOrderValues)[number];
  value: string | number;
  id: string;
};

/**
 * Enkoduje kursor paginacji do base64url string.
 */
export function encodeCursor(cursor: CursorPayload): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

/**
 * Dekoduje kursor paginacji z base64url string.
 */
export function decodeCursor(cursor: string): CursorPayload {
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
      !personalRecordSortFields.includes(
        parsed.sort as unknown as (typeof personalRecordSortFields)[number]
      )
    ) {
      throw new Error("Unsupported sort field");
    }

    if (
      !personalRecordOrderValues.includes(
        parsed.order as unknown as (typeof personalRecordOrderValues)[number]
      )
    ) {
      throw new Error("Unsupported order value");
    }

    if (!parsed.id || parsed.value === undefined || parsed.value === null) {
      throw new Error("Cursor missing fields");
    }

    return {
      sort: parsed.sort as (typeof personalRecordSortFields)[number],
      order: parsed.order as (typeof personalRecordOrderValues)[number],
      value: parsed.value,
      id: parsed.id,
    };
  } catch (error) {
    throw new Error("INVALID_CURSOR", { cause: error });
  }
}
