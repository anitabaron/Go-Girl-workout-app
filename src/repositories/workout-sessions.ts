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

  const mappedData = items.map(mapToSummaryDTO);

  return {
    data: mappedData,
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
    exercise_order: number;
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
    exercise_order: exercise.exercise_order,
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
 * Pobiera wszystkie ćwiczenia sesji treningowej posortowane po order.
 */
export async function findWorkoutSessionExercises(
  client: DbClient,
  sessionId: string
) {
  const { data, error } = await client
    .from("workout_session_exercises")
    .select("*")
    .eq("session_id", sessionId)
    .order("exercise_order", { ascending: true });

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
    const { session_id, created_at, updated_at, actual_sets, actual_reps, ...exerciseRest } = exercise;

    const setDTOs: SessionExerciseSetDTO[] = (
      setsByExerciseId.get(exercise.id) ?? []
    ).map((set) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { session_exercise_id, created_at, updated_at, ...setRest } = set;
      return setRest;
    });

    return {
      ...exerciseRest,
      // Mapowanie nazw z bazy danych na nazwy API
      actual_count_sets: actual_sets,
      actual_sum_reps: actual_reps,
      sets: setDTOs,
    };
  });

  return {
    ...sessionSummary,
    exercises: exerciseDTOs,
  };
}

/**
 * Mapuje pojedyncze ćwiczenie sesji z seriami na SessionExerciseDTO.
 * Mapuje nazwy z bazy danych (actual_sets, actual_reps) na nazwy API (actual_count_sets, actual_sum_reps).
 */
