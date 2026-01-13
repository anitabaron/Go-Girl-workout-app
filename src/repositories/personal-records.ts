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
    PersonalRecordQueryParams
): Promise<{
  data?: PersonalRecordWithExerciseDTO[];
  nextCursor?: string | null;
  error?: PostgrestError | null;
}> {
  const limit = Math.min(
    params.limit ?? PERSONAL_RECORD_DEFAULT_LIMIT,
    PERSONAL_RECORD_MAX_LIMIT
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
      achieved_at,
      achieved_in_session_id,
      achieved_in_set_number,
      created_at,
      updated_at,
      exercises!inner (
        id,
        title,
        type,
        part
      )
    `
    )
    .eq("user_id", userId);

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
  exerciseId: string
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
      achieved_at,
      achieved_in_session_id,
      achieved_in_set_number,
      created_at,
      updated_at,
      exercises!inner (
        id,
        title,
        type,
        part
      )
    `
    )
    .eq("user_id", userId)
    .eq("exercise_id", exerciseId)
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
 * Mapuje wiersz z bazy danych (z JOIN do exercises) na PersonalRecordWithExerciseDTO.
 */
export function mapToDTO(
  row: PersonalRecordWithExerciseRow
): PersonalRecordWithExerciseDTO {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user_id, exercises, ...rest } = row;

  return {
    ...rest,
    exercise: {
      id: exercises.id,
      title: exercises.title,
      type: exercises.type,
      part: exercises.part,
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
  cursor: CursorPayload
) {
  const direction = order === "asc" ? "gt" : "lt";
  const encodedValue = encodeURIComponent(String(cursor.value));
  const encodedId = encodeURIComponent(cursor.id);

  return query.or(
    `${sort}.${direction}.${encodedValue},and(${sort}.eq.${encodedValue},id.${direction}.${encodedId})`
  );
}
