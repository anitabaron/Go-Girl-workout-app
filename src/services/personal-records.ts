import { createClient } from "@/db/supabase.server";
import type {
  PersonalRecordQueryParams,
  PersonalRecordWithExerciseDTO,
} from "@/types";
import { personalRecordQuerySchema } from "@/lib/validation/personal-records";
import {
  assertUser,
  mapDbError as mapDbErrorBase,
  parseOrThrow,
  ServiceError,
  validateUuid,
} from "@/lib/service-utils";
import { findById } from "@/repositories/exercises";
import {
  deletePersonalRecordsByExercise,
  listPersonalRecords,
  listPersonalRecordsByExercise,
  updatePersonalRecord,
} from "@/repositories/personal-records";

export { ServiceError } from "@/lib/service-utils";

const MAP_DB_ERROR_OVERRIDES = {
  "23505": {
    code: "CONFLICT" as const,
    message: "Operacja narusza istniejące powiązania.",
  },
  "23503": {
    code: "CONFLICT" as const,
    message: "Operacja narusza istniejące powiązania.",
  },
};

function mapDbError(error: Parameters<typeof mapDbErrorBase>[0]) {
  return mapDbErrorBase(error, MAP_DB_ERROR_OVERRIDES);
}

/**
 * Pobiera listę rekordów osobistych użytkownika z filtrami, sortowaniem i paginacją.
 */
export async function listPersonalRecordsService(
  userId: string,
  query: PersonalRecordQueryParams,
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
      parsed,
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
  exerciseId: string,
): Promise<{
  items: PersonalRecordWithExerciseDTO[];
}> {
  assertUser(userId);
  validateUuid(exerciseId, "id ćwiczenia");

  const supabase = await createClient();
  const { data: exercise, error: exerciseError } = await findById(
    supabase,
    userId,
    exerciseId,
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
    exerciseId,
  );

  if (error) {
    throw mapDbError(error);
  }

  return {
    items: data ?? [],
  };
}

/**
 * Usuwa wszystkie rekordy osobiste dla konkretnego ćwiczenia.
 * Weryfikuje, że ćwiczenie należy do użytkownika przed usunięciem rekordów.
 */
export async function deletePersonalRecordsByExerciseService(
  userId: string,
  exerciseId: string,
): Promise<void> {
  assertUser(userId);
  validateUuid(exerciseId, "id ćwiczenia");

  const supabase = await createClient();
  const { data: exercise, error: exerciseError } = await findById(
    supabase,
    userId,
    exerciseId,
  );

  if (exerciseError) {
    throw mapDbError(exerciseError);
  }

  if (!exercise) {
    throw new ServiceError("NOT_FOUND", "Ćwiczenie nie zostało znalezione.");
  }

  // Usunięcie rekordów dla ćwiczenia
  const { error } = await deletePersonalRecordsByExercise(
    supabase,
    userId,
    exerciseId,
  );

  if (error) {
    throw mapDbError(error);
  }
}

/**
 * Aktualizuje pojedynczy rekord osobisty.
 * Dozwolone tylko dla rekordów bez przypisanej sesji (achieved_in_session_id === null).
 */
export async function updatePersonalRecordService(
  userId: string,
  recordId: string,
  updates: {
    value: number;
    series_values?: Record<string, number> | null;
    achieved_at: string;
  },
): Promise<PersonalRecordWithExerciseDTO> {
  assertUser(userId);
  validateUuid(recordId, "id rekordu");

  const supabase = await createClient();
  const { data, error } = await updatePersonalRecord(
    supabase,
    userId,
    recordId,
    updates,
  );

  if (error) {
    if ((error as { code?: string }).code === "FORBIDDEN") {
      throw new ServiceError(
        "FORBIDDEN",
        "Nie można edytować rekordu przypisanego do sesji treningowej. Przejdź do edycji szczegółów sesji.",
      );
    }
    throw mapDbError(error);
  }

  if (!data) {
    throw new ServiceError("NOT_FOUND", "Rekord nie został znaleziony.");
  }

  return data;
}