export function mapExerciseToDTO(
  exercise: WorkoutSessionExerciseRow,
  sets: WorkoutSessionSetRow[]
): SessionExerciseDTO {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { session_id, created_at, updated_at, actual_sets, actual_reps, ...exerciseRest } = exercise;

  const setDTOs: SessionExerciseSetDTO[] = sets
    .filter((set) => set.session_exercise_id === exercise.id)
    .map((set) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { session_exercise_id, created_at, updated_at, ...setRest } = set;
      return setRest;
    })
    .sort((a, b) => a.set_number - b.set_number);

  return {
    ...exerciseRest,
    // Mapowanie nazw z bazy danych na nazwy API
    actual_count_sets: actual_sets,
    actual_sum_reps: actual_reps,
    sets: setDTOs,
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

/**
 * Znajduje ćwiczenie sesji treningowej po session_id i order.
 */
export async function findWorkoutSessionExerciseByOrder(
  client: DbClient,
  sessionId: string,
  order: number
) {
  console.log("[findWorkoutSessionExerciseByOrder] Starting", {
    sessionId,
    order,
    orderType: typeof order,
  });

  const { data, error } = await client
    .from("workout_session_exercises")
    .select("*")
    .eq("session_id", sessionId)
    .eq("exercise_order", order)
    .maybeSingle();

  if (error) {
    console.error("[findWorkoutSessionExerciseByOrder] Error:", error);
    console.error("[findWorkoutSessionExerciseByOrder] Error details:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
  } else {
    console.log("[findWorkoutSessionExerciseByOrder] Success, found exercise:", data ? "yes" : "no");
  }

  return { data, error };
}

/**
 * Aktualizuje planned_* w workout_session_exercises.
 */
export async function updateWorkoutSessionExercise(
  client: DbClient,
  sessionExerciseId: string,
  updates: {
    planned_sets?: number | null;
    planned_reps?: number | null;
    planned_duration_seconds?: number | null;
    planned_rest_seconds?: number | null;
  }
) {
  const { data, error } = await client
    .from("workout_session_exercises")
    .update(updates)
    .eq("id", sessionExerciseId)
    .select()
    .single();

  return { data, error };
}

/**
 * Aktualizuje current_position w workout_sessions.
 */
export async function updateWorkoutSessionCursor(
  client: DbClient,
  sessionId: string,
  currentPosition: number
) {
  const { data, error } = await client
    .from("workout_sessions")
    .update({
      current_position: currentPosition,
      last_action_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .select(sessionSelectColumns)
    .single();

  return {
    data: data ? mapToSummaryDTO(data as WorkoutSessionRow) : null,
    error,
  };
}

/**
 * Sprawdza, czy istnieje następne ćwiczenie (order + 1) w sesji.
 * Zwraca order następnego ćwiczenia lub null, jeśli nie istnieje.
 */
export async function findNextExerciseOrder(
  client: DbClient,
  sessionId: string,
  currentOrder: number
) {
  const { data, error } = await client
    .from("workout_session_exercises")
    .select("exercise_order")
    .eq("session_id", sessionId)
    .eq("exercise_order", currentOrder + 1)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  return {
    data: data ? data.exercise_order : null,
    error: null,
  };
}

/**
 * Wywołuje funkcję DB save_workout_session_exercise przez Supabase RPC.
 * Mapuje sets na format JSONB dla funkcji DB.
 * Zwraca session_exercise_id (UUID jako string).
 */
export async function callSaveWorkoutSessionExercise(
  client: DbClient,
  params: {
    p_session_id: string;
    p_exercise_id: string;
    p_exercise_order: number;
    p_actual_sets?: number | null;
    p_actual_reps?: number | null;
    p_actual_duration_seconds?: number | null;
    p_actual_rest_seconds?: number | null;
    p_is_skipped?: boolean;
    p_sets_data?: Array<{
      reps?: number | null;
      duration_seconds?: number | null;
      weight_kg?: number | null;
    }> | null;
  }
) {
  console.log("[callSaveWorkoutSessionExercise] Starting with params:", {
    p_session_id: params.p_session_id,
    p_exercise_id: params.p_exercise_id,
    p_exercise_order: params.p_exercise_order,
    p_actual_sets: params.p_actual_sets,
    p_actual_reps: params.p_actual_reps,
    p_actual_duration_seconds: params.p_actual_duration_seconds,
    p_is_skipped: params.p_is_skipped,
    p_sets_data_length: params.p_sets_data?.length ?? null,
  });

  // Mapuj sets na format JSONB (bez set_number, bo funkcja DB nie potrzebuje)
  // Jeśli p_sets_data jest pustą tablicą [], wyślij [] aby wyczyścić serie
  // Jeśli p_sets_data jest null lub undefined, wyślij null (nie zmieniaj serii)
  // Jeśli p_sets_data ma elementy, wyślij zmapowane sets
  let setsDataJson: Array<{
    reps: number | null;
    duration_seconds: number | null;
    weight_kg: number | null;
  }> | null = null;

  if (params.p_sets_data === null || params.p_sets_data === undefined) {
    setsDataJson = null;
    console.log("[callSaveWorkoutSessionExercise] Sets data is null/undefined, keeping null");
  } else if (params.p_sets_data.length > 0) {
    setsDataJson = params.p_sets_data.map((set) => ({
      reps: set.reps ?? null,
      duration_seconds: set.duration_seconds ?? null,
      weight_kg: set.weight_kg ?? null,
    }));
    console.log("[callSaveWorkoutSessionExercise] Sets data mapped:", setsDataJson);
  } else {
    // Pusta tablica = wyczyść wszystkie serie
    setsDataJson = [];
    console.log("[callSaveWorkoutSessionExercise] Sets data is empty array, clearing sets");
  }

  const rpcParams = {
    p_session_id: params.p_session_id,
    p_exercise_id: params.p_exercise_id,
    p_exercise_order: params.p_exercise_order,
    p_actual_sets: params.p_actual_sets !== null && params.p_actual_sets !== undefined ? params.p_actual_sets : undefined,
    p_actual_reps: params.p_actual_reps !== null && params.p_actual_reps !== undefined ? params.p_actual_reps : undefined,
    p_actual_duration_seconds: params.p_actual_duration_seconds !== null && params.p_actual_duration_seconds !== undefined ? params.p_actual_duration_seconds : undefined,
    p_actual_rest_seconds: params.p_actual_rest_seconds !== null && params.p_actual_rest_seconds !== undefined ? params.p_actual_rest_seconds : undefined,
    p_is_skipped: params.p_is_skipped ?? false,
    p_sets_data: setsDataJson !== null ? setsDataJson : undefined,
  };
  console.log("[callSaveWorkoutSessionExercise] Calling RPC save_workout_session_exercise with:", {
    ...rpcParams,
    p_sets_data: setsDataJson ? `Array(${setsDataJson.length})` : null,
  });

  const { data, error } = await client.rpc("save_workout_session_exercise", rpcParams);

  if (error) {
    console.error("[callSaveWorkoutSessionExercise] RPC error:", error);
    console.error("[callSaveWorkoutSessionExercise] RPC error details:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return { data: null, error };
  }

  console.log("[callSaveWorkoutSessionExercise] RPC success, data:", data);

  // Funkcja DB zwraca session_exercise_id jako string (UUID)
  const result = {
    data: data ? String(data) : null,
    error: null,
  };
  console.log("[callSaveWorkoutSessionExercise] Returning:", result);
  return result;
}
