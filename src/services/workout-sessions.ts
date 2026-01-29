import { ZodError } from "zod";

import { createClient } from "@/db/supabase.server";
import type { Database } from "@/db/database.types";
import type {
  SessionDetailDTO,
  SessionExerciseAutosaveResponse,
  SessionListQueryParams,
  SessionSummaryDTO,
  WorkoutPlanExerciseDTO,
} from "@/types";
import {
  sessionStartSchema,
  sessionListQuerySchema,
  sessionStatusUpdateSchema,
  sessionExerciseAutosaveSchema,
  sessionTimerUpdateSchema,
} from "@/lib/validation/workout-sessions";
import {
  findInProgressSession,
  findWorkoutSessionById,
  findWorkoutSessionsByUserId,
  insertWorkoutSession,
  insertWorkoutSessionExercises,
  updateWorkoutSessionStatus,
  updateWorkoutSessionTimer,
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
  deleteWorkoutSession,
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
  payload: unknown,
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
    const detail = await getWorkoutSessionDetail(
      supabase,
      userId,
      existingSession.id,
    );
    return { session: detail, isNew: false };
  }

  // Zweryfikuj, że plan istnieje i należy do użytkownika
  const { data: plan, error: planError } = await findWorkoutPlanById(
    supabase,
    userId,
    parsed.workout_plan_id,
  );

  if (planError) {
    throw mapDbError(planError);
  }

  if (!plan) {
    throw new ServiceError(
      "NOT_FOUND",
      "Plan treningowy nie został znaleziony lub nie należy do użytkownika.",
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
      "Plan treningowy musi zawierać co najmniej jedno ćwiczenie.",
    );
  }

  // Pobierz szczegóły ćwiczeń (pełne dane dla snapshotów)
  // Filtruj null - tylko ćwiczenia z exercise_id potrzebują pełnych danych
  const exerciseIds = planExercises
    .map((e) => e.exercise_id)
    .filter((id): id is string => id !== null);
  const { data: exercises, error: exercisesError } =
    exerciseIds.length > 0
      ? await findExercisesByIdsForSnapshots(supabase, userId, exerciseIds)
      : { data: [], error: null };

  if (exercisesError) {
    throw mapDbError(exercisesError);
  }

  // Sprawdź tylko jeśli są ćwiczenia z exercise_id
  if (
    exerciseIds.length > 0 &&
    (!exercises || exercises.length !== exerciseIds.length)
  ) {
    throw new ServiceError(
      "NOT_FOUND",
      "Niektóre ćwiczenia w planie nie istnieją lub nie należą do użytkownika.",
    );
  }

  // Utwórz mapę ćwiczeń dla szybkiego dostępu
  const exercisesMap = new Map((exercises ?? []).map((e) => [e.id, e]));

  // Utwórz sesję
  const { data: session, error: sessionError } = await insertWorkoutSession(
    supabase,
    userId,
    {
      workout_plan_id: parsed.workout_plan_id,
      plan_name_at_time: plan.name,
    },
  );

  if (sessionError) {
    throw mapDbError(sessionError);
  }

  if (!session) {
    throw new ServiceError(
      "INTERNAL",
      "Nie udało się utworzyć sesji treningowej.",
    );
  }

  // Przygotuj snapshoty ćwiczeń
  // createSessionSnapshots przyjmuje WorkoutPlanExerciseDTO[], które może mieć nullable exercise_id
  const sessionExercises = createSessionSnapshots(planExercises, exercisesMap);

  // Wstaw ćwiczenia sesji
  const { error: exercisesInsertError } = await insertWorkoutSessionExercises(
    supabase,
    session.id,
    sessionExercises,
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
  query: SessionListQueryParams,
): Promise<{
  items: SessionSummaryDTO[];
  nextCursor: string | null;
}> {
  assertUser(userId);
  const parsed = parseOrThrow(sessionListQuerySchema, query);

  const supabase = await createClient();

  try {
    const { data, nextCursor, error } = await findWorkoutSessionsByUserId(
      supabase,
      userId,
      parsed,
    );

    if (error) {
      throw mapDbError(error);
    }

    const result = {
      items: data ?? [],
      nextCursor: nextCursor ?? null,
    };

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
  id: string,
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
  payload: unknown,
): Promise<SessionSummaryDTO> {
  assertUser(userId);
  const parsed = parseOrThrow(sessionStatusUpdateSchema, payload);
  const supabase = await createClient();

  // Pobierz istniejącą sesję
  const { data: existing, error: fetchError } = await findWorkoutSessionById(
    supabase,
    userId,
    id,
  );

  if (fetchError) {
    throw mapDbError(fetchError);
  }

  if (!existing) {
    throw new ServiceError(
      "NOT_FOUND",
      "Sesja treningowa nie została znaleziona.",
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
        "Użytkownik może mieć tylko jedną sesję w trakcie jednocześnie.",
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
      completedAt ?? null,
    );

  if (updateError) {
    throw mapDbError(updateError);
  }

  if (!updated) {
    throw new ServiceError(
      "INTERNAL",
      "Nie udało się zaktualizować statusu sesji.",
    );
  }

  return updated;
}

/**
 * Aktualizuje timer sesji treningowej.
 */
export async function updateWorkoutSessionTimerService(
  userId: string,
  sessionId: string,
  payload: unknown,
): Promise<{
  id: string;
  active_duration_seconds: number;
  last_timer_started_at: string | null;
  last_timer_stopped_at: string | null;
}> {
  assertUser(userId);

  // Walidacja UUID
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(sessionId)) {
    throw new ServiceError(
      "BAD_REQUEST",
      "Nieprawidłowy format UUID identyfikatora sesji.",
    );
  }

  // Walidacja request body
  const parsed = parseOrThrow(sessionTimerUpdateSchema, payload);
  const supabase = await createClient();

  // Sprawdź istnienie sesji i status
  const { data: existing, error: fetchError } = await findWorkoutSessionById(
    supabase,
    userId,
    sessionId,
  );

  if (fetchError) {
    throw mapDbError(fetchError);
  }

  if (!existing) {
    throw new ServiceError(
      "NOT_FOUND",
      "Sesja treningowa nie została znaleziona.",
    );
  }

  // Sprawdź status sesji (musi być in_progress)
  if (existing.status !== "in_progress") {
    throw new ServiceError(
      "CONFLICT",
      "Sesja treningowa nie jest w statusie 'in_progress'.",
    );
  }

  // Wywołaj funkcję repository
  const { data: updated, error: updateError } = await updateWorkoutSessionTimer(
    supabase,
    userId,
    sessionId,
    {
      active_duration_seconds: parsed.active_duration_seconds,
      last_timer_started_at: parsed.last_timer_started_at,
      last_timer_stopped_at: parsed.last_timer_stopped_at,
    },
  );

  if (updateError) {
    throw mapDbError(updateError);
  }

  if (!updated) {
    throw new ServiceError(
      "INTERNAL",
      "Nie udało się zaktualizować timera sesji.",
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
  sessionId: string,
): Promise<SessionDetailDTO> {
  const { data: session, error: sessionError } = await findWorkoutSessionById(
    supabase,
    userId,
    sessionId,
  );

  if (sessionError) {
    throw mapDbError(sessionError);
  }

  if (!session) {
    throw new ServiceError(
      "NOT_FOUND",
      "Sesja treningowa nie została znaleziona.",
    );
  }

  // Pobierz estimated_total_time_seconds z planu, jeśli sesja ma przypisany plan
  let estimatedTotalTimeSeconds: number | null = null;
  if (session.workout_plan_id) {
    const { data: plan, error: planError } = await supabase
      .from("workout_plans")
      .select("estimated_total_time_seconds")
      .eq("id", session.workout_plan_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!planError && plan) {
      estimatedTotalTimeSeconds = plan.estimated_total_time_seconds;
    }
  }

  // Pobierz ćwiczenia sesji
  const { data: exercises, error: exercisesError } =
    await findWorkoutSessionExercises(supabase, sessionId);

  if (exercisesError) {
    throw mapDbError(exercisesError);
  }

  if (!exercises) {
    throw new ServiceError("INTERNAL", "Nie udało się pobrać ćwiczeń sesji.");
  }

  // Pobierz serie dla wszystkich ćwiczeń (batch)
  const exerciseIds = exercises.map((e) => e.id);
  const { data: sets, error: setsError } = await findWorkoutSessionSets(
    supabase,
    exerciseIds,
  );

  if (setsError) {
    throw mapDbError(setsError);
  }

  // Pobierz nazwy ćwiczeń dla exerciseInfo
  const exerciseNames = exercises
    .map((ex) => ex.exercise_title_at_time)
    .filter((name): name is string => name !== null && name !== undefined);

  return mapToDetailDTO(session, exercises, sets ?? [], {
    exercise_count: exerciseNames.length,
    exercise_names: exerciseNames,
    estimated_total_time_seconds: estimatedTotalTimeSeconds,
  });
}

/**
 * Tworzy snapshoty ćwiczeń dla sesji na podstawie planu.
 * Obsługuje ćwiczenia z exercise_id (z biblioteki) oraz bez exercise_id (snapshot z planu).
 */
function createSessionSnapshots(
  planExercises: WorkoutPlanExerciseDTO[],
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
  >,
): Array<{
  exercise_id: string | null;
  exercise_title_at_time: string;
  exercise_type_at_time: Database["public"]["Enums"]["exercise_type"];
  exercise_part_at_time: Database["public"]["Enums"]["exercise_part"];
  planned_sets: number | null;
  planned_reps: number | null;
  planned_duration_seconds: number | null;
  planned_rest_seconds: number | null;
  planned_rest_after_series_seconds: number | null;
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
    // Jeśli ćwiczenie ma exercise_id, pobierz dane z mapy
    // W przeciwnym razie użyj snapshot z planu
    let exerciseTitle: string;
    let exerciseType: Database["public"]["Enums"]["exercise_type"];
    let exercisePart: Database["public"]["Enums"]["exercise_part"];
    let exerciseId: string | null = planExercise.exercise_id;

    if (planExercise.exercise_id) {
      const exercise = exercisesMap.get(planExercise.exercise_id);
      if (!exercise) {
        // Fallback do snapshot z planu
        exerciseTitle = planExercise.exercise_title ?? "Nieznane ćwiczenie";
        exerciseType = planExercise.exercise_type ?? planExercise.section_type;
        exercisePart = planExercise.exercise_part ?? "Legs";
        exerciseId = null;
      } else {
        exerciseTitle = exercise.title;
        exerciseType = exercise.type;
        exercisePart = exercise.part;
      }
    } else {
      // Użyj snapshot z planu
      exerciseTitle = planExercise.exercise_title ?? "Nieznane ćwiczenie";
      exerciseType = planExercise.exercise_type ?? planExercise.section_type;
      exercisePart = planExercise.exercise_part ?? "Legs";
      exerciseId = null;
    }

    // Użyj planned_* z planu, jeśli dostępne
    const plannedSets = planExercise.planned_sets ?? null;
    const plannedReps = planExercise.planned_reps ?? null;
    const plannedDuration = planExercise.planned_duration_seconds ?? null;
    const plannedRest = planExercise.planned_rest_seconds ?? null;
    const plannedRestAfterSeries =
      planExercise.planned_rest_after_series_seconds ?? null;

    return {
      exercise_id: exerciseId,
      exercise_title_at_time: exerciseTitle,
      exercise_type_at_time: exerciseType,
      exercise_part_at_time: exercisePart,
      planned_sets: plannedSets,
      planned_reps: plannedReps,
      planned_duration_seconds: plannedDuration,
      planned_rest_seconds: plannedRest,
      planned_rest_after_series_seconds: plannedRestAfterSeries,
      exercise_order: index + 1,
    };
  });

  return snapshots;
}

function parseOrThrow<T>(
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

function mapDbError(error: PostgrestError) {
  if (error.code === "23505") {
    return new ServiceError(
      "CONFLICT",
      "Konflikt unikalności (np. próba utworzenia drugiej sesji in_progress).",
      error.message,
    );
  }

  if (error.code === "23503") {
    return new ServiceError(
      "NOT_FOUND",
      "Operacja narusza istniejące powiązania (np. plan nie istnieje).",
      error.message,
    );
  }

  if (error.code === "23502") {
    return new ServiceError(
      "BAD_REQUEST",
      "Brak wymaganych pól.",
      error.message,
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
      "order musi być liczbą całkowitą większą od 0",
    );
  }
}

/**
 * Sprawdza istnienie sesji i waliduje jej status.
 */
async function validateSessionForAutosave(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  sessionId: string,
) {
  const { data: session, error: sessionError } = await findWorkoutSessionById(
    supabase,
    userId,
    sessionId,
  );

  if (sessionError) {
    throw mapDbError(sessionError);
  }

  if (!session) {
    throw new ServiceError(
      "NOT_FOUND",
      "Sesja treningowa nie została znaleziona.",
    );
  }

  if (session.status !== "in_progress") {
    throw new ServiceError(
      "CONFLICT",
      "Sesja treningowa nie jest w statusie 'in_progress'.",
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
  order: number,
) {
  const { data: exercise, error: exerciseError } =
    await findWorkoutSessionExerciseByOrder(supabase, sessionId, order);

  if (exerciseError) {
    throw mapDbError(exerciseError);
  }

  if (!exercise) {
    throw new ServiceError(
      "NOT_FOUND",
      "Ćwiczenie o podanej kolejności nie zostało znalezione w sesji.",
    );
  }

  return exercise;
}

/**
 * Mapuje błędy funkcji DB na ServiceError.
 */
function mapSaveFunctionError(error: {
  message?: string;
  details?: string;
}): ServiceError {
  const message = error.message ?? "";
  const details = error.details ?? error.message;

  if (message.includes("Session not found") || message.includes("not found")) {
    return new ServiceError(
      "NOT_FOUND",
      "Sesja treningowa nie została znaleziona.",
    );
  }

  if (message.includes("Access denied") || message.includes("access denied")) {
    return new ServiceError(
      "FORBIDDEN",
      "Brak dostępu do tej sesji treningowej.",
    );
  }

  return new ServiceError(
    "INTERNAL",
    "Wystąpił błąd podczas zapisywania ćwiczenia.",
    details,
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
  advanceCursor: boolean,
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
      nextOrder,
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
  order: number,
): Promise<SessionExerciseAutosaveResponse> {
  const { data: updatedExercise, error: fetchExerciseError } =
    await findWorkoutSessionExerciseByOrder(supabase, sessionId, order);

  if (fetchExerciseError) {
    throw mapDbError(fetchExerciseError);
  }

  if (!updatedExercise) {
    throw new ServiceError(
      "INTERNAL",
      "Nie udało się pobrać zaktualizowanego ćwiczenia.",
    );
  }

  const { data: sets, error: setsError } = await findWorkoutSessionSets(
    supabase,
    [sessionExerciseId],
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
      "Nie udało się pobrać zaktualizowanej sesji.",
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
 *
 * Uwaga: Oblicza actual_reps tylko jeśli planned_reps nie jest null (ćwiczenie oparte na powtórzeniach).
 * Oblicza actual_duration_seconds tylko jeśli planned_duration_seconds nie jest null (ćwiczenie oparte na czasie).
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
  },
  plannedReps?: number | null,
  plannedDurationSeconds?: number | null,
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

  // actual_sum_reps (API) → actual_reps (DB): oblicz tylko jeśli ćwiczenie ma planowane powtórzenia
  // Jeśli planned_reps jest null, to ćwiczenie jest oparte na czasie, więc nie obliczamy sumy powtórzeń
  let actualReps: number | null = null;
  if (parsed.actual_sum_reps !== undefined) {
    actualReps = parsed.actual_sum_reps;
  } else if (
    parsed.sets &&
    parsed.sets.length > 0 &&
    plannedReps !== null &&
    plannedReps !== undefined
  ) {
    // Oblicz sumę tylko jeśli ćwiczenie ma planowane powtórzenia
    const repsWithValues = parsed.sets
      .map((set) => set.reps)
      .filter((r): r is number => r !== null && r !== undefined);

    if (repsWithValues.length > 0) {
      const sum = repsWithValues.reduce((acc, reps) => acc + reps, 0);
      actualReps = sum > 0 ? sum : null;
    }
  }

  // actual_duration_seconds: oblicz tylko jeśli ćwiczenie ma planowany czas
  // Jeśli planned_duration_seconds jest null, to ćwiczenie jest oparte na powtórzeniach, więc nie obliczamy czasu
  let actualDurationSeconds: number | null = null;
  if (parsed.actual_duration_seconds !== undefined) {
    actualDurationSeconds = parsed.actual_duration_seconds;
  } else if (
    parsed.sets &&
    parsed.sets.length > 0 &&
    plannedDurationSeconds !== null &&
    plannedDurationSeconds !== undefined
  ) {
    // Oblicz maksymalny czas tylko jeśli ćwiczenie ma planowany czas
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
  payload: unknown,
): Promise<SessionExerciseAutosaveResponse> {
  assertUser(userId);
  validateAutosavePathParams(sessionId, order);

  const parsed = parseOrThrow(sessionExerciseAutosaveSchema, payload);

  const supabase = await createClient();

  await validateSessionForAutosave(supabase, userId, sessionId);

  const exercise = await validateExerciseForAutosave(
    supabase,
    sessionId,
    order,
  );

  // Oblicz agregaty z serii, jeśli nie zostały podane ręcznie (Opcja A)
  // Przekazujemy planned_reps i planned_duration_seconds, aby funkcja wiedziała, czy obliczać powtórzenia czy czas
  const aggregates = calculateAggregatesFromSets(
    parsed,
    exercise.planned_reps,
    exercise.planned_duration_seconds,
  );

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
  } else if (parsed.is_skipped === true) {
    // Pusta tablica = wyczyść wszystkie istniejące serie
    setsDataForDb = [];
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

  const { data: sessionExerciseId, error: saveError } =
    await callSaveWorkoutSessionExercise(supabase, saveParams);

  if (saveError) {
    throw mapSaveFunctionError(saveError);
  }

  if (!sessionExerciseId) {
    throw new ServiceError(
      "INTERNAL",
      "Nie udało się zapisać ćwiczenia w sesji.",
    );
  }

  const plannedUpdates = preparePlannedUpdates(parsed);
  if (plannedUpdates) {
    const { error: updateError } = await updateWorkoutSessionExercise(
      supabase,
      sessionExerciseId,
      plannedUpdates,
    );

    if (updateError) {
      throw mapDbError(updateError);
    }
  }

  await updateCursorIfNeeded(
    supabase,
    sessionId,
    order,
    parsed.advance_cursor_to_next === true,
  );

  const result = await fetchUpdatedExerciseWithCursor(
    supabase,
    userId,
    sessionId,
    sessionExerciseId,
    order,
  );

  return result;
}

/**
 * Usuwa sesję treningową użytkownika.
 */
export async function deleteWorkoutSessionService(userId: string, id: string) {
  assertUser(userId);
  const supabase = await createClient();

  // Sprawdź, czy sesja istnieje i należy do użytkownika
  const { data: existing, error: fetchError } = await findWorkoutSessionById(
    supabase,
    userId,
    id,
  );

  if (fetchError) {
    throw mapDbError(fetchError);
  }

  if (!existing) {
    throw new ServiceError(
      "NOT_FOUND",
      "Sesja treningowa nie została znaleziona.",
    );
  }

  // Usuń sesję (ćwiczenia i serie zostaną usunięte automatycznie przez CASCADE)
  const { error } = await deleteWorkoutSession(supabase, userId, id);

  if (error) {
    throw mapDbError(error);
  }
}
