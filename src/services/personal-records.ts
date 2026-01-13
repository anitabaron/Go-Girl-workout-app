import { ZodError } from "zod";

import { createClient } from "@/db/supabase.server";
import type { PostgrestError } from "@supabase/supabase-js";
import type {
  PersonalRecordQueryParams,
  PersonalRecordWithExerciseDTO,
} from "@/types";
import { personalRecordQuerySchema } from "@/lib/validation/personal-records";
import { findById } from "@/repositories/exercises";
import {
  listPersonalRecords,
  listPersonalRecordsByExercise,
} from "@/repositories/personal-records";

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

/**
 * Pobiera listę rekordów osobistych użytkownika z filtrami, sortowaniem i paginacją.
 */
export async function listPersonalRecordsService(
  userId: string,
  query: PersonalRecordQueryParams
): Promise<{
  items: PersonalRecordWithExerciseDTO[];
  nextCursor: string | null;
}> {
  assertUser(userId);
  const parsed = parseOrThrow(personalRecordQuerySchema, query);

  const supabase = await createClient();

  try {
    const { data, nextCursor, error } = await listPersonalRecords(
      supabase,
      userId,
      parsed
    );

    if (error) {
      throw mapDbError(error);
    }

    return {
      items: data ?? [],
      nextCursor: nextCursor ?? null,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_CURSOR") {
      throw new ServiceError("BAD_REQUEST", "Nieprawidłowy kursor paginacji.");
    }

    throw error;
  }
}

/**
 * Pobiera wszystkie rekordy osobiste dla konkretnego ćwiczenia (wszystkie typy metryk).
 * Weryfikuje, że ćwiczenie należy do użytkownika przed zwróceniem rekordów.
 */
export async function getPersonalRecordsByExerciseService(
  userId: string,
  exerciseId: string
): Promise<{
  items: PersonalRecordWithExerciseDTO[];
}> {
  assertUser(userId);

  // Walidacja UUID
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(exerciseId)) {
    throw new ServiceError(
      "BAD_REQUEST",
      "Nieprawidłowy format UUID ćwiczenia."
    );
  }

  const supabase = await createClient();

  // Weryfikacja własności ćwiczenia
  const { data: exercise, error: exerciseError } = await findById(
    supabase,
    userId,
    exerciseId
  );

  if (exerciseError) {
    throw mapDbError(exerciseError);
  }

  if (!exercise) {
    throw new ServiceError("NOT_FOUND", "Ćwiczenie nie zostało znalezione.");
  }

  // Pobranie rekordów dla ćwiczenia
  const { data, error } = await listPersonalRecordsByExercise(
    supabase,
    userId,
    exerciseId
  );

  if (error) {
    throw mapDbError(error);
  }

  return {
    items: data ?? [],
  };
}

function parseOrThrow<T>(
  schema: { parse: (payload: unknown) => T },
  payload: unknown
): T {
  try {
    return schema.parse(payload);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ServiceError(
        "BAD_REQUEST",
        error.issues.map((issue) => issue.message).join("; ")
      );
    }

    throw error;
  }
}

function mapDbError(error: PostgrestError) {
  if (error.code === "23505") {
    return new ServiceError(
      "CONFLICT",
      "Operacja narusza istniejące powiązania.",
      error.message
    );
  }

  if (error.code === "23503") {
    return new ServiceError(
      "CONFLICT",
      "Operacja narusza istniejące powiązania.",
      error.message
    );
  }

  if (error.code === "BAD_REQUEST") {
    return new ServiceError("BAD_REQUEST", error.message, error.details ?? "");
  }

  if (error.code === "PGRST116") {
    return new ServiceError("NOT_FOUND", "Zasób nie został znaleziony.");
  }

  return new ServiceError("INTERNAL", "Wystąpił błąd serwera.", error.message);
}

function assertUser(userId: string) {
  if (!userId) {
    throw new ServiceError("UNAUTHORIZED", "Brak aktywnej sesji.");
  }
}
