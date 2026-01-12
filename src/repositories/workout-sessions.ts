import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/database.types";
import type {
  SessionDetailDTO,
  SessionExerciseDTO,
  SessionExerciseSetDTO,
  SessionListQueryParams,
  SessionSummaryDTO,
} from "@/types";
import {
  SESSION_DEFAULT_LIMIT,
  SESSION_MAX_LIMIT,
  decodeCursor,
  encodeCursor,
  sessionOrderValues,
  sessionSortFields,
} from "@/lib/validation/workout-sessions";

type DbClient = SupabaseClient<Database>;
type WorkoutSessionRow =
  Database["public"]["Tables"]["workout_sessions"]["Row"];
type WorkoutSessionExerciseRow =
  Database["public"]["Tables"]["workout_session_exercises"]["Row"];
type WorkoutSessionSetRow =
  Database["public"]["Tables"]["workout_session_sets"]["Row"];
type SortField = (typeof sessionSortFields)[number];
type SortOrder = (typeof sessionOrderValues)[number];

const sessionSelectColumns =
  "id,workout_plan_id,status,plan_name_at_time,started_at,completed_at,current_position,user_id,last_action_at";

type CursorPayload = {
  sort: SortField;
  order: SortOrder;
  value: string | number;
  id: string;
};

/**
 * Znajduje sesję treningową ze statusem 'in_progress' dla użytkownika.
 */
export async function findInProgressSession(client: DbClient, userId: string) {
  const { data, error } = await client
    .from("workout_sessions")
    .select(sessionSelectColumns)
    .eq("user_id", userId)
    .eq("status", "in_progress")
    .maybeSingle();

  return { data, error };
}

/**
 * Pobiera sesję treningową po ID i user_id.
 */
export async function findWorkoutSessionById(
  client: DbClient,
  userId: string,
  id: string
) {
  const { data, error } = await client
    .from("workout_sessions")
    .select(sessionSelectColumns)
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  return { data, error };
}

/**
 * Pobiera listę sesji treningowych użytkownika z filtrami, sortowaniem i paginacją.
 */
