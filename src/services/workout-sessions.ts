import { ZodError } from "zod";

import { createClient } from "@/db/supabase.server";
import type { Database } from "@/db/database.types";
import type {
  SessionDetailDTO,
  SessionListQueryParams,
  SessionSummaryDTO,
} from "@/types";
import {
  sessionStartSchema,
  sessionListQuerySchema,
  sessionStatusUpdateSchema,
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
    const { data, nextCursor, error } = await findWorkoutSessionsByUserId(
      supabase,
      userId,
      parsed
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
    section_position: number;
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
  position: number;
}> {
  // Sortuj ćwiczenia planu: najpierw Warm-up, potem Main Workout, potem Cool-down
  // W ramach każdej sekcji sortuj po section_position
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

    return a.section_position - b.section_position;
  });

  // Oblicz flattened position (1, 2, 3, ...)
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
      position: index + 1, // Flattened position starting from 1
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
