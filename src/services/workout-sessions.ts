import { ZodError } from "zod";

import { createClient } from "@/db/supabase.server";
import type { Database } from "@/db/database.types";
import type {
  SessionDetailDTO,
  SessionExerciseAutosaveResponse,
  SessionListQueryParams,
  SessionSummaryDTO,
} from "@/types";
import {
  sessionStartSchema,
  sessionListQuerySchema,
  sessionStatusUpdateSchema,
  sessionExerciseAutosaveSchema,
} from "@/lib/validation/workout-sessions";
import {
  findInProgressSession,
  findWorkoutSessionById,
  findWorkoutSessionsByUserId,
  insertWorkoutSession,
  insertWorkoutSessionExercises,
  updateWorkoutSessionStatus,
  findWorkoutSessionExercises,
  findWorkoutSessionSets,
  mapToDetailDTO,
  findExercisesByIdsForSnapshots,
  findWorkoutSessionExerciseByOrder,
  updateWorkoutSessionExercise,
  updateWorkoutSessionCursor,
  findNextExerciseOrder,
  callSaveWorkoutSessionExercise,
  mapExerciseToDTO,
} from "@/repositories/workout-sessions";
import {
  findWorkoutPlanById,
  listWorkoutPlanExercises,
} from "@/repositories/workout-plans";
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

/**
 * Rozpoczyna nową sesję treningową lub zwraca istniejącą sesję in_progress.
 */
export async function startWorkoutSessionService(
  userId: string,
  payload: unknown
): Promise<{ session: SessionDetailDTO; isNew: boolean }> {
  assertUser(userId);
  const parsed = parseOrThrow(sessionStartSchema, payload);

  const supabase = await createClient();

  // Sprawdź, czy użytkownik ma już sesję in_progress
  const { data: existingSession, error: existingError } =
    await findInProgressSession(supabase, userId);

  if (existingError) {
    throw mapDbError(existingError);
  }

  if (existingSession) {
    // Zwróć istniejącą sesję z pełnymi szczegółami
    const detail = await getWorkoutSessionDetail(supabase, userId, existingSession.id);
    return { session: detail, isNew: false };
  }

  // Zweryfikuj, że plan istnieje i należy do użytkownika
  const { data: plan, error: planError } = await findWorkoutPlanById(
    supabase,
    userId,
    parsed.workout_plan_id
  );

  if (planError) {
    throw mapDbError(planError);
  }

  if (!plan) {
    throw new ServiceError(
      "NOT_FOUND",
      "Plan treningowy nie został znaleziony lub nie należy do użytkownika."
    );
  }

  // Pobierz ćwiczenia planu
  const { data: planExercises, error: planExercisesError } =
    await listWorkoutPlanExercises(supabase, parsed.workout_plan_id);

  if (planExercisesError) {
    throw mapDbError(planExercisesError);
  }

  if (!planExercises || planExercises.length === 0) {
    throw new ServiceError(
      "BAD_REQUEST",
      "Plan treningowy musi zawierać co najmniej jedno ćwiczenie."
    );
  }

  // Pobierz szczegóły ćwiczeń (pełne dane dla snapshotów)
  const exerciseIds = planExercises.map((e) => e.exercise_id);
  const { data: exercises, error: exercisesError } =
    await findExercisesByIdsForSnapshots(supabase, userId, exerciseIds);

  if (exercisesError) {
    throw mapDbError(exercisesError);
  }

  if (!exercises || exercises.length !== exerciseIds.length) {
    throw new ServiceError(
      "NOT_FOUND",
      "Niektóre ćwiczenia w planie nie istnieją lub nie należą do użytkownika."
    );
  }

  // Utwórz mapę ćwiczeń dla szybkiego dostępu
  const exercisesMap = new Map(
    exercises.map((e) => [e.id, e])
  );

  // Utwórz sesję
  const { data: session, error: sessionError } = await insertWorkoutSession(
    supabase,
    userId,
    {
      workout_plan_id: parsed.workout_plan_id,
      plan_name_at_time: plan.name,
    }
  );

  if (sessionError) {
    throw mapDbError(sessionError);
  }

  if (!session) {
    throw new ServiceError(
      "INTERNAL",
      "Nie udało się utworzyć sesji treningowej."
    );
  }

  // Przygotuj snapshoty ćwiczeń
  const sessionExercises = createSessionSnapshots(
    planExercises,
    exercisesMap
  );

  // Wstaw ćwiczenia sesji
  const { error: exercisesInsertError } = await insertWorkoutSessionExercises(
    supabase,
    session.id,
    sessionExercises
  );

  if (exercisesInsertError) {
    // Jeśli wstawienie ćwiczeń się nie powiodło, usuń sesję
    await supabase.from("workout_sessions").delete().eq("id", session.id);
    throw mapDbError(exercisesInsertError);
  }

  // Pobierz utworzoną sesję z pełnymi szczegółami
  const detail = await getWorkoutSessionDetail(supabase, userId, session.id);
  return { session: detail, isNew: true };
}

