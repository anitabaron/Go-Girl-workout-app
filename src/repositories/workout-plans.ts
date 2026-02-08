import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/database.types";
import type {
  PlanExerciseSummary,
  PlanQueryParams,
  WorkoutPlanCreateCommand,
  WorkoutPlanDTO,
  WorkoutPlanExerciseDTO,
  WorkoutPlanExerciseInput,
} from "@/types";
import { applyCursorFilter } from "@/lib/cursor-utils";
import {
  WORKOUT_PLAN_DEFAULT_LIMIT,
  WORKOUT_PLAN_MAX_LIMIT,
  decodeCursor,
  encodeCursor,
} from "@/lib/validation/workout-plans";
import { normalizeTitleForDbLookup } from "@/lib/validation/exercises";

type DbClient = SupabaseClient<Database>;
type WorkoutPlanRow = Database["public"]["Tables"]["workout_plans"]["Row"];
type WorkoutPlanExerciseRow =
  Database["public"]["Tables"]["workout_plan_exercises"]["Row"];
const planSelectColumns =
  "id,name,description,part,estimated_total_time_seconds,created_at,updated_at";

/**
 * Pobiera plan treningowy po ID i user_id.
 */
export async function findWorkoutPlanById(
  client: DbClient,
  userId: string,
  id: string,
) {
  const { data, error } = await client
    .from("workout_plans")
    .select(planSelectColumns)
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  return { data, error };
}

type PlanExerciseMetadata = {
  exerciseCounts: Record<string, number>;
  exercisesByPlanId: Map<string, string[]>;
  exerciseSummariesByPlanId: Map<string, PlanExerciseSummary[]>;
  hasMissingExercisesByPlanId: Map<string, boolean>;
};

function getCursorMismatchError(): PostgrestError {
  return {
    message: "Cursor nie pasuje do aktualnych parametrów sortowania.",
    details: "sort/order mismatch",
    code: "BAD_REQUEST",
    hint: "Użyj kursora z tymi samymi parametrami sort/order.",
  } as unknown as PostgrestError;
}

function buildNextCursor(
  items: WorkoutPlanRow[],
  limit: number,
  sort: "created_at" | "name",
  order: "asc" | "desc",
): string | null {
  if (items.length <= limit) return null;
  const tail = items.pop()!;
  const sortValue = sort === "name" ? tail.name : tail.created_at;
  return encodeCursor({ sort, order, value: sortValue, id: tail.id });
}

async function loadPlanExerciseMetadata(
  client: DbClient,
  userId: string,
  planIds: string[],
): Promise<PlanExerciseMetadata> {
  const exerciseCounts: Record<string, number> = {};
  const exercisesByPlanId = new Map<string, string[]>();
  const exerciseSummariesByPlanId = new Map<string, PlanExerciseSummary[]>();
  const hasMissingExercisesByPlanId = new Map<string, boolean>();
  const unlinkedTitlesByPlanId = new Map<string, Set<string>>();

  if (planIds.length === 0) {
    return {
      exerciseCounts,
      exercisesByPlanId,
      exerciseSummariesByPlanId,
      hasMissingExercisesByPlanId,
    };
  }

  const { data: exercisesData, error: exercisesError } = await client
    .from("workout_plan_exercises")
    .select(
      "plan_id, exercise_id, exercise_title, planned_sets, planned_reps, planned_duration_seconds, planned_rest_seconds, exercises(title)",
    )
    .in("plan_id", planIds)
    .order("section_type", { ascending: true })
    .order("section_order", { ascending: true });

  if (exercisesError || !exercisesData) {
    return {
      exerciseCounts,
      exercisesByPlanId,
      exerciseSummariesByPlanId,
      hasMissingExercisesByPlanId,
    };
  }

  for (const row of exercisesData) {
    const planId = row.plan_id;
    const exerciseTitle =
      (row.exercises as { title: string } | null)?.title ??
      (row as { exercise_title?: string | null }).exercise_title;

    exerciseCounts[planId] = (exerciseCounts[planId] ?? 0) + 1;

    if (row.exercise_id === null) {
      const titles = unlinkedTitlesByPlanId.get(planId) ?? new Set();
      titles.add(exerciseTitle ? normalizeTitleForDbLookup(exerciseTitle) : "");
      unlinkedTitlesByPlanId.set(planId, titles);
    }

    if (exerciseTitle) {
      const names = exercisesByPlanId.get(planId) ?? [];
      names.push(exerciseTitle);
      exercisesByPlanId.set(planId, names);

      const summaries = exerciseSummariesByPlanId.get(planId) ?? [];
      summaries.push({
        title: exerciseTitle,
        planned_sets: row.planned_sets ?? null,
        planned_reps: row.planned_reps ?? null,
        planned_duration_seconds: row.planned_duration_seconds ?? null,
        planned_rest_seconds: row.planned_rest_seconds ?? null,
      });
      exerciseSummariesByPlanId.set(planId, summaries);
    }
  }

  const libraryTitlesNormalized = await fetchLibraryTitlesNormalized(
    client,
    userId,
    unlinkedTitlesByPlanId,
  );

  for (const [planId, normalizedTitles] of unlinkedTitlesByPlanId) {
    const hasUnlinkedNotInLibrary = [...normalizedTitles].some(
      (t) => !libraryTitlesNormalized.has(t),
    );
    hasMissingExercisesByPlanId.set(planId, hasUnlinkedNotInLibrary);
  }

  return {
    exerciseCounts,
    exercisesByPlanId,
    exerciseSummariesByPlanId,
    hasMissingExercisesByPlanId,
  };
}

