import type { z } from "zod";
import { createClient } from "@/db/supabase.server";
import type { Database } from "@/db/database.types";
import type {
  SessionDetailDTO,
  SessionExerciseAutosaveResponse,
  SessionExerciseDTO,
  SessionListQueryParams,
  SessionSummaryDTO,
  WorkoutPlanExerciseDTO,
} from "@/types";
import {
  sessionStartSchema,
  sessionListQuerySchema,
  sessionStatusUpdateSchema,
  sessionExerciseAutosaveSchema,
  sessionExerciseCreateSchema,
  sessionTimerUpdateSchema,
  workoutSessionImportSchema,
} from "@/lib/validation/workout-sessions";
import {
  assertUser,
  mapDbError,
  parseOrThrow,
  ServiceError,
  validateUuid,
} from "@/lib/service-utils";
import {
  findInProgressSession,
  findWorkoutSessionById,
  findWorkoutSessionsByUserId,
  insertWorkoutSession,
  insertCompletedWorkoutSession,
  insertWorkoutSessionExercises,
  insertWorkoutSessionSets,
  callRecalculatePrForExercise,
  updateWorkoutSessionStatus,
  updateWorkoutSessionTimer,
  findWorkoutSessionExercises,
  findWorkoutSessionSets,
  findPersonalRecordsAchievedInSession,
  mapToDetailDTO,
  findExercisesByIdsForSnapshots,
  findWorkoutSessionExerciseByOrder,
  updateWorkoutSessionExercise,
  updateWorkoutSessionCursor,
  findNextExerciseOrder,
  callSaveWorkoutSessionExercise,
  mapExerciseToDTO,
  deleteWorkoutSession,
  deleteWorkoutSessionExercise,
} from "@/repositories/workout-sessions";
import {
  findWorkoutPlanById,
  listWorkoutPlanExercises,
} from "@/repositories/workout-plans";
import {
  calculateAggregatesFromSets,
  preparePlannedUpdates,
} from "@/lib/workout-sessions/aggregates";
import { markProgramSessionCompletedByWorkoutSessionId } from "@/repositories/training-programs";
import { applyCapabilitySessionResult } from "@/services/capability-profiles";
import { findByNormalizedTitle } from "@/repositories/exercises";
import { normalizeTitleForDbLookup } from "@/lib/validation/exercises";
import {
  DEFAULT_EXERCISE_VALUE,
  DEFAULT_SESSION_REST_BETWEEN_SETS_SECONDS,
  DEFAULT_SESSION_REST_AFTER_SERIES_SECONDS,
} from "@/lib/constants";
import { importWorkoutPlanService } from "@/services/workout-plans";

