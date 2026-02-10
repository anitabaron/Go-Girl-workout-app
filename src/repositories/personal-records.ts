import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/database.types";
import type {
  PersonalRecordQueryParams,
  PersonalRecordWithExerciseDTO,
} from "@/types";
import {
  PERSONAL_RECORD_DEFAULT_LIMIT,
  PERSONAL_RECORD_MAX_LIMIT,
  decodeCursor,
  encodeCursor,
  personalRecordOrderValues,
  personalRecordSortFields,
} from "@/lib/validation/personal-records";

type DbClient = SupabaseClient<Database>;
type PersonalRecordRow =
  Database["public"]["Tables"]["personal_records"]["Row"];
type ExerciseRow = Database["public"]["Tables"]["exercises"]["Row"];
type SortField = (typeof personalRecordSortFields)[number];
type SortOrder = (typeof personalRecordOrderValues)[number];

type CursorPayload = {
  sort: SortField;
  order: SortOrder;
  value: string | number;
  id: string;
};

/**
 * Typ dla odpowiedzi Supabase z JOIN do exercises.
 */
type PersonalRecordWithExerciseRow = PersonalRecordRow & {
  exercises: ExerciseRow;
};

/**
 * Pobiera listę rekordów osobistych użytkownika z filtrami, sortowaniem i paginacją.
 */
export async function listPersonalRecords(
  client: DbClient,
  userId: string,
  params: Required<
    Pick<PersonalRecordQueryParams, "sort" | "order" | "limit">
  > &
    PersonalRecordQueryParams,
): Promise<{
  data?: PersonalRecordWithExerciseDTO[];
  nextCursor?: string | null;
  error?: PostgrestError | null;
}> {
  const limit = Math.min(
    params.limit ?? PERSONAL_RECORD_DEFAULT_LIMIT,
    PERSONAL_RECORD_MAX_LIMIT,
  );
  const sort = params.sort ?? "achieved_at";
  const order = params.order ?? "desc";

  let query = client
    .from("personal_records")
    .select(
      `
      id,
      exercise_id,
      metric_type,
      value,
      series_values,
      achieved_at,
      achieved_in_session_id,
      achieved_in_set_number,
      created_at,
      updated_at,
      user_id,
      exercises!inner (
        id,
        title,
        types,
        parts,
        is_save_to_pr
      )
    `,
    )
    .eq("user_id", userId)
    .eq("exercises.is_save_to_pr", true);

  if (params.exercise_id) {
    query = query.eq("exercise_id", params.exercise_id);
  }

  if (params.metric_type) {
    query = query.eq("metric_type", params.metric_type);
  }

  if (params.cursor) {
    const cursor = decodeCursor(params.cursor);

    if (cursor.sort !== sort || cursor.order !== order) {
      return {
        error: {
          message: "Cursor nie pasuje do aktualnych parametrów sortowania.",
          details: "sort/order mismatch",
          code: "BAD_REQUEST",
          hint: "Użyj kursora z tymi samymi parametrami sort/order.",
        } as unknown as PostgrestError,
      };
    }

    query = applyCursorFilter(query, sort, order, cursor);
  }

  query = query
    .order(sort, { ascending: order === "asc" })
    .order("id", { ascending: order === "asc" })
    .limit(limit + 1);

  const { data, error } = await query;

  if (error) {
    return { error };
  }

  const items = (data ?? []) as PersonalRecordWithExerciseRow[];
  let nextCursor: string | null = null;

  if (items.length > limit) {
    const tail = items.pop()!;

    nextCursor = encodeCursor({
      sort,
      order,
      value: tail[sort as keyof PersonalRecordRow] as string | number,
      id: tail.id,
    });
  }

  return {
    data: items.map(mapToDTO),
    nextCursor,
    error: null,
  };
}

/**
 * Pobiera wszystkie rekordy osobiste dla konkretnego ćwiczenia (wszystkie typy metryk).
 */
