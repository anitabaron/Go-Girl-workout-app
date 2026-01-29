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
  exercises: WorkoutPlanExerciseDTO[],
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
  userId: string,
): Promise<void> {
  const { data: existingExercises, error: fetchExercisesError } =
    await listWorkoutPlanExercises(supabase, planId);

  if (fetchExercisesError) {
    throw mapDbError(fetchExercisesError);
  }

  const existingExerciseIds = new Set(
    (existingExercises ?? []).map((e) => e.id),
  );

  const exercisesToUpdate = exercises.filter((e) => e.id !== undefined);
  const exercisesToCreate = exercises.filter((e) => e.id === undefined);

  const hasSectionOrderChanges = exercisesToUpdate.some(
    (e) => e.section_order !== undefined && e.id !== undefined,
  );

  if (hasSectionOrderChanges) {
    const exercisesToTempUpdate: Array<{ id: string }> = [];

    for (const exerciseUpdate of exercisesToUpdate) {
      if (exerciseUpdate.section_order !== undefined && exerciseUpdate.id) {
        exercisesToTempUpdate.push({ id: exerciseUpdate.id });
      }
    }

    let tempOrder = 100000;
    for (const update of exercisesToTempUpdate) {
      const { error: tempUpdateError } = await updateWorkoutPlanExercise(
        supabase,
        planId,
        update.id,
        { section_order: tempOrder },
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
        `Ćwiczenie o id ${exerciseUpdate.id} nie istnieje w tym planie treningowym.`,
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
          `Ćwiczenie o exercise_id ${exerciseUpdate.exercise_id} nie istnieje lub nie należy do użytkownika.`,
        );
      }
    }

    const updateData = mapExerciseUpdateToDb(
      exerciseUpdate as WorkoutPlanExerciseUpdateOrCreate & { id: string },
    );

    if (Object.keys(updateData).length === 0) {
      continue;
    }

    const { error: updateError } = await updateWorkoutPlanExercise(
      supabase,
      planId,
      exerciseUpdate.id,
      updateData,
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
            `Ćwiczenie o exercise_id ${newExercise.exercise_id} nie istnieje lub nie należy do użytkownika.`,
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
              exercise.exercise_part ?? null,
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
      exercisesToInsert,
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
  payload: unknown,
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
      "Niektóre ćwiczenia nie istnieją lub nie należą do użytkownika.",
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
    },
  );

  if (planError) {
    throw mapDbError(planError);
  }

  if (!plan) {
    throw new ServiceError(
      "INTERNAL",
      "Nie udało się utworzyć planu treningowego.",
    );
  }

  const { error: exercisesInsertError } = await insertWorkoutPlanExercises(
    supabase,
    plan.id,
    parsed.exercises,
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
    planWithExercises ?? [],
  );
  const { error: updateTimeError } = await updateWorkoutPlan(
    supabase,
    userId,
    plan.id,
    { estimated_total_time_seconds: estimatedTotalTime },
  );

  if (updateTimeError) {
    // Logujemy błąd, ale nie przerywamy - plan został już utworzony
    console.error(
      "[createWorkoutPlanService] Failed to update estimated_total_time_seconds:",
      updateTimeError,
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
  query: PlanQueryParams,
): Promise<{
  items: (Omit<WorkoutPlanDTO, "exercises"> & {
    exercise_count?: number;
    exercise_names?: string[];
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
      parsed,
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
  id: string,
): Promise<WorkoutPlanDTO> {
  assertUser(userId);
  const supabase = await createClient();

  const { data: plan, error: planError } = await findWorkoutPlanById(
    supabase,
    userId,
    id,
  );

  if (planError) {
    throw mapDbError(planError);
  }

  if (!plan) {
    throw new ServiceError(
      "NOT_FOUND",
      "Plan treningowy nie został znaleziony.",
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
  payload: unknown,
): Promise<WorkoutPlanDTO> {
  assertUser(userId);
  const patch = parseOrThrow(workoutPlanUpdateSchema, payload);
  const supabase = await createClient();

  // Pobierz istniejący plan
  const { data: existing, error: fetchError } = await findWorkoutPlanById(
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
      "Plan treningowy nie został znaleziony.",
    );
  }

  if (patch.exercises !== undefined && patch.exercises.length > 0) {
    await applyExerciseUpdates(
      supabase,
      id,
      patch.exercises as WorkoutPlanExerciseUpdateOrCreate[],
      userId,
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
      },
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
      planWithExercises ?? [],
    );
    const { error: updateTimeError } = await updateWorkoutPlan(
      supabase,
      userId,
      id,
      { estimated_total_time_seconds: estimatedTotalTime },
    );

    if (updateTimeError) {
      // Logujemy błąd, ale nie przerywamy - ćwiczenia zostały już zaktualizowane
      console.error(
        "[updateWorkoutPlanService] Failed to update estimated_total_time_seconds:",
        updateTimeError,
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
      "Nie udało się pobrać zaktualizowanego planu treningowego.",
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
    id,
  );

  if (fetchError) {
    throw mapDbError(fetchError);
  }

  if (!existing) {
    throw new ServiceError(
      "NOT_FOUND",
      "Plan treningowy nie został znaleziony.",
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

/**
 * Importuje plan treningowy z JSON.
 * Obsługuje ćwiczenia istniejące w bazie (przez exercise_id) oraz nowe (przez snapshot).
 */
export async function importWorkoutPlanService(
  userId: string,
  payload: unknown,
): Promise<WorkoutPlanDTO & { warnings?: { missing_exercises?: string[] } }> {
  assertUser(userId);

  try {
    const parsed = parseOrThrow(workoutPlanImportSchema, payload);

    // Walidacja domenowa
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
          }) as WorkoutPlanExerciseInput,
      ),
    );

    if (domainErrors.length) {
      throw new ServiceError("BAD_REQUEST", domainErrors.join(" "));
    }

    const supabase = await createClient();

    // Mapowanie match_by_name na exercise_id przez title_normalized (zgodna z DB: bez usuwania diakrytyków)
    for (const exercise of parsed.exercises) {
      if (exercise.match_by_name && !exercise.exercise_id) {
        const normalizedName = normalizeTitleForDbLookup(
          exercise.match_by_name,
        );
        const { data: foundExercise, error: findError } =
          await findByNormalizedTitle(supabase, userId, normalizedName);

        if (findError) {
          throw mapDbError(findError);
        }

        if (foundExercise?.id) {
          // Znaleziono ćwiczenie - użyj exercise_id
          exercise.exercise_id = foundExercise.id;
          exercise.match_by_name = undefined; // Usuń match_by_name, bo już mamy exercise_id
          console.log(
            `[importWorkoutPlanService] Znaleziono ćwiczenie: "${exercise.match_by_name}" -> exercise_id: ${foundExercise.id}`,
          );
        } else {
          // Nie znaleziono - użyj match_by_name jako exercise_title (snapshot)
          exercise.exercise_title = exercise.match_by_name;
          // exercise_type i exercise_part są opcjonalne - ustaw tylko jeśli nie były podane i chcemy fallback
          if (!exercise.exercise_type) {
            exercise.exercise_type = exercise.section_type;
          }
          if (!exercise.exercise_part) {
            exercise.exercise_part = parsed.part ?? undefined;
          }
          // exercise_details pozostaje bez zmian (jeśli było podane)
          exercise.match_by_name = undefined; // Usuń match_by_name, bo używamy snapshot
          console.log(
            `[importWorkoutPlanService] Nie znaleziono ćwiczenia: "${exercise.exercise_title}" (znormalizowane: "${normalizedName}") - używam snapshot`,
          );
        }
      }
    }

    // Dla ćwiczeń z exercise_id - sprawdź czy istnieją i należą do użytkownika
    // oraz pobierz pełne dane do uzupełnienia brakujących pól
    const exerciseIds = parsed.exercises
      .filter((e) => e.exercise_id)
      .map((e) => e.exercise_id!);

    const missingExercises: string[] = [];
    const exercisesDataMap = new Map<
      string,
      {
        series: number;
        reps: number | null;
        duration_seconds: number | null;
        rest_in_between_seconds: number | null;
        rest_after_series_seconds: number | null;
        estimated_set_time_seconds: number | null;
      }
    >();

    if (exerciseIds.length > 0) {
      // Pobierz pełne dane ćwiczeń (dla uzupełnienia brakujących pól)
      const { data: exercisesWithData, error: exercisesDataError } =
        await findExercisesByIdsWithFullData(supabase, userId, exerciseIds);

      if (exercisesDataError) {
        throw mapDbError(exercisesDataError);
      }

      // Utwórz mapę danych ćwiczeń
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

      // Znajdź brakujące ćwiczenia
      const foundIds = new Set((exercisesWithData ?? []).map((e) => e.id));
      for (const exerciseId of exerciseIds) {
        if (!foundIds.has(exerciseId)) {
          missingExercises.push(exerciseId);
        }
      }

      // Uzupełnij brakujące pola z bazy danych dla istniejących ćwiczeń
      for (const exercise of parsed.exercises) {
        if (
          exercise.exercise_id &&
          !missingExercises.includes(exercise.exercise_id)
        ) {
          const exerciseData = exercisesDataMap.get(exercise.exercise_id);
          if (exerciseData) {
            // Uzupełnij tylko pola, które nie zostały podane w JSON
            exercise.planned_sets ??= exerciseData.series;
            exercise.planned_reps ??= exerciseData.reps;
            exercise.planned_duration_seconds ??= exerciseData.duration_seconds;
            exercise.planned_rest_seconds ??=
              exerciseData.rest_in_between_seconds;
            exercise.planned_rest_after_series_seconds ??=
              exerciseData.rest_after_series_seconds;
            exercise.estimated_set_time_seconds ??=
              exerciseData.estimated_set_time_seconds;
          }
        }
      }

      // Jeśli wszystkie ćwiczenia z exercise_id są brakujące, użyj snapshot
      // (to nie powinno się zdarzyć, ale obsługujemy to)
      for (const exercise of parsed.exercises) {
        if (
          exercise.exercise_id &&
          missingExercises.includes(exercise.exercise_id)
        ) {
          // Zapisz exercise_id przed ustawieniem na null
          const missingExerciseId = exercise.exercise_id;
          // Ustaw exercise_id na null i użyj snapshot (jeśli nie został podany, użyj placeholder)
          exercise.exercise_id = null;
          if (!exercise.exercise_title) {
            exercise.exercise_title = `Ćwiczenie (ID: ${missingExerciseId})`;
            // exercise_type i exercise_part są opcjonalne
            if (!exercise.exercise_type) {
              exercise.exercise_type = exercise.section_type;
            }
            if (!exercise.exercise_part) {
              exercise.exercise_part = parsed.part ?? undefined;
            }
          }
        }
      }
    }

    // Utwórz plan
    const { data: plan, error: planError } = await insertWorkoutPlan(
      supabase,
      userId,
      {
        name: parsed.name,
        description: parsed.description,
        part: parsed.part,
      },
    );

    if (planError) {
      throw mapDbError(planError);
    }

    if (!plan) {
      throw new ServiceError(
        "INTERNAL",
        "Nie udało się utworzyć planu treningowego.",
      );
    }

    const getSnapshotId = createSnapshotIdFactory();

    // Wstaw ćwiczenia (z exercise_id lub snapshot)
    const { error: exercisesInsertError } = await insertWorkoutPlanExercises(
      supabase,
      plan.id,
      parsed.exercises.map((e) => {
        // Jeśli to snapshot (brak exercise_id), generuj/przypisz snapshot_id
        // exercise_type i exercise_part są opcjonalne
        const snapshotId =
          !e.exercise_id && e.exercise_title
            ? getSnapshotId(
                e.exercise_title,
                e.exercise_type ?? null,
                e.exercise_part ?? null,
              )
            : null;

        return {
          exercise_id: e.exercise_id ?? null,
          snapshot_id: snapshotId,
          exercise_title: e.exercise_title ?? null,
          exercise_type: e.exercise_type ?? null,
          exercise_part: e.exercise_part ?? null,
          exercise_details: e.exercise_details ?? null,
          section_type: e.section_type,
          section_order: e.section_order,
          planned_sets: e.planned_sets,
          planned_reps: e.planned_reps,
          planned_duration_seconds: e.planned_duration_seconds,
          planned_rest_seconds: e.planned_rest_seconds,
          planned_rest_after_series_seconds:
            e.planned_rest_after_series_seconds,
          estimated_set_time_seconds: e.estimated_set_time_seconds,
        };
      }),
    );

    if (exercisesInsertError) {
      await supabase.from("workout_plans").delete().eq("id", plan.id);
      throw mapDbError(exercisesInsertError);
    }

    // Pobierz utworzony plan z ćwiczeniami
    const { data: planWithExercises, error: fetchError } =
      await listWorkoutPlanExercises(supabase, plan.id);

    if (fetchError) {
      throw mapDbError(fetchError);
    }

    // exercise_details jest już w DTO z bazy
    const exercisesWithDescription = planWithExercises ?? [];

    // Oblicz i zaktualizuj szacunkowy całkowity czas treningu
    const estimatedTotalTime = calculateEstimatedTotalTime(
      exercisesWithDescription,
    );
    const { error: updateTimeError } = await updateWorkoutPlan(
      supabase,
      userId,
      plan.id,
      { estimated_total_time_seconds: estimatedTotalTime },
    );

    if (updateTimeError) {
      console.error(
        "[importWorkoutPlanService] Failed to update estimated_total_time_seconds:",
        updateTimeError,
      );
    }

    // Pobierz zaktualizowany plan
    const { data: updatedPlan, error: fetchUpdatedError } =
      await findWorkoutPlanById(supabase, userId, plan.id);

    if (fetchUpdatedError) {
      throw mapDbError(fetchUpdatedError);
    }

    return {
      ...(updatedPlan ?? plan),
      exercises: exercisesWithDescription,
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
  exerciseId: string,
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
      "Ćwiczenie nie istnieje lub nie należy do użytkownika.",
    );
  }

  // Zaktualizuj wszystkie wystąpienia snapshotu
  const { error } = await updateWorkoutPlanExercisesBySnapshotId(
    supabase,
    snapshotId,
    exerciseId,
  );

  if (error) {
    throw mapDbError(error);
  }
}