/**
 * Pobiera listę sesji treningowych użytkownika.
 */
export async function listWorkoutSessionsService(
  userId: string,
  query: SessionListQueryParams
): Promise<{
  items: SessionSummaryDTO[];
  nextCursor: string | null;
}> {
  assertUser(userId);
  const parsed = parseOrThrow(sessionListQuerySchema, query);

  const supabase = await createClient();

  try {
    console.log("[listWorkoutSessionsService] Fetching sessions", {
      userId,
      query: parsed,
    });

    const { data, nextCursor, error } = await findWorkoutSessionsByUserId(
      supabase,
      userId,
      parsed
    );

    console.log("[listWorkoutSessionsService] Query result", {
      dataCount: data?.length ?? 0,
      nextCursor,
      error: error ? {
        message: error.message,
        code: error.code,
        details: error.details,
      } : null,
    });

    if (error) {
      throw mapDbError(error);
    }

    const result = {
      items: data ?? [],
      nextCursor: nextCursor ?? null,
    };

    console.log("[listWorkoutSessionsService] Returning", {
      itemsCount: result.items.length,
      nextCursor: result.nextCursor,
    });

    return result;
  } catch (error) {
    console.error("[listWorkoutSessionsService] Error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof Error && error.message === "INVALID_CURSOR") {
      throw new ServiceError("BAD_REQUEST", "Nieprawidłowy kursor paginacji.");
    }

    throw error;
  }
}

/**
 * Pobiera szczegóły sesji treningowej po ID.
 */
export async function getWorkoutSessionService(
  userId: string,
  id: string
): Promise<SessionDetailDTO> {
  assertUser(userId);
  const supabase = await createClient();

  return await getWorkoutSessionDetail(supabase, userId, id);
}

/**
 * Aktualizuje status sesji treningowej.
 */
export async function updateWorkoutSessionStatusService(
  userId: string,
  id: string,
  payload: unknown
): Promise<SessionSummaryDTO> {
  assertUser(userId);
  const parsed = parseOrThrow(sessionStatusUpdateSchema, payload);
  const supabase = await createClient();

  // Pobierz istniejącą sesję
  const { data: existing, error: fetchError } = await findWorkoutSessionById(
    supabase,
    userId,
    id
  );

  if (fetchError) {
    throw mapDbError(fetchError);
  }

  if (!existing) {
    throw new ServiceError(
      "NOT_FOUND",
      "Sesja treningowa nie została znaleziona."
    );
  }

  // Walidacja przejścia stanu
  if (parsed.status === "in_progress") {
    // Sprawdź, czy użytkownik ma już inną sesję in_progress
    const { data: otherInProgress, error: checkError } =
      await findInProgressSession(supabase, userId);

    if (checkError) {
      throw mapDbError(checkError);
    }

    if (otherInProgress && otherInProgress.id !== id) {
      throw new ServiceError(
        "CONFLICT",
        "Użytkownik może mieć tylko jedną sesję w trakcie jednocześnie."
      );
    }
  }

  // Przygotuj update
  let completedAt: string | null | undefined = undefined;

  if (parsed.status === "completed" && !existing.completed_at) {
    completedAt = new Date().toISOString();
  }

  // Jeśli zmieniamy na in_progress, nie modyfikuj completed_at (zachowaj historię)
  if (parsed.status === "in_progress") {
    completedAt = existing.completed_at; // Zachowaj istniejącą wartość
  }

  // Wykonaj update
  const { data: updated, error: updateError } =
    await updateWorkoutSessionStatus(
      supabase,
      userId,
      id,
      parsed.status,
      completedAt ?? null
    );

  if (updateError) {
    throw mapDbError(updateError);
  }

  if (!updated) {
    throw new ServiceError(
      "INTERNAL",
      "Nie udało się zaktualizować statusu sesji."
    );
  }

  return updated;
}