async function fetchLibraryTitlesNormalized(
  client: DbClient,
  userId: string,
  unlinkedTitlesByPlanId: Map<string, Set<string>>,
): Promise<Set<string>> {
  if (unlinkedTitlesByPlanId.size === 0) return new Set();
  const { data: libraryExercises } = await client
    .from("exercises")
    .select("title_normalized")
    .eq("user_id", userId);
  return new Set(
    (libraryExercises ?? []).map((e) =>
      (e.title_normalized ?? "").toLowerCase(),
    ),
  );
}

/**
 * Pobiera listę planów treningowych użytkownika z filtrami, sortowaniem i paginacją.
 */
export async function findWorkoutPlansByUserId(
  client: DbClient,
  userId: string,
  params: Required<Pick<PlanQueryParams, "sort" | "order" | "limit">> &
    PlanQueryParams,
): Promise<{
  data?: (Omit<WorkoutPlanDTO, "exercises"> & {
    exercise_count?: number;
    exercise_names?: string[];
    exercise_summaries?: PlanExerciseSummary[];
    has_missing_exercises?: boolean;
  })[];
  nextCursor?: string | null;
  error?: PostgrestError | null;
}> {
  const limit = Math.min(
    params.limit ?? WORKOUT_PLAN_DEFAULT_LIMIT,
    WORKOUT_PLAN_MAX_LIMIT,
  );
  const sort: "created_at" | "name" = params.sort ?? "created_at";
  const order: "asc" | "desc" = params.order ?? "desc";

  let query = client
    .from("workout_plans")
    .select(planSelectColumns)
    .eq("user_id", userId);

  if (params.part) query = query.eq("part", params.part);

  if (params.cursor) {
    const cursor = decodeCursor(params.cursor);
    if (cursor.sort !== sort || cursor.order !== order) {
      return { error: getCursorMismatchError() };
    }
    query = applyCursorFilter(query, sort, order, cursor);
  }

  query = query
    .order(sort, { ascending: order === "asc" })
    .order("id", { ascending: order === "asc" })
    .limit(limit + 1);

  const { data, error } = await query;
  if (error) return { error };

  const items = (data ?? []) as WorkoutPlanRow[];
  const nextCursor = buildNextCursor([...items], limit, sort, order);
  if (items.length > limit) items.pop();

  const planIds = items.map((item) => item.id);
  const {
    exerciseCounts,
    exercisesByPlanId,
    exerciseSummariesByPlanId,
    hasMissingExercisesByPlanId,
  } = await loadPlanExerciseMetadata(client, userId, planIds);

  return {
    data: items.map((item) => ({
      ...mapToDTO(item),
      exercise_count: exerciseCounts[item.id] ?? 0,
      exercise_names: exercisesByPlanId.get(item.id) ?? [],
      exercise_summaries: exerciseSummariesByPlanId.get(item.id) ?? [],
      has_missing_exercises: hasMissingExercisesByPlanId.get(item.id) ?? false,
    })),
    nextCursor,
    error: null,
  };
}

/**
 * Wstawia nowy plan treningowy (bez ćwiczeń).
 */
