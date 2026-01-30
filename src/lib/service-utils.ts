import { ZodError } from "zod";
import type { PostgrestError } from "@supabase/supabase-js";

export type ServiceErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "FORBIDDEN"
  | "INTERNAL";

export class ServiceError extends Error {
  code: ServiceErrorCode;
  details?: string;

  constructor(code: ServiceErrorCode, message: string, details?: string) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseOrThrow<T>(
  schema: { parse: (payload: unknown) => T },
  payload: unknown,
): T {
  try {
    return schema.parse(payload);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ServiceError(
        "BAD_REQUEST",
        error.issues.map((issue) => issue.message).join("; "),
      );
    }

    throw error;
  }
}

type DbErrorOverride = { code: ServiceErrorCode; message: string };
type MapDbErrorOverrides = Partial<Record<string, DbErrorOverride>>;

const DEFAULT_DB_ERROR_MAP: Record<string, DbErrorOverride> = {
  "23505": {
    code: "CONFLICT",
    message:
      "Konflikt unikalności (np. próba utworzenia drugiej sesji in_progress).",
  },
  "23503": {
    code: "NOT_FOUND",
    message: "Operacja narusza istniejące powiązania (np. plan nie istnieje).",
  },
  "23502": {
    code: "BAD_REQUEST",
    message: "Brak wymaganych pól.",
  },
  PGRST116: {
    code: "NOT_FOUND",
    message: "Zasób nie został znaleziony.",
  },
};

/**
 * Mapuje błędy Postgrest/Supabase na ServiceError.
 * Opcjonalne overrides pozwalają dostosować komunikaty dla konkretnych serwisów.
 */
export function mapDbError(
  error: PostgrestError,
  overrides?: MapDbErrorOverrides,
): ServiceError {
  const map = { ...DEFAULT_DB_ERROR_MAP, ...overrides };
  const override = map[error.code];

  if (override) {
    return new ServiceError(override.code, override.message, error.message);
  }

  if (error.code === "BAD_REQUEST") {
    return new ServiceError("BAD_REQUEST", error.message, error.details ?? "");
  }

  return new ServiceError("INTERNAL", "Wystąpił błąd serwera.", error.message);
}

export function assertUser(userId: string): void {
  if (!userId) {
    throw new ServiceError("UNAUTHORIZED", "Brak aktywnej sesji.");
  }
}

/**
 * Waliduje UUID. Rzuca ServiceError jeśli nieprawidłowy.
 */
export function validateUuid(id: string, fieldName = "id"): void {
  if (!UUID_REGEX.test(id)) {
    throw new ServiceError(
      "BAD_REQUEST",
      `${fieldName} musi być prawidłowym UUID`,
    );
  }
}