/**
 * Pobiera szczegóły sesji z ćwiczeniami i seriami.
 */
async function getWorkoutSessionDetail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  sessionId: string
): Promise<SessionDetailDTO> {
  const { data: session, error: sessionError } = await findWorkoutSessionById(
    supabase,
    userId,
    sessionId
  );

  if (sessionError) {
    throw mapDbError(sessionError);
  }

  if (!session) {
    throw new ServiceError(
      "NOT_FOUND",
      "Sesja treningowa nie została znaleziona."
    );
  }

  // Pobierz ćwiczenia sesji
  const { data: exercises, error: exercisesError } =
    await findWorkoutSessionExercises(supabase, sessionId);

  if (exercisesError) {
    throw mapDbError(exercisesError);
  }

  if (!exercises) {
    throw new ServiceError(
      "INTERNAL",
      "Nie udało się pobrać ćwiczeń sesji."
    );
  }

  // Pobierz serie dla wszystkich ćwiczeń (batch)
  const exerciseIds = exercises.map((e) => e.id);
  const { data: sets, error: setsError } = await findWorkoutSessionSets(
    supabase,
    exerciseIds
  );

  if (setsError) {
    throw mapDbError(setsError);
  }

  return mapToDetailDTO(session, exercises, sets ?? []);
}

/**
 * Tworzy snapshoty ćwiczeń dla sesji na podstawie planu.
 */
function createSessionSnapshots(
  planExercises: Array<{
    exercise_id: string;
    section_type: Database["public"]["Enums"]["exercise_type"];
    section_order: number;
    planned_sets: number | null;
    planned_reps: number | null;
    planned_duration_seconds: number | null;
    planned_rest_seconds: number | null;
  }>,
  exercisesMap: Map<
    string,
    {
      id: string;
      title: string;
      type: Database["public"]["Enums"]["exercise_type"];
      part: Database["public"]["Enums"]["exercise_part"];
      reps: number | null;
      duration_seconds: number | null;
      series: number;
      rest_in_between_seconds: number | null;
      rest_after_series_seconds: number | null;
    }
  >
): Array<{
  exercise_id: string;
  exercise_title_at_time: string;
  exercise_type_at_time: Database["public"]["Enums"]["exercise_type"];
  exercise_part_at_time: Database["public"]["Enums"]["exercise_part"];
  planned_sets: number | null;
  planned_reps: number | null;
  planned_duration_seconds: number | null;
  planned_rest_seconds: number | null;
  exercise_order: number;
}> {
  // Sortuj ćwiczenia planu: najpierw Warm-up, potem Main Workout, potem Cool-down
  // W ramach każdej sekcji sortuj po section_order
  const sortedExercises = [...planExercises].sort((a, b) => {
    const typeOrder = {
      "Warm-up": 1,
      "Main Workout": 2,
      "Cool-down": 3,
    };

    const aOrder = typeOrder[a.section_type];
    const bOrder = typeOrder[b.section_type];

    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }

    return a.section_order - b.section_order;
  });

  // Oblicz flattened order (1, 2, 3, ...)
  const snapshots = sortedExercises.map((planExercise, index) => {
    const exercise = exercisesMap.get(planExercise.exercise_id);

    if (!exercise) {
      throw new ServiceError(
        "INTERNAL",
        `Ćwiczenie ${planExercise.exercise_id} nie zostało znalezione.`
      );
    }

    // Użyj planned_* z planu, jeśli dostępne, w przeciwnym razie użyj wartości z ćwiczenia jako fallback
    const plannedSets =
      planExercise.planned_sets ?? exercise.series ?? null;
    const plannedReps = planExercise.planned_reps ?? exercise.reps ?? null;
    const plannedDuration =
      planExercise.planned_duration_seconds ??
      exercise.duration_seconds ??
      null;
    const plannedRest =
      planExercise.planned_rest_seconds ??
      exercise.rest_in_between_seconds ??
      exercise.rest_after_series_seconds ??
      null;

    return {
      exercise_id: exercise.id,
      exercise_title_at_time: exercise.title,
      exercise_type_at_time: exercise.type,
      exercise_part_at_time: exercise.part,
      planned_sets: plannedSets,
      planned_reps: plannedReps,
      planned_duration_seconds: plannedDuration,
      planned_rest_seconds: plannedRest,
      exercise_order: index + 1, // Flattened order starting from 1
    };
  });

  return snapshots;
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
      "Konflikt unikalności (np. próba utworzenia drugiej sesji in_progress).",
      error.message
    );
  }

  if (error.code === "23503") {
    return new ServiceError(
      "NOT_FOUND",
      "Operacja narusza istniejące powiązania (np. plan nie istnieje).",
      error.message
    );
  }

  if (error.code === "23502") {
    return new ServiceError(
      "BAD_REQUEST",
      "Brak wymaganych pól.",
      error.message
    );
  }

  if (error.code === "BAD_REQUEST") {
    return new ServiceError("BAD_REQUEST", error.message, error.details ?? "");
  }

  return new ServiceError("INTERNAL", "Wystąpił błąd serwera.", error.message);
}