export { ServiceError } from "@/lib/service-utils";

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
  const workoutPlanId = parsed.workout_plan_id;

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
    workoutPlanId,
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
    await listWorkoutPlanExercises(supabase, workoutPlanId);

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
      workout_plan_id: workoutPlanId,
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

  if (parsed.status === "completed") {
    const { error: syncProgramSessionError } =
      await markProgramSessionCompletedByWorkoutSessionId(supabase, userId, id);
    if (syncProgramSessionError) {
      console.warn(
        "[updateWorkoutSessionStatusService] Failed to sync program session completion",
        syncProgramSessionError,
      );
    }
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

  validateUuid(sessionId, "id sesji");

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
  const libraryExerciseIds = exercises
    .map((exercise) => exercise.exercise_id)
    .filter((exerciseId): exerciseId is string => exerciseId !== null);
  const { data: achievedPrs, error: achievedPrsError } =
    await findPersonalRecordsAchievedInSession(
      supabase,
      userId,
      sessionId,
      libraryExerciseIds,
    );

  if (achievedPrsError) {
    throw mapDbError(achievedPrsError);
  }

  const achievedPrMetricsByExerciseId = new Map<string, Set<Database["public"]["Enums"]["pr_metric_type"]>>();
  for (const record of achievedPrs ?? []) {
    const metrics = achievedPrMetricsByExerciseId.get(record.exercise_id) ?? new Set();
    metrics.add(record.metric_type);
    achievedPrMetricsByExerciseId.set(record.exercise_id, metrics);
  }

  const detail = mapToDetailDTO(session, exercises, sets ?? [], {
    exercise_count: exerciseNames.length,
    exercise_names: exerciseNames,
    estimated_total_time_seconds: estimatedTotalTimeSeconds,
  });

  return {
    ...detail,
    exercises: detail.exercises.map((exercise) => ({
      ...exercise,
      achieved_pr_metrics:
        exercise.exercise_id != null
          ? Array.from(
              achievedPrMetricsByExerciseId.get(exercise.exercise_id) ?? [],
            )
          : [],
    })),
  };
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
      types: Database["public"]["Enums"]["exercise_type"][];
      parts: Database["public"]["Enums"]["exercise_part"][];
      is_unilateral?: boolean;
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
  exercise_is_unilateral_at_time: boolean;
  planned_sets: number | null;
  planned_reps: number | null;
  planned_duration_seconds: number | null;
  planned_rest_seconds: number | null;
  planned_rest_after_series_seconds: number | null;
  exercise_order: number;
}> {
  const typeOrder = {
    "Warm-up": 1,
    "Main Workout": 2,
    "Cool-down": 3,
  };

  // Sort: section_type → section_order → in_scope_nr (null last so scope 1,2,3 are consecutive)
  const sortedExercises = [...planExercises].sort((a, b) => {
    const aType = typeOrder[a.section_type];
    const bType = typeOrder[b.section_type];
    if (aType !== bType) return aType - bType;
    if (a.section_order !== b.section_order) return a.section_order - b.section_order;
    const aNr = a.in_scope_nr ?? 999;
    const bNr = b.in_scope_nr ?? 999;
    return aNr - bNr;
  });

  // Group into slots: same (section_type, section_order). Single = one with in_scope_nr null; scope = same scope_id.
  const slots: WorkoutPlanExerciseDTO[][] = [];
  let currentSlot: WorkoutPlanExerciseDTO[] = [];
  let currentSlotKey: string | null = null;

  for (const ex of sortedExercises) {
    const slotKey = `${ex.section_type}:${ex.section_order}`;
    const inScope = ex.in_scope_nr != null && ex.scope_id != null;
    const slotId = inScope ? `${slotKey}:${ex.scope_id}` : `${slotKey}:single`;

    if (currentSlotKey !== slotId) {
      if (currentSlot.length > 0) slots.push(currentSlot);
      currentSlot = [ex];
      currentSlotKey = slotId;
    } else {
      currentSlot.push(ex);
    }
  }
  if (currentSlot.length > 0) slots.push(currentSlot);

  // Expand scopes: each slot either 1 exercise (single) or N repeats of scope block
  const flatExercises: WorkoutPlanExerciseDTO[] = [];
  for (const slot of slots) {
    const first = slot[0];
    if (first.in_scope_nr == null || first.scope_id == null) {
      flatExercises.push(first);
      continue;
    }
    const repeatCount = Math.max(1, first.scope_repeat_count ?? 1);
    for (let r = 0; r < repeatCount; r++) {
      flatExercises.push(...slot);
    }
  }

  // Build snapshots with exercise_order 1, 2, 3...
  const snapshots = flatExercises.map((planExercise, index) => {
    // Jeśli ćwiczenie ma exercise_id, pobierz dane z mapy
    // W przeciwnym razie użyj snapshot z planu
    let exerciseTitle: string;
    let exerciseType: Database["public"]["Enums"]["exercise_type"];
    let exercisePart: Database["public"]["Enums"]["exercise_part"];
    let exerciseId: string | null = planExercise.exercise_id;

    let exerciseIsUnilateral = false;
    if (planExercise.exercise_id) {
      const exercise = exercisesMap.get(planExercise.exercise_id);
      if (exercise) {
        exerciseTitle = exercise.title;
        exerciseType = exercise.types?.[0] ?? ("Main Workout" as const);
        exercisePart = exercise.parts?.[0] ?? ("Legs" as const);
        exerciseIsUnilateral = exercise.is_unilateral ?? false;
      } else {
        // Fallback do snapshot z planu
        exerciseTitle = planExercise.exercise_title ?? "Nieznane ćwiczenie";
        exerciseType = planExercise.exercise_type ?? planExercise.section_type;
        exercisePart = planExercise.exercise_part ?? "Legs";
        exerciseId = null;
      }
    } else {
      // Użyj snapshot z planu
      exerciseTitle = planExercise.exercise_title ?? "Nieznane ćwiczenie";
      exerciseType = planExercise.exercise_type ?? planExercise.section_type;
      exercisePart = planExercise.exercise_part ?? "Legs";
      exerciseId = null;
    }
    // Plan (import/edytor) ma pierwszeństwo dla unilateral
    exerciseIsUnilateral =
      planExercise.exercise_is_unilateral ?? exerciseIsUnilateral;

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
      exercise_is_unilateral_at_time: exerciseIsUnilateral,
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


/**
 * Waliduje path parameters dla autosave.
 */
function validateAutosavePathParams(sessionId: string, order: number): void {
  validateUuid(sessionId, "id");

  if (!Number.isInteger(order) || order <= 0) {
    throw new ServiceError(
      "BAD_REQUEST",
      "order musi być liczbą całkowitą większą od 0",
    );
  }
}

/**
 * Sprawdza istnienie sesji. Edycja dozwolona dla sesji in_progress i completed.
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

  const session = await validateSessionForAutosave(supabase, userId, sessionId);

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

  // Powiązanie snapshotu (exercise_id = null) z ćwiczeniem z biblioteki —
  // np. po dodaniu go przez "Dodaj do bazy ćwiczeń" na sesji.
  if (parsed.exercise_id !== undefined && !exercise.exercise_id) {
    const { error: linkError } = await updateWorkoutSessionExercise(
      supabase,
      sessionExerciseId,
      { exercise_id: parsed.exercise_id },
    );
    if (linkError) {
      throw mapDbError(linkError);
    }

    const { error: recalcError } = await callRecalculatePrForExercise(
      supabase,
      userId,
      parsed.exercise_id,
    );
    if (recalcError) {
      console.error(
        "[autosaveWorkoutSessionExerciseService] Failed to recalculate PR after linking exercise",
        parsed.exercise_id,
        recalcError,
      );
    }
  }

  await applyCapabilitySessionResult({
    userId,
    exerciseTitle: exercise.exercise_title_at_time,
    exercisePart: exercise.exercise_part_at_time,
    plannedSets: exercise.planned_sets,
    plannedReps: exercise.planned_reps,
    plannedDurationSeconds: exercise.planned_duration_seconds,
    actualSetCount: aggregates.actual_sets,
    bestSetReps:
      parsed.sets && parsed.sets.length > 0
        ? Math.max(
            ...parsed.sets
              .map((set) => set.reps ?? 0)
              .filter((value) => Number.isFinite(value)),
          ) || null
        : null,
    bestSetDurationSeconds:
      parsed.sets && parsed.sets.length > 0
        ? Math.max(
            ...parsed.sets
              .map((set) => set.duration_seconds ?? 0)
              .filter((value) => Number.isFinite(value)),
          ) || null
        : null,
    actualReps: aggregates.actual_reps,
    actualDurationSeconds: aggregates.actual_duration_seconds,
    isSkipped: parsed.is_skipped ?? false,
  }).catch((error) => {
    console.warn(
      "[autosaveWorkoutSessionExerciseService] capability session update skipped",
      error,
    );
  });

  // Aktualizuj kursor tylko dla sesji in_progress (nie dla edycji completed)
  if (session.status === "in_progress") {
    await updateCursorIfNeeded(
      supabase,
      sessionId,
      order,
      parsed.advance_cursor_to_next === true,
    );
  }

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
 * Usuwa ćwiczenie z sesji treningowej (i kaskadowo jego serie).
 * Jeśli ćwiczenie było powiązane z biblioteką, przelicza jego PR po usunięciu
 * (usunięte serie mogły być podstawą aktualnego rekordu).
 */
export async function deleteWorkoutSessionExerciseService(
  userId: string,
  sessionId: string,
  order: number,
): Promise<void> {
  assertUser(userId);
  validateAutosavePathParams(sessionId, order);

  const supabase = await createClient();

  await validateSessionForAutosave(supabase, userId, sessionId);
  const exercise = await validateExerciseForAutosave(supabase, sessionId, order);

  const { error: deleteError } = await deleteWorkoutSessionExercise(
    supabase,
    exercise.id,
  );
  if (deleteError) {
    throw mapDbError(deleteError);
  }

  if (exercise.exercise_id) {
    const { error: recalcError } = await callRecalculatePrForExercise(
      supabase,
      userId,
      exercise.exercise_id,
    );
    if (recalcError) {
      console.error(
        "[deleteWorkoutSessionExerciseService] Failed to recalculate PR for exercise",
        exercise.exercise_id,
        recalcError,
      );
    }
  }
}

/**
 * Dodaje nowe ćwiczenie (z biblioteki) do istniejącej sesji treningowej.
 * Ćwiczenie jest dodawane bez planu i bez serii - użytkowniczka wypełnia
 * wykonanie później przez edycję sesji (patrz WorkoutSessionExerciseItemEditableM3).
 */
export async function addWorkoutSessionExerciseService(
  userId: string,
  sessionId: string,
  payload: unknown,
): Promise<SessionExerciseDTO> {
  assertUser(userId);
  validateUuid(sessionId, "id");
  const parsed = parseOrThrow(sessionExerciseCreateSchema, payload);

  const supabase = await createClient();

  await validateSessionForAutosave(supabase, userId, sessionId);

  const { data: libraryExercises, error: libraryError } =
    await findExercisesByIdsForSnapshots(supabase, userId, [
      parsed.exercise_id,
    ]);
  if (libraryError) throw mapDbError(libraryError);

  const libraryData = libraryExercises?.[0];
  if (!libraryData) {
    throw new ServiceError(
      "NOT_FOUND",
      "Ćwiczenie z biblioteki nie zostało znalezione.",
    );
  }

  const { data: existingExercises, error: existingError } =
    await findWorkoutSessionExercises(supabase, sessionId);
  if (existingError) throw mapDbError(existingError);

  const nextOrder =
    (existingExercises ?? []).reduce(
      (max, exercise) => Math.max(max, exercise.exercise_order),
      0,
    ) + 1;

  const { data: insertedRows, error: insertError } =
    await insertWorkoutSessionExercises(supabase, sessionId, [
      {
        exercise_id: libraryData.id,
        exercise_title_at_time: libraryData.title,
        exercise_type_at_time: libraryData.types?.[0] ?? DEFAULT_EXERCISE_TYPE,
        exercise_part_at_time: libraryData.parts?.[0] ?? DEFAULT_EXERCISE_PART,
        exercise_is_unilateral_at_time: libraryData.is_unilateral ?? false,
        planned_sets: null,
        planned_reps: null,
        planned_duration_seconds: null,
        planned_rest_seconds:
          libraryData.rest_in_between_seconds ??
          DEFAULT_SESSION_REST_BETWEEN_SETS_SECONDS,
        planned_rest_after_series_seconds:
          libraryData.rest_after_series_seconds ??
          DEFAULT_SESSION_REST_AFTER_SERIES_SECONDS,
        exercise_order: nextOrder,
      },
    ]);
  if (insertError) throw mapDbError(insertError);

  const insertedRow = insertedRows?.[0];
  if (!insertedRow) {
    throw new ServiceError(
      "INTERNAL",
      "Nie udało się dodać ćwiczenia do sesji.",
    );
  }

  return mapExerciseToDTO(insertedRow, []);
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

// ============================================================================
// IMPORT UKOŃCZONEJ SESJI TRENINGOWEJ Z JSON
// ============================================================================
// Patrz: openspec/changes/import-workout-session/design.md dla uzasadnienia
// decyzji projektowych (mapowanie planned -> actual, brak wagi, PR recalculation).
//
// Logika identyfikacji ćwiczeń (exercise_id / match_by_name / exercise_title
// snapshot) jest analogiczna do importWorkoutPlanService w
// @/services/workout-plans (resolveOneMatchByName, enrichExerciseFromLibrary,
// convertMissingExerciseToSnapshot) - celowo zduplikowana zamiast wydzielona,
// bo tamte helpery są prywatne i ściśle powiązane z WorkoutPlanImportPayload.

type WorkoutSessionImportPayload = z.infer<typeof workoutSessionImportSchema>;
type SessionImportExercise = WorkoutSessionImportPayload["exercises"][number];

const DEFAULT_EXERCISE_TYPE: Database["public"]["Enums"]["exercise_type"] =
  DEFAULT_EXERCISE_VALUE.section_type as Database["public"]["Enums"]["exercise_type"];
const DEFAULT_EXERCISE_PART: Database["public"]["Enums"]["exercise_part"] =
  "Legs";

type SessionLibraryExerciseData = {
  id: string;
  title: string;
  types: Database["public"]["Enums"]["exercise_type"][];
  parts: Database["public"]["Enums"]["exercise_part"][];
  is_unilateral?: boolean;
  reps: number | null;
  duration_seconds: number | null;
  series: number;
  rest_in_between_seconds: number | null;
  rest_after_series_seconds: number | null;
};

/**
 * Resolves match_by_name -> exercise_id (jeśli znaleziono w bibliotece) albo
 * konwertuje na snapshot (jeśli nie znaleziono). Mirror: resolveOneMatchByName
 * w @/services/workout-plans.
 */
async function resolveSessionMatchByName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  parsed: WorkoutSessionImportPayload,
): Promise<void> {
  for (const exercise of parsed.exercises) {
    if (!exercise.match_by_name || exercise.exercise_id) continue;

    const normalizedName = normalizeTitleForDbLookup(exercise.match_by_name);
    const { data: foundExercise, error: findError } =
      await findByNormalizedTitle(supabase, userId, normalizedName);
    if (findError) throw mapDbError(findError);

    if (foundExercise?.id) {
      exercise.exercise_id = foundExercise.id;
      exercise.match_by_name = undefined;
      continue;
    }

    // Nie znaleziono - konwersja na snapshot
    exercise.exercise_title = exercise.match_by_name;
    exercise.exercise_type ??= DEFAULT_EXERCISE_TYPE;
    exercise.exercise_part ??= parsed.part ?? undefined;
    exercise.planned_sets ??= DEFAULT_EXERCISE_VALUE.planned_sets;
    exercise.match_by_name = undefined;
  }
}

/**
 * Wzbogaca planned_* z danych biblioteki ćwiczeń (gdy exercise_id istnieje)
 * lub konwertuje na snapshot (gdy exercise_id nie istnieje/nie należy do
 * użytkownika). Mirror: enrichExerciseFromLibrary + convertMissingExerciseToSnapshot
 * w @/services/workout-plans.
 */
function enrichOrConvertSessionExercise(
  exercise: SessionImportExercise,
  libraryDataMap: Map<string, SessionLibraryExerciseData>,
): void {
  if (!exercise.exercise_id) {
    // Snapshot bez exercise_id (podany bezpośrednio exercise_title)
    exercise.exercise_type ??= DEFAULT_EXERCISE_TYPE;
    exercise.planned_sets ??= DEFAULT_EXERCISE_VALUE.planned_sets;
    return;
  }

  const libraryData = libraryDataMap.get(exercise.exercise_id);
  if (!libraryData) {
    // exercise_id podany, ale nie istnieje/nie należy do użytkownika - snapshot
    const missingId = exercise.exercise_id;
    exercise.exercise_id = null;
    if (!exercise.exercise_title) {
      exercise.exercise_title = `Ćwiczenie (ID: ${missingId})`;
    }
    exercise.exercise_type ??= DEFAULT_EXERCISE_TYPE;
    exercise.planned_sets ??= DEFAULT_EXERCISE_VALUE.planned_sets;
    return;
  }

  exercise.planned_sets ??= libraryData.series;
  exercise.planned_reps ??= libraryData.reps;
  exercise.planned_duration_seconds ??= libraryData.duration_seconds;
  exercise.planned_rest_seconds ??= libraryData.rest_in_between_seconds;
  exercise.planned_rest_after_series_seconds ??=
    libraryData.rest_after_series_seconds;
}

/**
 * Waliduje, że każde ćwiczenie ma co najmniej jedną metrykę (planned_reps lub
 * planned_duration_seconds) po wzbogaceniu - inaczej nie da się utworzyć
 * wiersza workout_session_sets (DB constraint wymaga >=1 metryki).
 */
function validateSessionExercisesHaveMetric(
  parsed: WorkoutSessionImportPayload,
): void {
  parsed.exercises.forEach((exercise, index) => {
    const hasReps =
      exercise.planned_reps !== undefined && exercise.planned_reps !== null;
    const hasDuration =
      exercise.planned_duration_seconds !== undefined &&
      exercise.planned_duration_seconds !== null;
    if (!hasReps && !hasDuration) {
      const label =
        exercise.exercise_title ?? exercise.match_by_name ?? `#${index + 1}`;
      throw new ServiceError(
        "BAD_REQUEST",
        `Ćwiczenie "${label}" musi mieć planned_reps lub planned_duration_seconds ` +
          `(bezpośrednio lub przez dane z biblioteki ćwiczeń).`,
      );
    }
  });
}

/**
 * Buduje wiersze do wstawienia do workout_session_exercises z parsed exercises.
 * actual_* = planned_* (patrz design.md - JSON zawiera tylko dane planowane).
 */
function buildSessionExerciseRows(
  parsed: WorkoutSessionImportPayload,
  libraryDataMap: Map<string, SessionLibraryExerciseData>,
): Array<{
  exercise_id: string | null;
  exercise_title_at_time: string;
  exercise_type_at_time: Database["public"]["Enums"]["exercise_type"];
  exercise_part_at_time: Database["public"]["Enums"]["exercise_part"];
  exercise_is_unilateral_at_time: boolean;
  // Zaimportowana sesja to zapis tego, co się wydarzyło — nie ma "planu",
  // więc planned_* pozostaje null (patrz design.md). Te wartości ze źródłowego
  // JSON-a służą tylko do zbudowania serii (workout_session_sets) i agregatów
  // actual_* poniżej.
  source_sets: number | null;
  source_reps: number | null;
  source_duration_seconds: number | null;
  source_rest_seconds: number | null;
  source_rest_after_series_seconds: number | null;
  exercise_order: number;
}> {
  return parsed.exercises.map((exercise, index) => {
    const libraryData = exercise.exercise_id
      ? libraryDataMap.get(exercise.exercise_id)
      : undefined;

    const title =
      libraryData?.title ?? exercise.exercise_title ?? "Nieznane ćwiczenie";
    const type =
      libraryData?.types?.[0] ?? exercise.exercise_type ?? DEFAULT_EXERCISE_TYPE;
    const part =
      libraryData?.parts?.[0] ??
      exercise.exercise_part ??
      parsed.part ??
      DEFAULT_EXERCISE_PART;
    const isUnilateral =
      exercise.exercise_is_unilateral ?? libraryData?.is_unilateral ?? false;

    return {
      exercise_id: exercise.exercise_id ?? null,
      exercise_title_at_time: title,
      exercise_type_at_time: type,
      exercise_part_at_time: part,
      exercise_is_unilateral_at_time: isUnilateral,
      source_sets: exercise.planned_sets ?? null,
      source_reps: exercise.planned_reps ?? null,
      source_duration_seconds: exercise.planned_duration_seconds ?? null,
      // Przerwa nie ma odpowiednika "actual" (nigdy nie jest porównywana z
      // wykonaniem), więc bezpiecznie wypełniamy ją wartością domyślną, gdy
      // JSON nie podaje własnej — to tylko informacja, nie "plan".
      source_rest_seconds:
        exercise.planned_rest_seconds ??
        DEFAULT_SESSION_REST_BETWEEN_SETS_SECONDS,
      source_rest_after_series_seconds:
        exercise.planned_rest_after_series_seconds ??
        DEFAULT_SESSION_REST_AFTER_SERIES_SECONDS,
      exercise_order: index + 1,
    };
  });
}

/**
 * Importuje ukończoną sesję treningową z JSON (nie tworzy workout_plans).
 * Obsługuje ćwiczenia istniejące w bazie (exercise_id / match_by_name) oraz
 * nowe (przez snapshot exercise_title). Zaimportowana sesja nie ma "planu" —
 * wartości z JSON-a zapisujemy wyłącznie jako actual_* (patrz design.md).
 */
export async function importWorkoutSessionService(
  userId: string,
  payload: unknown,
): Promise<SessionDetailDTO> {
  assertUser(userId);

  const parsed = parseOrThrow(workoutSessionImportSchema, payload);
  const supabase = await createClient();

  let createdSessionId: string | null = null;

  try {
    await resolveSessionMatchByName(supabase, userId, parsed);

    const exerciseIds = parsed.exercises
      .map((e) => e.exercise_id)
      .filter((id): id is string => Boolean(id));

    const { data: libraryExercises, error: libraryError } =
      await findExercisesByIdsForSnapshots(supabase, userId, exerciseIds);
    if (libraryError) throw mapDbError(libraryError);

    const libraryDataMap = new Map<string, SessionLibraryExerciseData>(
      (libraryExercises ?? []).map((e) => [e.id, e]),
    );

    for (const exercise of parsed.exercises) {
      enrichOrConvertSessionExercise(exercise, libraryDataMap);
    }

    validateSessionExercisesHaveMetric(parsed);

    const { data: session, error: sessionError } =
      await insertCompletedWorkoutSession(supabase, userId, {
        name: parsed.name,
      });
    if (sessionError) throw mapDbError(sessionError);
    if (!session) {
      throw new ServiceError(
        "INTERNAL",
        "Nie udało się utworzyć sesji treningowej.",
      );
    }
    createdSessionId = session.id;

    const exerciseRows = buildSessionExerciseRows(parsed, libraryDataMap);
    const exercisesToInsert = exerciseRows.map((row) => {
      const sets = row.source_sets ?? 1;
      const reps = row.source_reps ?? null;
      return {
        exercise_id: row.exercise_id,
        exercise_title_at_time: row.exercise_title_at_time,
        exercise_type_at_time: row.exercise_type_at_time,
        exercise_part_at_time: row.exercise_part_at_time,
        exercise_is_unilateral_at_time: row.exercise_is_unilateral_at_time,
        exercise_order: row.exercise_order,
        // Zaimportowana sesja nie ma "planu" — planned_* zostaje null, żeby
        // UI nie porównywał actual do wartości, które nigdy nie były planem.
        planned_sets: null,
        planned_reps: null,
        planned_duration_seconds: null,
        planned_rest_seconds: row.source_rest_seconds,
        planned_rest_after_series_seconds:
          row.source_rest_after_series_seconds,
        actual_sets: sets,
        actual_reps: reps != null ? reps * sets : null,
        actual_duration_seconds: row.source_duration_seconds ?? null,
      };
    });
    const { data: insertedExercises, error: exercisesInsertError } =
      await insertWorkoutSessionExercises(
        supabase,
        session.id,
        exercisesToInsert,
      );
    if (exercisesInsertError) throw mapDbError(exercisesInsertError);

    const insertedRows = insertedExercises ?? [];
    const recalcExerciseIds = new Set<string>();

    for (const row of insertedRows) {
      const sourceExercise = exerciseRows.find(
        (e) => e.exercise_order === row.exercise_order,
      );
      const plannedSets = sourceExercise?.source_sets ?? 1;
      const setsToInsert = Array.from(
        { length: Math.max(1, plannedSets) },
        (_, i) => ({
          set_number: i + 1,
          reps: sourceExercise?.source_reps ?? null,
          duration_seconds: sourceExercise?.source_duration_seconds ?? null,
          weight_kg: null,
        }),
      );

      const { error: setsError } = await insertWorkoutSessionSets(
        supabase,
        row.id,
        setsToInsert,
      );
      if (setsError) throw mapDbError(setsError);

      if (row.exercise_id) {
        recalcExerciseIds.add(row.exercise_id);
      }
    }

    for (const exerciseId of recalcExerciseIds) {
      const { error: recalcError } = await callRecalculatePrForExercise(
        supabase,
        userId,
        exerciseId,
      );
      if (recalcError) {
        // Nie przerywamy importu, jeśli przeliczenie PR się nie powiedzie -
        // sesja i dane treningowe są już zapisane poprawnie.
        console.error(
          "[importWorkoutSessionService] Failed to recalculate PR for exercise",
          exerciseId,
          recalcError,
        );
      }
    }

    return await getWorkoutSessionService(userId, session.id);
  } catch (error) {
    if (createdSessionId) {
      await supabase
        .from("workout_sessions")
        .delete()
        .eq("id", createdSessionId);
    }
    console.error("[importWorkoutSessionService] Error:", error);
    throw error;
  }
}

/**
 * Buduje nazwę nowego planu na podstawie nazwy powtarzanej sesji, z
 * uwzględnieniem limitu długości nazwy planu (nameSchema, max 120 znaków).
 */
function buildRepeatPlanName(originalName: string | null): string {
  const base = originalName?.trim() || "Trening";
  const suffix = " (powtórka)";
  const maxLen = 120;
  if (base.length + suffix.length <= maxLen) {
    return `${base}${suffix}`;
  }
  return `${base.slice(0, Math.max(0, maxLen - suffix.length))}${suffix}`;
}

/**
 * Konwertuje ukończoną (lub jakąkolwiek) sesję treningową na payload zgodny
 * z workoutPlanImportSchema, tak by można ją "powtórzyć" jako nowy plan.
 * Wartości "rzeczywiste" (actual_*) stają się nowym "planem" — sesja nie ma
 * własnego planu (patrz importWorkoutSessionService), więc bazujemy na tym,
 * co faktycznie zostało wykonane; dla sesji opartych na realnym planie
 * (workout_plan_id != null) actual_* i planned_* zwykle są zbliżone.
 */
function buildWorkoutPlanImportPayloadFromSession(session: SessionDetailDTO) {
  const sectionOrderCounters = new Map<string, number>();

  const exercises = [...session.exercises]
    .filter((exercise) => !exercise.is_skipped)
    .sort((a, b) => a.exercise_order - b.exercise_order)
    .map((exercise) => {
      const sectionType = exercise.exercise_type_at_time ?? "Main Workout";
      const nextOrder = (sectionOrderCounters.get(sectionType) ?? 0) + 1;
      sectionOrderCounters.set(sectionType, nextOrder);

      const sets = exercise.actual_count_sets ?? exercise.planned_sets ?? 1;
      const totalReps = exercise.actual_sum_reps ?? null;
      let reps: number | null =
        totalReps != null && sets > 0 ? Math.round(totalReps / sets) : null;
      const durationSeconds: number | null =
        reps == null
          ? exercise.actual_duration_seconds ??
            exercise.planned_duration_seconds ??
            null
          : null;

      // workoutPlanExerciseImportSchema wymaga co najmniej jednej metryki dla
      // nowych (snapshot) ćwiczeń — jeśli sesja nie ma żadnych danych, wstaw
      // bezpieczny fallback, użytkowniczka i tak poprawi to w planie.
      if (reps == null && durationSeconds == null) {
        reps = 1;
      }

      const base = {
        section_type: sectionType,
        section_order: nextOrder,
        planned_sets: sets,
        planned_reps: reps,
        planned_duration_seconds: durationSeconds,
        planned_rest_seconds: exercise.planned_rest_seconds ?? null,
        planned_rest_after_series_seconds:
          exercise.planned_rest_after_series_seconds ?? null,
        exercise_is_unilateral: Boolean(
          exercise.exercise_is_unilateral_at_time,
        ),
      };

      if (exercise.exercise_id) {
        return { ...base, exercise_id: exercise.exercise_id };
      }

      return {
        ...base,
        exercise_title: exercise.exercise_title_at_time,
        exercise_type: sectionType,
        exercise_part: exercise.exercise_part_at_time ?? null,
      };
    });

  return {
    name: buildRepeatPlanName(session.plan_name_at_time),
    description: null,
    part: null,
    exercises,
  };
}

/**
 * "Wykonaj ponownie": tworzy nowy plan treningowy z ćwiczeń i wartości
 * (actual_*) ukończonej sesji, a następnie natychmiast rozpoczyna z niego
 * nową sesję treningową (in_progress). Zwraca id nowej sesji, do której UI
 * przekierowuje na /workout-sessions/{id}/active.
 */
export async function repeatWorkoutSessionService(
  userId: string,
  sessionId: string,
): Promise<{ session_id: string; plan_id: string }> {
  assertUser(userId);
  validateUuid(sessionId, "id sesji treningowej");

  const session = await getWorkoutSessionService(userId, sessionId);

  const repeatableExercises = session.exercises.filter(
    (exercise) => !exercise.is_skipped,
  );
  if (repeatableExercises.length === 0) {
    throw new ServiceError(
      "BAD_REQUEST",
      "Sesja nie ma żadnych (nieopuszczonych) ćwiczeń do powtórzenia.",
    );
  }

  const payload = buildWorkoutPlanImportPayloadFromSession(session);
  const plan = await importWorkoutPlanService(userId, payload);
  const { session: newSession } = await startWorkoutSessionService(userId, {
    workout_plan_id: plan.id,
  });

  return { session_id: newSession.id, plan_id: plan.id };
}
