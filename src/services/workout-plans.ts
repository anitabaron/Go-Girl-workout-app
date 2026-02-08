import type { z } from "zod";
import { createClient } from "@/db/supabase.server";
import type { Database } from "@/db/database.types";
import type {
  PlanQueryParams,
  WorkoutPlanDTO,
  WorkoutPlanExerciseInput,
  WorkoutPlanExerciseDTO,
  WorkoutPlanExerciseUpdateOrCreate,
} from "@/types";
import {
  workoutPlanQuerySchema,
  validateWorkoutPlanBusinessRules,
  workoutPlanCreateSchema,
  workoutPlanUpdateSchema,
  workoutPlanImportSchema,
} from "@/lib/validation/workout-plans";
import { DEFAULT_EXERCISE_VALUE } from "@/lib/constants";
import {
  assertUser,
  mapDbError as mapDbErrorBase,
  parseOrThrow,
  ServiceError,
} from "@/lib/service-utils";
import {
  findWorkoutPlanById,
  findExercisesByIds,
  findExercisesByIdsWithFullData,
  findWorkoutPlansByUserId,
  insertWorkoutPlan,
  insertWorkoutPlanExercises,
  listWorkoutPlanExercises,
  updateWorkoutPlan,
  updateWorkoutPlanExercise,
  updateWorkoutPlanExercisesBySnapshotId,
  deleteWorkoutPlanExercisesByIds,
} from "@/repositories/workout-plans";
import { findByNormalizedTitle } from "@/repositories/exercises";
import { normalizeTitleForDbLookup } from "@/lib/validation/exercises";
import { mapExerciseUpdateToDb } from "@/lib/workout-plans/map-exercise-update-to-db";
import { createSnapshotIdFactory } from "@/lib/workout-plan-snapshot-id";

export { ServiceError } from "@/lib/service-utils";

const MAP_DB_ERROR_OVERRIDES = {
  "23505": {
    code: "CONFLICT" as const,
    message: "Duplikat pozycji w sekcji planu treningowego.",
  },
  "23503": {
    code: "CONFLICT" as const,
    message: "Operacja narusza istniejące powiązania.",
  },
};

function mapDbError(error: Parameters<typeof mapDbErrorBase>[0]) {
  return mapDbErrorBase(error, MAP_DB_ERROR_OVERRIDES);
}

/**
 * Oblicza szacunkowy całkowity czas treningu na podstawie ćwiczeń.
 * Sumuje exercise_estimated_set_time_seconds ze wszystkich ćwiczeń.
 */
function calculateEstimatedTotalTime(
  exercises: WorkoutPlanExerciseDTO[]
): number | null {
  const total = exercises.reduce((sum, exercise) => {
    const estimatedSetTime = exercise.exercise_estimated_set_time_seconds;
    if (estimatedSetTime !== null && estimatedSetTime !== undefined) {
      return sum + estimatedSetTime;
    }
    return sum;
  }, 0);

  return total > 0 ? total : null;
}

/**
 * Wykonuje aktualizacje ćwiczeń planu: temp order, update istniejących, insert nowych.
 * Wydzielone dla SRP – updateWorkoutPlanService deleguje logikę ćwiczeń tutaj.
 */