function assertUser(userId: string) {
  if (!userId) {
    throw new ServiceError("UNAUTHORIZED", "Brak aktywnej sesji.");
  }
}

/**
 * Waliduje path parameters dla autosave.
 */
function validateAutosavePathParams(sessionId: string, order: number) {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(sessionId)) {
    throw new ServiceError("BAD_REQUEST", "id musi być prawidłowym UUID");
  }

  if (!Number.isInteger(order) || order <= 0) {
    throw new ServiceError(
      "BAD_REQUEST",
      "order musi być liczbą całkowitą większą od 0"
    );
  }
}

/**
 * Sprawdza istnienie sesji i waliduje jej status.
 */
async function validateSessionForAutosave(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  sessionId: string
) {
  const { data: session, error: sessionError } = await findWorkoutSessionById(
    supabase,
    userId,
    sessionId
  );

  if (sessionError) {
    throw mapDbError(sessionError);
  }

  if (!session) {
    throw new ServiceError(
      "NOT_FOUND",
      "Sesja treningowa nie została znaleziona."
    );
  }

  if (session.status !== "in_progress") {
    throw new ServiceError(
      "CONFLICT",
      "Sesja treningowa nie jest w statusie 'in_progress'."
    );
  }

  return session;
}

/**
 * Sprawdza istnienie ćwiczenia w sesji.
 */
async function validateExerciseForAutosave(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
  order: number
) {
  const { data: exercise, error: exerciseError } =
    await findWorkoutSessionExerciseByOrder(supabase, sessionId, order);

  if (exerciseError) {
    throw mapDbError(exerciseError);
  }

  if (!exercise) {
    throw new ServiceError(
      "NOT_FOUND",
      "Ćwiczenie o podanej kolejności nie zostało znalezione w sesji."
    );
  }

  return exercise;
}

/**
 * Mapuje błędy funkcji DB na ServiceError.
 */
function mapSaveFunctionError(error: { message?: string }): ServiceError {
  if (
    error.message?.includes("Session not found") ||
    error.message?.includes("not found")
  ) {
    return new ServiceError(
      "NOT_FOUND",
      "Sesja treningowa nie została znaleziona."
    );
  }

  if (
    error.message?.includes("Access denied") ||
    error.message?.includes("access denied")
  ) {
    return new ServiceError(
      "FORBIDDEN",
      "Brak dostępu do tej sesji treningowej."
    );
  }

  return new ServiceError(
    "INTERNAL",
    "Wystąpił błąd podczas zapisywania ćwiczenia.",
    error.message
  );
}