export async function insertWorkoutPlan(
  client: DbClient,
  userId: string,
  input: Pick<WorkoutPlanCreateCommand, "name" | "description" | "part"> & {
    estimated_total_time_seconds?: number | null;
  },
) {
  const { data, error } = await client
    .from("workout_plans")
    .insert({
      name: input.name,
      description: input.description ?? null,
      part: input.part ?? null,
      estimated_total_time_seconds: input.estimated_total_time_seconds ?? null,
      user_id: userId,
    })
    .select(planSelectColumns)
    .single();

  return { data: data ? mapToDTO(data) : null, error };
}

/**
 * Wstawia ćwiczenia do planu treningowego (batch insert) - obsługuje snapshot.
 */
export async function insertWorkoutPlanExercises(
  client: DbClient,
  planId: string,
  exercises: Array<
    WorkoutPlanExerciseInput & {
      exercise_title?: string | null;
      exercise_type?: Database["public"]["Enums"]["exercise_type"] | null;
      exercise_part?: Database["public"]["Enums"]["exercise_part"] | null;
      exercise_details?: string | null;
      exercise_is_unilateral?: boolean | null;
      snapshot_id?: string | null;
    }
  >,
) {
  const exercisesToInsert = exercises.map((exercise) => ({
    plan_id: planId,
    exercise_id: exercise.exercise_id ?? null,
    snapshot_id: exercise.snapshot_id ?? null,
    exercise_title: exercise.exercise_title ?? null,
    exercise_type: exercise.exercise_type ?? null,
    exercise_part: exercise.exercise_part ?? null,
    exercise_details: exercise.exercise_details ?? null,
    exercise_is_unilateral: exercise.exercise_is_unilateral ?? null,
    section_type: exercise.section_type,
    section_order: exercise.section_order,
    planned_sets: exercise.planned_sets ?? null,
    planned_reps: exercise.planned_reps ?? null,
    planned_duration_seconds: exercise.planned_duration_seconds ?? null,
    planned_rest_seconds: exercise.planned_rest_seconds ?? null,
    planned_rest_after_series_seconds:
      exercise.planned_rest_after_series_seconds ?? null,
    estimated_set_time_seconds: exercise.estimated_set_time_seconds ?? null,
  }));

  // Type assertion - pola snapshot są w bazie
  // Używamy 'as any' aby obejść problemy z cache schematu Supabase PostgREST
  // Cache może wymagać odświeżenia po migracjach - zrestartuj serwer deweloperski

  const { data, error } = await (client
    .from("workout_plan_exercises")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(exercisesToInsert as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .select() as unknown as Promise<{ data: any; error: any }>);

  return { data, error };
}

/**
 * Aktualizuje metadane planu treningowego.
 */
export async function updateWorkoutPlan(
  client: DbClient,
  userId: string,
  id: string,
  input: Partial<
    Pick<WorkoutPlanCreateCommand, "name" | "description" | "part"> & {
      estimated_total_time_seconds?: number | null;
    }
  >,
) {
  const updateData: {
    name?: string;
    description?: string | null;
    part?: Database["public"]["Enums"]["exercise_part"] | null;
    estimated_total_time_seconds?: number | null;
  } = {};

  if (input.name !== undefined) {
    updateData.name = input.name;
  }

  if (input.description !== undefined) {
    updateData.description = input.description;
  }

  if (input.part !== undefined) {
    updateData.part = input.part;
  }

  if (input.estimated_total_time_seconds !== undefined) {
    updateData.estimated_total_time_seconds =
      input.estimated_total_time_seconds;
  }

  if (Object.keys(updateData).length === 0) {
    // Brak zmian do wykonania
    const { data } = await findWorkoutPlanById(client, userId, id);
    return { data: data ? mapToDTO(data) : null, error: null };
  }

  const { data, error } = await client
    .from("workout_plans")
    .update(updateData)
    .eq("user_id", userId)
    .eq("id", id)
    .select(planSelectColumns)
    .single();

  return { data: data ? mapToDTO(data) : null, error };
}

/**
 * Aktualizuje pojedyncze ćwiczenie w planie treningowym.
 */
export async function updateWorkoutPlanExercise(
  client: DbClient,
  planId: string,
  exerciseId: string,
  input: {
    exercise_id?: string | null;
    exercise_title?: string | null;
    exercise_type?: Database["public"]["Enums"]["exercise_type"] | null;
    exercise_part?: Database["public"]["Enums"]["exercise_part"] | null;
    exercise_is_unilateral?: boolean | null;
    section_type?: Database["public"]["Enums"]["exercise_type"];
    section_order?: number;
    planned_sets?: number | null;
    planned_reps?: number | null;
    planned_duration_seconds?: number | null;
    planned_rest_seconds?: number | null;
    planned_rest_after_series_seconds?: number | null;
    estimated_set_time_seconds?: number | null;
  },
) {
  const updateData: Database["public"]["Tables"]["workout_plan_exercises"]["Update"] & {
    planned_rest_after_series_seconds?: number | null;
    estimated_set_time_seconds?: number | null;
    exercise_title?: string | null;
    exercise_type?: Database["public"]["Enums"]["exercise_type"] | null;
    exercise_part?: Database["public"]["Enums"]["exercise_part"] | null;
    exercise_is_unilateral?: boolean | null;
  } = {};

  if (input.exercise_id !== undefined) {
    updateData.exercise_id = input.exercise_id ?? null;
  }
  if (input.exercise_title !== undefined) {
    updateData.exercise_title = input.exercise_title ?? null;
  }
  if (input.exercise_type !== undefined) {
    updateData.exercise_type = input.exercise_type ?? null;
  }
  if (input.exercise_part !== undefined) {
    updateData.exercise_part = input.exercise_part ?? null;
  }
  if (input.exercise_is_unilateral !== undefined) {
    updateData.exercise_is_unilateral = input.exercise_is_unilateral ?? null;
  }
  if (input.section_type !== undefined) {
    updateData.section_type = input.section_type;
  }
  if (input.section_order !== undefined) {
    updateData.section_order = input.section_order;
  }
  if (input.planned_sets !== undefined) {
    updateData.planned_sets = input.planned_sets;
  }
  if (input.planned_reps !== undefined) {
    updateData.planned_reps = input.planned_reps;
  }
  if (input.planned_duration_seconds !== undefined) {
    updateData.planned_duration_seconds = input.planned_duration_seconds;
  }
  if (input.planned_rest_seconds !== undefined) {
    updateData.planned_rest_seconds = input.planned_rest_seconds;
  }
  if (input.planned_rest_after_series_seconds !== undefined) {
    updateData.planned_rest_after_series_seconds =
      input.planned_rest_after_series_seconds;
  }
  if (input.estimated_set_time_seconds !== undefined) {
    updateData.estimated_set_time_seconds = input.estimated_set_time_seconds;
  }

  if (Object.keys(updateData).length === 0) {
    // Brak zmian do wykonania
    return { data: null, error: null };
  }

  const { data, error } = await client
    .from("workout_plan_exercises")
    .update(updateData)
    .eq("plan_id", planId)
    .eq("id", exerciseId)
    .select()
    .single();

  return { data, error };
}

/**
 * Usuwa wszystkie ćwiczenia z planu treningowego.
 */
export async function deleteWorkoutPlanExercises(
  client: DbClient,
  planId: string,
) {
  const { error } = await client
    .from("workout_plan_exercises")
    .delete()
    .eq("plan_id", planId);

  return { error };
}

/**
 * Usuwa ćwiczenia planu treningowego o podanych id (np. usunięte z formularza).
 */
export async function deleteWorkoutPlanExercisesByIds(
  client: DbClient,
  planId: string,
  ids: string[],
) {
  if (ids.length === 0) return { error: null };
  const { error } = await client
    .from("workout_plan_exercises")
    .delete()
    .eq("plan_id", planId)
    .in("id", ids);
  return { error };
}

/**
 * Aktualizuje wszystkie wystąpienia snapshotu (po snapshot_id) - łączy je z ćwiczeniem z biblioteki.
 * Używane gdy użytkownik dodaje snapshot do bazy ćwiczeń.
 */
export async function updateWorkoutPlanExercisesBySnapshotId(
  client: DbClient,
  snapshotId: string,
  exerciseId: string,
) {
  const { data, error } = await client
    .from("workout_plan_exercises")
    .update({
      exercise_id: exerciseId,
      snapshot_id: null, // Opcjonalnie można zostawić dla historii
      exercise_title: null,
      exercise_type: null,
      exercise_part: null,
      exercise_details: null,
    })
    .eq("snapshot_id", snapshotId)
    .select();

  return { data, error };
}

/**
 * Pobiera ćwiczenia planu treningowego z informacją o snapshot.
 */
export async function listWorkoutPlanExercises(
  client: DbClient,
  planId: string,
): Promise<{
  data?: WorkoutPlanExerciseDTO[];
  error?: PostgrestError | null;
}> {
  const { data, error } = await client
    .from("workout_plan_exercises")
    .select(
      `
      *,
      exercises (
        id,
        title,
        types,
        parts,
        is_unilateral,
        details,
        estimated_set_time_seconds,
        rest_after_series_seconds
      )
    `,
    )
    .eq("plan_id", planId)
    .order("section_type", { ascending: true })
    .order("section_order", { ascending: true });

  if (error) {
    return { error };
  }

  const exercises = (data ?? []).map((row) => {
    const exercise = row.exercises as {
      id: string;
      title: string;
      types: Database["public"]["Enums"]["exercise_type"][];
      parts: Database["public"]["Enums"]["exercise_part"][];
      is_unilateral?: boolean;
      details: string | null;
      estimated_set_time_seconds: number | null;
      rest_after_series_seconds: number | null;
    } | null;

    // Type assertion dla pól snapshot (dodanych w migracji, ale jeszcze nie w typach)
    const rowWithSnapshot = row as WorkoutPlanExerciseRow & {
      snapshot_id?: string | null;
      exercise_title?: string | null;
      exercise_type?: Database["public"]["Enums"]["exercise_type"] | null;
      exercise_part?: Database["public"]["Enums"]["exercise_part"] | null;
      exercise_details?: string | null;
      exercise_is_unilateral?: boolean | null;
      estimated_set_time_seconds?: number | null;
      planned_rest_after_series_seconds?: number | null;
    };

    // Użyj snapshot jeśli exercise_id jest NULL, w przeciwnym razie użyj danych z exercises
    // exercises ma types/parts (tablice) - używamy pierwszego elementu
    const exerciseTitle = row.exercise_id
      ? (exercise?.title ?? null)
      : (rowWithSnapshot.exercise_title ?? null);
    const exerciseType = row.exercise_id
      ? (exercise?.types?.[0] ?? null)
      : (rowWithSnapshot.exercise_type ?? null);
    const exercisePart = row.exercise_id
      ? (exercise?.parts?.[0] ?? null)
      : (rowWithSnapshot.exercise_part ?? null);

    // Use override value from workout_plan_exercises if available, otherwise fall back to exercise default
    // For estimated_set_time_seconds, prioritize workout_plan_exercises value if it's not null/undefined
    const finalEstimatedSetTime =
      rowWithSnapshot.estimated_set_time_seconds ??
      exercise?.estimated_set_time_seconds ??
      null;

    // For planned_rest_after_series_seconds, always use value from workout_plan_exercises if it's defined (even if null)
    // This ensures that imported plans with explicit null values are preserved
    // Only fall back to exercise default if the value is truly undefined (not present in DB result)
    const finalRestAfterSeries =
      rowWithSnapshot.planned_rest_after_series_seconds === undefined
        ? (exercise?.rest_after_series_seconds ?? null)
        : rowWithSnapshot.planned_rest_after_series_seconds;

    // Pobierz exercise_details z snapshot (jeśli dostępne) lub z exercises.details
    const exerciseDetails = row.exercise_id
      ? (exercise?.details ?? null)
      : (rowWithSnapshot.exercise_details ?? null);

    return {
      id: row.id,
      exercise_id: row.exercise_id,
      snapshot_id: rowWithSnapshot.snapshot_id ?? null,
      section_type: row.section_type,
      section_order: row.section_order,
      planned_sets: row.planned_sets,
      planned_reps: row.planned_reps,
      planned_duration_seconds: row.planned_duration_seconds,
      planned_rest_seconds: row.planned_rest_seconds,
      estimated_set_time_seconds: finalEstimatedSetTime, // Pole z workout_plan_exercises
      exercise_details: exerciseDetails, // Pole z workout_plan_exercises (z snapshot lub z exercises.details)
      exercise_title: exerciseTitle,
      exercise_type: exerciseType,
      exercise_part: exercisePart,
      // Plan override (import/edytor) ma pierwszeństwo; dla linkowanych z biblioteki fallback do exercises.is_unilateral
      exercise_is_unilateral:
        row.exercise_is_unilateral ??
        (row.exercise_id ? (exercise?.is_unilateral ?? false) : false),
      exercise_estimated_set_time_seconds: finalEstimatedSetTime,
      exercise_rest_after_series_seconds:
        exercise?.rest_after_series_seconds ?? null,
      planned_rest_after_series_seconds: finalRestAfterSeries,
      is_exercise_in_library: row.exercise_id !== null,
    };
  });

  return { data: exercises, error: null };
}

/**
 * Batch weryfikacja własności ćwiczeń - sprawdza czy wszystkie exercise_id należą do użytkownika.
 */
export async function findExercisesByIds(
  client: DbClient,
  userId: string,
  exerciseIds: string[],
) {
  if (exerciseIds.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await client
    .from("exercises")
    .select("id")
    .eq("user_id", userId)
    .in("id", exerciseIds);

  return { data, error };
}

/**
 * Pobiera pełne dane ćwiczeń po ID (dla importu planów - uzupełnianie brakujących pól).
 */
export async function findExercisesByIdsWithFullData(
  client: DbClient,
  userId: string,
  exerciseIds: string[],
) {
  if (exerciseIds.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await client
    .from("exercises")
    .select(
      "id,series,reps,duration_seconds,rest_in_between_seconds,rest_after_series_seconds,estimated_set_time_seconds",
    )
    .eq("user_id", userId)
    .in("id", exerciseIds);

  return { data, error };
}

/**
 * Mapuje wiersz z bazy danych na DTO planu (bez ćwiczeń).
 */
type WorkoutPlanSelectResult = Omit<WorkoutPlanRow, "user_id">;

export function mapToDTO(
  row: WorkoutPlanRow | WorkoutPlanSelectResult,
): Omit<WorkoutPlanDTO, "exercises"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user_id, ...rest } = row as WorkoutPlanRow;
  return rest;
}

/**
 * Mapuje wiersz z bazy danych na DTO ćwiczenia w planie.
 * @deprecated Używaj bezpośrednio listWorkoutPlanExercises, która zwraca już poprawnie zmapowane DTO.
 */
export function mapExerciseToDTO(
  row: WorkoutPlanExerciseRow & {
    exercises?: {
      title: string;
      types?: Database["public"]["Enums"]["exercise_type"][];
      parts?: Database["public"]["Enums"]["exercise_part"][];
      estimated_set_time_seconds?: number | null;
      rest_after_series_seconds?: number | null;
    } | null;
    estimated_set_time_seconds?: number | null; // Override value from workout_plan_exercises
    planned_rest_after_series_seconds?: number | null; // Override value from workout_plan_exercises
  },
): WorkoutPlanExerciseDTO {
  /* eslint-disable @typescript-eslint/no-unused-vars -- destructuring to omit from rest */
  const {
    plan_id,
    created_at,
    exercises,
    estimated_set_time_seconds,
    planned_rest_after_series_seconds,
    ...rest
  } = row;
  /* eslint-enable @typescript-eslint/no-unused-vars */

  // Type assertion dla pól snapshot (dodanych w migracji, ale jeszcze nie w typach)
  const rowWithSnapshot = row as WorkoutPlanExerciseRow & {
    exercise_title?: string | null;
    exercise_type?: Database["public"]["Enums"]["exercise_type"] | null;
    exercise_part?: Database["public"]["Enums"]["exercise_part"] | null;
    estimated_set_time_seconds?: number | null;
    planned_rest_after_series_seconds?: number | null;
  };

  // Use override value from workout_plan_exercises if available, otherwise fall back to exercise default
  const finalEstimatedSetTime =
    estimated_set_time_seconds === undefined
      ? (exercises?.estimated_set_time_seconds ?? null)
      : estimated_set_time_seconds;

  const finalRestAfterSeries =
    planned_rest_after_series_seconds === undefined
      ? (exercises?.rest_after_series_seconds ?? null)
      : planned_rest_after_series_seconds;

  // Użyj snapshot jeśli exercise_id jest NULL, w przeciwnym razie użyj danych z exercises
  // exercises ma types/parts (tablice) - używamy pierwszego elementu
  const exerciseTitle = rest.exercise_id
    ? (exercises?.title ?? null)
    : (rowWithSnapshot.exercise_title ?? null);
  const exerciseType = rest.exercise_id
    ? (exercises?.types?.[0] ?? null)
    : (rowWithSnapshot.exercise_type ?? null);
  const exercisePart = rest.exercise_id
    ? (exercises?.parts?.[0] ?? null)
    : (rowWithSnapshot.exercise_part ?? null);

  return {
    ...rest,
    estimated_set_time_seconds: finalEstimatedSetTime, // Pole z workout_plan_exercises
    exercise_title: exerciseTitle,
    exercise_type: exerciseType,
    exercise_part: exercisePart,
    exercise_estimated_set_time_seconds: finalEstimatedSetTime,
    exercise_rest_after_series_seconds:
      exercises?.rest_after_series_seconds ?? null,
    planned_rest_after_series_seconds: finalRestAfterSeries,
    is_exercise_in_library: rest.exercise_id !== null,
  };
}
