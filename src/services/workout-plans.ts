import { ZodError } from "zod";

import { createClient } from "@/db/supabase.server";
import type { Database } from "@/db/database.types";
import type { PlanQueryParams, WorkoutPlanDTO } from "@/types";
import {
  workoutPlanQuerySchema,
  validateWorkoutPlanBusinessRules,
  workoutPlanCreateSchema,
  workoutPlanUpdateSchema,
} from "@/lib/validation/workout-plans";
import {
  findWorkoutPlanById,
  findExercisesByIds,
  findWorkoutPlansByUserId,
  insertWorkoutPlan,
  insertWorkoutPlanExercises,
  listWorkoutPlanExercises,
  updateWorkoutPlan,
  updateWorkoutPlanExercise,
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
 * Tworzy nowy plan treningowy z ćwiczeniami.
 */
export async function createWorkoutPlanService(
  userId: string,
  payload: unknown
): Promise<WorkoutPlanDTO> {
  assertUser(userId);
  const parsed = parseOrThrow(workoutPlanCreateSchema, payload);

  // Walidacja domenowa została już wykonana w schemacie Zod,
  // ale sprawdzamy jeszcze raz dla pewności
  const domainErrors = validateWorkoutPlanBusinessRules(parsed.exercises);

  if (domainErrors.length) {
    throw new ServiceError("BAD_REQUEST", domainErrors.join(" "));
  }

  const supabase = await createClient();

  // Batch weryfikacja własności ćwiczeń
  const exerciseIds = parsed.exercises.map((e) => e.exercise_id);
  const { data: ownedExercises, error: exercisesError } =
    await findExercisesByIds(supabase, userId, exerciseIds);

  if (exercisesError) {
    throw mapDbError(exercisesError);
  }

  if (!ownedExercises || ownedExercises.length !== exerciseIds.length) {
    throw new ServiceError(
      "NOT_FOUND",
      "Niektóre ćwiczenia nie istnieją lub nie należą do użytkownika."
    );
  }

  // Transakcja: wstaw plan + ćwiczenia
  // Supabase nie obsługuje transakcji bezpośrednio, więc używamy rpc lub wykonujemy sekwencyjnie
  // W przypadku błędu przy wstawianiu ćwiczeń, plan zostanie utworzony - to jest akceptowalne,
  // ponieważ możemy go później usunąć lub naprawić
  const { data: plan, error: planError } = await insertWorkoutPlan(
    supabase,
    userId,
    {
      name: parsed.name,
      description: parsed.description,
      part: parsed.part,
    }
  );

  if (planError) {
    throw mapDbError(planError);
  }

  if (!plan) {
    throw new ServiceError(
      "INTERNAL",
      "Nie udało się utworzyć planu treningowego."
    );
  }

  const { error: exercisesInsertError } = await insertWorkoutPlanExercises(
    supabase,
    plan.id,
    parsed.exercises
  );

  if (exercisesInsertError) {
    // Jeśli wstawienie ćwiczeń się nie powiodło, próbujemy usunąć plan
    // (w rzeczywistości powinniśmy użyć transakcji, ale Supabase nie ma bezpośredniego wsparcia)
    await supabase.from("workout_plans").delete().eq("id", plan.id);
    throw mapDbError(exercisesInsertError);
  }

  // Pobierz utworzony plan z ćwiczeniami
  const { data: planWithExercises, error: fetchError } =
    await listWorkoutPlanExercises(supabase, plan.id);

  if (fetchError) {
    throw mapDbError(fetchError);
  }

  return {
    ...plan,
    exercises: planWithExercises ?? [],
  };
}

/**
 * Pobiera listę planów treningowych użytkownika.
 */
export async function listWorkoutPlansService(
  userId: string,
  query: PlanQueryParams
): Promise<{
  items: Omit<WorkoutPlanDTO, "exercises">[];
  nextCursor: string | null;
}> {
  assertUser(userId);
  const parsed = parseOrThrow(workoutPlanQuerySchema, query);

  const supabase = await createClient();

  try {
    const { data, nextCursor, error } = await findWorkoutPlansByUserId(
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
 * Pobiera plan treningowy po ID z pełną listą ćwiczeń.
 */
export async function getWorkoutPlanService(
  userId: string,
  id: string
): Promise<WorkoutPlanDTO> {
  assertUser(userId);
  const supabase = await createClient();

  const { data: plan, error: planError } = await findWorkoutPlanById(
    supabase,
    userId,
    id
  );

  if (planError) {
    throw mapDbError(planError);
  }

  if (!plan) {
    throw new ServiceError(
      "NOT_FOUND",
      "Plan treningowy nie został znaleziony."
    );
  }

  const { data: exercises, error: exercisesError } =
    await listWorkoutPlanExercises(supabase, id);

  if (exercisesError) {
    throw mapDbError(exercisesError);
  }

  return {
    ...plan,
    exercises: exercises ?? [],
  };
}

/**
 * Aktualizuje plan treningowy.
 */
export async function updateWorkoutPlanService(
  userId: string,
  id: string,
  payload: unknown
): Promise<WorkoutPlanDTO> {
  assertUser(userId);
  const patch = parseOrThrow(workoutPlanUpdateSchema, payload);
  const supabase = await createClient();

  // Pobierz istniejący plan
  const { data: existing, error: fetchError } = await findWorkoutPlanById(
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
      "Plan treningowy nie został znaleziony."
    );
  }

  // Jeśli exercises podane, wykonaj częściowe aktualizacje ćwiczeń
  if (patch.exercises !== undefined && patch.exercises.length > 0) {
    // Pobierz istniejące ćwiczenia planu, aby zweryfikować czy id są poprawne
    const { data: existingExercises, error: fetchExercisesError } =
      await listWorkoutPlanExercises(supabase, id);

    if (fetchExercisesError) {
      throw mapDbError(fetchExercisesError);
    }

    const existingExerciseIds = new Set(
      (existingExercises ?? []).map((e) => e.id)
    );

    // Aktualizuj każde ćwiczenie osobno
    for (const exerciseUpdate of patch.exercises) {
      // Sprawdź czy ćwiczenie istnieje w planie
      if (!existingExerciseIds.has(exerciseUpdate.id)) {
        throw new ServiceError(
          "NOT_FOUND",
          `Ćwiczenie o id ${exerciseUpdate.id} nie istnieje w tym planie treningowym.`
        );
      }

      // Jeśli exercise_id jest podane, zweryfikuj czy należy do użytkownika
      if (exerciseUpdate.exercise_id) {
        const { data: ownedExercise, error: exerciseError } =
          await findExercisesByIds(supabase, userId, [
            exerciseUpdate.exercise_id,
          ]);

        if (exerciseError) {
          throw mapDbError(exerciseError);
        }

        if (!ownedExercise || ownedExercise.length === 0) {
          throw new ServiceError(
            "NOT_FOUND",
            `Ćwiczenie o exercise_id ${exerciseUpdate.exercise_id} nie istnieje lub nie należy do użytkownika.`
          );
        }
      }

      // Przygotuj dane do aktualizacji (tylko podane pola)
      const updateData: Database["public"]["Tables"]["workout_plan_exercises"]["Update"] =
        {};

      if (exerciseUpdate.exercise_id !== undefined) {
        updateData.exercise_id = exerciseUpdate.exercise_id;
      }
      if (exerciseUpdate.section_type !== undefined) {
        updateData.section_type =
          exerciseUpdate.section_type as Database["public"]["Enums"]["exercise_type"];
      }
      if (exerciseUpdate.section_order !== undefined) {
        updateData.section_order = exerciseUpdate.section_order;
      }
      if (exerciseUpdate.planned_sets !== undefined) {
        updateData.planned_sets = exerciseUpdate.planned_sets ?? null;
      }
      if (exerciseUpdate.planned_reps !== undefined) {
        updateData.planned_reps = exerciseUpdate.planned_reps ?? null;
      }
      if (exerciseUpdate.planned_duration_seconds !== undefined) {
        updateData.planned_duration_seconds =
          exerciseUpdate.planned_duration_seconds ?? null;
      }
      if (exerciseUpdate.planned_rest_seconds !== undefined) {
        updateData.planned_rest_seconds =
          exerciseUpdate.planned_rest_seconds ?? null;
      }

      // Aktualizuj ćwiczenie
      const { error: updateError } = await updateWorkoutPlanExercise(
        supabase,
        id,
        exerciseUpdate.id,
        updateData
      );

      if (updateError) {
        throw mapDbError(updateError);
      }
    }
  }

  // Aktualizuj metadane planu (jeśli podane)
  if (
    patch.name !== undefined ||
    patch.description !== undefined ||
    patch.part !== undefined
  ) {
    const { error: updateError } = await updateWorkoutPlan(
      supabase,
      userId,
      id,
      {
        name: patch.name,
        description: patch.description,
        part: patch.part,
      }
    );

    if (updateError) {
      throw mapDbError(updateError);
    }
  }

  // Pobierz zaktualizowany plan z ćwiczeniami
  const { data: planWithExercises, error: fetchUpdatedError } =
    await listWorkoutPlanExercises(supabase, id);

  if (fetchUpdatedError) {
    throw mapDbError(fetchUpdatedError);
  }

  // Pobierz aktualne metadane planu
  const { data: currentPlan, error: currentPlanError } =
    await findWorkoutPlanById(supabase, userId, id);

  if (currentPlanError) {
    throw mapDbError(currentPlanError);
  }

  if (!currentPlan) {
    throw new ServiceError(
      "INTERNAL",
      "Nie udało się pobrać zaktualizowanego planu treningowego."
    );
  }

  return {
    ...currentPlan,
    exercises: planWithExercises ?? [],
  };
}

/**
 * Usuwa plan treningowy.
 */
export async function deleteWorkoutPlanService(userId: string, id: string) {
  assertUser(userId);
  const supabase = await createClient();

  const { data: existing, error: fetchError } = await findWorkoutPlanById(
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
      "Plan treningowy nie został znaleziony."
    );
  }

  // Usunięcie planu automatycznie usuwa ćwiczenia (CASCADE)
  const { error } = await supabase
    .from("workout_plans")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);

  if (error) {
    throw mapDbError(error);
  }
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
      "Duplikat pozycji w sekcji planu treningowego.",
      error.message
    );
  }

  if (error.code === "23503") {
    return new ServiceError(
      "CONFLICT",
      "Operacja narusza istniejące powiązania.",
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