/**
 * Przygotowuje dane planned_* do aktualizacji.
 */
function preparePlannedUpdates(parsed: {
  planned_sets?: number | null;
  planned_reps?: number | null;
  planned_duration_seconds?: number | null;
  planned_rest_seconds?: number | null;
}): {
  planned_sets?: number | null;
  planned_reps?: number | null;
  planned_duration_seconds?: number | null;
  planned_rest_seconds?: number | null;
} | null {
  if (
    parsed.planned_sets === undefined &&
    parsed.planned_reps === undefined &&
    parsed.planned_duration_seconds === undefined &&
    parsed.planned_rest_seconds === undefined
  ) {
    return null;
  }

  const updates: {
    planned_sets?: number | null;
    planned_reps?: number | null;
    planned_duration_seconds?: number | null;
    planned_rest_seconds?: number | null;
  } = {};

  if (parsed.planned_sets !== undefined) {
    updates.planned_sets = parsed.planned_sets;
  }
  if (parsed.planned_reps !== undefined) {
    updates.planned_reps = parsed.planned_reps;
  }
  if (parsed.planned_duration_seconds !== undefined) {
    updates.planned_duration_seconds = parsed.planned_duration_seconds;
  }
  if (parsed.planned_rest_seconds !== undefined) {
    updates.planned_rest_seconds = parsed.planned_rest_seconds;
  }

  return updates;
}

/**
 * Aktualizuje kursor sesji, jeśli advance_cursor_to_next = true.
 */
async function updateCursorIfNeeded(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
  order: number,
  advanceCursor: boolean
): Promise<void> {
  if (!advanceCursor) {
    return;
  }

  const { data: nextOrder, error: nextOrderError } =
    await findNextExerciseOrder(supabase, sessionId, order);

  if (nextOrderError) {
    throw mapDbError(nextOrderError);
  }

  // Jeśli istnieje następne ćwiczenie, przesuń kursor
  if (nextOrder !== null) {
    const { error: cursorError } = await updateWorkoutSessionCursor(
      supabase,
      sessionId,
      nextOrder
    );

    if (cursorError) {
      throw mapDbError(cursorError);
    }
  }
  // Jeśli nie ma następnego ćwiczenia, kursor pozostaje na aktualnym (order)
}

/**
 * Pobiera zaktualizowane ćwiczenie z seriami i kursorem sesji.
 */
async function fetchUpdatedExerciseWithCursor(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  sessionId: string,
  sessionExerciseId: string,
  order: number
): Promise<SessionExerciseAutosaveResponse> {
  const { data: updatedExercise, error: fetchExerciseError } =
    await findWorkoutSessionExerciseByOrder(supabase, sessionId, order);

  if (fetchExerciseError) {
    throw mapDbError(fetchExerciseError);
  }

  if (!updatedExercise) {
    throw new ServiceError(
      "INTERNAL",
      "Nie udało się pobrać zaktualizowanego ćwiczenia."
    );
  }

  const { data: sets, error: setsError } = await findWorkoutSessionSets(
    supabase,
    [sessionExerciseId]
  );

  if (setsError) {
    throw mapDbError(setsError);
  }

  const { data: updatedSession, error: sessionFetchError } =
    await findWorkoutSessionById(supabase, userId, sessionId);

  if (sessionFetchError) {
    throw mapDbError(sessionFetchError);
  }

  if (!updatedSession) {
    throw new ServiceError(
      "INTERNAL",
      "Nie udało się pobrać zaktualizowanej sesji."
    );
  }

  const exerciseDTO = mapExerciseToDTO(updatedExercise, sets ?? []);

  return {
    ...exerciseDTO,
    cursor: {
      current_position: updatedSession.current_position ?? order,
      last_action_at: updatedSession.last_action_at,
    },
  };
}

