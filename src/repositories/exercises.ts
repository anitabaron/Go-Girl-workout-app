import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/database.types";
import type {
  ExerciseCreateCommand,
  ExerciseDTO,
  ExerciseQueryParams,
  ExerciseUpdateCommand,
} from "@/types";
import {
  EXERCISE_DEFAULT_LIMIT,
  EXERCISE_MAX_LIMIT,
  exerciseOrderValues,
  exerciseSortFields,
  normalizeTitle,
} from "@/lib/validation/exercises";

type DbClient = SupabaseClient<Database>;
type ExerciseRow = Database["public"]["Tables"]["exercises"]["Row"];
type SortField = (typeof exerciseSortFields)[number];
type SortOrder = (typeof exerciseOrderValues)[number];

const exerciseSelectColumns =
  "id,title,type,part,level,details,reps,duration_seconds,series,rest_in_between_seconds,rest_after_series_seconds,estimated_set_time_seconds,created_at,updated_at,title_normalized,user_id";

type CursorPayload = {
  sort: SortField;
  order: SortOrder;
  value: string | number;
  id: string;
};

export async function findById(client: DbClient, userId: string, id: string) {
  const { data, error } = await client
    .from("exercises")
    .select(`${exerciseSelectColumns},title_normalized,user_id`)
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  return { data, error };
}

export async function findByNormalizedTitle(
  client: DbClient,
  userId: string,
  titleNormalized: string,
  excludeId?: string
) {
  let query = client
    .from("exercises")
    .select("id")
    .eq("user_id", userId)
    .eq("title_normalized", titleNormalized);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query.limit(1).maybeSingle();

  return { data, error };
}

export async function findExerciseByNormalizedTitle(
  client: DbClient,
  userId: string,
  titleNormalized: string
) {
  const { data, error } = await client
    .from("exercises")
    .select(exerciseSelectColumns)
    .eq("user_id", userId)
    .eq("title_normalized", titleNormalized)
    .limit(1)
    .maybeSingle();

  return { data: data ? mapToDTO(data) : null, error };
}

export async function insertExercise(
  client: DbClient,
  userId: string,
  input: ExerciseCreateCommand
) {
  const { data, error } = await client
    .from("exercises")
    .insert({
      ...input,
      user_id: userId,
    })
    .select(exerciseSelectColumns)
    .single();

  return { data: data ? mapToDTO(data) : null, error };
}

export async function updateExercise(
  client: DbClient,
  userId: string,
  id: string,
  input: ExerciseUpdateCommand
) {
  const { data, error } = await client
    .from("exercises")
    .update({
      ...input,
      user_id: userId,
    })
    .eq("user_id", userId)
    .eq("id", id)
    .select(exerciseSelectColumns)
    .single();

  return { data: data ? mapToDTO(data) : null, error };
}

export async function deleteExercise(
  client: DbClient,
  userId: string,
  id: string
) {
  const { error } = await client
    .from("exercises")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);

  return { error };
}

export async function listExercises(
  client: DbClient,
  userId: string,
  params: Required<Pick<ExerciseQueryParams, "sort" | "order" | "limit">> &
    ExerciseQueryParams
): Promise<{
  data?: ExerciseDTO[];
  nextCursor?: string | null;
  error?: PostgrestError | null;
}> {
  const limit = Math.min(
    params.limit ?? EXERCISE_DEFAULT_LIMIT,
    EXERCISE_MAX_LIMIT
  );
  const sort = params.sort ?? "created_at";
  const order = params.order ?? "desc";

  let query = client
    .from("exercises")
    .select(exerciseSelectColumns)
    .eq("user_id", userId);

  if (params.part) {
    query = query.eq("part", params.part);
  }

  if (params.type) {
    query = query.eq("type", params.type);
  }

  if (params.search) {
    const normalizedSearch = normalizeTitle(params.search);
    query = query.ilike("title_normalized", `%${normalizedSearch}%`);
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

  const items = data ?? [];
  let nextCursor: string | null = null;

  if (items.length > limit) {
    const tail = items.pop()!;

    nextCursor = encodeCursor({
      sort,
      order,
      value: tail[sort as keyof ExerciseRow] as string | number,
      id: tail.id,
    });
  }

  return {
    data: items.map(mapToDTO),
    nextCursor,
    error: null,
  };
}

export function encodeCursor(cursor: CursorPayload) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeCursor(cursor: string): CursorPayload {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8")
    ) as CursorPayload;

    if (
      !exerciseSortFields.includes(parsed.sort) ||
      !exerciseOrderValues.includes(parsed.order)
    ) {
      throw new Error("Unsupported cursor fields");
    }

    if (!parsed.id || parsed.value === undefined || parsed.value === null) {
      throw new Error("Cursor missing fields");
    }

    return parsed;
  } catch (error) {
    throw new Error("INVALID_CURSOR", { cause: error });
  }
}

export function mapToDTO(row: ExerciseRow): ExerciseDTO {
  // Destrukturyzacja w celu usunięcia pól wewnętrznych.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user_id, title_normalized, ...rest } = row;
  return rest;
}

/**
 * Pobiera informacje o powiązaniach ćwiczenia z planami treningowymi i sesjami.
 */
export async function getExerciseRelations(
  client: DbClient,
  exerciseId: string
): Promise<{
  plansCount: number;
  sessionsCount: number;
  hasRelations: boolean;
}> {
  // Liczba planów używających ćwiczenia
  const { count: plansCount, error: plansError } = await client
    .from("workout_plan_exercises")
    .select("*", { count: "exact", head: true })
    .eq("exercise_id", exerciseId);

  if (plansError) {
    throw new Error(`Failed to count workout plans: ${plansError.message}`);
  }

  // Liczba sesji z tym ćwiczeniem
  const { count: sessionsCount, error: sessionsError } = await client
    .from("workout_session_exercises")
    .select("*", { count: "exact", head: true })
    .eq("exercise_id", exerciseId);

  if (sessionsError) {
    throw new Error(`Failed to count workout sessions: ${sessionsError.message}`);
  }

  return {
    plansCount: plansCount ?? 0,
    sessionsCount: sessionsCount ?? 0,
    hasRelations: (plansCount ?? 0) > 0 || (sessionsCount ?? 0) > 0,
  };
}

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