export async function findWorkoutSessionsByUserId(
  client: DbClient,
  userId: string,
  params: Required<Pick<SessionListQueryParams, "sort" | "order" | "limit">> &
    SessionListQueryParams
): Promise<{
  data?: SessionSummaryDTO[];
  nextCursor?: string | null;
  error?: PostgrestError | null;
}> {
  const limit = Math.min(
    params.limit ?? SESSION_DEFAULT_LIMIT,
    SESSION_MAX_LIMIT
  );
  const sort = params.sort ?? "started_at";
  const order = params.order ?? "desc";

  let query = client
    .from("workout_sessions")
    .select(sessionSelectColumns)
    .eq("user_id", userId);

  if (params.status) {
    query = query.eq("status", params.status);
  }

  if (params.plan_id) {
    query = query.eq("workout_plan_id", params.plan_id);
  }

  if (params.from) {
    query = query.gte("started_at", params.from);
  }

  if (params.to) {
    query = query.lte("started_at", params.to);
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

  const items = (data ?? []) as WorkoutSessionRow[];
  let nextCursor: string | null = null;

  if (items.length > limit) {
    const tail = items.pop()!;

    nextCursor = encodeCursor({
      sort,
      order,
      value: tail[sort as keyof WorkoutSessionRow] as string | number,
      id: tail.id,
    });
  }

  return {
    data: items.map(mapToSummaryDTO),
    nextCursor,
    error: null,
  };
}

/**
 * Wstawia nową sesję treningową.
 */
export async function insertWorkoutSession(
  client: DbClient,
  userId: string,
  input: {
    workout_plan_id: string;
    plan_name_at_time: string;
  }
) {
  const { data, error } = await client
    .from("workout_sessions")
    .insert({
      user_id: userId,
      workout_plan_id: input.workout_plan_id,
      plan_name_at_time: input.plan_name_at_time,
      status: "in_progress",
      current_position: 0,
    })
    .select(sessionSelectColumns)
    .single();

  return {
    data: data ? mapToSummaryDTO(data as WorkoutSessionRow) : null,
    error,
  };
}

/**
 * Wstawia ćwiczenia do sesji treningowej (batch insert).
 */
export async function insertWorkoutSessionExercises(
  client: DbClient,
  sessionId: string,
  exercises: Array<{
    exercise_id: string;
    exercise_title_at_time: string;
    exercise_type_at_time: Database["public"]["Enums"]["exercise_type"];
    exercise_part_at_time: Database["public"]["Enums"]["exercise_part"];
    planned_sets: number | null;
    planned_reps: number | null;
    planned_duration_seconds: number | null;
    planned_rest_seconds: number | null;
    position: number;
  }>
) {
  const exercisesToInsert = exercises.map((exercise) => ({
    session_id: sessionId,
    exercise_id: exercise.exercise_id,
    exercise_title_at_time: exercise.exercise_title_at_time,
    exercise_type_at_time: exercise.exercise_type_at_time,
    exercise_part_at_time: exercise.exercise_part_at_time,
    planned_sets: exercise.planned_sets,
    planned_reps: exercise.planned_reps,
    planned_duration_seconds: exercise.planned_duration_seconds,
    planned_rest_seconds: exercise.planned_rest_seconds,
    position: exercise.position,
    actual_sets: null,
    actual_reps: null,
    actual_duration_seconds: null,
    actual_rest_seconds: null,
    is_skipped: false,
  }));

  const { data, error } = await client
    .from("workout_session_exercises")
    .insert(exercisesToInsert)
    .select();

  return { data, error };
}

/**
 * Aktualizuje status sesji treningowej.
 */
export async function updateWorkoutSessionStatus(
  client: DbClient,
  userId: string,
  id: string,
  status: Database["public"]["Enums"]["workout_session_status"],
  completedAt: string | null
) {
  const updateData: Database["public"]["Tables"]["workout_sessions"]["Update"] =
    {
      status,
      last_action_at: new Date().toISOString(),
    };

  if (completedAt !== undefined) {
    updateData.completed_at = completedAt;
  }

  const { data, error } = await client
    .from("workout_sessions")
    .update(updateData)
    .eq("user_id", userId)
    .eq("id", id)
    .select(sessionSelectColumns)
    .single();

  return {
    data: data ? mapToSummaryDTO(data as WorkoutSessionRow) : null,
    error,
  };
}

/**
 * Pobiera wszystkie ćwiczenia sesji treningowej posortowane po position.
 */
export async function findWorkoutSessionExercises(
  client: DbClient,
  sessionId: string
) {
  const { data, error } = await client
    .from("workout_session_exercises")
    .select("*")
    .eq("session_id", sessionId)
    .order("position", { ascending: true });

  if (error) {
    return { data: null, error };
  }

  return {
    data: data ?? [],
    error: null,
  };
}

/**
 * Pobiera serie dla ćwiczeń sesji (batch query).
 */
export async function findWorkoutSessionSets(
  client: DbClient,
  sessionExerciseIds: string[]
) {
  if (sessionExerciseIds.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await client
    .from("workout_session_sets")
    .select("*")
    .in("session_exercise_id", sessionExerciseIds)
    .order("session_exercise_id", { ascending: true })
    .order("set_number", { ascending: true });

  if (error) {
    return { data: null, error };
  }

  return {
    data: data ?? [],
    error: null,
  };
}

/**
 * Pobiera pełne dane ćwiczeń po ID (dla snapshotów sesji).
 */
export async function findExercisesByIdsForSnapshots(
  client: DbClient,
  userId: string,
  exerciseIds: string[]
) {
  if (exerciseIds.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await client
    .from("exercises")
    .select(
      "id,title,type,part,reps,duration_seconds,series,rest_in_between_seconds,rest_after_series_seconds"
    )
    .eq("user_id", userId)
    .in("id", exerciseIds);

  return { data, error };
}

/**
 * Mapuje wiersz z bazy danych na SessionSummaryDTO.
 */
export function mapToSummaryDTO(row: WorkoutSessionRow): SessionSummaryDTO {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user_id, last_action_at, ...rest } = row;
  return rest;
}

/**
 * Mapuje wiersz z bazy danych na SessionDetailDTO z ćwiczeniami i seriami.
 */
export function mapToDetailDTO(
  session: WorkoutSessionRow,
  exercises: WorkoutSessionExerciseRow[],
  sets: WorkoutSessionSetRow[]
): SessionDetailDTO {
  const sessionSummary = mapToSummaryDTO(session);

  // Grupuj serie po session_exercise_id
  const setsByExerciseId = new Map<string, WorkoutSessionSetRow[]>();
  for (const set of sets) {
    const exerciseId = set.session_exercise_id;
    if (!setsByExerciseId.has(exerciseId)) {
      setsByExerciseId.set(exerciseId, []);
    }
    setsByExerciseId.get(exerciseId)!.push(set);
  }

  const exerciseDTOs: SessionExerciseDTO[] = exercises.map((exercise) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { session_id, created_at, updated_at, ...exerciseRest } = exercise;

    const setDTOs: SessionExerciseSetDTO[] = (
      setsByExerciseId.get(exercise.id) ?? []
    ).map((set) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { session_exercise_id, created_at, updated_at, ...setRest } = set;
      return setRest;
    });

    return {
      ...exerciseRest,
      sets: setDTOs,
    };
  });

  return {
    ...sessionSummary,
    exercises: exerciseDTOs,
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