/**
 * Oblicza agregaty z serii, jeśli nie zostały podane ręcznie.
 * Opcja A: Automatyczne obliczanie z fallbackiem na wartości ręczne.
 * Mapuje nazwy API (actual_count_sets, actual_sum_reps) na nazwy bazy danych (actual_sets, actual_reps).
 */
function calculateAggregatesFromSets(
  parsed: {
    actual_count_sets?: number | null;
    actual_sum_reps?: number | null;
    actual_duration_seconds?: number | null;
    sets?: Array<{
      reps?: number | null;
      duration_seconds?: number | null;
      weight_kg?: number | null;
    }> | null;
  }
): {
  actual_sets: number | null; // Dla bazy danych
  actual_reps: number | null; // Dla bazy danych
  actual_duration_seconds: number | null;
} {
  // actual_count_sets (API) → actual_sets (DB): jeśli nie podano, oblicz z sets.length
  let actualSets: number | null = null;
  if (parsed.actual_count_sets !== undefined) {
    actualSets = parsed.actual_count_sets;
  } else if (parsed.sets && parsed.sets.length > 0) {
    actualSets = parsed.sets.length;
  }

  // actual_sum_reps (API) → actual_reps (DB): jeśli nie podano, oblicz sumę reps z serii
  let actualReps: number | null = null;
  if (parsed.actual_sum_reps !== undefined) {
    actualReps = parsed.actual_sum_reps;
  } else if (parsed.sets && parsed.sets.length > 0) {
    const sum = parsed.sets.reduce((acc, set) => {
      return acc + (set.reps ?? 0);
    }, 0);
    // Zwróć sumę tylko jeśli > 0 (null oznacza brak danych)
    actualReps = sum > 0 ? sum : null;
  }

  // actual_duration_seconds: jeśli nie podano, oblicz max duration_seconds z serii
  let actualDurationSeconds: number | null = null;
  if (parsed.actual_duration_seconds !== undefined) {
    actualDurationSeconds = parsed.actual_duration_seconds;
  } else if (parsed.sets && parsed.sets.length > 0) {
    const durations = parsed.sets
      .map((set) => set.duration_seconds)
      .filter((d): d is number => d !== null && d !== undefined);
    if (durations.length > 0) {
      actualDurationSeconds = Math.max(...durations);
    }
  }

  return {
    actual_sets: actualSets, // Mapowanie na nazwę bazy danych
    actual_reps: actualReps, // Mapowanie na nazwę bazy danych
    actual_duration_seconds: actualDurationSeconds,
  };
}

/**
 * Autosave ćwiczenia w sesji treningowej.
 * Aktualizuje parametry faktyczne ćwiczenia, serie, planned_* (opcjonalnie) i kursor sesji.
 */
