import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/database.types";
import type {
  ExerciseCreateCommand,
  ExerciseDTO,
  ExerciseQueryParams,
  ExerciseUpdateCommand,
} from "@/types";
import {
  applyCursorFilter,
  decodeCursor,
  encodeCursor,
} from "@/lib/cursor-utils";
import {
  EXERCISE_DEFAULT_LIMIT,
  EXERCISE_MAX_LIMIT,
  exerciseOrderValues,
  exerciseSortFields,
  normalizeTitleForDbLookup,
} from "@/lib/validation/exercises";

type DbClient = SupabaseClient<Database>;
type ExerciseRow = Database["public"]["Tables"]["exercises"]["Row"];

const exerciseSelectColumns =
  "id,title,types,parts,is_unilateral,level,details,reps,duration_seconds,series,rest_in_between_seconds,rest_after_series_seconds,estimated_set_time_seconds,created_at,updated_at,title_normalized,user_id";

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
  excludeId?: string,
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
  titleNormalized: string,
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

function toDbInsert(input: ExerciseCreateCommand): Omit<
  ExerciseCreateCommand,
  "types" | "parts"
> & {
  types: Database["public"]["Enums"]["exercise_type"][];
  parts: Database["public"]["Enums"]["exercise_part"][];
} {
  const { types, parts, is_unilateral, ...rest } = input;
  return {
    ...rest,
    types,
    parts,
    is_unilateral: is_unilateral ?? false,
  };
}

function toDbUpdate(input: ExerciseUpdateCommand): Record<string, unknown> {
  const { types, parts, is_unilateral, ...rest } = input;
  const result: Record<string, unknown> = { ...rest };
  if (types !== undefined) result.types = types;
  if (parts !== undefined) result.parts = parts;
  if (is_unilateral !== undefined) result.is_unilateral = is_unilateral;
  return result;
}

export async function insertExercise(
  client: DbClient,
  userId: string,
  input: ExerciseCreateCommand,
) {
  const dbInput = toDbInsert(input);
  const { data, error } = await client
    .from("exercises")
    .insert({
      ...dbInput,
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
  input: ExerciseUpdateCommand,
) {
  const dbInput = toDbUpdate(input);
  const { data, error } = await client
    .from("exercises")
    .update({
      ...dbInput,
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
  id: string,
) {
  const { error } = await client
    .from("exercises")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);

  return { error };
}

export type ExerciseTitleRow = { id: string; title: string };

export async function listExerciseTitles(
  client: DbClient,
  userId: string,
  limit = 50,
): Promise<{ data: ExerciseTitleRow[]; error: PostgrestError | null }> {
  const { data, error } = await client
    .from("exercises")
    .select("id,title")
    .eq("user_id", userId)
    .order("title", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit);

  return {
    data: data ?? [],
    error: error ?? null,
  };
}

export async function listExercises(
  client: DbClient,
  userId: string,
  params: Required<Pick<ExerciseQueryParams, "sort" | "order" | "limit">> &
    ExerciseQueryParams,
): Promise<{
  data?: ExerciseDTO[];
  nextCursor?: string | null;
  error?: PostgrestError | null;
}> {
  const limit = Math.min(
    params.limit ?? EXERCISE_DEFAULT_LIMIT,
    EXERCISE_MAX_LIMIT,
  );
  const sort = params.sort ?? "created_at";
  const order = params.order ?? "desc";
  // Map sort field for array columns (part->parts, type->types)
  const sortColumnMap: Record<string, string> = {
    part: "parts",
    type: "types",
  };
  const sortColumn = sortColumnMap[sort] ?? sort;

  let query = client
    .from("exercises")
    .select(exerciseSelectColumns)
    .eq("user_id", userId);

  if (params.part) {
    query = query.contains("parts", [params.part]);
  }

  if (params.type) {
    query = query.contains("types", [params.type]);
  }

  if (params.exercise_id) {
    query = query.eq("id", params.exercise_id);
  }

  if (params.search) {
    const normalizedSearch = normalizeTitleForDbLookup(params.search);
    query = query.ilike("title_normalized", `%${normalizedSearch}%`);
  }

  if (params.cursor) {
    const cursor = decodeCursor(params.cursor, {
      sortFields: exerciseSortFields,
      orderValues: exerciseOrderValues,
    });

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

    query = applyCursorFilter(query, sortColumn, order, cursor);
  }

  query = query
    .order(sortColumn, { ascending: order === "asc" })
    .order("id", { ascending: order === "asc" })
    .limit(limit + 1);

  const { data, error } = await query;

  if (error) {
    return { error };
  }

  const items = data ?? [];
  let nextCursor: string | null = null;

  if (items.length > limit) {
    const tail = items.pop()! as ExerciseRow;
    // For array columns, use first element as cursor value
    let cursorValue: string | number | undefined;
    if (sort === "part") {
      cursorValue = tail.parts?.[0];
    } else if (sort === "type") {
      cursorValue = tail.types?.[0];
    } else {
      cursorValue = tail[sortColumn as keyof ExerciseRow] as string | number;
    }

    nextCursor = encodeCursor({
      sort,
      order,
      value: cursorValue ?? "",
      id: tail.id,
    });
  }

  return {
    data: items.map(mapToDTO),
    nextCursor,
    error: null,
  };
}

export function mapToDTO(row: ExerciseRow): ExerciseDTO {
  /* eslint-disable @typescript-eslint/no-unused-vars -- destructuring to omit from rest */
  const { user_id, title_normalized, types, parts, ...rest } = row;
  /* eslint-enable @typescript-eslint/no-unused-vars */
  return {
    ...rest,
    types: types ?? [],
    parts: parts ?? [],
    type: types?.[0] ?? ("Main Workout" as const),
    part: parts?.[0] ?? ("Legs" as const),
  };
}

/**
 * Pobiera informacje o powiązaniach ćwiczenia z planami treningowymi i sesjami.
 */
export async function getExerciseRelations(
  client: DbClient,
  exerciseId: string,
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
    throw new Error(
      `Failed to count workout sessions: ${sessionsError.message}`,
    );
  }

  return {
    plansCount: plansCount ?? 0,
    sessionsCount: sessionsCount ?? 0,
    hasRelations: (plansCount ?? 0) > 0 || (sessionsCount ?? 0) > 0,
  };
}