async function applyExerciseUpdates(
  supabase: Awaited<ReturnType<typeof createClient>>,
  planId: string,
  exercises: WorkoutPlanExerciseUpdateOrCreate[],
  userId: string
): Promise<void> {
  const { data: existingExercises, error: fetchExercisesError } =
    await listWorkoutPlanExercises(supabase, planId);

  if (fetchExercisesError) {
    throw mapDbError(fetchExercisesError);
  }

  const existingExerciseIds = new Set(
    (existingExercises ?? []).map((e) => e.id)
  );

  const exercisesToUpdate = exercises.filter((e) => e.id !== undefined);
  const exercisesToCreate = exercises.filter((e) => e.id === undefined);

  const payloadIds = new Set(
    exercisesToUpdate.map((e) => e.id).filter((id): id is string => !!id)
  );
  const exercisesToDelete = (existingExercises ?? [])
    .map((e) => e.id)
    .filter((id) => !payloadIds.has(id));

  if (exercisesToDelete.length > 0) {
    const { error: deleteError } = await deleteWorkoutPlanExercisesByIds(
      supabase,
      planId,
      exercisesToDelete
    );
    if (deleteError) {
      throw mapDbError(deleteError);
    }
  }

  const hasSectionOrderChanges = exercisesToUpdate.some(
    (e) => e.section_order !== undefined && e.id !== undefined
  );

  // Mapa id -> docelowy section_order (obliczona z kolejności w payloadzie).
  // Używana gdy hasSectionOrderChanges i section_order mogło zginąć w serializacji.
  // Sortujemy według section_type i section_order, aby zachować poprawną kolejność przy reorderze.
  const intendedSectionOrderById = new Map<string, number>();
  if (hasSectionOrderChanges) {
    const SECTION_TYPE_ORDER: Record<string, number> = {
      "Warm-up": 1,
      "Main Workout": 2,
      "Cool-down": 3,
    };
    const sorted = [...exercisesToUpdate].sort((a, b) => {
      const typeDiff =
        (SECTION_TYPE_ORDER[a.section_type ?? ""] ?? 999) -
        (SECTION_TYPE_ORDER[b.section_type ?? ""] ?? 999);
      if (typeDiff !== 0) return typeDiff;
      return (a.section_order ?? 0) - (b.section_order ?? 0);
    });
    const sectionOrderCounters = new Map<string, number>();
    for (const ex of sorted) {
      if (!ex.id || !ex.section_type) continue;
      const sectionType = ex.section_type;
      const nextOrder = (sectionOrderCounters.get(sectionType) ?? 0) + 1;
      sectionOrderCounters.set(sectionType, nextOrder);
      intendedSectionOrderById.set(ex.id, nextOrder);
    }
  }

  if (hasSectionOrderChanges) {
    // Temp-update WSZYSTKICH ćwiczeń do aktualizacji – nie tylko tych z section_order w payloadzie.
    // Gdy section_order zniknie w serializacji, ćwiczenie nie byłoby temp-update'owane i zostawałoby
    // na starej pozycji, co powoduje konflikt (23505) przy aktualizacji innych ćwiczeń.
    const exercisesToTempUpdate = exercisesToUpdate.map((e) => ({
      id: e.id as string,
    }));

    let tempOrder = 100000;
    for (const update of exercisesToTempUpdate) {
      const { error: tempUpdateError } = await updateWorkoutPlanExercise(
        supabase,
        planId,
        update.id,
        { section_order: tempOrder }
      );

      if (tempUpdateError) {
        throw mapDbError(tempUpdateError);
      }

      tempOrder += 1;
    }
  }

  for (const exerciseUpdate of exercisesToUpdate) {
    if (!exerciseUpdate.id) {
      continue;
    }

    if (!existingExerciseIds.has(exerciseUpdate.id)) {
      throw new ServiceError(
        "NOT_FOUND",
        `Ćwiczenie o id ${exerciseUpdate.id} nie istnieje w tym planie treningowym.`
      );
    }

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

    const updateData = mapExerciseUpdateToDb(
      exerciseUpdate as WorkoutPlanExerciseUpdateOrCreate & { id: string }
    );

    // Po temp update MUSIMY nadpisać section_order docelową wartością (1, 2, 3...).
    // Gdy section_order zniknie w payloadzie (np. serializacja), używamy intendedSectionOrderById.
    if (
      hasSectionOrderChanges &&
      intendedSectionOrderById.has(exerciseUpdate.id)
    ) {
      const intendedOrder = intendedSectionOrderById.get(exerciseUpdate.id);
      if (intendedOrder !== undefined) {
        updateData.section_order =
          exerciseUpdate.section_order ?? intendedOrder;
      }
    }

    if (Object.keys(updateData).length === 0) {
      continue;
    }

    const { error: updateError } = await updateWorkoutPlanExercise(
      supabase,
      planId,
      exerciseUpdate.id,
      updateData
    );

    if (updateError) {
      throw mapDbError(updateError);
    }
  }

  if (exercisesToCreate.length > 0) {
    const exerciseIdsToVerify = exercisesToCreate
      .map((e) => e.exercise_id)
      .filter((id): id is string => id !== undefined && id !== null);

    if (exerciseIdsToVerify.length > 0) {
      const { data: ownedExercises, error: exerciseError } =
        await findExercisesByIds(supabase, userId, exerciseIdsToVerify);

      if (exerciseError) {
        throw mapDbError(exerciseError);
      }

      const ownedExerciseIds = new Set((ownedExercises ?? []).map((e) => e.id));

      for (const newExercise of exercisesToCreate) {
        if (
          newExercise.exercise_id &&
          !ownedExerciseIds.has(newExercise.exercise_id)
        ) {
          throw new ServiceError(
            "NOT_FOUND",
            `Ćwiczenie o exercise_id ${newExercise.exercise_id} nie istnieje lub nie należy do użytkownika.`
          );
        }
      }
    }

    const getSnapshotId = createSnapshotIdFactory();

    const exercisesToInsert: Array<
      WorkoutPlanExerciseInput & {
        exercise_title?: string | null;
        exercise_type?: Database["public"]["Enums"]["exercise_type"] | null;
        exercise_part?: Database["public"]["Enums"]["exercise_part"] | null;
        exercise_details?: string | null;
        snapshot_id?: string | null;
      }
    > = exercisesToCreate.map((exercise) => {
      const snapshotId =
        !exercise.exercise_id && exercise.exercise_title
          ? getSnapshotId(
              exercise.exercise_title,
              exercise.exercise_type ?? null,
              exercise.exercise_part ?? null
            )
          : null;

      const exerciseDetails = (
        exercise as WorkoutPlanExerciseInput & {
          exercise_details?: string | null;
        }
      ).exercise_details;

      return {
        exercise_id: exercise.exercise_id ?? null,
        snapshot_id: snapshotId,
        exercise_title: exercise.exercise_title ?? null,
        exercise_type: exercise.exercise_type ?? null,
        exercise_part: exercise.exercise_part ?? null,
        exercise_details: exerciseDetails ?? null,
        section_type: exercise.section_type,
        section_order: exercise.section_order,
        planned_sets: exercise.planned_sets ?? null,
        planned_reps: exercise.planned_reps ?? null,
        planned_duration_seconds: exercise.planned_duration_seconds ?? null,
        planned_rest_seconds: exercise.planned_rest_seconds ?? null,
        planned_rest_after_series_seconds:
          exercise.planned_rest_after_series_seconds ?? null,
        estimated_set_time_seconds: exercise.estimated_set_time_seconds ?? null,
      };
    });

    const { error: insertError } = await insertWorkoutPlanExercises(
      supabase,
      planId,
      exercisesToInsert
    );

    if (insertError) {
      throw mapDbError(insertError);
    }
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

  // Oblicz i zaktualizuj szacunkowy całkowity czas treningu
  const estimatedTotalTime = calculateEstimatedTotalTime(
    planWithExercises ?? []
  );
  const { error: updateTimeError } = await updateWorkoutPlan(
    supabase,
    userId,
    plan.id,
    { estimated_total_time_seconds: estimatedTotalTime }
  );

  if (updateTimeError) {
    // Logujemy błąd, ale nie przerywamy - plan został już utworzony
    console.error(
      "[createWorkoutPlanService] Failed to update estimated_total_time_seconds:",
      updateTimeError
    );
  }

  // Pobierz zaktualizowany plan z estimated_total_time_seconds
  const { data: updatedPlan, error: fetchUpdatedError } =
    await findWorkoutPlanById(supabase, userId, plan.id);

  if (fetchUpdatedError) {
    throw mapDbError(fetchUpdatedError);
  }

  return {
    ...(updatedPlan ?? plan),
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
  items: (Omit<WorkoutPlanDTO, "exercises"> & {
    exercise_count?: number;
    exercise_names?: string[];
    exercise_summaries?: import("@/types").PlanExerciseSummary[];
    has_missing_exercises?: boolean;
  })[];
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

  if (patch.exercises !== undefined && patch.exercises.length > 0) {
    await applyExerciseUpdates(
      supabase,
      id,
      patch.exercises as WorkoutPlanExerciseUpdateOrCreate[],
      userId
    );
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

  // Oblicz i zaktualizuj szacunkowy całkowity czas treningu (tylko jeśli ćwiczenia zostały zaktualizowane)
  if (patch.exercises !== undefined) {
    const estimatedTotalTime = calculateEstimatedTotalTime(
      planWithExercises ?? []
    );
    const { error: updateTimeError } = await updateWorkoutPlan(
      supabase,
      userId,
      id,
      { estimated_total_time_seconds: estimatedTotalTime }
    );

    if (updateTimeError) {
      // Logujemy błąd, ale nie przerywamy - ćwiczenia zostały już zaktualizowane
      console.error(
        "[updateWorkoutPlanService] Failed to update estimated_total_time_seconds:",
        updateTimeError
      );
    }
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

type WorkoutPlanImportPayload = z.infer<typeof workoutPlanImportSchema>;
type ImportExercise = WorkoutPlanImportPayload["exercises"][number];

type ExerciseDataMap = Map<
  string,
  {
    series: number;
    reps: number | null;
    duration_seconds: number | null;
    rest_in_between_seconds: number | null;
    rest_after_series_seconds: number | null;
    estimated_set_time_seconds: number | null;
  }
>;

function normalizeImportSectionTypeAndOrder(
  parsed: WorkoutPlanImportPayload
): void {
  for (const exercise of parsed.exercises) {
    exercise.section_type ??=
      DEFAULT_EXERCISE_VALUE.section_type as ImportExercise["section_type"];
  }
  const sectionOrderCounters = new Map<string, number>();
  for (const exercise of parsed.exercises) {
    if (
      exercise.section_order === undefined ||
      exercise.section_order === null
    ) {
      const next = (sectionOrderCounters.get(exercise.section_type!) ?? 0) + 1;
      sectionOrderCounters.set(exercise.section_type!, next);
      exercise.section_order = next;
    }
  }
}

function validateImportDomainRules(parsed: WorkoutPlanImportPayload): void {
  const domainErrors = validateWorkoutPlanBusinessRules(
    parsed.exercises.map(
      (e) =>
        ({
          exercise_id: e.exercise_id ?? undefined,
          section_type: e.section_type,
          section_order: e.section_order,
          planned_sets: e.planned_sets,
          planned_reps: e.planned_reps,
          planned_duration_seconds: e.planned_duration_seconds,
          planned_rest_seconds: e.planned_rest_seconds,
          planned_rest_after_series_seconds:
            e.planned_rest_after_series_seconds,
          estimated_set_time_seconds: e.estimated_set_time_seconds,
        } as WorkoutPlanExerciseInput)
    )
  );
  if (domainErrors.length) {
    throw new ServiceError("BAD_REQUEST", domainErrors.join(" "));
  }
}

function applyDefaultsForSnapshotExercise(ex: ImportExercise): void {
  if (ex.exercise_id) return;
  ex.section_type ??=
    DEFAULT_EXERCISE_VALUE.section_type as ImportExercise["section_type"];
  ex.planned_sets ??= DEFAULT_EXERCISE_VALUE.planned_sets;
  ex.planned_reps ??= DEFAULT_EXERCISE_VALUE.planned_reps;
  ex.planned_duration_seconds ??=
    DEFAULT_EXERCISE_VALUE.planned_duration_seconds ?? null;
  ex.planned_rest_seconds ??= DEFAULT_EXERCISE_VALUE.planned_rest_seconds;
  ex.planned_rest_after_series_seconds ??=
    DEFAULT_EXERCISE_VALUE.planned_rest_after_series_seconds;
  ex.estimated_set_time_seconds ??=
    DEFAULT_EXERCISE_VALUE.estimated_set_time_seconds;
}

function applyMatchedExercise(
  exercise: ImportExercise,
  foundId: string,
  matchedName: string
): void {
  exercise.exercise_id = foundId;
  exercise.match_by_name = undefined;
  console.log(
    `[importWorkoutPlanService] Znaleziono: "${matchedName}" -> exercise_id: ${foundId}`
  );
}

function applySnapshotFromMatchByName(
  parsed: WorkoutPlanImportPayload,
  exercise: ImportExercise,
  normalizedName: string
): void {
  exercise.exercise_title = exercise.match_by_name!;
  if (!exercise.exercise_type) exercise.exercise_type = exercise.section_type;
  if (!exercise.exercise_part)
    exercise.exercise_part = parsed.part ?? undefined;
  exercise.match_by_name = undefined;
  applyDefaultsForSnapshotExercise(exercise);
  console.log(
    `[importWorkoutPlanService] Nie znaleziono ćwiczenia: "${exercise.exercise_title}" (znormalizowane: "${normalizedName}") - używam snapshot z domyślnymi parametrami`
  );
}

async function resolveOneMatchByName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  parsed: WorkoutPlanImportPayload,
  exercise: ImportExercise
): Promise<void> {
  if (!exercise.match_by_name || exercise.exercise_id) return;
  const normalizedName = normalizeTitleForDbLookup(exercise.match_by_name);
  const { data: foundExercise, error: findError } = await findByNormalizedTitle(
    supabase,
    userId,
    normalizedName
  );
  if (findError) throw mapDbError(findError);
  if (foundExercise?.id) {
    applyMatchedExercise(exercise, foundExercise.id, exercise.match_by_name);
    return;
  }
  applySnapshotFromMatchByName(parsed, exercise, normalizedName);
}

async function resolveMatchByNameInExercises(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  parsed: WorkoutPlanImportPayload
): Promise<void> {
  for (const exercise of parsed.exercises) {
    await resolveOneMatchByName(supabase, userId, parsed, exercise);
  }
}

async function loadExerciseDataAndMissingIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  exerciseIds: string[]
): Promise<{ exercisesDataMap: ExerciseDataMap; missingExercises: string[] }> {
  const missingExercises: string[] = [];
  const exercisesDataMap: ExerciseDataMap = new Map();
  if (exerciseIds.length === 0) {
    return { exercisesDataMap, missingExercises };
  }
  const { data: exercisesWithData, error: exercisesDataError } =
    await findExercisesByIdsWithFullData(supabase, userId, exerciseIds);
  if (exercisesDataError) throw mapDbError(exercisesDataError);
  if (exercisesWithData) {
    for (const exercise of exercisesWithData) {
      exercisesDataMap.set(exercise.id, {
        series: exercise.series,
        reps: exercise.reps,
        duration_seconds: exercise.duration_seconds,
        rest_in_between_seconds: exercise.rest_in_between_seconds,
        rest_after_series_seconds: exercise.rest_after_series_seconds,
        estimated_set_time_seconds: exercise.estimated_set_time_seconds,
      });
    }
  }
  const foundIds = new Set((exercisesWithData ?? []).map((e) => e.id));
  for (const exerciseId of exerciseIds) {
    if (!foundIds.has(exerciseId)) missingExercises.push(exerciseId);
  }
  return { exercisesDataMap, missingExercises };
}

function enrichExercisesFromLibraryAndConvertMissing(
  parsed: WorkoutPlanImportPayload,
  exercisesDataMap: ExerciseDataMap,
  missingExercises: string[]
): void {
  for (const exercise of parsed.exercises) {
    if (
      exercise.exercise_id &&
      !missingExercises.includes(exercise.exercise_id)
    ) {
      const exerciseData = exercisesDataMap.get(exercise.exercise_id);
      if (exerciseData) {
        exercise.planned_sets ??= exerciseData.series;
        exercise.planned_reps ??= exerciseData.reps;
        exercise.planned_duration_seconds ??= exerciseData.duration_seconds;
        exercise.planned_rest_seconds ??= exerciseData.rest_in_between_seconds;
        exercise.planned_rest_after_series_seconds ??=
          exerciseData.rest_after_series_seconds;
        exercise.estimated_set_time_seconds ??=
          exerciseData.estimated_set_time_seconds;
      }
    }
  }
  for (const exercise of parsed.exercises) {
    if (
      !exercise.exercise_id ||
      !missingExercises.includes(exercise.exercise_id)
    ) {
      continue;
    }
    const missingExerciseId = exercise.exercise_id;
    exercise.exercise_id = null;
    if (!exercise.exercise_title) {
      exercise.exercise_title = `Ćwiczenie (ID: ${missingExerciseId})`;
      if (!exercise.exercise_type)
        exercise.exercise_type = exercise.section_type;
      if (!exercise.exercise_part)
        exercise.exercise_part = parsed.part ?? undefined;
    }
    applyDefaultsForSnapshotExercise(exercise);
  }
}

function applySnapshotDefaultsToAll(parsed: WorkoutPlanImportPayload): void {
  for (const exercise of parsed.exercises) {
    if (!exercise.exercise_id) applyDefaultsForSnapshotExercise(exercise);
  }
}

function buildImportExerciseRows(
  parsed: WorkoutPlanImportPayload,
  getSnapshotId: ReturnType<typeof createSnapshotIdFactory>
): Parameters<typeof insertWorkoutPlanExercises>[2] {
  return parsed.exercises.map((e) => {
    const snapshotId =
      !e.exercise_id && e.exercise_title
        ? getSnapshotId(
            e.exercise_title,
            e.exercise_type ?? null,
            e.exercise_part ?? null
          )
        : null;
    return {
      exercise_id: e.exercise_id ?? null,
      snapshot_id: snapshotId,
      exercise_title: e.exercise_title ?? null,
      exercise_type: e.exercise_type ?? null,
      exercise_part: e.exercise_part ?? null,
      exercise_details: e.exercise_details ?? null,
      section_type: e.section_type!,
      section_order: e.section_order!,
      planned_sets: e.planned_sets,
      planned_reps: e.planned_reps,
      planned_duration_seconds: e.planned_duration_seconds,
      planned_rest_seconds: e.planned_rest_seconds,
      planned_rest_after_series_seconds: e.planned_rest_after_series_seconds,
      estimated_set_time_seconds: e.estimated_set_time_seconds,
    };
  });
}

async function persistImportedPlan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  parsed: WorkoutPlanImportPayload
): Promise<Omit<WorkoutPlanDTO, "exercises">> {
  const { data: plan, error: planError } = await insertWorkoutPlan(
    supabase,
    userId,
    {
      name: parsed.name,
      description: parsed.description,
      part: parsed.part,
    }
  );
  if (planError) throw mapDbError(planError);
  if (!plan) {
    throw new ServiceError(
      "INTERNAL",
      "Nie udało się utworzyć planu treningowego."
    );
  }
  const getSnapshotId = createSnapshotIdFactory();
  const rows = buildImportExerciseRows(parsed, getSnapshotId);
  const { error: exercisesInsertError } = await insertWorkoutPlanExercises(
    supabase,
    plan.id,
    rows
  );
  if (exercisesInsertError) {
    await supabase.from("workout_plans").delete().eq("id", plan.id);
    throw mapDbError(exercisesInsertError);
  }
  return plan;
}

async function fetchPlanWithExercisesAndUpdateTime(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  planId: string,
  insertedPlan: Omit<WorkoutPlanDTO, "exercises">
): Promise<{ plan: WorkoutPlanDTO; exercises: WorkoutPlanExerciseDTO[] }> {
  const { data: planWithExercises, error: fetchError } =
    await listWorkoutPlanExercises(supabase, planId);
  if (fetchError) throw mapDbError(fetchError);
  const exercisesWithDescription = planWithExercises ?? [];
  const estimatedTotalTime = calculateEstimatedTotalTime(
    exercisesWithDescription
  );
  const { error: updateTimeError } = await updateWorkoutPlan(
    supabase,
    userId,
    planId,
    { estimated_total_time_seconds: estimatedTotalTime }
  );
  if (updateTimeError) {
    console.error(
      "[importWorkoutPlanService] Failed to update estimated_total_time_seconds:",
      updateTimeError
    );
  }
  const { data: updatedPlan, error: fetchUpdatedError } =
    await findWorkoutPlanById(supabase, userId, planId);
  if (fetchUpdatedError) throw mapDbError(fetchUpdatedError);
  const planMeta = updatedPlan ?? insertedPlan;
  return {
    plan: { ...planMeta, exercises: exercisesWithDescription },
    exercises: exercisesWithDescription,
  };
}

/**
 * Importuje plan treningowy z JSON.
 * Obsługuje ćwiczenia istniejące w bazie (przez exercise_id) oraz nowe (przez snapshot).
 */
export async function importWorkoutPlanService(
  userId: string,
  payload: unknown
): Promise<WorkoutPlanDTO & { warnings?: { missing_exercises?: string[] } }> {
  assertUser(userId);

  try {
    const parsed = parseOrThrow(workoutPlanImportSchema, payload);
    normalizeImportSectionTypeAndOrder(parsed);
    validateImportDomainRules(parsed);

    const supabase = await createClient();
    await resolveMatchByNameInExercises(supabase, userId, parsed);

    const exerciseIds = parsed.exercises
      .filter((e): e is ImportExercise & { exercise_id: string } =>
        Boolean(e.exercise_id)
      )
      .map((e) => e.exercise_id);

    const { exercisesDataMap, missingExercises } =
      await loadExerciseDataAndMissingIds(supabase, userId, exerciseIds);

    enrichExercisesFromLibraryAndConvertMissing(
      parsed,
      exercisesDataMap,
      missingExercises
    );
    applySnapshotDefaultsToAll(parsed);

    const plan = await persistImportedPlan(supabase, userId, parsed);
    const { plan: updatedPlan, exercises } =
      await fetchPlanWithExercisesAndUpdateTime(
        supabase,
        userId,
        plan.id,
        plan
      );

    return {
      ...updatedPlan,
      exercises,
      warnings:
        missingExercises.length > 0
          ? { missing_exercises: missingExercises }
          : undefined,
    };
  } catch (error) {
    console.error("[importWorkoutPlanService] Error:", error);
    throw error;
  }
}

/**
 * Łączy wszystkie wystąpienia snapshotu (po snapshot_id) z ćwiczeniem z biblioteki.
 * Używane gdy użytkownik dodaje snapshot do bazy ćwiczeń.
 */
export async function linkSnapshotToExerciseService(
  userId: string,
  snapshotId: string,
  exerciseId: string
) {
  assertUser(userId);
  const supabase = await createClient();

  // Sprawdź czy ćwiczenie należy do użytkownika
  const { data: ownedExercise, error: exerciseError } =
    await findExercisesByIds(supabase, userId, [exerciseId]);

  if (exerciseError) {
    throw mapDbError(exerciseError);
  }

  if (!ownedExercise || ownedExercise.length === 0) {
    throw new ServiceError(
      "NOT_FOUND",
      "Ćwiczenie nie istnieje lub nie należy do użytkownika."
    );
  }

  // Zaktualizuj wszystkie wystąpienia snapshotu
  const { error } = await updateWorkoutPlanExercisesBySnapshotId(
    supabase,
    snapshotId,
    exerciseId
  );

  if (error) {
    throw mapDbError(error);
  }
}