export async function autosaveWorkoutSessionExerciseService(
  userId: string,
  sessionId: string,
  order: number,
  payload: unknown
): Promise<SessionExerciseAutosaveResponse> {
  console.log("[autosaveWorkoutSessionExerciseService] Starting", {
    userId,
    sessionId,
    order,
    payloadType: typeof payload,
  });

  assertUser(userId);
  validateAutosavePathParams(sessionId, order);
  console.log("[autosaveWorkoutSessionExerciseService] Validation passed");

  const parsed = parseOrThrow(sessionExerciseAutosaveSchema, payload);
  console.log("[autosaveWorkoutSessionExerciseService] Payload parsed:", JSON.stringify(parsed, null, 2));
  
  const supabase = await createClient();
  console.log("[autosaveWorkoutSessionExerciseService] Supabase client created");

  await validateSessionForAutosave(supabase, userId, sessionId);
  console.log("[autosaveWorkoutSessionExerciseService] Session validated");
  
  const exercise = await validateExerciseForAutosave(
    supabase,
    sessionId,
    order
  );
  console.log("[autosaveWorkoutSessionExerciseService] Exercise validated:", {
    exercise_id: exercise.exercise_id,
    exercise_order: exercise.exercise_order,
  });

  // Oblicz agregaty z serii, jeśli nie zostały podane ręcznie (Opcja A)
  const aggregates = calculateAggregatesFromSets(parsed);
  console.log("[autosaveWorkoutSessionExerciseService] Aggregates calculated:", aggregates);

  // Przygotuj sets dla bazy danych:
  // - Jeśli sets nie jest puste, wyślij zmapowane sets
  // - Jeśli sets jest puste i is_skipped === true, wyślij [] aby wyczyścić istniejące serie
  // - Jeśli sets jest puste i is_skipped !== true, wyślij null (nie zmieniaj istniejących serii)
  let setsDataForDb: Array<{
    reps: number | null;
    duration_seconds: number | null;
    weight_kg: number | null;
  }> | null = null;

  if (parsed.sets && parsed.sets.length > 0) {
    setsDataForDb = parsed.sets.map((set) => ({
      reps: set.reps ?? null,
      duration_seconds: set.duration_seconds ?? null,
      weight_kg: set.weight_kg ?? null,
    }));
    console.log("[autosaveWorkoutSessionExerciseService] Sets data prepared:", setsDataForDb);
  } else if (parsed.is_skipped === true) {
    // Pusta tablica = wyczyść wszystkie istniejące serie
    setsDataForDb = [];
    console.log("[autosaveWorkoutSessionExerciseService] Exercise skipped, clearing sets");
  } else {
    console.log("[autosaveWorkoutSessionExerciseService] Sets data remains null (no changes)");
  }
  // else: setsDataForDb pozostaje null (nie zmieniaj istniejących serii)

  const saveParams = {
    p_session_id: sessionId,
    p_exercise_id: exercise.exercise_id,
    p_exercise_order: order,
    p_actual_sets: aggregates.actual_sets,
    p_actual_reps: aggregates.actual_reps,
    p_actual_duration_seconds: aggregates.actual_duration_seconds,
    p_actual_rest_seconds: null,
    p_is_skipped: parsed.is_skipped ?? false,
    p_sets_data: setsDataForDb,
  };
  console.log("[autosaveWorkoutSessionExerciseService] Calling callSaveWorkoutSessionExercise with params:", {
    ...saveParams,
    p_sets_data: setsDataForDb ? `Array(${setsDataForDb.length})` : null,
  });

  const { data: sessionExerciseId, error: saveError } =
    await callSaveWorkoutSessionExercise(supabase, saveParams);

  if (saveError) {
    console.error("[autosaveWorkoutSessionExerciseService] Save error:", saveError);
    throw mapSaveFunctionError(saveError);
  }

  if (!sessionExerciseId) {
    console.error("[autosaveWorkoutSessionExerciseService] No sessionExerciseId returned");
    throw new ServiceError(
      "INTERNAL",
      "Nie udało się zapisać ćwiczenia w sesji."
    );
  }

  console.log("[autosaveWorkoutSessionExerciseService] Exercise saved, sessionExerciseId:", sessionExerciseId);

  const plannedUpdates = preparePlannedUpdates(parsed);
  if (plannedUpdates) {
    console.log("[autosaveWorkoutSessionExerciseService] Updating planned values:", plannedUpdates);
    const { error: updateError } = await updateWorkoutSessionExercise(
      supabase,
      sessionExerciseId,
      plannedUpdates
    );

    if (updateError) {
      console.error("[autosaveWorkoutSessionExerciseService] Planned update error:", updateError);
      throw mapDbError(updateError);
    }
    console.log("[autosaveWorkoutSessionExerciseService] Planned values updated");
  } else {
    console.log("[autosaveWorkoutSessionExerciseService] No planned updates needed");
  }

  console.log("[autosaveWorkoutSessionExerciseService] Updating cursor, advance_cursor_to_next:", parsed.advance_cursor_to_next);
  await updateCursorIfNeeded(
    supabase,
    sessionId,
    order,
    parsed.advance_cursor_to_next === true
  );
  console.log("[autosaveWorkoutSessionExerciseService] Cursor updated");

  console.log("[autosaveWorkoutSessionExerciseService] Fetching updated exercise");
  const result = await fetchUpdatedExerciseWithCursor(
    supabase,
    userId,
    sessionId,
    sessionExerciseId,
    order
  );
  console.log("[autosaveWorkoutSessionExerciseService] Success, returning result");
  
  return result;
}