export async function listPersonalRecordsByExercise(
  client: DbClient,
  userId: string,
  exerciseId: string,
): Promise<{
  data?: PersonalRecordWithExerciseDTO[];
  error?: PostgrestError | null;
}> {
  const { data, error } = await client
    .from("personal_records")
    .select(
      `
      id,
      exercise_id,
      metric_type,
      value,
      series_values,
      achieved_at,
      achieved_in_session_id,
      achieved_in_set_number,
      created_at,
      updated_at,
      user_id,
      exercises!inner (
        id,
        title,
        types,
        parts,
        is_save_to_pr
      )
    `,
    )
    .eq("user_id", userId)
    .eq("exercise_id", exerciseId)
    .eq("exercises.is_save_to_pr", true)
    .order("metric_type", { ascending: true });

  if (error) {
    return { error };
  }

  const items = (data ?? []) as PersonalRecordWithExerciseRow[];

  return {
    data: items.map(mapToDTO),
    error: null,
  };
}

/**
 * Aktualizuje pojedynczy rekord osobisty.
 * Przy edycji rekord jest odłączany od sesji (achieved_in_session_id i achieved_in_set_number = null).
 */
export async function updatePersonalRecord(
  client: DbClient,
  userId: string,
  recordId: string,
  updates: {
    value: number;
    series_values?: Record<string, number> | null;
    achieved_at: string;
  },
): Promise<{
  data?: PersonalRecordWithExerciseDTO;
  error?: PostgrestError | null;
}> {
  const { data: existing, error: fetchError } = await client
    .from("personal_records")
    .select("id")
    .eq("id", recordId)
    .eq("user_id", userId)
    .single();

  if (fetchError || !existing) {
    return {
      error: fetchError ?? ({ message: "Not found" } as PostgrestError),
    };
  }

  const updatePayload: Record<string, unknown> = {
    value: updates.value,
    achieved_at: updates.achieved_at,
    updated_at: new Date().toISOString(),
    achieved_in_session_id: null,
    achieved_in_set_number: null,
  };
  if (updates.series_values !== undefined) {
    updatePayload.series_values = updates.series_values;
  }

  const { data, error } = await client
    .from("personal_records")
    .update(updatePayload)
    .eq("id", recordId)
    .eq("user_id", userId)
    .select(
      `
      id,
      exercise_id,
      metric_type,
      value,
      series_values,
      achieved_at,
      achieved_in_session_id,
      achieved_in_set_number,
      created_at,
      updated_at,
      user_id,
      exercises!inner (
        id,
        title,
        types,
        parts,
        is_save_to_pr
      )
    `,
    )
    .single();

  if (error) {
    return { error };
  }

  return {
    data: mapToDTO(data as PersonalRecordWithExerciseRow),
    error: null,
  };
}

/**
 * Usuwa wszystkie rekordy osobiste dla konkretnego ćwiczenia.
 */
export async function deletePersonalRecordsByExercise(
  client: DbClient,
  userId: string,
  exerciseId: string,
): Promise<{
  error?: PostgrestError | null;
}> {
  const { error } = await client
    .from("personal_records")
    .delete()
    .eq("user_id", userId)
    .eq("exercise_id", exerciseId);

  return { error };
}

/**
 * Mapuje wiersz z bazy danych (z JOIN do exercises) na PersonalRecordWithExerciseDTO.
 */
export function mapToDTO(
  row: PersonalRecordWithExerciseRow,
): PersonalRecordWithExerciseDTO {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user_id, exercises, ...rest } = row;

  return {
    ...rest,
    exercise: {
      id: exercises.id,
      title: exercises.title,
      type: exercises.types?.[0] ?? ("Main Workout" as const),
      part: exercises.parts?.[0] ?? ("Legs" as const),
      is_save_to_pr: exercises.is_save_to_pr ?? undefined,
    },
  };
}

/**
 * Zastosowuje filtr kursora do zapytania.
 */
function applyCursorFilter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  sort: SortField,
  order: SortOrder,
  cursor: CursorPayload,
) {
  const direction = order === "asc" ? "gt" : "lt";
  const encodedValue = encodeURIComponent(String(cursor.value));
  const encodedId = encodeURIComponent(cursor.id);

  return query.or(
    `${sort}.${direction}.${encodedValue},and(${sort}.eq.${encodedValue},id.${direction}.${encodedId})`,
  );
}
