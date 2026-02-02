import { z } from "zod";

import type { PersonalRecordQueryParams, PRMetricType } from "@/types";
import {
  decodeCursor as decodeCursorBase,
  encodeCursor as encodeCursorBase,
  type CursorPayload as BaseCursorPayload,
} from "@/lib/cursor-utils";

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
        "exercise_id musi być prawidłowym UUID",
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

export type CursorPayload = {
  sort: (typeof personalRecordSortFields)[number];
  order: (typeof personalRecordOrderValues)[number];
  value: string | number;
  id: string;
};

/**
 * Enkoduje kursor paginacji do base64url string.
 */
export function encodeCursor(cursor: CursorPayload): string {
  return encodeCursorBase(cursor as BaseCursorPayload);
}

/**
 * Dekoduje kursor paginacji z base64url string.
 */
export function decodeCursor(cursor: string): CursorPayload {
  const parsed = decodeCursorBase(cursor, {
    sortFields: personalRecordSortFields,
    orderValues: personalRecordOrderValues,
  });
  return parsed as CursorPayload;
}

/**
 * Schema dla aktualizacji pojedynczego rekordu osobistego (PATCH /api/personal-records/record/[id]).
 */
export const personalRecordUpdateSchema = z
  .object({
    value: z.number().finite().min(0),
    series_values: z.record(z.string(), z.number().finite()).nullable().optional(),
    achieved_at: z.string().datetime(),
  })
  .strict();
